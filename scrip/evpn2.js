const STORE_KEY = 'EVA_XRAY_NODES';
(function () {
  try {
    const m = ($request.url || '').match(/\/(export|clear)$/);
    const action = m ? m[1] : '';
    if (action === 'clear') {
      $persistentStore.write('', STORE_KEY);
      return $done({ status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'OK: cleared' });
    }
    const data = $persistentStore.read(STORE_KEY) || '';
    return $done({ status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: data });
  } catch (e) {
    return $done({ status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'ERR' });
  }
})();
