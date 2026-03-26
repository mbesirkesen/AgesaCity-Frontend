import { useMemo } from 'react';
import { motion } from 'framer-motion';

function parseRate(rawValue) {
  const number = Number.parseFloat(String(rawValue ?? 0).replace(',', '.'));
  if (!Number.isFinite(number)) return 0.12;
  return number > 1 ? number / 100 : number;
}

export default function SimulationOverlay({
  principal = 0,
  annualReturnRaw = 0.12,
  healthScore = 0,
  onRunSimulation,
  onWithdrawSavings,
  simulationMsg = '',
}) {
  const annualReturn = parseRate(annualReturnRaw);
  const years = 10;
  const futureValue = useMemo(
    () => Math.round(principal * Math.pow(1 + annualReturn, years)),
    [principal, annualReturn],
  );

  return (
    <section className="rpg-panel-dark p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medieval text-lg font-semibold text-[var(--text-gold)]">10 Yıllık Simülasyon</h2>
        <span className="rpg-badge">FV = P * (1 + r)^n</span>
      </div>

      <div className="grid gap-2 text-sm text-[var(--text-light)] opacity-70 md:grid-cols-3">
        <p>Başlangıç (P): {principal.toLocaleString('tr-TR')} TL</p>
        <p>Yıllık getiri (r): %{(annualReturn * 100).toFixed(2)}</p>
        <p>Dönem (n): {years} yıl</p>
      </div>

      <motion.p
        key={futureValue}
        initial={{ scale: 0.9, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-3 font-medieval text-xl font-bold text-[var(--gold-light)]"
      >
        10 yıl sonrası: {futureValue.toLocaleString('tr-TR')} TL
      </motion.p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={onRunSimulation} className="rpg-btn">
          10 Yıl İleri Sar
        </button>
        <button onClick={onWithdrawSavings} className="rpg-btn rpg-btn-danger">
          Birikim Çek (Felaket Testi)
        </button>
      </div>

      {simulationMsg && (
        <p className="mt-2 text-xs font-medium text-[var(--gold)]">{simulationMsg}</p>
      )}

      <p className="mt-3 text-xs text-[#8b7355]">
        Health score {healthScore > 80 ? '80 üzeri, gökdelen seviyesi açık.' : '80 altı, gökdelen kilitli.'}
      </p>
    </section>
  );
}
