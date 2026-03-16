const STORE_KEY = 'EVA_XRAY_NODES';

(function () {
  try {
    const body = $response.body || '';
    if (!body) return $done({});

    const j = JSON.parse(body);
    const url = j?.content?.access_url;
    if (!url || typeof url !== 'string' || !url.startsWith('vless://')) {
      return $done({});
    }

    const old = $persistentStore.read(STORE_KEY) || '';
    const set = new Set(old.split('\n').filter(Boolean));
    const isNew = !set.has(url);
    if (isNew) {
      set.add(url);
      const out = Array.from(set).join('\n');
      $persistentStore.write(out, STORE_KEY);
      $notification.post('EVA 节点捕获', '新增 access_url', url);
    }
    $done({});
  } catch (e) {
    $done({});
  }
})();
