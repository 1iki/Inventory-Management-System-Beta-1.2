# Spesifikasi Kebutuhan Perangkat Lunak (SKPL)

## Sistem Pelacakan Produksi & Inventaris PT. Usbersa Mitra Logam

**Versi Dokumen:** 1.1  
**Tanggal:** 24 Oktober 2025

-----

## 1\. Pendahuluan

### 1.1 Tujuan

Dokumen ini menetapkan kebutuhan fungsional dan non-fungsional untuk Sistem Pelacakan Produksi & Inventaris PT. Logam. Sistem ini bertujuan untuk mendigitalkan dan mengotomatisasi pencatatan barang yang masuk dari produksi ke gudang (barang masuk) dan barang yang keluar dari gudang (barang keluar).

### 1.2 Ruang Lingkup

Sistem akan mencakup fungsionalitas berikut:

  * Manajemen pengguna dan otentikasi berbasis peran (jabatan).
  * Pencatatan data produksi barang (barang masuk).
  * Pembuatan ID Unik, QR Code, dan Barcode secara otomatis.
  * Pemindaian (scan) untuk proses barang keluar.
  * Alur persetujuan untuk penghapusan data.
  * Dashboard analitik untuk manajemen.
  * Fitur pelaporan dan ekspor data.
  * **Baru:** Manajemen pengguna oleh level manajerial.
  * **Baru:** Pencatatan jejak audit (audit log) untuk semua aktivitas.
  * **Baru:** Sistem notifikasi real-time untuk alur kerja.

### 1.3 Definisi & Istilah

  * **Sistem:** Aplikasi web yang diusulkan.
  * **Peran (Jabatan):** Mendefinisikan hak akses pengguna. Terdiri dari Staff, Manajer, dan Admin.
  * **ID Unik:** Kode identifikasi unik untuk setiap lot produksi. Format: LP-DDMMYYYY-NNNNNNN.
  * **Status:** Status barang saat ini (IN, OUT, PENDING\_DELETE).
  * **IN:** Barang telah diproduksi dan disimpan di gudang.
  * **OUT:** Barang telah keluar dari gudang.
  * **PENDING\_DELETE:** Menunggu persetujuan penghapusan dari Manajer.

-----

## 2\. Deskripsi Umum

### 2.1 Arsitektur & Teknologi

Sistem ini akan dibangun menggunakan tumpukan teknologi modern:

  * **Frontend:** React.js (Aplikasi Web Single-Page).
  * **Backend:** Node.js (disarankan menggunakan framework Express.js) untuk menyediakan REST API.
  * **Database:** MongoDB Cloud (Atlas) sebagai database NoSQL terkelola.
  * **Real-time (Notifikasi):** WebSocket (misal: Socket.io) atau layanan cloud (misal: Firebase Cloud Messaging).

### 2.2 Karakteristik Pengguna (Peran)

  * **Staff (Termasuk Staff Produksi & Gudang):**
      * Melakukan entri data rincian produksi (barang masuk).
      * Melakukan pemindaian (scan) untuk barang keluar.
      * Melihat semua data rincian.
      * Mengajukan permintaan penghapusan data.
      * Mencetak QR/Barcode.
      * Menerima notifikasi terkait status permintaan mereka.
  * **Manajer:**
      * Memiliki semua hak akses Staff.
      * Menyetujui atau menolak permintaan penghapusan data.
      * Mengakses Dashboard analitik performa.
      * Mengunduh (ekspor) data rincian dalam format Excel.
      * **Baru:** Mengelola akun pengguna untuk peran Staff (tambah, edit, nonaktifkan).
      * Menerima notifikasi untuk persetujuan dan aktivitas staff.
  * **Admin (Pimpinan / Super User):**
      * Memiliki semua hak akses Manajer.
      * Mengelola semua akun pengguna (termasuk Manajer lain).
      * Melakukan konfigurasi sistem.
      * **Baru:** Mengakses dan meninjau Audit Log sistem secara penuh.

### 2.3 Batasan dan Asumsi

  * Sistem harus dapat diakses melalui browser web modern di desktop dan perangkat seluler (untuk pemindaian).
  * Koneksi internet yang stabil diperlukan untuk mengakses sistem berbasis cloud.
  * Aplikasi akan menggunakan kamera perangkat (ponsel/tablet) atau pemindai barcode USB untuk fungsionalitas pemindaian.

