/*
  EVA xray-connections capture (log-only)
  - Trigger: http-response for https://api.cookshowroom.org/xray-connections
  - Action: parse JSON -> content.access_url, print to Surge Script Log
  - Optional: set SAVE_TO_PSTORE=true to also persist across runs
*/

const TAG = "[EVA-NODE]";           // prefix in script log
const SAVE_TO_PSTORE = false;        // set true if you also want to persist
const STORE_KEY = 'EVA_XRAY_NODES';  // key for persistence (optional)

(function () {
  try {
    const body = $response.body || '';
    if (!body) return $done({});

    const j = JSON.parse(body);
    const url = j?.content?.access_url;
    if (!url || typeof url !== 'string' || !url.startsWith('vless://')) {
      return $done({});
    }

    // 1) print to Surge script log
    $console.log(`${TAG} ${url}`);

    // 2) toast notification (optional)
    $notification.post('EVA 捕获到节点', '', url);

    // 3) optional persistence
    if (SAVE_TO_PSTORE) {
      const old = $persistentStore.read(STORE_KEY) || '';
      const set = new Set(old.split('\n').filter(Boolean));
      set.add(url);
      $persistentStore.write(Array.from(set).join('\n'), STORE_KEY);
    }

    return $done({});
  } catch (e) {
    $console.log(`[EVA-NODE][ERROR] ${String(e)}`);
    return $done({});
  }
})();
