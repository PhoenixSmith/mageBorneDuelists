// ============================================================================
// MageBorne Duelists — Domain Types
// ============================================================================

// --- Elements ---------------------------------------------------------------

export type Element = 'fire' | 'water' | 'wind' | 'earth';

export type HybridSchool =
  | 'magma'    // fire + earth
  | 'lightning' // fire + wind
  | 'steam'    // fire + water
  | 'storm'    // water + wind
  | 'growth'   // water + earth
  | 'dust';    // wind + earth

// --- Conditions -------------------------------------------------------------

export type ConditionType = 'burn' | 'soaked' | 'unsteady' | 'bound' | 'exposed' | 'silenced';

export interface Condition {
  type: ConditionType;
  duration: number; // rounds remaining
  stacks?: number;  // for burn duration tracking
}

// --- Range ------------------------------------------------------------------

export type RangeBand = 'engaged' | 'near' | 'far';

// --- Cards ------------------------------------------------------------------

export type CardUse = 'cast' | 'maneuver' | 'channel' | 'reaction';

export interface SpellCard {
  id: string;
  name: string;
  element: Element | HybridSchool;
  speed: number;
  focusCost: number;
  range?: RangeBand | RangeBand[];
  burnIcon: boolean; // true = empowered use burns card for encounter

  cast: string;       // main spell effect description
  maneuver: string;   // weaker utility/movement action
  empower?: string;   // effect when spending matching mana
  overcharge?: string; // dangerous amplified effect, burns card

  // World utility (outside combat)
  worldUtility?: {
    description: string;
    contributes: Partial<Record<'travel' | 'influence' | 'lore' | 'control' | 'craft', number>>;
  };

  // Channel: discard to generate 1 mana of this card's element
  channelElement: Element;

  // Tags for categorization
  tags: string[]; // 'attack', 'guard', 'movement', 'control', 'counter', 'summon', 'utility', 'ritual'
}

// --- Mana -------------------------------------------------------------------

export interface ManaPool {
  fire: number;
  water: number;
  wind: number;
  earth: number;
}

// --- Mage -------------------------------------------------------------------

export interface ElementalMastery {
  fire: number;  // 0-4
  water: number;
  wind: number;
  earth: number;
}

export type Origin = 'street_urchin' | 'minor_noble' | 'hedge_witch' | 'soldier' | 'artisan' | 'scholar';

export interface Mage {
  id: string;
  name: string;
  origin: Origin;
  vitality: number;
  maxVitality: number;
  focus: number;
  maxFocus: number;
  guard: number;
  resolve: number;
  maxResolve: number;

  mastery: ElementalMastery;
  manaPool: ManaPool;
  attunementUsed: boolean; // whether encounter attunement mana is spent

  // Deck state
  grimoire: string[];      // all known spell IDs
  preparedDeck: string[];  // current 12-16 card IDs
  hand: string[];          // current drawn cards
  discard: string[];
  burned: string[];        // permanently removed this encounter
  fatigueCount: number;

  // Position
  range: RangeBand;

  // Conditions
  conditions: Condition[];

  // Equipment
  equipment: Equipment;

  // World state
  coin: number;
  reagents: Record<string, number>;
  reputation: number;
  notoriety: number;
  titles: string[];
  injuries: Injury[];
}

export interface Equipment {
  wand?: string;
  staff?: string;
  orb?: string;
  tome?: string;
  robe?: string;
  familiar?: string;
  trinkets: string[];
  consumables: Consumable[];
}

export interface Consumable {
  id: string;
  name: string;
  effect: string;
  quantity: number;
}

export interface Injury {
  id: string;
  name: string;
  effect: string;
  duration: number; // days remaining
}

// --- Combat -----------------------------------------------------------------

export interface CombatState {
  id: string;
  round: number;
  phase: CombatPhase;
  participants: CombatParticipant[];
  timeline: TimelineEntry[];
  log: CombatLogEntry[];
  result: 'ongoing' | 'victory' | 'defeat' | 'fled' | 'draw';
  encounterType: EncounterType;
  objective?: string;
}

export type CombatPhase =
  | 'intent'
  | 'prepare'
  | 'reveal'
  | 'reaction'
  | 'resolve'
  | 'aftermath'
  | 'resolved';

export interface CombatParticipant {
  id: string;
  name: string;
  isPlayer: boolean;
  vitality: number;
  maxVitality: number;
  focus: number;
  maxFocus: number;
  guard: number;
  range: RangeBand;
  conditions: Condition[];
  hand: string[];
  queuedSpells: QueuedSpell[];
  armor: number;
}

export interface QueuedSpell {
  cardId: string;
  use: CardUse;
  targetId?: string;
  speed: number;
  empowered: boolean;
  overcharged: boolean;
}

export interface TimelineEntry {
  spell: QueuedSpell;
  casterId: string;
  resolved: boolean;
  fizzled: boolean;
}

export interface CombatLogEntry {
  round: number;
  text: string;
  type: 'damage' | 'heal' | 'condition' | 'move' | 'fizzle' | 'info' | 'victory' | 'defeat';
}