-----

## 3\. Kebutuhan Fungsional (Functional Requirements)

### FR-01: Manajemen Autentikasi & Sesi

1.  Sistem harus menyediakan halaman login yang aman.
2.  Pengguna login menggunakan kredensial (misal: username/password).
3.  Sistem harus memvalidasi kredensial pengguna di backend.
4.  Setelah login berhasil, antarmuka (UI) akan disesuaikan berdasarkan peran pengguna.
5.  **Audit:** Setiap upaya login (berhasil atau gagal) dan logout harus dicatat dalam Audit Log (FR-11).

### FR-02: Entri Barang Masuk (Status "IN")

1.  Staff harus dapat mengisi formulir rincian data baru.
2.  Formulir harus berisi kolom: Nama Barang, Golongan Barang, Jenis Barang, Jumlah Barang, Tanggal dan Tahun Produksi.
3.  Semua kolom wajib diisi.
4.  Saat data disimpan, sistem secara otomatis menetapkan status bawaan barang sebagai "IN".
5.  **Audit & Notifikasi:** Setiap entri data baru harus dicatat dalam Audit Log (FR-11) dan memicu Notifikasi (FR-12).

### FR-03: Pembuatan ID Unik, QR, dan Barcode

1.  Setelah FR-02 berhasil disimpan, sistem harus secara otomatis:
    a.  Membuat ID Unik dengan format LP-DDMMYYYY-NNNNNNN.
    b.  Menghasilkan gambar QR Code yang berisi ID Unik.
    c.  Menghasilkan gambar Barcode (Tipe: Code 128) yang berisi ID Unik.
2.  ID Unik, QR, dan Barcode ini disimpan dan terasosiasi dengan data barang tersebut.

### FR-04: Proses Barang Keluar (Status "OUT")

1.  Staff (di gudang) harus dapat mengakses fitur pemindaian.
2.  Sistem memindai QR/Barcode pada barang.
3.  Sistem secara otomatis mengambil ID Unik dari hasil pindaian.
4.  Sistem mencari ID Unik tersebut di database.
5.  Jika ditemukan dan statusnya adalah "IN", sistem memperbarui status barang menjadi "OUT".
6.  Jika ID tidak ditemukan atau status sudah "OUT", sistem menampilkan pesan kesalahan.
7.  **Audit:** Setiap transaksi barang keluar ("OUT") harus dicatat dalam Audit Log (FR-11).

### FR-05: Alur Persetujuan Hapus (Peningkatan Keamanan)

1.  Staff tidak dapat menghapus data secara langsung.
2.  Staff dapat mengajukan "Permintaan Hapus" dengan alasan (maks 1000 karakter).
3.  Status data di database berubah menjadi "PENDING\_DELETE".
4.  Manajer menerima notifikasi (FR-12) tentang permintaan hapus baru.
5.  Manajer dapat meninjau permintaan dan memilih "Setuju" atau "Tolak".
    a.  Jika "Setuju": Data dihapus (atau di-arsip).
    b.  Jika "Tolak": Status data dikembalikan ke status sebelumnya.
6.  Jika Manajer tidak merespon dalam 72 jam, permintaan hapus secara otomatis DITOLAK.
7.  **Audit & Notifikasi:** Setiap langkah (pengajuan, persetujuan, penolakan, kedaluwarsa) harus dicatat dalam Audit Log (FR-11) dan memicu Notifikasi (FR-12).

### FR-06: Tampilan Data & Pencarian

1.  Semua peran dapat melihat tabel data rincian semua barang.
2.  Tabel harus menyediakan fitur pencarian dan filter.
3.  **Audit:** Setiap aktivitas pencarian/filter data (pembacaan) harus dicatat dalam Audit Log (FR-11).

### FR-07: Dashboard Analitik

1.  Hanya Manajer dan Admin yang dapat mengakses halaman Dashboard.
2.  Dashboard harus menampilkan visualisasi data (grafik garis, pie chart, KPI).
3.  **Audit:** Akses ke dashboard oleh manajerial harus dicatat dalam Audit Log (FR-11).

### FR-08: Ekspor Data

