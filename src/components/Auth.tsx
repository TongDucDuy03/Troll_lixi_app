import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { Sparkles, Mail, Lock, User } from 'lucide-react';

export const Auth = () => {
  const { signUp, signIn } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        if (!displayName.trim()) {
          setError('Vui lòng nhập tên hiển thị!');
          setLoading(false);
          return;
        }
        result = await signUp(email, password, displayName);
      }

      if (result.error) {
        setError(result.error.message || 'Có lỗi xảy ra!');
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-800 to-red-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-black/60 backdrop-blur-lg border-4 border-yellow-400 rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-yellow-400 mb-2">
            🧧 Lì Xì May Mắn 🧧
          </h1>
          <p className="text-white/80 text-sm">
            {isLogin ? 'Đăng nhập để bắt đầu' : 'Tạo tài khoản mới'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-yellow-400 font-bold mb-2 text-sm">
                <User className="inline w-4 h-4 mr-1" />
                Tên hiển thị
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Tên của bạn"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-yellow-400 font-bold mb-2 text-sm">
              <Mail className="inline w-4 h-4 mr-1" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="email@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-yellow-400 font-bold mb-2 text-sm">
              <Lock className="inline w-4 h-4 mr-1" />
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border-2 border-red-500 rounded-lg p-3 text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 text-red-900 font-black text-xl py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-yellow-400/50"
          >
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              {loading ? 'Đang xử lý...' : isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'}
              <Sparkles className="w-6 h-6" />
            </span>
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setEmail('');
              setPassword('');
              setDisplayName('');
            }}
            className="text-yellow-400 hover:text-yellow-300 text-sm font-bold transition-colors"
          >
            {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
