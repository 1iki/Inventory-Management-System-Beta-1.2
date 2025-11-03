# 🔧 Vercel Frontend-Backend Connection Fix

## Masalah / Problem

Frontend tidak dapat terkoneksi ke backend di Vercel karena konfigurasi environment variables yang tidak tepat.

**Penyebab Utama / Root Causes:**
1. ❌ Environment variable `VITE_API_BASE_URL` tidak diset di Vercel Dashboard
2. ❌ File `.env.production` menggunakan hardcoded URL yang sudah kadaluarsa
3. ❌ CORS configuration di backend belum include frontend production URL
4. ❌ Backend `vercel.json` menggunakan konfigurasi yang salah

---

## ✅ Solusi Lengkap / Complete Solution

### Step 1: Fix Backend Configuration

#### 1.1 Update Environment Variables di Vercel Backend

**Buka:** https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables

**Tambahkan atau Update Variables Berikut:**

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `MONGODB_URI` | Get from MongoDB Atlas dashboard | Connection string ke MongoDB Atlas |
| `JWT_SECRET` | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | Minimum 64 characters |
| `NODE_ENV` | `production` | Environment mode |
| `CORS_ORIGINS` | Your frontend URL from Vercel dashboard | Your frontend production URL |

**Cara Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy output dan paste sebagai value untuk `JWT_SECRET`.

#### 1.2 Verifikasi MongoDB Atlas Access

1. Login ke MongoDB Atlas: https://cloud.mongodb.com/
2. Pilih Cluster: `uml21`
3. Go to **Network Access**
4. Pastikan ada entry: `0.0.0.0/0` (Allow access from anywhere)
5. Jika belum ada, tambahkan:
   - Click **"Add IP Address"**
   - Select **"Allow Access from Anywhere"**
   - Click **"Confirm"**

---

### Step 2: Fix Frontend Configuration

#### 2.1 Update Environment Variables di Vercel Frontend

**Buka:** https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables

**Tambahkan Variables Berikut:**

| Variable Name | Value | Environment | Notes |
|--------------|-------|-------------|-------|
| `VITE_API_BASE_URL` | `https://inventory-backend-[your-deployment-id]-1ikis-projects.vercel.app` | Production | ⚠️ TANPA `/api` di akhir |
| `VITE_API_TIMEOUT` | `30000` | Production | Optional: 30 detik timeout |

**⚠️ CRITICAL: Cara Mendapatkan Backend URL yang Benar:**

1. Buka https://vercel.com/1ikis-projects/inventory-backend
2. Lihat di bagian **"Domains"** atau **"Deployments"**
3. Copy URL deployment terbaru (contoh: `https://inventory-backend-abc123xyz-1ikis-projects.vercel.app`)
4. Paste URL tersebut sebagai value `VITE_API_BASE_URL`
5. **JANGAN** tambahkan `/api` di akhir URL - akan ditambahkan otomatis

**Contoh Values yang Benar vs Salah:**

✅ **BENAR:**
```
VITE_API_BASE_URL=https://inventory-backend-abc123xyz-1ikis-projects.vercel.app
```

❌ **SALAH:**
```
VITE_API_BASE_URL=https://inventory-backend-abc123xyz-1ikis-projects.vercel.app/api
```

---

### Step 3: Update CORS di Backend

Setelah mengetahui frontend production URL, update `CORS_ORIGINS`:

1. Buka frontend production deployment: https://vercel.com/1ikis-projects/inventory-frontend
2. Copy **production domain** (contoh: `https://inventory-frontend-rouge.vercel.app`)
3. Buka backend environment variables: https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables
4. Update variable `CORS_ORIGINS` dengan frontend production URL
5. Klik **"Save"**

**Format CORS_ORIGINS:**
```
https://inventory-frontend-rouge.vercel.app
```

**Atau untuk multiple domains:**
```
https://inventory-frontend-rouge.vercel.app,https://your-custom-domain.com
```

---

### Step 4: Redeploy Both Projects

#### 4.1 Redeploy Backend

**Option A: Via Dashboard (Recommended)**
1. Buka: https://vercel.com/1ikis-projects/inventory-backend
2. Klik tab **"Deployments"**
3. Klik **"..."** (three dots) di deployment terbaru
4. Pilih **"Redeploy"**
5. Confirm **"Redeploy"**

**Option B: Via CLI**
```bash
cd inventory-backend
vercel --prod
```

#### 4.2 Redeploy Frontend

**Option A: Via Dashboard (Recommended)**
1. Buka: https://vercel.com/1ikis-projects/inventory-frontend
2. Klik tab **"Deployments"**
3. Klik **"..."** (three dots) di deployment terbaru
4. Pilih **"Redeploy"**
5. Confirm **"Redeploy"**

**Option B: Via CLI**
```bash
cd inventory-frontend
vercel --prod
```

---

### Step 5: Verification / Testing

#### 5.1 Test Backend

```bash
# Health Check
curl https://[your-backend-url]/api/health

# Expected Response:
{
  "success": true,
  "message": "API is running",
  "data": {
    "status": "healthy",
    "timestamp": "2025-11-03T...",
    "database": {
      "status": "connected",
      "database": "inventory_system"
    }
  }
}
```

#### 5.2 Test Frontend Connection

1. Buka frontend URL di browser
2. Buka **Developer Tools** (F12)
3. Pergi ke tab **Console**
4. Cari log: `🔧 API Configuration:`
5. Verify bahwa `baseURL` menunjuk ke backend yang benar

**Expected Console Output:**
```
🔧 API Configuration: {
  env: "https://inventory-backend-xxx.vercel.app",
  apiUrl: "https://inventory-backend-xxx.vercel.app",
  baseURL: "https://inventory-backend-xxx.vercel.app/api",
  mode: "production"
}
```

