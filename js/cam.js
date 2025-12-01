// ========================= 类型说明（JSDoc 替代 TypeScript 接口） =========================
/**
 * 错误信息
 * @typedef {Object} ErrorInfo
 * @property {number} errorCode - 错误码（[0, 9]为框架错误码，[1000, 1999]为业务错误码）
 * @property {string} errorInfo - 错误描述
 */

/**
 * 框架错误码定义（必须和`invoke.js`中定义一致）
 * @typedef {0|1|2|3|4|5|6|7|8|9} ErrorCode
 */

/**
 * 同步调用返回结果
 * @typedef {Object} SyncInvokeResult
 * @property {number} status - 状态码
 * @property {string} [result] - 返回结果（可选）
 */

/**
 * 事件监听器类型
 * @typedef {(data: any) => void|boolean} EventListener
 */

/**
 * 添加事件监听器选项（兼容 EventTarget 标准）
 * @typedef {boolean|Object} EventListenerOptions
 * @property {boolean} [capture] - 是否捕获阶段触发
 * @property {boolean} [once] - 是否只触发一次
 * @property {boolean} [passive] - 是否不阻止默认行为
 */

// ========================= 核心 JS 逻辑（保留原有功能，未做修改） =========================
(() => {
    "use strict";
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
        (n || t) && (d[l] = { success: n, fail: t });
        var f = o(e).invoke(r, i, l, u, -1);
        console.debug("exec ".concat(r, ".").concat(i, " with args: ").concat(s, ", result: ").concat(f)), f && h.push(f), b(y)
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
                return { callbackId: c, success: t, status: s, args: u, keepCallback: r }
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
            s && (console.debug("callbackFromNative callbackId: ".concat(e, ", isSuccess: ").concat(n, ", status: ").concat(t, ", args: ").concat(r)), n && t === l ? s.success && s.success.call(null, r) : n || s.fail && s.fail.call(null, r, t), i || delete d[e])
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
        return i ? { status: void 0 === i.status ? u : i.status, result: i.result } : { status: u }
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

    // ========================= 直接调用 init 方法（核心修改） =========================
    // 传入你的 API 名称（示例："wiseopercampaign"，请根据实际需求修改）
    if (typeof window !== "undefined") { // 确保在浏览器环境中才执行
        x("wiseopercampaignbridge"); // 直接调用 init 对应的函数 x，无需全局访问
        console.log("[Native Bridge] init 方法已自动执行，API 名称：wiseopercampaign");
    }
	
function getUserId(params, success, fail) {
  window.nativeBridge.invoke(
    "wiseopercampaign", // 正确的 bridgeName（与 init 时一致）
    "account",          // service（Native 端服务名）
    "getUserId",        // action（Native 端方法名）
    params,             // args（传递给 Native 的参数，可选）
    success,            // success 回调（可选）
    fail                // fail 回调（可选）
    // 后续可选参数（cancel、complete）若不用可省略，无多余逗号
  );
}


	var qjd_browser = ["postMessage","blur","focus","close","parent","opener","top","length","frames","closed","location","self","window","document","name","customElements","history","locationbar","menubar","personalbar","scrollbars","statusbar","toolbar","status","frameElement","navigator","origin","external","screen","innerWidth","innerHeight","scrollX","pageXOffset","scrollY","pageYOffset","visualViewport","screenX","screenY","outerWidth","outerHeight","devicePixelRatio","clientInformation","screenLeft","screenTop","defaultStatus","defaultstatus","styleMedia","onanimationend","onanimationiteration","onanimationstart","onsearch","ontransitionend","onwebkitanimationend","onwebkitanimationiteration","onwebkitanimationstart","onwebkittransitionend","isSecureContext","onabort","onblur","oncancel","oncanplay","oncanplaythrough","onchange","onclick","onclose","oncontextmenu","oncuechange","ondblclick","ondrag","ondragend","ondragenter","ondragleave","ondragover","ondragstart","ondrop","ondurationchange","onemptied","onended","onerror","onfocus","oninput","oninvalid","onkeydown","onkeypress","onkeyup","onload","onloadeddata","onloadedmetadata","onloadstart","onmousedown","onmouseenter","onmouseleave","onmousemove","onmouseout","onmouseover","onmouseup","onmousewheel","onpause","onplay","onplaying","onprogress","onratechange","onreset","onresize","onscroll","onseeked","onseeking","onselect","onstalled","onsubmit","onsuspend","ontimeupdate","ontoggle","onvolumechange","onwaiting","onwheel","onauxclick","ongotpointercapture","onlostpointercapture","onpointerdown","onpointermove","onpointerup","onpointercancel","onpointerover","onpointerout","onpointerenter","onpointerleave","onselectstart","onselectionchange","onafterprint","onbeforeprint","onbeforeunload","onhashchange","onlanguagechange","onmessage","onmessageerror","onoffline","ononline","onpagehide","onpageshow","onpopstate","onrejectionhandled","onstorage","onunhandledrejection","onunload","performance","stop","open","alert","confirm","prompt","print","queueMicrotask","requestAnimationFrame","cancelAnimationFrame","captureEvents","releaseEvents","requestIdleCallback","cancelIdleCallback","getComputedStyle","matchMedia","moveTo","moveBy","resizeTo","resizeBy","scroll","scrollTo","scrollBy","getSelection","find","webkitRequestAnimationFrame","webkitCancelAnimationFrame","fetch","btoa","atob","setTimeout","clearTimeout","setInterval","clearInterval","createImageBitmap","onappinstalled","onbeforeinstallprompt","crypto","ondevicemotion","ondeviceorientation","ondeviceorientationabsolute","indexedDB","webkitStorageInfo","sessionStorage","localStorage","orientation","onorientationchange","openDatabase","ontouchcancel","ontouchend","ontouchmove","ontouchstart","attr_list","attr","obj","TEMPORARY","PERSISTENT","addEventListener","removeEventListener","dispatchEvent",
			  "window","self","document","location","customElements","history","navigation","locationbar","menubar","personalbar","scrollbars","statusbar","toolbar","frames","top","parent","navigator","external","screen","visualViewport","clientInformation","styleMedia","trustedTypes","performance","crypto","indexedDB","sessionStorage","localStorage","scheduler","chrome","caches","cookieStore","launchQueue","sharedStorage","documentPictureInPicture","speechSynthesis","webpackChunk","Turbo","litHtmlVersions","event","onbeforexrselect","onbeforeinput","onbeforematch","onbeforetoggle","oncontentvisibilityautostatechange","oncontextlost","oncontextrestored","onformdata","onsecuritypolicyviolation","onslotchange","onpointerrawupdate","ontransitionrun","ontransitionstart","ontransitioncancel","crossOriginIsolated","reportError","structuredClone","getScreenDetails","queryLocalFonts","showDirectoryPicker","showOpenFilePicker","showSaveFilePicker","originAgentCluster","onpageswap","onpagereveal","credentialless","fence","onscrollend","onscrollsnapchange","onscrollsnapchanging","webkitRequestFileSystem","webkitResolveLocalFileSystemURL","result","qjd_browser","qjd_attr"];
	var qjd_attr= [];
	for(var obj in window){
		if(qjd_browser.indexOf(obj) == -1){
			qjd_attr.push(obj);
		}
	}
  	var result = qjd_attr.length + ' js object : '+ qjd_attr.toString();
	for(i in qjd_attr){			
    		result += '<br>'+qjd_attr[i]+':<br>'    
		for(j in window[qjd_attr[i]])
			result += '----'+typeof(window[qjd_attr[i]][j])+': '+j+'<br>'
	}
	
	const tipElement = document.createElement('div');
	tipElement.id = 'native-bridge-tip';
	tipElement.textContent = '初始化完成';
	document.body.appendChild(result);	
})();
