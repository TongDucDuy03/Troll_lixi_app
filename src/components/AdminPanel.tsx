import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Plus, Minus, RefreshCw, Shield, Skull } from 'lucide-react';

export const AdminPanel = () => {
  const {
    state,
    adminLogin,
    adminLogout,
    updateDenominationQuantity,
    setRiggingMode,
    resetInventory,
    getTotalMoneyInSystem,
  } = useGame();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [riggingTab, setRiggingTab] = useState<'honest' | 'force' | 'troll'>('honest');
  const [forceValue, setForceValue] = useState(20000);
  const [trollFake, setTrollFake] = useState(500000);
  const [trollReal, setTrollReal] = useState(20000);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminLogin(pin)) {
      setError('');
      setPin('');
    } else {
      setError('Sai mật khẩu rồi boss!');
      setPin('');
    }
  };

  const formatMoney = (value: number) => {
    return `${(value / 1000).toFixed(0)}k`;
  };

  const formatFullMoney = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ';
  };

  const applyRigging = () => {
    if (riggingTab === 'honest') {
      setRiggingMode('random');
      alert('Chế độ TRUNG THỰC đã kích hoạt! (Boring...)');
    } else if (riggingTab === 'force') {
      setRiggingMode('force_value', forceValue);
      alert(`Người tiếp theo SẼ NHẬN ${formatFullMoney(forceValue)}! 🎯`);
    } else if (riggingTab === 'troll') {
      setRiggingMode('troll_fake_high_to_low', trollReal, trollFake);
      alert(`TROLL MODE: Hiện ${formatFullMoney(trollFake)} ➜ Thật ra ${formatFullMoney(trollReal)}! 😈`);
    }
  };

  if (!state.isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-black/80 backdrop-blur-lg border-2 border-red-500 rounded-xl p-8 max-w-md w-full"
        >
          <div className="flex items-center justify-center mb-6">
            <Lock className="text-red-500 w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold text-center text-red-500 mb-2">
            ADMIN DUY ONLY
          </h1>
          <p className="text-gray-400 text-center mb-6">
            Cổng Chế Troll Bí Mật
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="w-full bg-gray-900 border-2 border-red-500 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest mb-4 focus:outline-none focus:border-yellow-500"
              maxLength={4}
            />
            {error && (
              <p className="text-red-400 text-center mb-4 text-sm">{error}</p>
            )}
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              ĐĂNG NHẬP
            </button>
          </form>
          <p className="text-gray-600 text-xs text-center mt-4">
            Hint: Thử "1234" xem sao 👀
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-black p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-yellow-400 flex items-center gap-3">
              <Shield className="w-10 h-10" />
              ADMIN CONTROL CENTER
            </h1>
            <p className="text-gray-400 mt-1">Welcome back, Duy the Puppet Master</p>
          </div>
          <button
            onClick={adminLogout}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Unlock className="w-5 h-5" />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-black/50 backdrop-blur-lg border-2 border-yellow-500 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-yellow-400">💰 INVENTORY</h2>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Total in System:</p>
                <p className="text-green-400 font-bold text-xl">
                  {formatFullMoney(getTotalMoneyInSystem())}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {state.denominations.map((denom) => (
                <div
                  key={denom.value}
                  className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg">
                      {formatFullMoney(denom.value)}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Stock: {denom.quantity} / {denom.initial_quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateDenominationQuantity(denom.value, -1)}
                      className="bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors"
                      disabled={denom.quantity === 0}
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-white font-bold text-xl w-12 text-center">
                      {denom.quantity}
                    </span>
                    <button
                      onClick={() => updateDenominationQuantity(denom.value, 1)}
                      className="bg-green-600 hover:bg-green-700 p-2 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={resetInventory}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              RESET TO INITIAL
            </button>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-black/50 backdrop-blur-lg border-2 border-red-500 rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <Skull className="w-8 h-8" />
              RIGGING CONSOLE
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Control the fate of the next spin victim...
            </p>

            <div className="flex gap-2 mb-4">
              {(['honest', 'force', 'troll'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRiggingTab(tab)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                    riggingTab === tab
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {tab === 'honest' && '😇 Honest'}
                  {tab === 'force' && '🎯 Force'}
                  {tab === 'troll' && '😈 Troll'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {riggingTab === 'honest' && (
                <motion.div
                  key="honest"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-900/50 rounded-lg p-4"
                >
                  <p className="text-green-400 text-center">
                    Random spin based on remaining stock weights.
                    <br />
                    <span className="text-gray-500 text-sm">(Boring but fair)</span>
                  </p>
                </motion.div>
              )}

              {riggingTab === 'force' && (
                <motion.div
                  key="force"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-900/50 rounded-lg p-4 space-y-3"
                >
                  <p className="text-yellow-400 text-sm">
                    Next person will DEFINITELY get this value:
                  </p>
                  <select
                    value={forceValue}
                    onChange={(e) => setForceValue(Number(e.target.value))}
                    className="w-full bg-gray-800 border-2 border-yellow-500 text-white rounded-lg px-4 py-2 font-bold"
                  >
                    {state.denominations
                      .filter((d) => d.quantity > 0)
                      .map((d) => (
                        <option key={d.value} value={d.value}>
                          {formatFullMoney(d.value)} (Stock: {d.quantity})
                        </option>
                      ))}
                  </select>
                </motion.div>
              )}

              {riggingTab === 'troll' && (
                <motion.div
                  key="troll"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-900/50 rounded-lg p-4 space-y-3"
                >
                  <div>
                    <p className="text-purple-400 text-sm mb-2">
                      🎭 FAKE: Show this at first:
                    </p>
                    <select
                      value={trollFake}
                      onChange={(e) => setTrollFake(Number(e.target.value))}
                      className="w-full bg-gray-800 border-2 border-purple-500 text-white rounded-lg px-4 py-2 font-bold"
                    >
                      {state.denominations.map((d) => (
                        <option key={d.value} value={d.value}>
                          {formatFullMoney(d.value)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-center text-red-400 font-bold text-2xl">⬇️</div>
                  <div>
                    <p className="text-red-400 text-sm mb-2">
                      💀 REAL: Actually give them:
                    </p>
                    <select
                      value={trollReal}
                      onChange={(e) => setTrollReal(Number(e.target.value))}
                      className="w-full bg-gray-800 border-2 border-red-500 text-white rounded-lg px-4 py-2 font-bold"
                    >
                      {state.denominations
                        .filter((d) => d.quantity > 0)
                        .map((d) => (
                          <option key={d.value} value={d.value}>
                            {formatFullMoney(d.value)} (Stock: {d.quantity})
                          </option>
                        ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={applyRigging}
              className="w-full mt-4 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-bold py-4 rounded-lg transition-all text-lg"
            >
              🎯 APPLY TO NEXT SPIN
            </button>

            <div className="mt-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
              <p className="text-yellow-400 text-xs">
                <strong>Current Mode:</strong> {state.riggingConfig.next_spin_mode === 'random' ? '😇 Honest Random' : state.riggingConfig.next_spin_mode === 'force_value' ? '🎯 Forced Value' : '😈 Troll Mode'}
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-black/50 backdrop-blur-lg border-2 border-green-500 rounded-xl p-6"
        >
          <h2 className="text-2xl font-bold text-green-400 mb-4">📜 SPIN HISTORY</h2>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {state.spinHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No spins yet...</p>
            ) : (
              state.spinHistory.map((log) => (
                <div
                  key={log.id}
                  className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-bold">{log.user_name || 'Anonymous'}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right">
                    {log.display_value !== log.real_value ? (
                      <>
                        <p className="text-purple-400 line-through text-sm">
                          Saw: {formatFullMoney(log.display_value)}
                        </p>
                        <p className="text-red-400 font-bold">
                          Got: {formatFullMoney(log.real_value)}
                        </p>
                      </>
                    ) : (
                      <p className="text-green-400 font-bold">
                        {log.real_value === 0 ? 'EMPTY' : formatFullMoney(log.real_value)}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs">{log.scenario_used}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
