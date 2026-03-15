/*
  PandaVPN extractor (guarded fast version)
  - Works with binary-body-mode=0 and Accept-Encoding: identity
  - Very lightweight to avoid Script Timeout
  - Correct ss:// building only; no extra network calls
*/

const replaceBody = true;           // set false to keep original body
const MAX_PARSE_BYTES = 2 * 1024 * 1024; // safety: 2MB

function b64(s){ return $crypto.base64Encode(s); }
function normHost(h){
  if(!h) return '';
  let s = String(h).trim();
  s = s.replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[\s\u0000-\u001F]/g,'');
  return s;
}
function buildSS(x){
  const method = (x.method||x.encryption||x.cipher||'').trim();
  const password = (x.password||x.pwd||x.pass||x.key||'').trim();
  const host = normHost(x.host||x.server||x.ip||x.addr);
  const port = String(x.port||x.server_port||x.p||'').trim();
  const name = (x.name||x.remarks||x.remark||x.ps||x.tag||`${host}:${port}`).trim();
  if(!method||!password||!host||!port) return null;
  const base = b64(`${method}:${password}@${host}:${port}`);
  return `ss://${base}#${encodeURIComponent(name)}`;
}

function extract(txt){
  const out = [];
  // 1) existing ss://
  const pre = txt.match(/ss:\/\/[A-Za-z0-9+\/=\-_%]+#[^\n\r\s]+/g);
  if(pre) for(const s of pre) out.push(s);

  // 2) JSON array
  try{
    const j = JSON.parse(txt);
    const arr = Array.isArray(j)? j : (Array.isArray(j?.data)? j.data : null);
    if(arr && Array.isArray(arr)){
      for(const n of arr){
        const s = buildSS(n); if(s) out.push(s);
      }
    }
  }catch(_){/* ignore */}

  // 3) fallback regex
  const method = (txt.match(/\b(method|cipher|encryption)\s*[:=]\s*"?([A-Za-z0-9\-]+)"?/i)||[])[2];
  const password = (txt.match(/\b(password|pwd|pass|key)\s*[:=]\s*"?([^"\s,]+)"?/i)||[])[2];
  const hp = [...txt.matchAll(/\b((?:[0-9]{1,3}\.){3}[0-9]{1,3}|[A-Za-z0-9_.-]+)\s*[:]\s*(\d{2,5})\b/g)];
  if(method && password && hp.length){
    for(const m of hp){
      const host = normHost(m[1]); const port = m[2];
      const s = buildSS({method,password,host,port,name:`${host}:${port}`});
      if(s) out.push(s);
    }
  }

  return Array.from(new Set(out)).join('\n');
}

(function(){
  try{
    const headers = $response.headers||{};
    const enc = (headers['Content-Encoding']||headers['content-encoding']||'').toLowerCase();
    const ctype = (headers['Content-Type']||headers['content-type']||'').toLowerCase();
    const body = $response.body||'';
    if(body.length === 0){ $done({}); return; }
    if(body.length > MAX_PARSE_BYTES){ $done({}); return; }
    if(enc && enc !== 'identity'){ // still compressed -> skip to avoid timeout
      $done({}); return;
    }
    // optional: require JSON or text only
    if(ctype && !(ctype.includes('json') || ctype.includes('text'))){ $done({}); return; }

    const out = extract(body);
    if(!out){ $done({}); return; }

    if(replaceBody){
      $done({ status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: out });
    } else $done({});
  }catch(e){
    // fail safe: never block pipeline
    $done({});
  }
})();
