# Staff Customers Feature - Implementation Documentation

##  Overview
Fitur baru untuk Staff mengelola Customer dan Parts dengan mekanisme soft delete dan approval system.

##  Implementasi yang Telah Selesai

### 1. Backend API Endpoints

#### a. Customer Management (Staff)
**File:** ```inventory-backend/app/api/staff/customers/route.ts```

**Endpoints:**
- **GET** ```/api/staff/customers```
  - Mengambil semua customers dengan status 'active'
  - Support pagination, search, dan sorting
  - Hanya staff yang sudah terautentikasi

- **POST** ```/api/staff/customers```
  - Membuat customer baru
  - Validasi data dengan yup schema
  - Auto-set status: 'active'
  - Mencegah duplikasi nama customer

- **PUT** ```/api/staff/customers```
  - Update data customer
  - Hanya customer dengan status 'active' yang bisa diupdate
  - Validasi untuk mencegah duplikasi nama

- **DELETE** ```/api/staff/customers```
  - **Staff:** Submit delete request  status 'pending_delete'
  - **Admin/Manager/Direktur:** Direct delete (dengan validasi referensi)
  - Wajib menyertakan alasan penghapusan
  - Mencatat delete request ke field deleteRequest

#### b. Customer Parts Management
**File:** ```inventory-backend/app/api/staff/customers/parts/route.ts```

**Endpoints:**
- **GET** ```/api/staff/customers/parts?customerId={id}```
  - Mengambil semua parts berdasarkan customer ID
  - Support pagination dan search

- **PUT** ```/api/staff/customers/parts```
  - Update informasi part
  - Validasi supplier reference

- **DELETE** ```/api/staff/customers/parts```
  - Hard delete part (tanpa soft delete)
  - Validasi part masih ada

#### c. Delete Request Approval System
**File:** ```inventory-backend/app/api/staff/customers/delete-requests/route.ts```

**Endpoints:**
- **GET** ```/api/staff/customers/delete-requests```
  - Mengambil semua delete requests
  - Filter berdasarkan status: pending/approved/rejected
  - Hanya untuk Admin/Manager/Direktur

- **PUT** ```/api/staff/customers/delete-requests```
  - Approve atau reject delete request
  - Action: 'approve' atau 'reject'
  - Saat approve: validasi referensi part & PO terlebih dahulu
  - Update status customer dan delete request info

---

### 2. Frontend Implementation

#### a. API Library Functions
**File:** ```inventory-frontend/src/lib/api.ts```

**Functions yang ditambahkan:**
```typescript
// Staff Customer APIs
- getStaffCustomersApi(params)
- createStaffCustomerApi(payload)
- updateStaffCustomerApi(id, payload)
- deleteStaffCustomerApi(id, reason)

// Customer Parts APIs
- getCustomerPartsApi(params)
- updateCustomerPartApi(id, payload)
- deleteCustomerPartApi(id)

// Delete Requests APIs
- getCustomerDeleteRequestsApi(params)
- approveCustomerDeleteApi(id, action, notes)
```

#### b. StaffCustomers Component
**File:** ```inventory-frontend/src/components/StaffCustomers.tsx```

**Fitur Utama:**
1. **Customer List (Left Panel)**
   - Daftar semua customers dengan status active
   - Search functionality
   - Tombol tambah customer
   - Edit & hapus per customer
   - Click untuk melihat parts

2. **Parts Table (Right Panel)**
   - Menampilkan parts dari customer yang dipilih
   - Edit dan hapus part
   - Responsive table layout

3. **Modals:**
   - **Customer Modal:** Create & Edit customer
   - **Part Modal:** Edit part
   - **Delete Customer Modal:** 
     - Form dengan alasan wajib diisi
     - Warning bahwa perlu approval
   - **Delete Part Modal:** Konfirmasi hapus part

4. **Features:**
   -  Full CRUD operations
   -  Soft delete dengan approval workflow
   -  Form validation dengan react-hook-form
   -  Toast notifications
   -  Responsive design
   -  Loading states
   -  Error handling

#### c. App Routing
**File:** ```inventory-frontend/src/App.tsx```

**Perubahan:**
- Import lazy loading untuk StaffCustomers component
- Tambahkan route 'staff-customers' ke pages object
- Support page navigation dan suspense loading

#### d. Sidebar Navigation
**File:** ```inventory-frontend/src/components/Sidebar.tsx```

**Perubahan:**
- Import icon Building dari lucide-react
- Tambahkan menu item baru di section "Operasi (Staff)":
  - **ID:** 'staff-customers'
  - **Label:** 'Staff Customers'
  - **Icon:** Building
  - **Roles:** ['staff', 'manager', 'admin', 'direktur']

---

##  Authorization & Security

### Role-Based Access Control
- **Staff:** 
  - Read, Create, Update customers
  - Submit delete requests (soft delete)
  - Manage parts
  
