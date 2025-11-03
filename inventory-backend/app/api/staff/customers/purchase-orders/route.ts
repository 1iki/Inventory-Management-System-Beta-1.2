import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { PurchaseOrder, Customer, Part } from '@/lib/models';
import { createMiddleware, generalLimiter } from '@/lib/middleware';
import { apiResponse, createAuditLog, AppError, handleDatabaseError, sanitizeInput } from '@/lib/utils';

// GET - Fetch purchase orders by customer ID
export async function GET(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'purchase_orders', action: 'read' },
      rateLimiter: generalLimiter
    })(req);

    if (middlewareResult instanceof NextResponse) {
      return middlewareResult;
    }

    const { user } = middlewareResult;
    
    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    if (!customerId) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter customerId wajib diisi'),
        { status: 400 }
      );
    }

    // Verify customer exists and is active
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak ditemukan'),
        { status: 404 }
      );
    }

    if (customer.status !== 'active') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak aktif'),
        { status: 403 }
      );
    }

    // Query filter
    const query: any = { customerId };
    
    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('partId', 'name internalPartNo')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      PurchaseOrder.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      apiResponse(true, {
        customer: {
          _id: customer._id,
          name: customer.name,
          address: customer.address
        },
        purchaseOrders,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, 'Data purchase orders berhasil diambil'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get customer purchase orders error:', error);
    
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

// POST - Create new purchase order for customer (Staff)
export async function POST(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'purchase_orders', action: 'create' },
      rateLimiter: generalLimiter
    })(req);

    if (middlewareResult instanceof NextResponse) {
      return middlewareResult;
    }

    const { user } = middlewareResult;
    
    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    await connectDB();
    
    const body = await req.json();
    const sanitizedBody = sanitizeInput(body);
    
    const { customerId, partId, poNumber, quantity, description } = sanitizedBody;

    // Validate required fields
    if (!customerId || !partId || !poNumber || !quantity) {
      return NextResponse.json(
        apiResponse(false, null, 'Customer, Part, PO Number, dan Quantity wajib diisi'),
        { status: 400 }
      );
    }

    // Validate quantity is positive number
    if (quantity <= 0) {
      return NextResponse.json(
        apiResponse(false, null, 'Quantity harus lebih dari 0'),
        { status: 400 }
      );
    }

    // Verify customer exists and is active
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak ditemukan'),
        { status: 404 }
      );
    }

    if (customer.status !== 'active') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak aktif, tidak dapat menambahkan PO'),
        { status: 403 }
      );
    }

    // Verify part exists and belongs to customer
    const part = await Part.findById(partId);
    if (!part) {
      return NextResponse.json(
        apiResponse(false, null, 'Part tidak ditemukan'),
        { status: 404 }
      );
    }

    if (part.customerId.toString() !== customerId) {
      return NextResponse.json(
        apiResponse(false, null, 'Part tidak terdaftar untuk customer ini'),
        { status: 400 }
      );
    }

    // Check for duplicate PO number
    const duplicatePO = await PurchaseOrder.findOne({ poNumber });
    if (duplicatePO) {
      return NextResponse.json(
        apiResponse(false, null, 'PO Number sudah digunakan'),
        { status: 409 }
      );
    }

    // Create new purchase order
    const newPO = new PurchaseOrder({
      customerId,
      partId,
      poNumber,
      quantity,
      description: description || '',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newPO.save();

    // AUTO-SYNC: Update Part's poNumber field
    await Part.findByIdAndUpdate(partId, {
      poNumber: poNumber,
      updatedAt: new Date()
    });

    // Populate untuk response
    await newPO.populate('partId', 'name internalPartNo');
    await newPO.populate('customerId', 'name address');

    await createAuditLog(
      user.id,
      user.username,
      'PO_CREATED',
      `PO '${poNumber}' berhasil dibuat untuk customer '${customer.name}' oleh staff`,
      'purchase_order',
      newPO._id.toString(),
      req
    );

    return NextResponse.json(
      apiResponse(true, newPO, 'Purchase Order berhasil dibuat'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create purchase order error:', error);
    
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

// PUT - Update purchase order (Staff)
export async function PUT(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'purchase_orders', action: 'update' },
      rateLimiter: generalLimiter
    })(req);

    if (middlewareResult instanceof NextResponse) {
      return middlewareResult;
    }

    const { user } = middlewareResult;
    
    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    await connectDB();
    
    const body = await req.json();
    const sanitizedBody = sanitizeInput(body);
    const { id, partId, poNumber, quantity, description, status } = sanitizedBody;

    if (!id) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'),
        { status: 400 }
      );
    }

    // Check if PO exists
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return NextResponse.json(
        apiResponse(false, null, 'Purchase Order tidak ditemukan'),
        { status: 404 }
      );
    }

    // Store old values for auto-sync
    const oldPartId = po.partId.toString();
    const oldPoNumber = po.poNumber;

    // Check if customer is active
    const customer = await Customer.findById(po.customerId);
    if (!customer || customer.status !== 'active') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak aktif, tidak dapat mengupdate PO'),
        { status: 403 }
      );
    }

    // Validate quantity if being updated
    if (quantity !== undefined && quantity <= 0) {
      return NextResponse.json(
        apiResponse(false, null, 'Quantity harus lebih dari 0'),
        { status: 400 }
      );
    }

    // Check for duplicate PO number if being updated
    if (poNumber && poNumber !== po.poNumber) {
      const duplicatePO = await PurchaseOrder.findOne({
        poNumber: poNumber,
        _id: { $ne: id }
      });

      if (duplicatePO) {
        return NextResponse.json(
          apiResponse(false, null, 'PO Number sudah digunakan'),
          { status: 409 }
        );
      }
    }

    // Verify part if being updated
    if (partId && partId !== oldPartId) {
      const part = await Part.findById(partId);
      if (!part) {
        return NextResponse.json(
          apiResponse(false, null, 'Part tidak ditemukan'),
          { status: 404 }
        );
      }

      if (part.customerId.toString() !== po.customerId.toString()) {
        return NextResponse.json(
          apiResponse(false, null, 'Part tidak terdaftar untuk customer ini'),
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { updatedAt: new Date() };
    if (poNumber !== undefined) updateData.poNumber = poNumber;
    if (partId !== undefined) updateData.partId = partId;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    // Update purchase order
    const updated = await PurchaseOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('partId', 'name internalPartNo')
      .populate('customerId', 'name address');

    if (!updated) {
      return NextResponse.json(
        apiResponse(false, null, 'Gagal mengupdate Purchase Order'),
        { status: 500 }
      );
    }

    // AUTO-SYNC: Handle PO number sync to Part table
    const newPartId = partId || oldPartId;
    const newPoNumber = poNumber || oldPoNumber;

    if (partId && partId !== oldPartId) {
      // Part changed: clear old part's PO and set new part's PO
      await Part.findByIdAndUpdate(oldPartId, {
        poNumber: null,
        updatedAt: new Date()
      });
      await Part.findByIdAndUpdate(newPartId, {
        poNumber: newPoNumber,
        updatedAt: new Date()
      });
    } else if (poNumber && poNumber !== oldPoNumber) {
      // Same part, PO number changed: update the part's PO number
      await Part.findByIdAndUpdate(newPartId, {
        poNumber: newPoNumber,
        updatedAt: new Date()
      });
    }

    await createAuditLog(
      user.id,
      user.username,
      'PO_UPDATED',
      `PO '${updated.poNumber}' berhasil diupdate oleh staff`,
      'purchase_order',
      id,
      req
    );

    return NextResponse.json(
      apiResponse(true, updated, 'Purchase Order berhasil diupdate'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update purchase order error:', error);
    
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

// DELETE - Delete purchase order (Staff)
export async function DELETE(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'purchase_orders', action: 'delete' },
      rateLimiter: generalLimiter
    })(req);

    if (middlewareResult instanceof NextResponse) {
      return middlewareResult;
    }

    const { user } = middlewareResult;
    
    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'),
        { status: 400 }
      );
    }

    // Check if PO exists
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return NextResponse.json(
        apiResponse(false, null, 'Purchase Order tidak ditemukan'),
        { status: 404 }
      );
    }

    // Check if customer is active
    const customer = await Customer.findById(po.customerId);
    if (!customer || customer.status !== 'active') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak aktif, tidak dapat menghapus PO'),
        { status: 403 }
      );
    }

    // Store PO number and part ID for audit and auto-sync
    const poNumber = po.poNumber;
    const partId = po.partId;

    // Delete purchase order
    const deleted = await PurchaseOrder.findByIdAndDelete(id);
    
    if (!deleted) {
      return NextResponse.json(
        apiResponse(false, null, 'Gagal menghapus Purchase Order'),
        { status: 500 }
      );
    }

    // AUTO-SYNC: Clear PO number from Part table
    await Part.findByIdAndUpdate(partId, {
      poNumber: null,
      updatedAt: new Date()
    });

    await createAuditLog(
      user.id,
      user.username,
      'PO_DELETED',
      `PO '${poNumber}' berhasil dihapus oleh staff`,
      'purchase_order',
      id,
      req
    );

    return NextResponse.json(
      apiResponse(true, { id }, 'Purchase Order berhasil dihapus'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete purchase order error:', error);
    
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
