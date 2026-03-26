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
      className={`flex items-center gap-2 rounded-md border p-2 transition-all ${
        disabled
          ? 'cursor-not-allowed border-[#3d2b1f]/30 bg-[#1e1608] opacity-40'
          : 'cursor-grab border-[var(--border-wood)]/40 bg-[#2a1f0e] hover:border-[var(--gold)]/60 hover:bg-[#3a2f1e] active:cursor-grabbing'
      }`}
    >
      <img src={item.asset} alt={item.label} className="h-8 w-8 object-contain pixel-art" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--text-light)]">{item.label}</p>
        <p className="flex items-center gap-1 text-[10px] text-[var(--gold)]/70">
          <Coins className="h-3 w-3" /> {item.cost} FP
        </p>
      </div>
    </div>
  );
}

function LockedShopItem({ item }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#3d2b1f]/20 bg-[#1e1608] p-2 opacity-30">
      <div className="relative h-8 w-8">
        <img src={item.asset} alt="" className="h-full w-full object-contain pixel-art grayscale" />
        <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 text-[#8b7355]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#8b7355]">{item.label}</p>
        <p className="text-[10px] text-[#8b7355]">Level {item.requiredLevel}</p>
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
    buyItem(shopItemId);
  }

  return (
    <aside className="flex h-full flex-col">
      {/* Header: Level + XP */}
      <div className="mb-3 rounded-lg border border-[var(--border-wood)]/40 bg-[#2a1f0e] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-[var(--gold)]" />
            <span className="font-medieval text-sm font-bold text-[var(--text-gold)]">Level {level}</span>
          </div>
          <span className="text-xs text-[#8b7355]">{xp} XP</span>
        </div>
        <div className="rpg-progress">
          <div className="rpg-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        {nextLevelXP && (
          <p className="mt-1 text-right text-[10px] text-[#8b7355]">
            Sonraki level: {nextLevelXP} XP
          </p>
        )}
      </div>

      {/* FP Balance */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--border-wood)]/40 bg-[#2a1f0e] px-3 py-2">
        <Coins className="h-4 w-4 text-[var(--gold)]" />
        <span className="font-medieval text-sm font-semibold text-[var(--text-gold)]">{financialPoints} FP</span>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto">
        <p className="font-medieval mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gold)]/60">Mağaza</p>

        {[...groupedUnlocked.entries()].map(([type, items]) => (
          <div key={type} className="mb-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
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
                    className="rpg-btn-sm shrink-0"
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
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8b7355]/60">
              Kilitli
            </p>
            <div className="grid gap-1.5">
              {lockedItems.slice(0, 6).map((item) => (
                <LockedShopItem key={item.id} item={item} />
              ))}
              {lockedItems.length > 6 && (
                <p className="text-center text-[10px] text-[#8b7355]">
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