export type EncounterType = 'monster' | 'npc' | 'player' | 'tournament';

// --- Monsters ---------------------------------------------------------------

export interface Monster {
  id: string;
  name: string;
  vitality: number;
  armor: number;
  movement: number;
  passive: string;
  behaviorDeck: string[]; // behavior card IDs
  escalationRule: string;
  lootTable: LootEntry[];
  range: RangeBand;
  conditions: Condition[];
}

export interface BehaviorCard {
  id: string;
  name: string;
  speed: number;
  effect: string;
  range: RangeBand | RangeBand[];
}

export interface LootEntry {
  type: 'coin' | 'reagent' | 'item' | 'spell';
  id: string;
  amount: number;
  chance: number;
}

// --- Hex Map ----------------------------------------------------------------

export interface HexTile {
  id: string;
  q: number; // axial coordinate
  r: number;
  terrain: TerrainType;
  elevation: number;
  moisture: number;
  discovered: boolean;
  settlementId?: string;
  regionId?: string;
  hazard?: HazardType;
}

export type TerrainType =
  | 'plains' | 'forest' | 'mountains' | 'desert' | 'swamp'
  | 'water' | 'tundra' | 'volcanic' | 'jungle' | 'ruins';

export type HazardType =
  | 'wildfire' | 'storm' | 'flood' | 'avalanche' | 'curse' | 'monster_territory';

export interface Settlement {
  id: string;
  name: string;
  type: SettlementType;
  hexId: string;
  population: number;
  factionId?: string;
  market: Market;
  services: string[]; // inn, college, forge, alchemist, etc.
}

export type SettlementType = 'town' | 'city' | 'college' | 'nexus' | 'ruin' | 'estate';

export interface Market {
  supplies: Record<string, number>; // reagent/item id → quantity
  demands: Record<string, number>;
  prices: Record<string, number>;  // item id → current price
}

// --- World ------------------------------------------------------------------

export interface WorldState {
  seed: number;
  day: number;
  maxDays: number; // 12 weeks = 84 days
  hexes: Record<string, HexTile>;
  settlements: Record<string, Settlement>;
  regions: Record<string, Region>;
  player: Mage;
  rivals: Mage[];
  activeQuests: Quest[];
  availableQuests: Quest[];
  completedQuests: string[];
  chronicle: ChronicleEntry[];
  currentCombat: CombatState | null;
  conclave: ConclaveState | null;
  playerHexId: string;
}

export interface Region {
  id: string;
  name: string;
  element: Element;
  danger: string;
  opportunity: string;
  factionId?: string;
  hexIds: string[];
  stateChanges: string[]; // permanent changes from quest resolutions
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'short_job' | 'quest_chain' | 'personal_trial' | 'rival_objective';
  regionId?: string;
  stages: QuestStage[];
  currentStage: number;
  rewards: QuestReward;
  expiresDay?: number;
}

export interface QuestStage {
  description: string;
  progress: number;
  requiredProgress: number;
  resolutionType: 'travel' | 'influence' | 'lore' | 'control' | 'craft' | 'combat';
}

export interface QuestReward {
  coin?: number;
  reagents?: Record<string, number>;
  spells?: string[];
  reputation?: number;
  title?: string;
  masteryDeed?: { element: Element; deed: string };
}

export interface ChronicleEntry {
  day: number;
  text: string;
  type: 'travel' | 'combat' | 'quest' | 'market' | 'discovery' | 'mastery' | 'duel';
}

// --- Shop / Market Items ----------------------------------------------------

export interface MarketItem {
  id: string;
  name: string;
  category: 'reagent' | 'consumable' | 'scroll';
  basePrice: number;
  description: string;
}

export interface ShopState {
  items: Record<string, MarketItem>;
  settlementMarkets: Record<string, Market>;
}

// --- Store ------------------------------------------------------------------

export type PanelType = 'map' | 'deck' | 'combat' | 'quests' | 'shop' | 'character' | 'conclave';

export interface GameState {
  world: WorldState;
  activePanel: PanelType;
  selectedHexId: string | null;
  log: string[];
}

// --- Conclave ----------------------------------------------------------------

export type ConclavePhase = 'grand_trial' | 'swiss' | 'ascension' | 'complete';
export type MagePersonality = 'aggressive' | 'defensive' | 'control' | 'greedy' | 'adaptive';

export interface RivalMage {
  mage: Mage;
  personality: MagePersonality;
  description: string;
}

export interface ConclaveStanding {
  mageId: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
  grandTrialScore: number;
  eliminated: boolean;
}

export interface ConclaveMatch {
  id: string;
  round: number;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  log: string[];
  resolved: boolean;
}

export interface ConclaveState {
  phase: ConclavePhase;
  participants: Mage[];
  standings: ConclaveStanding[];
  matches: ConclaveMatch[];
  currentSwissRound: number;
  maxSwissRounds: number;
  ascensionFinalists: string[];
  winner: string | null;
  log: string[];
}
