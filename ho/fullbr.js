(() => {
    "use strict";

    // ========================= 内部模块辅助工具 =========================
    const moduleUtils = {
        // 定义模块导出的属性（动态挂载 getter）
        defineExport: (targetModule, exportProps) => {
            for (const propName in exportProps) {
                if (moduleUtils.hasOwnProp(exportProps, propName) && !moduleUtils.hasOwnProp(targetModule, propName)) {
                    Object.defineProperty(targetModule, propName, {
                        enumerable: true,
                        get: exportProps[propName]
                    });
                }
            }
        },
        // 检查对象是否有自身属性（避免原型链污染）
        hasOwnProp: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop),
        // 标记模块为 ES Module 规范
        markAsModule: (moduleObj) => {
            if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
                Object.defineProperty(moduleObj, Symbol.toStringTag, { value: "Module" });
            }
            Object.defineProperty(moduleObj, "__esModule", { value: true });
        }
    };

    // 待导出的模块对象
    const bridgeModule = {};
    moduleUtils.markAsModule(bridgeModule);
    // 导出对外暴露的方法（保持原方法名不变）
    moduleUtils.defineExport(bridgeModule, {
        callbackFromNative: () => handleNativeCallback,
        init: () => initBridge,
        invoke: () => invokeNativeMethod,
        invokePromise: () => invokeNativeMethodWithPromise,
        invokeSync: () => invokeNativeMethodSync,
        off: () => removeNativeListener,
        on: () => addNativeListener,
        onNativeValueCallback: () => triggerNativeEventCallback
    });

    // ========================= 事件订阅/发布核心类 =========================
    /**
     * 事件发射器类：管理事件订阅、取消订阅、触发事件
     * @param {string} eventType - 事件类型
     * @param {boolean} isOnce - 是否一次性事件（触发后清空所有订阅者）
     */
    class EventEmitter {
        constructor(eventType, isOnce) {
            this.eventType = eventType; // 事件类型
            this.eventHandlers = {};    // 事件处理器集合 { handlerId: handlerFn }
            this.handlerCount = 0;      // 处理器数量
            this.state = isOnce ? 1 : 0;// 状态：0-初始 1-待触发 2-已触发
            this.fireArgs = null;       // 触发事件时的参数缓存
            this.nextHandlerId = 1;     // 下一个处理器的唯一 ID
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

            // 为处理器分配唯一 ID（避免重复订阅）
            let handlerId = handler.observer_guid;
            if (!handlerId) {
                handlerId = String(this.nextHandlerId++);
                handler.observer_guid = handlerId;
            }

            // 新增处理器（避免重复添加）
            if (!this.eventHandlers[handlerId]) {
                this.eventHandlers[handlerId] = handler;
                this.handlerCount++;
            }
        }

        /**
         * 取消订阅事件
         * @param {Function} handler - 事件处理器函数
         */
        unsubscribe(handler) {
            const handlerId = handler.observer_guid;
            if (this.eventHandlers[handlerId]) {
                delete this.eventHandlers[handlerId];
                this.handlerCount--;
            }
        }

        /**
         * 触发事件（执行所有订阅的处理器）
         * @param {any} arg1 - 第一个参数
         * @param {any} arg2 - 第二个参数（可选）
         * @returns {Array} 所有处理器的返回值集合
         */
        fire(arg1, arg2) {
            const fireParams = arg2 ? [arg1, arg2] : [arg1];

            // 标记一次性事件为已触发，并缓存参数
            if (this.state === 1) {
                this.state = 2;
                this.fireArgs = fireParams;
            }

            // 无处理器时直接返回空数组
            if (this.handlerCount <= 0) {
                return [];
            }

            // 收集所有有效的处理器（避免遍历过程中对象变化）
            const validHandlers = [];
            for (const handlerId in this.eventHandlers) {
                if (moduleUtils.hasOwnProp(this.eventHandlers, handlerId)) {
                    validHandlers.push(this.eventHandlers[handlerId]);
                }
            }

            // 执行所有处理器并收集返回值
            const handlerResults = validHandlers.map(handler => {
                return handler.apply(this, fireParams);
            });

            // 一次性事件触发后清空处理器
            if (this.state === 2 && this.handlerCount > 0) {
                this.eventHandlers = {};
                this.handlerCount = 0;
            }

            return handlerResults;
        }
    }

    // ========================= 全局事件管理器 =========================
    // 存储所有事件的发射器实例 { eventType: EventEmitter }
    const globalEventEmitterMap = {};

    /**
     * 触发指定事件
     * @param {string} eventType - 事件类型
     * @param {any} args - 事件参数
     * @returns {Array|undefined} 事件处理器的返回值集合
     */
    function triggerEvent(eventType, args) {
        const eventEmitter = globalEventEmitterMap[eventType];
        if (!eventEmitter) return;
        return eventEmitter.fire(args);
    }

    /**
     * 订阅指定事件
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理器
     */
    function subscribeEvent(eventType, handler) {
        // 事件发射器不存在则创建
        if (!globalEventEmitterMap[eventType]) {
            globalEventEmitterMap[eventType] = new EventEmitter(eventType, false);
        }
        const eventEmitter = globalEventEmitterMap[eventType];
        eventEmitter.subscribe(handler);
    }

    /**
     * 取消订阅指定事件
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理器
     */
    function unsubscribeEvent(eventType, handler) {
        const eventEmitter = globalEventEmitterMap[eventType];
        if (!eventEmitter) return;
        eventEmitter.unsubscribe(handler);
    }

    // ========================= Native 调用兜底实现 =========================
    // 当 Native 接口不存在时的默认实现（避免报错）
    const nativeFallbackImpl = {
        invoke: (service, action, callbackId, argsStr, timeout) => {
            const errorMsg = `no native object ${service}:${action}`;
            console.warn(errorMsg);
            const result = `F08 ${callbackId} s${errorMsg}`;
            return result.length + " " + result;
        },
        invokeSync: (service, action, args) => {
            return `no native object ${service}:${action}`;
        }
    };

    /**
     * 获取 Native 通信对象（优先取 window 上的，不存在则用兜底实现）
     * @param {string} bridgeName - 桥接对象名称
     * @returns {object} Native 通信对象
     */
    function getNativeBridge(bridgeName) {
        return window[bridgeName] ? window[bridgeName] : nativeFallbackImpl;
    }

    // ========================= 回调管理常量/变量 =========================
    const STATUS_SUCCESS = 1;        // 成功状态码
    const STATUS_UNDEFINED = 8;      // 未定义状态码
    const STATUS_CANCEL = 9;         // 取消状态码
    const messageQueue = [];         // Native 返回的消息队列
    let callbackIdSeed = Math.floor(2e9 * Math.random()); // 回调 ID 种子（保证唯一）
    const callbackMap = {};          // 回调映射 { callbackId: { success: fn, fail: fn } }

    // 异步执行函数（兼容无 Promise 环境）
    const asyncExecutor = typeof Promise === "undefined"
        ? (fn) => setTimeout(fn)
        : (fn) => Promise.resolve().then(fn);

    /**
     * 生成唯一的回调 ID
     * @returns {number} 回调 ID
     */
    function generateUniqueCallbackId() {
        return callbackIdSeed++;
    }

    /**
     * 核心：调用 Native 方法（底层实现）
     * @param {string} bridgeName - 桥接对象名称
     * @param {Function} successCallback - 成功回调
     * @param {Function} failCallback - 失败回调
     * @param {string} service - 原生服务名
     * @param {string} action - 原生方法名
     * @param {any[]} args - 调用参数
     */
    function callNativeMethod(bridgeName, successCallback, failCallback, service, action, args) {
        const finalArgs = args || [];

        // 处理 ArrayBuffer 类型参数（转 base64）
        for (let i = 0; i < finalArgs.length; i++) {
            const arg = finalArgs[i];
            const argType = Object.prototype.toString.call(arg).slice(8, -1);
            if (argType === "ArrayBuffer") {
                finalArgs[i] = btoa(arg);
            }
        }

        // 生成唯一回调 ID
        const callbackId = service + generateUniqueCallbackId();
        const argsJsonStr = JSON.stringify(finalArgs);

        // 缓存回调函数（有回调时才缓存）
        if (successCallback || failCallback) {
            callbackMap[callbackId] = {
                success: successCallback,
                fail: failCallback
            };
        }

        // 调用 Native 方法
        const nativeBridge = getNativeBridge(bridgeName);
        const invokeResult = nativeBridge.invoke(service, action, callbackId, argsJsonStr, -1);

        // 打印调试日志
        console.debug(`exec ${service}.${action} with args: ${argsJsonStr}, result: ${JSON.stringify(invokeResult)}`);

        // 结果入队并处理
        if (invokeResult) {
            messageQueue.push(invokeResult);
        }
        asyncExecutor(processMessageQueue);
    }

    /**
     * 处理 Native 返回的消息队列
     */
    function processMessageQueue() {
        if (messageQueue.length === 0) return;

        try {
            // 解析单条消息
            const message = parseNativeMessage(getNextMessageFromQueue());
            // 处理 Native 回调
            handleNativeCallback(
                message.callbackId,
                message.isSuccess,
                message.status,
                message.args,
                message.keepCallback
            );
        } finally {
            // 队列还有消息则继续处理
            if (messageQueue.length > 0) {
                asyncExecutor(processMessageQueue);
            }
        }
    }

    /**
     * 从消息队列中获取下一条消息
     * @returns {string} 消息内容
     */
    function getNextMessageFromQueue() {
        let message = messageQueue.shift();
        // 处理批量消息（* 表示批量）
        if (message === "*") return "*";

        const spaceIndex = message.indexOf(" ");
        const messageLength = Number(message.slice(0, spaceIndex));
        const realMessage = message.substring(spaceIndex + 1, spaceIndex + 1 + messageLength);

        // 剩余内容重新入队
        const remainingMessage = message.slice(spaceIndex + messageLength + 1);
        if (remainingMessage) {
            messageQueue.unshift(remainingMessage);
        }

        return realMessage;
    }

    /**
     * 解析 Native 返回的消息格式
     * @param {string} message - 原生返回的原始消息
     * @returns {object} 解析后的消息对象
     */
    function parseNativeMessage(message) {
        // 消息首字符：S-成功 F-失败
        const resultFlag = message.charAt(0);
        if (resultFlag !== "S" && resultFlag !== "F") {
            console.error(`processMessage failed: invalid message: ${JSON.stringify(message)}`);
            return;
        }

        const isSuccess = resultFlag === "S";
        // 第二个字符：1-保持回调 其他-不保持
        const keepCallbackFlag = message.charAt(1);
        const keepCallback = keepCallbackFlag === "1";

        // 解析状态码和回调 ID
        const firstSpaceIndex = message.indexOf(" ", 2);
        const status = Number(message.slice(2, firstSpaceIndex));

        const secondSpaceIndex = message.indexOf(" ", firstSpaceIndex + 1);
        const callbackId = message.slice(firstSpaceIndex + 1, secondSpaceIndex);

        // 解析参数
        const argsStr = message.slice(secondSpaceIndex + 1);
        const args = [];
        parseNativeArgs(args, argsStr);

        // 单参数时简化返回
        const finalArgs = args.length === 1 ? args[0] : args;

        return {
            callbackId,
            isSuccess,
            status,
            args: finalArgs,
            keepCallback
        };
    }

    /**
     * 解析 Native 返回的参数（处理特殊类型）
     * @param {Array} resultArr - 存储解析结果的数组
     * @param {string} argsStr - 原始参数字符串
     */
    function parseNativeArgs(resultArr, argsStr) {
        const firstChar = argsStr.charAt(0);
        switch (firstChar) {
            case "s": // 字符串
                resultArr.push(argsStr.slice(1));
                break;
            case "t": // 布尔 true
                resultArr.push(true);
                break;
            case "f": // 布尔 false
                resultArr.push(false);
                break;
            case "N": // null
                resultArr.push(null);
                break;
            case "n": // 数字
                resultArr.push(Number(argsStr.slice(1)));
                break;
            case "A": // ArrayBuffer（base64 解码）
                const abStr = argsStr.slice(1);
                resultArr.push(atob(abStr));
                break;
            case "S": // 加密字符串（base64 解码）
                const sStr = argsStr.slice(1);
                resultArr.push(atob(sStr));
                break;
            case "M": // 嵌套参数
                let remainingStr = argsStr.slice(1);
                while (remainingStr !== "") {
                    const spaceIndex = remainingStr.indexOf(" ");
                    const paramLength = Number(remainingStr.slice(0, spaceIndex));
                    const paramStr = remainingStr.substring(spaceIndex + 1, spaceIndex + 1 + paramLength);
                    remainingStr = remainingStr.slice(spaceIndex + paramLength + 1);
                    parseNativeArgs(resultArr, paramStr);
                }
                break;
            default: // JSON 格式
                resultArr.push(JSON.parse(argsStr));
                break;
        }
    }

    // ========================= 对外暴露的核心方法（保持原方法名） =========================

    /**
     * [对外方法] Native 回调处理（供 Native 调用）
     * @param {string} callbackId - 回调 ID
     * @param {boolean} isSuccess - 是否成功
     * @param {number} status - 状态码
     * @param {any} args - 回调参数
     * @param {boolean} keepCallback - 是否保留回调（不删除）
     */
    function handleNativeCallback(callbackId, isSuccess, status, args, keepCallback) {
        try {
            const callbackItem = callbackMap[callbackId];
            if (!callbackItem) return;

            console.info(`callbackFromNative callbackId: ${callbackId}, isSuccess: ${isSuccess}, status: ${status}, args: ${JSON.stringify(args)}`);

            // 执行成功/失败回调
            if (isSuccess && status === STATUS_SUCCESS) {
                callbackItem.success && callbackItem.success.call(null, args);
            } else if (!isSuccess) {
                callbackItem.fail && callbackItem.fail.call(null, args, status);
            }

            // 不保留回调则删除
            if (!keepCallback) {
                delete callbackMap[callbackId];
            }
        } catch (error) {
            const errorMsg = `Error in ${isSuccess ? "Success" : "Error"} callbackId: ${callbackId} : ${error}`;
            console.error(errorMsg);
        }
    }

    /**
     * [对外方法] 异步调用 Native 方法
     * @param {string} bridgeName - 桥接对象名称
     * @param {string} service - 原生服务名
     * @param {string} action - 原生方法名
     * @param {any[]} [args] - 调用参数
     * @param {Function} [success] - 成功回调
     * @param {Function} [fail] - 失败回调
     * @param {Function} [cancel] - 取消回调
     * @param {Function} [complete] - 完成回调
     */
    function invokeNativeMethod(bridgeName, service, action, args, success, fail, cancel, complete) {
        // 判断是否有回调（任意一个回调存在则处理）
        const hasCallback = success || fail || cancel || complete;
        if (!hasCallback) {
            callNativeMethod(bridgeName, null, null, service, action, args);
            return;
        }

        // 包装成功回调（依次执行 success + complete）
        const wrappedSuccess = (res) => {
            success && success(res);
            complete && complete(res);
        };

        // 包装失败回调（取消状态执行 cancel，否则执行 fail + complete）
        const wrappedFail = (res, status) => {
            if (status === STATUS_CANCEL && cancel) {
                cancel(res);
            } else {
                fail && fail(res, status);
            }
            complete && complete(res, status);
        };

        callNativeMethod(bridgeName, wrappedSuccess, wrappedFail, service, action, args);
    }

    /**
     * [对外方法] Promise 版调用 Native 方法
     * @param {string} bridgeName - 桥接对象名称
     * @param {string} service - 原生服务名
     * @param {string} action - 原生方法名
     * @param {any[]} [args] - 调用参数
     * @returns {Promise<any>} Promise 对象
     */
    function invokeNativeMethodWithPromise(bridgeName, service, action, args) {
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
     * [对外方法] 同步调用 Native 方法
     * @param {string} bridgeName - 桥接对象名称
     * @param {string} service - 原生服务名
     * @param {string} action - 原生方法名
     * @param {any[]} [args] - 调用参数
     * @returns {object} 同步调用结果 { status, result }
     */
    function invokeNativeMethodSync(bridgeName, service, action, args) {
        const nativeBridge = getNativeBridge(bridgeName);
        const invokeResult = nativeBridge.invokeSync(service, action, args);

        let parsedResult = null;
        try {
            if (invokeResult) {
                parsedResult = JSON.parse(invokeResult);
            }
        } catch (error) {
            // 解析失败不抛错，返回默认状态
        }

        if (parsedResult) {
            return {
                status: parsedResult.status ?? STATUS_UNDEFINED,
                result: parsedResult.result
            };
        }
        return { status: STATUS_UNDEFINED };
    }

    /**
     * [对外方法] 添加 Native 事件监听
     * @param {string} eventType - 事件类型
     * @param {Function} listener - 事件处理器
     * @param {object} [options] - 监听选项（预留）
     * @param {boolean} [isValueCallback=false] - 是否值回调（预留）
     */
    function addNativeListener(eventType, listener, options, isValueCallback) {
        subscribeEvent(eventType, listener);
    }

    /**
     * [对外方法] 移除 Native 事件监听
     * @param {string} eventType - 事件类型
     * @param {Function} listener - 事件处理器
     * @param {object} [options] - 监听选项（预留）
     * @param {boolean} [isValueCallback=false] - 是否值回调（预留）
     */
    function removeNativeListener(eventType, listener, options, isValueCallback) {
        unsubscribeEvent(eventType, listener);
    }

    /**
     * [对外方法] 供 Native 触发事件的接口
     * @param {string} eventType - 事件类型
     * @param {any} args - 事件参数
     * @param {boolean} isValueCallback - 是否值回调
     * @returns {null|*} 事件处理器返回值
     */
    function triggerNativeEventCallback(eventType, args, isValueCallback) {
        console.info(`call onNativeValueCallback eventType :${JSON.stringify(eventType)}, args :${JSON.stringify(args)}, isValueCallback :${JSON.stringify(isValueCallback)}`);
        return triggerEvent(eventType, args);
    }

    /**
     * [对外方法] 初始化桥接层（必须执行）
     * @param {string} apiName - 挂载到 window 上的 API 名称
     */
    function initBridge(apiName) {
        if (window[apiName]) {
            // 已有对象则挂载回调方法
            window[apiName].onNativeValueCallback = triggerNativeEventCallback;
            window[apiName].callbackFromNative = handleNativeCallback;
        } else {
            // 无对象则创建并挂载
            window[apiName] = {
                onNativeValueCallback: triggerNativeEventCallback,
                callbackFromNative: handleNativeCallback
            };
        }
    }

    // ========================= 模块导出（保持原逻辑） =========================
    // CommonJS 导出
    if (typeof module !== "undefined" && module.exports) {
        module.exports = bridgeModule;
    }

    // 浏览器全局挂载
    if (typeof window !== "undefined") {
        window.nativeBridge = {
            init: initBridge,
            invoke: invokeNativeMethod,
            invokePromise: invokeNativeMethodWithPromise,
            invokeSync: invokeNativeMethodSync,
            on: addNativeListener,
            off: removeNativeListener,
            onNativeValueCallback: triggerNativeEventCallback,
            callbackFromNative: handleNativeCallback
        };
    }
})();
