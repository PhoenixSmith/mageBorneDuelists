// ============================================================================
// MageBorne Duelists — Market Initialization
// ============================================================================
// Supply/demand based markets for each settlement type and region element.
// Price formula: basePrice × (demand / supply) with floors and ceilings.
// ============================================================================

import type { Market, MarketItem, SettlementType, Element } from '../types';

// --- Base Item Catalog ------------------------------------------------------

export const ITEM_CATALOG: MarketItem[] = [
  // Reagents
  { id: 'sulfur', name: 'Sulfur', category: 'reagent', basePrice: 5, description: 'Fire reagent. Found in volcanic regions.' },
  { id: 'stormglass', name: 'Stormglass', category: 'reagent', basePrice: 8, description: 'Wind reagent. Harvested from storm-swept coasts.' },
  { id: 'herbs', name: 'Medicinal Herbs', category: 'reagent', basePrice: 4, description: 'Water reagent. Grown in temperate forests.' },
  { id: 'iron_ore', name: 'Iron Ore', category: 'reagent', basePrice: 6, description: 'Earth reagent. Mined from mountainous terrain.' },
  { id: 'crystal', name: 'Mana Crystal', category: 'reagent', basePrice: 12, description: 'Neutral reagent. Found in nexus sites.' },
  { id: 'ash_essence', name: 'Ash Essence', category: 'reagent', basePrice: 7, description: 'Fire reagent. Distilled from burnt ground.' },
  { id: 'granite_shard', name: 'Granite Shard', category: 'reagent', basePrice: 5, description: 'Earth reagent. Split from mountain stone.' },
  { id: 'static_essence', name: 'Static Essence', category: 'reagent', basePrice: 9, description: 'Wind reagent. Captured from lightning strikes.' },
  { id: 'giant_bone', name: 'Giant Bone', category: 'reagent', basePrice: 15, description: 'Rare reagent. Trophy from hill giants.' },

  // Consumables
  { id: 'healing_draught', name: 'Healing Draught', category: 'consumable', basePrice: 15, description: 'Restore 3 Vitality outside combat.' },
  { id: 'mana_potion', name: 'Mana Potion', category: 'consumable', basePrice: 20, description: 'Recover 2 Focus outside combat.' },
  { id: 'focus_tonic', name: 'Focus Tonic', category: 'consumable', basePrice: 25, description: 'Recover all Focus.' },
  { id: 'antidote', name: 'Antidote', category: 'consumable', basePrice: 10, description: 'Cures poison and disease.' },
  { id: 'fire_resist_scroll', name: 'Scroll of Fire Resistance', category: 'consumable', basePrice: 30, description: 'Grants temporary fire resistance.' },

  // Spell Scrolls
  { id: 'scroll_ember', name: 'Scroll: Ember', category: 'scroll', basePrice: 40, description: 'Learn the Ember spell.' },
  { id: 'scroll_fireball', name: 'Scroll: Fireball', category: 'scroll', basePrice: 80, description: 'Learn the Fireball spell.' },
  { id: 'scroll_gale_step', name: 'Scroll: Gale Step', category: 'scroll', basePrice: 50, description: 'Learn the Gale Step spell.' },
  { id: 'scroll_stone_fist', name: 'Scroll: Stone Fist', category: 'scroll', basePrice: 50, description: 'Learn the Stone Fist spell.' },
  { id: 'scroll_flowing_defense', name: 'Scroll: Flowing Defense', category: 'scroll', basePrice: 45, description: 'Learn the Flowing Defense spell.' },
  { id: 'scroll_purify', name: 'Scroll: Purify', category: 'scroll', basePrice: 35, description: 'Learn the Purify spell.' },
];

export const ITEM_MAP: Record<string, MarketItem> = Object.fromEntries(
  ITEM_CATALOG.map((item) => [item.id, item]),
);

export function getItem(id: string): MarketItem | undefined {
  return ITEM_MAP[id];
}

// --- Price Formula -----------------------------------------------------------

export const PRICE_FLOOR = 0.5;
export const PRICE_CEILING = 3.0;

/**
 * Calculate current price for an item based on supply and demand.
 * Formula: basePrice × (demand / supply) clamped to [floor, ceiling].
 */
export function calculatePrice(basePrice: number, supply: number, demand: number): number {
  if (supply <= 0) return Math.round(basePrice * PRICE_CEILING);
  const ratio = demand / supply;
  const multiplier = Math.max(PRICE_FLOOR, Math.min(PRICE_CEILING, ratio));
  return Math.max(1, Math.round(basePrice * multiplier));
}

