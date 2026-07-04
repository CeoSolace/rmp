cd /d C:\Windows\System32\propergeeks-rebuild\server

powershell -NoProfile -ExecutionPolicy Bypass -Command "@'
const fs = require('fs');

const p = 'server.js';
let s = fs.readFileSync(p, 'utf8');

fs.writeFileSync(p + '.broken.bak', s);

const start = s.indexOf('function makeRef');
if (start >= 0) {
  const anchors = [
    'app.post(\"/api/auth/login\"',
    'app.get(\"/api/dashboard\"',
    'function crud',
    'app.use(\"/api/customers\"'
  ];

  let end = -1;
  for (const a of anchors) {
    const i = s.indexOf(a, start);
    if (i >= 0 && (end === -1 || i < end)) end = i;
  }

  if (end > start) {
    s = s.slice(0, start) + s.slice(end);
  }
}

s = s.replace(/app\.(get|set)\([\"']\/api\/health[\\s\\S]*?\);/g, '');

const block = `
function makeRef(prefix){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const letters = Array.from({length:3}, function(){
    return chars[Math.floor(Math.random() * chars.length)];
  }).join("");
  const nums = String(Math.floor(Math.random() * 900) + 100);
  return String(prefix || "REF") + "-" + letters + nums;
}

app.get("/api/health", function(req, res){
  res.json({ ok:true, port:PORT, storage:DATA });
});

`;

if (!s.includes('function makeRef(prefix)')) {
  const anchor = s.indexOf('app.post(\"/api/auth/login\"');
  if (anchor >= 0) {
    s = s.slice(0, anchor) + block + s.slice(anchor);
  } else {
    s += block;
  }
}

fs.writeFileSync(p, s);
'@ | Set-Content fix-server.js"

node fix-server.js
node -c server.js

cd /d C:\Windows\System32\propergeeks-rebuild

npx concurrently "cd server && npm start" "cd client && npm start -- --host 0.0.0.0 --port 3002"