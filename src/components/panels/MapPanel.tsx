import { useGameStore } from '../../store/gameStore';
import { hexDistance } from '../../game/worldgen/worldgen';
import { HexMapScene } from '../three/HexMapScene';
import { Glyph, Seal, type GlyphName, type SealTone } from '../Sigils';

const TERRAIN_COLORS: Record<string, string> = {
  plains: '#8ca94e',
  forest: '#4f7a38',
  mountains: '#8a6f5c',
  desert: '#d9b064',
  swamp: '#5c6b3f',
  water: '#3f7fa0',
  tundra: '#cfd2cc',
  volcanic: '#a8402a',
  jungle: '#3c6b3a',
  ruins: '#7a6d5f',
};

const SERVICE_META: Record<string, { label: string; glyph: GlyphName; tone: SealTone }> = {
  inn: { label: 'Inn', glyph: 'bed', tone: 'ox' },
  college: { label: 'College', glyph: 'book', tone: 'tide' },
  forge: { label: 'Forge', glyph: 'anvil', tone: 'wood' },
  alchemist: { label: 'Alchemist', glyph: 'flask', tone: 'moss' },
  market: { label: 'Market', glyph: 'scales', tone: 'brass' },
  ritual: { label: 'Ritual Site', glyph: 'rune', tone: 'ink' },
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
    <div className="tabletop flex flex-col h-full">
      {/* The scrying window — 3D hex map behind an ornate brass-and-oak frame */}
      <div
        className="flex-1 relative overflow-hidden scrying-frame m-1.5 rounded-lg bg-linen-300"
        style={{ touchAction: 'none' }}
      >
        <HexMapScene />
      </div>

      {/* The open journal page — DOM overlay for mobile interaction reliability */}
      <div className="paper border-t-4 border-wood-800 max-h-64 overflow-y-auto shadow-page">
        {selectedHex && (
          <div className="px-3 pt-2.5 pb-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="title-display text-lg capitalize leading-tight truncate">
                  {selectedSettlement ? selectedSettlement.name : selectedHex.terrain}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-3 h-3 rounded-seal border border-ink-700 shrink-0"
                    style={{ backgroundColor: TERRAIN_COLORS[selectedHex.terrain] ?? '#8a6f5c' }}
                  />
                  <span className="text-2xs uppercase tracking-[0.14em] text-ink-600 capitalize">
                    {selectedHex.terrain}
                    {selectedSettlement && ` · ${selectedSettlement.type}`}
                  </span>
                </div>
              </div>
              {isCurrentLocation && (
                <span className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md border-2 border-moss-deep bg-moss-wash text-moss-deep text-2xs font-display font-bold uppercase tracking-wide">
                  <Glyph name="compass" className="w-3.5 h-3.5" />
                  You are here
                </span>
              )}
            </div>

            <div className="rule-ornate my-1.5" />

            {/* Settlement services */}
            {selectedSettlement && (
              <div className="flex flex-wrap gap-1.5">
                {selectedSettlement.services.map((svc) => {
                  const meta = SERVICE_META[svc];
                  return (
                    <span
                      key={svc}
                      className="slip flex items-center gap-1.5 pl-1 pr-2 py-1 text-2xs font-semibold text-ink-800"
                    >
                      <Seal glyph={meta?.glyph ?? 'rune'} tone={meta?.tone ?? 'ink'} size="xs" />
                      {meta?.label ?? svc}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Travel writ */}
            {canTravel && (
              <div className="mt-2 flex items-center justify-between gap-2 slip px-2 py-1.5">
                <div className="text-2xs text-ink-700 leading-snug">
                  <span className="font-display font-bold text-ink-900">{distance}</span> hex
                  {distance > 1 ? 'es' : ''} distant
                  <br />
                  <span className="text-ink-600">
                    est. {Math.max(1, distance)} day{distance > 1 ? 's' : ''} on the road
                  </span>
                </div>
                <button onClick={() => travelTo(selectedHex.id)} className="btn btn-ox shrink-0">
                  <Seal glyph="compass" tone="brass" size="sm" />
                  Travel Here
                </button>
              </div>
            )}

            {/* Quick actions when standing in a settlement */}
            {isCurrentLocation && selectedSettlement && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedSettlement.services.includes('market') && (
                  <button onClick={() => setActivePanel('shop')} className="btn btn-sm btn-brass">
                    <Glyph name="scales" className="w-4 h-4" />
                    Market
                  </button>
                )}
                {selectedSettlement.services.includes('inn') && (
                  <button
                    onClick={() => useGameStore.getState().rest()}
                    className="btn btn-sm btn-moss"
                  >
                    <Glyph name="bed" className="w-4 h-4" />
                    Rest · 5
                    <Glyph name="coin" className="w-3.5 h-3.5" />
                  </button>
                )}
                {(selectedSettlement.services.includes('inn') ||
                  selectedSettlement.services.includes('college')) && (
                  <button onClick={() => setActivePanel('deck')} className="btn btn-sm btn-wood">
                    <Glyph name="cards" className="w-4 h-4" />
                    Prepare Deck
                  </button>
                )}
                <button onClick={() => setActivePanel('quests')} className="btn btn-sm btn-quiet">
                  <Glyph name="scroll" className="w-4 h-4" />
                  Quests
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gazetteer — each settlement a little rolled scroll */}
        <div className="px-3 pt-2 pb-3">
          <h3 className="chapter text-2xs mb-1.5">Nearby Settlements</h3>
          <div className="space-y-1">
            {settlements
              .filter((s) => s.hex?.discovered)
              .map((s) => {
                const dist = playerHex
                  ? hexDistance(s.hex.q, s.hex.r, playerHex.q, playerHex.r)
                  : 0;
                const here = s.hexId === world.playerHexId;
                const selected = s.hexId === selectedHexId;
                return (
                  <button
                    key={s.id}
                    onClick={() => selectHex(s.hexId)}
                    className={`slip w-full flex items-center gap-2 text-left pl-1.5 pr-2 py-1.5 transition-all ${
                      selected ? 'border-brass-700 shadow-gilt' : 'hover:border-ink-700'
                    }`}
                    style={{ minHeight: 44 }}
                  >
                    <span
                      className="w-1.5 self-stretch rounded-sm shrink-0"
                      style={{ backgroundColor: TERRAIN_COLORS[s.hex?.terrain] ?? '#8a6f5c' }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block font-display font-bold text-sm text-ink-900 truncate">
                        {s.name}
                      </span>
                      <span className="block text-2xs italic text-ink-600 capitalize">{s.type}</span>
                    </span>
                    {here ? (
                      <Seal glyph="compass" tone="moss" size="sm" title="You are here" />
                    ) : (
                      <span className="seal-blank w-9 h-7 rounded-md text-2xs font-display font-bold text-ink-700 tabular-nums">
                        {dist}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export terrain colors for potential use elsewhere
export { TERRAIN_COLORS };
