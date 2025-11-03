import { 
  LayoutDashboard, 
  ScanLine, 
  FileBarChart, 
  Trash2, 
  Database, 
  FileText, 
  LogOut,
  QrCode,
  Menu,
  X,
  ChevronDown,
  Building,
  Truck
} from 'lucide-react';
import { useInventoryStore } from '../store/inventory';
import { motion, AnimatePresence } from 'framer-motion';
import { Disclosure } from '@headlessui/react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activePage: string;
  setActivePage: (page: string) => void;
}

const Sidebar = ({ collapsed, onToggleCollapse, activePage, setActivePage }: SidebarProps) => {
  const { currentUser, logout } = useInventoryStore();

  const navigationItems = [
    {
      section: "Dashboard Direktur",
      items: [
        { id: 'dashboard-direktur', label: 'Dashboard Direktur', icon: LayoutDashboard, roles: ['direktur'] },
      ]
    },
    {
      section: "Operasi (Staff)",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['staff', 'manager', 'admin', 'direktur'] },
        { id: 'scan-in', label: 'Scan IN (Create)', icon: QrCode, roles: ['staff', 'manager', 'admin', 'direktur'] },
        { id: 'scan-out', label: 'Scan OUT', icon: ScanLine, roles: ['staff', 'manager', 'admin', 'direktur'] },
        { id: 'staff-customers', label: 'Staff Customers', icon: Building, roles: ['staff', 'manager', 'admin', 'direktur'] },
      ]
    },
    {
      section: "Manajemen",
      items: [
        { id: 'reports', label: 'Laporan', icon: FileBarChart, roles: ['manager', 'admin', 'direktur'] },
        { id: 'scan-in-reports', label: 'Laporan Scan In', icon: FileText, roles: ['manager', 'admin', 'direktur'] },
        { id: 'delete-requests', label: 'Persetujuan Hapus', icon: Trash2, roles: ['manager', 'admin', 'direktur'] },
        { id: 'supplier-management', label: 'Supplier Management', icon: Truck, roles: ['manager', 'admin', 'direktur'] },
      ]
    },
    {
      section: "Administrasi",
      items: [
        { id: 'master-data', label: 'Master Data', icon: Database, roles: ['manager', 'admin', 'direktur'] }, // 🔥 Menambahkan 'manager' role
        { id: 'audit-log', label: 'Audit Log', icon: FileText, roles: ['manager', 'admin', 'direktur'] }, // 🔥 Menambahkan 'manager' role
      ]
    }
  ];

  const hasAccess = (roles: string[]) => {
    return currentUser && roles.includes(currentUser.role);
  };

  const handleNavigation = (pageId: string, label: string) => {
    setActivePage(pageId);
    toast.success(`Navigasi ke ${label}`);
  };

  const handleLogout = () => {
    logout();
    toast.success('Berhasil logout');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'direktur': return 'bg-purple-500';
      case 'admin': return 'bg-red-500';
      case 'manager': return 'bg-blue-500';
      case 'staff': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'direktur': return 'Direktur';
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      case 'staff': return 'Staff';
      default: return 'Unknown';
    }
  };

  return (
    <motion.nav 
      animate={{ width: collapsed ? 64 : 288 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-blue-950 text-white flex flex-col shadow-xl relative"
    >
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 bg-white text-blue-950 rounded-full p-1.5 shadow-md hover:shadow-lg transition-shadow duration-200 z-10"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
      >
        <motion.div
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </motion.div>
      </motion.button>

      {/* Logo - Enhanced to match HTML example */}
      <motion.div 
        className={cn("border-b border-blue-800/30", collapsed ? 'p-3' : 'p-6')}
        animate={{ padding: collapsed ? 12 : 24 }}
      >
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-white text-blue-950 p-2 rounded-lg text-center shadow-sm"
            >
              <span className="font-bold text-xs">UML</span>
            </motion.div>
          ) : (
            <motion.div
              key="expanded-logo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className="bg-white text-blue-950 p-3 rounded-lg shadow-sm mb-2">
                <h1 className="font-bold text-sm leading-tight">PT USBERSA<br />MITRA LOGAM</h1>
              </div>
              <p className="text-xs text-blue-200 font-medium">Inventory Management System</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Navigation Items */}
      <div className={cn("flex-1 overflow-y-auto py-4 space-y-2", collapsed ? 'px-2' : 'px-4')}>
        {navigationItems.map((section) => {
          const sectionHasAccess = section.items.some(item => hasAccess(item.roles));
          if (!sectionHasAccess) return null;

          return (
            <div key={section.section} className="mb-4">
              {!collapsed && (
                <Disclosure defaultOpen>
                  {({ open }) => (
                    <>
                      <Disclosure.Button className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 uppercase px-3 py-2 hover:text-white transition-colors duration-200">
                        <span className="truncate">{section.section}</span>
                        <motion.div
                          animate={{ rotate: open ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </motion.div>
                      </Disclosure.Button>
                      <AnimatePresence>
                        <Disclosure.Panel
                          as={motion.div}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1"
                        >
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            if (!hasAccess(item.roles)) return null;
                            
                            const isActive = activePage === item.id;
                            
                            return (
                              <motion.button
                                key={item.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleNavigation(item.id, item.label)}
                                className={cn(
                                  "group w-full flex items-center rounded-lg transition-all duration-200",
                                  collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                                  isActive 
                                    ? 'bg-blue-800 text-white shadow-sm' 
                                    : 'text-blue-100 hover:bg-blue-800/50 hover:text-white'
                                )}
                                title={collapsed ? item.label : ''}
                              >
                                <Icon className={cn(
                                  "transition-colors duration-200",
                                  collapsed ? 'h-5 w-5' : 'h-4 w-4 mr-3',
                                  isActive ? 'text-white' : ''
                                )} />
                                <AnimatePresence>
                                  {!collapsed && (
                                    <motion.span
                                      initial={{ opacity: 0, width: 0 }}
                                      animate={{ opacity: 1, width: 'auto' }}
                                      exit={{ opacity: 0, width: 0 }}
                                      className="font-medium text-sm truncate"
                                    >
                                      {item.label}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                                {!collapsed && isActive && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="ml-auto w-2 h-2 bg-white rounded-full"
                                  />
                                )}
                              </motion.button>
                            );
                          })}
                        </Disclosure.Panel>
                      </AnimatePresence>
                    </>
                  )}
                </Disclosure>
              )}
              
              {/* Collapsed navigation */}
              {collapsed && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    if (!hasAccess(item.roles)) return null;
                    
                    const isActive = activePage === item.id;
                    
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleNavigation(item.id, item.label)}
                        className={cn(
                          "w-full flex items-center justify-center p-3 rounded-lg transition-all duration-200",
                          isActive 
                            ? 'bg-blue-800 text-white shadow-sm' 
                            : 'text-blue-100 hover:bg-blue-800/50 hover:text-white'
                        )}
                        title={item.label}
                      >
                        <Icon className={cn(
                          "h-5 w-5 transition-colors duration-200",
                          isActive ? 'text-white' : ''
                        )} />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile & Logout */}
      <div className={cn("border-t border-blue-800/30", collapsed ? 'p-2' : 'p-4')}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-blue-800/30 rounded-lg p-3 mb-3"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600 font-bold text-sm">
                    {currentUser?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-white">{currentUser?.name || 'User'}</p>
                  <div className="flex items-center space-x-1">
                    <div className={cn("w-2 h-2 rounded-full", getRoleColor(currentUser?.role || ''))}></div>
                    <p className="text-xs text-blue-200 capitalize">{getRoleLabel(currentUser?.role || '')}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md group",
            collapsed ? 'justify-center p-3' : 'justify-center px-4 py-3'
          )}
          title={collapsed ? 'Logout' : ''}
        >
          <LogOut className={cn(
            "group-hover:scale-105 transition-transform duration-200",
            collapsed ? 'h-5 w-5' : 'h-4 w-4 mr-2'
          )} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-medium text-sm"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.nav>
  );
};

export default Sidebar;