/**
 * 原子服务API调用封装模块（UMD格式，App内WebView兼容版）
 * 核心修复：错误信息显示到页面 + 兼容所有容器 + 不溢出
 */
(function (globalObj, factory) {
    if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
        define(factory);
    } else {
        var globalContext = typeof globalThis !== "undefined" ? globalThis : globalObj || self || window;
        globalContext.atomicApi = factory();
    }
})(this, function () {
    "use strict";

    function invokeAtomicServiceApi(apiName, options) {
        try {
            // 兼容旧环境，移除可选链
            if (!window || !window.atomicServiceProxy || typeof window.atomicServiceProxy.invokeJsApi !== 'function') {
                var errMsg = "[原子服务API] 不支持 invokeJsApi，无法调用API：" + apiName;
                console.error(errMsg);
                var container = document.getElementById('atomicApiResult');
                if (container) {
                    container.innerHTML += `
                        <div class="api-result-item">
                            <span class="err">❌ ${errMsg}</span>
                        </div>
                    `;
                }
                return;
            }
            options = options || {};
            window.atomicServiceProxy.invokeJsApi(apiName, options);
        } catch (e) {
            var errMsg = "[原子服务API] 调用异常：" + apiName + "，错误：" + e.message;
            console.error(errMsg);
            var container = document.getElementById('atomicApiResult');
            if (container) {
                container.innerHTML += `
                    <div class="api-result-item">
                        <span class="err">❌ ${errMsg}</span>
                    </div>
                `;
            }
        }
    }

    // -------------------------- 业务API定义 --------------------------
    const getPhoneNumber = function(options) { invokeAtomicServiceApi("getPhoneNumber", options); };
    const getAvatarInfo = function(options) { invokeAtomicServiceApi("getAvatarInfo", options); };
    const getInvoiceTitle = function(options) { invokeAtomicServiceApi("getInvoiceTitle", options); };
    const getDeliveryAddress = function(options) { invokeAtomicServiceApi("getDeliveryAddress", options); };
    const getServiceSubscription = function(options) { invokeAtomicServiceApi("getServiceSubscription", options); };

    const router = {
        pushUrl: function(options) { invokeAtomicServiceApi("router.pushUrl", options); },
        replaceUrl: function(options) { invokeAtomicServiceApi("router.replaceUrl", options); },
        back: function(options) { invokeAtomicServiceApi("router.back", options); },
        clear: function(options) { invokeAtomicServiceApi("router.clear", options); }
    };

    const navPathStack = {
        pushPath: function(options) { invokeAtomicServiceApi("navPathStack.pushPath", options); },
        replacePath: function(options) { invokeAtomicServiceApi("navPathStack.replacePath", options); },
        pop: function(options) { invokeAtomicServiceApi("navPathStack.pop", options); },
        clear: function(options) { invokeAtomicServiceApi("navPathStack.clear", options); }
    };

    const asWeb = {
        postMessage: function(options) { invokeAtomicServiceApi("asWeb.postMessage", options); },
        getEnv: function(options) { invokeAtomicServiceApi("asWeb.getEnv", options); },
        checkJsApi: function(options) { invokeAtomicServiceApi("asWeb.checkJsApi", options); }
    };

    const cameraPicker = { pick: function(options) { invokeAtomicServiceApi("cameraPicker.pick", options); } };
    const photoViewPicker = { select: function(options) { invokeAtomicServiceApi("photoViewPicker.select", options); } };
    const filePreview = { openPreview: function(options) { invokeAtomicServiceApi("filePreview.openPreview", options); } };
    const request = {
        uploadFile: function(options) { invokeAtomicServiceApi("request.uploadFile", options); },
        downloadFile: function(options) { invokeAtomicServiceApi("request.downloadFile", options); }
    };
    const getLocalImgData = function(options) { invokeAtomicServiceApi("getLocalImgData", options); };

    const connection = { getNetworkType: function(options) { invokeAtomicServiceApi("connection.getNetworkType", options); } };
    const location = { getLocation: function(options) { invokeAtomicServiceApi("location.getLocation", options); } };

    const login = function(options) { invokeAtomicServiceApi("login", options); };
    const requestPayment = function(options) { invokeAtomicServiceApi("requestPayment", options); };
    const cashierPicker = function(options) { invokeAtomicServiceApi("cashierPicker", options); };

    const requestContract = function(options) { invokeAtomicServiceApi("requestContract", options); };
    const requestSubscribeMessage = function(options) { invokeAtomicServiceApi("requestSubscribeMessage", options); };

    const createIap = function(options) { invokeAtomicServiceApi("createIap", options); };
    const finishIap = function(options) { invokeAtomicServiceApi("finishIap", options); };
    const queryIap = function(options) { invokeAtomicServiceApi("queryIap", options); };
    const queryIapProducts = function(options) { invokeAtomicServiceApi("queryIapProducts", options); };
    const queryIapEnvStatus = function(options) { invokeAtomicServiceApi("queryIapEnvStatus", options); };
    const isIapSandboxActivated = function(options) { invokeAtomicServiceApi("isIapSandboxActivated", options); };
    const showIapManagedSubscriptions = function(options) { invokeAtomicServiceApi("showIapManagedSubscriptions", options); };

    const startRealNameVerification = function(options) { invokeAtomicServiceApi("startRealNameVerification", options); };
    const startRealNameAuth = function(options) { invokeAtomicServiceApi("startRealNameAuth", options); };
    const startFaceVerification = function(options) { invokeAtomicServiceApi("startFaceVerification", options); };

    return {
        getPhoneNumber, getAvatarInfo, getInvoiceTitle, getDeliveryAddress, getServiceSubscription,
        router, navPathStack, asWeb,
        cameraPicker, photoViewPicker, filePreview, request, getLocalImgData,
        connection, location, login, requestPayment, cashierPicker,
        requestContract, requestSubscribeMessage,
        createIap, finishIap, queryIap, queryIapProducts, queryIapEnvStatus, isIapSandboxActivated, showIapManagedSubscriptions,
        startRealNameVerification, startRealNameAuth, startFaceVerification
    };
});

