// PandaVPN node extractor (robust for binary bodies)
// Works with binary-body-mode=1: decodes bytes, handles gzip/br, then extracts SS links.
// Output: writes nodes to Persistent Store key 'panda_nodes', notifies a summary, and logs.

// Helper: safe log
function log(msg) { try { console.log(`[Panda] ${msg}`); } catch (_) {} }

// Decode response body to text, supporting gzip/brotli/raw
function decodeBodyToText(resp) {
  const bytes = $response.bodyBytes ?? ($response.body ? $crypto.base64Decode($response.body) : null);
  if (!bytes) return '';
  const hdr = ($response.headers || {});
  const enc = (hdr['Content-Encoding'] || hdr['content-encoding'] || '').toLowerCase();
  const u8 = new Uint8Array(bytes);
  try {
    if (enc.includes('gzip') || (u8.length > 2 && u8[0] === 0x1f && u8[1] === 0x8b)) {
      return $compression.gunzip(u8);
    }
    if (enc.includes('br')) {
      if ($compression.brotli && $compression.brotli.decode) return $compression.brotli.decode(u8);
    }
  } catch (e) {
    log(`decompress fail: ${e}`);
  }
  try { return $text.decode(u8, 'utf-8'); } catch (_) {}
  try { return $text.decode(u8, 'gb18030'); } catch (_) {}
  return '';
}

// Extract SS from arbitrary text: accepts "method:password@host:port" or standard ss://base64 form
function extractSS(text) {
  const results = new Set();
  // 1) 标准 ss://BASE64#name
  const re1 = /ss:\/\/[A-Za-z0-9+\/=\-_]+(?:#[^\s\n]*)?/g;
  for (const m of text.matchAll(re1)) {
    results.add(m[0]);
  }
  // 2) 明文片段 method:password@host:port -> 打包成 ss://
  const re2 = /(aes|chacha|rc4|salsa)[^\s:]*:[^\s@]+@[a-zA-Z0-9_.\-]+:\d{2,5}/gi;
  for (const m of text.matchAll(re2)) {
    const base = $crypto.base64Encode(m[0]);
    results.add(`ss://${base}`);
  }
  // 3) 修复缺失的 host:port 尾巴（你的文件里常见截断），尝试把像 "@x.x.x.x:port" 补齐到最近的 base64 体
  // 简化处理：再扫一遍可能的 host:port
  const hp = /@([0-9.\-a-zA-Z]+):(\d{2,5})/g;
  const hostports = [...text.matchAll(hp)].map(x => x[0]);
  // 若结果里存在明显损坏的 base64（如以 '-' 结尾），尝试拼补（保守策略，不强行拼接避免误伤）
  const fixed = new Set();
  for (const link of results) {
    if (/ss:\/\/[A-Za-z0-9+\/=\-_]+$/.test(link) && !/#/.test(link)) {
      // 没有 #name 的，附个空名避免 UI 误判
      fixed.add(link + '#Panda');
    } else {
      fixed.add(link);
    }
  }
  return [...fixed];
}

try {
  const url = $request.url;
  const bodyText = decodeBodyToText($response);
  if (!bodyText) {
    log('empty body after decode');
    $done({});
    return;
  }

  const nodes = extractSS(bodyText);
  const uniq = [...new Set(nodes)];

  // 存储与通知
  $persistentStore.write(uniq.join('\n'), 'panda_nodes');
  const msg = `提取成功: ${uniq.length} 条`;
  $notification.post('PandaVPN', '提取完成', msg);
  log(msg);

  // 若你需要把节点直接回注响应（通常不需要），可：$done({ body: uniq.join('\n') });
  $done({});
} catch (e) {
  $notification.post('PandaVPN', '脚本错误', String(e));
  log(`error: ${e}\n${e.stack || ''}`);
  $done({});
}