1.  Hanya Manajer dan Admin yang dapat menggunakan fitur ekspor.
2.  Pengguna dapat mengekspor data ke format sheet atau excel (.xlsx), difilter berdasarkan rentang tanggal.
3.  **Audit:** Setiap aktivitas ekspor data harus dicatat dalam Audit Log (FR-11).

### FR-09: Pencetakan Label

1.  Semua peran dapat memilih satu atau beberapa data barang untuk "Cetak Label".
2.  Sistem harus menghasilkan pratinjau cetak yang menampilkan QR Code/Barcode.

### FR-10: Manajemen Pengguna

1.  Admin dapat membuat, melihat, mengedit, dan menonaktifkan semua akun pengguna (termasuk Manajer).
2.  Manajer dapat membuat, melihat, mengedit, dan menonaktifkan akun pengguna dengan peran Staff.
3.  Sistem harus mengutamakan "penonaktifan" (deactivation) pengguna daripada penghapusan permanen (hard delete) untuk menjaga integritas data historis di log.
4.  Formulir pembuatan pengguna baru minimal harus berisi: Username, Nama Lengkap, Peran (Jabatan), dan Password sementara.
5.  **Audit:** Semua aktivitas manajemen pengguna (buat, edit, nonaktifkan) harus dicatat dalam Audit Log (FR-11).

### FR-11: Pencatatan Jejak Audit (Audit Log)

1.  Sistem harus memiliki modul Audit Log yang dapat diakses dan dilihat hanya oleh Admin.
2.  Log harus mencatat semua aktivitas penting (CRUD, login, ekspor, dll) di seluruh sistem.
3.  Setiap entri log harus berisi minimal:
      * timestamp (Kapan)
      * userId (Siapa - ID pengguna yang melakukan)
      * username (Siapa - Nama pengguna)
      * action (Apa - Tipe aktivitas, misal: ITEM\_CREATED, LOGIN\_FAILURE, DELETE\_REQUEST\_APPROVED)
      * details (Detail - Informasi kontekstual, misal: { idUnik: 'LP-12345', targetUser: 'staff\_budi' })
      * ipAddress (Alamat IP pengguna).
4.  Aktivitas yang wajib dicatat meliputi (namun tidak terbatas pada):
      * Login (berhasil/gagal), Logout.
      * Pembuatan, Pengeditan, Pembacaan data barang.
      * Update status barang (IN -\> OUT).
      * Seluruh alur persetujuan hapus (FR-05).
      * Ekspor data (FR-08).
      * Manajemen pengguna (FR-10).
      * Akses ke Audit Log itu sendiri.
5.  Log harus tidak dapat diubah (immutable) dari antarmuka aplikasi.

### FR-12: Sistem Notifikasi Real-time

1.  Sistem harus menyediakan modul notifikasi (misal: ikon lonceng di header) untuk pengguna yang login.
2.  Notifikasi dikirimkan ke pengguna yang relevan secara real-time.
3.  Notifikasi wajib dibuat untuk kejadian berikut (sesuai permintaan):
    a.  **Kejadian:** Data Rincian Disimpan (dari FR-02)
    \* **Penerima:** Manajer, Admin.
    \* **Pesan:** "Staff [Nama Staff] telah menyimpan data baru: [ID Unik]."
    b.  **Kejadian:** Permintaan Hapus Baru (dari FR-05)
    \* **Penerima:** Manajer, Admin.
    \* **Pesan:** "[Nama Staff] meminta persetujuan hapus untuk [ID Unik]."
    c.  **Kejadian:** Permintaan Hapus Ditolak (dari FR-05)
    \* **Penerima:** Staff yang mengajukan.
    \* **Pesan:** "Permintaan hapus Anda untuk [ID Unik] telah ditolak oleh [Nama Manajer]."
    d.  **Kejadian:** Permintaan Hapus Disetujui (dari FR-05)
    \* **Penerima:** Staff yang mengajukan.
    \* **Pesan:** "Permintaan hapus Anda untuk [ID Unik] telah disetujui oleh [Nama Manajer]."
    e.  **Kejadian:** Data Berhasil Dihapus (dari FR-05, setelah disetujui)
    \* **Penerima:** Manajer, Admin.
    \* **Pesan:** "Data [ID Unik] telah berhasil dihapus oleh [Nama Manajer]."
