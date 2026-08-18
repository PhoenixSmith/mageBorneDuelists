import { useGameStore } from '../../store/gameStore';
import { hexDistance } from '../../game/worldgen/worldgen';

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

  const hexes = Object.values(world.hexes);
  const playerHex = world.hexes[world.playerHexId];

  const settlements = Object.values(world.settlements).map((s) => {
    const hex = world.hexes[s.hexId];
    return { ...s, hex };
  });

  return (
    <div className="flex flex-col h-full">
      {/* Hex grid SVG */}
      <div className="flex-1 overflow-auto bg-slate-950">
        <svg
          width="100%"
          height="100%"
          viewBox="-50 -50 100 100"
          style={{ touchAction: 'none' }}
        >
          {hexes.map((hex) => {
            const x = Math.sqrt(3) * (hex.q + hex.r / 2);
            const y = 1.5 * hex.r;
            const isDiscovered = hex.discovered;
            const isSelected = selectedHexId === hex.id;
            const isPlayerHere = world.playerHexId === hex.id;
            const color = isDiscovered ? (TERRAIN_COLORS[hex.terrain] ?? '#333') : '#1a1a2e';
            const points = hexPoints(x, y, 0.9);

            return (
              <g key={hex.id}>
                <polygon
                  points={points}
                  fill={color}
                  stroke={isSelected ? '#fbbf24' : '#334155'}
                  strokeWidth={isSelected ? 0.15 : 0.05}
                  onClick={() => selectHex(hex.id)}
                  className="cursor-pointer"
                />
                {isPlayerHere && (
                  <circle cx={x} cy={y} r={0.3} fill="#fbbf24" stroke="#000" strokeWidth={0.05} />
                )}
                {hex.settlementId && isDiscovered && (
                  <rect
                    x={x - 0.15}
                    y={y - 0.15}
                    width={0.3}
                    height={0.3}
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={0.03}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Settlement list / hex info */}
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

function hexPoints(cx: number, cy: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return points.join(' ');
}
