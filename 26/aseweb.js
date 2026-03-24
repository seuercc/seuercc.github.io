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
    const cameraPicker = { pick: (options = {}) => invokeAtomicServiceApi("cameraPicker.pick", options) };
    const photoViewPicker = { select: (options = {}) => invokeAtomicServiceApi("photoViewPicker.select", options) };
    const filePreview = { openPreview: (options = {}) => invokeAtomicServiceApi("filePreview.openPreview", options) };
    const request = {
        uploadFile: (options = {}) => invokeAtomicServiceApi("request.uploadFile", options),
        downloadFile: (options = {}) => invokeAtomicServiceApi("request.downloadFile", options),
    };
    const getLocalImgData = (options = {}) => invokeAtomicServiceApi("getLocalImgData", options);

    // 设备/网络相关
    const connection = { getNetworkType: (options = {}) => invokeAtomicServiceApi("connection.getNetworkType", options) };
    const location = { getLocation: (options = {}) => invokeAtomicServiceApi("location.getLocation", options) };

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
