// 初始化样式和结果容器，添加异常处理
try {
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
} catch (initError) {
    console.error('初始化样式和容器失败:', initError);
    // 初始化失败时，降级创建一个简单的结果容器
    const fallbackContainer = document.createElement('div');
    fallbackContainer.id = 'userIdResult2';
    fallbackContainer.style = 'margin:20px; padding:15px; border:1px solid #e53e3e; background:#fff;';
    fallbackContainer.innerHTML = `<div class="err">❌ 初始化失败：${initError.message}</div>`;
    document.body.appendChild(fallbackContainer);
}

// 封装JSON格式化函数，添加异常处理
function formatJSON(data) {
    try {
        return JSON.stringify(data, null, 2).replace(/\n/g, '<br>');
    } catch (e) {
        console.error('JSON格式化失败:', e);
        return `格式化失败：${e.message}，原始数据：${String(data)}`;
    }
}

// 封装JSON解析函数，添加异常处理
function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error('JSON解析失败:', e);
        return null;
    }
}

function gameCenterStartDownloadApp() {
    try {
        let params = {
            'appId': 'C5765880207856049751',
            'iconUrl': 'https://appimg.dbankcdn.com/application/icon144/phone/90baadb2a4694cd5aeb1054130cdc024.webp',
            'name': 'pxx',
            'packageName': 'com.xunmeng.pinduoduo.hos'
        };
        if (window.HiSpaceObject) {
            console.log('HiSpaceObject startDownloadApp')
            // 捕获接口调用可能的异常
            window.HiSpaceObject.startDownload(JSON.stringify(params));
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ 游戏中心 startDownloadApp succeed</div>`;
        } else {
            console.log('no window.HiSpaceObject')
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 游戏中心 startDownloadApp error：no window.HiSpaceObject</div>`;
        }
    } catch (err) {
        console.error('gameCenterStartDownloadApp 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 游戏中心 startDownloadApp 执行异常：${err.message}</div>`;
    }
}

function gameCenterGetPostParams() {
    try {
        if (window.HiSpaceObject) {
            console.log('HiSpaceObject getPostParams')
            let result = window.HiSpaceObject.getPostParams();
            const formattedResult = formatJSON(result);
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ 游戏中心 getPostParams succeed<div class="result-content">${formattedResult}</div></div>`;
        } else {
            console.log('no window.HiSpaceObject')
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 游戏中心 getPostParams error：no window.HiSpaceObject</div>`;
        }
    } catch (err) {
        console.error('gameCenterGetPostParams 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 游戏中心 getPostParams 执行异常：${err.message}</div>`;
    }
}

async function musicGetUserInfo() {
    try {
        if (window.AOPJSInterface) {
            let params = window.AOPJSInterface.getParams();
            let userInfo = await window.AOPJSInterface.getUserInfo();
            let spToken = await window.AOPJSInterface.getSpToken('H5-Camp');
            
            let res1 = 'get getParams : <br>'.concat(String(params)).concat('<br>');
            let res2 = res1.concat('get getUserInfo : <br>'.concat(String(userInfo))).concat('<br>');
            let res3 = res2.concat('get getSpToken : <br>'.concat(String(spToken)));
            
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ 音乐 getUserInfo succeed<div class="result-content">${res3}</div></div>`;
        } else {
            console.log('no window.AOPJSInterface')
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 音乐 getUserInfo error：no window.AOPJSInterface</div>`;
        }
    } catch (err) {
        console.error('musicGetUserInfo 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 音乐 getUserInfo 执行异常：${err.message}</div>`;
    }
}

async function himovieSignInAsync() {
    try {
        if (window.JsInterface) {
            let h5SessionId = await window.JsInterface.signInAsync()
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ 视频 signInAsync succeed<div class="result-content">${String(h5SessionId)}</div></div>`;
        } else {
            console.log('no window.JsInterface')
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 视频 signInAsync error：no window.JsInterface</div>`;
        }
    } catch (err) {
        console.error('himovieSignInAsync 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 视频 signInAsync 执行异常：${err.message}</div>`;
    }
}

async function clouddriveGetOperationResp() {
    try {
        if (window.hidiskOperation) {
            // 修复原代码中重复的await
            let result = await window.hidiskOperation.getOperationResp(2, 'queryTrxPage', '', 'POST');
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ 云空间 getOperationResp succeed<div class="result-content">${String(result)}</div></div>`;
        } else {
            console.log('no window.hidiskOperation')
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 云空间 getOperationResp error：no window.hidiskOperation</div>`;
        }
    } catch (err) {
        console.error('clouddriveGetOperationResp 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 云空间 getOperationResp 执行异常：${err.message}</div>`;
    }
}

function themeGetParams() {
    try {
        if (window.JsInterface) {
            let result = window.JsInterface.getParams();
            const formattedResult = formatJSON(result);
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ 主题 getParams succeed<div class="result-content">${formattedResult}</div></div>`;
        } else {
            console.log('no window.JsInterface')
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 主题 getParams error：no window.JsInterface</div>`;
        }
    } catch (err) {
        console.error('themeGetParams 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 主题 getParams 执行异常：${err.message}</div>`;
    }
}

function walletGetAccessTokens() {
    try {
        if (window.walletTokenInfoJsInterface) {
            window.walletTokenInfoJsInterface.getAccessToken()
                .then((session) => {
                    console.info('session : ' + session);
                    document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ 钱包 getAccessToken succeed<div class="result-content">${String(session)}</div></div>`;
                    
                    if (window.walletBasicAbilityJSInterface) {
                        // 捕获logForH5调用的异常
                        try {
                            window.walletBasicAbilityJSInterface.logForH5('session', session);
                        } catch (logErr) {
                            console.error('logForH5 调用失败:', logErr);
                        }
                    }
                })
                .catch((err) => {
                    console.error('getAccessToken 调用失败:', err);
                    const errorMsg = err.message || '未知错误';
                    document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 钱包 getAccessToken error：${errorMsg}</div>`;
                });
        } else {
            console.log('no window.walletTokenInfoJsInterface');
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 钱包 getAccessToken error：no window.walletTokenInfoJsInterface</div>`;
        }
    } catch (err) {
        console.error('walletGetAccessTokens 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 钱包 getAccessToken 执行异常：${err.message}</div>`;
    }
}

function mapGetUserInfo() {
    try {
        if (window.HmsMapsJsBridge) {
            window.HmsMapsJsBridge.onmessage = function (param) {
                try {
                    console.log('onmessage param:', param);
                    const parsedParam = parseJSON(param);
                    const formattedResult = formatJSON(parsedParam || param);
                    document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ 地图 getUserInfo succeed<div class="result-content">${formattedResult}</div></div>`;
                } catch (msgErr) {
                    console.error('HmsMapsJsBridge onmessage 处理异常:', msgErr);
                    document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 地图 getUserInfo 消息处理异常：${msgErr.message}</div>`;
                }
            };
            window.HmsMapsJsBridge.postMessage(JSON.stringify({"type": "getUserInfo"}));
        } else {
            console.log('no window.HmsMapsJsBridge')
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 地图 getUserInfo error：no window.HmsMapsJsBridge</div>`;
        }
    } catch (err) {
        console.error('mapGetUserInfo 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 地图 getUserInfo 执行异常：${err.message}</div>`;
    }
}

async function bookCampaignLogin() {
    try {
        if (window.jshwread) {
            let result = await window.jshwread.campaignLogin(1, ["316172"])
            const formattedResult = formatJSON(result);
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ 阅读 campaignLogin succeed<div class="result-content">${formattedResult}</div></div>`;
        } else {
            console.log('no window.jshwread')
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 阅读 campaignLogin error：no window.jshwread</div>`;
        }
    } catch (err) {
        console.error('bookCampaignLogin 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ 阅读 campaignLogin 执行异常：${err.message}</div>`;
    }
}

async function petalPayGetAccessToken() {
    try {
        if (window.petalPayBasicAbilityJSInterface) {
            let result = await window.petalPayBasicAbilityJSInterface.getAccessToken(false);
            const formattedResult = formatJSON(result);
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ PetalPay getAccessToken succeed<div class="result-content">${formattedResult}</div></div>`;
        } else {
            console.log('no window.petalPayBasicAbilityJSInterface')
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ PetalPay getAccessToken error：no window.petalPayBasicAbilityJSInterface</div>`;
        }
    } catch (err) {
        console.error('petalPayGetAccessToken 执行异常:', err);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ PetalPay getAccessToken 执行异常：${err.message}</div>`;
    }
}

// 执行所有函数，即使单个函数出错也不影响其他函数
(async function runAllFunctions() {
    try { gameCenterStartDownloadApp(); } catch (e) { console.error('执行gameCenterStartDownloadApp失败:', e); }
    try { gameCenterGetPostParams(); } catch (e) { console.error('执行gameCenterGetPostParams失败:', e); }
    try { await musicGetUserInfo(); } catch (e) { console.error('执行musicGetUserInfo失败:', e); }
    try { mapGetUserInfo(); } catch (e) { console.error('执行mapGetUserInfo失败:', e); }
    try { themeGetParams(); } catch (e) { console.error('执行themeGetParams失败:', e); }
    try { await himovieSignInAsync(); } catch (e) { console.error('执行himovieSignInAsync失败:', e); }
    try { await clouddriveGetOperationResp(); } catch (e) { console.error('执行clouddriveGetOperationResp失败:', e); }
    try { walletGetAccessTokens(); } catch (e) { console.error('执行walletGetAccessTokens失败:', e); }
    try { await bookCampaignLogin(); } catch (e) { console.error('执行bookCampaignLogin失败:', e); }
    try { await petalPayGetAccessToken(); } catch (e) { console.error('执行petalPayGetAccessToken失败:', e); }
})();
