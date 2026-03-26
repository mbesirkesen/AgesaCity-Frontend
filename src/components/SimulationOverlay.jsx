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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">10 Yillik Simulasyon</h2>
        <span className="text-xs text-slate-500">FV = P * (1 + r)^n</span>
      </div>

      <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
        <p>Baslangic (P): {principal.toLocaleString('tr-TR')} TL</p>
        <p>Yillik getiri (r): %{(annualReturn * 100).toFixed(2)}</p>
        <p>Donem (n): {years} yil</p>
      </div>

      <motion.p
        key={futureValue}
        initial={{ scale: 0.9, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-3 text-xl font-bold text-indigo-700"
      >
        10 yil sonrasi: {futureValue.toLocaleString('tr-TR')} TL
      </motion.p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onRunSimulation}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          10 Yil Ileri Sar
        </button>
        <button
          onClick={onWithdrawSavings}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Birikim Cek (Felaket Testi)
        </button>
      </div>

      {simulationMsg && (
        <p className="mt-2 text-xs font-medium text-amber-600">{simulationMsg}</p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Health score {healthScore > 80 ? '80 uzeri, gokdelen seviyesi acik.' : '80 alti, gokdelen kilitli.'}
      </p>
    </section>
  );
}
