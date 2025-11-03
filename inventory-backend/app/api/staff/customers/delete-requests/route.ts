import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Customer, Part, PurchaseOrder } from '@/lib/models';
import { createMiddleware, generalLimiter } from '@/lib/middleware';
import { apiResponse, createAuditLog, AppError, handleDatabaseError } from '@/lib/utils';

// GET - Fetch all pending delete requests
export async function GET(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'customers', action: 'approve_delete' },
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || 'pending';
    const skip = (page - 1) * limit;

    // Query untuk customer dengan status pending_delete
    const query: any = { 
      status: 'pending_delete',
      'deleteRequest.status': status
    };

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ 'deleteRequest.timestamp': -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Customer.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      apiResponse(true, {
        requests: customers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, 'Data delete requests berhasil diambil'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get customer delete requests error:', error);
    
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

// PUT - Approve or reject delete request
export async function PUT(req: NextRequest) {
  try {
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'customers', action: 'approve_delete' },
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
    const { id, action, notes } = body;

    if (!id) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'),
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        apiResponse(false, null, 'Action harus approve atau reject'),
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

    if (customer.status !== 'pending_delete') {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak dalam status pending delete'),
        { status: 400 }
      );
    }

    if (!customer.deleteRequest) {
      return NextResponse.json(
        apiResponse(false, null, 'Delete request tidak ditemukan'),
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Check references before approving delete
      const partCount = await Part.countDocuments({ customerId: id });
      const poCount = await PurchaseOrder.countDocuments({ customerId: id });
      
      if (partCount > 0 || poCount > 0) {
        return NextResponse.json(
          apiResponse(false, null, `Customer tidak dapat dihapus karena masih digunakan oleh ${partCount} part dan ${poCount} purchase order`),
          { status: 409 }
        );
      }

      // Approve delete
      customer.status = 'deleted';
      customer.deleteRequest.status = 'approved';
      customer.deleteRequest.approvedBy = user.id;
      customer.deleteRequest.approvalTimestamp = new Date();
      customer.updatedAt = new Date();

      await customer.save();

      await createAuditLog(
        user.id,
        user.username,
        'CUSTOMER_DELETE_APPROVED',
        `Delete request untuk customer '${customer.name}' disetujui oleh ${user.role} ${user.username}. Alasan: ${customer.deleteRequest.reason}${notes ? `. Notes: ${notes}` : ''}`,
        'customer',
        id,
        req
      );

      return NextResponse.json(
        apiResponse(true, customer, 'Delete request berhasil disetujui dan customer telah dihapus'),
        { status: 200 }
      );
    } else {
      // Reject delete
      customer.status = 'active';
      customer.deleteRequest.status = 'rejected';
      customer.deleteRequest.approvedBy = user.id;
      customer.deleteRequest.approvalTimestamp = new Date();
      customer.updatedAt = new Date();

      await customer.save();

      await createAuditLog(
        user.id,
        user.username,
        'CUSTOMER_DELETE_REJECTED',
        `Delete request untuk customer '${customer.name}' ditolak oleh ${user.role} ${user.username}. Alasan request: ${customer.deleteRequest.reason}${notes ? `. Notes penolakan: ${notes}` : ''}`,
        'customer',
        id,
        req
      );

      return NextResponse.json(
        apiResponse(true, customer, 'Delete request berhasil ditolak dan customer dikembalikan ke status active'),
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Process customer delete request error:', error);
    
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
