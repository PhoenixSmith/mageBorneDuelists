// ============================================================================
// MageBorne Duelists — Pure Combat Engine
// ============================================================================
// All functions are pure: they take state and return new state without mutation.
// Combat round phases: intent → prepare → reveal → resolve → aftermath
// ============================================================================

import type {
  CombatState,
  CombatParticipant,
  CombatLogEntry,
  Condition,
  ConditionType,
  EncounterType,
  Mage,
  ManaPool,
  QueuedSpell,
  TimelineEntry,
  RangeBand,
} from '../../types';
import { getSpell } from '../../data/spells';
import { getBehaviorCard, getMonster } from '../../data/monsters';

// --- Utility helpers (pure) -------------------------------------------------

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function makeLogEntry(round: number, text: string, type: CombatLogEntry['type']): CombatLogEntry {
  return { round, text, type };
}

function findParticipant(state: CombatState, id: string): CombatParticipant | undefined {
  return state.participants.find((p) => p.id === id);
}

function updateParticipant(
  state: CombatState,
  id: string,
  updater: (p: CombatParticipant) => CombatParticipant,
): CombatState {
  return {
    ...state,
    participants: state.participants.map((p) => (p.id === id ? updater(p) : p)),
  };
}

// --- Damage application ------------------------------------------------------

/**
 * Apply damage to a target participant. Reduces Guard first, then Vitality.
 * Checks defeat after applying.
 */
export function applyDamage(
  state: CombatState,
  targetId: string,
  amount: number,
  type: 'physical' | 'fire' | 'water' | 'wind' | 'earth' | 'lightning' = 'physical',
): CombatState {
  const target = findParticipant(state, targetId);
  if (!target) return state;

  let remaining = amount;
  const conditions = [...target.conditions];
  const log: CombatLogEntry[] = [...state.log];

  // Soaked: fire damage reduced by 1, lightning damage increased by 1
  const soaked = conditions.some((c) => c.type === 'soaked');
  if (soaked) {
    if (type === 'fire') remaining = Math.max(0, remaining - 1);
    if (type === 'lightning') remaining += 1;
  }

  // Exposed: next attack deals +2
  const exposedIdx = conditions.findIndex((c) => c.type === 'exposed');
  if (exposedIdx >= 0) {
    remaining += 2;
    conditions.splice(exposedIdx, 1);
  }

  // Guard absorbs damage first
  let guard = target.guard;
  if (guard > 0) {
    const absorbed = Math.min(guard, remaining);
    guard -= absorbed;
    remaining -= absorbed;
  }

  // Armor reduces remaining damage
  let vitality = target.vitality;
  if (remaining > 0) {
    const armorReduction = Math.min(target.armor, remaining);
    remaining -= armorReduction;
    vitality = Math.max(0, vitality - remaining);
  }

  log.push(makeLogEntry(state.round, `${target.name} takes ${amount} ${type} damage (${guard} guard remaining, ${vitality} vitality)`, 'damage'));

  // Remove Soaked after taking fire or lightning damage
  if (type === 'fire' || type === 'lightning') {
    const soakedIdx = conditions.findIndex((c) => c.type === 'soaked');
    if (soakedIdx >= 0) {
      conditions.splice(soakedIdx, 1);
    }
  }

  let newState = updateParticipant(state, targetId, (p) => ({
    ...p,
    vitality,
    guard,
    conditions,
  }));

  // Check defeat
  if (checkDefeat({ ...newState.participants.find((p) => p.id === targetId)! })) {
    log.push(makeLogEntry(state.round, `${target.name} is defeated!`, 'defeat'));
    newState = {
      ...newState,
      result: target.isPlayer ? 'defeat' : 'victory',
      phase: 'resolved',
    };
  }

  return { ...newState, log };
}

// --- Condition application ---------------------------------------------------

/**
 * Apply a condition to a target. Stacks duration for burn, replaces for others.
 */
