// ============================================================================
// MageBorne Duelists — Combat Panel
// ============================================================================
// Shows player hand, enemy intent, casting timeline, vitals/conditions,
// card selection (click=cast, shift-click=maneuver), resolve round, and log.
// ============================================================================

import { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getSpell } from '../../data/spells';
import { getBehaviorCard, getMonster } from '../../data/monsters';
import {
  initCombat,
  resolveRound,
  queueSpell,
  generateMonsterAction,
} from '../../game/engine/combat';
import type { CombatParticipant, Condition } from '../../types';

// --- Helpers ----------------------------------------------------------------

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'text-red-400 border-red-600',
  water: 'text-blue-400 border-blue-600',
  wind: 'text-cyan-300 border-cyan-500',
  earth: 'text-amber-600 border-amber-700',
  magma: 'text-orange-500 border-orange-700',
  lightning: 'text-yellow-400 border-yellow-600',
  steam: 'text-slate-300 border-slate-500',
  storm: 'text-indigo-300 border-indigo-500',
};

const CONDITION_LABELS: Record<string, string> = {
  burn: '🔥 Burn',
  soaked: '💧 Soaked',
  unsteady: '💫 Unsteady',
  bound: '🔒 Bound',
  exposed: '⚠ Exposed',
  silenced: '🔇 Silenced',
};

function elementColor(el: string): string {
  return ELEMENT_COLORS[el] ?? 'text-slate-300 border-slate-600';
}

