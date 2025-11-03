import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ScanLine, RotateCcw, QrCode, CheckCircle, AlertTriangle, Loader2, Download, Wifi, WifiOff, RefreshCw, Clock, Printer } from 'lucide-react';
import { useInventoryStore } from '../store/inventory';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import type { Part, Customer, PurchaseOrder } from '../types';
import { createScanInReportApi } from '../lib/api';
import { api } from '../lib/api';

interface ScanInFormData {
  partId: string;
  customerId: string;
  poId: string;
  quantity: number;
  lotId: string;
  copies: number;
  gateId: string;
}

interface FeedbackState {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  qrCodeUrl?: string;
  uniqueId?: string;
  // 🆕 Tambahkan data lengkap untuk print QR
  itemData?: {
    customerName: string;
    partName: string;
    partNo: string;
    poNumber: string;
    quantity: number;
    lotId: string;
    gateId: string;
    copies: number;
  };
}

// Helper functions for offline data
const getOfflineScans = () => {
  try {
    const data = localStorage.getItem('offline_scan_in');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const removeOfflineScan = (id: string) => {
  try {
    const scans = getOfflineScans();
    const filtered = scans.filter((s: any) => s.id !== id);
    localStorage.setItem('offline_scan_in', JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove offline scan:', error);
  }
};

const ScanIn: React.FC = () => {
  const { 
    parts,
    customers,
    purchaseOrders,
    currentUser,
    scanIn, // use offline-first action
    fetchMaster // Add fetchMaster to fetch data from database
  } = useInventoryStore();
  
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [syncProgress, setSyncProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    isRunning: boolean;
  }>({ total: 0, completed: 0, failed: 0, isRunning: false });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isValid } } = useForm<ScanInFormData>({
    mode: 'onChange',
    defaultValues: { copies: 1, gateId: 'GATE-01' }
  });
  
  const watchedCustomerId = watch('customerId');
  const watchedPartId = watch('partId');
  const watchedPoId = watch('poId');

  // 🆕 AUTO-FETCH DATA FROM DATABASE ON MOUNT
  useEffect(() => {
    const fetchAllMasterData = async () => {
      setIsFetchingData(true);
      try {
        console.log('🔄 Fetching master data from database...');
        
        // Fetch all master data in parallel
        await Promise.all([
          fetchMaster('customers'),
          fetchMaster('parts'),
          fetchMaster('purchaseOrders')
        ]);
        
        console.log('✅ Master data berhasil dimuat');
        toast.success('Data master berhasil dimuat', { icon: '📦', duration: 2000 });
      } catch (error) {
        console.error('❌ Error fetching master data:', error);
        toast.error('Gagal memuat data master. Silakan refresh halaman.', { duration: 4000 });
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchAllMasterData();
  }, []); // Only run once on mount

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Koneksi internet tersambung', { icon: '🌐' });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Koneksi internet terputus - Mode Offline', { icon: '📡' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update offline count periodically
    const interval = setInterval(() => {
      setOfflineCount(getOfflineScans().length);
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const onSubmit = async (data: ScanInFormData) => {
    if (!currentUser) {
      toast.error('User tidak ditemukan. Silakan login ulang.');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const loadingToast = toast.loading('Menambahkan item ke inventory...');

      // 🔧 PERBAIKAN: Ambil data lengkap SEBELUM reset form
      const part = parts.find((p: Part) => p._id === data.partId);
      const customer = part ? customers.find((c: Customer) => c._id === part.customerId) : null;
      const po = purchaseOrders.find((p: PurchaseOrder) => p._id === data.poId);

      // Call store action (backend handles all logic)
      const created = await scanIn({
        partId: data.partId,
        poId: data.poId,
        quantity: Number(data.quantity),
        lotId: data.lotId,
        copies: Number(data.copies || 1),
        gateId: data.gateId,
      });

      if (!created) {
        toast.dismiss(loadingToast);
        toast.error('Gagal membuat item.');
        setFeedback({
          type: 'error',
          title: 'Gagal Menambahkan Item',
          message: 'Terjadi kesalahan saat menambahkan item ke inventory. Silakan coba lagi.'
        });
        setIsSubmitting(false);
        return;
      }

      // ✨ BARU: Otomatis buat Scan In Report
      try {
        await createScanInReportApi({
          itemId: created._id,
          notes: `Scan In oleh ${currentUser.name} untuk ${data.quantity} pcs`
        });
        console.log('✅ Scan In Report berhasil dibuat');
      } catch (reportError) {
        console.warn('⚠️ Gagal membuat Scan In Report:', reportError);
      }

      toast.dismiss(loadingToast);
      toast.success(`Item ${created.uniqueId} berhasil ditambahkan!`, { duration: 5000, icon: '🎉' });

      // 🆕 PERBAIKAN: Simpan data lengkap ke feedback state
      setFeedback({
        type: 'success',
        title: 'Item Berhasil Ditambahkan!',
        message: `ID Unik: ${created.uniqueId}\nPart: ${part?.name || 'N/A'}\nCustomer: ${customer?.name || 'N/A'}\nPO: ${po?.poNumber || 'N/A'}\nQuantity: ${Number(data.quantity).toLocaleString('id-ID')} pcs`,
        qrCodeUrl: created.qrCodeImage,
        uniqueId: created.uniqueId,
        // 🆕 Simpan data lengkap untuk print
        itemData: {
          customerName: customer?.name || 'N/A',
          partName: part?.name || 'N/A',
          partNo: part?.internalPartNo || 'N/A',
          poNumber: po?.poNumber || 'N/A',
          quantity: Number(data.quantity),
          lotId: data.lotId,
          gateId: data.gateId,
          copies: Number(data.copies || 1)
        }
      });

      reset();
    } catch (error) {
      toast.error('Terjadi kesalahan saat menambahkan item ke inventory');
      setFeedback({
        type: 'error',
        title: 'Gagal Menambahkan Item',
        message: 'Terjadi kesalahan saat menambahkan item ke inventory. Silakan coba lagi.'
      });
      console.error('Error adding inventory item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadQRCode = () => {
    if (feedback?.qrCodeUrl && feedback?.uniqueId) {
      const link = document.createElement('a');
      link.download = `QR_${feedback.uniqueId}.png`;
      link.href = feedback.qrCodeUrl;
      link.click();
      toast.success('QR Code berhasil diunduh!');
    }
  };

  const printQRCode = () => {
    if (!feedback?.qrCodeUrl || !feedback?.uniqueId || !feedback?.itemData) {
      toast.error('Data item tidak lengkap untuk print QR Code');
      return;
    }

    // 🔧 PERBAIKAN: Ambil data dari feedback.itemData, bukan dari form
    const { customerName, partName, partNo, poNumber, quantity, lotId, gateId, copies } = feedback.itemData;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup diblokir! Izinkan popup untuk mencetak QR Code.');
      return;
    }

    // Build HTML for printing with multiple copies
    let qrCodesHtml = '';
    for (let i = 0; i < copies; i++) {
      qrCodesHtml += `
        <div class="qr-print-item" style="page-break-after: ${i < copies - 1 ? 'always' : 'auto'}; padding: 20px;">
          <div style="text-align: center; max-width: 400px; margin: 0 auto; border: 2px solid #333; padding: 20px; border-radius: 10px;">
            <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #1e40af;">PT USBERSA MITRA LOGAM</h2>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">Inventory Management System</p>
            
            <img src="${feedback.qrCodeUrl}" 
                 alt="QR Code" 
                 style="width: 250px; height: 250px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 20px;" />
            
            <div style="text-align: left; border-top: 2px solid #e5e7eb; padding-top: 15px;">
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">Unique ID:</strong> 
                <span style="color: #1f2937; font-family: monospace;">${feedback.uniqueId}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">Customer:</strong> 
                <span style="color: #1f2937;">${customerName}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">Part:</strong> 
                <span style="color: #1f2937;">${partName}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">Part No:</strong> 
                <span style="color: #1f2937;">${partNo}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">PO Number:</strong> 
                <span style="color: #1f2937;">${poNumber}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">Quantity:</strong> 
                <span style="color: #1f2937; font-weight: bold;">${quantity.toLocaleString('id-ID')} pcs</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">Lot ID:</strong> 
                <span style="color: #1f2937;">${lotId}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">Gate ID:</strong> 
                <span style="color: #1f2937;">${gateId}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">Copy:</strong> 
                <span style="color: #1f2937;">${i + 1} of ${copies}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151;">Scan Date:</strong> 
                <span style="color: #1f2937;">${new Date().toLocaleString('id-ID')}</span>
              </div>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #6b7280;">
                <p style="margin: 0;">Scan QR code untuk detail lengkap</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${feedback.uniqueId}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              .qr-print-item { page-break-after: always; }
              .qr-print-item:last-child { page-break-after: auto; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${qrCodesHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 100);
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    toast.success(`Mencetak ${copies} QR Code...`, { icon: '🖨️' });
  };

  const getProgressPercentage = () => {
    let progress = 0;
    if (watchedCustomerId) progress += 25;
    if (watchedPartId) progress += 25;
    if (watchedPoId) progress += 25;
    if (watch('quantity') > 0) progress += 25;
    return progress;
  };

  const progressVariants = {
    initial: { width: 0 },
    animate: { width: `${getProgressPercentage()}%` }
  };

  const syncOfflineData = async () => {
    const offlineScans = getOfflineScans();
    if (offlineScans.length === 0) {
      toast('Tidak ada data offline untuk disinkronkan', { icon: 'ℹ️' });
      return;
    }

    setSyncProgress({
      total: offlineScans.length,
      completed: 0,
      failed: 0,
      isRunning: true
    });

    let completed = 0;
    let failed = 0;

    for (const scan of offlineScans) {
      try {
        await api.post('/inventory/items/scan-in', {
          ...scan,
          offlineSync: true,
          offlineTimestamp: scan.timestamp
        });
        completed++;
        removeOfflineScan(scan.id);
        
        setSyncProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed
        }));
      } catch (error) {
        console.error('Gagal sync:', scan.id, error);
        failed++;
        
        setSyncProgress(prev => ({
          ...prev,
          completed: completed,
          failed: failed
        }));
      }
    }

    setSyncProgress(prev => ({ ...prev, isRunning: false }));

    if (failed === 0) {
      toast.success(`Berhasil sinkronkan ${completed} data offline`);
    } else {
      toast(`Sync selesai: ${completed} berhasil, ${failed} gagal`, { icon: '⚠️' });
    }
    
    // Refresh offline count
    setOfflineCount(getOfflineScans().length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 p-4 sm:p-6 lg:p-8"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header dengan Status Koneksi */}
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <ScanLine className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Scan In Barang
              </h1>
              <p className="text-sm text-gray-600 mt-1">Registrasi barang masuk gudang</p>
            </div>
          </motion.div>

          {/* Status Koneksi & Sync Button */}
          <div className="flex items-center gap-3">
            {/* Connection Status Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
                isOnline 
                  ? "bg-green-100 text-green-700 border border-green-200" 
                  : "bg-orange-100 text-orange-700 border border-orange-200"
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm">Offline</span>
                </>
              )}
            </motion.div>

            {/* Offline Data Counter & Sync Button */}
            {offlineCount > 0 && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={syncOfflineData}
                disabled={!isOnline || syncProgress.isRunning}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                  "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
                  "shadow-lg hover:shadow-xl transform hover:scale-105"
                )}
              >
                {syncProgress.isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Syncing {syncProgress.completed}/{syncProgress.total}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm">Sync ({offlineCount})</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* Sync Progress Bar */}
        {syncProgress.isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-white rounded-xl shadow-lg border border-blue-100"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Sinkronisasi Data Offline
              </span>
              <span className="text-xs text-gray-500">
                {syncProgress.completed} / {syncProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <motion.div
                className="bg-linear-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(syncProgress.completed / syncProgress.total) * 100}%` 
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {syncProgress.failed > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                <AlertTriangle className="w-3 h-3" />
                <span>{syncProgress.failed} data gagal disinkronkan</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Offline Notice */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Mode Offline Aktif</p>
                <p className="text-xs text-orange-600 mt-1">
                  Data akan disimpan secara lokal dan otomatis tersinkronisasi saat online
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header with Progress */}
        <motion.div 
          className="bg-white rounded-xl shadow-md p-6"
          whileHover={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Scan IN / Tambah Item</h1>
              <p className="text-gray-600">Tambahkan item baru ke inventory sistem</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Progress Form</div>
              <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div 
                  className="bg-blue-600 h-2 rounded-full"
                  variants={progressVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{getProgressPercentage()}% Complete</div>
            </div>
          </div>
        </motion.div>

        {/* Loading Master Data Indicator */}
        {isFetchingData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-800">Memuat Data Master...</p>
                <p className="text-xs text-blue-600 mt-1">
                  Sedang mengambil data Customer, Parts, dan Purchase Orders dari database
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="xl:col-span-2 bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <QrCode className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Form Tambah Item Baru</h2>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Selection */}
              <motion.div 
                className="space-y-2"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <label htmlFor="customerId" className="block text-sm font-semibold text-gray-700">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  id="customerId"
                  {...register('customerId', { required: 'Customer harus dipilih' })}
                  className={cn(
                    "block w-full rounded-lg border-2 shadow-sm focus:ring-blue-500 transition-all duration-200",
                    errors.customerId ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  )}
                  onChange={(e) => {
                    setValue('customerId', e.target.value);
                    setValue('partId', '');
                    setValue('poId', '');
                    if (e.target.value) {
                      toast.success('Customer dipilih');
                    }
                  }}
                  aria-describedby={errors.customerId ? 'customerId-error' : undefined}
                >
                  <option value="">Pilih Customer</option>
                  {customers.map((customer: Customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                <AnimatePresence>
                  {errors.customerId && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      id="customerId-error" 
                      className="text-sm text-red-600 flex items-center" 
                      role="alert"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.customerId.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Part Selection */}
              <motion.div 
                className="space-y-2"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <label htmlFor="partId" className="block text-sm font-semibold text-gray-700">
                  Part <span className="text-red-500">*</span>
                </label>
                <select
                  id="partId"
                  {...register('partId', { required: 'Part harus dipilih' })}
                  className={cn(
                    'block w-full rounded-lg border-2 shadow-sm focus:ring-blue-500 transition-all duration-200',
                    errors.partId ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  )}
                  onChange={(e) => {
                    setValue('partId', e.target.value);
                    setValue('poId', '');
                  }}
                  aria-describedby={errors.partId ? 'partId-error' : undefined}
                >
                  <option value="">Pilih Part</option>
                  {(watchedCustomerId ? parts.filter((p: Part) => p.customerId === watchedCustomerId) : parts).map((part: Part) => (
                    <option key={part._id} value={part._id}>
                      {part.name} ({part.internalPartNo})
                    </option>
                  ))}
                </select>
                <AnimatePresence>
                  {errors.partId && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      id="partId-error" 
                      className="text-sm text-red-600 flex items-center" 
                      role="alert"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.partId.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* PO Selection */}
              <motion.div 
                className="space-y-2"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <label htmlFor="poId" className="block text-sm font-semibold text-gray-700">
                  Purchase Order <span className="text-red-500">*</span>
                </label>
                <select
                  id="poId"
                  {...register('poId', { required: 'PO harus dipilih' })}
                  className={cn(
                    'block w-full rounded-lg border-2 shadow-sm focus:ring-blue-500 transition-all duration-200',
                    errors.poId ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  )}
                  aria-describedby={errors.poId ? 'poId-error' : undefined}
                >
                  <option value="">Pilih PO</option>
                  {(watchedPartId 
                    ? purchaseOrders.filter((po) => {
                        // 🔧 SAFE: Handle both populated object and string ID
                        const poPartId = typeof po.partId === 'object' ? po.partId._id : po.partId;
                        return poPartId === watchedPartId;
                      })
                    : watchedCustomerId 
                    ? purchaseOrders.filter((po) => {
                        // 🔧 SAFE: Handle both populated object and string ID
                        const poCustomerId = typeof po.customerId === 'object' ? po.customerId._id : po.customerId;
                        return poCustomerId === watchedCustomerId;
                      })
                    : purchaseOrders
                  ).map((po) => {
                    // 🆕 SAFE CHECKS: Validate PO data before rendering
                    if (!po || !po._id || !po.poNumber) {
                      console.warn('Invalid PO data:', po);
                      return null;
                    }

                    // Get part information for better context
                    // 🔧 SAFE: Handle populated data
                    const partId = typeof po.partId === 'object' ? po.partId._id : po.partId;
                    const customerId = typeof po.customerId === 'object' ? po.customerId._id : po.customerId;
                    
                    const part = parts.find((p: Part) => p._id === partId);
                    const customer = customers.find((c: Customer) => c._id === customerId);
                    
                    // 🛡️ SAFE: Use nullish coalescing and default values
                    const totalQty = po.totalQuantity ?? 0;
                    const deliveredQty = po.deliveredQuantity ?? 0;
                    const percentage = totalQty > 0 ? Math.round((deliveredQty / totalQty) * 100) : 0;
                    
                    // Determine status display text
                    const statusDisplay = po.status ? po.status.charAt(0).toUpperCase() + po.status.slice(1) : 'Unknown';
                    
                    return (
                      <option 
                        key={po._id} 
                        value={po._id}
                        disabled={po.status === 'completed' || po.status === 'cancelled'}
                      >
                        {po.poNumber} - {customer?.name || 'N/A'} | {part?.name || 'N/A'} | {deliveredQty.toLocaleString()}/{totalQty.toLocaleString()} pcs ({percentage}%) - {statusDisplay}
                      </option>
                    );
                  }).filter(Boolean)}
                </select>
                {/* Show selected PO details */}
                {watchedPoId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                  >
                    {(() => {
                      const selectedPo = purchaseOrders.find((po) => po._id === watchedPoId);
                      if (!selectedPo) return <p className="text-gray-500">PO tidak ditemukan</p>;
                      
                      const part = parts.find((p: Part) => p._id === selectedPo.partId);
                      const customer = part ? customers.find((c: Customer) => c._id === part.customerId) : null;
                      
                      // 🛡️ SAFE: Use nullish coalescing and default values
                      const totalQty = selectedPo.totalQuantity ?? 0;
                      const deliveredQty = selectedPo.deliveredQuantity ?? 0;
                      const percentage = totalQty > 0 ? Math.round((deliveredQty / totalQty) * 100) : 0;
                      
                      return (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">PO Details:</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-semibold",
                              selectedPo.status === 'open' ? 'bg-green-100 text-green-700' :
                              selectedPo.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                              selectedPo.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            )}>
                              {selectedPo.status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </div>
                          <div className="text-gray-700">
                            <strong>Customer:</strong> {customer?.name || 'N/A'}
                          </div>
                          <div className="text-gray-700">
                            <strong>Part:</strong> {part?.name || 'N/A'} ({part?.internalPartNo || 'N/A'})
                          </div>
                          <div className="text-gray-700">
                            <strong>Total Order:</strong> {totalQty.toLocaleString()} pcs
                          </div>
                          <div className="text-gray-700">
                            <strong>Delivered:</strong> {deliveredQty.toLocaleString()} pcs
                          </div>
                          <div className="text-gray-700">
                            <strong>Remaining:</strong> <span className="font-semibold text-blue-600">{(totalQty - deliveredQty).toLocaleString()} pcs</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 text-right">
                            {percentage}% completed
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
                <AnimatePresence>
                  {errors.poId && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      id="poId-error" 
                      className="text-sm text-red-600 flex items-center" 
                      role="alert"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.poId.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Quantity */}
              <motion.div 
                className="space-y-2"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <label htmlFor="quantity" className="block text-sm font-semibold text-gray-700">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  id="quantity"
                  type="number"
                  {...register('quantity', { required: 'Quantity harus diisi', min: { value: 1, message: 'Minimal 1' } })}
                  className={cn(
                    'block w-full rounded-lg border-2 shadow-sm focus:ring-blue-500 transition-all duration-200',
                    errors.quantity ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  )}
                  placeholder="500"
                />
                <AnimatePresence>
                  {errors.quantity && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm text-red-600 flex items-center" 
                      role="alert"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.quantity.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Lot ID and Copies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div 
                  className="space-y-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <label htmlFor="lotId" className="block text-sm font-semibold text-gray-700">
                    Lot ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lotId"
                    type="text"
                    {...register('lotId', { required: 'Lot ID harus diisi' })}
                    className={cn(
                      'block w-full rounded-lg border-2 shadow-sm focus:ring-blue-500 transition-all duration-200',
                      errors.lotId ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    )}
                    placeholder="LOT-A-003"
                  />
                  <AnimatePresence>
                    {errors.lotId && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-red-600 flex items-center" 
                        role="alert"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {errors.lotId.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <label htmlFor="copies" className="block text-sm font-semibold text-gray-700">
                    Copies
                  </label>
                  <input
                    id="copies"
                    type="number"
                    {...register('copies', { valueAsNumber: true, min: { value: 1, message: 'Minimal 1' } })}
                    className={cn(
                      'block w-full rounded-lg border-2 shadow-sm focus:ring-blue-500 transition-all duration-200',
                      errors.copies ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    )}
                    placeholder="1"
                  />
                  <AnimatePresence>
                    {errors.copies && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-red-600 flex items-center" 
                        role="alert"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {errors.copies.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Gate ID */}
              <motion.div 
                className="space-y-2"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <label htmlFor="gateId" className="block text-sm font-semibold text-gray-700">
                  Gate ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="gateId"
                  type="text"
                  {...register('gateId', { required: 'Gate ID harus diisi' })}
                  className={cn(
                    'block w-full rounded-lg border-2 shadow-sm focus:ring-blue-500 transition-all duration-200',
                    errors.gateId ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  )}
                  placeholder="GATE-01"
                />
                <AnimatePresence>
                  {errors.gateId && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm text-red-600 flex items-center" 
                      role="alert"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {errors.gateId.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Action Buttons */}
              <motion.div 
                className="flex gap-3 pt-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  whileHover={{ scale: isSubmitting || !isValid ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting || !isValid ? 1 : 0.98 }}
                  className={cn(
                    "flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white transition-all duration-200",
                    isSubmitting || !isValid 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-5 w-5 mr-2" />
                      Tambah ke Inventory
                    </>
                  )}
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    reset();
                    setFeedback(null);
                    toast.success('Form berhasil direset');
                  }}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors group"
                  title="Reset Form"
                >
                  <RotateCcw className="h-5 w-5 text-gray-600 group-hover:rotate-180 transition-transform duration-300" />
                </motion.button>
              </motion.div>
            </form>
          </div>

          {/* Right Column - QR Scanner & Info */}
          <div className="space-y-6">
            {/* QR Scanner */}
            <motion.div 
              className="bg-white rounded-xl shadow-sm p-6"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* ...existing QR scanner code with animations... */}
            </motion.div>

            {/* Quick Info */}
            <motion.div 
              className="bg-blue-50 rounded-xl p-6"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-3">💡 Tips Penggunaan</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <motion.li 
                  className="flex items-start"
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  Pilih Customer terlebih dahulu
                </motion.li>
                <motion.li 
                  className="flex items-start"
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  Pastikan Part dan PO sesuai
                </motion.li>
                <motion.li 
                  className="flex items-start"
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  Masukkan quantity dengan benar
                </motion.li>
                <motion.li 
                  className="flex items-start"
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  QR Code akan otomatis dibuat
                </motion.li>
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Feedback Messages */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                "rounded-xl p-6 shadow-lg border",
                feedback.type === 'success' 
                  ? 'bg-green-50 border-green-200'
                  : feedback.type === 'error'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {feedback.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 mr-2" />}
                    {feedback.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />}
                    {feedback.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />}
                    <h3 className={cn(
                      "font-bold",
                      feedback.type === 'success' ? 'text-green-800' : 
                      feedback.type === 'error' ? 'text-red-800' : 'text-yellow-800'
                    )}>
                      {feedback.title}
                    </h3>
                  </div>
                  <p className={cn(
                    "whitespace-pre-line",
                    feedback.type === 'success' ? 'text-green-700' : 
                    feedback.type === 'error' ? 'text-red-700' : 'text-yellow-700'
                  )}>
                    {feedback.message}
                  </p>
                </div>
                
                {feedback.qrCodeUrl && (
                  <motion.div 
                    className="ml-6 text-center"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                  >
                    <img 
                      src={feedback.qrCodeUrl} 
                      alt="QR Code" 
                      className="w-32 h-32 border-2 border-gray-300 rounded-lg mb-3 shadow-sm"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={downloadQRCode}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg flex items-center mx-auto transition-colors shadow-sm"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download QR
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={printQRCode}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg flex items-center mx-auto transition-colors shadow-sm mt-2"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print QR
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ScanIn;