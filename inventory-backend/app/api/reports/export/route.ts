import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { InventoryItem, Customer, PurchaseOrder, Part } from '@/lib/models';
import { authenticate, authorize } from '@/lib/middleware';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticate(req);
    
    // Type guard: check if it's a NextResponse (error case)
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    // Now TypeScript knows authResult is AuthenticatedUser
    const user = authResult;
    const hasAccess = authorize(['manager', 'admin', 'direktur'])(user.role);
    if (!hasAccess) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'summary' | 'detail'

    const workbook = new ExcelJS.Workbook();
    const sheetName = type === 'detail' ? 'Detail Transaksi' : 'Ringkasan PO';
    const ws = workbook.addWorksheet(sheetName);

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filenameBase = type === 'detail' ? 'Laporan_Detail_Transaksi' : 'Laporan_Ringkasan_PO';
    const filename = `${filenameBase}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.xlsx`;

    if (type === 'summary') {
      // Columns
      ws.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Nama Part', key: 'partName', width: 40 },
        { header: 'Customer', key: 'customer', width: 28 },
        { header: 'PO Number', key: 'poNumber', width: 22 },
        { header: 'Total PO', key: 'totalPO', width: 14 },
        { header: 'Total Kirim', key: 'totalKirim', width: 14 },
        { header: 'Sisa PO', key: 'sisaPO', width: 14 },
      ];

      // Data
      const purchaseOrders = await PurchaseOrder.find()
        .populate('partId', 'name internalPartNo')
        .populate('customerId', 'name')
        .sort({ createdAt: -1 });

      let index = 1;
      for (const po of purchaseOrders as any[]) {
        const totalKirimAgg = await InventoryItem.aggregate([
          { $match: { poId: po._id, status: 'OUT' } },
          { $group: { _id: null, total: { $sum: '$quantity' } } },
        ]);
        const totalKirim = totalKirimAgg[0]?.total || 0;
        const sisaPO = (po.totalQuantity || 0) - totalKirim;
        ws.addRow({
          no: index++,
          partName: po.partId?.name || 'N/A',
          customer: po.customerId?.name || 'N/A',
          poNumber: po.poNumber,
          totalPO: po.totalQuantity,
          totalKirim,
          sisaPO,
        });
      }
    } else if (type === 'detail') {
      // Columns
      ws.columns = [
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Nama PT', key: 'customer', width: 28 },
        { header: 'Nama Item', key: 'itemName', width: 40 },
        { header: 'Jumlah', key: 'quantity', width: 12 },
        { header: 'No PO', key: 'poNumber', width: 18 },
        { header: 'Update DateTime', key: 'updateDateTime', width: 22 },
        { header: 'ID Unik', key: 'uniqueId', width: 26 },
      ];

      const items = await InventoryItem.find()
        .populate('partId', 'name customerId')
        .populate('poId', 'poNumber')
        .sort({ updatedAt: -1 });

      for (const item of items as any[]) {
        let customerName = 'N/A';
        if (item.partId?.customerId) {
          const cust = await Customer.findById(item.partId.customerId, 'name');
          customerName = cust?.name || 'N/A';
        }
        ws.addRow({
          status: item.status,
          customer: customerName,
          itemName: item.partId?.name || 'N/A',
          quantity: item.quantity,
          poNumber: item.poId?.poNumber || 'N/A',
          updateDateTime: new Date(item.updatedAt).toISOString().replace('T', ' ').slice(0, 19),
          uniqueId: item.uniqueId,
        });
      }
    } else {
      return new NextResponse('Bad Request: type must be summary or detail', { status: 400 });
    }

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      }),
    });
  } catch (error) {
    console.error('Export reports error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}