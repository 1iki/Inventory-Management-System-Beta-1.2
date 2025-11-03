# Inventory System - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account
- Git (optional)

### Backend Setup

1. **Navigate to backend directory**
```bash
cd inventory-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
   - File `.env.local` sudah dikonfigurasi dengan MongoDB Atlas
   - Pastikan connection string sudah benar:
```
MONGODB_URI=mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system?retryWrites=true&w=majority&appName=uml21
```

4. **Test MongoDB connection**
```bash
npm run test-atlas
```

5. **Seed initial data**
```bash
npm run seed
```

6. **Start backend server**
```bash
npm run dev
```

Backend akan berjalan di: `http://localhost:3001`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd inventory-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
   - File `.env` sudah dikonfigurasi dengan backend URL
```
VITE_API_BASE_URL=http://localhost:3001
```

4. **Start frontend server**
```bash
npm run dev
```

Frontend akan berjalan di: `http://localhost:5173`

## 🔑 Default Login Credentials

Setelah seeding database, gunakan kredensial berikut:

| Username | Password | Role |
|----------|----------|------|
| direktur_budi | password123 | Direktur |
| admin_sari | password123 | Admin |
| manager_andi | password123 | Manager |
| staff_dewi | password123 | Staff |

## 🔧 Troubleshooting

### Backend tidak bisa connect ke MongoDB Atlas

1. **Periksa IP Whitelist**
   - Buka https://cloud.mongodb.com
   - Pilih cluster Anda
   - Pergi ke "Network Access"
   - Tambahkan IP address Anda atau gunakan `0.0.0.0/0` untuk development

2. **Periksa Database User**
   - Pergi ke "Database Access"
   - Pastikan user `nftiki32_db_user` ada
   - Pastikan password benar
   - Pastikan role minimal "Read and write to any database"

3. **Periksa Cluster Status**
   - Pastikan cluster tidak dalam status "Paused"
   - Restart cluster jika perlu

4. **Test Connection**
```bash
cd inventory-backend
npm run test-atlas
```

### Frontend tidak bisa connect ke Backend

1. **Pastikan backend running**
```bash
# Di terminal backend
npm run dev
```

2. **Periksa port**
   - Backend: `http://localhost:3001`
   - Frontend: `http://localhost:5173`

3. **Test health endpoint**
   - Buka browser: `http://localhost:3001/api/health`
   - Atau gunakan curl:
```bash
curl http://localhost:3001/api/health
```

4. **Periksa CORS**
   - File `.env.local` di backend sudah include `http://localhost:5173`

### Error saat npm install

1. **Clear cache**
```bash
npm cache clean --force
```

2. **Delete node_modules dan install ulang**
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Gunakan Node.js LTS version**
```bash
node --version  # Should be 18.x or higher
```

## 📋 Available Scripts

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with initial data
- `npm run test-db` - Test database connection
- `npm run test-atlas` - Test MongoDB Atlas connection

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🗄️ Database Structure

### Collections
- **users** - User accounts dan authentication
- **customers** - Customer data
- **parts** - Part/component catalog
- **purchaseorders** - Purchase orders
- **inventoryitems** - Inventory items dengan QR codes
- **auditlogs** - Activity audit trail

## 🌐 API Endpoints

Base URL: `http://localhost:3001/api`

### Authentication
- `POST /auth/login` - User login

### Master Data
- `GET/POST/PUT/DELETE /master/customers` - Customer management
- `GET/POST/PUT/DELETE /master/parts` - Parts management
- `GET/POST/PUT/DELETE /master/purchase-orders` - PO management

### Inventory
- `GET/POST /inventory/items` - Inventory items
- `PUT /inventory/items/scan-out` - Scan out items
- `GET/POST/PUT /inventory/items/delete-requests` - Delete requests

### Reports & Others
- `GET /reports` - Generate reports
- `GET /reports/export` - Export to Excel
- `GET /audit` - Audit logs
- `GET /dashboard` - Dashboard statistics
- `GET /health` - Health check

## 📞 Support

Jika masih ada masalah:
1. Periksa console log di browser (F12)
2. Periksa terminal output backend
3. Pastikan semua dependencies terinstall
4. Restart kedua server (frontend & backend)

## 🔒 Security Notes

- Jangan gunakan password default di production
- Ganti JWT_SECRET di production
- Gunakan IP whitelist yang spesifik di MongoDB Atlas
- Enable SSL/TLS untuk production deployment
