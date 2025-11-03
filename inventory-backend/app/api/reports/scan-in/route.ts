import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Report, InventoryItem, Customer, Part, PurchaseOrder } from '@/lib/models';
import { createMiddleware, generalLimiter } from '@/lib/middleware';
import { apiResponse, createAuditLog, AppError, handleDatabaseError } from '@/lib/utils';
import { startSession } from 'mongoose';

// Define interfaces for better type safety
interface ScanInRequestBody {
  itemId: string;
  notes?: string;
}

interface PopulatedInventoryItem {
  _id: any;
  uniqueId: string;
  quantity: number;
  status: string;
  lotId: string;
  gateId: string;
  location: any;
  barcode: string;
  createdAt: Date;
  updatedAt: Date;
  history: any[];
  partId: {
    _id: any;
    name: string;
    internalPartNo: string;
    description: string;
    customerId: {
      _id: any;
      name: string;
    };
  };
  poId: {
    _id: any;
    poNumber: string;
  };
  save: (options?: any) => Promise<any>;
}

// GET - Fetch scan-in reports with filters
export async function GET(req: NextRequest) {
  try {
    // Apply middleware
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'reports', action: 'read' },
      rateLimiter: generalLimiter
    })(req);

    if (middlewareResult instanceof NextResponse) {
      return middlewareResult;
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    // Build filter query
    const filter: any = { reportType: 'SCAN_IN' };

    // Date range filter based on filterType
    const filterType = searchParams.get('filterType');
    const now = new Date();
    
    if (filterType) {
      filter.createdAt = {};
      
      switch (filterType) {
        case 'daily':
          // Today
          filter.createdAt.$gte = new Date(now.setHours(0, 0, 0, 0));
          filter.createdAt.$lte = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'weekly':
          // This week (last 7 days)
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          filter.createdAt.$gte = weekAgo;
          break;
        case 'monthly':
          // This month
          filter.createdAt.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          // This year
          filter.createdAt.$gte = new Date(now.getFullYear(), 0, 1);
          break;
      }
    }

    // Custom date range filter (overrides filterType)
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
      }
    }

    // Customer filter
    const customerId = searchParams.get('customerId');
    if (customerId) {
      filter.customerId = customerId;
    }

    const customerName = searchParams.get('customerName');
    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }

    // Part filter
    const partName = searchParams.get('partName');
    if (partName) {
      filter.partName = { $regex: partName, $options: 'i' };
    }

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      filter.status = status;
    }

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    // Execute query with pagination
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter)
    ]);

    // Calculate summary statistics
    const summary = await Report.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          uniqueCustomers: { $addToSet: '$customerId' },
          uniqueParts: { $addToSet: '$partId' }
        }
      }
    ]);

    const summaryData = summary[0] || {
      totalScans: 0,
      totalQuantity: 0,
      uniqueCustomers: [],
      uniqueParts: []
    };

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage
    };

    return NextResponse.json(
      apiResponse(
        true, 
        {
          reports,
          summary: {
            totalScans: summaryData.totalScans,
            totalQuantity: summaryData.totalQuantity,
            uniqueCustomers: summaryData.uniqueCustomers.length,
            uniqueParts: summaryData.uniqueParts.length
          },
          pagination
        },
        'Scan in reports berhasil diambil'
      ),
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Get scan in reports error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        apiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      apiResponse(false, null, dbError.message),
      { status: dbError.statusCode }
    );
  }
}

