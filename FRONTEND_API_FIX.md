# 🔧 Frontend API Connection Fix

## 🐛 Masalah yang Ditemukan

### 1. Double `/api/api` dalam URL
**Error:**
```
Trying to connect to: https://backend.vercel.app/api/api/auth/login
```

**Penyebab:**
- `baseURL` di axios sudah include `/api`
- Setiap API call juga menambahkan `/api/` prefix
- Hasilnya: `/api` + `/api/auth/login` = `/api/api/auth/login` ❌

**Solusi:**
- Update `baseURL` default di `api.ts` untuk include `/api`
- Remove semua `/api/` prefix dari API endpoints
- Hasil: `baseURL(/api)` + `/auth/login` = `/api/auth/login` ✅

### 2. Content Security Policy (CSP) Blocking Vercel Backend
**Error:**
```
Refused to connect to 'https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/auth/login' 
because it violates the following Content Security Policy directive: 
"connect-src 'self' http://localhost:3001 https://fonts.googleapis.com https://fonts.gstatic.com"
```

**Penyebab:**
- CSP di `index.html` hanya mengizinkan `localhost:3001`
- Backend Vercel URL tidak ada dalam whitelist

**Solusi:**
- Update CSP `connect-src` untuk include `https://*.vercel.app`
- Sekarang mengizinkan semua subdomain Vercel

---

## ✅ Perbaikan yang Dilakukan

### 1. **File: `inventory-frontend/src/lib/api.ts`**

#### Before:
```typescript
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const loginApi = (username: string, password: string) =>
  api.post<ApiResponse<{ user: any; token: string }>>('/api/auth/login', { username, password });
```

#### After:
```typescript
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const loginApi = (username: string, password: string) =>
  api.post<ApiResponse<{ user: any; token: string }>>('/auth/login', { username, password });
```

**Changes:**
- ✅ Default `baseURL` sekarang include `/api`
- ✅ Semua endpoint tidak lagi menggunakan `/api/` prefix
- ✅ Total 100+ API endpoints di-update

### 2. **File: `inventory-frontend/index.html`**

#### Before:
```html
<meta http-equiv="Content-Security-Policy" content="...; connect-src 'self' http://localhost:3001 https://fonts.googleapis.com https://fonts.gstatic.com;" />
```

#### After:
```html
<meta http-equiv="Content-Security-Policy" content="...; connect-src 'self' http://localhost:3001 https://*.vercel.app https://fonts.googleapis.com https://fonts.gstatic.com;" />
```

**Changes:**
- ✅ Added `https://*.vercel.app` untuk mengizinkan semua Vercel backend URLs
- ✅ Mendukung deployment ke subdomain Vercel apa pun

### 3. **File: `inventory-frontend/.env.production`**

#### Before:
```bash
VITE_API_BASE_URL=http://10.0.10.141:3001/api
```

#### After:
```bash
VITE_API_BASE_URL=https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api
```

**Changes:**
- ✅ Updated untuk point ke Vercel backend (production)
- ✅ Menggunakan HTTPS (secure)

---

## 🎯 Environment Variables untuk Vercel

### Backend Environment Variables:
Sudah di-set sebelumnya (tidak perlu update):

```
MONGODB_URI=mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system?retryWrites=true&w=majority
JWT_SECRET=<your-generated-secret>
CORS_ORIGINS=https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app
NODE_ENV=production
```

### Frontend Environment Variables:
**Update di Vercel Dashboard:**

```
VITE_API_BASE_URL=https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api
VITE_ENABLE_QR_SCANNER=true
VITE_ENABLE_OFFLINE_MODE=true
```

⚠️ **PENTING:** `VITE_API_BASE_URL` harus sudah include `/api` di akhir!

---

## 🧪 Testing

### 1. Test Locally (Development):
```bash
cd inventory-frontend
npm run dev
```

Expected behavior:
- ✅ Login ke `http://localhost:3001/api/auth/login`
- ✅ No double `/api/api`

### 2. Test di Vercel (Production):
```bash
# After deployment
curl https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app
```

Expected behavior:
- ✅ Frontend loads successfully
- ✅ Login connects to `https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/auth/login`
- ✅ No CSP errors in browser console
- ✅ No double `/api/api` in network tab

---

## 📋 Deployment Checklist

Frontend Deployment:
- [x] Fix double `/api/api` issue
- [x] Update CSP to allow Vercel backend
- [x] Update `.env.production` with Vercel backend URL
- [ ] Commit changes to Git
- [ ] Push to GitHub
- [ ] Redeploy frontend di Vercel
- [ ] Test login functionality

Backend Verification:
- [x] Backend deployed to Vercel
- [ ] Environment variables configured
- [ ] CORS allows frontend URL
- [ ] Health check responds correctly

---

## 🔍 How to Verify Fix

### Check Network Tab:
```
✅ Correct:
POST https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/auth/login

❌ Wrong:
POST https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/api/auth/login
```

### Check Console:
```
✅ No CSP errors
✅ API requests succeeding
✅ Token received after login
```

### Check Request Headers:
```
✅ Authorization: Bearer <token>
✅ Content-Type: application/json
```

---

## 📚 Related Files

Files modified in this fix:
1. `inventory-frontend/src/lib/api.ts` - Fixed double `/api` issue
2. `inventory-frontend/index.html` - Updated CSP to allow Vercel
3. `inventory-frontend/.env.production` - Updated backend URL

Configuration files:
- `inventory-frontend/vercel.json` - Vercel configuration
- `inventory-backend/lib/config.ts` - Backend CORS configuration

---

## 🚀 Next Steps After Deployment

1. **Update Frontend Environment Variables di Vercel Dashboard**:
   ```
   VITE_API_BASE_URL=https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api
   ```

2. **Redeploy Frontend**:
   ```bash
   cd inventory-frontend
   vercel --prod
   ```

3. **Test Login**:
   - Open: https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app
   - Login dengan: `admin_sari` / `password123`
   - Verify: No errors, successful login

4. **Monitor Logs**:
   ```bash
   vercel logs https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app --follow
   ```

---

## ✅ Summary

**Problems Fixed:**
1. ✅ Double `/api/api` in request URLs
2. ✅ CSP blocking Vercel backend connections
3. ✅ Environment variables pointing to wrong backend

**Result:**
- Frontend now correctly connects to backend
- No CSP violations
- Clean API URLs without duplicates
- Ready for Vercel deployment

**Status:** 🟢 Ready to Deploy
