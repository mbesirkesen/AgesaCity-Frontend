import { motion } from 'framer-motion';
import {
  BarChart3, GraduationCap, Leaf, PiggyBank,
  CloudSun, Route, ShoppingBag, Building2,
} from 'lucide-react';
import { useGame } from '../context/GameContext';

function LayerCard({ icon: Icon, title, color, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 shadow-sm ${color}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function ProgressBar({ value, max = 100, color = 'bg-indigo-500' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
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
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <BarChart3 className="h-5 w-5 text-indigo-500" />
        Şehir Analizi
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Layer 1: Şehir Zemin */}
        {layer1 && (
          <LayerCard icon={Route} title="Şehir Zemini" color="border-slate-200 bg-white">
            <div className="space-y-1">
              <StatRow label="Yol Kalitesi" value={`${layer1.road_quality ?? cityState.roadQualityIndex}/100`} />
              <ProgressBar value={layer1.road_quality ?? cityState.roadQualityIndex} color="bg-slate-600" />
              <StatRow label="Gökyüzü" value={layer1.sky_mood ?? cityState.skyStatus} />
              <div className="mt-2 flex items-center gap-2 text-xs">
                <CloudSun className="h-3.5 w-3.5 text-sky-500" />
                <span className="text-slate-500">
                  Keyfi harcama oranı: %{((layer1.keyfi_ratio ?? cityState.keyfiRatio) * 100).toFixed(0)}
                </span>
              </div>
              {(layer1.junk_shop_count ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <ShoppingBag className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-700">{layer1.junk_shop_count} çöp dükkanı belirdi</span>
                </div>
              )}
            </div>
          </LayerCard>
        )}

        {/* Layer 2: Eğitim */}
        {layer2 && (
          <LayerCard icon={GraduationCap} title="Eğitim İlerlemesi" color="border-indigo-100 bg-indigo-50/50">
            <div className="space-y-1">
              <StatRow label="Eğitim Skoru" value={`${layer2.education_score ?? 0}/100`} />
              <ProgressBar value={layer2.education_score ?? 0} color="bg-indigo-500" />
              {layer2.unlocked_buildings && (
                <div className="mt-2">
                  <p className="mb-1 text-xs font-medium text-slate-500">Açılan binalar:</p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(layer2.unlocked_buildings) ? layer2.unlocked_buildings : []).map((b, i) => (
                      <span key={i} className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {layer2.next_building && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-indigo-600">
                    Sıradaki: {layer2.next_building}
                    {layer2.xp_to_next ? ` (${layer2.xp_to_next} XP)` : ''}
                  </span>
                </div>
              )}
            </div>
          </LayerCard>
        )}

        {/* Layer 3: Yeşil Alan / Tasarruf */}
        {layer3 && (
          <LayerCard icon={Leaf} title="Tasarruf & Yeşil Alan" color="border-emerald-100 bg-emerald-50/50">
            <div className="space-y-1">
              <StatRow label="Yeşil Skor" value={`${layer3.green_score ?? 0}/100`} />
              <ProgressBar value={layer3.green_score ?? 0} color="bg-emerald-500" />
              <StatRow label="Toplam Tasarruf" value={`${(layer3.total_saved_tl ?? 0).toLocaleString('tr-TR')} TL`} />
              <StatRow label="Yeşil Alan" value={`${layer3.green_area_m2 ?? 0} m²`} />
              {Array.isArray(layer3.green_events) && layer3.green_events.length > 0 && (
                <div className="mt-2 space-y-1">
                  {layer3.green_events.map((event, i) => (
                    <p key={i} className="rounded bg-emerald-100 p-1.5 text-[11px] text-emerald-800">{event}</p>
                  ))}
                </div>
              )}
            </div>
          </LayerCard>
        )}

        {/* Layer 4: BES Projeksiyonu */}
        {layer4 && (
          <LayerCard icon={PiggyBank} title="BES Projeksiyonu" color="border-amber-100 bg-amber-50/50">
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
                <p className="mt-2 rounded bg-amber-100 p-2 text-[11px] text-amber-800">{layer4.bes_summary}</p>
              )}
            </div>
          </LayerCard>
        )}
      </div>
    </section>
  );
}
