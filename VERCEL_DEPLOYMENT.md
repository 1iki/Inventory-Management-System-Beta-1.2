# 🚀 Vercel Deployment Guide

Panduan deploy Inventory Management System ke Vercel.

## 📋 Persiapan

### 1. Buat Akun Vercel
1. Kunjungi https://vercel.com/signup
2. Sign up dengan GitHub account
3. Connect repository GitHub Anda

### 2. Install Vercel CLI (Sudah dilakukan)
```bash
npm install -g vercel
```

## 🔐 Login ke Vercel

```bash
vercel login
```

Pilih metode login (GitHub/Email/etc.)

## 🎯 Deployment Methods

### Method 1: Deploy via Vercel CLI (Manual)

#### Deploy Backend
```bash
cd inventory-backend
vercel
# Ikuti prompts:
# - Set up and deploy? Y
# - Which scope? [Your account]
# - Link to existing project? N
# - What's your project's name? inventory-backend
# - In which directory is your code located? ./
# - Want to override the settings? N
```

#### Deploy Frontend
```bash
cd inventory-frontend
vercel
# Ikuti prompts:
# - Set up and deploy? Y
# - Which scope? [Your account]
# - Link to existing project? N
# - What's your project's name? inventory-frontend
# - In which directory is your code located? ./
# - Want to override the settings? N
```

### Method 2: Deploy via Vercel Dashboard (Recommended)

#### Deploy Backend
1. Login ke https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import dari GitHub: `1iki/Inventory-Management-System-Beta-1.2`
4. Configure Project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `inventory-backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
5. Environment Variables (Add semua dari .env.local):
   ```
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=24h
   NODE_ENV=production
   CORS_ORIGINS=https://your-frontend-domain.vercel.app
   ```
6. Click "Deploy"

#### Deploy Frontend
1. Click "Add New" → "Project" lagi
2. Import same repository
3. Configure Project:
   - **Framework Preset**: Vite
   - **Root Directory**: `inventory-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Environment Variables:
   ```
   VITE_API_BASE_URL=https://your-backend-domain.vercel.app/api
   VITE_API_TIMEOUT=30000
   VITE_ENABLE_QR_SCANNER=true
   VITE_ENABLE_OFFLINE_MODE=true
   VITE_ENABLE_PWA=true
   ```
5. Click "Deploy"

## ⚙️ Environment Variables Setup

### Backend Environment Variables (Required)

Tambahkan di Vercel Dashboard → Project Settings → Environment Variables:

```env
# Database (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory_system

# Security (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=production
PORT=3001

# CORS (Update setelah deploy frontend)
CORS_ORIGINS=https://your-frontend.vercel.app,https://*.vercel.app

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=1800000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Database Settings
DB_NAME=inventory_system
DB_TIMEOUT=30000
DB_MAX_POOL_SIZE=10
```

### Frontend Environment Variables

```env
# API Configuration (Update setelah deploy backend)
VITE_API_BASE_URL=https://your-backend.vercel.app/api
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_ENABLE_QR_SCANNER=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PWA=true
VITE_ENABLE_PRELOADING=true
VITE_CHUNK_SIZE_WARNING_LIMIT=1000

# Security
VITE_ENABLE_CSP=true

# UI Configuration
VITE_DEFAULT_THEME=light
VITE_ENABLE_ANIMATIONS=true
VITE_PAGE_SIZE=20

# Notifications
VITE_TOAST_DURATION=4000
VITE_ENABLE_SOUND_NOTIFICATIONS=false

# Production Settings
VITE_AUTO_LOGIN=false
VITE_ENABLE_ANALYTICS=false
```

## 🔄 Update CORS Configuration

Setelah deploy, update CORS di backend:

1. Catat URL frontend: `https://your-frontend.vercel.app`
2. Catat URL backend: `https://your-backend.vercel.app`
3. Update backend environment variable `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://your-frontend.vercel.app,https://your-backend.vercel.app
   ```
4. Redeploy backend jika perlu

## 📝 Post-Deployment Steps

### 1. Update Frontend API URL
1. Go to frontend project settings
2. Update `VITE_API_BASE_URL` dengan URL backend
3. Redeploy frontend

### 2. Test Deployment
```bash
# Test backend
curl https://your-backend.vercel.app/api/health

# Test frontend (open in browser)
https://your-frontend.vercel.app
```

### 3. Configure Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add custom domain
3. Update DNS records
4. Update CORS_ORIGINS dengan custom domain

## 🔧 Troubleshooting

### Backend Issues

**Error: Cannot connect to MongoDB**
- Solution: Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check connection string in environment variables

**Error: CORS blocked**
- Solution: Update `CORS_ORIGINS` in backend environment variables
- Include frontend URL

**Error: Function execution timeout**
- Solution: Optimize database queries
- Consider Vercel Pro for longer timeout limits

### Frontend Issues

**Error: Failed to fetch from API**
- Solution: Verify `VITE_API_BASE_URL` is correct
- Check backend is deployed and running

**Error: Build failed**
- Solution: Check build logs
- Verify all dependencies in package.json
- Test build locally: `npm run build`

**Error: 404 on page refresh**
- Solution: Check `vercel.json` has correct rewrites configuration

## 📊 Monitoring

### Vercel Dashboard
- View deployment logs
- Monitor function execution
- Check analytics

### Check Logs
```bash
# View deployment logs
vercel logs [deployment-url]

# View production logs
vercel logs --prod
```

## 🚀 Continuous Deployment

Vercel automatically deploys when you push to GitHub:

1. **Production**: Push to `main` branch
2. **Preview**: Push to any other branch or open PR

Configure in Project Settings → Git

## 💰 Pricing Considerations

**Hobby Plan (Free)**
- Suitable for development
- 100GB bandwidth/month
- 10s function execution time
- 6,000 minutes build time

**Pro Plan ($20/month)**
- 1TB bandwidth/month
- 60s function execution time
- Unlimited build minutes
- Better for production

## 📋 Deployment Checklist

- [ ] MongoDB Atlas setup dan accessible
- [ ] Environment variables configured (backend)
- [ ] Environment variables configured (frontend)
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] CORS updated dengan frontend URL
- [ ] API connection working
- [ ] Test all features
- [ ] Custom domain configured (optional)
- [ ] SSL/HTTPS working (automatic)
- [ ] Monitor deployment logs

## 🔗 Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Documentation: https://vercel.com/docs
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Vite on Vercel: https://vercel.com/docs/frameworks/vite

## 📞 Support

If deployment fails:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test build locally
4. Check MongoDB connection
5. Review CORS settings

## 🎉 Success!

After successful deployment:

**Backend URL**: `https://[project-name].vercel.app`
**Frontend URL**: `https://[project-name].vercel.app`

Access your application and test all functionality!

---

**Note**: Vercel serverless functions have execution time limits. For long-running operations, consider using Vercel Pro or alternative hosting for backend.
