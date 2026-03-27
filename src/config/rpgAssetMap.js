const BASE = '/assets/rpg-urban-pack/kenney-city/PNG/Retina';
const pad2 = (id) => String(id).padStart(2, '0');
const tile = (id) => `${BASE}/Tile/medievalTile_${pad2(id)}.png`;
const structure = (id) => `${BASE}/Structure/medievalStructure_${pad2(id)}.png`;
const environment = (id) => `${BASE}/Environment/medievalEnvironment_${pad2(id)}.png`;
const unit = (id) => `${BASE}/Unit/medievalUnit_${pad2(id)}.png`;

// Tile klasoru: sadece zemin/yol varyasyonlari
const TILE_POOLS = {
  grass: [57, 58].map(tile),
};

// Yol tile'lari: komsuluk bagina gore dogru parca secilir
// U=up  D=down  L=left  R=right  (1=bagli, 0=degil)
// Deger: string (src) veya {src, flipX:true} aynalama gereken tile icin
const ROAD_TILE_MAP = {
  // 4 yönlü
  '1111': tile(5),  // ┼  kavşak (cross)
  // 3 yönlü (T kesişim)
  '0111': tile(6),  // ┬  T: D+L+R (üstü kapalı)
  '1011': tile(7),  // ┴  T: U+L+R (altı kapalı)
  '1101': tile(31),  // ├  T: U+D+R (sol kapalı)
  '1110': { src: tile(31), flipX: true },  // ┤  T: U+D+L (sağ kapalı) — tile(31) aynalama
  // 2 yönlü karşılıklı (düz)
  '0011': tile(4),  // ─  yatay düz
  '1100': tile(3),  // │  dikey düz
  // 2 yönlü komşu (köşe)
  '0101': tile(21),  // ┌  köşe: D+R
  '0110': tile(18),  // ┐  köşe: D+L
  '1001': tile(20),  // └  köşe: U+R
  '1010': tile(32),  // ┘  köşe: U+L
  // 1 yönlü (yol bitirme / dead-end)
  '0100': tile(35),  // ╷  üstte bitiş, yol aşağı devam
  '1000': tile(34),  // ╵  altta bitiş, yol yukarı devam
  '0001': tile(33),  // ╶  solda bitiş, yol sağa devam
  '0010': tile(19),  // ╴  sağda bitiş, yol sola devam
  // 0 yönlü (izole)
  '0000': tile(5),  // ●  tek başına
};

// Structure klasoru: ev/bina tipleri
const BUILDING_ASSETS = {
  house: [structure(1), structure(2), structure(3), structure(4), structure(5), structure(6)],
  shop: [structure(7), structure(8), structure(9), structure(10)],
  bank: [structure(11), structure(12), structure(13)],
  midrise: [structure(14), structure(15), structure(16), structure(17)],
  skyscraper: [structure(18), structure(19), structure(20), structure(21)],
  library: [structure(22), structure(23)],
  mall: [structure(9), structure(10), structure(15), structure(16)],
  tower: [structure(21)],
};

// Environment klasoru: ileride agac/obje placement icin hazir
export const ENVIRONMENT_DECORATION_ASSETS = {
  trees: [environment(1), environment(2), environment(3), environment(4), environment(5)],
  rocks: [environment(6), environment(7), environment(8)],
  misc: [environment(9), environment(10), environment(11), environment(12)],
};

function hash(n1, n2 = 0, n3 = 0) {
  return Math.abs((n1 * 92821 + n2 * 68917 + n3 * 31337) % 100000);
}

function pickFromPool(pool, seed) {
  if (!pool.length) return tile(1);
  return pool[seed % pool.length];
}

export function getReferenceTileAsset() {
  return tile(1);
}

export function getTileForCell({ row, col, isRoad, hasUp, hasDown, hasLeft, hasRight }) {
  const seed = hash(row, col);

  if (isRoad) {
    const key = `${hasUp ? 1 : 0}${hasDown ? 1 : 0}${hasLeft ? 1 : 0}${hasRight ? 1 : 0}`;
    const entry = ROAD_TILE_MAP[key] || tile(4);
    if (typeof entry === 'object') return entry;
    return { src: entry, flipX: false };
  }

  const src = pickFromPool(TILE_POOLS.grass, seed);
  return { src, flipX: false };
}

export function pickBuildingVariant(building, cityLevel, index) {
  const type = building?.buildingType;
  if (cityLevel >= 3) return type === 'neon-shop' ? 'mall' : 'skyscraper';
  if (cityLevel === 2) return index % 3 === 0 ? 'bank' : 'midrise';
  if (type === 'library') return 'library';
  return type === 'green-house' ? 'house' : 'shop';
}

export function getBuildingAsset(variant) {
  const pool = BUILDING_ASSETS[variant] || BUILDING_ASSETS.house;
  return pickFromPool(pool, hash(variant.length, pool.length));
}

export function getBuildingAssetByCell(variant, row, col, index) {
  const pool = BUILDING_ASSETS[variant] || BUILDING_ASSETS.house;
  return pickFromPool(pool, hash(row, col, index));
}

export function getGoldenTowerAsset() {
  return BUILDING_ASSETS.tower[0];
}

// Unit (insanciklar): 24 karakter, bos parsellere serpilir
const UNIT_POOL = Array.from({ length: 24 }, (_, i) => unit(i + 1));

export function getUnitForCell(row, col) {
  const seed = hash(row, col, 7);
  if (seed % 5 !== 0) return null;
  return pickFromPool(UNIT_POOL, seed);
}
