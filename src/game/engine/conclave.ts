// ============================================================================
// MageBorne Duelists — Conclave Tournament Engine
// ============================================================================
// Three-act endgame: Grand Trial → Swiss Rounds → Ascension Duel
//
// Player matches are NOT auto-resolved. When the player has a match:
//   1. AI vs AI matches in the same round are auto-resolved
//   2. The player's match is set as pendingPlayerMatch
//   3. The store hands off to the combat panel for live play
//   4. When combat resolves, resolvePlayerMatchResult() feeds the result back
//
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

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

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
    pendingPlayerMatch: null,
    pendingMatchPhase: null,
    pendingMatchId: null,
  };
}

// ---------------------------------------------------------------------------
// Act I: Grand Trial
// ---------------------------------------------------------------------------

export function runGrandTrial(state: ConclaveState): ConclaveState {
  const log = [...state.log, '=== Act I: The Grand Trial ===', 'All mages face an elemental breach. They must contain it.'];

  const standings = state.standings.map(s => {
    const mage = state.participants.find(m => m.id === s.mageId);
    if (!mage) return s;

    const masterySum = (mage.mastery.fire + mage.mastery.water + mage.mastery.wind + mage.mastery.earth);
    const equipmentBonus = mage.equipment.trinkets.length * 2;
    const score = masterySum * 10 + mage.vitality + equipmentBonus + Math.floor(Math.random() * 20);

    return { ...s, grandTrialScore: score };
  });

  standings.sort((a, b) => b.grandTrialScore - a.grandTrialScore);

  log.push(`Grand Trial results:`);
  standings.forEach((s, i) => {
    log.push(`  ${i + 1}. ${s.name} — ${s.grandTrialScore} points`);
  });

  if (standings.length > 0) standings[0].points += 2;
  if (standings.length > 1) standings[1].points += 1;

  return {
    ...state,
    phase: 'swiss',
    standings,
    log: [...log, '', '=== Act II: Swiss Rounds ===', 'Mages are paired by standing. Three rounds of duels.'],
  };
}

// ---------------------------------------------------------------------------
// Act II: Swiss Rounds
// ---------------------------------------------------------------------------

/**
 * Run a Swiss round. Auto-resolves AI vs AI matches.
 * If the player is in a match, sets pendingPlayerMatch and returns —
 * the store should hand off to the combat panel.
 */
export function runSwissRound(state: ConclaveState): ConclaveState {
  if (state.currentSwissRound >= state.maxSwissRounds) {
    return advanceToAscension(state);
  }

  // If we have a pending player match, don't start a new round
  if (state.pendingPlayerMatch) {
    return state;
  }

  const round = state.currentSwissRound + 1;
  const log = [...state.log, ``, `--- Swiss Round ${round} ---`];

  const activeStandings = state.standings.filter(s => !s.eliminated);
  const sorted = [...activeStandings].sort((a, b) => b.points - a.points);

  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < sorted.length - 1; i += 2) {
    pairs.push([sorted[i].mageId, sorted[i + 1].mageId]);
  }
  if (sorted.length % 2 === 1) {
    const bye = sorted[sorted.length - 1];
    log.push(`${bye.name} receives a bye.`);
    bye.points += 1;
  }

  const newMatches: ConclaveMatch[] = [];
  const updatedStandings = [...state.standings];
  let playerOpponentId: string | null = null;
  let playerMatchId: string | null = null;

  for (const [id1, id2] of pairs) {
    const mage1 = state.participants.find(m => m.id === id1)!;
    const mage2 = state.participants.find(m => m.id === id2)!;

    // Check if the player is in this match
    const playerInMatch = id1 === 'player' || id2 === 'player';
    const opponentId = id1 === 'player' ? id2 : (id2 === 'player' ? id1 : null);

    if (playerInMatch && opponentId) {
      // Don't auto-resolve — set as pending
      const matchId = nextMatchId();
      playerMatchId = matchId;
      playerOpponentId = opponentId;

      const match: ConclaveMatch = {
        id: matchId,
        round,
        player1Id: id1,
        player2Id: id2,
        winnerId: null,
        log: [],
        resolved: false,
      };
      newMatches.push(match);
      log.push(`Your match: ${mage1.name} vs ${mage2.name}. Prepare to duel!`);
    } else {
      // Auto-resolve AI vs AI
      const result = runAIMatch(mage1, mage2, 8, 6);
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
  }

  const newState: ConclaveState = {
    ...state,
    matches: [...state.matches, ...newMatches],
    log,
    pendingPlayerMatch: playerOpponentId,
    pendingMatchPhase: playerOpponentId ? 'swiss' : null,
    pendingMatchId: playerMatchId,
  };

  // If no player match, advance the round counter
  if (!playerOpponentId) {
    const newRound = newState.currentSwissRound + 1;
    const isLastRound = newRound >= newState.maxSwissRounds;
    newState.currentSwissRound = newRound;
    if (isLastRound) {
      return advanceToAscension(newState);
    }
  }

  return newState;
}

