#  QR CODE STRUCTURE DOCUMENTATION

**Date**: November 3, 2025  
**Version**: 2.0  
**Status**:  IMPLEMENTED

---

##  QR CODE DATA STRUCTURE

QR Code sekarang menyimpan informasi lengkap dalam format JSON yang terstruktur:

\\\json
{
  // Unique Identifier
  \"uniqueId\": \"INV-1A2B3C4D-5E6F7G\",
  
  // Customer Information
  \"customer\": {
    \"id\": \"507f1f77bcf86cd799439011\",
    \"name\": \"PT TOYOTA ASTRA MOTOR\"
  },
  
  // Part Information
  \"part\": {
    \"id\": \"507f1f77bcf86cd799439012\",
    \"name\": \"Bracket Mounting A-123\",
    \"partNo\": \"UML-BRK-001\",
    \"description\": \"Bracket for mounting assembly\"
  },
  
  // Purchase Order Information
  \"po\": {
    \"id\": \"507f1f77bcf86cd799439013\",
    \"poNumber\": \"PO-2025-001\"
  },
  
  // Quantity & Lot Information
  \"quantity\": 500,
  \"lotId\": \"LOT-A-003\",
  \"gateId\": \"GATE-01\",
  
  // Additional Information
  \"supplierInfo\": {
    \"id\": \"SUP-001\",
    \"partNumber\": \"SUPP-BRK-789\",
    \"description\": \"Supplier bracket specification\"
  },
  \"location\": {
    \"warehouse\": \"Warehouse A\",
    \"zone\": \"Zone 1\",
    \"rack\": \"R-12\",
    \"position\": \"P-05\"
  },
  
  // Timestamp
  \"createdAt\": \"2025-11-03T10:30:00.000Z\",
  \"createdBy\": \"admin_sari\"
}
\\\

---

##  FIELD DESCRIPTIONS

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| \uniqueId\ | string | Unique inventory ID (format: INV-{timestamp}-{random}) |  Yes |
| \customer.id\ | string | MongoDB ObjectId dari customer |  Yes |
| \customer.name\ | string | Nama customer/PT |  Yes |
| \part.id\ | string | MongoDB ObjectId dari part |  Yes |
| \part.name\ | string | Nama part |  Yes |
| \part.partNo\ | string | Internal part number |  Yes |
| \part.description\ | string | Deskripsi part |  Optional |
| \po.id\ | string | MongoDB ObjectId dari PO |  Yes |
| \po.poNumber\ | string | Nomor Purchase Order |  Yes |
| \quantity\ | number | Jumlah item dalam pcs |  Yes |
| \lotId\ | string | Lot ID dari batch produksi |  Yes |
| \gateId\ | string | Gate ID lokasi scan in |  Yes |
| \supplierInfo\ | object | Informasi supplier |  Optional |
| \location\ | object | Lokasi penyimpanan detail |  Optional |
| \createdAt\ | string | ISO 8601 timestamp |  Yes |
| \createdBy\ | string | Username yang membuat item |  Yes |

---

##  USAGE EXAMPLES

### **1. Scanning QR Code**

Saat QR Code di-scan, data JSON akan di-parse:

\\\	ypescript
const qrData = JSON.parse(qrCodeString);

console.log('Unique ID:', qrData.uniqueId);
console.log('Customer:', qrData.customer.name);
console.log('Part:', qrData.part.name);
console.log('Part No:', qrData.part.partNo);
console.log('PO Number:', qrData.po.poNumber);
console.log('Quantity:', qrData.quantity, 'pcs');
console.log('Lot ID:', qrData.lotId);
console.log('Gate ID:', qrData.gateId);
\\\

### **2. Display Format**

Format tampilan untuk print QR Code:

\\\
PT USBERSA MITRA LOGAM
Inventory Management System

[QR CODE IMAGE]

Unique ID: INV-1A2B3C4D-5E6F7G
Customer: PT TOYOTA ASTRA MOTOR
Part: Bracket Mounting A-123
Part No: UML-BRK-001
PO Number: PO-2025-001
Quantity: 500 pcs
Lot ID: LOT-A-003
Gate ID: GATE-01
Copy: 1 of 1

Scan Date: 03/11/2025 10:30
\\\

---

##  IMPLEMENTATION

### **Backend (Node.js/TypeScript)**

File: \inventory-backend/app/api/inventory/items/route.ts\

\\\	ypescript
// Create QR code data with comprehensive information
const qrCodeData = JSON.stringify({
  uniqueId: uniqueId,
  customer: {
    id: (part.customerId as any)?._id || part.customerId,
    name: (part.customerId as any)?.name || 'N/A'
  },
  part: {
    id: part._id.toString(),
    name: part.name,
    partNo: part.internalPartNo,
    description: part.description || ''
  },
  po: {
    id: purchaseOrder._id.toString(),
    poNumber: purchaseOrder.poNumber
  },
  quantity: quantity,
  lotId: lotId,
  gateId: gateId,
  supplierInfo: part.supplierInfo || {},
  location: location || {},
  createdAt: new Date().toISOString(),
  createdBy: user.username
});

const qrCodeImage = await generateQRCode(qrCodeData);
\\\

### **Frontend (React/TypeScript)**

File: \inventory-frontend/src/components/ScanIn.tsx\

\\\	ypescript
const printQRCode = () => {
  const { customerName, partName, partNo, poNumber, quantity, lotId, gateId } = feedback.itemData;
  
  // HTML template dengan semua informasi
  const html = \
    <strong>Unique ID:</strong> \<br>
    <strong>Customer:</strong> \<br>
    <strong>Part:</strong> \<br>
    <strong>Part No:</strong> \<br>
    <strong>PO Number:</strong> \<br>
    <strong>Quantity:</strong> \ pcs<br>
    <strong>Lot ID:</strong> \<br>
    <strong>Gate ID:</strong> \
  \;
};
\\\

---

##  BENEFITS

### **1. Comprehensive Information**
- Semua data penting tersimpan dalam 1 QR Code
- Tidak perlu query database untuk informasi dasar
- Offline-capable untuk display

### **2. Structured Data**
- Format JSON yang mudah di-parse
- Strongly typed untuk TypeScript
- Easy to extend dengan field baru

### **3. Better Traceability**
- Customer identification jelas
- Part tracking dengan internal part number
- PO linkage untuk audit trail
- Lot & Gate tracking untuk quality control

### **4. Print-Ready**
- Semua informasi untuk print sudah ada
- Tidak tergantung pada database saat print
- Consistent format

---

##  SECURITY CONSIDERATIONS

1. **Data Sensitivity**: QR Code berisi informasi bisnis, pastikan hanya diakses oleh authorized personnel
2. **Validation**: Selalu validasi data QR Code di backend sebelum processing
3. **Tampering Protection**: Backend harus re-verify data dengan database
4. **Encryption** (Optional): Untuk future enhancement, bisa encrypt data QR Code

---

##  FUTURE ENHANCEMENTS

1. **Digital Signature**: Tambahkan digital signature untuk verify authenticity
2. **Encryption**: Encrypt sensitive data dalam QR Code
3. **Versioning**: Tambahkan version field untuk backward compatibility
4. **Checksum**: Tambahkan checksum untuk data integrity verification
5. **Compression**: Compress JSON untuk QR Code yang lebih kecil

---

##  TESTING

### **Test QR Code Generation**

\\\ash
cd inventory-backend
npm run test
\\\

### **Test QR Code Scanning**

1. Create item via Scan In
2. Print QR Code
3. Scan dengan QR scanner
4. Verify semua informasi muncul dengan benar

---

##  CHANGELOG

### **Version 2.0** (November 3, 2025)
-  Restructured QR Code data format
-  Added customer object dengan id dan name
-  Added part object dengan id, name, partNo, description
-  Added po object dengan id dan poNumber
-  Added supplierInfo object
-  Added location object
-  Added createdBy username
-  Improved data organization
-  Better print format support

### **Version 1.0** (Initial)
- Basic QR Code dengan minimal information
- Simple flat structure

---

**Status**:  Production Ready
**Last Updated**: November 3, 2025
