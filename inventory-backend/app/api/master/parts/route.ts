import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Part, Customer, InventoryItem, PurchaseOrder } from '@/lib/models';
import { authenticate, authorize } from '@/lib/middleware';
import { apiResponse, createAuditLog, sanitizeInput } from '@/lib/utils';
import { partSchema } from '@/lib/validations';

// GET - Fetch all parts with PO numbers
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (user instanceof NextResponse) {
      return user;
    }
    
    // 🆕 Ensure connection is ready before querying
    await connectDB();
    
    // 🆕 Wait for connection to be actually ready
    let retries = 0;
    const mongoose = require('mongoose');
    while (retries < 10) {
      if (mongoose.connection.readyState === 1) {
        console.log('✅ Connection ready for Parts query...');
        break;
      }
      console.log(`⏳ Waiting for connection (${retries + 1}/10)...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }
    
    if (mongoose.connection.readyState !== 1) {
      return NextResponse.json(
        apiResponse(false, null, 'Database connection not ready. Please try again.'),
        { status: 503 }
      );
    }

    const parts = await Part.find().sort({ name: 1 });
    
    // Fetch all PO numbers from PurchaseOrder collection
    const purchaseOrders = await PurchaseOrder.find({}, { poNumber: 1, partId: 1 }).lean();
    const poMap = new Map<string, string[]>();
    
    purchaseOrders.forEach(po => {
      const partId = po.partId?.toString();
      if (partId) {
        if (!poMap.has(partId)) {
          poMap.set(partId, []);
        }
        poMap.get(partId)?.push(po.poNumber);
      }
    });

    // Enhance parts with available PO numbers
    const enhancedParts = parts.map(part => {
      const partObj = part.toObject();
      const availablePOs = poMap.get(part._id.toString()) || [];
      return {
        ...partObj,
        availablePONumbers: availablePOs
      };
    });

    return NextResponse.json(
      apiResponse(true, enhancedParts, 'Data parts berhasil diambil'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get parts error:', error);
    
    // 🆕 Better error handling for bufferCommands error
    if (error instanceof Error && error.message.includes('bufferCommands')) {
      return NextResponse.json(
        apiResponse(false, null, 'Database connection not ready. Please try again.'),
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      apiResponse(false, null, 'Unauthorized atau terjadi kesalahan', error instanceof Error ? error.message : 'Unknown error'),
      { status: error instanceof Error && error.message.includes('token') ? 401 : 500 }
    );
  }
}

// POST - Create new part (Admin/Direktur)
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (user instanceof NextResponse) {
      return user;
    }
    
    const hasAccess = authorize(['admin', 'direktur'])(user.role);
    if (!hasAccess) {
      return NextResponse.json(
        apiResponse(false, null, 'Tidak memiliki akses untuk membuat part'),
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const sanitizedBody = sanitizeInput(body);

    // Log untuk debugging
    console.log('📦 Create Part - Raw Body:', body);
    console.log('📦 Create Part - Sanitized Body:', sanitizedBody);

    // Validate dengan schema
    try {
      await partSchema.validate(sanitizedBody, { abortEarly: false });
    } catch (validationError: any) {
      console.error('❌ Validation Error:', validationError);
      return NextResponse.json(
        apiResponse(false, null, 'Data tidak valid', validationError.errors?.join(', ')),
        { status: 400 }
      );
    }

    const { customerId, internalPartNo, name, description, poNumber, supplierInfo, specifications } = sanitizedBody;

    if (!customerId || !internalPartNo || !name || !supplierInfo?.id) {
      return NextResponse.json(apiResponse(false, null, 'Field wajib harus diisi'), { status: 400 });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) return NextResponse.json(apiResponse(false, null, 'Customer tidak ditemukan'), { status: 404 });

    const existingPart = await Part.findOne({ internalPartNo });
    if (existingPart) return NextResponse.json(apiResponse(false, null, 'Internal Part Number sudah ada'), { status: 409 });

    const partData: any = {
      customerId,
      internalPartNo,
      name,
      description: description || '',
      poNumber: poNumber || '', // Selalu simpan poNumber, gunakan empty string jika tidak ada
      supplierInfo: {
        id: supplierInfo.id,
        partNumber: supplierInfo.partNumber || '',
        description: supplierInfo.description || ''
      }
    };

    // Tambahkan specifications jika ada
    if (specifications) {
      partData.specifications = specifications;
    }

    console.log('📦 Part Data to Save:', partData);

    const part = new Part(partData);
    await part.save();

    console.log('✅ Part Saved:', part);

    await createAuditLog(user.id, user.username, 'MASTER_CREATED', `Part baru '${name}' dibuat dengan internal part no '${internalPartNo}'${poNumber ? ` dan PO Number '${poNumber}'` : ''}`, 'part', part._id.toString(), req);

    const populatedPart = await Part.findById(part._id).populate('customerId', 'name address');
    return NextResponse.json(apiResponse(true, populatedPart, 'Part berhasil dibuat'), { status: 201 });

  } catch (error) {
    console.error('Create part error:', error);
    return NextResponse.json(apiResponse(false, null, 'Terjadi kesalahan saat membuat part', error instanceof Error ? error.message : 'Unknown error'), { status: 500 });
  }
}

// PUT - Update part (Admin/Direktur)
export async function PUT(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (user instanceof NextResponse) {
      return user;
    }
    
    const allowed = authorize(['admin', 'direktur'])(user.role);
    if (!allowed) return NextResponse.json(apiResponse(false, null, 'Forbidden'), { status: 403 });

    await connectDB();
    const url = new URL(req.url);
    const idFromQuery = url.searchParams.get('id');
    const body = await req.json();
    const sanitizedBody = sanitizeInput(body);
    
    const id = idFromQuery || sanitizedBody.id;
    if (!id) return NextResponse.json(apiResponse(false, null, 'Parameter id wajib'), { status: 400 });

    // Log untuk debugging
    console.log('📦 Update Part - Raw Body:', body);
    console.log('📦 Update Part - Sanitized Body:', sanitizedBody);

    // Validate dengan partial schema
    try {
      const partialSchema = partSchema.partial();
      await partialSchema.validate(sanitizedBody, { abortEarly: false });
    } catch (validationError: any) {
      console.error('❌ Validation Error:', validationError);
      return NextResponse.json(
        apiResponse(false, null, 'Data tidak valid', validationError.errors?.join(', ')),
        { status: 400 }
      );
    }

    // Prevent duplicate internalPartNo
    if (sanitizedBody.internalPartNo) {
      const dup = await Part.findOne({ internalPartNo: sanitizedBody.internalPartNo, _id: { $ne: id } });
      if (dup) return NextResponse.json(apiResponse(false, null, 'Internal Part Number sudah digunakan'), { status: 409 });
    }

    const updateData: any = { ...sanitizedBody, updatedAt: new Date() };
    delete updateData.id; // Remove id from update data

    console.log('📦 Update Data:', updateData);

    const updated = await Part.findByIdAndUpdate(id, updateData, { new: true }).populate('customerId', 'name address');
    if (!updated) return NextResponse.json(apiResponse(false, null, 'Part tidak ditemukan'), { status: 404 });

    console.log('✅ Part Updated:', updated);

    await createAuditLog(user.id, user.username, 'MASTER_UPDATED', `Part '${updated.name}' diupdate`, 'part', id, req);
    return NextResponse.json(apiResponse(true, updated, 'Part berhasil diupdate'), { status: 200 });
  } catch (error) {
    console.error('Update part error:', error);
    return NextResponse.json(apiResponse(false, null, 'Gagal mengupdate part', error instanceof Error ? error.message : 'Unknown'), { status: 500 });
  }
}

// DELETE - Delete part (Admin/Direktur)
export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (user instanceof NextResponse) {
      return user;
    }
    
    const allowed = authorize(['admin', 'direktur'])(user.role);
    if (!allowed) {
      return NextResponse.json(
        apiResponse(false, null, 'Tidak memiliki izin untuk menghapus part'), 
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

    // Check if part exists
    const part = await Part.findById(id);
    if (!part) {
      return NextResponse.json(
        apiResponse(false, null, 'Part tidak ditemukan'), 
        { status: 404 }
      );
    }

    // Check references
    const invCount = await InventoryItem.countDocuments({ partId: id });
    const poCount = await PurchaseOrder.countDocuments({ partId: id });
    
    if (invCount > 0 || poCount > 0) {
      return NextResponse.json(
        apiResponse(false, null, `Part tidak dapat dihapus karena masih digunakan oleh ${invCount} inventory item dan ${poCount} purchase order`), 
        { status: 409 }
      );
    }

    await Part.findByIdAndDelete(id);

    await createAuditLog(
      user.id, 
      user.username, 
      'PART_DELETED', 
      `Part '${part.name}' berhasil dihapus`, 
      'part', 
      id, 
      req
    );

    return NextResponse.json(
      apiResponse(true, { deletedId: id }, 'Part berhasil dihapus'), 
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete part error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Gagal menghapus part', error instanceof Error ? error.message : 'Unknown'), 
      { status: 500 }
    );
  }
}