const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

let sharp;
try { sharp = require('sharp'); } catch {}

const PORT = process.env.PORT || 3131;
const HTML = fs.readFileSync(path.join(__dirname, 'index.html'));

const ALLOWED_HOSTS = ['media.printables.com', 'cdn.thingiverse.com', 'cdn.thangs.com'];

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

function proxyImg(imgUrl, res) {
  let parsed;
  try { parsed = new URL(imgUrl); } catch {
    res.writeHead(400); res.end('bad url'); return;
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    res.writeHead(403); res.end('forbidden'); return;
  }

  const req = https.request({
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  }, (pRes) => {
    if (pRes.statusCode !== 200) {
      res.writeHead(pRes.statusCode); res.end(); return;
    }

    if (sharp) {
      const resizer = sharp().resize({ width: 420, withoutEnlargement: true }).webp({ quality: 75 });
      res.writeHead(200, {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400',
      });
      pRes.pipe(resizer).pipe(res);
      resizer.on('error', () => { try { res.end(); } catch {} });
    } else {
      // sharp не установлен — проксируем как есть
      res.writeHead(200, {
        'Content-Type': pRes.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      });
      pRes.pipe(res);
    }
  });
  req.on('error', () => { res.writeHead(502); res.end(); });
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

  if (req.method === 'GET' && req.url.startsWith('/img?')) {
    const qs = new URL('http://x' + req.url).searchParams;
    const imgUrl = qs.get('url');
    if (!imgUrl) { res.writeHead(400); res.end(); return; }
    proxyImg(imgUrl, res);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
}).listen(PORT, () => {
  console.log(`Atavaliev v 3D → http://localhost:${PORT}`);
});