// -------------------------- 样式与容器初始化（关键修复部分） --------------------------
function initUI() {
    try {
        var style = document.createElement('style');
        style.textContent = `
            * {
                box-sizing: border-box;
                -webkit-box-sizing: border-box;
                word-wrap: break-word;
                word-break: break-all;
            }
            body {
                margin: 0;
                padding: 16px;
                font: 14px/1.5 "Helvetica Neue", Helvetica, Arial, sans-serif;
                background: #f5f7fa;
                overflow-x: hidden;
            }
            #atomicApiResult {
                margin-top: 10px;
                padding: 12px;
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                max-width: 100%;
                overflow-x: hidden;
                overflow-y: auto;
                max-height: 70vh;
            }
            .api-result-item {
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #eee;
            }
            .api-result-item:last-child {
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: none;
            }
            .suc { color: #48bb78; font-weight: bold; }
            .err { color: #e53e3e; font-weight: bold; }
            .result-content {
                margin-top: 6px;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 4px;
                font-family: Consolas, "Courier New", monospace;
                font-size: 12px;
                line-height: 1.4;
                white-space: pre-wrap;
                word-wrap: break-word;
                word-break: break-all;
                overflow-x: hidden;
                max-width: 100%;
            }
        `;
        document.head.appendChild(style);

        var container = document.createElement('div');
        container.id = 'atomicApiResult';
        document.body.appendChild(container);
        return container;
    } catch (e) {
        console.error('UI初始化失败:', e);
        var fallback = document.createElement('div');
        fallback.id = 'atomicApiResult';
        fallback.style.cssText = 'margin:16px; padding:12px; background:#fff; border:1px solid #ccc;';
        fallback.innerHTML = '<div class="err">❌ 初始化失败：' + e.message + '</div>';
        document.body.appendChild(fallback);
        return fallback;
    }
}

