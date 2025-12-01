"use strict";

// ========================= 类型定义（对齐导出接口） =========================
/** 错误信息接口 */
interface ErrorInfo {
  errorCode: number;
  errorInfo: string;
}

/** 框架错误码（与 invoke.js 一致） */
type ErrorCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 同步调用返回结果 */
interface SyncInvokeResult {
  status: number;
  result?: string;
}

/** 事件监听器类型 */
type EventListener = (data: any) => void | boolean;

/** 事件订阅选项（兼容 EventTarget 标准） */
type EventListenerOptions = boolean | {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
};

// ========================= 核心常量与存储 =========================
/** 状态常量（与 Native 约定） */
const STATUS_SUCCESS = 1 as const; // 成功状态（对应 ErrorCode.1）
const STATUS_DEFAULT = 8 as const; // 默认失败状态（对应 ErrorCode.8）
const STATUS_CANCEL = 9 as const; // 取消状态（对应 ErrorCode.9，触发 cancel 回调）

/** 存储原生调用的回调函数（key: callbackId） */
const callbackStore = new Map<string, {
  success?: (data: any) => void;
  fail?: (err: ErrorInfo) => void;
  cancel?: (data: any) => void;
  complete?: () => void;
}>();

/** 事件总线（存储事件订阅关系） */
const eventBus = new Map<string, Array<{
  listener: EventListener;
  options: EventListenerOptions;
  isValueCallback: boolean;
  once: boolean; // 是否只执行一次
  executed: boolean; // 是否已执行（针对 once）
}>>();

/** 消息队列（存储 Native 返回的原始消息） */
const messageQueue: string[] = [];

/** 生成唯一 callbackId 的计数器 */
let callbackIdCounter = Math.floor(2e9 * Math.random());

// ========================= 工具函数 =========================
/**
 * 获取 Native 通信桥（优先取 window 上的，无则返回占位实现）
 */
function getNativeBridge(bridgeName: string): {
  invoke: (module: string, method: string, callbackId: string, argsStr: string, type: number) => string;
  invokeSync: (module: string, method: string, argsStr: string) => string;
  onNativeValueCallback?: typeof onNativeValueCallback;
  callbackFromNative?: typeof callbackFromNative;
} {
  const globalBridge = (window as any)[bridgeName];
  if (globalBridge) return globalBridge;

  // 占位实现（无 Native 时的降级处理）
  return {
    invoke: (module: string, method: string) => {
      console.warn(`[Native Bridge] 未找到原生对象 "${bridgeName}"，服务：${module}，操作：${method}`);
      return `F08 ${callbackIdCounter} s未找到原生对象 ${bridgeName}`;
    },
    invokeSync: (module: string, method: string) => {
      console.warn(`[Native Bridge] 未找到原生对象 "${bridgeName}"，同步服务：${module}，操作：${method}`);
      return `未找到原生对象 ${bridgeName}:${module}:${method}`;
    }
  };
}

/**
 * 生成唯一 callbackId
 */
function generateCallbackId(): string {
  return (callbackIdCounter++).toString();
}

/**
 * 异步执行函数（兼容无 Promise 环境）
 */
const nextTick = typeof Promise !== "undefined"
  ? (fn: () => void) => Promise.resolve().then(fn)
  : (fn: () => void) => setTimeout(fn, 0);

/**
 * 解析 Native 返回的参数字符串（还原原始类型）
 */
function parseNativeArgs(argsStr: string): any {
  const result: any[] = [];
  let str = argsStr.trim();

  while (str) {
    const type = str.charAt(0);
    const rest = str.slice(1).trim();

    switch (type) {
      case "s": // 字符串
        result.push(rest);
        str = "";
        break;
      case "t": // boolean(true)
        result.push(true);
        str = "";
        break;
      case "f": // boolean(false)
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
        const lenEnd = rest.indexOf(" ");
        if (lenEnd === -1) break;
        const itemLen = Number(rest.slice(0, lenEnd));
        const itemStr = rest.slice(lenEnd + 1, lenEnd + 1 + itemLen).trim();
        result.push(parseNativeArgs(itemStr));
        str = rest.slice(lenEnd + itemLen + 1).trim();
        break;
      default: // JSON 格式
        try {
          result.push(JSON.parse(rest));
        } catch (err) {
          result.push(rest); // 解析失败直接存原始字符串
        }
        str = "";
        break;
    }
  }

  // 单个参数直接返回值，多个参数返回数组
  return result.length === 1 ? result[0] : result;
}

