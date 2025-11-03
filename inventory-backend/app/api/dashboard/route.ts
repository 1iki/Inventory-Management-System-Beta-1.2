import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { InventoryItem, Report, Customer, AuditLog } from '@/lib/models';
import { authMiddleware } from '@/lib/middleware';
import { apiResponse } from '@/lib/utils';

// GET - Enhanced Dashboard with Analytics
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    console.log(`📊 Dashboard request from user: ${user.username} (${user.role})`);

    await connectDB();
    console.log('📊 Generating enhanced dashboard analytics...');

    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get('dateRange') || '7'; // Default 7 days

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));

    // Parallel queries for better performance
    const [
      itemsInToday,
      itemsOutToday,
      totalStock,
      lowStockItems,
      customerStock,
      trendingData,
      recentActivity,
      scanStats
    ] = await Promise.all([
      // Items IN today
      InventoryItem.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
        'history.status': 'IN'
      }),

      // Items OUT today
      InventoryItem.countDocuments({
        updatedAt: { $gte: today, $lt: tomorrow },
        status: 'OUT'
      }),

      // Total stock quantity (items with status IN)
      InventoryItem.aggregate([
        { $match: { status: 'IN' } },
        { $group: { _id: null, total: { $sum: '$quantity' }, count: { $sum: 1 } } }
      ]),

      // Low stock items (items with quantity < 10)
      InventoryItem.aggregate([
        { $match: { status: 'IN', quantity: { $lt: 10 } } },
        {
          $lookup: {
            from: 'parts',
            localField: 'partId',
            foreignField: '_id',
            as: 'part'
          }
        },
        { $unwind: '$part' },
        {
          $project: {
            uniqueId: 1,
            quantity: 1,
            partName: '$part.name',
            partNumber: '$part.internalPartNo'
          }
        },
        { $limit: 10 }
      ]),

      // Stock per customer
      InventoryItem.aggregate([
        { $match: { status: 'IN' } },
        {
          $lookup: {
            from: 'parts',
            localField: 'partId',
            foreignField: '_id',
            as: 'part'
          }
        },
        { $unwind: '$part' },
        {
          $lookup: {
            from: 'customers',
            localField: 'part.customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        {
          $group: {
            _id: '$customer.name',
            totalQuantity: { $sum: '$quantity' },
            itemCount: { $sum: 1 }
          }
        },
        { $sort: { totalQuantity: -1 } }
      ]),

      // Trending data - Daily scan in/out for the last N days
      Report.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              type: '$reportType'
            },
            count: { $sum: 1 },
            quantity: { $sum: '$quantity' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),

      // Recent activity
      AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .select('action username details timestamp'),

      // Scan statistics
      Report.aggregate([
        {
          $group: {
            _id: '$reportType',
            totalScans: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ])
    ]);

    const totalStockValue = totalStock[0]?.total || 0;
    const totalItems = totalStock[0]?.count || 0;

    // Format customer stock data for charts
    const customerStockData = {
      labels: customerStock.map((item: any) => item._id),
      data: customerStock.map((item: any) => item.totalQuantity),
      itemCounts: customerStock.map((item: any) => item.itemCount)
    };

    // Format trending data
    const dates = [...new Set(trendingData.map((item: any) => item._id.date))].sort();
    const scanInData = dates.map(date => {
      const item = trendingData.find((t: any) => t._id.date === date && t._id.type === 'SCAN_IN');
      return item?.count || 0;
    });
    const scanOutData = dates.map(date => {
      const item = trendingData.find((t: any) => t._id.date === date && t._id.type === 'SCAN_OUT');
      return item?.count || 0;
    });

    // Calculate statistics
    const totalScanIn = scanStats.find((s: any) => s._id === 'SCAN_IN')?.totalScans || 0;
    const totalScanOut = scanStats.find((s: any) => s._id === 'SCAN_OUT')?.totalScans || 0;

    const dashboardData = {
      todayStats: {
        itemsInToday,
        itemsOutToday,
        totalStock: totalStockValue,
        totalItems,
        activeCustomers: customerStock.length,
        lowStockCount: lowStockItems.length
      },
      customerStock: customerStockData,
      trendingData: {
        labels: dates.map(date => {
          const d = new Date(date);
          return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        }),
        scanIn: scanInData,
        scanOut: scanOutData
      },
      scanStatistics: {
        totalScanIn,
        totalScanOut,
        scanInQuantity: scanStats.find((s: any) => s._id === 'SCAN_IN')?.totalQuantity || 0,
        scanOutQuantity: scanStats.find((s: any) => s._id === 'SCAN_OUT')?.totalQuantity || 0
      },
      lowStockItems,
      recentActivity: recentActivity.map((log: any) => ({
        action: log.action,
        username: log.username,
        details: log.details,
        timestamp: log.timestamp
      })),
      user: {
        name: user.name,
        role: user.role
      }
    };

    return NextResponse.json(
      apiResponse(true, dashboardData, 'Dashboard data berhasil dimuat'),
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Dashboard error:', error);

    // Return fallback data on error
    const fallbackData = {
      todayStats: {
        itemsInToday: 0,
        itemsOutToday: 0,
        totalStock: 0,
        totalItems: 0,
        activeCustomers: 0,
        lowStockCount: 0
      },
      customerStock: {
        labels: [],
        data: [],
        itemCounts: []
      },
      trendingData: {
        labels: [],
        scanIn: [],
        scanOut: []
      },
      scanStatistics: {
        totalScanIn: 0,
        totalScanOut: 0,
        scanInQuantity: 0,
        scanOutQuantity: 0
      },
      lowStockItems: [],
      recentActivity: [],
      user: {
        name: 'User',
        role: 'staff'
      },
      error: error.message
    };

    return NextResponse.json(
      apiResponse(false, fallbackData, 'Gagal memuat dashboard', error.message),
      { status: 500 }
    );
  }
}