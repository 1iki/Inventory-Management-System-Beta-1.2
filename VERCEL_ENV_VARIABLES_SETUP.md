# 🔧 Vercel Environment Variables Setup

**Date**: 3 November 2025  
**Latest Backend**: `ev6m50tkl`  
**Latest Frontend**: `cz3e7n1vg`

---

## 📋 Backend Environment Variables

### Go to:
```
https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables
```

### Required Variables:

#### 1. MONGODB_URI
**Value**:
```
mongodb+srv://nftiki32_db_user:KtoEnEcTo95RsZnJ@uml21.qozvd62.mongodb.net/inventory_system
```
**Environment**: Production ✅

**Description**: MongoDB Atlas connection string untuk database inventory_system

---

#### 2. JWT_SECRET
**Generate New Value**:
```bash
# Run this command in terminal:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Example Output** (use the actual output from command):
```
a8f5f167f44f4964e6c998dee827110c8bd1f0rbd1b0ec7f60855bda8fb6a5z9f7c3b2d1e8a9f0b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
```

**Environment**: Production ✅

**Description**: Secret key untuk JWT token signing

---

#### 3. CORS_ORIGINS
**Value**:
```
https://inventory-frontend-rouge.vercel.app
```

**Environment**: Production ✅

**Description**: Allowed origins untuk CORS. Gunakan single production domain.

**Note**: Preview deployments (inventory-frontend-*-1ikis-projects.vercel.app) sudah di-handle otomatis oleh regex pattern di middleware.

---

#### 4. NODE_ENV
**Value**:
```
production
```

**Environment**: Production ✅

**Description**: Node environment mode

---

### How to Add Variables (Backend):

1. **Go to**: https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables

2. **Click**: "Add New" button

3. **For each variable**:
   - **Key**: Variable name (e.g., `MONGODB_URI`)
   - **Value**: Paste the value
   - **Environment**: Select "Production" ✅
   - Click "Save"

4. **After adding all variables**, redeploy:
   ```bash
   cd inventory-backend
   vercel --prod
   ```

---

## 📋 Frontend Environment Variables

### Go to:
```
https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables
```

### Required Variables:

#### 1. VITE_API_BASE_URL
**Value**:
```
https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app
```

**Environment**: Production ✅

**Description**: Backend API base URL (WITHOUT /api suffix)

**⚠️ Important**: Do NOT include `/api` at the end! It's added automatically by frontend code.

---

#### 2. VITE_API_TIMEOUT (Optional)
**Value**:
```
30000
```

**Environment**: Production ✅

**Description**: API request timeout in milliseconds (30 seconds)

---

### How to Add Variables (Frontend):

1. **Go to**: https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables

2. **Click**: "Add New" button

3. **Add VITE_API_BASE_URL**:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app`
   - **Environment**: Select "Production" ✅
   - Click "Save"

4. **Add VITE_API_TIMEOUT** (optional):
   - **Key**: `VITE_API_TIMEOUT`
   - **Value**: `30000`
   - **Environment**: Select "Production" ✅
   - Click "Save"

5. **After adding variables**, redeploy:
   ```bash
   cd inventory-frontend
   vercel --prod
   ```

---

## 🔐 Generate JWT_SECRET

Run this command in terminal to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Copy the output** and use it as the value for `JWT_SECRET` in backend environment variables.

**Example output**:
```
4f8a9c2d6e1b7f3a5d9c8e2b4f7a1c3d6e9b2f5a8c1d4e7f0b3a6c9d2e5f8a1b
```

---

## 📊 Summary Table

### Backend Environment Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://nftiki32_db_user:***@uml21.qozvd62.mongodb.net/inventory_system` | Production |
| `JWT_SECRET` | `[generated-64-char-hex]` | Production |
| `CORS_ORIGINS` | `https://inventory-frontend-rouge.vercel.app` | Production |
| `NODE_ENV` | `production` | Production |

### Frontend Environment Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app` | Production |
| `VITE_API_TIMEOUT` | `30000` | Production |

---

## 🚀 Deployment Steps

### After Setting Backend Env Vars:
```bash
cd /workspaces/Inventory-Management-System-Beta-1.2/inventory-backend
vercel --prod
```

### After Setting Frontend Env Vars:
```bash
cd /workspaces/Inventory-Management-System-Beta-1.2/inventory-frontend
vercel --prod
```

---

## 🧪 Verification

### Test Backend After Env Vars Set:

```bash
# Health check - should show "connected"
curl -s https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api/health | python3 -m json.tool
```

**Expected**:
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "database": "inventory_system"
  }
}
```

### Test Login:

```bash
curl -X POST https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_sari","password":"password123"}'
```

**Expected**:
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": { "username": "admin_sari", "role": "admin" },
    "token": "..."
  }
}
```

### Test Frontend:

Open browser: `https://inventory-frontend-rouge.vercel.app`

1. Click Login
2. Enter credentials:
   - Username: `admin_sari`
   - Password: `password123`
3. Should login successfully without CORS errors

---

## 📱 Quick Copy Commands

### Generate JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Backend URLs:
```
Dashboard: https://vercel.com/1ikis-projects/inventory-backend/settings/environment-variables
API URL: https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app
```

### Frontend URLs:
```
Dashboard: https://vercel.com/1ikis-projects/inventory-frontend/settings/environment-variables
App URL: https://inventory-frontend-rouge.vercel.app
Latest: https://inventory-frontend-cz3e7n1vg-1ikis-projects.vercel.app
```

---

## ⚠️ Important Notes

1. **Backend URL tanpa /api**: 
   - ✅ Correct: `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app`
   - ❌ Wrong: `https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app/api`

2. **JWT_SECRET**: 
   - Must be unique and secure
   - Generate new one dengan command di atas
   - Minimum 64 characters recommended

3. **CORS_ORIGINS**: 
   - Production domain only: `https://inventory-frontend-rouge.vercel.app`
   - Preview deployments handled automatically by regex

4. **After setting env vars**:
   - MUST redeploy untuk apply changes
   - Vercel tidak auto-redeploy saat env vars berubah

5. **Database Connection**:
   - Pastikan MongoDB Atlas Network Access includes `0.0.0.0/0` (or Vercel IPs)
   - Database user has read/write permissions

---

## 🎯 Checklist

### Backend:
- [ ] Go to Vercel backend settings
- [ ] Add `MONGODB_URI` 
- [ ] Generate and add `JWT_SECRET`
- [ ] Add `CORS_ORIGINS`
- [ ] Add `NODE_ENV`
- [ ] Redeploy backend
- [ ] Test health endpoint (should show "connected")
- [ ] Test login endpoint

### Frontend:
- [ ] Go to Vercel frontend settings
- [ ] Add `VITE_API_BASE_URL`
- [ ] Add `VITE_API_TIMEOUT` (optional)
- [ ] Redeploy frontend
- [ ] Test in browser (login should work)
- [ ] Verify no CORS errors in console

---

**Setup Complete!** ✅

After setting all environment variables dan redeploy, aplikasi akan fully functional dengan:
- ✅ Backend connected to database
- ✅ Frontend connected to backend
- ✅ CORS working properly
- ✅ Authentication working
- ✅ All features functional
