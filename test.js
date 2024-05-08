const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/?id=1&startDate=2023-01-01&endDate=2023-01-31&granularity=daily',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status code: ${res.statusCode}`);

  res.on('data', (chunk) => {
    console.log(`Response body: ${chunk}`);
  });
});

req.on('error', (error) => {
  console.error(`Error: ${error.message}`);
});

req.end();