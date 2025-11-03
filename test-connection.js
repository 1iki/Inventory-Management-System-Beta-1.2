#!/usr/bin/env node

/**
 * Frontend-Backend Connection Test
 * Script untuk testing koneksi antara frontend dan backend
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

async function testEndpoint(url, method = 'GET', data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data && method !== 'GET') {
      config.data = data;
    }
    
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      message: error.message,
      data: error.response?.data
    };
  }
}

async function testBackendHealth() {
  console.log('🔍 Testing Backend Health...');
  
  const result = await testEndpoint(`${BACKEND_URL}/api/health`);
  
  if (result.success) {
    console.log('✅ Backend Health: OK');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, result.data);
    return true;
  } else {
    console.log('❌ Backend Health: FAILED');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.message}`);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔍 Testing Login API...');
  
  const result = await testEndpoint(
    `${BACKEND_URL}/api/auth/login`,
    'POST',
    {
      username: 'direktur_budi',
      password: 'password123'
    }
  );
  
  if (result.success) {
    console.log('✅ Login API: OK');
    console.log(`   Status: ${result.status}`);
    if (result.data?.success) {
      console.log(`   User: ${result.data.data?.user?.name}`);
      console.log(`   Token: ${result.data.data?.token ? 'Present' : 'Missing'}`);
      return result.data.data?.token;
    }
  } else {
    console.log('❌ Login API: FAILED');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.message}`);
  }
  
  return null;
}

async function testProtectedEndpoints(token) {
  console.log('\n🔍 Testing Protected Endpoints...');
  
  const endpoints = [
    { url: '/api/dashboard', name: 'Dashboard' },
    { url: '/api/master/customers', name: 'Customers' },
    { url: '/api/master/parts', name: 'Parts' },
    { url: '/api/master/purchase-orders', name: 'Purchase Orders' },
    { url: '/api/inventory/items', name: 'Inventory Items' },
    { url: '/api/audit', name: 'Audit Logs' }
  ];
  
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(`${BACKEND_URL}${endpoint.url}`, 'GET', null, headers);
    
    if (result.success) {
      console.log(`✅ ${endpoint.name}: OK (${result.status})`);
    } else {
      console.log(`❌ ${endpoint.name}: FAILED (${result.status}) - ${result.message}`);
    }
  }
}

async function testCORS() {
  console.log('\n🔍 Testing CORS Configuration...');
  
  try {
    const result = await testEndpoint(`${BACKEND_URL}/api/health`, 'OPTIONS');
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': result.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': result.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': result.headers['access-control-allow-headers']
    };
    
    console.log('✅ CORS Headers:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      console.log(`   ${key}: ${value || 'Not Set'}`);
    });
    
    return true;
  } catch (error) {
    console.log('❌ CORS Test Failed:', error.message);
    return false;
  }
}

async function checkFrontendServer() {
  console.log('\n🔍 Checking Frontend Server...');
  
  const result = await testEndpoint(FRONTEND_URL);
  
  if (result.success) {
    console.log('✅ Frontend Server: Running');
    console.log(`   Status: ${result.status}`);
    return true;
  } else {
    console.log('❌ Frontend Server: Not Running');
    console.log('   Please start frontend with: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🚀 Frontend-Backend Connection Test\n');
  console.log('='.repeat(50));
  
  let allGood = true;
  
  // Test backend health
  const backendOk = await testBackendHealth();
  if (!backendOk) {
    console.log('\n❌ Backend is not running or not healthy!');
    console.log('   Please start backend with: npm run dev');
    allGood = false;
  }
  
  // Test login and get token
  let token = null;
  if (backendOk) {
    token = await testLogin();
    if (!token) {
      allGood = false;
    }
  }
  
  // Test protected endpoints
  if (backendOk) {
    await testProtectedEndpoints(token);
  }
  
  // Test CORS
  if (backendOk) {
    await testCORS();
  }
  
  // Check frontend server
  const frontendOk = await checkFrontendServer();
  if (!frontendOk) {
    allGood = false;
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allGood && backendOk && frontendOk && token) {
    console.log('🎉 All tests passed! Frontend-Backend connection is working.');
    console.log('\nNext steps:');
    console.log('1. Open frontend: http://localhost:5174');
    console.log('2. Login with: direktur_budi / password123');
    console.log('3. Test all features in the dashboard');
  } else {
    console.log('❌ Some tests failed. Please fix the issues above.');
    
    if (!backendOk) {
      console.log('\n🔧 Backend Issues:');
      console.log('- Make sure backend is running: cd inventory-backend && npm run dev');
      console.log('- Check MongoDB Atlas connection string in .env.local');
      console.log('- Run: npm run setup:atlas');
    }
    
    if (!frontendOk) {
      console.log('\n🔧 Frontend Issues:');
      console.log('- Make sure frontend is running: cd inventory-frontend && npm run dev');
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}