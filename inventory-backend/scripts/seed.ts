import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { User, Customer, Supplier, Part, PurchaseOrder, InventoryItem, Report, AuditLog } from '../lib/models';
import { hashPassword } from '../lib/utils';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || '';

console.log('🌱 Seeding MongoDB Atlas Database with Comprehensive Dummy Data...\n');

async function seedDatabase() {
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Supplier.deleteMany({}),
      Part.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      InventoryItem.deleteMany({}),
      Report.deleteMany({}),
      AuditLog.deleteMany({})
    ]);
    console.log('✅ Existing data cleared\n');

    // ==================== SEED USERS ====================
    console.log('👥 Creating users...');
    const hashedPassword = await hashPassword('password123');
    
    const users = await User.create([
      {
        username: 'direktur_budi',
        name: 'Budi Santoso',
        email: 'budi@inventory.com',
        password: hashedPassword,
        role: 'direktur',
        status: 'aktif',
        createdAt: new Date('2024-01-01')
      },
      {
        username: 'admin_sari',
        name: 'Sari Wulandari',
        email: 'sari@inventory.com',
        password: hashedPassword,
        role: 'admin',
        status: 'aktif',
        createdAt: new Date('2024-01-02')
      },
      {
        username: 'manager_andi',
        name: 'Andi Wijaya',
        email: 'andi@inventory.com',
        password: hashedPassword,
        role: 'manager',
        status: 'aktif',
        createdAt: new Date('2024-01-03')
      },
      {
        username: 'staff_dewi',
        name: 'Dewi Lestari',
        email: 'dewi@inventory.com',
        password: hashedPassword,
        role: 'staff',
        status: 'aktif',
        createdAt: new Date('2024-01-04')
      },
      {
        username: 'staff_rudi',
        name: 'Rudi Hartono',
        email: 'rudi@inventory.com',
        password: hashedPassword,
        role: 'staff',
        status: 'aktif',
        createdAt: new Date('2024-01-05')
      }
    ]);
    console.log(`✅ Created ${users.length} users`);

    // ==================== SEED CUSTOMERS ====================
    console.log('🏢 Creating customers...');
    const customers = await Customer.create([
      {
        name: 'PT. Maju Jaya Manufacturing',
        address: 'Jl. Industri No. 45, Kawasan Industri MM2100, Bekasi',
        contactPerson: 'Ahmad Yani',
        phone: '021-12345678',
        email: 'contact@majujaya.com',
        createdAt: new Date('2024-01-10')
      },
      {
        name: 'CV. Sejahtera Abadi',
        address: 'Jl. Raya Bekasi No. 123, Bekasi Timur',
        contactPerson: 'Siti Nurhaliza',
        phone: '021-87654321',
        email: 'info@sejahtera.com',
        createdAt: new Date('2024-01-11')
      },
      {
        name: 'PT. Global Teknik Indonesia',
        address: 'Jl. Sudirman Kav. 88, Jakarta Pusat',
        contactPerson: 'Bambang Sutrisno',
        phone: '021-55667788',
        email: 'bambang@globaltek.com',
        createdAt: new Date('2024-01-12')
      },
      {
        name: 'PT. Karya Prima Industri',
        address: 'Jl. Ahmad Yani No. 234, Surabaya',
        contactPerson: 'Rina Kusuma',
        phone: '031-22334455',
        email: 'rina@karyaprima.com',
        createdAt: new Date('2024-01-13')
      },
      {
        name: 'CV. Bintang Terang',
        address: 'Jl. Gatot Subroto No. 56, Bandung',
        contactPerson: 'Dedi Supardi',
        phone: '022-77889900',
        email: 'dedi@bintangterang.com',
        createdAt: new Date('2024-01-14')
      },
      {
        name: 'PT. Sentosa Engineering',
        address: 'Jl. Raya Cibitung KM 38, Bekasi',
        contactPerson: 'Lina Marlina',
        phone: '021-88776655',
        email: 'lina@sentosa-eng.com',
        createdAt: new Date('2024-01-15')
      }
    ]);
    console.log(`✅ Created ${customers.length} customers`);

    // ==================== SEED SUPPLIERS ====================
    console.log('🏭 Creating suppliers...');
    const suppliers = await Supplier.create([
      {
        supplierId: 'SUP-001',
        name: 'PT. Global Supplier Indonesia',
        address: 'Jl. Industri Raya No. 123, Kawasan Industri Jababeka, Bekasi',
        contactPerson: 'Ridwan Santoso',
        phone: '021-89123456',
        email: 'sales@globalsupplier.co.id',
        description: 'Supplier premium untuk komponen mesin industri dan spare parts berkualitas tinggi',
        status: 'active',
        createdAt: new Date('2024-01-05')
      },
      {
        supplierId: 'SUP-002',
        name: 'CV. Mitra Sejahtera Parts',
        address: 'Jl. Raya Narogong KM 18, Bekasi Timur',
        contactPerson: 'Lina Wijaya',
        phone: '021-88234567',
        email: 'contact@mitrasejahtera.com',
        description: 'Distributor komponen hydraulic dan pneumatic terpercaya',
        status: 'active',
        createdAt: new Date('2024-01-06')
      },
      {
        supplierId: 'SUP-003',
        name: 'PT. Teknik Jaya Mandiri',
        address: 'Jl. Ahmad Yani No. 45, Cibitung, Bekasi',
        contactPerson: 'Bambang Hermawan',
        phone: '021-87345678',
        email: 'info@teknikjaya.co.id',
        description: 'Spesialis motor listrik dan gearbox untuk industri manufaktur',
        status: 'active',
        createdAt: new Date('2024-01-07')
      },
      {
        supplierId: 'SUP-004',
        name: 'UD. Karya Teknik Nusantara',
        address: 'Jl. Raya Cibitung KM 25, Bekasi',
        contactPerson: 'Susi Rahayu',
        phone: '021-86456789',
        email: 'sales@karyateknik.com',
        description: 'Supplier chain, sprocket, dan komponen power transmission',
        status: 'active',
        createdAt: new Date('2024-01-08')
      },
      {
        supplierId: 'SUP-005',
        name: 'PT. Bintang Putra Engineering',
        address: 'Jl. Raya Cikarang No. 234, Cikarang Barat',
        contactPerson: 'Hendra Gunawan',
        phone: '021-85567890',
        email: 'hendra@bintangputra.co.id',
        description: 'Penyedia belt, pulley, dan sistem transmisi mekanik',
        status: 'active',
        createdAt: new Date('2024-01-09')
      },
      {
        supplierId: 'SUP-006',
        name: 'CV. Sentosa Presisi Komponrn',
        address: 'Jl. Industri Selatan No. 78, MM2100, Bekasi',
        contactPerson: 'Dewi Kusuma',
        phone: '021-84678901',
        email: 'dewi@sentosapresisi.com',
        description: 'Manufaktur komponen presisi tinggi untuk linear guide dan bearing',
        status: 'active',
        createdAt: new Date('2024-01-10')
      },
      {
        supplierId: 'SUP-007',
        name: 'PT. Prima Tekno Indo',
        address: 'Jl. Raya Jakarta-Cikampek KM 42, Karawang',
        contactPerson: 'Ahmad Fauzi',
        phone: '0267-8234567',
        email: 'ahmad@primatekno.co.id',
        description: 'Supplier komponen elektronik dan sensor industri',
        status: 'active',
        createdAt: new Date('2024-01-11')
      },
      {
        supplierId: 'SUP-008',
        name: 'UD. Makmur Jaya Parts',
        address: 'Jl. Raya Serang KM 15, Tangerang',
        contactPerson: 'Ibu Ratna',
        phone: '021-5512345',
        email: 'ratna@makmurjaya.com',
        description: 'Distributor spare parts mesin produksi dan peralatan industri',
        status: 'active',
        createdAt: new Date('2024-01-12')
      },
      {
        supplierId: 'SUP-009',
        name: 'PT. Indah Karya Teknik',
        address: 'Jl. Gatot Subroto KM 8, Bekasi Barat',
        contactPerson: 'Budi Santoso',
        phone: '021-8891234',
        email: 'budi@indahkarya.co.id',
        description: 'Supplier material handling equipment dan conveyor systems',
        status: 'inactive',
        createdAt: new Date('2024-01-13')
      },
      {
        supplierId: 'SUP-010',
        name: 'CV. Aneka Jaya Industrial',
        address: 'Jl. Raya Tambun No. 156, Bekasi Timur',
        contactPerson: 'Rina Marlina',
        phone: '021-8801234',
        email: 'rina@anekajaya.com',
        description: 'Distributor general industrial supplies dan MRO products',
        status: 'active',
        createdAt: new Date('2024-01-14')
      }
    ]);
    console.log(`✅ Created ${suppliers.length} suppliers`);

    // ==================== SEED PARTS ====================
    console.log('⚙️  Creating parts...');
    const parts = await Part.create([
      // Customer 1 - PT. Maju Jaya
      {
        customerId: customers[0]._id,
        internalPartNo: 'MJ-PART-001',
        name: 'Gear Shaft Assembly Type A',
        description: 'High precision gear shaft for industrial machinery',
        poNumber: 'PO-2024-001',
        supplierInfo: {
          id: suppliers[0].supplierId,
          partNumber: 'GS-2024-A-001',
          description: 'Premium grade steel shaft with bearing'
        },
        specifications: {
          weight: 2.5,
          dimensions: '200mm x 50mm x 50mm',
          material: 'Stainless Steel 304'
        },
        createdAt: new Date('2024-02-01')
      },
      {
        customerId: customers[0]._id,
        internalPartNo: 'MJ-PART-002',
        name: 'Bearing Housing Unit Heavy Duty',
        description: 'Heavy duty bearing housing for industrial use',
        poNumber: 'PO-2024-002',
        supplierInfo: {
          id: suppliers[0].supplierId,
          partNumber: 'BH-2024-B-002',
          description: 'Cast iron housing with sealing'
        },
        specifications: {
          weight: 5.0,
          dimensions: '300mm x 200mm x 150mm',
          material: 'Cast Iron Grade 40'
        },
        createdAt: new Date('2024-02-02')
      },
      {
        customerId: customers[0]._id,
        internalPartNo: 'MJ-PART-003',
        name: 'Coupling Flange Set',
        description: 'Industrial coupling flange with bolts',
        poNumber: 'PO-2024-003',
        supplierInfo: {
          id: suppliers[0].supplierId,
          partNumber: 'CF-2024-C-003',
          description: 'Standard flange coupling'
        },
        specifications: {
          weight: 3.2,
          dimensions: '250mm diameter x 80mm',
          material: 'Carbon Steel'
        },
        createdAt: new Date('2024-02-03')
      },
      // Customer 2 - CV. Sejahtera Abadi
      {
        customerId: customers[1]._id,
        internalPartNo: 'SA-PART-001',
        name: 'Hydraulic Cylinder Double Acting',
        description: 'Double acting hydraulic cylinder 100 ton',
        poNumber: 'PO-2024-004',
        supplierInfo: {
          id: suppliers[1].supplierId,
          partNumber: 'HC-2024-C-001',
          description: 'Industrial grade hydraulic cylinder'
        },
        specifications: {
          weight: 15.0,
          dimensions: '500mm x 100mm diameter',
          material: 'Chrome Plated Steel'
        },
        createdAt: new Date('2024-02-04')
      },
      {
        customerId: customers[1]._id,
        internalPartNo: 'SA-PART-002',
        name: 'Pneumatic Valve Assembly',
        description: '5/2 way pneumatic valve with solenoid',
        poNumber: 'PO-2024-005',
        supplierInfo: {
          id: suppliers[1].supplierId,
          partNumber: 'PV-2024-D-002',
          description: 'Aluminum body pneumatic valve'
        },
        specifications: {
          weight: 0.8,
          dimensions: '120mm x 60mm x 80mm',
          material: 'Aluminum Alloy'
        },
        createdAt: new Date('2024-02-05')
      },
      // Customer 3 - PT. Global Teknik
      {
        customerId: customers[2]._id,
        internalPartNo: 'GT-PART-001',
        name: 'Motor Gearbox Unit 1:50',
        description: 'Electric motor with gearbox reduction 1:50',
        poNumber: 'PO-2024-006',
        supplierInfo: {
          id: suppliers[2].supplierId,
          partNumber: 'MG-2024-E-001',
          description: '3 phase motor with worm gearbox'
        },
        specifications: {
          weight: 25.0,
          dimensions: '400mm x 300mm x 350mm',
          material: 'Cast Iron & Copper'
        },
        createdAt: new Date('2024-02-06')
      },
      {
        customerId: customers[2]._id,
        internalPartNo: 'GT-PART-002',
        name: 'Conveyor Roller Assembly',
        description: 'Heavy duty conveyor roller with bearing',
        poNumber: 'PO-2024-007',
        supplierInfo: {
          id: suppliers[2].supplierId,
          partNumber: 'CR-2024-F-002',
          description: 'Steel tube roller with sealed bearing'
        },
        specifications: {
          weight: 8.5,
          dimensions: '600mm length x 120mm diameter',
          material: 'Steel Tube'
        },
        createdAt: new Date('2024-02-07')
      },
      // Customer 4 - PT. Karya Prima
      {
        customerId: customers[3]._id,
        internalPartNo: 'KP-PART-001',
        name: 'Chain Sprocket Set',
        description: 'Industrial chain sprocket 40B series',
        poNumber: 'PO-2024-008',
        supplierInfo: {
          id: suppliers[3].supplierId,
          partNumber: 'CS-2024-G-001',
          description: 'Hardened steel sprocket'
        },
        specifications: {
          weight: 4.2,
          dimensions: '300mm diameter x 60mm width',
          material: 'Hardened Steel'
        },
        createdAt: new Date('2024-02-08')
      },
      // Customer 5 - CV. Bintang Terang
      {
        customerId: customers[4]._id,
        internalPartNo: 'BT-PART-001',
        name: 'Pulley Belt Drive System',
        description: 'V-belt pulley system for power transmission',
        poNumber: 'PO-2024-009',
        supplierInfo: {
          id: suppliers[4].supplierId,
          partNumber: 'PB-2024-H-001',
          description: 'Cast iron pulley with V-belt'
        },
        specifications: {
          weight: 6.8,
          dimensions: '350mm diameter x 100mm width',
          material: 'Cast Iron'
        },
        createdAt: new Date('2024-02-09')
      },
      // Customer 6 - PT. Sentosa Engineering
      {
        customerId: customers[5]._id,
        internalPartNo: 'SE-PART-001',
        name: 'Linear Guide Rail System',
        description: 'Precision linear guide rail with carriage',
        poNumber: 'PO-2024-010',
        supplierInfo: {
          id: suppliers[5].supplierId,
          partNumber: 'LG-2024-I-001',
          description: 'High precision linear guide'
        },
        specifications: {
          weight: 12.0,
          dimensions: '2000mm length x 45mm width',
          material: 'Hardened Steel Rail'
        },
        createdAt: new Date('2024-02-10')
      }
    ]);
    console.log(`✅ Created ${parts.length} parts`);

    // ==================== SEED PURCHASE ORDERS ====================
    console.log('📋 Creating purchase orders...');
    const purchaseOrders = await PurchaseOrder.create([
      // PO for Customer 1
      {
        poNumber: 'PO-2024-001',
        partId: parts[0]._id,
        customerId: customers[0]._id,
        totalQuantity: 200,
        deliveredQuantity: 150,
        status: 'partial',
        deliveryDate: new Date('2024-12-31'),
        notes: 'Urgent order - Priority delivery required by end of year',
        createdAt: new Date('2024-03-01')
      },
      {
        poNumber: 'PO-2024-002',
        partId: parts[1]._id,
        customerId: customers[0]._id,
        totalQuantity: 100,
        deliveredQuantity: 80,
        status: 'partial',
        deliveryDate: new Date('2024-12-15'),
        notes: 'Standard delivery schedule, inspect quality',
        createdAt: new Date('2024-03-02')
      },
      {
        poNumber: 'PO-2024-003',
        partId: parts[2]._id,
        customerId: customers[0]._id,
        totalQuantity: 150,
        deliveredQuantity: 0,
        status: 'open',
        deliveryDate: new Date('2025-01-20'),
        notes: 'New order for Q1 2025 production',
        createdAt: new Date('2024-10-15')
      },
      // PO for Customer 2
      {
        poNumber: 'PO-2024-004',
        partId: parts[3]._id,
        customerId: customers[1]._id,
        totalQuantity: 50,
        deliveredQuantity: 50,
        status: 'completed',
        deliveryDate: new Date('2024-11-30'),
        notes: 'Completed order - All items delivered',
        createdAt: new Date('2024-03-05')
      },
      {
        poNumber: 'PO-2024-005',
        partId: parts[4]._id,
        customerId: customers[1]._id,
        totalQuantity: 300,
        deliveredQuantity: 200,
        status: 'partial',
        deliveryDate: new Date('2025-01-15'),
        notes: 'Large order - Partial deliveries accepted',
        createdAt: new Date('2024-09-10')
      },
      // PO for Customer 3
      {
        poNumber: 'PO-2024-006',
        partId: parts[5]._id,
        customerId: customers[2]._id,
        totalQuantity: 25,
        deliveredQuantity: 25,
        status: 'completed',
        deliveryDate: new Date('2024-10-30'),
        notes: 'Special order - Quality approved',
        createdAt: new Date('2024-08-01')
      },
      {
        poNumber: 'PO-2024-007',
        partId: parts[6]._id,
        customerId: customers[2]._id,
        totalQuantity: 80,
        deliveredQuantity: 60,
        status: 'partial',
        deliveryDate: new Date('2024-12-20'),
        notes: 'Standard delivery, packaging required',
        createdAt: new Date('2024-09-15')
      },
      // PO for Customer 4
      {
        poNumber: 'PO-2024-008',
        partId: parts[7]._id,
        customerId: customers[3]._id,
        totalQuantity: 120,
        deliveredQuantity: 0,
        status: 'open',
        deliveryDate: new Date('2025-02-01'),
        notes: 'New customer - First order',
        createdAt: new Date('2024-10-20')
      },
      // PO for Customer 5
      {
        poNumber: 'PO-2024-009',
        partId: parts[8]._id,
        customerId: customers[4]._id,
        totalQuantity: 90,
        deliveredQuantity: 45,
        status: 'partial',
        deliveryDate: new Date('2024-12-10'),
        notes: 'Split delivery schedule',
        createdAt: new Date('2024-08-20')
      },
      // PO for Customer 6
      {
        poNumber: 'PO-2024-010',
        partId: parts[9]._id,
        customerId: customers[5]._id,
        totalQuantity: 40,
        deliveredQuantity: 40,
        status: 'completed',
        deliveryDate: new Date('2024-11-15'),
        notes: 'High precision order - Completed successfully',
        createdAt: new Date('2024-07-15')
      }
    ]);
    console.log(`✅ Created ${purchaseOrders.length} purchase orders`);

    // ==================== SEED INVENTORY ITEMS ====================
    console.log('📦 Creating inventory items with realistic data...');
    
    // Define explicit type for inventory items data
    interface InventoryItemData {
      uniqueId: string;
      partId: mongoose.Types.ObjectId;
      poId: mongoose.Types.ObjectId;
      poNumber: string; // 🆕 Direct PO Number reference
      quantity: number;
      status: 'IN' | 'OUT';
      qrCodeData: string;
      lotId: string;
      copies: number;
      gateId: string;
      location: {
        warehouse: string;
        zone: string;
        rack: string;
        position: string;
      };
      createdBy: {
        userId: mongoose.Types.ObjectId;
        username: string;
      };
      history: Array<{
        status: string;
        timestamp: Date;
        userId: mongoose.Types.ObjectId;
        notes: string;
      }>;
      createdAt: Date;
      updatedAt: Date;
    }
    
    const inventoryItemsData: InventoryItemData[] = [];
    
    // Helper function to generate inventory items
    const generateInventoryItems = (poIndex: number, quantity: number, status: 'IN' | 'OUT', startDate: Date) => {
      const po = purchaseOrders[poIndex];
      const part = parts.find(p => p._id.equals(po.partId));
      const user = users[Math.floor(Math.random() * users.length)];
      
      for (let i = 0; i < quantity / 10; i++) {
        const itemDate = new Date(startDate);
        itemDate.setDate(itemDate.getDate() + i * 2);
        
        const uniqueId = `${po.poNumber}-${String(i + 1).padStart(3, '0')}`;
        
        inventoryItemsData.push({
          uniqueId,
          partId: po.partId,
          poId: po._id,
          poNumber: po.poNumber, // 🆕 Populate PO Number directly
          quantity: 10,
          status,
          qrCodeData: JSON.stringify({
            id: uniqueId,
            part: part?.internalPartNo,
            po: po.poNumber,
            qty: 10,
            customer: customers.find(c => c._id.equals(po.customerId))?.name
          }),
          lotId: `LOT-${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
          copies: 1,
          gateId: `GATE-${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`,
          location: {
            warehouse: `WH-${Math.floor(Math.random() * 3) + 1}`,
            zone: String.fromCharCode(65 + Math.floor(Math.random() * 5)),
            rack: `R-${String(Math.floor(Math.random() * 20) + 1).padStart(3, '0')}`,
            position: `P-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}`
          },
          createdBy: {
            userId: user._id,
            username: user.username
          },
          history: [{
            status,
            timestamp: itemDate,
            userId: user._id,
            notes: status === 'IN' ? 'Goods received and inspected' : 'Goods shipped to customer'
          }],
          createdAt: itemDate,
          updatedAt: itemDate
        });
      }
    };

    // Generate items for delivered quantities
    generateInventoryItems(0, 150, 'IN', new Date('2024-03-15')); // PO-2024-001
    generateInventoryItems(1, 80, 'IN', new Date('2024-03-20'));  // PO-2024-002
    generateInventoryItems(3, 50, 'OUT', new Date('2024-04-01')); // PO-2024-004
    generateInventoryItems(4, 200, 'IN', new Date('2024-09-20')); // PO-2024-005
    generateInventoryItems(5, 25, 'OUT', new Date('2024-09-01')); // PO-2024-006
    generateInventoryItems(6, 60, 'IN', new Date('2024-10-01'));  // PO-2024-007
    generateInventoryItems(8, 45, 'IN', new Date('2024-09-01'));  // PO-2024-009
    generateInventoryItems(9, 40, 'OUT', new Date('2024-10-15')); // PO-2024-010

    const inventoryItems = await InventoryItem.create(inventoryItemsData);
    console.log(`✅ Created ${inventoryItems.length} inventory items`);

    // ==================== SEED REPORTS ====================
    console.log('📊 Creating reports...');
    
    // Define explicit type for report data
    interface ReportData {
      uniqueId: string;
      itemId: mongoose.Types.ObjectId;
      customerId: mongoose.Types.ObjectId;
      partId: mongoose.Types.ObjectId;
      poId: mongoose.Types.ObjectId;
      reportType: 'SCAN_IN' | 'SCAN_OUT';
      quantity: number;
      status: string;
      lotId: string;
      gateId: string;
      location: {
        warehouse: string;
        zone: string;
        rack: string;
        position: string;
      };
      scannedBy: {
        userId: mongoose.Types.ObjectId;
        username: string;
        name: string;
      };
      customerName: string;
      partName: string;
      poNumber: string;
      notes?: string;
      createdAt: Date;
      updatedAt: Date;
    }
    
    const reportsData: ReportData[] = [];
    
    // Create scan-in and scan-out reports from inventory items
    for (const item of inventoryItems) {
      const part = parts.find(p => p._id.equals(item.partId));
      const po = purchaseOrders.find(po => po._id.equals(item.poId));
      const customer = customers.find(c => c._id.equals(po?.customerId!));
      const user = users.find(u => u._id.equals(item.createdBy.userId));
      
      if (part && po && customer && user) {
        reportsData.push({
          uniqueId: item.uniqueId,
          itemId: item._id as mongoose.Types.ObjectId,
          customerId: customer._id as mongoose.Types.ObjectId,
          partId: part._id as mongoose.Types.ObjectId,
          poId: po._id as mongoose.Types.ObjectId,
          reportType: item.status === 'IN' ? 'SCAN_IN' : 'SCAN_OUT',
          quantity: item.quantity,
          status: item.status,
          lotId: item.lotId,
          gateId: item.gateId,
          location: item.location,
          scannedBy: {
            userId: user._id as mongoose.Types.ObjectId,
            username: user.username,
            name: user.name
          },
          customerName: customer.name,
          partName: part.name,
          poNumber: po.poNumber,
          notes: item.history[0]?.notes,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        });
      }
    }
    
    const reports = await Report.create(reportsData);
    console.log(`✅ Created ${reports.length} reports`);

    // ==================== SEED AUDIT LOGS ====================
    console.log('📝 Creating audit logs...');
    const auditLogsData = [];
    
    // Create audit logs for various activities
    const activities = [
      { action: 'user.login', category: 'auth', description: 'User logged in successfully' },
      { action: 'inventory.scan_in', category: 'inventory', description: 'Item scanned in to warehouse' },
      { action: 'inventory.scan_out', category: 'inventory', description: 'Item scanned out from warehouse' },
      { action: 'customer.create', category: 'master', description: 'New customer created' },
      { action: 'part.create', category: 'master', description: 'New part created' },
      { action: 'po.create', category: 'master', description: 'New purchase order created' },
      { action: 'user.logout', category: 'auth', description: 'User logged out' }
    ];
    
    // Generate 100+ audit logs
    for (let i = 0; i < 150; i++) {
      const activity = activities[Math.floor(Math.random() * activities.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const logDate = new Date('2024-03-01');
      logDate.setDate(logDate.getDate() + Math.floor(Math.random() * 245)); // Random date in last 8 months
      logDate.setHours(Math.floor(Math.random() * 24));
      logDate.setMinutes(Math.floor(Math.random() * 60));
      
      auditLogsData.push({
        userId: user._id,
        username: user.username,
        action: activity.action,
        category: activity.category,
        details: activity.description,
        description: activity.description,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        metadata: {
          timestamp: logDate,
          role: user.role,
          module: activity.category
        },
        timestamp: logDate,
        createdAt: logDate
      });
    }
    
    const auditLogs = await AuditLog.create(auditLogsData);
    console.log(`✅ Created ${auditLogs.length} audit logs`);

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🏢 Customers: ${customers.length}`);
    console.log(`   🏭 Suppliers: ${suppliers.length}`);
    console.log(`   ⚙️  Parts: ${parts.length}`);
    console.log(`   📋 Purchase Orders: ${purchaseOrders.length}`);
    console.log(`   📦 Inventory Items: ${inventoryItems.length}`);
    console.log(`   📊 Reports: ${reports.length}`);
    console.log(`   📝 Audit Logs: ${auditLogs.length}`);
    
    console.log('\n🔑 Default Login Credentials:');
    console.log('   ┌─────────────────┬──────────────┬───────────┐');
    console.log('   │ Username        │ Password     │ Role      │');
    console.log('   ├─────────────────┼──────────────┼───────────┤');
    console.log('   │ direktur_budi   │ password123  │ Direktur  │');
    console.log('   │ admin_sari      │ password123  │ Admin     │');
    console.log('   │ manager_andi    │ password123  │ Manager   │');
    console.log('   │ staff_dewi      │ password123  │ Staff     │');
    console.log('   │ staff_rudi      │ password123  │ Staff     │');
    console.log('   └─────────────────┴──────────────┴───────────┘');
    
    console.log('\n📈 Purchase Order Status:');
    const openPO = purchaseOrders.filter(po => po.status === 'open').length;
    const partialPO = purchaseOrders.filter(po => po.status === 'partial').length;
    const completedPO = purchaseOrders.filter(po => po.status === 'completed').length;
    console.log(`   Open: ${openPO} | Partial: ${partialPO} | Completed: ${completedPO}`);
    
    console.log('\n📦 Inventory Status:');
    const inItems = inventoryItems.filter(item => item.status === 'IN').length;
    const outItems = inventoryItems.filter(item => item.status === 'OUT').length;
    console.log(`   IN: ${inItems} | OUT: ${outItems}`);
    
    console.log('\n🏭 Supplier Status:');
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    const inactiveSuppliers = suppliers.filter(s => s.status === 'inactive').length;
    console.log(`   Active: ${activeSuppliers} | Inactive: ${inactiveSuppliers}`);
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Start backend: cd inventory-backend && npm run dev');
    console.log('   2. Start frontend: cd inventory-frontend && npm run dev');
    console.log('   3. Login with any credentials above');
    console.log('   4. Explore the dashboard and features!');
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the seed function
seedDatabase();