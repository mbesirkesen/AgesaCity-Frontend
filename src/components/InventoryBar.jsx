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
      className="flex h-12 w-12 shrink-0 cursor-grab items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 active:cursor-grabbing"
      title={item.label}
    >
      <img src={item.asset} alt={item.label} className="h-9 w-9 object-contain pixel-art" />
    </div>
  );
}

export default function InventoryBar() {
  const { inventory } = useGame();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Package className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">
          Envanter ({inventory.length})
        </span>
        {inventory.length > 0 && (
          <span className="text-xs text-slate-400">Sürükleyip haritaya bırak</span>
        )}
      </div>

      {inventory.length === 0 ? (
        <p className="py-2 text-center text-xs text-slate-400">
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
