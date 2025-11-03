import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { offlineManager } from '../lib/offlineManager';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const OfflineStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    updateStatus();

    const handleOnline = () => {
      setIsOnline(true);
      updateStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateStatus = async () => {
    try {
      const status = await offlineManager.getSyncStatus();
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setLastSync(status.lastSync);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Tidak ada koneksi internet');
      return;
    }

    setIsSyncing(true);
    try {
      await offlineManager.manualSync();
      await updateStatus();
    } catch (error) {
      console.error('Manual sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) {
    // Minimized view when all is good
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition-colors"
        >
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Online</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between ${
          isOnline ? 'bg-yellow-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-yellow-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <div>
              <h3 className={`text-sm font-semibold ${
                isOnline ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {isOnline ? 'Online - Pending Sync' : 'Offline Mode'}
              </h3>
              {pendingCount > 0 && (
                <p className="text-xs text-gray-600">
                  {pendingCount} aksi menunggu sinkronisasi
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <AlertCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Details */}
        {showDetails && (
          <div className="p-4 space-y-3">
            {/* Status Info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Status Koneksi:</span>
              <span className={`font-semibold ${
                isOnline ? 'text-green-600' : 'text-red-600'
              }`}>
                {isOnline ? 'Terhubung' : 'Terputus'}
              </span>
            </div>

            {pendingCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Aksi Pending:</span>
                <span className="font-semibold text-yellow-600">{pendingCount}</span>
              </div>
            )}

            {lastSync && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Sync:</span>
                <span className="text-gray-900 text-xs">
                  {format(new Date(lastSync), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            )}

            {/* Actions */}
            {isOnline && pendingCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </span>
              </button>
            )}

            {/* Info */}
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {isOnline 
                  ? 'Aksi akan otomatis tersinkronisasi. Klik "Sync Now" untuk sinkronisasi manual.'
                  : 'Aksi Anda disimpan secara lokal dan akan tersinkronisasi saat koneksi tersedia.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineStatusIndicator;