function ParticipantCard({ p }: { p: CombatParticipant }) {
  return (
    <div className={`p-2 rounded border ${p.isPlayer ? 'border-blue-500 bg-blue-950/30' : 'border-red-500 bg-red-950/30'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold">{p.name}</span>
        <span className="text-xs text-slate-400">{p.isPlayer ? 'Player' : 'Enemy'}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-xs">
        <div className="text-center">
          <div className="text-slate-500">VIT</div>
          <div className="text-red-400 font-bold">{p.vitality}/{p.maxVitality}</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500">FOC</div>
          <div className="text-purple-400 font-bold">{p.focus}/{p.maxFocus}</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500">GRD</div>
          <div className="text-green-400 font-bold">{p.guard}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs">
        <span className="text-slate-400">Range: <span className="text-slate-200 capitalize">{p.range}</span></span>
        {p.armor > 0 && <span className="text-slate-400">Armor: {p.armor}</span>}
      </div>
      {p.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {p.conditions.map((c: Condition, i: number) => (
            <span key={i} className="text-[10px] px-1 py-0.5 rounded bg-slate-700 text-slate-300">
              {CONDITION_LABELS[c.type] ?? c.type} ({c.duration})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SpellCardView({
  cardId,
  selected,
  useMode,
  onClick,
}: {
  cardId: string;
  selected: boolean;
  useMode: 'cast' | 'maneuver' | null;
  onClick: (e: React.MouseEvent) => void;
}) {
  const spell = getSpell(cardId);

  if (cardId === '__fatigue__') {
    return (
      <div
        className="p-2 rounded border border-slate-700 bg-slate-800/50 cursor-pointer min-w-[140px]"
        onClick={onClick}
      >
        <div className="text-xs font-bold text-slate-500">FATIGUE</div>
        <div className="text-[10px] text-slate-600">Dead card. Discard at end of turn or spend 1 Focus.</div>
      </div>
    );
  }

  if (!spell) {
    // Might be a behavior card
    const behavior = getBehaviorCard(cardId);
    if (behavior) {
      return (
        <div className="p-2 rounded border border-red-700 bg-red-950/40 min-w-[140px]">
          <div className="text-xs font-bold text-red-400">{behavior.name}</div>
          <div className="text-[10px] text-slate-400">Speed: {behavior.speed}</div>
          <div className="text-[10px] text-slate-500 mt-1">{behavior.effect}</div>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className={`p-2 rounded border min-w-[140px] cursor-pointer transition-all ${
        selected
          ? `ring-2 ring-amber-400 ${elementColor(spell.element)}`
          : `${elementColor(spell.element)} bg-slate-800/50`
      } ${useMode === 'cast' ? 'ring-2 ring-blue-400' : ''} ${useMode === 'maneuver' ? 'ring-2 ring-green-400' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold capitalize">{spell.name}</span>
        <span className="text-[10px] text-slate-500">SPD {spell.speed}</span>
      </div>
      <div className="text-[10px] text-slate-400 capitalize">{spell.element} • {spell.tags.join(', ')}</div>
      <div className="text-[10px] text-slate-300 mt-1">
        <span className="text-blue-400">Cast:</span> {spell.cast}
      </div>
      <div className="text-[10px] text-slate-400 mt-0.5">
        <span className="text-green-400">Maneuver:</span> {spell.maneuver}
      </div>
      {spell.empower && (
        <div className="text-[10px] text-amber-400 mt-0.5">
          <span className="text-amber-500">Empower:</span> {spell.empower}
        </div>
      )}
      {spell.overcharge && (
        <div className="text-[10px] text-red-400 mt-0.5">
          <span className="text-red-500">Overcharge:</span> {spell.overcharge}
        </div>
      )}
      {spell.burnIcon && (
        <div className="text-[10px] text-orange-500 mt-0.5">🔥 Burn Icon</div>
      )}
    </div>
  );
}

// --- Main Component ---------------------------------------------------------

export function CombatPanel() {
  const world = useGameStore((s) => s.world);
  const setWorld = useGameStore((s) => s.setWorld);
  const addLogEntry = useGameStore((s) => s.addLogEntry);
  const resolveConclaveCombat = useGameStore((s) => s.resolveConclaveCombat);

  const combat = world.currentCombat;
  const isConclaveCombat = combat?.encounterType === 'tournament';

  // Local state for card selection: cardId -> use mode
  const [selectedCards, setSelectedCards] = useState<Record<string, 'cast' | 'maneuver'>>({});

  const startTestCombat = useCallback(() => {
    const player = world.player;
    // Draw 5 cards for the player's hand
    const mageWithHand = { ...player, hand: player.preparedDeck.slice(0, 5) };
    const newCombat = initCombat([mageWithHand, { monsterId: 'ash_troll' }], 'monster');

    // Generate monster action
    const monsterId = newCombat.participants.find((p) => !p.isPlayer)?.id;
    let combatWithAction = newCombat;
    if (monsterId) {
      combatWithAction = generateMonsterAction(newCombat, monsterId);
    }

    setWorld({ ...world, currentCombat: combatWithAction });
    addLogEntry('Test combat started vs Ash Troll!');
    setSelectedCards({});
  }, [world, setWorld, addLogEntry]);

  const handleCardClick = useCallback((cardId: string, e: React.MouseEvent) => {
    if (!combat) return;
    const isShift = e.shiftKey;

    setSelectedCards((prev) => {
      const next = { ...prev };
      if (cardId in next) {
        // Toggle off
        delete next[cardId];
      } else {
        next[cardId] = isShift ? 'maneuver' : 'cast';
      }
      return next;
    });
  }, [combat]);

  const handleResolveRound = useCallback(() => {
    if (!combat) return;

    let state = combat;

    // Queue selected spells for the player
    const playerId = state.participants.find((p) => p.isPlayer)?.id;
    const monsterId = state.participants.find((p) => !p.isPlayer)?.id;

    if (playerId && monsterId) {
      // Clear old queued spells
      state = {
        ...state,
        participants: state.participants.map((p) => ({ ...p, queuedSpells: [] })),
      };

      // Queue each selected card
      for (const [cardId, useMode] of Object.entries(selectedCards)) {
        state = queueSpell(state, playerId, cardId, useMode, monsterId);
      }
    }

    // Resolve the round
    const result = resolveRound(state);

    setWorld({ ...world, currentCombat: result });
    setSelectedCards({});

    // Log key events
    const lastLog = result.log[result.log.length - 1];
    if (lastLog) {
      addLogEntry(`Round ${result.round - 1} resolved. ${lastLog.text}`);
    }

    if (result.result !== 'ongoing') {
      addLogEntry(`Combat ended: ${result.result}!`);
    }
  }, [combat, selectedCards, world, setWorld, addLogEntry]);

  // --- No combat state ---
  if (!combat) {
    const hasPendingConclave = !!world.conclave?.pendingPlayerMatch;
    return (
      <div className="p-4 text-slate-200 overflow-y-auto h-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-bold text-red-400">Combat</h2>
        <p className="text-slate-400 text-sm">No active combat.</p>
        {hasPendingConclave ? (
          <p className="text-purple-400 text-sm">Go to the Conclave tab to start your match.</p>
        ) : (
          <button
            onClick={startTestCombat}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-sm transition-colors"
          >
            ⚔ Start Test Combat
          </button>
        )}
      </div>
    );
  }

  const player = combat.participants.find((p) => p.isPlayer);
  const enemy = combat.participants.find((p) => !p.isPlayer);

  // Get enemy intent (first queued spell or behavior card from monster deck)
  const enemyIntent = enemy?.queuedSpells[0];
  const enemyIntentCard = enemyIntent ? getBehaviorCard(enemyIntent.cardId) ?? getSpell(enemyIntent.cardId) : undefined;

  // Get monster for behavior deck info
  const enemyMonster = enemy ? getMonster('ash_troll') : undefined;

  return (
    <div className="p-3 text-slate-200 overflow-y-auto h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-red-400">Combat</h2>
        <div className="text-sm text-slate-400">
          Round {combat.round} • Phase: <span className="text-amber-400 capitalize">{combat.phase}</span>
          {combat.result !== 'ongoing' && (
            <span className={`ml-2 font-bold ${combat.result === 'victory' ? 'text-green-400' : 'text-red-400'}`}>
              {combat.result.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="grid grid-cols-2 gap-2">
        {player && <ParticipantCard p={player} />}
        {enemy && <ParticipantCard p={enemy} />}
      </div>

      {/* Enemy Intent */}
      {enemyIntentCard && (
        <div className="p-2 rounded border border-red-700 bg-red-950/30">
          <div className="text-xs text-slate-400 mb-1">Enemy Intent:</div>
          <div className="text-sm font-bold text-red-400">{enemyIntentCard.name}</div>
          <div className="text-xs text-slate-400">Speed: {enemyIntentCard.speed}</div>
          {'effect' in enemyIntentCard && (
            <div className="text-xs text-slate-300 mt-1">{enemyIntentCard.effect}</div>
          )}
          {'cast' in enemyIntentCard && (
            <div className="text-xs text-slate-300 mt-1">{enemyIntentCard.cast}</div>
          )}
        </div>
      )}

      {/* Casting Timeline */}
      {combat.timeline.length > 0 && (
        <div className="p-2 rounded border border-slate-700 bg-slate-800/50">
          <div className="text-xs text-slate-400 mb-1">Casting Timeline (by Speed):</div>
          <div className="flex flex-col gap-1">
            {combat.timeline.map((entry, i) => {
              const spell = getSpell(entry.spell.cardId) ?? getBehaviorCard(entry.spell.cardId);
              const caster = combat.participants.find((p) => p.id === entry.casterId);
              return (
                <div
                  key={i}
                  className={`text-xs flex items-center gap-2 px-2 py-1 rounded ${
                    entry.fizzled
                      ? 'bg-slate-700/50 text-slate-500 line-through'
                      : entry.resolved
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-slate-700/50'
                  }`}
                >
                  <span className="text-slate-500">[{entry.spell.speed}]</span>
                  <span className="font-bold">{caster?.name}</span>
                  <span>→</span>
                  <span>{spell?.name ?? entry.spell.cardId}</span>
                  {entry.spell.empowered && <span className="text-amber-400">★</span>}
                  {entry.spell.overcharged && <span className="text-red-400">!!</span>}
                  {entry.fizzled && <span className="text-slate-500">(fizzled)</span>}
                  {entry.resolved && <span className="text-green-500">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Player Hand */}
      {player && (
        <div className="p-2 rounded border border-slate-700 bg-slate-800/50">
          <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
            <span>Your Hand ({player.hand.length} cards):</span>
            <span className="text-slate-500">Click = Cast | Shift+Click = Maneuver</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {player.hand.length === 0 ? (
              <div className="text-xs text-slate-500">No cards in hand.</div>
            ) : (
              player.hand.map((cardId, i) => (
                <SpellCardView
                  key={`${cardId}-${i}`}
                  cardId={cardId}
                  selected={cardId in selectedCards}
                  useMode={selectedCards[cardId] ?? null}
                  onClick={(e) => handleCardClick(cardId, e)}
                />
              ))
            )}
          </div>
          {Object.keys(selectedCards).length > 0 && (
            <div className="text-xs text-amber-400 mt-1">
              {Object.keys(selectedCards).length} card(s) queued for casting.
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleResolveRound}
          disabled={combat.result !== 'ongoing'}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-bold text-sm transition-colors"
        >
          ⚔ Resolve Round
        </button>
        {isConclaveCombat && combat.result !== 'ongoing' ? (
          <button
            onClick={() => resolveConclaveCombat()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-sm transition-colors"
          >
            🏆 Return to Conclave
          </button>
        ) : (
          <button
            onClick={startTestCombat}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-bold text-sm transition-colors"
          >
            ↻ Restart Test Combat
          </button>
        )}
      </div>

      {/* Combat Log */}
      <div className="p-2 rounded border border-slate-700 bg-slate-900/50 flex-1 min-h-[100px] max-h-[200px] overflow-y-auto">
        <div className="text-xs text-slate-400 mb-1">Combat Log:</div>
        <div className="flex flex-col gap-0.5">
          {combat.log.slice(-30).map((entry, i) => (
            <div
              key={i}
              className={`text-xs ${
                entry.type === 'damage' ? 'text-red-400' :
                entry.type === 'heal' ? 'text-green-400' :
                entry.type === 'condition' ? 'text-purple-400' :
                entry.type === 'fizzle' ? 'text-slate-500 italic' :
                entry.type === 'victory' ? 'text-green-500 font-bold' :
                entry.type === 'defeat' ? 'text-red-500 font-bold' :
                entry.type === 'move' ? 'text-cyan-400' :
                'text-slate-400'
              }`}
            >
              <span className="text-slate-600">[R{entry.round}]</span> {entry.text}
            </div>
          ))}
        </div>
      </div>

      {/* Passive info */}
      {enemyMonster && (
        <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
          <span className="text-slate-400">Passive:</span> {enemyMonster.passive}
          <br />
          <span className="text-slate-400">Escalation:</span> {enemyMonster.escalationRule}
        </div>
      )}
    </div>
  );
}
