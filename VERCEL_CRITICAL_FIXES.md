# 🚨 VERCEL CRITICAL FIXES - ACTION REQUIRED

## ❌ MASALAH YANG TERDETEKSI

### 1. Double `/api/api` Masih Terjadi
```
❌ Error: POST https://inventory-backend.../api/api/auth/login
✅ Should be: POST https://inventory-backend.../api/auth/login
```

**Root Cause:** Environment variable `VITE_API_BASE_URL` belum di-set di Vercel frontend

### 2. CORS Error
```
❌ Error: No 'Access-Control-Allow-Origin' header is present
```

**Root Cause:** 
- Frontend URL berubah ke `https://inventory-frontend-rouge.vercel.app`
- Backend `CORS_ORIGINS` masih point ke URL lama

### 3. PWA Icon Missing (Minor)
```
⚠️  Warning: pwa-192x192.png not found
```

---

## 🔧 SOLUTION: FIX ENVIRONMENT VARIABLES

### STEP 1: Fix Frontend Environment Variables ⚡ CRITICAL

**Buka:** https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables

**Set these variables (CREATE if not exist):**

#### Variable 1: `VITE_API_BASE_URL`
```
Value: https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api
```
⚠️ **IMPORTANT:** Must end with `/api`

#### Variable 2: `VITE_ENABLE_QR_SCANNER`
```
Value: true
```

#### Variable 3: `VITE_ENABLE_OFFLINE_MODE`
```
Value: true
```

**After adding variables:**
- Click **"Save"**
- Go to **"Deployments"** tab
- Click **"Redeploy"** on latest deployment

---

### STEP 2: Fix Backend CORS ⚡ CRITICAL

**Buka:** https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables

**Update CORS_ORIGINS variable:**

#### Current Frontend URLs detected:
```
https://inventory-frontend-rouge.vercel.app
https://inventory-frontend-a7vaml61x-1ikis-projects.vercel.app
```

#### Set CORS_ORIGINS to (include BOTH):
```
Value: https://inventory-frontend-rouge.vercel.app,https://inventory-frontend-a7vaml61x-1ikis-projects.vercel.app
```

⚠️ **IMPORTANT:** 
- No spaces between URLs
- Separated by comma only
- No trailing slash

**After updating:**
- Click **"Save"**
- Go to **"Deployments"** tab
- Click **"Redeploy"** on latest deployment

---

### STEP 3: Verify Other Backend Variables

**Make sure these are also set:**

#### `MONGODB_URI`
```
mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system?retryWrites=true&w=majority
```

#### `JWT_SECRET`
Generate new with this command:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Or use this generated one:
```
eb6f4e5d6cbc73f7867d936cb6c30db0737c166ea73b22c36fbf483ead8ff76c3676f59d83cb2caa7133c64eb2533d3e67c6221c2a5fb046722de87d46505ef52
```

#### `NODE_ENV`
```
production
```

---

## 🧪 TESTING AFTER FIX

### Test 1: Check Environment Variables

**Frontend:**
```bash
# Open browser console on your frontend
console.log(import.meta.env.VITE_API_BASE_URL)
# Should show: https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api
```

**Backend:**
```bash
curl https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/health
# Should return: {"success":true,"message":"OK"}
```

### Test 2: Check Network Request

1. Open frontend: https://inventory-frontend-rouge.vercel.app
2. Open DevTools (F12)
3. Go to Network tab
4. Try to login
5. Check the request URL:
   - ✅ Should be: `.../api/auth/login`
   - ❌ Should NOT be: `.../api/api/auth/login`

### Test 3: Check CORS

1. After login attempt, check Console
2. Should NOT show CORS error
3. If CORS error persists:
   - Verify CORS_ORIGINS in backend
   - Verify frontend URL matches CORS_ORIGINS
   - Redeploy backend

### Test 4: Login Test

Try logging in with:
```
Username: admin_sari
Password: password123
```

Expected result:
- ✅ No console errors
- ✅ Token received
- ✅ Redirect to dashboard

---

## 📋 QUICK CHECKLIST

### Frontend Setup:
- [ ] Go to Vercel Frontend Settings
- [ ] Add/Update `VITE_API_BASE_URL`
- [ ] Add `VITE_ENABLE_QR_SCANNER=true`
- [ ] Add `VITE_ENABLE_OFFLINE_MODE=true`
- [ ] Save variables
- [ ] Redeploy frontend

