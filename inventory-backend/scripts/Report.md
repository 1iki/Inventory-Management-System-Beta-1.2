/*
 * =================================================================
 * Skrip MongoDB untuk Setup Koleksi 'items' dengan Optimasi Filter
 * =================================================================
 *
 * Skrip ini disesuaikan dengan nama kolom dari file Excel Anda.
 *
 * Skrip ini akan:
 * 1. Menggunakan database pilihan Anda.
 * 2. Menjelaskan struktur (schema) dokumen yang ideal.
 * 3. Membuat indexes yang paling penting untuk performa filter.
 * 4. Memberikan contoh cara memasukkan data (INSERT) sesuai data Excel.
 * 5. Memberikan contoh kueri (query) untuk semua filter yang Anda minta.
 */

// --- 1. Konfigurasi Database ---
// Ganti 'nama_database_anda' dengan nama database yang Anda inginkan
const dbName = "nama_database_anda";
// 'use' adalah perintah shell, dalam skrip kita akan gunakan db.getSiblingDB()
// Untuk testing di shell, Anda bisa jalankan: use nama_database_anda
const db = db.getSiblingDB(dbName);

print(`Menggunakan database: ${dbName}`);

/*
 * =================================================================
 * Penjelasan Struktur Dokumen (Schema)
 * =================================================================
 *
 * Berdasarkan kolom di file Excel Anda:
 * "ID","QR CODE","STATUS","NAMA PT","NAMA ITEM","DESKRIPSI",
 * "SUPPPLIER ID","SUPLIER PART NUMBER","SUPPLIER DESC","JUMLAH",
 * "LOT ID","COPIES","PART NO","GATE ID","NO PO","PO","SISA PO",
 * "CREATE DATETIME","UPDATE DATETIME"
 *
 * {
 * _id: ObjectId(), // Dibuat otomatis oleh MongoDB
 * id_excel: "ID_DARI_EXCEL", // Opsional, jika Anda perlu menyimpan ID lama
 * qr_code: "string_qr_code",
 * status: "IN", // atau "OUT", dll.
 * nama_pt: "PT. NPPI",                  // (dari NAMA PT) Penting untuk filter
 * nama_item: "DISK BRAKE K2FP",         // (dari NAMA ITEM)
 * deskripsi: "Deskripsi",               // (dari DESKRIPSI)
 * suppplier_id: "SUPP-001",             // (dari SUPPPLIER ID)
 * suplier_part_number: "PN-12345",      // (dari SUPLIER PART NUMBER)
 * suplier_desc: "Deskripsi Supplier",   // (dari SUPLIER DESC)
 * jumlah: 100, // Tipe data Number      // (dari JUMLAH)
 * lot_id: "LOT-2025",                   // (dari LOT ID)
 * copies: 1, // Tipe data Number        // (dari COPIES)
 * part_no: "PART-NO-XYZ",               // (dari PART NO)
 * gate_id: "GATE-01",                   // (dari GATE ID)
 * no_po: "PO-123456",                   // (dari NO PO)
 * po: 500, // Tipe data Number          // (dari PO)
 * sisa_po: 400, // Tipe data Number     // (dari SISA PO)
 * create_datetime: ISODate("..."),      // (dari CREATE DATETIME) Tipe Date PENTING
 * update_datetime: ISODate("...")       // (dari UPDATE DATETIME) Tipe Date PENTING
 * }
 */

// --- 2. Membuat Indexes (Paling Penting untuk Performa) ---
print("Membuat indexes untuk optimasi filter...");

try {
  // Index untuk filter berdasarkan 'nama_pt' (Customer)
  // Mempercepat pencarian: db.items.find({ nama_pt: "PT. NPPI" })
  db.items.createIndex({ nama_pt: 1 });
  print("  - Index 'nama_pt' dibuat.");

  // Index untuk filter berdasarkan 'create_datetime'
  // Mempercepat semua jenis filter waktu (harian, mingguan, bulanan)
  db.items.createIndex({ create_datetime: 1 });
  print("  - Index 'create_datetime' dibuat.");

  // Index COMPOUND (Gabungan)
  // Ini adalah index yang PALING OPTIMAL untuk kebutuhan Anda,
  // karena Anda akan sering memfilter berdasarkan NAMA PT DAN rentang waktu.
  db.items.createIndex({ nama_pt: 1, create_datetime: 1 });
  print("  - Index gabungan 'nama_pt' & 'create_datetime' dibuat.");

} catch (e) {
  print(`Error saat membuat index: ${e}`);
}

