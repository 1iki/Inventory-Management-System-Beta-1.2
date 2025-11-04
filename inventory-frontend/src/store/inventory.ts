import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { api } from '../lib/api';

// Enable Immer MapSet plugin for Map/Set support
enableMapSet();

interface InventoryItem {
  _id: string;
  uniqueId: string;
  partId: {
    _id: string;
    name: string;
    internalPartNo: string;
    customerId?: {
      _id: string;
      name: string;
    };
  };
  poId: {
    _id: string;
    poNumber: string;
    totalQuantity: number;
    deliveredQuantity: number;
  };
  quantity: number;
  status: 'IN' | 'OUT' | 'PENDING_DELETE' | 'DAMAGED';
  qrCodeData: string;
  qrCodeImage?: string;
  barcode?: string;
  lotId: string;
  gateId: string;
  location?: {
    warehouse?: string;
    zone?: string;
    rack?: string;
    position?: string;
  };
  createdBy: {
    userId: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  _id: string;
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'pending_delete' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

interface Part {
  _id: string;
  customerId: string | { _id: string; name: string };
  internalPartNo: string;
  name: string;
  description?: string;
  poNumber?: string;
  supplierInfo: {
    id: string;
    partNumber?: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  partId: string | { _id: string; name: string };
  customerId: string | { _id: string; name: string };
  totalQuantity: number;
  deliveredQuantity: number;
  status: 'open' | 'partial' | 'completed' | 'cancelled';
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  _id: string;
  supplierId: string;
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  role: 'staff' | 'admin' | 'manager' | 'direktur';
  email?: string;
}

interface AuditLog {
  _id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  timestamp: string;
}

interface InventoryState {
  // Data
  items: InventoryItem[];
  customers: Customer[];
  parts: Part[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  inventoryItems: InventoryItem[]; // Alias for backward compatibility
  auditLogs: AuditLog[];
  
  // Auth
  currentUser: User | null;
  isLoading: boolean;
  
  // UI State
  loading: boolean;
  error: string | null;
  selectedItem: InventoryItem | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Filters
  filters: {
    status?: string;
    customerId?: string;
    partId?: string;
    poId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  };
  
  // Cache
  cache: {
    items: Map<string, InventoryItem>;
    customers: Map<string, Customer>;
    parts: Map<string, Part>;
    purchaseOrders: Map<string, PurchaseOrder>;
    suppliers: Map<string, Supplier>;
    lastFetch: {
      items?: number;
      customers?: number;
      parts?: number;
      purchaseOrders?: number;
      suppliers?: number;
    };
  };
  
  // Actions
  setItems: (items: InventoryItem[]) => void;
  addItem: (item: InventoryItem) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  removeItem: (id: string) => void;
  
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  
  setParts: (parts: Part[]) => void;
  addPart: (part: Part) => void;
  updatePart: (id: string, updates: Partial<Part>) => void;
  
  setPurchaseOrders: (pos: PurchaseOrder[]) => void;
  addPurchaseOrder: (po: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  removeSupplier: (id: string) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedItem: (item: InventoryItem | null) => void;
  
  setPagination: (pagination: Partial<InventoryState['pagination']>) => void;
  setFilters: (filters: Partial<InventoryState['filters']>) => void;
  clearFilters: () => void;
  
  // Auth actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
  
  // API actions
  fetchMaster: (type: 'customers' | 'parts' | 'purchaseOrders' | 'suppliers') => Promise<void>;
  scanIn: (data: any) => Promise<any>;
  fetchDeleteRequests: () => Promise<void>;
  approveDeleteRequest: (id: string) => Promise<void>;
  rejectDeleteRequest: (id: string) => Promise<void>;
  
  // Audit actions
  addAuditLog: (log: Omit<AuditLog, '_id' | 'timestamp'>) => void;
  setAuditLogs: (logs: AuditLog[]) => void;
  
  // Cache operations
  getCachedItem: (id: string) => InventoryItem | undefined;
  getCachedCustomer: (id: string) => Customer | undefined;
  getCachedPart: (id: string) => Part | undefined;
  getCachedPO: (id: string) => PurchaseOrder | undefined;
  getCachedSupplier: (id: string) => Supplier | undefined;
  
  invalidateCache: (type?: 'items' | 'customers' | 'parts' | 'purchaseOrders' | 'suppliers') => void;
  shouldRefetch: (type: 'items' | 'customers' | 'parts' | 'purchaseOrders' | 'suppliers', ttl?: number) => boolean;
  
  // Reset
  reset: () => void;
}

const initialState = {
  items: [],
  customers: [],
  parts: [],
  purchaseOrders: [],
  suppliers: [],
  inventoryItems: [],
  auditLogs: [],
  currentUser: null,
  isLoading: false,
  loading: false,
  error: null,
  selectedItem: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {},
  cache: {
    items: new Map(),
    customers: new Map(),
    parts: new Map(),
    purchaseOrders: new Map(),
    suppliers: new Map(),
    lastFetch: {},
  },
};

export const useInventoryStore = create<InventoryState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Items actions
        setItems: (items) =>
          set((state) => {
            state.items = items;
            state.inventoryItems = items; // Keep in sync
            items.forEach(item => {
              state.cache.items.set(item._id, item);
            });
            state.cache.lastFetch.items = Date.now();
          }),
        
        addItem: (item) =>
          set((state) => {
            state.items.unshift(item);
            state.inventoryItems.unshift(item);
            state.cache.items.set(item._id, item);
            state.pagination.total += 1;
          }),
        
        updateItem: (id, updates) =>
          set((state) => {
            const index = state.items.findIndex((item) => item._id === id);
            if (index !== -1) {
              state.items[index] = { ...state.items[index], ...updates };
              state.inventoryItems[index] = state.items[index];
              state.cache.items.set(id, state.items[index]);
            }
          }),
        
        removeItem: (id) =>
          set((state) => {
            state.items = state.items.filter((item) => item._id !== id);
            state.inventoryItems = state.items;
            state.cache.items.delete(id);
            state.pagination.total -= 1;
          }),
        
        // Customers actions
        setCustomers: (customers) =>
          set((state) => {
            state.customers = customers;
            customers.forEach(customer => {
              state.cache.customers.set(customer._id, customer);
            });
            state.cache.lastFetch.customers = Date.now();
          }),
        
        addCustomer: (customer) =>
          set((state) => {
            state.customers.unshift(customer);
            state.cache.customers.set(customer._id, customer);
          }),
        
        updateCustomer: (id, updates) =>
          set((state) => {
            const index = state.customers.findIndex((c) => c._id === id);
            if (index !== -1) {
              state.customers[index] = { ...state.customers[index], ...updates };
              state.cache.customers.set(id, state.customers[index]);
            }
          }),
        
        // Parts actions
        setParts: (parts) =>
          set((state) => {
            state.parts = parts;
            parts.forEach(part => {
              state.cache.parts.set(part._id, part);
            });
            state.cache.lastFetch.parts = Date.now();
          }),
        
        addPart: (part) =>
          set((state) => {
            state.parts.unshift(part);
            state.cache.parts.set(part._id, part);
          }),
        
        updatePart: (id, updates) =>
          set((state) => {
            const index = state.parts.findIndex((p) => p._id === id);
            if (index !== -1) {
              state.parts[index] = { ...state.parts[index], ...updates };
              state.cache.parts.set(id, state.parts[index]);
            }
          }),
        
        // Purchase Orders actions
        setPurchaseOrders: (pos) =>
          set((state) => {
            state.purchaseOrders = pos;
            pos.forEach(po => {
              state.cache.purchaseOrders.set(po._id, po);
            });
            state.cache.lastFetch.purchaseOrders = Date.now();
          }),
        
        addPurchaseOrder: (po) =>
          set((state) => {
            state.purchaseOrders.unshift(po);
            state.cache.purchaseOrders.set(po._id, po);
          }),
        
        updatePurchaseOrder: (id, updates) =>
          set((state) => {
            const index = state.purchaseOrders.findIndex((po) => po._id === id);
            if (index !== -1) {
              state.purchaseOrders[index] = { ...state.purchaseOrders[index], ...updates };
              state.cache.purchaseOrders.set(id, state.purchaseOrders[index]);
            }
          }),
        
        // Suppliers actions
        setSuppliers: (suppliers) =>
          set((state) => {
            state.suppliers = suppliers;
            suppliers.forEach(supplier => {
              state.cache.suppliers.set(supplier._id, supplier);
            });
            state.cache.lastFetch.suppliers = Date.now();
          }),
        
        addSupplier: (supplier) =>
          set((state) => {
            state.suppliers.unshift(supplier);
            state.cache.suppliers.set(supplier._id, supplier);
          }),
        
        updateSupplier: (id, updates) =>
          set((state) => {
            const index = state.suppliers.findIndex((s) => s._id === id);
            if (index !== -1) {
              state.suppliers[index] = { ...state.suppliers[index], ...updates };
              state.cache.suppliers.set(id, state.suppliers[index]);
            }
          }),
        
        removeSupplier: (id) =>
          set((state) => {
            state.suppliers = state.suppliers.filter((s) => s._id !== id);
            state.cache.suppliers.delete(id);
          }),
        
        // UI actions
        setLoading: (loading) => set({ loading, isLoading: loading }),
        setError: (error) => set({ error }),
        setSelectedItem: (selectedItem) => set({ selectedItem }),
        
        // Pagination actions
        setPagination: (pagination) =>
          set((state) => {
            state.pagination = { ...state.pagination, ...pagination };
          }),
        
        // Filter actions
        setFilters: (filters) =>
          set((state) => {
            state.filters = { ...state.filters, ...filters };
            state.pagination.page = 1; // Reset to first page when filters change
          }),
        
        clearFilters: () =>
          set((state) => {
            state.filters = {};
            state.pagination.page = 1;
          }),
        
        // Auth actions
        login: async (username, password) => {
          set({ isLoading: true, error: null });
          try {
            const response = await api.post('/auth/login', { username, password });
            const { user, token } = response.data.data;
            localStorage.setItem('token', token);
            set({ currentUser: user, isLoading: false });
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Login gagal', 
              isLoading: false 
            });
            throw error;
          }
        },
        
        logout: () => {
          localStorage.removeItem('token');
          set({ currentUser: null });
        },
        
        setCurrentUser: (user) => set({ currentUser: user }),
        
        // API actions
        fetchMaster: async (type) => {
          set({ loading: true, error: null });
          try {
            const endpoint = type === 'customers' ? '/api/master/customers' :
                           type === 'parts' ? '/api/master/parts' :
                           type === 'suppliers' ? '/api/master/suppliers' :
                           '/api/master/purchase-orders';
            
            const response = await api.get(endpoint);
            const data = response.data.data;
            
            if (type === 'customers') {
              get().setCustomers(data);
            } else if (type === 'parts') {
              get().setParts(data);
            } else if (type === 'suppliers') {
              get().setSuppliers(data);
            } else {
              get().setPurchaseOrders(data);
            }
            
            set({ loading: false });
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Fetch failed', 
              loading: false 
            });
            throw error;
          }
        },
        
