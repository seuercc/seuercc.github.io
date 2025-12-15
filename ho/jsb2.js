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

    // ======================== 3. 核心适配：兼容主frame不可改+跨域 ========================
    // 兜底对象：Native不可用时返回友好提示，避免崩溃
    var c = {
        invoke: function (e, n, t, r, i) {
            var s = "主frame无Native对象 ".concat(e, ":").concat(n, "（主frame/Native未修改，走兜底逻辑）");
            console.warn(s);
            var a = "F08 ".concat(t, " s").concat(s);
            return a.length + " " + a
        },
        invokeSync: function (e, n, t) {
            var s = "主frame无Native对象 ".concat(e, ":").concat(n, "（主frame/Native未修改，走兜底逻辑）");
            console.warn(s);
            return JSON.stringify({ status: 8, result: s }) // 标准化返回格式，避免JSON.parse报错
        }
    };

    // 适配跨域场景：安全获取parent对象，避免跨域访问报错
    function getSafeParent() {
        try {
            // 同域时可访问parent，跨域时会抛出SecurityError
            return window.parent && window.parent.window === window.parent ? window.parent : null;
        } catch (e) {
            console.warn("子iframe与主frame跨域，无法访问parent对象：", e);
            return null;
        }
    }

    // 核心修改：安全获取Native对象（兼容跨域/主frame无对象）
    function o(e) {
        var parentWin = getSafeParent();
        // 1. 同域+主frame有对应对象：正常使用
        if (parentWin && parentWin[e]) {
            return parentWin[e];
        }
        // 2. 跨域/主frame无对象：走兜底
        return c;
    }

    // ======================== 4. 通信核心逻辑（仅容错增强，无功能修改） ========================
    var l = 1, u = 8, f = 9, h = [], v = Math.floor(2e9 * Math.random()), d = {};
    var b = "undefined" == typeof Promise ? function (e) { setTimeout(e) } : function (e) { Promise.resolve().then(e) };
    function p() { return v++ }

    function g(e, n, t, r, i, s) {
        s = s || [];
        // 兼容ArrayBuffer判断（避免参数报错）
        for (var a = 0; a < s.length; a++) {
            try {
                var c = s[a];
                if ("ArrayBuffer" === Object.prototype.toString.call(c).slice(8, -1)) {
                    s[a] = btoa(c);
                }
            } catch (err) {
                console.warn("参数处理失败（ArrayBuffer转base64）：", err);
            }
        }
        var l = r + p(), u = JSON.stringify(s);
        (n || t) && (d[l] = { success: n, fail: t });
        // 容错：调用Native.invoke时捕获错误
        var f;
        try {
            f = o(e).invoke(r, i, l, u, -1);
        } catch (err) {
            console.error("调用Native.invoke失败：", err);
            f = c.invoke(r, i, l, u, -1); // 强制走兜底
        }
        console.debug("exec ".concat(r, ".").concat(i, " with args: ").concat(JSON.stringify(s), ", result: ").concat(JSON.stringify(f))),
            f && h.push(f), b(y)
    }

    function y() {
        if (0 !== h.length) try {
            var e = function (e) {
                if ("*" === e) return "*"; // 兼容特殊消息
                var n = e.charAt(0);
                if ("S" !== n && "F" !== n) return void console.error("processMessage failed: invalid message: " + JSON.stringify(e));
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
            h.length > 0 && b(y) // 即使出错，仍处理剩余消息
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
            else if ("S" === t) e.push(atob(n.slice(1)));
            else if ("M" === t) for (var i = n.slice(1); "" !== i;) {
                var s = i.indexOf(" "), a = Number(i.slice(0, s)), c = i.substring(s + 1, s + 1 + a);
                i = i.slice(s + a + 1), m(e, c)
            } else e.push(JSON.parse(n))
        } catch (err) {
            console.error("参数反序列化失败：", err);
            e.push(n); // 解析失败时直接返回原始值，避免崩溃
        }
    }

    function k(e, n, t, r, i) {
        try {
            var s = d[e];
            if (s) {
                console.info("callbackFromNative callbackId: ".concat(e, ", isSuccess: ").concat(n, ", status: ").concat(t, ", args: ").concat(JSON.stringify(r)));
                if (n && t === l) {
                    s.success && s.success.call(null, r);
                } else if (!n) {
                    s.fail && s.fail.call(null, r, t);
                }
                !i && delete d[e]; // 不保留回调则清理，避免内存泄漏
            }
        } catch (t) {
            console.error("回调执行失败（callbackId:".concat(e, "）："), t);
        }
    }

    // ======================== 5. API封装（强化容错） ========================
    function S(e, n, t, r, i, s, a, c) {
        // 前置校验：参数不全时兜底
        if (!e || !n || !t) {
            console.error("invoke参数缺失：bridgeName=".concat(e, ", service=").concat(n, ", action=").concat(t));
            var errMsg = "invoke参数缺失";
            s && s(errMsg, f); // 执行失败回调
            c && c(errMsg, f); // 执行完成回调
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
                var errMsg = "invokePromise参数缺失：bridgeName=".concat(e, ", service=").concat(n, ", action=").concat(t);
                console.error(errMsg);
                s(new Error(errMsg));
                return;
            }
            g(e, (function (e) { i(e) }), (function (e) { s(e) }), n, t, r)
        }))
    }

    function N(e, n, t, r) {
        try {
            var i, s = o(e).invokeSync(n, t, r);
            try { s && (i = JSON.parse(s)) } catch (e) { console.warn("invokeSync结果解析失败：", e); i = { status: u, result: s } }
            return i ? { status: void 0 === i.status ? u : i.status, result: i.result } : { status: u }
        } catch (err) {
            console.error("invokeSync调用失败：", err);
            return { status: u, result: err.message }; // 标准化返回，避免崩溃
        }
    }

    function O(e, n, t, r) { s(e, n) }
    function P(e, n, t, r) { a(e, n) }
    function j(e, n, t) {
        console.info('call onNativeValueCallback e :' + JSON.stringify(e) + ',n :' + JSON.stringify(n) + ', t :' + JSON.stringify(t));
        return i(e, n)
    }

    // ======================== 6. 初始化函数（核心修复：彻底解决hwbr未定义） ========================
    function x(e) {
        // 极端场景：window不存在时直接返回
        if (typeof window === "undefined") {
            console.error("window对象不存在，无法初始化".concat(e));
            return;
        }
        // 强制初始化：确保window[e]是对象，避免undefined
        window[e] = window[e] || {};
        // 强制挂载核心方法，覆盖式挂载（保证方法存在）
        window[e].onNativeValueCallback = j;
        window[e].callbackFromNative = k;
        console.log("✅ 初始化完成：".concat(e));
    }

    // ======================== 7. 全局暴露（无修改） ========================
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

    // ======================== 8. 业务初始化（彻底修复hwbr未定义） ========================
    // 第一步：优先初始化核心对象，确保存在
    x("wiseopercampaign");
    x("hwbr"); // 提前初始化hwbr，解决未定义问题

    // 第二步：强制初始化所有子对象，避免xx.app未定义
    window.wiseopercampaign = window.wiseopercampaign || {};
    window.wiseopercampaign.account = window.wiseopercampaign.account || {};
    window.hwbr = window.hwbr || {};
    window.hwbr.app = window.hwbr.app || {};
    window.hwbr.report = window.hwbr.report || {};
    window.hwbr.linkedLogin = window.hwbr.linkedLogin || {};
    window.hwbr.mcpAccount = window.hwbr.mcpAccount || {};

    // ======================== 9. 业务方法定义（强化容错） ========================
    // wiseopercampaign 相关
    function getUserId(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge",
            "account",
            "getUserId",
            params || [],
            success,
            fail
        );
    }
    function getUserInfo_Wise(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge",
            "account",
            "getUserInfo",
            params || [],
            success,
            fail
        );
    }
    function getUserToken(params, success, fail) {
        window.nativeBridge.invoke(
            "wiseopercampaignbridge",
            "account",
            "getUserToken",
            params || [],
            success,
            fail
        );
    }
    window.wiseopercampaign.account.getUserId = getUserId;
    window.wiseopercampaign.account.getUserInfo = getUserInfo_Wise;
    window.wiseopercampaign.account.getUserToken = getUserToken;

    // hwbr 相关
    function eventReport(params, success, fail) {
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
        window.nativeBridge.invoke(
            "_hwbrNative",
            "app",
            "getPluginList",
            params || [], // 修复：统一为数组，避免字符串参数报错
            success,
            fail
        );
    }
    function login(params, success, fail) {
        window.nativeBridge.invoke(
            "_hwbrNative",
            "linkedLogin",
            "login",
            params || [],
            success,
            fail
        );
    }
    function getUserInfo_Hwbr(params, success, fail) {
        window.nativeBridge.invoke(
            "_hwbrNative",
            "mcpAccount",
            "getUserInfo",
            params || [],
            success,
            fail
        );
    }
    // 挂载业务方法到已初始化的hwbr对象
    window.hwbr.app.getPluginList = getPluginList;
    window.hwbr.report.eventReport = eventReport;
    window.hwbr.linkedLogin.login = login;
    window.hwbr.mcpAccount.getUserInfo = getUserInfo_Hwbr;

    // ======================== 10. 页面渲染+业务调用（容错增强） ========================
    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
        body{padding:20px;font:14px/1.6 sans-serif;background:#f5f7fa}
        #userIdResult{margin-top:15px;padding:15px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
        .suc{color:#48bb78}
        .err{color:#e53e3e}
    `;
    document.head.appendChild(style);

    // 创建结果容器（确保DOM存在）
    const resultContainer = document.createElement('div');
    resultContainer.id = 'userIdResult';
    resultContainer.textContent = '正在初始化...';
    document.body.appendChild(resultContainer);

    // 延迟调用：延长至300ms，确保所有初始化完成；增加全量校验
    setTimeout(() => {
        // 更新初始状态
        resultContainer.textContent = '正在获取数据...';

        // 1. 获取userId
        if (window.wiseopercampaign?.account?.getUserId) {
            wiseopercampaign.account.getUserId(
                { username: "test" },
                data => resultContainer.innerHTML = `<div class="suc">✅ getUserId succeed：${JSON.stringify(data)}</div>`,
                (err, code) => resultContainer.innerHTML = `<div class="err">❌ getUserId error：${err || '未知错误'}（码：${code || '无'}）</div>`
            );
        } else {
            resultContainer.innerHTML = `<div class="err">❌ getUserId error：wiseopercampaign.account.getUserId 未定义</div>`;
        }

        // 2. 获取userToken
        if (window.wiseopercampaign?.account?.getUserToken) {
            wiseopercampaign.account.getUserToken(
                [{ "scopes": [], "forceOn": "0", "userTokenOld": "", "extendInfo": {} }],
                data => resultContainer.innerHTML += `<div class="suc">✅ getUserToken succeed ：${JSON.stringify(data)}</div>`,
                (err, code) => resultContainer.innerHTML += `<div class="err">❌ getUserToken error：${err || '未知错误'}（code：${code || '无'}）</div>`
            );
        } else {
            resultContainer.innerHTML += `<div class="err">❌ getUserToken error：wiseopercampaign.account.getUserToken 未定义</div>`;
        }

        // 3. 获取插件列表
        if (window.hwbr?.app?.getPluginList) {
            hwbr.app.getPluginList(
                [],
                data => resultContainer.innerHTML += `<div class="suc">✅ getPluginList succeed：${JSON.stringify(data)}</div>`,
                err => resultContainer.innerHTML += `<div class="err">❌ getPluginList error：${JSON.stringify(err)}</div>`
            );
        } else {
            resultContainer.innerHTML += `<div class="err">❌ getPluginList error：hwbr.app.getPluginList 未定义</div>`;
        }

        // 4. 事件上报
        if (window.hwbr?.report?.eventReport) {
            const eventReportJsonStr = JSON.stringify({
                eventName: 'you are hacked',
                version: 1,
                info: { extInfo: { 'name': 'cc' }, u: 'hahaha' },
                reportImmediately: true,
                isOverseaReport: false,
                isAnonymous: true
            });
            hwbr.report.eventReport(
                [eventReportJsonStr],
                data => resultContainer.innerHTML += `<div class="suc">✅ report succeed：${JSON.stringify(data)}</div>`,
                err => resultContainer.innerHTML += `<div class="err">❌ report error：${JSON.stringify(err)}</div>`
            );
        } else {
            resultContainer.innerHTML += `<div class="err">❌ eventReport error：hwbr.report.eventReport 未定义</div>`;
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
            hwbr.linkedLogin.login(
                loginInfo,
                data => resultContainer.innerHTML += `<div class="suc">✅ login succeed：${JSON.stringify(data, null, 2)}</div>`,
                err => resultContainer.innerHTML += `<div class="err">❌ login error：${JSON.stringify(err, null, 2)}</div>`
            );
        } else {
            resultContainer.innerHTML += `<div class="err">❌ login error：hwbr.linkedLogin.login 未定义</div>`;
        }

        // 6. 获取用户信息
        if (window.hwbr?.mcpAccount?.getUserInfo) {
            const SubAppAuthCodePara = JSON.stringify({ subAppId: '112938007' });
            hwbr.mcpAccount.getUserInfo(
                [SubAppAuthCodePara],
                data => resultContainer.innerHTML += `<div class="suc">✅ getUserInfo succeed：${JSON.stringify(data)}</div>`,
                err => resultContainer.innerHTML += `<div class="err">❌ getUserInfo error：${JSON.stringify(err)}</div>`
            );
        } else {
            resultContainer.innerHTML += `<div class="err">❌ getUserInfo error：hwbr.mcpAccount.getUserInfo 未定义</div>`;
        }
    }, 300); // 延长延迟，确保初始化完成

})();
