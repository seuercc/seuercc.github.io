/**
 * 原子服务API调用封装模块（UMD格式）
 * 作用：统一封装对window.atomicServiceProxy.invokeJsApi的调用，对外暴露结构化的API方法
 * 适用环境：支持全局对象、CommonJS、AMD的环境
 */
(function (globalObj, factory) {
    // UMD模块加载逻辑：适配CommonJS/AMD/全局变量三种环境
    if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = factory(); // CommonJS(Node.js)环境
    } else if (typeof define === "function" && define.amd) {
        define(factory); // AMD(RequireJS)环境
    } else {
        // 浏览器全局环境：优先使用globalThis，兼容self/window
        const globalContext = typeof globalThis !== "undefined" ? globalThis : globalObj || self;
        globalContext.has = factory();
    }
})(this, function () {
    "use strict";

    /**
     * 核心API调用函数：封装原子服务代理的调用逻辑，增加错误校验
     * @param {string} apiName - 要调用的原子服务API名称（如getPhoneNumber、router.pushUrl）
     * @param {Object} [options={}] - API调用参数，默认空对象
     */
    function invokeAtomicServiceApi(apiName, options = {}) {
        // 校验原子服务代理是否存在，避免调用报错
        if (!window?.atomicServiceProxy?.invokeJsApi) {
            console.error("[原子服务API] window.atomicServiceProxy.invokeJsApi 未定义，无法调用API：", apiName);
            return;
        }
        // 调用核心API
        window.atomicServiceProxy.invokeJsApi(apiName, options);
    }

    // -------------------------- 业务API方法定义 --------------------------
    // 个人信息相关
    const getPhoneNumber = (options = {}) => invokeAtomicServiceApi("getPhoneNumber", options);
    const getAvatarInfo = (options = {}) => invokeAtomicServiceApi("getAvatarInfo", options);
    const getInvoiceTitle = (options = {}) => invokeAtomicServiceApi("getInvoiceTitle", options);
    const getDeliveryAddress = (options = {}) => invokeAtomicServiceApi("getDeliveryAddress", options);
    const getServiceSubscription = (options = {}) => invokeAtomicServiceApi("getServiceSubscription", options);

    // 路由相关
    const router = {
        pushUrl: (options = {}) => invokeAtomicServiceApi("router.pushUrl", options),
        replaceUrl: (options = {}) => invokeAtomicServiceApi("router.replaceUrl", options),
        back: (options = {}) => invokeAtomicServiceApi("router.back", options),
        clear: (options = {}) => invokeAtomicServiceApi("router.clear", options),
    };

    // 导航栈相关
    const navPathStack = {
        pushPath: (options = {}) => invokeAtomicServiceApi("navPathStack.pushPath", options),
        replacePath: (options = {}) => invokeAtomicServiceApi("navPathStack.replacePath", options),
        pop: (options = {}) => invokeAtomicServiceApi("navPathStack.pop", options),
        clear: (options = {}) => invokeAtomicServiceApi("navPathStack.clear", options),
    };

    // Web环境相关
    const asWeb = {
        postMessage: (options = {}) => invokeAtomicServiceApi("asWeb.postMessage", options),
        getEnv: (options = {}) => invokeAtomicServiceApi("asWeb.getEnv", options),
        checkJsApi: (options = {}) => invokeAtomicServiceApi("asWeb.checkJsApi", options),
    };

    // 媒体/文件相关
    const cameraPicker = {pick: (options = {}) => invokeAtomicServiceApi("cameraPicker.pick", options)};
    const photoViewPicker = {select: (options = {}) => invokeAtomicServiceApi("photoViewPicker.select", options)};
    const filePreview = {openPreview: (options = {}) => invokeAtomicServiceApi("filePreview.openPreview", options)};
    const request = {
        uploadFile: (options = {}) => invokeAtomicServiceApi("request.uploadFile", options),
        downloadFile: (options = {}) => invokeAtomicServiceApi("request.downloadFile", options),
    };
    const getLocalImgData = (options = {}) => invokeAtomicServiceApi("getLocalImgData", options);

    // 设备/网络相关
    const connection = {getNetworkType: (options = {}) => invokeAtomicServiceApi("connection.getNetworkType", options)};
    const location = {getLocation: (options = {}) => invokeAtomicServiceApi("location.getLocation", options)};

    // 登录/支付相关
    const login = (options = {}) => invokeAtomicServiceApi("login", options);
    const requestPayment = (options) => invokeAtomicServiceApi("requestPayment", options);
    const cashierPicker = (options) => invokeAtomicServiceApi("cashierPicker", options);

    // 合同/消息订阅相关
    const requestContract = (options) => invokeAtomicServiceApi("requestContract", options);
    const requestSubscribeMessage = (options) => invokeAtomicServiceApi("requestSubscribeMessage", options);

    // 内购(IAP)相关
    const createIap = (options) => invokeAtomicServiceApi("createIap", options);
    const finishIap = (options) => invokeAtomicServiceApi("finishIap", options);
    const queryIap = (options) => invokeAtomicServiceApi("queryIap", options);
    const queryIapProducts = (options) => invokeAtomicServiceApi("queryIapProducts", options);
    const queryIapEnvStatus = (options) => invokeAtomicServiceApi("queryIapEnvStatus", options);
    const isIapSandboxActivated = (options) => invokeAtomicServiceApi("isIapSandboxActivated", options);
    const showIapManagedSubscriptions = (options) => invokeAtomicServiceApi("showIapManagedSubscriptions", options);

    // 实名认证相关
    const startRealNameVerification = (options) => invokeAtomicServiceApi("startRealNameVerification", options);
    const startRealNameAuth = (options) => invokeAtomicServiceApi("startRealNameAuth", options);
    const startFaceVerification = (options) => invokeAtomicServiceApi("startFaceVerification", options);

    // -------------------------- 对外暴露的API --------------------------
    return {
        // 个人信息
        getPhoneNumber,
        getAvatarInfo,
        getInvoiceTitle,
        getDeliveryAddress,
        getServiceSubscription,
        // 路由
        router,
        // 导航栈
        navPathStack,
        // Web环境
        asWeb,
        // 媒体/文件
        cameraPicker,
        photoViewPicker,
        filePreview,
        request,
        getLocalImgData,
        // 设备/网络
        connection,
        location,
        // 登录/支付
        login,
        requestPayment,
        cashierPicker,
        // 合同/消息
        requestContract,
        requestSubscribeMessage,
        // 内购
        createIap,
        finishIap,
        queryIap,
        queryIapProducts,
        queryIapEnvStatus,
        isIapSandboxActivated,
        showIapManagedSubscriptions,
        // 实名认证
        startRealNameVerification,
        startRealNameAuth,
        startFaceVerification,
    };
});

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

