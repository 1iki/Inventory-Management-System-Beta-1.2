# 🔧 Panduan Lengkap Environment Variables untuk Vercel

## 📋 Daftar Isi
1. [MONGODB_URI - Database Connection](#1-mongodb_uri---database-connection)
2. [JWT_SECRET - Security Token](#2-jwt_secret---security-token)
3. [CORS_ORIGINS - Frontend URLs](#3-cors_origins---frontend-urls)
4. [NODE_ENV - Environment Mode](#4-node_env---environment-mode)

---

## 1. MONGODB_URI - Database Connection

### ❓ Apa itu MONGODB_URI?
Connection string untuk menghubungkan backend ke database MongoDB Atlas (cloud database).

### 🔗 Format Connection String

Ada 2 jenis connection string yang bisa digunakan:

#### **A. Standard Connection String (Recommended untuk Vercel)**
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

#### **B. DNS SRV Connection String**
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority&appName=APPNAME
```

### 📝 Cara Mendapatkan Connection String

1. **Login ke MongoDB Atlas**: https://cloud.mongodb.com
2. **Pilih Cluster Anda**
3. **Klik tombol "Connect"**
4. **Pilih "Connect your application"**
5. **Driver**: Node.js (Version 5.5 or later)
6. **Copy connection string yang diberikan**

### 🎯 Contoh Nyata

#### Contoh Connection String yang Sudah Anda Miliki:
```
mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system
```

**Penjelasan:**
- `nftiki32_db_user` = Username database
- `KtoEnEcTo95RsZnJ` = Password database
- `uml21.qozvd62.mongodb.net` = Cluster host
- `inventory_system` = Nama database

### ✅ Untuk Vercel Backend

**Value yang harus diisi:**
```
mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system?retryWrites=true&w=majority
```

### ⚠️ Penting!

1. **Network Access**: Pastikan MongoDB Atlas sudah mengizinkan IP Vercel
   - Buka MongoDB Atlas → Network Access
   - Add IP Address: `0.0.0.0/0` (Allow from anywhere)
   - Untuk production, sebaiknya whitelist IP Vercel secara spesifik

2. **Database User**: Pastikan user memiliki permission Read & Write
   - Database Access → Edit user
   - Privilege: "Atlas admin" atau "Read and write to any database"

3. **Test Connection**: Setelah setting di Vercel, test dengan:
   ```bash
   curl https://your-backend.vercel.app/api/health
   ```

---

## 2. JWT_SECRET - Security Token

### ❓ Apa itu JWT_SECRET?

JWT_SECRET adalah **kunci rahasia** yang digunakan untuk:
- 🔐 Membuat token autentikasi (sign JWT token)
- ✅ Memverifikasi token yang diterima (verify JWT token)
- 🛡️ Melindungi data user dari pemalsuan

### 🔍 Bagaimana JWT Bekerja?

```
User Login → Backend Generate Token → Frontend Simpan Token → 
Frontend Kirim Token di Header → Backend Verify Token → Access Granted
```

**Proses Detail:**

1. **User Login**:
   ```
   POST /api/auth/login
   Body: { username: "admin", password: "secret" }
   ```

2. **Backend Generate Token** (menggunakan JWT_SECRET):
   ```typescript
   const token = jwt.sign(
     { id: user.id, username: user.username, role: user.role },
     JWT_SECRET,  // ← Kunci rahasia untuk sign
     { expiresIn: '24h' }
   );
   ```

3. **Token dikirim ke Frontend**:
   ```json
   {
     "success": true,
     "data": {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "user": { ... }
     }
   }
   ```

4. **Frontend menyimpan dan mengirim token di setiap request**:
   ```javascript
   fetch('/api/inventory/items', {
     headers: {
       'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
     }
   })
   ```

5. **Backend verify token** (menggunakan JWT_SECRET):
   ```typescript
   const decoded = jwt.verify(token, JWT_SECRET);  // ← Verify dengan kunci yang sama
   // Jika JWT_SECRET berbeda = Token Invalid!
   ```

### 🎲 Cara Generate JWT_SECRET

#### **Metode 1: Node.js (Recommended)**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### **Metode 2: OpenSSL**
```bash
openssl rand -hex 64
```

#### **Metode 3: Online Generator**
- https://www.grc.com/passwords.htm (Perfect Passwords)
- https://generate-secret.vercel.app/

### ✅ Contoh JWT_SECRET untuk Vercel

**Contoh 1** (64 bytes hex):
```
d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3
```

**Contoh 2** (Base64, 64 chars):
```
Kx7jP9mN3vR8wT5qL2zB6yF4hD1gS8cV0nM3xK7pW9eU4rY6tI2oA5sJ8fG1dH3k
```

**Contoh 3** (Simple but secure, 32+ chars):
```
MyInventorySystemSecretKey2024!@#$%^&*()_+
```

### ⚠️ Aturan JWT_SECRET

✅ **DO (Harus):**
- Minimal 32 karakter
- Kombinasi huruf, angka, simbol
- Unik untuk setiap environment (development ≠ production)
- Simpan dengan aman (jangan commit ke git!)
- Gunakan generator cryptographic

❌ **DON'T (Jangan):**
- Gunakan kata-kata umum: `secret`, `password`, `123456`
- Gunakan JWT_SECRET yang sama dengan development
- Share JWT_SECRET ke orang lain
- Commit JWT_SECRET ke repository public

### 🔄 Kapan Harus Ganti JWT_SECRET?

Ganti JWT_SECRET jika:
- 🚨 JWT_SECRET bocor/diketahui orang lain
- 🔄 Deploy production pertama kali
- 🛡️ Ada security breach
- 📅 Rotasi security berkala (setiap 3-6 bulan)

**Efek mengganti JWT_SECRET:**
- ⚠️ Semua token yang ada menjadi invalid
- 👥 Semua user harus login ulang
- 🔒 Lebih aman karena token lama tidak bisa digunakan

---

## 3. CORS_ORIGINS - Frontend URLs

### ❓ Apa itu CORS_ORIGINS?

CORS (Cross-Origin Resource Sharing) adalah **daftar URL frontend** yang diizinkan untuk mengakses API backend Anda.

### 🛡️ Mengapa CORS Penting?

**Tanpa CORS:**
```
Frontend (vercel.app) → Request ke Backend → ❌ BLOCKED
Error: "Access-Control-Allow-Origin header missing"
```

**Dengan CORS:**
```
Frontend (vercel.app) → Request ke Backend → ✅ ALLOWED
Response: { success: true, data: {...} }
```

### 📝 Format CORS_ORIGINS

#### **Single URL:**
```
https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app
```

#### **Multiple URLs (dipisah koma, TANPA spasi):**
```
https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app,https://custom-domain.com,https://www.custom-domain.com
```

### ✅ URL Frontend yang Harus Digunakan

**Untuk Vercel Backend, gunakan URL frontend Vercel Anda:**
```
https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app
```

### 🎯 Contoh Lengkap

#### **Development + Production:**
```
http://localhost:5173,http://localhost:5174,https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app
```

#### **Production Only (Recommended untuk Vercel):**
```
https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app
```

#### **Dengan Custom Domain:**
```
https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app,https://inventory.yourdomain.com
```

### ⚠️ Aturan CORS_ORIGINS

✅ **DO:**
- Gunakan HTTPS untuk production
- Pisahkan dengan koma (TANPA spasi!)
- Gunakan URL lengkap dengan protocol (https://)
- Include subdomain jika berbeda (`www.` vs non-www)

❌ **DON'T:**
- Jangan gunakan `*` di production (security risk!)
- Jangan ada spasi: `url1, url2` ❌ → `url1,url2` ✅
- Jangan lupa protocol: `domain.com` ❌ → `https://domain.com` ✅
- Jangan include trailing slash: `https://domain.com/` ❌

### 🔍 Cara Cek URL Frontend Vercel Anda

1. **Buka Vercel Dashboard**: https://vercel.com/dashboard
2. **Pilih project "inventory-frontend"**
3. **Copy URL di bagian "Domains"**
4. **URL akan seperti**: `https://inventory-frontend-xxxxx.vercel.app`

### 🔄 Jika Ganti Custom Domain

Jika nanti Anda setup custom domain (misal: `inventory.mycompany.com`), 
tambahkan ke CORS_ORIGINS:

```
https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app,https://inventory.mycompany.com,https://www.inventory.mycompany.com
```

---

## 4. NODE_ENV - Environment Mode

### ❓ Apa itu NODE_ENV?

NODE_ENV adalah **mode environment** yang menentukan apakah aplikasi berjalan dalam mode:
- `development` - Mode pengembangan
- `production` - Mode produksi (live)
- `test` - Mode testing

### 🎯 Untuk Vercel: Selalu Gunakan `production`

```
NODE_ENV=production
```

### 🔍 Perbedaan Development vs Production

| Fitur | Development | Production |
|-------|-------------|------------|
| **Logging** | Verbose (detail) | Minimal |
| **Error Messages** | Full stack trace | User-friendly |
| **Caching** | Disabled | Enabled |
| **Minification** | No | Yes |
| **Source Maps** | Yes | No (atau separate) |
| **Hot Reload** | Yes | No |
| **Performance** | Slower | Optimized |
| **Security** | Relaxed | Strict |

### 📝 Contoh Penggunaan dalam Code

```typescript
// lib/config.ts
export const config = {
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    // ... other config
  }
};

// Conditional logic based on NODE_ENV
if (config.app.nodeEnv === 'development') {
  // Enable verbose logging
  console.log('🐛 Debug mode enabled');
  // Disable TLS validation (for self-signed certs)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
} else {
  // Production mode
  console.log('🚀 Production mode');
  // Enable strict security
}
```

### ✅ Contoh untuk Vercel Backend

**Value yang harus diisi:**
```
production
```

### ⚠️ Catatan Penting

1. **Vercel Otomatis Set NODE_ENV**:
   - Vercel production deployments → `NODE_ENV=production`
   - Vercel preview deployments → `NODE_ENV=production`
   - Anda tetap bisa override jika perlu

2. **Jangan Gunakan `development` di Vercel**:
   ```
   ❌ NODE_ENV=development  (akan enable debug mode, TLS bypass, dll)
   ✅ NODE_ENV=production   (optimized, secure)
   ```

---

## 🎯 Summary: Isi untuk Vercel Backend

Buka: https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables

| Variable | Value |
|----------|-------|
| **MONGODB_URI** | `mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system?retryWrites=true&w=majority` |
| **JWT_SECRET** | `Kx7jP9mN3vR8wT5qL2zB6yF4hD1gS8cV0nM3xK7pW9eU4rY6tI2oA5sJ8fG1dH3k` (generate yang baru!) |
| **CORS_ORIGINS** | `https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app` |
| **NODE_ENV** | `production` |

### 🔐 Generate JWT_SECRET Sekarang:

```bash
# Jalankan command ini untuk generate JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy hasilnya dan paste sebagai value JWT_SECRET di Vercel.

---

## 🎯 Summary: Isi untuk Vercel Frontend

Buka: https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables

| Variable | Value |
|----------|-------|
| **VITE_API_BASE_URL** | `https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api` |
| **VITE_ENABLE_QR_SCANNER** | `true` |
| **VITE_ENABLE_OFFLINE_MODE** | `true` |

---

## 📋 Checklist Setup

### Backend Environment Variables:
- [ ] MONGODB_URI - Connection string dari MongoDB Atlas
- [ ] JWT_SECRET - Generate baru dengan crypto (64+ chars)
- [ ] CORS_ORIGINS - URL frontend Vercel
- [ ] NODE_ENV - Set ke `production`

### MongoDB Atlas:
- [ ] Network Access → Add IP `0.0.0.0/0`
- [ ] Database Access → User memiliki Read/Write permission

### Frontend Environment Variables:
- [ ] VITE_API_BASE_URL - URL backend Vercel + `/api`
- [ ] VITE_ENABLE_QR_SCANNER - Set `true`
- [ ] VITE_ENABLE_OFFLINE_MODE - Set `true`

### Testing:
- [ ] Redeploy backend setelah set environment variables
- [ ] Redeploy frontend setelah set environment variables
- [ ] Test health check: `curl https://backend-url/api/health`
- [ ] Test frontend: Buka frontend URL di browser
- [ ] Test login dengan user demo

---

## 🚀 Next Steps

1. **Generate JWT_SECRET baru**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Setup Backend Environment Variables**:
   - Buka: https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables
   - Add 4 variables (MONGODB_URI, JWT_SECRET, CORS_ORIGINS, NODE_ENV)
   - Save

3. **Setup Frontend Environment Variables**:
   - Buka: https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables
   - Add 3 variables (VITE_API_BASE_URL, VITE_ENABLE_QR_SCANNER, VITE_ENABLE_OFFLINE_MODE)
   - Save

4. **Redeploy Both**:
   - Backend: Vercel Dashboard → inventory-backend → Deployments → Redeploy
   - Frontend: Vercel Dashboard → inventory-frontend → Deployments → Redeploy

5. **Test**:
   ```bash
   # Test backend
   curl https://inventory-backend-pliomvjaz-1ikis-projects.vercel.app/api/health
   
   # Open frontend
   open https://inventory-frontend-mqcwuro0t-1ikis-projects.vercel.app
   ```

---

## ❓ FAQ

**Q: Apakah harus generate JWT_SECRET baru?**
A: **YA!** Jangan gunakan JWT_SECRET development di production. Generate yang baru untuk keamanan.

**Q: Bagaimana jika lupa JWT_SECRET?**
A: Tidak masalah, tapi semua user harus login ulang. Generate baru dan update di Vercel.

**Q: Apakah MONGODB_URI saya sudah benar?**
A: Iya, connection string Anda sudah benar. Pastikan MongoDB Atlas Network Access sudah allow 0.0.0.0/0.

**Q: Kenapa harus 0.0.0.0/0 di MongoDB Atlas?**
A: Karena Vercel menggunakan dynamic IP. Untuk allow semua IP Vercel, gunakan 0.0.0.0/0.

**Q: Apakah aman menggunakan 0.0.0.0/0?**
A: Aman karena tetap butuh username & password. Tapi untuk extra security, bisa whitelist IP range Vercel spesifik.

**Q: CORS_ORIGINS harus pakai HTTPS?**
A: YA untuk production. Vercel otomatis pakai HTTPS, jadi selalu gunakan `https://`.

**Q: Bagaimana jika punya multiple frontend domains?**
A: Pisahkan dengan koma tanpa spasi: `https://domain1.com,https://domain2.com`

---

## 📚 Resources

- MongoDB Atlas: https://cloud.mongodb.com
- Vercel Dashboard: https://vercel.com/dashboard
- JWT.io (test JWT): https://jwt.io
- CORS Documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

**🎉 Setelah setup semua environment variables dan redeploy, aplikasi Anda siap digunakan!**
