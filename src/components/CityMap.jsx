import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { getGoldenTowerAsset, getReferenceTileAsset, getTileForCell } from '../config/rpgAssetMap';
import { MAX_STACK } from '../config/shopItems';
import { useGame } from '../context/GameContext';

export const GRID_COLS = 24;
export const GRID_ROWS = 12;
const MAX_CELLS = GRID_COLS * GRID_ROWS;

const ROAD_ROWS = new Set([3, 8]);
const ROAD_COLS = new Set([5, 11, 17, 23]);

export function isRoadCell(row, col) {
  return ROAD_ROWS.has(row) || ROAD_COLS.has(col);
}

const ROAD_CELLS = new Set(
  Array.from({ length: MAX_CELLS }, (_, i) => i).filter((i) => {
    const row = Math.floor(i / GRID_COLS);
    const col = i % GRID_COLS;
    return isRoadCell(row, col);
  }),
);

// --- Droppable tile wrapper ---

function DroppableTile({ row, col, tileSize, isRoad, placedItem, children }) {
  const cellKey = `${row}_${col}`;
  const canDrop = !isRoad && (!placedItem || (placedItem.reusable && (placedItem.stackCount || 1) < MAX_STACK));
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${cellKey}`,
    data: { row, col, canDrop },
    disabled: !canDrop,
  });

  const hasUp = row > 0 && isRoadCell(row - 1, col);
    const hasDown = row < GRID_ROWS - 1 && isRoadCell(row + 1, col);
    const hasLeft = col > 0 && isRoadCell(row, col - 1);
    const hasRight = col < GRID_COLS - 1 && isRoadCell(row, col + 1);

  const tileData = getTileForCell({ row, col, isRoad, hasUp, hasDown, hasLeft, hasRight });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex items-end justify-center overflow-hidden rounded-[6px] border ${
        isRoad
          ? 'border-slate-600 bg-slate-700'
          : 'border-emerald-200 bg-gradient-to-b from-emerald-100 to-emerald-200'
      } ${isOver && canDrop ? 'ring-2 ring-emerald-400' : ''} ${isOver && !canDrop ? 'ring-2 ring-rose-400' : ''}`}
      style={{ height: `${tileSize}px` }}
    >
      <img
        src={tileData.src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-95 pixel-art"
        style={tileData.flipX ? { transform: 'scaleX(-1)' } : undefined}
      />
      {children}
    </div>
  );
}

// --- Placed item on map ---

const STACK_LAYOUTS = {
  1: [{ left: '50%', bottom: '0%', scale: 0.85 }],
  2: [
    { left: '30%', bottom: '0%', scale: 0.58 },
    { left: '70%', bottom: '0%', scale: 0.58 },
  ],
  3: [
    { left: '50%', bottom: '38%', scale: 0.48 },
    { left: '26%', bottom: '0%', scale: 0.48 },
    { left: '74%', bottom: '0%', scale: 0.48 },
  ],
  4: [
    { left: '30%', bottom: '38%', scale: 0.44 },
    { left: '70%', bottom: '38%', scale: 0.44 },
    { left: '30%', bottom: '0%', scale: 0.44 },
    { left: '70%', bottom: '0%', scale: 0.44 },
  ],
};

function PlacedBuilding({ item, tileSize, onRemove }) {
  const count = item.stackCount || 1;
  const isStacked = item.reusable && count > 1;
  const positions = STACK_LAYOUTS[count] || STACK_LAYOUTS[1];

  return (
    <motion.div
      initial={{ y: -120, opacity: 0, scale: 0.5 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 20, opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 16 }}
      className="group absolute inset-0 z-10"
    >
      {positions.map((pos, i) => (
        <img
          key={i}
          src={item.asset}
          alt={item.label}
          className="absolute object-contain pixel-art drop-shadow-md"
          style={{
            width: tileSize * pos.scale,
            height: tileSize * pos.scale,
            left: pos.left,
            bottom: pos.bottom,
            transform: 'translateX(-50%)',
          }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ))}

      {isStacked && (
        <span className="absolute left-0 top-0 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white shadow">
          {count}
        </span>
      )}

      <button
        onClick={onRemove}
        className="absolute -right-1 -top-1 z-20 hidden h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow group-hover:flex"
        title="Kaldır"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </motion.div>
  );
}

// --- Main CityMap ---

export default function CityMap({ disasterActive = false, disasterPulse = 0 }) {
  const { placedItems, removeItem } = useGame();
  const shouldShake = disasterActive && disasterPulse > 0;
  const towerSrc = getGoldenTowerAsset();
  const [tileSize, setTileSize] = useState(28);
  const gridRef = useRef(null);

  useEffect(() => {
    const target = gridRef.current;
    if (!target) return undefined;
    const gap = 3;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry.contentRect.width;
      const computed = Math.floor((width - gap * (GRID_COLS - 1)) / GRID_COLS);
      setTileSize(Math.max(14, computed));
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const cells = Array.from({ length: MAX_CELLS }, (_, index) => {
    const row = Math.floor(index / GRID_COLS);
    const col = index % GRID_COLS;
    return { index, row, col };
  });

  return (
    <motion.section
      animate={shouldShake ? { x: [0, -12, 10, -8, 6, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-900">City Map</h2>
        <p className="text-sm text-slate-600">
          Envanterden sürükleyip boş parsellere bırak.
        </p>
      </div>

      <div
        ref={gridRef}
        className={`grid gap-[3px] rounded-xl bg-gradient-to-b p-2 ${
          disasterActive ? 'from-zinc-200 to-zinc-300' : 'from-slate-100 to-slate-200'
        }`}
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, ${tileSize}px)` }}
      >
        <img
          src={getReferenceTileAsset()}
          alt=""
          className="hidden"
          onLoad={(e) => {
            const w = e.currentTarget.naturalWidth || 32;
            setTileSize(Math.max(20, Math.min(42, Math.round(w * 0.35))));
          }}
        />

        {cells.map(({ index, row, col }) => {
          const isRoad = ROAD_CELLS.has(index);
          const cellKey = `${row}_${col}`;
          const placedItem = placedItems.get(cellKey);
          return (
            <DroppableTile
              key={`tile-${index}`}
              row={row}
              col={col}
              tileSize={tileSize}
              isRoad={isRoad}
              placedItem={placedItem}
            >
              <AnimatePresence mode="popLayout">
                {placedItem ? (
                  <PlacedBuilding
                    key={placedItem.instanceId}
                    item={placedItem}
                    tileSize={tileSize}
                    onRemove={() => removeItem(row, col)}
                  />
                ) : null}
              </AnimatePresence>
            </DroppableTile>
          );
        })}
      </div>
    </motion.section>
  );
}
