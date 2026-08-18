// ============================================================================
// MageBorne Duelists — World / Travel / Economy Engine
// ============================================================================
// All functions are pure: they take state and return new state without mutation.
// Handles: travel, hex discovery, markets, quests, time, rest, deck prep.
// ============================================================================

import type {
  WorldState,
  Settlement,
  Quest,
  ChronicleEntry,
  Element,
} from '../../types';
import { hexDistance, hexNeighbors, mulberry32 } from '../worldgen/worldgen';
import { generateMarket, recalculatePrices, getItem } from '../../data/markets';
import { getQuestsForSettlement } from '../../data/quests';
import { MONSTERS } from '../../data/monsters';

// --- Helpers ----------------------------------------------------------------

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function addChronicle(
  state: WorldState,
  text: string,
  type: ChronicleEntry['type'],
): WorldState {
  return {
    ...state,
    chronicle: [
      ...state.chronicle,
      { day: state.day, text, type },
    ].slice(-200),
  };
}

function getPlayerSettlement(state: WorldState): Settlement | undefined {
  const hex = state.hexes[state.playerHexId];
  if (!hex?.settlementId) return undefined;
  return state.settlements[hex.settlementId];
}

// --- Travel -----------------------------------------------------------------

/**
 * Travel from the player's current hex to the target hex.
 * Calculates distance, spends days, discovers hexes along the path,
 * and may trigger a random encounter.
 */
export function travelToHex(
  state: WorldState,
  hexId: string,
): { state: WorldState; daysCost: number; encounterTriggered: boolean } {
  const currentHex = state.hexes[state.playerHexId];
  const targetHex = state.hexes[hexId];

  if (!currentHex || !targetHex) {
    return { state, daysCost: 0, encounterTriggered: false };
  }

  // Calculate distance
  const distance = hexDistance(
    currentHex.q, currentHex.r,
    targetHex.q, targetHex.r,
  );

  if (distance === 0) {
    return { state, daysCost: 0, encounterTriggered: false };
  }

  // Days cost: 1 day per hex of distance (minimum 1)
  const daysCost = Math.max(1, distance);

  // Clone state for mutation
  let newState = deepClone(state);

  // Discover hexes along the path (current + target + neighbors of path)
  newState = discoverHex(newState, hexId);
  // Also discover intermediate hexes (simplified: discover neighbors of current)
  const currentNeighbors = hexNeighbors(currentHex.q, currentHex.r);
  for (const n of currentNeighbors) {
    const nid = `${n.q},${n.r}`;
    if (newState.hexes[nid]) {
      newState = discoverHex(newState, nid);
    }
  }

  // Move player
  newState.playerHexId = hexId;

  // Advance time
  newState = advanceTime(newState, daysCost);

  // Check for encounter (30% chance if traveling through undiscovered/dangerous terrain)
  const rng = mulberry32(state.seed + state.day * 1000 + distance);
  const encounterRoll = rng();
  const encounterTriggered = encounterRoll < 0.3 && !targetHex.settlementId;

  // Add chronicle entry
  const settlementName = targetHex.settlementId
    ? newState.settlements[targetHex.settlementId]?.name ?? 'unknown settlement'
    : targetHex.terrain;
  newState = addChronicle(
    newState,
    `Traveled to ${settlementName} (${daysCost} day${daysCost > 1 ? 's' : ''}).`,
    'travel',
  );

  if (encounterTriggered) {
    newState = addChronicle(
      newState,
      'You sense something lurking nearby...',
      'combat',
    );
  }

  return { state: newState, daysCost, encounterTriggered };
}

// --- Hex Discovery ----------------------------------------------------------

/**
 * Reveal a hex and its immediate neighbors.
 */
export function discoverHex(state: WorldState, hexId: string): WorldState {
  const hex = state.hexes[hexId];
  if (!hex) return state;

  const newHexes = { ...state.hexes };

  // Reveal the target hex
  newHexes[hexId] = { ...hex, discovered: true };

  // Reveal neighbors
  const neighbors = hexNeighbors(hex.q, hex.r);
  for (const n of neighbors) {
    const nid = `${n.q},${n.r}`;
    if (newHexes[nid] && !newHexes[nid].discovered) {
      newHexes[nid] = { ...newHexes[nid], discovered: true };
    }
  }

  return { ...state, hexes: newHexes };
}

// --- Market -----------------------------------------------------------------

/**
 * Get the current market state for a settlement.
 * If the settlement has no market data yet, generate it.
 */
