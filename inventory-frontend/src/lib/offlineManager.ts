import { get, set, del, keys, clear } from 'idb-keyval';
import { toast } from 'react-hot-toast';
import { api } from './api';

interface PendingAction {
  id: string;
  type: 'scan-in' | 'scan-out' | 'create' | 'update' | 'delete';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineData {
  inventoryItems: any[];
  customers: any[];
  parts: any[];
  purchaseOrders: any[];
  lastSync: number;
}

class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private maxRetries: number = 3;

  constructor() {
    this.initializeListeners();
  }

  private initializeListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Connection restored - Starting sync...');
      toast.success('Koneksi internet tersambung!');
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Connection lost - Offline mode activated');
      toast.error('Koneksi internet terputus. Mode offline aktif.');
    });
  }

  // Check if online
  public isOnlineMode(): boolean {
    return this.isOnline;
  }

  // Cache data for offline use
  public async cacheData(data: OfflineData): Promise<void> {
    try {
      await set('offline-data', {
        ...data,
        lastSync: Date.now()
      });
      console.log('✅ Data cached successfully');
    } catch (error) {
      console.error('❌ Error caching data:', error);
      throw error;
    }
  }

  // Get cached data
  public async getCachedData(): Promise<OfflineData | null> {
    try {
      const data = await get<OfflineData>('offline-data');
      return data || null;
    } catch (error) {
      console.error('❌ Error retrieving cached data:', error);
      return null;
    }
  }

  // Add pending action
  public async addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pendingAction: PendingAction = {
        ...action,
        id: actionId,
        timestamp: Date.now(),
        retryCount: 0
      };

      await set(actionId, pendingAction);
      console.log('📝 Pending action added:', actionId);

      toast.success('Aksi disimpan. Akan disync saat online.', {
        duration: 3000,
        position: 'bottom-right'
      });
    } catch (error) {
      console.error('❌ Error adding pending action:', error);
      throw error;
    }
  }

  // Get all pending actions
  public async getPendingActions(): Promise<PendingAction[]> {
    try {
      const allKeys = await keys();
      const actionKeys = allKeys.filter(key => key.toString().startsWith('action-'));
      
      const actions: PendingAction[] = [];
      for (const key of actionKeys) {
        const action = await get<PendingAction>(key);
        if (action) {
          actions.push(action);
        }
      }

      return actions.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('❌ Error getting pending actions:', error);
      return [];
    }
  }

  // Sync pending actions with server
  public async syncPendingActions(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      console.log('⏸️ Sync skipped - offline or already in progress');
      return;
    }

    this.syncInProgress = true;
    const loadingToast = toast.loading('Menyinkronkan data...');

    try {
      const pendingActions = await this.getPendingActions();
      
      if (pendingActions.length === 0) {
        console.log('✅ No pending actions to sync');
        toast.success('Semua data sudah tersinkronisasi!', { id: loadingToast });
        return;
      }

      console.log(`🔄 Syncing ${pendingActions.length} pending actions...`);

      let successCount = 0;
      let failCount = 0;

      for (const action of pendingActions) {
        try {
          // Execute the API call
          await api.request({
            method: action.method,
            url: action.endpoint,
            data: action.data
          });

          // Remove successful action
          await del(action.id);
          successCount++;
          console.log('✅ Synced:', action.id);
        } catch (error: any) {
          failCount++;
          console.error('❌ Sync failed for:', action.id, error);

          // Increment retry count
          action.retryCount++;

          // Remove if max retries reached
          if (action.retryCount >= this.maxRetries) {
            await del(action.id);
            console.log('🗑️ Action removed after max retries:', action.id);
          } else {
            // Update action with new retry count
            await set(action.id, action);
          }
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} aksi berhasil disinkronkan!`, { id: loadingToast });
      }

      if (failCount > 0) {
        toast.error(`${failCount} aksi gagal disinkronkan. Akan dicoba lagi.`, { id: loadingToast });
      }

      console.log(`📊 Sync completed - Success: ${successCount}, Failed: ${failCount}`);
    } catch (error) {
      console.error('❌ Sync error:', error);
      toast.error('Gagal menyinkronkan data', { id: loadingToast });
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get pending actions count
  public async getPendingActionsCount(): Promise<number> {
    const actions = await this.getPendingActions();
    return actions.length;
  }

  // Clear all pending actions
  public async clearPendingActions(): Promise<void> {
    try {
      const pendingActions = await this.getPendingActions();
      for (const action of pendingActions) {
        await del(action.id);
      }
      console.log('🗑️ All pending actions cleared');
      toast.success('Semua pending actions dibersihkan');
    } catch (error) {
      console.error('❌ Error clearing pending actions:', error);
      throw error;
    }
  }

  // Clear all offline data
  public async clearAllData(): Promise<void> {
    try {
      await clear();
      console.log('🗑️ All offline data cleared');
      toast.success('Semua data offline dibersihkan');
    } catch (error) {
      console.error('❌ Error clearing all data:', error);
      throw error;
    }
  }

  // Check if data needs refresh (older than 1 hour)
  public async needsRefresh(): Promise<boolean> {
    const cachedData = await this.getCachedData();
    if (!cachedData || !cachedData.lastSync) return true;

    const oneHour = 60 * 60 * 1000;
    return Date.now() - cachedData.lastSync > oneHour;
  }

  // Background sync registration (for service worker)
  public async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Register background sync if supported
        if ('sync' in registration) {
          try {
            // Type assertion for SyncManager API
            await (registration as any).sync.register('sync-inventory-data');
            console.log('📡 Background sync registered');
          } catch (error) {
            console.error('Failed to register background sync:', error);
          }
        }
      } catch (error) {
        console.error('❌ Background sync registration failed:', error);
      }
    }
  }

  // Get sync status
  public async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingCount: number;
    lastSync: number | null;
    needsRefresh: boolean;
  }> {
    const cachedData = await this.getCachedData();
    const pendingCount = await this.getPendingActionsCount();
    const needsRefresh = await this.needsRefresh();

    return {
      isOnline: this.isOnline,
      pendingCount,
      lastSync: cachedData?.lastSync || null,
      needsRefresh
    };
  }

  // Manual sync trigger
  public async manualSync(): Promise<void> {
    if (!this.isOnline) {
      toast.error('Tidak ada koneksi internet');
      return;
    }

    await this.syncPendingActions();
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// Helper function to execute API call with offline support
export async function executeWithOfflineSupport<T>(
  apiCall: () => Promise<T>,
  fallbackAction?: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>
): Promise<T> {
  if (offlineManager.isOnlineMode()) {
    try {
      return await apiCall();
    } catch (error: any) {
      // If network error and fallback provided, queue the action
      if (!error.response && fallbackAction) {
        await offlineManager.addPendingAction(fallbackAction);
        throw new Error('Offline: Action queued for sync');
      }
      throw error;
    }
  } else {
    // Offline mode - queue action if provided
    if (fallbackAction) {
      await offlineManager.addPendingAction(fallbackAction);
      throw new Error('Offline: Action queued for sync');
    }
    throw new Error('No internet connection');
  }
}
