import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, X, ChevronDown, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { useInventoryStore } from '../store/inventory';

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onExport: (data: any[], filename: string) => void;
}

interface SearchFilters {
  keyword: string;
  customer: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
  lotId: string;
  gateId: string;
  partName: string;
  reportType: string;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ onSearch, onExport }) => {
  const { customers, inventoryItems } = useInventoryStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    customer: '',
    status: '',
    dateRange: {
      start: '',
      end: format(new Date(), 'yyyy-MM-dd')
    },
    lotId: '',
    gateId: '',
    partName: '',
    reportType: ''
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-search when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.keyword || filters.customer || filters.status || filters.dateRange.start) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    if (key === 'dateRange') {
      return; // Handle date range separately
    }
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: value
      }
    }));
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // Simulate API call or perform local search
      const results = performAdvancedSearch(filters);
      setSearchResults(results);
      onSearch(filters);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const performAdvancedSearch = (searchFilters: SearchFilters) => {
    let results = [...inventoryItems];

    // Filter by keyword (search in multiple fields)
    if (searchFilters.keyword) {
      const keyword = searchFilters.keyword.toLowerCase();
      results = results.filter(item => 
        item.uniqueId.toLowerCase().includes(keyword) ||
        item.lotId.toLowerCase().includes(keyword) ||
        item.gateId.toLowerCase().includes(keyword)
      );
    }

    // Filter by status
    if (searchFilters.status) {
      results = results.filter(item => item.status === searchFilters.status);
    }

    // Filter by date range
    if (searchFilters.dateRange.start || searchFilters.dateRange.end) {
      results = results.filter(item => {
        const itemDate = new Date(item.createdAt);
        const startDate = searchFilters.dateRange.start ? new Date(searchFilters.dateRange.start) : null;
        const endDate = searchFilters.dateRange.end ? new Date(searchFilters.dateRange.end) : null;

        if (startDate && endDate) {
          return itemDate >= startDate && itemDate <= endDate;
        } else if (startDate) {
          return itemDate >= startDate;
        } else if (endDate) {
          return itemDate <= endDate;
        }
        return true;
      });
    }

    // Filter by LOT ID
    if (searchFilters.lotId) {
      results = results.filter(item => 
        item.lotId.toLowerCase().includes(searchFilters.lotId.toLowerCase())
      );
    }

    // Filter by Gate ID
    if (searchFilters.gateId) {
      results = results.filter(item => 
        item.gateId.toLowerCase().includes(searchFilters.gateId.toLowerCase())
      );
    }

    return results;
  };

  const handleExportSearch = () => {
    if (searchResults.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    const exportData = searchResults.map(item => ({
      'ID Unik': item.uniqueId,
      'Status': item.status,
      'Quantity': item.quantity,
      'LOT ID': item.lotId,
      'Gate ID': item.gateId,
      'Tanggal Dibuat': format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm'),
      'Dibuat Oleh': item.createdBy.username
    }));

    const filename = `advanced_search_results_${format(new Date(), 'yyyyMMdd_HHmm')}`;
    onExport(exportData, filename);
  };

  const clearAllFilters = () => {
    setFilters({
      keyword: '',
      customer: '',
      status: '',
      dateRange: {
        start: '',
        end: format(new Date(), 'yyyy-MM-dd')
      },
      lotId: '',
      gateId: '',
      partName: '',
      reportType: ''
    });
    setSearchResults([]);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.keyword) count++;
    if (filters.customer) count++;
    if (filters.status) count++;
    if (filters.dateRange.start) count++;
    if (filters.lotId) count++;
    if (filters.gateId) count++;
    if (filters.partName) count++;
    if (filters.reportType) count++;
    return count;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Search className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">Advanced Search</h3>
            {getActiveFiltersCount() > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {getActiveFiltersCount()} filter aktif
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {searchResults.length > 0 && (
              <button
                onClick={handleExportSearch}
                className="flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Export ({searchResults.length})
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="h-4 w-4 mr-1" />
              {isExpanded ? 'Tutup Filter' : 'Buka Filter'}
              <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Basic Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan ID Unik, LOT ID, atau Gate ID..."
            value={filters.keyword}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {filters.keyword && (
            <button
              onClick={() => handleFilterChange('keyword', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={filters.customer}
                onChange={(e) => handleFilterChange('customer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Customer</option>
                {customers.map(customer => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Status</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="PENDING_DELETE">PENDING DELETE</option>
                <option value="DAMAGED">DAMAGED</option>
              </select>
            </div>

            {/* Date Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* LOT ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LOT ID</label>
              <input
                type="text"
                placeholder="Masukkan LOT ID"
                value={filters.lotId}
                onChange={(e) => handleFilterChange('lotId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Gate ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gate ID</label>
              <input
                type="text"
                placeholder="Masukkan Gate ID"
                value={filters.gateId}
                onChange={(e) => handleFilterChange('gateId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Report Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Report</label>
              <select
                value={filters.reportType}
                onChange={(e) => handleFilterChange('reportType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Tipe</option>
                <option value="SCAN_IN">SCAN IN</option>
                <option value="SCAN_OUT">SCAN OUT</option>
              </select>
            </div>

            {/* Part Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Part</label>
              <input
                type="text"
                placeholder="Masukkan nama part"
                value={filters.partName}
                onChange={(e) => handleFilterChange('partName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isSearching ? 'Mencari...' : 'Cari Sekarang'}
              </button>

              <button
                onClick={clearAllFilters}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                Reset Filter
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="flex items-center text-sm text-gray-600">
                <BarChart3 className="h-4 w-4 mr-1" />
                Ditemukan {searchResults.length} hasil
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Results Summary */}
      {searchResults.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              <strong>{searchResults.length}</strong> item ditemukan dari pencarian Anda
            </div>
            <button
              onClick={() => setSearchResults([])}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Tutup Hasil
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