/**
 * 序列化调用参数（处理 ArrayBuffer 转 base64）
 */
function serializeArgs(args?: any[]): string {
  if (!args || args.length === 0) return "[]";

  const processedArgs = args.map(arg => {
    // ArrayBuffer 转 base64
    if (Object.prototype.toString.call(arg) === "[object ArrayBuffer]") {
      return btoa(arg);
    }
    // 其他类型直接 JSON 序列化
    return arg;
  });

  return JSON.stringify(processedArgs);
}

// ========================= 消息队列处理 =========================
/**
 * 处理 Native 返回的消息队列（循环消费）
 */
function processMessageQueue(): void {
  if (messageQueue.length === 0) return;

  try {
    const rawMsg = messageQueue.shift()!;
    if (rawMsg === "*") return; // 忽略占位消息

    // 解析消息格式：[S/F][是否保留回调] [状态码] [callbackId] [参数字符串]
    const isSuccess = rawMsg.charAt(0) === "S";
    const keepCallback = rawMsg.charAt(1) === "1";
    const statusEndIndex = rawMsg.indexOf(" ", 2);
    const status = Number(rawMsg.slice(2, statusEndIndex));
    const callbackIdEndIndex = rawMsg.indexOf(" ", statusEndIndex + 1);
    const callbackId = rawMsg.slice(statusEndIndex + 1, callbackIdEndIndex);
    const argsStr = rawMsg.slice(callbackIdEndIndex + 1);
    const args = parseNativeArgs(argsStr);

    // 触发 Native 回调处理
    callbackFromNative(callbackId, isSuccess, status, args, keepCallback);
  } catch (err) {
    console.error("[Native Bridge] 消息处理失败：", err);
  } finally {
    // 还有消息则继续异步处理
    if (messageQueue.length > 0) {
      nextTick(processMessageQueue);
    }
  }
}

// ========================= 核心导出接口实现 =========================
/**
 * 初始化函数（必须执行，建立 H5 与 Native 通道）
 * @param apiName - 原生 API 名称（如 "wiseopercampaign"）
 */
export function init(apiName: string): void {
  const nativeBridge = getNativeBridge(apiName);
  // 挂载 Native 所需的回调方法
  nativeBridge.onNativeValueCallback = onNativeValueCallback;
  nativeBridge.callbackFromNative = callbackFromNative;

  // 若 window 上无该 API，直接挂载（确保 Native 能访问）
  if (!(window as any)[apiName]) {
    (window as any)[apiName] = nativeBridge;
  }

  console.log(`[Native Bridge] 初始化成功，API 名称：${apiName}`);
}

/**
 * 异步调用 Native 方法（支持多回调）
 * @param bridgeName - 桥名称
 * @param service - 服务名称（原生类名）
 * @param action - 操作名称（原生方法名）
 * @param args - 调用参数（可选）
 * @param success - 成功回调（可选）
 * @param fail - 失败回调（可选）
 * @param cancel - 取消回调（可选）
 * @param complete - 完成回调（可选）
 */
export function invoke(
  bridgeName: string,
  service: string,
  action: string,
  args?: any[],
  success?: (data: any) => void,
  fail?: (err: ErrorInfo) => void,
  cancel?: (data: any) => void,
  complete?: () => void
): void {
  // 存储回调（有任一回调才生成 callbackId）
  const hasCallbacks = !!success || !!fail || !!cancel || !!complete;
  const callbackId = hasCallbacks ? generateCallbackId() : "";

  if (hasCallbacks) {
    callbackStore.set(callbackId, { success, fail, cancel, complete });
  }

  // 序列化参数 + 调用 Native 方法
  const serializedArgs = serializeArgs(args);
  const nativeBridge = getNativeBridge(bridgeName);
  const result = nativeBridge.invoke(service, action, callbackId, serializedArgs, -1);

  console.debug(
    `[Native Bridge] 调用 Native：bridge=${bridgeName}, service=${service}, action=${action}, args=${JSON.stringify(args)}`
  );

  // Native 返回结果存入队列，异步处理
  if (result) messageQueue.push(result);
  nextTick(processMessageQueue);
}

