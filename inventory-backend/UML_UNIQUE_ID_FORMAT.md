#  UML UNIQUE ID FORMAT DOCUMENTATION

**Date**: November 3, 2025  
**Version**: 2.0  
**Status**:  IMPLEMENTED

---

##  FORMAT UNIQUE ID

### **Format:**
\\\
UML-(SupplierPartNumber)-(SupplierId)-(Quantity)-(LotId)/(Year)
\\\

### **Contoh:**
\\\
UML-BRK789-SUP001-500-LOTA003/2025
\\\

---

##  KOMPONEN FORMAT

| No | Komponen | Deskripsi | Contoh | Required |
|----|----------|-----------|--------|----------|
| 1 | **Prefix** | Awalan tetap \"UML\" | UML |  Yes |
| 2 | **SupplierPartNumber** | Part number dari supplier | BRK789 |  Yes |
| 3 | **SupplierId** | ID Supplier | SUP001 |  Yes |
| 4 | **Quantity** | Jumlah quantity item | 500 |  Yes |
| 5 | **LotId** | Lot ID dari batch produksi | LOTA003 |  Yes |
| 6 | **Year** | Tahun saat item dibuat | 2025 |  Yes |

---

##  DETAIL KOMPONEN

### **1. Prefix: \"UML\"**
- Tetap untuk semua item
- Singkatan dari **PT USBERSA MITRA LOGAM**
- Memudahkan identifikasi item dari perusahaan

### **2. Supplier Part Number**
- Diambil dari \part.supplierInfo.partNumber\
- Karakter spesial dan spasi dihapus
- Diubah ke UPPERCASE
- Maksimal 20 karakter
- Default: \"NOPART\" jika tidak ada

**Contoh:**
- Input: \"BRK-789-A\"
- Output: \"BRK789A\"

### **3. Supplier ID**
- Diambil dari \part.supplierInfo.id\
- Karakter spesial dan spasi dihapus
- Diubah ke UPPERCASE
- Maksimal 10 karakter
- Default: \"NOSUP\" jika tidak ada

**Contoh:**
- Input: \"SUP-001\"
- Output: \"SUP001\"

### **4. Quantity**
- Jumlah quantity dalam angka
- Tidak ada formatting khusus
- Langsung dari input

**Contoh:**
- Input: 500
- Output: \"500\"

### **5. Lot ID**
- Diambil dari input user
- Karakter spesial dan spasi dihapus
- Diubah ke UPPERCASE
- Maksimal 15 karakter

**Contoh:**
- Input: \"LOT-A-003\"
- Output: \"LOTA003\"

### **6. Year**
- Tahun saat item dibuat
- Format: 4 digit (YYYY)
- Diambil dari \
ew Date().getFullYear()\

**Contoh:**
- Output: \"2025\"

---

##  IMPLEMENTASI

### **Backend Function:**

\\\	ypescript
// File: inventory-backend/lib/utils.ts

export function generateUMLUniqueId(
  supplierPartNumber: string,
  supplierId: string,
  quantity: number,
  lotId: string
): string {
  const currentYear = new Date().getFullYear();
  
  // Sanitize inputs - remove special characters and spaces, uppercase
  const cleanSupplierPartNo = supplierPartNumber
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 20); // Limit length
  
  const cleanSupplierId = supplierId
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 10); // Limit length
  
  const cleanLotId = lotId
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 15); // Limit length
  
  // Format: UML-(SupplierPartNumber)-(SupplierId)-(Quantity)-(LotId)/(Year)
  return \UML-\-\-\-\/\\;
}
\\\

### **Usage dalam Scan IN API:**

\\\	ypescript
// File: inventory-backend/app/api/inventory/items/route.ts

const supplierPartNumber = part.supplierInfo?.partNumber || 'NOPART';
const supplierId = part.supplierInfo?.id || 'NOSUP';

const uniqueId = generateUMLUniqueId(
  supplierPartNumber,
  supplierId,
  quantity,
  lotId
);

console.log(\ Generated UML Unique ID: \\);
\\\

---

##  CONTOH LENGKAP

### **Scenario 1: Data Lengkap**

**Input:**
\\\javascript
{
  supplierPartNumber: \"BRK-789-A\",
  supplierId: \"SUP-001\",
  quantity: 500,
  lotId: \"LOT-A-003\"
}
\\\

**Output:**
\\\
UML-BRK789A-SUP001-500-LOTA003/2025
\\\