#### 5.3 Test Login

1. Klik tombol **"Login"**
2. Masukkan credentials:
   - Username: `admin_sari`
   - Password: `password123`
3. Klik **"Login"**
4. Seharusnya berhasil login tanpa error CORS

**Jika ada CORS Error di Console:**
- Periksa `CORS_ORIGINS` di backend environment variables
- Pastikan frontend URL sudah benar
- Redeploy backend setelah update CORS_ORIGINS

---

## 🔍 Troubleshooting

### Error: "Failed to fetch" atau "Network Error"

**Penyebab:**
- Backend URL salah atau tidak accessible
- Environment variable `VITE_API_BASE_URL` tidak diset atau salah

**Solusi:**
1. Verify `VITE_API_BASE_URL` di Vercel frontend settings
2. Test backend URL langsung di browser: `https://[backend-url]/api/health`
3. Pastikan backend sudah deployed dan running
4. Redeploy frontend setelah fix

---

### Error: "CORS policy blocked"

**Penyebab:**
- Frontend URL belum ditambahkan di `CORS_ORIGINS` backend
- CORS_ORIGINS format salah

**Solusi:**
1. Buka backend environment variables
2. Update `CORS_ORIGINS` dengan frontend production URL
3. Format: `https://inventory-frontend-rouge.vercel.app` (no trailing slash)
4. Redeploy backend
5. Clear browser cache dan reload frontend

---

### Error: "Cannot connect to MongoDB" atau "Database error"

**Penyebab:**
- MongoDB Atlas tidak allow connection dari Vercel
- Connection string salah
- Database credentials salah

**Solusi:**
1. Login ke MongoDB Atlas
2. Go to **Network Access**
3. Add IP: `0.0.0.0/0` (Allow access from anywhere)
4. Verify `MONGODB_URI` di backend environment variables
5. Test connection dengan health check endpoint
6. Redeploy backend

---

### Backend Build Failed

**Penyebab:**
- Dependencies tidak complete
- Build configuration salah
- TypeScript errors

**Solusi:**
1. Check build logs di Vercel dashboard
2. Test build locally: `cd inventory-backend && npm run build`
3. Fix any TypeScript errors
4. Commit and push changes
5. Vercel akan auto-redeploy

---

### Frontend Build Failed

**Penyebab:**
- Dependencies tidak complete
- Environment variable required tapi tidak diset
- TypeScript errors

**Solusi:**
1. Check build logs di Vercel dashboard
2. Test build locally: `cd inventory-frontend && npm run build`
3. Pastikan `VITE_API_BASE_URL` diset di Vercel (bisa empty string untuk build test)
4. Fix any TypeScript errors
5. Commit and push changes
6. Vercel akan auto-redeploy

---

## 📋 Checklist Deployment

### Backend Setup
- [ ] MongoDB Atlas Network Access: `0.0.0.0/0` ✓
- [ ] Backend `MONGODB_URI` environment variable ✓
- [ ] Backend `JWT_SECRET` generated dan set ✓
- [ ] Backend `NODE_ENV=production` ✓
- [ ] Backend `CORS_ORIGINS` dengan frontend URL ✓
- [ ] Backend deployed successfully ✓
- [ ] Backend health check returns success ✓

### Frontend Setup
- [ ] Frontend `VITE_API_BASE_URL` diset (tanpa `/api`) ✓
- [ ] Frontend `VITE_API_TIMEOUT=30000` (optional) ✓
- [ ] Frontend deployed successfully ✓
- [ ] Frontend dapat akses backend ✓
- [ ] No CORS errors di console ✓
- [ ] Login functionality works ✓

### Testing
- [ ] Backend health check: `/api/health` returns success ✓
- [ ] Frontend loads tanpa errors ✓
- [ ] Console shows correct API configuration ✓
- [ ] Login berhasil tanpa CORS errors ✓
- [ ] Dashboard data loads dari backend ✓

---

## 📞 Quick Reference

### Important URLs

**Backend:**
- Dashboard: https://vercel.com/1ikis-projects/inventory-backend
- Env Vars: https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables
- Deployments: https://vercel.com/1ikis-projects/inventory-backend/deployments

**Frontend:**
- Dashboard: https://vercel.com/1ikis-projects/inventory-frontend
- Env Vars: https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables
- Deployments: https://vercel.com/1ikis-projects/inventory-frontend/deployments

**MongoDB Atlas:**
- Dashboard: https://cloud.mongodb.com/
- Cluster: uml21
- Database: inventory_system

---

## 🎯 Summary

**Yang Harus Dilakukan:**

1. **Set Backend Environment Variables:**
   - `MONGODB_URI`
   - `JWT_SECRET` (generate baru)
   - `CORS_ORIGINS` (frontend URL)
   - `NODE_ENV=production`

2. **Set Frontend Environment Variables:**
   - `VITE_API_BASE_URL` (backend URL **tanpa** `/api`)
   - `VITE_API_TIMEOUT=30000`

3. **Verify MongoDB Atlas:**
   - Network Access: `0.0.0.0/0`

4. **Redeploy:**
   - Backend: Redeploy setelah set env vars
   - Frontend: Redeploy setelah set env vars

5. **Test:**
   - Backend health check
   - Frontend login
   - Verify no CORS errors

---

## ✅ Setelah Selesai

Aplikasi seharusnya sudah berfungsi dengan baik:
- ✅ Frontend dapat connect ke backend
- ✅ Backend dapat connect ke MongoDB
- ✅ CORS working properly
- ✅ Login dan semua fitur berfungsi
- ✅ No errors di console

**Selamat! Deployment Berhasil!** 🎉

---

**Last Updated:** November 3, 2025
**Status:** Complete Fix Guide
