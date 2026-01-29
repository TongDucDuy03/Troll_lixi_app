import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

type HelpButtonProps = {
  isSharedMode?: boolean;
  className?: string;
};

export const HelpButton: React.FC<HelpButtonProps> = ({ isSharedMode = false, className = '' }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-lg border border-yellow-400 sm:border-2 rounded-lg w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2 transition-all ${className}`}
        aria-label="Hướng dẫn sử dụng"
        title="HDSD"
      >
        <HelpCircle className="w-5 h-5 text-yellow-400" />
        <span className="hidden sm:inline text-yellow-400 font-bold text-sm ml-2">HDSD</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-2rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 overflow-y-auto max-h-[calc(100vh-2rem-4.25rem)]">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Đóng hướng dẫn"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-start gap-3 pr-8">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 text-red-900 flex items-center justify-center font-black text-xl">
                  ?
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-black text-lg leading-snug">Hướng dẫn sử dụng</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Nhanh gọn trong 20 giây là chơi được.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-800">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="font-bold">1) Nhập tên + chọn vai</p>
                  <p className="text-gray-700 mt-1">
                    Điền <b>Tên của bạn</b> và chọn <b>Mối quan hệ</b> (role).
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="font-bold">2) Bấm “QUAY NGAY!”</p>
                  <p className="text-gray-700 mt-1">
                    Hệ thống sẽ quay ra kết quả và hiện thẻ cào.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="font-bold">3) Gãi thẻ để nhận</p>
                  <p className="text-gray-700 mt-1">
                    Dùng ngón tay/chuột gãi đến khi mở hết. Có thể có confetti 🎉
                  </p>
                </div>

                {!isSharedMode && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="font-bold">4) Chia sẻ link cho người khác quay</p>
                    <p className="text-gray-700 mt-1">
                      Bấm <b>Copy</b> để gửi link cho người thân quay vào “ngân quỹ” của bạn.
                    </p>
                  </div>
                )}

                {!isSharedMode && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="font-bold">Admin (chỉ màn chính)</p>
                    <p className="text-gray-700 mt-1">
                      Ở cuối màn hình có <b>🔐 Admin Access</b> → nhập PIN để vào quản trị.
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-gray-700 space-y-1">
                      <li>
                        <b>Budget</b>: nhập số tờ ban đầu cho từng mệnh giá / từng role.
                      </li>
                      <li>
                        <b>Reset theo role</b>: chỉ reset khi role đó <b>chưa có lượt quay</b>.
                      </li>
                      <li>
                        <b>Reset Tất Cả</b>: đưa mọi thứ về 0 và xoá toàn bộ lịch sử.
                      </li>
                      <li>
                        <b>Force</b> (nếu bật): ép mệnh giá cho lượt quay kế tiếp.
                      </li>
                      <li>
                        <b>Tắt Force về Random</b>: vào tab <b>😇 Honest</b> rồi bấm <b>APPLY</b> để chuyển lại quay ngẫu nhiên.
                      </li>
                    </ul>
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="font-bold">Mẹo nhỏ</p>
                  <ul className="list-disc pl-5 mt-1 text-gray-700 space-y-1">
                    <li>Nút <b>Sound</b> ở góc phải để bật/tắt âm thanh.</li>
                    <li>Nếu hết budget của role, hệ thống sẽ báo để bạn nạp thêm.</li>
                    <li>Nút <b>Donate</b> (góc trái) là tuỳ tâm ủng hộ dev.</li>
                  </ul>
                </div>
              </div>
              </div>

              {/* Sticky footer button for small screens */}
              <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-black shadow-lg transition"
                  onClick={() => setOpen(false)}
                >
                  Đã hiểu ✅
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

