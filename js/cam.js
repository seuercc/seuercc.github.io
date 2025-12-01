"use strict";

// ========================= 核心依赖与配置 =========================
// 状态常量（原生回调状态码）
const STATUS_SUCCESS = 1; // 成功状态
const STATUS_DEFAULT = 8; // 默认状态
const STATUS_SPECIAL = 9; // 特殊失败状态（比如需要触发 a 回调）

// 存储原生调用的回调函数（key: callbackId, value: {success, fail}）
const callbackMap = {};
// 存储原生返回的消息队列
const messageQueue = [];
// 生成唯一 callbackId 的计数器
let callbackIdCounter = Math.floor(2e9 * Math.random());

// ========================= 工具函数 =========================
/**
 * 获取原生通信对象（优先取 window 上的，没有则用默认占位）
 */
function getNativeBridge(nativeObjName) {
  return window[nativeObjName] || {
    invoke: (module, method, callbackId, argsStr) => {
      console.warn(`无原生对象 ${nativeObjName}:${module}:${method}`);
      return `F08 ${callbackId} s无原生对象`;
    },
    invokeSync: (module, method, argsStr) => {
      return `无原生对象 ${nativeObjName}:${module}:${method}`;
    }
  };
}

/**
 * 生成唯一 callbackId
 */
function generateCallbackId() {
  return callbackIdCounter++;
}

/**
 * 异步执行函数（兼容无 Promise 环境）
 */
const nextTick = typeof Promise !== "undefined" 
  ? (fn) => Promise.resolve().then(fn)
  : (fn) => setTimeout(fn);

/**
 * 解析原生返回的消息字符串（还原参数类型）
 */
function parseNativeMessage(msgStr) {
  const result = [];
  let str = msgStr;

  while (str) {
    const type = str.charAt(0);
    const rest = str.slice(1);

    switch (type) {
      case "s": // 字符串
        result.push(rest);
        str = "";
        break;
      case "t": // true
        result.push(true);
        str = "";
        break;
      case "f": // false
        result.push(false);
        str = "";
        break;
      case "N": // null
        result.push(null);
        str = "";
        break;
      case "n": // 数字
        result.push(Number(rest));
        str = "";
        break;
      case "A": // ArrayBuffer（base64 解码）
      case "S": // 加密字符串（base64 解码）
        result.push(atob(rest));
        str = "";
        break;
      case "M": // 复杂数组（递归解析）
        let lenEnd = rest.indexOf(" ");
        const itemLen = Number(rest.slice(0, lenEnd));
        const itemStr = rest.slice(lenEnd + 1, lenEnd + 1 + itemLen);
        parseNativeMessage(itemStr, result);
        str = rest.slice(lenEnd + itemLen + 1);
        break;
      default: // JSON 格式
        result.push(JSON.parse(rest));
        str = "";
        break;
    }
  }

  // 若只有一个参数，直接返回值（而非数组）
  return result.length === 1 ? result[0] : result;
}

// ========================= 消息处理队列 =========================
/**
 * 处理原生返回的消息队列（循环消费）
 */
function processMessageQueue() {
  if (messageQueue.length === 0) return;

  try {
    // 取出队列头部消息并解析
    const rawMsg = messageQueue.shift();
    if (rawMsg === "*") return; // 忽略占位消息

    // 解析消息头部（格式：[S/F][是否保留回调] [状态码] [callbackId] [参数字符串]）
    const isSuccess = rawMsg.charAt(0) === "S";
    const keepCallback = rawMsg.charAt(1) === "1";
    const statusEnd = rawMsg.indexOf(" ", 2);
    const status = Number(rawMsg.slice(2, statusEnd));
    const callbackIdEnd = rawMsg.indexOf(" ", statusEnd + 1);
    const callbackId = rawMsg.slice(statusEnd + 1, callbackIdEnd);
    const argsStr = rawMsg.slice(callbackIdEnd + 1);
    const args = parseNativeMessage(argsStr);

    // 触发回调处理
    handleNativeCallback(callbackId, isSuccess, status, args, keepCallback);
  } finally {
    // 若还有消息，继续异步处理
    if (messageQueue.length > 0) {
      nextTick(processMessageQueue);
    }
  }
}

// ========================= 核心通信方法 =========================
/**
 * 接收原生回调（供原生调用）
 * @param {string} callbackId - 回调ID
 * @param {boolean} isSuccess - 是否成功
 * @param {number} status - 状态码
 * @param {any} args - 回调参数
 * @param {boolean} keepCallback - 是否保留回调（不删除）
 */
function callbackFromNative(callbackId, isSuccess, status, args, keepCallback) {
  try {
    const callbacks = callbackMap[callbackId];
    if (!callbacks) return;

    console.debug(`原生回调: callbackId=${callbackId}, 成功=${isSuccess}, 状态=${status}, 参数=${args}`);
    // 成功且状态为 STATUS_SUCCESS → 执行 success 回调
    if (isSuccess && status === STATUS_SUCCESS) {
      callbacks.success?.(args);
    } else {
      // 失败 → 执行 fail 回调
      callbacks.fail?.(args, status);
    }
    // 不保留则删除回调（避免内存泄漏）
    if (!keepCallback) delete callbackMap[callbackId];
  } catch (err) {
    console.error(`回调处理失败: callbackId=${callbackId}, 错误=${err.message}`, err);
  }
}

