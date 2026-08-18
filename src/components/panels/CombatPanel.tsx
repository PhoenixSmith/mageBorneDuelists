// ============================================================================
// MageBorne Duelists — Combat Panel
// ============================================================================
// The duelling ground: a 3D battle stage fills the frame and every readout is
// an almanac chip laid over it. Name plates in the top corners, range band and
// scried intent across the top, the hand as a move menu along the bottom.
//
// Presentation only — the store bindings, card selection semantics
// (tap = cast, shift+tap = maneuver) and round resolution are unchanged.
// ============================================================================

import { useCallback, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getSpell } from '../../data/spells';
import { getBehaviorCard, MONSTERS } from '../../data/monsters';
import {
  initCombat,
  resolveRound,
  queueSpell,
  generateMonsterAction,
} from '../../game/engine/combat';
import type { CombatParticipant, CombatState, Condition, Monster, RangeBand } from '../../types';
import {
  CombatScene,
  deriveFigure,
  fighterAnchor,
  type RoundVfx,
  type SceneFighter,
  type Side,
  type VfxCue,
  type VfxElement,
} from '../three/CombatScene';
import { ARCANE, ELEMENT_GLYPH, ElementSeal, Glyph, Seal, elementInk, type GlyphName } from '../Sigils';

// --- Static lookups ---------------------------------------------------------

const CONDITION_META: Record<string, { label: string; glyph: GlyphName; className: string }> = {
  burn: { label: 'Burn', glyph: 'flame', className: 'border-ember-deep bg-ember-wash text-ember-deep' },
  soaked: { label: 'Soaked', glyph: 'droplet', className: 'border-tide-deep bg-tide-wash text-tide-deep' },
  unsteady: { label: 'Unsteady', glyph: 'spiral', className: 'border-gale-deep bg-gale-wash text-gale-deep' },
  bound: { label: 'Bound', glyph: 'chain', className: 'border-loam-deep bg-loam-wash text-loam-deep' },
  exposed: { label: 'Exposed', glyph: 'eye', className: 'border-oxblood-800 bg-parchment-200 text-oxblood-800' },
  silenced: { label: 'Silenced', glyph: 'hush', className: 'border-ink-700 bg-parchment-200 text-ink-800' },
};

const RANGE_BANDS: RangeBand[] = ['engaged', 'near', 'far'];
const RANGE_INDEX: Record<RangeBand, number> = { engaged: 0, near: 1, far: 2 };

/** Spell schools → the ink a projectile is drawn in. */
const SCHOOL_VFX: Record<string, VfxElement> = {
  fire: 'fire',
  water: 'water',
  wind: 'wind',
  earth: 'earth',
  magma: 'magma',
  lightning: 'lightning',
  steam: 'steam',
  storm: 'storm',
  growth: 'earth',
  dust: 'wind',
};

/** Monster behaviour cards carry no school of their own — assign one. */
const BEHAVIOR_VFX: Record<string, VfxElement> = {
  bt_coal_hurl: 'fire',
  bt_crushing_advance: 'earth',
  bt_feed_furnace: 'fire',
  bt_roar: 'wind',
  bt_overheat: 'fire',
  bt_boulder_throw: 'earth',
  bt_backhand: 'earth',
  bt_ground_slam: 'earth',
  bt_stomp: 'earth',
  bt_boulder_shield: 'earth',
  bt_lightning_bolt: 'lightning',
  bt_wind_slash: 'wind',
  bt_gale_burst: 'wind',
  bt_storm_call: 'storm',
  bt_vanish: 'wind',
};

// --- Cue derivation ---------------------------------------------------------
// The engine clears its timeline at the end of a round, so the visuals are
// read off the queued spells at the moment of resolution plus the state diff
// the round produced. Nothing here feeds back into combat.

function cueElement(cardId: string): VfxElement {
  const spell = getSpell(cardId);
  if (spell) return SCHOOL_VFX[spell.element] ?? 'arcane';
  return BEHAVIOR_VFX[cardId] ?? 'arcane';
}

