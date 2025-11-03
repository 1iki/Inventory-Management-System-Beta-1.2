import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Part, Customer, InventoryItem } from '@/lib/models';
import { createMiddleware, generalLimiter } from '@/lib/middleware';
import { apiResponse, createAuditLog, AppError, handleDatabaseError, sanitizeInput } from '@/lib/utils';

// GET - Fetch parts by customer ID
export async function GET(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'parts', action: 'read' },
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
        { name: { $regex: search, $options: 'i' } },
        { internalPartNo: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [parts, total] = await Promise.all([
      Part.find(query)
        .sort({ name: 1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Part.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      apiResponse(true, {
        customer: {
          _id: customer._id,
          name: customer.name,
          address: customer.address
        },
        parts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, 'Data parts berhasil diambil'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get customer parts error:', error);
    
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

// POST - Create new part for customer (Staff)
export async function POST(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'parts', action: 'create' },
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
    
    const { customerId, name, internalPartNo, description, poNumber, supplierInfo } = sanitizedBody;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter customerId wajib diisi'),
        { status: 400 }
      );
    }

    if (!name || !internalPartNo) {
      return NextResponse.json(
        apiResponse(false, null, 'Nama part dan Internal Part No wajib diisi'),
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
        apiResponse(false, null, 'Customer tidak aktif, tidak dapat menambahkan part'),
        { status: 403 }
      );
    }

    // Check for duplicate internalPartNo
    const duplicatePart = await Part.findOne({ internalPartNo });
    if (duplicatePart) {
      return NextResponse.json(
        apiResponse(false, null, 'Internal Part Number sudah digunakan'),
        { status: 409 }
      );
    }

    // Create new part
    const newPart = new Part({
      customerId,
      name,
      internalPartNo,
      description: description || '',
      poNumber: poNumber || '', // Tambahkan poNumber field
      supplierInfo: supplierInfo || { id: '', partNumber: '', description: '' },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newPart.save();

    await createAuditLog(
      user.id,
      user.username,
      'PART_CREATED',
      `Part '${name}' berhasil dibuat untuk customer '${customer.name}' oleh staff${poNumber ? ` dengan PO Number '${poNumber}'` : ''}`,
      'part',
      newPart._id.toString(),
      req
    );

    return NextResponse.json(
      apiResponse(true, newPart, 'Part berhasil dibuat'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create customer part error:', error);
    
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

// PUT - Update part (Staff)
export async function PUT(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'parts', action: 'update' },
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
    const { id, ...updateData } = sanitizedBody;

    if (!id) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'),
        { status: 400 }
      );
    }

    // Check if part exists
    const part = await Part.findById(id);
    if (!part) {
      return NextResponse.json(
        apiResponse(false, null, 'Part tidak ditemukan'),
        { status: 404 }
      );
    }

    // Check if customer is active
    const customer = await Customer.findById(part.customerId);
    if (!customer || customer.status !== 'active') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak aktif, tidak dapat mengupdate part'),
        { status: 403 }
      );
    }

    // Check for duplicate internalPartNo if being updated
    if (updateData.internalPartNo && updateData.internalPartNo !== part.internalPartNo) {
      const duplicatePart = await Part.findOne({
        internalPartNo: updateData.internalPartNo,
        _id: { $ne: id }
      });

      if (duplicatePart) {
        return NextResponse.json(
          apiResponse(false, null, 'Internal Part Number sudah digunakan'),
          { status: 409 }
        );
      }
    }

    // Pastikan poNumber ikut diupdate
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    };

    const updated = await Part.findByIdAndUpdate(
      id,
      dataToUpdate,
      { new: true }
    ).populate('customerId', 'name address');

    await createAuditLog(
      user.id,
      user.username,
      'PART_UPDATED',
      `Part '${updated.name}' berhasil diupdate oleh staff${updateData.poNumber ? ` dengan PO Number '${updateData.poNumber}'` : ''}`,
      'part',
      id,
      req
    );

    return NextResponse.json(
      apiResponse(true, updated, 'Part berhasil diupdate'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update customer part error:', error);
    
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

// DELETE - Delete part (with validation)
export async function DELETE(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'parts', action: 'delete' },
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
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'),
        { status: 400 }
      );
    }

    // Check if part exists
    const part = await Part.findById(id);
    if (!part) {
      return NextResponse.json(
        apiResponse(false, null, 'Part tidak ditemukan'),
        { status: 404 }
      );
    }

    // Check if customer is active
    const customer = await Customer.findById(part.customerId);
    if (!customer || customer.status !== 'active') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak aktif, tidak dapat menghapus part'),
        { status: 403 }
      );
    }

    // Check if part is being used in inventory
    const invCount = await InventoryItem.countDocuments({ partId: id });
    
    if (invCount > 0) {
      return NextResponse.json(
        apiResponse(false, null, `Part tidak dapat dihapus karena masih digunakan oleh ${invCount} inventory item`),
        { status: 409 }
      );
    }

    await Part.findByIdAndDelete(id);

    await createAuditLog(
      user.id,
      user.username,
      'PART_DELETED',
      `Part '${part.name}' berhasil dihapus oleh staff`,
      'part',
      id,
      req
    );

    return NextResponse.json(
      apiResponse(true, { deletedId: id }, 'Part berhasil dihapus'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete customer part error:', error);
    
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