4.  Pengguna harus dapat menandai notifikasi sebagai "telah dibaca".

-----

## 4\. Kebutuhan Non-Fungsional

*(Tetap sama seperti v1.0, dengan tambahan NF-02.4)*

### NF-01: Kinerja

1.  Waktu muat halaman rata-rata harus di bawah 3 detik.
2.  Respon pemindaian (dari scan hingga status diperbarui) harus di bawah 2 detik.

### NF-02: Keamanan

1.  Semua komunikasi antara frontend dan backend harus menggunakan HTTPS.
2.  Kata sandi pengguna harus di-hash (misal: bcrypt).
3.  Otorisasi API: Setiap permintaan API ke backend harus memverifikasi token sesi dan peran pengguna.
4.  **Auditabilitas:** Sistem harus menyediakan jejak audit yang tidak dapat diubah (immutable) untuk semua tindakan sensitif (lihat FR-11).

### NF-03: Ketersediaan & Keandalan

1.  Penggunaan MongoDB Atlas akan memastikan ketersediaan database yang tinggi dan pencadangan otomatis.
2.  Sistem harus memiliki uptime 99.5%.

### NF-04: Usabilitas (Kemudahan Penggunaan)

1.  Antarmuka harus bersih, modern, dan intuitif.
2.  Desain harus responsif, dapat beradaptasi dengan baik di desktop, tablet, dan ponsel.

-----

## 5\. Model Data (Struktur Database MongoDB)

### 5.1 Koleksi: users

Menyimpan data pengguna dan peran mereka.

```json
{
  "_id": "ObjectId('...')",
  "username": "manajer_agus",
  "password": "[hashed_password]",
  "namaLengkap": "Agus Setiawan",
  "role": "manajer", // Enum: "staff", "manajer", "admin"
  "status": "aktif"  // **Baru:** Enum: "aktif", "nonaktif"
}
```

### 5.2 Koleksi: items

Menyimpan data inti untuk setiap barang/lot produksi.

```json
{
  "_id": "ObjectId('...')",
  "idUnik": "LP-28102025-0000001",
  "namaBarang": "Besi Siku 10x10",
  // ... (field lain seperti golongan, jenis, jumlah)
  "tglProduksi": "ISODate('2025-10-28T03:00:00Z')",
  "status": "IN", // Enum: "IN", "OUT", "PENDING_DELETE"
  "createdBy": {
    "userId": "ObjectId('...user_staff...')",
    "username": "staff_dian"
  },
  "history": [
    // ... (riwayat status)
  ],
  "deleteRequest": {
    // ... (info permintaan hapus)
  }
}
```

### 5.3 Koleksi: audit\_logs (Baru)

Mencatat semua jejak aktivitas pengguna.

```json
{
  "_id": "ObjectId('...')",
  "timestamp": "ISODate('2025-10-28T03:05:10Z')",
  "userId": "ObjectId('...user_staff...')",
  "username": "staff_dian",
  "action": "ITEM_CREATED", // Cth: LOGIN_SUCCESS, ITEM_OUT, DELETE_REQUESTED
  "details": {
    "itemId": "ObjectId('...item...')",
    "idUnik": "LP-28102025-0000001",
    "message": "Staff staff_dian membuat item baru."
  },
  "ipAddress": "103.45.12.1"
}
```

### 5.4 Koleksi: notifications (Baru)

Menyimpan notifikasi untuk pengguna.

```json
{
  "_id": "ObjectId('...')",
  "recipientId": "ObjectId('...user_manajer...')", // Target penerima notifikasi
  "title": "Permintaan Hapus Baru",
  "message": "Staff staff_dian meminta persetujuan hapus untuk LP-28102025-0000001.",
  "link": "/item/ObjectId('...item...')", // Link ke data terkait
  "isRead": false,
  "createdAt": "ISODate('2025-10-28T04:00:00Z')"
}
```

-----

# 📋 Dokumentasi Sistem Pelaporan dan Sinkronisasi (SPKL)

## 🎯 Arsitektur Sistem Offline-First

### 1. Komponen Sistem

#### A. Aplikasi Klien (STAFF)
- **Platform**: Progressive Web App (PWA) / Web Application
- **Tanggung Jawab**:
  - Menampilkan form input (Scan In)
  - Memproses data dan menyimpan ke database lokal
  - Melakukan sinkronisasi otomatis saat online
  - Menampilkan laporan dengan filter dinamis

