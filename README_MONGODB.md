# Hướng dẫn Setup MongoDB Backend

## Bước 1: Cài đặt MongoDB Local

### Windows:
1. Download MongoDB Community Server từ [mongodb.com](https://www.mongodb.com/try/download/community)
2. Cài đặt và chạy MongoDB service
3. MongoDB sẽ chạy tại `mongodb://localhost:27017`

### Mac (Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux:
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# Start service
sudo systemctl start mongod
```

## Bước 2: Setup Backend Server

1. Vào thư mục `server`:
```bash
cd server
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/lixi-app
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=3001
```

4. Chạy server:
```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3001`

## Bước 3: Setup Frontend

1. Tạo file `.env` trong thư mục root:
```env
VITE_API_URL=http://localhost:3001/api
```

2. Chạy frontend:
```bash
npm run dev
```

## Bước 4: Deploy lên Server (Sau này)

### Option 1: MongoDB Atlas (Cloud)
1. Tạo account tại [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Tạo cluster và lấy connection string
3. Update `MONGODB_URI` trong `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lixi-app
```

### Option 2: Self-hosted MongoDB
1. Cài MongoDB trên server của bạn
2. Update `MONGODB_URI` trong `.env`:
```env
MONGODB_URI=mongodb://your-server-ip:27017/lixi-app
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `PUT /api/auth/profile` - Cập nhật profile

### Game
- `GET /api/game/state` - Lấy game state
- `PUT /api/game/state` - Cập nhật game state
- `POST /api/game/spin-history` - Lưu spin history
- `GET /api/game/spin-history` - Lấy spin history

## Database Structure

### Collections:
- `users` - Thông tin user (email, password, displayName)
- `gamestates` - Game state của mỗi user (roleInventories, riggingConfig)
- `spinhistories` - Lịch sử quay của mỗi user

## Troubleshooting

### MongoDB không kết nối được:
- Kiểm tra MongoDB service đã chạy chưa
- Kiểm tra `MONGODB_URI` trong `.env` đúng chưa
- Kiểm tra firewall/port 27017

### API không hoạt động:
- Kiểm tra server đã chạy chưa (`npm run dev` trong thư mục server)
- Kiểm tra `VITE_API_URL` trong frontend `.env`
- Kiểm tra CORS settings trong `server.js`
