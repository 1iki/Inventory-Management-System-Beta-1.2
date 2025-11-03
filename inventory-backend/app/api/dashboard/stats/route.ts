import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { Report } from '../../../../lib/models';
import { authMiddleware, hasPermission } from '../../../../lib/middleware';
import { apiResponse, AppError } from '../../../../lib/utils';

// GET - Dashboard statistics for Scan OUT per customer from Report table
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    if (!hasPermission(user.role, 'reports', 'read')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query for date range
    const query: any = {
      reportType: 'SCAN_OUT',
      status: 'OUT'
    };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    console.log('📊 Fetching Scan OUT statistics from Report table...', query);

    // Aggregate Scan OUT data per customer from Report table
    const customerOutStats = await Report.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: '$customerName',
          totalQuantity: { $sum: '$quantity' },
          scanCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalQuantity: -1 }
      }
    ]);

    console.log(`✅ Found ${customerOutStats.length} customers with Scan OUT activity`);

    // Format response
    const customerDistribution = customerOutStats.map(stat => ({
      name: stat._id,
      value: stat.totalQuantity,
      scanCount: stat.scanCount
    }));

    const totalScans = customerDistribution.reduce((sum, item) => sum + item.scanCount, 0);
    const totalQuantity = customerDistribution.reduce((sum, item) => sum + item.value, 0);

    console.log(`📊 Total Scan OUT: ${totalScans} scans, ${totalQuantity} pcs`);

    return NextResponse.json(
      apiResponse(true, {
        customerOutDistribution: customerDistribution,
        totalScans,
        totalQuantity,
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now'
        }
      }, 'Statistik Scan OUT per customer berhasil diambil'),
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        apiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      apiResponse(false, null, 'Gagal mengambil statistik dashboard', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}