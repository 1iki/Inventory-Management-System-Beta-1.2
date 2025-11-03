const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/staff/customers?limit=10',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Testing endpoint:', options.path);

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
