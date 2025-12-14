import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import confetti from 'canvas-confetti';
import { Sparkles, AlertCircle } from 'lucide-react';

const playSpinSound = () => console.log('🎵 Spin sound');
const playWinSound = () => console.log('🎵 Win sound');
const playFailSound = () => console.log('🎵 Fail sound');

const getBillColor = (value: number): string => {
  const colors: { [key: number]: string } = {
    10000: '#8B4513',
    20000: '#4169E1',
    50000: '#FF1493',
    100000: '#228B22',
    200000: '#FF6347',
    500000: '#00CED1',
  };
  return colors[value] || '#FFD700';
};

export const SlotMachine = () => {
  const { performSpin, state } = useGame();
  const [userName, setUserName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'spinning' | 'result' | 'troll' | 'final'>('idle');
  const [displayValue, setDisplayValue] = useState<number>(0);
  const [realValue, setRealValue] = useState<number>(0);
  const [scenario, setScenario] = useState<string>('');
  const [lastTapTime, setLastTapTime] = useState(0);
  const tapCountRef = useRef(0);

  const allDenoms = [10000, 20000, 50000, 100000, 200000, 500000];

  const formatMoney = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ';
  };

  const fireConfetti = (intensity: 'low' | 'medium' | 'high' = 'medium') => {
    const configs = {
      low: { particleCount: 50, spread: 50 },
      medium: { particleCount: 100, spread: 70 },
      high: { particleCount: 200, spread: 100 },
    };

    const config = configs[intensity];

    confetti({
      ...config,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF0000', '#FFFF00', '#FFA500'],
    });

    if (intensity === 'high') {
      setTimeout(() => {
        confetti({
          ...config,
          origin: { y: 0.6 },
          angle: 60,
        });
      }, 100);
      setTimeout(() => {
        confetti({
          ...config,
          origin: { y: 0.6 },
          angle: 120,
        });
      }, 200);
    }
  };

  const handleStealthTap = () => {
    const now = Date.now();
    if (now - lastTapTime > 300) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current++;
    }
    setLastTapTime(now);

    if (tapCountRef.current === 2) {
      const { toggleStealthTrigger } = useGame();
      toggleStealthTrigger();
      tapCountRef.current = 0;
    }
  };

  const handleSpin = async () => {
    if (!userName.trim()) {
      alert('Nhập tên đi bạn ơi!');
      return;
    }

    setIsSpinning(true);
    setCurrentPhase('spinning');
    playSpinSound();

    setTimeout(() => {
      const result = performSpin(userName.trim());

      setDisplayValue(result.displayValue);
      setRealValue(result.realValue);
      setScenario(result.scenario);

      if (result.isEmpty) {
        handleEmptyScenario();
      } else if (result.isTroll) {
        handleTrollScenario(result.displayValue, result.realValue);
      } else {
        handleNormalScenario(result.realValue);
      }
    }, 3000);
  };

  const handleEmptyScenario = () => {
    setCurrentPhase('result');
    playFailSound();
    setTimeout(() => {
      setIsSpinning(false);
    }, 3000);
  };

  const handleTrollScenario = (fakeValue: number, actualValue: number) => {
    setCurrentPhase('result');
    playWinSound();
    fireConfetti('high');

    setTimeout(() => {
      setCurrentPhase('troll');
      playFailSound();
    }, 2500);

    setTimeout(() => {
      setCurrentPhase('final');
      fireConfetti('low');
    }, 5000);

    setTimeout(() => {
      setIsSpinning(false);
      setCurrentPhase('idle');
    }, 8000);
  };

  const handleNormalScenario = (value: number) => {
    setCurrentPhase('result');

    if (value >= 200000) {
      playWinSound();
      fireConfetti('high');
    } else if (value === 10000) {
      playFailSound();
      fireConfetti('low');
    } else {
      playWinSound();
      fireConfetti('medium');
    }

    setTimeout(() => {
      setIsSpinning(false);
      setCurrentPhase('idle');
    }, 4000);
  };

  const getScenarioText = () => {
    if (currentPhase === 'result' && displayValue === 0) {
      return {
        title: '💔 HẾT TIỀN RỒI!',
        subtitle: 'Hệ thống xác nhận: Ví Duy chính thức về 0. Hẹn gặp lại Tết năm sau!',
        color: 'text-gray-400',
      };
    }

    if (currentPhase === 'result' && (scenario === 'troll_fake_to_real' || scenario === 'troll_from_queue')) {
      return {
        title: `🎉 TRÚNG ${formatMoney(displayValue)}!!!`,
        subtitle: 'Duy chính thức phá sản! Xin chúc mừng!!!',
        color: 'text-yellow-400',
      };
    }

    if (currentPhase === 'troll') {
      return {
        title: '⚠️ CẬP NHẬT KHẨN!',
        subtitle: `Update nóng: Duy kiểm tra lại số dư, thấy ví đang khóc. ${formatMoney(displayValue)} xin phép chỉnh nhẹ về ${formatMoney(realValue)} cho hợp phong thủy.`,
        color: 'text-red-500',
      };
    }

    if (currentPhase === 'final') {
      return {
        title: `Kết quả chính thức: ${formatMoney(realValue)}`,
        subtitle: 'Duy xin lỗi vì sự bất tiện này. (Nhưng không hoàn tiền đâu nhé!)',
        color: 'text-orange-400',
      };
    }

    if (currentPhase === 'result') {
      if (realValue >= 200000) {
        return {
          title: `🎊 TRÚNG TO ${formatMoney(realValue)}!!!`,
          subtitle: 'Duy đang khóc trong toilet! Xin chúc mừng!!!',
          color: 'text-yellow-400',
        };
      } else if (realValue === 10000) {
        return {
          title: `${formatMoney(realValue)}`,
          subtitle: '10k tuy ít nhưng chứa đựng tình cảm... và sự nghèo khó của Admin.',
          color: 'text-orange-400',
        };
      } else {
        return {
          title: `🎁 ${formatMoney(realValue)}`,
          subtitle: 'Chúc mừng! Lộc bất tận hưởng!',
          color: 'text-green-400',
        };
      }
    }

    return null;
  };

  const scenarioText = getScenarioText();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-800 to-red-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-6xl"
            initial={{ x: Math.random() * window.innerWidth, y: -100 }}
            animate={{
              y: window.innerHeight + 100,
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ left: Math.random() * 100 + '%' }}
          >
            {['🧧', '🎊', '🎉', '💰', '🏮'][Math.floor(Math.random() * 5)]}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8 z-10"
      >
        <h1 className="text-5xl md:text-7xl font-black text-yellow-400 mb-2 drop-shadow-lg">
          🧧 VÒNG QUAY LÌ XÌ TẾT 🧧
        </h1>
        <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
          Quay là có, ít hay nhiều là do... ngân quỹ của Duy.
        </p>
      </motion.div>

      {!isSpinning ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-black/40 backdrop-blur-lg border-4 border-yellow-400 rounded-2xl p-8 max-w-md w-full z-10"
        >
          <div className="mb-6">
            <label className="block text-yellow-400 font-bold mb-2 text-lg">
              Tên của bạn:
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nhập tên để nhận lì xì..."
              className="w-full bg-white/10 border-2 border-yellow-400 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-300 placeholder-white/50"
              disabled={isSpinning}
            />
          </div>

          <motion.button
            onClick={handleSpin}
            disabled={isSpinning}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-full text-red-900 font-black text-2xl py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              state.stealthTriggerActive
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-purple-500/50'
                : 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:shadow-yellow-400/50'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              QUAY NGAY!
              <Sparkles className="w-6 h-6" />
            </span>
          </motion.button>

          <p className="text-white/60 text-sm text-center mt-4">
            May mắn luôn đồng hành cùng bạn! (Hoặc không...)
          </p>

          {state.stealthTriggerActive && (
            <div className="mt-4 bg-purple-900/50 border border-purple-500 rounded-lg p-3">
              <p className="text-purple-300 text-xs text-center font-bold">
                ⚡ STEALTH MODE ACTIVE
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="z-10">
          <AnimatePresence mode="wait">
            {currentPhase === 'spinning' && (
              <motion.div
                key="spinning"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="relative"
              >
                <motion.div
                  className="flex justify-center overflow-hidden rounded-xl border-4 border-yellow-400 bg-black/50 h-40"
                  animate={{ y: [0, -1000] }}
                  transition={{ duration: 2.5, ease: 'easeInOut' }}
                >
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 30 }).map((_, i) => {
                      const denom = allDenoms[i % allDenoms.length];
                      return (
                        <motion.div
                          key={i}
                          className="w-40 h-24 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-white text-2xl"
                          style={{
                            backgroundColor: getBillColor(denom),
                            opacity: 0.9,
                          }}
                        >
                          {(denom / 1000).toFixed(0)}k
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>

                <motion.p
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-white text-2xl font-bold mt-6 text-center"
                >
                  Đang quay...
                </motion.p>
              </motion.div>
            )}

            {(currentPhase === 'result' || currentPhase === 'troll' || currentPhase === 'final') && scenarioText && (
              <motion.div
                key={currentPhase}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                className={`bg-black/60 backdrop-blur-lg border-4 rounded-2xl p-8 max-w-lg ${
                  currentPhase === 'troll' ? 'border-red-600 animate-pulse' : 'border-yellow-400'
                }`}
              >
                {currentPhase === 'troll' && (
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 0.2, repeat: 10 }}
                    className="flex justify-center mb-4"
                  >
                    <AlertCircle className="w-16 h-16 text-red-500" />
                  </motion.div>
                )}

                {currentPhase === 'result' && displayValue > 0 && (
                  <motion.div
                    animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="mb-6 flex justify-center"
                  >
                    <div
                      className="w-32 h-20 rounded-lg flex items-center justify-center font-bold text-white text-3xl shadow-lg"
                      style={{ backgroundColor: getBillColor(displayValue) }}
                    >
                      {(displayValue / 1000).toFixed(0)}k
                    </div>
                  </motion.div>
                )}

                <motion.h2
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`text-4xl md:text-5xl font-black ${scenarioText.color} text-center mb-4`}
                >
                  {scenarioText.title}
                </motion.h2>

                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white text-lg text-center leading-relaxed"
                >
                  {scenarioText.subtitle}
                </motion.p>

                {currentPhase === 'final' && realValue > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 text-center"
                  >
                    <div
                      className="inline-block px-8 py-4 rounded-full font-black text-3xl text-red-900 shadow-lg"
                      style={{ backgroundColor: getBillColor(realValue) }}
                    >
                      {formatMoney(realValue)}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 z-10 cursor-pointer"
        onClick={handleStealthTap}
      >
        <div className="text-center">
          <span className="text-6xl">🌸</span>
          <p className="text-white/30 hover:text-white/60 text-xs transition-colors mt-2">
            (Double-tap for stealth)
          </p>
          <a
            href="/admin-duy-only"
            className="text-white/30 hover:text-white/60 text-sm transition-colors block mt-2"
          >
            🔐 Admin Access
          </a>
        </div>
      </motion.div>
    </div>
  );
};
