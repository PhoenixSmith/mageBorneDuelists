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

const SERVICE_LABELS: Record<string, string> = {
  inn: '🏨 Inn',
  college: '🎓 College',
  forge: '⚒ Forge',
  alchemist: '⚗ Alchemist',
  market: '🏪 Market',
  ritual: '🔮 Ritual Site',
};

export function MapPanel() {
  const world = useGameStore((s) => s.world);
  const selectedHexId = useGameStore((s) => s.selectedHexId);
  const selectHex = useGameStore((s) => s.selectHex);
  const travelTo = useGameStore((s) => s.travelTo);
  const setActivePanel = useGameStore((s) => s.setActivePanel);

  const playerHex = world.hexes[world.playerHexId];

  const settlements = Object.values(world.settlements).map((s) => {
    const hex = world.hexes[s.hexId];
    return { ...s, hex };
  });

  const selectedHex = selectedHexId ? world.hexes[selectedHexId] : null;
  const selectedSettlement = selectedHex?.settlementId
    ? world.settlements[selectedHex.settlementId]
    : undefined;

  const distance = selectedHex && playerHex
    ? hexDistance(selectedHex.q, selectedHex.r, playerHex.q, playerHex.r)
    : 0;
  const isCurrentLocation = selectedHexId === world.playerHexId;
  const canTravel = selectedHex && !isCurrentLocation && selectedHex.discovered && distance > 0;

  return (
    <div className="flex flex-col h-full">
      {/* 3D hex map (React Three Fiber) */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden" style={{ touchAction: 'none' }}>
        <HexMapScene />
      </div>

      {/* Settlement list / hex info — DOM overlay for mobile interaction reliability */}
      <div className="bg-slate-800 border-t border-slate-700 max-h-56 overflow-y-auto">
        {selectedHex && (
          <div className="p-2 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold capitalize">{selectedHex.terrain}</span>
                {selectedSettlement && (
                  <span className="text-amber-400 ml-2">{selectedSettlement.name}</span>
                )}
              </div>
              {isCurrentLocation && (
                <span className="text-xs text-green-400 font-semibold">You are here</span>
              )}
            </div>

            {/* Settlement services */}
            {selectedSettlement && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedSettlement.services.map((svc) => (
                  <span key={svc} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                    {SERVICE_LABELS[svc] ?? svc}
                  </span>
                ))}
              </div>
            )}

            {/* Travel info */}
            {canTravel && (
              <div className="mt-2">
                <div className="text-slate-400 text-xs mb-1">
                  Distance: {distance} hex{distance > 1 ? 'es' : ''} • Est. travel: {Math.max(1, distance)} day{distance > 1 ? 's' : ''}
                </div>
                <button
                  onClick={() => travelTo(selectedHex.id)}
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
                >
                  🗺 Travel Here
                </button>
              </div>
            )}

            {/* Quick actions when at settlement */}
            {isCurrentLocation && selectedSettlement && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedSettlement.services.includes('market') && (
                  <button
                    onClick={() => setActivePanel('shop')}
                    className="px-2 py-1 text-[10px] bg-amber-700 hover:bg-amber-600 text-white rounded font-bold"
                  >
                    🏪 Market
                  </button>
                )}
                {selectedSettlement.services.includes('inn') && (
                  <button
                    onClick={() => useGameStore.getState().rest()}
                    className="px-2 py-1 text-[10px] bg-green-700 hover:bg-green-600 text-white rounded font-bold"
                  >
                    🏨 Rest (5🪙)
                  </button>
                )}
                {(selectedSettlement.services.includes('inn') || selectedSettlement.services.includes('college')) && (
                  <button
                    onClick={() => setActivePanel('deck')}
                    className="px-2 py-1 text-[10px] bg-purple-700 hover:bg-purple-600 text-white rounded font-bold"
                  >
                    🃏 Prepare Deck
                  </button>
                )}
                <button
                  onClick={() => setActivePanel('quests')}
                  className="px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-bold"
                >
                  ❗ Quests
                </button>
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
