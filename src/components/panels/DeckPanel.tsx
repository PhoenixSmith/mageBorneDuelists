import { useGameStore } from '../../store/gameStore';

export function DeckPanel() {
  const player = useGameStore((s) => s.world.player);

  return (
    <div className="p-4 text-slate-200 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-amber-400 mb-3">Spell Grimoire</h2>
      <div className="text-sm text-slate-400 mb-4">
        Prepared deck: {player.preparedDeck.length} cards | Grimoire: {player.grimoire.length} spells
      </div>
      <div className="space-y-2">
        {player.grimoire.map((spellId) => {
          const prepared = player.preparedDeck.includes(spellId);
          const count = player.preparedDeck.filter((id) => id === spellId).length;
          return (
            <div
              key={spellId}
              className={`p-2 rounded border ${
                prepared ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{spellId.replace(/_/g, ' ')}</span>
                {prepared && (
                  <span className="text-xs text-amber-400">×{count} prepared</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
