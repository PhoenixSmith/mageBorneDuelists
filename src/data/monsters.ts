// ============================================================================
// MageBorne Duelists — Monster Catalog
// ============================================================================
// 3 monsters with behavior decks, passives, escalation rules, and loot tables.
// Each monster has 5 behavior cards in its deck.
// ============================================================================

import type { Monster, BehaviorCard, LootEntry } from '../types';

// --- Behavior Cards ---------------------------------------------------------

// Ash Troll behaviors
const coalHurl: BehaviorCard = {
  id: 'bt_coal_hurl',
  name: 'Coal Hurl',
  speed: 2,
  effect: 'Far attack for 3 damage. Inflict Burn (2 rounds).',
  range: 'far',
};

const crushingAdvance: BehaviorCard = {
  id: 'bt_crushing_advance',
  name: 'Crushing Advance',
  speed: 1,
  effect: 'Move one range band closer. If Engaged, attack for 4 damage.',
  range: 'engaged',
};

const feedFurnace: BehaviorCard = {
  id: 'bt_feed_furnace',
  name: 'Feed the Furnace',
  speed: 1,
  effect: 'Consume nearby Flame terrain and heal 3 Vitality.',
  range: 'near',
};

const roar: BehaviorCard = {
  id: 'bt_roar',
  name: 'Roar',
  speed: 2,
  effect: 'Inflict Unsteady on all enemies.',
  range: 'far',
};

const overheat: BehaviorCard = {
  id: 'bt_overheat',
  name: 'Overheat',
  speed: 1,
  effect: 'Expose itself. Its next attack deals +3 damage.',
  range: 'engaged',
};

// Hill Giant behaviors
const boulderThrowGiant: BehaviorCard = {
  id: 'bt_boulder_throw',
  name: 'Boulder Throw',
  speed: 2,
  effect: 'Deal 4 damage at Near or Far. Inflict Unsteady.',
  range: ['near', 'far'],
};

const backhand: BehaviorCard = {
  id: 'bt_backhand',
  name: 'Backhand',
  speed: 1,
  effect: 'Deal 5 damage at Engaged range. If the target moved this round, deal +2.',
  range: 'engaged',
};

const groundSlam: BehaviorCard = {
  id: 'bt_ground_slam',
  name: 'Ground Slam',
  speed: 1,
  effect: 'Deal 3 damage to all enemies at Engaged range. Inflict Bound.',
  range: 'engaged',
};

const stomp: BehaviorCard = {
  id: 'bt_stomp',
  name: 'Stomp',
  speed: 2,
  effect: 'Move one range band closer. Inflict Unsteady on enemies at Engaged range.',
  range: 'near',
};

const boulderShield: BehaviorCard = {
  id: 'bt_boulder_shield',
  name: 'Boulder Shield',
  speed: 1,
  effect: 'Gain 4 Guard. Cannot move this round.',
  range: 'engaged',
};

// Storm Wraith behaviors
const lightningBolt: BehaviorCard = {
  id: 'bt_lightning_bolt',
  name: 'Lightning Bolt',
  speed: 4,
  effect: 'Deal 3 damage at Near or Far. If the target is Soaked, deal +2. Inflict Exposed.',
  range: ['near', 'far'],
};

const windSlash: BehaviorCard = {
  id: 'bt_wind_slash',
  name: 'Wind Slash',
  speed: 5,
  effect: 'Deal 2 damage at Engaged range. Move the target one range band away. Inflict Unsteady.',
  range: 'engaged',
};

const galeBurst: BehaviorCard = {
  id: 'bt_gale_burst',
  name: 'Gale Burst',
  speed: 4,
  effect: 'Move two range bands. Draw an extra behavior card next round.',
  range: 'far',
};

const stormCall: BehaviorCard = {
  id: 'bt_storm_call',
  name: 'Storm Call',
  speed: 2,
  effect: 'Inflict Soaked on all enemies. Place one Storm counter. At three counters, deal 3 damage to all enemies.',
  range: 'far',
};

const vanish: BehaviorCard = {
  id: 'bt_vanish',
  name: 'Vanish',
  speed: 5,
  effect: 'Move one range band away. Gain 3 Guard. Cannot be targeted until next round.',
  range: 'far',
};