// 格式化JSON（兼容长字符串）
function formatJSON(data) {
    try {
        return JSON.stringify(data, null, 2);
    } catch (e) {
        return '格式化失败: ' + e.message + '\n原始数据: ' + String(data);
    }
}

// 确保容器存在
function getResultContainer() {
    var el = document.getElementById('atomicApiResult');
    if (!el) {
        el = initUI();
    }
    return el;
}

// -------------------------- API调用函数 --------------------------
function testLogin() {
    var container = getResultContainer();
    atomicApi.login({
        success: function(res) {
            var html = '<div class="api-result-item"><span class="suc">✅ login succeed</span><pre class="result-content">' + formatJSON(res) + '</pre></div>';
            container.innerHTML += html;
            console.log('login success:', res);
        },
        fail: function(err) {
            var html = '<div class="api-result-item"><span class="err">❌ login fail</span><pre class="result-content">' + formatJSON(err) + '</pre></div>';
            container.innerHTML += html;
            console.error('login fail:', err);
        },
        complete: function(res) {
            console.log('login complete:', res);
        }
    });
}

function testDownloadFile() {
    var container = getResultContainer();
    atomicApi.request.downloadFile({
        url: 'https://consumer.huawei.com/content/dam/huawei-cbg-site/cn/mkt/launch/240515/homepage/pc-watch-fit-3.jpg',
        fileName: 'pc-watch-fit-3.jpg',
        callback: function(err, res) {
            if (res) {
                var html = '<div class="api-result-item"><span class="suc">✅ downloadFile succeed</span><pre class="result-content">' + formatJSON(res) + '</pre></div>';
                container.innerHTML += html;
                console.log('downloadFile success:', res);
            }
            if (err) {
                var html = '<div class="api-result-item"><span class="err">❌ downloadFile fail</span><pre class="result-content">' + formatJSON(err) + '</pre></div>';
                container.innerHTML += html;
                console.error('downloadFile fail:', err);
            }
        }
    });
}

function testGetLocation() {
    var container = getResultContainer();
    atomicApi.location.getLocation({
        priority: 0x203,
        scenario: 0x300,
        maxAccuracy: 0,
        timeoutMs: 5000,
        callback: function(err, res) {
            if (res) {
                var html = '<div class="api-result-item"><span class="suc">✅ getLocation succeed</span><pre class="result-content">' + formatJSON(res) + '</pre></div>';
                container.innerHTML += html;
                console.log('getLocation success:', res);
            }
            if (err) {
                var html = '<div class="api-result-item"><span class="err">❌ getLocation fail</span><pre class="result-content">' + formatJSON(err) + '</pre></div>';
                container.innerHTML += html;
                console.error('getLocation fail:', err);
            }
        }
    });
}

function testQueryIap() {
    var container = getResultContainer();
    atomicApi.queryIap({
        productType: 0,
        queryType: 1,
        success: function(res) {
            var html = '<div class="api-result-item"><span class="suc">✅ queryIap succeed</span><pre class="result-content">' + formatJSON(res) + '</pre></div>';
            container.innerHTML += html;
            console.log('queryIap success:', res);
        },
        fail: function(err) {
            var html = '<div class="api-result-item"><span class="err">❌ queryIap fail</span><pre class="result-content">' + formatJSON(err) + '</pre></div>';
            container.innerHTML += html;
            console.error('queryIap fail:', err);
        }
    });
}

// -------------------------- 页面加载完成后执行 --------------------------
function runTests() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initUI();
            testLogin();
            testDownloadFile();
            testGetLocation();
            testQueryIap();
        });
    } else {
        initUI();
        testLogin();
        testDownloadFile();
        testGetLocation();
        testQueryIap();
    }
}

runTests();
