import axios, { type AxiosRequestHeaders, AxiosError } from 'axios';
import toast from 'react-hot-toast';

// ✅ CRITICAL FIX: baseURL should NOT include /api
// VITE_API_BASE_URL should be just the domain (e.g., http://localhost:3001)
// The /api prefix is added automatically in baseURL construction below

// ✅ UPDATED: Use latest backend deployment with CORS fix
const apiUrl = import.meta.env.VITE_API_BASE_URL 
  || (import.meta.env.PROD 
      ? 'https://inventory-backend-o0kh4tgv7-1ikis-projects.vercel.app'
      : 'http://localhost:3001');

const baseURL = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;

console.log('🔧 API Configuration:', { 
  env: import.meta.env.VITE_API_BASE_URL, 
  apiUrl, 
  baseURL,
  mode: import.meta.env.MODE 
});

export const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor untuk attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = (config.headers || {}) as AxiosRequestHeaders;
      headers['Authorization'] = `Bearer ${token}`;
      config.headers = headers;
    }
    
    // Log request untuk debugging
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        baseURL: config.baseURL,
        headers: config.headers,
        data: config.data
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor untuk error handling
api.interceptors.response.use(
  (response) => {
    // Log response untuk debugging
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;
    
    // Log error untuk debugging
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${url}`, {
        status,
        message: error.message,
        response: error.response?.data
      });
    }

    // Handle authentication errors
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error('Sesi telah berakhir. Silakan login kembali.');
      window.location.reload();
      return Promise.reject(error);
    }

    // Handle forbidden errors
    if (status === 403) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk melakukan aksi ini.');
      return Promise.reject(error);
    }

    // Handle rate limiting
    if (status === 429) {
      const retryAfter = error.response?.headers['retry-after'];
      const message = retryAfter 
        ? `Terlalu banyak permintaan. Silakan tunggu ${retryAfter} detik.`
        : 'Terlalu banyak permintaan. Silakan tunggu sebentar.';
      toast.error(message);
      return Promise.reject(error);
    }

    // Handle server errors
    if (status && status >= 500) {
      toast.error('Terjadi kesalahan server. Silakan coba lagi.');
      return Promise.reject(error);
    }

    // Handle network errors
    if (!status) {
      toast.error('Tidak dapat terhubung ke server. Periksa koneksi internet dan pastikan backend berjalan.');
      return Promise.reject(error);
    }

    // Handle other client errors
    if (status && status >= 400 && status < 500) {
      const responseData = error.response?.data as { message?: string } | undefined;
      const message = responseData?.message || `Error ${status}`;
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// Enhanced API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Auth APIs
// ✅ FIXED: Remove /api prefix since it's already in baseURL
export const loginApi = (username: string, password: string) =>
  api.post<ApiResponse<{ user: any; token: string }>>('/auth/login', { username, password });

// Master Data APIs - Parts
export const getPartsApi = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/master/parts?${searchParams.toString()}`);
};

export const createPartApi = (payload: {
  customerId: string; 
  internalPartNo: string; 
  name: string; 
  description?: string; 
  supplierInfo: { 
    id: string; 
    partNumber?: string; 
    description?: string 
  };
  specifications?: {
    weight?: number;
    dimensions?: string;
    material?: string;
  };
}) => api.post<ApiResponse<any>>('/master/parts', payload);

export const updatePartApi = (id: string, payload: any) =>
  api.put<ApiResponse<any>>('/master/parts', { id, ...payload });

export const deletePartApi = (id: string) => 
  api.delete<ApiResponse<any>>('/master/parts', { data: { id } });

// Master Data APIs - Customers
export const getCustomersApi = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/master/customers?${searchParams.toString()}`);
};

export const createCustomerApi = (payload: { 
  name: string; 
  address: string; 
  contactPerson?: string; 
  phone?: string; 
  email?: string 
}) => api.post<ApiResponse<any>>('/master/customers', payload);

export const updateCustomerApi = (id: string, payload: any) =>
  api.put<ApiResponse<any>>('/master/customers', { id, ...payload });

export const deleteCustomerApi = (id: string) => 
  api.delete<ApiResponse<any>>('/master/customers', { data: { id } });

// Master Data APIs - Purchase Orders
export const getPurchaseOrdersApi = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  partId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/master/purchase-orders?${searchParams.toString()}`);
};

export const createPurchaseOrderApi = (payload: { 
  poNumber: string; 
  partId: string; 
  customerId: string; 
  totalQuantity: number; 
  deliveryDate?: string; 
  notes?: string 
}) => api.post<ApiResponse<any>>('/master/purchase-orders', payload);

export const updatePurchaseOrderApi = (id: string, payload: any) =>
  api.put<ApiResponse<any>>('/master/purchase-orders', { id, ...payload });

