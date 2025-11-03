import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { authMiddleware, hasPermission } from '@/lib/middleware';
import { apiResponse, syncAllPONumbersToReports } from '@/lib/utils';
import { AuditLog, Report, InventoryItem } from '@/lib/models';

// GET - Get maintenance status and options
export async function GET(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const user = authResult;
    
    // Only direktur and admin can access maintenance
    if (!hasPermission(user.role, 'maintenance', 'read')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak: Hanya direktur dan admin yang dapat mengakses maintenance'),
        { status: 403 }
      );
    }
    
    await connectDB();
    
    // Get system statistics
    const stats = {
      database: {
        collections: await getCollectionStats(),
        indexes: await getIndexStats()
      },
      maintenance: {
        availableOperations: [
          {
            name: 'sync-po-numbers',
            description: 'Sinkronisasi PO Numbers dari Purchase Orders ke Reports',
            method: 'POST',
            body: { operation: 'sync-po-numbers' }
          },
          {
            name: 'cleanup-old-logs',
            description: 'Hapus audit logs yang lebih tua dari 90 hari',
            method: 'POST',
            body: { operation: 'cleanup-old-logs', days: 90 }
          },
          {
            name: 'rebuild-indexes',
            description: 'Rebuild database indexes untuk optimasi performa',
            method: 'POST',
            body: { operation: 'rebuild-indexes' }
          },
          {
            name: 'vacuum-database',
            description: 'Optimasi database storage',
            method: 'POST',
            body: { operation: 'vacuum-database' }
          }
        ]
      }
    };
    
    return NextResponse.json(
      apiResponse(true, stats, 'Maintenance status retrieved'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get maintenance status error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Failed to get maintenance status'),
      { status: 500 }
    );
  }
}

// POST - Execute maintenance operation
export async function POST(req: NextRequest) {
  try {
    const authResult = await authMiddleware(req);
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const user = authResult;
    
    // Only direktur and admin can execute maintenance
    if (!hasPermission(user.role, 'maintenance', 'execute')) {
      return NextResponse.json(
        apiResponse(false, null, 'Akses ditolak: Hanya direktur dan admin yang dapat menjalankan maintenance'),
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { operation, params } = body;
    
    await connectDB();
    
    console.log(`🔧 Starting maintenance operation: ${operation}`);
    
    let result: any;
    
    switch (operation) {
      case 'sync-po-numbers':
        result = await syncAllPONumbersToReports();
        break;
        
      case 'cleanup-old-logs':
        const days = params?.days || 90;
        result = await cleanupOldLogs(days);
        break;
        
      case 'rebuild-indexes':
        result = await rebuildIndexes();
        break;
        
      case 'vacuum-database':
        result = await vacuumDatabase();
        break;
        
      case 'verify-data-integrity':
        result = await verifyDataIntegrity();
        break;
        
      default:
        return NextResponse.json(
          apiResponse(false, null, `Unknown operation: ${operation}`),
          { status: 400 }
        );
    }
    
    // Log maintenance operation
    await AuditLog.create({
      userId: user.id,
      username: user.username,
      action: 'MAINTENANCE_OPERATION',
      details: `Executed ${operation}`,
      resourceType: 'MAINTENANCE',
      timestamp: new Date()
    });
    
    return NextResponse.json(
      apiResponse(true, result, `Maintenance operation ${operation} completed successfully`),
      { status: 200 }
    );
  } catch (error) {
    console.error('Maintenance operation error:', error);
    return NextResponse.json(
      apiResponse(false, null, 'Maintenance operation failed', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}

// Helper functions

async function getCollectionStats() {
  const collections = await Promise.all([
    AuditLog.countDocuments(),
    Report.countDocuments(),
    InventoryItem.countDocuments()
  ]);
  
  return {
    auditLogs: collections[0],
    reports: collections[1],
    inventoryItems: collections[2]
  };
}

async function getIndexStats() {
  const indexes = await Promise.all([
    AuditLog.collection.getIndexes(),
    Report.collection.getIndexes(),
    InventoryItem.collection.getIndexes()
  ]);
  
  return {
    auditLogs: Object.keys(indexes[0]).length,
    reports: Object.keys(indexes[1]).length,
    inventoryItems: Object.keys(indexes[2]).length
  };
}

async function cleanupOldLogs(days: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await AuditLog.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  
  return {
    deleted: result.deletedCount,
    cutoffDate: cutoffDate.toISOString()
  };
}

async function rebuildIndexes() {
  const collections = [
    { model: AuditLog, name: 'AuditLog' },
    { model: Report, name: 'Report' },
    { model: InventoryItem, name: 'InventoryItem' }
  ];
  
  const results = [];
  
  for (const { model, name } of collections) {
    try {
      await model.collection.dropIndexes();
      await model.createIndexes();
      results.push({ collection: name, status: 'success' });
    } catch (error) {
      results.push({ 
        collection: name, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  return { results };
}

async function vacuumDatabase() {
  try {
    // Get MongoDB native database object
    const connection = AuditLog.db;
    const mongoDb = connection.db;
    
    if (!mongoDb) {
      throw new Error('Database connection not available');
    }
    
    const collectionList = await mongoDb.listCollections().toArray();
    
    const results = [];
    
    for (const collection of collectionList) {
      try {
        await mongoDb.command({ compact: collection.name });
        results.push({ collection: collection.name, status: 'compacted' });
      } catch (error) {
        results.push({ 
          collection: collection.name, 
          status: 'skipped',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return { results };
  } catch (error) {
    throw new Error(`Vacuum failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function verifyDataIntegrity() {
  const issues = [];
  
  // Check for orphaned reports (reports without valid PO)
  const reports = await Report.find().lean();
  const { PurchaseOrder } = await import('@/lib/models');
  
  for (const report of reports) {
    const po = await PurchaseOrder.findById((report as any).poId);
    if (!po) {
      issues.push({
        type: 'orphaned_report',
        reportId: (report as any)._id,
        poId: (report as any).poId
      });
    }
  }
  
  // Check for inventory items without valid parts
  const items = await InventoryItem.find().lean();
  const { Part } = await import('@/lib/models');
  
  for (const item of items) {
    const part = await Part.findById((item as any).partId);
    if (!part) {
      issues.push({
        type: 'orphaned_inventory_item',
        itemId: (item as any)._id,
        partId: (item as any).partId
      });
    }
  }
  
  return {
    checked: reports.length + items.length,
    issues: issues.length,
    details: issues
  };
}
