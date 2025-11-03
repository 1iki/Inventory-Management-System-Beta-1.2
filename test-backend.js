const axios = require('axios');

async function testLogin() {
  try {
    console.log(' Testing backend login...\n');
    
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin_sari',
      password: 'password123'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log(' Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n Backend is working properly!');
    
  } catch (error) {
    if (error.response) {
      console.log(' Login failed with status:', error.response.status);
      console.log('Error:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.log(' Request timeout - backend might be stuck');
    } else if (error.code === 'ECONNREFUSED') {
      console.log(' Cannot connect to backend - make sure it is running on port 3001');
    } else {
      console.log(' Error:', error.message);
    }
  }
}

testLogin();