/**
 * Create a CombatState for the player's pending Conclave match.
 * Returns null if no pending match.
 */
export function startPlayerConclaveCombat(state: ConclaveState, player: Mage): CombatState | null {
  if (!state.pendingPlayerMatch) return null;

  const opponent = state.participants.find(m => m.id === state.pendingPlayerMatch);
  if (!opponent) return null;

  const isAscension = state.pendingMatchPhase === 'ascension';
  const vitality = isAscension ? player.maxVitality : 8;

  const playerPrepped = prepMageForCombat({ ...player, vitality, maxVitality: vitality });
  const opponentPrepped = prepMageForCombat({ ...opponent, vitality, maxVitality: vitality });

  const combat = initCombat([playerPrepped, opponentPrepped], 'tournament');

  // Generate AI opponent's first move
  const opponentParticipant = combat.participants.find(p => p.id === opponent.id);
  if (opponentParticipant) {
    const playerParticipant = combat.participants.find(p => p.id === 'player')!;
    const personality = getPersonality(opponent.id);
    const choice = chooseCards(opponentParticipant.hand, opponentParticipant, playerParticipant, personality, combat);
    if (choice) {
      let combatWithAI = combat;
      for (const q of aiChoicesToQueued(choice)) {
        combatWithAI = queueSpellForCombat(combatWithAI, opponent.id, q);
      }
      return combatWithAI;
    }
  }

  return combat;
}

/**
 * After the player's combat resolves, feed the result back into Conclave standings.
 * Clears pendingPlayerMatch and advances the round/tournament as needed.
 */
export function resolvePlayerMatchResult(state: ConclaveState, combatResult: CombatState): ConclaveState {
  if (!state.pendingPlayerMatch || !state.pendingMatchId) return state;

  const opponentId = state.pendingPlayerMatch;
  const matchId = state.pendingMatchId;
  const opponent = state.participants.find(m => m.id === opponentId)!;

  // Determine winner
  const playerParticipant = combatResult.participants.find(p => p.id === 'player');
  const opponentParticipant = combatResult.participants.find(p => p.id === opponentId);

  let winnerId: string;
  if (opponentParticipant && checkDefeat(opponentParticipant)) {
    winnerId = 'player';
  } else if (playerParticipant && checkDefeat(playerParticipant)) {
    winnerId = opponentId;
  } else if ((playerParticipant?.vitality ?? 0) >= (opponentParticipant?.vitality ?? 0)) {
    winnerId = 'player';
  } else {
    winnerId = opponentId;
  }

  const log = [...state.log, `Match result: ${winnerId === 'player' ? 'You' : opponent.name} ${winnerId === 'player' ? 'defeat' : 'defeats'} ${winnerId === 'player' ? opponent.name : 'you'}.`];

  // Update the match record
  const matches = state.matches.map(m => {
    if (m.id === matchId) {
      return { ...m, winnerId, resolved: true, log: combatResult.log.map(l => l.text) };
    }
    return m;
  });

  // Update standings
  const standings = state.standings.map(s => {
    if (s.mageId === winnerId) {
      return { ...s, wins: s.wins + 1, points: s.points + 3 };
    }
    if (s.mageId === (winnerId === 'player' ? opponentId : 'player')) {
      return { ...s, losses: s.losses + 1 };
    }
    return s;
  });

  // Clear pending match
  const newState: ConclaveState = {
    ...state,
    matches,
    standings,
    log,
    pendingPlayerMatch: null,
    pendingMatchPhase: null,
    pendingMatchId: null,
  };

  // Advance based on what phase we were in
  if (state.pendingMatchPhase === 'swiss') {
    const newRound = newState.currentSwissRound + 1;
    const isLastRound = newRound >= newState.maxSwissRounds;
    newState.currentSwissRound = newRound;
    if (isLastRound) {
      return advanceToAscension(newState);
    }
    return newState;
  }

  if (state.pendingMatchPhase === 'ascension') {
    return { ...newState, phase: 'complete', winner: winnerId };
  }

  return newState;
}

