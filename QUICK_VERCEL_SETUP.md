# ⚡ Quick Vercel Setup Guide

## 🚀 5-Minute Setup

### Step 1: Backend Environment Variables
```
https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables
```

Add these 4 variables:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Get from MongoDB Atlas: Cluster → Connect → Connect your application |
| `JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `CORS_ORIGINS` | Your frontend URL (get from step 2) |
| `NODE_ENV` | `production` |

---

### Step 2: Frontend Environment Variables
```
https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables
```

Add these 2 variables:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | Your backend URL (WITHOUT `/api`) |
| `VITE_API_TIMEOUT` | `30000` |

**⚠️ How to get URLs:**

**Backend URL:**
1. Go to: https://vercel.com/1ikis-projects/inventory-backend
2. Copy URL from "Domains" section
3. Example: `https://inventory-backend-abc123-1ikis-projects.vercel.app`

**Frontend URL:**
1. Go to: https://vercel.com/1ikis-projects/inventory-frontend  
2. Copy URL from "Domains" section
3. Example: `https://inventory-frontend-rouge.vercel.app`

---

### Step 3: MongoDB Atlas
```
https://cloud.mongodb.com/
```

1. Select cluster: **uml21**
2. Go to: **Network Access**
3. Add IP: `0.0.0.0/0` (Allow access from anywhere)

---

### Step 4: Redeploy

**Backend:**
```
https://vercel.com/1ikis-projects/inventory-backend/deployments
```
Click "..." → "Redeploy"

**Frontend:**
```
https://vercel.com/1ikis-projects/inventory-frontend/deployments
```
Click "..." → "Redeploy"

---

### Step 5: Test

**Test Backend:**
```bash
curl https://[your-backend-url]/api/health
```

**Test Frontend:**
Open in browser: `https://[your-frontend-url]`
- Login with: `admin_sari` / `password123`
- Should work without CORS errors

---

## 🔍 Quick Validation

Run validation script:
```bash
./validate-vercel-deployment.sh
```

Should show: ✅ ALL CHECKS PASSED (17/17)

---

## 📚 Full Documentation

For detailed instructions: `VERCEL_CONNECTION_FIX.md`

---

## ⚠️ Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|----------|
| `VITE_API_BASE_URL=...vercel.app/api` | `VITE_API_BASE_URL=...vercel.app` |
| `CORS_ORIGINS=...vercel.app/` | `CORS_ORIGINS=...vercel.app` |
| Not redeploying after env changes | Always redeploy after env changes |

---

## 🆘 Troubleshooting

**CORS Error?**
→ Check `CORS_ORIGINS` in backend includes frontend URL

**Cannot connect to API?**
→ Check `VITE_API_BASE_URL` in frontend is correct

**Database error?**
→ Check MongoDB Atlas Network Access allows `0.0.0.0/0`

---

**Setup Time:** ~5 minutes  
**Difficulty:** Easy  
**Last Updated:** November 3, 2025
