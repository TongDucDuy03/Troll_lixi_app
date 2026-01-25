# Hướng dẫn tạo OG Image (Open Graph Image)

## Kích thước chuẩn
- **Width**: 1200px
- **Height**: 630px
- **Format**: JPG hoặc PNG
- **File name**: `og-image.jpg` hoặc `og-image.png`

## Nội dung nên có
1. **Tiêu đề**: "Lì Xì May Mắn"
2. **Mô tả ngắn**: "Vòng Quay Lì Xì Tết"
3. **Màu sắc**: Đỏ và vàng (màu Tết)
4. **Icon**: Phong bao lì xì 🧧
5. **Background**: Nền đỏ Tết với họa tiết

## Cách tạo

### Option 1: Dùng Canva
1. Tạo design mới: 1200x630px
2. Thêm text "Lì Xì May Mắn"
3. Thêm icon phong bao
4. Export as JPG
5. Đặt tên `og-image.jpg`
6. Copy vào thư mục `public/`

### Option 2: Dùng Figma/Photoshop
- Tạo canvas 1200x630px
- Design theo ý muốn
- Export JPG
- Đặt vào `public/og-image.jpg`

### Option 3: Dùng online tool
- https://www.canva.com/
- https://og-image.vercel.app/
- https://www.bannerbear.com/tools/open-graph-image-generator/

## Sau khi tạo xong
1. Đặt file vào thư mục `public/og-image.jpg`
2. Update URL trong `index.html`:
   ```html
   <meta property="og:image" content="https://your-domain.com/og-image.jpg" />
   ```
3. Rebuild và deploy

## Test OG Image
- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/
