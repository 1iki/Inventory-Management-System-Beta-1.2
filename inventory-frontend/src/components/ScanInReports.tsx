import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Filter, Download, Calendar, User, Package, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInventoryStore } from '../store/inventory';
import { getScanInReportsApi } from '../lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Define Customer type locally to avoid import issues
interface Customer {
  _id: string;
  name: string;
  address: string;
}

interface ScanInReport {
  _id: string;
  uniqueId: string;
  itemId: {
    _id: string;
    uniqueId: string;
    status: string;
  };
  customerId: {
    _id: string;
    name: string;
    address: string;
  };
  partId: {
    _id: string;
    name: string;
    internalPartNo: string;
  };
  poId: {
    _id: string;
    poNumber: string;
    totalQuantity: number;
  };
  reportType: 'SCAN_IN' | 'SCAN_OUT';
  quantity: number;
  status: string;
  lotId: string;
  gateId: string;
  location?: {
    warehouse?: string;
    zone?: string;
    rack?: string;
    position?: string;
  };
  scannedBy: {
    userId: string;
    username: string;
    name: string;
  };
  customerName: string;
  partName: string;
  poNumber: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportSummary {
  totalScans: number;
  totalQuantity: number;
  uniqueCustomers: number;
  uniqueParts: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ScanInReports: React.FC = () => {
  // MUST call hooks at top level - cannot be conditional or in try-catch
  const store = useInventoryStore();
  
  // Safely access store properties with defaults - use useMemo for performance
  const customers = useMemo(() => {
    if (!store) return [];
    if (!store.customers) return [];
    if (!Array.isArray(store.customers)) return [];
    return store.customers;
  }, [store?.customers]);
  
  const fetchMaster = useCallback(() => {
    if (!store) return Promise.resolve();
    if (!store.fetchMaster) return Promise.resolve();
    if (typeof store.fetchMaster !== 'function') return Promise.resolve();
    // Fetch all required master data
    return Promise.all([
      store.fetchMaster('customers'),
      store.fetchMaster('parts'),
      store.fetchMaster('purchaseOrders')
    ]).catch(err => console.error('Error fetching master:', err));
  }, [store?.fetchMaster]);

  const [reports, setReports] = useState<ScanInReport[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Filter states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedFilterType, setSelectedFilterType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Ensure customers are loaded first
  useEffect(() => {
    let mounted = true;
    
    const initializeData = async () => {
      try {
        setHasError(false);
        if (mounted) {
          await fetchMaster();
        }
      } catch (error) {
        console.error('Error loading master data:', error);
        if (mounted) {
          setHasError(true);
          toast.error('Gagal memuat data master');
        }
      } finally {
        if (mounted) {
          setTimeout(() => {
            setIsInitializing(false);
          }, 500);
        }
      }
    };

    initializeData();
    
    return () => {
      mounted = false;
    };
  }, [fetchMaster]);

  // Fetch reports
  const fetchReports = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit: pagination.limit,
      };

      // Add customer filter
      if (selectedCustomerId) {
        params.customerId = selectedCustomerId;
      }

      // Add date filter
      if (selectedFilterType === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      } else {
        params.filterType = selectedFilterType;
      }

      const response = await getScanInReportsApi(params);

      if (response.data.success) {
        setReports(response.data.data.reports || []);
        setSummary(response.data.data.summary || null);
        setPagination(response.data.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Gagal mengambil data laporan');
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, selectedCustomerId, selectedFilterType, startDate, endDate]);

  // Initial load reports after initialization
  useEffect(() => {
    if (!isInitializing && !hasError) {
      fetchReports();
    }
  }, [isInitializing, hasError, selectedCustomerId, selectedFilterType, startDate, endDate]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchReports(newPage);
    }
  }, [pagination.totalPages, fetchReports]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchReports(pagination.page);
  }, [pagination.page, fetchReports]);

  // Handle export (future implementation)
  const handleExport = useCallback(() => {
    toast.success('Fitur export akan segera hadir!');
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }, []);

  // Format number
  const formatNumber = useCallback((num: number) => {
    try {
      return num.toLocaleString('id-ID');
    } catch {
      return String(num);
    }
  }, []);

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <FileText className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Gagal memuat data</p>
          <p className="text-gray-600 text-sm mb-4">Terjadi kesalahan saat memuat data master</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Scan In</h1>
            <p className="text-sm text-gray-500">
              Lihat dan filter laporan aktivitas Scan In
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Scan</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(summary.totalScans)}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <FileText className="h-8 w-8" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-linear-to-br from-green-500 to-green-600 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Quantity</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(summary.totalQuantity)}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Package className="h-8 w-8" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-linear-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Customer Unik</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(summary.uniqueCustomers)}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <User className="h-8 w-8" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-linear-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Part Unik</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(summary.uniqueParts)}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Package className="h-8 w-8" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Filter Laporan</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Customer (NAMA PT)
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Semua Customer</option>
              {customers.length > 0 && customers.map((customer: Customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Periode Waktu
            </label>
            <select
              value={selectedFilterType}
              onChange={(e) => setSelectedFilterType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Hari Ini</option>
              <option value="weekly">Minggu Ini</option>
              <option value="monthly">Bulan Ini</option>
              <option value="yearly">Tahun Ini</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range (conditionally shown) */}
          {selectedFilterType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Unik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer (NAMA PT)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Part / Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NO PO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LOT ID / GATE ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scan By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu Scan
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="text-gray-500">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : !Array.isArray(reports) || reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Tidak ada data laporan</p>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-blue-600">
                        {report.uniqueId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {report.customerName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {report.customerId?.address || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {report.partName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {report.partId?.internalPartNo || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{report.poNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatNumber(report.quantity)} pcs
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{report.lotId}</div>
                      <div className="text-xs text-gray-500">{report.gateId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {report.scannedBy?.name || '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        @{report.scannedBy?.username || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(report.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Menampilkan{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                -{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                dari <span className="font-medium">{formatNumber(pagination.total)}</span> hasil
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || isLoading}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Halaman {pagination.page} dari {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages || isLoading}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanInReports;