#### B. Database Lokal (IndexedDB)
- **Teknologi**: Browser IndexedDB
- **Fungsi**: 
  - Buffer/antrian untuk data yang belum terkirim
  - Menyimpan data dengan flag `status_sync: "pending"`
  - Cache untuk performa offline

#### C. MongoDB Atlas (Database Pusat)
- **Fungsi**: Single Source of Truth
- **Koleksi Utama**:
  - `items`: Data transaksional mentah (Scan In/Out)
  - `reports`: Data agregasi untuk pelaporan cepat
  - `customers`: Master data customer
  - `parts`: Master data parts
  - `purchase_orders`: Master data PO

#### D. Layanan Sinkronisasi
- **Lokasi**: Terintegrasi di Aplikasi Klien
- **Tugas**:
  - Deteksi status koneksi (online/offline)
  - Transfer data dari IndexedDB ke MongoDB Atlas
  - Retry logic untuk data yang gagal terkirim

---

## 🔄 Alur Proses Input Data (Scan In & Cetak)

### Langkah 1: Input Data oleh STAFF
```
STAFF mengisi form "Scan In" → Tekan "Simpan" atau "Cetak"
```

### Langkah 2: Deteksi Status Koneksi
```typescript
// Pseudo-code
if (navigator.onLine && canConnectToAtlas()) {
  // Skenario ONLINE
} else {
  // Skenario OFFLINE
}
```

### Langkah 3A: Skenario ONLINE (Koneksi Stabil)

```mermaid
graph LR
    A[Form Data] --> B[Validasi]
    B --> C[Simpan ke MongoDB Atlas]
    C --> D[Response OK]
    D --> E[Buat Report Document]
    E --> F[Notifikasi Sukses]
    F --> G[Proses Cetak]
```

**Detail Proses**:
1. Data langsung dikirim ke koleksi `items` di MongoDB Atlas
2. Sistem otomatis membuat dokumen di koleksi `reports` (denormalisasi)
3. Response sukses diterima
4. Notifikasi ditampilkan ke STAFF
5. Proses cetak dilanjutkan

### Langkah 3B: Skenario OFFLINE (Koneksi Terputus)

```mermaid
graph LR
    A[Form Data] --> B[Validasi]
    B --> C[Simpan ke IndexedDB]
    C --> D[Tandai: status_sync pending]
    D --> E[Notifikasi: Saved Locally]
    E --> F[Proses Cetak Tetap Berjalan]
```

**Detail Proses**:
1. Data disimpan ke IndexedDB lokal
2. Diberi flag: `status_sync: "pending"`, `synced_at: null`
3. Notifikasi: "Data disimpan lokal, akan disinkronkan nanti"
4. Proses cetak tetap berjalan (data sudah ada di lokal)

### Langkah 4: Proses Sinkronisasi (Saat Kembali Online)

```mermaid
graph TD
    A[Deteksi Online] --> B[Layanan Sinkronisasi Aktif]
    B --> C[Baca Data Pending dari IndexedDB]
    C --> D{Kirim ke Atlas}
    D -->|Sukses| E[Hapus dari IndexedDB]
    D -->|Gagal| F[Retry dengan Exponential Backoff]
    E --> G[Buat Report Document]
    G --> H[Update Status: synced]
```

**Detail Proses**:
1. Listener `navigator.onLine` mendeteksi koneksi pulih
2. Service Worker mengambil semua data dengan `status_sync: "pending"`
3. Data dikirim batch (maksimal 50 records per request)
4. Untuk setiap sukses:
   - Hapus dari IndexedDB atau update flag menjadi `synced`
   - Buat report document di MongoDB Atlas
5. Untuk yang gagal: Retry dengan backoff (1s, 2s, 4s, 8s...)

---

## 📊 Alur Pelaporan dan "Relasi"

### 1. Data Masuk ke Koleksi Utama (`items`)

**Struktur Document**:
```typescript
{
  _id: ObjectId,
  item_id: "UML-20250131-00001",
  qr_code: "QR-UML-20250131-00001",
  customer_id: ObjectId("..."),
  part_id: ObjectId("..."),
  purchase_order_id: ObjectId("..."),
  qty: 100,
  boxes: 10,
  create_datetime: ISODate("2025-01-31T10:30:00Z"),
  status: "IN",
  created_by: "staff@example.com"
}
```