function cueKind(cardId: string, use: string): VfxCue['kind'] {
  const spell = getSpell(cardId);
  if (spell) {
    if (use === 'maneuver') return spell.tags.includes('movement') ? 'move' : 'support';
    if (spell.tags.includes('attack')) return 'attack';
    if (spell.tags.includes('guard')) return 'guard';
    if (spell.tags.includes('movement')) return 'move';
    return 'support';
  }
  const behavior = getBehaviorCard(cardId);
  if (behavior) {
    if (/damage/i.test(behavior.effect)) return 'attack';
    if (/guard/i.test(behavior.effect)) return 'guard';
    if (/^move/i.test(behavior.effect)) return 'move';
  }
  return 'support';
}

/**
 * Translate "the round that just resolved" into a cue list for the stage:
 * casting order by speed, plus how much each side actually lost.
 */
function buildRoundVfx(
  runId: number,
  queued: CombatState,
  after: CombatState,
  playerId: string,
): RoundVfx {
  const sideOf = (id: string): Side => (id === playerId ? 'left' : 'right');

  const entries: Array<{ casterId: string; cardId: string; use: string; speed: number }> = [];
  for (const p of queued.participants) {
    for (const q of p.queuedSpells) {
      entries.push({ casterId: p.id, cardId: q.cardId, use: q.use, speed: q.speed });
    }
  }
  entries.sort((a, b) => b.speed - a.speed);

  const cues: VfxCue[] = entries.map((e) => ({
    from: sideOf(e.casterId),
    element: cueElement(e.cardId),
    kind: cueKind(e.cardId, e.use),
  }));

  const damage: Record<Side, number> = { left: 0, right: 0 };
  const blocked: Record<Side, boolean> = { left: false, right: false };
  let downed: Side | null = null;

  for (const before of queued.participants) {
    const now = after.participants.find((p) => p.id === before.id);
    if (!now) continue;
    const side = sideOf(before.id);
    damage[side] = Math.max(0, before.vitality - now.vitality);
    blocked[side] = before.guard > 0 || now.guard > 0;
    if (now.vitality <= 0) downed = side;
  }

  return { runId, cues, damage, blocked, downed };
}

// --- Small HUD pieces -------------------------------------------------------

/** Thick segmented meter — vitality reads as a bar of notches, not a number. */
function Meter({
  value,
  max,
  fill,
  thick,
}: {
  value: number;
  max: number;
  fill: string;
  thick?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`meter meter-notched ${thick ? 'h-2.5' : 'h-1.5'}`}>
      <div className="meter-fill" style={{ width: `${pct}%`, backgroundColor: fill }} />
    </div>
  );
}

