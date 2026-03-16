const STORE_KEY = 'EVA_XRAY_NODES';
2	+
3	+
(function () {
4	+
  try {
5	+
    const body = $response.body || '';
6	+
    if (!body) return $done({});
7	+
8	+
    const j = JSON.parse(body);
9	+
    const url = j?.content?.access_url;
10	+
    if (!url || typeof url !== 'string' || !url.startsWith('vless://')) {
11	+
      return $done({});
12	+
    }
13	+
14	+
    const old = $persistentStore.read(STORE_KEY) || '';
15	+
    const set = new Set(old.split('\n').filter(Boolean));
16	+
    const isNew = !set.has(url);
17	+
    if (isNew) {
18	+
      set.add(url);
19	+
      const out = Array.from(set).join('\n');
20	+
      $persistentStore.write(out, STORE_KEY);
21	+
      $notification.post('EVA 节点捕获', '新增 access_url', url);
22	+
    }
23	+
    $done({});
24	+
  } catch (e) {
25	+
    $done({});
26	+
  }
27	+
})();