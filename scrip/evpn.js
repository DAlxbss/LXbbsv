/*
  EVA xray-connections -> log access_url to Surge Script Log
  - Keep it ultra-light to avoid timeouts
  - Optional toast: set SHOW_TOAST=true
*/

const TAG = '[EVA-NODE]';
const SHOW_TOAST = true; // set false to disable notification

(function () {
  try {
    var body = $response.body || '';
    if (!body) { $done({}); return; }
    // Fast regex extraction (avoid JSON.parse)
    var m = /"access_url"\s*:\s*"(vless:\/\/[^\"]+)"/.exec(body);
    if (m && m[1]) {
      var url = m[1];
      $console.log(TAG + ' ' + url);
      if (SHOW_TOAST) $notification.post('EVA 捕获到节点', '', url);
    }
    $done({});
  } catch (e) {
    $done({});
  }
})();
