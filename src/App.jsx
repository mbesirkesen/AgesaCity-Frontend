import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Coins, HeartPulse, Star, MapPin } from 'lucide-react';
import CityMap from './components/CityMap';
import DashboardPanel from './components/DashboardPanel';
import InventoryBar from './components/InventoryBar';
import KnowledgeCenter from './components/KnowledgeCenter';
import LoginScreen from './components/LoginScreen';
import ShopPanel from './components/ShopPanel';
import SimulationOverlay from './components/SimulationOverlay';
import SpendingForm from './components/SpendingForm';
import { SHOP_ITEMS } from './config/shopItems';
import { useGame } from './context/GameContext';

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
    refreshDashboard,
  } = useGame();

  const [simulationValue, setSimulationValue] = useState(null);
  const [simulationMsg, setSimulationMsg] = useState('');
  const [disasterPulse, setDisasterPulse] = useState(0);
  const [manualDisaster, setManualDisaster] = useState(false);
  const [disasterReport, setDisasterReport] = useState(null);
  const [activeDragItem, setActiveDragItem] = useState(null);

  const disasterActive = manualDisaster || cityState.healthScore < 50;

  const annualReturnAvg = useMemo(() => {
    if (!scenarios.length) return 0.12;
    const sum = scenarios.reduce((acc, row) => {
      const raw = Number.parseFloat(String(row.annual_return_avg ?? 12).replace(',', '.'));
      return acc + (Number.isFinite(raw) ? raw : 12);
    }, 0);
    return sum / scenarios.length;
  }, [scenarios]);

  async function handleDisaster() {
    setManualDisaster(true);
    setDisasterPulse((prev) => prev + 1);
    setDisasterReport(null);
    const result = await triggerDisasterApi(2);
    if (result) {
      setDisasterReport({
        fpLost: result.fp_penalty_applied ?? 0,
        damaged: result.city_damage?.city_items_damaged ?? 0,
        removed: result.city_damage?.removed_items?.length ?? 0,
      });
      refreshDashboard();
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
    }
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
              <h1 className="font-medieval text-3xl font-bold text-[var(--text-gold)]">AgeSA City</h1>
              <p className="text-sm text-[var(--text-light)] opacity-60">Şehrini inşa et, finansal geleceğini şekillendir.</p>
            </header>

            <hr className="rpg-divider" />

            {/* Metrikler */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={Star} label="Level" value={`${level} (${xp} XP)`} accent="gold" />
              <MetricCard icon={Coins} label="Finansal Puan" value={`${financialPoints} FP`} accent="green" />
              <MetricCard icon={HeartPulse} label="Sağlık Skoru" value={cityState.healthScore} accent="red" />
              <MetricCard icon={MapPin} label="Haritadaki Bina" value={placedItems.size} accent="blue" />
            </div>

            {/* Envanter */}
            <InventoryBar />

            {/* Harita */}
            <CityMap disasterActive={disasterActive} disasterPulse={disasterPulse} />

            {disasterReport && (
              <div className="rpg-panel-dark border-[var(--accent-red)] p-3 text-sm">
                <p className="font-medieval font-semibold text-rose-400">Felaket Hasar Raporu</p>
                <p className="text-rose-300">FP kaybı: -{disasterReport.fpLost} FP</p>
                {disasterReport.removed > 0 && (
                  <p className="text-rose-300">{disasterReport.removed} bina yıkıldı!</p>
                )}
                <button onClick={() => setDisasterReport(null)} className="rpg-btn-sm mt-2 text-[10px]">Kapat</button>
              </div>
            )}

            {/* Simülasyon */}
            <SimulationOverlay
              principal={cityState.totalSavings}
              annualReturnRaw={annualReturnAvg}
              healthScore={cityState.healthScore}
              onRunSimulation={handleSimulation}
              onWithdrawSavings={handleDisaster}
              simulationMsg={simulationMsg}
            />

            {/* Harcama Ekleme */}
            <SpendingForm />

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
