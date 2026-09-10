/* error-handler.js - 统一错误处理（分类 + 去重 + 批量上报） */
(function(window) {
    'use strict';

    // ===== 错误码 =====
    const ErrorCodes = {
        NETWORK: 'NETWORK_ERROR',
        TIMEOUT: 'TIMEOUT',
        UNAUTHORIZED: 'UNAUTHORIZED',
        FORBIDDEN: 'FORBIDDEN',
        NOT_FOUND: 'NOT_FOUND',
        RATE_LIMITED: 'RATE_LIMITED',
        SERVER_ERROR: 'SERVER_ERROR',
        VALIDATION: 'VALIDATION_ERROR',
        UNKNOWN: 'UNKNOWN_ERROR'
    };

    // ===== 错误消息映射 =====
    const ErrorMessages = {
        [ErrorCodes.NETWORK]: '网络连接异常，请检查网络后重试',
        [ErrorCodes.TIMEOUT]: '请求超时，请稍后重试',
        [ErrorCodes.UNAUTHORIZED]: '登录已过期，请重新登录',
        [ErrorCodes.FORBIDDEN]: '权限不足，无法访问',
        [ErrorCodes.NOT_FOUND]: '请求的资源不存在',
        [ErrorCodes.RATE_LIMITED]: '请求过于频繁，请稍后再试',
        [ErrorCodes.SERVER_ERROR]: '服务器错误，请稍后重试',
        [ErrorCodes.VALIDATION]: '输入内容有误，请检查后重试',
        [ErrorCodes.UNKNOWN]: '未知错误，请稍后重试'
    };

    class ErrorHandler {
        constructor() {
            if (window._errorHandlerInstance) return window._errorHandlerInstance;

            this.reportUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE)
                ? `${window.APP_CONFIG.API_BASE}/log`
                : null;

            this.errors = [];
            this.maxErrors = 50;
            this.reportedHashes = new Map();
            this.HASH_EXPIRE_TIME = 30000;

            this.batchQueue = [];
            this.BATCH_MAX_SIZE = 10;
            this.BATCH_INTERVAL = 5000;
            this.batchTimer = null;

            // ===== 会话 ID 与用户操作记录 =====
            this.sessionId = this._getSessionId();
            this.userActions = [];
            this.maxActions = 20;

            this.init();
            window._errorHandlerInstance = this;
        }

        _getSessionId() {
            let sid = sessionStorage.getItem('error_session_id');
            if (!sid) {
                sid = 'sid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem('error_session_id', sid);
            }
            return sid;
        }

        recordUserAction(action) {
            this.userActions.push({ action, time: Date.now() });
            if (this.userActions.length > this.maxActions) {
                this.userActions.shift();
            }
        }

        // ===== 错误分类 =====
        classify(error) {
            if (!error) return ErrorCodes.UNKNOWN;
            const msg = String(error.message || error).toLowerCase();
            if (msg.includes('timeout') || msg.includes('abort')) return ErrorCodes.TIMEOUT;
            if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) return ErrorCodes.NETWORK;
            if (msg.includes('401') || msg.includes('unauthorized')) return ErrorCodes.UNAUTHORIZED;
            if (msg.includes('403') || msg.includes('forbidden')) return ErrorCodes.FORBIDDEN;
            if (msg.includes('404') || msg.includes('not found')) return ErrorCodes.NOT_FOUND;
            if (msg.includes('429') || msg.includes('rate limit')) return ErrorCodes.RATE_LIMITED;
            if (msg.includes('500') || msg.includes('server error')) return ErrorCodes.SERVER_ERROR;
            if (error.code === 'VALIDATION_ERROR') return ErrorCodes.VALIDATION;
            return ErrorCodes.UNKNOWN;
        }

        _getErrorHash(errorInfo) {
            const key = `${errorInfo.type || ''}|${errorInfo.code || ''}|${errorInfo.message || ''}|${errorInfo.filename || ''}|${errorInfo.lineno || ''}`;
            let hash = 0;
            for (let i = 0; i < key.length; i++) {
                hash = (hash << 5) - hash + key.charCodeAt(i);
                hash |= 0;
            }
            return `err_${hash}`;
        }

        shouldIgnore(errorInfo) {
            if (errorInfo.type === 'resource' && !errorInfo.message && !errorInfo.stack && !errorInfo.src) {
                return true;
            }
            if (errorInfo.type === 'resource' && errorInfo.tag === 'IMG') {
                return true;
            }
            if (errorInfo.type === 'resource' && (errorInfo.tag === 'LINK' || errorInfo.tag === 'STYLE')) {
                return true;
            }
            if (errorInfo.type === 'resource' && errorInfo.src) {
                const ignoreDomains = [
                    'favicon.yandex.net', 'icon.horse', 'api.71xk.com', 'bing.biturl.top',
                    'pearapi.ai', 'yunzhiapi.cn', 'google.com/s2/favicons',
                    'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'
                ];
                if (ignoreDomains.some(domain => errorInfo.src.includes(domain))) {
                    return true;
                }
            }
            if (errorInfo.type === 'error' && (errorInfo.message === 'Script error.' || errorInfo.message === 'Script error')) {
                return true;
            }
            if (!errorInfo.message && !errorInfo.stack) {
                return true;
            }
            if (errorInfo.message && (
                errorInfo.message.includes('NetworkError') ||
                errorInfo.message.includes('Failed to fetch') ||
                errorInfo.message.includes('Network request failed')
            )) {
                return true;
            }

            const hash = this._getErrorHash(errorInfo);
            const now = Date.now();
            if (this.reportedHashes.has(hash)) {
                const lastReport = this.reportedHashes.get(hash);
                if (now - lastReport < this.HASH_EXPIRE_TIME) {
                    return true;
                }
            }
            this.reportedHashes.set(hash, now);
            if (this.reportedHashes.size > 200) {
                const keys = this.reportedHashes.keys();
                for (let i = 0; i < 50; i++) {
                    this.reportedHashes.delete(keys.next().value);
                }
            }
            return false;
        }

        init() {
            this._bindGlobalEvents();
            this._setupOfflineQueue();
            this._startBatchTimer();
        }

        _bindGlobalEvents() {
            window.addEventListener('error', (event) => {
                const target = event.target;
                if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                    const src = target.src || target.href;
                    this.handleError({
                        type: 'resource',
                        tag: target.tagName,
                        src: src ? this._mask(src) : '',
                        message: `Failed to load ${target.tagName}: ${src || 'unknown'}`,
                        timestamp: Date.now()
                    });
                    return;
                }
                const { message, filename, lineno, colno, error } = event;
                if (message === 'Script error.' || message === 'Script error') return;
                this.handleError({
                    type: 'error',
                    code: this.classify(error || new Error(message)),
                    message: this._mask(message),
                    filename: this._mask(filename),
                    lineno,
                    colno,
                    stack: error ? this._mask(error.stack) : undefined,
                    timestamp: Date.now()
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                const reason = event.reason;
                if (!reason) return;
                this.handleError({
                    type: 'unhandledrejection',
                    code: this.classify(reason),
                    message: reason?.message ? this._mask(reason.message) : this._mask(String(reason)),
                    stack: reason?.stack ? this._mask(reason.stack) : undefined,
                    timestamp: Date.now()
                });
            });
        }

        _mask(str) {
            if (!str) return '';
            if (window.Utils && typeof window.Utils.maskSensitive === 'function') {
                return window.Utils.maskSensitive(str);
            }
            return String(str);
        }

        _setupOfflineQueue() {
            window.addEventListener('online', () => {
                if (this.batchQueue.length > 0) this._flushBatchQueue();
                this._startBatchTimer();
            });
            window.addEventListener('offline', () => {
                this._stopBatchTimer();
            });
            window.addEventListener('beforeunload', () => {
                this._flushBatchQueue();
            });
        }

        _startBatchTimer() {
            if (this.batchTimer) return;
            this.batchTimer = setInterval(() => {
                if (this.batchQueue.length > 0 && navigator.onLine) {
                    this._flushBatchQueue();
                }
            }, this.BATCH_INTERVAL);
        }

        _stopBatchTimer() {
            if (this.batchTimer) {
                clearInterval(this.batchTimer);
                this.batchTimer = null;
            }
        }

        // ===== 统一上报入口 =====
        report(error, module = 'unknown') {
            let errorInfo;
            if (error instanceof Error) {
                errorInfo = {
                    type: 'manual',
                    module,
                    code: this.classify(error),
                    message: this._mask(error.message),
                    stack: this._mask(error.stack),
                    timestamp: Date.now()
                };
            } else {
                errorInfo = {
                    type: 'manual',
                    module,
                    code: this.classify(error),
                    details: this._mask(JSON.stringify(error)),
                    timestamp: Date.now()
                };
            }
            this.handleError(errorInfo);
        }

        // ===== 兼容原接口 =====
        reportError(error, module = 'unknown') {
            return this.report(error, module);
        }

        handleError(errorInfo) {
            if (this.shouldIgnore(errorInfo)) return;

            const code = errorInfo.code || this.classify(errorInfo);
            const message = errorInfo.message || ErrorMessages[code];

            if (this.errors.length >= this.maxErrors) this.errors.shift();
            this.errors.push(errorInfo);

            // 调试模式输出
            if (localStorage.getItem('debug_mode') === 'true' ||
                window.location.search.includes('debug=1')) {
                console.warn('[ErrorHandler]', errorInfo);
            }

            // 用户提示（节流：5秒内只弹一次）
            const now = Date.now();
            if (!window._lastErrorToastTime || (now - window._lastErrorToastTime) > 5000) {
                window._lastErrorToastTime = now;
                if (window.toast && typeof window.toast.show === 'function') {
                    window.toast.show(ErrorMessages[code] || message, 'error');
                }
            }

            this.addToBatchQueue(errorInfo);
        }

        addToBatchQueue(errorInfo) {
            if (!this.reportUrl) return;
            const safeInfo = this._preparePayload(errorInfo);
            this.batchQueue.push(safeInfo);
            if (this.batchQueue.length >= this.BATCH_MAX_SIZE) {
                this._flushBatchQueue();
            }
        }

        async _flushBatchQueue() {
            if (this.batchQueue.length === 0 || !navigator.onLine) return;
            const batch = [...this.batchQueue];
            this.batchQueue = [];
            try {
                const payload = {
                    errors: batch,
                    count: batch.length,
                    timestamp: Date.now(),
                    url: window.location.href,
                    userAgent: navigator.userAgent
                };
                if (navigator.sendBeacon) {
                    const sent = navigator.sendBeacon(this.reportUrl, JSON.stringify(payload));
                    if (sent) return;
                }
                const response = await fetch(this.reportUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true
                });
                if (!response.ok) {
                    this.batchQueue = [...batch, ...this.batchQueue];
                    if (this.batchQueue.length > this.BATCH_MAX_SIZE * 3) {
                        this.batchQueue = this.batchQueue.slice(-this.BATCH_MAX_SIZE * 2);
                    }
                }
            } catch (e) {
                this.batchQueue = [...batch, ...this.batchQueue];
                if (this.batchQueue.length > this.BATCH_MAX_SIZE * 3) {
                    this.batchQueue = this.batchQueue.slice(-this.BATCH_MAX_SIZE * 2);
                }
            }
        }

        _preparePayload(errorInfo) {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const network = {
                online: navigator.onLine,
                connection: conn ? {
                    type: conn.effectiveType || 'unknown',
                    downlink: conn.downlink || null,
                    rtt: conn.rtt || null
                } : null
            };
            const recentActions = this.userActions.slice(-5);
            return {
                ...errorInfo,
                sessionId: this.sessionId,
                userActions: recentActions,
                network: network,
                message: this._mask(errorInfo.message || ''),
                stack: this._mask(errorInfo.stack || ''),
                filename: this._mask(errorInfo.filename || ''),
                details: this._mask(errorInfo.details || ''),
                src: this._mask(errorInfo.src || ''),
                url: window.location.href,
                userAgent: navigator.userAgent
            };
        }

        getErrors() {
            return [...this.errors];
        }

        clearErrors() {
            this.errors = [];
            this.reportedHashes.clear();
            this.batchQueue = [];
            this._stopBatchTimer();
        }

        getStats() {
            return {
                totalErrors: this.errors.length,
                reportedHashes: this.reportedHashes.size,
                batchQueueSize: this.batchQueue.length,
                reportUrl: this.reportUrl
            };
        }

        forceReport() {
            this._flushBatchQueue();
        }

        setDebugMode(enabled) {
            if (enabled) localStorage.setItem('debug_mode', 'true');
            else localStorage.removeItem('debug_mode');
        }
    }

    // 单例初始化
    if (!window.errorHandler) {
        window.errorHandler = new ErrorHandler();
    }

    window.getErrorStats = function() {
        return window.errorHandler ? window.errorHandler.getStats() : null;
    };

    window.forceReportErrors = function() {
        if (window.errorHandler) window.errorHandler.forceReport();
    };

    window.clearErrorLogs = function() {
        if (window.errorHandler) window.errorHandler.clearErrors();
    };

})(window);