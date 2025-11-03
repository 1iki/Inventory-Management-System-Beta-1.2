import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, ScanLine, RotateCcw, X, WifiOff, Info } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanOutApi, getScanOutPreviewApi, handleApiError } from '../lib/api';
import { useInventoryStore } from '../store/inventory';
import toast from 'react-hot-toast';

interface ScanOutFormData { 
  qrCodeData: string;
  notes?: string;
}

interface ItemPreview {
  uniqueId: string;
  quantity: number;
  status: string;
  lotId: string;
  gateId: string;
  part: {
    name: string;
    internalPartNo: string;
  };
  customer: {
    name: string;
  };
  canScanOut: boolean;
}

const ScanOut: React.FC = () => {
  const { currentUser } = useInventoryStore();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string; } | null>(null);
  const [itemPreview, setItemPreview] = useState<ItemPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef<boolean>(false);
  const [canTorch, setCanTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ScanOutFormData>();
  const watchedQrCodeData = watch('qrCodeData');

  // Simple beep using Web Audio API
  const beep = () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
      setTimeout(() => { osc.stop(); ctx.close?.(); }, 150);
    } catch {
      // ignore
    }
  };

  const applyTorch = async (on: boolean) => {
    const track = videoTrackRef.current;
    if (!track) return;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: on }] });
      setTorchOn(on);
    } catch {
      // some devices/browsers may fail
    }
  };

  // Load item preview when QR code data changes
  useEffect(() => {
    const loadPreview = async () => {
      if (!watchedQrCodeData || watchedQrCodeData.length < 5) {
        setItemPreview(null);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const response = await getScanOutPreviewApi(watchedQrCodeData);
        if (response.data.success) {
          setItemPreview(response.data.data);
          setFeedback(null);
        }
      } catch (error) {
        console.error('Preview error:', error);
        setItemPreview(null);
        // Don't show error for preview failures as user might still be typing
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const debounceTimer = setTimeout(loadPreview, 500);
    return () => clearTimeout(debounceTimer);
  }, [watchedQrCodeData]);

  // Discover cameras on mount and watch online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    Html5Qrcode.getCameras().then((devices) => {
      const mapped = devices.map(d => ({ id: d.id, label: d.label || 'Kamera' }));
      setCameras(mapped);
      const back = mapped.find(d => /back|rear|environment/i.test(d.label));
      setSelectedCameraId((back || mapped[0])?.id || null);
    }).catch(() => {
      // ignore; will show error on start
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setFeedback(null);
    if (!isOnline) {
      setFeedback({ type: 'warning', title: 'Offline', message: 'Scan OUT memerlukan koneksi internet. Silakan terhubung lalu coba lagi.' });
      return;
    }

    try {
      if (html5QrRef.current) {
        await html5QrRef.current.stop();
        await html5QrRef.current.clear();
        html5QrRef.current = null;
      }

      html5QrRef.current = new Html5Qrcode('qr-reader');
      setIsScanning(true);
      hasScannedRef.current = false;
      setCanTorch(false);
      setTorchOn(false);

      await html5QrRef.current.start(
        selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          beep();
          setValue('qrCodeData', decodedText);
          stopScanner();
        },
        () => { /* ignore frame decode errors */ }
      );

      // Detect torch capability
      const videoEl = document.querySelector('#qr-reader video') as HTMLVideoElement | null;
      const track = videoEl && (videoEl.srcObject as MediaStream | null)?.getVideoTracks()?.[0];
      if (track) {
        videoTrackRef.current = track;
        const getCaps = (track as any).getCapabilities?.bind(track);
        const caps = getCaps ? getCaps() : undefined;
        if (caps && Object.prototype.hasOwnProperty.call(caps, 'torch')) {
          setCanTorch(true);
          try { await (track as any).applyConstraints({ advanced: [{ torch: false }] }); } catch {}
        }
      }
    } catch (err: unknown) {
      setIsScanning(false);
      const msg = (err as Error)?.message || String(err);
      if (/NotAllowedError|Permission|denied/i.test(msg)) {
        setFeedback({ type: 'error', title: 'Izin Kamera Ditolak', message: 'Berikan izin kamera pada browser untuk melanjutkan pemindaian.' });
      } else if (/NotFoundError|no camera|no input device/i.test(msg)) {
        setFeedback({ type: 'error', title: 'Kamera Tidak Ditemukan', message: 'Tidak ada perangkat kamera yang tersedia.' });
      } else {
        setFeedback({ type: 'error', title: 'Gagal Memulai Kamera', message: 'Terjadi kesalahan saat mengakses kamera. Coba ulang atau ganti perangkat.' });
      }
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrRef.current) {
        await html5QrRef.current.stop();
        await html5QrRef.current.clear();
        html5QrRef.current = null;
      }
      try { await applyTorch(false); } catch {}
      videoTrackRef.current = null;
      setCanTorch(false);
      setTorchOn(false);
      hasScannedRef.current = false;
    } catch {
      // ignore
    } finally {
      setIsScanning(false);
    }
  };

  const onSubmit = async (data: ScanOutFormData) => {
    if (!currentUser) {
      setFeedback({ type: 'error', title: 'ERROR', message: 'User tidak ditemukan. Silakan login ulang.' });
      return;
    }

    if (!isOnline) {
      setFeedback({ type: 'warning', title: 'Offline', message: 'Scan OUT memerlukan koneksi internet.' });
      return;
    }

    // Check preview first
    if (itemPreview && !itemPreview.canScanOut) {
      setFeedback({ 
        type: 'warning', 
        title: 'Tidak Dapat Scan Out', 
        message: `Item '${itemPreview.uniqueId}' dengan status '${itemPreview.status}' tidak dapat di-scan out.` 
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await scanOutApi({
        qrCodeData: data.qrCodeData,
        notes: data.notes
      });

      if (response.data.success) {
        const result = response.data.data;
        
        setFeedback({
          type: 'success',
          title: 'SUKSES',
          message: `Item '${result.item.uniqueId}' berhasil di-scan OUT.\nPart: ${result.part.name}\nCustomer: ${result.customer.name}\nQuantity: ${result.item.quantity.toLocaleString('id-ID')}\nStatus: ${result.item.status}`
        });

        // Reset form
        reset();
        setItemPreview(null);
        
        toast.success(`Item ${result.item.uniqueId} berhasil di-scan OUT`);
      }
    } catch (error) {
      const errorMessage = handleApiError(error, 'Terjadi kesalahan saat memproses scan OUT');
      setFeedback({ type: 'error', title: 'ERROR', message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Scan OUT</h1>

      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
        {/* Online requirement */}
        {!isOnline && (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 flex items-center">
            <WifiOff className="h-4 w-4 mr-2" />
            Anda sedang offline. Sambungkan internet untuk menggunakan kamera dan memproses Scan OUT.
          </div>
        )}

        {/* Camera controls */}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-4">Arahkan QR Code ke kamera atau ketik data QR Code manual.</p>

          {!isScanning ? (
            <div className="w-full rounded-lg border-2 border-dashed border-gray-300 mb-4 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px] text-left">
                  <label className="block text-xs text-gray-600 mb-1">Pilih Kamera</label>
                  <select
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={selectedCameraId || ''}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    disabled={!cameras.length}
                  >
                    {!cameras.length && <option value="">Mencari perangkat kamera...</option>}
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={startScanner}
                  disabled={!isOnline}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow flex items-center ${!isOnline ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Mulai Scan QR Code
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div id="qr-reader" className="w-full" />
              {canTorch && (
                <button
                  onClick={() => applyTorch(!torchOn)}
                  className={`absolute top-2 left-2 ${torchOn ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-700 hover:bg-gray-800'} text-white px-3 py-1.5 rounded-lg shadow`}
                  title={torchOn ? 'Matikan Flash' : 'Nyalakan Flash'}
                >
                  {torchOn ? 'Flash ON' : 'Flash OFF'}
                </button>
              )}
              <button
                onClick={stopScanner}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg"
                title="Stop Scanner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Manual Input Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="text-left">
          <div className="mb-4">
            <label htmlFor="qrCodeData" className="block text-sm font-medium text-gray-700 mb-2">
              <ScanLine className="inline h-4 w-4 mr-1" />
              Input Manual QR Code Data:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Data QR Code atau Unique ID"
                {...register('qrCodeData', { 
                  required: 'QR Code data harus diisi',
                  minLength: { value: 3, message: 'QR Code data minimal 3 karakter' }
                })}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => { reset(); setItemPreview(null); }}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                title="Reset Form"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            {errors.qrCodeData && (
              <p className="mt-1 text-sm text-red-600">{errors.qrCodeData.message}</p>
            )}
          </div>

          {/* Item Preview */}
          {isLoadingPreview && (
            <div className="mb-4 p-3 bg-gray-50 border rounded-lg">
              <p className="text-sm text-gray-600">Memuat preview item...</p>
            </div>
          )}

          {itemPreview && (
            <div className={`mb-4 p-4 border rounded-lg ${itemPreview.canScanOut ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">Preview Item</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">ID:</span> {itemPreview.uniqueId}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                        itemPreview.status === 'IN' ? 'bg-green-100 text-green-800' :
                        itemPreview.status === 'OUT' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {itemPreview.status}
                      </span>
                    </div>
                    <div><span className="font-medium">Part:</span> {itemPreview.part.name}</div>
                    <div><span className="font-medium">Customer:</span> {itemPreview.customer.name}</div>
                    <div><span className="font-medium">Quantity:</span> {itemPreview.quantity.toLocaleString('id-ID')}</div>
                    <div><span className="font-medium">Lot ID:</span> {itemPreview.lotId}</div>
                  </div>
                  {!itemPreview.canScanOut && (
                    <p className="mt-2 text-sm text-red-600 font-medium">
                      Item ini tidak dapat di-scan OUT dengan status saat ini.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes field */}
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Catatan (Opsional):
            </label>
            <textarea
              rows={3}
              placeholder="Tambahkan catatan untuk scan out ini..."
              {...register('notes')}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (itemPreview !== null && !itemPreview.canScanOut)}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ScanLine className="h-5 w-5 mr-2" />
            {isSubmitting ? 'Memproses...' : 'Proses Scan OUT'}
          </button>
        </form>

        {/* Feedback Messages */}
        {feedback && (
          <div className={`mt-4 p-4 rounded-lg text-left ${
            feedback.type === 'success' 
              ? 'bg-green-100 border-l-4 border-green-500 text-green-700'
              : feedback.type === 'error'
              ? 'bg-red-100 border-l-4 border-red-500 text-red-700'
              : 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700'
          }`}>
            <p className="font-bold">{feedback.title}</p>
            <p className="whitespace-pre-line">{feedback.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanOut;