import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, TrendingUp, AlertCircle, Users, BarChart3, Activity, QrCode, FileBarChart } from 'lucide-react';
import { useInventoryStore } from '../store/inventory';
import { format, subDays, subMonths, subYears, startOfDay } from 'date-fns';

// 🆕 Time filter options
type TimeFilter = 'all' | '1year' | '6months' | '3months' | '1month' | '1week' | '1day';

interface TimeFilterOption {
  value: TimeFilter;
  label: string;
  getStartDate: () => Date;
}

const timeFilterOptions: TimeFilterOption[] = [
  { 
    value: 'all', 
    label: 'Semua Data', 
    getStartDate: () => new Date(2020, 0, 1) // Start from 2020
  },
  { 
    value: '1year', 
    label: '1 Tahun Terakhir', 
    getStartDate: () => subYears(new Date(), 1) 
  },
  { 
    value: '6months', 
    label: '6 Bulan Terakhir', 
    getStartDate: () => subMonths(new Date(), 6) 
  },
  { 
    value: '3months', 
    label: '3 Bulan Terakhir', 
    getStartDate: () => subMonths(new Date(), 3) 
  },
  { 
    value: '1month', 
    label: '1 Bulan Terakhir', 
    getStartDate: () => subMonths(new Date(), 1) 
  },
  { 
    value: '1week', 
    label: '1 Minggu Terakhir', 
    getStartDate: () => subDays(new Date(), 7) 
  },
  { 
    value: '1day', 
    label: '1 Hari Terakhir', 
    getStartDate: () => startOfDay(new Date()) 
  }
];