// --- Behavior Card Registry -------------------------------------------------

export const BEHAVIOR_CARDS: Record<string, BehaviorCard> = {
  bt_coal_hurl: coalHurl,
  bt_crushing_advance: crushingAdvance,
  bt_feed_furnace: feedFurnace,
  bt_roar: roar,
  bt_overheat: overheat,
  bt_boulder_throw: boulderThrowGiant,
  bt_backhand: backhand,
  bt_ground_slam: groundSlam,
  bt_stomp: stomp,
  bt_boulder_shield: boulderShield,
  bt_lightning_bolt: lightningBolt,
  bt_wind_slash: windSlash,
  bt_gale_burst: galeBurst,
  bt_storm_call: stormCall,
  bt_vanish: vanish,
};

export function getBehaviorCard(id: string): BehaviorCard | undefined {
  return BEHAVIOR_CARDS[id];
}

// --- Loot Tables -----------------------------------------------------------

const ashTrollLoot: LootEntry[] = [
  { type: 'reagent', id: 'sulfur', amount: 2, chance: 0.8 },
  { type: 'reagent', id: 'ash_essence', amount: 1, chance: 0.5 },
  { type: 'coin', id: 'coin', amount: 15, chance: 0.6 },
  { type: 'spell', id: 'fireball', amount: 1, chance: 0.15 },
];

const hillGiantLoot: LootEntry[] = [
  { type: 'reagent', id: 'granite_shard', amount: 3, chance: 0.7 },
  { type: 'reagent', id: 'giant_bone', amount: 1, chance: 0.4 },
  { type: 'coin', id: 'coin', amount: 25, chance: 0.8 },
  { type: 'spell', id: 'boulder_throw', amount: 1, chance: 0.1 },
];

const stormWraithLoot: LootEntry[] = [
  { type: 'reagent', id: 'stormglass', amount: 2, chance: 0.7 },
  { type: 'reagent', id: 'static_essence', amount: 1, chance: 0.5 },
  { type: 'coin', id: 'coin', amount: 20, chance: 0.5 },
  { type: 'spell', id: 'chain_lightning', amount: 1, chance: 0.12 },
];

// --- Monsters ---------------------------------------------------------------

export const MONSTERS: Monster[] = [
  {
    id: 'ash_troll',
    name: 'Ash Troll',
    vitality: 12,
    armor: 1,
    movement: 1,
    passive: 'Fire damage heals it unless it is Soaked.',
    behaviorDeck: ['bt_coal_hurl', 'bt_crushing_advance', 'bt_feed_furnace', 'bt_roar', 'bt_overheat'],
    escalationRule: 'After round 3, all behavior cards gain +1 speed and +1 damage.',
    lootTable: ashTrollLoot,
    range: 'far',
    conditions: [],
  },
  {
    id: 'hill_giant',
    name: 'Hill Giant',
    vitality: 16,
    armor: 2,
    movement: 1,
    passive: 'Reduces all incoming damage by 1 (before Guard). Immune to Unsteady.',
    behaviorDeck: ['bt_boulder_throw', 'bt_backhand', 'bt_ground_slam', 'bt_stomp', 'bt_boulder_shield'],
    escalationRule: 'After round 2, the Giant gains +2 damage on all attacks.',
    lootTable: hillGiantLoot,
    range: 'far',
    conditions: [],
  },
  {
    id: 'storm_wraith',
    name: 'Storm Wraith',
    vitality: 8,
    armor: 0,
    movement: 2,
    passive: 'Takes +1 damage from Lightning. Moves two range bands per movement action. Cannot be Bound for more than 1 round.',
    behaviorDeck: ['bt_lightning_bolt', 'bt_wind_slash', 'bt_gale_burst', 'bt_storm_call', 'bt_vanish'],
    escalationRule: 'After round 2, the Wraith reveals two behavior cards per round.',
    lootTable: stormWraithLoot,
    range: 'far',
    conditions: [],
  },
];

export const MONSTER_MAP: Record<string, Monster> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m]),
);

export function getMonster(id: string): Monster | undefined {
  return MONSTER_MAP[id];
}
