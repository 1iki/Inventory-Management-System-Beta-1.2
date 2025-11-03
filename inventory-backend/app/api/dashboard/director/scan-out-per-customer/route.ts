import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Report } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Aggregate data dari Report collection untuk Scan OUT per customer
    const scanOutData = await Report.aggregate([
      {
        $match: {
          reportType: 'SCAN_OUT' // Filter hanya untuk Scan OUT
        }
      },
      {
        $group: {
          _id: '$customerName',
          totalScans: { $sum: 1 },
          totalQty: { $sum: '$quantity' }
        }
      },
      {
        $project: {
          _id: 0,
          customer: '$_id',
          totalScans: 1,
          totalQty: 1
        }
      },
      {
        $sort: { totalScans: -1 }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: scanOutData
    });

  } catch (error: any) {
    console.error('Error fetching scan out per customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch scan out data',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