        scanIn: async (data) => {
          set({ loading: true, error: null });
          try {
            const response = await api.post('/inventory/items', data);
            const newItem = response.data.data;
            get().addItem(newItem);
            set({ loading: false });
            return newItem;
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Scan In failed', 
              loading: false 
            });
            throw error;
          }
        },
        
        fetchDeleteRequests: async () => {
          set({ loading: true });
          try {
            const response = await api.get('/inventory/items?status=PENDING_DELETE');
            const items = response.data.data.items || [];
            set({ loading: false });
            return items;
          } catch (error) {
            set({ loading: false });
            throw error;
          }
        },
        
        approveDeleteRequest: async (id) => {
          try {
            await api.delete(`/api/inventory/items/${id}`);
            get().removeItem(id);
          } catch (error) {
            throw error;
          }
        },
        
        rejectDeleteRequest: async (id) => {
          try {
            await api.put(`/api/inventory/items/${id}`, { status: 'IN' });
            get().updateItem(id, { status: 'IN' });
          } catch (error) {
            throw error;
          }
        },
        
        // Audit actions
        addAuditLog: (log) =>
          set((state) => {
            const newLog = {
              ...log,
              _id: Date.now().toString(),
              timestamp: new Date().toISOString()
            };
            state.auditLogs.unshift(newLog);
          }),
        
        setAuditLogs: (logs) => set({ auditLogs: logs }),
        
        // Cache operations
        getCachedItem: (id) => get().cache.items.get(id),
        getCachedCustomer: (id) => get().cache.customers.get(id),
        getCachedPart: (id) => get().cache.parts.get(id),
        getCachedPO: (id) => get().cache.purchaseOrders.get(id),
        getCachedSupplier: (id) => get().cache.suppliers.get(id),
        
        invalidateCache: (type) =>
          set((state) => {
            if (!type) {
              // Invalidate all
              state.cache.items.clear();
              state.cache.customers.clear();
              state.cache.parts.clear();
              state.cache.purchaseOrders.clear();
              state.cache.suppliers.clear();
              state.cache.lastFetch = {};
            } else {
              state.cache[type].clear();
              delete state.cache.lastFetch[type];
            }
          }),
        
        shouldRefetch: (type, ttl = 5 * 60 * 1000) => {
          const lastFetch = get().cache.lastFetch[type];
          if (!lastFetch) return true;
          return Date.now() - lastFetch > ttl;
        },
        
        // Reset
        reset: () => set(initialState),
      })),
      {
        name: 'inventory-storage',
        partialize: (state) => ({
          // Only persist these fields
          filters: state.filters,
          pagination: state.pagination,
          currentUser: state.currentUser,
        }),
      }
    ),
    { name: 'InventoryStore' }
  )
);

