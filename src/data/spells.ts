// ============================================================================
// MageBorne Duelists — Spell Catalog
// ============================================================================
// 36 spells: 8 per element (fire, water, wind, earth) + 4 hybrid spells.
// Each spell follows the SpellCard interface from src/types/index.ts.
// Mix of: attacks, guards, movement, control, counters, summons, utility, rituals.
// ============================================================================

import type { SpellCard } from '../types';

// --- Fire Spells (8) --------------------------------------------------------

const ember: SpellCard = {
  id: 'ember',
  name: 'Ember',
  element: 'fire',
  speed: 3,
  focusCost: 1,
  range: 'near',
  burnIcon: false,
  cast: 'Deal 2 damage and inflict Burn (2 rounds).',
  maneuver: 'Move one range band closer. Gain 1 Guard.',
  empower: 'Deal +1 damage. If the target is Burning, consume Burn to inflict Exposed.',
  channelElement: 'fire',
  tags: ['attack'],
};

const fireball: SpellCard = {
  id: 'fireball',
  name: 'Fireball',
  element: 'fire',
  speed: 2,
  focusCost: 2,
  range: ['near', 'far'],
  burnIcon: true,
  cast: 'Deal 4 damage at Near or Far. Inflict Burn (2 rounds).',
  maneuver: 'Discard to generate 1 Fire mana.',
  empower: 'Deal +2 damage. Strike every enemy at the target\'s range.',
  overcharge: 'Strike every enemy. Inflict Burn on all targets. This card is burned.',
  channelElement: 'fire',
  tags: ['attack'],
  worldUtility: {
    description: 'Clears brambles and obstacles. May destroy loot.',
    contributes: { control: 2 },
  },
};

const cinderLance: SpellCard = {
  id: 'cinder_lance',
  name: 'Cinder Lance',
  element: 'fire',
  speed: 2,
  focusCost: 1,
  range: ['near', 'far'],
  burnIcon: true,
  cast: 'Deal 3 damage at Near or Far. If the target is Burning, deal +1 and consume Burn.',
  maneuver: 'Move one range closer. Gain 1 Guard.',
  empower: 'Deal +1 damage. If the target is Burning, consume Burn to inflict Exposed.',
  overcharge: 'Strike every enemy at the target\'s range. This card is burned.',
  channelElement: 'fire',
  tags: ['attack'],
};

const flameWard: SpellCard = {
  id: 'flame_ward',
  name: 'Flame Ward',
  element: 'fire',
  speed: 2,
  focusCost: 1,
  burnIcon: false,
  cast: 'Gain 3 Guard. Enemies that attack you at Engaged range take 1 damage.',
  maneuver: 'Gain 1 Guard. Move one range band closer.',
  channelElement: 'fire',
  tags: ['guard'],
};

const hearthflame: SpellCard = {
  id: 'hearthflame',
  name: 'Hearthflame',
  element: 'fire',
  speed: 1,
  focusCost: 1,
  burnIcon: false,
  cast: 'Create a flame terrain effect at your range. Hidden enemies are revealed. Ice effects melt.',
  maneuver: 'Gain 1 Guard. Remove Soaked from yourself.',
  channelElement: 'fire',
  tags: ['utility'],
  worldUtility: {
    description: 'Establish a safe camp and improve recovery.',
    contributes: { travel: 2, control: 1 },
  },
};

const conflagration: SpellCard = {
  id: 'conflagration',
  name: 'Conflagration',
  element: 'fire',
  speed: 1,
  focusCost: 2,
  range: 'near',
  burnIcon: true,
  cast: 'Deal 2 damage to all enemies at Near range. Inflict Burn (3 rounds) on each.',
  maneuver: 'Discard to generate 1 Fire mana.',
  empower: 'Combine two Fire cards into one amplified cast: deal 4 damage to all enemies at Near.',
  overcharge: 'Deal 5 damage to all enemies. Inflict Exposed on all targets. This card is burned.',
  channelElement: 'fire',
  tags: ['attack', 'ritual'],
};

const phoenixRising: SpellCard = {
  id: 'phoenix_rising',
  name: 'Phoenix Rising',
  element: 'fire',
  speed: 0,
  focusCost: 3,
  burnIcon: true,
  cast: 'Ritual: Recover 3 Vitality. Remove all conditions from yourself. Burn this card.',
  maneuver: 'Discard to generate 1 Fire mana and heal 1 Vitality.',
  channelElement: 'fire',
  tags: ['ritual'],
};

