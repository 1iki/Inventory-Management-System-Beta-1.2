import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Customer, Part, PurchaseOrder } from '@/lib/models';
import { createMiddleware, generalLimiter } from '@/lib/middleware';
import { apiResponse, createAuditLog, sanitizeInput, AppError, handleDatabaseError } from '@/lib/utils';
import { customerSchema } from '@/lib/validations';

// GET - Fetch all active customers (Staff can only see active customers)
export async function GET(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'customers', action: 'read' },
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
    const search = searchParams.get('search') || '';

    // Query filter - Staff hanya lihat customer active
    const query: any = { status: 'active' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(query)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      apiResponse(true, customers, 'Data customers berhasil diambil'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get staff customers error:', error);
    
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

// POST - Create new customer (Staff)
export async function POST(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'customers', action: 'create' },
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

    // Validate input
    try {
      await customerSchema.validate(sanitizedBody, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        apiResponse(false, null, 'Data tidak valid', validationError.errors?.join(', ')),
        { status: 400 }
      );
    }

    const { name, address, contactPerson, phone, email } = sanitizedBody;

    // Check if customer with same name already exists
    const existingCustomer = await Customer.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      status: { $ne: 'deleted' }
    });
    
    if (existingCustomer) {
      return NextResponse.json(
        apiResponse(false, null, 'Customer dengan nama tersebut sudah ada'),
        { status: 409 }
      );
    }

    const customer = new Customer({ 
      name, 
      address, 
      contactPerson, 
      phone, 
      email,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await customer.save();
    
    await createAuditLog(
      user.id, 
      user.username, 
      'CUSTOMER_CREATED', 
      `Customer '${name}' berhasil dibuat oleh staff`, 
      'customer', 
      customer._id.toString(), 
      req
    );

    return NextResponse.json(
      apiResponse(true, customer, 'Customer berhasil dibuat'), 
      { status: 201 }
    );
  } catch (error) {
    console.error('Create staff customer error:', error);
    
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

// PUT - Update customer (Staff)
export async function PUT(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'customers', action: 'update' },
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

    // Validate update data
    try {
      const partialSchema = customerSchema.partial();
      await partialSchema.validate(updateData, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        apiResponse(false, null, 'Data tidak valid', validationError.errors?.join(', ')),
        { status: 400 }
      );
    }

    // Check if customer exists and is active
    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak ditemukan'), 
        { status: 404 }
      );
    }

    if (existingCustomer.status !== 'active') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak dapat diupdate karena sedang dalam proses delete atau sudah dihapus'), 
        { status: 403 }
      );
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== existingCustomer.name) {
      const duplicateCustomer = await Customer.findOne({ 
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        _id: { $ne: id },
        status: { $ne: 'deleted' }
      });
      
      if (duplicateCustomer) {
        return NextResponse.json(
          apiResponse(false, null, 'Customer dengan nama tersebut sudah ada'),
          { status: 409 }
        );
      }
    }

    const updated = await Customer.findByIdAndUpdate(
      id, 
      { ...updateData, updatedAt: new Date() }, 
      { new: true }
    );

    await createAuditLog(
      user.id, 
      user.username, 
      'CUSTOMER_UPDATED', 
      `Customer '${updated.name}' berhasil diupdate oleh staff`, 
      'customer', 
      id, 
      req
    );

    return NextResponse.json(
      apiResponse(true, updated, 'Customer berhasil diupdate'), 
      { status: 200 }
    );
  } catch (error) {
    console.error('Update staff customer error:', error);
    
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

// DELETE - Request delete customer (Staff can only request, not directly delete)
export async function DELETE(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'customers', action: 'delete' },
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
    const { id, reason } = body;
    
    if (!id) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'), 
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        apiResponse(false, null, 'Alasan penghapusan harus diisi'), 
        { status: 400 }
      );
    }

    // Check if customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak ditemukan'), 
        { status: 404 }
      );
    }

    if (customer.status === 'pending_delete') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer sudah dalam status pending delete'), 
        { status: 409 }
      );
    }

    if (customer.status === 'deleted') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer sudah dihapus'), 
        { status: 410 }
      );
    }

    // Check if staff or higher role
    if (user.role === 'staff') {
      // Staff can only request delete - set to pending_delete
      customer.status = 'pending_delete';
      customer.deleteRequest = {
        userId: user.id,
        username: user.username,
        reason: reason.trim(),
        timestamp: new Date(),
        status: 'pending'
      };
      customer.updatedAt = new Date();
      
      await customer.save();

      await createAuditLog(
        user.id, 
        user.username, 
        'CUSTOMER_DELETE_REQUESTED', 
        `Staff '${user.username}' request delete customer '${customer.name}' dengan alasan: ${reason}`, 
        'customer', 
        id, 
        req
      );

      return NextResponse.json(
        apiResponse(true, { 
          customer,
          message: 'Request delete customer berhasil dibuat dan menunggu approval dari admin/manager/direktur' 
        }, 'Request delete customer berhasil diajukan'), 
        { status: 200 }
      );
    } else {
      // Admin/Manager/Direktur can directly approve delete
      // But still check references first
      const partCount = await Part.countDocuments({ customerId: id });
      const poCount = await PurchaseOrder.countDocuments({ customerId: id });
      
      if (partCount > 0 || poCount > 0) {
        return NextResponse.json(
          apiResponse(false, null, `Customer tidak dapat dihapus karena masih digunakan oleh ${partCount} part dan ${poCount} purchase order`), 
          { status: 409 }
        );
      }

      customer.status = 'deleted';
      customer.deleteRequest = {
        userId: user.id,
        username: user.username,
        reason: reason.trim(),
        timestamp: new Date(),
        approvedBy: user.id,
        approvalTimestamp: new Date(),
        status: 'approved'
      };
      customer.updatedAt = new Date();
      
      await customer.save();

      await createAuditLog(
        user.id, 
        user.username, 
        'CUSTOMER_DELETED', 
        `Customer '${customer.name}' berhasil dihapus langsung oleh ${user.role}`, 
        'customer', 
        id, 
        req
      );

      return NextResponse.json(
        apiResponse(true, { deletedId: id }, 'Customer berhasil dihapus'), 
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Delete staff customer error:', error);
    
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