// ---------------------------------------------------------------------------
// Act III: Ascension Duel
// ---------------------------------------------------------------------------

/**
 * Start the Ascension Duel. If the player is a finalist, sets pendingPlayerMatch
 * for live combat. Otherwise auto-resolves.
 */
export function runAscensionDuel(state: ConclaveState): ConclaveState {
  if (state.phase !== 'ascension' || state.ascensionFinalists.length < 2) {
    return state;
  }

  const [id1, id2] = state.ascensionFinalists;
  const mage1 = state.participants.find(m => m.id === id1)!;
  const mage2 = state.participants.find(m => m.id === id2)!;

  const playerIsFinalist = id1 === 'player' || id2 === 'player';
  const opponentId = id1 === 'player' ? id2 : id2 === 'player' ? id1 : null;

  if (playerIsFinalist && opponentId) {
    // Set pending for live play
    const matchId = nextMatchId();
    const match: ConclaveMatch = {
      id: matchId,
      round: 0,
      player1Id: id1,
      player2Id: id2,
      winnerId: null,
      log: [],
      resolved: false,
    };

    return {
      ...state,
      matches: [...state.matches, match],
      log: [...state.log, `Ascension Duel: ${mage1.name} vs ${mage2.name}. Fight for the championship!`],
      pendingPlayerMatch: opponentId,
      pendingMatchPhase: 'ascension',
      pendingMatchId: matchId,
    };
  }

  // Auto-resolve AI vs AI
  const result = runAIMatch(mage1, mage2, mage1.maxVitality, 10);
  const winner = result.winnerId;
  const winnerName = winner === mage1.id ? mage1.name : mage2.name;

  return {
    ...state,
    phase: 'complete',
    winner,
    log: [...state.log, `Ascension Duel: ${mage1.name} vs ${mage2.name}`, ...result.log, `${winnerName} wins the Ascension Duel!`],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function runAIMatch(mage1: Mage, mage2: Mage, vitality: number, maxRounds: number): { winnerId: string; log: string[] } {
  const p1 = prepMageForCombat({ ...mage1, vitality, maxVitality: vitality });
  const p2 = prepMageForCombat({ ...mage2, vitality, maxVitality: vitality });

  let combat = initCombat([p1, p2], 'tournament');
  const log: string[] = [`Match: ${mage1.name} vs ${mage2.name}`];

  for (let round = 0; round < maxRounds; round++) {
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
      log.push(`${mage2.name} wins in round ${round + 1}!`);
      return { winnerId: mage2.id, log };
    }
    if (checkDefeat(p2After)) {
      log.push(`${mage1.name} wins in round ${round + 1}!`);
      return { winnerId: mage1.id, log };
    }
  }

  const p1Final = combat.participants.find(p => p.id === p1.id)!;
  const p2Final = combat.participants.find(p => p.id === p2.id)!;
  if (p1Final.vitality >= p2Final.vitality) {
    log.push(`${mage1.name} wins on points (timeout).`);
    return { winnerId: mage1.id, log };
  }
  log.push(`${mage2.name} wins on points (timeout).`);
  return { winnerId: mage2.id, log };
}

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

export function getConclaveWinner(state: ConclaveState): Mage | null {
  if (state.phase !== 'complete' || !state.winner) return null;
  return state.participants.find(m => m.id === state.winner) ?? null;
}
