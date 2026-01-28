import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useUser } from '../context/UserContext';
import { useAudio, SoundToggle } from '../context/AudioContext';
import confetti from 'canvas-confetti';
import { Sparkles, AlertCircle, LogOut, Copy, Check } from 'lucide-react';
import { ROLES, RoleId, ALL_DENOMINATIONS } from '../types';
import { DonateButton } from './DonateButton';

const getBillColor = (value: number): string => {
  const colors: { [key: number]: string } = {
    1000: '#FF6B6B',   // Light red
    2000: '#4ECDC4',   // Teal
    5000: '#95E1D3',   // Light green
    10000: '#8B4513',  // Brown
    20000: '#4169E1',  // Blue
    50000: '#FF1493',  // Pink
    100000: '#228B22', // Green
    200000: '#FF6347', // Tomato
    500000: '#00CED1', // Dark turquoise
  };
  return colors[value] || '#FFD700';
};

export const SlotMachine = ({ isSharedMode = false }: { isSharedMode?: boolean } = {}) => {
  const { performSpin, userName: contextUserName } = useGame();
  const { signOut, user } = useUser();
  const { play, playLoop, stop, stopLoop, unlock } = useAudio();
  const [userName, setUserName] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleId | ''>('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'spinning' | 'result' | 'troll' | 'final' | 'respin_spinning'>('idle');
  const [displayValue, setDisplayValue] = useState<number>(0);
  const [realValue, setRealValue] = useState<number>(0);
  const [scenario, setScenario] = useState<string>('');
  const [reSpinFirstPrize, setReSpinFirstPrize] = useState<number>(0);
  const [reSpinFinalPrize, setReSpinFinalPrize] = useState<number>(0);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [revealTime, setRevealTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [currentWish, setCurrentWish] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const copyToClipboard = async (text: string) => {
    // Preferred modern API (only works in secure contexts + allowed permissions)
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback for environments where navigator.clipboard is undefined (or blocked)
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!ok) throw new Error('execCommand(copy) failed');
  };

  const WISHES = [
    "hay ăn chóng lớn",
    "tiền vào như nước",
    "sớm có người yêu",
    "học tập tốt, lao động tốt",
    "vạn sự như ý",
    "an khang thịnh vượng",
    "sức khỏe dồi dào",
    "lộc lá đầy nhà",
    "8386 nhé",
    "tình duyên phơi phới",
    "công việc thuận lợi",
    "đẹp trai/xinh gái hơn",
    "may mắn cả năm",
    "thành công rực rỡ",
    "luôn vui vẻ yêu đời",
    "sự nghiệp thăng tiến"
  ];


  // Load share link when user is available
  useEffect(() => {
    if (!isSharedMode && user) {
      const loadShareLink = async () => {
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) return;
          
          const userData = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }).then(res => res.json());
          
          if (userData.shareToken) {
            const shareUrl = `${window.location.origin}/share/${userData.shareToken}`;
            setShareLink(shareUrl);
          }
        } catch (error) {
          console.error('Error loading share link:', error);
        }
      };
      loadShareLink();
    }
  }, [user, isSharedMode]);

  // Vẽ lớp phủ NGAY khi vừa vào phase spinning/respin_spinning
  useEffect(() => {
    if ((currentPhase === 'spinning' || currentPhase === 'respin_spinning') && !scratchRevealed) {
      // Vẽ lớp phủ ngay khi phase bắt đầu (frame kế tiếp đảm bảo canvas đã mount)
      requestAnimationFrame(() => {
        initScratchCard(0); // targetValue không dùng, truyền gì cũng được
      });
    }
  }, [currentPhase, scratchRevealed]);

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

  // Reset tất cả state scratch card
  const resetScratchCardState = () => {
    setScratchRevealed(false);
    setScratchProgress(0);
    setRevealTime(null);
    setCountdown(0);
    setIsScratching(false);
    setDisplayValue(0);
    setRealValue(0);
    setCurrentResult(null);
  };


  // Scratch Card logic - vẽ lớp phủ ngay lập tức
  const initScratchCard = (targetValue: number) => {
    setScratchProgress(0);
    setScratchRevealed(false);
    
    // Reset canvas
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas size based on container (fixed size for consistency)
      const width = 384;
      const height = 224;
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas trước
        ctx.clearRect(0, 0, width, height);
        
        // Vẽ nền vàng với pattern
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FFA500');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Vẽ pattern chấm
        ctx.fillStyle = '#8B4513';
        for (let i = 0; i < width; i += 30) {
          for (let j = 0; j < height; j += 30) {
            if ((i + j) % 60 === 0) {
              ctx.beginPath();
              ctx.arc(i, j, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        
        // Vẽ text "Gãi để xem"
        ctx.fillStyle = '#8B4513';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧧 Gãi để xem 🧧', width / 2, height / 2);
        
        // Vẽ border
        ctx.strokeStyle = '#FF6347';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, width, height);
      }
    }
  };

  const handleScratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (scratchRevealed) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Tính scale để map từ screen coordinates sang canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x: number, y: number;
    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    
    // Vẽ vùng trong suốt (gãi) với brush
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Tính progress bằng cách sample một số điểm
    const sampleSize = 50;
    const stepX = canvas.width / sampleSize;
    const stepY = canvas.height / sampleSize;
    let transparentCount = 0;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < sampleSize; i++) {
      for (let j = 0; j < sampleSize; j++) {
        const px = Math.floor(i * stepX);
        const py = Math.floor(j * stepY);
        const idx = (py * canvas.width + px) * 4;
        if (imageData.data[idx + 3] === 0) {
          transparentCount++;
        }
      }
    }
    
    const progress = (transparentCount / (sampleSize * sampleSize)) * 100;
    setScratchProgress(progress);
    
    // Audio: SCRATCH_START (throttled)
    if (!scratchRevealed) {
      play('scratch', { priority: 0 });
    }
    
    // Nếu gãi > 85%, reveal kết quả (phải gãi gần hết)
    if (progress > 85 && !scratchRevealed) {
      setScratchRevealed(true);
      setRevealTime(Date.now());
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      
      // Audio: SCRATCH_COMPLETE
      if (currentResult?.isEmpty || currentResult?.realValue === 0) {
        play('fail_bop', { priority: 2 });
      } else {
        fireConfetti('high');
        play('confetti_pop', { priority: 3 });
        play('short_fanfare', { priority: 3, debounceMs: 300 });
      }
    }
  };

  // Countdown timer sau khi reveal
  useEffect(() => {
    if (scratchRevealed && revealTime) {
      const delay = 18000; // 18 giây delay
      const interval = setInterval(() => {
        const elapsed = Date.now() - revealTime;
        const remaining = Math.max(0, delay - elapsed);
        setCountdown(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
          // Xử lý kết quả sau delay
          if (currentResult?.requiresReSpin) {
            // Chỉ đánh dấu "được phép bấm" bằng countdown = 0
            setReSpinFirstPrize(currentResult.realValue);
            setCountdown(0);
            // Giữ nguyên màn scratch card để hiện nút QUAY TIẾP
          } else {
            // Không hiển thị màn hình kết quả, chỉ reset về idle sau countdown
    setTimeout(() => {
      setIsSpinning(false);
      setCurrentPhase('idle');
              resetScratchCardState();
            }, 500);
          }
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [scratchRevealed, revealTime, currentResult]);

  // Reset state khi user thay đổi tên hoặc role (chuẩn bị cho lượt quay mới)
  useEffect(() => {
    if (currentPhase === 'idle' && (userName || selectedRole)) {
      // Chỉ reset nếu đang ở idle và có input
      // Không reset nếu đang trong quá trình quay
    }
  }, [userName, selectedRole, currentPhase]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    handleScratch(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isScratching) {
      handleScratch(e);
    }
  };

  const handleMouseUp = () => {
    setIsScratching(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    handleScratch(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isScratching) {
      handleScratch(e);
    }
  };

  const handleTouchEnd = () => {
    setIsScratching(false);
  };

  const handleSpin = async (isReSpin: boolean = false) => {
    // Prevent multiple simultaneous spins
    if (isSpinning) {
      return;
    }

    if (!isReSpin && !userName.trim()) {
      alert('Nhập tên đi bạn ơi!');
      return;
    }

    if (!isReSpin && !selectedRole) {
      alert('Chọn vai trò của bạn!');
      return;
    }

    // Set spinning state FIRST to prevent duplicate calls
    setIsSpinning(true);

    // RESET tất cả state scratch card khi bắt đầu lượt quay mới
    resetScratchCardState();
    
    // Chọn lời chúc ngẫu nhiên
    const randomWish = WISHES[Math.floor(Math.random() * WISHES.length)];
    setCurrentWish(randomWish);

    // BƯỚC 1: Tính kết quả TRƯỚC KHI hiển thị scratch card
    const roleId = (isReSpin ? selectedRole : selectedRole) as RoleId;
    const result = performSpin(userName.trim(), roleId);
    setCurrentResult(result);
    
    // Kiểm tra lỗi budget hết
    if (result.errorMessage) {
      alert(result.errorMessage);
      setIsSpinning(false); // Reset spinning state on error
      return;
    }

    // BƯỚC 2: Hiển thị Scratch Card
    setCurrentPhase(isReSpin ? 'respin_spinning' : 'spinning');
    
    // Audio: SPIN_START
    unlock(); // Ensure audio is unlocked
    play('whoosh', { priority: 2 });
    playLoop('spin_loop', { priority: 0 });

    // Khởi tạo scratch card với kết quả
    setTimeout(() => {
      // Luôn hiển thị scratch card cho mọi trường hợp (bao gồm cả hết tiền và troll)
      setDisplayValue(result.displayValue);
      setRealValue(result.realValue);
      setScenario(result.scenario);
      
      // Audio: Stop spin loop, play result reveal
      stopLoop('spin_loop');
      if (result.isEmpty || result.realValue === 0) {
        play('fail_bop', { priority: 2 });
      } else {
        play('win_jingle', { priority: 3 });
        play('reveal_ting', { priority: 2, debounceMs: 200 });
      }
    }, 500);
  };




  return (
    <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-800 to-red-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Sound Toggle - Top Right */}
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+0.5rem)] right-2 sm:top-4 sm:right-4 z-20">
        <SoundToggle className="px-2.5 py-2 sm:px-4 sm:py-2" />
      </div>

      {/* Donate Button - Bottom Left */}
      <DonateButton />

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
        <h1
          className="font-black text-yellow-400 mb-2 drop-shadow-lg whitespace-nowrap leading-none mx-auto max-w-full"
          style={{ fontSize: 'clamp(28px, 7vw, 72px)' }}
        >
          🧧 Lì Xì May Mắn 🧧
        </h1>
        <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
          Quay là có, ít hay nhiều là do... ngân quỹ của {contextUserName}.
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
              onChange={(e) => {
                setUserName(e.target.value);
                // Reset state khi user thay đổi tên (chuẩn bị cho lượt quay mới)
                if (currentPhase === 'idle') {
                  resetScratchCardState();
                }
              }}
              placeholder="Nhập tên để nhận lì xì..."
              className="w-full bg-gray-900 border-2 border-yellow-400 rounded-lg px-4 py-3 text-yellow-400 text-lg font-bold focus:outline-none focus:border-yellow-300 placeholder-yellow-400/60"
              disabled={isSpinning}
            />
          </div>

          <div className="mb-6">
            <label className="block text-yellow-400 font-bold mb-2 text-lg">
              Mối quan hệ:
            </label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value as RoleId | '');
                // Reset state khi user thay đổi role (chuẩn bị cho lượt quay mới)
                if (currentPhase === 'idle') {
                  resetScratchCardState();
                }
              }}
              className="w-full bg-gray-900 border-2 border-yellow-400 rounded-lg px-4 py-3 text-yellow-400 text-lg font-bold focus:outline-none focus:border-yellow-300"
              style={{ color: '#FACC15' }}
              disabled={isSpinning}
            >
              <option value="" style={{ backgroundColor: '#111827', color: '#FACC15' }}>
                -- Chọn vai trò --
              </option>
              {ROLES.map((role) => (
                <option 
                  key={role.id} 
                  value={role.id}
                  style={{ backgroundColor: '#111827', color: '#FACC15' }}
                >
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <motion.button
            onClick={async () => {
              await unlock(); // Unlock audio on first user interaction
              handleSpin(false);
            }}
            disabled={isSpinning}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full text-red-900 font-black text-2xl py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:shadow-yellow-400/50"
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

          {/* Share Link Section */}
          {!isSharedMode && shareLink && (
            <div className="mt-4 p-4 bg-yellow-900/30 border-2 border-yellow-500 rounded-lg">
              <p className="text-yellow-400 text-sm font-bold mb-2 text-center">
                🔗 Chia sẻ link quay lì xì
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="w-full sm:flex-1 min-w-0 bg-gray-900 border-2 border-yellow-400 rounded-lg px-3 py-2 text-yellow-400 text-xs sm:text-sm font-mono overflow-hidden text-ellipsis"
                />
                <button
                  onClick={async () => {
                    try {
                      await copyToClipboard(shareLink);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    } catch (error) {
                      console.error('Failed to copy:', error);
                    }
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-red-900 font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Đã copy!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-yellow-300/70 text-xs text-center mt-2">
                Gửi link này cho người thân để họ quay vào ngân quỹ của bạn
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="z-10">
          <AnimatePresence mode="wait">
            {(currentPhase === 'spinning' || currentPhase === 'respin_spinning') && (
              <motion.div
                key="scratch-card"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 10 }}
                className="relative flex flex-col items-center"
              >
                <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 shadow-2xl border-4 border-yellow-400">
                  <h2 className="text-yellow-400 text-2xl font-black text-center mb-4">
                    🧧 Scratch Card Lì Xì 🧧
                  </h2>
                  
                  {/* Scratch Card */}
                  <div className="relative">
                    {/* Background với số tiền - Gradient với hiệu ứng ánh kim */}
                    <div 
                      className="w-80 h-48 md:w-96 md:h-56 rounded-xl flex items-center justify-center border-4 border-yellow-400 shadow-xl"
                      style={{
                        background: `
                          linear-gradient(135deg,
                            ${getBillColor(realValue)} 0%,
                            rgba(255, 255, 255, 0.2) 45%,
                            ${getBillColor(realValue)} 100%
                          )
                        `,
                        boxShadow: `
                          0 0 20px ${getBillColor(realValue)}80,
                          inset 0 0 30px rgba(255, 255, 255, 0.1)
                        `,
                      }}
                    >
                      <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-white font-black text-4xl md:text-5xl drop-shadow-2xl"
              >
                          {formatMoney(realValue)}
                          {/* Hiển thị "+ 1 lượt quay miễn phí" ngay trên scratch card nếu là 1k hoặc 2k */}
                          {currentResult?.requiresReSpin && (realValue === 1000 || realValue === 2000) && (
                            <motion.span
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 }}
                              className="block text-yellow-300 text-xl md:text-2xl mt-2 font-bold"
                            >
                              + 1 lượt quay gỡ 🎁
                            </motion.span>
                          )}
                        </motion.div>
                        <p className="text-white/90 text-lg mt-2 font-bold px-2 leading-relaxed">
                          Chúc mừng năm mới, {userName}.<br/>
                          Chúc {userName} {currentWish}! 🎉
                        </p>
                      </div>
                    </div>
                    
                    {/* Canvas overlay để gãi - LUÔN LUÔN render để che số tiền */}
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 rounded-xl cursor-grab active:cursor-grabbing touch-none"
                          style={{
                        width: '100%', 
                        height: '100%',
                        maxWidth: '384px',
                        maxHeight: '224px',
                        // Khi reveal thì cho click xuyên + ẩn canvas
                        pointerEvents: scratchRevealed ? 'none' : 'auto',
                        opacity: scratchRevealed ? 0 : 1,
                          }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    />
                  </div>
                  
                  {!scratchRevealed && (
                    <p className="text-yellow-300 text-center mt-4 text-sm font-bold">
                      👆 Gãi bằng chuột hoặc ngón tay để xem kết quả! 
                      {scratchProgress > 0 && (
                        <span className="block mt-1">
                          Đã gãi: {Math.floor(scratchProgress)}% - Còn: {Math.ceil(85 - scratchProgress)}%
                        </span>
                      )}
                    </p>
                  )}
                  
                  {scratchProgress > 0 && !scratchRevealed && (
                    <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
              <motion.div
                        className="bg-yellow-400 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${scratchProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                  </div>
                )}

                  {scratchRevealed && (
                  <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 text-center"
                  >
                      {currentResult?.requiresReSpin ? (
                        <>
                          <p className="text-yellow-400 text-xl font-black mb-2">
                            🎉 Chúc mừng {userName}!
                          </p>

                          <p className="text-white text-lg font-bold">
                            Bạn nhận được{' '}
                            <span className="text-yellow-400">{formatMoney(currentResult.realValue)}</span>
                            {' '}+{' '}
                            <span className="text-yellow-400">1 lượt quay miễn phí</span>!
                          </p>

                          {countdown > 0 ? (
                <motion.p
                              key={countdown}
                              initial={{ scale: 1.25 }}
                              animate={{ scale: 1 }}
                              className="text-white text-2xl font-black mt-2"
                >
                              Mở quay tiếp sau: {countdown}s
                </motion.p>
                          ) : (
                            <motion.button
                              onClick={async () => {
                                await unlock();
                                handleSpin(true);
                              }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="mt-4 w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black text-xl py-4 rounded-xl shadow-lg transition-all"
                            >
                              <span className="flex items-center justify-center gap-2">
                                <Sparkles className="w-6 h-6" />
                                QUAY TIẾP
                                <Sparkles className="w-6 h-6" />
                              </span>
                            </motion.button>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-yellow-400 text-xl font-black mb-2">
                            🎉 Đã gãi xong rồi {userName} ơi!
                          </p>
                          {countdown > 0 && (
                            <motion.p
                              key={countdown}
                              initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                              className="text-white text-2xl font-black"
                            >
                              Tiếp tục sau: {countdown}s
                            </motion.p>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                    </div>
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
        <div className="text-center">
          <span className="text-6xl">🌸</span>
          <div className="flex flex-col items-center gap-2 mt-2">
            {!isSharedMode && (
              <>
          <a
                  href="/admin"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/admin');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-white/30 hover:text-white/60 text-sm transition-colors"
          >
            🔐 Admin Access
          </a>
                <button
                  onClick={async () => {
                    await signOut();
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="flex items-center gap-1 text-white/30 hover:text-white/60 text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