/**
 * 异步调用 Native 方法（返回 Promise）
 * @param bridgeName - 桥名称
 * @param service - 服务名称
 * @param action - 操作名称
 * @param args - 调用参数（可选）
 * @returns Promise<any> - 成功返回结果，失败抛出错误
 */
export function invokePromise(
  bridgeName: string,
  service: string,
  action: string,
  args?: any[]
): Promise<any> {
  return new Promise((resolve, reject) => {
    invoke(
      bridgeName,
      service,
      action,
      args,
      (data) => resolve(data), // success
      (err) => reject(err),    // fail
      (cancelData) => reject({ errorCode: STATUS_CANCEL, errorInfo: "操作被取消", data: cancelData }), // cancel
      () => {} // complete（Promise 无需额外处理）
    );
  });
}

/**
 * 同步调用 Native 方法
 * @param bridgeName - 桥名称
 * @param service - 服务名称
 * @param action - 操作名称
 * @param args - 调用参数（可选）
 * @returns SyncInvokeResult - 同步调用结果
 */
export function invokeSync(
  bridgeName: string,
  service: string,
  action: string,
  args?: any[]
): SyncInvokeResult {
  const serializedArgs = serializeArgs(args);
  const nativeBridge = getNativeBridge(bridgeName);
  const rawResult = nativeBridge.invokeSync(service, action, serializedArgs);

  console.debug(
    `[Native Bridge] 同步调用 Native：bridge=${bridgeName}, service=${service}, action=${action}, args=${JSON.stringify(args)}`
  );

  // 解析 Native 返回结果
  try {
    const parsedResult = JSON.parse(rawResult);
    return {
      status: parsedResult.status ?? STATUS_DEFAULT,
      result: parsedResult.result
    };
  } catch (err) {
    // 解析失败返回默认状态
    return { status: STATUS_DEFAULT };
  }
}

/**
 * 添加事件监听器
 * @param event - 事件类型
 * @param listener - 事件处理函数
 * @param options - 事件选项（可选）
 * @param isValueCallback - 是否支持值回调（可选，默认 false）
 */
export function on(
  event: string,
  listener: EventListener,
  options?: EventListenerOptions,
  isValueCallback = false
): void {
  if (!eventBus.has(event)) {
    eventBus.set(event, []);
  }

  const eventListeners = eventBus.get(event)!;
  const once = typeof options === "object" ? options.once ?? false : false;

  // 避免重复添加相同监听器（基于引用判断）
  const isDuplicate = eventListeners.some(item => item.listener === listener);
  if (isDuplicate) return;

  eventListeners.push({
    listener,
    options: options ?? false,
    isValueCallback,
    once,
    executed: false
  });

  console.debug(`[Native Bridge] 订阅事件：${event}，是否值回调：${isValueCallback}`);
}

/**
 * 移除事件监听器
 * @param event - 事件类型
 * @param listener - 事件处理函数
 * @param options - 事件选项（可选）
 * @param isValueCallback - 是否支持值回调（可选，默认 false）
 */
export function off(
  event: string,
  listener: EventListener,
  options?: EventListenerOptions,
  isValueCallback = false
): void {
  const eventListeners = eventBus.get(event);
  if (!eventListeners) return;

  // 过滤掉要移除的监听器（匹配 listener + isValueCallback）
  const filteredListeners = eventListeners.filter(item => 
    item.listener !== listener || item.isValueCallback !== isValueCallback
  );

  if (filteredListeners.length === eventListeners.length) {
    console.warn(`[Native Bridge] 未找到事件 ${event} 的监听器：`, listener);
    return;
  }

  // 更新事件监听器列表
  eventBus.set(event, filteredListeners);
  console.debug(`[Native Bridge] 取消订阅事件：${event}，是否值回调：${isValueCallback}`);
}

