import React, { useState, useEffect } from 'react';
import { Download, FileText, BarChart3, Filter, Search, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
import { getReportsApi, handleApiError } from '../lib/api';
import { useInventoryStore } from '../store/inventory';
import { 
  exportScanActivityToExcel,
  exportPOSummaryToExcel,
  exportInventoryStatusToExcel
} from '../lib/excelExport';
import toast from 'react-hot-toast';

type TabType = 'scan-activity' | 'po-summary' | 'inventory-status';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  customerName?: string;
  reportType?: 'SCAN_IN' | 'SCAN_OUT';
  status?: string;
  page?: number;
  limit?: number;
}

interface ScanActivity {
  id: string;
  uniqueId: string;
  reportType: 'SCAN_IN' | 'SCAN_OUT';
  customerName: string;
  partName: string;
  poNumber: string;
  quantity: number;
  status: string;
  lotId: string;
  gateId: string;
  scannedBy: {
    username: string;
    name: string;
  };
  createdAt: string;
  notes?: string;
}

interface POSummary {
  no: number;
  poNumber: string;
  partName: string;
  partNumber: string;
  customer: string;
  totalPO: number;
  totalDelivered: number;
  totalOut: number;
  inStock: number;
  remaining: number;
  status: string;
  deliveryDate?: string;
  createdAt: string;
}

