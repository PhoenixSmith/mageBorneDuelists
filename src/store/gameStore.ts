import { create } from 'zustand';
import type { GameState, PanelType, WorldState, CardUse } from '../types';
import { generateWorld } from '../game/worldgen/worldgen';
import {
  travelToHex,
  buyItem,
  sellItem,
  generateQuests,
  acceptQuest,
  completeQuest,
  prepareDeck,
  restAtInn,
  generateEncounter,
} from '../game/engine/world';
import { initCombat, resolveRound, queueSpell, generateMonsterAction } from '../game/engine/combat';
import { initConclave, runGrandTrial, runSwissRound, runAscensionDuel, startPlayerConclaveCombat, resolvePlayerMatchResult } from '../game/engine/conclave';

const SEED = 42;

const initialWorld = generateWorld(SEED);

interface GameActions {
  setActivePanel: (panel: PanelType) => void;
  selectHex: (hexId: string | null) => void;
  addLogEntry: (text: string) => void;
  advanceDay: () => void;
  setWorld: (world: WorldState) => void;
  travelTo: (hexId: string) => void;
  shop: (action: 'buy' | 'sell', itemId: string, quantity: number) => void;
  acceptQuest: (questId: string) => void;
  completeQuest: (questId: string) => void;
  generateSettlementQuests: (settlementId: string) => void;
  prepareDeck: (cardIds: string[]) => void;
  rest: () => void;
  startCombat: (monsterId: string) => void;
  resolveCombatRound: () => void;
  queueCard: (cardId: string, use: CardUse) => void;
  startConclave: () => void;
  resolveGrandTrial: () => void;
  resolveSwissRound: () => void;
  resolveAscensionDuel: () => void;
  startConclaveCombat: () => void;
  resolveConclaveCombat: () => void;
}

export type Store = GameState & GameActions;