### 2. Transformasi ke Koleksi Report (`reports`)

**Mengapa Perlu Koleksi Terpisah?**
- ✅ Performa query lebih cepat (denormalisasi)
- ✅ Tidak perlu JOIN (`$lookup`) saat filter
- ✅ Data siap pakai untuk laporan

**Struktur Document Report** (Denormalisasi):
```typescript
{
  _id: ObjectId,
  item_id: "UML-20250131-00001",
  qr_code: "QR-UML-20250131-00001",
  
  // Data Customer (dicopy dari collection customers)
  customer_id: ObjectId("..."),
  nama_pt: "PT. PANASONIC MANUFACTURING INDONESIA",
  alamat_customer: "Jl. Raya Bekasi KM 27...",
  
  // Data Part (dicopy dari collection parts)
  part_id: ObjectId("..."),
  nama_item: "DISK BRAKE K2FP",
  kode_item: "DBK2FP-001",
  
  // Data PO (dicopy dari collection purchase_orders)
  purchase_order_id: ObjectId("..."),
  no_po: "PO/2025/01/00123",
  
  // Data Transaksi
  qty: 100,
  boxes: 10,
  create_datetime: ISODate("2025-01-31T10:30:00Z"),
  status: "IN",
  created_by: "staff@example.com",
  
  // Metadata untuk Filter Cepat
  year: 2025,
  month: 1,
  week: 5,
  day: 31
}
```

### 3. Penjelasan "Relasi" di MongoDB

#### A. **Referensi (Normalization)** ❌ (Tidak digunakan untuk Report)
```typescript
// Di collection items - hanya simpan ID
{
  customer_id: ObjectId("605c7d..."),
  part_id: ObjectId("708f9a...")
}

// Saat query, butuh $lookup (JOIN)
db.items.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customer_id",
      foreignField: "_id",
      as: "customer_data"
    }
  }
])
// ❌ LAMBAT untuk laporan dengan filter kompleks
```

#### B. **Denormalisasi (Data Tertanam)** ✅ (Digunakan)
```typescript
// Di collection reports - copy semua data yang dibutuhkan
{
  customer_id: ObjectId("605c7d..."),
  nama_pt: "PT. PANASONIC",  // ✅ Langsung ada
  nama_item: "DISK BRAKE",    // ✅ Langsung ada
  qty: 100
}

// Query filter SUPER CEPAT (tanpa JOIN)
db.reports.find({
  nama_pt: { $regex: "PANASONIC", $options: "i" },
  year: 2025,
  month: 1
})
// ✅ CEPAT - semua data sudah dalam 1 dokumen
```

**Kapan menggunakan Denormalisasi?**
- ✅ Data jarang berubah (nama customer, nama part)
- ✅ Prioritas: kecepatan baca/filter
- ✅ Untuk pelaporan dan analisis

---

## 🔍 Sistem Filter Laporan

### Filter yang Tersedia:

1. **Filter Periode**:
   - Harian (pilih tanggal)
   - Mingguan (pilih minggu)
   - Bulanan (pilih bulan)
   - Tahunan (pilih tahun)
   - Custom Range (dari-sampai)

2. **Filter Customer**:
   - Dropdown master customer
   - Search by nama PT

3. **Filter Item**:
   - Dropdown master parts
   - Search by nama/kode item

4. **Filter Status**:
   - IN (Scan In)
   - OUT (Scan Out)
   - ALL (Semua)

### Query Performance dengan Index:

**Index yang dibuat**:
```typescript
// Di collection reports
{
  create_datetime: 1,    // Sort by tanggal
  customer_id: 1,        // Filter customer
  part_id: 1,            // Filter item
  status: 1,             // Filter status
  year: 1,               // Filter tahun
  month: 1,              // Filter bulan
  nama_pt: "text",       // Text search
  nama_item: "text"      // Text search
}
```

**Contoh Query Cepat**:
```typescript
// Filter: Januari 2025, Customer: Panasonic
db.reports.find({
  year: 2025,
  month: 1,
  nama_pt: { $regex: "PANASONIC", $options: "i" }
}).sort({ create_datetime: -1 })
// ⚡ Execution time: ~5ms (dengan index)
```

