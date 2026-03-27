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
      className={`relative flex items-end justify-center overflow-hidden rounded-[3px] ${
        isOver && canDrop ? 'ring-2 ring-[var(--gold)]' : ''
      } ${isOver && !canDrop ? 'ring-2 ring-[var(--accent-red)]' : ''}`}
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
        <span className="absolute left-0 top-0 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[8px] font-bold text-[#1a1207] shadow">
          {count}
        </span>
      )}

      <button
        onClick={onRemove}
        className="absolute -right-1 -top-1 z-20 hidden h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-red)] text-white shadow group-hover:flex"
        title="Kaldır"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </motion.div>
  );
}

export default function CityMap({ disasterActive = false, disasterPulse = 0 }) {
  const { placedItems, removeItem, dashboard } = useGame();
  const shouldShake = disasterActive && disasterPulse > 0;
  const towerSrc = getGoldenTowerAsset();
  const [tileSize, setTileSize] = useState(28);
  const gridRef = useRef(null);
  const layer1 = dashboard?.layer_1_city_ground;
  const layer2 = dashboard?.layer_2_learning;
  const layer3 = dashboard?.layer_3_green;

  const skyMood = layer1?.sky_mood;
  const greenScore = Number(layer3?.green_score ?? 0);

  // Green score'a göre arka plan rengini hesapla
  // 0 → gri/kahve, 100 → yoğun yeşil
  const getGreenifiedBackground = (score) => {
    const ratio = Math.min(100, Math.max(0, score)) / 100;
    
    // Base colors (score = 0): grey/brown
    const baseTop = { r: 26, g: 20, b: 20 };
    const baseBot = { r: 25, g: 17, b: 17 };
    
    // Target colors (score = 100): deep green
    const greenTop = { r: 20, g: 48, b: 20 };
    const greenBot = { r: 13, g: 35, b: 13 };
    
    // İnterpolasyon
    const topR = Math.round(baseTop.r + (greenTop.r - baseTop.r) * ratio);
    const topG = Math.round(baseTop.g + (greenTop.g - baseTop.g) * ratio);
    const topB = Math.round(baseTop.b + (greenTop.b - baseTop.b) * ratio);
    
    const botR = Math.round(baseBot.r + (greenBot.r - baseBot.r) * ratio);
    const botG = Math.round(baseBot.g + (greenBot.g - baseBot.g) * ratio);
    const botB = Math.round(baseBot.b + (greenBot.b - baseBot.b) * ratio);
    
    return `linear-gradient(180deg, rgb(${topR}, ${topG}, ${topB}), rgb(${botR}, ${botG}, ${botB}))`;
  };

  const baseBackground = skyMood === 'sunny'
    ? getGreenifiedBackground(greenScore)
    : skyMood === 'cloudy'
      ? `linear-gradient(180deg, rgb(${43 + greenScore * 0.12}, ${50 + greenScore * 0.1}, ${42 + greenScore * 0.12}), rgb(${26 + greenScore * 0.08}, ${34 + greenScore * 0.08}, ${24 + greenScore * 0.1}))`
      : `linear-gradient(180deg, rgb(${42 + greenScore * 0.1}, ${31 + greenScore * 0.08}, ${31 + greenScore * 0.08}), rgb(${25 + greenScore * 0.05}, ${17 + greenScore * 0.05}, ${17 + greenScore * 0.05}))`;

  const autoBoostActive =
    Number(layer1?.road_quality ?? 0) >= 75
    || Number(layer2?.education_score ?? 0) >= 70
    || Number(layer3?.green_score ?? 0) >= 85;

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
      className="rpg-panel-dark overflow-hidden p-4"
    >
      <div className="mb-3">
        <h2 className="font-medieval text-lg font-semibold text-[var(--text-gold)]">City Map</h2>
        <p className="text-sm text-[var(--text-light)] opacity-50">
          Envanterden sürükleyip boş parsellere bırak.
        </p>
        {(layer1 || layer2 || layer3) && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
            {layer1 && (
              <span className="rounded border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-2 py-0.5 text-[var(--gold)]">
                Yol {Number(layer1.road_quality ?? 0).toFixed(1)}/100
              </span>
            )}
            {layer2 && (
              <span className="rounded border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-sky-300">
                Egitim {Number(layer2.education_score ?? 0).toFixed(1)}/100
              </span>
            )}
            {layer3 && (
              <span className="rounded border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                Yesil {Number(layer3.green_score ?? 0).toFixed(1)}/100
              </span>
            )}
            {autoBoostActive && (
              <span className="rounded border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 text-violet-200">
                Analiz iyi: otomatik bonus aktif
              </span>
            )}
          </div>
        )}
      </div>

      <div
        ref={gridRef}
        className="relative grid gap-[3px] rounded-lg p-2"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, ${tileSize}px)`,
          background: disasterActive
            ? 'linear-gradient(180deg, #2a1a1a, #1e1010)'
            : baseBackground,
        }}
      >
        {/* Sky mood atmosphere overlay */}
        {skyMood === 'cloudy' && (
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-slate-700/40 to-slate-600/20" />
        )}
        {skyMood === 'grey' && (
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-slate-800/50 to-slate-700/40" />
        )}
        {skyMood === 'sunny' && (
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-yellow-600/10 to-transparent" />
        )}
        
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