// POST - Create scan IN report for existing item
export async function POST(req: NextRequest) {
  let session: any = null;
  
  try {
    console.log('🔍 [SCAN-IN] Starting POST request...');
    
    // Apply middleware
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'inventory', action: 'scan' },
      rateLimiter: generalLimiter
    })(req);

    if (middlewareResult instanceof NextResponse) {
      console.log('❌ [SCAN-IN] Middleware returned NextResponse (auth failed)');
      return middlewareResult;
    }

    const { user } = middlewareResult;
    
    console.log('✅ [SCAN-IN] User authenticated:', { id: user?.id, username: user?.username, name: user?.name });
    
    if (!user) {
      console.error('❌ [SCAN-IN] User is undefined after middleware');
      throw new AppError('User tidak ditemukan', 401);
    }

    await connectDB();
    console.log('✅ [SCAN-IN] Database connected');

    // 🔧 PERBAIKAN: Start session SETELAH connectDB()
    session = await startSession();
    console.log('✅ [SCAN-IN] Session created');

    const body: ScanInRequestBody = await req.json();
    console.log('📦 [SCAN-IN] Request body:', body);
    
    const { itemId, notes } = body;

    if (!itemId) {
      console.error('❌ [SCAN-IN] itemId is missing');
      throw new AppError('Item ID harus diisi', 400);
    }

    // Start transaction
    session.startTransaction();
    console.log('🔄 [SCAN-IN] Transaction started');

    // Find item with proper typing
    console.log('🔍 [SCAN-IN] Finding item with ID:', itemId);
    const item = await InventoryItem.findById(itemId)
      .populate({
        path: 'partId',
        populate: {
          path: 'customerId',
          select: 'name'
        }
      })
      .populate('poId', 'poNumber')
      .session(session) as PopulatedInventoryItem | null;

    if (!item) {
      console.error('❌ [SCAN-IN] Item not found:', itemId);
      await session.abortTransaction();
      throw new AppError(`Item dengan ID '${itemId}' tidak ditemukan`, 404);
    }

    console.log('✅ [SCAN-IN] Item found:', {
      uniqueId: item.uniqueId,
      status: item.status,
      partId: item.partId?._id,
      customerId: item.partId?.customerId?._id
    });

    // Validate item status for scan in
    if (item.status === 'PENDING_DELETE') {
      console.error('❌ [SCAN-IN] Item is pending delete');
      await session.abortTransaction();
      throw new AppError(`Item '${item.uniqueId}' sedang dalam proses penghapusan`, 400);
    }

    if (item.status === 'DAMAGED') {
      console.error('❌ [SCAN-IN] Item is damaged');
      await session.abortTransaction();
      throw new AppError(`Item '${item.uniqueId}' berstatus DAMAGED`, 400);
    }

    // Update item status to IN if needed
    const now = new Date();
    const previousStatus = item.status;
    
    if (item.status !== 'IN') {
      console.log('🔄 [SCAN-IN] Updating item status to IN');
      item.status = 'IN';
      item.updatedAt = now;
      
      // Add to history
      item.history.push({
        status: 'IN',
        timestamp: now,
        userId: user.id,
        notes: notes || 'Item scanned in'
      });

      await item.save({ session });
      console.log('✅ [SCAN-IN] Item status updated');
    }

    // Create report entry for scan in
    console.log('📝 [SCAN-IN] Creating report with user:', {
      userId: user.id,
      username: user.username,
      name: user.name || user.username
    });
    
    const report = new Report({
      uniqueId: item.uniqueId,
      itemId: item._id,
      customerId: item.partId.customerId._id,
      partId: item.partId._id,
      poId: item.poId._id,
      reportType: 'SCAN_IN',
      quantity: item.quantity,
      status: 'IN',
      lotId: item.lotId,
      gateId: item.gateId,
      location: item.location,
      scannedBy: {
        userId: user.id,
        username: user.username,
        name: user.name || user.username
      },
      customerName: item.partId.customerId.name,
      partName: item.partId.name,
      poNumber: item.poId.poNumber,
      notes: notes || undefined
    });

    console.log('💾 [SCAN-IN] Saving report...');
    await report.save({ session });
    console.log('✅ [SCAN-IN] Report saved');

    // Commit transaction
    await session.commitTransaction();
    console.log('✅ [SCAN-IN] Transaction committed');

    // Create audit log (outside transaction as it's not critical)
    await createAuditLog(
      user.id,
      user.username,
      'ITEM_SCAN_IN',
      `Item '${item.uniqueId}' (${item.partId.name}) berhasil di-scan IN${notes ? ` - ${notes}` : ''}`,
      'inventory',
      item._id.toString(),
      req
    ).catch(auditError => {
      console.error('⚠️ [SCAN-IN] Audit log creation failed:', auditError);
    });

    // Prepare response data
    const responseData = {
      item: {
        uniqueId: item.uniqueId,
        quantity: item.quantity,
        status: item.status,
        lotId: item.lotId,
        gateId: item.gateId,
        location: item.location,
        barcode: item.barcode,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      },
      part: {
        id: item.partId._id,
        name: item.partId.name,
        internalPartNo: item.partId.internalPartNo,
        description: item.partId.description
      },
      customer: {
        id: item.partId.customerId._id,
        name: item.partId.customerId.name
      },
      purchaseOrder: {
        id: item.poId._id,
        poNumber: item.poId.poNumber
      },
      scanInfo: {
        scannedBy: user.username,
        scanTime: now,
        previousStatus,
        notes: notes || null
      },
      report: {
        id: report._id,
        reportType: report.reportType,
        createdAt: report.createdAt
      }
    };

    console.log('✅ [SCAN-IN] Success! Sending response');
    return NextResponse.json(
      apiResponse(
        true, 
        responseData, 
        `Item '${item.uniqueId}' berhasil di-scan IN`
      ),
      { status: 200 }
    );

  } catch (error: unknown) {
    // Rollback transaction on any error
    if (session && session.inTransaction()) {
      await session.abortTransaction();
      console.log('🔄 [SCAN-IN] Transaction rolled back');
    }
    
    console.error('❌ [SCAN-IN] Error occurred:', error);
    console.error('❌ [SCAN-IN] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof AppError) {
      console.error('❌ [SCAN-IN] AppError:', { message: error.message, statusCode: error.statusCode });
      return NextResponse.json(
        apiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    // Handle unknown error type properly
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ [SCAN-IN] Generic error message:', errorMessage);
    
    const dbError = handleDatabaseError(error);
    console.error('❌ [SCAN-IN] Database error:', { message: dbError.message, statusCode: dbError.statusCode });
    
    return NextResponse.json(
      apiResponse(false, null, dbError.message),
      { status: dbError.statusCode }
    );
  } finally {
    if (session) {
      await session.endSession();
      console.log('🏁 [SCAN-IN] Session ended');
    }
    console.log('🏁 [SCAN-IN] Request completed');
  }
}
