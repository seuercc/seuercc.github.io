/**
 * H5与Native端通信桥接核心模块
 * 功能：提供统一的桥接调用、事件监听、回调处理能力，实现H5与Native双向通信
 * 作者：未知
 * 版本：1.0.0
 */
(() => {
    "use strict";

    // ========================= 基础工具方法（模块导出/属性检测） =========================
    const moduleUtils = {
        defineProperty: (target, definition) => {
            for (const key in definition) {
                if (moduleUtils.hasOwnProp(definition, key) && !moduleUtils.hasOwnProp(target, key)) {
                    Object.defineProperty(target, key, {
                        enumerable: true,
                        get: definition[key]
                    });
                }
            }
        },
        hasOwnProp: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop),
        markAsModule: (moduleObj) => {
            if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
                Object.defineProperty(moduleObj, Symbol.toStringTag, { value: "Module" });
            }
            Object.defineProperty(moduleObj, "__esModule", { value: true });
        }
    };

    const bridgeModule = {};
    moduleUtils.markAsModule(bridgeModule);

    // ========================= 事件订阅/发布器（核心事件管理） =========================
    class EventEmitter {
        constructor(type, once) {
            this.type = type;
            this.handlers = {};
            this.numHandlers = 0;
            this.state = once ? 1 : 0;
            this.fireArgs = null;
            this.nextGuid = 1;
        }

        subscribe(handler) {
            if (this.state === 2) {
                handler.apply(this, this.fireArgs);
                return;
            }

            let guid = handler.observer_guid;
            if (!guid) {
                guid = String(this.nextGuid++);
                handler.observer_guid = guid;
            }

            if (!this.handlers[guid]) {
                this.handlers[guid] = handler;
                this.numHandlers++;
            }
        }

        unsubscribe(handler) {
            const guid = handler.observer_guid;
            if (this.handlers[guid]) {
                delete this.handlers[guid];
                this.numHandlers--;
            }
        }

        fire(arg1, arg2) {
            const args = arg2 ? [arg1, arg2] : [arg1];

            if (this.state === 1) {
                this.state = 2;
                this.fireArgs = args;
            }

            if (this.numHandlers <= 0) return [];

            const validHandlers = [];
            for (const guid in this.handlers) {
                if (moduleUtils.hasOwnProp(this.handlers, guid)) {
                    validHandlers.push(this.handlers[guid]);
                }
            }

            const results = validHandlers.map(handler => handler.apply(this, args));

            if (this.state === 2 && this.numHandlers > 0) {
                this.handlers = {};
                this.numHandlers = 0;
            }

            return results;
        }
    }

    const globalEmitters = {};

    function emitEvent(eventType, args) {
        const emitter = globalEmitters[eventType];
        if (!emitter) return undefined;
        return emitter.fire(args);
    }

    function subscribeEvent(eventType, handler) {
        if (!globalEmitters[eventType]) {
            globalEmitters[eventType] = new EventEmitter(eventType, false);
        }
        globalEmitters[eventType].subscribe(handler);
    }

    function unsubscribeEvent(eventType, handler) {
        const emitter = globalEmitters[eventType];
        if (emitter) {
            emitter.unsubscribe(handler);
        }
    }

    // ========================= Native桥接基础配置 =========================
    const defaultNativeBridge = {
        invoke: (service, action, callbackId, args, timeout) => {
            const errorMsg = `no native object ${service}:${action}`;
            console.warn(errorMsg);
            const result = `F08 ${callbackId} s${errorMsg}`;
            return result.length + " " + result;
        },
        invokeSync: (service, action, args) => {
            return `no native object ${service}:${action}`;
        }
    };

    function getNativeBridge(bridgeName) {
        return window[bridgeName] ? window[bridgeName] : defaultNativeBridge;
    }

    // ========================= 回调管理与消息处理 =========================
    const STATUS_SUCCESS = 1;
    const STATUS_UNKNOWN = 8;
    const STATUS_CANCEL = 9;

    const messageQueue = [];
    let callbackIdSeed = Math.floor(2e9 * Math.random());
    const callbackCache = {};

    const microTask = typeof Promise !== "undefined"
        ? (callback) => Promise.resolve().then(callback)
        : (callback) => setTimeout(callback);

    function generateCallbackId() {
        return callbackIdSeed++;
    }

    function parseNativeMessage(message) {
        if (message === "*") return "*";

        const lengthSeparator = message.indexOf(" ");
        const contentLength = Number(message.slice(0, lengthSeparator));
        const content = message.substring(lengthSeparator + 1, lengthSeparator + 1 + contentLength);
        const remaining = message.slice(lengthSeparator + contentLength + 1);

        if (remaining) {
            messageQueue.unshift(remaining);
        }

        return content;
    }

    function parseMessageContent(content) {
        const type = content.charAt(0);
        if (type !== "S" && type !== "F") {
            console.error(`processMessage failed: invalid message: ${JSON.stringify(content)}`);
            return null;
        }

        const keepCallback = content.charAt(1) === "1";
        const statusSeparator = content.indexOf(" ", 2);
        const statusCode = Number(content.slice(2, statusSeparator));
        const callbackIdSeparator = content.indexOf(" ", statusSeparator + 1);
        const callbackId = content.slice(statusSeparator + 1, callbackIdSeparator);
        const argsContent = content.slice(callbackIdSeparator + 1);
        
        const args = [];
        parseNativeArgs(args, argsContent);
        const parsedArgs = args.length === 1 ? args[0] : args;

        return {
            callbackId,
            success: type === "S",
            status: statusCode,
            args: parsedArgs,
            keepCallback
        };
    }

    function parseNativeArgs(result, content) {
        const type = content.charAt(0);
        switch (type) {
            case "s":
                result.push(content.slice(1));
                break;
            case "t":
                result.push(true);
                break;
            case "f":
                result.push(false);
                break;
            case "N":
                result.push(null);
                break;
            case "n":
                result.push(Number(content.slice(1)));
                break;
            case "A":
                result.push(atob(content.slice(1)));
                break;
            case "S":
                result.push(atob(content.slice(1)));
                break;
            case "M":
                let remaining = content.slice(1);
                while (remaining !== "") {
                    const lenSeparator = remaining.indexOf(" ");
                    const itemLen = Number(remaining.slice(0, lenSeparator));
                    const itemContent = remaining.substring(lenSeparator + 1, lenSeparator + 1 + itemLen);
                    remaining = remaining.slice(lenSeparator + itemLen + 1);
                    parseNativeArgs(result, itemContent);
                }
                break;
            default:
                result.push(JSON.parse(content));
                break;
        }
    }

    function callbackFromNative(callbackId, isSuccess, status, args, keepCallback) {
        try {
            const callback = callbackCache[callbackId];
            if (!callback) return;

            console.info(`callbackFromNative callbackId: ${callbackId}, isSuccess: ${isSuccess}, status: ${status}, args: ${JSON.stringify(args)}`);

            if (isSuccess && status === STATUS_SUCCESS) {
                callback.success && callback.success.call(null, args);
            } else if (!isSuccess) {
                callback.fail && callback.fail.call(null, args, status);
            }

            if (!keepCallback) {
                delete callbackCache[callbackId];
            }
        } catch (error) {
            const errorMsg = `Error in ${isSuccess ? "Success" : "Error"} callbackId: ${callbackId} : ${error}`;
            console.error(errorMsg);
        }
    }

    function processMessageQueue() {
        if (messageQueue.length === 0) return;

        try {
            const rawMessage = parseNativeMessage(messageQueue.shift());
            if (rawMessage === "*") return;

            const message = parseMessageContent(rawMessage);
            if (!message) return;

            callbackFromNative(
                message.callbackId,
                message.success,
                message.status,
                message.args,
                message.keepCallback
            );
        } finally {
            if (messageQueue.length > 0) {
                microTask(processMessageQueue);
            }
        }
    }

    function callNativeMethod(bridgeName, success, fail, service, action, args) {
        args = args || [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (Object.prototype.toString.call(arg).slice(8, -1) === "ArrayBuffer") {
                args[i] = btoa(arg);
            }
        }

        const callbackId = service + generateCallbackId();
        const argsStr = JSON.stringify(args);

        if (success || fail) {
            callbackCache[callbackId] = { success, fail };
        }

        const nativeBridge = getNativeBridge(bridgeName);
        const result = nativeBridge.invoke(service, action, callbackId, argsStr, -1);

        console.debug(`exec ${service}.${action} with args: ${JSON.stringify(args)}, result: ${JSON.stringify(result)}`);

        if (result) {
            messageQueue.push(result);
        }
        microTask(processMessageQueue);
    }

    // ========================= 对外暴露的核心API =========================
    function invoke(bridgeName, service, action, args, success, fail, cancel, complete) {
        const hasCallback = success || fail || cancel || complete;

        const wrappedSuccess = hasCallback ? (res) => {
            success && success(res);
            complete && complete(res);
        } : null;

        const wrappedFail = hasCallback ? (res, status) => {
            if (status === STATUS_CANCEL && cancel) {
                cancel(res);
            } else {
                fail && fail(res, status);
            }
            complete && complete(res, status);
        } : null;

        callNativeMethod(bridgeName, wrappedSuccess, wrappedFail, service, action, args);
    }

    function invokePromise(bridgeName, service, action, args) {
        return new Promise((resolve, reject) => {
            callNativeMethod(
                bridgeName,
                (res) => resolve(res),
                (err) => reject(err),
                service,
                action,
                args
            );
        });
    }

    function invokeSync(bridgeName, service, action, args) {
        const nativeBridge = getNativeBridge(bridgeName);
        const result = nativeBridge.invokeSync(service, action, args);

        let parsedResult;
        try {
            parsedResult = result ? JSON.parse(result) : null;
        } catch (error) {
            parsedResult = null;
        }

        return parsedResult
            ? { status: parsedResult.status ?? STATUS_UNKNOWN, result: parsedResult.result }
            : { status: STATUS_UNKNOWN };
    }

    function on(event, listener, options, isValueCallback) {
        subscribeEvent(event, listener);
    }

    function off(event, listener, options, isValueCallback) {
        unsubscribeEvent(event, listener);
    }

    function onNativeValueCallback(type, args, isValueCallback) {
        console.info(`call onNativeValueCallback type: ${JSON.stringify(type)}, args: ${JSON.stringify(args)}, isValueCallback: ${JSON.stringify(isValueCallback)}`);
        return emitEvent(type, args);
    }

    function init(apiName) {
        if (window[apiName]) {
            window[apiName].onNativeValueCallback = onNativeValueCallback;
            window[apiName].callbackFromNative = callbackFromNative;
        } else {
            window[apiName] = {
                onNativeValueCallback,
                callbackFromNative
            };
        }
    }

    // ========================= 模块导出配置 =========================
    moduleUtils.defineProperty(bridgeModule, {
        callbackFromNative: () => callbackFromNative,
        init: () => init,
        invoke: () => invoke,
        invokePromise: () => invokePromise,
        invokeSync: () => invokeSync,
        off: () => off,
        on: () => on,
        onNativeValueCallback: () => onNativeValueCallback
    });

    if (typeof module !== "undefined" && module.exports) {
        module.exports = bridgeModule;
    }

    if (typeof window !== "undefined") {
        window.nativeBridge = {
            init,
            invoke,
            invokePromise,
            invokeSync,
            on,
            off,
            onNativeValueCallback,
            callbackFromNative
        };
    }

    // ========================= 业务层API注册与页面初始化 =========================
    init("wiseopercampaign");

    function invokeNativeBridge(moduleName, methodName, params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge",
            moduleName,
            methodName,
            params || [],
            success,
            fail
        );
    }

    function invokeSyncNativeBridge(moduleName, methodName, params, success, fail) {
        const result = window.nativeBridge.invokeSync(
            "wiseopercampaignbridge",
            moduleName,
            methodName,
            params || []
        );
        // 同步调用直接返回结果，支持回调
        if (result.status === STATUS_SUCCESS && success) {
            success(result.result);
        } else if (fail) {
            fail(result.result, result.status);
        }
        return result;
    }

    // API配置表
    const apiConfig = {
        app: [
            "getDeviceSessionId",
            "getDeviceToken",
            "createCalendarEvent",
            "queryCalendarEvent",
            "deleteCalendarEvent"
        ],
        account: [
            "getUserId",
            "getUserInfo",
            "getUserToken"
        ]
    };

    const apiConfigSync = {
        app: [
            "getParams",
            "showToast"
        ]
    };

    // 批量注册API方法
    window.wiseopercampaign = window.wiseopercampaign || {};
    Object.entries(apiConfig).forEach(([moduleName, methods]) => {
        window.wiseopercampaign[moduleName] = window.wiseopercampaign[moduleName] || {};

        methods.forEach(methodName => {
            window.wiseopercampaign[moduleName][methodName] = (params, success, fail) => {
                invokeNativeBridge(moduleName, methodName, params, success, fail);
            };
        });
    });

    // 批量注册同步API方法
    Object.entries(apiConfigSync).forEach(([moduleName, methods]) => {
        window.wiseopercampaign[moduleName] = window.wiseopercampaign[moduleName] || {};

        methods.forEach(methodName => {
            window.wiseopercampaign[moduleName][methodName + 'Sync'] = (params, success, fail) => {
                return invokeSyncNativeBridge(moduleName, methodName, params, success, fail);
            };
        });
    });

    /**
     * 页面初始化函数（重点优化样式和展示逻辑）
     */
    (function initPage() {
        // ========== 核心优化：重构样式体系 ==========
        const style = document.createElement('style');
        style.textContent = `
            /* 全局重置 */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            /* 页面基础样式 */
            body {
                padding: 15px;
                font: 14px/1.8 "Microsoft Yahei", sans-serif;
                background: #f5f7fa;
                width: 100vw; /* 限制页面宽度为视口宽度 */
                overflow-x: hidden; /* 禁止横向滚动 */
            }

            /* 结果容器核心样式（关键：适配屏幕，无横向滑动） */
            #userIdResult {
                margin: 15px auto 0;
                padding: 20px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                width: 100%; /* 宽度100%适配 */
                max-width: 100%; /* 最大宽度不超过视口 */
                word-break: break-all; /* 强制长字符串换行（核心） */
                white-space: pre-wrap; /* 保留换行+自动换行 */
                font-size: 13px; /* 适配字体大小 */
            }

            /* 标题样式 */
            .result-title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }

            /* 结果项样式（每个API结果独立区块） */
            .result-item {
                margin-bottom: 12px;
                padding: 10px;
                border-radius: 8px;
                background: #f9f9f9;
            }

            /* 成功/失败样式区分 */
            .suc {
                color: #48bb78;
                background-color: rgba(72, 187, 120, 0.05);
            }
            .err {
                color: #e53e3e;
                background-color: rgba(229, 62, 62, 0.05);
            }

            /* 格式化JSON内容展示 */
            .json-content {
                margin-top: 8px;
                padding: 8px;
                background: #fff;
                border-radius: 4px;
                border: 1px solid #eee;
                font-family: Consolas, monospace;
                font-size: 12px;
                line-height: 1.6;
                color: #333;
            }

            /* 最后一项去掉底部间距 */
            .result-item:last-child {
                margin-bottom: 0;
            }
        `;
        document.head.appendChild(style);

        // ========== 创建优化后的DOM结构 ==========
        const resultContainer = document.createElement('div');
        resultContainer.id = 'userIdResult';
        // 添加标题和初始提示
        resultContainer.innerHTML = `
            <div class="result-title">Native API 调用结果</div>
            <div class="result-item">🔄 正在初始化并调用API...</div>
        `;
        document.body.appendChild(resultContainer);

        // ========== 格式化输出工具函数（核心） ==========
        /**
         * 格式化结果输出到页面
         * @param {string} label API标签
         * @param {boolean} isSuccess 是否成功
         * @param {any} data 结果数据
         */
        function renderResult(label, isSuccess, data) {
            // JSON格式化（带缩进，易读）
            const formattedData = JSON.stringify(data, null, 2)
                .replace(/\n/g, '<br>') // 换行符转HTML
                .replace(/  /g, '&nbsp;&nbsp;'); // 空格转HTML
            
            // 创建结果项DOM
            const resultHtml = `
                <div class="result-item ${isSuccess ? 'suc' : 'err'}">
                    ${isSuccess ? '✅' : '❌'} ${label} ${isSuccess ? '调用成功' : '调用失败'}
                    <div class="json-content">${formattedData || '无返回数据'}</div>
                </div>
            `;
            
            // 替换初始提示，追加结果
            if (resultContainer.innerHTML.includes('正在初始化并调用API')) {
                resultContainer.innerHTML = `
                    <div class="result-title">Native API 调用结果</div>
                    ${resultHtml}
                `;
            } else {
                resultContainer.innerHTML += resultHtml;
            }
        }

        // ========== 异步API调用（优化逻辑） ==========
        setTimeout(() => {
            const apiCalls = [
                { api: 'app.getDeviceSessionId', params: [false], label: 'app.getDeviceSessionId' },
                { 
                    api: 'app.getDeviceToken', 
                    params: [{ scene: 'query', forceRefresh: false, queryExpireSeconds: 1000, invokeExpireSeconds: 1000 }], 
                    label: 'app.getDeviceToken' 
                },
                { 
                    api: 'app.queryCalendarEvent', 
                    params: [{ id: 0, title: 'cc', timeRange: [[new Date().getTime(), new Date().getTime() + 100000]] }], 
                    label: 'app.queryCalendarEvent' 
                },
                { api: 'account.getUserId', params: [], label: 'account.getUserId' },
                { api: 'account.getUserInfo', params: [], label: 'account.getUserInfo' },
                { api: 'account.getUserToken', params: [], label: 'account.getUserToken' }
            ];

            apiCalls.forEach(({ api, params, label }) => {
                const [module, method] = api.split('.');
                wiseopercampaign[module][method](
                    params,
                    (data) => renderResult(label, true, data),
                    (err) => renderResult(label, false, err)
                );
            });
        }, 100);

        // ========== 同步API调用（修复原代码问题） ==========
        setTimeout(() => {
            const apiSyncCalls = [
                { api: 'app.showToast', params: ['you are hacked', 3000], label: 'app.showToast[同步]' },
                { api: 'app.getParams', params: [], label: 'app.getParams[同步]' }
            ];

            apiSyncCalls.forEach(({ api, params, label }) => {
                const [module, method] = api.split('.');
                try {
                    // 调用注册的同步方法
                    const result = wiseopercampaign[module][method + 'Sync'](params);
                    renderResult(label, result.status === STATUS_SUCCESS, result);
                } catch (err) {
                    renderResult(label, false, { error: err.message, stack: err.stack });
                }
            });
        }, 100);
    })();
})();
