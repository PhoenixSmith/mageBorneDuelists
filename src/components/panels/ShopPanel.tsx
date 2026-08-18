import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getMarket } from '../../game/engine/world';
import { ITEM_MAP, ITEM_CATALOG } from '../../data/markets';
import type { MarketItem } from '../../types';
import { Glyph, Seal, type GlyphName, type SealTone } from '../Sigils';

const CATEGORY_META: Record<
  string,
  { label: string; glyph: GlyphName; tone: SealTone; text: string }
> = {
  reagent: { label: 'Reagents', glyph: 'gem', tone: 'moss', text: 'text-moss-deep' },
  consumable: { label: 'Consumables', glyph: 'flask', tone: 'tide', text: 'text-tide-deep' },
  scroll: { label: 'Spell Scrolls', glyph: 'scroll', tone: 'ox', text: 'text-oxblood-800' },
};

function ShopRow({
  item,
  buyPrice,
  sellPrice,
  supply,
  playerStock,
  onBuy,
  onSell,
}: {
  item: MarketItem;
  buyPrice: number;
  sellPrice: number;
  supply: number;
  playerStock: number;
  onBuy: (qty: number) => void;
  onSell: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const meta = CATEGORY_META[item.category];

  return (
    <div className="ledger-row px-2.5 py-2">
      <div className="flex items-start gap-2">
        <Seal glyph={meta?.glyph ?? 'gem'} tone={meta?.tone ?? 'ink'} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-sm text-ink-900 leading-tight">
            {item.name}
          </div>
          <div className="text-2xs italic text-ink-600 leading-snug">{item.description}</div>
        </div>
        <div className="shrink-0 text-right text-2xs text-ink-700 leading-tight">
          <div>
            <span className="text-ink-600">Stall </span>
            <span className="font-display font-bold text-ink-900 tabular-nums">{supply}</span>
          </div>
          <div>
            <span className="text-ink-600">Yours </span>
            <span className="font-display font-bold text-ink-900 tabular-nums">{playerStock}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <input
          type="number"
          min={1}
          max={99}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
          aria-label={`Quantity of ${item.name}`}
          className="w-12 h-11 px-1 rounded-md border-2 border-ink-700 bg-parchment-50 text-center
                     font-display font-bold text-sm text-ink-900 tabular-nums"
          style={{ boxShadow: 'inset 0 2px 3px rgba(90,70,52,0.28)' }}
        />
        <button
          onClick={() => onBuy(qty)}
          disabled={supply < qty}
          className="btn btn-brass flex-1 px-2 text-2xs"
        >
          Buy
          <span className="font-display font-bold tabular-nums">{buyPrice * qty}</span>
          <Glyph name="coin" className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSell(qty)}
          disabled={playerStock < qty}
          className="btn btn-quiet flex-1 px-2 text-2xs"
        >
          Sell
          <span className="font-display font-bold tabular-nums">{sellPrice * qty}</span>
          <Glyph name="coin" className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ShopPanel() {
  const world = useGameStore((s) => s.world);
  const shop = useGameStore((s) => s.shop);

  const playerHex = world.hexes[world.playerHexId];
  const settlementId = playerHex?.settlementId;
  const settlement = settlementId ? world.settlements[settlementId] : undefined;

  // Only show if at a settlement with market service
  const hasMarket = settlement?.services.includes('market') ?? false;

  if (!settlement || !hasMarket) {
    return (
      <div className="panel-scroll flex flex-col items-center justify-center p-6">
        <div className="page px-6 py-7 text-center max-w-sm">
          <Seal glyph="scales" tone="brass" size="lg" className="mx-auto mb-3" />
          <h2 className="title-display text-xl">Market Closed</h2>
          <div className="rule-ornate my-2" />
          <p className="marginalia text-sm leading-snug">
            No stalls stand here. Travel to a town or city with a market to buy and sell goods.
          </p>
        </div>
      </div>
    );
  }

  // Get the market (initialize if needed)
  const market = getMarket(world, settlement.id);
  if (!market) {
    return (
      <div className="panel-scroll flex items-center justify-center p-6">
        <div className="page px-5 py-4 marginalia text-sm">Market unavailable.</div>
      </div>
    );
  }

  // Group items by category
  const categories: Record<string, MarketItem[]> = {
    reagent: [],
    consumable: [],
    scroll: [],
  };

  for (const itemId of Object.keys(market.supplies)) {
    const item = ITEM_MAP[itemId];
    if (item) {
      categories[item.category].push(item);
    }
  }

  const player = world.player;

  return (
    <div className="panel-scroll">
      <div className="p-3 space-y-3">
        {/* --- Ledger head ---------------------------------------------------- */}
        <div className="page px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="title-display text-xl leading-tight truncate">{settlement.name}</h2>
              <div className="text-2xs uppercase tracking-[0.16em] text-ink-600">
                Merchant's Ledger
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="slip flex items-center gap-1 pl-1 pr-2 py-1">
                <Seal glyph="coin" tone="brass" size="xs" />
                <span className="font-display font-bold text-sm text-ink-900 tabular-nums">
                  {player.coin}
                </span>
              </span>
              <span className="slip flex items-center gap-1 pl-1 pr-2 py-1">
                <Seal glyph="gem" tone="tide" size="xs" />
                <span className="font-display font-bold text-sm text-ink-900 tabular-nums">
                  {Object.values(player.reagents).reduce((a, b) => a + b, 0)}
                </span>
              </span>
            </div>
          </div>

          {/* Satchel */}
          {Object.keys(player.reagents).length > 0 && (
            <>
              <div className="rule-ornate my-1.5" />
              <h3 className="chapter text-2xs mb-1.5">Your Satchel</h3>
              <div className="flex flex-wrap gap-1">
                {Object.entries(player.reagents).map(([id, count]) => {
                  const item = ITEM_MAP[id];
                  return (
                    <span
                      key={id}
                      className="slip px-1.5 py-1 text-2xs text-ink-800 flex items-center gap-1"
                    >
                      {item?.name ?? id}
                      <span className="seal-blank w-5 h-4 rounded text-2xs font-display font-bold tabular-nums">
                        {count}
                      </span>
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* --- Stalls ---------------------------------------------------------- */}
        {(['reagent', 'consumable', 'scroll'] as const).map((cat) => {
          const items = categories[cat];
          if (items.length === 0) return null;
          const meta = CATEGORY_META[cat];

          return (
            <div key={cat}>
              <h3 className="chapter text-2xs mb-2">{meta.label}</h3>
              <div className="page overflow-hidden py-0 px-0">
                {items.map((item) => {
                  const supply = market.supplies[item.id] ?? 0;
                  const buyPrice = market.prices[item.id] ?? item.basePrice;
                  const sellPrice = Math.max(1, Math.round(buyPrice * 0.8));
                  const playerStock = player.reagents[item.id] ?? 0;

                  return (
                    <ShopRow
                      key={item.id}
                      item={item}
                      buyPrice={buyPrice}
                      sellPrice={sellPrice}
                      supply={supply}
                      playerStock={playerStock}
                      onBuy={(qty) => shop('buy', item.id, qty)}
                      onSell={(qty) => shop('sell', item.id, qty)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* --- Appendix --------------------------------------------------------- */}
        <details className="plaque-aged px-3 py-2">
          <summary className="chapter text-2xs cursor-pointer select-none list-none">
            Appendix · Full Item Catalog
          </summary>
          <div className="mt-2 space-y-1">
            {ITEM_CATALOG.map((item) => (
              <div key={item.id} className="text-2xs text-ink-700 leading-snug">
                <span className="font-display font-bold text-ink-900">{item.name}</span>
                <span className="text-ink-600"> · {item.basePrice} coin base · </span>
                <span className="italic">{item.description}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
