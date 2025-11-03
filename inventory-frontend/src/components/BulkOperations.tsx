import React, { useState } from 'react';
import { CheckSquare, Square, Download, Upload, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { useInventoryStore } from '../store/inventory';
import { format } from 'date-fns';
import * as XLSX from 'xlsx-js-style';

interface BulkOperationsProps {
  selectedItems: string[];
  onSelectAll: (selectAll: boolean) => void;
  onBulkOperation: (operation: string, items: string[] | any) => void;
  items: any[];
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedItems,
  onSelectAll,
  onBulkOperation,
  items
}) => {
  const { currentUser } = useInventoryStore();
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<string>('');
  const [bulkUpdateData, setBulkUpdateData] = useState({
    status: '',
    location: {
      warehouse: '',
      zone: '',
      rack: '',
      position: ''
    },
    notes: ''
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const allSelected = selectedItems.length === items.length && items.length > 0;
  const someSelected = selectedItems.length > 0 && selectedItems.length < items.length;

  const handleSelectAll = () => {
    onSelectAll(!allSelected);
  };

  const handleBulkExport = () => {
    if (selectedItems.length === 0) {
      alert('Pilih item yang akan diekspor');
      return;
    }

    const selectedData = items.filter(item => selectedItems.includes(item._id));
    const exportData = selectedData.map(item => ({
      'ID Unik': item.uniqueId,
      'Status': item.status,
      'Quantity': item.quantity,
      'LOT ID': item.lotId,
      'Gate ID': item.gateId,
      'Lokasi Warehouse': item.location?.warehouse || '',
      'Lokasi Zone': item.location?.zone || '',
      'Lokasi Rack': item.location?.rack || '',
      'Lokasi Position': item.location?.position || '',
      'Tanggal Dibuat': format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm'),
      'Dibuat Oleh': item.createdBy.username,
      'Terakhir Update': format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm')
    }));

    // Create Excel file with styling
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Add styling to headers
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center" }
      };
    }

    // Set column widths
    ws['!cols'] = [
      { width: 15 }, // ID Unik
      { width: 10 }, // Status
      { width: 10 }, // Quantity
      { width: 15 }, // LOT ID
      { width: 15 }, // Gate ID
      { width: 15 }, // Warehouse
      { width: 12 }, // Zone
      { width: 12 }, // Rack
      { width: 12 }, // Position
      { width: 20 }, // Tanggal Dibuat
      { width: 15 }, // Dibuat Oleh
      { width: 20 }  // Terakhir Update
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Export Data');
    const filename = `bulk_export_${selectedItems.length}_items_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleBulkImport = async () => {
    if (!importFile) {
      alert('Pilih file Excel untuk diimpor');
      return;
    }

    setIsProcessing(true);
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Process imported data
      console.log('Imported data:', jsonData);
      
      // Validate and process each row
      const processedData = jsonData.map((row: any) => ({
        uniqueId: row['ID Unik'],
        status: row['Status'],
        quantity: parseInt(row['Quantity']) || 0,
        lotId: row['LOT ID'],
        gateId: row['Gate ID'],
        location: {
          warehouse: row['Lokasi Warehouse'] || '',
          zone: row['Lokasi Zone'] || '',
          rack: row['Lokasi Rack'] || '',
          position: row['Lokasi Position'] || ''
        }
      }));

      // Call bulk operation with proper data structure
      onBulkOperation('import', { items: processedData });
      
      alert(`Berhasil mengimpor ${processedData.length} item`);
      setImportFile(null);
    } catch (error) {
      console.error('Import error:', error);
      alert('Gagal mengimpor file. Pastikan format file benar.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUpdate = () => {
    if (selectedItems.length === 0) {
      alert('Pilih item yang akan diupdate');
      return;
    }

    setPendingOperation('update');
    setIsOperationModalOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) {
      alert('Pilih item yang akan dihapus');
      return;
    }

    setPendingOperation('delete');
    setIsOperationModalOpen(true);
  };

  const confirmBulkOperation = () => {
    if (pendingOperation === 'update') {
      onBulkOperation('update', { items: selectedItems, data: bulkUpdateData });
    } else if (pendingOperation === 'delete') {
      onBulkOperation('delete', selectedItems);
    }

    setIsOperationModalOpen(false);
    setPendingOperation('');
    setBulkUpdateData({
      status: '',
      location: { warehouse: '', zone: '', rack: '', position: '' },
      notes: ''
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : someSelected ? (
                <div className="h-4 w-4 bg-blue-600 rounded border-2 border-blue-600 flex items-center justify-center">
                  <div className="h-1 w-2 bg-white"></div>
                </div>
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span className="ml-2">
                {selectedItems.length > 0 
                  ? `${selectedItems.length} item dipilih`
                  : 'Pilih semua'
                }
              </span>
            </button>

            {selectedItems.length > 0 && (
              <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Mode Bulk Operations Aktif
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500">
            Total: {items.length} item
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-wrap gap-2">
              {/* Export Button */}
              {canPerformOperation('export') && (
                <button
                  onClick={handleBulkExport}
                  className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span className="ml-2">Export ({selectedItems.length})</span>
                </button>
              )}

              {/* Update Button */}
              {canPerformOperation('update') && (
                <button
                  onClick={handleBulkUpdate}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="ml-2">Update ({selectedItems.length})</span>
                </button>
              )}

              {/* Delete Button */}
              {canPerformOperation('delete') && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2">Delete ({selectedItems.length})</span>
                </button>
              )}
            </div>

            {/* Import Section */}
            {canPerformOperation('import') && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Upload className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">Bulk Import</div>
                      <div className="text-xs text-gray-600">Upload file Excel untuk update massal</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <button
                      onClick={handleBulkImport}
                      disabled={!importFile || isProcessing}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Import'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Operation Modal */}
      {isOperationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {pendingOperation === 'update' ? 'Bulk Update' : 'Bulk Delete'}
              </h3>
              <button
                onClick={() => setIsOperationModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {pendingOperation === 'update' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={bulkUpdateData.status}
                    onChange={(e) => setBulkUpdateData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tidak diubah</option>
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                    <input
                      type="text"
                      value={bulkUpdateData.location.warehouse}
                      onChange={(e) => setBulkUpdateData(prev => ({
                        ...prev,
                        location: { ...prev.location, warehouse: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Warehouse"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                    <input
                      type="text"
                      value={bulkUpdateData.location.zone}
                      onChange={(e) => setBulkUpdateData(prev => ({
                        ...prev,
                        location: { ...prev.location, zone: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Zone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                  <textarea
                    value={bulkUpdateData.notes}
                    onChange={(e) => setBulkUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Catatan untuk perubahan ini..."
                  />
                </div>
              </div>
            )}

            {pendingOperation === 'delete' && (
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Apakah Anda yakin ingin menghapus <strong>{selectedItems.length}</strong> item yang dipilih?
                </p>
                <p className="text-sm text-red-600">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsOperationModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Batal
              </button>
              <button
                onClick={confirmBulkOperation}
                className={`px-4 py-2 rounded-lg text-white ${
                  pendingOperation === 'delete' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {pendingOperation === 'update' ? 'Update Item' : 'Hapus Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  function canPerformOperation(operation: string) {
    if (!currentUser) return false;
    
    switch (operation) {
      case 'export':
        return true; // All users can export
      case 'import':
        return ['admin', 'manager', 'direktur'].includes(currentUser.role);
      case 'update':
        return ['admin', 'manager', 'direktur'].includes(currentUser.role);
      case 'delete':
        return ['admin', 'direktur'].includes(currentUser.role);
      default:
        return false;
    }
  }
};

export default BulkOperations;