# 🔧 URGENT FIX: Double /api/api Issue - Frontend Environment Variable

**Issue**: Frontend calling `/api/api/auth/login` instead of `/api/auth/login`  
**HTTP Status**: 405 Method Not Allowed  
**Root Cause**: Frontend build tidak menggunakan environment variable dari `.env.production`

---

## 🚨 Problem Explanation

### Current Behavior:
```
Frontend calls: /api/api/auth/login  ❌
Should call:    /api/auth/login      ✅
```

### Why This Happens:

1. **Vercel Build** tidak otomatis load `.env.production`
2. **VITE_API_BASE_URL** tidak di-set di Vercel Dashboard
3. Frontend code fallback ke default:
   ```typescript
   const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
   const baseURL = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
   ```
4. Jika `VITE_API_BASE_URL` undefined → default `http://localhost:3001` → append `/api` → menjadi `http://localhost:3001/api`
5. Endpoint `/auth/login` dipanggil → Final URL: `/api/auth/login` ✅

**TAPI** kalau build cache menggunakan value lama yang sudah include `/api`:
- Old value: `https://backend.../api` 
- Check `endsWith('/api')` → true
- Tidak append `/api` lagi
- Final: `https://backend.../api` + `/auth/login` = `/api/auth/login` ✅

**PROBLEM**: Ada kemungkinan build menggunakan value yang hardcoded atau cached yang salah!

---

## ✅ SOLUTION: Set Environment Variable di Vercel Dashboard

### Step-by-Step Instructions:

#### 1. Go to Vercel Frontend Settings
```
https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables
```

#### 2. Check Existing Variables
- Look for `VITE_API_BASE_URL`
- If exists, **EDIT** it
- If not exists, **ADD NEW**

#### 3. Set Correct Value

**Variable Name**:
```
VITE_API_BASE_URL
```

**Value** (WITHOUT `/api` at the end):
```
https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app
```

**Environment**: 
- ✅ Production
- ✅ Preview (optional)
- ✅ Development (optional)

**⚠️ CRITICAL**: URL must NOT end with `/api`!

#### 4. Save Changes

Click **"Save"** button

#### 5. Redeploy Frontend

After saving environment variable, you MUST redeploy:

**Option A: Via Dashboard**
1. Go to: https://vercel.com/1ikis-projects/inventory-frontend/deployments
2. Find latest deployment
3. Click ⋮ (three dots)
4. Click "Redeploy"
5. Confirm

**Option B: Via CLI**
```bash
cd /workspaces/Inventory-Management-System-Beta-1.2/inventory-frontend
vercel --prod --yes
```

#### 6. Wait for Build to Complete

Build should take ~40-60 seconds

---

## 🧪 Verification After Redeploy

### Method 1: Check JavaScript Bundle

```bash
# Get latest deployment URL from: vercel ls
# Extract JS bundle filename
curl -s https://inventory-frontend-[deployment-id].vercel.app/ | grep -o "/assets/index-[^\"]*\.js" | head -1

# Check baseURL in bundle (should NOT have /api at end)
curl -s https://inventory-frontend-[deployment-id].vercel.app/assets/index-[hash].js | grep -o "https://inventory-backend-[^\"']*vercel.app[^\"']*" | head -1
```

**Expected Output**:
```
https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api
```
OR
```
https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app
```

**If shows**: `https://...vercel.app/api/api` → Build still using wrong value!

### Method 2: Test in Browser

1. Open: `https://inventory-frontend-rouge.vercel.app`
2. Open **Developer Tools** (F12)
3. Go to **Network** tab
4. Try to login with:
   - Username: `admin_sari`
   - Password: `password123`
5. Check Network request:
   - Should call: `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api/auth/login` ✅
   - NOT: `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api/api/auth/login` ❌

### Method 3: Check Response Status

**If correct**:
```
Status: 200 OK
Response: {"success": true, "message": "Login berhasil", ...}
```

**If still wrong**:
```
Status: 405 Method Not Allowed
Response: (error page or empty)
```

---

## 🔄 Alternative: Force Correct Value in Code

If environment variable tidak work, kita bisa hardcode value sementara:

### Edit `src/lib/api.ts`:

```typescript
// TEMPORARY FIX - Hardcode backend URL
const apiUrl = 'https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app';
// const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const baseURL = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
```

**Then commit & deploy**:
```bash
cd /workspaces/Inventory-Management-System-Beta-1.2
git add inventory-frontend/src/lib/api.ts
git commit -m "🔧 Temporary fix: Hardcode backend URL"
git push origin main
cd inventory-frontend
vercel --prod --yes
```

**Note**: This is NOT recommended for production! Only use if env var method fails.

---

## 📊 Current Status

### Backend (ev6m50tkl):
- ✅ `/api/auth/login` → Works (200 OK)
- ❌ `/api/api/auth/login` → Fails (405 Method Not Allowed)

### Frontend:
- ❌ Calling wrong path: `/api/api/auth/login`
- ⏳ Needs: Environment variable set + redeploy

---

## 🎯 Quick Fix Checklist

- [ ] Go to Vercel Dashboard
- [ ] Navigate to Frontend Settings → Environment Variables
- [ ] Set `VITE_API_BASE_URL` = `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app`
- [ ] Save variable
- [ ] Redeploy frontend
- [ ] Test in browser (Network tab should show correct URL)
- [ ] Login should work without 405 error

---

## 📝 Correct Environment Variable Summary

**Variable**: `VITE_API_BASE_URL`  
**Value**: `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app`  
**Important**: NO `/api` at the end!  
**Location**: Vercel Dashboard → inventory-frontend → Settings → Environment Variables  
**After setting**: MUST redeploy!

---

## 🆘 If Still Not Working

1. **Clear Vercel build cache**:
   - Dashboard → Settings → General → "Clear Build Cache"
   - Then redeploy

2. **Check all environment variables**:
   ```bash
   # In Vercel Dashboard, verify:
   VITE_API_BASE_URL = https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app
   ```

3. **Check build logs**:
   - Dashboard → Deployments → Latest → "View Build Logs"
   - Look for: "VITE_API_BASE_URL" in build output

4. **Use hardcode method** (temporary):
   - Edit `src/lib/api.ts` directly
   - Commit & push & deploy

---

**This must be fixed via Vercel Dashboard environment variables!** 🚨