export const useGameStore = create<Store>((set, get) => ({
  // State
  world: initialWorld,
  activePanel: 'map',
  selectedHexId: null,
  log: ['Your apprenticeship begins. The Conclave awaits in 12 weeks.'],

  // Actions
  setActivePanel: (panel) => set({ activePanel: panel }),

  selectHex: (hexId) => set({ selectedHexId: hexId }),

  addLogEntry: (text) =>
    set((state) => ({
      log: [...state.log.slice(-199), text],
    })),

  advanceDay: () =>
    set((state) => ({
      world: {
        ...state.world,
        day: state.world.day + 1,
        chronicle: [...state.world.chronicle, {
          day: state.world.day + 1,
          text: 'A new day dawns.',
          type: 'travel' as const,
        }].slice(-200),
      },
    })),

  setWorld: (world) => set({ world }),

  travelTo: (hexId) => {
    const state = get();
    const result = travelToHex(state.world, hexId);
    let newWorld = result.state;

    // If encounter triggered, start combat
    if (result.encounterTriggered) {
      const monsterId = generateEncounter(newWorld);
      if (monsterId) {
        const player = newWorld.player;
        const mageWithHand = { ...player, hand: player.preparedDeck.slice(0, 5) };
        const newCombat = initCombat([mageWithHand, { monsterId }], 'monster');

        // Generate monster action
        const monsterParticipantId = newCombat.participants.find((p) => !p.isPlayer)?.id;
        let combatWithAction = newCombat;
        if (monsterParticipantId) {
          combatWithAction = generateMonsterAction(newCombat, monsterParticipantId);
        }

        newWorld = { ...newWorld, currentCombat: combatWithAction };
        set({
          world: newWorld,
          activePanel: 'combat',
          log: [...state.log.slice(-199), `Encounter! Combat begins.`],
        });
        return;
      }
    }

    set({
      world: newWorld,
      log: [...state.log.slice(-199), `Traveled to ${newWorld.hexes[hexId]?.terrain ?? 'unknown'} (${result.daysCost} day${result.daysCost > 1 ? 's' : ''}).`],
    });
  },

  shop: (action, itemId, quantity) => {
    const state = get();
    const world = state.world;
    const playerHex = world.hexes[world.playerHexId];
    const settlementId = playerHex?.settlementId;

    if (!settlementId) return;

    let newWorld: WorldState;
    if (action === 'buy') {
      newWorld = buyItem(world, settlementId, itemId, quantity);
    } else {
      newWorld = sellItem(world, settlementId, itemId, quantity);
    }

    set({
      world: newWorld,
      log: [...state.log.slice(-199), `${action === 'buy' ? 'Bought' : 'Sold'} ${quantity}× ${itemId}.`],
    });
  },

  acceptQuest: (questId) => {
    const state = get();
    const newWorld = acceptQuest(state.world, questId);
    set({
      world: newWorld,
      log: [...state.log.slice(-199), `Quest accepted.`],
    });
  },

  completeQuest: (questId) => {
    const state = get();
    const newWorld = completeQuest(state.world, questId);
    set({
      world: newWorld,
      log: [...state.log.slice(-199), `Quest completed!`],
    });
  },

  generateSettlementQuests: (settlementId) => {
    const state = get();
    const newWorld = generateQuests(state.world, settlementId);
    set({ world: newWorld });
  },

  prepareDeck: (cardIds) => {
    const state = get();
    const newWorld = prepareDeck(state.world, cardIds);
    set({
      world: newWorld,
      log: [...state.log.slice(-199), `Deck prepared: ${cardIds.length} cards.`],
    });
  },

  rest: () => {
    const state = get();
    const newWorld = restAtInn(state.world);
    set({
      world: newWorld,
      log: [...state.log.slice(-199), 'Rested at the inn. Vitality and Focus restored.'],
    });
  },

  startCombat: (monsterId) => {
    const state = get();
    const player = state.world.player;
    const mageWithHand = { ...player, hand: player.preparedDeck.slice(0, 5) };
    const newCombat = initCombat([mageWithHand, { monsterId }], 'monster');

    // Generate monster action
    const monsterParticipantId = newCombat.participants.find((p) => !p.isPlayer)?.id;
    let combatWithAction = newCombat;
    if (monsterParticipantId) {
      combatWithAction = generateMonsterAction(newCombat, monsterParticipantId);
    }

    set({
      world: { ...state.world, currentCombat: combatWithAction },
      activePanel: 'combat',
      log: [...state.log.slice(-199), `Combat started!`],
    });
  },

  resolveCombatRound: () => {
    const state = get();
    const combat = state.world.currentCombat;
    if (!combat) return;

    const result = resolveRound(combat);
    set({
      world: { ...state.world, currentCombat: result },
      log: [...state.log.slice(-199), `Round ${result.round - 1} resolved.`],
    });
  },

  queueCard: (cardId, use) => {
    const state = get();
    const combat = state.world.currentCombat;
    if (!combat) return;

    const playerId = combat.participants.find((p) => p.isPlayer)?.id;
    const monsterId = combat.participants.find((p) => !p.isPlayer)?.id;
    if (!playerId || !monsterId) return;

    const newCombat = queueSpell(combat, playerId, cardId, use, monsterId);
    set({
      world: { ...state.world, currentCombat: newCombat },
    });
  },

  startConclave: () => {
    const state = get();
    const conclave = initConclave(state.world.player);
    set({
      world: { ...state.world, conclave },
      activePanel: 'conclave',
      log: [...state.log.slice(-199), 'The Conclave begins!'],
    });
  },

  resolveGrandTrial: () => {
    const state = get();
    if (!state.world.conclave) return;
    const conclave = runGrandTrial(state.world.conclave);
    set({
      world: { ...state.world, conclave },
      log: [...state.log.slice(-199), 'Grand Trial complete.'],
    });
  },

  resolveSwissRound: () => {
    const state = get();
    if (!state.world.conclave) return;
    const conclave = runSwissRound(state.world.conclave);
    set({
      world: { ...state.world, conclave },
      log: [...state.log.slice(-199), `Swiss round ${conclave.currentSwissRound} complete.`],
    });
  },

  resolveAscensionDuel: () => {
    const state = get();
    if (!state.world.conclave) return;
    const conclave = runAscensionDuel(state.world.conclave);
    const winnerName = conclave.winner
      ? conclave.participants.find(m => m.id === conclave.winner)?.name
      : null;
    set({
      world: { ...state.world, conclave },
      log: [...state.log.slice(-199), winnerName ? `${winnerName} wins the Conclave!` : 'Ascension Duel begins.'],
    });
  },

  startConclaveCombat: () => {
    const state = get();
    if (!state.world.conclave) return;
    const combat = startPlayerConclaveCombat(state.world.conclave, state.world.player);
    if (!combat) return;
    set({
      world: { ...state.world, currentCombat: combat },
      activePanel: 'combat',
      log: [...state.log.slice(-199), 'Conclave duel begins!'],
    });
  },

  resolveConclaveCombat: () => {
    const state = get();
    if (!state.world.conclave || !state.world.currentCombat) return;
    const combatResult = state.world.currentCombat;
    const conclave = resolvePlayerMatchResult(state.world.conclave, combatResult);
    const winnerName = conclave.winner
      ? conclave.participants.find(m => m.id === conclave.winner)?.name
      : null;
    set({
      world: { ...state.world, conclave, currentCombat: null },
      activePanel: 'conclave',
      log: [...state.log.slice(-199),
        conclave.phase === 'complete' && winnerName
          ? `${winnerName} wins the Conclave!`
          : 'Match resolved. Return to the Conclave.',
      ],
    });
  },
}));
