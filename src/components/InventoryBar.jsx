import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Package } from 'lucide-react';
import { useGame } from '../context/GameContext';

function DraggableInventoryItem({ item }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `inv-${item.instanceId}`,
    data: { source: 'inventory', instanceId: item.instanceId, item },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="relative flex h-12 w-12 shrink-0 cursor-grab items-center justify-center rounded-md border border-[var(--border-wood)]/40 bg-[#2a1f0e] shadow-sm transition-all hover:border-[var(--gold)]/60 hover:bg-[#3a2f1e] active:cursor-grabbing"
      title={item.label}
    >
      <img src={item.asset} alt={item.label} className="h-9 w-9 object-contain pixel-art" />
      {item.reusable && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[9px] font-bold text-[#1a1207]">
          ∞
        </span>
      )}
    </div>
  );
}

export default function InventoryBar() {
  const { inventory } = useGame();

  return (
    <div className="rpg-panel-dark p-3">
      <div className="mb-2 flex items-center gap-2">
        <Package className="h-4 w-4 text-[var(--gold)]" />
        <span className="font-medieval text-sm font-semibold text-[var(--text-gold)]">
          Envanter ({inventory.length})
        </span>
        {inventory.length > 0 && (
          <span className="text-xs text-[#8b7355]">Sürükleyip haritaya bırak</span>
        )}
      </div>

      {inventory.length === 0 ? (
        <p className="py-2 text-center text-xs text-[#8b7355]">
          Mağazadan öğe satın al, burada görünecek.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {inventory.map((item) => (
            <DraggableInventoryItem key={item.instanceId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
