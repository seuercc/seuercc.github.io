const style2 = document.createElement('style');
style2.textContent = `
    body{
        padding:20px;
        font:14px/1.6 sans-serif;
        background:#f5f7fa;
        margin:0; /* 清除默认边距 */
    }
    #userIdResult2{
        margin-top:15px;
        padding:15px;
        background:#fff;
        border-radius:8px;
        box-shadow:0 1px 3px rgba(0,0,0,0.05);
        /* 核心优化：解决横向溢出 */
        word-break: break-all; /* 强制换行，包括长单词/长字符串 */
        white-space: pre-wrap; /* 保留换行符，同时自动换行 */
        overflow-x: hidden; /* 禁止横向滚动 */
        overflow-y: auto; /* 纵向溢出时滚动 */
        max-height: 80vh; /* 限制最大高度，避免页面过高 */
        max-width: 100%; /* 限制最大宽度，适配屏幕 */
        box-sizing: border-box; /* 内边距计入宽度，避免溢出 */
    }
    /* 每个结果项添加分隔，提升可读性 */
    #userIdResult2 > div {
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
    }
    /* 最后一个项去掉边框和间距 */
    #userIdResult2 > div:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
    }
    .suc{color:#48bb78}
    .err{color:#e53e3e}
    /* 长内容包裹样式，增强可读性 */
    .result-content {
        margin-top: 8px;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 4px;
        font-family: monospace; /* 等宽字体，适合展示JSON/字符串 */
        font-size: 13px;
    }
    `;
document.head.appendChild(style2);
const resultContainer2 = document.createElement('div');
resultContainer2.id = 'userIdResult2';
resultContainer2.textContent = '';
document.body.appendChild(resultContainer2);

function gameCenterStartDownloadApp() {
    let params = {
        'appId': 'C5765880207856049751',
        'iconUrl': 'https://appimg.dbankcdn.com/application/icon144/phone/90baadb2a4694cd5aeb1054130cdc024.webp',
        'name': 'pxx',
        'packageName': 'com.xunmeng.pinduoduo.hos'
    };
    if (window.HiSpaceObject) {
        console.log('HiSpaceObject startDownloadApp')
        window.HiSpaceObject.startDownload(JSON.stringify(params));
        resultContainer2.innerHTML += `<div class="suc">✅ 游戏中心 startDownloadApp succeed</div>`;
    } else {
        console.log('no window.HiSpaceObject')
        resultContainer2.innerHTML += `<div class="err">❌ 游戏中心 startDownloadApp error：no window.HiSpaceObject</div>`;
    }
}

function gameCenterGetPostParams() {
    if (window.HiSpaceObject) {
        console.log('HiSpaceObject getPostParams')
        let result = window.HiSpaceObject.getPostParams();
        // 优化：用.result-content包裹长内容，JSON格式化展示
        const formattedResult = JSON.stringify(result, null, 2).replace(/\n/g, '<br>');
        resultContainer2.innerHTML += `<div class="suc">✅ 游戏中心 getPostParams succeed<div class="result-content">${formattedResult}</div></div>`;
    } else {
        console.log('no window.HiSpaceObject')
        resultContainer2.innerHTML += `<div class="err">❌ 游戏中心 getPostParams error：no window.HiSpaceObject</div>`;
    }
}

async function musicGetUserInfo() {
    if (window.AOPJSInterface) {
        let params = window.AOPJSInterface.getParams();
        let userInfo = await window.AOPJSInterface.getUserInfo();
        let spToken = await window.AOPJSInterface.getSpToken('H5-Camp');
        // 优化：将\n替换为<br>，让换行生效
        let res1 = 'get getParams : <br>'.concat(params).concat('<br>');
        let res2 = res1.concat('get getUserInfo : <br>'.concat(userInfo)).concat('<br>');
        let res3 = res2.concat('get getSpToken : <br>'.concat(spToken));
        resultContainer2.innerHTML += `<div class="suc">✅ 音乐 getUserInfo succeed<div class="result-content">${res3}</div></div>`;
    } else {
        console.log('no window.AOPJSInterface')
        resultContainer2.innerHTML += `<div class="err">❌ 音乐 getUserInfo error：no window.AOPJSInterface</div>`;
    }
}

async function himovieSignInAsync() {
    if (window.JsInterface) {
        let h5SessionId = await window.JsInterface.signInAsync()
        resultContainer2.innerHTML += `<div class="suc">✅ 视频 signInAsync succeed<div class="result-content">${h5SessionId}</div></div>`;
    } else {
        console.log('no window.JsInterface')
        resultContainer2.innerHTML += `<div class="err">❌ 视频 signInAsync error：no window.JsInterface</div>`;
    }
}

