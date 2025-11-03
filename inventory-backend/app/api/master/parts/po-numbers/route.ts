import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Part, PurchaseOrder } from '@/lib/models';
import { authenticate } from '@/lib/middleware';
import { apiResponse } from '@/lib/utils';

// GET - Fetch all PO Numbers from Purchase Orders
export async function GET(req: NextRequest) {
  try {
    await authenticate(req);
    await connectDB();

    // Fetch all purchase orders with their PO numbers
    const purchaseOrders = await PurchaseOrder.find()
      .select('poNumber partId')
      .populate('partId', 'name internalPartNo poNumber')
      .sort({ poNumber: 1 });

    const poNumbers = purchaseOrders.map(po => ({
      poNumber: po.poNumber,
      partId: po.partId?._id,
      partName: po.partId?.name,
      internalPartNo: po.partId?.internalPartNo,
      currentPoNumber: po.partId?.poNumber // PO Number yang sudah ada di Part
    }));

    return NextResponse.json(
      apiResponse(true, poNumbers, 'Data PO Numbers berhasil diambil'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get PO Numbers error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Unauthorized atau terjadi kesalahan', error instanceof Error ? error.message : 'Unknown error'),
      { status: 401 }
    );
  }
}

// POST - Auto-sync PO Numbers from Purchase Orders to Parts
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (user instanceof NextResponse) {
      return user;
    }
    
    await connectDB();

    console.log('🔄 [AUTO-SYNC] Starting PO Number synchronization...');

    // Get all purchase orders
    const purchaseOrders = await PurchaseOrder.find().select('poNumber partId');
    
    let syncedCount = 0;
    let errorCount = 0;
    const syncResults: any[] = [];

    for (const po of purchaseOrders) {
      try {
        const part = await Part.findById(po.partId);
        
        if (!part) {
          console.warn(`⚠️ [AUTO-SYNC] Part not found for PO ${po.poNumber} (partId: ${po.partId})`);
          errorCount++;
          syncResults.push({
            poNumber: po.poNumber,
            partId: po.partId,
            status: 'error',
            message: 'Part not found'
          });
          continue;
        }

        // Only update if PO Number is different or empty
        if (part.poNumber !== po.poNumber) {
          await Part.findByIdAndUpdate(po.partId, {
            poNumber: po.poNumber,
            updatedAt: new Date()
          });
          
          console.log(`✅ [AUTO-SYNC] Synced PO '${po.poNumber}' to Part '${part.name}' (${po.partId})`);
          syncedCount++;
          syncResults.push({
            poNumber: po.poNumber,
            partId: po.partId,
            partName: part.name,
            status: 'synced',
            oldValue: part.poNumber,
            newValue: po.poNumber
          });
        } else {
          syncResults.push({
            poNumber: po.poNumber,
            partId: po.partId,
            partName: part.name,
            status: 'skipped',
            message: 'Already synced'
          });
        }
      } catch (err) {
        console.error(`❌ [AUTO-SYNC] Error syncing PO ${po.poNumber}:`, err);
        errorCount++;
        syncResults.push({
          poNumber: po.poNumber,
          partId: po.partId,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    console.log(`🔄 [AUTO-SYNC] Completed: ${syncedCount} synced, ${errorCount} errors`);

    return NextResponse.json(
      apiResponse(true, {
        syncedCount,
        errorCount,
        totalProcessed: purchaseOrders.length,
        details: syncResults
      }, `Auto-sync selesai: ${syncedCount} PO Number berhasil di-sync${errorCount > 0 ? `, ${errorCount} error` : ''}`),
      { status: 200 }
    );
  } catch (error) {
    console.error('Auto-sync PO Numbers error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Gagal melakukan auto-sync', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}