async function login() {
    try {
        has.login({
            success: (res) => {
                const formattedResult = formatJSON(res);
                console.log(`login success, res = ${formattedResult}`);
                document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ login succeed<div class="result-content">${formattedResult}</div></div>`;
            },
            fail: (err) => {
                const formattedResult = formatJSON(err);
                console.log(`login fail, err = ${formattedResult}`);
                document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ login fail<div class="result-content">${formattedResult}</div></div>`;

            },
            complete: (res) => {
                const formattedResult = formatJSON(res);
                console.log(`login complete, res = ${formattedResult}`);
            }
        });
    } catch (err) {
        const formattedResult = formatJSON(err);
        console.log(`login fail, err = ${formattedResult}`);
        document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ login err<div class="result-content">${formattedResult}</div></div>`;
    }
}

async function downloadFile() {
    has.request.downloadFile({
        url: 'https://consumer.huawei.com/content/dam/huawei-cbg-site/cn/mkt/launch/240515/homepage/pc-watch-fit-3.jpg',
        fileName: 'pc-watch-fit-3.jpg',
        callback: (err, res) => {
            if (res) {
                const formattedResult = formatJSON(res);
                console.log(`downloadFile success, res = ${formattedResult}`);
                document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ downloadFile succeed<div class="result-content">${formattedResult}</div></div>`;
            }
            if (err) {
                const formattedResult = formatJSON(err);
                console.log(`queryIap fail, err = ${formattedResult}`);
                document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ downloadFile err<div class="result-content">${formattedResult}</div></div>`;
            }
        }
    });
}

async function getLocation() {
    has.location.getLocation({
        priority: 0x203,
        scenario: 0x300,
        maxAccuracy: 0,
        timeoutMs: 5000,
        callback: (err, res) => {
            if (res) {
                const formattedResult = formatJSON(res);
                console.log(`downloadFile success, res = ${formattedResult}`);
                document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ getLocation succeed<div class="result-content">${formattedResult}</div></div>`;
            }
            if (err) {
                const formattedResult = formatJSON(err);
                console.log(`queryIap fail, err = ${formattedResult}`);
                document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ getLocation err<div class="result-content">${formattedResult}</div></div>`;
            }
        }
    });
}

async function queryIap() {
    has.queryIap({
        productType: 0,
        queryType: 1,
        success(res) {
            const formattedResult = formatJSON(res);
            console.log(`getLocation success, res = ${formattedResult}`);
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ queryIap succeed<div class="result-content">${formattedResult}</div></div>`;
        },
        fail(err) {
            const formattedResult = formatJSON(err);
            console.log(`queryIap fail, err = ${formattedResult}`);
            document.getElementById('userIdResult2').innerHTML += `<div class="err">❌ queryIap err<div class="result-content">${formattedResult}</div></div>`;
        }
    });
}


async function pick() {
    has.cameraPicker.pick({
        mediaTypes: ['photo', 'video'],
        cameraPosition: 1,
        saveUri: '',
        videoDuration: 30,
        callback: (err, res) => {
            const formattedResult = formatJSON(res);
            console.log(`cameraPicker success, res = ${formattedResult}`);
            document.getElementById('userIdResult2').innerHTML += `<div class="suc">✅ cameraPicker succeed<div class="result-content">${formattedResult}</div></div>`;
        }
    });
}

// 执行所有函数，即使单个函数出错也不影响其他函数
(async function runAllFunctions() {
    try {
        login();
    } catch (e) {
        console.error('执行login失败:', e);
    }
    try {
        downloadFile();
    } catch (e) {
        console.error('执行downloadFile失败:', e);
    }
    try {
        getLocation();
    } catch (e) {
        console.error('执行getLocation失败:', e);
    }
    try {
        queryIap();
    } catch (e) {
        console.error('执行queryIap失败:', e);
    }
})();