export function applyCondition(
  state: CombatState,
  targetId: string,
  condition: Condition,
): CombatState {
  const target = findParticipant(state, targetId);
  if (!target) return state;

  const conditions = [...target.conditions];
  const existing = conditions.find((c) => c.type === condition.type);

  if (existing) {
    if (condition.type === 'burn') {
      // Burn stacks duration
      existing.duration = Math.max(existing.duration, condition.duration);
    } else {
      // Replace with new duration if longer
      existing.duration = Math.max(existing.duration, condition.duration);
    }
  } else {
    conditions.push({ ...condition });
  }

  const log: CombatLogEntry[] = [...state.log];
  log.push(makeLogEntry(state.round, `${target.name} gains ${condition.type} (${condition.duration} rounds)`, 'condition'));

  return updateParticipant(state, targetId, (p) => ({
    ...p,
    conditions,
  }));
}

/**
 * Remove a specific condition type from a target.
 */
export function removeCondition(
  state: CombatState,
  targetId: string,
  conditionType: ConditionType,
): CombatState {
  const target = findParticipant(state, targetId);
  if (!target) return state;

  const conditions = target.conditions.filter((c) => c.type !== conditionType);
  return updateParticipant(state, targetId, (p) => ({
    ...p,
    conditions,
  }));
}

/**
 * Tick all conditions on a participant (reduce duration by 1, remove expired).
 */
export function tickConditions(state: CombatState, targetId: string): CombatState {
  const target = findParticipant(state, targetId);
  if (!target) return state;

  const conditions = target.conditions
    .map((c) => ({ ...c, duration: c.duration - 1 }))
    .filter((c) => c.duration > 0);

  return updateParticipant(state, targetId, (p) => ({
    ...p,
    conditions,
  }));
}

// --- Defeat check -----------------------------------------------------------

/**
 * Check if a participant is defeated (vitality <= 0).
 */
export function checkDefeat(participant: CombatParticipant): boolean {
  return participant.vitality <= 0;
}

// --- Mana generation --------------------------------------------------------

/**
 * Generate encounter attunement mana for a mage.
 * 1 mana per mastery rank per element per encounter.
 * Only generates once per encounter (checks attunementUsed).
 */
export function generateAttunement(mage: Mage): ManaPool {
  const pool: ManaPool = {
    fire: mage.manaPool.fire,
    water: mage.manaPool.water,
    wind: mage.manaPool.wind,
    earth: mage.manaPool.earth,
  };

  if (!mage.attunementUsed) {
    pool.fire += mage.mastery.fire;
    pool.water += mage.mastery.water;
    pool.wind += mage.mastery.wind;
    pool.earth += mage.mastery.earth;
  }

  return pool;
}

/**
 * Apply attunement mana to a mage (marks attunementUsed = true).
 */
export function applyAttunement(mage: Mage): Mage {
  if (mage.attunementUsed) return mage;

  return {
    ...mage,
    manaPool: generateAttunement(mage),
    attunementUsed: true,
  };
}

// --- Card drawing -----------------------------------------------------------

/**
 * Draw cards from the prepared deck into hand.
 * When the deck is empty, reshuffle discard pile and add a Fatigue card.
 * Returns updated mage state.
 */
export function drawCards(mage: Mage, count: number): Mage {
  let preparedDeck = [...mage.preparedDeck];
  let discard = [...mage.discard];
  let hand = [...mage.hand];
  let fatigueCount = mage.fatigueCount;

  for (let i = 0; i < count; i++) {
    if (preparedDeck.length === 0) {
      // Reshuffle discard pile
      if (discard.length > 0) {
        preparedDeck = [...discard];
        discard = [];
        fatigueCount += 1;
        // Add a fatigue card to the deck
        preparedDeck.push('__fatigue__');
      } else {
        // No cards at all — add fatigue directly to hand
        hand.push('__fatigue__');
        fatigueCount += 1;
        continue;
      }
    }
    const cardId = preparedDeck.shift();
    if (cardId) hand.push(cardId);
  }

  return {
    ...mage,
    preparedDeck,
    discard,
    hand,
    fatigueCount,
  };
}

// --- Combat initialization --------------------------------------------------

/**
 * Initialize a combat encounter.
 * Converts participants (mages/monsters) into CombatParticipant objects.
 */
