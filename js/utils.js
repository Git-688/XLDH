// ==================== 通用工具函数库（含错误处理） ====================
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

    // 生成唯一 ID（用于临时标识，如音乐播放器）
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

    // ========== 全局错误捕获与上报（原 error-handler.js） ==========
    let _errors = [];
    const _maxErrors = 50;
    let _reportUrl = null;

    // 脱敏函数
    function _maskSensitive(str) {
        if (!str) return '';
        str = String(str);
        str = str.replace(/\b(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}\b/g, '$1.***.***');
        str = str.replace(/\b[\w.-]+@[\w.-]+\.\w{2,4}\b/g, '***@***.***');
        str = str.replace(/\b1[3-9]\d{9}\b/g, '1**********');
        if (str.length > 500) str = str.substring(0, 500) + '…(truncated)';
        return str;
    }

    // 判断是否应该忽略某个错误
    function _shouldIgnore(errorInfo) {
        if (errorInfo.type === 'resource' && errorInfo.tag === 'IMG') {
            const src = errorInfo.src || '';
            if (src.includes('favicon.yandex.net')) return true;
            if (src.includes('api.71xk.com')) return true;
            let origin = window.location.origin;
            if (origin.endsWith('/')) origin = origin.slice(0, -1);
            let cleanSrc = src;
            if (cleanSrc.endsWith('/')) cleanSrc = cleanSrc.slice(0, -1);
            if (cleanSrc === origin) return true;
        }
        if (errorInfo.type === 'error' && errorInfo.message === 'Script error.') return true;
        return false;
    }

    // 上报错误到服务器
    async function _reportToServer(errorInfo) {
        if (!_reportUrl) {
            _reportUrl = Utils.getApiBase() + '/log';
        }
        const safeInfo = {
            ...errorInfo,
            message: _maskSensitive(errorInfo.message || ''),
            stack: _maskSensitive(errorInfo.stack || ''),
            filename: _maskSensitive(errorInfo.filename || ''),
            details: _maskSensitive(errorInfo.details || ''),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        const payload = JSON.stringify(safeInfo);
        try {
            if (navigator.sendBeacon) {
                navigator.sendBeacon(_reportUrl, payload);
            } else {
                await fetch(_reportUrl, {
                    method: 'POST',
                    body: payload,
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true
                });
            }
        } catch (e) {
            // 静默失败，不上报也无妨
        }
    }

    // 显示用户友好的错误提示
    function _showUserFriendlyMessage(errorInfo) {
        if (window._lastErrorTime && Date.now() - window._lastErrorTime < 5000) return;
        window._lastErrorTime = Date.now();

        let userMessage = '';
        if (errorInfo.type === 'resource' && errorInfo.tag === 'SCRIPT') {
            userMessage = '加载脚本失败，请检查网络后重试。';
        } else if (errorInfo.message && errorInfo.message.includes('NetworkError')) {
            userMessage = '网络连接异常，请检查网络后重试。';
        } else if (errorInfo.message && errorInfo.message.includes('Failed to fetch')) {
            userMessage = '请求后端服务失败，请稍后重试。';
        } else if (errorInfo.type === 'unhandledrejection') {
            userMessage = '操作未能完成，请重试。';
        } else {
            return;
        }

        if (window.toast && typeof window.toast.show === 'function') {
            window.toast.show(userMessage, 'error', 5000);
        } else {
            console.warn('[ErrorHandler] toast not available, message:', userMessage);
        }
    }

    // 统一错误处理
    function _handleError(errorInfo) {
        if (_shouldIgnore(errorInfo)) return;
        if (_errors.length >= _maxErrors) _errors.shift();
        _errors.push(errorInfo);
        console.error('[ErrorHandler]', errorInfo);
        _showUserFriendlyMessage(errorInfo);
        _reportToServer(errorInfo);
    }

    // 初始化全局错误监听
    Utils.initErrorHandler = function() {
        if (Utils._errorHandlerInitialized) return;
        Utils._errorHandlerInitialized = true;

        window.addEventListener('error', (event) => {
            const { message, filename, lineno, colno, error } = event;
            if (message === 'Script error.' || message === 'Script error') return;
            _handleError({
                type: 'error',
                message: _maskSensitive(message),
                filename: _maskSensitive(filename),
                lineno,
                colno,
                stack: error ? _maskSensitive(error.stack) : undefined,
                timestamp: Date.now()
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            _handleError({
                type: 'unhandledrejection',
                message: reason?.message ? _maskSensitive(reason.message) : _maskSensitive(String(reason)),
                stack: reason?.stack ? _maskSensitive(reason.stack) : undefined,
                timestamp: Date.now()
            });
        });

        window.addEventListener('error', (event) => {
            const target = event.target;
            if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                if (target.src && target.src.includes('cloudflareinsights.com')) return;
                _handleError({
                    type: 'resource',
                    tag: target.tagName,
                    src: _maskSensitive(target.src || target.href),
                    timestamp: Date.now()
                });
            }
        }, true);
    };

    // 手动上报错误（供模块调用）
    Utils.reportError = function(error, module = 'unknown') {
        let errorInfo;
        if (error instanceof Error) {
            errorInfo = {
                type: 'manual',
                module,
                message: _maskSensitive(error.message),
                stack: _maskSensitive(error.stack),
                timestamp: Date.now()
            };
        } else {
            errorInfo = {
                type: 'manual',
                module,
                details: _maskSensitive(JSON.stringify(error)),
                timestamp: Date.now()
            };
        }
        _handleError(errorInfo);
    };

    // 获取已捕获的错误列表
    Utils.getErrors = function() {
        return [..._errors];
    };

    // 清空错误列表
    Utils.clearErrors = function() {
        _errors = [];
    };

    // ========== 存储方法（原 storage.js） ==========
    const STORAGE_PREFIX = 'starlink_';

    Utils.getStorage = function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(STORAGE_PREFIX + key);
            return item === null ? defaultValue : JSON.parse(item);
        } catch (error) {
            console.error(`获取存储数据失败 (${key}):`, error);
            return defaultValue;
        }
    };

    Utils.setStorage = function(key, value) {
        try {
            localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`设置存储数据失败 (${key}):`, error);
            return false;
        }
    };

    Utils.removeStorage = function(key) {
        try {
            localStorage.removeItem(STORAGE_PREFIX + key);
            return true;
        } catch (error) {
            console.error(`删除存储数据失败 (${key}):`, error);
            return false;
        }
    };

    Utils.clearStorage = function() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(STORAGE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('清除存储失败:', error);
            return false;
        }
    };

    Utils.getAllStorageKeys = function() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                keys.push(key.substring(STORAGE_PREFIX.length));
            }
        }
        return keys;
    };

    // 网站统计功能
    Utils.getSiteViews = function(url) {
        if (!url) return 0;
        try {
            const siteViews = this.getStorage('site_views', {});
            const normalizedUrl = this.normalizeUrl(url);
            return siteViews[normalizedUrl] || 0;
        } catch {
            return 0;
        }
    };

    Utils.incrementSiteViews = function(url) {
        if (!url) return 0;
        try {
            const normalizedUrl = this.normalizeUrl(url);
            const siteViews = this.getStorage('site_views', {});
            siteViews[normalizedUrl] = (siteViews[normalizedUrl] || 0) + 1;
            this.setStorage('site_views', siteViews);
            return siteViews[normalizedUrl];
        } catch {
            return 0;
        }
    };

    Utils.getAllSiteStats = function() {
        return this.getStorage('site_views', {});
    };

    Utils.resetAllSiteStats = function() {
        this.setStorage('site_views', {});
    };

    Utils.getPopularSites = function(limit = 10) {
        try {
            const siteViews = this.getStorage('site_views', {});
            return Object.entries(siteViews)
                .sort(([, a], [, b]) => b - a)
                .slice(0, limit)
                .map(([url, views]) => ({ url, views }));
        } catch {
            return [];
        }
    };

    Utils.getSiteStatsSummary = function() {
        try {
            const siteViews = this.getStorage('site_views', {});
            const urls = Object.keys(siteViews);
            return {
                totalSites: urls.length,
                totalViews: Object.values(siteViews).reduce((sum, views) => sum + views, 0),
                averageViews: urls.length > 0 ? 
                    Math.round(Object.values(siteViews).reduce((sum, views) => sum + views, 0) / urls.length) : 0,
                mostViewed: this.getPopularSites(1)[0] || null
            };
        } catch {
            return { totalSites: 0, totalViews: 0, averageViews: 0, mostViewed: null };
        }
    };

    Utils.normalizeUrl = function(url) {
        if (!url) return '';
        try {
            let normalized = url.toLowerCase();
            normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
            normalized = normalized.replace(/\/$/, '');
            return normalized;
        } catch {
            return url;
        }
    };

    Utils.getLinkValidity = function(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const cacheKey = `link_validity_${normalizedUrl}`;
        return this.getStorage(cacheKey, null);
    };

    Utils.setLinkValidity = function(url, valid) {
        const normalizedUrl = this.normalizeUrl(url);
        const cacheKey = `link_validity_${normalizedUrl}`;
        return this.setStorage(cacheKey, { valid, timestamp: Date.now() });
    };

    // 兼容旧 Storage 对象
    window.Storage = {
        get: Utils.getStorage.bind(Utils),
        set: Utils.setStorage.bind(Utils),
        remove: Utils.removeStorage.bind(Utils),
        clear: Utils.clearStorage.bind(Utils),
        getAllKeys: Utils.getAllStorageKeys.bind(Utils),
        getItem: Utils.getStorage.bind(Utils),
        setItem: Utils.setStorage.bind(Utils),
        getSiteViews: Utils.getSiteViews.bind(Utils),
        incrementSiteViews: Utils.incrementSiteViews.bind(Utils),
        getAllSiteStats: Utils.getAllSiteStats.bind(Utils),
        resetAllSiteStats: Utils.resetAllSiteStats.bind(Utils),
        getPopularSites: Utils.getPopularSites.bind(Utils),
        getSiteStatsSummary: Utils.getSiteStatsSummary.bind(Utils),
        normalizeUrl: Utils.normalizeUrl.bind(Utils),
        getLinkValidity: Utils.getLinkValidity.bind(Utils),
        setLinkValidity: Utils.setLinkValidity.bind(Utils)
    };

    // 自动初始化错误处理器
    Utils.initErrorHandler();

    window.Utils = Utils;
})(window);