export const deletePurchaseOrderApi = (id: string) => 
  api.delete<ApiResponse<any>>('/master/purchase-orders', { data: { id } });

// Master Data APIs - Suppliers
export const getSuppliersApi = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/master/suppliers?${searchParams.toString()}`);
};

export const createSupplierApi = (payload: {
  supplierId: string;
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  status?: 'active' | 'inactive';
}) => api.post<ApiResponse<any>>('/master/suppliers', payload);

export const updateSupplierApi = (id: string, payload: any) =>
  api.put<ApiResponse<any>>('/master/suppliers', { id, ...payload });

export const deleteSupplierApi = (id: string) => 
  api.delete<ApiResponse<any>>('/master/suppliers', { data: { id } });

// Inventory APIs
export const getItemsApi = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  partId?: string;
  poId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/inventory/items?${searchParams.toString()}`);
};

export const createItemApi = (payload: {
  partId: string; 
  poId: string; 
  quantity: number; 
  lotId: string; 
  copies?: number; 
  gateId: string;
  location?: {
    warehouse?: string;
    zone?: string;
    rack?: string;
    position?: string;
  };
}) => api.post<ApiResponse<any>>('/inventory/items', payload);

// Updated Scan Out API to use POST method as per backend
export const scanOutApi = (payload: { qrCodeData: string; notes?: string }) => 
  api.post<ApiResponse<any>>('/inventory/items/scan-out', payload);

// New API for scan out preview
export const getScanOutPreviewApi = (qrCodeData: string) =>
  api.get<ApiResponse<any>>(`/inventory/items/scan-out?qrCodeData=${encodeURIComponent(qrCodeData)}`);

// Delete Requests APIs
export const getDeleteRequestsApi = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/inventory/items/delete-requests?${searchParams.toString()}`);
};

export const requestDeleteItemApi = (payload: { 
  id?: string; 
  uniqueId?: string; 
  reason: string 
}) => api.post<ApiResponse<any>>('/inventory/items/delete-requests', payload);

export const decideDeleteRequestApi = (payload: { 
  id?: string; 
  uniqueId?: string; 
  action: 'approve' | 'reject';
  notes?: string;
}) => api.put<ApiResponse<any>>('/inventory/items/delete-requests', payload);

// Enhanced Reports APIs
export const getReportsApi = (params: {
  type: 'scan-activity' | 'po-summary' | 'inventory-status';
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  customerName?: string;
  reportType?: 'SCAN_IN' | 'SCAN_OUT';
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return api.get<ApiResponse<any>>(`/reports?${searchParams.toString()}`);
};

// Legacy support for old report APIs
export const getReportsSummaryApi = (params?: {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  partId?: string;
  status?: string;
}) => getReportsApi({ ...params, type: 'po-summary' });

export const getReportsDetailApi = (params?: {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  partId?: string;
  status?: string;
}) => getReportsApi({ ...params, type: 'scan-activity' });

export const exportReportsApi = (type: 'summary' | 'detail', params?: any) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get(`/reports/export?type=${type}&${searchParams.toString()}`, { 
    responseType: 'blob' 
  });
};

// Audit APIs
export const getAuditLogsApi = (page = 1, limit = 50, filters?: {
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  resourceType?: string;
}) => {
  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  
  return api.get<ApiResponse<any>>(`/audit?${searchParams.toString()}`);
};

// Dashboard APIs
export const getDashboardApi = () => api.get<ApiResponse<any>>('/dashboard');

// Health Check API
export const getHealthApi = () => api.get<ApiResponse<any>>('/health');

// Scan In Reports APIs (Updated for new report system)
export const getScanInReportsApi = (params?: {
  page?: number;
  limit?: number;
  customerId?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  filterType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/reports/scan-in?${searchParams.toString()}`);
};

export const createScanInReportApi = (payload: {
  itemId: string;
  notes?: string;
}) => api.post<ApiResponse<any>>('/reports/scan-in', payload);

// Bulk Operations APIs
export const bulkImportApi = (payload: {
  type: 'customers' | 'parts' | 'purchase-orders' | 'inventory-items';
  data: any[];
}) => api.post<ApiResponse<any>>('/inventory/export-import', payload);

export const bulkExportApi = (type: string, params?: any) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get(`/inventory/export-import?type=${type}&${searchParams.toString()}`, {
    responseType: 'blob'
  });
};

