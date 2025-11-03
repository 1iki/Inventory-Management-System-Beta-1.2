import { useInventoryStore } from './store/inventory';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from './lib/utils';

import './App.css';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const DashboardDirektur = lazy(() => import('./components/DashboardDirektur'));
const ScanIn = lazy(() => import('./components/ScanIn'));
const ScanOut = lazy(() => import('./components/ScanOut'));
const Reports = lazy(() => import('./components/Reports'));
const ScanInReports = lazy(() => import('./components/ScanInReports'));
const MasterData = lazy(() => import('./components/MasterData'));
const AuditLog = lazy(() => import('./components/AuditLog'));
const DeleteRequests = lazy(() => import('./components/DeleteRequests'));
const StaffCustomers = lazy(() => import('./components/StaffCustomers'));
const SupplierManagement = lazy(() => import('./components/SupplierManagement'));

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-96">
    <div className="flex items-center space-x-3">
      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
      <span className="text-gray-600 font-medium">Memuat halaman...</span>
    </div>
  </div>
);

function App() {
  const { 
    isLoading, 
    currentUser, 
    login, 
    fetchMaster
  } = useInventoryStore();
  
  // Local state management
  const [activePage, setActivePage] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if user is authenticated
  const token = localStorage.getItem('token');
  const isAuthenticated = currentUser && currentUser.id !== 'guest' && token;

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize app
  useEffect(() => {
    // Prevent running if already initialized
    if (isInitialized) return;
    
    const init = async () => {
      try {
        // Check for existing token
        const existingToken = localStorage.getItem('token');
        
        if (existingToken && currentUser) {
          // User has existing session, load master data
          console.log('📦 Loading existing session...');
          try {
            await Promise.allSettled([
              fetchMaster('customers'),
              fetchMaster('parts'),
              fetchMaster('purchaseOrders')
            ]);
          } catch (error) {
            console.error('Error loading existing session data:', error);
          }
        } else {
          // Check for auto-login in development (only once)
          const auto = import.meta.env.VITE_AUTO_LOGIN === 'true';
          if (auto && !sessionStorage.getItem('auto_login_attempted')) {
            console.log('🔐 Attempting auto-login...');
            sessionStorage.setItem('auto_login_attempted', 'true');
            const u = import.meta.env.VITE_DEFAULT_USERNAME || 'direktur_budi';
            const p = import.meta.env.VITE_DEFAULT_PASSWORD || 'password123';
            try {
              await login(u, p);
            } catch (error) {
              console.error('Auto-login failed:', error);
            }
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    init();
  }, [isInitialized, currentUser, login, fetchMaster]);

  const renderContent = () => {
    const pages = {
      'dashboard': <Dashboard />,
      'dashboard-direktur': <DashboardDirektur />,
      'scan-in': <ScanIn />,
      'scan-out': <ScanOut />,
      'reports': <Reports />,
      'scan-in-reports': <ScanInReports />,
      'master-data': <MasterData />,
      'audit-log': <AuditLog />,
      'delete-requests': <DeleteRequests />,
      'staff-customers': <StaffCustomers />,
      'supplier-management': <SupplierManagement />,
    };

    return pages[activePage as keyof typeof pages] || <Dashboard />;
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: 'tween' as const,
    ease: 'anticipate' as const,
    duration: 0.3
  };

  // Show loading screen during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Menginisialisasi aplikasi...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </ErrorBoundary>
    );
  }

  // Main authenticated application
  return (
    <ErrorBoundary>
      <div className={cn("flex h-screen bg-gray-100 overflow-hidden")}>
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />

        {/* Offline Indicator */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              exit={{ y: -50 }}
              className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50 shadow-md"
            >
              <div className="flex items-center justify-center">
                <WifiOff className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Tidak ada koneksi internet</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 shadow-lg"
              >
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                  <span className="text-gray-800 font-medium">Memuat data...</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <ErrorBoundary fallback={
          <div className="w-64 bg-white shadow-lg p-4">
            <div className="text-red-600 text-sm">
              Error loading sidebar
            </div>
          </div>
        }>
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            activePage={activePage}
            setActivePage={setActivePage}
          />
        </ErrorBoundary>
        
        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-hidden transition-all duration-300 bg-gray-100",
          sidebarCollapsed ? 'ml-0' : ''
        )}>
          <div className="h-full overflow-auto">
            {/* Status Bar */}
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <h1 className="text-lg font-semibold text-gray-800 capitalize">
                  {activePage.replace('-', ' ')}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                {/* Online status */}
                <div className={cn(
                  "flex items-center text-sm",
                  isOnline ? "text-green-600" : "text-red-600"
                )}>
                  {isOnline ? (
                    <Wifi className="h-4 w-4 mr-1" />
                  ) : (
                    <WifiOff className="h-4 w-4 mr-1" />
                  )}
                  <span>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Page Content with Animation and Suspense */}
            <div className="p-6 min-h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePage}
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      {renderContent()}
                    </Suspense>
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
