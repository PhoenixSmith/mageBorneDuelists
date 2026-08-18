import { useGameStore } from '../store/gameStore';
import type { PanelType } from '../types';

const NAV_ITEMS: Array<{ id: PanelType; label: string; icon: string }> = [
  { id: 'map', label: 'Map', icon: '🗺' },
  { id: 'deck', label: 'Deck', icon: '🃏' },
  { id: 'combat', label: 'Combat', icon: '⚔' },
  { id: 'quests', label: 'Quests', icon: '❗' },
  { id: 'shop', label: 'Shop', icon: '🏪' },
  { id: 'character', label: 'Mage', icon: '🧙' },
];

export function TopBar() {
  const world = useGameStore((s) => s.world);
  const daysLeft = world.maxDays - world.day;

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white border-b border-slate-700">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-amber-400 font-bold">🪙 {world.player.coin}</span>
        <span className="text-blue-400">💎 {Object.values(world.player.reagents).reduce((a, b) => a + b, 0)}</span>
        <span className="text-purple-400">✦ {world.player.focus}</span>
      </div>
      <div className="text-sm font-semibold">
        Day {world.day} / {world.maxDays}
        <span className="text-slate-400 ml-2">({daysLeft} days left)</span>
      </div>
    </div>
  );
}

export function BottomNav() {
  const activePanel = useGameStore((s) => s.activePanel);
  const setActivePanel = useGameStore((s) => s.setActivePanel);

  return (
    <nav className="flex items-stretch bg-slate-900 border-t border-slate-700 h-14">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => setActivePanel(item.id)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activePanel === item.id
              ? 'text-amber-400 border-t-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function ChronicleLog() {
  const log = useGameStore((s) => s.log);
  const world = useGameStore((s) => s.world);

  return (
    <div className="px-3 py-1 bg-slate-800/50 text-xs text-slate-300 max-h-20 overflow-y-auto">
      {world.chronicle.slice(-3).map((entry, i) => (
        <div key={i} className="truncate">
          <span className="text-slate-500">[Day {entry.day}]</span> {entry.text}
        </div>
      ))}
      {log.slice(-2).map((entry, i) => (
        <div key={`log-${i}`} className="truncate text-slate-400">
          {entry}
        </div>
      ))}
    </div>
  );
}