print("Indexes selesai dibuat.");


// --- 3. Contoh Memasukkan Data (Insert) ---
// Menggunakan data dari contoh Excel Anda
print("\nMemasukkan beberapa contoh data...");
try {
  db.items.deleteMany({}); // Hapus data lama (hanya untuk testing)
  
  // Data ini diambil dari file CSV Anda
  const dataDariExcel = [
    {
      qr_code: "QR-001-NPPI",
      status: "IN",
      nama_pt: "PT. NPPI",
      nama_item: "DISK BRAKE K2FP",
      deskripsi: "",
      suppplier_id: "SUP-NPPI",
      suplier_part_number: "PN-NPPI-01",
      suplier_desc: "PART DISK BRAKE",
      jumlah: 150,
      lot_id: "LOT-001",
      copies: 1,
      part_no: "PN-001",
      gate_id: "GATE-1",
      no_po: "PO-NPPI-123",
      po: 1000,
      sisa_po: 850,
      create_datetime: new Date("2025-10-30T09:00:00Z"), // Hari ini (contoh)
      update_datetime: new Date("2025-10-30T09:00:00Z")
    },
    {
      qr_code: "QR-002-NPPI",
      status: "IN",
      nama_pt: "PT. NPPI",
      nama_item: "CHAMPFER",
      deskripsi: "",
      suppplier_id: "SUP-NPPI",
      suplier_part_number: "PN-NPPI-02",
      suplier_desc: "PART CHAMPFER",
      jumlah: 200,
      lot_id: "LOT-002",
      copies: 1,
      part_no: "PN-002",
      gate_id: "GATE-1",
      no_po: "PO-NPPI-124",
      po: 500,
      sisa_po: 300,
      create_datetime: new Date("2025-10-29T14:30:00Z"), // Kemarin
      update_datetime: new Date("2025-10-29T14:30:00Z")
    },
    {
      qr_code: "QR-003-PANA",
      status: "IN",
      nama_pt: "PT. PANASONIC",
      nama_item: "BRACKET FAN MOTOR NON MARKING SINGLE (D541250-P4-1)",
      deskripsi: "",
      suppplier_id: "SUP-PANA",
      suplier_part_number: "PN-PANA-01",
      suplier_desc: "PART BRACKET",
      jumlah: 300,
      lot_id: "LOT-003",
      copies: 1,
      part_no: "PN-003",
      gate_id: "GATE-2",
      no_po: "PO-PANA-201",
      po: 2000,
      sisa_po: 1700,
      create_datetime: new Date("2025-10-25T11:00:00Z"), // Minggu lalu
      update_datetime: new Date("2025-10-25T11:00:00Z")
    },
    {
      qr_code: "QR-004-PANA",
      status: "IN",
      nama_pt: "PT. PANASONIC",
      nama_item: "END PLATE (B442689)",
      deskripsi: "",
      suppplier_id: "SUP-PANA",
      suplier_part_number: "PN-PANA-02",
      suplier_desc: "PART END PLATE",
      jumlah: 100,
      lot_id: "LOT-004",
      copies: 1,
      part_no: "PN-004",
      gate_id: "GATE-2",
      no_po: "PO-PANA-202",
      po: 1000,
      sisa_po: 900,
      create_datetime: new Date("2025-09-15T08:00:00Z"), // Bulan lalu
      update_datetime: new Date("2025-09-15T08:00:00Z")
    },
    {
      qr_code: "QR-005-PANA",
      status: "IN",
      nama_pt: "PT. PANASONIC",
      nama_item: "BRACKET FAN MOTOR", // Data tambahan
      deskripsi: "",
      suppplier_id: "SUP-PANA",
      suplier_part_number: "PN-PANA-01",
      suplier_desc: "PART BRACKET",
      jumlah: 120,
      lot_id: "LOT-005",
      copies: 1,
      part_no: "PN-003",
      gate_id: "GATE-2",
      no_po: "PO-PANA-203",
      po: 500,
      sisa_po: 380,
      create_datetime: new Date("2024-11-01T10:00:00Z"), // Tahun lalu
      update_datetime: new Date("2024-11-01T10:00:00Z")
    }
  ];
  
  db.items.insertMany(dataDariExcel);
  print("Contoh data telah dimasukkan.");
} catch (e) {
  print(`Error saat memasukkan data: ${e}`);
}