// Search APIs
export const searchApi = (params: {
  query: string;
  type?: 'customers' | 'parts' | 'purchase-orders' | 'inventory-items' | 'all';
  page?: number;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return api.get<ApiResponse<any>>(`/search?${searchParams.toString()}`);
};

// Utility functions
export const handleApiError = (error: any, defaultMessage = 'Terjadi kesalahan') => {
  if (error.response?.data?.message) {
    return (error.response.data as { message: string }).message;
  }
  if (error.message) {
    return error.message;
  }
  return defaultMessage;
};

export const isApiResponse = <T>(data: any): data is ApiResponse<T> => {
  return data && typeof data === 'object' && 'success' in data && 'message' in data;
};

// API status checker
export const checkApiStatus = async (): Promise<boolean> => {
  try {
    await getHealthApi();
    return true;
  } catch {
    return false;
  }
};

// Enhanced Scan In API
export const scanInApi = (payload: { itemId: string; notes?: string }) => 
  api.post<ApiResponse<any>>('/reports/scan-in', payload);

// ============= STAFF CUSTOMER APIS =============
// Staff-specific Customer APIs with soft delete functionality
export const getStaffCustomersApi = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/staff/customers?${searchParams.toString()}`);
};

export const createStaffCustomerApi = (payload: { 
  name: string; 
  address: string; 
  contactPerson?: string; 
  phone?: string; 
  email?: string 
}) => api.post<ApiResponse<any>>('/staff/customers', payload);

export const updateStaffCustomerApi = (id: string, payload: any) =>
  api.put<ApiResponse<any>>('/staff/customers', { id, ...payload });

export const deleteStaffCustomerApi = (id: string, reason: string) => 
  api.delete<ApiResponse<any>>('/staff/customers', { data: { id, reason } });

// Staff Customer Parts APIs
export const getCustomerPartsApi = (params: {
  customerId: string;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return api.get<ApiResponse<any>>(`/staff/customers/parts?${searchParams.toString()}`);
};

export const updateCustomerPartApi = (id: string, payload: any) =>
  api.put<ApiResponse<any>>('/staff/customers/parts', { id, ...payload });

export const deleteCustomerPartApi = (id: string) => 
  api.delete<ApiResponse<any>>('/staff/customers/parts', { data: { id } });

// Customer Delete Requests APIs (for admin/manager/direktur approval)
export const getCustomerDeleteRequestsApi = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/staff/customers/delete-requests?${searchParams.toString()}`);
};

export const approveCustomerDeleteApi = (id: string, action: 'approve' | 'reject', notes?: string) =>
  api.put<ApiResponse<any>>('/staff/customers/delete-requests', { id, action, notes });

// Create new part for customer (Staff)
export const createCustomerPartApi = (payload: {
  customerId: string;
  name: string;
  internalPartNo: string;
  description?: string;
  poNumber?: string;
  supplierInfo?: {
    id?: string;
    partNumber?: string;
    description?: string;
  };
}) => api.post<ApiResponse<any>>('/staff/customers/parts', payload);

// ============= STAFF CUSTOMER PURCHASE ORDERS APIS =============
// Staff Customer Purchase Orders APIs
export const getCustomerPurchaseOrdersApi = (params: {
  customerId: string;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return api.get<ApiResponse<any>>(`/staff/customers/purchase-orders?${searchParams.toString()}`);
};

export const createCustomerPurchaseOrderApi = (payload: {
  customerId: string;
  partId: string;
  poNumber: string;
  quantity: number;
  description?: string;
}) => api.post<ApiResponse<any>>('/staff/customers/purchase-orders', payload);

export const updateCustomerPurchaseOrderApi = (id: string, payload: any) =>
  api.put<ApiResponse<any>>('/staff/customers/purchase-orders', { id, ...payload });

export const deleteCustomerPurchaseOrderApi = (id: string) => 
  api.delete<ApiResponse<any>>('/staff/customers/purchase-orders', { data: { id } });

// ============= PO NUMBER AUTO-SYNC APIS =============
/**
 * Sync PO Numbers from Purchase Orders to Parts
 * This will update all parts with their corresponding PO numbers from purchase orders
 */
export const syncPONumbersApi = () => 
  api.post<ApiResponse<{
    totalPOs: number;
    syncedCount: number;
    results: Array<{
      partId: string;
      partName?: string;
      poNumber: string;
      status: 'synced' | 'already-synced' | 'part-not-found' | 'error';
      error?: string;
    }>;
  }>>('/master/parts/sync-po');

/**
 * Get preview of what will be synced
 * Shows which parts need PO number updates
 */
export const getSyncPOPreviewApi = () =>
  api.get<ApiResponse<{
    totalPOs: number;
    needsSyncCount: number;
    preview: Array<{
      poNumber: string;
      partId: string;
      partName: string;
      currentPONumber: string;
      needsSync: boolean;
      status: string;
    }>;
  }>>('/master/parts/sync-po');

/**
 * Fetch all PO Numbers from Purchase Orders
 * Returns list of all PO numbers with their associated parts and customers
 */
export const fetchPONumbersApi = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  return api.get<ApiResponse<any>>(`/master/purchase-orders?${searchParams.toString()}`);
};