interface InventoryStatus {
  uniqueId: string;
  partName: string;
  partNumber: string;
  customer: string;
  poNumber: string;
  quantity: number;
  status: string;
  lotId: string;
  gateId: string;
  location: {
    warehouse?: string;
    zone?: string;
    rack?: string;
    position?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ReportData {
  scan_activity?: {
    reports: ScanActivity[];
    summary: {
      totalScans: number;
      scanIn: number;
      scanOut: number;
    };
  };
  po_summary?: {
    poSummary: POSummary[];
    totals: {
      totalPOs: number;
      totalQuantityOrdered: number;
    };
  };
  inventory_status?: {
    items: InventoryStatus[];
    statusSummary: Record<string, { count: number; totalQuantity: number }>;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const Reports: React.FC = () => {
  const { 
    customers,
    parts,
    purchaseOrders,
    currentUser,
    addAuditLog
  } = useInventoryStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('scan-activity');
  const [reportData, setReportData] = useState<ReportData>({});
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    page: 1,
    limit: 50
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Export modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedCustomersForExport, setSelectedCustomersForExport] = useState<string[]>([]);
  const [exportSearchTerm, setExportSearchTerm] = useState('');
  const [exportReportType, setExportReportType] = useState<'SCAN_IN' | 'SCAN_OUT' | 'ALL'>('ALL');
  const [exportStatus, setExportStatus] = useState<'IN' | 'OUT' | 'ALL'>('ALL');
  const [exportPOStatus, setExportPOStatus] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  // Fetch reports from backend
  const fetchReports = async (resetPage = false) => {
    setLoading(true);
    try {
      const params = {
        type: activeTab,
        ...filters,
        ...(resetPage ? { page: 1 } : {})
      };

      const response = await getReportsApi(params);
      
      if (response.data.success) {
        const { data, pagination: paginationData } = response.data.data;
        setReportData({ [activeTab.replace('-', '_')]: data });
        setPagination(paginationData);
        
        if (resetPage) {
          setFilters(prev => ({ ...prev, page: 1 }));
        }
      }
    } catch (error) {
      const errorMessage = handleApiError(error, 'Gagal memuat data laporan');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(true);
  }, [activeTab]);

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchReports(true);
  };

  const resetFilters = () => {
    setFilters({ page: 1, limit: 50 });
    setTimeout(() => fetchReports(true), 100);
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    setTimeout(() => fetchReports(), 100);
  };

  // ============= EXPORT EXCEL FUNCTIONS =============
  const openExportModal = () => {
    setShowExportModal(true);
    setSelectedCustomersForExport([]);
    setExportSearchTerm('');
    setExportDateRange({ start: '', end: '' });
    setExportReportType('ALL');
    setExportStatus('ALL');
    setExportPOStatus('all');
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomersForExport(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    if (selectedCustomersForExport.length === customers.length) {
      setSelectedCustomersForExport([]);
    } else {
      setSelectedCustomersForExport(customers.map(c => c._id));
    }
  };

  const handleExportWithFilters = async () => {
    if (!currentUser) return;

    setIsExporting(true);
    try {
      const exportFilter = {
        customers: selectedCustomersForExport.length > 0 ? selectedCustomersForExport : undefined,
        searchTerm: exportSearchTerm || undefined,
        dateRange: exportDateRange.start && exportDateRange.end 
          ? { start: new Date(exportDateRange.start), end: new Date(exportDateRange.end) }
          : undefined
      };

      let result;
      
      if (activeTab === 'scan-activity') {
        const reports = reportData.scan_activity?.reports || [];
        result = await exportScanActivityToExcel(
          reports, 
          customers, 
          { ...exportFilter, reportType: exportReportType }
        );
      } else if (activeTab === 'po-summary') {
        result = await exportPOSummaryToExcel(
          purchaseOrders, 
          customers, 
          parts, 
          { ...exportFilter, status: exportPOStatus }
        );
      } else if (activeTab === 'inventory-status') {
        const items = reportData.inventory_status?.items || [];
        result = await exportInventoryStatusToExcel(
          items, 
          customers, 
          parts, 
          { ...exportFilter, status: exportStatus }
        );
      }

      if (result?.success) {
        toast.success(`✅ Export berhasil! File: ${result.fileName} (${result.recordCount} records)`);
        
        addAuditLog({
          userId: currentUser.id,
          username: currentUser.username,
          action: 'EXPORT_REPORT',
          details: `Exported ${activeTab} report: ${result.fileName} (${result.recordCount} records)`
        });

        setShowExportModal(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal export data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    openExportModal();
  };

  const renderScanActivityReport = () => {
    const data = reportData.scan_activity;
    if (!data) return null;

    return (
      <div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800">Total Scans</h3>
            <p className="text-2xl font-bold text-blue-600">{data.summary.totalScans}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800">Scan IN</h3>
            <p className="text-2xl font-bold text-green-600">{data.summary.scanIn}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="text-lg font-semibold text-red-800">Scan OUT</h3>
            <p className="text-2xl font-bold text-red-600">{data.summary.scanOut}</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scanned By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.reports.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        row.reportType === 'SCAN_IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {row.reportType}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.uniqueId}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.customerName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.partName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.poNumber}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.quantity.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.scannedBy.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                      {format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPOSummaryReport = () => {
    const data = reportData.po_summary;
    if (!data) return null;

    return (
      <div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800">Total POs</h3>
            <p className="text-2xl font-bold text-blue-600">{data.totals.totalPOs}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800">Total Quantity Ordered</h3>
            <p className="text-2xl font-bold text-green-600">{data.totals.totalQuantityOrdered.toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total PO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent Out</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.poSummary.map((row) => (
                  <tr key={row.no} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.no}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.poNumber}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.partName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.customer}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.totalPO.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{row.totalDelivered.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{row.totalOut.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{row.inStock.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">{row.remaining.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        row.status === 'completed' ? 'bg-green-100 text-green-800' :
                        row.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        row.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryStatusReport = () => {
    const data = reportData.inventory_status;
    if (!data) return null;

    return (
      <div>
        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(data.statusSummary).map(([status, summary]) => (
            <div key={status} className={`p-4 rounded-lg border ${
              status === 'IN' ? 'bg-green-50 border-green-200' :
              status === 'OUT' ? 'bg-red-50 border-red-200' :
              status === 'DAMAGED' ? 'bg-yellow-50 border-yellow-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${
                status === 'IN' ? 'text-green-800' :
                status === 'OUT' ? 'text-red-800' :
                status === 'DAMAGED' ? 'text-yellow-800' :
                'text-gray-800'
              }`}>
                {status}
              </h3>
              <p className={`text-xl font-bold ${
                status === 'IN' ? 'text-green-600' :
                status === 'OUT' ? 'text-red-600' :
                status === 'DAMAGED' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {summary.count} items
              </p>
              <p className="text-sm text-gray-600">
                Total: {summary.totalQuantity.toLocaleString('id-ID')}
              </p>
            </div>
          ))}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.items.map((row) => (
                  <tr key={row.uniqueId} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.uniqueId}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.partName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.customer}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.poNumber}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{row.quantity.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        row.status === 'IN' ? 'bg-green-100 text-green-800' :
                        row.status === 'OUT' ? 'bg-red-100 text-red-800' :
                        row.status === 'DAMAGED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.location ? [
                        row.location.warehouse, 
                        row.location.zone, 
                        row.location.rack, 
                        row.location.position
                      ].filter(Boolean).join(' - ') || '-' : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                      {format(new Date(row.updatedAt), 'yyyy-MM-dd HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Laporan</h1>

      {/* Tab Navigation */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('scan-activity')}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'scan-activity'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="inline h-4 w-4 mr-1" />
            Scan Activity
          </button>
          <button
            onClick={() => setActiveTab('po-summary')}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'po-summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="inline h-4 w-4 mr-1" />
            PO Summary
          </button>
          <button
            onClick={() => setActiveTab('inventory-status')}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'inventory-status'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="inline h-4 w-4 mr-1" />
            Inventory Status
          </button>
        </nav>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button
            onClick={() => fetchReports()}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        <button 
          onClick={handleExportExcel}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <input
                type="text"
                placeholder="Nama customer..."
                value={filters.customerName || ''}
                onChange={(e) => handleFilterChange('customerName', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            {activeTab === 'scan-activity' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select
                  value={filters.reportType || ''}
                  onChange={(e) => handleFilterChange('reportType', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="SCAN_IN">Scan IN</option>
                  <option value="SCAN_OUT">Scan OUT</option>
                </select>
              </div>
            )}
            {activeTab === 'inventory-status' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                  <option value="DAMAGED">DAMAGED</option>
                  <option value="PENDING_DELETE">PENDING_DELETE</option>
                </select>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Apply
              </button>
              <button
                onClick={resetFilters}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Memuat laporan...</p>
        </div>
      )}

      {/* Report Content */}
      {!loading && (
        <>
          {activeTab === 'scan-activity' && renderScanActivityReport()}
          {activeTab === 'po-summary' && renderPOSummaryReport()}
          {activeTab === 'inventory-status' && renderInventoryStatusReport()}
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-md">
          <div className="text-sm text-gray-700">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 bg-blue-600 text-white rounded">
              {pagination.page}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Export Filter Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Export {activeTab === 'scan-activity' ? 'Scan Activity' : activeTab === 'po-summary' ? 'PO Summary' : 'Inventory Status'} Report
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Search Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={exportSearchTerm}
                  onChange={(e) => setExportSearchTerm(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Cari berdasarkan Unique ID, PO Number, Part Name..."
                />
              </div>

              {/* Date Range Filter */}
              {activeTab === 'scan-activity' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={exportDateRange.start}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={exportDateRange.end}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Report Type Filter (Scan Activity) */}
              {activeTab === 'scan-activity' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                  <select
                    value={exportReportType}
                    onChange={(e) => setExportReportType(e.target.value as any)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="ALL">All Activities</option>
                    <option value="SCAN_IN">Scan In Only</option>
                    <option value="SCAN_OUT">Scan Out Only</option>
                  </select>
                </div>
              )}

              {/* Status Filter (Inventory Status) */}
              {activeTab === 'inventory-status' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={exportStatus}
                    onChange={(e) => setExportStatus(e.target.value as any)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="IN">In Stock</option>
                    <option value="OUT">Out Stock</option>
                  </select>
                </div>
              )}

              {/* PO Status Filter (PO Summary) */}
              {activeTab === 'po-summary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO Status</label>
                  <select
                    value={exportPOStatus}
                    onChange={(e) => setExportPOStatus(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="partial">Partial</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              {/* Customer Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Customer</label>
                <div className="border rounded-md p-3 max-h-60 overflow-y-auto bg-gray-50">
                  <div className="flex items-center mb-2 pb-2 border-b">
                    <input
                      type="checkbox"
                      checked={selectedCustomersForExport.length === customers.length}
                      onChange={selectAllCustomers}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-semibold text-gray-900">
                      Pilih Semua ({customers.length})
                    </label>
                  </div>
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <div key={customer._id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCustomersForExport.includes(customer._id)}
                          onChange={() => toggleCustomerSelection(customer._id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">{customer.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {selectedCustomersForExport.length > 0 
                    ? `${selectedCustomersForExport.length} customer dipilih`
                    : 'Tidak ada filter customer (semua customer akan di-export)'}
                </p>
              </div>

              {/* Export Info */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Info:</strong> File Excel akan dikelompokkan per customer dengan sheet terpisah untuk setiap customer, 
                  plus satu sheet Summary untuk overview keseluruhan.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExportWithFilters}
                disabled={isExporting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Mengekspor...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export ke Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;