export function initCombat(
  participants: Array<Mage | { monsterId: string }>,
  encounterType: EncounterType,
): CombatState {
  const combatParticipants: CombatParticipant[] = participants.map((p, idx) => {
    if ('monsterId' in p) {
      // Import monster data
      const monster = getMonsterData(p.monsterId);
      return {
        id: `monster_${idx}`,
        name: monster.name,
        isPlayer: false,
        vitality: monster.vitality,
        maxVitality: monster.vitality,
        focus: 0,
        maxFocus: 0,
        guard: 0,
        range: monster.range,
        conditions: [],
        hand: [],
        queuedSpells: [],
        armor: monster.armor,
      };
    }

    // Mage participant
    const mage = p as Mage;
    return {
      id: mage.id,
      name: mage.name,
      isPlayer: true,
      vitality: mage.vitality,
      maxVitality: mage.maxVitality,
      focus: mage.maxFocus,
      maxFocus: mage.maxFocus,
      guard: 0,
      range: mage.range,
      conditions: [...mage.conditions],
      hand: [...mage.hand],
      queuedSpells: [],
      armor: 0,
    };
  });

  return {
    id: nextId('combat'),
    round: 1,
    phase: 'intent',
    participants: combatParticipants,
    timeline: [],
    log: [makeLogEntry(1, 'Combat begins!', 'info')],
    result: 'ongoing',
    encounterType,
  };
}

// Helper to avoid circular import — reads from monsters data
function getMonsterData(monsterId: string) {
  const monster = getMonster(monsterId);
  if (!monster) {
    throw new Error(`Unknown monster: ${monsterId}`);
  }
  return monster;
}

// --- Timeline building ------------------------------------------------------

/**
 * Build the casting timeline from all participants' queued spells.
 * Orders by speed (highest first). Ties broken by participant order.
 */
export function buildTimeline(state: CombatState): CombatState {
  const entries: TimelineEntry[] = [];

  for (const participant of state.participants) {
    for (const spell of participant.queuedSpells) {
      entries.push({
        spell,
        casterId: participant.id,
        resolved: false,
        fizzled: false,
      });
    }
  }

  // Sort by speed descending (faster resolves first)
  entries.sort((a, b) => b.spell.speed - a.spell.speed);

  return { ...state, timeline: entries };
}

// --- Round resolution -------------------------------------------------------

/**
 * Resolve a full combat round: intent → prepare → reveal → resolve → aftermath.
 * This is the main combat loop function.
 */