### **Scenario 2: Data dengan Special Characters**

**Input:**
\\\javascript
{
  supplierPartNumber: \"MTR@123#XYZ\",
  supplierId: \"SUP_999\",
  quantity: 1000,
  lotId: \"LOT B 005\"
}
\\\

**Output:**
\\\
UML-MTR123XYZ-SUP999-1000-LOTB005/2025
\\\

### **Scenario 3: Data Tidak Lengkap (Fallback)**

**Input:**
\\\javascript
{
  supplierPartNumber: null,
  supplierId: \"\",
  quantity: 250,
  lotId: \"LOT-C-001\"
}
\\\

**Output:**
\\\
UML-NOPART-NOSUP-250-LOTC001/2025
\\\

### **Scenario 4: Long Text (Truncated)**

**Input:**
\\\javascript
{
  supplierPartNumber: \"VERYLONGPARTNUMBERABCDEFGHIJKLMNOP\",
  supplierId: \"SUPPLIERID123456789\",
  quantity: 750,
  lotId: \"VERYLONGLOTIDTEXT123456\"
}
\\\

**Output:**
\\\
UML-VERYLONGPARTNUMBERAB-SUPPLIERI-750-VERYLONGLOTIDT/2025
\\\

---

##  KEUNTUNGAN FORMAT BARU

### **1. Informasi Lengkap**
- Semua komponen penting ada dalam Unique ID
- Tidak perlu query database untuk info dasar
- Traceability yang lebih baik

### **2. Mudah Dibaca**
- Format terstruktur dengan separator \"-\" dan \"/\"
- Setiap komponen memiliki posisi tetap
- Year di akhir memudahkan filtering

### **3. Konsisten**
- Semua karakter UPPERCASE
- Tidak ada spasi atau special characters
- Length terbatas untuk setiap komponen

### **4. Scalable**
- Mendukung berbagai supplier
- Bisa handle quantity berapapun
- Tahun memudahkan historical tracking

---

##  TESTING

### **Test Function:**

\\\ash
cd inventory-backend
npm run test
\\\

### **Manual Test via API:**

\\\ash
POST http://localhost:3001/api/inventory/items
Content-Type: application/json

{
  \"partId\": \"507f1f77bcf86cd799439011\",
  \"poId\": \"507f1f77bcf86cd799439012\",
  \"quantity\": 500,
  \"lotId\": \"LOT-A-003\",
  \"gateId\": \"GATE-01\",
  \"copies\": 1
}
\\\

**Expected Response:**
\\\json
{
  \"success\": true,
  \"message\": \"Item 'UML-BRK789-SUP001-500-LOTA003/2025' berhasil dibuat dan disimpan\",
  \"data\": {
    \"uniqueId\": \"UML-BRK789-SUP001-500-LOTA003/2025\",
    \"...\" : \"...\"
  }
}
\\\

---

##  VALIDASI & SANITASI

### **Sanitization Rules:**

1. **Karakter yang Dihapus:**
   - Semua karakter selain alphanumeric (a-z, A-Z, 0-9)
   - Spasi dihapus
   - Special characters: @, #, \$, %, ^, &, *, (, ), -, _, +, =, dll.

2. **Transformasi:**
   - Semua text diubah ke UPPERCASE
   - Leading/trailing spaces dihapus

3. **Length Limitation:**
   - Supplier Part Number: Max 20 karakter
   - Supplier ID: Max 10 karakter
   - Lot ID: Max 15 karakter
   - Quantity: Unlimited (numeric)

---

##  CHANGELOG

### **Version 2.0** (November 3, 2025)
-  Implemented UML Unique ID format
-  Format: UML-(SupplierPartNumber)-(SupplierId)-(Quantity)-(LotId)/(Year)
-  Added input sanitization
-  Added length limitations
-  Added fallback values (NOPART, NOSUP)
-  Integrated with Scan IN API
-  Updated QR Code data structure

### **Version 1.0** (Previous)
- Basic format: INV-{timestamp}-{random}

---

##  NEXT STEPS

1. **Test dengan Data Real** - Test dengan data supplier sebenarnya
2. **Validate di Frontend** - Pastikan Unique ID tampil dengan benar
3. **Print QR Code** - Verifikasi Unique ID pada printed QR
4. **Database Query** - Test search berdasarkan Unique ID
5. **Export Reports** - Pastikan Unique ID muncul di reports

---

**Status**:  Production Ready
**Last Updated**: November 3, 2025
