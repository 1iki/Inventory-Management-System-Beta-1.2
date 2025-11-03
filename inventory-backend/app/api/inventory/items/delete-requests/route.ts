import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { InventoryItem } from '@/lib/models';
import { authMiddleware, hasPermission } from '@/lib/middleware';
import { apiResponse, createAuditLog } from '@/lib/utils';

// GET - list pending delete requests
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    await connectDB();

    // Build query based on user role
    let query: any = {
      status: 'PENDING_DELETE',
      'deleteRequest.status': 'pending'
    };

    // Staff can only see their own requests
    if (user.role === 'staff') {
      query['deleteRequest.userId'] = user.id;
    }

    const items = await InventoryItem.find(query)
      .populate('partId', 'name customerId')
      .populate('poId', 'poNumber')
      .sort({ 'deleteRequest.timestamp': -1 });

    // Create audit log for viewing
    await createAuditLog(
      user.id,
      user.username,
      'VIEW_DELETE_REQUESTS',
      `Viewed delete requests`,
      'DELETE_REQUEST',
      user.id,
      req
    );

    return NextResponse.json(apiResponse(true, items, 'Permintaan hapus tertunda'), { status: 200 });
  } catch (error) {
    console.error('List delete requests error:', error);
    return NextResponse.json(apiResponse(false, null, 'Gagal mengambil data', error instanceof Error ? error.message : 'Unknown'), { status: 500 });
  }
}

// POST - create delete request: { uniqueId or id, reason }
export async function POST(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    await connectDB();

    const { id, uniqueId, reason } = await req.json();
    if (!reason || (!id && !uniqueId)) {
      return NextResponse.json(apiResponse(false, null, 'id/uniqueId dan reason wajib'), { status: 400 });
    }

    const item = await InventoryItem.findOne(id ? { _id: id } : { uniqueId });
    if (!item) return NextResponse.json(apiResponse(false, null, 'Item tidak ditemukan'), { status: 404 });

    item.status = 'PENDING_DELETE';
    item.deleteRequest = {
      userId: user.id,
      username: user.username,
      reason,
      timestamp: new Date(),
      status: 'pending'
    } as any;
    item.history.push({ status: 'PENDING_DELETE', timestamp: new Date(), userId: user.id } as any);
    await item.save();

    // Create audit log
    await createAuditLog(
      user.id,
      user.username,
      'REQUEST_DELETE_ITEM',
      `Requested deletion for item: ${item.uniqueId}`,
      'INVENTORY_ITEM',
      item._id.toString(),
      req
    );

    return NextResponse.json(apiResponse(true, item, 'Permintaan hapus dibuat'), { status: 201 });
  } catch (error) {
    console.error('Create delete request error:', error);
    return NextResponse.json(apiResponse(false, null, 'Gagal membuat permintaan hapus', error instanceof Error ? error.message : 'Unknown'), { status: 500 });
  }
}

// PUT - approve/reject delete request. Body: { id or uniqueId, action: 'approve' | 'reject' }
export async function PUT(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    // Authorization check - only manager, admin, direktur can approve/reject
    if (!hasPermission(user.role, 'inventory', 'delete')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak: Anda tidak memiliki izin untuk menyetujui/menolak permintaan hapus'),
        { status: 403 }
      );
    }

    await connectDB();
    const { id, uniqueId, action } = await req.json();
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(apiResponse(false, null, "Action tidak valid"), { status: 400 });
    }
    const item = await InventoryItem.findOne(id ? { _id: id } : { uniqueId });
    if (!item) return NextResponse.json(apiResponse(false, null, 'Item tidak ditemukan'), { status: 404 });
    if (item.status !== 'PENDING_DELETE' || item.deleteRequest?.status !== 'pending') {
      return NextResponse.json(apiResponse(false, null, 'Tidak ada permintaan hapus yang tertunda'), { status: 409 });
    }

    if (action === 'approve') {
      const deletedId = item._id.toString();
      const uniq = item.uniqueId;
      await InventoryItem.deleteOne({ _id: item._id });
      await createAuditLog(user.id, user.username, 'DELETE_APPROVED', `Penghapusan item '${uniq}' disetujui`, 'inventory-item', deletedId, req);
      return NextResponse.json(apiResponse(true, { deletedId }, 'Item dihapus'), { status: 200 });
    } else {
      // Reject: restore previous status from history if available
      const lastNonPending = [...item.history].reverse().find(h => h.status !== 'PENDING_DELETE');
      item.status = (lastNonPending?.status as any) || 'IN';
      item.deleteRequest = undefined as any;
      item.history.push({ status: 'REJECT_DELETE', timestamp: new Date(), userId: user.id } as any);
      await item.save();
      await createAuditLog(user.id, user.username, 'DELETE_REJECTED', `Penghapusan item '${item.uniqueId}' ditolak`, 'inventory-item', item._id.toString(), req);
      return NextResponse.json(apiResponse(true, item, 'Permintaan hapus ditolak'), { status: 200 });
    }
  } catch (error) {
    console.error('Approve/Reject delete request error:', error);
    return NextResponse.json(apiResponse(false, null, 'Gagal memproses permintaan', error instanceof Error ? error.message : 'Unknown'), { status: 500 });
  }
}