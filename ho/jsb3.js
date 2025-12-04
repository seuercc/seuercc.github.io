(() => {
    "use strict";
    var e = {
        d: (n, t) => {
            for (var r in t) e.o(t, r) && !e.o(n, r) && Object.defineProperty(n, r, {enumerable: !0, get: t[r]})
        }, o: (e, n) => Object.prototype.hasOwnProperty.call(e, n), r: e => {
            "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {value: "Module"}), Object.defineProperty(e, "__esModule", {value: !0})
        }
    }, n = {};
    e.r(n), e.d(n, {
        callbackFromNative: () => k,
        init: () => x,
        invoke: () => S,
        invokePromise: () => w,
        invokeSync: () => N,
        off: () => P,
        on: () => O,
        onNativeValueCallback: () => j
    });
    var t = function (e, n) {
        this.type = e, this.handlers = {}, this.numHandlers = 0, this.state = n ? 1 : 0, this.fireArgs = null, this.nextGuid = 1
    };
    t.prototype.subscribe = function (e) {
        if (2 !== this.state) {
            var n = e.observer_guid;
            n || (n = String(this.nextGuid++)), e.observer_guid = n, this.handlers[n] || (this.handlers[n] = e, this.numHandlers++)
        } else e.apply(this, this.fireArgs)
    }, t.prototype.unsubscribe = function (e) {
        var n = e.observer_guid;
        this.handlers[n] && (delete this.handlers[n], this.numHandlers--)
    }, t.prototype.fire = function (e, n) {
        var t = this, r = n ? [e, n] : [e];
        if (1 === this.state && (this.state = 2, this.fireArgs = r), this.handlers.size <= 0) return [];
        var i = [];
        for (var s in this.handlers) Object.prototype.hasOwnProperty.call(this.handlers, s) && i.push(this.handlers[s]);
        var a = i.map((function (e) {
            return e.apply(t, r)
        }));
        return 2 === this.state && this.numHandlers > 0 && (this.handlers = {}, this.numHandlers = 0), a
    };
    var r = {};

    function i(e, n) {
        var t;
        return null === (t = r[e]) || void 0 === t ? void 0 : t.fire(n)
    }

    function s(e, n, i) {
        var s;
        r[e] || function (e) {
            r[e] = new t(e, !1)
        }(e), null === (s = r[e]) || void 0 === s || s.subscribe(n, i)
    }

    function a(e, n) {
        var t;
        null === (t = r[e]) || void 0 === t || t.unsubscribe(n)
    }

    var c = {
        invoke: function (e, n, t, r, i) {
            var s = "no native object ".concat(e, ":").concat(n);
            console.warn(s);
            var a = "F08 ".concat(t, " s").concat(s);
            return a.length + " " + a
        }, invokeSync: function (e, n, t) {
            return "no native object ".concat(e, ":").concat(n)
        }
    };

    function o(e) {
        return window[e] ? window[e] : c
    }

    var l = 1, u = 8, f = 9, h = [], v = Math.floor(2e9 * Math.random()), d = {};
    var b = "undefined" == typeof Promise ? function (e) {
        setTimeout(e)
    } : function (e) {
        Promise.resolve().then(e)
    };

    function p() {
        return v++
    }

    function g(e, n, t, r, i, s) {
        s = s || [];
        for (var a = 0; a < s.length; a++) "ArrayBuffer" === (c = s[a], Object.prototype.toString.call(c).slice(8, -1)) && (s[a] = btoa(s[a]));
        var c, l = r + p(), u = JSON.stringify(s);
        (n || t) && (d[l] = {success: n, fail: t});
        var f = o(e).invoke(r, i, l, u, -1);
        console.debug("exec ".concat(r, ".").concat(i, " with args: ").concat(JSON.stringify(s), ", result: ").concat(JSON.stringify(f))), f && h.push(f), b(y)
    }

    function y() {
        if (0 !== h.length) try {
            var e = function (e) {
                var n = e.charAt(0);
                if ("S" !== n && "F" !== n) return void console.error("processMessage failed: invalid message: " + JSON.stringify(e));
                var t = "S" === n, r = "1" === e.charAt(1), i = e.indexOf(" ", 2), s = Number(e.slice(2, i)),
                    a = e.indexOf(" ", i + 1), c = e.slice(i + 1, a), o = e.slice(a + 1), l = [];
                m(l, o);
                var u = l;
                1 === l.length && (u = l[0]);
                return {callbackId: c, success: t, status: s, args: u, keepCallback: r}
            }(function () {
                var e = h.shift();
                if ("*" === e) return "*";
                var n = e.indexOf(" "), t = Number(e.slice(0, n)), r = e.substring(n + 1, n + 1 + t);
                (e = e.slice(n + t + 1)) && h.unshift(e);
                return r
            }());
            k(e.callbackId, e.success, e.status, e.args, e.keepCallback)
        } finally {
            h.length > 0 && b(y)
        }
    }

    function m(e, n) {
        var t = n.charAt(0);
        if ("s" === t) e.push(n.slice(1)); else if ("t" === t) e.push(!0); else if ("f" === t) e.push(!1); else if ("N" === t) e.push(null); else if ("n" === t) e.push(Number(n.slice(1))); else if ("A" === t) {
            var r = n.slice(1);
            e.push(atob(r))
        } else if ("S" === t) e.push(atob(n.slice(1))); else if ("M" === t) for (var i = n.slice(1); "" !== i;) {
            var s = i.indexOf(" "), a = Number(i.slice(0, s)), c = i.substring(s + 1, s + 1 + a);
            i = i.slice(s + a + 1), m(e, c)
        } else e.push(JSON.parse(n))
    }

    function k(e, n, t, r, i) {

        try {
            var s = d[e];
            s && (console.info("callbackFromNative callbackId: ".concat(e, ", isSuccess: ").concat(n, ", status: ").concat(t, ",r args: ").concat(JSON.stringify(r))), n && t === l ? s.success && s.success.call(null, r) : n || s.fail && s.fail.call(null, r, t), i || delete d[e])
        } catch (t) {
            var a = "Error in ".concat(n ? "Success" : "Error", " callbackId: ").concat(e, " : ").concat(t);
            console.error(a)
        }
    }

    /**
     * 通过指定相应的服务名称、操作和可选参数来调用功能。
     * @param {string} bridgeName - bridge name
     * @param {string} service - 在本机端调用的服务名称（对应于本机类）
     * @param {string} action - 在本机端调用的操作名称（通常对应于本机类方法）
     * @param {any[]} [args] - 要传递到本机环境中的参数数组（可选）
     * @param {Function} [success] - 成功回调函数（可选）
     * @param {Function} [fail] - 错误回调函数（可选）
     * @param {Function} [cancel] - 取消回调函数（可选）
     * @param {Function} [complete] - 完成回调函数（可选）
     */
    function S(e, n, t, r, i, s, a, c) {
        var o = i || s || a || c;
        g(e, o ? function (e) {
            null == i || i(e), null == c || c(e)
        } : null, o ? function (e, n) {
            n === f && a ? a(e) : null == s || s(e, n), c && c(e, n)
        } : null, n, t, r)
    }

    /**
     * Promise 方式调用 Native 方法
     * @param {string} bridgeName - bridge name
     * @param {string} service - service 名称
     * @param {string} action - action 名称
     * @param {any[]} [args] - 调用参数（可选）
     * @returns {Promise<any>} 成功返回结果，失败抛出错误
     */
    function w(e, n, t, r) {
        return new Promise((function (i, s) {
            g(e, (function (e) {
                return i(e)
            }), (function (e) {
                return s(e)
            }), n, t, r)
        }))
    }

    /**
     * invoke的同步版本
     * @param {string} bridgeName - bridge name
     * @param {string} service - service 名称
     * @param {string} action - action 名称
     * @param {any[]} [args] - 调用参数（可选）
     * @returns {SyncInvokeResult} 同步调用结果
     */
    function N(e, n, t, r) {
        var i, s = o(e).invokeSync(n, t, r);
        try {
            s && (i = JSON.parse(s))
        } catch (e) {
        }
        return i ? {status: void 0 === i.status ? u : i.status, result: i.result} : {status: u}
    }

    /**
     * 添加事件监听器，类似于EventTarget.addEventListener()接口。
     * 当isValueCallback设置为ture时，事件发送者等待结果返回，然后再处理下一步。
     * @param {string} event - 字符串，指定要增加listener事件类型
     * @param {EventListener} listener - 要从事件目标中增加的事件处理程序的EventListener函数
     * @param {EventListenerOptions} [options] - 可选，选项对象，用于指定有关事件侦听器的特征
     * @param {boolean} [isValueCallback=false] - 是否支持值回调（默认false，只处理最后一次回调的响应）
     */
    function O(e, n, t, r) {
        s(e, n)
    }

    /**
     * 删除事件监听器，类似于EventTarget.remoEventListener()接口。
     * 删除接口事件后，不会收到回调。
     * @param {string} event - 字符串，指定要删除事件侦听器的事件类型
     * @param {EventListener} listener - 要从事件目标中删除的事件处理程序的EventListener函数
     * @param {EventListenerOptions} [options] - 可选，选项对象，用于指定有关事件侦听器的特征
     * @param {boolean} [isValueCallback=false] - 是否支持值回调（默认false，只处理最后一次回调的响应）
     */
    function P(e, n, t, r) {
        a(e, n)
    }

    /**
     * [FOR NATIVE] 提供给native的事件触发接口
     * @param {string} type - event type
     * @param {any} args - 事件参数
     * @param {boolean} isValueCallback - 是否支持值回调
     * @returns {null|*} 回调结果
     */
    function j(e, n, t) {
        console.info('call onNativeValueCallback e :' + JSON.stringify(e) + ',n :' + JSON.stringify(n) + ', t :' + JSON.stringify(t));
        return i(e, n)
    }

    /**
     * 初始化函数，必须执行，否则无法建立H5和Native的通道
     * @param {string} apiName - api name
     */
    function x(e) {
        window[e] ? (window[e].onNativeValueCallback = j, window[e].callbackFromNative = k) : window[e] = {
            onNativeValueCallback: j,
            callbackFromNative: k
        }
    }

    // ========================= 全局暴露（供外部调用，保持原有导出逻辑） =========================
    // 支持 CommonJS 导出（原代码逻辑）
    if (typeof module !== "undefined" && module.exports) {
        module.exports = n;
    }
    // 支持浏览器全局暴露（供 Native 直接访问）
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

    // 活动SDK初始化（保持不变）
    x("wiseopercampaign");

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

    function getDeviceToken(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge", // 修复1：bridgeName 与初始化一致
            "app",
            "getDeviceToken",
            params || [], // 优化：params 未传时默认空数组，避免 undefined
            success,
            fail // 修复2：移除多余逗号
        );
    }

    function createCalendarEvent(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge", // 修复1：bridgeName 与初始化一致
            "app",
            "createCalendarEvent",
            params || [], // 优化：params 未传时默认空数组，避免 undefined
            success,
            fail // 修复2：移除多余逗号
        );
    }

    function queryCalendarEvent(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge", // 修复1：bridgeName 与初始化一致
            "app",
            "queryCalendarEvent",
            params || [], // 优化：params 未传时默认空数组，避免 undefined
            success,
            fail // 修复2：移除多余逗号
        );
    }

    function deleteCalendarEvent(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge", // 修复1：bridgeName 与初始化一致
            "app",
            "deleteCalendarEvent",
            params || [], // 优化：params 未传时默认空数组，避免 undefined
            success,
            fail // 修复2：移除多余逗号
        );
    }

    function showToast(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge", // 修复1：bridgeName 与初始化一致
            "app",
            "showToast",
            params || [], // 优化：params 未传时默认空数组，避免 undefined
            success,
            fail // 修复2：移除多余逗号
        );
    }

    window.wiseopercampaign.app = window.wiseopercampaign.app || {};
    window.wiseopercampaign.app.getDeviceSessionId = getDeviceSessionId;
    window.wiseopercampaign.app.getDeviceToken = getDeviceToken;
    window.wiseopercampaign.app.createCalendarEvent = createCalendarEvent;
    window.wiseopercampaign.app.queryCalendarEvent = queryCalendarEvent;
    window.wiseopercampaign.app.deleteCalendarEvent = deleteCalendarEvent;
    window.wiseopercampaign.app.showToast = showToast;

    function getUserId(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge", // 修复1：bridgeName 与初始化一致
            "account",
            "getUserId",
            params || [], // 优化：params 未传时默认空数组，避免 undefined
            success,
            fail // 修复2：移除多余逗号
        );
    }

    function getUserInfo(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge", // 修复1：bridgeName 与初始化一致
            "account",
            "getUserInfo",
            params || [], // 优化：params 未传时默认空数组，避免 undefined
            success,
            fail // 修复2：移除多余逗号
        );
    }

    function getUserToken(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge", // 修复1：bridgeName 与初始化一致
            "account",
            "getUserToken",
            params || [], // 优化：params 未传时默认空数组，避免 undefined
            success,
            fail // 修复2：移除多余逗号
        );
    }


    window.wiseopercampaign.account = window.wiseopercampaign.account || {};
    window.wiseopercampaign.account.getUserId = getUserId;
    window.wiseopercampaign.account.getUserInfo = getUserInfo;
    window.wiseopercampaign.account.getUserToken = getUserToken;

    //下面开始调用JS代码
