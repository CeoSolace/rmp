cd /d C:\Windows\System32\propergeeks-rebuild\server

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='server.js'; $s=Get-Content $p -Raw; Copy-Item $p ($p+'.bak') -Force; $s=[regex]::Replace($s,'function makeRef[\s\S]*?app\.get\(\"/api/health\"','app.get(\"/api/health\"'); $fn=@'
function makeRef(prefix){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const letters = Array.from({length:3}, function(){
    return chars[Math.floor(Math.random() * chars.length)];
  }).join("");
  const nums = String(Math.floor(Math.random() * 900) + 100);
  return String(prefix || "REF") + "-" + letters + nums;
}

'@; $s=$s.Replace('app.get(\"/api/health\"',$fn+'app.get(\"/api/health\"'); Set-Content -Encoding UTF8 $p $s"

node -c server.js

cd /d C:\Windows\System32\propergeeks-rebuild

npx concurrently "cd server && npm start" "cd client && npm start -- --host 0.0.0.0 --port 3002"