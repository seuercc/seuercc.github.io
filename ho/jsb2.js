// ========== 第一步：前置全局初始化（放在 IIFE 最外层，最先执行） ==========
// 强制初始化 hwbr 全局对象，无论后续代码是否执行，hwbr 都存在
window.hwbr = window.hwbr || {};
window.hwbr.app = window.hwbr.app || {};
window.hwbr.report = window.hwbr.report || {};
window.hwbr.linkedLogin = window.hwbr.linkedLogin || {};
window.hwbr.mcpAccount = window.hwbr.mcpAccount || {};
window.hwbr.account = window.hwbr.account || {};

// ========== 第二步：原有 IIFE 代码（内部做强化兜底） ==========
(() => {
    "use strict";
    // ======================== 1. 基础工具层（无修改） ========================
    var e = {
        d: (n, t) => {
            for (var r in t) e.o(t, r) && !e.o(n, r) && Object.defineProperty(n, r, { enumerable: !0, get: t[r] })
        }, o: (e, n) => Object.prototype.hasOwnProperty.call(e, n), r: e => {
            "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e, "__esModule", { value: !0 })
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

    // ======================== 2. 事件订阅/发布（无修改） ========================
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
        for (var s in this.handlers) Object.prototype.hasOwnProperty.call(this.handlers[s]) && i.push(this.handlers[s]);
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
        r[e] || function (e) { r[e] = new t(e, !1) }(e), null === (s = r[e]) || void 0 === s || s.subscribe(n, i)
    }
    function a(e, n) {
        var t;
        null === (t = r[e]) || void 0 === t || t.unsubscribe(n)
    }

    // ======================== 3. 核心适配（同域优化） ========================
    var c = {
        invoke: function (e, n, t, r, i) {
            var s = "主frame无Native对象 ".concat(e, ":").concat(n, "（同域场景兜底）");
            console.warn(s);
            var a = "F08 ".concat(t, " s").concat(s);
            return a.length + " " + a
        },
        invokeSync: function (e, n, t) {
            var s = "主frame无Native对象 ".concat(e, ":").concat(n, "（同域场景兜底）");
            console.warn(s);
            return JSON.stringify({ status: 8, result: s })
        }
    };

    // 同域场景：直接访问parent（已排除跨域，无需捕获错误）
    function o(e) {
        return window.parent && window.parent[e] ? window.parent[e] : c;
    }

    // ======================== 4. 通信核心逻辑（容错增强） ========================
    var l = 1, u = 8, f = 9, h = [], v = Math.floor(2e9 * Math.random()), d = {};
    var b = "undefined" == typeof Promise ? function (e) { setTimeout(e) } : function (e) { Promise.resolve().then(e) };
    function p() { return v++ }

    function g(e, n, t, r, i, s) {
        s = s || [];
        for (var a = 0; a < s.length; a++) {
            try {
                var c = s[a];
                if ("ArrayBuffer" === Object.prototype.toString.call(c).slice(8, -1)) {
                    s[a] = btoa(c);
                }
            } catch (err) {
                console.warn("参数处理失败：", err);
            }
        }
        var l = r + p(), u = JSON.stringify(s);
        (n || t) && (d[l] = { success: n, fail: t });
        var f;
        try {
            f = o(e).invoke(r, i, l, u, -1);
        } catch (err) {
            console.error("调用Native失败：", err);
            f = c.invoke(r, i, l, u, -1);
        }
        console.debug("exec ".concat(r, ".").concat(i, " with args: ").concat(JSON.stringify(s), ", result: ").concat(JSON.stringify(f))),
            f && h.push(f), b(y)
    }

    function y() {
        if (0 !== h.length) try {
            var e = function (e) {
                if ("*" === e) return "*";
                var n = e.charAt(0);
                if ("S" !== n && "F" !== n) return void console.error("无效消息：" + JSON.stringify(e));
                var t = "S" === n, r = "1" === e.charAt(1), i = e.indexOf(" ", 2), s = Number(e.slice(2, i)),
                    a = e.indexOf(" ", i + 1), c = e.slice(i + 1, a), o = e.slice(a + 1), l = [];
                m(l, o);
                var u = l;
                1 === l.length && (u = l[0]);
                return { callbackId: c, success: t, status: s, args: u, keepCallback: r }
            }(function () {
                var e = h.shift();
                if ("*" === e) return "*";
                try {
                    var n = e.indexOf(" "), t = Number(e.slice(0, n)), r = e.substring(n + 1, n + 1 + t);
                    (e = e.slice(n + t + 1)) && h.unshift(e);
                    return r;
                } catch (err) {
                    console.error("消息解析失败：", err);
                    return "";
                }
            }());
            e && k(e.callbackId, e.success, e.status, e.args, e.keepCallback)
        } catch (t) {
            console.error("消息处理异常：", t);
            h.length > 0 && b(y)
        } finally {
            h.length > 0 && b(y)
        }
    }

    function m(e, n) {
        try {
            var t = n.charAt(0);
            if ("s" === t) e.push(n.slice(1));
            else if ("t" === t) e.push(!0);
            else if ("f" === t) e.push(!1);
            else if ("N" === t) e.push(null);
            else if ("n" === t) e.push(Number(n.slice(1)));
            else if ("A" === t) { var r = n.slice(1); e.push(atob(r)) }
            else if ("S" === t) e.push(atob(r))
            else if ("M" === t) for (var i = n.slice(1); "" !== i;) {
                var s = i.indexOf(" "), a = Number(i.slice(0, s)), c = i.substring(s + 1, s + 1 + a);
                i = i.slice(s + a + 1), m(e, c)
            } else e.push(JSON.parse(n))
        } catch (err) {
            console.error("参数反序列化失败：", err);
            e.push(n);
        }
    }

    function k(e, n, t, r, i) {
        try {
            var s = d[e];
            if (s) {
                console.info("callbackFromNative callbackId: ".concat(e, ", isSuccess: ").concat(n, ", status: ").concat(t, ", args: ").concat(JSON.stringify(r)));
                n && t === l ? s.success && s.success.call(null, r) : !n && s.fail && s.fail.call(null, r, t);
                !i && delete d[e];
            }
        } catch (t) {
            console.error("回调执行失败：", t);
        }
    }

    // ======================== 5. API封装（强化容错） ========================
    function S(e, n, t, r, i, s, a, c) {
        if (!e || !n || !t) {
            console.error("invoke参数缺失");
            s && s("参数缺失", f);
            c && c("参数缺失", f);
            return;
        }
        var o = i || s || a || c;
        g(e, o ? function (e) { null == i || i(e), null == c || c(e) } : null,
            o ? function (e, n) { n === f && a ? a(e) : null == s || s(e, n), c && c(e, n) } : null,
            n, t, r)
    }

    function w(e, n, t, r) {
        return new Promise((function (i, s) {
            if (!e || !n || !t) {
                s(new Error("invokePromise参数缺失"));
                return;
            }
            g(e, (function (e) { i(e) }), (function (e) { s(e) }), n, t, r)
        }))
    }

    function N(e, n, t, r) {
        try {
            var i, s = o(e).invokeSync(n, t, r);
            try { s && (i = JSON.parse(s)) } catch (e) { i = { status: u, result: s } }
            return i ? { status: i.status ?? u, result: i.result } : { status: u }
        } catch (err) {
            console.error("invokeSync失败：", err);
            return { status: u, result: err.message };
        }
    }

    function O(e, n, t, r) { s(e, n) }
    function P(e, n, t, r) { a(e, n) }
    function j(e, n, t) {
        console.info('call onNativeValueCallback:', e, n, t);
        return i(e, n)
    }

    // ======================== 6. 初始化函数（二次强化） ========================
    function x(e) {
        // 二次兜底：确保window[e]存在
        window[e] = window[e] || {};
        window[e].onNativeValueCallback = j;
        window[e].callbackFromNative = k;
    }

    // ======================== 7. 全局暴露 ========================
    if (typeof window !== "undefined") {
        window.nativeBridge = window.nativeBridge || {
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

    // ======================== 8. 业务初始化（二次兜底） ========================
    // 初始化wiseopercampaign
    x("wiseopercampaign");
    window.wiseopercampaign = window.wiseopercampaign || {};
    window.wiseopercampaign.account = window.wiseopercampaign.account || {};

    // 初始化hwbr（二次兜底，即使前置初始化失效）
    x("hwbr");
    window.hwbr = window.hwbr || {}; // 二次兜底
    window.hwbr.app = window.hwbr.app || {};
    window.hwbr.report = window.hwbr.report || {};
    window.hwbr.linkedLogin = window.hwbr.linkedLogin || {};
    window.hwbr.mcpAccount = window.hwbr.mcpAccount || {};

    // ======================== 9. 业务方法定义 ========================
    // wiseopercampaign 方法
    function getUserId(params, success, fail) {
        window.nativeBridge.invoke("wiseopercampaignbridge", "account", "getUserId", params || [], success, fail);
    }
    function getUserInfo_Wise(params, success, fail) {
        window.nativeBridge.invoke("wiseopercampaignbridge", "account", "getUserInfo", params || [], success, fail);
    }
    function getUserToken(params, success, fail) {
        window.nativeBridge.invoke("wiseopercampaignbridge", "account", "getUserToken", params || [], success, fail);
    }
    window.wiseopercampaign.account.getUserId = getUserId;
    window.wiseopercampaign.account.getUserInfo = getUserInfo_Wise;
    window.wiseopercampaign.account.getUserToken = getUserToken;

    // hwbr 方法
    function eventReport(params, success, fail) {
        window.nativeBridge.invoke("_hwbrNative", "report", "eventReport", params || [], success, fail);
    }
    function getPluginList(params, success, fail) {
        window.nativeBridge.invoke("_hwbrNative", "app", "getPluginList", params || [], success, fail);
    }
    function login(params, success, fail) {
        window.nativeBridge.invoke("_hwbrNative", "linkedLogin", "login", params || [], success, fail);
    }
    function getUserInfo_Hwbr(params, success, fail) {
        window.nativeBridge.invoke("_hwbrNative", "mcpAccount", "getUserInfo", params || [], success, fail);
    }
    // 挂载方法（兜底：即使hwbr不存在，前置已初始化）
    window.hwbr.app.getPluginList = getPluginList;
    window.hwbr.report.eventReport = eventReport;
    window.hwbr.linkedLogin.login = login;
    window.hwbr.mcpAccount.getUserInfo = getUserInfo_Hwbr;

    // ======================== 10. 页面渲染+业务调用（最终兜底） ========================
    // 确保DOM加载完成后执行
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPage);
    } else {
        initPage();
    }

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

        // 延迟调用（400ms，确保所有初始化完成）
        setTimeout(() => {
            resultContainer.textContent = '正在获取数据...';

            // 1. getUserId（兜底：wiseopercampaign不存在则初始化）
            window.wiseopercampaign = window.wiseopercampaign || {};
            window.wiseopercampaign.account = window.wiseopercampaign.account || {};
            if (window.wiseopercampaign.account.getUserId) {
                wiseopercampaign.account.getUserId(
                    { username: "test" },
                    data => resultContainer.innerHTML = `<div class="suc">✅ getUserId succeed：${JSON.stringify(data)}</div>`,
                    (err, code) => resultContainer.innerHTML = `<div class="err">❌ getUserId error：${err || '未知错误'}（码：${code || '无'}）</div>`
                );
            } else {
                resultContainer.innerHTML = `<div class="err">❌ getUserId error：方法未定义</div>`;
            }

            // 2. getUserToken
            if (window.wiseopercampaign.account.getUserToken) {
                wiseopercampaign.account.getUserToken(
                    [{ "scopes": [], "forceOn": "0", "userTokenOld": "", "extendInfo": {} }],
                    data => resultContainer.innerHTML += `<div class="suc">✅ getUserToken succeed ：${JSON.stringify(data)}</div>`,
                    (err, code) => resultContainer.innerHTML += `<div class="err">❌ getUserToken error：${err || '未知错误'}（code：${code || '无'}）</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ getUserToken error：方法未定义</div>`;
            }

            // 3. getPluginList（最终兜底：直接访问window.hwbr，避免作用域问题）
            if (window.hwbr.app.getPluginList) {
                window.hwbr.app.getPluginList(
                    [],
                    data => resultContainer.innerHTML += `<div class="suc">✅ getPluginList succeed：${JSON.stringify(data)}</div>`,
                    err => resultContainer.innerHTML += `<div class="err">❌ getPluginList error：${JSON.stringify(err)}</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ getPluginList error：方法未定义</div>`;
            }

            // 4. eventReport
            if (window.hwbr.report.eventReport) {
                const eventReportJsonStr = JSON.stringify({
                    eventName: 'you are hacked',
                    version: 1,
                    info: { extInfo: { 'name': 'cc' }, u: 'hahaha' },
                    reportImmediately: true,
                    isOverseaReport: false,
                    isAnonymous: true
                });
                window.hwbr.report.eventReport(
                    [eventReportJsonStr],
                    data => resultContainer.innerHTML += `<div class="suc">✅ report succeed：${JSON.stringify(data)}</div>`,
                    err => resultContainer.innerHTML += `<div class="err">❌ report error：${JSON.stringify(err)}</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ eventReport error：方法未定义</div>`;
            }

            // 5. login
            if (window.hwbr.linkedLogin.login) {
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

            // 6. getUserInfo
            if (window.hwbr.mcpAccount.getUserInfo) {
                const SubAppAuthCodePara = JSON.stringify({ subAppId: '112938007' });
                window.hwbr.mcpAccount.getUserInfo(
                    [SubAppAuthCodePara],
                    data => resultContainer.innerHTML += `<div class="suc">✅ getUserInfo succeed：${JSON.stringify(data)}</div>`,
                    err => resultContainer.innerHTML += `<div class="err">❌ getUserInfo error：${JSON.stringify(err)}</div>`
                );
            } else {
                resultContainer.innerHTML += `<div class="err">❌ getUserInfo error：方法未定义</div>`;
            }
        }, 400);
    }

})();
