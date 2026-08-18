import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getMarket } from '../../game/engine/world';
import { ITEM_MAP, ITEM_CATALOG } from '../../data/markets';
import type { MarketItem } from '../../types';

const CATEGORY_LABELS: Record<string, string> = {
  reagent: 'Reagents',
  consumable: 'Consumables',
  scroll: 'Spell Scrolls',
};

const CATEGORY_COLORS: Record<string, string> = {
  reagent: 'text-green-400',
  consumable: 'text-blue-400',
  scroll: 'text-purple-400',
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

  return (
    <div className="flex items-center gap-2 p-2 rounded border border-slate-700 bg-slate-800">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{item.name}</span>
          <span className={`text-[10px] ${CATEGORY_COLORS[item.category] ?? 'text-slate-400'}`}>
            {CATEGORY_LABELS[item.category] ?? item.category}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 truncate">{item.description}</div>
        <div className="text-[10px] text-slate-600 flex gap-3 mt-0.5">
          <span>Supply: {supply}</span>
          <span>You have: {playerStock}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={99}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
          className="w-12 px-1 py-0.5 text-xs bg-slate-900 border border-slate-600 rounded text-center text-slate-200"
        />
      </div>

      <div className="flex flex-col gap-1">
        <button
          onClick={() => onBuy(qty)}
          disabled={supply < qty}
          className="px-2 py-0.5 text-[10px] bg-green-700 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded font-bold"
        >
          Buy {buyPrice * qty}🪙
        </button>
        <button
          onClick={() => onSell(qty)}
          disabled={playerStock < qty}
          className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded font-bold"
        >
          Sell {sellPrice * qty}🪙
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
      <div className="p-4 text-slate-200 overflow-y-auto h-full flex flex-col items-center justify-center">
        <h2 className="text-lg font-bold text-amber-400 mb-2">Market</h2>
        <p className="text-slate-400 text-sm text-center">
          You must be at a settlement with a market to trade.
          <br />
          Travel to a town or city to buy and sell goods.
        </p>
      </div>
    );
  }

  // Get the market (initialize if needed)
  const market = getMarket(world, settlement.id);
  if (!market) {
    return (
      <div className="p-4 text-slate-200">
        <p className="text-slate-400 text-sm">Market unavailable.</p>
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
    <div className="p-4 text-slate-200 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-amber-400">{settlement.name} Market</h2>
        <div className="flex gap-3 text-sm">
          <span className="text-amber-400 font-bold">🪙 {player.coin}</span>
          <span className="text-blue-400">
            💎 {Object.values(player.reagents).reduce((a, b) => a + b, 0)}
          </span>
        </div>
      </div>

      {/* Player reagents inventory */}
      {Object.keys(player.reagents).length > 0 && (
        <div className="mb-3 p-2 rounded border border-slate-700 bg-slate-800/50">
          <div className="text-xs text-slate-400 font-semibold mb-1">Your Reagents:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(player.reagents).map(([id, count]) => {
              const item = ITEM_MAP[id];
              return (
                <span key={id} className="text-xs text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded">
                  {item?.name ?? id}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Market items by category */}
      {(['reagent', 'consumable', 'scroll'] as const).map((cat) => {
        const items = categories[cat];
        if (items.length === 0) return null;

        return (
          <div key={cat} className="mb-4">
            <h3 className={`text-sm font-semibold mb-2 ${CATEGORY_COLORS[cat]}`}>
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="space-y-1">
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

      {/* Full catalog reference */}
      <details className="mt-4">
        <summary className="text-xs text-slate-500 cursor-pointer">Full Item Catalog</summary>
        <div className="mt-2 space-y-1">
          {ITEM_CATALOG.map((item) => (
            <div key={item.id} className="text-[10px] text-slate-500">
              <span className="font-medium">{item.name}</span> — {item.basePrice}🪙 base — {item.description}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
