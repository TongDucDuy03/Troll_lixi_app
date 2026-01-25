# Giải thích chi tiết các file Docker

## 📁 Cấu trúc file Docker

```
Troll_lixi_app/
├── Dockerfile                    # Frontend container
├── server/
│   └── Dockerfile               # Backend container
├── docker-compose.yml           # Development setup
├── docker-compose.prod.yml      # Production setup
├── nginx.conf                   # Nginx config cho frontend
├── .dockerignore                # Files bỏ qua khi build
└── deploy.sh                    # Script tự động deploy
```

---

## 1. 📦 `Dockerfile` (Frontend)

### Mục đích:
Build React app và serve bằng Nginx

### Giải thích từng bước:

```dockerfile
FROM node:18-alpine AS builder
```
- **Base image**: Node.js 18 trên Alpine Linux (nhẹ)
- **AS builder**: Đặt tên stage này là "builder" (multi-stage build)

```dockerfile
WORKDIR /app
```
- Tạo và chuyển vào thư mục `/app` trong container

```dockerfile
COPY package*.json ./
RUN npm ci
```
- Copy `package.json` và `package-lock.json` trước
- Cài dependencies (cache layer riêng, build nhanh hơn khi code thay đổi)

```dockerfile
COPY . .
```
- Copy toàn bộ source code vào container

```dockerfile
ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL
```
- **ARG**: Build-time variable (truyền từ docker-compose)
- **ENV**: Runtime variable (dùng khi build)
- Cho phép thay đổi API URL khi build

```dockerfile
RUN npm run build
```
- Build React app → tạo thư mục `dist/`

```dockerfile
FROM nginx:alpine
```
- **Stage 2**: Bắt đầu từ image Nginx mới (không cần Node.js nữa)
- Giảm kích thước image cuối cùng

```dockerfile
COPY --from=builder /app/dist /usr/share/nginx/html
```
- Copy file đã build từ stage "builder" vào thư mục Nginx serve

```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
```
- Copy config Nginx vào container

```dockerfile
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
- Expose port 80
- Chạy Nginx ở foreground (không chạy background)

### Kết quả:
- Image nhẹ (chỉ có Nginx + static files)
- Không có Node.js trong production image
- Serve static files nhanh

---

## 2. 📦 `server/Dockerfile` (Backend)

### Mục đích:
Build và chạy Express API server

### Giải thích:

```dockerfile
FROM node:18-alpine
```
- Base image: Node.js 18 Alpine

```dockerfile
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
```
- Chỉ cài production dependencies (không cài devDependencies)
- Giảm kích thước và thời gian build

```dockerfile
COPY . .
```
- Copy source code backend

```dockerfile
EXPOSE 3001
```
- Expose port 3001 (API server)

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', ...)"
```
- **Health check**: Docker tự động check container có healthy không
- Mỗi 30s check một lần
- Nếu fail 3 lần liên tiếp → container bị đánh dấu unhealthy

```dockerfile
CMD ["node", "server.js"]
```
- Chạy server khi container start

---

## 3. 🐳 `docker-compose.prod.yml` (Production)

### Mục đích:
Orchestrate 3 services: MongoDB, Backend, Frontend

### Giải thích từng service:

#### **MongoDB Service:**

```yaml
mongodb:
  image: mongo:7
  container_name: lixi-mongodb
```
- Dùng MongoDB version 7 (official image)
- Tên container: `lixi-mongodb`

```yaml
restart: unless-stopped
```
- Tự động restart nếu container crash
- Không restart nếu bạn manually stop

```yaml
volumes:
  - mongodb_data:/data/db
  - ./mongodb-backup:/backup
```
- **`mongodb_data`**: Named volume (persistent data)
- **`./mongodb-backup`**: Bind mount (backup folder trên host)

```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME:-admin}
  MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
```
- Tạo admin user với password từ `.env.production`
- `${VAR:-default}`: Dùng default nếu VAR không có

```yaml
# ports:
#   - "27017:27017"
```
- **Commented out**: Không expose MongoDB ra ngoài (bảo mật)
- Chỉ accessible từ các container khác trong network

```yaml
healthcheck:
  test: echo 'db.runCommand("ping").ok' | mongosh ...
```
- Check MongoDB có healthy không
- Backend sẽ đợi MongoDB healthy mới start

#### **Backend Service:**

```yaml
backend:
  build:
    context: ./server
    dockerfile: Dockerfile
```
- Build từ thư mục `./server`
- Dùng `server/Dockerfile`

```yaml
environment:
  - MONGODB_URI=mongodb://admin:${MONGO_ROOT_PASSWORD}@mongodb:27017/lixi-app?authSource=admin
```
- Connection string đến MongoDB
- **`mongodb`**: Tên service (Docker tự resolve IP)
- **`authSource=admin`**: Authenticate với admin user

```yaml
depends_on:
  mongodb:
    condition: service_healthy
```
- Backend đợi MongoDB healthy mới start
- Tránh lỗi connection khi MongoDB chưa sẵn sàng

