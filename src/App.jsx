import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Coins, HeartPulse, Star, MapPin, Trophy, X } from 'lucide-react';
import CityMap from './components/CityMap';
import DashboardPanel from './components/DashboardPanel';
import InventoryBar from './components/InventoryBar';
import KnowledgeCenter from './components/KnowledgeCenter';
import LoginScreen from './components/LoginScreen';
import ShopPanel from './components/ShopPanel';
import SimulationOverlay from './components/SimulationOverlay';
import SpendingForm from './components/SpendingForm';
import SavingsForm from './components/SavingsForm';
import { SHOP_ITEMS } from './config/shopItems';
import { useGame } from './context/GameContext';
import { createSpending } from './services/gameDataService';

const LEADERBOARD_STORAGE_KEY = 'agesa_city_user_xp_map';

function MetricCard({ icon: Icon, label, value, accent = 'gold' }) {
  const accentMap = {
    gold: 'from-[#daa520]/20 to-[#b8860b]/10 text-[var(--gold)]',
    green: 'from-emerald-500/20 to-emerald-700/10 text-emerald-400',
    red: 'from-rose-500/20 to-rose-700/10 text-rose-400',
    blue: 'from-sky-500/20 to-sky-700/10 text-sky-400',
  };

  return (
    <div className="rpg-panel-dark p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${accentMap[accent]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium text-[var(--text-light)] opacity-70">{label}</span>
      </div>
      <p className="font-medieval text-xl font-bold text-[var(--text-gold)]">{value}</p>
    </div>
  );
}

