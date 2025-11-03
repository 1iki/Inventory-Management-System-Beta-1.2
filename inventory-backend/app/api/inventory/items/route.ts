import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { InventoryItem, Part, PurchaseOrder, Customer } from '../../../../lib/models';
import { createMiddleware, generalLimiter } from '../../../../lib/middleware';
import { 
  apiResponse, 
  generateUniqueId, 
  generateQRCode, 
  createAuditLog, 
  getPaginationParams, 
  buildSearchQuery,
  AppError,
  handleDatabaseError,
  validateObjectId
} from '../../../../lib/utils';
import { inventoryItemSchema, paginationSchema } from '../../../../lib/validations';
import { SortOrder } from 'mongoose';

// GET - Fetch all inventory items with advanced filtering
export async function GET(req: NextRequest) {
  try {
    // Apply middleware
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      rateLimiter: generalLimiter
    })(req);

    if (middlewareResult instanceof NextResponse) {
      return middlewareResult;
    }

    const { user } = middlewareResult;
    
    // Ensure user is defined
    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    
    // Get pagination params
    const { page, limit, skip, sort } = getPaginationParams(searchParams);
    
    // Build search query
    const searchableFields = ['uniqueId', 'lotId', 'qrCodeData', 'barcode'];
    const searchTerm = searchParams.get('search') || '';
    const searchQuery = buildSearchQuery(searchTerm, searchableFields);
    
    // Build filter query
    const query: any = { ...searchQuery };
    
    // Status filter
    const status = searchParams.get('status');
    if (status && ['IN', 'OUT', 'PENDING_DELETE', 'DAMAGED'].includes(status)) {
      query.status = status;
    }
    
    // Part filter
    const partId = searchParams.get('partId');
    if (partId && validateObjectId(partId)) {
      query.partId = partId;
    }
    
    // PO filter
    const poId = searchParams.get('poId');
    if (poId && validateObjectId(poId)) {
      query.poId = poId;
    }
    
    // Date range filter
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Count total
    const total = await InventoryItem.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Fetch items with pagination and population
    const items = await InventoryItem.find(query)
      .populate({
        path: 'partId',
        select: 'name internalPartNo description',
        populate: {
          path: 'customerId',
          select: 'name'
        }
      })
      .populate('poId', 'poNumber totalQuantity deliveredQuantity status')
      .populate('createdBy.userId', 'name username')
      .sort(sort as { [key: string]: SortOrder })
      .limit(limit)
      .skip(skip)
      .lean();

    // Create audit log for data access
    await createAuditLog(
      user.id,
      user.username,
      'INVENTORY_VIEW',
      `Mengakses data inventory items (halaman ${page})`,
      'inventory',
      undefined,
      req
    );

    return NextResponse.json(
      apiResponse(true, {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, 'Data inventory berhasil diambil'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Get inventory error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        apiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      apiResponse(false, null, dbError.message),
      { status: dbError.statusCode }
    );
  }
}