// 1. 动态创建并注入样式（无需 HTML 样式标签）
    const style = document.createElement('style');
    style.textContent = `
          body{padding:20px;font:14px/1.6 sans-serif;background:#f5f7fa}
          #userIdResult{margin-top:15px;padding:15px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
          .suc{color:#48bb78}
          .err{color:#e53e3e}
        `;
    document.head.appendChild(style);

    // 2. 动态创建结果展示容器（无需 HTML 结构）
    const resultContainer = document.createElement('div');
    resultContainer.id = 'userIdResult';
    resultContainer.textContent = '正在获取用户ID...';
    document.body.appendChild(resultContainer);

    // 3. 延迟调用 + 结果渲染（核心逻辑）
    setTimeout(() => {
        wiseopercampaign.app.showToast(
            ['you are hacked'],
            data => resultContainer.innerHTML = `<div class="suc">✅ app showToast succeed：${JSON.stringify(data)}</div>`,
            err => resultContainer.innerHTML = `<div class="err">❌ app showToast error：${JSON.stringify(err)}</div>`
        );

    }, 100);
    setTimeout(() => {
        wiseopercampaign.app.getDeviceSessionId(
            [false],
            data => resultContainer.innerHTML = `<div class="suc">✅ app getDeviceSessionId succeed：${JSON.stringify(data)}</div>`,
            err => resultContainer.innerHTML = `<div class="err">❌ app getDeviceSessionId error：${JSON.stringify(err)}</div>`
        );
    }, 100);
    setTimeout(() => {
        wiseopercampaign.app.getDeviceToken(
            [{
                scene: 'query',
                forceRefresh: false,
                queryExpireSeconds: 1000,
                invokeExpireSeconds: 1000
            }],
            data => resultContainer.innerHTML = `<div class="suc">✅ app getDeviceToken succeed：${JSON.stringify(data)}</div>`,
            err => resultContainer.innerHTML = `<div class="err">❌ app getDeviceToken error：${JSON.stringify(err)}</div>`
        );
    }, 100);
    setTimeout(() => {
        wiseopercampaign.app.queryCalendarEvent(
            [{id: 0, title: 'cc', timeRange: [[new Date().getTime(), new Date().getTime() + 100000]]}],
            data => resultContainer.innerHTML = `<div class="suc">✅ app queryCalendarEvent succeed：${JSON.stringify(data)}</div>`,
            err => resultContainer.innerHTML = `<div class="err">❌ app queryCalendarEvent error：${JSON.stringify(err)}</div>`
        );

    }, 100);
})();