- **Manager/Admin/Direktur:**
  - Semua akses staff
  - Approve/reject delete requests
  - Direct delete (dengan validasi)

### Security Features
-  JWT Authentication required
-  Role-based middleware
-  Input sanitization
-  Data validation (yup schema)
-  Rate limiting
-  Audit logging untuk semua actions
-  Duplicate prevention

---

##  Database Schema Updates

### Customer Model (Existing + Enhanced)
```typescript
{
  name: String,
  address: String,
  contactPerson: String (optional),
  phone: String (optional),
  email: String (optional),
  status: 'active' | 'pending_delete' | 'deleted',
  deleteRequest: {
    userId: String,
    username: String,
    reason: String,
    timestamp: Date,
    approvedBy: String (optional),
    approvalTimestamp: Date (optional),
    status: 'pending' | 'approved' | 'rejected'
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

##  User Flow

### Staff - Delete Customer Request Flow
1. Staff membuka halaman Staff Customers
2. Pilih customer yang ingin dihapus
3. Klik tombol "Hapus"
4. Modal konfirmasi muncul
5. **Wajib mengisi alasan penghapusan**
6. Submit request
7. Customer status berubah menjadi 'pending_delete'
8. Toast notification: "Request delete customer berhasil diajukan"
9. Menunggu approval dari Admin/Manager/Direktur

### Admin/Manager/Direktur - Approval Flow
1. Buka halaman "Persetujuan Hapus" atau endpoint delete requests
2. Lihat daftar delete requests dengan status 'pending'
3. Review customer info dan alasan penghapusan
4. Approve atau Reject:
   - **Approve:** System validasi dulu (cek referensi Part & PO)
   - **Reject:** Customer kembali ke status 'active'
5. Audit log tercatat

---

##  Testing Checklist

### Frontend Tests
- [ ] Customer list loading
- [ ] Search functionality
- [ ] Create customer
- [ ] Update customer
- [ ] Delete request customer
- [ ] View customer parts
- [ ] Update part
- [ ] Delete part
- [ ] Form validation
- [ ] Error handling
- [ ] Toast notifications
- [ ] Responsive design

### Backend Tests
- [ ] GET customers with pagination
- [ ] POST create customer (validation)
- [ ] PUT update customer (validation)
- [ ] DELETE request customer (staff role)
- [ ] DELETE direct customer (admin role)
- [ ] GET customer parts
- [ ] PUT update part
- [ ] DELETE part
- [ ] GET delete requests
- [ ] PUT approve/reject delete request
- [ ] Authorization checks
- [ ] Audit logging

---

##  API Examples

### Create Customer
```bash
POST /api/staff/customers
Authorization: Bearer {token}
Content-Type: application/json

{
  \"name\": \"PT ABC Indonesia\",
  \"address\": \"Jl. Sudirman No. 123, Jakarta\",
  \"contactPerson\": \"John Doe\",
  \"phone\": \"021-1234567\",
  \"email\": \"contact@abc.com\"
}
```

### Delete Request Customer (Staff)
```bash
DELETE /api/staff/customers
Authorization: Bearer {token}
Content-Type: application/json

{
  \"id\": \"60d5ec49f1b2c8b1f8c4e8a1\",
  \"reason\": \"Customer sudah tidak aktif sejak 6 bulan terakhir\"
}
```

### Approve Delete Request (Admin)
```bash
PUT /api/staff/customers/delete-requests
Authorization: Bearer {token}
Content-Type: application/json

{
  \"id\": \"60d5ec49f1b2c8b1f8c4e8a1\",
  \"action\": \"approve\",
  \"notes\": \"Approved setelah konfirmasi dengan sales team\"
}
```

---

##  Deployment Notes

### Prerequisites
- MongoDB dengan Customer collection
- Backend environment variables configured
- Frontend API base URL configured

### Build & Run
```bash
# Backend
cd inventory-backend
npm run build
npm run start

# Frontend
cd inventory-frontend
npm run build
npm run preview
```

---

##  Known Issues & TODOs

### Current TypeScript Warnings (Not Critical)
- NotificationCenter.tsx: Unused imports
- OfflineStatusIndicator.tsx: Unused imports
- offlineManager.ts: toast.info not found (minor)

### Future Enhancements
- [ ] Batch delete customers
- [ ] Export customer data to CSV/Excel
- [ ] Customer activity history
- [ ] Advanced filtering (by date, status, etc.)
- [ ] Customer statistics dashboard
- [ ] Email notifications untuk delete requests
- [ ] Restore deleted customers
- [ ] Customer merge functionality

---

##  Contributors
- Implementation Date: November 2, 2025
- Feature: Staff Customers Management with Soft Delete & Approval

---

##  License
Internal Use - PT USBERSA MITRA LOGAM Inventory Management System
