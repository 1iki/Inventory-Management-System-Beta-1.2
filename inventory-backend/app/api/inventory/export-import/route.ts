import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { Customer, Part, PurchaseOrder, InventoryItem } from '../../../../lib/models';
import { authMiddleware, hasPermission } from '../../../../lib/middleware';
import { apiResponse, AppError, createAuditLog } from '../../../../lib/utils';
import ExcelJS from 'exceljs';

// GET - Export data to Excel
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);
    
    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'inventory', 'read')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'customers' | 'parts' | 'purchase-orders' | 'inventory-items'

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export Data');

    if (type === 'customers') {
      worksheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Address', key: 'address', width: 40 },
        { header: 'Contact Person', key: 'contactPerson', width: 25 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'Email', key: 'email', width: 25 }
      ];

      const customers = await Customer.find().lean();
      customers.forEach((item: any, index: number) => {
        worksheet.addRow({
          no: index + 1,
          name: item.name,
          address: item.address,
          contactPerson: item.contactPerson || '',
          phone: item.phone || '',
          email: item.email || ''
        });
      });
    } else if (type === 'parts') {
      // ...existing parts export code...
    } else if (type === 'purchase-orders') {
      // ...existing PO export code...
    } else if (type === 'inventory-items') {
      worksheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Unique ID', key: 'uniqueId', width: 25 },
        { header: 'Part Name', key: 'partName', width: 30 },
        { header: 'PO Number', key: 'poNumber', width: 20 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Lot ID', key: 'lotId', width: 20 },
        { header: 'Gate ID', key: 'gateId', width: 15 }
      ];

      const items = await InventoryItem.find()
        .populate('partId', 'name')
        .populate('poId', 'poNumber')
        .lean();
      
      items.forEach((item: any, index: number) => {
        worksheet.addRow({
          no: index + 1,
          uniqueId: item.uniqueId,
          partName: item.partId?.name || 'N/A',
          poNumber: item.poId?.poNumber || 'N/A',
          quantity: item.quantity,
          status: item.status,
          lotId: item.lotId,
          gateId: item.gateId
        });
      });
    }

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Create audit log
    await createAuditLog(
      user.id,
      user.username,
      'EXPORT_DATA',
      `Exported ${type} data to Excel`,
      'EXPORT',
      user.id,
      req
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${type}_export_${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Failed to export data'),
      { status: 500 }
    );
  }
}

// POST - Import data from Excel
export async function POST(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);
    
    // Type guard
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const user = authResult;

    // Authorization check
    if (!hasPermission(user.role, 'inventory', 'create')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak'),
        { status: 403 }
      );
    }

    const body = await req.json();
    const { type, data } = body;

    await connectDB();

    let results: { success: number; failed: number; errors: any[] } = {
      success: 0,
      failed: 0,
      errors: []
    };

    if (type === 'customers') {
      for (const row of data as any[]) {
        try {
          await Customer.create({
            name: row.name,
            address: row.address,
            contactPerson: row.contactPerson,
            phone: row.phone,
            email: row.email
          });
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({ row, error: error.message });
        }
      }
    } else if (type === 'parts') {
      // ...existing parts import code...
    }

    // Create audit log
    await createAuditLog(
      user.id,
      user.username,
      'IMPORT_DATA',
      `Imported ${type} data: ${results.success} success, ${results.failed} failed`,
      'IMPORT',
      user.id,
      req
    );

    return NextResponse.json(
      apiResponse(true, results, 'Data import completed'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Failed to import data'),
      { status: 500 }
    );
  }
}
