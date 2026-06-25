/* utils.js - 增强错误处理（统一 handleApiError，增加重试机制） */
(function(window) {
    const Utils = {};

    Utils.escapeHtml = function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    Utils.formatViews = function(views) {
        if (views >= 1000000) return (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (views >= 1000) return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return views.toString();
    };

    Utils.formatTime = function(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
    };

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

    Utils.isValidUrl = function(url) {
        try {
            const testUrl = url.startsWith('http') ? url : 'https://' + url;
            return ['http:', 'https:'].includes(new URL(testUrl).protocol);
        } catch {
            return false;
        }
    };

    Utils.generateId = function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    };

    Utils.isMobile = function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    Utils.getDeviceId = function() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    };

    Utils.deepClone = function(obj) {
        return JSON.parse(JSON.stringify(obj));
    };

    Utils.setCookie = function(name, value, days) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + (value || '') + expires + '; path=/';
    };

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

    let _webpSupported = null;
    let _webpPromise = null;

    Utils.isWebPSupported = function() {
        if (_webpSupported !== null) return Promise.resolve(_webpSupported);
        if (_webpPromise) return _webpPromise;
        _webpPromise = new Promise((resolve) => {
            if (!window.createImageBitmap) {
                _webpSupported = false;
                resolve(false);
                return;
            }
            const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
            fetch(webpData).then(response => response.blob()).then(blob => {
                return createImageBitmap(blob);
            }).then(() => {
                _webpSupported = true;
                resolve(true);
            }).catch(() => {
                _webpSupported = false;
                resolve(false);
            });
        });
        return _webpPromise;
    };

    Utils.isWebPSupportedSync = function() {
        if (_webpSupported !== null) return _webpSupported;
        const ua = navigator.userAgent;
        if (/Chrome/.test(ua) && !/Edge/.test(ua)) {
            const version = parseInt(ua.match(/Chrome\/(\d+)/)?.[1] || '0');
            if (version >= 32) return true;
        }
        if (/Edge/.test(ua)) {
            const version = parseInt(ua.match(/Edge\/(\d+)/)?.[1] || '0');
            if (version >= 18) return true;
        }
        if (/Opera/.test(ua)) {
            const version = parseInt(ua.match(/Opera\/(\d+)/)?.[1] || '0');
            if (version >= 19) return true;
        }
        if (/Android/.test(ua)) {
            const version = parseInt(ua.match(/Android\s(\d+)/)?.[1] || '0');
            if (version >= 4.0) return true;
        }
        if (/Firefox/.test(ua)) {
            const version = parseInt(ua.match(/Firefox\/(\d+)/)?.[1] || '0');
            if (version >= 65) return true;
        }
        if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
            const version = parseInt(ua.match(/Version\/(\d+)/)?.[1] || '0');
            if (version >= 14) return true;
        }
        return false;
    };

    Utils.toWebPUrl = function(originalUrl, quality = 80, width = null, height = null) {
        if (!originalUrl) return originalUrl;
        if (originalUrl.match(/\.webp$/i) || originalUrl.match(/\.svg$/i)) {
            return originalUrl;
        }
        if (originalUrl.startsWith('data:')) {
            return originalUrl;
        }
        const apiBase = Utils.getApiBase();
        let params = `url=${encodeURIComponent(originalUrl)}&quality=${quality}`;
        if (width) params += `&width=${width}`;
        if (height) params += `&height=${height}`;
        return `${apiBase}/image-proxy?${params}`;
    };

    // ===== 统一错误处理（核心优化） =====
    const C = window.APP_CONSTANTS || {
        API: { RETRY_COUNT: 2, RETRY_DELAY: 500, BASE_TIMEOUT: 15000 }
    };

    Utils.handleApiError = function(error, defaultMessage = '操作失败，请稍后重试', showToast = true) {
        console.error('[API Error]', error);
        let message = defaultMessage;
        if (error && error.message) {
            if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
                message = '网络连接异常，请检查网络后重试';
            } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                message = '请求超时，请稍后重试';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                message = '权限不足，请重新登录';
            } else if (error.message.includes('503')) {
                message = '服务暂时不可用，请稍后重试';
            } else if (error.message.includes('429')) {
                message = '请求过于频繁，请稍后再试';
            } else {
                message = error.message;
            }
        }
        if (showToast && window.toast && typeof window.toast.show === 'function') {
            window.toast.show(message, 'error');
        }
        // 上报到服务器
        const apiBase = Utils.getApiBase();
        if (apiBase) {
            try {
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
            } catch (_) {}
        }
        return message;
    };

    // ===== 带重试的 fetch =====
    Utils.safeFetch = async function(url, options = {}) {
        const maxRetries = options.retries || C.API.RETRY_COUNT || 2;
        const retryDelay = options.retryDelay || C.API.RETRY_DELAY || 500;
        const timeout = options.timeout || C.API.BASE_TIMEOUT || 15000;
        let lastError = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    const errorText = await response.text().catch(() => '');
                    throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 100)}`);
                }
                return response;
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries && !options._noRetry) {
                    await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
                    continue;
                }
                break;
            }
        }
        throw lastError || new Error('请求失败');
    };

    // ===== 不显示 Toast 的静默 fetch（用于后台任务） =====
    Utils.safeFetchSilent = async function(url, options = {}) {
        try {
            return await Utils.safeFetch(url, { ...options, _noRetry: true });
        } catch (error) {
            console.warn('[Silent Fetch]', error.message);
            return null;
        }
    };

    // ===== 统一错误边界（用于模块） =====
    Utils.wrapAsync = function(fn, fallback = null, errorMessage = '操作失败') {
        return async function(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                Utils.handleApiError(error, errorMessage, true);
                return fallback !== null ? (typeof fallback === 'function' ? fallback() : fallback) : null;
            }
        };
    };

    // ===== 全局错误监听器（在 main.js 中调用） =====
    Utils.setupGlobalErrorHandler = function() {
        if (window._errorHandlerSetup) return;
        window._errorHandlerSetup = true;

        const shouldIgnore = (message) => {
            const m = String(message || '');
            return m === 'Script error.' || m === 'null' || m === 'undefined' || m.trim() === '';
        };

        const handleError = (event) => {
            const msg = event.message || (event.error && event.error.message) || '';
            if (shouldIgnore(msg)) return;
            const error = event.error || event.reason;
            const errorMessage = error?.message || msg || '未知错误';
            if (shouldIgnore(errorMessage)) return;
            console.error('[Global Error]', errorMessage);
            // 显示用户友好提示（防刷屏）
            if (!window._lastErrorTime || Date.now() - window._lastErrorTime > 5000) {
                window._lastErrorTime = Date.now();
                if (window.toast && typeof window.toast.show === 'function') {
                    window.toast.show('页面遇到问题，建议刷新页面', 'error');
                }
            }
            // 上报错误
            const apiBase = Utils.getApiBase();
            if (apiBase) {
                try {
                    fetch(`${apiBase}/log`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'global_error',
                            message: errorMessage,
                            stack: error?.stack,
                            url: window.location.href,
                            timestamp: Date.now()
                        }),
                        keepalive: true
                    }).catch(() => {});
                } catch (_) {}
            }
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleError);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleError);
        };
    };

    // ===== 其他工具函数 =====
    Utils.getApiBase = function() {
        return (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://api.xjdh688.ccwu.cc';
    };

    Utils.getWalineServer = function() {
        return (window.APP_CONFIG && window.APP_CONFIG.WALINE_SERVER) || 'https://yy688.ccwu.cc';
    };

    window.Utils = Utils;
})(window);