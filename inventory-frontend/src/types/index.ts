export interface User {
  id: string; // Changed from _id to match Zustand store
  _id?: string; // Optional for compatibility
  username: string;
  name: string;
  role: 'staff' | 'manager' | 'admin' | 'direktur';
  email?: string;
  status?: 'aktif' | 'nonaktif';
}

export interface Customer {
  _id: string;
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'pending_delete' | 'deleted';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Supplier {
  _id: string;
  supplierId: string; // e.g., "SUP-001" - unique identifier
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Part {
  _id: string;
  customerId: string | { _id: string; name: string }; // Support both string and populated object
  internalPartNo: string;
  name: string;
  description?: string; // Make optional
  poNumber?: string;
  supplierInfo: {
    id: string;
    partNumber?: string; // Make optional
    description?: string; // Make optional
  };
  specifications?: {
    weight?: number;
    dimensions?: string;
    material?: string;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  partId: string | { _id: string; name: string; internalPartNo?: string }; // Make internalPartNo optional
  customerId: string | { _id: string; name: string }; // Support both string and populated object
  totalQuantity: number;
  deliveredQuantity?: number;
  status: 'open' | 'closed' | 'partial' | 'completed' | 'cancelled'; // Add completed and cancelled
  deliveryDate?: Date | string;
  notes?: string;
  createdAt?: Date | string; // Support both Date and string
  updatedAt?: Date | string; // Support both Date and string
}

export interface InventoryItem {
  _id: string;
  uniqueId: string;
  partId: string | { // Support both string and populated object
    _id: string;
    name: string;
    internalPartNo: string;
    customerId?: string | {
      _id: string;
      name: string;
    };
  };
  poId: string | { // Support both string and populated object
    _id: string;
    poNumber: string;
    totalQuantity: number;
    deliveredQuantity?: number;
  };
  quantity: number;
  status: 'IN' | 'OUT' | 'PENDING_DELETE' | 'DAMAGED'; // Add DAMAGED status
  qrCodeData: string;
  qrCodeImage?: string;
  barcode?: string;
  location?: string | {
    warehouse?: string;
    zone?: string;
    rack?: string;
    position?: string;
  };
  lotId: string;
  copies?: number; // Make optional
  gateId: string;
  createdBy: {
    userId: string;
    username: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
  history?: { // Make optional
    status: string;
    timestamp: Date | string;
    userId: string;
    notes?: string;
  }[];
  deleteRequest?: {
    username: string;
    reason: string;
    timestamp: Date | string;
  };
}

export interface AuditLog {
  _id?: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp?: Date | string;
}

export interface AppState {
  currentUser: User | null;
  customers: Customer[];
  parts: Part[];
  purchaseOrders: PurchaseOrder[];
  inventoryItems: InventoryItem[];
  auditLogs: AuditLog[];
  activePage: string;
}