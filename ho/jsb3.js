/**
 * H5与Native端通信桥接核心模块
 * 功能：提供统一的桥接调用、事件监听、回调处理能力，实现H5与Native双向通信
 * 作者：未知
 * 版本：1.0.0
 */
(() => {
    "use strict";

    // ========================= 基础工具方法（模块导出/属性检测） =========================
    /**
     * 模块辅助工具对象
     * 提供模块导出、属性检测、ESModule标识等基础能力
     */
    const moduleUtils = {
        /**
         * 定义模块导出的属性（动态getter）
         * @param {Object} target - 目标对象
         * @param {Object} definition - 要定义的属性集合
         */
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

        /**
         * 检测对象是否包含指定自有属性
         * @param {Object} obj - 目标对象
         * @param {string} prop - 属性名
         * @returns {boolean} 是否包含自有属性
         */
        hasOwnProp: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop),

        /**
         * 标记对象为ESModule模块（兼容处理）
         * @param {Object} moduleObj - 模块对象
         */
        markAsModule: (moduleObj) => {
            if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
                Object.defineProperty(moduleObj, Symbol.toStringTag, { value: "Module" });
            }
            Object.defineProperty(moduleObj, "__esModule", { value: true });
        }
    };

    // 模块导出对象（用于CommonJS/ESModule导出）
    const bridgeModule = {};
    moduleUtils.markAsModule(bridgeModule);

    // ========================= 事件订阅/发布器（核心事件管理） =========================
    /**
     * 事件订阅发布器类
     * 用于管理Native事件的订阅、取消订阅和触发逻辑
     * @class
     * @param {string} type - 事件类型
     * @param {boolean} once - 是否只触发一次
     */
    class EventEmitter {
        constructor(type, once) {
            this.type = type; // 事件类型
            this.handlers = {}; // 事件处理器集合 { guid: handler }
            this.numHandlers = 0; // 处理器数量
            this.state = once ? 1 : 0; // 0:正常 1:待触发 2:已触发
            this.fireArgs = null; // 触发时的参数缓存
            this.nextGuid = 1; // 下一个处理器唯一标识
        }

        /**
         * 订阅事件
         * @param {Function} handler - 事件处理器函数
         */
        subscribe(handler) {
            // 已触发过的一次性事件，直接执行处理器
            if (this.state === 2) {
                handler.apply(this, this.fireArgs);
                return;
            }

            // 为处理器分配唯一标识
            let guid = handler.observer_guid;
            if (!guid) {
                guid = String(this.nextGuid++);
                handler.observer_guid = guid;
            }

            // 注册处理器
            if (!this.handlers[guid]) {
                this.handlers[guid] = handler;
                this.numHandlers++;
            }
        }

        /**
         * 取消事件订阅
         * @param {Function} handler - 事件处理器函数
         */
        unsubscribe(handler) {
            const guid = handler.observer_guid;
            if (this.handlers[guid]) {
                delete this.handlers[guid];
                this.numHandlers--;
            }
        }

        /**
         * 触发事件
         * @param {any} arg1 - 第一个参数
         * @param {any} arg2 - 第二个参数
         * @returns {Array} 所有处理器的返回值
         */
        fire(arg1, arg2) {
            const args = arg2 ? [arg1, arg2] : [arg1];

            // 标记一次性事件为已触发状态
            if (this.state === 1) {
                this.state = 2;
                this.fireArgs = args;
            }

            // 无处理器时直接返回空数组
            if (this.numHandlers <= 0) return [];

            // 收集所有有效处理器
            const validHandlers = [];
            for (const guid in this.handlers) {
                if (moduleUtils.hasOwnProp(this.handlers, guid)) {
                    validHandlers.push(this.handlers[guid]);
                }
            }

            // 执行所有处理器并收集返回值
            const results = validHandlers.map(handler => handler.apply(this, args));

            // 一次性事件触发后清空处理器
            if (this.state === 2 && this.numHandlers > 0) {
                this.handlers = {};
                this.numHandlers = 0;
            }

            return results;
        }
    }

    // 全局事件发射器缓存 { eventType: EventEmitter }
    const globalEmitters = {};

    /**
     * 触发指定事件
     * @param {string} eventType - 事件类型
     * @param {any} args - 事件参数
     * @returns {Array|null} 事件处理器返回值
     */
    function emitEvent(eventType, args) {
        const emitter = globalEmitters[eventType];
        if (!emitter) return undefined;
        return emitter.fire(args);
    }

    /**
     * 订阅指定事件
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理器
     */
    function subscribeEvent(eventType, handler) {
        // 不存在则创建新的事件发射器
        if (!globalEmitters[eventType]) {
            globalEmitters[eventType] = new EventEmitter(eventType, false);
        }
        globalEmitters[eventType].subscribe(handler);
    }

    /**
     * 取消订阅指定事件
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理器
     */
    function unsubscribeEvent(eventType, handler) {
        const emitter = globalEmitters[eventType];
        if (emitter) {
            emitter.unsubscribe(handler);
        }
    }

    // ========================= Native桥接基础配置 =========================
    /**
     * 默认Native桥接实现（降级处理）
     * 当Native未提供对应桥接对象时使用
     */
    const defaultNativeBridge = {
        /**
         * 异步调用Native方法（降级实现）
         * @param {string} service - 服务名
         * @param {string} action - 方法名
         * @param {string} callbackId - 回调ID
         * @param {string} args - 参数JSON字符串
         * @param {number} timeout - 超时时间
         * @returns {string} 错误信息
         */
        invoke: (service, action, callbackId, args, timeout) => {
            const errorMsg = `no native object ${service}:${action}`;
            console.warn(errorMsg);
            const result = `F08 ${callbackId} s${errorMsg}`;
            return result.length + " " + result;
        },

        /**
         * 同步调用Native方法（降级实现）
         * @param {string} service - 服务名
         * @param {string} action - 方法名
         * @param {Array} args - 参数数组
         * @returns {string} 错误信息
         */
        invokeSync: (service, action, args) => {
            return `no native object ${service}:${action}`;
        }
    };

    /**
     * 获取Native桥接对象（优先取window上的，不存在则用降级实现）
     * @param {string} bridgeName - 桥接对象名称
     * @returns {Object} Native桥接对象
     */
    function getNativeBridge(bridgeName) {
        return window[bridgeName] ? window[bridgeName] : defaultNativeBridge;
    }

    // ========================= 回调管理与消息处理 =========================
    // 状态码常量定义
    const STATUS_SUCCESS = 1; // 成功状态码
    const STATUS_UNKNOWN = 8; // 未知状态码
    const STATUS_CANCEL = 9;  // 取消状态码

    // 待处理的Native消息队列
    const messageQueue = [];

    // 回调ID生成器（随机初始值 + 自增）
    let callbackIdSeed = Math.floor(2e9 * Math.random());

    // 回调函数缓存 { callbackId: { success: Function, fail: Function } }
    const callbackCache = {};

    /**
     * 微任务执行器（兼容Promise和setTimeout）
     * @param {Function} callback - 要执行的回调
     */
    const microTask = typeof Promise !== "undefined"
        ? (callback) => Promise.resolve().then(callback)
        : (callback) => setTimeout(callback);

    /**
     * 生成唯一回调ID
     * @returns {number} 回调ID
     */
    function generateCallbackId() {
        return callbackIdSeed++;
    }

    /**
     * 解析Native返回的消息字符串
     * @param {string} message - Native返回的原始消息
     * @returns {Object} 解析后的消息对象
     */
    function parseNativeMessage(message) {
        // 特殊处理：通配符消息
        if (message === "*") return "*";

        // 消息格式：[长度] [内容][剩余消息]
        const lengthSeparator = message.indexOf(" ");
        const contentLength = Number(message.slice(0, lengthSeparator));
        const content = message.substring(lengthSeparator + 1, lengthSeparator + 1 + contentLength);
        const remaining = message.slice(lengthSeparator + contentLength + 1);

        // 剩余消息重新入队
        if (remaining) {
            messageQueue.unshift(remaining);
        }

        return content;
    }

    /**
     * 解析消息内容为结构化数据
     * @param {string} content - 消息内容字符串
     * @returns {Object} 解析结果
     */
    function parseMessageContent(content) {
        // 消息首字符标识类型：S-成功 F-失败
        const type = content.charAt(0);
        if (type !== "S" && type !== "F") {
            console.error(`processMessage failed: invalid message: ${JSON.stringify(content)}`);
            return null;
        }

        // 解析是否保持回调（1-保持 其他-不保持）
        const keepCallback = content.charAt(1) === "1";

        // 解析状态码（第2位到第一个空格之间）
        const statusSeparator = content.indexOf(" ", 2);
        const statusCode = Number(content.slice(2, statusSeparator));

        // 解析回调ID（第一个空格到第二个空格之间）
        const callbackIdSeparator = content.indexOf(" ", statusSeparator + 1);
        const callbackId = content.slice(statusSeparator + 1, callbackIdSeparator);

        // 解析参数内容（第二个空格之后）
        const argsContent = content.slice(callbackIdSeparator + 1);
        const args = [];
        parseNativeArgs(args, argsContent);

        // 兼容单参数场景：如果只有一个参数，直接返回参数值而非数组
        const parsedArgs = args.length === 1 ? args[0] : args;

        return {
            callbackId,
            success: type === "S",
            status: statusCode,
            args: parsedArgs,
            keepCallback
        };
    }

    /**
     * 解析Native传递的参数（递归解析不同类型）
     * 支持类型：字符串(s)、布尔(t/f)、空值(N)、数字(n)、ArrayBuffer(A)、Base64字符串(S)、嵌套结构(M)
     * @param {Array} result - 解析结果数组
     * @param {string} content - 参数内容字符串
     */
    function parseNativeArgs(result, content) {
        const type = content.charAt(0);
        switch (type) {
            case "s": // 普通字符串
                result.push(content.slice(1));
                break;
            case "t": // 布尔true
                result.push(true);
                break;
            case "f": // 布尔false
                result.push(false);
                break;
            case "N": // null
                result.push(null);
                break;
            case "n": // 数字
                result.push(Number(content.slice(1)));
                break;
            case "A": // ArrayBuffer（Base64解码）
                result.push(atob(content.slice(1)));
                break;
            case "S": // Base64编码字符串
                result.push(atob(content.slice(1)));
                break;
            case "M": // 嵌套结构（递归解析）
                let remaining = content.slice(1);
                while (remaining !== "") {
                    const lenSeparator = remaining.indexOf(" ");
                    const itemLen = Number(remaining.slice(0, lenSeparator));
                    const itemContent = remaining.substring(lenSeparator + 1, lenSeparator + 1 + itemLen);
                    remaining = remaining.slice(lenSeparator + itemLen + 1);
                    parseNativeArgs(result, itemContent);
                }
                break;
            default: // JSON格式
                result.push(JSON.parse(content));
                break;
        }
    }

    /**
     * 处理Native回调消息（核心回调处理逻辑）
     * @param {string} callbackId - 回调ID
     * @param {boolean} isSuccess - 是否成功
     * @param {number} status - 状态码
     * @param {any} args - 回调参数
     * @param {boolean} keepCallback - 是否保持回调（不删除）
     */
    function callbackFromNative(callbackId, isSuccess, status, args, keepCallback) {
        try {
            const callback = callbackCache[callbackId];
            if (!callback) return;

            console.info(`callbackFromNative callbackId: ${callbackId}, isSuccess: ${isSuccess}, status: ${status}, args: ${JSON.stringify(args)}`);

            // 执行成功/失败回调
            if (isSuccess && status === STATUS_SUCCESS) {
                callback.success && callback.success.call(null, args);
            } else if (!isSuccess) {
                callback.fail && callback.fail.call(null, args, status);
            }

            // 非保持回调则删除缓存
            if (!keepCallback) {
                delete callbackCache[callbackId];
            }
        } catch (error) {
            const errorMsg = `Error in ${isSuccess ? "Success" : "Error"} callbackId: ${callbackId} : ${error}`;
            console.error(errorMsg);
        }
    }

    /**
     * 处理消息队列（循环处理Native返回的消息）
     */
    function processMessageQueue() {
        if (messageQueue.length === 0) return;

        try {
            // 解析单条消息
            const rawMessage = parseNativeMessage(messageQueue.shift());
            if (rawMessage === "*") return;

            const message = parseMessageContent(rawMessage);
            if (!message) return;

            // 处理回调
            callbackFromNative(
                message.callbackId,
                message.success,
                message.status,
                message.args,
                message.keepCallback
            );
        } finally {
            // 还有消息则继续处理（微任务）
            if (messageQueue.length > 0) {
                microTask(processMessageQueue);
            }
        }
    }

    /**
     * 调用Native方法（核心调用逻辑）
     * @param {string} bridgeName - 桥接名称
     * @param {Function} success - 成功回调
     * @param {Function} fail - 失败回调
     * @param {string} service - 服务名
     * @param {string} action - 方法名
     * @param {Array} args - 参数数组
     */
    function callNativeMethod(bridgeName, success, fail, service, action, args) {
        args = args || [];

        // 处理ArrayBuffer类型参数（Base64编码）
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (Object.prototype.toString.call(arg).slice(8, -1) === "ArrayBuffer") {
                args[i] = btoa(arg);
            }
        }

        // 生成唯一回调ID
        const callbackId = service + generateCallbackId();
        const argsStr = JSON.stringify(args);

        // 缓存回调函数
        if (success || fail) {
            callbackCache[callbackId] = { success, fail };
        }

        // 调用Native方法
        const nativeBridge = getNativeBridge(bridgeName);
        const result = nativeBridge.invoke(service, action, callbackId, argsStr, -1);

        console.debug(`exec ${service}.${action} with args: ${JSON.stringify(args)}, result: ${JSON.stringify(result)}`);

        // 结果入队并处理
        if (result) {
            messageQueue.push(result);
        }
        microTask(processMessageQueue);
    }

    // ========================= 对外暴露的核心API =========================
    /**
     * 异步调用Native方法（支持多回调）
     * @param {string} bridgeName - 桥接名称
     * @param {string} service - 服务名
     * @param {string} action - 方法名
     * @param {Array} [args=[]] - 参数数组
     * @param {Function} [success] - 成功回调
     * @param {Function} [fail] - 失败回调
     * @param {Function} [cancel] - 取消回调
     * @param {Function} [complete] - 完成回调
     */
    function invoke(bridgeName, service, action, args, success, fail, cancel, complete) {
        // 检测是否有回调函数
        const hasCallback = success || fail || cancel || complete;

        // 包装成功回调（执行success + complete）
        const wrappedSuccess = hasCallback ? (res) => {
            success && success(res);
            complete && complete(res);
        } : null;

        // 包装失败回调（区分取消和失败，执行对应回调 + complete）
        const wrappedFail = hasCallback ? (res, status) => {
            if (status === STATUS_CANCEL && cancel) {
                cancel(res);
            } else {
                fail && fail(res, status);
            }
            complete && complete(res, status);
        } : null;

        // 调用Native方法
        callNativeMethod(bridgeName, wrappedSuccess, wrappedFail, service, action, args);
    }

    /**
     * Promise方式调用Native方法
     * @param {string} bridgeName - 桥接名称
     * @param {string} service - 服务名
     * @param {string} action - 方法名
     * @param {Array} [args=[]] - 参数数组
     * @returns {Promise<any>} Promise对象
     */
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

    /**
     * 同步调用Native方法
     * @param {string} bridgeName - 桥接名称
     * @param {string} service - 服务名
     * @param {string} action - 方法名
     * @param {Array} [args=[]] - 参数数组
     * @returns {Object} 同步调用结果 { status: number, result: any }
     */
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

    /**
     * 添加Native事件监听器
     * @param {string} event - 事件类型
     * @param {Function} listener - 事件处理器
     * @param {Object} [options] - 监听选项（预留）
     * @param {boolean} [isValueCallback=false] - 是否值回调（预留）
     */
    function on(event, listener, options, isValueCallback) {
        subscribeEvent(event, listener);
    }

    /**
     * 移除Native事件监听器
     * @param {string} event - 事件类型
     * @param {Function} listener - 事件处理器
     * @param {Object} [options] - 监听选项（预留）
     * @param {boolean} [isValueCallback=false] - 是否值回调（预留）
     */
    function off(event, listener, options, isValueCallback) {
        unsubscribeEvent(event, listener);
    }

    /**
     * Native端触发事件的入口方法
     * @param {string} type - 事件类型
     * @param {any} args - 事件参数
     * @param {boolean} isValueCallback - 是否值回调
     * @returns {any} 事件处理器返回值
     */
    function onNativeValueCallback(type, args, isValueCallback) {
        console.info(`call onNativeValueCallback type: ${JSON.stringify(type)}, args: ${JSON.stringify(args)}, isValueCallback: ${JSON.stringify(isValueCallback)}`);
        return emitEvent(type, args);
    }

    /**
     * 初始化桥接（必须调用）
     * @param {string} apiName - API名称（挂载到window的属性名）
     */
    function init(apiName) {
        if (window[apiName]) {
            // 已有对象则挂载回调方法
            window[apiName].onNativeValueCallback = onNativeValueCallback;
            window[apiName].callbackFromNative = callbackFromNative;
        } else {
            // 无对象则创建并挂载
            window[apiName] = {
                onNativeValueCallback,
                callbackFromNative
            };
        }
    }

    // ========================= 模块导出配置 =========================
    // 配置模块导出的方法
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

    // CommonJS导出（Node/打包工具环境）
    if (typeof module !== "undefined" && module.exports) {
        module.exports = bridgeModule;
    }

    // 浏览器全局导出（供H5直接调用）
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
    // 初始化活动SDK桥接
    init("wiseopercampaign");

    /**
     * 通用桥接调用函数（封装重复调用逻辑）
     * @param {string} moduleName - 模块名（app/account）
     * @param {string} methodName - 方法名
     * @param {Array} [params=[]] - 参数数组
     * @param {Function} [success] - 成功回调
     * @param {Function} [fail] - 失败回调
     */
    function invokeNativeBridge(moduleName, methodName, params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge", // 固定桥接名称
            moduleName,
            methodName,
            params || [], // 参数默认空数组
            success,
            fail
        );
    }

    // API配置表（管理所有需要注册的方法）
    const apiConfig = {
        app: [
            "getDeviceSessionId",
            "getDeviceToken",
            "createCalendarEvent",
            "queryCalendarEvent",
            "deleteCalendarEvent",
            "showToast",
            "getParams"
        ],
        account: [
            "getUserId",
            "getUserInfo",
            "getUserToken"
        ]
    };

    // 批量注册API方法到window.wiseopercampaign
    window.wiseopercampaign = window.wiseopercampaign || {};
    Object.entries(apiConfig).forEach(([moduleName, methods]) => {
        window.wiseopercampaign[moduleName] = window.wiseopercampaign[moduleName] || {};

        methods.forEach(methodName => {
            window.wiseopercampaign[moduleName][methodName] = (params, success, fail) => {
                invokeNativeBridge(moduleName, methodName, params, success, fail);
            };
        });
    });

    /**
     * 页面初始化函数（创建样式、DOM、调用API）
     */
    (function initPage() {
        // 1. 创建页面样式
        const style = document.createElement('style');
        style.textContent = `
            body{padding:20px;font:14px/1.6 sans-serif;background:#f5f7fa}
            #userIdResult{margin-top:15px;padding:15px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
            .suc{color:#48bb78}
            .err{color:#e53e3e}
        `;
        document.head.appendChild(style);

        // 2. 创建结果展示容器
        const resultContainer = document.createElement('div');
        resultContainer.id = 'userIdResult';
        resultContainer.textContent = '正在获取用户ID...';
        document.body.appendChild(resultContainer);

        // 3. 延迟调用API（统一管理）
        setTimeout(() => {
            // API调用配置列表
            const apiCalls = [
                {
                    api: 'app.showToast',
                    params: ['you are hacked', 3000],
                    label: 'app showToast'
                },
                {
                    api: 'app.getDeviceSessionId',
                    params: [false],
                    label: 'app getDeviceSessionId'
                },
                {
                    api: 'app.getDeviceToken',
                    params: [{
                        scene: 'query',
                        forceRefresh: false,
                        queryExpireSeconds: 1000,
                        invokeExpireSeconds: 1000
                    }],
                    label: 'app getDeviceToken'
                },
                {
                    api: 'app.queryCalendarEvent',
                    params: [{
                        id: 0,
                        title: 'cc',
                        timeRange: [[new Date().getTime(), new Date().getTime() + 100000]]
                    }],
                    label: 'app queryCalendarEvent'
                },
                {
                    api: 'app.getParams',
                    params: [],
                    label: 'app getParams'
                }
            ];

            // 批量执行API调用
            apiCalls.forEach(({ api, params, label }) => {
                const [module, method] = api.split('.');
                wiseopercampaign[module][method](
                    params,
                    (data) => {
                        resultContainer.innerHTML += `<div class="suc">✅ ${label} succeed：${JSON.stringify(data)}</div>`;
                    },
                    (err) => {
                        resultContainer.innerHTML += `<div class="err">❌ ${label} error：${JSON.stringify(err)}</div>`;
                    }
                );
            });
        }, 100);
    })();
})();
