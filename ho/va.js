/**
 * H5与Native端通信桥接核心模块
 * 功能：提供统一的桥接调用、事件监听、回调处理能力，实现H5与Native双向通信
 * 作者：未知
 * 版本：1.0.0
 */
(() => {
    "use strict";

    /**
     * 页面初始化函数（创建样式、DOM、调用API）
     */
    const initPage = () => {
        // 防错：检测DOM是否存在
        if (!document.head || !document.body) {
            console.error('页面DOM未加载完成，无法初始化');
            return;
        }

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
            // 防错：检测Native对象是否存在
            if (typeof HiSearchNative === 'undefined' || !HiSearchNative.getAuthCode) {
                resultContainer.innerHTML += `<div class="err">❌ HiSearchNative 接口未定义</div>`;
                return;
            }

            // 调用Native接口并捕获异常
            HiSearchNative.getAuthCode()
                .then(data => {
                    // 转义HTML特殊字符，避免XSS
                    const safeData = JSON.stringify(data).replace(/[&<>"']/g, char => {
                        const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
                        return escapeMap[char];
                    });
                    resultContainer.innerHTML += `<div class="suc">✅ getAuthCode succeed：${safeData}</div>`;
                })
                .catch(error => {
                    // 转义错误信息
                    const safeError = String(error).replace(/[&<>"']/g, char => {
                        const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
                        return escapeMap[char];
                    });
                    resultContainer.innerHTML += `<div class="err">❌ getAuthCode failed：${safeError}</div>`;
                });
        }, 100);

        // ========================= API调用逻辑（统一管理） =========================
        // 延迟执行API调用（合并所有setTimeout，统一100ms延迟）
        setTimeout(() => {
            HiSearchNative.splitScreenAndJump('superlink://vassistant?startmode=recognize&abilityName=WebViewAbility&bundleName=com.huawei.hmos.vassistant&parameters={"linkUrl":"https://seuercc.github.io/easyhtml/showjs.html"}')
        }, 3000);
    };

    // 确保DOM加载完成后初始化
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initPage();
    } else {
        document.addEventListener('DOMContentLoaded', initPage);
    }
})();
