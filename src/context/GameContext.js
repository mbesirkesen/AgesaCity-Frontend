import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadGameData, fetchCityStatus, loginUser,
  earnXPApi, earnFPApi, spendFPApi,
  buyInventoryApi, placeCityItemApi, removeCityItemApi, buyAndPlaceCityApi,
  runSimulationApi, triggerDisasterApi, submitQuizApi, fetchDashboard,
} from '../services/gameDataService';
import { getLevelFromXP, getXPForNextLevel, MAX_STACK, SHOP_ITEMS } from '../config/shopItems';

const GameContext = createContext(null);

const STORAGE_KEY = 'agesa_city_state';
const MAX_XP_VALUE = 50000;
const MAX_FP_VALUE = 10000;

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

function isRoadCellForAutoPlace(row, col) {
  // CityMap.jsx ile aynı yol deseni
  return row === 3 || row === 8 || col === 5 || col === 11 || col === 17 || col === 23;
}

function buildAutoPlacementCells(limit) {
  // Deterministic: her zaman aynı hücrelere yerleştir (yol olmayan parsellere)
  const cells = [];
  for (let row = 1; row <= 10; row += 3) {
    for (let col = 1; col <= 22; col += 4) {
      if (cells.length >= limit) return cells;
      if (!isRoadCellForAutoPlace(row, col)) cells.push({ row, col });
    }
  }
  // fallback: kalan boşluklar
  for (let row = 0; row < 12 && cells.length < limit; row += 1) {
    for (let col = 0; col < 24 && cells.length < limit; col += 1) {
      if (!isRoadCellForAutoPlace(row, col)) cells.push({ row, col });
    }
  }
  return cells;
}

