# 🚀 Deployment Guide - Inventory Management System

Panduan lengkap untuk deployment frontend dan backend Inventory Management System.

## 📋 Daftar Isi

1. [Persiapan](#persiapan)
2. [Deployment dengan Docker](#deployment-dengan-docker)
3. [Deployment Manual](#deployment-manual)
4. [Konfigurasi Production](#konfigurasi-production)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 Persiapan

### Persyaratan Sistem

- **Node.js**: v18.x atau lebih tinggi
- **Docker**: v20.x atau lebih tinggi (untuk Docker deployment)
- **Docker Compose**: v2.x atau lebih tinggi
- **MongoDB Atlas** account (atau MongoDB lokal)
- **RAM**: Minimum 2GB
- **Disk**: Minimum 5GB free space

### 1. Clone Repository

```bash
git clone <repository-url>
cd Inventory-Management-System-Beta-1.2
```

### 2. Setup Environment Variables

#### Root Directory (.env)

```bash
cp .env.example .env
```

Edit `.env` dan sesuaikan:
```env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password
BACKEND_PORT=3001
FRONTEND_HTTP_PORT=80
VITE_API_BASE_URL=http://YOUR_SERVER_IP:3001/api
```

#### Backend (.env.local)

```bash
cd inventory-backend
cp .env.production .env.local
```

Edit `inventory-backend/.env.local`:
```env
# MongoDB Atlas URI (PENTING!)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory_system

# JWT Secret (HARUS DIGANTI!)
JWT_SECRET=your_very_secure_random_string_min_32_characters

# CORS Origins
CORS_ORIGINS=http://YOUR_SERVER_IP,https://YOUR_DOMAIN
```

#### Frontend (.env.local)

```bash
cd inventory-frontend
cp .env.production .env.local
```

Edit `inventory-frontend/.env.local`:
```env
VITE_API_BASE_URL=http://YOUR_SERVER_IP:3001/api
```

**⚠️ Ganti `YOUR_SERVER_IP` dengan IP server Anda (contoh: 10.0.10.141)**

---

## 🐳 Deployment dengan Docker (Recommended)

### Quick Deploy (One Command)

```bash
chmod +x quick-deploy.sh
./quick-deploy.sh deploy
```

### Manual Docker Deployment

#### 1. Build Images

```bash
docker-compose build
```

#### 2. Start Services

```bash
docker-compose up -d
```

#### 3. Check Status

```bash
docker-compose ps
```

#### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

#### 5. Stop Services

```bash
docker-compose down
```

### Docker Commands Cheatsheet

```bash
# Restart services
docker-compose restart

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# View resource usage
docker stats

# Clean up (WARNING: removes volumes!)
docker-compose down -v
```

---

## 🛠️ Deployment Manual (Tanpa Docker)

### Backend Deployment

```bash
cd inventory-backend

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start production server
npm run start
```

Atau gunakan PM2 untuk production:

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "inventory-backend" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Frontend Deployment

```bash
cd inventory-frontend

# Install dependencies
npm ci --only=production

# Build for production
npm run build

# The dist/ folder contains production files
```

#### Serve Frontend dengan Nginx

1. Install Nginx:
```bash
sudo apt update
sudo apt install nginx
```

2. Copy files:
```bash
sudo cp -r dist/* /var/www/html/inventory/
```

3. Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/inventory
```

Paste configuration:
```nginx
server {
    listen 80;
    server_name your_domain_or_ip;
    root /var/www/html/inventory;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/inventory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Konfigurasi Production

### 1. MongoDB Atlas Setup

1. Login ke [MongoDB Atlas](https://cloud.mongodb.com)
2. Create cluster (M0 Free tier untuk testing)
3. Create database user
4. Add IP whitelist (0.0.0.0/0 untuk development, IP specific untuk production)
5. Get connection string
6. Update `MONGODB_URI` di `.env.local`

### 2. Security Checklist

- ✅ Change JWT_SECRET ke random string yang kuat
- ✅ Change semua default passwords
- ✅ Setup firewall rules
- ✅ Enable HTTPS/SSL
- ✅ Configure CORS dengan domain specific
- ✅ Setup rate limiting
- ✅ Regular security updates

### 3. SSL/HTTPS Setup

#### Menggunakan Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

#### Menggunakan Self-Signed Certificate (Development)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

### 4. Performance Optimization

#### Backend
- Enable gzip compression ✅
- Use connection pooling ✅
- Setup Redis caching ✅
- Monitor with PM2 or Docker stats

#### Frontend
- Enable production build optimizations ✅
- Configure CDN (optional)
- Enable service worker/PWA ✅
- Optimize images and assets

---

## 🔍 Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend health
curl http://localhost/health
```

### Logs Location

#### Docker:
```bash
docker-compose logs backend
docker-compose logs frontend
```

#### Manual:
- Backend: `inventory-backend/logs/app.log`
- Nginx: `/var/log/nginx/access.log` dan `error.log`

### Backup Strategy

#### Database Backup:
```bash
# MongoDB Atlas: Use automated backups
# Local MongoDB:
mongodump --uri="mongodb://admin:password@localhost:27017/inventory_system" --out=backup/
```

#### Application Backup:
```bash
tar -czf inventory-backup-$(date +%Y%m%d).tar.gz \
  inventory-backend/.env.local \
  inventory-frontend/.env.local \
  .env
```

---

## 🐛 Troubleshooting

### Backend tidak bisa connect ke MongoDB

**Solusi:**
1. Check MongoDB URI di `.env.local`
2. Verify MongoDB Atlas IP whitelist
3. Check MongoDB user credentials
4. Test connection:
```bash
cd inventory-backend
npm run test-db
```

### Frontend tidak bisa connect ke Backend

**Solusi:**
1. Check `VITE_API_BASE_URL` di frontend `.env.local`
2. Check CORS configuration di backend
3. Check firewall rules
4. Verify backend is running:
```bash
curl http://localhost:3001/api/health
```

### Docker build fails

**Solusi:**
1. Check Docker disk space: `docker system df`
2. Clean up: `docker system prune -a`
3. Check Docker logs: `docker-compose logs`
4. Rebuild with no cache: `docker-compose build --no-cache`

### Port already in use

**Solusi:**
```bash
# Check what's using the port
sudo lsof -i :3001
sudo lsof -i :80

# Kill process
sudo kill -9 <PID>

# Or change port in .env file
```

### Permission denied errors

**Solusi:**
```bash
# Fix file permissions
chmod +x deploy.sh
chmod +x quick-deploy.sh

# Fix folder permissions
sudo chown -R $USER:$USER .
```

---

## 📱 Access URLs

Setelah deployment berhasil:

- **Frontend**: `http://YOUR_SERVER_IP` atau `http://YOUR_DOMAIN`
- **Backend API**: `http://YOUR_SERVER_IP:3001`
- **API Health**: `http://YOUR_SERVER_IP:3001/api/health`
- **MongoDB**: `localhost:27017` (jika local) atau Atlas URL

### Default Credentials

**⚠️ HARUS DIGANTI setelah first login!**

- Username: `admin`
- Password: Check seeded data atau setup di database

---

## 🆘 Support & Resources

- **Documentation**: Lihat file `README.md`
- **MongoDB Atlas Setup**: `MONGODB_ATLAS_SETUP.md`
- **System Analysis**: `LAPORAN_ANALISIS_SYSTEM_INVENTORY.md`

---

## 📝 Production Checklist

Sebelum go-live:

- [ ] Environment variables configured
- [ ] MongoDB Atlas setup and tested
- [ ] JWT secret changed
- [ ] All default passwords changed
- [ ] CORS configured with specific origins
- [ ] SSL/HTTPS enabled
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Health checks working
- [ ] Load testing performed
- [ ] Security audit completed
- [ ] Documentation updated

---

## 🔄 Update & Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
./quick-deploy.sh deploy
```

### Database Migration

```bash
cd inventory-backend
npm run seed  # Reset database (WARNING: removes data!)
```

---

**Last Updated**: November 2025
**Version**: 1.2
