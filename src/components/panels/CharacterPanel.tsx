import { useGameStore } from '../../store/gameStore';
import { ARCANE, ELEMENT_GLYPH, ElementSeal, Glyph, elementInk, type GlyphName } from '../Sigils';

const MASTERY_MAX = 4;

/** One line of the character ledger: label at left, serif figure at right. */
function LedgerLine({
  glyph,
  label,
  value,
}: {
  glyph: GlyphName;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="ledger-row flex items-center gap-2 px-2 py-2">
      <Glyph name={glyph} className="w-4 h-4 text-ink-600 shrink-0" />
      <span className="text-2xs uppercase tracking-[0.12em] text-ink-600 flex-1">{label}</span>
      <span className="font-display font-bold text-base text-ink-900 tabular-nums">{value}</span>
    </div>
  );
}

function VitalMeter({
  label,
  value,
  max,
  fill,
}: {
  label: string;
  value: number;
  max: number;
  fill: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex-1">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-2xs uppercase tracking-[0.14em] text-ink-600">{label}</span>
        <span className="font-display font-bold text-sm text-ink-900 tabular-nums">
          {value}
          <span className="text-ink-600">/{max}</span>
        </span>
      </div>
      <div className="meter h-3">
        <div className="meter-fill" style={{ width: `${pct}%`, backgroundColor: fill }} />
      </div>
    </div>
  );
}

export function CharacterPanel() {
  const player = useGameStore((s) => s.world.player);

  return (
    <div className="panel-scroll">
      <div className="p-3 space-y-3">
        {/* --- Portrait plate ------------------------------------------------- */}
        <div className="page px-3 py-3 flex items-center gap-3">
          <div
            className="w-20 h-24 shrink-0 rounded-lg border-2 border-brass-800 brass-plate p-1"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(28,20,14,0.35), 0 3px 8px -3px rgba(0,0,0,0.7)' }}
          >
            <div className="w-full h-full rounded border border-ink-900/40 bg-night-800/80 flex items-center justify-center">
              <Glyph name="hat" className="w-10 h-10 text-brass-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="title-display text-2xl leading-tight capitalize truncate">
              {player.name}
            </h2>
            <div className="text-2xs italic text-ink-600 capitalize">
              {player.origin.replace(/_/g, ' ')}
            </div>
            {player.titles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {player.titles.map((t) => (
                  <span
                    key={t}
                    className="brass-plate flex items-center gap-1 px-1.5 py-0.5 rounded border border-brass-900 text-2xs font-display font-bold"
                  >
                    <Glyph name="rosette" className="w-3 h-3" />
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- Vitals --------------------------------------------------------- */}
        <div className="page px-3 py-2.5">
          <h3 className="chapter text-2xs mb-2">Condition</h3>
          <div className="flex gap-3">
            <VitalMeter
              label="Vitality"
              value={player.vitality}
              max={player.maxVitality}
              fill="#c0392b"
            />
            <VitalMeter label="Focus" value={player.focus} max={player.maxFocus} fill={ARCANE} />
          </div>
        </div>

        {/* --- Mastery sigils --------------------------------------------------- */}
        <div className="page px-3 py-2.5">
          <h3 className="chapter text-2xs mb-2">Elemental Mastery</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['fire', 'water', 'wind', 'earth'] as const).map((el) => {
              const rank = player.mastery[el];
              return (
                <div
                  key={el}
                  className={`${elementInk(el)} slip flex items-center gap-2 px-2 py-1.5`}
                  style={{ borderColor: 'var(--el-deep)' }}
                >
                  <ElementSeal glyph={ELEMENT_GLYPH[el] ?? 'mountain'} size="sm" title={el} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-2xs capitalize text-ink-900 leading-none">
                      {el}
                    </div>
                    <div className="flex gap-0.5 mt-1">
                      {Array.from({ length: MASTERY_MAX }, (_, i) => (
                        <span key={i} className={`pip ${i < rank ? 'pip-on' : 'pip-off'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="font-display font-bold text-base text-ink-900 tabular-nums leading-none">
                    {rank}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- Standing ledger --------------------------------------------------- */}
        <div className="page overflow-hidden">
          <h3 className="chapter text-2xs px-3 pt-2.5 pb-1.5">Standing</h3>
          <LedgerLine glyph="coin" label="Coin" value={player.coin} />
          <LedgerLine glyph="star" label="Reputation" value={player.reputation} />
          <LedgerLine glyph="skull" label="Notoriety" value={player.notoriety} />
        </div>

        {/* --- Injuries ---------------------------------------------------------- */}
        {player.injuries.length > 0 && (
          <div className="plaque border-oxblood-700 px-3 py-2.5">
            <h3 className="chapter text-2xs mb-1.5 text-oxblood-800">Injuries</h3>
            <div className="space-y-1">
              {player.injuries.map((inj) => (
                <div
                  key={inj.id}
                  className="flex items-center gap-2 text-2xs text-oxblood-800 font-semibold"
                >
                  <span className="seal-ox w-5 h-5">
                    <Glyph name="droplet" className="w-3 h-3" />
                  </span>
                  <span className="flex-1">{inj.name}</span>
                  <span className="text-ink-600 italic">{inj.duration} days</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
