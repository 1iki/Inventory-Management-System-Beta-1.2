import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building, ChevronRight, Search, X, AlertTriangle, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useInventoryStore } from '../store/inventory';
import { 
  getStaffCustomersApi, 
  createStaffCustomerApi,
  updateStaffCustomerApi,
  deleteStaffCustomerApi,
  getCustomerPartsApi,
  createCustomerPartApi,
  updateCustomerPartApi,
  deleteCustomerPartApi,
  handleApiError
} from '../lib/api';

interface Customer {
  _id: string;
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'pending_delete' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

interface Part {
  _id: string;
  customerId: string;
  internalPartNo: string;
  name: string;
  description?: string;
  poNumber?: string;
  supplierInfo: {
    id: string;
    partNumber?: string;
    description?: string;
  };
}

interface CustomerFormData {
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

interface PartFormData {
  name: string;
  internalPartNo: string;
  description?: string;
  supplierId: string;
  poNumber?: string;
}

type ModalMode = 'create' | 'edit';

const StaffCustomers: React.FC = () => {
  const { fetchMaster } = useInventoryStore();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerParts, setCustomerParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState(false);
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);
  
  // Edit/Delete states
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const customerForm = useForm<CustomerFormData>();
  const partForm = useForm<PartFormData>();

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerParts(selectedCustomer._id);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await getStaffCustomersApi({ search: searchQuery, limit: 100 });
      if (response.data.success) {
        const customersData = Array.isArray(response.data.data) 
          ? response.data.data 
          : response.data.data?.customers || [];
        setCustomers(customersData);
      }
    } catch (error) {
      const message = handleApiError(error, 'Gagal memuat data customers');
      toast.error(message);
      console.error('Fetch customers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerParts = async (customerId: string) => {
    try {
      const response = await getCustomerPartsApi({ customerId, limit: 100 });
      if (response.data.success) {
        setCustomerParts(response.data.data.parts || []);
      }
    } catch (error) {
      const message = handleApiError(error, 'Gagal memuat data parts');
      toast.error(message);
    }
  };

  // ============= CUSTOMER OPERATIONS =============
  const openCustomerModal = (mode: ModalMode, customer?: Customer) => {
    setModalMode(mode);
    setEditingCustomer(customer || null);
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
    try {
      if (modalMode === 'create') {
        const response = await createStaffCustomerApi(data);
        if (response.data.success) {
          toast.success('Customer berhasil dibuat');
          await fetchCustomers();
        }
      } else if (modalMode === 'edit' && editingCustomer) {
        const response = await updateStaffCustomerApi(editingCustomer._id, data);
        if (response.data.success) {
          toast.success('Customer berhasil diupdate');
          await fetchCustomers();
          if (selectedCustomer?._id === editingCustomer._id) {
            setSelectedCustomer(response.data.data);
          }
        }
      }
      setShowCustomerModal(false);
      customerForm.reset();
    } catch (error) {
      const message = handleApiError(error, 'Gagal menyimpan customer');
      toast.error(message);
    }
  };

  const openDeleteCustomerModal = (customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteReason('');
    setShowDeleteCustomerModal(true);
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer || !deleteReason.trim()) {
      toast.error('Alasan penghapusan harus diisi');
      return;
    }

    try {
      const response = await deleteStaffCustomerApi(deletingCustomer._id, deleteReason.trim());
      if (response.data.success) {
        toast.success('Request delete customer berhasil diajukan dan menunggu approval');
        await fetchCustomers();
        if (selectedCustomer?._id === deletingCustomer._id) {
          setSelectedCustomer(null);
          setCustomerParts([]);
        }
      }
      setShowDeleteCustomerModal(false);
      setDeletingCustomer(null);
      setDeleteReason('');
    } catch (error) {
      const message = handleApiError(error, 'Gagal menghapus customer');
      toast.error(message);
    }
  };

  // ============= PART OPERATIONS =============
  const openPartModal = (mode: ModalMode, part?: Part) => {
    if (!selectedCustomer) {
      toast.error('Pilih customer terlebih dahulu');
      return;
    }

    setModalMode(mode);
    setEditingPart(part || null);
    if (mode === 'edit' && part) {
      partForm.reset({
        name: part.name,
        internalPartNo: part.internalPartNo,
        description: part.description || '',
        supplierId: part.supplierInfo.id,
        poNumber: part.poNumber || ''
      });
    } else {
      partForm.reset({
        name: '',
        internalPartNo: '',
        description: '',
        supplierId: '',
        poNumber: ''
      });
    }
    setShowPartModal(true);
  };