export function getMarket(state: WorldState, settlementId: string): Settlement['market'] | undefined {
  const settlement = state.settlements[settlementId];
  if (!settlement) return undefined;

  // If market has no supplies, it hasn't been initialized
  if (Object.keys(settlement.market.supplies).length === 0) {
    const hex = state.hexes[settlement.hexId];
    const regionId = hex?.regionId;
    const region = regionId ? state.regions[regionId] : undefined;
    const element: Element = region?.element ?? 'fire';
    const rng = mulberry32(state.seed + settlementId.length * 7);
    return generateMarket(settlement.type, element, rng);
  }

  return settlement.market;
}

/**
 * Ensure a settlement's market is initialized. Returns updated state.
 */
function ensureMarket(state: WorldState, settlementId: string): WorldState {
  const settlement = state.settlements[settlementId];
  if (!settlement) return state;

  if (Object.keys(settlement.market.supplies).length === 0) {
    const hex = state.hexes[settlement.hexId];
    const regionId = hex?.regionId;
    const region = regionId ? state.regions[regionId] : undefined;
    const element: Element = region?.element ?? 'fire';
    const rng = mulberry32(state.seed + settlementId.length * 7);
    const market = generateMarket(settlement.type, element, rng);

    return {
      ...state,
      settlements: {
        ...state.settlements,
        [settlementId]: { ...settlement, market },
      },
    };
  }

  return state;
}

// --- Buy / Sell -------------------------------------------------------------

/**
 * Buy an item from a settlement market.
 * Updates coin, inventory, and market supply (price rises as supply drops).
 */
export function buyItem(
  state: WorldState,
  settlementId: string,
  itemId: string,
  quantity: number,
): WorldState {
  const item = getItem(itemId);
  if (!item) return state;

  let newState = ensureMarket(state, settlementId);
  const settlement = newState.settlements[settlementId];
  if (!settlement) return newState;

  const supply = settlement.market.supplies[itemId] ?? 0;
  if (supply < quantity) return newState; // Not enough stock

  const price = settlement.market.prices[itemId] ?? item.basePrice;
  const totalCost = price * quantity;

  if (newState.player.coin < totalCost) return newState; // Not enough coin

  // Update player coin and reagents/inventory
  const player = { ...newState.player };
  player.coin -= totalCost;

  // Add to reagents or consumables
  if (item.category === 'reagent') {
    player.reagents = {
      ...player.reagents,
      [itemId]: (player.reagents[itemId] ?? 0) + quantity,
    };
  } else if (item.category === 'consumable') {
    const existing = player.equipment.consumables.find((c) => c.id === itemId);
    if (existing) {
      player.equipment = {
        ...player.equipment,
        consumables: player.equipment.consumables.map((c) =>
          c.id === itemId ? { ...c, quantity: c.quantity + quantity } : c,
        ),
      };
    } else {
      player.equipment = {
        ...player.equipment,
        consumables: [
          ...player.equipment.consumables,
          { id: itemId, name: item.name, effect: item.description, quantity },
        ],
      };
    }
  } else if (item.category === 'scroll') {
    // Scrolls teach spells — add to grimoire
    const spellId = itemId.replace('scroll_', '');
    if (!player.grimoire.includes(spellId)) {
      player.grimoire = [...player.grimoire, spellId];
    }
  }

  // Update market supply
  const newSupplies = {
    ...settlement.market.supplies,
    [itemId]: supply - quantity,
  };
  const newMarket = recalculatePrices({
    ...settlement.market,
    supplies: newSupplies,
  });

  newState = {
    ...newState,
    player,
    settlements: {
      ...newState.settlements,
      [settlementId]: { ...settlement, market: newMarket },
    },
  };

  newState = addChronicle(
    newState,
    `Bought ${quantity}× ${item.name} for ${totalCost} coin.`,
    'market',
  );

  return newState;
}

/**
 * Sell an item to a settlement market.
 * Updates coin and market supply (price drops as supply rises).
 */
