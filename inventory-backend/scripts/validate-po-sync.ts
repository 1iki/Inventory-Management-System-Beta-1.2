// scripts/validate-po-sync.ts
import { connectDB } from '../lib/db';
import { PurchaseOrder, Part, Customer, InventoryItem, Report } from '../lib/models';

/**
 * Script untuk validasi consistency PO Numbers di semua tabel
 * Gunakan script ini untuk audit dan troubleshooting
 * 
 * Usage: ts-node scripts/validate-po-sync.ts
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

async function validatePOSync(): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    console.log('🔍 Starting PO Number consistency validation...\n');
    
    await connectDB();

    // 1. Validate InventoryItems
    console.log('📦 Validating InventoryItems...');
    const inventoryItems = await InventoryItem.find().populate('poId').lean();
    
    for (const item of inventoryItems) {
      if (!item.poId) {
        result.errors.push(`InventoryItem ${item.uniqueId}: Missing poId reference`);
        result.valid = false;
        continue;
      }
      
      const po = item.poId as any;
      if (item.poNumber !== po.poNumber) {
        result.errors.push(
          `InventoryItem ${item.uniqueId}: poNumber mismatch - ` +
          `Item has '${item.poNumber}' but PO has '${po.poNumber}'`
        );
        result.valid = false;
      }
    }
    console.log(`  ✅ Checked ${inventoryItems.length} items\n`);

    // 2. Validate Parts
    console.log('🔧 Validating Parts...');
    const parts = await Part.find({ poNumber: { $exists: true, $ne: '' } }).lean();
    
    for (const part of parts) {
      const po = await PurchaseOrder.findOne({ 
        partId: part._id,
        poNumber: part.poNumber 
      });
      
      if (!po) {
        result.warnings.push(
          `Part ${part.name} (${part.internalPartNo}): Has poNumber '${part.poNumber}' ` +
          `but no matching PO found with this part`
        );
      }
    }
    console.log(`  ✅ Checked ${parts.length} parts\n`);

    // 3. Validate Customers
    console.log('👥 Validating Customers...');
    const customers = await Customer.find({ 
      poNumbers: { $exists: true, $ne: [] } 
    }).lean();
    
    for (const customer of customers) {
      if (customer.poNumbers && customer.poNumbers.length > 0) {
        for (const poNumber of customer.poNumbers) {
          const po = await PurchaseOrder.findOne({ 
            customerId: customer._id,
            poNumber 
          });
          
          if (!po) {
            result.warnings.push(
              `Customer ${customer.name}: Has poNumber '${poNumber}' in array ` +
              `but no matching PO found for this customer`
            );
          }
        }
      }
    }
    console.log(`  ✅ Checked ${customers.length} customers\n`);

    // 4. Validate Reports
    console.log('📊 Validating Reports...');
    const reports = await Report.find().populate('poId').lean();
    
    for (const report of reports) {
      if (!report.poId) {
        result.warnings.push(`Report ${report.uniqueId}: Missing poId reference`);
        continue;
      }
      
      const po = report.poId as any;
      if (report.poNumber !== po.poNumber) {
        result.errors.push(
          `Report ${report.uniqueId}: poNumber mismatch - ` +
          `Report has '${report.poNumber}' but PO has '${po.poNumber}'`
        );
        result.valid = false;
      }
    }
    console.log(`  ✅ Checked ${reports.length} reports\n`);

    // 5. Check orphaned poNumbers
    console.log('🔍 Checking for orphaned poNumbers...');
    
    // Parts dengan poNumber tapi tidak ada PO
    const orphanedParts = await Part.find({ 
      poNumber: { $exists: true, $ne: '' } 
    }).lean();
    
    for (const part of orphanedParts) {
      const po = await PurchaseOrder.findOne({ poNumber: part.poNumber });
      if (!po) {
        result.warnings.push(
          `Part ${part.name}: Has orphaned poNumber '${part.poNumber}' (PO not found)`
        );
      }
    }
    console.log(`  ✅ Checked for orphaned parts\n`);

    // Print results
    console.log('='.repeat(60));
    console.log('📊 VALIDATION RESULTS:');
    console.log('='.repeat(60));
    
    if (result.valid && result.warnings.length === 0) {
      console.log('✅ All PO Numbers are consistent!\n');
    } else {
      if (result.errors.length > 0) {
        console.log(`\n❌ ERRORS (${result.errors.length}):`);
        result.errors.forEach((err, idx) => {
          console.log(`${idx + 1}. ${err}`);
        });
      }
      
      if (result.warnings.length > 0) {
        console.log(`\n⚠️ WARNINGS (${result.warnings.length}):`);
        result.warnings.forEach((warn, idx) => {
          console.log(`${idx + 1}. ${warn}`);
        });
      }
      
      console.log('\n💡 TIP: Run "ts-node scripts/resync-po-numbers.ts" to fix inconsistencies\n');
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fatal error during validation:', error);
    result.valid = false;
    result.errors.push(`Fatal error: ${error}`);
  }

  return result;
}

// Run the script
validatePOSync().then((result) => {
  process.exit(result.valid && result.warnings.length === 0 ? 0 : 1);
});