const Dashboard: React.FC = () => {
  const { 
    currentUser, 
    inventoryItems, 
    customers, 
    fetchMaster,
    setItems
  } = useInventoryStore();
  const [isChartsReady, setIsChartsReady] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('6months');
  const [customerTimeFilter, setCustomerTimeFilter] = useState<TimeFilter>('6months');
  const [customerOutData, setCustomerOutData] = useState<Array<{ name: string; value: number }>>([]);
  
  // 🆕 NEW: State for accurate inventory statistics from backend
  const [inventoryStats, setInventoryStats] = useState({
    totalStockIn: 0,
    totalItemsIn: 0,
    totalStockOut: 0,
    totalItemsOut: 0,
    itemsInToday: 0,
    quantityInToday: 0,
    itemsOutToday: 0,
    quantityOutToday: 0,
    totalTransactions: 0
  });
  
  const barChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);

  // 🆕 CRITICAL FIX: Fetch accurate inventory statistics from new endpoint
  useEffect(() => {
    const fetchInventoryStatistics = async () => {
      try {
        console.log('🔄 Fetching accurate inventory statistics from backend...');
        
        const { api } = await import('../lib/api');
        const response = await api.get('/dashboard/inventory-stats');
        
        if (response.data.success) {
          const stats = response.data.data;
          setInventoryStats({
            totalStockIn: stats.totalStockIn || 0,
            totalItemsIn: stats.totalItemsIn || 0,
            totalStockOut: stats.totalStockOut || 0,
            totalItemsOut: stats.totalItemsOut || 0,
            itemsInToday: stats.itemsInToday || 0,
            quantityInToday: stats.quantityInToday || 0,
            itemsOutToday: stats.itemsOutToday || 0,
            quantityOutToday: stats.quantityOutToday || 0,
            totalTransactions: stats.totalTransactions || 0
          });
          
          console.log('✅ Inventory Statistics Loaded:');
          console.log(`   📦 Total Stok (IN): ${stats.totalStockIn} pcs from ${stats.totalItemsIn} items`);
          console.log(`   📤 Total Stok (OUT): ${stats.totalStockOut} pcs from ${stats.totalItemsOut} items`);
          console.log(`   📅 Items IN Today: ${stats.itemsInToday} items (${stats.quantityInToday} pcs)`);
          console.log(`   📅 Items OUT Today: ${stats.itemsOutToday} items (${stats.quantityOutToday} pcs)`);
          console.log(`   📊 Total Transactions: ${stats.totalTransactions}`);
        } else {
          console.error('❌ Failed to fetch inventory stats:', response.data.message);
        }
      } catch (error) {
        console.error('❌ Error fetching inventory statistics:', error);
      }
    };

    // Fetch statistics when component mounts and data is ready
    if (!isFetchingData) {
      fetchInventoryStatistics();
    }
  }, [isFetchingData]);

  // 🆕 CRITICAL FIX: Fetch data from backend on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsFetchingData(true);
      try {
        console.log('🔄 Fetching dashboard data from backend...');
        
        // Fetch all required data in parallel
        await Promise.all([
          fetchMaster('customers'),
          fetchMaster('parts'),
          fetchMaster('purchaseOrders'),
          // Fetch inventory items
          (async () => {
            try {
              const { api } = await import('../lib/api');
              const response = await api.get('/inventory/items');
              const items = response.data.data.items || [];
              setItems(items);
              console.log(`✅ Fetched ${items.length} inventory items`);
            } catch (error) {
              console.error('❌ Error fetching inventory items:', error);
            }
          })()
        ]);
        
        console.log('✅ Dashboard data loaded successfully');
      } catch (error) {
        console.error('❌ Error fetching dashboard data:', error);
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 🆕 FIXED: Fetch customer OUT distribution from API when filter changes
  useEffect(() => {
    const fetchCustomerOutData = async () => {
      try {
        const selectedFilter = timeFilterOptions.find(f => f.value === customerTimeFilter);
        if (!selectedFilter) return;

        const startDate = selectedFilter.getStartDate();
        const now = new Date();

        console.log(`🔄 Fetching Scan OUT distribution for period: ${selectedFilter.label}`);

        const { api } = await import('../lib/api');
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        });

        const response = await api.get(`/dashboard/stats?${params}`);
        
        if (response.data.success) {
          const distribution = response.data.data.customerOutDistribution || [];
          setCustomerOutData(distribution);
          console.log(`✅ Fetched Scan OUT data for ${distribution.length} customers:`, distribution);
          console.log(`📊 Total Scan OUT: ${response.data.data.totalQuantity} pcs from ${response.data.data.totalScans} scans`);
        } else {
          console.error('❌ Failed to fetch customer OUT data:', response.data.message);
          setCustomerOutData([]);
        }
      } catch (error) {
        console.error('❌ Error fetching customer OUT distribution:', error);
        setCustomerOutData([]);
      }
    };

    // Fetch when component mounts or filter changes
    if (!isFetchingData) {
      fetchCustomerOutData();
    }
  }, [customerTimeFilter, isFetchingData]);

  // Wait for component to mount and containers to have dimensions
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChartsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Handle resize logic if needed
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🆕 ENHANCED: Calculate activity data with time filter support
  const activityData = useMemo(() => {
    const selectedFilter = timeFilterOptions.find(f => f.value === timeFilter);
    if (!selectedFilter) return [];

    const startDate = selectedFilter.getStartDate();
    const now = new Date();

    // Determine grouping strategy based on filter
    const getGroupingKey = (date: Date): string => {
      if (timeFilter === '1day') {
        return format(date, 'HH:00'); // Hourly for 1 day
      } else if (timeFilter === '1week') {
        return format(date, 'EEE dd'); // Daily for 1 week
      } else {
        return format(date, 'MMM yyyy'); // Monthly for longer periods
      }
    };

    // Generate time periods
    const periodsData: { [key: string]: { period: string; itemsIn: number; itemsOut: number; order: number } } = {};
    
    if (timeFilter === '1day') {
      // Generate hourly periods for 1 day
      for (let i = 0; i < 24; i++) {
        const hour = String(i).padStart(2, '0') + ':00';
        periodsData[hour] = { period: hour, itemsIn: 0, itemsOut: 0, order: i };
      }
    } else if (timeFilter === '1week') {
      // Generate daily periods for 1 week
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const key = format(date, 'EEE dd');
        periodsData[key] = { period: key, itemsIn: 0, itemsOut: 0, order: 6 - i };
      }
    } else {
      // Generate monthly periods
      const months = timeFilter === '1month' ? 1 : 
                     timeFilter === '3months' ? 3 : 
                     timeFilter === '6months' ? 6 : 
                     timeFilter === '1year' ? 12 : 24;
      
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(now, i);
        const key = format(date, 'MMM yyyy');
        periodsData[key] = { period: key, itemsIn: 0, itemsOut: 0, order: months - 1 - i };
      }
    }

    // Aggregate data from inventory items history
    inventoryItems.forEach((item: any) => {
      if (!item.history || item.history.length === 0) return;
      
      item.history.forEach((historyEntry: any) => {
        const historyDate = new Date(historyEntry.timestamp);
        
        // Filter by date range
        if (historyDate >= startDate && historyDate <= now) {
          const key = getGroupingKey(historyDate);
          
          if (periodsData[key]) {
            if (historyEntry.status === 'IN') {
              periodsData[key].itemsIn += item.quantity;
            } else if (historyEntry.status === 'OUT') {
              periodsData[key].itemsOut += item.quantity;
            }
          }
        }
      });
    });

    // Convert to array and sort
    const result = Object.values(periodsData)
      .sort((a, b) => a.order - b.order)
      .map(({ period, itemsIn, itemsOut }) => ({
        period,
        itemsIn,
        itemsOut
      }));

    console.log(`📊 Activity Data (${selectedFilter.label}):`, result);
    return result;
  }, [inventoryItems, timeFilter]);

  // Optimized color palette for better performance
  const COLORS = ['#3B82F6', '#EAB308', '#10B981', '#F56565', '#8B5CF6', '#06B6D4'];

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    return 'Selamat Sore';
  };

  // 🆕 Show loading state while fetching data
  if (isFetchingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Memuat data dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Mengambil data dari database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optimized Welcome Header - Removed heavy gradients */}
      <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {currentUser?.name || 'User'}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              {format(new Date(), 'EEEE, dd MMMM yyyy')} • Role: {currentUser?.role?.toUpperCase()}
            </p>
          </div>
          <div className="hidden md:block">
            <Activity className="h-16 w-16 text-blue-200" />
          </div>
        </div>
      </div>
      
      {/* Optimized Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Item Masuk Hari Ini</p>
              <p className="text-3xl font-bold text-blue-600">{inventoryStats.itemsInToday}</p>
              <p className="text-xs text-green-600 mt-1">↗ Realtime</p>
            </div>
            <div className="p-3 rounded-full bg-blue-50">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Item Keluar Hari Ini</p>
              <p className="text-3xl font-bold text-green-600">{inventoryStats.itemsOutToday}</p>
              <p className="text-xs text-green-600 mt-1">↗ Realtime</p>
            </div>
            <div className="p-3 rounded-full bg-green-50">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Stok (IN)</p>
              <p className="text-3xl font-bold text-yellow-600">{inventoryStats.totalStockIn.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-500 mt-1">Pieces</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-50">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Transaksi</p>
              <p className="text-3xl font-bold text-purple-600">{inventoryStats.totalTransactions}</p>
              <p className="text-xs text-gray-500 mt-1">Items</p>
            </div>
            <div className="p-3 rounded-full bg-purple-50">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-500 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Active Customers</p>
              <p className="text-3xl font-bold text-indigo-600">{customers.length}</p>
              <p className="text-xs text-gray-500 mt-1">Companies</p>
            </div>
            <div className="p-3 rounded-full bg-indigo-50">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart with Time Filter */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Aktivitas Inventory</h2>
            </div>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {timeFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div ref={barChartRef} className="h-80">
            {isChartsReady && activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="itemsIn" name="Items IN" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="itemsOut" name="Items OUT" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileBarChart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400">Tidak ada data untuk periode ini</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Distribution Chart with Time Filter */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-800">Distribusi Scan OUT per Customer</h2>
            </div>
            <select
              value={customerTimeFilter}
              onChange={(e) => setCustomerTimeFilter(e.target.value as TimeFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {timeFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div ref={pieChartRef} className="h-80">
            {isChartsReady && customerOutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerOutData}
                    cx="50%"
                    cy="50%"
                    label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {customerOutData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400">Tidak ada data Scan OUT untuk periode ini</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Customer Stats List */}
          {customerOutData.length > 0 && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {customerOutData.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-gray-700">{customer.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{customer.value} pcs</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="flex items-center gap-3 p-4 bg-white hover:bg-blue-50 rounded-xl shadow-sm transition-colors border border-gray-200">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800">Scan IN Item</p>
            <p className="text-sm text-gray-500">Tambah barang masuk</p>
          </div>
        </button>

        <button className="flex items-center gap-3 p-4 bg-white hover:bg-green-50 rounded-xl shadow-sm transition-colors border border-gray-200">
          <div className="p-3 bg-green-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800">Scan OUT Item</p>
            <p className="text-sm text-gray-500">Keluarkan barang</p>
          </div>
        </button>

        <button className="flex items-center gap-3 p-4 bg-white hover:bg-purple-50 rounded-xl shadow-sm transition-colors border border-gray-200">
          <div className="p-3 bg-purple-100 rounded-lg">
            <FileBarChart className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800">Lihat Reports</p>
            <p className="text-sm text-gray-500">Analisis data lengkap</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;