export function sellItem(
  state: WorldState,
  settlementId: string,
  itemId: string,
  quantity: number,
): WorldState {
  const item = getItem(itemId);
  if (!item) return state;

  let newState = ensureMarket(state, settlementId);
  const settlement = newState.settlements[settlementId];
  if (!settlement) return newState;

  // Check player has the item
  const playerReagent = newState.player.reagents[itemId] ?? 0;
  if (playerReagent < quantity) return newState; // Not enough to sell

  // Sell price is slightly lower than buy price (80% of market price)
  const marketPrice = settlement.market.prices[itemId] ?? item.basePrice;
  const sellPrice = Math.max(1, Math.round(marketPrice * 0.8));
  const totalEarned = sellPrice * quantity;

  // Update player coin and reagents
  const player = { ...newState.player };
  player.coin += totalEarned;
  player.reagents = {
    ...player.reagents,
    [itemId]: playerReagent - quantity,
  };
  if (player.reagents[itemId] <= 0) {
    delete player.reagents[itemId];
  }

  // Update market supply (increase since we're adding to it)
  const currentSupply = settlement.market.supplies[itemId] ?? 0;
  const newSupplies = {
    ...settlement.market.supplies,
    [itemId]: currentSupply + quantity,
  };
  const newMarket = recalculatePrices({
    ...settlement.market,
    supplies: newSupplies,
  });

  newState = {
    ...newState,
    player,
    settlements: {
      ...newState.settlements,
      [settlementId]: { ...settlement, market: newMarket },
    },
  };

  newState = addChronicle(
    newState,
    `Sold ${quantity}× ${item.name} for ${totalEarned} coin.`,
    'market',
  );

  return newState;
}

// --- Quests -----------------------------------------------------------------

/**
 * Generate 2-3 quests for a settlement based on its type and region.
 * Returns updated state with available quests stored on the settlement.
 */
export function generateQuests(state: WorldState, settlementId: string): WorldState {
  const settlement = state.settlements[settlementId];
  if (!settlement) return state;

  const templates = getQuestsForSettlement(settlement.type);
  const rng = mulberry32(state.seed + state.day * 100 + settlementId.length);

  // Pick 2-3 quests
  const count = Math.min(templates.length, 2 + Math.floor(rng() * 2));
  const selected: Quest[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count && i < templates.length; i++) {
    let attempts = 0;
    while (attempts < 10) {
      const idx = Math.floor(rng() * templates.length);
      const template = templates[idx];
      if (used.has(template.id)) {
        attempts++;
        continue;
      }
      used.add(template.id);

      // Clone the quest with a unique instance id
      const quest: Quest = {
        ...template,
        id: `${template.id}_${state.day}_${i}`,
        stages: template.stages.map((s) => ({ ...s })),
        currentStage: 0,
        expiresDay: template.expiresDay ? state.day + template.expiresDay : undefined,
      };
      selected.push(quest);
      break;
    }
  }

  // Store available quests on the world state
  return {
    ...state,
    availableQuests: selected,
  };
}

/**
 * Accept a quest: move it from available to activeQuests.
 */
export function acceptQuest(state: WorldState, questId: string): WorldState {
  const quest = state.availableQuests.find((q) => q.id === questId);
  if (!quest) return state;

  const newAvailable = state.availableQuests.filter((q) => q.id !== questId);
  const newState: WorldState = {
    ...state,
    activeQuests: [...state.activeQuests, { ...quest, currentStage: 0 }],
    availableQuests: newAvailable,
  };

  return addChronicle(newState, `Accepted quest: ${quest.name}`, 'quest');
}

/**
 * Complete a quest: award rewards, update reputation, add to completedQuests.
 */
export function completeQuest(state: WorldState, questId: string): WorldState {
  const quest = state.activeQuests.find((q) => q.id === questId);
  if (!quest) return state;

  let newState = { ...state };
  const player = { ...newState.player };

  // Award rewards
  if (quest.rewards.coin) {
    player.coin += quest.rewards.coin;
  }
  if (quest.rewards.reagents) {
    player.reagents = { ...player.reagents };
    for (const [reagent, amount] of Object.entries(quest.rewards.reagents)) {
      player.reagents[reagent] = (player.reagents[reagent] ?? 0) + amount;
    }
  }
  if (quest.rewards.spells) {
    player.grimoire = [...player.grimoire];
    for (const spellId of quest.rewards.spells) {
      const realSpellId = spellId.replace('scroll_', '');
      if (!player.grimoire.includes(realSpellId)) {
        player.grimoire.push(realSpellId);
      }
    }
  }
  if (quest.rewards.reputation) {
    player.reputation += quest.rewards.reputation;
  }
  if (quest.rewards.title && !player.titles.includes(quest.rewards.title)) {
    player.titles = [...player.titles, quest.rewards.title];
  }

  newState = { ...newState, player };

  // Remove from active, add to completed
  newState = {
    ...newState,
    activeQuests: newState.activeQuests.filter((q) => q.id !== questId),
    completedQuests: [...newState.completedQuests, questId],
  };

  newState = addChronicle(
    newState,
    `Completed quest: ${quest.name}!`,
    'quest',
  );

  return newState;
}