function NamePlate({ p, side }: { p: CombatParticipant; side: Side }) {
  const align = side === 'right' ? 'items-end text-right' : 'items-start text-left';
  return (
    <div className={`hud-chip flex flex-col ${align} gap-1 px-1.5 py-1 w-[47%] max-w-[196px]`}>
      <div className={`flex items-center gap-1 w-full ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <Seal glyph={p.isPlayer ? 'hat' : 'skull'} tone={p.isPlayer ? 'arcane' : 'ox'} size="xs" />
        <span className="font-display font-bold text-2xs leading-none text-ink-900 truncate flex-1">
          {p.name}
        </span>
        {p.armor > 0 && (
          <span className="slip px-1 leading-none text-2xs text-ink-700 shrink-0" title="Armor">
            {p.armor}
          </span>
        )}
      </div>

      <div className="w-full">
        <Meter value={p.vitality} max={p.maxVitality} fill="#c0392b" thick />
      </div>

      <div className={`flex items-center gap-1.5 w-full ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="font-display font-bold text-2xs text-ink-900 tabular-nums leading-none">
          {p.vitality}
          <span className="text-ink-600">/{p.maxVitality}</span>
        </span>
        {p.maxFocus > 0 && (
          <span className="flex items-center gap-1 flex-1 min-w-[36px]" title="Focus">
            <Glyph name="essence" className="w-3 h-3 text-tempest-deep shrink-0" />
            <span className="flex-1">
              <Meter value={p.focus} max={p.maxFocus} fill={ARCANE} />
            </span>
          </span>
        )}
        {p.guard > 0 && (
          <span
            className="flex items-center gap-0.5 px-1 rounded border border-brass-800 brass-plate text-2xs font-display font-bold leading-none shrink-0"
            title="Guard"
          >
            <Glyph name="shield" className="w-3 h-3" />
            {p.guard}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * FAR ──●── : the gap to the foe as a slim inked track. The filled pip is
 * where the foe stands (what spell range checks against); the ringed pip is
 * where you stand.
 */
function RangeStrip({ band, youBand }: { band: RangeBand; youBand: RangeBand }) {
  const foe = RANGE_INDEX[band];
  const you = RANGE_INDEX[youBand];
  return (
    <div
      className="hud-chip flex items-center gap-2 px-2 py-1"
      title={`Foe at ${band} range · you at ${youBand} range`}
    >
      <span className="inked-label text-ink-800">{band}</span>
      <span className="flex items-center" aria-hidden="true">
        {RANGE_BANDS.map((b, i) => (
          <span key={b} className="flex items-center">
            {i > 0 && <span className="block w-4 h-px bg-ink-700/50" />}
            <span
              className={`flex items-center justify-center w-3.5 h-3.5 rounded-seal ${
                i === you ? 'border-2 border-ink-800' : ''
              }`}
            >
              <span
                className={
                  i === foe
                    ? 'block w-2 h-2 rounded-seal bg-brass-700 border border-ink-800'
                    : 'block w-1.5 h-1.5 rounded-seal bg-parchment-300 border border-ink-700/60'
                }
              />
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}

function IntentChip({ name, speed, effect }: { name: string; speed: number; effect?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="hud-chip flex flex-col items-center gap-0.5 px-2 py-1 max-w-[280px] pointer-events-auto"
      style={{ minHeight: 30 }}
    >
      <span className="flex items-center gap-1.5">
        <Seal glyph="eye" tone="tide" size="xs" />
        <span className="text-2xs italic text-ink-600 leading-none">scried</span>
        <span className="font-display font-bold text-2xs text-oxblood-800 leading-none truncate max-w-[150px]">
          {name}
        </span>
        <span className="slip px-1 text-2xs text-ink-700 leading-none tabular-nums">{speed}</span>
      </span>
      {open && effect && (
        <span className="block text-2xs text-ink-700 leading-snug px-1 pb-0.5">{effect}</span>
      )}
    </button>
  );
}

/** Compact tappable card in the move menu. */
function CardChip({
  cardId,
  selected,
  useMode,
  focused,
  onClick,
}: {
  cardId: string;
  selected: boolean;
  useMode: 'cast' | 'maneuver' | null;
  focused: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  if (cardId === '__fatigue__') {
    return (
      <button
        onClick={onClick}
        className={`rail-card shrink-0 justify-center ${focused ? 'rail-card-focus' : ''}`}
        style={{ borderStyle: 'dashed' }}
      >
        <span className="font-display font-bold text-2xs uppercase tracking-widest text-ink-600">
          Fatigue
        </span>
      </button>
    );
  }

  const spell = getSpell(cardId);
  if (!spell) {
    const behavior = getBehaviorCard(cardId);
    if (!behavior) return null;
    return (
      <button onClick={onClick} className="rail-card shrink-0 border-oxblood-700">
        <span className="font-display font-bold text-2xs text-oxblood-800 truncate w-full">
          {behavior.name}
        </span>
        <span className="text-2xs text-ink-600">SPD {behavior.speed}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`rail-card ${elementInk(spell.element)} shrink-0 ${selected ? 'rail-card-on' : ''} ${
        focused ? 'rail-card-focus' : ''
      }`}
    >
      <span className="flex items-center gap-1 w-full">
        <ElementSeal glyph={ELEMENT_GLYPH[spell.element] ?? 'mountain'} size="xs" title={spell.element} />
        <span className="font-display font-bold text-2xs text-ink-900 leading-tight truncate flex-1 text-left">
          {spell.name}
        </span>
      </span>
      <span className="flex items-center justify-between w-full text-2xs text-ink-600 leading-none">
        <span>
          <Glyph name="essence" className="w-3 h-3 inline-block -mt-px" />{' '}
          <span className="font-display font-bold text-ink-900">{spell.focusCost}</span>
        </span>
        <span>
          SPD <span className="font-display font-bold text-ink-900">{spell.speed}</span>
        </span>
      </span>
      {useMode && (
        <span
          className={`block w-full text-center text-2xs font-display font-bold uppercase tracking-widest rounded leading-tight ${
            useMode === 'cast'
              ? 'bg-tide-wash text-tide-deep border border-tide-deep'
              : 'bg-moss-wash text-moss-deep border border-moss-deep'
          }`}
        >
          {useMode}
        </span>
      )}
    </button>
  );
}

/** The selected card, opened out as a sheet above the rail. */
function CardSheet({
  cardId,
  useMode,
  onClose,
}: {
  cardId: string;
  useMode: 'cast' | 'maneuver' | null;
  onClose: () => void;
}) {
  const spell = getSpell(cardId);

  if (!spell) {
    const behavior = getBehaviorCard(cardId);
    const body =
      cardId === '__fatigue__'
        ? 'A dead page. Discard at end of turn, or spend 1 Focus.'
        : behavior?.effect;
    if (!body) return null;
    return (
      <div className="sheet-card plaque-aged px-2.5 py-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-2xs uppercase tracking-widest text-ink-700 flex-1">
            {behavior?.name ?? 'Fatigue'}
          </span>
          <SheetClose onClose={onClose} />
        </div>
        <p className="text-2xs text-ink-700 italic leading-snug mt-1">{body}</p>
      </div>
    );
  }

  return (
    <div className={`sheet-card spellcard ${elementInk(spell.element)}`}>
      <div className="spellcard-body p-2">
        <div className="flex items-start gap-1.5">
          <ElementSeal glyph={ELEMENT_GLYPH[spell.element] ?? 'mountain'} size="sm" title={spell.element} />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-sm leading-tight text-ink-900 capitalize truncate">
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
          <SheetClose onClose={onClose} />
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
          <span className="flex items-center gap-1.5">
            {spell.burnIcon && (
              <span className="flex items-center gap-0.5 px-1 rounded border border-ember-deep bg-ember-wash text-ember-deep">
                <Glyph name="flame" className="w-3 h-3" />
                <span className="text-2xs font-bold uppercase tracking-wider">Burn</span>
              </span>
            )}
            {useMode ? (
              <span
                className={`text-2xs font-display font-bold uppercase tracking-widest rounded px-1.5 py-0.5 ${
                  useMode === 'cast'
                    ? 'bg-tide-wash text-tide-deep border border-tide-deep'
                    : 'bg-moss-wash text-moss-deep border border-moss-deep'
                }`}
              >
                {useMode}
              </span>
            ) : (
              <span className="text-2xs italic text-ink-600">tap = cast · shift+tap = maneuver</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close card"
      className="seal-blank w-6 h-6 shrink-0 text-ink-700"
      style={{ minHeight: 24 }}
    >
      <Glyph name="cross" className="w-3 h-3" />
    </button>
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
  const [focusCard, setFocusCard] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [vfx, setVfx] = useState<RoundVfx | null>(null);
  const runId = useRef(0);

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
    setFocusCard(null);
    setVfx(null);
  }, [world, setWorld, addLogEntry]);

  const handleCardClick = useCallback((cardId: string, e: React.MouseEvent) => {
    if (!combat) return;
    const isShift = e.shiftKey;

    setFocusCard(cardId);
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

    // Replay the round on the duelling ground
    runId.current += 1;
    setVfx(buildRoundVfx(runId.current, state, result, playerId ?? ''));
    setFocusCard(null);

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
  // Duels between two mages have no `isPlayer: false` side — fall back to
  // "whoever is not the player" so rival mages still take the field.
  const enemy =
    combat.participants.find((p) => !p.isPlayer) ??
    combat.participants.find((p) => p.id !== player?.id);

  // Get enemy intent (first queued spell or behavior card from monster deck)
  const enemyIntent = enemy?.queuedSpells[0];
  const enemyIntentCard = enemyIntent ? getBehaviorCard(enemyIntent.cardId) ?? getSpell(enemyIntent.cardId) : undefined;

  // Bestiary note, when the foe is actually a beast
  const enemyMonster: Monster | undefined = enemy
    ? MONSTERS.find((m) => m.name === enemy.name)
    : undefined;

  const band: RangeBand = enemy?.range ?? player?.range ?? 'near';
  const gap = RANGE_INDEX[band];
  const anchors = fighterAnchor(gap);

  const leftFighter: SceneFighter | null = player
    ? {
        id: player.id,
        side: 'left',
        figure: deriveFigure(player, true),
        conditions: player.conditions,
        defeated: player.vitality <= 0,
        victorious: !!enemy && enemy.vitality <= 0 && player.vitality > 0,
      }
    : null;

  const rightFighter: SceneFighter | null = enemy
    ? {
        id: enemy.id,
        side: 'right',
        figure: deriveFigure(enemy, false),
        conditions: enemy.conditions,
        defeated: enemy.vitality <= 0,
        victorious: !!player && player.vitality <= 0 && enemy.vitality > 0,
      }
    : null;

  const selectedCount = Object.keys(selectedCards).length;
  const won = combat.result === 'victory';
  const over = combat.result !== 'ongoing';

  return (
    <div className="relative h-full overflow-hidden bg-parchment-300">
      {/* --- The duelling ground ------------------------------------------- */}
      <div className="absolute inset-0">
        {leftFighter && rightFighter && (
          <CombatScene left={leftFighter} right={rightFighter} gap={gap} vfx={vfx} />
        )}
      </div>
      <div className="arena-frame pointer-events-none absolute inset-0" />

      {/* --- Damage floaters ------------------------------------------------ */}
      {vfx && (
        <div key={vfx.runId} className="pointer-events-none absolute inset-0">
          {(['left', 'right'] as Side[]).map((s) =>
            vfx.damage[s] > 0 ? (
              <span
                key={s}
                className="dmg-float font-display font-bold"
                style={{ left: `${anchors[s].x * 100}%`, top: `${anchors[s].y * 100}%` }}
              >
                −{vfx.damage[s]}
              </span>
            ) : null,
          )}
        </div>
      )}

      {/* --- Top HUD -------------------------------------------------------- */}
      <div className="absolute inset-x-0 top-0 p-1.5 flex flex-col items-center gap-1 pointer-events-none">
        <div className="flex items-start justify-between gap-2 w-full">
          {player && <NamePlate p={player} side="left" />}
          {enemy && <NamePlate p={enemy} side="right" />}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hud-chip px-1.5 py-1 text-2xs text-ink-700 leading-none">
            R<span className="font-display font-bold text-ink-900">{combat.round}</span>
          </span>
          <RangeStrip band={band} youBand={player?.range ?? band} />
          <span className="hud-chip px-1.5 py-1 text-2xs text-ink-700 capitalize leading-none">
            {combat.phase}
          </span>
        </div>

        {enemyIntentCard && (
          <IntentChip
            name={enemyIntentCard.name}
            speed={enemyIntentCard.speed}
            effect={'effect' in enemyIntentCard ? enemyIntentCard.effect : enemyIntentCard.cast}
          />
        )}
      </div>

      {/* --- Bottom HUD: the hand as a move menu ---------------------------- */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-1.5">
        {focusCard && (
          <CardSheet
            cardId={focusCard}
            useMode={selectedCards[focusCard] ?? null}
            onClose={() => setFocusCard(null)}
          />
        )}

        {player && (
          <div className="flex items-end gap-1.5 overflow-x-auto pb-0.5 -mx-1.5 px-1.5 rail-scroll">
            {player.hand.length === 0 ? (
              <span className="hud-chip px-2 py-1.5 marginalia text-2xs">No cards in hand.</span>
            ) : (
              player.hand.map((cardId, i) => (
                <CardChip
                  key={`${cardId}-${i}`}
                  cardId={cardId}
                  selected={cardId in selectedCards}
                  useMode={selectedCards[cardId] ?? null}
                  focused={focusCard === cardId}
                  onClick={(e) => handleCardClick(cardId, e)}
                />
              ))
            )}
          </div>
        )}

        <div className="flex items-stretch gap-1.5">
          <button
            onClick={handleResolveRound}
            disabled={over}
            className="btn btn-brass flex-1 text-base"
          >
            <Glyph name="swords" className="w-5 h-5" />
            {selectedCount > 0 ? `Cast ${selectedCount} · Resolve` : 'Resolve Round'}
          </button>

          {isConclaveCombat && over ? (
            <button onClick={() => resolveConclaveCombat()} className="btn btn-ox px-3" title="Conclave">
              <Glyph name="chalice" className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={startTestCombat} className="btn btn-quiet px-3" title="Restart the duel">
              <Glyph name="swords" className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setLogOpen((v) => !v)}
            className={`btn px-3 ${logOpen ? 'btn-wood' : 'btn-quiet'}`}
            title="Duel record"
            aria-expanded={logOpen}
          >
            <Glyph name="ledger" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- Duel record sheet ---------------------------------------------- */}
      {logOpen && (
        <div className="absolute inset-x-0 bottom-0 top-1/3 z-20 flex flex-col paper-aged border-t-2 border-ink-700 shadow-page">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-700/30">
            <h3 className="chapter text-2xs flex-1">Duel Record</h3>
            <button onClick={() => setLogOpen(false)} className="btn btn-sm btn-quiet px-2" aria-label="Close record">
              <Glyph name="cross" className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {combat.timeline.length > 0 && (
              <div className="mb-2">
                <h4 className="chapter text-2xs mb-1">Casting Order</h4>
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
                      <span className="font-display font-bold truncate max-w-[35%]">{caster?.name}</span>
                      <span className="text-ink-500">→</span>
                      <span className="truncate flex-1">{spell?.name ?? entry.spell.cardId}</span>
                      {entry.spell.empowered && <Glyph name="star" className="w-3 h-3 text-brass-700 shrink-0" />}
                      {entry.spell.overcharged && <Glyph name="bolt" className="w-3 h-3 text-oxblood-700 shrink-0" />}
                      {entry.fizzled && <span className="italic shrink-0">fizzled</span>}
                      {entry.resolved && <Glyph name="check" className="w-3 h-3 text-moss-deep shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              {combat.log.slice(-40).map((entry, i) => (
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

            {/* Conditions in play + bestiary marginalia */}
            {(player?.conditions.length || enemy?.conditions.length) ? (
              <div className="mt-2 pt-2 border-t border-ink-700/25 space-y-1">
                {[player, enemy].map((p) =>
                  p && p.conditions.length > 0 ? (
                    <div key={p.id} className="flex flex-wrap items-center gap-1">
                      <span className="text-2xs font-display font-bold text-ink-800 mr-0.5">{p.name}</span>
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
                  ) : null,
                )}
              </div>
            ) : null}

            {enemyMonster && (
              <div className="slip px-2.5 py-2 mt-2 text-2xs text-ink-700 leading-snug">
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
      )}

      {/* --- Result banner (yields to the record sheet) ----------------------- */}
      {over && !logOpen && (
        <div className="absolute inset-0 z-30 flex items-start justify-center px-6 pt-[19%] pointer-events-none">
          <div className="page banner-pop px-4 py-3 text-center max-w-[270px] w-full pointer-events-auto">
            <span className={`${won ? 'seal-moss' : 'seal-ox'} w-11 h-11 mx-auto mb-1.5`}>
              <Glyph name={won ? 'rosette' : 'skull'} className="w-6 h-6" />
            </span>
            <h2 className="title-display text-xl capitalize leading-none">{combat.result}</h2>
            <div className="rule-ornate my-1" />
            <p className="marginalia text-2xs leading-snug">
              {won
                ? 'The field is yours. The chronicle will remember it.'
                : combat.result === 'defeat'
                ? 'You are carried from the ground. Ink dries on a shorter page.'
                : 'The duel ends.'}
            </p>
            {isConclaveCombat ? (
              <button onClick={() => resolveConclaveCombat()} className="btn btn-ox mt-2.5 w-full">
                <Glyph name="chalice" className="w-4 h-4" />
                Return to the Conclave
              </button>
            ) : (
              <button onClick={startTestCombat} className="btn btn-brass mt-2.5 w-full">
                <Glyph name="swords" className="w-4 h-4" />
                Duel Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
