const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3131;
const HTML = fs.readFileSync(path.join(__dirname, 'index.html'));

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
}).listen(PORT, () => {
  console.log(`Atavaliev v 3D → http://localhost:${PORT}`);
});