// --- Time -------------------------------------------------------------------

/**
 * Advance time by a number of days.
 * Increments day counter, updates quest expiry, triggers world events.
 */
export function advanceTime(state: WorldState, days: number): WorldState {
  let newState = { ...state, day: state.day + days };

  // Check quest expiry — remove expired quests
  const activeQuests = newState.activeQuests.filter((q) => {
    if (q.expiresDay && newState.day > q.expiresDay) {
      return false; // Quest expired
    }
    return true;
  });

  if (activeQuests.length !== newState.activeQuests.length) {
    newState = { ...newState, activeQuests };
    newState = addChronicle(
      newState,
      'Some quests have expired.',
      'quest',
    );
  }

  // Heal injuries
  const player = { ...newState.player };
  if (player.injuries.length > 0) {
    player.injuries = player.injuries
      .map((inj) => ({ ...inj, duration: inj.duration - days }))
      .filter((inj) => inj.duration > 0);
    newState = { ...newState, player };
  }

  return newState;
}

// --- Deck Preparation -------------------------------------------------------

/**
 * Swap the prepared deck at an inn or college.
 * Requires being at a settlement with inn or college service.
 */
export function prepareDeck(state: WorldState, cardIds: string[]): WorldState {
  const settlement = getPlayerSettlement(state);
  if (!settlement) return state;

  const hasInn = settlement.services.includes('inn');
  const hasCollege = settlement.services.includes('college');
  if (!hasInn && !hasCollege) return state;

  // Validate all cards are in grimoire
  const validCards = cardIds.filter((id) => state.player.grimoire.includes(id));
  if (validCards.length === 0) return state;

  // Prepared deck can be 12-16 cards
  if (validCards.length < 12 || validCards.length > 16) return state;

  const player = { ...state.player, preparedDeck: [...validCards] };
  let newState: WorldState = { ...state, player };

  newState = addChronicle(
    newState,
    `Prepared deck: ${validCards.length} cards.`,
    'discovery',
  );

  return newState;
}

// --- Rest -------------------------------------------------------------------

/**
 * Rest at an inn. Restores vitality and focus, costs coin, advances 1 day.
 */
export function restAtInn(state: WorldState): WorldState {
  const settlement = getPlayerSettlement(state);
  if (!settlement) return state;

  const hasInn = settlement.services.includes('inn');
  if (!hasInn) return state;

  const innCost = 5;
  if (state.player.coin < innCost) return state;

  const player = { ...state.player };
  player.coin -= innCost;
  player.vitality = player.maxVitality;
  player.focus = player.maxFocus;
  player.conditions = [];

  let newState: WorldState = { ...state, player };
  newState = advanceTime(newState, 1);

  newState = addChronicle(
    newState,
    `Rested at the inn. Vitality and Focus restored. (-${innCost} coin)`,
    'travel',
  );

  return newState;
}

// --- Encounter Generation ---------------------------------------------------

/**
 * Generate a random monster encounter based on the region element.
 * Returns a monster ID suitable for combat initialization.
 */
export function generateEncounter(state: WorldState): string | undefined {
  const hex = state.hexes[state.playerHexId];
  const regionId = hex?.regionId;
  const region = regionId ? state.regions[regionId] : undefined;
  const element = region?.element ?? 'fire';

  const rng = mulberry32(state.seed + state.day * 7777);
  const roll = rng();

  // Pick monster based on region element
  if (element === 'fire' && roll < 0.6) {
    return 'ash_troll';
  }
  if (element === 'earth' && roll < 0.6) {
    return 'hill_giant';
  }
  if (element === 'wind' && roll < 0.6) {
    return 'storm_wraith';
  }
  if (element === 'water' && roll < 0.4) {
    return 'storm_wraith';
  }

  // Fallback: pick any monster
  const monster = MONSTERS[Math.floor(rng() * MONSTERS.length)];
  return monster?.id;
}

// --- Get Available Quests (helper) -----------------------------------------

/**
 * Get available quests at the player's current settlement.
 */
export function getAvailableQuests(state: WorldState): Quest[] {
  return state.availableQuests ?? [];
}
