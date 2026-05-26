// ==================== 通用工具函数库 ====================
(function(window) {
    const Utils = {};

    // HTML 转义
    Utils.escapeHtml = function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    // 格式化浏览次数
    Utils.formatViews = function(views) {
        if (views >= 1000000) return (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (views >= 1000) return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return views.toString();
    };

    // 格式化时间（秒 -> mm:ss）
    Utils.formatTime = function(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
    };

    // 防抖函数
    Utils.debounce = function(func, wait, immediate = false) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    // 节流函数
    Utils.throttle = function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    // 验证 URL 格式
    Utils.isValidUrl = function(url) {
        try {
            const testUrl = url.startsWith('http') ? url : 'https://' + url;
            return ['http:', 'https:'].includes(new URL(testUrl).protocol);
        } catch {
            return false;
        }
    };

    // 生成唯一 ID
    Utils.generateId = function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    };

    // 检测是否为移动设备
    Utils.isMobile = function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // 获取设备 ID（持久化 localStorage）
    Utils.getDeviceId = function() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    };

    // 深拷贝对象（简化版）
    Utils.deepClone = function(obj) {
        return JSON.parse(JSON.stringify(obj));
    };

    // 设置 Cookie
    Utils.setCookie = function(name, value, days) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + (value || '') + expires + '; path=/';
    };

    // 获取 Cookie
    Utils.getCookie = function(name) {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    };

    // ========== 统一错误处理 ==========
    /**
     * 统一处理 API 请求错误
     * @param {Error} error - 错误对象
     * @param {string} defaultMessage - 默认提示信息
     * @param {boolean} showToast - 是否显示 toast 提示
     */
    Utils.handleApiError = function(error, defaultMessage = '操作失败，请稍后重试', showToast = true) {
        console.error('[API Error]', error);
        let message = defaultMessage;
        if (error && error.message) {
            if (error.message.includes('fetch') || error.message.includes('network')) {
                message = '网络连接异常，请检查网络后重试';
            } else if (error.message.includes('timeout')) {
                message = '请求超时，请稍后重试';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                message = '权限不足，请重新登录';
            } else {
                message = error.message;
            }
        }
        if (showToast && window.toast && typeof window.toast.show === 'function') {
            window.toast.show(message, 'error');
        }
        // 可选：将错误上报到服务器
        const apiBase = window.APP_CONFIG?.API_BASE || '';
        if (apiBase) {
            fetch(`${apiBase}/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'api_error',
                    message: message,
                    stack: error?.stack,
                    url: window.location.href,
                    timestamp: Date.now()
                }),
                keepalive: true
            }).catch(() => {});
        }
    };

    // 包装 fetch 请求，自动处理超时和网络错误
    Utils.safeFetch = async function(url, options = {}) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 100)}`);
            }
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    };

    // 获取后端 API 基础地址（统一入口）
    Utils.getApiBase = function() {
        return (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://api.xjdh688.ccwu.cc';
    };

    // 获取 Waline 评论服务器地址
    Utils.getWalineServer = function() {
        return (window.APP_CONFIG && window.APP_CONFIG.WALINE_SERVER) || 'https://yy688.ccwu.cc';
    };

    window.Utils = Utils;
})(window);