### Backend Setup:
- [ ] Go to Vercel Backend Settings
- [ ] Update `CORS_ORIGINS` with both frontend URLs
- [ ] Verify `MONGODB_URI` is set
- [ ] Verify `JWT_SECRET` is set (not default!)
- [ ] Verify `NODE_ENV=production`
- [ ] Save variables
- [ ] Redeploy backend

### Verification:
- [ ] Open frontend in browser
- [ ] Open DevTools
- [ ] Check Network tab for correct URL
- [ ] Try login
- [ ] Verify no CORS errors
- [ ] Verify no double `/api/api`
- [ ] Successful login and redirect

---

## 🎯 WHY THIS HAPPENS

### Double `/api/api` Issue

**Problem Flow:**
```
1. VITE_API_BASE_URL not set in Vercel
2. Frontend uses fallback: 'http://localhost:3001/api'
3. But Vercel build replaces it with wrong value
4. Result: baseURL doesn't include /api
5. API calls add /api → Double /api/api
```

**Solution:**
```
1. Explicitly set VITE_API_BASE_URL in Vercel
2. Value must be: https://backend.../api
3. Frontend will use this correctly
4. Result: Single /api ✅
```

### CORS Issue

**Problem Flow:**
```
1. Vercel assigns random subdomain on each deploy
2. Frontend URL changes
3. Backend CORS_ORIGINS has old URL
4. Browser blocks request
```

**Solution:**
```
1. Update CORS_ORIGINS with new URL
2. Or use wildcard: https://*.vercel.app (less secure)
3. Redeploy backend to apply changes
```

---

## 🔍 DEBUGGING COMMANDS

### Check Frontend Deployment
```bash
vercel ls inventory-frontend
```

### Check Backend Deployment
```bash
vercel ls inventory-backend
```

### View Frontend Logs
```bash
vercel logs https://inventory-frontend-rouge.vercel.app --follow
```

### View Backend Logs
```bash
vercel logs https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app --follow
```

### Test Backend Health
```bash
curl -v https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/health
```

### Test CORS
```bash
curl -H "Origin: https://inventory-frontend-rouge.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/auth/login
```

---

## 🚨 IF STILL NOT WORKING

### Scenario 1: Still Double `/api/api`

**Check:**
```javascript
// Open browser console
console.log(import.meta.env.VITE_API_BASE_URL)
```

**If shows wrong value:**
1. Verify variable set in Vercel Dashboard
2. Variable name is exactly: `VITE_API_BASE_URL`
3. Value ends with `/api`
4. Redeploy after setting
5. Hard refresh browser (Ctrl+Shift+R)

### Scenario 2: Still CORS Error

**Check:**
```bash
# Get current frontend URL
vercel ls inventory-frontend

# Check backend CORS setting
# It should include the URL from above
```

**If CORS_ORIGINS doesn't match:**
1. Copy exact frontend URL from `vercel ls`
2. Update CORS_ORIGINS in backend
3. Make sure no typos
4. Make sure no spaces
5. Redeploy backend
6. Wait 30 seconds
7. Try again

### Scenario 3: Both Variables Set but Still Error

**Nuclear Option - Redeploy Everything:**

```bash
# Backend
cd inventory-backend
vercel --prod --yes

# Frontend  
cd ../inventory-frontend
vercel --prod --yes
```

Then test again after 1-2 minutes.

---

## 📞 SUPPORT

If masih error setelah semua langkah:

1. **Screenshot:**
   - Vercel frontend environment variables page
   - Vercel backend environment variables page
   - Browser console errors
   - Browser network tab showing the failing request

2. **Check:**
   - Backend logs: `vercel logs <backend-url>`
   - Frontend logs: `vercel logs <frontend-url>`

3. **Provide:**
   - Error message lengkap
   - Screenshot environment variables
   - Screenshot console errors

---

## ✅ SUCCESS CRITERIA

After completing all steps, you should see:

✅ Frontend loads without errors
✅ No CSP violations in console
✅ Network tab shows: `POST .../api/auth/login` (single /api)
✅ No CORS errors
✅ Login successful with test credentials
✅ Redirect to dashboard after login
✅ Token stored in localStorage
✅ Subsequent API calls work

---

## 🎊 FINAL NOTES

**MOST IMPORTANT:**
1. ⚡ Set `VITE_API_BASE_URL` in frontend
2. ⚡ Update `CORS_ORIGINS` in backend
3. ⚡ Redeploy BOTH after setting variables

**Remember:**
- Environment variables only take effect after redeploy
- Browser may cache old values - use hard refresh
- Vercel may take 30-60 seconds to propagate changes

**Status:** After following these steps, your app should work! 🚀
