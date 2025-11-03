import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { Report } from '../../../../lib/models';
import { authMiddleware, hasPermission } from '../../../../lib/middleware';
import { apiResponse } from '../../../../lib/utils';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    if (!hasPermission(user.role, 'reports', 'read')) {
      return NextResponse.json(apiResponse(false, null, 'Akses ditolak'), { status: 403 });
    }
    await connectDB();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const query: any = { reportType: 'SCAN_OUT', status: 'OUT' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const customerOutStats = await Report.aggregate([
      { $match: query },
      { $group: { _id: '$customerName', totalQuantity: { $sum: '$quantity' }, scanCount: { $sum: 1 } } },
      { $sort: { totalQuantity: -1 } }
    ]);
    const customerDistribution = customerOutStats.map(stat => ({
      name: stat._id,
      value: stat.totalQuantity,
      scanCount: stat.scanCount
    }));
    return NextResponse.json(apiResponse(true, {
      customerOutDistribution: customerDistribution,
      totalScans: customerDistribution.reduce((sum, item) => sum + item.scanCount, 0),
      totalQuantity: customerDistribution.reduce((sum, item) => sum + item.value, 0)
    }, 'Statistik berhasil diambil'), { status: 200 });
  } catch (error) {
    return NextResponse.json(apiResponse(false, null, 'Gagal mengambil statistik'), { status: 500 });
  }
}
