import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Heart, X, Copy, Check } from 'lucide-react';

// Thông tin chuyển khoản
const BANK_INFO = {
  name: 'TONG DUC DUY',
  accountNumber: '1907 0031 1400 12',
  bank: 'TECHCOMBANK',
  bankCode: 'TCB',
};

// Tạo nội dung QR code theo chuẩn VietQR
const generateVietQRContent = () => {
  // Sử dụng URL VietQR để tạo QR code chuẩn
  // Format: https://vietqr.io/transfer/{bankCode}/{accountNumber}
  const accountNumber = BANK_INFO.accountNumber.replace(/\s/g, '');
  return `https://vietqr.io/transfer/${BANK_INFO.bankCode}/${accountNumber}`;
};

export const DonateButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAccountNumber = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(BANK_INFO.accountNumber);
      } else {
        // Fallback cho trình duyệt cũ
        const textArea = document.createElement('textarea');
        textArea.value = BANK_INFO.accountNumber;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openBankApp = () => {
    // Deep link cho các app ngân hàng phổ biến ở Việt Nam
    const accountNumber = BANK_INFO.accountNumber.replace(/\s/g, '');
    
    // VietQR universal link - hoạt động tốt trên cả mobile và web
    const vietqrUrl = `https://vietqr.io/transfer/${BANK_INFO.bankCode}/${accountNumber}`;
    
    // Techcombank app deep link (cho mobile)
    const techcombankUrl = `techcombank://transfer?account=${accountNumber}&bank=${BANK_INFO.bankCode}`;
    
    // Kiểm tra nếu là mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Thử mở app Techcombank trước
      const link = document.createElement('a');
      link.href = techcombankUrl;
      link.target = '_blank';
      link.click();
      
      // Fallback sau 500ms nếu app không mở được
      setTimeout(() => {
        window.open(vietqrUrl, '_blank');
      }, 500);
    } else {
      // Trên web, mở VietQR
      window.open(vietqrUrl, '_blank');
    }
  };

  return (
    <>
      {/* Button ở góc trái màn hình - Nhấp nháy thu hút */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: [
            '0 0 0px rgba(236, 72, 153, 0.7)',
            '0 0 20px rgba(236, 72, 153, 0.9)',
            '0 0 30px rgba(236, 72, 153, 1)',
            '0 0 20px rgba(236, 72, 153, 0.9)',
            '0 0 0px rgba(236, 72, 153, 0.7)',
          ],
          scale: [1, 1.05, 1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed bottom-24 sm:bottom-4 left-2 sm:left-4 z-20 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white px-2.5 py-1.5 sm:px-4 sm:py-3 rounded-full shadow-2xl flex items-center gap-1.5 sm:gap-2 transition-all border-2 border-white/30 backdrop-blur-sm max-w-[calc(100vw-1rem)]"
        aria-label="Donate cho nhà phát triển"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Heart className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" />
        </motion.div>
        <span className="font-bold text-[11px] sm:text-sm whitespace-nowrap">
          <span className="hidden sm:inline">Donate cho nhà phát triển</span>
          <span className="sm:hidden">Donate</span>
        </span>
      </motion.button>

      {/* Modal/Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Đóng"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                  <Heart className="w-12 h-12 text-pink-500 mx-auto mb-2" fill="currentColor" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    Ủng hộ phát triển hệ thống
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Cảm ơn bạn đã ủng hộ! 💝
                  </p>
                </div>

                {/* Bank Info */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 mb-4 border-2 border-red-200">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600 mb-1">Quét mã để chuyển tiền đến</p>
                    <p className="text-xl font-bold text-gray-800">{BANK_INFO.name}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <p className="text-lg font-mono text-gray-700">{BANK_INFO.accountNumber}</p>
                      <button
                        onClick={copyAccountNumber}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                        aria-label="Sao chép số tài khoản"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{BANK_INFO.bank}</p>
                  </div>

                  {/* QR Code */}
                  <div className="bg-white rounded-lg p-4 flex justify-center mb-4">
                    <QRCodeSVG
                      value={generateVietQRContent()}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  {/* Bank Logo Placeholder */}
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span className="text-red-600 font-bold">VIETQR</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-700">{BANK_INFO.bank}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {/* Mobile: Mở app ngân hàng */}
                  <motion.button
                    onClick={openBankApp}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>Chuyển khoản ngay</span>
                    <Heart className="w-5 h-5" fill="currentColor" />
                  </motion.button>

                  {/* Copy Account Number */}
                  <motion.button
                    onClick={copyAccountNumber}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 text-green-500" />
                        <span>Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        <span>Sao chép số tài khoản</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Footer Note */}
                <p className="text-xs text-gray-500 text-center mt-4">
                  Quét mã QR hoặc chuyển khoản đến số tài khoản trên
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
