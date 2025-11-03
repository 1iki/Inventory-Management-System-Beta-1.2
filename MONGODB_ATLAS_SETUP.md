# MongoDB Atlas Setup Guide

## 🚀 Quick Setup

### 1. Persiapan MongoDB Atlas

1. **Buka MongoDB Atlas**: https://cloud.mongodb.com
2. **Login atau daftar** akun MongoDB Atlas
3. **Buat cluster baru** (jika belum ada):
   - Pilih "Build a Database"
   - Pilih FREE tier (M0 Sandbox)
   - Pilih region terdekat (Singapore/Asia-Pacific)
   - Beri nama cluster (misal: `Cluster0`)

### 2. Konfigurasi Database Access

1. **Buat Database User**:
   - Masuk ke "Database Access"
   - Klik "Add New Database User"
   - Authentication Method: Password
   - Username: `inventory_user`
   - Password: Generate password yang kuat atau buat sendiri
   - Database User Privileges: "Read and write to any database"
   - Klik "Add User"

### 3. Konfigurasi Network Access

1. **Whitelist IP Address**:
   - Masuk ke "Network Access"
   - Klik "Add IP Address"
   - Untuk development: pilih "Allow Access from Anywhere" (0.0.0.0/0)
   - Untuk production: masukkan IP address spesifik
   - Klik "Confirm"

### 4. Dapatkan Connection String

1. **Ambil Connection String**:
   - Masuk ke "Database" → "Clusters"
   - Klik tombol "Connect" pada cluster Anda
   - Pilih "Connect your application"
   - Driver: Node.js, Version: 5.5 or later
   - Copy connection string

### 5. Konfigurasi Backend

1. **Update .env.local**:
   ```bash
   # Ganti dengan connection string Anda
   MONGODB_URI=mongodb+srv://inventory_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/inventory_system?retryWrites=true&w=majority
   ```

2. **Ganti placeholder**:
   - `inventory_user` → username yang Anda buat
   - `YOUR_PASSWORD` → password yang Anda buat
   - `cluster0.xxxxx` → nama cluster dan host Anda
   - `inventory_system` → nama database

## 🧪 Testing Koneksi

### Test Koneksi Atlas
```bash
cd inventory-backend
npm run test-atlas
```

### Test Health Endpoint
```bash
# Start backend server
npm run dev

# Di terminal baru, test health endpoint
curl http://localhost:3001/api/health
```

## 📋 Contoh Connection String

```
mongodb+srv://inventory_user:MySecurePassword123@cluster0.abc123.mongodb.net/inventory_system?retryWrites=true&w=majority
```

## 🔧 Troubleshooting

### Error: Authentication Failed
- ✅ Periksa username dan password
- ✅ Pastikan user memiliki akses read/write
- ✅ Cek nama database di connection string

### Error: IP Not Whitelisted
- ✅ Tambahkan IP Anda ke Network Access
- ✅ Atau gunakan 0.0.0.0/0 untuk development

### Error: Hostname Not Found
- ✅ Periksa nama cluster di connection string
- ✅ Pastikan cluster aktif dan running

### Error: Connection Timeout
- ✅ Cek koneksi internet
- ✅ Pastikan region cluster accessible
- ✅ Coba cluster di region lain

## 🎯 Next Steps

1. **Test koneksi**: `npm run test-atlas`
2. **Seed database**: `npm run seed`
3. **Start development**: `npm run dev`
4. **Test frontend**: Buka http://localhost:5174

## 📊 Database Structure

Sistem akan membuat collections berikut:
- `users` - Data pengguna
- `customers` - Data customer
- `parts` - Data parts/spare parts
- `purchaseorders` - Data purchase orders
- `inventoryitems` - Data inventory items
- `auditlogs` - Audit trail

## 🔒 Security Notes

- **Production**: Jangan gunakan 0.0.0.0/0 untuk IP whitelist
- **Password**: Gunakan password yang kuat untuk database user
- **Environment**: Jangan commit .env.local ke git
- **Access**: Berikan akses database minimal yang diperlukan