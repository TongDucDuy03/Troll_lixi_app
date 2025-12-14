import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import confetti from 'canvas-confetti';
import { Sparkles, AlertCircle } from 'lucide-react';

const playSpinSound = () => {
  console.log('🎵 Spin sound playing...');
};

const playWinSound = () => {
  console.log('🎵 Win sound playing!');
};

const playFailSound = () => {
  console.log('🎵 Fail sound playing...');
};

export const SpinWheel = () => {
  const { performSpin } = useGame();
  const [userName, setUserName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'spinning' | 'result' | 'troll' | 'final'>('idle');
  const [displayValue, setDisplayValue] = useState<number>(0);
  const [realValue, setRealValue] = useState<number>(0);
  const [scenario, setScenario] = useState<string>('');

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

    if (currentPhase === 'result' && scenario === 'troll_fake_to_real') {
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
            className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 text-red-900 font-black text-2xl py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-yellow-400/50 transition-shadow"
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
        </motion.div>
      ) : (
        <div className="z-10">
          <AnimatePresence mode="wait">
            {currentPhase === 'spinning' && (
              <motion.div
                key="spinning"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 10, -10, 0],
                    scale: [1, 1.1, 0.9, 1.1, 0.9, 1],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="text-9xl"
                >
                  🧧
                </motion.div>
                <motion.p
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-white text-2xl font-bold mt-4 text-center"
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

                {currentPhase === 'result' && displayValue > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 text-center"
                  >
                    <div className="inline-block bg-gradient-to-r from-yellow-400 to-yellow-600 text-red-900 px-8 py-4 rounded-full font-black text-3xl">
                      {formatMoney(displayValue)}
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
        className="mt-8 z-10"
      >
        <a
          href="/admin-duy-only"
          className="text-white/30 hover:text-white/60 text-sm transition-colors"
        >
          🔐 Admin Access
        </a>
      </motion.div>
    </div>
  );
};
