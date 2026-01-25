# Hướng dẫn Setup Multi-User Lì Xì App

## Bước 1: Tạo Supabase Project

1. Truy cập [Supabase](https://supabase.com) và đăng ký/đăng nhập
2. Tạo project mới
3. Lấy **URL** và **anon key** từ Settings > API

## Bước 2: Setup Environment Variables

Tạo file `.env` trong thư mục root:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Bước 3: Chạy SQL Schema

1. Vào Supabase Dashboard > SQL Editor
2. Copy toàn bộ nội dung từ file `supabase_schema.sql`
3. Paste và chạy (Run)

## Bước 4: Cài đặt và chạy

```bash
npm install
npm run dev
```

## Tính năng

✅ **Multi-User Authentication**
- Mỗi người đăng ký tài khoản riêng
- Đăng nhập/đăng xuất an toàn

✅ **Per-User Budget Management**
- Mỗi user tự cấu hình budget của mình
- Dữ liệu lưu riêng biệt trong Supabase

✅ **Dynamic User Names**
- Tất cả chỗ "Duy" được thay bằng tên user đăng nhập
- Tên hiển thị có thể tùy chỉnh

✅ **Secure Data Storage**
- Row Level Security (RLS) đảm bảo user chỉ thấy data của mình
- Tự động sync với Supabase

## Cấu trúc Database

- `user_profiles`: Thông tin user (tên, email)
- `user_game_states`: Budget và config của mỗi user
- `spin_history`: Lịch sử quay của mỗi user

## Lưu ý

- Mỗi user có budget riêng, không ảnh hưởng lẫn nhau
- Admin panel của mỗi user chỉ quản lý budget của chính họ
- Spin history được lưu riêng cho từng user
