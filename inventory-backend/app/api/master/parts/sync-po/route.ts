import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authorize } from '@/lib/middleware';
import { connectDB } from '@/lib/db';
import { Part, PurchaseOrder, AuditLog } from '@/lib/models';
import { Types } from 'mongoose';

/**
 * GET /api/master/parts/sync-po
 * Preview PO Number sync before executing
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;

    // Authorize - Only admin, direktur, manager
    const allowed = authorize(['admin', 'direktur', 'manager'])(user.role);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Insufficient permissions' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get all purchase orders with their parts
    const purchaseOrders = await PurchaseOrder.find({ isDeleted: false })
      .populate('partId', 'name internalPartNo poNumber')
      .populate('customerId', 'name')
      .lean();

    const preview = [];
    let needsSyncCount = 0;

    for (const po of purchaseOrders) {
      const part = po.partId as any;
      if (part && Types.ObjectId.isValid(part._id)) {
        const needsSync = !part.poNumber || part.poNumber !== po.poNumber;
        
        if (needsSync) {
          needsSyncCount++;
        }

        preview.push({
          poNumber: po.poNumber,
          partId: part._id.toString(),
          partName: part.name,
          internalPartNo: part.internalPartNo,
          currentPONumber: part.poNumber || '(empty)',
          needsSync,
          status: needsSync ? 'needs-sync' : 'already-synced'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Preview generated successfully',
      data: {
        totalPOs: purchaseOrders.length,
        needsSyncCount,
        preview
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating sync preview:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate preview', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master/parts/sync-po
 * Sync PO Numbers from Purchase Orders to Parts
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;

    // Authorize - Only admin, direktur, manager
    const allowed = authorize(['admin', 'direktur', 'manager'])(user.role);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Insufficient permissions' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get all purchase orders
    const purchaseOrders = await PurchaseOrder.find({ isDeleted: false })
      .populate('partId', 'name internalPartNo poNumber')
      .lean();

    const results = [];
    let syncedCount = 0;

    for (const po of purchaseOrders) {
      try {
        const part = po.partId as any;
        
        if (!part || !Types.ObjectId.isValid(part._id)) {
          results.push({
            partId: po.partId?.toString() || 'unknown',
            poNumber: po.poNumber,
            status: 'part-not-found' as const,
            error: 'Part not found or invalid'
          });
          continue;
        }

        // Check if part already has this PO number
        if (part.poNumber === po.poNumber) {
          results.push({
            partId: part._id.toString(),
            partName: part.name,
            poNumber: po.poNumber,
            status: 'already-synced' as const
          });
          continue;
        }

        // Update part with PO number
        await Part.findByIdAndUpdate(
          part._id,
          { 
            poNumber: po.poNumber,
            updatedAt: new Date()
          },
          { new: true }
        );

        syncedCount++;
        results.push({
          partId: part._id.toString(),
          partName: part.name,
          poNumber: po.poNumber,
          status: 'synced' as const
        });

      } catch (error: any) {
        results.push({
          partId: po.partId?.toString() || 'unknown',
          poNumber: po.poNumber,
          status: 'error' as const,
          error: error.message
        });
      }
    }

    // Log audit
    await AuditLog.create({
      userId: user.id,
      username: user.username,
      action: 'SYNC_PO_NUMBERS',
      resourceType: 'PART',
      resourceId: 'bulk-sync',
      details: {
        totalPOs: purchaseOrders.length,
        syncedCount,
        results: results.slice(0, 10) // Only log first 10 for brevity
      },
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} parts with PO numbers`,
      data: {
        totalPOs: purchaseOrders.length,
        syncedCount,
        results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error syncing PO numbers:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to sync PO numbers', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}