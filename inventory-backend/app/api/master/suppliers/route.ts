import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Supplier, Part } from '@/lib/models';
import { authMiddleware, hasPermission } from '@/lib/middleware';
import { apiResponse, createAuditLog } from '@/lib/utils';

// Helper function to add CORS headers
function corsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// OPTIONS - Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  const response = NextResponse.json({ success: true }, { status: 200 });
  return corsHeaders(response);
}

// GET - Fetch all suppliers from Supplier table
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return corsHeaders(authResult);
    }

    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'suppliers', 'read')) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
      return corsHeaders(response);
    }

    await connectDB();

    // Fetch all suppliers
    const suppliers = await Supplier.find({ status: 'active' })
      .sort({ createdAt: -1 });

    // Aggregate part counts for each supplier
    const suppliersWithCounts = await Promise.all(
      suppliers.map(async (supplier) => {
        const partCount = await Part.countDocuments({ 'supplierInfo.id': supplier.supplierId });
        return {
          ...supplier.toObject(),
          totalParts: partCount
        };
      })
    );

    const response = NextResponse.json(
      apiResponse(true, suppliersWithCounts, 'Data suppliers berhasil diambil'),
      { status: 200 }
    );
    return corsHeaders(response);
  } catch (error) {
    console.error('Get suppliers error:', error);
    const response = NextResponse.json(
      apiResponse(false, null, 'Terjadi kesalahan saat mengambil data suppliers', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
    return corsHeaders(response);
  }
}

// POST - Create new supplier
export async function POST(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return corsHeaders(authResult);
    }

    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'suppliers', 'create')) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
      return corsHeaders(response);
    }

    await connectDB();
    const body = await req.json();
    const { supplierId, name, address, contactPerson, phone, email, description } = body;

    // Validation
    if (!supplierId || !name) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Supplier ID dan Name wajib diisi'),
        { status: 400 }
      );
      return corsHeaders(response);
    }

    // Check duplicate supplier ID
    const existingSupplier = await Supplier.findOne({ supplierId });
    if (existingSupplier) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Supplier ID sudah digunakan'),
        { status: 409 }
      );
      return corsHeaders(response);
    }

    // Create new supplier
    const supplier = new Supplier({
      supplierId,
      name,
      address,
      contactPerson,
      phone,
      email,
      description,
      status: 'active'
    });

    await supplier.save();

    await createAuditLog(
      user.id,
      user.username,
      'CREATE_SUPPLIER',
      `Created supplier: ${name} (${supplierId})`,
      'SUPPLIER',
      supplier._id.toString(),
      req
    );

    const response = NextResponse.json(
      apiResponse(true, supplier, 'Supplier berhasil dibuat'),
      { status: 201 }
    );
    return corsHeaders(response);
  } catch (error) {
    console.error('Create supplier error:', error);
    const response = NextResponse.json(
      apiResponse(false, null, 'Gagal membuat supplier', error instanceof Error ? error.message : 'Unknown'),
      { status: 500 }
    );
    return corsHeaders(response);
  }
}

// PUT - Update supplier
export async function PUT(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return corsHeaders(authResult);
    }

    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'suppliers', 'update')) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
      return corsHeaders(response);
    }

    await connectDB();
    const url = new URL(req.url);
    const idFromQuery = url.searchParams.get('id');
    const body = await req.json();
    const id = idFromQuery || body.id;

    if (!id) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'),
        { status: 400 }
      );
      return corsHeaders(response);
    }

    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Supplier tidak ditemukan'),
        { status: 404 }
      );
      return corsHeaders(response);
    }

    // Check if supplierId is being changed and if it's already used
    if (body.supplierId && body.supplierId !== existingSupplier.supplierId) {
      const duplicate = await Supplier.findOne({ 
        supplierId: body.supplierId, 
        _id: { $ne: id } 
      });
      if (duplicate) {
        const response = NextResponse.json(
          apiResponse(false, null, 'Supplier ID sudah digunakan'),
          { status: 409 }
        );
        return corsHeaders(response);
      }
    }

    const oldSupplierId = existingSupplier.supplierId;

    // Update supplier
    const payload: any = { ...body, updatedAt: new Date() };
    const updated = await Supplier.findByIdAndUpdate(id, payload, { new: true });

    if (!updated) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Supplier tidak ditemukan'),
        { status: 404 }
      );
      return corsHeaders(response);
    }

    // ✅ AUTO-SYNC: If supplierId changed, update all Parts using this supplier
    if (body.supplierId && body.supplierId !== oldSupplierId) {
      const updateResult = await Part.updateMany(
        { 'supplierInfo.id': oldSupplierId },
        { $set: { 'supplierInfo.id': body.supplierId, updatedAt: new Date() } }
      );
      console.log(`✅ [AUTO-SYNC] Updated ${updateResult.modifiedCount} parts from supplier ID '${oldSupplierId}' to '${body.supplierId}'`);
    }

    await createAuditLog(
      user.id,
      user.username,
      'UPDATE_SUPPLIER',
      `Updated supplier: ${updated.name} (${updated.supplierId})`,
      'SUPPLIER',
      id,
      req
    );

    const response = NextResponse.json(
      apiResponse(true, updated, 'Supplier berhasil diupdate'),
      { status: 200 }
    );
    return corsHeaders(response);
  } catch (error) {
    console.error('Update supplier error:', error);
    const response = NextResponse.json(
      apiResponse(false, null, 'Gagal mengupdate supplier', error instanceof Error ? error.message : 'Unknown'),
      { status: 500 }
    );
    return corsHeaders(response);
  }
}

// DELETE - Delete supplier
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return corsHeaders(authResult);
    }

    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'suppliers', 'delete')) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
      return corsHeaders(response);
    }

    await connectDB();

    // Frontend sends DELETE request with body containing id
    const body = await req.json();
    const { id } = body;

    if (!id) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'),
        { status: 400 }
      );
      return corsHeaders(response);
    }

    // Check if supplier exists
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      const response = NextResponse.json(
        apiResponse(false, null, 'Supplier tidak ditemukan'),
        { status: 404 }
      );
      return corsHeaders(response);
    }

    // Check if supplier is being used by any parts
    const partCount = await Part.countDocuments({ 'supplierInfo.id': supplier.supplierId });
    if (partCount > 0) {
      const response = NextResponse.json(
        apiResponse(false, null, `Supplier tidak dapat dihapus karena masih digunakan oleh ${partCount} parts`),
        { status: 409 }
      );
      return corsHeaders(response);
    }

    // Delete supplier
    await Supplier.findByIdAndDelete(id);

    await createAuditLog(
      user.id,
      user.username,
      'DELETE_SUPPLIER',
      `Deleted supplier: ${supplier.name} (${supplier.supplierId})`,
      'SUPPLIER',
      id,
      req
    );

    const response = NextResponse.json(
      apiResponse(true, { deletedId: id }, 'Supplier berhasil dihapus'),
      { status: 200 }
    );
    return corsHeaders(response);
  } catch (error) {
    console.error('Delete supplier error:', error);
    const response = NextResponse.json(
      apiResponse(false, null, 'Gagal menghapus supplier', error instanceof Error ? error.message : 'Unknown'),
      { status: 500 }
    );
    return corsHeaders(response);
  }
}
