import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import { AuditLog } from '../../../lib/models';
import { authMiddleware, hasPermission } from '../../../lib/middleware';
import { apiResponse } from '../../../lib/utils';

// GET - Fetch audit logs (Admin only)
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);
    
    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'audit', 'read')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const auditLogs = await AuditLog.find()
      .populate('userId', 'name username')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments();

    return NextResponse.json(
      apiResponse(true, {
        logs: auditLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'Audit logs berhasil diambil'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Terjadi kesalahan saat mengambil audit logs', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}