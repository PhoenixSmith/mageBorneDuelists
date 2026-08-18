import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getSpell } from '../../data/spells';
import { ELEMENT_GLYPH, ElementSeal, Glyph, elementInk } from '../Sigils';

/** A small inked entry on a card face: label in small-caps, rule, then the text. */
function CardEntry({
  label,
  text,
  tone = 'ink',
}: {
  label: string;
  text: string;
  tone?: 'ink' | 'brass' | 'ox' | 'el';
}) {
  const labelColor =
    tone === 'brass' ? 'text-brass-900' : tone === 'ox' ? 'text-oxblood-700' : 'text-ink-700';
  return (
    <div className="text-2xs leading-snug text-ink-800">
      <span
        className={`inked-label mr-1 ${tone === 'el' ? '' : labelColor}`}
        style={tone === 'el' ? { color: 'var(--el-deep)' } : undefined}
      >
        {label}
      </span>
      {text}
    </div>
  );
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

  const legal = selectedCards.length >= 12 && selectedCards.length <= 16;

  return (
    <div className="panel-scroll">
      <div className="p-3 space-y-3">
        {/* --- Chapter plate ------------------------------------------------ */}
        <div className="page px-3 py-2.5 flex items-center justify-between gap-3">
          <div>
            <h2 className="title-display text-xl leading-tight">Spell Deck</h2>
            <div className="text-2xs italic text-ink-600">Cards carried into a duel</div>
          </div>
          <div className="flex flex-col items-center shrink-0">
            <span
              className={`${legal ? 'seal-brass' : 'seal-ox'} w-14 h-14 flex-col leading-none`}
              title="Prepared cards"
            >
              <span className="font-display font-bold text-lg tabular-nums">
                {selectedCards.length}
              </span>
              <span className="text-2xs uppercase tracking-widest opacity-80">of 16</span>
            </span>
            <span className="text-2xs text-ink-600 mt-1">12–16 legal</span>
          </div>
        </div>

        {/* --- Notice ------------------------------------------------------- */}
        {!canPrepare ? (
          <div className="plaque-aged flex items-start gap-2 px-2.5 py-2">
            <Glyph name="quill" className="w-4 h-4 mt-0.5 text-ink-600 shrink-0" />
            <p className="text-2xs text-ink-700 leading-snug">
              A deck may only be re-bound at an <span className="font-semibold">inn</span> or a{' '}
              <span className="font-semibold">college</span>. Travel to a settlement with those
              services.
            </p>
          </div>
        ) : (
          <div className="plaque flex items-start gap-2 px-2.5 py-2 border-moss-deep">
            <Glyph name="check" className="w-4 h-4 mt-0.5 text-moss-deep shrink-0" />
            <p className="text-2xs text-ink-700 leading-snug">
              You may prepare your deck here. Tap a spell to add or remove a copy — 12–16 cards, at
              most 3 of any one spell.
            </p>
          </div>
        )}

        {/* --- Actions ------------------------------------------------------ */}
        {canPrepare && (
          <div className="flex gap-2">
            <button onClick={handlePrepare} disabled={!legal} className="btn btn-brass flex-1">
              Confirm Deck ({selectedCards.length})
            </button>
            <button
              onClick={() => setSelectedCards([...player.preparedDeck])}
              className="btn btn-quiet"
            >
              Reset
            </button>
          </div>
        )}

        {/* --- Grimoire ------------------------------------------------------ */}
        <h3 className="chapter text-sm pt-1 text-parchment-200">
          <span className="text-parchment-100">Grimoire · {player.grimoire.length} spells</span>
        </h3>

        <div className="space-y-2">
          {player.grimoire.map((spellId) => {
            const spell = getSpell(spellId);
            const count = cardCount(spellId);
            const inDeck = count > 0;

            if (!spell) {
              return (
                <div key={spellId} className="plaque-aged px-3 py-2">
                  <span className="font-display font-bold text-sm capitalize text-ink-800">
                    {spellId.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={spellId}
                onClick={() => toggleCard(spellId)}
                className={`spellcard ${elementInk(spell.element)} ${
                  canPrepare ? 'spellcard-tappable' : ''
                } ${inDeck ? 'spellcard-active' : ''}`}
              >
                <div className="spellcard-body p-2.5">
                  {/* Card head: sigil, name, cost dials */}
                  <div className="flex items-start gap-2">
                    <ElementSeal
                      glyph={ELEMENT_GLYPH[spell.element] ?? 'mountain'}
                      size="md"
                      title={spell.element}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-[15px] leading-tight text-ink-900 capitalize">
                        {spell.name}
                      </div>
                      <div className="text-2xs italic text-ink-600 capitalize truncate">
                        {spell.element}
                        {spell.tags.length > 0 && ` · ${spell.tags.join(', ')}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="slip px-1.5 py-0.5 text-center leading-none">
                        <span className="block text-2xs uppercase tracking-wider text-ink-600">
                          Spd
                        </span>
                        <span className="block font-display font-bold text-sm text-ink-900 tabular-nums">
                          {spell.speed}
                        </span>
                      </span>
                      <span className="slip px-1.5 py-0.5 text-center leading-none">
                        <span className="block text-2xs uppercase tracking-wider text-ink-600">
                          Foc
                        </span>
                        <span className="block font-display font-bold text-sm text-ink-900 tabular-nums">
                          {spell.focusCost}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="my-1.5 border-t border-ink-700/25" />

                  {/* Inked entries */}
                  <div className="space-y-1">
                    <CardEntry label="Cast" text={spell.cast} tone="el" />
                    <CardEntry label="Maneuver" text={spell.maneuver} />
                    {spell.empower && <CardEntry label="Empower" text={spell.empower} tone="brass" />}
                    {spell.overcharge && (
                      <CardEntry label="Overcharge" text={spell.overcharge} tone="ox" />
                    )}
                  </div>

                  {/* Footer strip: burn icon + prepared stamp */}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    {spell.burnIcon ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border-2 border-ember-deep bg-ember-wash text-ember-deep">
                        <Glyph name="flame" className="w-3.5 h-3.5" />
                        <span className="inked-label">Burn</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    {inDeck ? (
                      <span className="seal-brass px-2 py-1 rounded-md text-2xs uppercase tracking-wider flex items-center gap-1">
                        <Glyph name="check" className="w-3 h-3" />
                        Prepared ×{count}
                      </span>
                    ) : (
                      <span className="text-2xs italic text-ink-500">not prepared</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- Bound deck manifest -------------------------------------------- */}
        <div className="page px-3 py-2.5">
          <h3 className="chapter text-2xs mb-1.5">Currently Bound</h3>
          <div className="text-2xs italic text-ink-600 mb-1.5">
            {player.preparedDeck.length} cards sewn into the grimoire
          </div>
          <div className="flex flex-wrap gap-1">
            {player.preparedDeck.map((spellId, i) => {
              const spell = getSpell(spellId);
              return (
                <span
                  key={`${spellId}-${i}`}
                  className={`${elementInk(spell?.element ?? 'earth')} slip px-1.5 py-1 text-2xs capitalize text-ink-800 flex items-center gap-1`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-seal"
                    style={{ backgroundColor: 'var(--el)' }}
                  />
                  {spell?.name ?? spellId}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
