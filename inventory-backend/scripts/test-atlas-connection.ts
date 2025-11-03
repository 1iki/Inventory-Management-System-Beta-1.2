#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { config } from '../lib/config';
import { connectDB } from '../lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || '';

console.log('🔍 Testing MongoDB Atlas Connection...\n');
console.log('Connection URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
console.log('Node.js Version:', process.version);
console.log('');

async function testConnection() {
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    
    // ✅ FIXED: Opsi koneksi yang kompatibel dengan berbagai versi Node.js
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: true, // ✅ Enable buffering
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4, // Use IPv4
      retryWrites: true,
      retryReads: true,
      // ✅ Simplified TLS - hanya gunakan tls: true
      tls: true,
      tlsAllowInvalidCertificates: false,
    });

    console.log('✅ Successfully connected to MongoDB Atlas!\n');
    
    const db = mongoose.connection.db;
    if (db) {
      console.log('📊 Database Information:');
      console.log('   Name:', db.databaseName);
      console.log('   Host:', mongoose.connection.host);
      console.log('   Ready State:', mongoose.connection.readyState);
      
      const stats = await db.stats();
      console.log('   Collections:', stats.collections);
      console.log('   Data Size:', `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('   Storage Size:', `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
      
      console.log('\n📋 Collections:');
      const collections = await db.listCollections().toArray();
      collections.forEach(col => {
        console.log('   -', col.name);
      });
      
      if (collections.length === 0) {
        console.log('   (No collections yet - run seed script to create initial data)');
      }
    }

    console.log('\n✅ Connection test successful!');
    
  } catch (error) {
    console.error('❌ Connection failed!\n');
    
    if (error instanceof Error) {
      console.error('Error:', error.message);
      
      if (error.message.includes('SSL') || error.message.includes('TLS')) {
        console.error('\n🔒 TLS/SSL Error Detected!');
        console.error('\n💡 Quick Fix Options:');
        console.error('   1. Update Node.js to latest LTS version (v20.x or v18.x)');
        console.error('   2. Set environment variable (DEVELOPMENT ONLY):');
        console.error('      Windows: set NODE_TLS_REJECT_UNAUTHORIZED=0');
        console.error('      Linux/Mac: export NODE_TLS_REJECT_UNAUTHORIZED=0');
        console.error('   3. Check MongoDB Atlas IP whitelist');
        console.error('\n   Current Node.js:', process.version);
        console.error('   Recommended: v20.x LTS or v18.x LTS');
      } else if (error.message.includes('authentication failed')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   - Check your username and password in the connection string');
        console.error('   - Verify the database user exists in MongoDB Atlas');
        console.error('   - Ensure the user has proper permissions');
      } else if (error.message.includes('ENOTFOUND')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   - Check the cluster URL in your connection string');
        console.error('   - Verify your internet connection');
      } else if (error.message.includes('timed out')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   - Add your IP address to MongoDB Atlas Network Access');
        console.error('   - Check if the cluster is active (not paused)');
        console.error('   - Verify firewall settings');
      }
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

testConnection();

export default testConnection;