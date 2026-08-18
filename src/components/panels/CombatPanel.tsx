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
import { ARCANE, ELEMENT_GLYPH, ElementSeal, Glyph, elementInk, type GlyphName } from '../Sigils';

// --- Helpers ----------------------------------------------------------------

const CONDITION_META: Record<string, { label: string; glyph: GlyphName; className: string }> = {
  burn: { label: 'Burn', glyph: 'flame', className: 'border-ember-deep bg-ember-wash text-ember-deep' },
  soaked: { label: 'Soaked', glyph: 'droplet', className: 'border-tide-deep bg-tide-wash text-tide-deep' },
  unsteady: { label: 'Unsteady', glyph: 'spiral', className: 'border-gale-deep bg-gale-wash text-gale-deep' },
  bound: { label: 'Bound', glyph: 'chain', className: 'border-loam-deep bg-loam-wash text-loam-deep' },
  exposed: { label: 'Exposed', glyph: 'eye', className: 'border-oxblood-800 bg-parchment-200 text-oxblood-800' },
  silenced: { label: 'Silenced', glyph: 'hush', className: 'border-ink-700 bg-parchment-200 text-ink-800' },
};

/** Chunky serif stat, almanac-style: label above, numeral below. */
function StatBlock({
  label,
  value,
  max,
  fill,
}: {
  label: string;
  value: number;
  max?: number;
  fill?: string;
}) {
  const pct = max && max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : null;
  return (
    <div className="flex-1 text-center">
      <div className="text-2xs uppercase tracking-[0.14em] text-ink-600 leading-none">{label}</div>
      <div className="font-display font-bold text-ink-900 leading-tight tabular-nums text-[15px]">
        {value}
        {max !== undefined && <span className="text-2xs text-ink-600">/{max}</span>}
      </div>
      {pct !== null && (
        <div className="meter h-1.5 mt-0.5">
          <div className="meter-fill" style={{ width: `${pct}%`, backgroundColor: fill }} />
        </div>
      )}
    </div>
  );
}