  const onSubmitPart = async (data: PartFormData) => {
    try {
      if (modalMode === 'create' && selectedCustomer) {
        const payload = {
          customerId: selectedCustomer._id,
          name: data.name,
          internalPartNo: data.internalPartNo,
          description: data.description || '',
          poNumber: data.poNumber || '',
          supplierInfo: {
            id: data.supplierId,
            partNumber: '',
            description: ''
          }
        };

        const response = await createCustomerPartApi(payload);
        if (response.data.success) {
          toast.success('Part berhasil dibuat');
          await fetchCustomerParts(selectedCustomer._id);
          await fetchMaster('parts');
        }
      } else if (modalMode === 'edit' && editingPart) {
        const payload = {
          name: data.name,
          internalPartNo: data.internalPartNo,
          description: data.description,
          poNumber: data.poNumber || '',
          supplierInfo: {
            id: data.supplierId,
            partNumber: '',
            description: ''
          }
        };

        const response = await updateCustomerPartApi(editingPart._id, payload);
        if (response.data.success) {
          toast.success('Part berhasil diupdate');
          if (selectedCustomer) {
            await fetchCustomerParts(selectedCustomer._id);
          }
          await fetchMaster('parts');
        }
      }
      setShowPartModal(false);
      partForm.reset();
    } catch (error) {
      const message = handleApiError(error, 'Gagal menyimpan part');
      toast.error(message);
    }
  };

  const openDeletePartModal = (part: Part) => {
    setDeletingPart(part);
    setShowDeletePartModal(true);
  };

  const handleDeletePart = async () => {
    if (!deletingPart) return;

    try {
      const response = await deleteCustomerPartApi(deletingPart._id);
      if (response.data.success) {
        toast.success('Part berhasil dihapus');
        if (selectedCustomer) {
          await fetchCustomerParts(selectedCustomer._id);
        }
        await fetchMaster('parts');
      }
      setShowDeletePartModal(false);
      setDeletingPart(null);
    } catch (error) {
      const message = handleApiError(error, 'Gagal menghapus part');
      toast.error(message);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerParts([]);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Kelola Customer & Parts</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Daftar Customer
              </h2>
              <button
                onClick={() => openCustomerModal('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah
              </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari customer..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </form>

            {/* Customer List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : customers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Tidak ada data customer</div>
              ) : (
                customers.map((customer) => (
                  <div
                    key={customer._id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                      selectedCustomer?._id === customer._id
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{customer.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{customer.address}</p>
                        {customer.contactPerson && (
                          <p className="text-xs text-gray-400 mt-1">CP: {customer.contactPerson}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomerModal('edit', customer);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteCustomerModal(customer);
                          }}
                          className="text-red-600 hover:text-red-800 text-xs flex items-center"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Parts Management Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-4">
            {selectedCustomer ? (
              <>
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-2">
                        <Package className="h-5 w-5 mr-2" />
                        Parts Management - {selectedCustomer.name}
                      </h2>
                      <p className="text-sm text-gray-500">{selectedCustomer.address}</p>
                    </div>
                    <button
                      onClick={() => openPartModal('create')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Tambah Part
                    </button>
                  </div>
                </div>

                {/* Parts Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Internal Part No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customerParts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            Tidak ada data parts untuk customer ini
                          </td>
                        </tr>
                      ) : (
                        customerParts.map((part) => (
                          <tr key={part._id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm text-gray-900">{part.name}</td>
                            <td className="px-4 py-4 text-sm text-gray-900">{part.internalPartNo}</td>
                            <td className="px-4 py-4 text-sm text-gray-900">{part.supplierInfo.id}</td>
                            <td className="px-4 py-4 text-sm text-gray-900">{part.poNumber || '-'}</td>
                            <td className="px-4 py-4 text-sm">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => openPartModal('edit', part)}
                                  className="text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => openDeletePartModal(part)}
                                  className="text-red-600 hover:text-red-800 flex items-center"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Building className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Pilih customer untuk melihat parts</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
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

      {/* Part Modal */}
      {showPartModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {modalMode === 'create' ? 'Tambah Part Baru' : 'Edit Part'}
              </h3>
              <button onClick={() => setShowPartModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={partForm.handleSubmit(onSubmitPart)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Part *</label>
                <input
                  type="text"
                  {...partForm.register('name', { required: 'Nama part harus diisi' })}
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
                <label className="block text-sm font-medium text-gray-700">Supplier ID *</label>
                <input
                  type="text"
                  {...partForm.register('supplierId', { required: 'Supplier ID harus diisi' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {partForm.formState.errors.supplierId && (
                  <p className="mt-1 text-sm text-red-600">{partForm.formState.errors.supplierId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">PO Number</label>
                <input
                  type="text"
                  {...partForm.register('poNumber')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Opsional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                  {...partForm.register('description')}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
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

      {/* Delete Customer Confirmation */}
      {showDeleteCustomerModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center mb-4">
              <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Request Hapus Customer</h3>
            </div>

            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-4">
                Anda akan mengajukan request untuk menghapus customer <span className="font-semibold">{deletingCustomer?.name}</span>. 
                Request ini akan menunggu approval dari Admin/Manager/Direktur.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alasan Penghapusan *</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={4}
                  placeholder="Jelaskan alasan mengapa customer ini perlu dihapus..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteCustomerModal(false);
                  setDeletingCustomer(null);
                  setDeleteReason('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={!deleteReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Ajukan Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Part Confirmation */}
      {showDeletePartModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center mb-4">
              <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Konfirmasi Hapus Part</h3>
            </div>

            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Apakah Anda yakin ingin menghapus part <span className="font-semibold">{deletingPart?.name}</span>? 
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeletePartModal(false);
                  setDeletingPart(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeletePart}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCustomers;
