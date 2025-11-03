// scripts/resync-po-numbers.ts
import { connectDB } from '../lib/db';
import { PurchaseOrder, Part, Customer, InventoryItem } from '../lib/models';

/**
 * Script untuk re-sync PO Numbers ke semua tabel terkait
 * Gunakan script ini jika terjadi data inconsistency
 * 
 * Usage: ts-node scripts/resync-po-numbers.ts
 */

async function resyncPONumbers() {
  try {
    console.log('🔄 Starting PO Number re-sync...\n');
    
    await connectDB();
    
    // 1. Get all Purchase Orders
    const pos = await PurchaseOrder.find().lean();
    console.log(`📦 Found ${pos.length} Purchase Orders\n`);
    
    let partUpdated = 0;
    let customerUpdated = 0;
    let inventoryUpdated = 0;
    let errors = 0;
    
    // 2. Sync each PO
    for (const po of pos) {
      try {
        console.log(`Processing PO: ${po.poNumber} (${po._id})`);
        
        // Update Part
        const partResult = await Part.findByIdAndUpdate(
          po.partId,
          { $set: { poNumber: po.poNumber, updatedAt: new Date() } }
        );
        
        if (partResult) {
          console.log(`  ✅ Part ${po.partId} updated`);
          partUpdated++;
        } else {
          console.log(`  ⚠️ Part ${po.partId} not found`);
        }
        
        // Update Customer (add to array if not exists)
        const customerResult = await Customer.findByIdAndUpdate(
          po.customerId,
          { 
            $addToSet: { poNumbers: po.poNumber },
            $set: { updatedAt: new Date() }
          }
        );
        
        if (customerResult) {
          console.log(`  ✅ Customer ${po.customerId} updated`);
          customerUpdated++;
        } else {
          console.log(`  ⚠️ Customer ${po.customerId} not found`);
        }
        
        // Update all InventoryItems
        const inventoryResult = await InventoryItem.updateMany(
          { poId: po._id },
          { 
            $set: { 
              poNumber: po.poNumber,
              updatedAt: new Date()
            }
          }
        );
        
        if (inventoryResult.modifiedCount > 0) {
          console.log(`  ✅ ${inventoryResult.modifiedCount} InventoryItems updated`);
          inventoryUpdated += inventoryResult.modifiedCount;
        } else {
          console.log(`  ℹ️ No InventoryItems to update`);
        }
        
        console.log('');
        
      } catch (error) {
        console.error(`  ❌ Error processing PO ${po.poNumber}:`, error);
        errors++;
      }
    }
    
    // 3. Clean up orphaned poNumbers in Customers
    console.log('\n🧹 Cleaning up Customer.poNumbers...');
    const customers = await Customer.find({ poNumbers: { $exists: true, $ne: [] } });
    
    for (const customer of customers) {
      const validPOs = await PurchaseOrder.find({ 
        customerId: customer._id 
      }).distinct('poNumber');
      
      await Customer.findByIdAndUpdate(customer._id, {
        $set: { 
          poNumbers: validPOs.filter(Boolean),
          updatedAt: new Date()
        }
      });
      
      console.log(`  ✅ Customer ${customer.name}: ${validPOs.length} PO Numbers synced`);
    }
    
    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RE-SYNC SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Parts updated: ${partUpdated}`);
    console.log(`✅ Customers updated: ${customerUpdated}`);
    console.log(`✅ InventoryItems updated: ${inventoryUpdated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    
    if (errors === 0) {
      console.log('\n🎉 PO Numbers re-synced successfully!\n');
    } else {
      console.log('\n⚠️ Re-sync completed with some errors. Check logs above.\n');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error during re-sync:', error);
    process.exit(1);
  }
}

// Run the script
resyncPONumbers();