// POST - Create new inventory item (Scan IN)
export async function POST(req: NextRequest) {
  try {
    // Apply middleware with validation
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'inventory', action: 'create' },
      rateLimiter: generalLimiter,
      validationSchema: inventoryItemSchema
    })(req);

    if (middlewareResult instanceof NextResponse) {
      return middlewareResult;
    }

    const { user, validatedData } = middlewareResult;
    
    // Ensure user is defined
    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    await connectDB();

    const { partId, poId, quantity, lotId, copies = 1, gateId, location } = validatedData;

    // Validate part exists with proper typing
    const part = await Part.findById(partId).populate('customerId', 'name');
    if (!part) {
      throw new AppError('Part tidak ditemukan', 404);
    }

    // Validate purchase order exists and is active
    const purchaseOrder = await PurchaseOrder.findById(poId);
    if (!purchaseOrder) {
      throw new AppError('Purchase Order tidak ditemukan', 404);
    }

    if (purchaseOrder.status === 'cancelled') {
      throw new AppError('Purchase Order sudah dibatalkan', 400);
    }

    if (purchaseOrder.status === 'completed') {
      throw new AppError('Purchase Order sudah selesai', 400);
    }

    // Check if adding this quantity would exceed PO total
    const currentDelivered = purchaseOrder.deliveredQuantity || 0;
    const totalAfterAdd = currentDelivered + quantity;
    
    if (totalAfterAdd > purchaseOrder.totalQuantity) {
      throw new AppError(
        `Quantity melebihi total PO. Tersisa: ${purchaseOrder.totalQuantity - currentDelivered}`,
        400
      );
    }

    // 🆕 Generate UML Unique ID dengan format baru
    // Format: UML-(SupplierPartNumber)-(SupplierId)-(Quantity)-(LotId)/(Year)
    const { generateUMLUniqueId } = await import('../../../../lib/utils');
    
    const supplierPartNumber = part.supplierInfo?.partNumber || 'NOPART';
    const supplierId = part.supplierInfo?.id || 'NOSUP';
    
    const uniqueId = generateUMLUniqueId(
      supplierPartNumber,
      supplierId,
      quantity,
      lotId
    );
    
    console.log(`✅ Generated UML Unique ID: ${uniqueId}`);
    console.log(`   Supplier Part Number: ${supplierPartNumber}`);
    console.log(`   Supplier ID: ${supplierId}`);
    console.log(`   Quantity: ${quantity}`);
    console.log(`   Lot ID: ${lotId}`);

    const barcodeValue = `BC${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 🔧 PERBAIKAN: QR Code hanya berisi uniqueId saja (simple string)
    // Data lengkap tetap disimpan di qrCodeData untuk referensi database
    const qrCodeData = JSON.stringify({
      // Unique Identifier
      uniqueId: uniqueId,
      
      // Customer Information
      customer: {
        id: (part.customerId as any)?._id || part.customerId,
        name: (part.customerId as any)?.name || 'N/A'
      },
      
      // Part Information
      part: {
        id: part._id.toString(),
        name: part.name,
        partNo: part.internalPartNo,
        description: part.description || ''
      },
      
      // Purchase Order Information
      po: {
        id: purchaseOrder._id.toString(),
        poNumber: purchaseOrder.poNumber
      },
      
      // Quantity & Lot Information
      quantity: quantity,
      lotId: lotId,
      gateId: gateId,
      
      // Additional Information
      supplierInfo: part.supplierInfo || {},
      location: location || {},
      
      // Timestamp
      createdAt: new Date().toISOString(),
      createdBy: user.username
    });

    // 🎯 QR Code hanya berisi uniqueId (tidak perlu JSON.stringify lagi)
    const qrCodeImage = await generateQRCode(uniqueId);
    
    console.log(`✅ QR Code generated with uniqueId only: ${uniqueId}`);

    // Create inventory item with comprehensive data
    const inventoryItem = new InventoryItem({
      uniqueId,
      partId,
      poId,
      poNumber: purchaseOrder.poNumber, // 🆕 Populate PO Number directly
      quantity: parseInt(quantity),
      status: 'IN',
      qrCodeData,
      qrCodeImage,
      barcode: barcodeValue,
      lotId: lotId.toUpperCase(),
      copies: parseInt(copies),
      gateId: gateId.toUpperCase(),
      location: location || {},
      createdBy: {
        userId: user.id,
        username: user.username
      },
      history: [{
        status: 'IN',
        timestamp: new Date(),
        userId: user.id,
        notes: 'Item created via Scan In'
      }]
    });

    await inventoryItem.save();

    // Update PO delivered quantity
    purchaseOrder.deliveredQuantity = totalAfterAdd;
    
    // Update PO status based on delivery progress
    if (totalAfterAdd >= purchaseOrder.totalQuantity) {
      purchaseOrder.status = 'completed';
    } else if (totalAfterAdd > 0) {
      purchaseOrder.status = 'partial';
    }
    
    await purchaseOrder.save();

    // Create audit log
    await createAuditLog(
      user.id,
      user.username,
      'ITEM_CREATED',
      `Item baru '${uniqueId}' dibuat - Part: ${part.name}, Qty: ${quantity}, Lot: ${lotId}, PO: ${purchaseOrder.poNumber}`,
      'inventory',
      inventoryItem._id.toString(),
      req
    );

    // Return populated item
    const populatedItem = await InventoryItem.findById(inventoryItem._id)
      .populate({
        path: 'partId',
        select: 'name internalPartNo description',
        populate: {
          path: 'customerId',
          select: 'name'
        }
      })
      .populate('poId', 'poNumber totalQuantity deliveredQuantity status')
      .lean();

    return NextResponse.json(
      apiResponse(true, populatedItem, `Item '${uniqueId}' berhasil dibuat dan disimpan`),
      { status: 201 }
    );

  } catch (error) {
    console.error('Create inventory error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        apiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      apiResponse(false, null, dbError.message),
      { status: dbError.statusCode }
    );
  }
}