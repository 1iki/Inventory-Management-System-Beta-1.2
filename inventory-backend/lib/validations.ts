import * as yup from 'yup';

// Auth validation schemas
export const loginSchema = yup.object({
  username: yup
    .string()
    .required('Username harus diisi')
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .trim(),
  password: yup
    .string()
    .required('Password harus diisi')
    .min(6, 'Password minimal 6 karakter')
});

// User validation schemas
export const createUserSchema = yup.object({
  username: yup
    .string()
    .required('Username harus diisi')
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh mengandung huruf, angka, dan underscore')
    .trim(),
  name: yup
    .string()
    .required('Nama harus diisi')
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .trim(),
  email: yup
    .string()
    .required('Email harus diisi')
    .email('Format email tidak valid')
    .trim()
    .lowercase(),
  password: yup
    .string()
    .required('Password harus diisi')
    .min(8, 'Password minimal 8 karakter')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf besar, kecil, dan angka'),
  role: yup
    .string()
    .required('Role harus dipilih')
    .oneOf(['staff', 'manager', 'admin', 'direktur'], 'Role tidak valid')
});

export const updateUserSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .trim(),
  email: yup
    .string()
    .email('Format email tidak valid')
    .trim()
    .lowercase(),
  role: yup
    .string()
    .oneOf(['staff', 'manager', 'admin', 'direktur'], 'Role tidak valid'),
  status: yup
    .string()
    .oneOf(['aktif', 'nonaktif'], 'Status tidak valid')
});

export const changePasswordSchema = yup.object({
  currentPassword: yup
    .string()
    .required('Password lama harus diisi'),
  newPassword: yup
    .string()
    .required('Password baru harus diisi')
    .min(8, 'Password minimal 8 karakter')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf besar, kecil, dan angka'),
  confirmPassword: yup
    .string()
    .required('Konfirmasi password harus diisi')
    .oneOf([yup.ref('newPassword')], 'Konfirmasi password tidak cocok')
});

// Customer validation schemas
export const customerSchema = yup.object({
  name: yup
    .string()
    .required('Nama customer harus diisi')
    .min(2, 'Nama minimal 2 karakter')
    .max(200, 'Nama maksimal 200 karakter')
    .trim(),
  address: yup
    .string()
    .required('Alamat harus diisi')
    .min(10, 'Alamat minimal 10 karakter')
    .max(500, 'Alamat maksimal 500 karakter')
    .trim(),
  contactPerson: yup
    .string()
    .max(100, 'Contact person maksimal 100 karakter')
    .trim(),
  phone: yup
    .string()
    .matches(/^(\+62|62|0)[0-9]{8,13}$/, 'Format nomor telepon tidak valid (contoh: 08123456789)')
    .max(20, 'Nomor telepon maksimal 20 karakter'),
  email: yup
    .string()
    .email('Format email tidak valid')
    .trim()
    .lowercase()
});

// Part validation schemas
export const partSchema = yup.object({
  customerId: yup
    .string()
    .required('Customer harus dipilih')
    .matches(/^[0-9a-fA-F]{24}$/, 'Customer ID tidak valid'),
  internalPartNo: yup
    .string()
    .required('Internal Part Number harus diisi')
    .min(3, 'Part number minimal 3 karakter')
    .max(50, 'Part number maksimal 50 karakter')
    .matches(/^[A-Z0-9-_]+$/, 'Part number hanya boleh mengandung huruf besar, angka, dash, dan underscore')
    .trim()
    .uppercase(),
  name: yup
    .string()
    .required('Nama part harus diisi')
    .min(2, 'Nama minimal 2 karakter')
    .max(200, 'Nama maksimal 200 karakter')
    .trim(),
  description: yup
    .string()
    .max(1000, 'Deskripsi maksimal 1000 karakter')
    .trim(),
  poNumber: yup
    .string()
    .max(50, 'PO Number maksimal 50 karakter')
    .trim(),
  supplierInfo: yup.object({
    id: yup
      .string()
      .required('Supplier ID harus diisi')
      .trim(),
    partNumber: yup
      .string()
      .max(100, 'Supplier part number maksimal 100 karakter')
      .trim(),
    description: yup
      .string()
      .max(500, 'Deskripsi supplier maksimal 500 karakter')
      .trim()
  }).required('Informasi supplier harus diisi'),
  specifications: yup.object({
    weight: yup
      .number()
      .positive('Berat harus lebih dari 0')
      .max(10000, 'Berat maksimal 10000 kg'),
    dimensions: yup
      .string()
      .max(100, 'Dimensi maksimal 100 karakter')
      .trim(),
    material: yup
      .string()
      .max(100, 'Material maksimal 100 karakter')
      .trim()
  })
});

