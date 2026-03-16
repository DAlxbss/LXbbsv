/*
  EVA xray-connections capture (ultra-fast log only)
  - Trigger: http-response for https://api.cookshowroom.org/xray-connections
  - Action: regex extract "access_url":"vless://..." and log it
  - No JSON.parse, no notifications, no persistence -> avoid timeouts
*/
(function () {
  try {
    var body = $response.body || '';
    if (!body) { $done({}); return; }
    var m = /"access_url"\s*:\s*"(vless:\/\/[^\"]+)"/.exec(body);
    if (m && m[1]) {
      $console.log('[EVA-NODE] ' + m[1]);
    }
    $done({});
  } catch (e) {
    $done({});
  }
})();
