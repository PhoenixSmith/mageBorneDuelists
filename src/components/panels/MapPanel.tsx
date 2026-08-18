import { useGameStore } from '../../store/gameStore';
import { hexDistance } from '../../game/worldgen/worldgen';
import { HexMapScene } from '../three/HexMapScene';

const TERRAIN_COLORS: Record<string, string> = {
  plains: '#7cb342',
  forest: '#558b2f',
  mountains: '#8d6e63',
  desert: '#fdd835',
  swamp: '#4e6d3b',
  water: '#42a5f5',
  tundra: '#e0e0e0',
  volcanic: '#bf360c',
  jungle: '#2e7d32',
  ruins: '#616161',
};

export function MapPanel() {
  const world = useGameStore((s) => s.world);
  const selectedHexId = useGameStore((s) => s.selectedHexId);
  const selectHex = useGameStore((s) => s.selectHex);

  const playerHex = world.hexes[world.playerHexId];

  const settlements = Object.values(world.settlements).map((s) => {
    const hex = world.hexes[s.hexId];
    return { ...s, hex };
  });

  return (
    <div className="flex flex-col h-full">
      {/* 3D hex map (React Three Fiber) */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden" style={{ touchAction: 'none' }}>
        <HexMapScene />
      </div>

      {/* Settlement list / hex info — DOM overlay for mobile interaction reliability */}
      <div className="bg-slate-800 border-t border-slate-700 max-h-48 overflow-y-auto">
        {selectedHexId && world.hexes[selectedHexId] && (
          <div className="p-2 text-sm text-slate-200">
            <div className="font-semibold capitalize">
              {world.hexes[selectedHexId].terrain}
            </div>
            {world.hexes[selectedHexId].settlementId && (
              <div className="text-amber-400">
                {world.settlements[world.hexes[selectedHexId].settlementId!]?.name}
              </div>
            )}
            {playerHex && hexDistance(
              world.hexes[selectedHexId].q,
              world.hexes[selectedHexId].r,
              playerHex.q,
              playerHex.r
            ) > 0 && (
              <div className="text-slate-400 text-xs mt-1">
                Distance: {hexDistance(
                  world.hexes[selectedHexId].q,
                  world.hexes[selectedHexId].r,
                  playerHex.q,
                  playerHex.r
                )} hexes
              </div>
            )}
          </div>
        )}
        <div className="p-2">
          <div className="text-xs text-slate-400 font-semibold mb-1">Nearby Settlements</div>
          {settlements
            .filter((s) => s.hex?.discovered)
            .map((s) => {
              const dist = playerHex
                ? hexDistance(s.hex.q, s.hex.r, playerHex.q, playerHex.r)
                : 0;
              return (
                <button
                  key={s.id}
                  onClick={() => selectHex(s.hexId)}
                  className="block w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded"
                >
                  <span className="text-amber-400">{s.name}</span>
                  <span className="text-slate-500 ml-2">({s.type})</span>
                  <span className="text-slate-500 ml-2">{dist} hexes</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// Re-export terrain colors for potential use elsewhere
export { TERRAIN_COLORS };
