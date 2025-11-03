#!/usr/bin/env node

/**
 * MongoDB Atlas Connection String Helper
 * Script ini membantu validasi dan setup connection string MongoDB Atlas
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function validateConnectionString(connectionString) {
  // Basic validation patterns
  const patterns = {
    basic: /^mongodb\+srv:\/\/.+@.+\.mongodb\.net\/.+/,
    username: /^mongodb\+srv:\/\/([^:]+):/,
    password: /^mongodb\+srv:\/\/[^:]+:([^@]+)@/,
    cluster: /^mongodb\+srv:\/\/[^@]+@([^\/]+)\//,
    database: /^mongodb\+srv:\/\/[^\/]+\/([^?]+)/
  };

  console.log('\n🔍 Validating connection string...\n');

  // Check basic format
  if (!patterns.basic.test(connectionString)) {
    console.log('❌ Invalid connection string format');
    console.log('Expected format: mongodb+srv://username:password@cluster.mongodb.net/database');
    return false;
  }

  // Extract components
  const username = connectionString.match(patterns.username)?.[1];
  const password = connectionString.match(patterns.password)?.[1];
  const cluster = connectionString.match(patterns.cluster)?.[1];
  const database = connectionString.match(patterns.database)?.[1];

  console.log('📋 Connection String Components:');
  console.log(`   Username: ${username || 'NOT FOUND'}`);
  console.log(`   Password: ${password ? '*'.repeat(password.length) : 'NOT FOUND'}`);
  console.log(`   Cluster:  ${cluster || 'NOT FOUND'}`);
  console.log(`   Database: ${database || 'NOT FOUND'}`);

  // Check for placeholders
  const hasPlaceholders = [
    'YOUR_USERNAME',
    'YOUR_PASSWORD', 
    'YOUR_CLUSTER_URL',
    '<username>',
    '<password>',
    '<cluster-name>'
  ].some(placeholder => connectionString.includes(placeholder));

  if (hasPlaceholders) {
    console.log('\n❌ Connection string still contains placeholders');
    console.log('Please replace all placeholders with actual values');
    return false;
  }

  console.log('\n✅ Connection string format looks valid');
  return true;
}

async function updateEnvFile(connectionString) {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace MONGODB_URI line
    const updatedContent = envContent.replace(
      /^MONGODB_URI=.*$/m,
      `MONGODB_URI=${connectionString}`
    );
    
    fs.writeFileSync(envPath, updatedContent);
    console.log('\n✅ Updated .env.local file successfully');
    return true;
  } catch (error) {
    console.error('\n❌ Failed to update .env.local file:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 MongoDB Atlas Connection String Helper\n');
  console.log('This tool will help you setup your MongoDB Atlas connection string.\n');

  try {
    // Option 1: Auto-detect from clipboard (if available)
    console.log('📝 Please provide your MongoDB Atlas connection string:');
    console.log('   (You can get this from MongoDB Atlas → Connect → Connect your application)\n');

    const connectionString = await askQuestion('Enter your connection string: ');

    if (!connectionString) {
      console.log('❌ No connection string provided');
      process.exit(1);
    }

    // Validate the connection string
    const isValid = await validateConnectionString(connectionString);
    
    if (!isValid) {
      console.log('\n📖 How to get the correct connection string:');
      console.log('1. Go to https://cloud.mongodb.com');
      console.log('2. Select your cluster');
      console.log('3. Click "Connect" button');
      console.log('4. Choose "Connect your application"');
      console.log('5. Select "Node.js" driver');
      console.log('6. Copy the connection string');
      console.log('7. Replace <password> with your actual password');
      process.exit(1);
    }

    // Ask if user wants to update .env.local
    const shouldUpdate = await askQuestion('\nDo you want to update .env.local file? (y/N): ');
    
    if (shouldUpdate.toLowerCase().startsWith('y')) {
      const success = await updateEnvFile(connectionString);
      
      if (success) {
        console.log('\n🎉 Setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Restart your backend server (npm run dev)');
        console.log('2. Test the connection (npm run test-atlas)');
        console.log('3. Check health endpoint (http://localhost:3001/api/health)');
      }
    } else {
      console.log('\n📝 Please manually update your .env.local file with:');
      console.log(`MONGODB_URI=${connectionString}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the helper
if (require.main === module) {
  main().catch(console.error);
}