export function resolveRound(state: CombatState): CombatState {
  if (state.result !== 'ongoing') return state;

  let s = state;
  const log: CombatLogEntry[] = [...s.log];

  // Phase 1: Intent (monsters reveal behavior)
  s = { ...s, phase: 'intent' };
  log.push(makeLogEntry(s.round, `--- Round ${s.round}: Intent Phase ---`, 'info'));

  // Reveal monster intent (first behavior card in deck, cycling)
  for (const p of s.participants) {
    if (!p.isPlayer) {
      // Pick a behavior card (cycle through deck)
      const monster = getMonster(s.participants.find((sp) => sp.id === p.id)?.name || '');
      if (monster) {
        const behaviorIdx = (s.round - 1) % monster.behaviorDeck.length;
        const behaviorId = monster.behaviorDeck[behaviorIdx];
        const behavior = getBehaviorCard(behaviorId);
        if (behavior) {
          log.push(makeLogEntry(s.round, `${p.name} reveals: ${behavior.name} (Speed ${behavior.speed})`, 'info'));
        }
      }
    }
  }

  // Phase 2: Prepare (build timeline from queued spells)
  s = { ...s, phase: 'prepare' };
  log.push(makeLogEntry(s.round, `Prepare Phase: Building timeline from queued spells.`, 'info'));

  // Phase 3: Reveal
  s = { ...s, phase: 'reveal' };
  s = buildTimeline(s);
  log.push(makeLogEntry(s.round, `Reveal Phase: ${s.timeline.length} spells on the timeline.`, 'info'));

  // Phase 4: Resolve (process timeline fastest to slowest)
  s = { ...s, phase: 'resolve' };
  log.push(makeLogEntry(s.round, `Resolve Phase: Processing timeline.`, 'info'));

  for (const entry of s.timeline) {
    if (entry.resolved || entry.fizzled) continue;

    const caster = findParticipant(s, entry.casterId);
    const target = entry.spell.targetId ? findParticipant(s, entry.spell.targetId) : undefined;

    if (!caster) {
      s = {
        ...s,
        timeline: s.timeline.map((te) =>
          te === entry ? { ...te, fizzled: true } : te,
        ),
      };
      log.push(makeLogEntry(s.round, `Spell fizzled — caster not found.`, 'fizzle'));
      continue;
    }

    // Check if caster is defeated
    if (checkDefeat(caster)) {
      s = {
        ...s,
        timeline: s.timeline.map((te) =>
          te === entry ? { ...te, fizzled: true } : te,
        ),
      };
      log.push(makeLogEntry(s.round, `${caster.name}'s spell fizzled — caster is downed.`, 'fizzle'));
      continue;
    }

    // Check range validity for targeted spells
    const spell = getSpell(entry.spell.cardId);
    if (spell && target && spell.range) {
      const validRanges = Array.isArray(spell.range) ? spell.range : [spell.range];
      if (!validRanges.includes(target.range)) {
        s = {
          ...s,
          timeline: s.timeline.map((te) =>
            te === entry ? { ...te, fizzled: true } : te,
          ),
        };
        log.push(makeLogEntry(s.round, `${spell.name} fizzled — target out of range.`, 'fizzle'));
        continue;
      }
    }

    // Resolve the spell effect
    s = resolveSpellEffect(s, entry, log);
    if (s.result !== 'ongoing') break;
  }

  if (s.result !== 'ongoing') {
    return { ...s, log, phase: 'resolved' };
  }

  // Phase 5: Aftermath
  s = { ...s, phase: 'aftermath' };
  log.push(makeLogEntry(s.round, `Aftermath Phase: Processing ongoing effects.`, 'info'));

  // Burn damage
  for (const p of s.participants) {
    const burn = p.conditions.find((c) => c.type === 'burn');
    if (burn) {
      s = applyDamage(s, p.id, 1, 'fire');
      log.push(makeLogEntry(s.round, `${p.name} takes 1 Burn damage.`, 'damage'));
      if (s.result !== 'ongoing') break;
    }
  }

  if (s.result !== 'ongoing') {
    return { ...s, log, phase: 'resolved' };
  }

  // Guard expires
  s = {
    ...s,
    participants: s.participants.map((p) => ({ ...p, guard: 0 })),
  };

  // Tick conditions (reduce duration)
  for (const p of s.participants) {
    s = tickConditions(s, p.id);
  }

  // Clear queued spells
  s = {
    ...s,
    participants: s.participants.map((p) => ({ ...p, queuedSpells: [] })),
    timeline: [],
  };

  // Advance round
  s = {
    ...s,
    round: s.round + 1,
    phase: 'intent',
    log,
  };

  log.push(makeLogEntry(s.round, `Round ${s.round} begins.`, 'info'));

  return s;
}

/**
 * Resolve a single spell's effect on the timeline.
 * Handles attacks, guards, movement, conditions based on spell tags.
 */
