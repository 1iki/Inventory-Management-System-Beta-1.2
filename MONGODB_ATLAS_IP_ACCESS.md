# 🔐 MongoDB Atlas - Add IP Access for Vercel

## 🎯 Masalah

Backend Vercel tidak bisa connect ke MongoDB Atlas karena IP address tidak di-whitelist.

**Error yang mungkin muncul:**
```
MongoServerError: connection timed out
MongoServerError: IP address not whitelisted
Error: connect ETIMEDOUT
```

---

## ✅ SOLUTION: Whitelist IP di MongoDB Atlas

### STEP 1: Login ke MongoDB Atlas

1. Buka: https://cloud.mongodb.com
2. Login dengan akun Anda
3. Pilih project/cluster Anda

---

### STEP 2: Go to Network Access

1. Di sidebar kiri, klik **"Network Access"**
2. Atau langsung buka: https://cloud.mongodb.com/v2/[PROJECT_ID]#/security/network/accessList

![Network Access Location](https://i.imgur.com/example.png)

---

### STEP 3: Add IP Address

Click tombol **"+ ADD IP ADDRESS"**

---

### STEP 4: Allow Access from Anywhere (Recommended untuk Vercel)

Anda punya 2 opsi:

#### **OPTION 1: Allow from Anywhere (Recommended) ✅**

**Untuk:** Production deployment di Vercel (IP dinamis)

1. Click **"ALLOW ACCESS FROM ANYWHERE"**
2. IP Address akan terisi: `0.0.0.0/0`
3. Comment: `Allow Vercel Backend`
4. Click **"Confirm"**

**Keamanan:**
- ✅ Tetap aman karena butuh username + password untuk connect
- ✅ Database user credentials tetap required
- ✅ Connection string tetap encrypted (SSL/TLS)
- ⚠️ Tapi lebih baik whitelist IP spesifik jika memungkinkan

#### **OPTION 2: Add Vercel IP Ranges (More Secure) 🔒**

**Untuk:** Extra security dengan whitelist IP Vercel spesifik

Vercel menggunakan multiple IP addresses. Add semua IP ranges berikut:

```
76.76.21.0/24
76.76.21.21
76.76.21.98
76.76.21.142
76.76.21.164
```

**Cara add:**

1. Click **"+ ADD IP ADDRESS"**
2. Masukkan IP address: `76.76.21.0/24`
3. Comment: `Vercel Backend`
4. Click **"Confirm"**
5. Ulangi untuk IP lainnya

**Note:** Vercel IP ranges bisa berubah. Check dokumentasi terbaru di:
https://vercel.com/docs/concepts/edge-network/regions

---

### STEP 5: Verify Setup

Setelah add IP address, wait **1-2 menit** untuk propagate.

**Check Status:**
```bash
# Test MongoDB connection dari Vercel
curl https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-...",
  "database": "connected"
}
```

---

## 📋 STEP-BY-STEP VISUAL GUIDE

### 1. MongoDB Atlas Dashboard
```
[Dashboard] → [Network Access] → [+ ADD IP ADDRESS]
```

### 2. Add IP Dialog
```
┌─────────────────────────────────────────────────────────────┐
│ Add IP Access List Entry                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ○ Add Current IP Address                                   │
│   [192.168.1.100] (Your current IP)                        │
│                                                             │
│ ● Add IP Address                                           │
│   [0.0.0.0/0         ] ← Enter this                        │
│                                                             │
│ ○ ALLOW ACCESS FROM ANYWHERE                               │
│   [Click this for quick setup]                             │
│                                                             │
│ Comment (optional):                                        │
│ [Allow Vercel Backend          ]                           │
│                                                             │
│        [Cancel]              [Confirm]                     │
└─────────────────────────────────────────────────────────────┘
```

### 3. After Adding
```
Network Access List:
┌────────────────────────────────────────────────────────────┐
│ IP Address      │ Comment              │ Status   │ Action │
├────────────────────────────────────────────────────────────┤
│ 0.0.0.0/0      │ Allow Vercel Backend │ Active   │ [Edit] │
└────────────────────────────────────────────────────────────┘
```

---

## 🔍 VERIFICATION CHECKLIST

After adding IP access:

- [ ] IP `0.0.0.0/0` added to Network Access
- [ ] Status shows "Active"
- [ ] Wait 1-2 minutes for propagation
- [ ] Test backend health endpoint
- [ ] Check backend logs for connection errors
- [ ] Try login from frontend

---

## 🐛 TROUBLESHOOTING

### Still Getting Connection Timeout

**Check 1: Wait Longer**
```
MongoDB Atlas IP whitelist changes can take up to 2 minutes to propagate.
Wait 2-3 minutes after adding IP, then try again.
```

**Check 2: Verify IP Address**
```bash
# Check what was added
Go to: https://cloud.mongodb.com → Network Access
Should see: 0.0.0.0/0 with Status: Active
```

**Check 3: Check Connection String**
```bash
# Your MONGODB_URI should be:
mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system?retryWrites=true&w=majority

# Verify:
- Username correct: nftiki32_db_user
- Password correct: KtoEnEcTo95RsZnJ
- Cluster correct: uml21.qozvd62.mongodb.net
- Database name: inventory_system
```

**Check 4: Database User Permissions**
```
Go to: Database Access
User: nftiki32_db_user
Should have: "Read and write to any database" OR "Atlas admin"
```

---

## 🧪 TEST CONNECTION

### Test 1: Backend Health Check
```bash
curl https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/health
```

**Expected Success:**
```json
{
  "success": true,
  "message": "Server is running",
  "database": "connected"
}
```

**If Failed:**
```json
{
  "success": false,
  "message": "Database connection failed",
  "error": "MongoServerError: ..."
}
```

### Test 2: Check Backend Logs
```bash
vercel logs https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app --follow
```

Look for:
- ✅ `MongoDB connected successfully`
- ❌ `MongoServerError: connection timed out`
- ❌ `IP address not whitelisted`

### Test 3: Try Login
```bash
curl -X POST https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_sari","password":"password123"}'
```

---

## 🔐 SECURITY BEST PRACTICES

### Current Setup (0.0.0.0/0)
```
✅ Pros:
- Works immediately
- No need to track Vercel IP changes
- Simple setup

⚠️ Cons:
- Anyone can attempt connection (still needs credentials)
- Less secure than IP whitelist
```

### Recommended for Production
```
1. Use 0.0.0.0/0 untuk development/testing
2. Setelah stable, ganti ke specific Vercel IPs
3. Enable MongoDB Atlas audit logs
4. Use strong database passwords
5. Rotate credentials regularly
```

### Additional Security
```
✅ Use VPC Peering (MongoDB Atlas M10+)
✅ Enable encryption at rest
✅ Enable database audit logs
✅ Use different credentials for dev/prod
✅ Implement rate limiting in backend
```

---

## 📊 NETWORK ACCESS RECOMMENDATIONS

### For Development (Now)
```
IP Address: 0.0.0.0/0
Comment: Allow from anywhere (Development)
```

### For Production (Later)
```
Option 1: Vercel Specific IPs
- 76.76.21.0/24
- Comment: Vercel Production Backend

Option 2: VPC Peering (M10+ cluster)
- Configure VPC peering with Vercel
- More secure, better performance
```

---

## 🚀 QUICK GUIDE (TL;DR)

**5-Minute Setup:**

1. **Go to:** https://cloud.mongodb.com
2. **Click:** Network Access (sidebar)
3. **Click:** + ADD IP ADDRESS
4. **Click:** ALLOW ACCESS FROM ANYWHERE
5. **Click:** Confirm
6. **Wait:** 2 minutes
7. **Test:** `curl https://backend.../api/health`

**Done!** ✅

---

## 📞 SUPPORT

**If still not working after 5 minutes:**

1. Screenshot Network Access page
2. Check backend logs: `vercel logs <backend-url>`
3. Verify MONGODB_URI in Vercel environment variables
4. Check Database Access user permissions
5. Try creating new database user

**Common Issues:**
- ❌ Forgot to wait 2 minutes after adding IP
- ❌ Wrong MONGODB_URI in environment variables
- ❌ Database user doesn't have write permissions
- ❌ Typo in username/password

---

## ✅ SUCCESS CRITERIA

After completing setup:

✅ Network Access shows 0.0.0.0/0 Active
✅ Backend health check returns "database: connected"
✅ No MongoDB connection errors in logs
✅ Login works from frontend
✅ Can create/read data from database

---

## 🎊 FINAL CHECKLIST

Complete setup checklist:

**MongoDB Atlas:**
- [ ] IP address 0.0.0.0/0 added to Network Access
- [ ] Status shows "Active"
- [ ] Database user has correct permissions
- [ ] Waited 2 minutes for propagation

**Vercel Backend:**
- [ ] MONGODB_URI environment variable set
- [ ] JWT_SECRET environment variable set
- [ ] CORS_ORIGINS environment variable set
- [ ] NODE_ENV=production set
- [ ] Backend redeployed after env vars set

**Vercel Frontend:**
- [ ] VITE_API_BASE_URL environment variable set
- [ ] Other VITE_* variables set
- [ ] Frontend redeployed after env vars set

**Testing:**
- [ ] Backend health check successful
- [ ] No connection errors in logs
- [ ] Login works
- [ ] Data can be read/written

---

**Status:** After adding IP access, your backend should connect to MongoDB! 🎉

**Next:** After IP access works, continue with environment variable setup from VERCEL_CRITICAL_FIXES.md
