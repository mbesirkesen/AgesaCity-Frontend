import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadGameData, fetchCityStatus } from '../services/gameDataService';
import { getLevelFromXP, getXPForNextLevel, MAX_STACK, SHOP_ITEMS } from '../config/shopItems';

const GameContext = createContext(null);

const DEFAULT_USER_ID = 'U0001';
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
    roadQualityIndex: ground?.road_quality_index ?? 50,
    skyStatus: ground?.sky_status ?? 'Acik',
    totalSpending: ground?.total_spending ?? 0,
  };
}

// --- localStorage helpers ---

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

// --- Provider ---

export function GameProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [spendings, setSpendings] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [learningContents, setLearningContents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizOptions, setQuizOptions] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(DEFAULT_USER_ID);
  const [backendCityStatus, setBackendCityStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // City builder state (persisted)
  const saved = useMemo(() => loadSavedState(), []);
  const [xp, setXP] = useState(saved?.xp ?? 0);
  const [financialPoints, setFinancialPoints] = useState(saved?.financialPoints ?? 500);
  const [inventory, setInventory] = useState(saved?.inventory ?? []);
  const [placedItems, setPlacedItems] = useState(() => new Map(Object.entries(saved?.placedItems ?? {})));

  const level = useMemo(() => getLevelFromXP(xp), [xp]);
  const nextLevelXP = useMemo(() => getXPForNextLevel(xp), [xp]);

  // Persist on change
  useEffect(() => {
    persistState({
      xp,
      financialPoints,
      inventory,
      placedItems: Object.fromEntries(placedItems),
    });
  }, [xp, financialPoints, inventory, placedItems]);

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
        const hasDefaultUser = usersData.some((u) => u.user_id === DEFAULT_USER_ID);
        setSelectedUserId(hasDefaultUser ? DEFAULT_USER_ID : usersData[0]?.user_id || '');
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

  useEffect(() => {
    if (!selectedUserId) return;
    let cancelled = false;
    fetchCityStatus(selectedUserId)
      .then((data) => { if (!cancelled) setBackendCityStatus(data); })
      .catch(() => { if (!cancelled) setBackendCityStatus(null); });
    return () => { cancelled = true; };
  }, [selectedUserId]);

  const cityState = useMemo(
    () => calculateCityState({ selectedUser, spendings, scenarios, backendCityStatus }),
    [selectedUser, spendings, scenarios, backendCityStatus],
  );

  // --- City builder actions ---

  const earnXP = useCallback((amount) => {
    setXP((prev) => prev + amount);
  }, []);

  const earnFinancialPoints = useCallback((amount) => {
    setFinancialPoints((prev) => prev + amount);
  }, []);

  const spendFinancialPoints = useCallback((amount) => {
    setFinancialPoints((prev) => Math.max(0, prev - amount));
  }, []);

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
    return true;
  }, [xp, financialPoints]);

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
      if (item.reusable) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }, []);

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
      return next;
    });
  }, []);

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

    setFinancialPoints((prev) => prev - shopItem.cost);
    if (shopItem.reusable) {
      setInventory((prev) => {
        if (prev.some((i) => i.id === shopItem.id)) return prev;
        const invInstanceId = `${shopItem.id}_inv_${Date.now()}`;
        return [...prev, { ...shopItem, instanceId: invInstanceId }];
      });
    }
    return true;
  }, [xp, financialPoints]);

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
      cityState, backendCityStatus,
      // City builder
      xp, level, nextLevelXP,
      financialPoints,
      inventory, placedItems,
      earnXP, earnFinancialPoints, spendFinancialPoints,
      buyItem, buyAndPlace, placeItem, removeItem, resetCityState,
    }),
    [
      isLoading, error,
      users, spendings, scenarios, learningContents,
      quizzes, quizOptions,
      personas,
      selectedUserId, selectedUser, cityState, backendCityStatus,
      xp, level, nextLevelXP,
      financialPoints,
      inventory, placedItems,
      earnXP, earnFinancialPoints, spendFinancialPoints,
      buyItem, buyAndPlace, placeItem, removeItem, resetCityState,
    ],
  );

  return createElement(GameContext.Provider, { value }, children);
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
