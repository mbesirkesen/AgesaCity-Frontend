import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Castle, ChevronDown, LogIn, User } from 'lucide-react';
import { useGame } from '../context/GameContext';

export default function LoginScreen() {
  const { users, isLoading, setSelectedUserId } = useGame();
  const [mode, setMode] = useState('select');
  const [dropdownUserId, setDropdownUserId] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (users.length > 0 && !dropdownUserId) {
      setDropdownUserId(users[0].user_id);
    }
  }, [users, dropdownUserId]);

  function handleLogin() {
    const userIdRaw = mode === 'select' ? dropdownUserId : manualUserId.trim();
    const userId = String(userIdRaw).trim().toUpperCase();
    if (!userId) return;
    setLogging(true);
    setSelectedUserId(userId);
  }

  const canLogin =
    mode === 'select' ? Boolean(dropdownUserId) : manualUserId.trim().length > 0;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #110c04 0%, #1a1207 40%, #2a1f0e 100%)' }}
    >
      {/* decorative background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23daa520' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="rpg-panel relative z-10 mx-4 w-full max-w-md p-8"
      >
        {/* header ornament */}
        <div className="mx-auto mb-1 h-[2px] w-16 bg-gradient-to-r from-transparent via-[var(--border-wood)] to-transparent" />

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'linear-gradient(180deg, rgba(218,165,32,0.15), rgba(184,134,11,0.08))' }}
          >
            <Castle className="h-8 w-8 text-[var(--gold)]" />
          </div>
          <h1 className="font-medieval text-2xl font-bold text-[var(--text-parchment)]">
            AgeSA City
          </h1>
          <p className="mt-1 text-sm text-[#8b7355]">
            Krallığına giriş yap, şehrini inşa et.
          </p>
        </div>

        <hr className="rpg-divider" />

        {/* mode tabs */}
        <div className="my-4 flex gap-2">
          <button
            onClick={() => setMode('select')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
              mode === 'select'
                ? 'border border-[var(--border-wood)] bg-gradient-to-b from-[var(--gold)] to-[#b8860b] text-[#1a1207] shadow-sm'
                : 'border border-transparent text-[#8b7355] hover:text-[var(--text-parchment)]'
            }`}
          >
            <ChevronDown className="h-3.5 w-3.5" /> Kullanıcı Seç
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
              mode === 'manual'
                ? 'border border-[var(--border-wood)] bg-gradient-to-b from-[var(--gold)] to-[#b8860b] text-[#1a1207] shadow-sm'
                : 'border border-transparent text-[#8b7355] hover:text-[var(--text-parchment)]'
            }`}
          >
            <User className="h-3.5 w-3.5" /> Manuel Giriş
          </button>
        </div>

        {/* form */}
        <div className="space-y-4">
          {mode === 'select' ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8b7355]">
                Kullanıcı
              </label>
              {isLoading ? (
                <div className="rpg-input w-full text-sm opacity-60">Yükleniyor...</div>
              ) : (
                <select
                  value={dropdownUserId}
                  onChange={(e) => setDropdownUserId(e.target.value)}
                  className="rpg-input w-full text-sm"
                >
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.user_id} — {u.name || u.user_id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8b7355]">
                Kullanıcı ID
              </label>
              <input
                type="text"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                placeholder="U0001"
                className="rpg-input w-full text-sm"
                onKeyDown={(e) => e.key === 'Enter' && canLogin && handleLogin()}
              />
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!canLogin || logging}
            onClick={handleLogin}
            className="rpg-btn flex w-full items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            {logging ? 'Giriş yapılıyor...' : 'Krallığa Gir'}
          </motion.button>
        </div>

        {/* bottom ornament */}
        <div className="mx-auto mt-6 h-[2px] w-16 bg-gradient-to-r from-transparent via-[var(--border-wood)] to-transparent" />
        <p className="mt-2 text-center text-[10px] text-[#8b7355]">
          AgeSA Insurtech CodeNight
        </p>
      </motion.div>
    </div>
  );
}
