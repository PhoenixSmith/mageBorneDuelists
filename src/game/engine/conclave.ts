// ============================================================================
// MageBorne Duelists — Conclave Tournament Engine
// ============================================================================
// Three-act endgame: Grand Trial → Swiss Rounds → Ascension Duel
// Pure functions: take state, return new state.
// ============================================================================

import type {
  ConclaveState,
  ConclaveStanding,
  ConclaveMatch,
  Mage,
  CombatState,
  MagePersonality,
  QueuedSpell,
} from '../../types';
import { RIVALS } from '../../data/rivals';
import { chooseCards, aiChoicesToQueued } from '../ai/mageAI';
import { initCombat, resolveRound, drawCards, checkDefeat, applyAttunement } from './combat';

let matchIdCounter = 0;

function nextMatchId(): string {
  matchIdCounter += 1;
  return `match_${matchIdCounter}`;
}

function prepMageForCombat(mage: Mage): Mage {
  const withAttunement = applyAttunement(mage);
  const withCards = drawCards(withAttunement, 5);
  return withCards;
}

function getPersonality(mageId: string): MagePersonality {
  const rival = RIVALS.find(r => r.mage.id === mageId);
  return rival?.personality ?? 'adaptive';
}

/**
 * Initialize the Conclave with the player and all rival mages.
 */
export function initConclave(player: Mage): ConclaveState {
  const participants = [player, ...RIVALS.map(r => r.mage)];

  const standings: ConclaveStanding[] = participants.map(m => ({
    mageId: m.id,
    name: m.name,
    wins: 0,
    losses: 0,
    points: 0,
    grandTrialScore: 0,
    eliminated: false,
  }));

  return {
    phase: 'grand_trial',
    participants,
    standings,
    matches: [],
    currentSwissRound: 0,
    maxSwissRounds: 3,
    ascensionFinalists: [],
    winner: null,
    log: ['The Conclave begins. Mages from across the land gather for the final trial.'],
  };
}

/**
 * Run the Grand Trial: all mages face a simultaneous elemental challenge.
 * Score based on elemental mastery, vitality, and randomness.
 * Determines seeding for Swiss rounds.
 */
export function runGrandTrial(state: ConclaveState): ConclaveState {
  const log = [...state.log, '=== Act I: The Grand Trial ===', 'All mages face an elemental breach. They must contain it.'];

  const standings = state.standings.map(s => {
    const mage = state.participants.find(m => m.id === s.mageId);
    if (!mage) return s;

    // Score: sum of mastery ranks × 10 + vitality + random
    const masterySum = (mage.mastery.fire + mage.mastery.water + mage.mastery.wind + mage.mastery.earth);
    const equipmentBonus = mage.equipment.trinkets.length * 2;
    const score = masterySum * 10 + mage.vitality + equipmentBonus + Math.floor(Math.random() * 20);

    return { ...s, grandTrialScore: score };
  });

  // Sort by grand trial score for seeding
  standings.sort((a, b) => b.grandTrialScore - a.grandTrialScore);

  log.push(`Grand Trial results:`);
  standings.forEach((s, i) => {
    log.push(`  ${i + 1}. ${s.name} — ${s.grandTrialScore} points`);
  });

  // Top seed gets bonus points
  if (standings.length > 0) standings[0].points += 2;
  if (standings.length > 1) standings[1].points += 1;

  return {
    ...state,
    phase: 'swiss',
    standings,
    log: [...log, '', '=== Act II: Swiss Rounds ===', 'Mages are paired by standing. Three rounds of duels.'],
  };
}

/**
 * Run a single Swiss round. Pair by standings, run AI vs AI matches.
 * If the player is in the Conclave, their match is simulated too (auto-resolved).
 */