/**
 * 异步调用原生方法（支持回调）
 * @param {string} nativeObjName - 原生对象名
 * @param {string} module - 模块名
 * @param {string} method - 方法名
 * @param {any[]} args - 调用参数
 * @param {Object} [callbacks] - 回调对象 {success, fail, complete, error}
 */
function invoke(nativeObjName, module, method, args = [], callbacks = {}) {
  const { success, fail, complete, error } = callbacks;
  const hasCallbacks = success || fail || complete || error;

  // 生成 callbackId（有回调才需要存储）
  const callbackId = hasCallbacks ? generateCallbackId() : "";
  // 存储回调（complete/error 无论成功失败都执行）
  if (hasCallbacks) {
    callbackMap[callbackId] = {
      success: (res) => {
        success?.(res);
        complete?.(res);
      },
      fail: (err, status) => {
        fail?.(err, status);
        error?.(err, status);
        complete?.(err, status);
      }
    };
  }

  // 序列化参数（处理 ArrayBuffer 为 base64）
  const serializedArgs = JSON.stringify(args.map(arg => {
    if (Object.prototype.toString.call(arg) === "[object ArrayBuffer]") {
      return btoa(arg); // ArrayBuffer 转 base64
    }
    return arg;
  }));

  // 调用原生方法
  const nativeBridge = getNativeBridge(nativeObjName);
  const result = nativeBridge.invoke(module, method, callbackId, serializedArgs, -1);
  console.debug(`调用原生: ${module}.${method}, 参数=${args}, 结果=${result}`);
  
  // 原生返回结果存入队列，后续处理
  if (result) messageQueue.push(result);
  // 触发消息队列处理
  nextTick(processMessageQueue);
}

/**
 * 异步调用原生方法（返回 Promise）
 * @param {string} nativeObjName - 原生对象名
 * @param {string} module - 模块名
 * @param {string} method - 方法名
 * @param {any[]} args - 调用参数
 * @returns {Promise<any>}
 */
function invokePromise(nativeObjName, module, method, args = []) {
  return new Promise((resolve, reject) => {
    invoke(nativeObjName, module, method, args, {
      success: resolve,
      fail: reject
    });
  });
}

/**
 * 同步调用原生方法
 * @param {string} nativeObjName - 原生对象名
 * @param {string} module - 模块名
 * @param {string} method - 方法名
 * @param {any[]} args - 调用参数
 * @returns {Object} {status, result}
 */
function invokeSync(nativeObjName, module, method, args = []) {
  const nativeBridge = getNativeBridge(nativeObjName);
  const serializedArgs = JSON.stringify(args);
  const result = nativeBridge.invokeSync(module, method, serializedArgs);

  try {
    const parsed = JSON.parse(result);
    return {
      status: parsed.status ?? STATUS_DEFAULT,
      result: parsed.result
    };
  } catch (err) {
    return { status: STATUS_DEFAULT };
  }
}

// ========================= 事件订阅（可选，保留原功能） =========================
const eventBus = {}; // 存储事件订阅 {eventName: {handlers: {}, numHandlers: number}}

/**
 * 订阅事件
 * @param {string} eventName - 事件名
 * @param {Function} handler - 事件处理函数
 */
function on(eventName, handler) {
  if (!eventBus[eventName]) {
    eventBus[eventName] = { handlers: {}, numHandlers: 0, nextGuid: 1 };
  }
  const event = eventBus[eventName];
  // 给 handler 分配唯一 ID（避免重复取消）
  if (!handler.observer_guid) {
    handler.observer_guid = String(event.nextGuid++);
  }
  if (!event.handlers[handler.observer_guid]) {
    event.handlers[handler.observer_guid] = handler;
    event.numHandlers++;
  }
}

/**
 * 取消订阅事件
 * @param {string} eventName - 事件名
 * @param {Function} handler - 事件处理函数
 */
function off(eventName, handler) {
  const event = eventBus[eventName];
  if (!event || !handler.observer_guid) return;
  if (event.handlers[handler.observer_guid]) {
    delete event.handlers[handler.observer_guid];
    event.numHandlers--;
  }
}

/**
 * 触发事件
 * @param {string} eventName - 事件名
 * @param {any} args - 事件参数
 * @returns {any[]} 所有处理函数的返回值
 */
function triggerEvent(eventName, ...args) {
  const event = eventBus[eventName];
  if (!event || event.numHandlers === 0) return [];

  // 执行所有订阅的处理函数
  const handlers = Object.values(event.handlers);
  return handlers.map(handler => handler.apply(null, args));
}

// ========================= 初始化（供外部调用） =========================
/**
 * 初始化原生通信桥
 * @param {string} nativeObjName - 原生对象名（比如 "wiseopercampaign"）
 */
function init(nativeObjName) {
  const nativeBridge = getNativeBridge(nativeObjName);
  // 给原生对象挂载回调方法
  nativeBridge.onNativeValueCallback = triggerEvent;
  nativeBridge.callbackFromNative = callbackFromNative;
  // 若 window 上没有该原生对象，直接挂载
  if (!window[nativeObjName]) {
    window[nativeObjName] = nativeBridge;
  }
}

// ========================= 暴露 API（兼容原模块导出） =========================
const api = {
  init,
  invoke,
  invokePromise,
  invokeSync,
  on,
  off,
  callbackFromNative,
  onNativeValueCallback: triggerEvent
};

// 兼容原模块导出（浏览器环境挂载到 window，Node 环境导出 module.exports）
if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  window.nativeBridgeApi = api;
}
