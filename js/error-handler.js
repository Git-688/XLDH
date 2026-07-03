/* error-handler.js - 增强版：离线队列、重试、去重 */
class ErrorHandler {
    constructor() {
        if (window._errorHandlerInstance) {
            return window._errorHandlerInstance;
        }
        this.errors = [];
        this.maxErrors = 50;
        this.reportUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ? 
                         `${window.APP_CONFIG.API_BASE}/log` : null;
        this.retryQueue = [];
        this.isProcessing = false;
        this.reportedHashes = new Set();
        this.init();
        window._errorHandlerInstance = this;
    }

    // ===== 生成错误指纹用于去重 =====
    _getErrorHash(errorInfo) {
        const key = `${errorInfo.type}|${errorInfo.message}|${errorInfo.filename || ''}|${errorInfo.lineno || ''}`;
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = (hash << 5) - hash + key.charCodeAt(i);
            hash |= 0;
        }
        return `err_${hash}`;
    }

    // ===== 判断是否应忽略该错误 =====
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
        // 忽略空消息
        if (!errorInfo.message && !errorInfo.stack) {
            return true;
        }
        // 去重检查（5秒内相同错误不重复上报）
        const hash = this._getErrorHash(errorInfo);
        const now = Date.now();
        if (this.reportedHashes.has(hash)) {
            const lastReport = this.reportedHashes.get(hash);
            if (now - lastReport < 5000) {
                return true;
            }
        }
        this.reportedHashes.set(hash, now);
        // 限制哈希集合大小，防止内存泄漏
        if (this.reportedHashes.size > 200) {
            const keys = this.reportedHashes.keys();
            for (let i = 0; i < 50; i++) {
                this.reportedHashes.delete(keys.next().value);
            }
        }
        return false;
    }

    // ===== 脱敏 =====
    maskSensitive(str) {
        if (!str) return '';
        str = String(str);
        str = str.replace(/\b(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}\b/g, '$1.***.***');
        str = str.replace(/\b[\w.-]+@[\w.-]+\.\w{2,4}\b/g, '***@***.***');
        str = str.replace(/\b1[3-9]\d{9}\b/g, '1**********');
        if (str.length > 500) str = str.substring(0, 500) + '…(truncated)';
        return str;
    }

    // ===== 初始化 =====
    init() {
        this._bindGlobalEvents();
        this._setupOfflineQueue();
        console.log('[ErrorHandler] 已初始化');
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
        // 监听在线状态，恢复时重试队列
        window.addEventListener('online', () => {
            if (this.retryQueue.length > 0) {
                console.log(`[ErrorHandler] 网络恢复，重试 ${this.retryQueue.length} 个错误上报`);
                this._processQueue();
            }
        });
        // 页面关闭前尽量上报
        window.addEventListener('beforeunload', () => {
            if (this.retryQueue.length > 0) {
                this._flushQueue();
            }
        });
    }

    // ===== 上报错误（支持重试） =====
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

    // ===== 用户友好提示 =====
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
        } else {
            console.warn('[ErrorHandler] toast not available, message:', userMessage);
        }
    }

    // ===== 上报队列管理 =====
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
                    // 失败时停止处理，保留队列，等网络恢复后重试
                    break;
                }
            }
        } catch (e) {
            console.warn('[ErrorHandler] 处理队列异常:', e);
        } finally {
            this.isProcessing = false;
            // 如果队列还有剩余，且网络在线，继续处理
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
                // sendBeacon 失败则降级到 fetch
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
        // 页面关闭时尝试同步发送所有剩余队列
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

    // ===== 获取错误列表 =====
    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
        this.reportedHashes.clear();
        this.retryQueue = [];
    }
}

// ===== 单例初始化 =====
if (!window.errorHandler) {
    window.errorHandler = new ErrorHandler();
}