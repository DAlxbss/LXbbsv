/*
  PandaVPN node extractor (fixed)
  - Robust body recovery under binary-body-mode=1 (gzip/br/none)
  - Correctly builds ss:// links: ss://BASE64(method:password@host:port)#URLEncode(name)
  - Outputs plain text list (one per line) by default

  Tested with Surge 5.x
*/

const replaceBody = true; // set to false if you don't want to overwrite response body

function b64(str){
  // Standard Base64 (not URL-safe). Surge $crypto API ensures standard alphabet.
  return $crypto.base64Encode(str);
}

function tryGunzip(u8){
  try {
    return $compression.gunzip(u8); // string
  } catch(e){ return null; }
}
function tryBrotli(u8){
  try {
    if ($compression?.brotli?.decode) return $compression.brotli.decode(u8); // string
  } catch(e){ return null; }
  return null;
}

function bytesToText(u8){
  // Decide by header or magic
  const enc = ($response.headers?.["Content-Encoding"] || "").toLowerCase();
  if (enc.includes("gzip")){
    const s = tryGunzip(u8); if (s!=null) return s;
  }
  if (enc.includes("br")){
    const s = tryBrotli(u8); if (s!=null) return s;
  }
  // magic numbers
  if (u8.length>2 && u8[0]===0x1f && u8[1]===0x8b){
    const s = tryGunzip(u8); if (s!=null) return s;
  }
  // fallback: UTF-8 decode
  try { return $text.decode(u8, 'utf-8'); } catch(e){ return '' }
}

function normalizeHost(h){
  // Remove invisible chars and stray punctuations produced by OCR/dirty data
  if (!h) return '';
  let s = String(h).trim();
  s = s.replace(/[\u200B-\u200D\uFEFF]/g,''); // zero-widths
  s = s.replace(/[\s\u0000-\u001F]/g,'');
  // common corruptions like 'EAt-Ovw==' -> try strip base64 residue
  if (/^[A-Za-z0-9+\/]+=*$/.test(s) && !/\./.test(s)){
    // looks like base64 junk without dots -> discard
    return '';
  }
  return s;
}

function buildSS(item){
  // item: {method, password, host, port, name}
  const method = (item.method||'').trim();
  const password = (item.password||'').trim();
  const host = normalizeHost(item.host);
  const port = String(item.port||'').trim();
  const name = (item.name||'').trim();
  if (!method || !password || !host || !port) return null;
  const base = b64(`${method}:${password}@${host}:${port}`);
  const tag = encodeURIComponent(name||`${host}:${port}`);
  return `ss://${base}#${tag}`;
}

function extractFromText(txt){
  const lines = [];

  // 1) If response already contains valid ss:// links, collect directly
  const pre = txt.match(/ss:\/\/[A-Za-z0-9+\/=\-_%]+#[^\n\r\s]+/g);
  if (pre) pre.forEach(s => lines.push(s));

  // 2) Try to parse JSON arrays of nodes with keys like method/password/host/port/name
  try{
    const j = JSON.parse(txt);
    const arr = Array.isArray(j)? j : (Array.isArray(j?.data)? j.data : []);
    if (Array.isArray(arr)){
      for (const n of arr){
        const ss = buildSS({
          method: n.method || n.encryption || n.cipher || 'aes-256-gcm',
          password: n.password || n.pwd || n.pass || n.key,
          host: n.host || n.server || n.ip || n.addr,
          port: n.port || n.server_port || n.p,
          name: n.name || n.remarks || n.remark || n.ps || n.tag
        });
        if (ss) lines.push(ss);
      }
    }
  } catch(e){}

  // 3) Fallback: regex capture common text fields
  // method/password
  const method = (txt.match(/\b(method|cipher|encryption)\s*[:=]\s*"?([A-Za-z0-9\-]+)"?/i)||[])[2];
  const password = (txt.match(/\b(password|pwd|pass|key)\s*[:=]\s*"?([^"\s,]+)"?/i)||[])[2];
  // gather host+port pairs
  const hp = [...txt.matchAll(/\b((?:[0-9]{1,3}\.){3}[0-9]{1,3}|[A-Za-z0-9_.-]+)\s*[:]\s*(\d{2,5})\b/g)];
  if (method && password && hp.length){
    for (const m of hp){
      const host = normalizeHost(m[1]);
      const port = m[2];
      const ss = buildSS({method, password, host, port, name: `${host}:${port}`});
      if (ss) lines.push(ss);
    }
  }

  // de-dup
  const uniq = Array.from(new Set(lines));
  return uniq.join('\n');
}

(function(){
  try{
    const bytes = $response.bodyBytes ?? $crypto.base64Decode($response.body);
    const u8 = new Uint8Array(bytes);
    const text = bytesToText(u8);
    const out = extractFromText(text);

    if (replaceBody){
      $done({ status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: out });
    } else {
      $notification.post('PandaVPN Extract', 'nodes', `${out.split('\n').length} items`);
      $done({});
    }
  }catch(e){
    $notification.post('PandaVPN Extract error', '', String(e));
    $done({});
  }
})();
