# ☑️ Vercel Setup Checklist

## 📋 Pre-Deployment Checklist

### 🔍 Validation
```bash
./validate-vercel-deployment.sh
```
Expected: ✅ 17/17 checks passed

---

## 🚀 Deployment Steps

### Step 1️⃣: MongoDB Atlas Setup

**URL:** https://cloud.mongodb.com/

- [ ] Login to MongoDB Atlas
- [ ] Select cluster: `uml21`
- [ ] Go to **Network Access**
- [ ] Verify or add IP: `0.0.0.0/0` (Allow access from anywhere)
- [ ] Go to **Database Access**
- [ ] Verify user: `nftiki32_db_user` has read/write access

**Connection String:**
```
mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system
```

---

### Step 2️⃣: Generate JWT Secret

**Run this command:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Copy the output** - you'll need it in Step 3.

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4
```

---

### Step 3️⃣: Backend Environment Variables

**URL:** https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables

Add these 4 variables (all for **Production** environment):

| # | Variable Name | Value | Status |
|---|--------------|-------|--------|
| 1 | `MONGODB_URI` | Paste MongoDB connection string from Step 1 | [ ] |
| 2 | `JWT_SECRET` | Paste generated secret from Step 2 | [ ] |
| 3 | `NODE_ENV` | `production` | [ ] |
| 4 | `CORS_ORIGINS` | Will set after Step 5 | ⏸️ Skip for now |

**How to Add:**
1. Click "Add New" button
2. Enter Key (variable name)
3. Enter Value
4. Select **Production** environment
5. Click "Save"

---

### Step 4️⃣: Get Backend URL

**URL:** https://vercel.com/1ikis-projects/inventory-backend

- [ ] Look for **"Domains"** section
- [ ] Copy the production URL

**Example:**
```
https://inventory-backend-abc123xyz-1ikis-projects.vercel.app
```

**⚠️ Important:** Copy the exact URL, you'll need it for Steps 5 & 6.

---

### Step 5️⃣: Frontend Environment Variables

**URL:** https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables

Add these 2 variables (both for **Production** environment):

| # | Variable Name | Value | Notes | Status |
|---|--------------|-------|-------|--------|
| 1 | `VITE_API_BASE_URL` | Paste backend URL from Step 4 | ⚠️ WITHOUT `/api` | [ ] |
| 2 | `VITE_API_TIMEOUT` | `30000` | Optional | [ ] |

**Example:**
```
VITE_API_BASE_URL=https://inventory-backend-abc123xyz-1ikis-projects.vercel.app
```

**❌ Wrong:**
```
VITE_API_BASE_URL=https://inventory-backend-abc123xyz-1ikis-projects.vercel.app/api
```

---

### Step 6️⃣: Get Frontend URL & Update CORS

**6a. Get Frontend URL**

**URL:** https://vercel.com/1ikis-projects/inventory-frontend

- [ ] Look for **"Domains"** section
- [ ] Copy the production URL

**Example:**
```
https://inventory-frontend-rouge.vercel.app
```

**6b. Update Backend CORS**

**URL:** https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables

- [ ] Find variable: `CORS_ORIGINS`
- [ ] Edit value
- [ ] Paste frontend URL from Step 6a
- [ ] Save

**Example:**
```
CORS_ORIGINS=https://inventory-frontend-rouge.vercel.app
```

---

### Step 7️⃣: Redeploy Backend

**URL:** https://vercel.com/1ikis-projects/inventory-backend/deployments

- [ ] Click **"..."** (three dots) on latest deployment
- [ ] Click **"Redeploy"**
- [ ] Confirm **"Redeploy"**
- [ ] Wait for deployment to complete (⏱️ ~2-3 minutes)
- [ ] Verify status shows **"Ready"**

---

### Step 8️⃣: Redeploy Frontend

**URL:** https://vercel.com/1ikis-projects/inventory-frontend/deployments

- [ ] Click **"..."** (three dots) on latest deployment
- [ ] Click **"Redeploy"**
- [ ] Confirm **"Redeploy"**
- [ ] Wait for deployment to complete (⏱️ ~2-3 minutes)
- [ ] Verify status shows **"Ready"**

---

## ✅ Testing & Verification

### Test 1: Backend Health Check

**Run this command** (replace with your backend URL):
```bash
curl https://[your-backend-url]/api/health
```

**Expected Response:**
```json
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

**Status:**
- [ ] ✅ Backend health check passed
- [ ] ❌ Failed → Check troubleshooting section

---

### Test 2: Frontend Access

**Open in Browser:**
```
https://[your-frontend-url]
```

**Verify:**
- [ ] Page loads without errors
- [ ] Login form is visible
- [ ] No console errors about missing API URL

**Status:**
- [ ] ✅ Frontend loads successfully
- [ ] ❌ Failed → Check troubleshooting section

---

### Test 3: API Connection (Console Check)

**In Browser Console** (F12 → Console tab):