const smokescreen: SpellCard = {
  id: 'smokescreen',
  name: 'Smokescreen',
  element: 'fire',
  speed: 3,
  focusCost: 1,
  burnIcon: false,
  cast: 'Inflict Exposed on target. Move one range band away. Enemies at Far cannot target you this round.',
  maneuver: 'Move one range band away. Gain 1 Guard.',
  channelElement: 'fire',
  tags: ['control', 'movement'],
};

// --- Water Spells (8) -------------------------------------------------------

const flowingDefense: SpellCard = {
  id: 'flowing_defense',
  name: 'Flowing Defense',
  element: 'water',
  speed: 3,
  focusCost: 1,
  burnIcon: false,
  cast: 'Prevent 2 damage from the next attack. You may become Soaked to prevent 4 instead.',
  maneuver: 'Remove one condition from yourself. Gain 1 Guard.',
  channelElement: 'water',
  tags: ['guard', 'counter'],
};

const purify: SpellCard = {
  id: 'purify',
  name: 'Purify',
  element: 'water',
  speed: 2,
  focusCost: 1,
  burnIcon: false,
  cast: 'Remove Poison, Burn, or one magical condition from yourself or an ally at Engaged range.',
  maneuver: 'Remove Soaked from yourself. Gain 1 Guard.',
  channelElement: 'water',
  tags: ['utility'],
  worldUtility: {
    description: 'Cleanse poisoned water, food, land, or a cursed object.',
    contributes: { control: 3, influence: 1 },
  },
};

const tidalSurge: SpellCard = {
  id: 'tidal_surge',
  name: 'Tidal Surge',
  element: 'water',
  speed: 2,
  focusCost: 2,
  range: ['near', 'far'],
  burnIcon: false,
  cast: 'Deal 3 damage at Near or Far. Inflict Soaked. If the target was already Soaked, inflict Bound.',
  maneuver: 'Move one range band. Gain 1 Guard.',
  empower: 'Push the target one range band away. Deal +1 damage.',
  channelElement: 'water',
  tags: ['attack', 'control'],
};

const rippleStep: SpellCard = {
  id: 'ripple_step',
  name: 'Ripple Step',
  element: 'water',
  speed: 4,
  focusCost: 1,
  burnIcon: false,
  cast: 'Move one range band. If you move away from an Engaged enemy, gain 2 Guard.',
  maneuver: 'Move one range band. Remove one condition from yourself.',
  channelElement: 'water',
  tags: ['movement'],
  worldUtility: {
    description: 'Travel along rivers and waterways with ease.',
    contributes: { travel: 2 },
  },
};

const depthCharge: SpellCard = {
  id: 'depth_charge',
  name: 'Depth Charge',
  element: 'water',
  speed: 1,
  focusCost: 2,
  range: 'near',
  burnIcon: true,
  cast: 'Deal 2 damage at Near range. Inflict Soaked and Unsteady. Draw one card.',
  maneuver: 'Discard to generate 1 Water mana.',
  empower: 'Deal +2 damage. The target loses 1 Focus.',
  overcharge: 'Deal 4 damage to all enemies at Near range. Inflict Soaked on all. This card is burned.',
  channelElement: 'water',
  tags: ['attack', 'control'],
};

const mirrorPool: SpellCard = {
  id: 'mirror_pool',
  name: 'Mirror Pool',
  element: 'water',
  speed: 2,
  focusCost: 1,
  burnIcon: false,
  cast: 'Redirect the next attack targeting you to another legal target at the same range.',
  maneuver: 'Gain 1 Guard. Move one range band.',
  channelElement: 'water',
  tags: ['counter', 'control'],
};

const wellspring: SpellCard = {
  id: 'wellspring',
  name: 'Wellspring',
  element: 'water',
  speed: 0,
  focusCost: 2,
  burnIcon: true,
  cast: 'Ritual: Recover 2 Vitality. Recover one card from discard pile. Burn this card.',
  maneuver: 'Discard to generate 1 Water mana and heal 1 Vitality.',
  channelElement: 'water',
  tags: ['ritual', 'utility'],
};

