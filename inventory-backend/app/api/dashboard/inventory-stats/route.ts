import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { InventoryItem } from '../../../../lib/models';
import { authMiddleware, hasPermission } from '../../../../lib/middleware';
import { apiResponse, AppError } from '../../../../lib/utils';

/**
 * GET /api/dashboard/inventory-stats
 * 
 * Returns aggregated inventory statistics without pagination
 * Used by Dashboard to show accurate Total Stok (IN) and other metrics
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    if (!hasPermission(user.role, 'inventory', 'read')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    await connectDB();

    console.log('📊 Calculating inventory statistics from database...');

    // 🎯 Calculate Total Stock (IN) using MongoDB Aggregation
    const totalStockInResult = await InventoryItem.aggregate([
      {
        $match: { status: 'IN' }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          totalItems: { $sum: 1 }
        }
      }
    ]);

    const totalStockIn = totalStockInResult.length > 0 ? totalStockInResult[0].totalQuantity : 0;
    const totalItemsIn = totalStockInResult.length > 0 ? totalStockInResult[0].totalItems : 0;

    // 🎯 Calculate Total Stock (OUT)
    const totalStockOutResult = await InventoryItem.aggregate([
      {
        $match: { status: 'OUT' }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          totalItems: { $sum: 1 }
        }
      }
    ]);

    const totalStockOut = totalStockOutResult.length > 0 ? totalStockOutResult[0].totalQuantity : 0;
    const totalItemsOut = totalStockOutResult.length > 0 ? totalStockOutResult[0].totalItems : 0;

    // 🎯 Calculate items IN today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const itemsInTodayResult = await InventoryItem.aggregate([
      {
        $match: {
          status: 'IN',
          createdAt: {
            $gte: today,
            $lt: tomorrow
          }
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          totalItems: { $sum: 1 }
        }
      }
    ]);

    const itemsInToday = itemsInTodayResult.length > 0 ? itemsInTodayResult[0].totalItems : 0;
    const quantityInToday = itemsInTodayResult.length > 0 ? itemsInTodayResult[0].totalQuantity : 0;

    // 🎯 Calculate items OUT today
    const itemsOutTodayResult = await InventoryItem.aggregate([
      {
        $match: {
          status: 'OUT',
          updatedAt: {
            $gte: today,
            $lt: tomorrow
          }
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          totalItems: { $sum: 1 }
        }
      }
    ]);

    const itemsOutToday = itemsOutTodayResult.length > 0 ? itemsOutTodayResult[0].totalItems : 0;
    const quantityOutToday = itemsOutTodayResult.length > 0 ? itemsOutTodayResult[0].totalQuantity : 0;

    // 🎯 Calculate total transactions
    const totalTransactions = await InventoryItem.countDocuments();

    console.log('✅ Inventory Statistics Calculated:');
    console.log(`   📦 Total Stok (IN): ${totalStockIn} pcs from ${totalItemsIn} items`);
    console.log(`   📤 Total Stok (OUT): ${totalStockOut} pcs from ${totalItemsOut} items`);
    console.log(`   📅 Items IN Today: ${itemsInToday} items (${quantityInToday} pcs)`);
    console.log(`   📅 Items OUT Today: ${itemsOutToday} items (${quantityOutToday} pcs)`);
    console.log(`   📊 Total Transactions: ${totalTransactions}`);

    return NextResponse.json(
      apiResponse(true, {
        totalStockIn,
        totalItemsIn,
        totalStockOut,
        totalItemsOut,
        itemsInToday,
        quantityInToday,
        itemsOutToday,
        quantityOutToday,
        totalTransactions,
        timestamp: new Date().toISOString()
      }, 'Statistik inventory berhasil dihitung'),
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Inventory stats error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        apiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      apiResponse(false, null, 'Gagal menghitung statistik inventory', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}
