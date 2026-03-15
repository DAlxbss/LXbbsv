/*
  PandaVPN extractor (fast-path)
  - Works with binary-body-mode=0 and Accept-Encoding: identity (plain text)
  - No gzip/br decoding to avoid Script Timeout
  - Same correct ss:// building
*/

const replaceBody = true;

function b64(str){ return $crypto.base64Encode(str); }
function normalizeHost(h){
  if (!h) return '';
  let s = String(h).trim();
  s = s.replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[\s\u0000-\u001F]/g,'');
  if (/^[A-Za-z0-9+/]+=*$/.test(s) && !/\./.test(s)) return '';
  return s;
}
function buildSS(item){
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

function extract(txt){
  const lines = [];
  // 1) pre-existing ss links
  const pre = txt.match(/ss:\/\/[A-Za-z0-9+/=\-_%]+#[^\n\r\s]+/g);
  if (pre) pre.forEach(s=>lines.push(s));

  // 2) json array
  try{
    const j = JSON.parse(txt);
    const arr = Array.isArray(j)? j : (Array.isArray(j?.data)? j.data : []);
    if (Array.isArray(arr)){
      for (const n of arr){
        const ss = buildSS({
          method: n.method||n.encryption||n.cipher||'aes-256-gcm',
          password: n.password||n.pwd||n.pass||n.key,
          host: n.host||n.server||n.ip||n.addr,
          port: n.port||n.server_port||n.p,
          name: n.name||n.remarks||n.remark||n.ps||n.tag
        });
        if (ss) lines.push(ss);
      }
    }
  }catch(e){}

  // 3) fallback regex
  const method = (txt.match(/\b(method|cipher|encryption)\s*[:=]\s*"?([A-Za-z0-9\-]+)"?/i)||[])[2];
  const password = (txt.match(/\b(password|pwd|pass|key)\s*[:=]\s*"?([^"]+)"?/i)||[])[2];
  const hp = [...txt.matchAll(/\b((?:[0-9]{1,3}\.){3}[0-9]{1,3}|[A-Za-z0-9_.-]+)\s*[:]\s*(\d{2,5})\b/g)];
  if (method && password && hp.length){
    for (const m of hp){
      const host = normalizeHost(m[1]);
      const port = m[2];
      const ss = buildSS({method,password,host,port,name:`${host}:${port}`});
      if (ss) lines.push(ss);
    }
  }

  return Array.from(new Set(lines)).join('\n');
}

(function(){
  try{
    const text = $response.body || '';
    const out = extract(text);
    if (replaceBody){
      $done({ status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: out });
    } else { $done({}); }
  }catch(e){ $notification.post('PandaVPN Fast error','',String(e)); $done({}); }
})();