export function runSwissRound(state: ConclaveState): ConclaveState {
  if (state.currentSwissRound >= state.maxSwissRounds) {
    return advanceToAscension(state);
  }

  const round = state.currentSwissRound + 1;
  const log = [...state.log, ``, `--- Swiss Round ${round} ---`];

  // Pair by standings (top vs bottom)
  const activeStandings = state.standings.filter(s => !s.eliminated);
  const sorted = [...activeStandings].sort((a, b) => b.points - a.points);

  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < sorted.length - 1; i += 2) {
    pairs.push([sorted[i].mageId, sorted[i + 1].mageId]);
  }
  // Odd one out gets a bye
  if (sorted.length % 2 === 1) {
    const bye = sorted[sorted.length - 1];
    log.push(`${bye.name} receives a bye.`);
    bye.points += 1;
  }

  const newMatches: ConclaveMatch[] = [];
  const updatedStandings = [...state.standings];

  for (const [id1, id2] of pairs) {
    const mage1 = state.participants.find(m => m.id === id1)!;
    const mage2 = state.participants.find(m => m.id === id2)!;

    const result = runSwissMatch(mage1, mage2);
    const match: ConclaveMatch = {
      id: nextMatchId(),
      round,
      player1Id: id1,
      player2Id: id2,
      winnerId: result.winnerId,
      log: result.log,
      resolved: true,
    };
    newMatches.push(match);

    // Update standings
    const s1 = updatedStandings.find(s => s.mageId === id1)!;
    const s2 = updatedStandings.find(s => s.mageId === id2)!;
    if (result.winnerId === id1) {
      s1.wins++; s1.points += 3;
      s2.losses++;
      log.push(`${mage1.name} defeats ${mage2.name}.`);
    } else {
      s2.wins++; s2.points += 3;
      s1.losses++;
      log.push(`${mage2.name} defeats ${mage1.name}.`);
    }
  }

  const newRound = state.currentSwissRound + 1;
  const isLastRound = newRound >= state.maxSwissRounds;

  const newState: ConclaveState = {
    ...state,
    currentSwissRound: newRound,
    standings: updatedStandings,
    matches: [...state.matches, ...newMatches],
    log: [...log, ...(isLastRound ? ['', 'Swiss rounds complete.'] : [])],
  };

  if (isLastRound) {
    return advanceToAscension(newState);
  }

  return newState;
}

/**
 * Run a compressed Swiss match between two mages.
 * Lower vitality, max 5 rounds.
 */
function runSwissMatch(mage1: Mage, mage2: Mage): { winnerId: string; log: string[] } {
  const p1 = prepMageForCombat({ ...mage1, vitality: 8, maxVitality: 8 });
  const p2 = prepMageForCombat({ ...mage2, vitality: 8, maxVitality: 8 });

  let combat = initCombat([p1, p2], 'tournament');
  const log: string[] = [`Match: ${mage1.name} vs ${mage2.name}`];

  for (let round = 0; round < 6; round++) {
    if (combat.result !== 'ongoing') break;

    // AI chooses cards for both participants
    const p1Current = combat.participants.find(p => p.id === p1.id)!;
    const p2Current = combat.participants.find(p => p.id === p2.id)!;

    const pers1 = getPersonality(mage1.id);
    const pers2 = getPersonality(mage2.id);

    const choice1 = chooseCards(p1Current.hand, p1Current, p2Current, pers1, combat);
    const choice2 = chooseCards(p2Current.hand, p2Current, p1Current, pers2, combat);

    if (choice1) {
      const queued = aiChoicesToQueued(choice1);
      for (const q of queued) {
        combat = queueSpellForCombat(combat, p1.id, q);
      }
    }
    if (choice2) {
      const queued = aiChoicesToQueued(choice2);
      for (const q of queued) {
        combat = queueSpellForCombat(combat, p2.id, q);
      }
    }

    combat = resolveRound(combat);

    // Check for defeat
    const p1After = combat.participants.find(p => p.id === p1.id)!;
    const p2After = combat.participants.find(p => p.id === p2.id)!;

    if (checkDefeat(p1After)) {
      log.push(`${mage2.name} wins in round ${round + 1}!`);
      return { winnerId: mage2.id, log };
    }
    if (checkDefeat(p2After)) {
      log.push(`${mage1.name} wins in round ${round + 1}!`);
      return { winnerId: mage1.id, log };
    }
  }

  // Time out: higher vitality wins
  const p1Final = combat.participants.find(p => p.id === p1.id)!;
  const p2Final = combat.participants.find(p => p.id === p2.id)!;
  if (p1Final.vitality >= p2Final.vitality) {
    log.push(`${mage1.name} wins on points (timeout).`);
    return { winnerId: mage1.id, log };
  }
  log.push(`${mage2.name} wins on points (timeout).`);
  return { winnerId: mage2.id, log };
}

