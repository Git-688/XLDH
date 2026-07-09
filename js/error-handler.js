/* error-handler.js - 修复版：确保 reportedHashes 始终为 Set */
class ErrorHandler {
    constructor() {
        // 确保单例
        if (window._errorHandlerInstance) {
            // 如果旧实例存在，但 reportedHashes 不是 Set，则修复
            if (!(window._errorHandlerInstance.reportedHashes instanceof Set)) {
                window._errorHandlerInstance.reportedHashes = new Set();
            }
            return window._errorHandlerInstance;
        }
        
        this.errors = [];
        this.maxErrors = 50;
        this.reportUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ? 
                         `${window.APP_CONFIG.API_BASE}/log` : null;
        this.retryQueue = [];
        this.isProcessing = false;
        // ===== 强制初始化为 Set =====
        this.reportedHashes = new Set();
        this.init();
        window._errorHandlerInstance = this;
    }

    _getErrorHash(errorInfo) {
        const key = `${errorInfo.type}|${errorInfo.message}|${errorInfo.filename || ''}|${errorInfo.lineno || ''}`;
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
        if (errorInfo.type === 'resource' && errorInfo.src) {
            const ignoreDomains = [
                'favicon.yandex.net',
                'icon.horse',
                'api.71xk.com',
                'bing.biturl.top',
                'pearapi.ai',
                'yunzhiapi.cn'
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
        
        // ===== 防御性检查 =====
        if (!(this.reportedHashes instanceof Set)) {
            this.reportedHashes = new Set();
        }
        
        const hash = this._getErrorHash(errorInfo);
        const now = Date.now();
        
        if (this.reportedHashes.has(hash)) {
            const lastReport = this.reportedHashes.get(hash);
            if (now - lastReport < 5000) {
                return true;
            }
        }
        this.reportedHashes.set(hash, now);
        if (this.reportedHashes.size > 200) {
            const keys = this.reportedHashes.keys();
            for (let i = 0; i < 50; i++) {
                const key = keys.next().value;
                if (key) this.reportedHashes.delete(key);
            }
        }
        return false;
    }

    maskSensitive(str) {
        if (!str) return '';
        str = String(str);
        str = str.replace(/\b(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}\b/g, '$1.***.***');
        str = str.replace(/\b[\w.-]+@[\w.-]+\.\w{2,4}\b/g, '***@***.***');
        str = str.replace(/\b1[3-9]\d{9}\b/g, '1**********');
        if (str.length > 500) str = str.substring(0, 500) + '…(truncated)';
        return str;
    }

    init() {
        this._bindGlobalEvents();
        this._setupOfflineQueue();
    }

    _bindGlobalEvents() {
        window.addEventListener('error', (event) => {
            const target = event.target;
            if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                const src = target.src || target.href;
                if (src) {
                    this.handleError({
                        type: 'resource',
                        tag: target.tagName,
                        src: this.maskSensitive(src),
                        message: `Failed to load ${target.tagName}: ${src}`,
                        timestamp: Date.now()
                    });
                } else {
                    this.handleError({
                        type: 'resource',
                        tag: target.tagName,
                        message: 'Resource load failed (no src/href)',
                        timestamp: Date.now()
                    });
                }
                return;
            }
            const { message, filename, lineno, colno, error } = event;
            if (message === 'Script error.' || message === 'Script error') return;
            this.handleError({
                type: 'error',
                message: this.maskSensitive(message),
                filename: this.maskSensitive(filename),
                lineno,
                colno,
                stack: error ? this.maskSensitive(error.stack) : undefined,
                timestamp: Date.now()
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            this.handleError({
                type: 'unhandledrejection',
                message: reason?.message ? this.maskSensitive(reason.message) : this.maskSensitive(String(reason)),
                stack: reason?.stack ? this.maskSensitive(reason.stack) : undefined,
                timestamp: Date.now()
            });
        });
    }

    _setupOfflineQueue() {
        window.addEventListener('online', () => {
            if (this.retryQueue.length > 0) {
                this._processQueue();
            }
        });
        window.addEventListener('beforeunload', () => {
            if (this.retryQueue.length > 0) {
                this._flushQueue();
            }
        });
    }

    report(error, module = 'unknown') {
        let errorInfo;
        if (error instanceof Error) {
            errorInfo = {
                type: 'manual',
                module,
                message: this.maskSensitive(error.message),
                stack: this.maskSensitive(error.stack),
                timestamp: Date.now()
            };
        } else {
            errorInfo = {
                type: 'manual',
                module,
                details: this.maskSensitive(JSON.stringify(error)),
                timestamp: Date.now()
            };
        }
        this.handleError(errorInfo);
    }

    handleError(errorInfo) {
        if (this.shouldIgnore(errorInfo)) return;
        if (this.errors.length >= this.maxErrors) this.errors.shift();
        this.errors.push(errorInfo);
        console.error('[ErrorHandler]', errorInfo);
        this.showUserFriendlyMessage(errorInfo);
        this.enqueueReport(errorInfo);
    }

    showUserFriendlyMessage(errorInfo) {
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
        } else if (errorInfo.type === 'resource' && errorInfo.tag === 'IMG') {
            return;
        } else {
            return;
        }

        if (window.toast && typeof window.toast.show === 'function') {
            window.toast.show(userMessage, 'error', 5000);
        }
    }

    enqueueReport(errorInfo) {
        if (!this.reportUrl) return;
        const safeInfo = this._preparePayload(errorInfo);
        this.retryQueue.push(safeInfo);
        this._processQueue();
    }

    async _processQueue() {
        if (this.isProcessing || this.retryQueue.length === 0) return;
        this.isProcessing = true;
        try {
            while (this.retryQueue.length > 0) {
                const item = this.retryQueue[0];
                const success = await this._sendReport(item);
                if (success) {
                    this.retryQueue.shift();
                } else {
                    break;
                }
            }
        } catch (e) {
            console.warn('[ErrorHandler] 处理队列异常:', e);
        } finally {
            this.isProcessing = false;
            if (this.retryQueue.length > 0 && navigator.onLine) {
                setTimeout(() => this._processQueue(), 2000);
            }
        }
    }

    async _sendReport(payload, retries = 3) {
        try {
            if (navigator.sendBeacon) {
                const sent = navigator.sendBeacon(this.reportUrl, JSON.stringify(payload));
                if (sent) return true;
            }
            const response = await fetch(this.reportUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            });
            return response.ok;
        } catch (e) {
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 1000 * (4 - retries)));
                return this._sendReport(payload, retries - 1);
            }
            return false;
        }
    }

    _preparePayload(errorInfo) {
        return {
            ...errorInfo,
            message: this.maskSensitive(errorInfo.message || ''),
            stack: this.maskSensitive(errorInfo.stack || ''),
            filename: this.maskSensitive(errorInfo.filename || ''),
            details: this.maskSensitive(errorInfo.details || ''),
            src: this.maskSensitive(errorInfo.src || ''),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
    }

    _flushQueue() {
        while (this.retryQueue.length > 0) {
            const item = this.retryQueue.shift();
            if (navigator.sendBeacon) {
                navigator.sendBeacon(this.reportUrl, JSON.stringify(item));
            } else {
                fetch(this.reportUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item),
                    keepalive: true
                }).catch(() => {});
            }
        }
    }

    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
        this.reportedHashes.clear();
        this.retryQueue = [];
    }
}

if (!window.errorHandler) {
    window.errorHandler = new ErrorHandler();
}