function extractUnlockedIdsFromDashboard(dashboard) {
  const l2 =
    dashboard?.output_layer2_education_progress ??
    dashboard?.layer_2_learning ??
    dashboard?.layer_2 ??
    dashboard?.layer2 ??
    dashboard?.layer_2_learning;
  const l3 =
    dashboard?.output_layer3_green ??
    dashboard?.layer_3_green ??
    dashboard?.layer_3 ??
    dashboard?.layer3 ??
    dashboard?.layer_3_green;
  const unlockedBuildings = Array.isArray(l2?.unlocked_buildings) ? l2.unlocked_buildings : [];
  const unlockedPlants = Array.isArray(l3?.unlocked_plants) ? l3.unlocked_plants : [];
  // backend ID’leri (SHOP_ITEMS id) bekleniyor
  return [...unlockedBuildings, ...unlockedPlants].filter(Boolean);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function sanitizeXP(value) {
  return clamp(Math.round(parseNumeric(value, 0)), 0, MAX_XP_VALUE);
}

function sanitizeFP(value) {
  return clamp(Math.round(parseNumeric(value, 0)), 0, MAX_FP_VALUE);
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

function markLocalBalanceChanged(ref) {
  ref.current = Date.now();
}

// --- Provider ---

export function GameProvider({ children }) {
  const initialSavedStateRef = useRef(loadSavedState());
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
  const [xp, setXP] = useState(() => sanitizeXP(initialSavedStateRef.current?.xp));
  const [financialPoints, setFinancialPoints] = useState(() => sanitizeFP(initialSavedStateRef.current?.financialPoints));
  const [inventory, setInventory] = useState(() => (
    Array.isArray(initialSavedStateRef.current?.inventory) ? initialSavedStateRef.current.inventory : []
  ));
  const [placedItems, setPlacedItems] = useState(() => new Map());
  const autoPlaceDoneRef = useRef(new Set());
  const lastLocalBalanceChangeAtRef = useRef(0);
  const latestXPRef = useRef(sanitizeXP(initialSavedStateRef.current?.xp));
  const latestFPRef = useRef(sanitizeFP(initialSavedStateRef.current?.financialPoints));

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

  useEffect(() => {
    latestXPRef.current = sanitizeXP(xp);
  }, [xp]);

  useEffect(() => {
    latestFPRef.current = sanitizeFP(financialPoints);
  }, [financialPoints]);

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

  const refreshFromBackend = useCallback(async (opts = { includeStatic: false }) => {
    // includeStatic=true ise users/spendings/scenarios/content gibi listeleri de yeniler
    if (!selectedUserId) return;
    const includeStatic = Boolean(opts?.includeStatic);

    if (includeStatic) {
      try {
        const gameData = await loadGameData();
        const usersData = gameData?.users ?? [];
        setUsers(usersData);
        setSpendings(gameData?.spendings ?? []);
        setScenarios(gameData?.scenarios ?? []);
        setLearningContents(gameData?.learningContents ?? gameData?.learning_contents ?? []);
        setQuizzes(gameData?.quizzes ?? []);
        setQuizOptions(gameData?.quizOptions ?? gameData?.quiz_options ?? []);
        const personasData = gameData?.personas ?? [];
        setPersonas(personasData.length > 0 ? personasData : usersData);
      } catch (err) {
        console.warn('[Backend refresh] static reload failed:', err.message);
      }
    }

    fireAndForget(fetchDashboard(selectedUserId).then((d) => setDashboard(d)));
    fireAndForget(fetchCityStatus(selectedUserId).then((d) => setBackendCityStatus(d)));
  }, [selectedUserId]);

  const applyInvestmentRewards = useCallback(async ({ principal = 0, futureValue = 0 } = {}) => {
    if (!selectedUserId) return;
    const p = Number(principal) || 0;
    const fv = Number(futureValue) || 0;
    if (p <= 0 || fv <= p) return;

    // Getiri büyüdükçe daha “gösterişli” ödül
    const gain = fv - p;
    const gainPct = gain / p; // 0.25 => %25
    const rewardCount = clamp(Math.floor(gainPct * 4) + 1, 1, 6);

    const rewardIds = [
      'tree_2',
      'shop_1',
      'bank_1',
      'library_1',
      'mall_1',
      'skyscraper_1',
      'golden_tower',
    ];

    const candidates = rewardIds
      .map((id) => SHOP_ITEMS.find((s) => s.id === id))
      .filter(Boolean);

    if (candidates.length === 0) return;

    const cells = buildAutoPlacementCells(60);
    const placements = [];
    for (const cell of cells) {
      if (placements.length >= rewardCount) break;
      const key = `${cell.row}_${cell.col}`;
      if (placedItems.has(key)) continue;
      const shopItem = candidates[placements.length % candidates.length];
      placements.push({ ...cell, shopItem });
    }

    if (placements.length === 0) return;

    setPlacedItems((prevMap) => {
      const next = new Map(prevMap);
      placements.forEach(({ row, col, shopItem }, idx) => {
        next.set(`${row}_${col}`, {
          ...shopItem,
          instanceId: `${shopItem.id}_invest_${idx}_${Date.now()}`,
          row,
          col,
          stackCount: 1,
        });
      });
      return next;
    });

    // Backend, envanterde item yoksa place’i reddediyor ve "bedava ödül" için 0 FP buy’a izin vermiyor.
    // Bu yüzden yatırım ödüllerini şimdilik UI tarafında gösteriyoruz (backend source-of-truth bozulmasın diye sync yok).

    // dashboard/city-status yenilensin
    await refreshFromBackend({ includeStatic: false });
  }, [selectedUserId, placedItems, refreshFromBackend]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.user_id === selectedUserId) ?? null;
  }, [users, selectedUserId]);

  // Login & sync state from backend when user changes
  useEffect(() => {
    if (!selectedUserId) return;
    let cancelled = false;

    const loginRequestStartedAt = Date.now();
    loginUser(selectedUserId)
      .then((data) => {
        if (cancelled) return;
        const hasNewerLocalBalanceChange = lastLocalBalanceChangeAtRef.current > loginRequestStartedAt;
        const backendXP = parseNumeric(data?.xp?.total_xp, NaN);
        const backendFP = parseNumeric(data?.financial_points?.financial_points_balance, NaN);
        const backendHasProgress =
          (Number.isFinite(backendXP) && backendXP > 0) ||
          (Number.isFinite(backendFP) && backendFP > 0);
        const localHasProgress =
          (latestXPRef.current > 0) ||
          (latestFPRef.current > 0);
        const shouldAcceptBackendZeroState = !localHasProgress;

        if (!hasNewerLocalBalanceChange) {
          // Backend geçici olarak 0 dönerse mevcut ilerlemeyi ezme.
          if (backendHasProgress || shouldAcceptBackendZeroState) {
            if (Number.isFinite(backendXP)) setXP(sanitizeXP(backendXP));
            if (Number.isFinite(backendFP)) setFinancialPoints(sanitizeFP(backendFP));
          }
        }
        if (data?.dashboard) setDashboard(data.dashboard);

        const backendCity = data?.city?.placed_items;
        if (Array.isArray(backendCity) && backendCity.length > 0) {
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
        } else {
          // Backend city boşsa: backend dashboard’daki “açılan” item’lardan otomatik yerleşim üret
          const ids = extractUnlockedIdsFromDashboard(data?.dashboard);
          if (ids.length > 0) {
            if (autoPlaceDoneRef.current.has(selectedUserId)) {
              setPlacedItems(new Map());
              return;
            }
            autoPlaceDoneRef.current.add(selectedUserId);

            const cells = buildAutoPlacementCells(Math.min(ids.length, 20));
            const cityMap = new Map();

            ids.slice(0, cells.length).forEach((id, idx) => {
              const { row, col } = cells[idx];
              const shopItem = SHOP_ITEMS.find((s) => s.id === id);
              if (!shopItem) return;
              const key = `${row}_${col}`;
              cityMap.set(key, {
                ...shopItem,
                instanceId: `${shopItem.id}_auto_${idx}_${Date.now()}`,
                row,
                col,
                stackCount: 1,
              });
            });

            if (cityMap.size > 0) setPlacedItems(cityMap);
          } else {
            setPlacedItems(new Map());
          }
        }
        setInventory([]);
      })
      .catch((err) => {
        // Backend source-of-truth: login fail olursa local cache ile XP/FP ezme.
        // Aksi halde bir anlik hata, dogru backend degerlerini 0'a cekebiliyor.
        console.warn('[Login sync]', err?.message || 'unknown error');
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
    markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
    setXP((prev) => sanitizeXP(prev + amount));
    if (selectedUserId) {
      fireAndForget(earnXPApi(selectedUserId, amount, reason));
    }
  }, [selectedUserId]);

  const spendXP = useCallback((amount) => {
    markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
    setXP((prev) => sanitizeXP(prev - amount));
  }, []);

  const earnFinancialPoints = useCallback((amount, reason) => {
    markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
    setFinancialPoints((prev) => sanitizeFP(prev + amount));
    if (selectedUserId) {
      fireAndForget(earnFPApi(selectedUserId, amount, reason));
    }
  }, [selectedUserId]);

  const spendFinancialPoints = useCallback((amount, itemName, reason) => {
    markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
    setFinancialPoints((prev) => sanitizeFP(prev - amount));
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
    markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
    setFinancialPoints((prev) => sanitizeFP(prev - shopItem.cost));
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

    markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
    setFinancialPoints((prev) => sanitizeFP(prev - shopItem.cost));
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

  // --- Quiz submit ---

  const submitQuiz = useCallback(async (questionId, selectedOptionId) => {
    if (!selectedUserId) return null;
    try {
      const result = await submitQuizApi(selectedUserId, questionId, selectedOptionId);
      const data = result?.data;
      if (data) {
        if (data.xp_earned > 0 || data.fp_earned > 0) {
          markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
        }
        if (data.xp_earned > 0) setXP((prev) => sanitizeXP(prev + data.xp_earned));
        if (data.fp_earned > 0) setFinancialPoints((prev) => sanitizeFP(prev + data.fp_earned));
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
        if (data.xp_earned > 0 || data.fp_earned > 0) {
          markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
        }
        if (data.xp_earned > 0) setXP((prev) => sanitizeXP(prev + data.xp_earned));
        if (data.fp_earned > 0) setFinancialPoints((prev) => sanitizeFP(prev + data.fp_earned));
      }
      return data;
    } catch (err) {
      return { error: err.message };
    }
  }, [selectedUserId]);

  // --- Disaster ---

  const triggerDisaster = useCallback(async (severity = 2, fpPenalty = null) => {
    if (!selectedUserId) return null;
    try {
      const result = await triggerDisasterApi(selectedUserId, severity, fpPenalty);
      const data = result?.data ? { ...result.data } : {};
      const requestedPenalty =
        (typeof data?.fp_penalty_requested === 'number' && Number.isFinite(data.fp_penalty_requested))
          ? data.fp_penalty_requested
          : ((typeof fpPenalty === 'number' && Number.isFinite(fpPenalty) && fpPenalty > 0) ? fpPenalty : 0);

      let appliedPenalty =
        (typeof data?.fp_penalty_applied === 'number' && Number.isFinite(data.fp_penalty_applied))
          ? data.fp_penalty_applied
          : 0;

      if (appliedPenalty > 0) {
        markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
        setFinancialPoints((prev) => sanitizeFP(prev - appliedPenalty));
      } else if (requestedPenalty > 0 && financialPoints > 0) {
        // Backend 0 döndüğünde kullanıcı tarafında ceza etkisini koru.
        appliedPenalty = Math.min(financialPoints, requestedPenalty);
        markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
        setFinancialPoints((prev) => sanitizeFP(prev - appliedPenalty));
      }

      const backendRemoved = Array.isArray(data?.city_damage?.removed_items) ? data.city_damage.removed_items : [];
      let finalRemovedItems = backendRemoved;

      if (backendRemoved.length > 0) {
        setPlacedItems((prevMap) => {
          const next = new Map(prevMap);
          for (const item of backendRemoved) {
            next.delete(`${item.row}_${item.col}`);
          }
          return next;
        });
      } else {
        // Backend hasar döndürmezse severity'ye göre lokal yıkım yap.
        const fallbackCount = severity >= 4 ? 3 : severity >= 3 ? 2 : severity >= 2 ? 1 : 0;
        if (fallbackCount > 0 && placedItems.size > 0) {
          const candidates = Array.from(placedItems.values()).filter((item) =>
            Number.isFinite(item?.row) && Number.isFinite(item?.col),
          );
          finalRemovedItems = candidates.slice(0, fallbackCount).map((item) => ({ row: item.row, col: item.col }));
          if (finalRemovedItems.length > 0) {
            setPlacedItems((prevMap) => {
              const next = new Map(prevMap);
              for (const item of finalRemovedItems) {
                next.delete(`${item.row}_${item.col}`);
              }
              return next;
            });
          }
        }
      }

      return {
        ...data,
        fp_penalty_requested: requestedPenalty,
        fp_penalty_applied: appliedPenalty,
        city_damage: {
          ...(data?.city_damage || {}),
          removed_items: finalRemovedItems,
          city_items_damaged:
            (typeof data?.city_damage?.city_items_damaged === 'number' && Number.isFinite(data.city_damage.city_items_damaged))
              ? data.city_damage.city_items_damaged
              : finalRemovedItems.length,
        },
      };
    } catch {
      markLocalBalanceChanged(lastLocalBalanceChangeAtRef);
      setFinancialPoints((prev) => sanitizeFP(prev - 100));
      return null;
    }
  }, [selectedUserId, financialPoints, placedItems]);

  // --- Refresh dashboard ---

  const refreshDashboard = useCallback(() => {
    if (!selectedUserId) return;
    fireAndForget(
      fetchDashboard(selectedUserId).then((d) => setDashboard(d)),
    );
  }, [selectedUserId]);

  const resetCityState = useCallback(() => {
    setXP(sanitizeXP(0));
    setFinancialPoints(sanitizeFP(500));
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
      earnXP, spendXP, earnFinancialPoints, spendFinancialPoints,
      buyItem, buyAndPlace, placeItem, removeItem, resetCityState,
      submitQuiz, runSimulation, triggerDisaster, refreshDashboard,
      refreshFromBackend,
      applyInvestmentRewards,
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
      earnXP, spendXP, earnFinancialPoints, spendFinancialPoints,
      buyItem, buyAndPlace, placeItem, removeItem, resetCityState,
      submitQuiz, runSimulation, triggerDisaster, refreshDashboard,
      refreshFromBackend,
      applyInvestmentRewards,
    ],
  );

  return createElement(GameContext.Provider, { value }, children);
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
