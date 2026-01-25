# Quick Start - Deploy lên Linode

## Tóm tắt các bước

### 1. Trên Server Linode

```bash
# SSH vào server
ssh root@YOUR_SERVER_IP

# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose-plugin -y

# Clone hoặc upload code
cd /opt
git clone YOUR_REPO_URL lixi-app
cd lixi-app

# Tạo file .env.production
nano .env.production
```

Nội dung `.env.production`:
```env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-strong-password-here
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
VITE_API_URL=http://YOUR_SERVER_IP/api
```

### 2. Deploy

```bash
# Build và chạy
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
```

### 3. Mở Firewall

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 4. Truy cập

- Frontend: `http://YOUR_SERVER_IP`
- API: `http://YOUR_SERVER_IP/api/health`

## Update code sau này

```bash
cd /opt/lixi-app
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Backup MongoDB

```bash
docker exec lixi-mongodb mongodump --out /backup/$(date +%Y%m%d)
```

Xem file `DEPLOY.md` để biết chi tiết đầy đủ!
