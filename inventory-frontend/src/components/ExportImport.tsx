import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx-js-style';
import Papa from 'papaparse';

const ExportImport: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.loading('Mengekspor data ke Excel...', { id: 'export' });

      const response = await api.post('/inventory/export-import', {
        action: 'export',
        format: 'excel'
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Data berhasil diekspor ke Excel!', { id: 'export' });
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Gagal ekspor: ${error.response?.data?.message || error.message}`, { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      toast.loading('Mengekspor data ke CSV...', { id: 'export' });

      const response = await api.post('/inventory/export-import', {
        action: 'export',
        format: 'csv'
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Data berhasil diekspor ke CSV!', { id: 'export' });
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Gagal ekspor: ${error.response?.data?.message || error.message}`, { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  // Download Template
  const handleDownloadTemplate = async () => {
    try {
      toast.loading('Mengunduh template...', { id: 'template' });

      const response = await api.get('/inventory/export-import', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Template berhasil diunduh!', { id: 'template' });
    } catch (error: any) {
      console.error('Download template error:', error);
      toast.error(`Gagal download template: ${error.message}`, { id: 'template' });
    }
  };

  // Import from File
  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportResults(null);
      toast.loading('Memproses file import...', { id: 'import' });

      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      let data: any[] = [];

      if (fileExtension === 'csv') {
        // Parse CSV
        Papa.parse(file, {
          header: true,
          complete: async (results) => {
            data = results.data;
            await processImport(data);
          },
          error: (error) => {
            toast.error(`Error parsing CSV: ${error.message}`, { id: 'import' });
            setIsImporting(false);
          }
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const binaryStr = e.target?.result;
            const workbook = XLSX.read(binaryStr, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(worksheet);
            await processImport(data);
          } catch (error: any) {
            toast.error(`Error parsing Excel: ${error.message}`, { id: 'import' });
            setIsImporting(false);
          }
        };
        reader.readAsBinaryString(file);
      } else {
        toast.error('Format file tidak didukung. Gunakan .xlsx atau .csv', { id: 'import' });
        setIsImporting(false);
      }

      // Reset file input
      event.target.value = '';

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Gagal import: ${error.message}`, { id: 'import' });
      setIsImporting(false);
    }
  };

  const processImport = async (data: any[]) => {
    try {
      const response = await api.post('/inventory/export-import', {
        action: 'import',
        data
      });

      if (response.data.success) {
        const results = response.data.data;
        setImportResults(results);
        
        if (results.failed === 0) {
          toast.success(`Berhasil import ${results.success} item!`, { id: 'import' });
        } else {
          toast.success(`Import selesai: ${results.success} berhasil, ${results.failed} gagal`, { id: 'import' });
        }
      } else {
        toast.error(response.data.message, { id: 'import' });
      }
    } catch (error: any) {
      console.error('Process import error:', error);
      toast.error(`Gagal import: ${error.response?.data?.message || error.message}`, { id: 'import' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Export / Import Data</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Download className="h-5 w-5 mr-2 text-blue-600" />
            Export Data
          </h2>
          <p className="text-gray-600 mb-4">
            Ekspor semua data inventory ke format Excel atau CSV untuk backup atau analisis lebih lanjut.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="w-full flex items-center justify-center px-4 py-3 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              {isExporting ? 'Mengekspor...' : 'Export ke Excel (.xlsx)'}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="h-5 w-5 mr-2" />
              {isExporting ? 'Mengekspor...' : 'Export ke CSV'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Tips:</strong> Data yang diekspor mencakup semua informasi inventory termasuk QR Code, Barcode, Lokasi, dan History.
            </p>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2 text-purple-600" />
            Import Data
          </h2>
          <p className="text-gray-600 mb-4">
            Import data inventory dari file Excel atau CSV. Pastikan format file sesuai dengan template.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Template
            </button>

            <label className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow cursor-pointer transition-colors">
              <Upload className="h-5 w-5 mr-2" />
              {isImporting ? 'Mengimport...' : 'Import File'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFile}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Perhatian:</strong> Pastikan Part Number dan PO Number sudah terdaftar di sistem sebelum import.
            </p>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Hasil Import</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-green-800 font-medium">Berhasil</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600 mt-2">{importResults.success}</p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-red-800 font-medium">Gagal</span>
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600 mt-2">{importResults.failed}</p>
            </div>
          </div>

          {importResults.errors.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Details:</h3>
              <div className="max-h-60 overflow-y-auto bg-red-50 rounded-lg p-4">
                {importResults.errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-700 mb-1">
                    {index + 1}. {error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Panduan Penggunaan</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">📤 Export Data</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Pilih format export (Excel atau CSV)</li>
              <li>File akan otomatis terdownload</li>
              <li>Data mencakup semua field inventory</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">📥 Import Data</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Download template terlebih dahulu</li>
              <li>Isi data sesuai format template</li>
              <li>Field wajib: partNumber, poNumber, quantity</li>
              <li>Upload file yang sudah diisi</li>
              <li>Sistem akan validasi dan tampilkan hasil</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">⚠️ Catatan Penting</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Backup data secara berkala</li>
              <li>Pastikan data yang diimport sudah valid</li>
              <li>Part Number dan PO Number harus sudah terdaftar</li>
              <li>Barcode akan digenerate otomatis jika tidak diisi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportImport;
