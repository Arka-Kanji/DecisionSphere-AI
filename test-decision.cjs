const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/decision/start',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log("Response:", body);
    if(res.statusCode === 200) {
      const sessionId = JSON.parse(body).sessionId;
      const streamReq = http.request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/decision/${sessionId}/stream`,
        method: 'GET'
      }, (streamRes) => {
        streamRes.on('data', d => console.log(d.toString()));
      });
      streamReq.end();
    }
  });
});

req.write(JSON.stringify({ query: 'Testing new features', domain: 'Technology' }));
req.end();
