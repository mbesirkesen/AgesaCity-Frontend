import { motion } from 'framer-motion';
import {
  BarChart3, GraduationCap, Leaf, PiggyBank,
  CloudSun, Route, ShoppingBag, Building2,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { SHOP_ITEMS } from '../config/shopItems';

function LayerCard({ icon: Icon, title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rpg-panel-dark p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[var(--gold)]" />
        <h3 className="font-medieval text-sm font-bold text-[var(--text-gold)]">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[#8b7355]">{label}</span>
      <span className="text-sm font-semibold text-[var(--text-light)]">{value}</span>
    </div>
  );
}

function ProgressBar({ value, max = 100, variant = 'gold' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fillClass = {
    gold: 'rpg-progress-fill',
    green: 'rpg-progress-fill rpg-progress-fill-green',
    blue: 'rpg-progress-fill rpg-progress-fill-blue',
  }[variant] || 'rpg-progress-fill';

  return (
    <div className="rpg-progress">
      <div className={fillClass} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function DashboardPanel() {
  const { dashboard, cityState } = useGame();

  if (!dashboard) return null;

  const layer1 = dashboard?.layer_1_city_ground;
  const layer2 = dashboard?.layer_2_learning;
  const layer3 = dashboard?.layer_3_green;
  const layer4 = dashboard?.layer_4_bes;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-medieval text-lg font-semibold text-[var(--text-gold)]">
        <BarChart3 className="h-5 w-5 text-[var(--gold)]" />
        Şehir Analizi
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {layer1 && (
          <LayerCard icon={Route} title="Şehir Zemini">
            <div className="space-y-1">
              <StatRow label="Yol Kalitesi" value={`${layer1.road_quality ?? cityState.roadQualityIndex}/100`} />
              <ProgressBar value={layer1.road_quality ?? cityState.roadQualityIndex} variant="gold" />
              <StatRow label="Gökyüzü" value={layer1.sky_mood ?? cityState.skyStatus} />
              <div className="mt-2 flex items-center gap-2 text-xs">
                <CloudSun className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-[#8b7355]">
                  Keyfi harcama oranı: %{((layer1.keyfi_ratio ?? cityState.keyfiRatio) * 100).toFixed(0)}
                </span>
              </div>
              {(layer1.junk_shop_count ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <ShoppingBag className="h-3.5 w-3.5 text-[var(--gold)]" />
                  <span className="text-[var(--gold)]">{layer1.junk_shop_count} çöp dükkanı belirdi</span>
                </div>
              )}
            </div>
          </LayerCard>
        )}

        {layer2 && (
          <LayerCard icon={GraduationCap} title="Eğitim İlerlemesi">
            <div className="space-y-1">
              <StatRow label="Eğitim Skoru" value={`${layer2.education_score ?? 0}/100`} />
              <ProgressBar value={layer2.education_score ?? 0} variant="blue" />
              {layer2.unlocked_buildings && (
                <div className="mt-2">
                  <p className="mb-1 text-xs font-medium text-[#8b7355]">Açılan binalar:</p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(layer2.unlocked_buildings) ? layer2.unlocked_buildings : []).map((itemId, i) => {
                      const item = SHOP_ITEMS.find((si) => si.id === itemId);
                      return (
                        <span key={i} className="rpg-badge">
                          {item?.label || itemId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {layer2.next_building && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Building2 className="h-3.5 w-3.5 text-[var(--gold)]" />
                  <span className="text-[var(--gold)]">
                    Sıradaki: {SHOP_ITEMS.find((si) => si.id === layer2.next_building)?.label || layer2.next_building}
                    {layer2.xp_to_next ? ` (${layer2.xp_to_next} puan)` : ''}
                  </span>
                </div>
              )}
            </div>
          </LayerCard>
        )}

        {layer3 && (
          <LayerCard icon={Leaf} title="Tasarruf & Yeşil Alan">
            <div className="space-y-1">
              <StatRow label="Yeşil Skor" value={`${layer3.green_score ?? 0}/100`} />
              <ProgressBar value={layer3.green_score ?? 0} variant="green" />
              <StatRow label="Toplam Tasarruf" value={`${(layer3.total_saved_tl ?? 0).toLocaleString('tr-TR')} TL`} />
              <StatRow label="Yeşil Alan" value={`${layer3.green_area_m2 ?? 0} m²`} />
              {layer3.unlocked_plants && (
                <div className="mt-2">
                  <p className="mb-1 text-xs font-medium text-[#8b7355]">Açılan ağaçlar:</p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(layer3.unlocked_plants) ? layer3.unlocked_plants : []).map((itemId, i) => {
                      const item = SHOP_ITEMS.find((si) => si.id === itemId);
                      return (
                        <span key={i} className="rpg-badge">
                          {item?.label || itemId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {layer3.next_plant && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Leaf className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">
                    Sıradaki: {SHOP_ITEMS.find((si) => si.id === layer3.next_plant)?.label || layer3.next_plant}
                    {layer3.plant_to_next ? ` (${layer3.plant_to_next} puan)` : ''}
                  </span>
                </div>
              )}
              {Array.isArray(layer3.green_events) && layer3.green_events.length > 0 && (
                <div className="mt-2 space-y-1">
                  {layer3.green_events.map((event, i) => (
                    <p key={i} className="rounded-md border border-emerald-700/30 bg-emerald-900/20 p-1.5 text-[11px] text-emerald-400">{event}</p>
                  ))}
                </div>
              )}
            </div>
          </LayerCard>
        )}

        {layer4 && (
          <LayerCard icon={PiggyBank} title="BES Projeksiyonu">
            <div className="space-y-1">
              <StatRow label="Aylık Katkı" value={`${(layer4.monthly_contrib_tl ?? 0).toLocaleString('tr-TR')} TL`} />
              <StatRow label="Projeksiyon (20 yıl)" value={`${(layer4.projected_fund_tl ?? 0).toLocaleString('tr-TR')} TL`} />
              {layer4.city_size_2045 && (
                <StatRow label="2045'te Şehrin" value={layer4.city_size_2045} />
              )}
              {layer4.risk_profile && (
                <StatRow label="Risk Profili" value={layer4.risk_profile} />
              )}
              {layer4.bes_summary && (
                <p className="mt-2 rounded-md border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-2 text-[11px] text-[var(--gold)]">{layer4.bes_summary}</p>
              )}
            </div>
          </LayerCard>
        )}
      </div>
    </section>
  );
}
