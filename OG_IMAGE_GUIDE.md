# Hướng dẫn tạo và sử dụng OG Image

## Vấn đề hiện tại
Khi share link, Facebook/Twitter/WhatsApp hiển thị hình mặc định của bolt.new thay vì hình của app.

## Giải pháp
Tạo file `og-image.jpg` và đặt vào thư mục `public/`

## Các bước

### 1. Tạo hình ảnh
- **Kích thước**: 1200x630px (tỷ lệ 1.91:1)
- **Format**: JPG hoặc PNG
- **Nội dung gợi ý**:
  - Tiêu đề: "Lì Xì May Mắn"
  - Phụ đề: "Vòng Quay Lì Xì Tết"
  - Màu: Đỏ và vàng (màu Tết)
  - Icon: Phong bao lì xì 🧧

### 2. Đặt tên file
- Tên file: `og-image.jpg` (hoặc `og-image.png`)
- Đặt vào: `public/og-image.jpg`

### 3. Công cụ tạo hình (miễn phí)
- **Canva**: https://www.canva.com/ (tạo design 1200x630px)
- **OG Image Generator**: https://og-image.vercel.app/
- **Bannerbear**: https://www.bannerbear.com/tools/open-graph-image-generator/

### 4. Test sau khi deploy
- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **LinkedIn**: https://www.linkedin.com/post-inspector/

Nhập URL của bạn và click "Scrape Again" để xem preview.

### 5. Lưu ý
- File phải có trong thư mục `public/` (Vite sẽ tự động copy vào `dist/`)
- Sau khi thêm file, cần rebuild: `npm run build`
- Nếu đã deploy, cần rebuild Docker image và redeploy

## Template nhanh với Canva
1. Vào https://www.canva.com/
2. Tạo design mới: Custom size 1200x630px
3. Background: Gradient đỏ (#B91C1C) sang đỏ đậm
4. Text: "Lì Xì May Mắn" - Font lớn, màu vàng (#FFD700)
5. Text nhỏ: "Vòng Quay Lì Xì Tết"
6. Thêm icon phong bao
7. Export as JPG
8. Đặt tên `og-image.jpg` và copy vào `public/`
