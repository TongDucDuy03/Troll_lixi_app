# 📘 Hướng dẫn Docker cho Website - Từ A đến Z

## Mục lục
1. [Docker là gì?](#docker-là-gì)
2. [Cài đặt Docker](#cài-đặt-docker)
3. [Các khái niệm cơ bản](#các-khái-niệm-cơ-bản)
4. [Tạo Dockerfile](#tạo-dockerfile)
5. [Docker Compose](#docker-compose)
6. [Deploy lên Server](#deploy-lên-server)
7. [Best Practices](#best-practices)

---

## 🐳 Docker là gì?

**Docker** là công cụ để đóng gói ứng dụng và dependencies vào "container" - một môi trường chạy độc lập, có thể chạy ở bất kỳ đâu.

### Lợi ích:
- ✅ **Consistency**: Chạy giống nhau ở mọi môi trường
- ✅ **Isolation**: Mỗi app chạy riêng biệt, không ảnh hưởng nhau
- ✅ **Portability**: Build một lần, chạy mọi nơi
- ✅ **Scalability**: Dễ dàng scale up/down

---

## 📥 Cài đặt Docker

### Windows:
1. Download **Docker Desktop** từ [docker.com](https://www.docker.com/products/docker-desktop)
2. Cài đặt và restart máy
3. Mở Docker Desktop, đợi nó start

### Mac:
```bash
# Dùng Homebrew
brew install --cask docker

# Hoặc download từ docker.com
```

### Linux (Ubuntu/Debian):
```bash
# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Cài Docker Compose
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Kiểm tra cài đặt:
```bash
docker run hello-world
```
Nếu thấy "Hello from Docker!" → Đã cài đặt thành công! ✅

---

## 📚 Các khái niệm cơ bản

### 1. **Image (Hình ảnh)**
- Template để tạo container
- Giống như "class" trong OOP
- Ví dụ: `node:18`, `nginx:alpine`, `mongo:7`

### 2. **Container (Container)**
- Instance của image đang chạy
- Giống như "object" trong OOP
- Mỗi container là một process độc lập

### 3. **Dockerfile**
- File hướng dẫn build image
- Chứa các lệnh: FROM, COPY, RUN, CMD...

### 4. **Docker Compose**
- Tool để quản lý nhiều containers cùng lúc
- File `docker-compose.yml` định nghĩa services

### 5. **Volume**
- Lưu trữ data persistent (không mất khi container xóa)
- Có 2 loại: Named volume và Bind mount

### 6. **Network**
- Kết nối các containers với nhau
- Containers trong cùng network có thể giao tiếp

---

## 📝 Tạo Dockerfile

### Bước 1: Hiểu cấu trúc website của bạn

**Frontend (React/Vue/Angular):**
- Cần: Node.js để build → Nginx để serve

**Backend (Node.js/Python/PHP):**
- Cần: Runtime (Node/Python) → Chạy server

**Database:**
- Dùng official image (MongoDB, PostgreSQL, MySQL)

### Bước 2: Tạo Dockerfile cho Frontend

Tạo file `Dockerfile` trong thư mục root:

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files (để cache dependencies)
COPY package*.json ./

# Cài dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument (có thể thay đổi khi build)
ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

# Build app
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built files từ stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Giải thích:**
- **Multi-stage build**: Stage 1 build, Stage 2 serve (nhẹ hơn)
- **WORKDIR**: Thư mục làm việc trong container
- **COPY package*.json**: Copy trước để cache layer
- **ARG/ENV**: Environment variables
- **EXPOSE**: Port container lắng nghe
- **CMD**: Lệnh chạy khi container start

### Bước 3: Tạo Dockerfile cho Backend

Tạo file `server/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Chỉ cài production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
```

### Bước 4: Tạo .dockerignore

Tạo file `.dockerignore` (giống .gitignore):

```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
.DS_Store
dist
coverage
```

**Mục đích:** Loại trừ files không cần thiết → Build nhanh hơn, image nhỏ hơn

---

## 🐙 Docker Compose

### Bước 1: Tạo docker-compose.yml

Tạo file `docker-compose.yml` trong thư mục root:

```yaml
version: '3.8'

services:
  # Database
  mongodb:
    image: mongo:7
    container_name: myapp-mongodb
    restart: unless-stopped
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    networks:
      - app-network
    # Không expose port trong production (bảo mật)
    # ports:
    #   - "27017:27017"

  # Backend API
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: myapp-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/myapp?authSource=admin
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3001
    depends_on:
      - mongodb
    networks:
      - app-network
    # Không expose, chỉ accessible qua nginx
    # ports:
    #   - "3001:3001"

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${API_URL}
    container_name: myapp-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  mongodb_data:
```

### Giải thích từng phần:

#### **Services:**
Mỗi service = 1 container

```yaml
mongodb:
  image: mongo:7
```
- Dùng official MongoDB image version 7

```yaml
volumes:
  - mongodb_data:/data/db
```
- **Named volume**: Data persist ngay cả khi container xóa
- `mongodb_data` là tên volume (tự động tạo)

```yaml
environment:
  - MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
```
- Environment variables
- `${VAR}`: Lấy từ file `.env` hoặc system env

```yaml
depends_on:
  - mongodb
```
- Backend đợi MongoDB start xong mới start
- Đảm bảo thứ tự khởi động

```yaml
networks:
  - app-network
```
- Tất cả services trong cùng network
- Có thể giao tiếp qua tên service (ví dụ: `mongodb`, `backend`)

#### **Networks:**
```yaml
networks:
  app-network:
    driver: bridge
```
- Tạo network riêng cho các containers
- `bridge`: Default network driver

#### **Volumes:**
```yaml
volumes:
  mongodb_data:
```
- Định nghĩa named volume
- Data được lưu ở `/var/lib/docker/volumes/`

---

## 🚀 Deploy lên Server

### Bước 1: Chuẩn bị Server

**Trên Server (Linux):**

```bash
# SSH vào server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Cài Docker Compose
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Bước 2: Upload Code lên Server

**Option 1: Git (Khuyến nghị)**
```bash
cd /opt
git clone YOUR_REPO_URL myapp
cd myapp
```

**Option 2: SCP**
```bash
# Trên local machine
scp -r . root@YOUR_SERVER_IP:/opt/myapp
```

**Option 3: rsync**
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ root@YOUR_SERVER_IP:/opt/myapp/
```

### Bước 3: Tạo file .env.production

Trên server, tạo file `.env.production`:

```bash
cd /opt/myapp
nano .env.production
```

Nội dung:
```env
# MongoDB
MONGO_PASSWORD=your-strong-password-here

# Backend
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Frontend
API_URL=http://YOUR_SERVER_IP/api
# Hoặc nếu có domain:
# API_URL=https://yourdomain.com/api
```

**Lưu ý:**
- Đổi tất cả passwords thành mật khẩu mạnh
- `JWT_SECRET` nên dài ít nhất 32 ký tự
- Thay `YOUR_SERVER_IP` bằng IP thực của server

### Bước 4: Tạo docker-compose.prod.yml

Tạo file `docker-compose.prod.yml` (production version):

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: myapp-mongodb
    restart: unless-stopped
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    networks:
      - app-network
    # KHÔNG expose port trong production

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: myapp-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/myapp?authSource=admin
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb
    networks:
      - app-network
    # KHÔNG expose port

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${API_URL}
    container_name: myapp-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  mongodb_data:
```

**Khác biệt với development:**
- Không expose MongoDB port (bảo mật)
- Không expose Backend port (chỉ qua Nginx)
- Dùng env vars từ `.env.production`

### Bước 5: Build và chạy

```bash
# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
```

### Bước 6: Cấu hình Firewall

```bash
# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS (nếu dùng SSL)
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## 🔧 Nginx Configuration

Tạo file `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Giải thích:**
- **`location /api`**: Proxy requests đến backend
- **`location /`**: Serve React app (SPA routing)
- **`try_files`**: Nếu file không tồn tại → serve `index.html`
- **Gzip**: Nén files để giảm bandwidth
- **Cache**: Cache static assets 1 năm

---

## 📋 Checklist từng bước

### ✅ Bước 1: Chuẩn bị
- [ ] Cài Docker và Docker Compose
- [ ] Test: `docker run hello-world`
- [ ] Có code website sẵn sàng

### ✅ Bước 2: Tạo Dockerfile
- [ ] Tạo `Dockerfile` cho frontend
- [ ] Tạo `server/Dockerfile` cho backend (nếu có)
- [ ] Tạo `.dockerignore`
- [ ] Test build local: `docker build -t myapp .`

### ✅ Bước 3: Tạo Docker Compose
- [ ] Tạo `docker-compose.yml` (development)
- [ ] Tạo `docker-compose.prod.yml` (production)
- [ ] Định nghĩa services: frontend, backend, database
- [ ] Setup networks và volumes

### ✅ Bước 4: Cấu hình Nginx
- [ ] Tạo `nginx.conf`
- [ ] Cấu hình reverse proxy cho API
- [ ] Cấu hình SPA routing
- [ ] Test local với `docker compose up`

### ✅ Bước 5: Deploy
- [ ] Setup server (cài Docker)
- [ ] Upload code lên server
- [ ] Tạo `.env.production` với passwords mạnh
- [ ] Build và start: `docker compose -f docker-compose.prod.yml up -d`
- [ ] Mở firewall ports 80, 443
- [ ] Test website hoạt động

---

## 🎯 Best Practices

### 1. **Security**
```yaml
# ❌ KHÔNG làm:
ports:
  - "27017:27017"  # Expose database ra ngoài

# ✅ Làm:
# Comment out ports trong production
# Chỉ expose frontend port
```

### 2. **Environment Variables**
```yaml
# ❌ KHÔNG hardcode:
environment:
  - PASSWORD=123456

# ✅ Dùng env file:
environment:
  - PASSWORD=${MONGO_PASSWORD}
```

### 3. **Multi-stage Build**
```dockerfile
# ✅ Giảm kích thước image
FROM node:18 AS builder
# ... build ...
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### 4. **Health Checks**
```dockerfile
# ✅ Monitor container health
HEALTHCHECK --interval=30s \
  CMD curl -f http://localhost:3001/health || exit 1
```

### 5. **Restart Policy**
```yaml
# ✅ Tự động restart nếu crash
restart: unless-stopped
```

### 6. **Volumes cho Data**
```yaml
# ✅ Persist data
volumes:
  - mongodb_data:/data/db
```

---

## 🔍 Troubleshooting

### Container không start:
```bash
# Check logs
docker compose logs backend

# Check container status
docker ps -a

# Restart service
docker compose restart backend
```

### Port đã được sử dụng:
```bash
# Check port usage
lsof -i :80
netstat -tulpn | grep :80

# Kill process
kill -9 PID
```

### Build lỗi:
```bash
# Build với --no-cache
docker compose build --no-cache

# Check Dockerfile syntax
docker build -t test .
```

### Database connection error:
```bash
# Check MongoDB logs
docker logs myapp-mongodb

# Test connection
docker exec -it myapp-mongodb mongosh -u admin -p
```

### Frontend không load:
```bash
# Check nginx logs
docker logs myapp-frontend

# Test nginx config
docker exec myapp-frontend nginx -t
```

---

## 📚 Commands Reference

### Docker cơ bản:
```bash
# Build image
docker build -t myapp .

# Run container
docker run -d -p 80:80 myapp

# View logs
docker logs container_name

# Stop container
docker stop container_name

# Remove container
docker rm container_name

# List images
docker images

# Remove image
docker rmi image_name
```

### Docker Compose:
```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart backend

# Rebuild và restart
docker compose up -d --build

# Check status
docker compose ps

# Remove everything (cẩn thận!)
docker compose down -v
```

### Maintenance:
```bash
# View resource usage
docker stats

# Clean up unused resources
docker system prune -a

# Backup volume
docker run --rm -v mongodb_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mongodb_backup.tar.gz /data

# Restore volume
docker run --rm -v mongodb_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/mongodb_backup.tar.gz -C /
```

---

## 🎓 Tóm tắt

### Quy trình cơ bản:

1. **Tạo Dockerfile** → Build image
2. **Tạo docker-compose.yml** → Orchestrate services
3. **Tạo .env.production** → Environment variables
4. **Build images** → `docker compose build`
5. **Start services** → `docker compose up -d`
6. **Monitor** → `docker compose logs -f`

### Lưu ý quan trọng:

- ✅ Luôn dùng `.env` cho sensitive data
- ✅ Không expose database port trong production
- ✅ Dùng health checks
- ✅ Backup volumes định kỳ
- ✅ Monitor logs thường xuyên

---

## 📖 Tài liệu tham khảo

- **Docker Official Docs**: https://docs.docker.com/
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **Best Practices**: https://docs.docker.com/develop/dev-best-practices/

---

**Chúc bạn deploy thành công! 🚀**