const quench: SpellCard = {
  id: 'quench',
  name: 'Quench',
  element: 'water',
  speed: 4,
  focusCost: 1,
  burnIcon: false,
  cast: 'Cancel a Fire spell unless its caster channels another Fire card. Remove Burn from the target.',
  maneuver: 'Remove Burn or Soaked from yourself. Gain 1 Guard.',
  channelElement: 'water',
  tags: ['counter'],
};

// --- Wind Spells (8) --------------------------------------------------------

const galeStep: SpellCard = {
  id: 'gale_step',
  name: 'Gale Step',
  element: 'wind',
  speed: 4,
  focusCost: 1,
  burnIcon: false,
  cast: 'Move one range band. If this causes a spell to lose range, draw one card.',
  maneuver: 'Move one range band. Gain 1 Speed for your next spell.',
  channelElement: 'wind',
  tags: ['movement'],
  worldUtility: {
    description: 'Contribute 2 Travel. If crossing mountains or ravines, contribute 3 instead.',
    contributes: { travel: 2 },
  },
};

const crosswind: SpellCard = {
  id: 'crosswind',
  name: 'Crosswind',
  element: 'wind',
  speed: 4,
  focusCost: 1,
  burnIcon: false,
  cast: 'A projectile targets a different legal character or location.',
  maneuver: 'Move one range band. Gain 1 Guard.',
  channelElement: 'wind',
  tags: ['counter'],
};

const scryingWind: SpellCard = {
  id: 'scrying_wind',
  name: 'Scrying Wind',
  element: 'wind',
  speed: 3,
  focusCost: 1,
  burnIcon: false,
  cast: 'Look at one enemy\'s queued spell before choosing your second spell.',
  maneuver: 'Move one range band. Draw one card.',
  channelElement: 'wind',
  tags: ['utility'],
  worldUtility: {
    description: 'Reveal a distant hex or inspect an encounter.',
    contributes: { lore: 2, travel: 1 },
  },
};

const zephyrSlash: SpellCard = {
  id: 'zephyr_slash',
  name: 'Zephyr Slash',
  element: 'wind',
  speed: 5,
  focusCost: 1,
  range: 'engaged',
  burnIcon: false,
  cast: 'Deal 2 damage at Engaged range. Inflict Unsteady. Move one range band after attacking.',
  maneuver: 'Move one range band. Gain 1 Guard.',
  empower: 'Deal +1 damage. Move two range bands after attacking.',
  channelElement: 'wind',
  tags: ['attack', 'movement'],
};

const gatheringStorm: SpellCard = {
  id: 'gathering_storm',
  name: 'Gathering Storm',
  element: 'wind',
  speed: 1,
  focusCost: 1,
  burnIcon: true,
  cast: 'Place one Storm counter. At three counters, deal 3 damage to every enemy and move each one band.',
  maneuver: 'Discard to generate 1 Wind mana.',
  channelElement: 'wind',
  tags: ['ritual', 'control'],
};

const tailwind: SpellCard = {
  id: 'tailwind',
  name: 'Tailwind',
  element: 'wind',
  speed: 3,
  focusCost: 1,
  burnIcon: false,
  cast: 'Your next spell gains +2 Speed. Draw one card.',
  maneuver: 'Move one range band. Cycle one card (discard and draw).',
  channelElement: 'wind',
  tags: ['utility', 'movement'],
};

const windSlash: SpellCard = {
  id: 'wind_slash',
  name: 'Wind Slash',
  element: 'wind',
  speed: 4,
  focusCost: 2,
  range: ['near', 'far'],
  burnIcon: false,
  cast: 'Deal 3 damage at Near or Far. Inflict Exposed. If the target is Bound, deal +2.',
  maneuver: 'Move one range band. Gain 1 Guard.',
  empower: 'Deal +1 damage. Move the target one range band.',
  channelElement: 'wind',
  tags: ['attack'],
};

const cyclone: SpellCard = {
  id: 'cyclone',
  name: 'Cyclone',
  element: 'wind',
  speed: 2,
  focusCost: 2,
  range: 'near',
  burnIcon: true,
  cast: 'Deal 1 damage to all enemies at Near. Move each enemy one range band. Inflict Unsteady on all.',
  maneuver: 'Discard to generate 1 Wind mana.',
  empower: 'Deal +1 damage to all. Move enemies two range bands.',
  overcharge: 'Deal 3 damage to all enemies. Move all enemies two bands. Inflict Exposed. This card is burned.',
  channelElement: 'wind',
  tags: ['attack', 'control'],
};

