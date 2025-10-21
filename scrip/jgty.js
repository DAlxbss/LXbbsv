/*
  * 激光投影

[rewrite_local]
https://api.iosxiao.com/app/subscribe/getSubscribeData url script-response-body https://raw.githubusercontent.com/DAlxbss/LXbbsv/main/scrip/jgty.js

[mitm]
hostname = api.iosxiao.com
*/
let a = $response.body;

if (a) {
    let b = {
        "success": true,
        "status": 200,
        "message": "请求成功",
        "data": {
            "subscribeId": "",
            "productExpires": "0",
            "formattedExpiryDate": "2099年09月09日",
            "daysStatus": "99999",
            "productTotalDays": 999999,
            "usedDays": 0
        }
    };
    a = JSON.stringify(b);
}

$done({ body: a });
