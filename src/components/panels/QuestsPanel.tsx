import { useGameStore } from '../../store/gameStore';

export function QuestsPanel() {
  const quests = useGameStore((s) => s.world.activeQuests);
  const completed = useGameStore((s) => s.world.completedQuests);

  return (
    <div className="p-4 text-slate-200 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-green-400 mb-3">Quests</h2>
      {quests.length === 0 ? (
        <div className="text-slate-400 text-sm">
          No active quests. Visit settlements to find work.
        </div>
      ) : (
        <div className="space-y-2">
          {quests.map((q) => (
            <div key={q.id} className="p-2 rounded border border-slate-700 bg-slate-800">
              <div className="font-medium text-sm">{q.name}</div>
              <div className="text-xs text-slate-400">{q.description}</div>
              <div className="text-xs text-slate-500 mt-1">
                Stage {q.currentStage + 1} / {q.stages.length}
              </div>
            </div>
          ))}
        </div>
      )}
      {completed.length > 0 && (
        <div className="mt-4 text-xs text-slate-500">
          Completed: {completed.length}
        </div>
      )}
    </div>
  );
}
