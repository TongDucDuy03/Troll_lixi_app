# Hướng dẫn Deploy lên Linode Server với Docker

## Bước 1: Chuẩn bị Server Linode

### 1.1. Tạo Linode Instance
1. Đăng nhập vào Linode Dashboard
2. Tạo Linode Instance:
   - **Image**: Ubuntu 22.04 LTS
   - **Region**: Chọn gần nhất
   - **Plan**: Tối thiểu 2GB RAM (khuyến nghị 4GB)
   - **Root Password**: Đặt mật khẩu mạnh

### 1.2. Setup Server ban đầu
```bash
# SSH vào server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

## Bước 2: Chuẩn bị Code trên Local

### 2.1. Tạo file `.env.production` trên server
```bash
# Tạo file .env.production
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-strong-mongodb-password-here
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
VITE_API_URL=http://YOUR_SERVER_IP/api
```

### 2.2. Build và test local (optional)
```bash
# Test build frontend
npm run build

# Test Docker build
docker compose build
docker compose up -d
```

## Bước 3: Upload Code lên Server

### Option 1: Sử dụng Git (Khuyến nghị)
```bash
# Trên server
cd /opt
git clone YOUR_REPO_URL lixi-app
cd lixi-app
```

### Option 2: Sử dụng SCP
```bash
# Trên local machine
scp -r . root@YOUR_SERVER_IP:/opt/lixi-app
```

### Option 3: Sử dụng rsync
```bash
# Trên local machine
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ root@YOUR_SERVER_IP:/opt/lixi-app/
```

## Bước 4: Deploy trên Server

### 4.1. SSH vào server
```bash
ssh root@YOUR_SERVER_IP
cd /opt/lixi-app
```

### 4.2. Tạo file `.env.production`
```bash
nano .env.production
```

Paste nội dung:
```env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-strong-mongodb-password-here
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
VITE_API_URL=http://YOUR_SERVER_IP/api
```

**Lưu ý**: Thay `YOUR_SERVER_IP` bằng IP thực của server.

### 4.3. Build và chạy Docker containers
```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
```

## Bước 5: Cấu hình Firewall

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

## Bước 6: Cấu hình Domain (Optional)

### 6.1. Point Domain về Server IP
- Vào DNS settings của domain
- Tạo A record: `@` -> `YOUR_SERVER_IP`
- Tạo A record: `www` -> `YOUR_SERVER_IP`

### 6.2. Update VITE_API_URL
```bash
# Sửa .env.production
VITE_API_URL=https://yourdomain.com/api
```

### 6.3. Rebuild frontend
```bash
docker compose -f docker-compose.prod.yml up -d --build frontend
```

## Bước 7: Setup SSL với Let's Encrypt (Optional nhưng khuyến nghị)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Update nginx.conf để dùng SSL
# (Cần cấu hình nginx.conf với SSL)
```

## Bước 8: Backup MongoDB

### 8.1. Tạo script backup
```bash
nano /opt/lixi-app/backup-mongodb.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec lixi-mongodb mongodump --out /backup/$DATE
docker exec lixi-mongodb tar czf /backup/mongodb_$DATE.tar.gz /backup/$DATE
```

```bash
chmod +x /opt/lixi-app/backup-mongodb.sh
```

### 8.2. Setup cron job (backup hàng ngày)
```bash
crontab -e
```

Thêm dòng:
```
0 2 * * * /opt/lixi-app/backup-mongodb.sh
```

## Bước 9: Monitoring và Maintenance

### 9.1. Xem logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f mongodb
```

### 9.2. Restart services
```bash
docker compose -f docker-compose.prod.yml restart
```

### 9.3. Update code
```bash
cd /opt/lixi-app
git pull  # Nếu dùng Git
docker compose -f docker-compose.prod.yml up -d --build
```

### 9.4. Check resource usage
```bash
docker stats
```

## Troubleshooting

### Container không start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check container status
docker ps -a
```

### MongoDB connection error
```bash
# Check MongoDB logs
docker logs lixi-mongodb

# Test connection
docker exec -it lixi-mongodb mongosh -u admin -p
```

### Frontend không load
```bash
# Check nginx logs
docker logs lixi-frontend

# Test nginx config
docker exec lixi-frontend nginx -t
```

### Port đã được sử dụng
```bash
# Check port usage
netstat -tulpn | grep :80
lsof -i :80

# Kill process nếu cần
kill -9 PID
```

## Security Checklist

- [ ] Đổi mật khẩu MongoDB mạnh
- [ ] Đổi JWT_SECRET mạnh (tối thiểu 32 ký tự)
- [ ] Setup firewall (chỉ mở port 80, 443)
- [ ] Setup SSL/HTTPS
- [ ] Không expose MongoDB port ra ngoài (đã comment trong docker-compose.prod.yml)
- [ ] Regular backup MongoDB
- [ ] Update system packages định kỳ
- [ ] Monitor logs thường xuyên

## Quick Commands Reference

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Access MongoDB shell
docker exec -it lixi-mongodb mongosh -u admin -p

# Backup MongoDB
docker exec lixi-mongodb mongodump --out /backup/$(date +%Y%m%d)

# Restore MongoDB
docker exec lixi-mongodb mongorestore /backup/YYYYMMDD
```