async function clouddriveGetOperationResp() {
    if (window.hidiskOperation) {
        let result = await await hidiskOperation.getOperationResp(2, 'queryTrxPage', '', 'POST');
        resultContainer2.innerHTML += `<div class="suc">✅ 云空间 getOperationResp succeed<div class="result-content">${result}</div></div>`;
    } else {
        console.log('no window.hidiskOperation')
        resultContainer2.innerHTML += `<div class="err">❌ 云空间 getOperationResp error：no window.hidiskOperation</div>`;
    }
}


function themeGetParams() {
    if (window.JsInterface) {
        let result = window.JsInterface.getParams();
        // 优化：JSON格式化+换行
        const formattedResult = JSON.stringify(result, null, 2).replace(/\n/g, '<br>');
        resultContainer2.innerHTML += `<div class="suc">✅ 主题 getParams succeed<div class="result-content">${formattedResult}</div></div>`;
    } else {
        console.log('no window.JsInterface')
        resultContainer2.innerHTML += `<div class="err">❌ 主题 getParams error：no window.JsInterface</div>`;
    }
}

function walletGetAccessTokens() {
    try {
        if (window.walletTokenInfoJsInterface) {
            window.walletTokenInfoJsInterface.getAccessToken()
                .then((session) => {
                    console.info('session : ' + session);
                    resultContainer2.innerHTML += `<div class="suc">✅ 钱包 getAccessToken succeed<div class="result-content">${session}</div></div>`;
                    // 补充：添加logForH5的存在性校验，避免报错
                    if (window.walletBasicAbilityJSInterface) {
                        window.walletBasicAbilityJSInterface.logForH5('session', session)
                    }
                })
                .catch((err) => {
                    console.error('getAccessToken 调用失败:', err);
                    const errorMsg = err.message || '未知错误';
                    resultContainer2.innerHTML += `<div class="err">❌ 钱包 getAccessToken error：${errorMsg}</div>`;
                });
        } else {
            console.log('no window.walletTokenInfoJsInterface');
            resultContainer2.innerHTML += `<div class="err">❌ 钱包 getAccessToken error：no window.JsInterface</div>`;
        }
    } catch (err) {
        console.error('walletGetAccessTokens 执行异常:', err);
        resultContainer2.innerHTML += `<div class="err">❌ 钱包 getAccessToken 执行异常：${err.message}</div>`;
    }
}

function mapGetUserInfo() {
    if (window.HmsMapsJsBridge) {
        window.HmsMapsJsBridge.onmessage = function (param) {
            console.log('onmessage param:', param);
            const formattedResult = JSON.stringify(JSON.parse(param), null, 2).replace(/\n/g, '<br>');
            resultContainer2.innerHTML += `<div class="suc">✅ 地图 getUserInfo succeed<div class="result-content">${formattedResult}</div></div>`;
        };
        window.HmsMapsJsBridge.postMessage(JSON.stringify({"type": "getUserInfo"}));
    } else {
        console.log('no window.HmsMapsJsBridge')
        resultContainer2.innerHTML += `<div class="err">❌ 地图 getUserInfo error：no window.HmsMapsJsBridge</div>`;
    }
}

async function bookCampaignLogin() {
    if (window.jshwread) {
        let result = await jshwread.campaignLogin(1, ["316172"])
        const formattedResult = JSON.stringify(result, null, 2).replace(/\n/g, '<br>');
        resultContainer2.innerHTML += `<div class="suc">✅ 阅读 campaignLogin succeed<div class="result-content">${formattedResult}</div></div>`;
    } else {
        console.log('no window.jshwread')
        resultContainer2.innerHTML += `<div class="err">❌ 阅读 campaignLogin error：no window.jshwread</div>`;
    }
}

async function petalPayBasicAbilityJSInterface() {
    if (window.petalPayBasicAbilityJSInterface) {
        let result = await petalPayBasicAbilityJSInterface.getAccessToken(false)
        const formattedResult = JSON.stringify(result, null, 2).replace(/\n/g, '<br>');
        resultContainer2.innerHTML += `<div class="suc">✅ PetalPay getAccessToken succeed<div class="result-content">${formattedResult}</div></div>`;
    } else {
        console.log('no window.petalPayBasicAbilityJSInterface')
        resultContainer2.innerHTML += `<div class="err">❌ PetalPay getAccessToken error：no window.petalPayBasicAbilityJSInterface</div>`;
    }
}
gameCenterStartDownloadApp();
gameCenterGetPostParams();
musicGetUserInfo();
mapGetUserInfo();
themeGetParams();
himovieSignInAsync();
clouddriveGetOperationResp();
walletGetAccessTokens();
bookCampaignLogin();
petalPayBasicAbilityJSInterface();