/**
 * Native 事件触发接口（供 Native 调用）
 * @param type - 事件类型
 * @param args - 事件参数
 * @param isValueCallback - 是否支持值回调
 * @returns 最后一个监听器的返回值（值回调模式下）
 */
export function onNativeValueCallback(type: string, args: any, isValueCallback: boolean): void | any {
  const eventListeners = eventBus.get(type);
  if (!eventListeners || eventListeners.length === 0) {
    console.warn(`[Native Bridge] 事件 ${type} 无监听器`);
    return;
  }

  console.debug(`[Native Bridge] 触发事件：${type}，参数：${JSON.stringify(args)}，是否值回调：${isValueCallback}`);

  let lastResult: any;
  const remainingListeners: typeof eventListeners = [];

  // 执行所有监听器
  for (const item of eventListeners) {
    // 只处理匹配 isValueCallback 的监听器
    if (item.isValueCallback !== isValueCallback) {
      remainingListeners.push(item);
      continue;
    }

    // 已执行过的 once 监听器跳过
    if (item.once && item.executed) continue;

    try {
      // 执行监听器，记录最后一个返回值（值回调模式）
      const result = item.listener(args);
      if (isValueCallback) lastResult = result;

      // once 监听器标记为已执行
      if (item.once) item.executed = true;
    } catch (err) {
      console.error(`[Native Bridge] 事件 ${type} 监听器执行失败：`, err);
    }

    // non-once 监听器保留
    if (!item.once) remainingListeners.push(item);
  }

  // 更新监听器列表（移除已执行的 once 监听器）
  eventBus.set(type, remainingListeners);

  // 值回调模式返回最后一个监听器的结果
  return isValueCallback ? lastResult : undefined;
}

/**
 * Native 异步回调通知接口（供 Native 调用）
 * @param callbackId - 回调 ID
 * @param isSuccess - 是否成功
 * @param status - 状态码（与 ErrorCode 对应）
 * @param args - 回调参数
 * @param keepCallback - 是否保留回调（不删除）
 */
export function callbackFromNative(
  callbackId: string,
  isSuccess: boolean,
  status: number,
  args: any,
  keepCallback: boolean
): void {
  const callbacks = callbackStore.get(callbackId);
  if (!callbacks) {
    console.warn(`[Native Bridge] 未找到 callbackId: ${callbackId} 的回调`);
    return;
  }

  console.debug(
    `[Native Bridge] 收到 Native 回调：callbackId=${callbackId}，成功=${isSuccess}，状态=${status}，参数=${JSON.stringify(args)}`
  );

  try {
    // 根据状态触发对应回调
    if (isSuccess && status === STATUS_SUCCESS) {
      // 成功：触发 success 回调
      callbacks.success?.(args);
    } else if (status === STATUS_CANCEL) {
      // 取消：触发 cancel 回调
      callbacks.cancel?.(args);
    } else {
      // 失败：触发 fail 回调（包装成 ErrorInfo 格式）
      const errorInfo: ErrorInfo = {
        errorCode: status as ErrorCode,
        errorInfo: args?.errorInfo || `操作失败（状态码：${status}）`
      };
      callbacks.fail?.(errorInfo);
    }

    // 无论成功/失败，触发 complete 回调
    callbacks.complete?.();
  } catch (err) {
    console.error(`[Native Bridge] 回调处理失败：callbackId=${callbackId}`, err);
  } finally {
    // 不保留回调则删除（避免内存泄漏）
    if (!keepCallback) {
      callbackStore.delete(callbackId);
    }
  }
}

// ========================= 全局暴露（供 Native 直接访问） =========================
// 若在浏览器环境，挂载到 window 供 Native 调用
if (typeof window !== "undefined") {
  (window as any).nativeBridge = {
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
