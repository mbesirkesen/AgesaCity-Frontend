import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiggyBank, Plus, X } from 'lucide-react';
import { createSpending } from '../services/gameDataService';
import { useGame } from '../context/GameContext';

export default function SavingsForm() {
  const {
    selectedUserId,
    refreshFromBackend,
    earnFinancialPoints,
    earnXP,
  } = useGame();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || !selectedUserId) return;
    const numericAmount = Number.parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    setSubmitting(true);
    setResult(null);
    try {
      await createSpending({
        user_id: selectedUserId,
        amount: numericAmount,
        category: 'Birikim',
        sub_category: 'tasarruf',
        spend_type: 'ihtiyac',
        payment_method: 'transfer',
        is_recurring: false,
        is_unexpected: false,
        budget_impact_level: 'low',
        date: new Date().toISOString().slice(0, 10),
      });

      const fpReward = Math.min(4, Math.max(0, Math.round(numericAmount / 2000)));
      const xpReward = Math.min(2, Math.max(0, Math.round(numericAmount / 4000)));
      if (fpReward > 0) earnFinancialPoints(fpReward, 'Birikim eklendi');
      if (xpReward > 0) earnXP(xpReward, 'Birikim disiplini');

      setResult({ ok: true, msg: `${amount} TL birikim eklendi. +${fpReward} FP, +${xpReward} XP` });
      setAmount('');
      await refreshFromBackend({ includeStatic: true });
    } catch (err) {
      setResult({ ok: false, msg: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rpg-panel-dark">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 p-4 text-left"
      >
        <PiggyBank className="h-5 w-5 text-emerald-400" />
        <span className="font-medieval text-sm font-semibold text-[var(--text-gold)]">Birikim Ekle</span>
        <span className="ml-auto text-[#8b7355]">{open ? '−' : '+'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 pb-4"
            onSubmit={handleSubmit}
          >
            <hr className="rpg-divider mb-3" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#8b7355]">Tutar (TL)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  required
                  className="rpg-input w-full text-sm"
                />
              </div>

              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting || !amount}
                  className="rpg-btn flex w-full items-center justify-center gap-1 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  {submitting ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-2 flex items-center justify-between rounded-md p-2 text-xs ${
                    result.ok
                      ? 'border border-emerald-700/30 bg-emerald-900/20 text-emerald-400'
                      : 'border border-rose-700/30 bg-rose-900/20 text-rose-400'
                  }`}
                >
                  <span>{result.msg}</span>
                  <button type="button" onClick={() => setResult(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}

