const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';

// Test credentials (sesuai dengan fallback users yang telah dibuat)
const testCredentials = [
  {
    username: 'direktur_budi',
    password: 'password123',
    expectedRole: 'direktur'
  },
  {
    username: 'admin_sari', 
    password: 'password123',
    expectedRole: 'admin'
  }
];

async function testLogin() {
  console.log('🔐 Testing Login API with Fallback Credentials');
  console.log('='.repeat(60));

  for (const cred of testCredentials) {
    try {
      console.log(`\n🔍 Testing login for: ${cred.username}`);
      
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        username: cred.username,
        password: cred.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.success) {
        console.log(`✅ Login successful for ${cred.username}`);
        console.log(`   Role: ${response.data.data.user.role}`);
        console.log(`   Name: ${response.data.data.user.name}`);
        console.log(`   Token: ${response.data.data.token.substring(0, 20)}...`);
        
        // Test protected endpoint with token
        const token = response.data.data.token;
        try {
          const dashboardResponse = await axios.get(`${BACKEND_URL}/api/dashboard`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          });
          
          console.log(`✅ Protected endpoint accessible with token`);
          console.log(`   Dashboard status: ${dashboardResponse.status}`);
        } catch (protectedError) {
          console.log(`❌ Protected endpoint failed: ${protectedError.response?.status || protectedError.code}`);
        }
        
      } else {
        console.log(`❌ Login failed for ${cred.username}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      }
      
    } catch (error) {
      console.log(`❌ Login error for ${cred.username}:`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data?.message || 'Unknown error'}`);
      } else {
        console.log(`   Network Error: ${error.code || error.message}`);
      }
    }
  }
}

async function testBasicConnectivity() {
  console.log('\n🔍 Testing Basic Backend Connectivity');
  console.log('='.repeat(60));
  
  try {
    const healthResponse = await axios.get(`${BACKEND_URL}/api/health`, {
      timeout: 5000
    });
    
    console.log(`✅ Backend Health Check: OK`);
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Server Status: ${healthResponse.data.data?.status}`);
    console.log(`   Database Connected: ${healthResponse.data.data?.database?.connected || 'false'}`);
    
  } catch (error) {
    console.log(`❌ Backend Health Check: FAILED`);
    console.log(`   Error: ${error.code || error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Enhanced Frontend-Backend Login Test');
  console.log('='.repeat(60));
  
  await testBasicConnectivity();
  await testLogin();
  
  console.log('\n='.repeat(60));
  console.log('✨ Test completed!');
}

runTests().catch(console.error);