// --- Earth Spells (8) -------------------------------------------------------

const stoneFist: SpellCard = {
  id: 'stone_fist',
  name: 'Stone Fist',
  element: 'earth',
  speed: 1,
  focusCost: 1,
  range: 'engaged',
  burnIcon: false,
  cast: 'Deal 3 damage at Engaged range. Against a Bound target, deal 5 instead.',
  maneuver: 'Gain 2 Guard. You become Slow (cannot voluntarily move this round).',
  channelElement: 'earth',
  tags: ['attack'],
};

const graniteSkin: SpellCard = {
  id: 'granite_skin',
  name: 'Granite Skin',
  element: 'earth',
  speed: 1,
  focusCost: 1,
  burnIcon: false,
  cast: 'Gain 5 Guard. You cannot voluntarily move this round.',
  maneuver: 'Gain 2 Guard.',
  channelElement: 'earth',
  tags: ['guard'],
};

const shapeStone: SpellCard = {
  id: 'shape_stone',
  name: 'Shape Stone',
  element: 'earth',
  speed: 1,
  focusCost: 1,
  burnIcon: false,
  cast: 'Create Cover at your range. Characters behind it gain 2 Guard against projectiles.',
  maneuver: 'Gain 2 Guard. You cannot voluntarily move this round.',
  channelElement: 'earth',
  tags: ['utility'],
  worldUtility: {
    description: 'Alter a stone obstacle, expose ore, or create a crossing.',
    contributes: { craft: 3, control: 1 },
  },
};

const leyAnchor: SpellCard = {
  id: 'ley_anchor',
  name: 'Ley Anchor',
  element: 'earth',
  speed: 0,
  focusCost: 2,
  burnIcon: false,
  cast: 'Create an Anchor at your current range. Your Earth spells cost one fewer channeled card here.',
  maneuver: 'Gain 2 Guard. You cannot voluntarily move this round.',
  channelElement: 'earth',
  tags: ['ritual'],
};

const clayServitor: SpellCard = {
  id: 'clay_servitor',
  name: 'Clay Servitor',
  element: 'earth',
  speed: 1,
  focusCost: 2,
  burnIcon: true,
  cast: 'Summon a Servitor with 3 Vitality. It can intercept one Engaged attack each round.',
  maneuver: 'Discard to generate 1 Earth mana. Gain 1 Guard.',
  empower: 'The Servitor has 5 Vitality and deals 2 damage on intercept.',
  channelElement: 'earth',
  tags: ['summon'],
};

const boulderThrow: SpellCard = {
  id: 'boulder_throw',
  name: 'Boulder Throw',
  element: 'earth',
  speed: 2,
  focusCost: 2,
  range: ['near', 'far'],
  burnIcon: false,
  cast: 'Deal 4 damage at Near or Far. Inflict Unsteady.',
  maneuver: 'Gain 2 Guard. You become Slow.',
  empower: 'Deal +2 damage. Inflict Bound.',
  channelElement: 'earth',
  tags: ['attack'],
};

const rootGrasp: SpellCard = {
  id: 'root_grasp',
  name: 'Root Grasp',
  element: 'earth',
  speed: 2,
  focusCost: 1,
  range: 'near',
  burnIcon: false,
  cast: 'Inflict Bound on target at Near range. The target must spend 1 Focus or discard a Wind card to move.',
  maneuver: 'Gain 2 Guard. You cannot voluntarily move this round.',
  channelElement: 'earth',
  tags: ['control'],
};

const fortress: SpellCard = {
  id: 'fortress',
  name: 'Fortress',
  element: 'earth',
  speed: 0,
  focusCost: 3,
  burnIcon: true,
  cast: 'Ritual: Gain 8 Guard. Inflict Bound on all enemies at Engaged range. Burn this card.',
  maneuver: 'Gain 3 Guard. You cannot voluntarily move this round.',
  channelElement: 'earth',
  tags: ['ritual', 'guard'],
};

// --- Hybrid Spells (4) ------------------------------------------------------
// One per pairing: magma (fire+earth), lightning (fire+wind), steam (fire+water), storm (water+wind)

