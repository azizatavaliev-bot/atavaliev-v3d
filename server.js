const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3131;
const HTML = fs.readFileSync(path.join(__dirname, 'index.html'));

function proxyPrintables(body, res) {
  const data = Buffer.from(body);
  const req = https.request({
    hostname: 'api.printables.com',
    path: '/graphql/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Origin': 'https://www.printables.com',
    }
  }, (pRes) => {
    res.writeHead(pRes.statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    pRes.pipe(res);
  });
  req.on('error', () => { res.writeHead(502); res.end('{}'); });
  req.write(data);
  req.end();
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/graphql') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => proxyPrintables(body, res));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
}).listen(PORT, () => {
  console.log(`Atavaliev v 3D → http://localhost:${PORT}`);
});
