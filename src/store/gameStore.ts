import { create } from 'zustand';
import type { GameState, PanelType, WorldState } from '../types';
import { generateWorld } from '../game/worldgen/worldgen';

const SEED = 42;

const initialWorld = generateWorld(SEED);

interface GameActions {
  setActivePanel: (panel: PanelType) => void;
  selectHex: (hexId: string | null) => void;
  addLogEntry: (text: string) => void;
  advanceDay: () => void;
  setWorld: (world: WorldState) => void;
}

export type Store = GameState & GameActions;

export const useGameStore = create<Store>((set) => ({
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
}));
