import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useInventoryStore } from '../store/inventory';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionRequired?: boolean;
  relatedId?: string;
  userId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotificationCenterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ position = 'top-right' }) => {
  const { } = useInventoryStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize with sample notifications
  useEffect(() => {
    const sampleNotifications: Notification[] = [
      {
        id: '1',
        type: 'warning',
        title: 'Stock Rendah',
        message: 'Item LOT001 memiliki stock kurang dari 10 unit',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        read: false,
        actionRequired: true,
        relatedId: 'LOT001',
        priority: 'high'
      },
      {
        id: '2',
        type: 'success',
        title: 'Scan In Berhasil',
        message: '25 item berhasil di-scan masuk ke warehouse A',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        read: false,
        priority: 'medium'
      },
      {
        id: '3',
        type: 'info',
        title: 'Laporan Siap',
        message: 'Laporan harian inventory telah dibuat',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: true,
        priority: 'low'
      },
      {
        id: '4',
        type: 'error',
        title: 'Permintaan Delete Gagal',
        message: 'Item GATE005 tidak dapat dihapus - masih dalam status aktif',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        read: false,
        actionRequired: true,
        relatedId: 'GATE005',
        priority: 'urgent'
      }
    ];

    setNotifications(sampleNotifications);
  }, []);

  // Real-time notification simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate receiving new notifications
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        addNotification({
          type: Math.random() > 0.7 ? 'warning' : 'info',
          title: Math.random() > 0.5 ? 'Aktivitas Baru' : 'Update Sistem',
          message: `Update otomatis pada ${format(new Date(), 'HH:mm')}`,
          priority: 'low'
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    if (soundEnabled) {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
    playNotificationSound();

    // Auto-remove low priority notifications after 10 seconds
    if (notification.priority === 'low') {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 10000);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'urgent':
        return notifications.filter(n => n.priority === 'urgent' || n.priority === 'high');
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => (n.priority === 'urgent' || n.priority === 'high') && !n.read).length;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <>
      {/* Notification Bell Button */}
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-3 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all"
        >
          <Bell className="h-6 w-6 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {urgentCount > 0 && (
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <div className={`fixed ${positionClasses[position]} mt-16 z-40`}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Notifikasi</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1 rounded ${soundEnabled ? 'text-blue-600' : 'text-gray-400'}`}
                    title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
                  >
                    🔔
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex space-x-1 mt-3">
                {[
                  { key: 'all', label: 'Semua', count: notifications.length },
                  { key: 'unread', label: 'Belum Dibaca', count: unreadCount },
                  { key: 'urgent', label: 'Penting', count: urgentCount }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      filter === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {tab.label} {tab.count > 0 && `(${tab.count})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-64 overflow-y-auto">
              {getFilteredNotifications().length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada notifikasi</p>
                </div>
              ) : (
                getFilteredNotifications().map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 border-l-4 ${getPriorityColor(notification.priority)} ${
                      !notification.read ? 'bg-blue-50' : 'bg-white'
                    } hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            {notification.actionRequired && (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                Action Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(notification.timestamp, { 
                                addSuffix: true,
                                locale: id 
                              })}
                            </p>
                            <div className="flex items-center space-x-2">
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => removeNotification(notification.id)}
                                className="text-xs text-gray-400 hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Actions */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Tandai Semua Dibaca
                  </button>
                  <button
                    onClick={clearAllNotifications}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications for urgent items */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications
          .filter(n => !n.read && n.priority === 'urgent')
          .slice(0, 3)
          .map(notification => (
            <div
              key={`toast-${notification.id}`}
              className="bg-red-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-slide-in-right"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm opacity-90">{notification.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="text-white opacity-70 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
      </div>
    </>
  );
};

// Hook for adding notifications from other components
export const useNotifications = () => {
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // This would integrate with a global notification store
    window.dispatchEvent(new CustomEvent('add-notification', { detail: notification }));
  };

  return { addNotification };
};

export default NotificationCenter;
