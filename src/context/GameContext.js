import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadGameData, fetchCityStatus, loginUser,
  earnXPApi, earnFPApi, spendFPApi,
  buyInventoryApi, placeCityItemApi, removeCityItemApi, buyAndPlaceCityApi,
  runSimulationApi, triggerDisasterApi, submitQuizApi, fetchDashboard,
} from '../services/gameDataService';
import { getLevelFromXP, getXPForNextLevel, MAX_STACK, SHOP_ITEMS } from '../config/shopItems';
import { isRoadCell } from '../components/CityMap';

const GameContext = createContext(null);

const STORAGE_KEY = 'agesa_city_state';

const BUILDING_TYPE_MAP = [
  { key: 'needs', matches: ['market', 'ulasim', 'ula\u015fim', 'ihtiyac'], buildingType: 'green-house' },
  { key: 'wants', matches: ['eglence', 'e\u011flence', 'yeme', 'icme', 'i\u00e7me'], buildingType: 'neon-shop' },
  { key: 'education', matches: ['education', 'quiz', 'egitim', 'e\u011fitim'], buildingType: 'library' },
];

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function parseNumeric(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const sanitized = String(value).replace(',', '.').replace(/[^0-9.-]/g, '');
  const numeric = Number.parseFloat(sanitized);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function mapCategoryToBuildingType(categoryValue) {
  const normalizedCategory = normalizeText(categoryValue);
  const matched = BUILDING_TYPE_MAP.find((item) =>
    item.matches.some((keyword) => normalizedCategory.includes(keyword)),
  );
  return matched?.buildingType ?? 'generic-building';
}

function resolveUserIncome(user) {
  const directIncome = parseNumeric(user?.monthly_income || user?.income || user?.salary, NaN);
  if (Number.isFinite(directIncome) && directIncome > 0) return directIncome;
  const incomeLevel = normalizeText(user?.income_level);
  const fallbackByLevel = { low: 30000, medium: 50000, high: 80000 };
  return fallbackByLevel[incomeLevel] ?? 40000;
}

function resolveHealthScore(user) {
  return parseNumeric(user?.financial_health_score, 0);
}

function calculateCityState({ selectedUser, spendings, scenarios, backendCityStatus }) {
  const income = resolveUserIncome(selectedUser);
  const healthScore = resolveHealthScore(selectedUser);
  const selectedUserId = selectedUser?.user_id;

  const projectedSavings = scenarios.reduce((accumulator, row) => {
    const contributionRate = parseNumeric(row?.contribution_rate, 0.1);
    const annualReturnRaw = parseNumeric(row?.annual_return_avg, 12);
    const annualReturn = annualReturnRaw > 1 ? annualReturnRaw / 100 : annualReturnRaw;
    const years = parseNumeric(row?.years || row?.period_years, 10);
    const yearlyContribution = income * 12 * contributionRate;
    const fv = yearlyContribution * Math.pow(1 + annualReturn, years);
    return accumulator + fv;
  }, 0);

  const userSpendings = spendings.filter((spending) => {
    if (!selectedUserId) return true;
    return spending?.user_id === selectedUserId;
  });

  const categorySummaryMap = userSpendings.reduce((accumulator, spending) => {
    const category = spending?.category || spending?.spending_category || 'Diger';
    const prev = accumulator.get(category) || { totalAmount: 0, count: 0 };
    prev.totalAmount += parseNumeric(spending?.amount || spending?.monthly_amount);
    prev.count += 1;
    accumulator.set(category, prev);
    return accumulator;
  }, new Map());

  const buildingList = [...categorySummaryMap.entries()]
    .map(([category, summary], index) => ({
      id: `building-${index + 1}`,
      category,
      amount: summary.totalAmount,
      count: summary.count,
      buildingType: mapCategoryToBuildingType(category),
      isWant: normalizeText(category).includes('eglence') || normalizeText(category).includes('yeme'),
    }))
    .filter((building) => building.category)
    .sort((a, b) => b.amount - a.amount);

  const ground = backendCityStatus?.output_layer1_city_ground;

  return {
    totalSavings: Math.round(projectedSavings),
    healthScore,
    buildingList,
    roadQualityIndex: ground?.road_quality ?? ground?.road_quality_index ?? 50,
    skyStatus: ground?.sky_mood ?? ground?.sky_status ?? 'Acik',
    totalSpending: ground?.total_spending ?? 0,
    keyfiRatio: ground?.keyfi_ratio ?? 0,
    junkShopCount: ground?.junk_shop_count ?? 0,
  };
}

// --- localStorage helpers (fallback cache) ---

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded — ignore */ }
}

