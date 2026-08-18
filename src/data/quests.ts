// ============================================================================
// MageBorne Duelists — Quest Templates
// ============================================================================
// 14 quest definitions covering short jobs, quest chains, personal trials,
// and rival objectives. Each element (fire/water/wind/earth) has a trial.
// Includes trade escorts, monster hunts, relic recovery, diplomatic missions.
// ============================================================================

import type { Quest } from '../types';

// --- Short Jobs (1-2 turns) -------------------------------------------------

const escortAlchemist: Quest = {
  id: 'escort_alchemist',
  name: 'Escort the Alchemist',
  description: 'A traveling alchemist needs protection on the road to the next settlement. Bandits have been spotted along the route.',
  type: 'short_job',
  stages: [
    { description: 'Meet the alchemist at the settlement gate', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Escort the alchemist safely to the destination', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
  ],
  currentStage: 0,
  rewards: { coin: 30, reputation: 2 },
  expiresDay: 14,
};

const collectStormglass: Quest = {
  id: 'collect_stormglass',
  name: 'Stormglass Collection',
  description: 'A college researcher needs stormglass samples from the storm-swept coast. Collect 3 pieces.',
  type: 'short_job',
  stages: [
    { description: 'Travel to the storm coast region', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Collect 3 stormglass samples', progress: 0, requiredProgress: 3, resolutionType: 'craft' },
  ],
  currentStage: 0,
  rewards: { coin: 25, reagents: { crystal: 1 }, reputation: 1 },
  expiresDay: 12,
};

const dispelHaunting: Quest = {
  id: 'dispel_haunting',
  name: 'Dispel the Haunting',
  description: 'A restless spirit haunts the old ruins near town. Lay it to rest through magical combat.',
  type: 'short_job',
  stages: [
    { description: 'Travel to the haunted ruins', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Defeat the restless spirit in combat', progress: 0, requiredProgress: 1, resolutionType: 'combat' },
  ],
  currentStage: 0,
  rewards: { coin: 20, reagents: { crystal: 1 }, reputation: 2 },
  expiresDay: 10,
};

const recoverGrimoire: Quest = {
  id: 'recover_grimoire',
  name: 'Recover the Stolen Grimoire',
  description: 'A thief stole a precious spell grimoire from the college library. Track them down and recover it.',
  type: 'short_job',
  stages: [
    { description: 'Follow the thief\'s trail to the next settlement', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Confront the thief and recover the grimoire', progress: 0, requiredProgress: 1, resolutionType: 'combat' },
  ],
  currentStage: 0,
  rewards: { coin: 35, spells: ['purify'], reputation: 3 },
  expiresDay: 14,
};

// --- Quest Chains (branching regional stories) ------------------------------

const riverSpiritDam: Quest = {
  id: 'river_spirit_dam',
  name: 'The River Spirit\'s Demand',
  description: 'A river spirit demands the destruction of a dam that blocks its waters. The town needs the dam for irrigation. The college wants the spirit imprisoned. Your choice changes the region.',
  type: 'quest_chain',
  stages: [
    { description: 'Investigate the dam and speak with all parties', progress: 0, requiredProgress: 1, resolutionType: 'influence' },
    { description: 'Decide: destroy the dam, imprison the spirit, or negotiate a compromise', progress: 0, requiredProgress: 1, resolutionType: 'influence' },
    { description: 'Resolve the situation through action', progress: 0, requiredProgress: 1, resolutionType: 'control' },
  ],
  currentStage: 0,
  rewards: { coin: 50, reputation: 5, title: 'River Mediator', masteryDeed: { element: 'water', deed: 'Resolved a river spirit conflict' } },
  expiresDay: 30,
};

const salamanderCult: Quest = {
  id: 'salamander_cult',
  name: 'The Salamander Cult',
  description: 'A cult worships fire beasts in the Ashen Marches. The baron pays for extermination, but the cult offers forbidden fire spells for letting the beasts multiply.',
  type: 'quest_chain',
  stages: [
    { description: 'Infiltrate the cult\'s gathering place', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Choose: destroy the beasts or ally with the cult', progress: 0, requiredProgress: 1, resolutionType: 'influence' },
    { description: 'Execute your decision in the field', progress: 0, requiredProgress: 1, resolutionType: 'combat' },
  ],
  currentStage: 0,
  rewards: { coin: 40, reputation: 4, masteryDeed: { element: 'fire', deed: 'Resolved the salamander cult crisis' } },
  expiresDay: 28,
};

// --- Personal Trials (advance elemental mastery) ----------------------------

const fireTrial: Quest = {
  id: 'fire_trial',
  name: 'Trial of Embers — Fire Mastery',
  description: 'To prove your mastery of Fire, you must destroy something you could profitably preserve. A rare crystal garden grows in the volcanic wastes. Burn it to the ground.',
  type: 'personal_trial',
  stages: [
    { description: 'Travel to the crystal garden in the volcanic region', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Destroy the crystal garden with fire magic', progress: 0, requiredProgress: 1, resolutionType: 'combat' },
    { description: 'Reflect on the sacrifice and claim your mastery', progress: 0, requiredProgress: 1, resolutionType: 'lore' },
  ],
  currentStage: 0,
  rewards: { reputation: 5, title: 'Kindler of Ashes', masteryDeed: { element: 'fire', deed: 'Destroyed a valuable crystal garden' } },
  expiresDay: 40,
};

const waterTrial: Quest = {
  id: 'water_trial',
  name: 'Trial of Tides — Water Mastery',
  description: 'To prove your mastery of Water, you must defeat an enemy without inflicting direct damage. A corrupted marsh beast threatens the swamp settlement.',
  type: 'personal_trial',
  stages: [
    { description: 'Travel to the corrupted marsh', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Defeat the marsh beast using only indirect means', progress: 0, requiredProgress: 1, resolutionType: 'combat' },
    { description: 'Cleanse the corrupted waters', progress: 0, requiredProgress: 1, resolutionType: 'craft' },
  ],
  currentStage: 0,
  rewards: { reputation: 5, title: 'Tidecaller', masteryDeed: { element: 'water', deed: 'Defeated an enemy without direct damage' } },
  expiresDay: 40,
};

const windTrial: Quest = {
  id: 'wind_trial',
  name: 'Trial of Gusts — Wind Mastery',
  description: 'To prove your mastery of Wind, you must complete objectives in three distant regions before the moon changes. Speed and navigation are your tools.',
  type: 'personal_trial',
  stages: [
    { description: 'Reach the first distant region and plant a wind marker', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Reach the second distant region', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Reach the third distant region and complete the circuit', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
  ],
  currentStage: 0,
  rewards: { reputation: 5, title: 'Windwalker', masteryDeed: { element: 'wind', deed: 'Completed three distant objectives in time' } },
  expiresDay: 21,
};

const earthTrial: Quest = {
  id: 'earth_trial',
  name: 'Trial of Stone — Earth Mastery',
  description: 'To prove your mastery of Earth, you must defend one location through escalating attacks. Fortify a border outpost and hold it against all comers.',
  type: 'personal_trial',
  stages: [
    { description: 'Travel to the border outpost', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Fortify the outpost with earth magic', progress: 0, requiredProgress: 1, resolutionType: 'craft' },
    { description: 'Survive three waves of attackers', progress: 0, requiredProgress: 3, resolutionType: 'combat' },
  ],
  currentStage: 0,
  rewards: { reputation: 5, title: 'Stoneguard', masteryDeed: { element: 'earth', deed: 'Held a position through escalating assault' } },
  expiresDay: 35,
};

// --- Trade Escorts ----------------------------------------------------------

const tradeEscortIron: Quest = {
  id: 'trade_escort_iron',
  name: 'Iron Caravan Escort',
  description: 'A merchant caravan carrying iron ore needs an armed escort through monster territory. Protect the cargo and deliver it safely.',
  type: 'short_job',
  stages: [
    { description: 'Join the caravan at the mining settlement', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Escort the caravan through dangerous territory', progress: 0, requiredProgress: 1, resolutionType: 'combat' },
    { description: 'Deliver the cargo to the destination city', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
  ],
  currentStage: 0,
  rewards: { coin: 45, reagents: { iron_ore: 3 }, reputation: 3 },
  expiresDay: 18,
};

// --- Monster Hunts ----------------------------------------------------------

const monsterHuntAshTroll: Quest = {
  id: 'monster_hunt_ash_troll',
  name: 'Ash Troll Bounty',
  description: 'An ash troll has been terrorizing the volcanic roads. The local baron has posted a bounty for its head.',
  type: 'short_job',
  stages: [
    { description: 'Track the ash troll to its lair', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Slay the ash troll', progress: 0, requiredProgress: 1, resolutionType: 'combat' },
  ],
  currentStage: 0,
  rewards: { coin: 30, reagents: { sulfur: 2, ash_essence: 1 }, reputation: 3 },
  expiresDay: 16,
};

const monsterHuntStormWraith: Quest = {
  id: 'monster_hunt_storm_wraith',
  name: 'Storm Wraith Hunt',
  description: 'A storm wraith has been sinking ships along the coast. Destroy it before it claims more vessels.',
  type: 'short_job',
  stages: [
    { description: 'Sail to the wraith\'s haunting ground', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Destroy the storm wraith', progress: 0, requiredProgress: 1, resolutionType: 'combat' },
  ],
  currentStage: 0,
  rewards: { coin: 40, reagents: { stormglass: 2, static_essence: 1 }, reputation: 4, title: 'Storm Breaker' },
  expiresDay: 20,
};

// --- Relic Recovery ---------------------------------------------------------

const relicRecovery: Quest = {
  id: 'relic_recovery_sunstone',
  name: 'Recovery of the Sunstone',
  description: 'An ancient relic, the Sunstone, lies buried in the old ruins. A college has commissioned its recovery for study.',
  type: 'short_job',
  stages: [
    { description: 'Travel to the ancient ruins', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Navigate the ruin\'s traps and wards', progress: 0, requiredProgress: 1, resolutionType: 'lore' },
    { description: 'Recover the Sunstone and return it', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
  ],
  currentStage: 0,
  rewards: { coin: 50, reputation: 4, spells: ['scroll_ember'] },
  expiresDay: 25,
};

// --- Diplomatic Mission ------------------------------------------------------

const diplomaticMission: Quest = {
  id: 'diplomatic_mission_guilds',
  name: 'Diplomatic Mission: Reconcile the Guilds',
  description: 'Two merchant guilds are on the verge of open conflict. Use your influence to broker peace before violence erupts.',
  type: 'short_job',
  stages: [
    { description: 'Travel to the city where the guilds operate', progress: 0, requiredProgress: 1, resolutionType: 'travel' },
    { description: 'Gather information from both guild leaders', progress: 0, requiredProgress: 2, resolutionType: 'influence' },
    { description: 'Broker a peace agreement', progress: 0, requiredProgress: 1, resolutionType: 'influence' },
  ],
  currentStage: 0,
  rewards: { coin: 40, reputation: 6, title: 'Peacemaker' },
  expiresDay: 22,
};

// --- Quest Registry ---------------------------------------------------------

export const QUEST_TEMPLATES: Quest[] = [
  escortAlchemist,
  collectStormglass,
  dispelHaunting,
  recoverGrimoire,
  riverSpiritDam,
  salamanderCult,
  fireTrial,
  waterTrial,
  windTrial,
  earthTrial,
  tradeEscortIron,
  monsterHuntAshTroll,
  monsterHuntStormWraith,
  relicRecovery,
  diplomaticMission,
];

export const QUEST_MAP: Record<string, Quest> = Object.fromEntries(
  QUEST_TEMPLATES.map((q) => [q.id, q]),
);

export function getQuestTemplate(id: string): Quest | undefined {
  return QUEST_MAP[id];
}

/**
 * Get quests appropriate for a settlement type.
 * Towns and cities get short jobs; colleges get chains and trials.
 */
export function getQuestsForSettlement(settlementType: string): Quest[] {
  switch (settlementType) {
    case 'college':
      return QUEST_TEMPLATES.filter(
        (q) => q.type === 'quest_chain' || q.type === 'personal_trial' || q.id === 'recover_grimoire',
      );
    case 'city':
      return QUEST_TEMPLATES.filter(
        (q) => q.type === 'short_job' || q.type === 'quest_chain',
      );
    case 'nexus':
      return QUEST_TEMPLATES.filter(
        (q) => q.type === 'personal_trial' || q.id === 'relic_recovery_sunstone',
      );
    case 'town':
      return QUEST_TEMPLATES.filter(
        (q) => q.type === 'short_job' && q.stages.length <= 2,
      );
    default:
      return QUEST_TEMPLATES.filter((q) => q.type === 'short_job');
  }
}