function resolveSpellEffect(
  state: CombatState,
  entry: TimelineEntry,
  log: CombatLogEntry[],
): CombatState {
  let s = state;
  const spell = getSpell(entry.spell.cardId);
  if (!spell) {
    log.push(makeLogEntry(s.round, `Unknown spell: ${entry.spell.cardId}`, 'fizzle'));
    return s;
  }

  const caster = findParticipant(s, entry.casterId)!;
  const targetId = entry.spell.targetId;

  // Mark timeline entry as resolved
  s = {
    ...s,
    timeline: s.timeline.map((te) =>
      te === entry ? { ...te, resolved: true } : te,
    ),
  };

  // Handle based on tags
  if (spell.tags.includes('attack') && targetId) {
    let damage = 2; // base damage for attacks

    // Parse damage from spell description (simplified)
    if (spell.id === 'ember') damage = 2;
    else if (spell.id === 'fireball') damage = 4;
    else if (spell.id === 'cinder_lance') damage = 3;
    else if (spell.id === 'stone_fist') damage = 3;
    else if (spell.id === 'boulder_throw') damage = 4;
    else if (spell.id === 'zephyr_slash') damage = 2;
    else if (spell.id === 'wind_slash') damage = 3;
    else if (spell.id === 'tidal_surge') damage = 3;
    else if (spell.id === 'depth_charge') damage = 2;
    else if (spell.id === 'conflagration') damage = 2;
    else if (spell.id === 'magma_spray') damage = 4;
    else if (spell.id === 'chain_lightning') damage = 3;
    else if (spell.id === 'tempest') damage = 3;
    else if (spell.id === 'cyclone') damage = 1;

    // Empowered bonus
    if (entry.spell.empowered) {
      damage += 1;
    }
    // Overcharged bonus
    if (entry.spell.overcharged) {
      damage += 2;
    }

    // Determine damage type
    let dmgType: 'physical' | 'fire' | 'water' | 'wind' | 'earth' | 'lightning' = 'physical';
    if (spell.element === 'fire' || spell.element === 'magma' || spell.element === 'steam') dmgType = 'fire';
    else if (spell.element === 'water' || spell.element === 'storm') dmgType = 'water';
    else if (spell.element === 'wind') dmgType = 'wind';
    else if (spell.element === 'earth') dmgType = 'earth';
    else if (spell.element === 'lightning') dmgType = 'lightning';

    s = applyDamage(s, targetId, damage, dmgType);
    log.push(makeLogEntry(s.round, `${caster.name} casts ${spell.name} on target for ${damage} ${dmgType} damage.`, 'damage'));

    // Apply conditions from spell
    if (spell.id === 'ember' || spell.id === 'fireball' || spell.id === 'conflagration' || spell.id === 'magma_spray') {
      s = applyCondition(s, targetId, { type: 'burn', duration: 2 });
    }
    if (spell.id === 'tidal_surge' || spell.id === 'depth_charge' || spell.id === 'storm_call' || spell.id === 'steam_veil') {
      s = applyCondition(s, targetId, { type: 'soaked', duration: 3 });
    }
    if (spell.id === 'zephyr_slash' || spell.id === 'cyclone' || spell.id === 'wind_slash' || spell.id === 'boulder_throw') {
      s = applyCondition(s, targetId, { type: 'unsteady', duration: 1 });
    }
    if (spell.id === 'root_grasp' || spell.id === 'tidal_surge') {
      const target = findParticipant(s, targetId);
      if (target?.conditions.some((c) => c.type === 'soaked')) {
        s = applyCondition(s, targetId, { type: 'bound', duration: 2 });
      }
    }
    if (spell.id === 'wind_slash' || spell.id === 'smokescreen' || spell.id === 'chain_lightning') {
      s = applyCondition(s, targetId, { type: 'exposed', duration: 1 });
    }
  }

  // Guard spells
  if (spell.tags.includes('guard')) {
    let guardAmount = 3;
    if (spell.id === 'granite_skin') guardAmount = 5;
    else if (spell.id === 'flame_ward') guardAmount = 3;
    else if (spell.id === 'fortress') guardAmount = 8;
    else if (spell.id === 'steam_veil') guardAmount = 3;

    s = updateParticipant(s, entry.casterId, (p) => ({
      ...p,
      guard: p.guard + guardAmount,
    }));
    log.push(makeLogEntry(s.round, `${caster.name} casts ${spell.name}, gaining ${guardAmount} Guard.`, 'info'));
  }

  // Movement spells
  if (spell.tags.includes('movement')) {
    const newRange: RangeBand = caster.range === 'far' ? 'near' : caster.range === 'near' ? 'engaged' : 'near';
    s = updateParticipant(s, entry.casterId, (p) => ({
      ...p,
      range: newRange,
    }));
    log.push(makeLogEntry(s.round, `${caster.name} casts ${spell.name}, moving to ${newRange}.`, 'move'));
  }

  // Ritual/utility spells — simplified effect logging
  if (spell.tags.includes('ritual') && !spell.tags.includes('attack') && !spell.tags.includes('guard')) {
    if (spell.id === 'phoenix_rising' || spell.id === 'wellspring') {
      s = updateParticipant(s, entry.casterId, (p) => ({
        ...p,
        vitality: Math.min(p.maxVitality, p.vitality + 3),
        conditions: [],
      }));
      log.push(makeLogEntry(s.round, `${caster.name} casts ${spell.name}, recovering 3 Vitality.`, 'heal'));
    }
    if (spell.id === 'gathering_storm') {
      log.push(makeLogEntry(s.round, `${caster.name} places a Storm counter.`, 'info'));
    }
    if (spell.id === 'ley_anchor') {
      log.push(makeLogEntry(s.round, `${caster.name} creates a Ley Anchor.`, 'info'));
    }
  }

  // Summon spells
  if (spell.tags.includes('summon')) {
    log.push(makeLogEntry(s.round, `${caster.name} summons ${spell.name}.`, 'info'));
  }

  // Control spells
  if (spell.tags.includes('control') && targetId && !spell.tags.includes('attack')) {
    if (spell.id === 'root_grasp') {
      s = applyCondition(s, targetId, { type: 'bound', duration: 2 });
    }
    if (spell.id === 'smokescreen') {
      s = applyCondition(s, targetId, { type: 'exposed', duration: 1 });
    }
    if (spell.id === 'cyclone' || spell.id === 'tempest') {
      // Move target one range band
      const target = findParticipant(s, targetId);
      if (target) {
        const newRange: RangeBand = target.range === 'engaged' ? 'near' : target.range === 'near' ? 'far' : 'far';
        s = updateParticipant(s, targetId, (p) => ({ ...p, range: newRange }));
      }
    }
  }

  // Counter spells — simplified (would need reaction window in full implementation)
  if (spell.tags.includes('counter')) {
    log.push(makeLogEntry(s.round, `${caster.name} prepares ${spell.name} as a counter.`, 'info'));
  }

  return s;
}

