import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Search, Loader, CheckCircle, AlertCircle, Barcode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import JsBarcode from 'jsbarcode';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api';

interface BarcodeScannerProps {
  onScanSuccess?: (barcode: string, item: any) => void;
  onClose?: () => void;
  mode?: 'scan' | 'lookup';
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScanSuccess: onScanSuccessCallback, 
  onClose
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize scanner
  useEffect(() => {
    if (scanMode === 'camera') {
      initScanner();
    }
    return () => {
      stopScanner();
    };
  }, [scanMode]);

  const initScanner = async () => {
    try {
      setError('');
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
          0, // All 1D barcode formats (CODE_128, CODE_39, EAN_13, etc.)
        ]
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        handleScanSuccess,
        handleScanError
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Scanner initialization error:', err);
      setError('Tidak dapat mengakses kamera. Gunakan mode manual.');
      setScanMode('manual');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    console.log('Barcode scanned:', decodedText);
    await handleBarcodeDetected(decodedText);
  };

  const handleScanError = (_error: any) => {
    // Silent error handling for continuous scanning
  };

  const handleBarcodeDetected = async (barcode: string) => {
    try {
      setIsSearching(true);
      setError('');
      
      // Stop scanning temporarily
      if (scannerRef.current && isScanning) {
        await stopScanner();
      }

      // Search item by barcode
      const response = await api.get(`/api/inventory/items?search=${barcode}`);
      
      if (response.data.success && response.data.data.items.length > 0) {
        const item = response.data.data.items[0];
        setScannedItem(item);
        toast.success(`Item ditemukan: ${item.uniqueId}`);
        
        if (onScanSuccessCallback) {
          onScanSuccessCallback(barcode, item);
        }
      } else {
        setError('Item dengan barcode ini tidak ditemukan');
        toast.error('Item tidak ditemukan');
        
        // Resume scanning after 2 seconds
        setTimeout(() => {
          if (scanMode === 'camera') {
            initScanner();
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error('Lookup error:', err);
      setError(err.response?.data?.message || 'Terjadi kesalahan saat mencari item');
      toast.error('Gagal mencari item');
      
      // Resume scanning
      setTimeout(() => {
        if (scanMode === 'camera') {
          initScanner();
        }
      }, 2000);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) {
      toast.error('Masukkan barcode');
      return;
    }
    await handleBarcodeDetected(manualBarcode.trim());
  };

  const generateBarcodePreview = (value: string) => {
    if (!barcodeCanvasRef.current || !value) return;
    
    try {
      JsBarcode(barcodeCanvasRef.current, value, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true
      });
    } catch (err) {
      console.error('Barcode generation error:', err);
    }
  };

  useEffect(() => {
    if (manualBarcode) {
      generateBarcodePreview(manualBarcode);
    }
  }, [manualBarcode]);

  const handleReset = () => {
    setScannedItem(null);
    setError('');
    setManualBarcode('');
    if (scanMode === 'camera') {
      initScanner();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Barcode className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Barcode Scanner</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                stopScanner();
                setScanMode('camera');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                scanMode === 'camera'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Camera className="h-4 w-4 inline mr-2" />
              Scan dengan Kamera
            </button>
            <button
              onClick={() => {
                stopScanner();
                setScanMode('manual');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                scanMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Search className="h-4 w-4 inline mr-2" />
              Input Manual
            </button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="p-4">
          {scanMode === 'camera' ? (
            <div>
              <div 
                id="barcode-reader" 
                className="w-full rounded-lg overflow-hidden bg-gray-900"
                style={{ minHeight: '300px' }}
              />
              {isScanning && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Arahkan kamera ke barcode untuk scan otomatis
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <form onSubmit={handleManualSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Masukkan Barcode
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      placeholder="Ketik atau scan barcode..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isSearching || !manualBarcode.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSearching ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <Search className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Barcode Preview */}
                {manualBarcode && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Preview Barcode:</p>
                    <div className="flex justify-center">
                      <canvas ref={barcodeCanvasRef} />
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600">
              <Loader className="h-5 w-5 animate-spin" />
              <span>Mencari item...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Scanned Item Display */}
          {scannedItem && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Item Ditemukan!
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Unique ID:</span>
                        <p className="text-gray-900">{scannedItem.uniqueId}</p>
                      </div>
                      <div>
                        <span className="font-medium">Part Name:</span>
                        <p className="text-gray-900">{scannedItem.partId?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Quantity:</span>
                        <p className="text-gray-900">{scannedItem.quantity}</p>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          scannedItem.status === 'IN' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {scannedItem.status}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">LOT ID:</span>
                        <p className="text-gray-900">{scannedItem.lotId}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Scan Lagi
                    </button>
                    {onClose && (
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Tutup
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {!scannedItem && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Petunjuk:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Camera Mode:</strong> Arahkan kamera ke barcode untuk scan otomatis</li>
              <li>• <strong>Manual Mode:</strong> Ketik atau scan barcode menggunakan barcode scanner USB</li>
              <li>• Format barcode yang didukung: CODE128, EAN13, UPC, dan lainnya</li>
              <li>• Pastikan pencahayaan cukup untuk hasil terbaik</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;