// Purchase Order validation schemas
export const purchaseOrderSchema = yup.object({
  poNumber: yup
    .string()
    .required('PO Number harus diisi')
    .min(3, 'PO Number minimal 3 karakter')
    .max(50, 'PO Number maksimal 50 karakter')
    .matches(/^[A-Z0-9-_\/]+$/, 'PO Number format tidak valid')
    .trim()
    .uppercase(),
  partId: yup
    .string()
    .required('Part harus dipilih')
    .matches(/^[0-9a-fA-F]{24}$/, 'Part ID tidak valid'),
  customerId: yup
    .string()
    .required('Customer harus dipilih')
    .matches(/^[0-9a-fA-F]{24}$/, 'Customer ID tidak valid'),
  totalQuantity: yup
    .number()
    .required('Total quantity harus diisi')
    .positive('Quantity harus lebih dari 0')
    .integer('Quantity harus berupa bilangan bulat')
    .max(1000000, 'Quantity maksimal 1,000,000'),
  deliveryDate: yup
    .date()
    .min(new Date(), 'Tanggal delivery tidak boleh di masa lalu'),
  notes: yup
    .string()
    .max(1000, 'Notes maksimal 1000 karakter')
    .trim()
});

export const updatePurchaseOrderSchema = yup.object({
  totalQuantity: yup
    .number()
    .positive('Quantity harus lebih dari 0')
    .integer('Quantity harus berupa bilangan bulat')
    .max(1000000, 'Quantity maksimal 1,000,000'),
  status: yup
    .string()
    .oneOf(['open', 'partial', 'completed', 'cancelled'], 'Status tidak valid'),
  deliveryDate: yup
    .date()
    .min(new Date(), 'Tanggal delivery tidak boleh di masa lalu'),
  notes: yup
    .string()
    .max(1000, 'Notes maksimal 1000 karakter')
    .trim()
});

// Inventory Item validation schemas
export const inventoryItemSchema = yup.object({
  partId: yup
    .string()
    .required('Part harus dipilih')
    .matches(/^[0-9a-fA-F]{24}$/, 'Part ID tidak valid'),
  poId: yup
    .string()
    .required('Purchase Order harus dipilih')
    .matches(/^[0-9a-fA-F]{24}$/, 'PO ID tidak valid'),
  quantity: yup
    .number()
    .required('Quantity harus diisi')
    .positive('Quantity harus lebih dari 0')
    .integer('Quantity harus berupa bilangan bulat')
    .max(10000, 'Quantity maksimal 10,000'),
  lotId: yup
    .string()
    .required('Lot ID harus diisi')
    .min(3, 'Lot ID minimal 3 karakter')
    .max(50, 'Lot ID maksimal 50 karakter')
    .trim()
    .uppercase(),
  copies: yup
    .number()
    .positive('Copies harus lebih dari 0')
    .integer('Copies harus berupa bilangan bulat')
    .max(100, 'Copies maksimal 100')
    .default(1),
  gateId: yup
    .string()
    .required('Gate ID harus diisi')
    .min(1, 'Gate ID minimal 1 karakter')
    .max(20, 'Gate ID maksimal 20 karakter')
    .trim()
    .uppercase(),
  location: yup.object({
    warehouse: yup
      .string()
      .max(50, 'Warehouse maksimal 50 karakter')
      .trim(),
    zone: yup
      .string()
      .max(50, 'Zone maksimal 50 karakter')
      .trim(),
    rack: yup
      .string()
      .max(50, 'Rack maksimal 50 karakter')
      .trim(),
    position: yup
      .string()
      .max(50, 'Position maksimal 50 karakter')
      .trim()
  })
});

// Scan validation schemas
export const scanInSchema = yup.object({
  qrCodeData: yup
    .string()
    .required('QR Code data harus diisi')
    .trim(),
  location: yup.object({
    warehouse: yup
      .string()
      .max(50, 'Warehouse maksimal 50 karakter')
      .trim(),
    zone: yup
      .string()
      .max(50, 'Zone maksimal 50 karakter')
      .trim(),
    rack: yup
      .string()
      .max(50, 'Rack maksimal 50 karakter')
      .trim(),
    position: yup
      .string()
      .max(50, 'Position maksimal 50 karakter')
      .trim()
  }),
  notes: yup
    .string()
    .max(500, 'Notes maksimal 500 karakter')
    .trim()
});