function fireAndForget(promise) {
  promise.catch((err) => console.warn('[Backend sync]', err.message));
}

// --- Provider ---

export function GameProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [spendings, setSpendings] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [learningContents, setLearningContents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizOptions, setQuizOptions] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [backendCityStatus, setBackendCityStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // City builder state — backend is source of truth, localStorage is only a cache
  const [xp, setXP] = useState(0);
  const [financialPoints, setFinancialPoints] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [placedItems, setPlacedItems] = useState(() => new Map());
  const autoCityBoostRef = useRef(new Set());
  const unlockedBuildingsRef = useRef([]);  // Track education unlocked buildings
  const unlockedPlantsRef = useRef([]);     // Track green unlocked plants

  const level = useMemo(() => getLevelFromXP(xp), [xp]);
  const nextLevelXP = useMemo(() => getXPForNextLevel(xp), [xp]);

  // Persist as local cache
  useEffect(() => {
    persistState({
      xp,
      financialPoints,
      inventory,
      placedItems: Object.fromEntries(placedItems),
    });
  }, [xp, financialPoints, inventory, placedItems]);

  // Clear stale localStorage on fresh start
  useEffect(() => { localStorage.removeItem(STORAGE_KEY); }, []);

  // --- Backend data loading ---
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const gameData = await loadGameData();
        if (!mounted) return;
        const usersData = gameData?.users ?? [];
        setUsers(usersData);
        setSpendings(gameData?.spendings ?? []);
        setScenarios(gameData?.scenarios ?? []);
        setLearningContents(gameData?.learningContents ?? gameData?.learning_contents ?? []);
        setQuizzes(gameData?.quizzes ?? []);
        setQuizOptions(gameData?.quizOptions ?? gameData?.quiz_options ?? []);
        const personasData = gameData?.personas ?? [];
        setPersonas(personasData.length > 0 ? personasData : usersData);
        // selectedUserId login ekranından set edilecek, burada otomatik atama yok
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Backend verisi yuklenemedi.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === selectedUserId) ?? users[0] ?? null,
    [users, selectedUserId],
  );

  // Login & sync state from backend when user changes
  useEffect(() => {
    if (!selectedUserId) return;
    let cancelled = false;

    loginUser(selectedUserId)
      .then((data) => {
        if (cancelled) return;
        const backendXP = data?.xp?.total_xp;
        const backendFP = data?.financial_points?.financial_points_balance;
        if (typeof backendXP === 'number') setXP(backendXP);
        if (typeof backendFP === 'number') setFinancialPoints(backendFP);
        if (data?.dashboard) setDashboard(data.dashboard);

        const backendCity = data?.city?.placed_items;
        if (Array.isArray(backendCity)) {
          const cityMap = new Map();
          for (const item of backendCity) {
            const key = `${item.row}_${item.col}`;
            const shopItem = SHOP_ITEMS.find((s) => s.id === item.item_id);
            cityMap.set(key, {
              ...(shopItem || {}),
              id: item.item_id,
              label: item.item_name || shopItem?.label || item.item_id,
              asset: shopItem?.asset || '',
              instanceId: item.placement_id || `${item.item_id}_${Date.now()}`,
              row: item.row,
              col: item.col,
              stackCount: 1,
            });
          }
          setPlacedItems(cityMap);
        }
        setInventory([]);
      })
      .catch(() => {
        const fallback = loadSavedState();
        if (fallback) {
          setXP(fallback.xp ?? 0);
          setFinancialPoints(fallback.financialPoints ?? 500);
          setInventory(fallback.inventory ?? []);
          setPlacedItems(new Map(Object.entries(fallback.placedItems ?? {})));
        }
      });

    fetchCityStatus(selectedUserId)
      .then((data) => { if (!cancelled) setBackendCityStatus(data); })
      .catch(() => { if (!cancelled) setBackendCityStatus(null); });

    return () => { cancelled = true; };
  }, [selectedUserId]);

  const cityState = useMemo(
    () => calculateCityState({ selectedUser, spendings, scenarios, backendCityStatus }),
    [selectedUser, spendings, scenarios, backendCityStatus],
  );

  // --- City builder actions (optimistic UI + backend sync) ---

  const earnXP = useCallback((amount, reason) => {
    setXP((prev) => prev + amount);
    if (selectedUserId) {
      fireAndForget(earnXPApi(selectedUserId, amount, reason));
    }
  }, [selectedUserId]);

  const earnFinancialPoints = useCallback((amount, reason) => {
    setFinancialPoints((prev) => prev + amount);
    if (selectedUserId) {
      fireAndForget(earnFPApi(selectedUserId, amount, reason));
    }
  }, [selectedUserId]);

  const spendFinancialPoints = useCallback((amount, itemName, reason) => {
    setFinancialPoints((prev) => Math.max(0, prev - amount));
    if (selectedUserId) {
      fireAndForget(spendFPApi(selectedUserId, amount, itemName, reason));
    }
  }, [selectedUserId]);

  const buyItem = useCallback((shopItemId) => {
    const shopItem = SHOP_ITEMS.find((s) => s.id === shopItemId);
    if (!shopItem) return false;
    if (shopItem.requiredLevel > getLevelFromXP(xp)) return false;
    if (shopItem.cost > financialPoints) return false;

    const instanceId = `${shopItem.id}_${Date.now()}`;
    setFinancialPoints((prev) => prev - shopItem.cost);
    setInventory((prev) => {
      if (shopItem.reusable && prev.some((i) => i.id === shopItem.id)) return prev;
      return [...prev, { ...shopItem, instanceId }];
    });

    if (selectedUserId) {
      fireAndForget(buyInventoryApi(selectedUserId, shopItem.id, shopItem.label, shopItem.cost));
    }
    return true;
  }, [xp, financialPoints, selectedUserId]);

  const placeItem = useCallback((instanceId, row, col) => {
    const key = `${row}_${col}`;
    setInventory((prev) => {
      const idx = prev.findIndex((item) => item.instanceId === instanceId);
      if (idx === -1) return prev;
      const item = prev[idx];

      let didPlace = false;
      setPlacedItems((prevMap) => {
        const existing = prevMap.get(key);
        const next = new Map(prevMap);
        if (existing) {
          if (!existing.reusable || !item.reusable || existing.id !== item.id || (existing.stackCount || 1) >= MAX_STACK) return prevMap;
          next.set(key, { ...existing, stackCount: (existing.stackCount || 1) + 1 });
        } else {
          next.set(key, { ...item, instanceId: `${item.id}_${Date.now()}`, row, col, stackCount: 1 });
        }
        didPlace = true;
        return next;
      });

      if (!didPlace) return prev;

      if (selectedUserId) {
        fireAndForget(placeCityItemApi(selectedUserId, row, col, item.id, item.label));
      }

      if (item.reusable) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }, [selectedUserId]);

  const removeItem = useCallback((row, col) => {
    const key = `${row}_${col}`;
    setPlacedItems((prevMap) => {
      const item = prevMap.get(key);
      if (!item) return prevMap;
      const next = new Map(prevMap);
      if (item.reusable && (item.stackCount || 1) > 1) {
        next.set(key, { ...item, stackCount: item.stackCount - 1 });
      } else {
        if (!item.reusable) {
          setInventory((prev) => [...prev, item]);
        }
        next.delete(key);
      }

      if (selectedUserId) {
        fireAndForget(removeCityItemApi(selectedUserId, row, col));
      }

      return next;
    });
  }, [selectedUserId]);

  const buyAndPlace = useCallback((shopItemId, row, col) => {
    const shopItem = SHOP_ITEMS.find((s) => s.id === shopItemId);
    if (!shopItem) return false;
    if (shopItem.requiredLevel > getLevelFromXP(xp)) return false;
    if (shopItem.cost > financialPoints) return false;
    if (isRoadCell(row, col)) return false;  // Yola yapı konamaz

    const key = `${row}_${col}`;
    let placed = false;

    setPlacedItems((prevMap) => {
      const existing = prevMap.get(key);
      const next = new Map(prevMap);

      if (existing) {
        if (!existing.reusable || !shopItem.reusable || existing.id !== shopItem.id || (existing.stackCount || 1) >= MAX_STACK) return prevMap;
        next.set(key, { ...existing, stackCount: (existing.stackCount || 1) + 1 });
      } else {
        const instanceId = `${shopItem.id}_${Date.now()}`;
        next.set(key, { ...shopItem, instanceId, row, col, stackCount: 1 });
      }
      placed = true;
      return next;
    });

    if (!placed) return false;

    setFinancialPoints((prev) => prev - shopItem.cost);
    if (shopItem.reusable) {
      setInventory((prev) => {
        if (prev.some((i) => i.id === shopItem.id)) return prev;
        const invInstanceId = `${shopItem.id}_inv_${Date.now()}`;
        return [...prev, { ...shopItem, instanceId: invInstanceId }];
      });
    }

    if (selectedUserId) {
      fireAndForget(buyAndPlaceCityApi(selectedUserId, shopItem.id, shopItem.label, shopItem.cost, row, col));
    }
    return true;
  }, [xp, financialPoints, selectedUserId]);

  // Sehir Analizi iyi oldugunda City Map'e otomatik bonus yapilar ekle (kullanici basina bir kez)
  useEffect(() => {
    if (!selectedUserId || !dashboard) return;

    const layer1 = dashboard?.layer_1_city_ground ?? {};
    const layer2 = dashboard?.layer_2_learning ?? {};
    const layer3 = dashboard?.layer_3_green ?? {};
    const layer4 = dashboard?.layer_4_bes ?? {};

    const existingItemIds = new Set(Array.from(placedItems.values()).map((item) => item.id));
    const autoRules = [
      {
        key: 'road_quality_good',
        pass: Number(layer1.road_quality ?? 0) >= 75,
        itemId: 'tree_1',
        cells: [[1, 1], [1, 2], [2, 1]],
      },
      {
        key: 'education_good',
        pass: Number(layer2.education_score ?? 0) >= 70,
        itemId: 'library_1',
        cells: [[1, 3], [2, 3], [2, 4]],
      },
      {
        key: 'green_good',
        pass: Number(layer3.green_score ?? 0) >= 85,
        itemId: 'tree_2',
        cells: [[1, 4], [2, 2], [2, 6]],
      },
      {
        key: 'bes_good',
        pass: Number(layer4.projected_fund_tl ?? 0) >= 25000000,
        itemId: 'bank_1',
        cells: [[1, 7], [2, 7], [2, 8]],
      },
    ];

    for (const rule of autoRules) {
      const marker = `${selectedUserId}:${rule.key}`;
      if (!rule.pass || autoCityBoostRef.current.has(marker)) continue;

      if (existingItemIds.has(rule.itemId)) {
        autoCityBoostRef.current.add(marker);
        continue;
      }

      const targetCell = rule.cells.find(([row, col]) => !placedItems.has(`${row}_${col}`));
      if (!targetCell) continue;

      const [row, col] = targetCell;
      const placed = buyAndPlace(rule.itemId, row, col);
      if (placed) {
        autoCityBoostRef.current.add(marker);
        break;
      }
    }
  }, [selectedUserId, dashboard, placedItems, buyAndPlace]);

  // Eğitim ilerlemesine göre yeni açılan binalar otomatik haritaya yerleştiril
  useEffect(() => {
    if (!selectedUserId || !dashboard?.layer_2_learning) return;

    const currentUnlocked = dashboard.layer_2_learning.unlocked_buildings || [];
    const previousUnlocked = unlockedBuildingsRef.current || [];

    // Yeni açılan binalar bul
    const newlyUnlocked = currentUnlocked.filter((itemId) => !previousUnlocked.includes(itemId));

    // Ref'i güncelle
    unlockedBuildingsRef.current = [...currentUnlocked];

    // Yeni binalar varsa haritaya yerleştir
    if (newlyUnlocked.length === 0) return;

    // Boş hücreler bul
    const emptyCells = [];
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 24; col++) {
        if (!placedItems.has(`${row}_${col}`)) {
          emptyCells.push([row, col]);
        }
      }
    }

    if (emptyCells.length === 0) return;

    // Yeni binalar için boş hücreler seç ve yerleştir
    for (const itemId of newlyUnlocked) {
      if (emptyCells.length === 0) break;

      // Rastgele boş hücre seç
      const index = Math.floor(Math.random() * emptyCells.length);
      const [row, col] = emptyCells[index];
      emptyCells.splice(index, 1);

      // Haritaya yerleştir
      buyAndPlace(itemId, row, col);
    }
  }, [selectedUserId, dashboard?.layer_2_learning?.unlocked_buildings, placedItems, buyAndPlace]);

  // Yeşil alan skoru arttıkça otomatik ağaçlandırma
  useEffect(() => {
    if (!selectedUserId || !dashboard?.layer_3_green) return;

    const currentUnlockedPlants = dashboard.layer_3_green.unlocked_plants || [];
    const previousUnlockedPlants = unlockedPlantsRef.current || [];

    // Yeni açılan ağaçlar bul
    const newlyUnlockedPlants = currentUnlockedPlants.filter((itemId) => !previousUnlockedPlants.includes(itemId));

    // Ref'i güncelle
    unlockedPlantsRef.current = [...currentUnlockedPlants];

    // Yeni ağaçlar varsa haritaya yerleştir
    if (newlyUnlockedPlants.length === 0) return;

    // Boş hücreler bul
    const emptyCells = [];
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 24; col++) {
        if (!placedItems.has(`${row}_${col}`)) {
          emptyCells.push([row, col]);
        }
      }
    }

    if (emptyCells.length === 0) return;

    // Yeni ağaçlar için boş hücreler seç ve yerleştir
    for (const itemId of newlyUnlockedPlants) {
      if (emptyCells.length === 0) break;

      // Rastgele boş hücre seç
      const index = Math.floor(Math.random() * emptyCells.length);
      const [row, col] = emptyCells[index];
      emptyCells.splice(index, 1);

      // Haritaya yerleştir
      buyAndPlace(itemId, row, col);
    }
  }, [selectedUserId, dashboard?.layer_3_green?.unlocked_plants, placedItems, buyAndPlace]);

  // --- Quiz submit ---

  const submitQuiz = useCallback(async (questionId, selectedOptionId) => {
    if (!selectedUserId) return null;
    try {
      const result = await submitQuizApi(selectedUserId, questionId, selectedOptionId);
      const data = result?.data;
      if (data) {
        if (data.xp_earned > 0) setXP((prev) => prev + data.xp_earned);
        if (data.fp_earned > 0) setFinancialPoints((prev) => prev + data.fp_earned);
      }
      return data;
    } catch {
      return null;
    }
  }, [selectedUserId]);

  // --- Simulation ---

  const runSimulation = useCallback(async () => {
    if (!selectedUserId) return null;
    try {
      const result = await runSimulationApi(selectedUserId);
      const data = result?.data;
      if (data) {
        if (data.xp_earned > 0) setXP((prev) => prev + data.xp_earned);
        if (data.fp_earned > 0) setFinancialPoints((prev) => prev + data.fp_earned);
        // Dashboard'ı güncelle
        setTimeout(refreshDashboard, 300);
      }
      return data;
    } catch (err) {
      return { error: err.message };
    }
  }, [selectedUserId, refreshDashboard]);

  // --- Disaster ---

  const triggerDisaster = useCallback(async (severity = 2) => {
    if (!selectedUserId) return null;
    try {
      const result = await triggerDisasterApi(selectedUserId, severity);
      const data = result?.data;
      if (data?.fp_penalty_applied) {
        setFinancialPoints((prev) => Math.max(0, prev - data.fp_penalty_applied));
      }
      const removed = data?.city_damage?.removed_items;
      if (Array.isArray(removed) && removed.length > 0) {
        setPlacedItems((prevMap) => {
          const next = new Map(prevMap);
          for (const item of removed) {
            next.delete(`${item.row}_${item.col}`);
          }
          return next;
        });
      }
      // Dashboard'ı güncelle
      setTimeout(refreshDashboard, 300);
      return data;
    } catch {
      setFinancialPoints((prev) => Math.max(0, prev - 100));
      return null;
    }
  }, [selectedUserId, refreshDashboard]);

  // --- Refresh dashboard ---

  const refreshDashboard = useCallback(() => {
    if (!selectedUserId) return;
    fireAndForget(
      fetchDashboard(selectedUserId).then((d) => setDashboard(d)),
    );
  }, [selectedUserId]);

  const resetCityState = useCallback(() => {
    setXP(0);
    setFinancialPoints(500);
    setInventory([]);
    setPlacedItems(new Map());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      isLoading, error,
      users, spendings, scenarios, learningContents,
      quizzes, quizOptions,
      personas,
      selectedUserId, selectedUser, setSelectedUserId,
      cityState, backendCityStatus, dashboard,
      xp, level, nextLevelXP,
      financialPoints,
      inventory, placedItems,
      earnXP, earnFinancialPoints, spendFinancialPoints,
      buyItem, buyAndPlace, placeItem, removeItem, resetCityState,
      submitQuiz, runSimulation, triggerDisaster, refreshDashboard,
    }),
    [
      isLoading, error,
      users, spendings, scenarios, learningContents,
      quizzes, quizOptions,
      personas,
      selectedUserId, selectedUser, cityState, backendCityStatus, dashboard,
      xp, level, nextLevelXP,
      financialPoints,
      inventory, placedItems,
      earnXP, earnFinancialPoints, spendFinancialPoints,
      buyItem, buyAndPlace, placeItem, removeItem, resetCityState,
      submitQuiz, runSimulation, triggerDisaster, refreshDashboard,
    ],
  );

  return createElement(GameContext.Provider, { value }, children);
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