// --- Queue spell for participant --------------------------------------------

/**
 * Queue a spell for a participant (used during prepare phase).
 */
export function queueSpell(
  state: CombatState,
  participantId: string,
  cardId: string,
  use: QueuedSpell['use'],
  targetId: string | undefined,
  empowered: boolean = false,
  overcharged: boolean = false,
): CombatState {
  const spell = getSpell(cardId);
  if (!spell) return state;

  const queued: QueuedSpell = {
    cardId,
    use,
    targetId,
    speed: spell.speed,
    empowered,
    overcharged,
  };

  return updateParticipant(state, participantId, (p) => ({
    ...p,
    queuedSpells: [...p.queuedSpells, queued],
  }));
}

/**
 * Clear all queued spells for a participant.
 */
export function clearQueuedSpells(state: CombatState, participantId: string): CombatState {
  return updateParticipant(state, participantId, (p) => ({
    ...p,
    queuedSpells: [],
  }));
}

// --- Monster AI (simplified) ------------------------------------------------

/**
 * Generate a queued spell for a monster based on its behavior deck.
 * Picks the behavior card for the current round.
 */
export function generateMonsterAction(
  state: CombatState,
  monsterId: string,
): CombatState {
  const monster = getMonster(monsterId);
  if (!monster) return state;

  const behaviorIdx = (state.round - 1) % monster.behaviorDeck.length;
  const behaviorId = monster.behaviorDeck[behaviorIdx];
  const behavior = getBehaviorCard(behaviorId);
  if (!behavior) return state;

  // Find the player to target
  const player = state.participants.find((p) => p.isPlayer);
  const targetId = player?.id;

  const queued: QueuedSpell = {
    cardId: behaviorId,
    use: 'cast',
    targetId,
    speed: behavior.speed,
    empowered: false,
    overcharged: false,
  };

  return updateParticipant(state, monsterId, (p) => ({
    ...p,
    queuedSpells: [...p.queuedSpells, queued],
  }));
}
