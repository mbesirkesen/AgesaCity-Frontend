import { motion } from 'framer-motion';
import { getBuildingAssetByCell, pickBuildingVariant } from '../config/rpgAssetMap';

const BASE_BY_TYPE = {
  'green-house': { shell: 'bg-emerald-500', edge: 'border-emerald-800', windows: 'bg-emerald-100' },
  'neon-shop': { shell: 'bg-fuchsia-500', edge: 'border-fuchsia-800', windows: 'bg-pink-100' },
  library: { shell: 'bg-blue-500', edge: 'border-blue-800', windows: 'bg-sky-100' },
  'generic-building': { shell: 'bg-slate-500', edge: 'border-slate-800', windows: 'bg-slate-100' },
};

export default function Building({
  building,
  index,
  cityLevel = 1,
  disasterActive = false,
  row = 0,
  col = 0,
  tileSize = 32,
}) {
  if (!building) return null;
  const palette = BASE_BY_TYPE[building.buildingType] || BASE_BY_TYPE['generic-building'];
  const variant = pickBuildingVariant(building, cityLevel, index);
  const spriteSrc = getBuildingAssetByCell(variant, row, col, index);
  const delay = Math.min(index * 0.08, 0.8);
  const isDamagedWant = disasterActive && building.isWant;

  const base = Math.max(12, Math.round(tileSize * 0.55));
  return (
    <div className="city-building relative h-full w-full">
      <motion.div
        layout
        initial={{ y: -220, opacity: 0, scale: 0.6 }}
        animate={
          isDamagedWant
            ? { y: 0, opacity: 0, scale: 0.2, filter: 'grayscale(1)' }
            : { y: 0, opacity: 1, scale: 1, filter: 'grayscale(0)' }
        }
        exit={{ y: 20, opacity: 0, scale: 0.7 }}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 16,
          mass: 0.9,
          delay,
        }}
        className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-sm border-b-4 ${palette.shell} ${palette.edge} shadow-lg`}
        title={`${building.category} - ${building.amount.toLocaleString('tr-TR')} TL`}
        style={{
          width: variant === 'skyscraper' ? Math.round(base * 1.05) : variant === 'mall' ? Math.round(base * 1.15) : base,
          height:
            variant === 'skyscraper'
              ? Math.round(base * 1.9)
              : variant === 'bank'
                ? Math.round(base * 1.25)
                : variant === 'midrise'
                  ? Math.round(base * 1.5)
                  : variant === 'mall'
                    ? Math.round(base * 1.2)
                    : base,
        }}
      >
        <img
          src={spriteSrc}
          alt={variant}
          className="h-full w-full rounded-[2px] object-contain pixel-art"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      </motion.div>

      {variant === 'bank' ? (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded bg-white/85 px-1 text-[7px] font-bold text-slate-700" style={{ bottom: Math.round(base * 0.45) }}>
          BANK
        </div>
      ) : null}

      {variant === 'house' ? (
        <div
          className="pointer-events-none absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-transparent border-b-rose-500"
          style={{
            bottom: Math.round(base * 0.35),
            borderLeftWidth: Math.round(base * 0.3),
            borderRightWidth: Math.round(base * 0.3),
            borderBottomWidth: Math.round(base * 0.3),
          }}
        />
      ) : null}

      {isDamagedWant ? (
        <motion.div
          initial={{ opacity: 0.5, scale: 0.2 }}
          animate={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: delay + 0.1 }}
          className="pointer-events-none absolute h-10 w-10 rounded-full bg-slate-500/50 blur-sm"
        />
      ) : null}
    </div>
  );
}