// --- Market Generation -------------------------------------------------------

/**
 * Region element influences which reagents are abundant (high supply, low price)
 * and which are scarce (low supply, high demand).
 */
const ELEMENT_REAGENTS: Record<Element, { abundant: string[]; scarce: string[] }> = {
  fire: { abundant: ['sulfur', 'ash_essence'], scarce: ['herbs', 'crystal'] },
  water: { abundant: ['herbs', 'crystal'], scarce: ['sulfur', 'iron_ore'] },
  wind: { abundant: ['stormglass', 'static_essence'], scarce: ['iron_ore', 'granite_shard'] },
  earth: { abundant: ['iron_ore', 'granite_shard'], scarce: ['stormglass', 'static_essence'] },
};

/**
 * Settlement type influences what items are available.
 * Cities have everything, colleges have scrolls, towns have basics.
 */
const SETTLEMENT_INVENTORY: Record<SettlementType, string[]> = {
  city: ITEM_CATALOG.map((i) => i.id),
  college: ['sulfur', 'stormglass', 'herbs', 'iron_ore', 'crystal', 'healing_draught', 'mana_potion',
            'scroll_ember', 'scroll_fireball', 'scroll_gale_step', 'scroll_stone_fist', 'scroll_flowing_defense', 'scroll_purify'],
  nexus: ['crystal', 'sulfur', 'stormglass', 'herbs', 'iron_ore', 'healing_draught', 'focus_tonic'],
  town: ['sulfur', 'herbs', 'iron_ore', 'healing_draught', 'antidote'],
  ruin: ['crystal', 'ash_essence', 'giant_bone', 'fire_resist_scroll'],
  estate: ['herbs', 'crystal', 'healing_draught', 'mana_potion', 'antidote'],
};

/**
 * Generate a market for a settlement based on its type and region element.
 * Uses the provided RNG for deterministic generation.
 */
export function generateMarket(
  settlementType: SettlementType,
  regionElement: Element,
  rng: () => number,
): Market {
  const supplies: Record<string, number> = {};
  const demands: Record<string, number> = {};
  const prices: Record<string, number> = {};

  const inventory = SETTLEMENT_INVENTORY[settlementType] ?? SETTLEMENT_INVENTORY.town;
  const elementMods = ELEMENT_REAGENTS[regionElement] ?? ELEMENT_REAGENTS.fire;

  for (const itemId of inventory) {
    const item = ITEM_MAP[itemId];
    if (!item) continue;

    // Base supply: 5-20
    let supply = Math.floor(rng() * 15) + 5;

    // Base demand: 3-15
    let demand = Math.floor(rng() * 12) + 3;

    // Element modifiers: abundant reagents have higher supply
    if (elementMods.abundant.includes(itemId)) {
      supply += Math.floor(rng() * 15) + 5;
    }
    // Scarce reagents have higher demand
    if (elementMods.scarce.includes(itemId)) {
      demand += Math.floor(rng() * 10) + 5;
    }

    // Cities have higher supply and demand overall
    if (settlementType === 'city') {
      supply += Math.floor(rng() * 10);
      demand += Math.floor(rng() * 8);
    }

    // Colleges have high demand for reagents (research)
    if (settlementType === 'college' && item.category === 'reagent') {
      demand += Math.floor(rng() * 8) + 3;
    }

    // Ruins have low supply but high demand for consumables
    if (settlementType === 'ruin') {
      supply = Math.max(1, Math.floor(supply / 2));
      if (item.category === 'consumable') demand += Math.floor(rng() * 8) + 5;
    }

    supplies[itemId] = supply;
    demands[itemId] = demand;
    prices[itemId] = calculatePrice(item.basePrice, supply, demand);
  }

  return { supplies, demands, prices };
}

/**
 * Recalculate all prices in a market after supply/demand changes.
 */
export function recalculatePrices(market: Market): Market {
  const prices: Record<string, number> = {};
  for (const itemId of Object.keys(market.supplies)) {
    const item = ITEM_MAP[itemId];
    if (!item) continue;
    const supply = market.supplies[itemId] ?? 0;
    const demand = market.demands[itemId] ?? 1;
    prices[itemId] = calculatePrice(item.basePrice, supply, demand);
  }
  return { ...market, prices };
}
