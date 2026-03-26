import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Lock, Star, Coins } from 'lucide-react';
import { SHOP_ITEMS, LEVEL_THRESHOLDS } from '../config/shopItems';
import { useGame } from '../context/GameContext';

function DraggableShopItem({ item, disabled }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shop-${item.id}`,
    data: { source: 'shop', shopItemId: item.id },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-50'
          : 'cursor-grab border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 active:cursor-grabbing'
      }`}
    >
      <img src={item.asset} alt={item.label} className="h-8 w-8 object-contain pixel-art" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-800">{item.label}</p>
        <p className="flex items-center gap-1 text-[10px] text-slate-500">
          <Coins className="h-3 w-3" /> {item.cost} FP
        </p>
      </div>
    </div>
  );
}

function LockedShopItem({ item }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 opacity-40">
      <div className="relative h-8 w-8">
        <img src={item.asset} alt="" className="h-full w-full object-contain pixel-art grayscale" />
        <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-400">{item.label}</p>
        <p className="text-[10px] text-slate-400">Level {item.requiredLevel}</p>
      </div>
    </div>
  );
}

export default function ShopPanel() {
  const { level, xp, nextLevelXP, financialPoints, buyItem } = useGame();

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextLevelXP ? nextLevelXP - currentThreshold : 1;
  const progressPct = nextLevelXP ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;

  const unlockedItems = SHOP_ITEMS.filter((i) => i.requiredLevel <= level);
  const lockedItems = SHOP_ITEMS.filter((i) => i.requiredLevel > level);

  const groupedUnlocked = unlockedItems.reduce((acc, item) => {
    const group = acc.get(item.type) ?? [];
    group.push(item);
    acc.set(item.type, group);
    return acc;
  }, new Map());

  const TYPE_LABELS = {
    house: 'Evler', shop: 'Dükkanlar', bank: 'Bankalar', midrise: 'Orta Binalar',
    skyscraper: 'Gökdelenler', library: 'Kütüphaneler', mall: 'AVM',
    tower: 'Özel', environment: 'Çevre', unit: 'Karakterler',
  };

  function handleBuy(shopItemId) {
    const ok = buyItem(shopItemId);
    if (!ok) return;
  }

  return (
    <aside className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header: Level + XP */}
      <div className="border-b border-slate-100 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-slate-900">Level {level}</span>
          </div>
          <span className="text-xs text-slate-500">{xp} XP</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {nextLevelXP && (
          <p className="mt-1 text-right text-[10px] text-slate-400">
            Sonraki level: {nextLevelXP} XP
          </p>
        )}
      </div>

      {/* FP Balance */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <Coins className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-slate-800">{financialPoints} FP</span>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Mağaza</p>

        {[...groupedUnlocked.entries()].map(([type, items]) => (
          <div key={type} className="mb-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500">
              {TYPE_LABELS[type] || type}
            </p>
            <div className="grid gap-1.5">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-1">
                  <div className="flex-1">
                    <DraggableShopItem
                      item={item}
                      disabled={item.cost > financialPoints}
                    />
                  </div>
                  <button
                    onClick={() => handleBuy(item.id)}
                    disabled={item.cost > financialPoints}
                    className="shrink-0 rounded-md bg-emerald-600 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    title="Satın Al"
                  >
                    Al
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {lockedItems.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kilitli
            </p>
            <div className="grid gap-1.5">
              {lockedItems.slice(0, 6).map((item) => (
                <LockedShopItem key={item.id} item={item} />
              ))}
              {lockedItems.length > 6 && (
                <p className="text-center text-[10px] text-slate-400">
                  +{lockedItems.length - 6} daha...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