// Selectors with memoization
export const useItems = () => useInventoryStore((state) => state.items);
export const useCustomers = () => useInventoryStore((state) => state.customers);
export const useParts = () => useInventoryStore((state) => state.parts);
export const usePurchaseOrders = () => useInventoryStore((state) => state.purchaseOrders);
export const useLoading = () => useInventoryStore((state) => state.loading);
export const useError = () => useInventoryStore((state) => state.error);
export const useSelectedItem = () => useInventoryStore((state) => state.selectedItem);
export const usePagination = () => useInventoryStore((state) => state.pagination);
export const useFilters = () => useInventoryStore((state) => state.filters);

// Computed selectors
export const useFilteredItems = () =>
  useInventoryStore((state) => {
    let filtered = state.items;
    const { status, customerId, partId, poId, search } = state.filters;

    if (status) {
      filtered = filtered.filter((item) => item.status === status);
    }

    if (customerId) {
      filtered = filtered.filter(
        (item) =>
          typeof item.partId.customerId === 'object' &&
          item.partId.customerId._id === customerId
      );
    }

    if (partId) {
      filtered = filtered.filter((item) => item.partId._id === partId);
    }

    if (poId) {
      filtered = filtered.filter((item) => item.poId._id === poId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.uniqueId.toLowerCase().includes(searchLower) ||
          item.lotId.toLowerCase().includes(searchLower) ||
          item.barcode?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  });

export const useItemById = (id: string) =>
  useInventoryStore((state) => 
    state.items.find((item) => item._id === id) || state.getCachedItem(id)
  );

export const useCustomerById = (id: string) =>
  useInventoryStore((state) =>
    state.customers.find((c) => c._id === id) || state.getCachedCustomer(id)
  );

export const usePartById = (id: string) =>
  useInventoryStore((state) =>
    state.parts.find((p) => p._id === id) || state.getCachedPart(id)
  );

export const usePOById = (id: string) =>
  useInventoryStore((state) =>
    state.purchaseOrders.find((po) => po._id === id) || state.getCachedPO(id)
  );