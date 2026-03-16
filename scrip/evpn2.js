/*
  EVA nodes export/clear (optional)
  - GET http://xray-helper.local/export -> returns collected nodes (if SAVE_TO_PSTORE=true in evpn.js)
  - GET http://xray-helper.local/clear  -> clear storage
*/

const STORE_KEY = 'EVA_XRAY_NODES';
(function () {
  try {
    const url = $request.url || '';
    if (/\/clear$/.test(url)) {
      $persistentStore.write('', STORE_KEY);
      return $done({ status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'OK: cleared' });
    }
    const data = $persistentStore.read(STORE_KEY) || '';
    return $done({ status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: data });
  } catch (e) {
    return $done({ status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'ERR' });
  }
})();
