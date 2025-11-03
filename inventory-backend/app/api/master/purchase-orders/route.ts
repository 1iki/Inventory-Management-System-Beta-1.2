import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { PurchaseOrder, Part, Customer, InventoryItem } from '@/lib/models';
import { authMiddleware, hasPermission } from '@/lib/middleware';
import { apiResponse, createAuditLog } from '@/lib/utils';

// GET - Fetch all purchase orders
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'purchase-orders', 'read')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    // 🆕 Ensure connection is ready before querying
    await connectDB();
    
    // 🆕 Wait for connection to be actually ready
    let retries = 0;
    while (retries < 10) {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        console.log('✅ Connection ready, executing query...');
        break;
      }
      console.log(`⏳ Waiting for connection (${retries + 1}/10)...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }

    const purchaseOrders = await PurchaseOrder.find()
      .populate('partId', 'name internalPartNo')
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      apiResponse(true, purchaseOrders, 'Data purchase orders berhasil diambil'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get purchase orders error:', error);
    
    // 🆕 Better error handling
    if (error instanceof Error && error.message.includes('bufferCommands')) {
      return NextResponse.json(
        apiResponse(false, null, 'Database connection not ready. Please try again.'),
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      apiResponse(false, null, 'Unauthorized atau terjadi kesalahan', error instanceof Error ? error.message : 'Unknown error'),
      { status: 401 }
    );
  }
}

// POST - Create purchase order (admin/direktur)
export async function POST(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    await connectDB();
    const body = await req.json();
    const { poNumber, partId, customerId, totalQuantity, deliveryDate, notes } = body;

    if (!poNumber || !partId || !customerId || !totalQuantity) {
      return NextResponse.json(apiResponse(false, null, 'Field wajib harus diisi'), { status: 400 });
    }

    const dup = await PurchaseOrder.findOne({ poNumber });
    if (dup) return NextResponse.json(apiResponse(false, null, 'Nomor PO sudah ada'), { status: 409 });

    const part = await Part.findById(partId);
    const cust = await Customer.findById(customerId);
    if (!part || !cust) return NextResponse.json(apiResponse(false, null, 'Part atau Customer tidak ditemukan'), { status: 404 });

    const po = new PurchaseOrder({
      poNumber,
      partId,
      customerId,
      totalQuantity: parseInt(totalQuantity, 10),
      deliveredQuantity: 0,
      status: 'open',
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      notes: notes || ''
    });

    await po.save();

    // ✅ AUTO-SYNC: Update poNumber di Part table
    await Part.findByIdAndUpdate(partId, {
      poNumber: poNumber,
      updatedAt: new Date()
    });
    console.log(`✅ [AUTO-SYNC] PO Number '${poNumber}' synced to Part '${part.name}' (${partId})`);

    // ✅ AUTO-SYNC: Add poNumber to Customer.poNumbers array
    const existingPoNumbers = cust.poNumbers || [];
    if (!existingPoNumbers.includes(poNumber)) {
      await Customer.findByIdAndUpdate(customerId, {
        $addToSet: { poNumbers: poNumber },
        updatedAt: new Date()
      });
      console.log(`✅ [AUTO-SYNC] PO Number '${poNumber}' added to Customer '${cust.name}' (${customerId})`);
    }

    await createAuditLog(user.id, user.username, 'CREATE_PURCHASE_ORDER', `Created purchase order: ${poNumber} | Auto-synced to Part & Customer`, 'PURCHASE_ORDER', po._id.toString(), req);
    const populated = await PurchaseOrder.findById(po._id)
      .populate('partId', 'name internalPartNo')
      .populate('customerId', 'name');

    return NextResponse.json(apiResponse(true, populated, 'PO berhasil dibuat dan auto-synced ke Part & Customer'), { status: 201 });
  } catch (error) {
    console.error('Create PO error:', error);
    return NextResponse.json(apiResponse(false, null, 'Gagal membuat PO', error instanceof Error ? error.message : 'Unknown'), { status: 500 });
  }
}

// PUT - Update purchase order (admin/direktur)
export async function PUT(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'purchase-orders', 'update')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    await connectDB();
    const url = new URL(req.url);
    const idFromQuery = url.searchParams.get('id');
    const body = await req.json();
    const id = idFromQuery || body.id;
    if (!id) return NextResponse.json(apiResponse(false, null, 'Parameter id wajib'), { status: 400 });

    // Get existing PO to check partId and poNumber
    const existingPO = await PurchaseOrder.findById(id);
    if (!existingPO) return NextResponse.json(apiResponse(false, null, 'PO tidak ditemukan'), { status: 404 });

    const oldPoNumber = existingPO.poNumber;
    const oldPartId = existingPO.partId.toString();
    const oldCustomerId = existingPO.customerId.toString();

    if (body.poNumber) {
      const dup = await PurchaseOrder.findOne({ poNumber: body.poNumber, _id: { $ne: id } });
      if (dup) return NextResponse.json(apiResponse(false, null, 'Nomor PO sudah digunakan'), { status: 409 });
    }

    if (body.partId) {
      const part = await Part.findById(body.partId);
      if (!part) return NextResponse.json(apiResponse(false, null, 'Part tidak ditemukan'), { status: 404 });
    }
    if (body.customerId) {
      const cust = await Customer.findById(body.customerId);
      if (!cust) return NextResponse.json(apiResponse(false, null, 'Customer tidak ditemukan'), { status: 404 });
    }

    const payload: any = { ...body, updatedAt: new Date() };
    if (payload.deliveryDate) payload.deliveryDate = new Date(payload.deliveryDate);

    const updated = await PurchaseOrder.findByIdAndUpdate(id, payload, { new: true })
      .populate('partId', 'name internalPartNo')
      .populate('customerId', 'name');
    if (!updated) return NextResponse.json(apiResponse(false, null, 'PO tidak ditemukan'), { status: 404 });

    const newPoNumber = updated.poNumber;
    const newPartId = updated.partId._id.toString();
    const newCustomerId = updated.customerId._id.toString();

    // ✅ AUTO-SYNC: Handle Part changes
    if (newPartId !== oldPartId) {
      // Clear poNumber dari part lama
      await Part.findByIdAndUpdate(oldPartId, {
        poNumber: '',
        updatedAt: new Date()
      });
      // Set poNumber ke part baru
      await Part.findByIdAndUpdate(newPartId, {
        poNumber: newPoNumber,
        updatedAt: new Date()
      });
      console.log(`✅ [AUTO-SYNC] PO Number '${newPoNumber}' moved from Part ${oldPartId} to Part ${newPartId}`);
    } else if (newPoNumber !== oldPoNumber) {
      // Update poNumber di part yang sama
      await Part.findByIdAndUpdate(newPartId, {
        poNumber: newPoNumber,
        updatedAt: new Date()
      });
      console.log(`✅ [AUTO-SYNC] PO Number updated from '${oldPoNumber}' to '${newPoNumber}' in Part ${newPartId}`);
    }

    // ✅ AUTO-SYNC: Handle Customer changes
    if (newCustomerId !== oldCustomerId) {
      // Remove dari customer lama
      await Customer.findByIdAndUpdate(oldCustomerId, {
        $pull: { poNumbers: oldPoNumber },
        updatedAt: new Date()
      });
      // Add ke customer baru
      await Customer.findByIdAndUpdate(newCustomerId, {
        $addToSet: { poNumbers: newPoNumber },
        updatedAt: new Date()
      });
      console.log(`✅ [AUTO-SYNC] PO Number '${newPoNumber}' moved from Customer ${oldCustomerId} to Customer ${newCustomerId}`);
    } else if (newPoNumber !== oldPoNumber) {
      // Update poNumber di customer yang sama
      await Customer.findByIdAndUpdate(newCustomerId, {
        $pull: { poNumbers: oldPoNumber },
        updatedAt: new Date()
      });
      await Customer.findByIdAndUpdate(newCustomerId, {
        $addToSet: { poNumbers: newPoNumber },
        updatedAt: new Date()
      });
      console.log(`✅ [AUTO-SYNC] PO Number updated from '${oldPoNumber}' to '${newPoNumber}' in Customer ${newCustomerId}`);
    }

    // ✅ AUTO-SYNC: Update InventoryItem poNumber jika PO Number berubah
    if (newPoNumber !== oldPoNumber) {
      const inventoryUpdateResult = await InventoryItem.updateMany(
        { poId: id },
        { $set: { poNumber: newPoNumber, updatedAt: new Date() } }
      );
      console.log(`✅ [AUTO-SYNC] Updated ${inventoryUpdateResult.modifiedCount} InventoryItems with new PO Number '${newPoNumber}'`);
    }

    await createAuditLog(user.id, user.username, 'UPDATE_PURCHASE_ORDER', `Updated purchase order: ${newPoNumber} | Auto-synced to Part, Customer & InventoryItems`, 'PURCHASE_ORDER', id, req);
    return NextResponse.json(apiResponse(true, updated, 'PO berhasil diupdate dan auto-synced ke semua tabel terkait'), { status: 200 });
  } catch (error) {
    console.error('Update PO error:', error);
    return NextResponse.json(apiResponse(false, null, 'Gagal mengupdate PO', error instanceof Error ? error.message : 'Unknown'), { status: 500 });
  }
}

// DELETE - Delete purchase order (admin/direktur)
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'purchase-orders', 'delete')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    await connectDB();

    // Frontend sends DELETE request with body containing id
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'),
        { status: 400 }
      );
    }

    // Check if PO exists
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return NextResponse.json(
        apiResponse(false, null, 'Purchase Order tidak ditemukan'),
        { status: 404 }
      );
    }

    // Check references
    const invCount = await InventoryItem.countDocuments({ poId: id });

    if (invCount > 0) {
      return NextResponse.json(
        apiResponse(false, null, `Purchase Order tidak dapat dihapus karena masih digunakan oleh ${invCount} inventory item`),
        { status: 409 }
      );
    }

    // ✅ AUTO-SYNC: Clear poNumber dari Part table sebelum delete PO
    await Part.findByIdAndUpdate(po.partId, {
      poNumber: '',
      updatedAt: new Date()
    });
    console.log(`✅ [AUTO-SYNC] PO Number '${po.poNumber}' cleared from Part ${po.partId} after PO deletion`);

    // ✅ AUTO-SYNC: Remove poNumber dari Customer.poNumbers array
    await Customer.findByIdAndUpdate(po.customerId, {
      $pull: { poNumbers: po.poNumber },
      updatedAt: new Date()
    });
    console.log(`✅ [AUTO-SYNC] PO Number '${po.poNumber}' removed from Customer ${po.customerId} after PO deletion`);

    await PurchaseOrder.findByIdAndDelete(id);

    await createAuditLog(
      user.id,
      user.username,
      'DELETE_PURCHASE_ORDER',
      `Deleted purchase order: ${po.poNumber} | Auto-synced cleanup to Part & Customer`,
      'PURCHASE_ORDER',
      id,
      req
    );

    return NextResponse.json(
      apiResponse(true, { deletedId: id }, 'Purchase Order berhasil dihapus dan auto-synced cleanup ke semua tabel terkait'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete PO error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Gagal menghapus PO', error instanceof Error ? error.message : 'Unknown'),
      { status: 500 }
    );
  }
}
