import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, X } from 'lucide-react';
import { createSpending } from '../services/gameDataService';
import { useGame } from '../context/GameContext';

const CATEGORIES = [
  'Market', 'Ulaşım', 'Eğlence', 'Yeme-İçme',
  'Eğitim', 'Sağlık', 'Giyim', 'Faturalar', 'Diğer',
];

export default function SpendingForm() {
  const { selectedUserId, refreshDashboard } = useGame();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Market');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || !selectedUserId) return;

    setSubmitting(true);
    setResult(null);
    try {
      await createSpending({
        user_id: selectedUserId,
        amount: Number.parseFloat(amount),
        category,
        date: new Date().toISOString().slice(0, 10),
      });
      setResult({ ok: true, msg: `${amount} TL harcama eklendi.` });
      setAmount('');
      refreshDashboard();
    } catch (err) {
      setResult({ ok: false, msg: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 p-4 text-left"
      >
        <Receipt className="h-5 w-5 text-violet-500" />
        <span className="text-sm font-semibold text-slate-900">Harcama Ekle</span>
        <span className="ml-auto text-slate-400">{open ? '−' : '+'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100 px-4 pb-4"
            onSubmit={handleSubmit}
          >
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Tutar (TL)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting || !amount}
                  className="flex w-full items-center justify-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:bg-slate-300"
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
                  className={`mt-2 flex items-center justify-between rounded-lg p-2 text-xs ${
                    result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
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
