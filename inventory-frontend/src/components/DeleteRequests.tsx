import React, { useEffect } from 'react';
import { Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useInventoryStore } from '../store/inventory';
import type { InventoryItem, Part, Customer } from '../types';

const DeleteRequests: React.FC = () => {
  const { 
    inventoryItems, 
    parts, 
    customers,
    currentUser,
    fetchDeleteRequests,
    approveDeleteRequest,
    rejectDeleteRequest,
    addAuditLog,
  } = useInventoryStore();

  useEffect(() => {
    fetchDeleteRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter items with pending delete requests
  const deleteRequests = inventoryItems.filter((item: InventoryItem) => item.status === 'PENDING_DELETE');

  const handleApproveDelete = async (itemId: string) => {
    if (!currentUser) return;
    
    await approveDeleteRequest(itemId);
    addAuditLog({ 
      userId: currentUser.id,
      username: currentUser.username, 
      action: 'DELETE_APPROVED', 
      details: `Penghapusan item '${itemId}' disetujui.` 
    });
  };

  const handleRejectDelete = async (itemId: string) => {
    if (!currentUser) return;
    
    await rejectDeleteRequest(itemId);
    addAuditLog({ 
      userId: currentUser.id,
      username: currentUser.username, 
      action: 'DELETE_REJECTED', 
      details: `Penghapusan item '${itemId}' ditolak.` 
    });
  };

  if (deleteRequests.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Persetujuan Hapus</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <Trash2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada permintaan penghapusan</h3>
          <p className="text-gray-600">Saat ini tidak ada permintaan penghapusan data yang perlu disetujui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Persetujuan Hapus</h1>
      
      <div className="space-y-4">
        {deleteRequests.map((item: InventoryItem) => {
          const part = parts.find((p: Part) => p._id === item.partId);
          const customer = part ? customers.find((c: Customer) => c._id === part.customerId) : null;
          
          return (
            <div key={item._id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-400">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">
                      Permintaan Penghapusan Item
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">ID Unik</p>
                      <p className="text-sm text-gray-900 font-mono">{item.uniqueId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Nama Part</p>
                      <p className="text-sm text-gray-900">{part?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Customer</p>
                      <p className="text-sm text-gray-900">{customer?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Quantity</p>
                      <p className="text-sm text-gray-900">{item.quantity.toLocaleString('id-ID')} pcs</p>
                    </div>
                  </div>
                  
                  {item.deleteRequest && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Detail Permintaan</p>
                      <p className="text-sm text-gray-900 mb-2">
                        <span className="font-medium">Diminta oleh:</span> {item.deleteRequest.username}
                      </p>
                      <p className="text-sm text-gray-900 mb-2">
                        <span className="font-medium">Waktu:</span> {format(new Date(item.deleteRequest.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </p>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Alasan:</span> {item.deleteRequest.reason}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => handleApproveDelete(item._id)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Setujui
                  </button>
                  <button
                    onClick={() => handleRejectDelete(item._id)}
                    className="flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Tolak
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeleteRequests;