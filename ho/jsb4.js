(() => {
    "use strict";

    // ========================= 极简基础依赖（仅支撑核心函数） =========================
    // 降级桥接实现（保证无Native对象时不报错）
    const defaultNativeBridge = {
        invoke: (service, action, callbackId, args) => {
            const errMsg = `no native object ${service}:${action}`;
            const result = `F08 ${callbackId} s${errMsg}`;
            return result.length + " " + result;
        }
    };

    // 获取Native桥接对象
    const getNativeBridge = (name) => window[name] || defaultNativeBridge;

    // 回调ID生成器
    let callbackIdSeed = Math.floor(2e9 * Math.random());
    const genCallbackId = () => callbackIdSeed++;

    // 回调缓存与消息队列（核心依赖）
    const callbackCache = {};
    const messageQueue = [];
    const microTask = typeof Promise !== "undefined"
        ? (cb) => Promise.resolve().then(cb)
        : (cb) => setTimeout(cb);

    // 状态码（仅保留invoke函数需要的取消状态）
    const STATUS = {CANCEL: 9};

    // ========================= 核心函数：callNativeMethod（保留核心逻辑） =========================
    const callNativeMethod = (bridgeName, success, fail, service, action, args) => {
        args = args || [];
        // ArrayBuffer参数Base64编码（保留必要参数处理）
        args.forEach((arg, idx) => {
            if (Object.prototype.toString.call(arg).slice(8, -1) === 'ArrayBuffer') {
                args[idx] = btoa(arg);
            }
        });

        // 生成回调ID（保留核心逻辑，移除注入代码）
        const callbackId = `${service}${genCallbackId()}`;

        // 缓存回调函数
        if (success || fail) callbackCache[callbackId] = {success, fail};

        // 调用Native桥接
        const nativeBridge = getNativeBridge(bridgeName);
        const result = nativeBridge.invoke(service, action, callbackId, JSON.stringify(args), -1);

        // 消息入队处理（极简版）
        if (result) messageQueue.push(result);
        microTask(() => {
            if (messageQueue.length === 0) return;
            const rawMsg = messageQueue.shift();
            const sep = rawMsg.indexOf(" ");
            const content = rawMsg.substring(sep + 1);
            // 极简解析：仅处理成功/失败回调
            const isSuccess = content.charAt(0) === 'S';
            const cbIdSep = content.indexOf(" ", 3);
            const cbId = content.slice(3, cbIdSep);
            const cb = callbackCache[cbId];
            if (cb) {
                const args = content.slice(cbIdSep + 1);
                isSuccess ? cb.success?.(args) : cb.fail?.(args);
                delete callbackCache[cbId]; // 执行后删除回调
            }
        });
    };

    // ========================= 核心函数：invoke（保留核心逻辑） =========================
    const invoke = (bridgeName, service, action, args, success, fail, cancel, complete) => {
        const hasCallback = success || fail || cancel || complete;
        // 包装成功回调
        const wrapSuccess = hasCallback ? (res) => {
            success && success(res);
            complete && complete(res);
        } : null;
        // 包装失败回调（区分取消状态）
        const wrapFail = hasCallback ? (res, status) => {
            status === STATUS.CANCEL && cancel ? cancel(res) : (fail && fail(res, status));
            complete && complete(res, status);
        } : null;

        callNativeMethod(bridgeName, wrapSuccess, wrapFail, service, action, args);
    };

    // ========================= 核心函数：init（保留核心初始化逻辑） =========================
    const init = (apiName) => {
        // 初始化桥接对象到window
        window[apiName] = window[apiName] || {};
        window[apiName].callbackFromNative = (callbackId, isSuccess, status, args) => {
            const cb = callbackCache[callbackId];
            if (cb) {
                isSuccess ? cb.success?.(args) : cb.fail?.(args, status);
                delete callbackCache[callbackId];
            }
        };
    };

    // 暴露到全局（供外部调用）
    window.nativeBridge = {init, invoke, callNativeMethod};
    // 初始化桥接
    nativeBridge.init("wiseopercampaign");

// 调用Native方法
    nativeBridge.invoke(
        "wiseopercampaignbridge",
        "app",
        "getDeviceSessionId",
        [false],
        (res) => console.log("cloudx succeed：", JSON.stringify(res)),
        (err) => console.log("cloudx error：", JSON.stringify(err))
    );
})();
