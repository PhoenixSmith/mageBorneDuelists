import { useGameStore } from '../../store/gameStore';

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'text-red-400',
  water: 'text-blue-400',
  wind: 'text-green-400',
  earth: 'text-yellow-600',
};

export function CharacterPanel() {
  const player = useGameStore((s) => s.world.player);

  return (
    <div className="p-4 text-slate-200 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-purple-400 mb-3">Mage Profile</h2>

      <div className="space-y-3">
        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="font-semibold capitalize">{player.name}</div>
          <div className="text-xs text-slate-400 capitalize">Origin: {player.origin.replace(/_/g, ' ')}</div>
        </div>

        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="text-sm font-semibold mb-2">Vitality</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full"
                style={{ width: `${(player.vitality / player.maxVitality) * 100}%` }}
              />
            </div>
            <span className="text-xs">{player.vitality} / {player.maxVitality}</span>
          </div>
        </div>

        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="text-sm font-semibold mb-2">Focus</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full"
                style={{ width: `${(player.focus / player.maxFocus) * 100}%` }}
              />
            </div>
            <span className="text-xs">{player.focus} / {player.maxFocus}</span>
          </div>
        </div>

        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="text-sm font-semibold mb-2">Elemental Mastery</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['fire', 'water', 'wind', 'earth'] as const).map((el) => (
              <div key={el} className="flex items-center justify-between">
                <span className={ELEMENT_COLORS[el] + ' capitalize'}>{el}</span>
                <span className="text-slate-300">Rank {player.mastery[el]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="text-sm font-semibold mb-2">Resources</div>
          <div className="text-sm space-y-1">
            <div>🪙 Coin: {player.coin}</div>
            <div>⭐ Reputation: {player.reputation}</div>
            <div>💀 Notoriety: {player.notoriety}</div>
          </div>
        </div>

        {player.titles.length > 0 && (
          <div className="p-3 rounded bg-slate-800 border border-slate-700">
            <div className="text-sm font-semibold mb-2">Titles</div>
            <div className="text-sm text-amber-400">
              {player.titles.join(', ')}
            </div>
          </div>
        )}

        {player.injuries.length > 0 && (
          <div className="p-3 rounded bg-red-900/30 border border-red-800">
            <div className="text-sm font-semibold mb-2 text-red-400">Injuries</div>
            <div className="text-sm space-y-1">
              {player.injuries.map((inj) => (
                <div key={inj.id} className="text-red-300">
                  {inj.name} ({inj.duration} days)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
