import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Coins, HeartPulse, Star, UserCircle2 } from 'lucide-react';
import CityMap from './components/CityMap';
import InventoryBar from './components/InventoryBar';
import KnowledgeCenter from './components/KnowledgeCenter';
import ShopPanel from './components/ShopPanel';
import SimulationOverlay from './components/SimulationOverlay';
import { SHOP_ITEMS } from './config/shopItems';
import { useGame } from './context/GameContext';

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function App() {
  const {
    isLoading, error,
    users,
    cityState, scenarios,
    level, xp, financialPoints,
    buyAndPlace, placeItem, placedItems, inventory,
    runSimulation, triggerDisaster: triggerDisasterApi,
    dashboard,
  } = useGame();

  const [simulationValue, setSimulationValue] = useState(null);
  const [simulationMsg, setSimulationMsg] = useState('');
  const [disasterPulse, setDisasterPulse] = useState(0);
  const [manualDisaster, setManualDisaster] = useState(false);
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
    await triggerDisasterApi(2);
    window.setTimeout(() => setManualDisaster(false), 1500);
  }

  async function handleSimulation() {
    const result = await runSimulation();
    if (result?.error) {
      setSimulationMsg('Bugün simülasyon zaten çalıştırıldı.');
    } else if (result) {
      setSimulationValue(result.projected_fund_10y || result.projected_fund_20y);
      setSimulationMsg('');
    }
  }


  // --- DnD ---
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

  if (isLoading) {
    return <div className="p-8 text-slate-700">Veriler yukleniyor...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <p className="font-semibold">Backend baglantisi bekleniyor</p>
          <p className="mt-2 text-sm">Hata: {error}</p>
          <p className="mt-2 text-sm">Beklenen: <code>{import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8003'}/api/users</code></p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <main className="flex min-h-screen bg-slate-50">
        {/* Sol: Mağaza */}
        <div className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 p-3">
          <ShopPanel />
        </div>

        {/* Orta: Ana İçerik */}
        <div className="flex-1 overflow-y-auto p-6">
          <section className="mx-auto max-w-6xl space-y-5">
            <header className="space-y-1">
              <h1 className="text-3xl font-bold text-slate-900">AgeSA City</h1>
              <p className="text-slate-600">Şehrini inşa et, finansal geleceğini şekillendir.</p>
            </header>

            {/* Metrikler */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard icon={Star} label="Level" value={`${level} (${xp} XP)`} />
                <MetricCard icon={Coins} label="Finansal Puan" value={`${financialPoints} FP`} />
                <MetricCard icon={HeartPulse} label="Sağlık Skoru" value={cityState.healthScore} />
                <MetricCard icon={UserCircle2} label="Haritadaki Bina" value={placedItems.size} />
              </div>
            </div>

            {/* Envanter */}
            <InventoryBar />

            {/* Harita */}
            <CityMap disasterActive={disasterActive} disasterPulse={disasterPulse} />

            {/* Simülasyon */}
            <SimulationOverlay
              principal={cityState.totalSavings}
              annualReturnRaw={annualReturnAvg}
              healthScore={cityState.healthScore}
              onRunSimulation={handleSimulation}
              onWithdrawSavings={handleDisaster}
              simulationMsg={simulationMsg}
            />

            {/* Bilgi Merkezi */}
            <KnowledgeCenter />

            {/* Debug */}
            <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer font-medium text-slate-800">Debug</summary>
              <pre className="mt-3 max-h-[350px] overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
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
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-indigo-400 bg-white/90 shadow-xl">
            <img src={activeDragItem.asset} alt="" className="h-10 w-10 object-contain pixel-art" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