---

## 🚀 Implementasi di Kode

### Backend API (`/api/reports/scan-in`)

**File**: `inventory-backend/app/api/reports/scan-in/route.ts`

```typescript
export async function POST(request: Request) {
  // 1. Terima data dari items
  const itemData = await request.json();
  
  // 2. Lookup data customer, part, PO (untuk denormalisasi)
  const customer = await db.collection('customers').findOne({ _id: itemData.customer_id });
  const part = await db.collection('parts').findOne({ _id: itemData.part_id });
  const po = await db.collection('purchase_orders').findOne({ _id: itemData.purchase_order_id });
  
  // 3. Buat report document (denormalisasi)
  const reportDoc = {
    ...itemData,
    nama_pt: customer?.nama_pt,
    alamat_customer: customer?.alamat,
    nama_item: part?.nama_item,
    kode_item: part?.kode_item,
    no_po: po?.no_po,
    year: new Date(itemData.create_datetime).getFullYear(),
    month: new Date(itemData.create_datetime).getMonth() + 1,
    // ... metadata lainnya
  };
  
  // 4. Insert ke collection reports
  await db.collection('reports').insertOne(reportDoc);
  
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  // Query dengan filter dinamis
  const { searchParams } = new URL(request.url);
  const filter = buildFilterFromParams(searchParams);
  
  const reports = await db.collection('reports')
    .find(filter)
    .sort({ create_datetime: -1 })
    .toArray();
    
  return NextResponse.json(reports);
}
```

### Frontend Component (`ScanInReports.tsx`)

**File**: `inventory-frontend/src/components/ScanInReports.tsx`

```typescript
const ScanInReports = () => {
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    period: 'daily',
    startDate: new Date(),
    customer: '',
    item: '',
    status: 'all'
  });
  
  // Fetch data saat filter berubah
  useEffect(() => {
    fetchReports();
  }, [filters]);
  
  const fetchReports = async () => {
    const data = await api.reports.getScanIn(filters);
    setReports(data);
  };
  
  return (
    // UI dengan filter dan tabel data
  );
};
```

---

## 📦 Teknologi yang Digunakan

### Frontend:
- **React** + TypeScript
- **IndexedDB** (via Dexie.js) - Database lokal
- **Zustand** - State management
- **TanStack Query** - Data fetching & caching
- **Tailwind CSS** - Styling

### Backend:
- **Next.js 14** (App Router)
- **MongoDB Atlas** - Database cloud
- **Mongoose** - ODM untuk MongoDB
- **NextAuth.js** - Authentication

### DevOps:
- **Vercel** - Hosting frontend & backend
- **MongoDB Atlas** - Managed database
- **GitHub Actions** - CI/CD

---

## ✅ Checklist Implementasi

- [x] Model `Report` dengan denormalisasi
- [x] API `/api/reports/scan-in` (POST & GET)
- [x] Frontend API helper (`api.reports.getScanIn`)
- [x] Component `ScanInReports` dengan filter lengkap
- [x] Integration di `ScanIn` component (auto create report)
- [x] Menu navigasi di Sidebar
- [x] Routing di App.tsx
- [x] Index MongoDB untuk performa
- [ ] Implementasi IndexedDB untuk offline mode
- [ ] Service Worker untuk sinkronisasi background
- [ ] PWA configuration (manifest.json)
- [ ] Testing offline/online switching

---

## 🎓 Kesimpulan

Sistem ini mengimplementasikan **arsitektur offline-first** dengan:

1. **Database Lokal** (IndexedDB) sebagai buffer
2. **Sinkronisasi otomatis** saat online
3. **Denormalisasi** untuk performa laporan
4. **Filter dinamis** dengan index MongoDB
5. **UI responsif** dengan loading states

**Keuntungan**:
- ✅ STAFF bisa bekerja tanpa koneksi internet
- ✅ Data tidak hilang saat offline
- ✅ Laporan sangat cepat (tanpa JOIN kompleks)
- ✅ Scalable untuk jutaan records
- ✅ User experience yang smooth

---

**Dokumentasi dibuat**: 31 Januari 2025  
**Versi**: 1.0.0  
**Author**: Development Team