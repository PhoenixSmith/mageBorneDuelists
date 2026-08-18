import { useGameStore } from '../../store/gameStore';

export function CombatPanel() {
  const combat = useGameStore((s) => s.world.currentCombat);

  return (
    <div className="p-4 text-slate-200 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-red-400 mb-3">Combat</h2>
      {combat ? (
        <div className="text-sm">
          <div>Round: {combat.round}</div>
          <div>Phase: {combat.phase}</div>
          <div>Result: {combat.result}</div>
        </div>
      ) : (
        <div className="text-slate-400 text-sm">
          No active combat. Explore the map and encounter monsters to begin.
        </div>
      )}
    </div>
  );
}