**Look for this log:**
```
🔧 API Configuration: {
  env: "https://inventory-backend-xxx.vercel.app",
  apiUrl: "https://inventory-backend-xxx.vercel.app",
  baseURL: "https://inventory-backend-xxx.vercel.app/api",
  mode: "production"
}
```

**Verify:**
- [ ] `baseURL` points to correct backend
- [ ] No errors about missing VITE_API_BASE_URL
- [ ] `mode` is "production"

**Status:**
- [ ] ✅ API configuration correct
- [ ] ❌ Wrong URL → Recheck Step 5
- [ ] ❌ Error about missing URL → Recheck Step 5 & redeploy

---

### Test 4: Login Functionality

**Login Credentials:**
- Username: `admin_sari`
- Password: `password123`

**Test Steps:**
1. [ ] Enter credentials
2. [ ] Click "Login" button
3. [ ] Wait for response

**Expected:**
- [ ] ✅ Login successful
- [ ] ✅ Redirected to dashboard
- [ ] ✅ No CORS errors in console

**Status:**
- [ ] ✅ Login works perfectly
- [ ] ❌ CORS error → Check Step 6 (CORS_ORIGINS)
- [ ] ❌ Network error → Check backend URL in Step 5
- [ ] ❌ Database error → Check MongoDB Atlas in Step 1

---

### Test 5: Dashboard Data Loading

**After Login:**

**Verify:**
- [ ] Dashboard shows statistics
- [ ] Recent activities load
- [ ] No API errors in console

**Status:**
- [ ] ✅ All data loads successfully
- [ ] ❌ Errors → Check browser console for details

---

## 🎉 Completion Checklist

### Configuration
- [ ] MongoDB Atlas Network Access: `0.0.0.0/0` configured
- [ ] Backend `MONGODB_URI` set in Vercel
- [ ] Backend `JWT_SECRET` generated and set
- [ ] Backend `NODE_ENV=production` set
- [ ] Backend `CORS_ORIGINS` set with frontend URL
- [ ] Frontend `VITE_API_BASE_URL` set (without `/api`)
- [ ] Frontend `VITE_API_TIMEOUT` set (optional)

### Deployment
- [ ] Backend redeployed after env vars
- [ ] Frontend redeployed after env vars
- [ ] Both deployments show "Ready" status

### Testing
- [ ] Backend health check: ✅ PASSED
- [ ] Frontend loads: ✅ PASSED
- [ ] API configuration: ✅ CORRECT
- [ ] Login functionality: ✅ WORKS
- [ ] Dashboard data: ✅ LOADS

### Final Verification
- [ ] No CORS errors in console
- [ ] No "missing VITE_API_BASE_URL" errors
- [ ] All features working as expected
- [ ] Ready for production use

---

## ⏱️ Time Tracking

| Step | Estimated Time | Actual Time |
|------|---------------|-------------|
| Step 1: MongoDB | 2 min | ___ |
| Step 2: JWT Secret | 1 min | ___ |
| Step 3: Backend Env | 3 min | ___ |
| Step 4: Get Backend URL | 1 min | ___ |
| Step 5: Frontend Env | 2 min | ___ |
| Step 6: CORS Update | 2 min | ___ |
| Step 7: Backend Redeploy | 3 min | ___ |
| Step 8: Frontend Redeploy | 3 min | ___ |
| Testing | 5 min | ___ |
| **Total** | **~20 min** | ___ |

---

## 🆘 Quick Troubleshooting

### ❌ Backend health check fails
→ Check `MONGODB_URI` in backend environment variables  
→ Verify MongoDB Atlas Network Access  
→ Redeploy backend

### ❌ Frontend shows "missing VITE_API_BASE_URL"
→ Check `VITE_API_BASE_URL` in frontend environment variables  
→ Redeploy frontend

### ❌ CORS error in browser console
→ Check `CORS_ORIGINS` in backend includes frontend URL  
→ Redeploy backend after fixing

### ❌ Login fails with 401
→ Check `JWT_SECRET` is set in backend  
→ Redeploy backend

### ❌ Database connection error
→ Verify MongoDB Atlas Network Access: `0.0.0.0/0`  
→ Check `MONGODB_URI` is correct  
→ Test connection string directly

---

## 📚 Additional Resources

- **Quick Guide:** [QUICK_VERCEL_SETUP.md](QUICK_VERCEL_SETUP.md)
- **Detailed Guide:** [VERCEL_CONNECTION_FIX.md](VERCEL_CONNECTION_FIX.md)
- **Technical Summary:** [VERCEL_FIX_SUMMARY.md](VERCEL_FIX_SUMMARY.md)
- **Validation Script:** `./validate-vercel-deployment.sh`

---

## ✅ Sign Off

**Setup Completed By:** ___________________  
**Date:** ___________________  
**All Tests Passed:** [ ] YES  
**Production Ready:** [ ] YES

---

**Last Updated:** November 3, 2025  
**Version:** 1.0  
**Status:** Ready for Use
