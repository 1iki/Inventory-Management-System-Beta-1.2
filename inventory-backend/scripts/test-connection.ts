import connectDB from '../lib/db';

async function testConnection(): Promise<void> {
  try {
    console.log('🔄 Testing database connection...');
    await connectDB();
    console.log('✅ Database connection successful!');
    console.log('📊 Ready to run seed script');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error((error as Error).message);
    console.log('\n🔧 Setup Instructions:');
    console.log('1. Create MongoDB Atlas account at: https://www.mongodb.com/atlas');
    console.log('2. Create a free cluster (M0 Sandbox)');
    console.log('3. Setup database user and network access');
    console.log('4. Get connection string and update .env.local file');
    console.log('5. Replace YOUR_PASSWORD_HERE with your actual password');
    console.log('6. Replace cluster0.xxxxx with your actual cluster URL');
    process.exit(1);
  }
}

testConnection();