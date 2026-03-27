const BASE = '/assets/rpg-urban-pack/kenney-city/PNG/Retina';
const pad2 = (id) => String(id).padStart(2, '0');
const structure = (id) => `${BASE}/Structure/medievalStructure_${pad2(id)}.png`;
const customStructure = (name) => `${BASE}/Structure/${name}`;
const environment = (id) => `${BASE}/Environment/medievalEnvironment_${pad2(id)}.png`;
const unit = (id) => `${BASE}/Unit/medievalUnit_${pad2(id)}.png`;

export const MAX_STACK = 4;

export const LEVEL_THRESHOLDS = [0, 200, 500, 900, 1400];

export function getLevelFromXP(xp) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

export function getXPForNextLevel(xp) {
  const level = getLevelFromXP(xp);
  if (level >= LEVEL_THRESHOLDS.length) return null;
  return LEVEL_THRESHOLDS[level];
}

export const SHOP_ITEMS = [
  // Level 1 — Evler & Çevre
  { id: 'house_1', type: 'house', label: 'Küçük Ev', cost: 90, requiredLevel: 1, asset: structure(1) },
  { id: 'house_2', type: 'house', label: 'Taş Ev', cost: 110, requiredLevel: 1, asset: customStructure('tas_ev.png') },
  { id: 'house_3', type: 'house', label: 'Çiftlik Evi', cost: 100, requiredLevel: 1, asset: structure(3) },
  { id: 'house_4', type: 'house', label: 'Köy Evi', cost: 80, requiredLevel: 1, asset: structure(4) },
  { id: 'house_5', type: 'house', label: 'Kule Ev', cost: 130, requiredLevel: 1, asset: structure(5) },
  { id: 'house_6', type: 'house', label: 'Büyük Ev', cost: 140, requiredLevel: 1, asset: structure(6) },
  { id: 'tree_1', type: 'environment', label: 'Çam Ağacı', cost: 20, requiredLevel: 1, asset: environment(1), reusable: true },
  { id: 'tree_2', type: 'environment', label: 'Meşe Ağacı', cost: 20, requiredLevel: 1, asset: environment(2), reusable: true },
  { id: 'tree_3', type: 'environment', label: 'Küçük Ağaç', cost: 15, requiredLevel: 1, asset: environment(3), reusable: true },
  { id: 'rock_1', type: 'environment', label: 'Kaya', cost: 12, requiredLevel: 1, asset: environment(6), reusable: true },
  { id: 'rock_2', type: 'environment', label: 'Taş Yığını', cost: 12, requiredLevel: 1, asset: environment(7), reusable: true },

  // Level 2 — Dükkanlar & İnsancıklar
  { id: 'shop_1', type: 'shop', label: 'Dükkan', cost: 160, requiredLevel: 2, asset: customStructure('dukkan.png') },
  { id: 'shop_2', type: 'shop', label: 'Bakkal', cost: 170, requiredLevel: 2, asset: customStructure('bakkal.png') },
  { id: 'shop_3', type: 'shop', label: 'Atölye', cost: 180, requiredLevel: 2, asset: structure(9) },
  { id: 'shop_4', type: 'shop', label: 'Pazar', cost: 190, requiredLevel: 2, asset: customStructure('pazar.png') },
  { id: 'unit_1', type: 'unit', label: 'Köylü', cost: 35, requiredLevel: 2, asset: unit(1), reusable: true },
  { id: 'unit_2', type: 'unit', label: 'Tüccar', cost: 45, requiredLevel: 2, asset: unit(5), reusable: true },
  { id: 'unit_3', type: 'unit', label: 'Şövalye', cost: 55, requiredLevel: 2, asset: unit(2), reusable: true },
  { id: 'unit_4', type: 'unit', label: 'Okçu', cost: 55, requiredLevel: 2, asset: unit(8), reusable: true },

  // Level 3 — Bankalar & Orta Binalar
  { id: 'bank_1', type: 'bank', label: 'Banka', cost: 280, requiredLevel: 3, asset: customStructure('banka.png') },
  { id: 'bank_2', type: 'bank', label: 'Hazine', cost: 340, requiredLevel: 3, asset: customStructure('hazine.png') },
  { id: 'bank_3', type: 'bank', label: 'Kasaba Bankası', cost: 300, requiredLevel: 3, asset: customStructure('kasaba_banka.png') },
  { id: 'midrise_1', type: 'midrise', label: 'Apartman', cost: 380, requiredLevel: 3, asset: customStructure('apartman.png') },
  { id: 'midrise_2', type: 'midrise', label: 'İş Hanı', cost: 420, requiredLevel: 3, asset: customStructure('is_hani.png') },
  { id: 'midrise_3', type: 'midrise', label: 'Konak', cost: 400, requiredLevel: 3, asset: structure(16) },

  // Level 4 — AVM & Kütüphane
  { id: 'mall_1', type: 'mall', label: 'AVM', cost: 700, requiredLevel: 4, asset: customStructure('avm_smaller.png') },
  { id: 'mall_2', type: 'mall', label: 'Büyük AVM', cost: 820, requiredLevel: 4, asset: customStructure('avm.png') },
  { id: 'library_1', type: 'library', label: 'Kütüphane', cost: 520, requiredLevel: 4, asset: customStructure('kutuphane.png') },
  { id: 'library_2', type: 'library', label: 'Akademi', cost: 620, requiredLevel: 4, asset: customStructure('akademi.png') },

  // Level 5 — Gökdelenler & Golden Tower
  { id: 'skyscraper_1', type: 'skyscraper', label: 'Gökdelen', cost: 950, requiredLevel: 5, asset: customStructure('gokdelen.png') },
  { id: 'skyscraper_2', type: 'skyscraper', label: 'Kule', cost: 1050, requiredLevel: 5, asset: customStructure('kule.png') },
  { id: 'skyscraper_3', type: 'skyscraper', label: 'Plaza', cost: 1150, requiredLevel: 5, asset: structure(20) },
  { id: 'golden_tower', type: 'tower', label: 'Golden AgeSA Tower', cost: 1800, requiredLevel: 5, asset: structure(21) },
];

export function getUnlockedItems(level) {
  return SHOP_ITEMS.filter((item) => item.requiredLevel <= level);
}

export function getLockedItems(level) {
  return SHOP_ITEMS.filter((item) => item.requiredLevel > level);
}
