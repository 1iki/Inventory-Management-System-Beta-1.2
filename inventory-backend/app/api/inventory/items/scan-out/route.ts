import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import { InventoryItem, Part, Customer, Report } from '../../../../../lib/models';
import { createMiddleware, generalLimiter } from '../../../../../lib/middleware';
import { 
  apiResponse, 
  createAuditLog, 
  AppError, 
  handleDatabaseError,
  sanitizeInput
} from '../../../../../lib/utils';
import { scanOutSchema } from '../../../../../lib/validations';
import { startSession } from 'mongoose';

// Define interfaces for better type safety
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

// POST - Scan OUT item by QR code or unique ID
export async function POST(req: NextRequest) {
  const session = await startSession();
  
  try {
    // Apply middleware with validation
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['staff', 'manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'inventory', action: 'scan' },
      rateLimiter: generalLimiter,
      validationSchema: scanOutSchema
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

    const { qrCodeData, notes } = validatedData;

    // Start transaction
    session.startTransaction();

    // Try to parse QR code data or use as unique ID
    let searchCriteria: any = {};
    
    try {
      // Try to parse as JSON (new format)
      const parsedData = JSON.parse(qrCodeData);
      if (parsedData.uniqueId) {
        searchCriteria.uniqueId = parsedData.uniqueId;
      } else {
        throw new Error('No uniqueId in QR data');
      }
    } catch {
      // Fallback: search by multiple criteria
      searchCriteria = {
        $or: [
          { uniqueId: qrCodeData },
          { qrCodeData: qrCodeData },
          { barcode: qrCodeData }
        ]
      };
    }

    // Find item with proper typing and lock for update
    const item = await InventoryItem.findOne(searchCriteria)
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
      await session.abortTransaction();
      throw new AppError(`Item dengan data '${qrCodeData}' tidak ditemukan`, 404);
    }

    // Validate item status
    if (item.status === 'OUT') {
      await session.abortTransaction();
      throw new AppError(`Item '${item.uniqueId}' sudah berstatus OUT`, 400);
    }

    if (item.status === 'PENDING_DELETE') {
      await session.abortTransaction();
      throw new AppError(`Item '${item.uniqueId}' sedang dalam proses penghapusan`, 400);
    }

    if (item.status === 'DAMAGED') {
      await session.abortTransaction();
      throw new AppError(`Item '${item.uniqueId}' berstatus DAMAGED, tidak dapat di-scan OUT`, 400);
    }

    if (item.status !== 'IN') {
      await session.abortTransaction();
      throw new AppError(`Item '${item.uniqueId}' tidak dapat di-scan OUT (status: ${item.status})`, 400);
    }

    // Update item status to OUT
    const now = new Date();
    const previousStatus = item.status;
    
    item.status = 'OUT';
    item.updatedAt = now;
    
    // Add to history
    item.history.push({
      status: 'OUT',
      timestamp: now,
      userId: user.id,
      notes: notes || 'Item scanned out'
    });

    await item.save({ session });

    // Create report entry for scan out - MUST succeed for data consistency
    const report = new Report({
      uniqueId: item.uniqueId,
      itemId: item._id,
      customerId: item.partId.customerId._id,
      partId: item.partId._id,
      poId: item.poId._id,
      reportType: 'SCAN_OUT',
      quantity: item.quantity,
      status: 'OUT',
      lotId: item.lotId,
      gateId: item.gateId,
      location: item.location,
      scannedBy: {
        userId: user.id,
        username: user.username,
        name: user.name
      },
      customerName: item.partId.customerId.name,
      partName: item.partId.name,
      poNumber: item.poId.poNumber,
      notes: notes || undefined
    });

    await report.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Create audit log (outside transaction as it's not critical)
    await createAuditLog(
      user.id,
      user.username,
      'ITEM_SCAN_OUT',
      `Item '${item.uniqueId}' (${item.partId.name}) berhasil di-scan OUT${notes ? ` - ${notes}` : ''}`,
      'inventory',
      item._id.toString(),
      req
    ).catch(auditError => {
      console.error('Audit log creation failed:', auditError);
      // Don't fail the response if audit log fails
    });

    // Prepare comprehensive response data
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
      }
    };

    return NextResponse.json(
      apiResponse(
        true, 
        responseData, 
        `Item '${item.uniqueId}' berhasil di-scan OUT`
      ),
      { status: 200 }
    );

  } catch (error) {
    // Rollback transaction on any error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    console.error('Scan out error:', error);
    
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
  } finally {
    await session.endSession();
  }
}

// GET - Get item info for scan out preview (optional feature)
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
    const qrCodeData = searchParams.get('qrCodeData');

    if (!qrCodeData) {
      throw new AppError('QR Code data harus diisi', 400);
    }

    // Try to parse QR code data or use as unique ID
    let searchCriteria: any = {};
    
    try {
      const parsedData = JSON.parse(qrCodeData);
      if (parsedData.uniqueId) {
        searchCriteria.uniqueId = parsedData.uniqueId;
      } else {
        throw new Error('No uniqueId in QR data');
      }
    } catch {
      searchCriteria = {
        $or: [
          { uniqueId: qrCodeData },
          { qrCodeData: qrCodeData },
          { barcode: qrCodeData }
        ]
      };
    }

    // Find item for preview with proper typing
    const item = await InventoryItem.findOne(searchCriteria)
      .populate({
        path: 'partId',
        populate: {
          path: 'customerId',
          select: 'name'
        }
      })
      .populate('poId', 'poNumber')
      .lean() as any;

    if (!item) {
      throw new AppError(`Item dengan data '${qrCodeData}' tidak ditemukan`, 404);
    }

    // Return item info for preview
    const previewData = {
      uniqueId: item.uniqueId,
      quantity: item.quantity,
      status: item.status,
      lotId: item.lotId,
      gateId: item.gateId,
      part: {
        name: item.partId?.name || 'N/A',
        internalPartNo: item.partId?.internalPartNo || 'N/A'
      },
      customer: {
        name: item.partId?.customerId?.name || 'N/A'
      },
      canScanOut: item.status === 'IN'
    };

    return NextResponse.json(
      apiResponse(true, previewData, 'Item info berhasil diambil'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Get scan out info error:', error);
    
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