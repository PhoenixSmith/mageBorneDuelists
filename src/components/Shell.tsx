import { useGameStore } from '../store/gameStore';
import type { PanelType } from '../types';
import { Glyph, Seal, type GlyphName } from './Sigils';

const NAV_ITEMS: Array<{ id: PanelType; label: string; icon: GlyphName }> = [
  { id: 'map', label: 'Map', icon: 'hex' },
  { id: 'deck', label: 'Deck', icon: 'cards' },
  { id: 'combat', label: 'Combat', icon: 'swords' },
  { id: 'quests', label: 'Quests', icon: 'scroll' },
  { id: 'shop', label: 'Shop', icon: 'scales' },
  { id: 'character', label: 'Mage', icon: 'hat' },
  { id: 'conclave', label: 'Conclave', icon: 'chalice' },
];

/** Resource reading: wax seal + serif numeral, set into a recessed slot. */
function Tally({
  glyph,
  tone,
  value,
  title,
}: {
  glyph: GlyphName;
  tone: 'brass' | 'tide' | 'arcane';
  value: number;
  title: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-seal border border-wood-900/70 bg-wood-900/55"
      style={{ boxShadow: 'inset 0 1px 3px rgba(30,18,8,0.55)' }}
      title={title}
    >
      <Seal glyph={glyph} tone={tone} size="sm" />
      <span className="font-display font-bold text-sm text-parchment-100 tabular-nums leading-none">
        {value}
      </span>
    </div>
  );
}

export function TopBar() {
  const world = useGameStore((s) => s.world);
  const daysLeft = world.maxDays - world.day;

  return (
    <div className="wood flex items-center justify-between gap-2 px-2.5 py-1.5 border-b-2 border-wood-900 shadow-carved z-10">
      <div className="flex items-center gap-1.5">
        <Tally glyph="coin" tone="brass" value={world.player.coin} title="Coin" />
        <Tally
          glyph="gem"
          tone="tide"
          value={Object.values(world.player.reagents).reduce((a, b) => a + b, 0)}
          title="Reagents"
        />
        <Tally glyph="essence" tone="arcane" value={world.player.focus} title="Focus" />
      </div>

      {/* Almanac page edge — the day counter is a tab on the page block */}
      <div className="page-edge flex items-baseline gap-1.5 pl-2 pr-2.5 py-1">
        <span className="text-2xs uppercase tracking-[0.16em] text-ink-600">Day</span>
        <span className="font-display font-bold text-base leading-none tabular-nums">{world.day}</span>
        <span className="text-2xs text-ink-600">/ {world.maxDays}</span>
        <span className="text-2xs text-oxblood-700 font-semibold ml-0.5">({daysLeft} left)</span>
      </div>
    </div>
  );
}

export function BottomNav() {
  const activePanel = useGameStore((s) => s.activePanel);
  const setActivePanel = useGameStore((s) => s.setActivePanel);

  return (
    <nav className="wood flex items-stretch border-t-2 border-wood-900 h-16 shadow-carved z-10">
      {NAV_ITEMS.map((item) => {
        const active = activePanel === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-md my-1 mx-0.5 transition-all duration-100 ${
              active
                ? 'tab-inlay text-ink-900'
                : 'text-parchment-200 hover:text-parchment-50 hover:bg-wood-900/40'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-seal border ${
                active
                  ? 'border-brass-900/70 bg-brass-800/25'
                  : 'border-parchment-200/35 bg-wood-900/35'
              }`}
            >
              <Glyph name={item.icon} className="w-[17px] h-[17px]" strokeWidth={1.9} />
            </span>
            <span
              className="text-2xs font-display font-bold leading-none tracking-tight max-w-full truncate px-0.5"
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function ChronicleLog() {
  const log = useGameStore((s) => s.log);
  const world = useGameStore((s) => s.world);

  return (
    <div
      className="paper-aged border-t-2 border-wood-900 px-3 py-1.5 max-h-20 overflow-y-auto"
      style={{ boxShadow: 'inset 0 3px 6px -3px rgba(58,37,23,0.55)' }}
    >
      {world.chronicle.slice(-3).map((entry, i) => (
        <div key={i} className="truncate font-display italic text-2xs text-ink-800 leading-relaxed">
          <span className="not-italic font-bold text-brass-900 mr-1">Day {entry.day} —</span>
          {entry.text}
        </div>
      ))}
      {log.slice(-2).map((entry, i) => (
        <div key={`log-${i}`} className="truncate font-display italic text-2xs text-ink-600 leading-relaxed">
          <span className="text-brass-800 mr-1">❧</span>
          {entry}
        </div>
      ))}
    </div>
  );
}
