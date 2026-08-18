# Gauntlet Run: mageborne-scaffold

## Run ID
20260818-mageborne-scaffold

## Objective
Scaffold and build the first playable vertical slice of MageBorne Duelists.

## Tech Stack
React + TypeScript (Vite), Three.js / React Three Fiber, Tailwind v3, Zustand

## Parts

### 1. foundation
Scaffold the Vite project, install deps, lay down folder skeleton, types, store, and basic UI shell.
- Vite react-ts template
- Install: zustand, three, @react-three/fiber, @react-three/drei, tailwindcss@3, postcss, autoprefixer
- Folder structure per DESIGN.md section 26
- Types: Element, SpellCard, Mage, CombatState, HexTile, WorldState, Condition
- Zustand store with world state + actions skeleton
- Mobile-first UI shell: top bar (gold, day, focus), bottom nav (5 tabs), chronicle log
- Basic App.tsx that renders the shell
- Verify: tsc --noEmit, npm run build, dev server serves

### 2. hex-map
Procedural hex overworld with Three.js / R3F low-poly rendering.
- Seeded RNG (mulberry32)
- Value-noise elevation + moisture → terrain assignment
- Hex math (axial coordinates, pixel-to-hex, neighbors)
- Scatter towns, colleges, nexuses, ruins with min-distance constraint
- R3F scene: flat-shaded low-poly hex tiles, camera controls (orbit)
- DOM overlay: settlement list with distance, type, faction
- Fog of war: undiscovered hexes hidden
- Click hex → select → show info panel
- Verify: build, dev server, browser DOM count (hex meshes > 0), screenshot

### 3. card-combat
Card-driven combat engine and UI.
- Spell card types and catalog (8 per element × 4 elements + 4 hybrids = 36 spells)
- Combat engine: round structure, speed resolution, reactions, conditions
- Monster behavior decks (3 monsters × 5 cards)
- Combat UI: hand display, enemy intent, cast/maneuver selection, timeline
- Two-card commitment (Cast + Maneuver)
- Conditions: Burn, Soaked, Bound, Exposed
- Range bands: Engaged, Near, Far
- Fatigue and deck cycling
- Verify: engine unit tests, browser combat smoke (play card → damage → enemy turn → next round)

### 4. world-quests
World interaction layer connecting map and combat.
- Location decks: each region type spawns situations
- Quest system: short jobs, quest chains, personal trials
- Economy: coin, reagents, focus as world resources
- Markets: supply/demand per city
- Travel system: move between hexes, spend days, encounter checks
- Mage progression: elemental mastery deeds, reputation, titles
- Deck management: grimoire, prepared deck, swap at inns/colleges
- Verify: travel → encounter → combat → reward → shop → deck swap loop in browser

## Execution Order
1. foundation (blocks everything)
2. hex-map + card-combat (parallel after foundation)
3. world-quests (after hex-map + card-combat)
4. Integration: full loop verification

## Worker Runtime
- Builder: Pi CLI (default per gauntlet-loop skill)
- Verifier: Hermes parent (deterministic gates)
- Critic: Fresh delegate_task child (read-only)

## Reference Bar
- DESIGN.md in repo root (the authoritative spec)
- Earthborne Rangers (visual reference: low-poly, hex, persistent world)
- Gloomhaven (card commitment structure)
- Mage Knight (card fungibility)
