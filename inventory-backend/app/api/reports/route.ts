import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import { Report, InventoryItem, Customer, PurchaseOrder, Part } from '../../../lib/models';
import { createMiddleware, generalLimiter } from '../../../lib/middleware';
import { 
  apiResponse, 
  createAuditLog, 
  getPaginationParams, 
  buildSearchQuery,
  AppError,
  handleDatabaseError,
  formatDate
} from '../../../lib/utils';
import { reportFiltersSchema } from '../../../lib/validations';
import { SortOrder } from 'mongoose';

// GET - Generate comprehensive reports with filtering
export async function GET(req: NextRequest) {
  try {
    // Apply middleware
    const middlewareResult = await createMiddleware({
      requireAuth: true,
      allowedRoles: ['manager', 'admin', 'direktur'],
      requiredPermission: { resource: 'reports', action: 'read' },
      rateLimiter: generalLimiter
    })(req);

    if (middlewareResult instanceof NextResponse) {
      return middlewareResult;
    }

    const { user } = middlewareResult;
    
    // Ensure user is defined
    if (!user) {
      throw new AppError('User tidak ditemukan', 401);
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'scan-activity'; // 'scan-activity', 'po-summary', 'inventory-status'
    
    // Get pagination params
    const { page, limit, skip, sort } = getPaginationParams(searchParams);

    // Date filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerName = searchParams.get('customerName');
    const reportType = searchParams.get('reportType'); // SCAN_IN, SCAN_OUT
    const status = searchParams.get('status');

    let reportData: any;
    let total = 0;

    if (type === 'scan-activity') {
      // Scan Activity Report - dari Report collection
      const query: any = {};
      
      // Date range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      
      // Customer filter
      if (customerName) {
        query.customerName = { $regex: customerName, $options: 'i' };
      }
      
      // Report type filter
      if (reportType && ['SCAN_IN', 'SCAN_OUT'].includes(reportType)) {
        query.reportType = reportType;
      }
      
      // Status filter
      if (status) {
        query.status = status;
      }

      total = await Report.countDocuments(query);
      
      const reports = await Report.find(query)
        .sort(sort as { [key: string]: SortOrder })
        .limit(limit)
        .skip(skip)
        .lean();

      reportData = {
        reports: reports.map(report => ({
          id: report._id,
          uniqueId: report.uniqueId,
          reportType: report.reportType,
          customerName: report.customerName,
          partName: report.partName,
          poNumber: report.poNumber,
          quantity: report.quantity,
          status: report.status,
          lotId: report.lotId,
          gateId: report.gateId,
          scannedBy: report.scannedBy,
          createdAt: report.createdAt,
          notes: report.notes
        })),
        summary: {
          totalScans: total,
          scanIn: await Report.countDocuments({ ...query, reportType: 'SCAN_IN' }),
          scanOut: await Report.countDocuments({ ...query, reportType: 'SCAN_OUT' })
        }
      };

    } else if (type === 'po-summary') {
      // Purchase Order Summary Report
      const query: any = {};
      
      // Build PO query
      if (customerName) {
        const customers = await Customer.find(
          { name: { $regex: customerName, $options: 'i' } },
          '_id'
        );
        query.customerId = { $in: customers.map(c => c._id) };
      }

      total = await PurchaseOrder.countDocuments(query);
      
      const purchaseOrders = await PurchaseOrder.find(query)
        .populate('partId', 'name internalPartNo')
        .populate('customerId', 'name')
        .sort(sort as { [key: string]: SortOrder })
        .limit(limit)
        .skip(skip);

      const summaryData = await Promise.all(
        purchaseOrders.map(async (po, index) => {
          // Calculate delivered quantity from inventory items
          const deliveredItems = await InventoryItem.aggregate([
            {
              $match: {
                poId: po._id,
                status: { $in: ['IN', 'OUT'] } // Count both IN and OUT as delivered
              }
            },
            {
              $group: {
                _id: null,
                totalDelivered: { $sum: '$quantity' }
              }
            }
          ]);

          // Calculate scanned out quantity
          const scannedOutItems = await InventoryItem.aggregate([
            {
              $match: {
                poId: po._id,
                status: 'OUT'
              }
            },
            {
              $group: {
                _id: null,
                totalOut: { $sum: '$quantity' }
              }
            }
          ]);

          const totalDelivered = deliveredItems[0]?.totalDelivered || 0;
          const totalOut = scannedOutItems[0]?.totalOut || 0;
          const remaining = po.totalQuantity - totalDelivered;
          const inStock = totalDelivered - totalOut;

          return {
            no: skip + index + 1,
            poNumber: po.poNumber,
            partName: (po.partId as any)?.name || 'N/A',
            partNumber: (po.partId as any)?.internalPartNo || 'N/A',
            customer: (po.customerId as any)?.name || 'N/A',
            totalPO: po.totalQuantity,
            totalDelivered,
            totalOut,
            inStock,
            remaining,
            status: po.status,
            deliveryDate: po.deliveryDate,
            createdAt: po.createdAt
          };
        })
      );

      reportData = {
        poSummary: summaryData,
        totals: {
          totalPOs: total,
          totalQuantityOrdered: await PurchaseOrder.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: '$totalQuantity' } } }
          ]).then(result => result[0]?.total || 0)
        }
      };

    } else if (type === 'inventory-status') {
      // Inventory Status Report
      const query: any = {};
      
      if (status && ['IN', 'OUT', 'PENDING_DELETE', 'DAMAGED'].includes(status)) {
        query.status = status;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      total = await InventoryItem.countDocuments(query);
      
      const items = await InventoryItem.find(query)
        .populate({
          path: 'partId',
          select: 'name internalPartNo',
          populate: {
            path: 'customerId',
            select: 'name'
          }
        })
        .populate('poId', 'poNumber')
        .sort(sort as { [key: string]: SortOrder })
        .limit(limit)
        .skip(skip)
        .lean();

      const statusSummary = await InventoryItem.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ]);

      reportData = {
        items: items.map(item => ({
          uniqueId: item.uniqueId,
          partName: (item.partId as any)?.name || 'N/A',
          partNumber: (item.partId as any)?.internalPartNo || 'N/A',
          customer: (item.partId as any)?.customerId?.name || 'N/A',
          poNumber: (item.poId as any)?.poNumber || 'N/A',
          quantity: item.quantity,
          status: item.status,
          lotId: item.lotId,
          gateId: item.gateId,
          location: item.location,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        })),
        statusSummary: statusSummary.reduce((acc, curr) => {
          acc[curr._id] = {
            count: curr.count,
            totalQuantity: curr.totalQuantity
          };
          return acc;
        }, {} as Record<string, { count: number; totalQuantity: number }>)
      };

    } else {
      throw new AppError('Tipe report tidak valid. Gunakan: scan-activity, po-summary, atau inventory-status', 400);
    }

    // Create audit log
    await createAuditLog(
      user.id,
      user.username,
      'REPORT_GENERATED',
      `Generate report ${type} - halaman ${page}`,
      'reports',
      undefined,
      req
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      apiResponse(true, {
        type,
        data: reportData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          startDate,
          endDate,
          customerName,
          reportType,
          status
        },
        generatedAt: new Date().toISOString(),
        generatedBy: user.username
      }, `Report ${type} berhasil diambil`),
      { status: 200 }
    );

  } catch (error) {
    console.error('Get reports error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        apiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      apiResponse(false, null, dbError.message),
      { status: dbError.statusCode }
    );
  }
}