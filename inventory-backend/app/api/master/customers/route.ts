import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Customer, Part, PurchaseOrder } from '@/lib/models';
import { authMiddleware, hasPermission } from '@/lib/middleware';
import { apiResponse, createAuditLog, sanitizeInput } from '@/lib/utils';
import { customerSchema } from '@/lib/validations';

// GET - Fetch all customers
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'customers', 'read')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    await connectDB();

    const customers = await Customer.find().sort({ name: 1 });

    return NextResponse.json(
      apiResponse(true, customers, 'Data customers berhasil diambil'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Unauthorized atau terjadi kesalahan', error instanceof Error ? error.message : 'Unknown error'),
      { status: error instanceof Error && error.message.includes('token') ? 401 : 500 }
    );
  }
}

// POST - Create customer (admin/direktur)
export async function POST(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    if (!hasPermission(user.role, 'customers', 'create')) {
      return NextResponse.json(apiResponse(false, null, 'Akses ditolak'), { status: 403 });
    }

    await connectDB();
    const body = await req.json();
    const sanitizedBody = sanitizeInput(body);

    // Validate input
    try {
      await customerSchema.validate(sanitizedBody, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        apiResponse(false, null, 'Data tidak valid', validationError.errors?.join(', ')),
        { status: 400 }
      );
    }

    const { name, address, contactPerson, phone, email } = sanitizedBody;

    // Check if customer with same name already exists
    const existingCustomer = await Customer.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingCustomer) {
      return NextResponse.json(
        apiResponse(false, null, 'Customer dengan nama tersebut sudah ada'),
        { status: 409 }
      );
    }

    const customer = new Customer({
      name,
      address,
      contactPerson,
      phone,
      email,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await customer.save();

    await createAuditLog(
      user.id,
      user.username,
      'CREATE_CUSTOMER',
      `Created customer: ${customer.name}`,
      'CUSTOMER',
      customer._id.toString(),
      req
    );

    return NextResponse.json(
      apiResponse(true, customer, 'Customer berhasil dibuat'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Gagal membuat customer', error instanceof Error ? error.message : 'Unknown'),
      { status: 500 }
    );
  }
}

// PUT - Update customer (admin/direktur)
export async function PUT(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    if (!hasPermission(user.role, 'customers', 'update')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    await connectDB();
    const body = await req.json();
    const sanitizedBody = sanitizeInput(body);

    const { id, ...updateData } = sanitizedBody;

    if (!id) {
      return NextResponse.json(
        apiResponse(false, null, 'Parameter id wajib'),
        { status: 400 }
      );
    }

    // Validate update data
    try {
      const partialSchema = customerSchema.partial();
      await partialSchema.validate(updateData, { abortEarly: false });
    } catch (validationError: any) {
      return NextResponse.json(
        apiResponse(false, null, 'Data tidak valid', validationError.errors?.join(', ')),
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak ditemukan'),
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== existingCustomer.name) {
      const duplicateCustomer = await Customer.findOne({
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        _id: { $ne: id }
      });

      if (duplicateCustomer) {
        return NextResponse.json(
          apiResponse(false, null, 'Customer dengan nama tersebut sudah ada'),
          { status: 409 }
        );
      }
    }

    const updated = await Customer.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    await createAuditLog(
      user.id,
      user.username,
      'UPDATE_CUSTOMER',
      `Updated customer: ${updated.name}`,
      'CUSTOMER',
      id,
      req
    );

    return NextResponse.json(
      apiResponse(true, updated, 'Customer berhasil diupdate'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Gagal mengupdate customer', error instanceof Error ? error.message : 'Unknown'),
      { status: 500 }
    );
  }
}

// DELETE - Delete customer (admin/direktur)
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);

    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = authResult;

    if (!hasPermission(user.role, 'customers', 'delete')) {
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

    // Check if customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json(
        apiResponse(false, null, 'Customer tidak ditemukan'),
        { status: 404 }
      );
    }

    // Check references
    const partCount = await Part.countDocuments({ customerId: id });
    const poCount = await PurchaseOrder.countDocuments({ customerId: id });

    if (partCount > 0 || poCount > 0) {
      return NextResponse.json(
        apiResponse(false, null, `Customer tidak dapat dihapus karena masih digunakan oleh ${partCount} part dan ${poCount} purchase order`),
        { status: 409 }
      );
    }

    await Customer.findByIdAndDelete(id);

    await createAuditLog(
      user.id,
      user.username,
      'DELETE_CUSTOMER',
      `Deleted customer: ${customer.name}`,
      'CUSTOMER',
      id,
      req
    );

    return NextResponse.json(
      apiResponse(true, { deletedId: id }, 'Customer berhasil dihapus'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Gagal menghapus customer', error instanceof Error ? error.message : 'Unknown'),
      { status: 500 }
    );
  }
}
