import mongoose, { Document, Schema } from 'mongoose';

// User Interface
export interface IUser extends Document {
  username: string;
  name: string;
  email: string;
  password: string;
  role: 'staff' | 'manager' | 'admin' | 'direktur';
  status: 'aktif' | 'nonaktif';
  createdAt: Date;
  updatedAt: Date;
}

// Customer Interface
export interface ICustomer extends Document {
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  poNumbers?: string[]; // 🆕 Array of PO Numbers terkait customer ini
  status: 'active' | 'pending_delete' | 'deleted';
  deleteRequest?: {
    userId: mongoose.Types.ObjectId;
    username: string;
    reason: string;
    timestamp: Date;
    approvedBy?: mongoose.Types.ObjectId;
    approvalTimestamp?: Date;
    status: 'pending' | 'approved' | 'rejected';
  };
  createdAt: Date;
  updatedAt: Date;
}

// 🆕 Supplier Interface
export interface ISupplier extends Document {
  supplierId: string; // Unique Supplier ID (e.g., SUP-001)
  name: string; // Supplier Name
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Part Interface
export interface IPart extends Document {
  customerId: mongoose.Types.ObjectId;
  internalPartNo: string;
  name: string;
  description?: string;
  poNumber?: string; // Nomor Purchase Order
  supplierInfo: {
    id: string;
    partNumber?: string;
    description?: string;
  };
  specifications?: {
    weight?: number;
    dimensions?: string;
    material?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Purchase Order Interface
export interface IPurchaseOrder extends Document {
  poNumber: string;
  partId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  totalQuantity: number;
  deliveredQuantity: number;
  status: 'open' | 'partial' | 'completed' | 'cancelled';
  deliveryDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Inventory Item Interface
export interface IInventoryItem extends Document {
  uniqueId: string;
  partId: mongoose.Types.ObjectId;
  poId: mongoose.Types.ObjectId;
  poNumber: string; // 🆕 Direct PO Number reference untuk performa & kemudahan query
  quantity: number;
  status: 'IN' | 'OUT' | 'PENDING_DELETE' | 'DAMAGED';
  qrCodeData: string;
  qrCodeImage?: string;
  barcode?: string;
  lotId: string;
  copies: number;
  gateId: string;
  location?: {
    warehouse?: string;
    zone?: string;
    rack?: string;
    position?: string;
  };
  createdBy: {
    userId: mongoose.Types.ObjectId;
    username: string;
  };
  history: Array<{
    status: string;
    timestamp: Date;
    userId: mongoose.Types.ObjectId;
    notes?: string;
  }>;
  deleteRequest?: {
    userId: mongoose.Types.ObjectId;
    username: string;
    reason: string;
    timestamp: Date;
    approvedBy?: mongoose.Types.ObjectId;
    approvalTimestamp?: Date;
    status: 'pending' | 'approved' | 'rejected';
  };
  createdAt: Date;
  updatedAt: Date;
}

// Audit Log Interface
export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  action: string;
  details: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Report Interface
export interface IReport extends Document {
  uniqueId: string; // ID unik dari item yang di-scan
  itemId: mongoose.Types.ObjectId; // Reference ke InventoryItem
  customerId: mongoose.Types.ObjectId; // Reference ke Customer (NAMA PT)
  partId: mongoose.Types.ObjectId; // Reference ke Part
  poId: mongoose.Types.ObjectId; // Reference ke PurchaseOrder
  reportType: 'SCAN_IN' | 'SCAN_OUT'; // Tipe report
  quantity: number; // Jumlah yang di-scan
  status: string; // Status saat scan (IN/OUT)
  lotId: string; // LOT ID
  gateId: string; // GATE ID
  location?: {
    warehouse?: string;
    zone?: string;
    rack?: string;
    position?: string;
  };
  scannedBy: {
    userId: mongoose.Types.ObjectId;
    username: string;
    name: string;
  };
  customerName: string; // Nama PT untuk optimasi query
  partName: string; // Nama Item untuk display
  poNumber: string; // NO PO untuk reference
  notes?: string; // Catatan tambahan
  createdAt: Date; // CREATE DATETIME - penting untuk filter
  updatedAt: Date; // UPDATE DATETIME
}

// Schemas
const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['staff', 'manager', 'admin', 'direktur'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['aktif', 'nonaktif'], 
    default: 'aktif' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CustomerSchema = new Schema<ICustomer>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  poNumbers: { type: [String] }, // 🆕 Array of PO Numbers terkait customer ini
  status: { 
    type: String, 
    enum: ['active', 'pending_delete', 'deleted'], 
    default: 'active' 
  },
  deleteRequest: {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    reason: { type: String },
    timestamp: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalTimestamp: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 🆕 Supplier Schema
const SupplierSchema = new Schema<ISupplier>({
  supplierId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PartSchema = new Schema<IPart>({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  internalPartNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  poNumber: { type: String },
  supplierInfo: {
    id: { type: String, required: true },
    partNumber: { type: String },
    description: { type: String }
  },
  specifications: {
    weight: { type: Number },
    dimensions: { type: String },
    material: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PurchaseOrderSchema = new Schema<IPurchaseOrder>({
  poNumber: { type: String, required: true, unique: true },
  partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  totalQuantity: { type: Number, required: true },
  deliveredQuantity: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['open', 'partial', 'completed', 'cancelled'], 
    default: 'open' 
  },
  deliveryDate: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const InventoryItemSchema = new Schema<IInventoryItem>({
  uniqueId: { type: String, required: true, unique: true },
  partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
  poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  poNumber: { type: String, required: true }, // 🆕 Direct PO Number reference untuk performa & kemudahan query
  quantity: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['IN', 'OUT', 'PENDING_DELETE', 'DAMAGED'], 
    default: 'IN' 
  },
  qrCodeData: { type: String, required: true },
  qrCodeImage: { type: String },
  barcode: { type: String },
  lotId: { type: String, required: true },
  copies: { type: Number, default: 1 },
  gateId: { type: String, required: true },
  location: {
    warehouse: { type: String },
    zone: { type: String },
    rack: { type: String },
    position: { type: String }
  },
  createdBy: {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true }
  },
  history: [{
    status: { type: String, required: true },
    timestamp: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String }
  }],
  deleteRequest: {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    reason: { type: String },
    timestamp: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalTimestamp: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  resourceType: { type: String },
  resourceId: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const ReportSchema = new Schema<IReport>({
  uniqueId: { type: String, required: true },
  itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
  poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  reportType: { type: String, enum: ['SCAN_IN', 'SCAN_OUT'], required: true },
  quantity: { type: Number, required: true },
  status: { type: String, required: true },
  lotId: { type: String, required: true },
  gateId: { type: String, required: true },
  location: {
    warehouse: { type: String },
    zone: { type: String },
    rack: { type: String },
    position: { type: String }
  },
  scannedBy: {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    name: { type: String, required: true }
  },
  customerName: { type: String, required: true },
  partName: { type: String, required: true },
  poNumber: { type: String, required: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ==================== INDEXES ====================

// User indexes
UserSchema.index({ username: 1, email: 1 }); // Compound index for login
UserSchema.index({ role: 1, isActive: 1 }); // Filter by role and status
UserSchema.index({ createdAt: -1 }); // Sort by creation date

// Customer indexes  
CustomerSchema.index({ name: 1 }); // Search by name
CustomerSchema.index({ email: 1 }); // Search by email
CustomerSchema.index({ staffAccess: 1 }); // Filter by staff access
CustomerSchema.index({ createdAt: -1 }); // Sort by date

// Part indexes
PartSchema.index({ customerId: 1, internalPartNo: 1 }); // Compound for customer parts
PartSchema.index({ internalPartNo: 1 }, { unique: true }); // Unique constraint
PartSchema.index({ name: 'text' }); // Full-text search
PartSchema.index({ 'supplierInfo.id': 1 }); // Supplier lookup
PartSchema.index({ createdAt: -1 }); // Sort by date

// Purchase Order indexes
PurchaseOrderSchema.index({ poNumber: 1 }, { unique: true }); // Unique PO number
PurchaseOrderSchema.index({ customerId: 1, status: 1 }); // Customer orders by status
PurchaseOrderSchema.index({ partId: 1, status: 1 }); // Part orders by status
PurchaseOrderSchema.index({ status: 1, deliveryDate: 1 }); // Status and delivery
PurchaseOrderSchema.index({ createdAt: -1 }); // Sort by date
PurchaseOrderSchema.index({ deliveryDate: 1 }); // Sort by delivery date

// Inventory Item indexes
InventoryItemSchema.index({ uniqueId: 1 }, { unique: true }); // Unique item ID
InventoryItemSchema.index({ partId: 1, status: 1 }); // Part inventory by status
InventoryItemSchema.index({ poId: 1, status: 1 }); // PO items by status
InventoryItemSchema.index({ status: 1, createdAt: -1 }); // Status timeline
InventoryItemSchema.index({ barcode: 1 }); // Barcode lookup
InventoryItemSchema.index({ lotId: 1 }); // Lot tracking
InventoryItemSchema.index({ qrCodeData: 'text' }); // QR code search
InventoryItemSchema.index({ 'location.warehouse': 1, 'location.zone': 1 }); // Location lookup
InventoryItemSchema.index({ createdAt: -1 }); // Sort by date

// Report indexes
ReportSchema.index({ customerName: 1, createdAt: -1 }); // Customer reports timeline
ReportSchema.index({ reportType: 1, createdAt: -1 }); // Report type timeline
ReportSchema.index({ poId: 1, reportType: 1 }); // PO reports by type
ReportSchema.index({ itemId: 1 }); // Item reports
ReportSchema.index({ status: 1 }); // Filter by status
ReportSchema.index({ 'scannedBy.userId': 1 }); // User activity
ReportSchema.index({ createdAt: -1 }); // Sort by date

// Audit Log indexes
AuditLogSchema.index({ userId: 1, timestamp: -1 }); // User activity timeline
AuditLogSchema.index({ action: 1, timestamp: -1 }); // Action timeline
AuditLogSchema.index({ resourceType: 1, resourceId: 1 }); // Resource audit
AuditLogSchema.index({ timestamp: -1 }); // Sort by date
AuditLogSchema.index({ ipAddress: 1 }); // IP tracking

// ==================== QUERY OPTIMIZATION HELPERS ====================

// Add static methods for optimized queries
InventoryItemSchema.statics.findActiveItems = function(filter = {}) {
  return this.find({ ...filter, status: { $in: ['IN', 'PENDING_DELETE'] } })
    .select('-qrCodeImage') // Exclude large fields
    .lean()
    .exec();
};

InventoryItemSchema.statics.getInventorySummary = async function(customerId?: string) {
  const match: any = {};
  if (customerId) match.customerId = new mongoose.Types.ObjectId(customerId);
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }
    },
    {
      $group: {
        _id: null,
        statusBreakdown: {
          $push: {
            status: '$_id',
            count: '$count',
            quantity: '$totalQuantity'
          }
        },
        totalItems: { $sum: '$count' },
        totalQuantity: { $sum: '$totalQuantity' }
      }
    }
  ]);
};

ReportSchema.statics.getReportStats = async function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$reportType'
        },
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
};

PurchaseOrderSchema.statics.findPendingOrders = function() {
  return this.find({ 
    status: { $in: ['pending', 'partial'] },
    deliveryDate: { $gte: new Date() }
  })
  .populate('customerId', 'name')
  .populate('partId', 'name internalPartNo')
  .select('-__v')
  .sort({ deliveryDate: 1 })
  .lean()
  .exec();
};

AuditLogSchema.statics.getActivityStats = async function(userId: string, days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Create indexes for better performance
UserSchema.index({ username: 1, email: 1 });
PartSchema.index({ internalPartNo: 1, customerId: 1 });
PurchaseOrderSchema.index({ poNumber: 1, customerId: 1 });
InventoryItemSchema.index({ uniqueId: 1, status: 1, partId: 1 });
InventoryItemSchema.index({ barcode: 1 }); // Add index for barcode search
AuditLogSchema.index({ timestamp: -1, userId: 1 });

// Index untuk Report - PENTING untuk performa filter
ReportSchema.index({ customerName: 1 }); // Filter berdasarkan NAMA PT
ReportSchema.index({ createdAt: -1 }); // Filter berdasarkan waktu (descending)
ReportSchema.index({ customerName: 1, createdAt: -1 }); // Compound index untuk filter gabungan
ReportSchema.index({ customerId: 1, createdAt: -1 }); // Index alternatif dengan ObjectId
ReportSchema.index({ reportType: 1, createdAt: -1 }); // Filter berdasarkan tipe report
ReportSchema.index({ uniqueId: 1 }); // Pencarian berdasarkan ID Unik
ReportSchema.index({ status: 1 }); // Filter berdasarkan status
ReportSchema.index({ poId: 1 }); // Index untuk sinkronisasi dengan PO
ReportSchema.index({ poNumber: 1 }); // Index untuk search PO Number

// Middleware untuk sinkronisasi PO Number
// Ketika PO Number di PurchaseOrder diupdate, update juga di Report collection
PurchaseOrderSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.poNumber) {
    try {
      // Update all reports yang menggunakan PO ini
      const ReportModel = mongoose.models.Report || mongoose.model('Report', ReportSchema);
      await ReportModel.updateMany(
        { poId: doc._id },
        { $set: { poNumber: doc.poNumber } }
      );
      
      // ✅ AUTO-SYNC: Update poNumber di Part table juga
      const PartModel = mongoose.models.Part || mongoose.model('Part', PartSchema);
      await PartModel.findByIdAndUpdate(
        doc.partId,
        { $set: { poNumber: doc.poNumber } }
      );
      
      // 🆕 AUTO-SYNC: Update poNumbers array di Customer table
      const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
      const customer = await CustomerModel.findById(doc.customerId);
      if (customer) {
        const poNumbers = await mongoose.models.PurchaseOrder.find({ customerId: doc.customerId }).distinct('poNumber');
        await CustomerModel.findByIdAndUpdate(
          doc.customerId,
          { $set: { poNumbers: poNumbers.filter(Boolean) } }
        );
      }
      
      console.log(`✅ PO Number ${doc.poNumber} synced to Part ${doc.partId} and Customer ${doc.customerId}`);
    } catch (error) {
      console.error('Error syncing poNumber to Reports and Parts:', error);
    }
  }
});

PurchaseOrderSchema.post('save', async function(doc) {
  if (doc && doc.poNumber) {
    try {
      // Update all reports yang menggunakan PO ini
      const ReportModel = mongoose.models.Report || mongoose.model('Report', ReportSchema);
      await ReportModel.updateMany(
        { poId: doc._id },
        { $set: { poNumber: doc.poNumber } }
      );
      
      // ✅ AUTO-SYNC: Update poNumber di Part table juga
      const PartModel = mongoose.models.Part || mongoose.model('Part', PartSchema);
      await PartModel.findByIdAndUpdate(
        doc.partId,
        { $set: { poNumber: doc.poNumber } }
      );
      
      // 🆕 AUTO-SYNC: Update poNumbers array di Customer table
      const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
      const customer = await CustomerModel.findById(doc.customerId);
      if (customer) {
        // Ambil semua PO Numbers untuk customer ini
        const poNumbers = await mongoose.models.PurchaseOrder.find({ customerId: doc.customerId }).distinct('poNumber');
        await CustomerModel.findByIdAndUpdate(
          doc.customerId,
          { $set: { poNumbers: poNumbers.filter(Boolean) } }
        );
      }
      
      console.log(`✅ PO Number ${doc.poNumber} synced to Part ${doc.partId} and Customer ${doc.customerId}`);
    } catch (error) {
      console.error('Error syncing poNumber to Reports and Parts:', error);
    }
  }
});

// ✅ AUTO-SYNC: Ketika PO dihapus, hapus juga poNumber dari Part dan update Customer
PurchaseOrderSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.partId) {
    try {
      const PartModel = mongoose.models.Part || mongoose.model('Part', PartSchema);
      await PartModel.findByIdAndUpdate(
        doc.partId,
        { $set: { poNumber: '' } }
      );
      
      // 🆕 AUTO-SYNC: Update poNumbers array di Customer table
      const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
      const customer = await CustomerModel.findById(doc.customerId);
      if (customer) {
        // Re-sync semua PO Numbers yang masih ada
        const poNumbers = await mongoose.models.PurchaseOrder.find({ customerId: doc.customerId }).distinct('poNumber');
        await CustomerModel.findByIdAndUpdate(
          doc.customerId,
          { $set: { poNumbers: poNumbers.filter(Boolean) } }
        );
      }
      
      console.log(`✅ PO Number cleared from Part ${doc.partId} and Customer ${doc.customerId} after PO deletion`);
    } catch (error) {
      console.error('Error clearing poNumber from Part:', error);
    }
  }
});

PurchaseOrderSchema.post('deleteMany', async function(result) {
  try {
    // Clear poNumber dari semua Parts yang terkena delete
    const PartModel = mongoose.models.Part || mongoose.model('Part', PartSchema);
    // Karena bulk delete, kita perlu clear semua yang mungkin terhapus
    // Ini akan di-handle di API level untuk lebih akurat
    console.log(`⚠️ Bulk PO delete detected, please manually sync Parts if needed`);
  } catch (error) {
    console.error('Error in bulk delete hook:', error);
  }
});

// Middleware untuk updatedAt
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

CustomerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

PartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

PurchaseOrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

InventoryItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

ReportSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Export models with proper typing
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
export const Supplier = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
export const Part = mongoose.models.Part || mongoose.model<IPart>('Part', PartSchema);
export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
export const InventoryItem = mongoose.models.InventoryItem || mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export const Report = mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);