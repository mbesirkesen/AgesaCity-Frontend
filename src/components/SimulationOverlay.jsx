import { useMemo, useState } from 'react';
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
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawPct, setWithdrawPct] = useState(25);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const futureValue = useMemo(
    () => Math.round(principal * Math.pow(1 + annualReturn, years)),
    [principal, annualReturn],
  );

  const suggestedAmount = useMemo(() => {
    const pct = Math.max(0, Math.min(100, Number(withdrawPct) || 0));
    return Math.round((principal * pct) / 100);
  }, [principal, withdrawPct]);

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
        <button onClick={() => setWithdrawOpen((v) => !v)} className="rpg-btn rpg-btn-danger">
          Birikim Çek (Felaket Testi)
        </button>
      </div>

      {withdrawOpen && (
        <div className="mt-3 rounded-lg border border-[var(--border-wood)]/30 bg-black/10 p-3">
          <p className="mb-2 text-xs font-medium text-[#cbb08a]">Çekim miktarı</p>
          <div className="flex flex-wrap gap-2">
            {[10, 25, 50, 75].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setWithdrawPct(p)}
                className={`rpg-btn-sm ${withdrawPct === p ? '' : 'opacity-70'}`}
              >
                %{p}
              </button>
            ))}
            <span className="ml-auto text-xs text-[#8b7355]">
              Öneri: {suggestedAmount.toLocaleString('tr-TR')} TL
            </span>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8b7355]">Yüzde</label>
              <input
                type="number"
                min="1"
                max="100"
                value={withdrawPct}
                onChange={(e) => setWithdrawPct(Number(e.target.value))}
                className="rpg-input w-full text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8b7355]">Ya da net tutar (TL)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={String(suggestedAmount)}
                className="rpg-input w-full text-sm"
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rpg-btn rpg-btn-danger"
              onClick={() => {
                const rawAmount = withdrawAmount
                  ? Math.max(0, Math.round(Number(withdrawAmount) || 0))
                  : suggestedAmount;
                const amount = Math.min(rawAmount, Math.max(0, Math.round(principal)));
                const pct = principal > 0 ? amount / principal : 0;
                onWithdrawSavings?.({ amount, pct, principal, futureValue });
                setWithdrawOpen(false);
                setWithdrawAmount('');
              }}
            >
              Çek ve Etkisini Gör
            </button>
            <button type="button" className="rpg-btn-sm opacity-80" onClick={() => setWithdrawOpen(false)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {simulationMsg && (
        <p className="mt-2 text-xs font-medium text-[var(--gold)]">{simulationMsg}</p>
      )}

      <p className="mt-3 text-xs text-[#8b7355]">
        Health score {healthScore > 80 ? '80 üzeri, gökdelen seviyesi açık.' : '80 altı, gökdelen kilitli.'}
      </p>
    </section>
  );
}