/**
 * Queue a spell for a participant in combat.
 */
function queueSpellForCombat(state: CombatState, participantId: string, queued: QueuedSpell): CombatState {
  return {
    ...state,
    participants: state.participants.map(p =>
      p.id === participantId
        ? { ...p, queuedSpells: [...p.queuedSpells, queued] }
        : p
    ),
  };
}

// Re-import QueuedSpell type — moved to top imports

/**
 * Advance to the Ascension Duel with the top two mages.
 */
function advanceToAscension(state: ConclaveState): ConclaveState {
  const sorted = [...state.standings].sort((a, b) => b.points - a.points || b.wins - a.wins);
  const finalists = sorted.slice(0, 2).map(s => s.mageId);

  return {
    ...state,
    phase: 'ascension',
    ascensionFinalists: finalists,
    log: [...state.log, '', '=== Act III: The Ascension Duel ===',
      `The final two: ${sorted[0]?.name} vs ${sorted[1]?.name}`],
  };
}

/**
 * Run the Ascension Duel between the top two mages.
 */
export function runAscensionDuel(state: ConclaveState): ConclaveState {
  if (state.phase !== 'ascension' || state.ascensionFinalists.length < 2) {
    return state;
  }

  const [id1, id2] = state.ascensionFinalists;
  const mage1 = state.participants.find(m => m.id === id1)!;
  const mage2 = state.participants.find(m => m.id === id2)!;

  // Full vitality, up to 10 rounds
  const p1 = prepMageForCombat(mage1);
  const p2 = prepMageForCombat(mage2);

  let combat = initCombat([p1, p2], 'tournament');
  const log: string[] = [`Ascension Duel: ${mage1.name} vs ${mage2.name}`];

  for (let round = 0; round < 10; round++) {
    if (combat.result !== 'ongoing') break;

    const p1Current = combat.participants.find(p => p.id === p1.id)!;
    const p2Current = combat.participants.find(p => p.id === p2.id)!;

    const pers1 = getPersonality(mage1.id);
    const pers2 = getPersonality(mage2.id);

    const choice1 = chooseCards(p1Current.hand, p1Current, p2Current, pers1, combat);
    const choice2 = chooseCards(p2Current.hand, p2Current, p1Current, pers2, combat);

    if (choice1) {
      for (const q of aiChoicesToQueued(choice1)) {
        combat = queueSpellForCombat(combat, p1.id, q);
      }
    }
    if (choice2) {
      for (const q of aiChoicesToQueued(choice2)) {
        combat = queueSpellForCombat(combat, p2.id, q);
      }
    }

    combat = resolveRound(combat);

    const p1After = combat.participants.find(p => p.id === p1.id)!;
    const p2After = combat.participants.find(p => p.id === p2.id)!;

    if (checkDefeat(p1After)) {
      log.push(`${mage2.name} is victorious! ${mage1.name} yields.`);
      return { ...state, phase: 'complete', winner: mage2.id, log: [...state.log, ...log] };
    }
    if (checkDefeat(p2After)) {
      log.push(`${mage1.name} is victorious! ${mage2.name} yields.`);
      return { ...state, phase: 'complete', winner: mage1.id, log: [...state.log, ...log] };
    }
  }

  // Timeout: decide by vitality
  const p1Final = combat.participants.find(p => p.id === p1.id)!;
  const p2Final = combat.participants.find(p => p.id === p2.id)!;
  const winner = p1Final.vitality >= p2Final.vitality ? mage1.id : mage2.id;
  const winnerName = winner === mage1.id ? mage1.name : mage2.name;
  log.push(`${winnerName} wins the Ascension Duel on points!`);

  return { ...state, phase: 'complete', winner, log: [...state.log, ...log] };
}

/**
 * Get the Conclave winner, if any.
 */
export function getConclaveWinner(state: ConclaveState): Mage | null {
  if (state.phase !== 'complete' || !state.winner) return null;
  return state.participants.find(m => m.id === state.winner) ?? null;
}
