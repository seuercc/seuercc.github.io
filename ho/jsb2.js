(() => {
    "use strict";
    // ... 原有工具方法/事件类代码保持不变 ...

    function x(e) {
        // 修复1：强化初始化容错，确保 window[e] 一定是对象
        if (!window) {
            console.error('window 对象不存在，无法初始化', e);
            return;
        }
        // 强制初始化，避免 undefined 导致后续赋值报错
        window[e] = window[e] || {};
        // 挂载核心方法，覆盖式挂载（保证方法存在）
        window[e].onNativeValueCallback = j;
        window[e].callbackFromNative = k;
    }

    // ======================== 原有注入逻辑保持不变 ========================
    function injectToParentFrame(namespace = 'iframeBridgeMethods') { ... }
    function listenParentMessage() { ... }
    injectToParentFrame();
    listenParentMessage();

    if (typeof module !== "undefined" && module.exports) {
        module.exports = n;
    }
    if (typeof window !== "undefined") {
        window.nativeBridge = {
            init: x,
            invoke: S,
            invokePromise: w,
            invokeSync: N,
            on: O,
            off: P,
            onNativeValueCallback: j,
            callbackFromNative: k
        };
    }

    // 活动SDK初始化
    x("wiseopercampaign");

    // ... 原有 wiseopercampaign 相关方法（getUserId/getUserInfo/getUserToken）保持不变 ...

    // ======================== 修复2：提前初始化 hwbr，且强化挂载 ========================
    // 优先初始化 hwbr，确保 window.hwbr 存在
    x("hwbr");
    // 强制初始化 hwbr 的子对象，避免 app/report/linkedLogin/mcpAccount 未定义
    window.hwbr = window.hwbr || {};
    window.hwbr.app = window.hwbr.app || {};
    window.hwbr.report = window.hwbr.report || {};
    window.hwbr.linkedLogin = window.hwbr.linkedLogin || {};
    window.hwbr.mcpAccount = window.hwbr.mcpAccount || {};
    window.hwbr.account = window.hwbr.account || {}; // 兼容注释掉的 getUserInfo

    // ======================== 修复3：重写业务方法，增加前置校验 ========================
    function eventReport(params, success, fail) {
        // 前置校验：确保 nativeBridge 存在
        if (!window.nativeBridge || !window.nativeBridge.invoke) {
            const errMsg = 'nativeBridge.invoke 未定义，无法调用 eventReport';
            console.error(errMsg);
            fail && fail(errMsg);
            return;
        }
        window.nativeBridge.invoke(
            "_hwbrNative",
            "report",
            "eventReport",
            params || [],
            success,
            fail
        );
    }

    function getPluginList(params, success, fail) {
        if (!window.nativeBridge || !window.nativeBridge.invoke) {
            const errMsg = 'nativeBridge.invoke 未定义，无法调用 getPluginList';
            console.error(errMsg);
            fail && fail(errMsg);
            return;
        }
        window.nativeBridge.invoke(
            "_hwbrNative",
            "app",
            "getPluginList",
            params || '',
            success,
            fail
        );
    }

    function login(params, success, fail) {
        if (!window.nativeBridge || !window.nativeBridge.invoke) {
            const errMsg = 'nativeBridge.invoke 未定义，无法调用 login';
            console.error(errMsg);
            fail && fail(errMsg);
            return;
        }
        window.nativeBridge.invoke(
            "_hwbrNative",
            "linkedLogin",
            "login",
            params || [],
            success,
            fail
        );
    }

    function getUserInfo(params, success, fail) {
        if (!window.nativeBridge || !window.nativeBridge.invoke) {
            const errMsg = 'nativeBridge.invoke 未定义，无法调用 getUserInfo';
            console.error(errMsg);
            fail && fail(errMsg);
            return;
        }
        window.nativeBridge.invoke(
            "_hwbrNative",
            "mcpAccount",
            "getUserInfo",
            params || [],
            success,
            fail
        );
    }

    // ======================== 修复4：挂载方法到已初始化的 hwbr 对象 ========================
    window.hwbr.app.getPluginList = getPluginList;
    window.hwbr.report.eventReport = eventReport;
    window.hwbr.linkedLogin.login = login;
    window.hwbr.mcpAccount.getUserInfo = getUserInfo;

    // ======================== 修复5：延迟调用增加前置校验，避免提前执行 ========================
    setTimeout(() => {
        // 前置校验：确保 hwbr.app.getPluginList 存在
        if (window.hwbr && window.hwbr.app && window.hwbr.app.getPluginList) {
            hwbr.app.getPluginList(
                [],
                data => resultContainer.innerHTML += `<div class="suc">✅ getPluginList succeed：${JSON.stringify(data)}</div>`,
                err => resultContainer.innerHTML += `<div class="err">❌ getPluginList error：${JSON.stringify(err)}</div>`
            );
        } else {
            resultContainer.innerHTML += `<div class="err">❌ getPluginList error：hwbr.app.getPluginList 未定义</div>`;
        }
    }, 200); // 延长延迟，确保初始化完成

    setTimeout(() => {
        if (window.hwbr && window.hwbr.report && window.hwbr.report.eventReport) {
            const eventReportJsonStr = JSON.stringify({
                eventName: 'you are hacked',
                version:1,
                info:{extInfo:{'name':'cc'},u:'hahaha'},
                reportImmediately:true,
                isOverseaReport:false,
                isAnonymous:true
            });
            hwbr.report.eventReport(
                [eventReportJsonStr],
                data => resultContainer.innerHTML += `<div class="suc">✅ report succeed：${JSON.stringify(data)}</div>`,
                err => resultContainer.innerHTML += `<div class="err">❌ report error：${JSON.stringify(err)}</div>`
            );
        } else {
            resultContainer.innerHTML += `<div class="err">❌ eventReport error：hwbr.report.eventReport 未定义</div>`;
        }
    }, 200);

    setTimeout(() => {
        if (window.hwbr && window.hwbr.linkedLogin && window.hwbr.linkedLogin.login) {
            const loginInfo = {
                clientId: "6917565689792636463",
                redirectUri: "https://privacy.consumer.huawei.com/browser.html",
                scope: "all",
                accessType: "",
                state: "200",
                ui_locales: ""
            };
            hwbr.linkedLogin.login(
                loginInfo,
                data => resultContainer.innerHTML += `<div class="suc">✅ login 3 succeed：${JSON.stringify(data, null, 2)}</div>`,
                err => resultContainer.innerHTML += `<div class="err">❌ login 3 error：${JSON.stringify(err, null, 2)}</div>`
            );
        } else {
            resultContainer.innerHTML += `<div class="err">❌ login error：hwbr.linkedLogin.login 未定义</div>`;
        }
    }, 200);

    setTimeout(() => {
        if (window.hwbr && window.hwbr.mcpAccount && window.hwbr.mcpAccount.getUserInfo) {
            const SubAppAuthCodePara = JSON.stringify({
                subAppId: '112938007',
            });
            hwbr.mcpAccount.getUserInfo(
                [SubAppAuthCodePara],
                data => resultContainer.innerHTML += `<div class="suc">✅ getUserInfo succeed：${JSON.stringify(data)}</div>`,
                err => resultContainer.innerHTML += `<div class="err">❌ getUserInfo error：${JSON.stringify(err)}</div>`
            );
        } else {
            resultContainer.innerHTML += `<div class="err">❌ getUserInfo error：hwbr.mcpAccount.getUserInfo 未定义</div>`;
        }
    }, 200);

    // ... 原有样式/DOM 创建代码保持不变 ...

})();
