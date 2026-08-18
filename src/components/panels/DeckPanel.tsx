import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getSpell } from '../../data/spells';

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'border-red-600 bg-red-950/30',
  water: 'border-blue-600 bg-blue-950/30',
  wind: 'border-cyan-500 bg-cyan-950/30',
  earth: 'border-amber-700 bg-amber-950/30',
  magma: 'border-orange-700 bg-orange-950/30',
  lightning: 'border-yellow-600 bg-yellow-950/30',
  steam: 'border-slate-500 bg-slate-950/30',
  storm: 'border-indigo-500 bg-indigo-950/30',
};

function elementBorder(el: string): string {
  return ELEMENT_COLORS[el] ?? 'border-slate-600 bg-slate-800';
}

export function DeckPanel() {
  const world = useGameStore((s) => s.world);
  const prepareDeck = useGameStore((s) => s.prepareDeck);

  const player = world.player;
  const [selectedCards, setSelectedCards] = useState<string[]>([...player.preparedDeck]);

  // Check if player can prepare deck (at inn or college)
  const playerHex = world.hexes[world.playerHexId];
  const settlementId = playerHex?.settlementId;
  const settlement = settlementId ? world.settlements[settlementId] : undefined;
  const canPrepare = (settlement?.services.includes('inn') || settlement?.services.includes('college')) ?? false;

  const toggleCard = (spellId: string) => {
    if (!canPrepare) return;
    setSelectedCards((prev) => {
      // Count current instances
      const count = prev.filter((id) => id === spellId).length;
      // Max 16 cards, and you can have up to 3 of the same spell
      if (prev.includes(spellId)) {
        if (count >= 3) {
          // Remove all instances
          return prev.filter((id) => id !== spellId);
        }
        // Remove one instance
        const idx = prev.lastIndexOf(spellId);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      }
      if (prev.length >= 16) return prev; // Max 16
      return [...prev, spellId];
    });
  };

  const handlePrepare = () => {
    if (selectedCards.length < 12 || selectedCards.length > 16) return;
    prepareDeck(selectedCards);
  };

  const cardCount = (spellId: string) =>
    selectedCards.filter((id) => id === spellId).length;

  return (
    <div className="p-4 text-slate-200 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-amber-400">Spell Deck</h2>
        <div className="text-sm text-slate-400">
          Prepared: <span className={selectedCards.length >= 12 && selectedCards.length <= 16 ? 'text-green-400' : 'text-red-400'}>
            {selectedCards.length}
          </span> / 12-16
        </div>
      </div>

      {/* Status banner */}
      {!canPrepare ? (
        <div className="p-2 mb-3 rounded border border-slate-700 bg-slate-800/50 text-xs text-slate-400">
          You can only modify your prepared deck at an inn or college.
          Travel to a settlement with these services.
        </div>
      ) : (
        <div className="p-2 mb-3 rounded border border-green-700 bg-green-950/20 text-xs text-green-400">
          ✓ You can prepare your deck here. Click spells to add/remove. (12-16 cards, max 3 per spell)
        </div>
      )}

      {/* Action buttons */}
      {canPrepare && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={handlePrepare}
            disabled={selectedCards.length < 12 || selectedCards.length > 16}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-bold text-sm"
          >
            Confirm Deck ({selectedCards.length})
          </button>
          <button
            onClick={() => setSelectedCards([...player.preparedDeck])}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-bold text-sm"
          >
            Reset
          </button>
        </div>
      )}

      {/* Grimoire / Available Spells */}
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Grimoire ({player.grimoire.length} spells)</h3>
      <div className="space-y-2">
        {player.grimoire.map((spellId) => {
          const spell = getSpell(spellId);
          const count = cardCount(spellId);
          const inDeck = count > 0;

          if (!spell) {
            return (
              <div key={spellId} className="p-2 rounded border border-slate-700 bg-slate-800">
                <span className="text-sm capitalize">{spellId.replace(/_/g, ' ')}</span>
              </div>
            );
          }

          return (
            <div
              key={spellId}
              className={`p-2 rounded border cursor-pointer transition-all ${elementBorder(spell.element)} ${
                canPrepare ? 'hover:ring-1 hover:ring-amber-400' : 'cursor-default'
              } ${inDeck ? 'ring-1 ring-amber-500' : ''}`}
              onClick={() => toggleCard(spellId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold capitalize">{spell.name}</span>
                    <span className="text-[10px] text-slate-500 capitalize">{spell.element}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    SPD {spell.speed} • FOC {spell.focusCost} • {spell.tags.join(', ')}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5 truncate">
                    {spell.cast}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 ml-2">
                  {inDeck ? (
                    <span className="text-xs text-amber-400 font-bold">×{count}</span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                  {inDeck && <span className="text-[10px] text-green-400">Prepared</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current prepared deck summary */}
      <div className="mt-4 p-2 rounded border border-slate-700 bg-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-1">Current Prepared Deck</h3>
        <div className="text-xs text-slate-400">
          {player.preparedDeck.length} cards total
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {player.preparedDeck.map((spellId, i) => {
            const spell = getSpell(spellId);
            return (
              <span key={`${spellId}-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 capitalize">
                {spell?.name ?? spellId}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