const magmaSpray: SpellCard = {
  id: 'magma_spray',
  name: 'Magma Spray',
  element: 'magma',
  speed: 2,
  focusCost: 2,
  range: 'near',
  burnIcon: true,
  cast: 'Deal 4 damage at Near range. Inflict Burn (3 rounds). Reduce target Guard by 2. Requires 1 Fire + 1 Earth mana.',
  maneuver: 'Discard to generate 1 Fire or 1 Earth mana.',
  empower: 'Deal +2 damage. Melt target\'s Guard entirely (set to 0).',
  overcharge: 'Deal 6 damage. Destroy all terrain effects at Near range. This card is burned.',
  channelElement: 'fire',
  tags: ['attack', 'control'],
  worldUtility: {
    description: 'Melt through stone, ore veins, or fortifications.',
    contributes: { craft: 4, control: 2 },
  },
};

const chainLightning: SpellCard = {
  id: 'chain_lightning',
  name: 'Chain Lightning',
  element: 'lightning',
  speed: 3,
  focusCost: 2,
  range: ['near', 'far'],
  burnIcon: true,
  cast: 'Deal 3 damage at Near or Far. If the target is Soaked, deal +2. Arcs to one additional enemy at the same range for 2 damage. Requires 1 Fire + 1 Wind mana.',
  maneuver: 'Discard to generate 1 Fire or 1 Wind mana.',
  empower: 'Arc to two additional enemies instead of one.',
  overcharge: 'Deal 5 damage to all enemies. Inflict Soaked on all. This card is burned.',
  channelElement: 'fire',
  tags: ['attack'],
  worldUtility: {
    description: 'Power a magical device or generator.',
    contributes: { control: 2, craft: 1 },
  },
};

const steamVeil: SpellCard = {
  id: 'steam_veil',
  name: 'Steam Veil',
  element: 'steam',
  speed: 3,
  focusCost: 2,
  burnIcon: false,
  cast: 'Inflict Soaked on all enemies at Near range. Gain 3 Guard. Enemies cannot target you at Far range this round. Requires 1 Fire + 1 Water mana.',
  maneuver: 'Discard to generate 1 Fire or 1 Water mana.',
  empower: 'Deal 2 damage to all Soaked enemies. Inflict Exposed.',
  channelElement: 'fire',
  tags: ['guard', 'control'],
};

const tempest: SpellCard = {
  id: 'tempest',
  name: 'Tempest',
  element: 'storm',
  speed: 2,
  focusCost: 3,
  range: ['near', 'far'],
  burnIcon: true,
  cast: 'Deal 3 damage at Near or Far. Move the target one range band. Inflict Soaked and Unsteady. If three Storm counters exist, consume all to deal +3 damage. Requires 1 Water + 1 Wind mana.',
  maneuver: 'Discard to generate 1 Water or 1 Wind mana.',
  empower: 'Deal +2 damage. Move all enemies one range band.',
  overcharge: 'Deal 5 damage to all enemies. Move all enemies two bands. Inflict Exposed on all. This card is burned.',
  channelElement: 'wind',
  tags: ['attack', 'control'],
};

// --- Spell Registry ---------------------------------------------------------

export const SPELLS: SpellCard[] = [
  // Fire
  ember,
  fireball,
  cinderLance,
  flameWard,
  hearthflame,
  conflagration,
  phoenixRising,
  smokescreen,
  // Water
  flowingDefense,
  purify,
  tidalSurge,
  rippleStep,
  depthCharge,
  mirrorPool,
  wellspring,
  quench,
  // Wind
  galeStep,
  crosswind,
  scryingWind,
  zephyrSlash,
  gatheringStorm,
  tailwind,
  windSlash,
  cyclone,
  // Earth
  stoneFist,
  graniteSkin,
  shapeStone,
  leyAnchor,
  clayServitor,
  boulderThrow,
  rootGrasp,
  fortress,
  // Hybrids
  magmaSpray,
  chainLightning,
  steamVeil,
  tempest,
];

export const SPELL_MAP: Record<string, SpellCard> = Object.fromEntries(
  SPELLS.map((s) => [s.id, s]),
);

export function getSpell(id: string): SpellCard | undefined {
  return SPELL_MAP[id];
}
