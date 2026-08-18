// ============================================================================
// MageBorne Duelists — AI Mage Combat Logic
// ============================================================================
// Chooses cards for AI mages based on personality archetypes.
// Pure functions: take state, return card choices.
// ============================================================================

import type { CombatState, CombatParticipant, MagePersonality, QueuedSpell, CardUse } from '../../types';
import { getSpell } from '../../data/spells';

interface CardChoice {
  cardId: string;
  use: CardUse;
  targetId?: string;
}

/**
 * Choose two cards for an AI mage: one to Cast, one to Maneuver.
 * Returns null if no valid cards in hand.
 */
export function chooseCards(
  hand: string[],
  self: CombatParticipant,
  enemy: CombatParticipant,
  personality: MagePersonality,
  state: CombatState,
): { cast: CardChoice; maneuver: CardChoice } | null {
  if (hand.length < 2) return null;

  const enemyVitPct = enemy.vitality / enemy.maxVitality;
  const selfVitPct = self.vitality / self.maxVitality;
  const distance = self.range === enemy.range ? 0 : 1;

  // Score each card based on personality
  const scored = hand.map((cardId) => {
    const spell = getSpell(cardId);
    if (!spell) return { cardId, score: -999, spell: null };

    let score = 0;
    const hasMana = self.conditions.some(c => c.type === 'silenced') ? false : true;

    // Base scoring by tags
    const tags = spell.tags;

    // Damage cards
    if (tags.includes('attack')) {
      score += 10;
      // Higher value if enemy is low
      if (enemyVitPct < 0.4) score += 15;
      // Check range
      if (spell.range) {
        const ranges = Array.isArray(spell.range) ? spell.range : [spell.range];
        if (!ranges.includes(self.range) && !ranges.includes(enemy.range)) score -= 20;
      }
    }

    // Guard cards
    if (tags.includes('guard')) {
      score += 5;
      if (selfVitPct < 0.5) score += 15;
      if (self.guard < 2) score += 5;
    }

    // Movement cards
    if (tags.includes('movement')) {
      score += 3;
      if (distance > 0 && self.range !== enemy.range) score += 10;
    }

    // Control cards
    if (tags.includes('control')) {
      score += 4;
      if (enemy.guard > 2) score += 8;
    }

    // Counter cards
    if (tags.includes('counter')) {
      score += 6;
      if (enemy.queuedSpells.length > 0) score += 12;
    }

    // Summon cards
    if (tags.includes('summon')) {
      score += 3;
      if (self.vitality < self.maxVitality * 0.5) score += 10;
    }

    // Utility cards in combat
    if (tags.includes('utility')) {
      score -= 5; // generally bad in combat
    }

    // Personality modifiers
    switch (personality) {
      case 'aggressive':
        if (tags.includes('attack')) score += 12;
        if (tags.includes('guard')) score -= 8;
        if (tags.includes('movement')) score += 5; // close distance
        if (spell.empower && hasMana) score += 8;
        if (spell.burnIcon) score += 3; // willing to burn cards
        break;
      case 'defensive':
        if (tags.includes('guard')) score += 12;
        if (tags.includes('summon')) score += 8;
        if (tags.includes('control')) score += 6;
        if (tags.includes('attack')) score -= 4;
        if (selfVitPct > 0.7) score += 5; // confident, can afford setup
        break;
      case 'control':
        if (tags.includes('control')) score += 10;
        if (tags.includes('counter')) score += 10;
        if (tags.includes('movement')) score += 6;
        if (tags.includes('attack')) score -= 3;
        break;
      case 'greedy':
        if (spell.empower) score += 15;
        if (spell.overcharge) score += 20;
        if (tags.includes('ritual') || tags.includes('summon')) score += 8;
        if (tags.includes('attack') && !spell.empower) score -= 5;
        // Patient: prefers channeling early
        if (state.round <= 2) score -= 3;
        break;
      case 'adaptive':
        if (selfVitPct < enemyVitPct) {
          // Behind: play defensive
          if (tags.includes('guard')) score += 10;
          if (tags.includes('summon')) score += 8;
        } else {
          // Ahead: press advantage
          if (tags.includes('attack')) score += 10;
        }
        break;
    }

    // Speed matters: faster cards are safer
    score += spell.speed * 0.5;

    return { cardId, score, spell };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Best card for Cast, second best for Maneuver
  const castChoice = scored[0];
  const maneuverChoice = scored[1];

  if (!castChoice || !maneuverChoice || !castChoice.spell || !maneuverChoice.spell) return null;

  return {
    cast: {
      cardId: castChoice.cardId,
      use: 'cast' as CardUse,
      targetId: enemy.id,
    },
    maneuver: {
      cardId: maneuverChoice.cardId,
      use: 'maneuver' as CardUse,
    },
  };
}

/**
 * Convert AI card choice to queued spells for the combat engine.
 */
export function aiChoicesToQueued(
  choice: { cast: CardChoice; maneuver: CardChoice },
): QueuedSpell[] {
  const spells: QueuedSpell[] = [];

  const castSpell = getSpell(choice.cast.cardId);
  if (castSpell) {
    spells.push({
      cardId: choice.cast.cardId,
      use: choice.cast.use,
      targetId: choice.cast.targetId,
      speed: castSpell.speed,
      empowered: false,
      overcharged: false,
    });
  }

  const maneuverSpell = getSpell(choice.maneuver.cardId);
  if (maneuverSpell) {
    spells.push({
      cardId: choice.maneuver.cardId,
      use: choice.maneuver.use,
      speed: maneuverSpell.speed,
      empowered: false,
      overcharged: false,
    });
  }

  return spells;
}