/*
 * =================================================================
 * Contoh Kueri Filter
 * =================================================================
 */

// --- Variabel untuk filter waktu ---
// Kita akan gunakan tanggal 30 Oktober 2025 sebagai "hari ini" untuk semua contoh
// Di aplikasi nyata, Anda akan menggunakan new Date()
const today = new Date("2025-10-30T10:00:00Z");

// --- 1. Filter berdasarkan Customer (NAMA PT) ---
print("\n--- 1. Filter berdasarkan NAMA PT (Contoh: 'PT. PANASONIC') ---");
const customerName = "PT. PANASONIC";
const resultsCustomer = db.items.find({ nama_pt: customerName });
// .forEach(doc => printjson(doc)); // Hapus komentar untuk melihat hasil

// --- 2. Filter Harian ---
print("\n--- 2. Filter Harian (Contoh: 30 Oktober 2025) ---");
// Set jam, menit, detik, ms ke awal hari
const startOfDay = new Date(today.setUTCHours(0, 0, 0, 0));
// Set ke awal hari *berikutnya*
const endOfDay = new Date(startOfDay);
endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

print(`Rentang Harian: ${startOfDay.toISOString()} s/d ${endOfDay.toISOString()}`);
const resultsDaily = db.items.find({
  create_datetime: {
    $gte: startOfDay, // $gte = greater than or equal (lebih besar atau sama dengan)
    $lt: endOfDay      // $lt = less than (lebih kecil dari)
  }
});
// resultsDaily.forEach(doc => printjson(doc));

// --- 3. Filter Mingguan ---
print("\n--- 3. Filter Mingguan (Contoh: Minggu ini, 26 Okt - 2 Nov) ---");
// Asumsi minggu dimulai hari Minggu (0). 30 Okt 2025 adalah hari Kamis (4).
const dayOfWeek = today.getUTCDay(); // 4
const startOfWeek = new Date(today);
startOfWeek.setUTCDate(today.getUTCDate() - dayOfWeek); // Mundur ke hari Minggu
startOfWeek.setUTCHours(0, 0, 0, 0);

const endOfWeek = new Date(startOfWeek);
endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7); // Maju 7 hari

print(`Rentang Mingguan: ${startOfWeek.toISOString()} s/d ${endOfWeek.toISOString()}`);
const resultsWeekly = db.items.find({
  create_datetime: { $gte: startOfWeek, $lt: endOfWeek }
});
// resultsWeekly.forEach(doc => printjson(doc));

// --- 4. Filter Bulanan ---
print("\n--- 4. Filter Bulanan (Contoh: Oktober 2025) ---");
const startOfMonth = new Date(today.getUTCFullYear(), today.getUTCMonth(), 1);
const endOfMonth = new Date(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);

print(`Rentang Bulanan: ${startOfMonth.toISOString()} s/d ${endOfMonth.toISOString()}`);
const resultsMonthly = db.items.find({
  create_datetime: { $gte: startOfMonth, $lt: endOfMonth }
});
// resultsMonthly.forEach(doc => printjson(doc));

// --- 5. Filter Tahunan ---
print("\n--- 5. Filter Tahunan (Contoh: tahun 2025) ---");
const startOfYear = new Date(today.getUTCFullYear(), 0, 1); // 1 Januari
const endOfYear = new Date(today.getUTCFullYear() + 1, 0, 1); // 1 Januari tahun depan

print(`Rentang Tahunan: ${startOfYear.toISOString()} s/d ${endOfYear.toISOString()}`);
const resultsYearly = db.items.find({
  create_datetime: { $gte: startOfYear, $lt: endOfYear }
});
// resultsYearly.forEach(doc => printjson(doc));

// --- 6. Filter Gabungan (Customer + Waktu) ---
print("\n--- 6. Filter Gabungan (NAMA PT 'PT. PANASONIC' dan Bulanan 'Oktober 2025') ---");
// Kueri ini akan SANGAT CEPAT karena menggunakan index gabungan
const resultsCombined = db.items.find({
  nama_pt: "PT. PANASONIC",
  create_datetime: { $gte: startOfMonth, $lt: endOfMonth }
});
// resultsCombined.forEach(doc => printjson(doc));


print("\n--- Skrip Selesai Dijalankan ---");