```yaml
# ports:
#   - "3001:3001"
```
- **Commented**: Không expose ra ngoài
- Chỉ accessible qua Nginx (reverse proxy)

#### **Frontend Service:**

```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile
    args:
      - VITE_API_URL=${VITE_API_URL}
```
- Build từ root directory
- Truyền `VITE_API_URL` vào build process

```yaml
ports:
  - "80:80"
  - "443:443"
```
- Expose port 80 (HTTP) và 443 (HTTPS)
- Port 80: map từ container → host

```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
```
- Mount SSL certificates (nếu có)
- **`:ro`**: Read-only

#### **Network & Volumes:**

```yaml
networks:
  lixi-network:
    driver: bridge
```
- Tạo network riêng cho các containers
- Containers có thể giao tiếp với nhau qua tên service

```yaml
volumes:
  mongodb_data:
```
- Named volume cho MongoDB data
- Data persist ngay cả khi container bị xóa

---

## 4. ⚙️ `nginx.conf` (Nginx Configuration)

### Mục đích:
Cấu hình Nginx để serve frontend và proxy API requests

### Giải thích:

```nginx
server {
    listen 80;
    server_name _;
```
- Listen trên port 80
- `_`: Accept mọi domain/IP

```nginx
root /usr/share/nginx/html;
index index.html;
```
- Thư mục chứa static files
- File mặc định: `index.html`

```nginx
gzip on;
gzip_vary on;
```
- **Gzip compression**: Nén files trước khi gửi
- Giảm bandwidth, tăng tốc độ load

```nginx
location /api {
    proxy_pass http://backend:3001;
```
- **Reverse proxy**: Mọi request `/api/*` → forward đến backend
- **`backend`**: Tên service trong Docker network

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```
- Forward thông tin client IP đến backend
- Backend biết được IP thật của user

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
- **SPA routing**: Nếu file không tồn tại → serve `index.html`
- Cho phép React Router hoạt động đúng

```nginx
location ~* \.(js|css|png|jpg|...)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```
- **Cache static assets**: Cache 1 năm
- Browser cache files, giảm requests

---

## 5. 🚀 `deploy.sh` (Deployment Script)

### Mục đích:
Script tự động deploy lên server

### Giải thích:

```bash
#!/bin/bash
set -e
```
- **Shebang**: Chạy bằng bash
- **`set -e`**: Exit ngay nếu có lỗi

```bash
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
```
- Load environment variables từ `.env.production`
- Bỏ qua dòng comment (bắt đầu bằng `#`)

```bash
docker compose -f docker-compose.prod.yml build
```
- Build Docker images

```bash
docker compose -f docker-compose.prod.yml up -d
```
- **`-d`**: Detached mode (chạy background)
- Start tất cả services

```bash
sleep 10
```
- Đợi 10s để services khởi động

```bash
docker compose -f docker-compose.prod.yml ps
```
- Hiển thị status của tất cả containers

---

## 6. 📝 `.dockerignore`

### Mục đích:
Loại trừ files không cần thiết khi build Docker image

### Files được ignore:
- `node_modules/` - Sẽ cài lại trong container
- `.env` - Không copy env files (dùng environment variables)
- `.git/` - Không cần git history
- `dist/` - Sẽ build lại trong container

### Lợi ích:
- Build nhanh hơn
- Image nhỏ hơn
- Bảo mật hơn (không copy sensitive files)

---

## 7. 🔄 `docker-compose.yml` vs `docker-compose.prod.yml`

### `docker-compose.yml` (Development):
- MongoDB expose port 27017 (để connect từ local)
- Backend expose port 3001 (để test trực tiếp)
- Default values cho env vars
- Dùng cho development/testing

### `docker-compose.prod.yml` (Production):
- MongoDB **KHÔNG** expose port (bảo mật)
- Backend **KHÔNG** expose port (chỉ qua Nginx)
- Yêu cầu env vars từ `.env.production`
- SSL volume mount cho HTTPS
- Dùng cho production server

---

## 🔄 Flow hoạt động:

```
User Request
    ↓
Port 80 (Frontend/Nginx)
    ↓
    ├─ /api/* → Proxy → Backend:3001 → MongoDB
    └─ /* → Serve static files từ /usr/share/nginx/html
```

---

## 📋 Commands thường dùng:

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down

# Rebuild và restart
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# Access MongoDB shell
docker exec -it lixi-mongodb mongosh -u admin -p
```

---

## 🎯 Tóm tắt:

1. **Dockerfile (Frontend)**: Build React → Serve bằng Nginx
2. **server/Dockerfile (Backend)**: Chạy Express API server
3. **docker-compose.prod.yml**: Orchestrate 3 services
4. **nginx.conf**: Reverse proxy + serve static files
5. **deploy.sh**: Script tự động deploy
6. **.dockerignore**: Loại trừ files không cần

Tất cả hoạt động cùng nhau để tạo một hệ thống production-ready! 🚀