function App() {
  const {
    isLoading, error,
    users, selectedUserId,
    cityState, scenarios,
    level, xp, financialPoints,
    buyAndPlace, placeItem, placedItems, inventory,
    runSimulation, triggerDisaster: triggerDisasterApi,
    dashboard,
    applyInvestmentRewards,
    refreshFromBackend,
  } = useGame();

  const [simulationValue, setSimulationValue] = useState(null);
  const [simulationMsg, setSimulationMsg] = useState('');
  const [disasterPulse, setDisasterPulse] = useState(0);
  const [manualDisaster, setManualDisaster] = useState(false);
  const [disasterReport, setDisasterReport] = useState(null);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [withdrawnSavings, setWithdrawnSavings] = useState(0);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardXPMap, setLeaderboardXPMap] = useState(() => {
    try {
      const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  });

  const disasterActive = manualDisaster || cityState.healthScore < 50;

  // Kullanıcı değiştiğinde, önceki kullanıcıya ait geçici UI durumları taşınmasın.
  useEffect(() => {
    setSimulationValue(null);
    setSimulationMsg('');
    setDisasterPulse(0);
    setManualDisaster(false);
    setDisasterReport(null);
    setActiveDragItem(null);
    setWithdrawnSavings(0);
  }, [selectedUserId]);

  const simulationPrincipal = useMemo(
    () => Math.max(0, Math.round((cityState.totalSavings || 0) - withdrawnSavings)),
    [cityState.totalSavings, withdrawnSavings],
  );

  const annualReturnAvg = useMemo(() => {
    if (!scenarios.length) return 0.12;
    const sum = scenarios.reduce((acc, row) => {
      const raw = Number.parseFloat(String(row.annual_return_avg ?? 12).replace(',', '.'));
      return acc + (Number.isFinite(raw) ? raw : 12);
    }, 0);
    return sum / scenarios.length;
  }, [scenarios]);

  const healthScoreDisplay = useMemo(() => {
    const score = Number(cityState.healthScore ?? 0);
    if (!Number.isFinite(score)) return '0';
    return score.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }, [cityState.healthScore]);

  const safeLevel = useMemo(() => {
    const parsed = Number(level);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.floor(parsed));
  }, [level]);

  const safeXP = useMemo(() => {
    const parsed = Number(xp);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.round(parsed));
  }, [xp]);

  const safeFinancialPoints = useMemo(() => {
    const parsed = Number(financialPoints);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.round(parsed));
  }, [financialPoints]);

  const safePlacedCount = useMemo(() => {
    if (placedItems instanceof Map) return placedItems.size;
    if (Array.isArray(placedItems)) return placedItems.length;
    return 0;
  }, [placedItems]);

  const xpLeaderboard = useMemo(() => {
    return users
      .map((user) => {
        const fromLeaderboardMap = Number(leaderboardXPMap[user?.user_id]);
        const rawXP = Number(
          user?.total_xp ??
          user?.xp ??
          user?.xp_total ??
          user?.experience_points ??
          NaN,
        );
        const baseXP = Number.isFinite(rawXP) ? Math.max(0, Math.round(rawXP)) : null;
        const userXP = Number.isFinite(fromLeaderboardMap)
          ? Math.max(0, Math.round(fromLeaderboardMap))
          : (user?.user_id === selectedUserId ? safeXP : baseXP);
        return {
          userId: user?.user_id || 'Bilinmeyen',
          xp: userXP,
        };
      })
      .sort((a, b) => {
        const ax = Number.isFinite(a.xp) ? a.xp : -1;
        const bx = Number.isFinite(b.xp) ? b.xp : -1;
        return bx - ax;
      });
  }, [users, selectedUserId, safeXP, leaderboardXPMap]);

  useEffect(() => {
    if (!selectedUserId) return;
    setLeaderboardXPMap((prev) => {
      const next = { ...prev, [selectedUserId]: safeXP };
      try {
        localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, [selectedUserId, safeXP]);

  async function handleDisaster(severity = 2, fpPenalty = null) {
    setManualDisaster(true);
    setDisasterPulse((prev) => prev + 1);
    setDisasterReport(null);
    const result = await triggerDisasterApi(severity, fpPenalty);
    if (result) {
      setDisasterReport({
        fpLost: result.fp_penalty_applied ?? fpPenalty ?? 0,
        fpRequested: result.fp_penalty_requested ?? fpPenalty ?? 0,
        damaged: result.city_damage?.city_items_damaged ?? 0,
        removed: result.city_damage?.removed_items?.length ?? 0,
      });
    }
    window.setTimeout(() => setManualDisaster(false), 1500);
  }

  async function handleSimulation() {
    const result = await runSimulation();
    if (result?.error) {
      setSimulationMsg('Bugün simülasyon zaten çalıştırıldı.');
    } else if (result) {
      setSimulationValue(result.projected_fund_tl);
      setSimulationMsg('');
      // Yatırım getirisine göre şehre otomatik ödül yerleşimi
      await applyInvestmentRewards({
        principal: simulationPrincipal,
        futureValue: result.projected_fund_tl ?? 0,
      });
    }
  }

  async function handleWithdrawSavings(payload) {
    const currentPrincipal = Math.max(0, Math.round(Number(payload?.principal ?? simulationPrincipal) || 0));
    const amountRaw = Math.max(0, Math.round(Number(payload?.amount) || 0));
    const amount = Math.min(amountRaw, currentPrincipal);
    if (!amount) return;

    // Çekim: backend’e gerçek bir kayıt düşsün ki diğer metrikleri etkilesin
    try {
      await createSpending({
        user_id: selectedUserId,
        amount,
        category: 'Birikim Çekme',
        sub_category: 'cekme',
        spend_type: 'keyfi',
        payment_method: 'transfer',
        is_recurring: false,
        is_unexpected: true,
        budget_impact_level: 'high',
        date: new Date().toISOString().slice(0, 10),
      });
    } catch {
      // kayıt atılamasa da felaket tetiklenebilir
    }

    const pct = currentPrincipal > 0 ? amount / currentPrincipal : (Number(payload?.pct) || 0);
    const severity =
      pct >= 0.75 ? 4 :
        pct >= 0.5 ? 3 :
          pct >= 0.25 ? 2 : 1;

    // Çekilen miktar simülasyon anapara havuzundan düşsün.
    setWithdrawnSavings((prev) => {
      const maxWithdrawable = Math.max(0, Math.round(cityState.totalSavings || 0));
      return Math.min(maxWithdrawable, prev + amount);
    });

    // 75% gibi yüksek çekimlerde ceza 0 kalmasın diye explicit fp_penalty gönder.
    const requestedPenalty = Math.max(
      15,
      Math.round((amount / 2000) + (severity * 10)),
    );

    await handleDisaster(severity, requestedPenalty);
    await refreshFromBackend({ includeStatic: true });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event) {
    const data = event.active.data.current;
    if (data?.source === 'shop') {
      const shopItem = SHOP_ITEMS.find((s) => s.id === data.shopItemId);
      if (shopItem) setActiveDragItem(shopItem);
    } else if (data?.source === 'inventory') {
      setActiveDragItem(data.item);
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveDragItem(null);
    if (!over) return;

    const dropData = over.data.current;
    if (!dropData?.canDrop) return;
    const { row, col } = dropData;
    const dragData = active.data.current;

    if (dragData?.source === 'shop') {
      buyAndPlace(dragData.shopItemId, row, col);
    } else if (dragData?.source === 'inventory') {
      placeItem(dragData.instanceId, row, col);
    }
  }

  // Show login screen if no user selected
  if (!selectedUserId) {
    return <LoginScreen />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-dark)' }}>
        <div className="rpg-panel p-8 text-center">
          <p className="font-medieval text-lg text-[var(--text-parchment)]">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-dark)' }}>
        <div className="rpg-panel mx-4 max-w-lg p-6">
          <p className="font-medieval text-lg font-bold text-[var(--accent-red)]">Backend bağlantısı bekleniyor</p>
          <p className="mt-2 text-sm text-[var(--text-parchment)]">Hata: {error}</p>
          <p className="mt-2 text-xs text-[#8b7355]">
            Beklenen: <code className="rounded bg-[var(--bg-panel-dark)] px-1 py-0.5">{import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8003'}/api/users</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <main className="flex min-h-screen" style={{ background: 'var(--bg-dark)' }}>
        {/* Sol: Mağaza */}
        <div className="w-64 shrink-0 overflow-y-auto border-r-2 border-[var(--border-wood)] p-3"
          style={{ background: 'linear-gradient(180deg, #1e1608, #110c04)' }}
        >
          <ShopPanel />
        </div>

        {/* Orta: Ana İçerik */}
        <div className="flex-1 overflow-y-auto p-6"
          style={{ background: 'linear-gradient(180deg, #1a1207, #110c04 70%)' }}
        >
          <section className="mx-auto max-w-6xl space-y-5">
            <header className="space-y-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-medieval text-3xl font-bold text-[var(--text-gold)]">AgeSA City</h1>
                  <p className="text-sm text-[var(--text-light)] opacity-60">Şehrini inşa et, finansal geleceğini şekillendir.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLeaderboardOpen(true)}
                  className="rpg-btn-sm flex items-center gap-1.5"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  XP Leaderboard
                </button>
              </div>
            </header>

            <hr className="rpg-divider" />

            {/* Metrikler */}
            <div className="sticky top-0 z-30 -mx-2 border-y border-[var(--border-wood)]/40 bg-[#120c05]/95 px-2 py-2 backdrop-blur-sm">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard icon={Star} label="Level" value={`${safeLevel} (${safeXP.toLocaleString('tr-TR')} XP)`} accent="gold" />
                <MetricCard icon={Coins} label="Finansal Puan" value={`${safeFinancialPoints.toLocaleString('tr-TR')} FP`} accent="green" />
                <MetricCard icon={HeartPulse} label="Sağlık Skoru" value={healthScoreDisplay} accent="red" />
                <MetricCard icon={MapPin} label="Haritadaki Bina" value={safePlacedCount} accent="blue" />
              </div>
            </div>

            {/* Envanter */}
            <InventoryBar />

            {/* Harita */}
            <CityMap disasterActive={disasterActive} disasterPulse={disasterPulse} />

            {disasterReport && (
              <div className="rpg-panel-dark border-[var(--accent-red)] p-3 text-sm">
                <p className="font-medieval font-semibold text-rose-400">Felaket Hasar Raporu</p>
                <p className="text-rose-300">FP kaybı: -{disasterReport.fpLost} FP</p>
                {disasterReport.fpRequested > disasterReport.fpLost && (
                  <p className="text-amber-300">
                    (İstenen ceza: -{disasterReport.fpRequested} FP, bakiye yetersiz olduğu için uygulanan: -{disasterReport.fpLost})
                  </p>
                )}
                <p className="text-rose-300">Hasar gören bina: {disasterReport.damaged}</p>
                {disasterReport.removed > 0 && (
                  <p className="text-rose-300">{disasterReport.removed} bina yıkıldı!</p>
                )}
                <button onClick={() => setDisasterReport(null)} className="rpg-btn-sm mt-2 text-[10px]">Kapat</button>
              </div>
            )}

            {/* Simülasyon */}
            <SimulationOverlay
              principal={simulationPrincipal}
              annualReturnRaw={annualReturnAvg}
              healthScore={cityState.healthScore}
              onRunSimulation={handleSimulation}
              onWithdrawSavings={handleWithdrawSavings}
              simulationMsg={simulationMsg}
            />

            {/* Harcama Ekleme */}
            <SpendingForm />

            {/* Birikim Ekleme */}
            <SavingsForm />

            {/* Dashboard Analizi */}
            <DashboardPanel />

            {/* Bilgi Merkezi */}
            <KnowledgeCenter />

            {/* Debug */}
            <details className="rpg-panel-dark p-4">
              <summary className="cursor-pointer font-medieval font-medium text-[var(--text-gold)]">Debug</summary>
              <pre className="mt-3 max-h-[350px] overflow-auto rounded-lg p-4 text-xs text-[var(--text-light)]"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
                {JSON.stringify({
                  usersCount: users.length,
                  cityState,
                  level, xp, financialPoints,
                  inventoryCount: inventory.length,
                  placedCount: placedItems.size,
                  disasterActive,
                  simulationValue,
                  dashboard,
                }, null, 2)}
              </pre>
            </details>
          </section>
        </div>
      </main>

      {leaderboardOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[var(--border-wood)]/50 bg-[#1a1207] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medieval text-lg font-semibold text-[var(--text-gold)]">XP Leaderboard</h2>
              <button type="button" onClick={() => setLeaderboardOpen(false)} className="rpg-btn-sm">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {xpLeaderboard.length === 0 ? (
                <p className="text-xs text-[#8b7355]">Henüz kullanıcı verisi yok.</p>
              ) : (
                xpLeaderboard.map((row, index) => (
                  <div
                    key={row.userId}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                      row.userId === selectedUserId
                        ? 'border-[var(--gold)]/60 bg-[var(--gold)]/10'
                        : 'border-[var(--border-wood)]/30 bg-black/10'
                    }`}
                  >
                    <span className="text-[var(--text-light)]">
                      {index + 1}. {row.userId}
                    </span>
                    <span className="font-semibold text-[var(--text-gold)]">
                      {Number.isFinite(row.xp) ? `${row.xp.toLocaleString('tr-TR')} XP` : 'Veri yok'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sürükleme Overlay */}
      <DragOverlay>
        {activeDragItem ? (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-[var(--gold)] bg-[var(--bg-panel)]/90 shadow-xl">
            <img src={activeDragItem.asset} alt="" className="h-10 w-10 object-contain pixel-art" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
