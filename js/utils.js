(function(window) {
    const Utils = {};

    Utils.escapeHtml = function(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    };

    Utils.formatViews = function(views) {
        if (views >= 1000000) return (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (views >= 1000) return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(views);
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
        } catch { return false; }
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

    Utils.isWebPSupportedSync = function() {
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
        if (originalUrl.match(/\.webp$/i) || originalUrl.match(/\.svg$/i) || originalUrl.startsWith('data:')) return originalUrl;
        const apiBase = Utils.getApiBase();
        let params = `url=${encodeURIComponent(originalUrl)}&quality=${quality}`;
        if (width) params += `&width=${width}`;
        if (height) params += `&height=${height}`;
        return `${apiBase}/image-proxy?${params}`;
    };

    Utils.handleApiError = function(error, defaultMessage = '操作失败，请稍后重试', showToast = true) {
        let message = defaultMessage;
        if (error?.message) {
            if (error.message.includes('fetch') || error.message.includes('network')) message = '网络连接异常，请检查网络后重试';
            else if (error.message.includes('timeout')) message = '请求超时，请稍后重试';
            else if (error.message.includes('401') || error.message.includes('403')) message = '权限不足，请重新登录';
            else message = error.message;
        }
        if (showToast && window.toast?.show) window.toast.show(message, 'error');
    };

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
            if (error.name === 'AbortError') throw new Error('请求超时');
            throw error;
        }
    };

    Utils.getApiBase = function() {
        return (window.APP_CONFIG?.API_BASE) || 'https://api.xjdh688.ccwu.cc';
    };

    Utils.getWalineServer = function() {
        return (window.APP_CONFIG?.WALINE_SERVER) || 'https://yy688.ccwu.cc';
    };

    // 常用别名
    Utils.showToast = function(msg, type = 'info') {
        if (window.toast?.show) window.toast.show(msg, type);
    };

    Utils.checkUrl = function(url) {
        try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
    };

    Utils.autoResizeTextarea = function(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    };

    Utils.normalizeUrl = function(url) {
        if (!url) return '';
        try {
            return url.toLowerCase().trim()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .replace(/\/$/, '');
        } catch { return url; }
    };

    Utils.isValidEmail = function(email) {
        return /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(email);
    };

    window.Utils = Utils;
})(window);