export const scanOutSchema = yup.object({
  qrCodeData: yup
    .string()
    .required('QR Code data harus diisi')
    .trim(),
  notes: yup
    .string()
    .max(500, 'Notes maksimal 500 karakter')
    .trim()
});

// Delete Request validation schema
export const deleteRequestSchema = yup.object({
  reason: yup
    .string()
    .required('Alasan penghapusan harus diisi')
    .min(10, 'Alasan minimal 10 karakter')
    .max(500, 'Alasan maksimal 500 karakter')
    .trim()
});

export const approveDeleteRequestSchema = yup.object({
  action: yup
    .string()
    .required('Action harus dipilih')
    .oneOf(['approve', 'reject'], 'Action tidak valid'),
  notes: yup
    .string()
    .max(500, 'Notes maksimal 500 karakter')
    .trim()
});

// Report filters validation
export const reportFiltersSchema = yup.object({
  startDate: yup
    .date()
    .max(new Date(), 'Start date tidak boleh di masa depan'),
  endDate: yup
    .date()
    .min(yup.ref('startDate'), 'End date harus setelah start date')
    .max(new Date(), 'End date tidak boleh di masa depan'),
  status: yup
    .string()
    .oneOf(['IN', 'OUT', 'PENDING_DELETE', 'DAMAGED', ''], 'Status tidak valid'),
  reportType: yup
    .string()
    .oneOf(['SCAN_IN', 'SCAN_OUT', ''], 'Report type tidak valid'),
  customerId: yup
    .string()
    .matches(/^[0-9a-fA-F]{24}$/, 'Customer ID tidak valid'),
  partId: yup
    .string()
    .matches(/^[0-9a-fA-F]{24}$/, 'Part ID tidak valid'),
  customerName: yup
    .string()
    .max(200, 'Nama customer maksimal 200 karakter')
    .trim(),
  page: yup
    .number()
    .positive('Page harus lebih dari 0')
    .integer('Page harus berupa bilangan bulat')
    .default(1),
  limit: yup
    .number()
    .positive('Limit harus lebih dari 0')
    .integer('Limit harus berupa bilangan bulat')
    .max(100, 'Limit maksimal 100')
    .default(10)
});

// Bulk operations validation
export const bulkImportSchema = yup.object({
  type: yup
    .string()
    .required('Type harus dipilih')
    .oneOf(['customers', 'parts', 'purchase-orders', 'inventory-items'], 'Type tidak valid'),
  data: yup
    .array()
    .required('Data harus diisi')
    .min(1, 'Data minimal 1 item')
    .max(1000, 'Data maksimal 1000 items')
});

// Search validation
export const searchSchema = yup.object({
  query: yup
    .string()
    .required('Query pencarian harus diisi')
    .min(2, 'Query minimal 2 karakter')
    .max(100, 'Query maksimal 100 karakter')
    .trim(),
  type: yup
    .string()
    .oneOf(['customers', 'parts', 'purchase-orders', 'inventory-items', 'all'], 'Type pencarian tidak valid')
    .default('all'),
  page: yup
    .number()
    .positive('Page harus lebih dari 0')
    .integer('Page harus berupa bilangan bulat')
    .default(1),
  limit: yup
    .number()
    .positive('Limit harus lebih dari 0')
    .integer('Limit harus berupa bilangan bulat')
    .max(50, 'Limit maksimal 50')
    .default(10)
});

// Common validation utilities
export const objectIdSchema = yup
  .string()
  .required('ID harus diisi')
  .matches(/^[0-9a-fA-F]{24}$/, 'Format ID tidak valid');

export const paginationSchema = yup.object({
  page: yup
    .number()
    .positive('Page harus lebih dari 0')
    .integer('Page harus berupa bilangan bulat')
    .default(1),
  limit: yup
    .number()
    .positive('Limit harus lebih dari 0')
    .integer('Limit harus berupa bilangan bulat')
    .max(100, 'Limit maksimal 100')
    .default(10),
  sortBy: yup
    .string()
    .max(50, 'Sort field maksimal 50 karakter')
    .default('createdAt'),
  sortOrder: yup
    .string()
    .oneOf(['asc', 'desc'], 'Sort order harus asc atau desc')
    .default('desc')
});

export default {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  customerSchema,
  partSchema,
  purchaseOrderSchema,
  updatePurchaseOrderSchema,
  inventoryItemSchema,
  scanInSchema,
  scanOutSchema,
  deleteRequestSchema,
  approveDeleteRequestSchema,
  reportFiltersSchema,
  bulkImportSchema,
  searchSchema,
  objectIdSchema,
  paginationSchema
};