function ParticipantCard({ p }: { p: CombatParticipant }) {
  const frame = p.isPlayer
    ? 'border-brass-700'
    : 'border-oxblood-700';
  const nameplate = p.isPlayer ? 'brass-plate text-ink-900' : 'leather text-parchment-100';

  return (
    <div className={`plaque ${frame} overflow-hidden`}>
      {/* Nameplate */}
      <div className={`${nameplate} flex items-center gap-1.5 px-2 py-1 border-b-2 border-ink-800`}>
        <span
          className="w-6 h-6 rounded-seal border-2 border-ink-900/60 flex items-center justify-center shrink-0"
          style={{ background: 'rgba(28,20,14,0.28)' }}
        >
          <Glyph name={p.isPlayer ? 'hat' : 'skull'} className="w-3.5 h-3.5" />
        </span>
        <span className="font-display font-bold text-2xs leading-tight truncate flex-1">{p.name}</span>
      </div>

      <div className="px-2 py-1.5">
        <div className="flex gap-1.5">
          <StatBlock label="Vit" value={p.vitality} max={p.maxVitality} fill="#c0392b" />
          <StatBlock label="Foc" value={p.focus} max={p.maxFocus} fill={ARCANE} />
          <StatBlock label="Grd" value={p.guard} />
        </div>

        <div className="flex items-center justify-between gap-1 mt-1.5 text-2xs text-ink-700">
          <span className="capitalize">
            <span className="text-ink-600">Range </span>
            <span className="font-display font-bold text-ink-900">{p.range}</span>
          </span>
          {p.armor > 0 && (
            <span>
              <span className="text-ink-600">Armor </span>
              <span className="font-display font-bold text-ink-900">{p.armor}</span>
            </span>
          )}
        </div>

        {p.conditions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {p.conditions.map((c: Condition, i: number) => {
              const meta = CONDITION_META[c.type];
              return (
                <span
                  key={i}
                  className={`flex items-center gap-1 px-1 py-0.5 rounded border text-2xs font-semibold ${
                    meta?.className ?? 'border-ink-700 bg-parchment-200 text-ink-800'
                  }`}
                >
                  <Glyph name={meta?.glyph ?? 'rune'} className="w-3 h-3" />
                  {meta?.label ?? c.type}
                  <span className="opacity-70">{c.duration}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
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
        className="plaque-aged shrink-0 w-[172px] p-2 cursor-pointer opacity-80"
        onClick={onClick}
        style={{ borderStyle: 'dashed' }}
      >
        <div className="font-display font-bold text-2xs uppercase tracking-widest text-ink-600">
          Fatigue
        </div>
        <div className="text-2xs text-ink-600 italic mt-1 leading-snug">
          A dead page. Discard at end of turn, or spend 1 Focus.
        </div>
      </div>
    );
  }

  if (!spell) {
    // Might be a behavior card
    const behavior = getBehaviorCard(cardId);
    if (behavior) {
      return (
        <div className="plaque shrink-0 w-[172px] p-2 border-oxblood-700">
          <div className="flex items-center justify-between gap-1">
            <span className="font-display font-bold text-2xs text-oxblood-800">{behavior.name}</span>
            <span className="text-2xs text-ink-600">SPD {behavior.speed}</span>
          </div>
          <div className="text-2xs text-ink-700 mt-1 leading-snug">{behavior.effect}</div>
        </div>
      );
    }
    return null;
  }

  const modeRing =
    useMode === 'cast'
      ? 'shadow-[0_0_0_2px_#2e6f8e]'
      : useMode === 'maneuver'
      ? 'shadow-[0_0_0_2px_#4e7a45]'
      : '';

  return (
    <div
      className={`spellcard spellcard-tappable ${elementInk(spell.element)} shrink-0 w-[176px] ${
        selected ? 'spellcard-active' : ''
      } ${modeRing}`}
      onClick={onClick}
    >
      <div className="spellcard-body p-2">
        <div className="flex items-start gap-1.5">
          <ElementSeal glyph={ELEMENT_GLYPH[spell.element] ?? 'mountain'} size="sm" title={spell.element} />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-2xs leading-tight text-ink-900 capitalize truncate">
              {spell.name}
            </div>
            <div className="text-2xs italic text-ink-600 capitalize truncate">
              {spell.element} · {spell.tags.join(', ')}
            </div>
          </div>
          <span className="slip px-1 py-0.5 text-center leading-none shrink-0">
            <span className="block text-2xs uppercase text-ink-600">Spd</span>
            <span className="block font-display font-bold text-2xs text-ink-900">{spell.speed}</span>
          </span>
        </div>

        <div className="my-1 border-t border-ink-700/25" />

        <div className="space-y-0.5 text-2xs leading-snug text-ink-800">
          <div>
            <span className="inked-label mr-1" style={{ color: 'var(--el-deep)' }}>
              Cast
            </span>
            {spell.cast}
          </div>
          <div>
            <span className="inked-label mr-1 text-moss-deep">Maneuver</span>
            {spell.maneuver}
          </div>
          {spell.empower && (
            <div>
              <span className="inked-label mr-1 text-brass-900">Empower</span>
              {spell.empower}
            </div>
          )}
          {spell.overcharge && (
            <div>
              <span className="inked-label mr-1 text-oxblood-700">Overcharge</span>
              {spell.overcharge}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 mt-1.5">
          <span className="text-2xs text-ink-600">
            Focus <span className="font-display font-bold text-ink-900">{spell.focusCost}</span>
          </span>
          {spell.burnIcon && (
            <span className="flex items-center gap-0.5 px-1 rounded border border-ember-deep bg-ember-wash text-ember-deep">
              <Glyph name="flame" className="w-3 h-3" />
              <span className="text-2xs font-bold uppercase tracking-wider">Burn</span>
            </span>
          )}
        </div>

        {useMode && (
          <div
            className={`mt-1 text-center text-2xs font-display font-bold uppercase tracking-widest rounded py-0.5 ${
              useMode === 'cast'
                ? 'bg-tide-wash text-tide-deep border border-tide-deep'
                : 'bg-moss-wash text-moss-deep border border-moss-deep'
            }`}
          >
            {useMode}
          </div>
        )}
      </div>
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
      <div className="panel-scroll flex flex-col items-center justify-center p-6">
        <div className="page px-6 py-7 text-center max-w-sm">
          <span className="seal-ox w-16 h-16 mx-auto mb-3">
            <Glyph name="swords" className="w-8 h-8" />
          </span>
          <h2 className="title-display text-xl">The Duelling Ground</h2>
          <div className="rule-ornate my-2" />
          <p className="marginalia text-sm">No duel is underway.</p>
          {hasPendingConclave ? (
            <p className="text-2xs text-oxblood-700 font-semibold mt-3 leading-snug">
              A Conclave match awaits you — open the Conclave to answer the challenge.
            </p>
          ) : (
            <button onClick={startTestCombat} className="btn btn-ox mt-4 w-full">
              <Glyph name="swords" className="w-4 h-4" />
              Start Test Combat
            </button>
          )}
        </div>
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
    <div className="panel-scroll">
      <div className="p-2.5 flex flex-col gap-2.5">
        {/* --- Header ------------------------------------------------------- */}
        <div className="page px-3 py-2 flex items-center justify-between gap-2">
          <h2 className="title-display text-lg leading-none">Duel</h2>
          <div className="flex items-center gap-1.5">
            <span className="slip px-2 py-1 text-2xs text-ink-700 leading-none">
              Round{' '}
              <span className="font-display font-bold text-ink-900 text-sm">{combat.round}</span>
            </span>
            <span className="slip px-2 py-1 text-2xs text-ink-700 capitalize leading-none">
              {combat.phase}
            </span>
            {combat.result !== 'ongoing' && (
              <span
                className={`px-2 py-1 rounded-md border-2 font-display font-bold text-2xs uppercase tracking-widest ${
                  combat.result === 'victory'
                    ? 'border-moss-deep bg-moss-wash text-moss-deep'
                    : 'border-oxblood-800 bg-ember-wash text-oxblood-800'
                }`}
              >
                {combat.result}
              </span>
            )}
          </div>
        </div>

        {/* --- Portrait plaques --------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2">
          {player && <ParticipantCard p={player} />}
          {enemy && <ParticipantCard p={enemy} />}
        </div>

        {/* --- Scrying note: enemy intent ----------------------------------- */}
        {enemyIntentCard && (
          <div
            className="plaque border-tide-deep px-2.5 py-2"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(219,231,236,0.9) 0%, rgba(243,234,216,0) 55%)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="seal-tide w-6 h-6">
                <Glyph name="eye" className="w-3.5 h-3.5" />
              </span>
              <span className="inked-label text-tide-deep">Scried Intent</span>
              <span className="ml-auto text-2xs text-ink-600">
                Speed <span className="font-display font-bold text-ink-900">{enemyIntentCard.speed}</span>
              </span>
            </div>
            <div className="font-display font-bold text-sm text-oxblood-800 mt-1">
              {enemyIntentCard.name}
            </div>
            {'effect' in enemyIntentCard && (
              <div className="text-2xs text-ink-700 leading-snug">{enemyIntentCard.effect}</div>
            )}
            {'cast' in enemyIntentCard && (
              <div className="text-2xs text-ink-700 leading-snug">{enemyIntentCard.cast}</div>
            )}
          </div>
        )}

        {/* --- Casting ledger ------------------------------------------------ */}
        {combat.timeline.length > 0 && (
          <div className="page px-3 py-2">
            <h3 className="chapter text-2xs mb-1.5">Casting Order</h3>
            <div className="flex flex-col">
              {combat.timeline.map((entry, i) => {
                const spell = getSpell(entry.spell.cardId) ?? getBehaviorCard(entry.spell.cardId);
                const caster = combat.participants.find((p) => p.id === entry.casterId);
                return (
                  <div
                    key={i}
                    className={`ledger-row flex items-center gap-2 px-1.5 py-1 text-2xs ${
                      entry.fizzled
                        ? 'text-ink-500 line-through'
                        : entry.resolved
                        ? 'text-moss-deep'
                        : 'text-ink-800'
                    }`}
                  >
                    <span className="seal-blank w-6 h-5 rounded text-2xs font-display font-bold tabular-nums">
                      {entry.spell.speed}
                    </span>
                    <span className="font-display font-bold truncate max-w-[35%]">
                      {caster?.name}
                    </span>
                    <span className="text-ink-500">→</span>
                    <span className="truncate flex-1">{spell?.name ?? entry.spell.cardId}</span>
                    {entry.spell.empowered && (
                      <Glyph name="star" className="w-3 h-3 text-brass-700 shrink-0" />
                    )}
                    {entry.spell.overcharged && (
                      <Glyph name="bolt" className="w-3 h-3 text-oxblood-700 shrink-0" />
                    )}
                    {entry.fizzled && <span className="italic shrink-0">fizzled</span>}
                    {entry.resolved && (
                      <Glyph name="check" className="w-3 h-3 text-moss-deep shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- Hand ---------------------------------------------------------- */}
        {player && (
          <div className="page px-3 py-2">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="chapter text-2xs flex-1">Your Hand · {player.hand.length}</h3>
              <span className="text-2xs italic text-ink-600 shrink-0">
                tap = cast · shift+tap = maneuver
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1">
              {player.hand.length === 0 ? (
                <div className="marginalia text-2xs">No cards in hand.</div>
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
              <div className="text-2xs text-brass-900 font-semibold mt-1">
                {Object.keys(selectedCards).length} card(s) queued for the round.
              </div>
            )}
          </div>
        )}

        {/* --- Actions -------------------------------------------------------- */}
        <div className="flex gap-2">
          <button
            onClick={handleResolveRound}
            disabled={combat.result !== 'ongoing'}
            className="btn btn-brass flex-1 text-base"
          >
            <Glyph name="swords" className="w-5 h-5" />
            Resolve Round
          </button>
          {isConclaveCombat && combat.result !== 'ongoing' ? (
            <button onClick={() => resolveConclaveCombat()} className="btn btn-ox">
              <Glyph name="chalice" className="w-4 h-4" />
              Conclave
            </button>
          ) : (
            <button onClick={startTestCombat} className="btn btn-quiet">
              Restart
            </button>
          )}
        </div>

        {/* --- Combat ledger --------------------------------------------------- */}
        <div className="plaque-aged px-3 py-2 flex-1 min-h-[110px] max-h-[210px] overflow-y-auto">
          <h3 className="chapter text-2xs mb-1">Duel Record</h3>
          <div className="flex flex-col gap-0.5">
            {combat.log.slice(-30).map((entry, i) => (
              <div
                key={i}
                className={`text-2xs leading-snug ${
                  entry.type === 'damage' ? 'text-oxblood-800' :
                  entry.type === 'heal' ? 'text-moss-deep' :
                  entry.type === 'condition' ? 'text-tempest-deep' :
                  entry.type === 'fizzle' ? 'text-ink-500 italic' :
                  entry.type === 'victory' ? 'text-moss-deep font-bold' :
                  entry.type === 'defeat' ? 'text-oxblood-800 font-bold' :
                  entry.type === 'move' ? 'text-tide-deep' :
                  'text-ink-700'
                }`}
              >
                <span className="font-display font-bold text-ink-500 mr-1">R{entry.round}</span>
                {entry.text}
              </div>
            ))}
          </div>
        </div>

        {/* --- Bestiary marginalia ---------------------------------------------- */}
        {enemyMonster && (
          <div className="slip px-2.5 py-2 text-2xs text-ink-700 leading-snug">
            <div>
              <span className="inked-label text-oxblood-700 mr-1">Passive</span>
              {enemyMonster.passive}
            </div>
            <div className="mt-0.5">
              <span className="inked-label text-oxblood-700 mr-1">Escalation</span>
              {enemyMonster.escalationRule}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
