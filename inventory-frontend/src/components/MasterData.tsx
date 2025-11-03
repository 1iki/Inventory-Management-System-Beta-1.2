import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Database, Users, Building, X, AlertTriangle, FileText, Download } from 'lucide-react';
import { useInventoryStore } from '../store/inventory';
import { useForm } from 'react-hook-form';
import type { Customer, Part, PurchaseOrder } from '../types';
import toast from 'react-hot-toast';
import { 
  createPartApi, 
  updatePartApi, 
  deletePartApi,
  createCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
  createPurchaseOrderApi,
  updatePurchaseOrderApi,
  deletePurchaseOrderApi,
  handleApiError
} from '../lib/api';
import { 
  exportPartsToExcel,
  exportCustomersToExcel,
  exportPurchaseOrdersToExcel
} from '../lib/excelExport';

interface PartFormData {
  name: string;
  internalPartNo: string;
  customerId: string;
  supplierId: string;
  supplierPartNumber: string;
  supplierDescription: string;
  poNumber?: string;
  description?: string;
  weight?: number;
  dimensions?: string;
  material?: string;
}

interface CustomerFormData {
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

interface POFormData {
  poNumber: string;
  partId: string;
  customerId: string;
  totalQuantity: number;
  status: 'open' | 'closed' | 'partial'; // Add 'partial' to allowed values
  description?: string;
}

type TabType = 'parts' | 'customers' | 'purchaseOrders' | 'users';
type ModalMode = 'create' | 'edit';

const MasterData: React.FC = () => {
  const { 
    parts, 
    customers,
    purchaseOrders,
    currentUser,
    fetchMaster,
    addAuditLog 
  } = useInventoryStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('parts');
  
  // Modal states
  const [showPartModal, setShowPartModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Export filter modal state
  const [showExportFilterModal, setShowExportFilterModal] = useState(false);
  const [exportType, setExportType] = useState<'parts' | 'customers' | 'purchaseOrders'>('parts');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [exportSearchTerm, setExportSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Edit/Delete states
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<'part' | 'customer' | 'po'>('part');

  const partForm = useForm<PartFormData>();
  const customerForm = useForm<CustomerFormData>();
  const poForm = useForm<POFormData>();

  useEffect(() => {
    // Fetch all master data types
    Promise.all([
      fetchMaster('customers'),
      fetchMaster('parts'),
      fetchMaster('purchaseOrders')
    ]).catch(err => console.error('Error fetching master data:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============= PART OPERATIONS =============
  const openPartModal = (mode: ModalMode, part?: Part) => {
    setModalMode(mode);
    setEditingItem(part);
    if (mode === 'edit' && part) {
      // Extract customerId if it's an object
      const customerIdValue = typeof part.customerId === 'string' ? part.customerId : part.customerId._id;
      partForm.reset({
        name: part.name,
        internalPartNo: part.internalPartNo,
        customerId: customerIdValue,
        supplierId: part.supplierInfo.id,
        supplierPartNumber: part.supplierInfo.partNumber || '',
        supplierDescription: part.supplierInfo.description || '',
        poNumber: part.poNumber || '',
        description: part.description || '',
        weight: part.specifications?.weight || undefined,
        dimensions: part.specifications?.dimensions || '',
        material: part.specifications?.material || ''
      });
    } else {
      partForm.reset({
        name: '',
        internalPartNo: '',
        customerId: '',
        supplierId: '',
        supplierPartNumber: '',
        supplierDescription: '',
        poNumber: '',
        description: '',
        weight: undefined,
        dimensions: '',
        material: ''
      });
    }
    setShowPartModal(true);
  };

  const onSubmitPart = async (data: PartFormData) => {
    if (!currentUser) return;

    try {
      const payload = {
        customerId: data.customerId,
        internalPartNo: data.internalPartNo,
        name: data.name,
        description: data.description || '',
        poNumber: data.poNumber || '',
        supplierInfo: { 
          id: data.supplierId, 
          partNumber: data.supplierPartNumber || '', 
          description: data.supplierDescription || '' 
        },
        specifications: {
          weight: data.weight || 0,
          dimensions: data.dimensions || '',
          material: data.material || ''
        }
      };

      if (modalMode === 'create') {
        const response = await createPartApi(payload);
        if (response.data.success) {
          toast.success('Part berhasil dibuat!');
          addAuditLog({
            userId: currentUser.id,
            username: currentUser.username,
            action: 'PART_CREATED',
            details: `Part '${data.name}' dibuat`
          });
        }
      } else if (modalMode === 'edit' && editingItem) {
        const response = await updatePartApi(editingItem._id, payload);
        if (response.data.success) {
          toast.success('Part berhasil diupdate!');
          addAuditLog({
            userId: currentUser.id,
            username: currentUser.username,
            action: 'PART_UPDATED',
            details: `Part '${data.name}' diupdate`
          });
        }
      }

      await Promise.all([
        fetchMaster('parts'),
        fetchMaster('customers')
      ]);
      setShowPartModal(false);
      partForm.reset();
    } catch (error) {
      const message = handleApiError(error, 'Gagal menyimpan part');
      toast.error(message);
    }
  };

  const handleDeletePart = async () => {
    if (!deletingItem || !currentUser) return;

    try {
      const response = await deletePartApi(deletingItem._id);
      if (response.data.success) {
        toast.success('Part berhasil dihapus!');
        addAuditLog({
          userId: currentUser.id,
          username: currentUser.username,
          action: 'PART_DELETED',
          details: `Part '${deletingItem.name}' dihapus`
        });
        await fetchMaster('parts');
      }
    } catch (error) {
      const message = handleApiError(error, 'Gagal menghapus part');
      toast.error(message);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingItem(null);
    }
  };

  // ============= CUSTOMER OPERATIONS =============
  const openCustomerModal = (mode: ModalMode, customer?: Customer) => {
    setModalMode(mode);
    setEditingItem(customer);
    if (mode === 'edit' && customer) {
      customerForm.reset({
        name: customer.name,
        address: customer.address,
        contactPerson: customer.contactPerson || '',
        phone: customer.phone || '',
        email: customer.email || ''
      });
    } else {
      customerForm.reset({
        name: '',
        address: '',
        contactPerson: '',
        phone: '',
        email: ''
      });
    }
    setShowCustomerModal(true);
  };

  const onSubmitCustomer = async (data: CustomerFormData) => {
    if (!currentUser) return;

    try {
      if (modalMode === 'create') {
        const response = await createCustomerApi(data);
        if (response.data.success) {
          toast.success('Customer berhasil dibuat!');
          addAuditLog({
            userId: currentUser.id,
            username: currentUser.username,
            action: 'CUSTOMER_CREATED',
            details: `Customer '${data.name}' dibuat`
          });
        }
      } else if (modalMode === 'edit' && editingItem) {
        const response = await updateCustomerApi(editingItem._id, data);
        if (response.data.success) {
          toast.success('Customer berhasil diupdate!');
          addAuditLog({
            userId: currentUser.id,
            username: currentUser.username,
            action: 'CUSTOMER_UPDATED',
            details: `Customer '${data.name}' diupdate`
          });
        }
      }

      await fetchMaster('customers');
      setShowCustomerModal(false);
      customerForm.reset();
    } catch (error) {
      const message = handleApiError(error, 'Gagal menyimpan customer');
      toast.error(message);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingItem || !currentUser) return;

    try {
      const response = await deleteCustomerApi(deletingItem._id);
      if (response.data.success) {
        toast.success('Customer berhasil dihapus!');
        addAuditLog({
          userId: currentUser.id,
          username: currentUser.username,
          action: 'CUSTOMER_DELETED',
          details: `Customer '${deletingItem.name}' dihapus`
        });
        await fetchMaster('customers');
      }
    } catch (error) {
      const message = handleApiError(error, 'Gagal menghapus customer');
      toast.error(message);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingItem(null);
    }
  };

  // ============= PURCHASE ORDER OPERATIONS =============
  const openPOModal = (mode: ModalMode, po?: PurchaseOrder) => {
    setModalMode(mode);
    setEditingItem(po);
    if (mode === 'edit' && po) {
      // Extract IDs if they're objects
      const partIdValue = typeof po.partId === 'string' ? po.partId : po.partId._id;
      const customerIdValue = typeof po.customerId === 'string' ? po.customerId : po.customerId._id;
      poForm.reset({
        poNumber: po.poNumber,
        partId: partIdValue,
        customerId: customerIdValue,
        totalQuantity: po.totalQuantity,
        status: po.status as 'open' | 'closed' | 'partial',
        description: ''
      });
    } else {
      poForm.reset({
        poNumber: '',
        partId: '',
        customerId: '',
        totalQuantity: 0,
        status: 'open',
        description: ''
      });
    }
    setShowPOModal(true);
  };

  const onSubmitPO = async (data: POFormData) => {
    if (!currentUser) return;

    try {
      const payload = {
        poNumber: data.poNumber,
        partId: data.partId,
        customerId: data.customerId,
        totalQuantity: data.totalQuantity,
        status: data.status,
        description: data.description || ''
      };

      if (modalMode === 'create') {
        const response = await createPurchaseOrderApi(payload);
        if (response.data.success) {
          toast.success('Purchase Order berhasil dibuat!');
          addAuditLog({
            userId: currentUser.id,
            username: currentUser.username,
            action: 'PO_CREATED',
            details: `PO '${data.poNumber}' dibuat`
          });
        }
      } else if (modalMode === 'edit' && editingItem) {
        const response = await updatePurchaseOrderApi(editingItem._id, payload);
        if (response.data.success) {
          toast.success('Purchase Order berhasil diupdate!');
          addAuditLog({
            userId: currentUser.id,
            username: currentUser.username,
            action: 'PO_UPDATED',
            details: `PO '${data.poNumber}' diupdate`
          });
        }
      }

      await fetchMaster('purchaseOrders');
      setShowPOModal(false);
      poForm.reset();
    } catch (error) {
      const message = handleApiError(error, 'Gagal menyimpan PO');
      toast.error(message);
    }
  };

  const handleDeletePO = async () => {
    if (!deletingItem || !currentUser) return;

    try {
      const response = await deletePurchaseOrderApi(deletingItem._id);
      if (response.data.success) {
        toast.success('Purchase Order berhasil dihapus!');
        addAuditLog({
          userId: currentUser.id,
          username: currentUser.username,
          action: 'PO_DELETED',
          details: `PO '${deletingItem.poNumber}' dihapus`
        });
        await fetchMaster('purchaseOrders');
      }
    } catch (error) {
      const message = handleApiError(error, 'Gagal menghapus PO');
      toast.error(message);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingItem(null);
    }
  };

  // ============= EXPORT OPERATIONS =============
  const openExportModal = (type: 'parts' | 'customers' | 'purchaseOrders') => {
    setExportType(type);
    setSelectedCustomers([]);
    setExportSearchTerm('');
    setShowExportFilterModal(true);
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c._id));
    }
  };

  const handleExport = async () => {
    if (!currentUser) return;

    setIsExporting(true);
    try {
      const filter = {
        customers: selectedCustomers.length > 0 ? selectedCustomers : undefined,
        searchTerm: exportSearchTerm || undefined
      };

      let result;
      if (exportType === 'parts') {
        result = await exportPartsToExcel(parts, customers, filter);
      } else if (exportType === 'customers') {
        result = await exportCustomersToExcel(customers, filter);
      } else if (exportType === 'purchaseOrders') {
        result = await exportPurchaseOrdersToExcel(purchaseOrders, customers, parts, filter);
      }

      if (result?.success) {
        toast.success(`✅ Export berhasil! File: ${result.fileName} (${result.recordCount} records)`);
        
        addAuditLog({
          userId: currentUser.id,
          username: currentUser.username,
          action: 'EXPORT_EXCEL',
          details: `Exported ${exportType} to Excel: ${result.fileName} (${result.recordCount} records)`
        });

        setShowExportFilterModal(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal export data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // ============= DELETE CONFIRMATION =============
  const openDeleteConfirm = (type: 'part' | 'customer' | 'po', item: any) => {
    setDeleteType(type);
    setDeletingItem(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === 'part') {
      handleDeletePart();
    } else if (deleteType === 'customer') {
      handleDeleteCustomer();
    } else if (deleteType === 'po') {
      handleDeletePO();
    }
  };

  const tabs = [
    { id: 'parts' as TabType, label: 'Master Parts', icon: Database },
    { id: 'customers' as TabType, label: 'Master Customers', icon: Building },
    { id: 'purchaseOrders' as TabType, label: 'Purchase Orders', icon: FileText },
    { id: 'users' as TabType, label: 'Master Users', icon: Users },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Master Data</h1>
      
      {/* Tab Navigation */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex space-x-4" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-1" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Master Parts */}
      {activeTab === 'parts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Master Parts</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => openExportModal('parts')}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </button>
              <button
                onClick={() => openPartModal('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Part Baru
              </button>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Internal Part No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier Part No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parts.map((part: Part) => {
                  const customer = customers.find((c: Customer) => c._id === part.customerId);
                  return (
                    <tr key={part._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">{part.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 font-mono">{part.internalPartNo}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{customer?.name || 'N/A'}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 font-mono">{part.supplierInfo.id}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{part.supplierInfo.partNumber || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{part.specifications?.weight || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{part.specifications?.material || '-'}</td>
                      <td className="px-4 py-4 text-sm text-blue-600 font-mono">{part.poNumber || '-'}</td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => openPartModal('edit', part)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                          <button 
                            onClick={() => openDeleteConfirm('part', part)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Master Customers */}
      {activeTab === 'customers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Master Customers</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => openExportModal('customers')}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </button>
              <button
                onClick={() => openCustomerModal('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Customer Baru
              </button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            {customers.map((customer: Customer) => (
              <div key={customer._id} className="p-3 border-b border-gray-200 last:border-b-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.address}</p>
                    {customer.contactPerson && (
                      <p className="text-sm text-gray-500">Contact: {customer.contactPerson}</p>
                    )}
                    {customer.phone && (
                      <p className="text-sm text-gray-500">Phone: {customer.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => openCustomerModal('edit', customer)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => openDeleteConfirm('customer', customer)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase Orders */}
      {activeTab === 'purchaseOrders' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Purchase Orders</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => openExportModal('purchaseOrders')}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </button>
              <button
                onClick={() => openPOModal('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah PO Baru
              </button>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Internal Part No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseOrders.map((po: PurchaseOrder) => {
                  // Handle both string ID and populated object for partId
                  const partId = typeof po.partId === 'string' ? po.partId : po.partId?._id;
                  const part = typeof po.partId === 'object' && po.partId?.name 
                    ? po.partId 
                    : parts.find((p: Part) => p._id === partId);
                  
                  // Handle both string ID and populated object for customerId
                  const customerId = typeof po.customerId === 'string' ? po.customerId : po.customerId?._id;
                  const customer = typeof po.customerId === 'object' && po.customerId?.name
                    ? po.customerId
                    : customers.find((c: Customer) => c._id === customerId);
                  
                  // Calculate delivery progress percentage
                  const deliveredQty = po.deliveredQuantity || 0;
                  const totalQty = po.totalQuantity || 0;
                  const progressPercent = totalQty > 0 ? Math.round((deliveredQty / totalQty) * 100) : 0;
                  
                  return (
                    <tr key={po._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-blue-600 font-mono">{po.poNumber}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {part?.name || <span className="text-red-500">Part tidak ditemukan</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 font-mono">
                        {part?.internalPartNo || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {customer?.name || <span className="text-red-500">Customer tidak ditemukan</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">
                        {totalQty.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">{deliveredQty.toLocaleString()}</span>
                          <div className="flex items-center mt-1">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5 mr-2">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  progressPercent === 100 ? 'bg-green-600' : 
                                  progressPercent > 0 ? 'bg-blue-600' : 'bg-gray-400'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{progressPercent}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          po.status === 'completed' ? 'bg-green-100 text-green-800' :
                          po.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          po.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          po.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {po.status === 'completed' ? 'Completed' :
                           po.status === 'partial' ? 'Partial' :
                           po.status === 'open' ? 'Open' :
                           po.status === 'cancelled' ? 'Cancelled' :
                           'Closed'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => openPOModal('edit', po)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            title="Edit Purchase Order"
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                          <button 
                            onClick={() => openDeleteConfirm('po', po)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                            title="Hapus Purchase Order"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {purchaseOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">Belum ada Purchase Order</p>
                <p className="text-xs mt-1">Klik tombol "Tambah PO Baru" untuk membuat Purchase Order pertama</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Master Users */}
      {activeTab === 'users' && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Master Users</h2>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="p-3 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{currentUser?.name}</h3>
                  <p className="text-sm text-gray-500">{currentUser?.username}</p>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {currentUser?.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3 text-gray-500 text-sm">
              User management features akan dikembangkan lebih lanjut...
            </div>
          </div>
        </div>
      )}

      {/* Part Modal */}
      {showPartModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {modalMode === 'create' ? 'Tambah Part Baru' : 'Edit Part'}
              </h3>
              <button onClick={() => setShowPartModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={partForm.handleSubmit(onSubmitPart)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Item *</label>
                <input
                  type="text"
                  {...partForm.register('name', { required: 'Nama item harus diisi' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {partForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">{partForm.formState.errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Internal Part No *</label>
                <input
                  type="text"
                  {...partForm.register('internalPartNo', { required: 'Internal Part No harus diisi' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {partForm.formState.errors.internalPartNo && (
                  <p className="mt-1 text-sm text-red-600">{partForm.formState.errors.internalPartNo.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer *</label>
                <select
                  {...partForm.register('customerId', { required: 'Customer harus dipilih' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Customer --</option>
                  {customers.map((customer: Customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {partForm.formState.errors.customerId && (
                  <p className="mt-1 text-sm text-red-600">{partForm.formState.errors.customerId.message}</p>
                )}
              </div>

              {/* Supplier Information Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Informasi Supplier</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier ID *</label>
                    <input
                      type="text"
                      {...partForm.register('supplierId', { required: 'Supplier ID harus diisi' })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="SUP-001"
                    />
                    {partForm.formState.errors.supplierId && (
                      <p className="mt-1 text-sm text-red-600">{partForm.formState.errors.supplierId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier Part Number</label>
                    <input
                      type="text"
                      {...partForm.register('supplierPartNumber')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="GS-2024-A-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier Description</label>
                    <textarea
                      {...partForm.register('supplierDescription')}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Premium grade steel shaft with bearing"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">PO Number</label>
                <select
                  {...partForm.register('poNumber')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">-- Pilih PO (Opsional) --</option>
                  {purchaseOrders.map((po: PurchaseOrder) => {
                    const poCustomer = customers.find((c: Customer) => c._id === po.customerId);
                    const poPart = parts.find((p: Part) => p._id === po.partId);
                    return (
                      <option key={po._id} value={po.poNumber}>
                        {po.poNumber} - {poCustomer?.name || 'N/A'} - {poPart?.name || 'N/A'}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Format: PO Number - Customer - Part Name
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi Part</label>
                <textarea
                  {...partForm.register('description')}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="High precision gear shaft for industrial machinery"
                />
              </div>

              {/* Specifications Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Spesifikasi Teknis</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...partForm.register('weight', { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dimensions</label>
                    <input
                      type="text"
                      {...partForm.register('dimensions')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="200mm x 50mm x 50mm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Material</label>
                    <input
                      type="text"
                      {...partForm.register('material')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Stainless Steel 304"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPartModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={partForm.formState.isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {partForm.formState.isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {modalMode === 'create' ? 'Tambah Customer Baru' : 'Edit Customer'}
              </h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={customerForm.handleSubmit(onSubmitCustomer)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Customer *</label>
                <input
                  type="text"
                  {...customerForm.register('name', { required: 'Nama customer harus diisi' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {customerForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">{customerForm.formState.errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Alamat *</label>
                <textarea
                  {...customerForm.register('address', { required: 'Alamat harus diisi' })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {customerForm.formState.errors.address && (
                  <p className="mt-1 text-sm text-red-600">{customerForm.formState.errors.address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                <input
                  type="text"
                  {...customerForm.register('contactPerson')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Telepon</label>
                <input
                  type="tel"
                  {...customerForm.register('phone')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  {...customerForm.register('email')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={customerForm.formState.isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {customerForm.formState.isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Order Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {modalMode === 'create' ? 'Tambah Purchase Order Baru' : 'Edit Purchase Order'}
              </h3>
              <button onClick={() => setShowPOModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={poForm.handleSubmit(onSubmitPO)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">PO Number *</label>
                <input
                  type="text"
                  {...poForm.register('poNumber', { required: 'PO Number harus diisi' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="PO-CUSTOMER-001"
                />
                {poForm.formState.errors.poNumber && (
                  <p className="mt-1 text-sm text-red-600">{poForm.formState.errors.poNumber.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer *</label>
                <select
                  {...poForm.register('customerId', { required: 'Customer harus dipilih' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Customer --</option>
                  {customers.map((customer: Customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {poForm.formState.errors.customerId && (
                  <p className="mt-1 text-sm text-red-600">{poForm.formState.errors.customerId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Part *</label>
                <select
                  {...poForm.register('partId', { required: 'Part harus dipilih' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Part --</option>
                  {parts.map((part: Part) => (
                    <option key={part._id} value={part._id}>
                      {part.name} ({part.internalPartNo})
                    </option>
                  ))}
                </select>
                {poForm.formState.errors.partId && (
                  <p className="mt-1 text-sm text-red-600">{poForm.formState.errors.partId.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Quantity *</label>
                <input
                  type="number"
                  {...poForm.register('totalQuantity', { 
                    required: 'Total quantity harus diisi',
                    min: { value: 1, message: 'Minimal 1' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="1000"
                />
                {poForm.formState.errors.totalQuantity && (
                  <p className="mt-1 text-sm text-red-600">{poForm.formState.errors.totalQuantity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status *</label>
                <select
                  {...poForm.register('status', { required: 'Status harus dipilih' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
                {poForm.formState.errors.status && (
                  <p className="mt-1 text-sm text-red-600">{poForm.formState.errors.status.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                  {...poForm.register('description')}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Deskripsi tambahan (opsional)"
                />
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={poForm.formState.isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {poForm.formState.isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center mb-4">
              <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="ml-3 text-lg leading-6 font-medium text-gray-900">
                Konfirmasi Hapus
              </h3>
            </div>
            
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Apakah Anda yakin ingin menghapus{' '}
                <span className="font-semibold">
                  {deleteType === 'part' && deletingItem?.name}
                  {deleteType === 'customer' && deletingItem?.name}
                  {deleteType === 'po' && deletingItem?.poNumber}
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Filter Modal */}
      {showExportFilterModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Export {exportType === 'parts' ? 'Parts' : exportType === 'customers' ? 'Customers' : 'Purchase Orders'} ke Excel
              </h3>
              <button onClick={() => setShowExportFilterModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cari</label>
                <input
                  type="text"
                  value={exportSearchTerm}
                  onChange={(e) => setExportSearchTerm(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Cari berdasarkan nama, nomor part, dll."
                />
              </div>

              {exportType !== 'customers' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Filter Customer</label>
                  <div className="mt-1 space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.length === customers.length}
                        onChange={selectAllCustomers}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">Pilih Semua</label>
                    </div>
                    {customers.map((customer: Customer) => (
                      <div key={customer._id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer._id)}
                          onChange={() => toggleCustomerSelection(customer._id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">{customer.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowExportFilterModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isExporting ? 'Mengekspor...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterData;