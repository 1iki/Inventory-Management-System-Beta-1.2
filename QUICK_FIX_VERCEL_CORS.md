# 🚀 QUICK FIX GUIDE - Vercel CORS Error

**Masalah**: CORS error dengan redirect pada preflight request  
**Waktu**: 15-30 menit  
**Tingkat Kesulitan**: Mudah (hanya setting environment variables)

---

## ⚡ QUICK START (3 Langkah Utama)

### Step 1: Set Backend Environment Variables (5 menit)

1. **Buka Dashboard**:
   ```
   https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables
   ```

2. **Tambahkan 4 Variables** (klik "Add New" untuk setiap variable):

   **Variable 1:**
   ```
   Name: MONGODB_URI
   Value: mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system
   Environment: ✅ Production (centang)
   ```

   **Variable 2:**
   ```
   Name: JWT_SECRET
   Value: 3efa69bca2cafbf9eedd9db11c1d5bf47c8953fa766c2725da1fa6accd1836d26cd94873845d2854ffed09659bf7bfd46ab3224c0607a1864b2c8ce4e2e91c18
   Environment: ✅ Production (centang)
   ```

   **Variable 3:**
   ```
   Name: CORS_ORIGINS
   Value: https://inventory-frontend-rouge.vercel.app
   Environment: ✅ Production (centang)
   ```

   **Variable 4:**
   ```
   Name: NODE_ENV
   Value: production
   Environment: ✅ Production (centang)
   ```

3. **Klik "Save"** untuk setiap variable

---

### Step 2: Set Frontend Environment Variable (2 menit)

1. **Buka Dashboard**:
   ```
   https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables
   ```

2. **Tambahkan Variable**:
   ```
   Name: VITE_API_BASE_URL
   Value: https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app
   Environment: ✅ Production (centang)
   ```

   **⚠️ PENTING**: URL **TIDAK boleh** ada `/api` di akhir!
   
   ✅ BENAR: `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app`  
   ❌ SALAH: `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api`

3. **Klik "Save"**

---

### Step 3: Redeploy Both Projects (5-10 menit)

Environment variables baru akan aktif setelah redeploy.

**Option A: Via Terminal (Recommended)**

```bash
# 1. Deploy Backend
cd /workspaces/Inventory-Management-System-Beta-1.2/inventory-backend
vercel --prod --yes

# 2. Deploy Frontend  
cd /workspaces/Inventory-Management-System-Beta-1.2/inventory-frontend
vercel --prod --yes
```

**Option B: Via Vercel Dashboard**

1. Go to: https://vercel.com/1ikis-projects/inventory-backend
2. Click "Deployments" tab
3. Click "Redeploy" pada deployment terakhir
4. Pilih "Use existing build cache" → **NO** (uncheck)
5. Click "Redeploy"
6. Ulangi untuk inventory-frontend

**Tunggu**: Deployment selesai (~2-5 menit per project)

---

## ✅ Verification (2 menit)

### Test 1: Backend Health
```bash
curl -s https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api/health | python3 -m json.tool
```

**Expected Result**:
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",  ← Harus "connected"!
    "database": "inventory_system"
  }
}
```

### Test 2: Browser Login
1. Buka: https://inventory-frontend-rouge.vercel.app
2. Login dengan:
   - Username: `admin_sari`
   - Password: `password123`
3. Should login successfully! ✅

### Test 3: Run Verification Script (Optional)
```bash
cd /workspaces/Inventory-Management-System-Beta-1.2
./verify-vercel-deployment.sh
```

---

## 🔍 Troubleshooting

### Problem: Database masih "disconnected"

**Solution**:
1. Periksa MONGODB_URI di Vercel Dashboard
2. Pastikan tidak ada spasi/typo
3. Redeploy backend lagi
4. Tunggu 1-2 menit, test lagi

### Problem: CORS error masih muncul

**Solution**:
1. Periksa CORS_ORIGINS di Vercel Dashboard
2. Pastikan sesuai dengan frontend URL
3. Clear browser cache (Ctrl+Shift+Del)
4. Hard refresh (Ctrl+F5)

### Problem: URL masih menunjukkan eosin-kappa

**Solution**:
1. Periksa VITE_API_BASE_URL di frontend
2. Pastikan sudah di-update ke `ev6m50tkl`
3. Redeploy frontend lagi
4. Clear browser cache

### Problem: Login masih error

**Solution**:
1. Check browser console (F12)
2. Check Network tab untuk detail error
3. Verify API URL yang dipanggil
4. Run verification script untuk diagnosis

---

## 📞 Quick Commands Reference

### Generate New JWT Secret (if needed)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Test Backend
```bash
curl -s https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api/health | python3 -m json.tool
```

### Test Login
```bash
curl -s -X POST https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_sari","password":"password123"}' | python3 -m json.tool
```

### Check Deployment Status
```bash
cd inventory-backend && vercel ls
cd inventory-frontend && vercel ls
```

---

## 🎯 Checklist

- [ ] Backend MONGODB_URI set
- [ ] Backend JWT_SECRET set
- [ ] Backend CORS_ORIGINS set
- [ ] Backend NODE_ENV set
- [ ] Frontend VITE_API_BASE_URL set (without /api)
- [ ] Backend redeployed
- [ ] Frontend redeployed
- [ ] Health check returns "connected"
- [ ] Login test successful
- [ ] Browser console shows no errors

---

## ✨ What These Fixes Do

1. **MONGODB_URI**: Connects backend to database
2. **JWT_SECRET**: Enables secure token generation
3. **CORS_ORIGINS**: Allows frontend to call backend
4. **NODE_ENV**: Enables production optimizations
5. **VITE_API_BASE_URL**: Points frontend to correct backend

---

## 📊 Expected Timeline

| Task | Time |
|------|------|
| Set backend env vars | 5 min |
| Set frontend env var | 2 min |
| Deploy backend | 3-5 min |
| Deploy frontend | 3-5 min |
| Verification | 2 min |
| **Total** | **15-20 min** |

---

## 🆘 Still Having Issues?

1. **Run Full Verification**:
   ```bash
   ./verify-vercel-deployment.sh
   ```

2. **Check Detailed Analysis**:
   - Read: `VERCEL_CORS_REDIRECT_ERROR_ANALYSIS.md`

3. **Clear Everything & Restart**:
   ```bash
   # Clear browser cache completely
   # Then retry login
   ```

4. **Check Vercel Logs**:
   - Go to: https://vercel.com/1ikis-projects/inventory-backend
   - Click on latest deployment
   - Check "Logs" tab for errors

---

**Last Updated**: 4 November 2025  
**Status**: Ready to implement  
**Success Rate**: High (if all steps followed correctly)

---

## 🎉 Success Indicators

After following these steps, you should see:

✅ Database status: "connected"  
✅ Login works without errors  
✅ No CORS errors in browser console  
✅ Correct backend URL being called  
✅ JWT token generated successfully  

**Ready to start? Follow Step 1 above! 🚀**
