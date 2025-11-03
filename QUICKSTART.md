# 🚀 Quick Start Guide

Panduan cepat untuk setup dan deploy Inventory Management System dalam 5 menit!

## ⚡ Super Quick Deploy (1 Command)

```bash
make init && make deploy
```

## 📝 Step by Step (Recommended)

### 1️⃣ Setup Environment (1 menit)

```bash
# Copy environment files
cp .env.example .env
cp inventory-backend/.env.example inventory-backend/.env.local
cp inventory-frontend/.env.example inventory-frontend/.env.local
```

**Edit files dengan konfigurasi Anda:**

**`.env`** - Root configuration
```env
VITE_API_BASE_URL=http://10.0.10.141:3001/api
```

**`inventory-backend/.env.local`** - Backend config
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/inventory_system
JWT_SECRET=your_random_secret_min_32_chars
```

### 2️⃣ Choose Deployment Method

#### Option A: Docker (Easiest) 🐳

```bash
# One command deployment
./quick-deploy.sh deploy

# Or step by step
docker-compose build
docker-compose up -d
```

**Access:**
- Frontend: http://10.0.10.141
- Backend: http://10.0.10.141:3001

#### Option B: Manual Deployment 🛠️

```bash
# Backend
cd inventory-backend
npm install
npm run build
npm start  # Or use PM2: pm2 start npm --name inventory-backend -- start

# Frontend
cd inventory-frontend
npm install
npm run build
# Serve dist/ with nginx or any web server
```

#### Option C: Production (PM2 + Nginx) 🚀

```bash
./production-deploy.sh
```

### 3️⃣ Verify Deployment ✅

```bash
# Health check
./health-check.sh

# Or manual check
curl http://localhost:3001/api/health
curl http://localhost
```

## 🎯 Makefile Commands

```bash
make help           # Show all available commands
make init           # Initial setup
make install        # Install dependencies
make build          # Build both apps
make dev            # Start in development mode
make deploy         # Deploy with Docker
make deploy-prod    # Production deployment
make health         # Run health checks
make logs           # View logs
make status         # Check service status
```

## 🔑 First Login

After deployment:

1. Access frontend: `http://YOUR_SERVER_IP`
2. Login with default credentials (check database seed)
3. **IMPORTANT**: Change admin password immediately!

## 📊 Monitoring

```bash
# Docker logs
docker-compose logs -f

# PM2 monitoring
pm2 monit
pm2 logs inventory-backend

# Health checks
make health
```

## 🆘 Quick Troubleshooting

### Backend tidak bisa connect ke MongoDB

```bash
# Test connection
cd inventory-backend
npm run test-db
```

**Solusi:**
- Check MongoDB URI di `.env.local`
- Verify MongoDB Atlas IP whitelist
- Check MongoDB Atlas credentials

### Port sudah digunakan

```bash
# Check what's using port 3001
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>
```

### Docker build gagal

```bash
# Clean dan rebuild
docker-compose down -v
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

### Permission denied

```bash
chmod +x *.sh
sudo chown -R $USER:$USER .
```

## 📚 More Information

- Full guide: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- System analysis: [LAPORAN_ANALISIS_SYSTEM_INVENTORY.md](LAPORAN_ANALISIS_SYSTEM_INVENTORY.md)
- MongoDB setup: [MONGODB_ATLAS_SETUP.md](MONGODB_ATLAS_SETUP.md)

## 🎉 That's It!

Your inventory system should now be running!

**Need help?** Check the full [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
