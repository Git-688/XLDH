/* error-handler.js - 优化版：节流上报、过滤无关错误、批量上报 */
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
        this.reportedHashes = new Map(); // 存储错误hash和上次上报时间
        this.batchQueue = [];
        this.batchTimer = null;
        this.BATCH_INTERVAL = 5000; // 5秒批量上报一次
        this.BATCH_MAX_SIZE = 10;   // 最大批量上报数量
        this.HASH_EXPIRE_TIME = 30000; // 30秒内相同错误不再上报
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

    // ===== 优化：更严格的忽略规则 =====
    shouldIgnore(errorInfo) {
        // 1. 忽略空的资源错误
        if (errorInfo.type === 'resource' && !errorInfo.message && !errorInfo.stack && !errorInfo.src) {
            return true;
        }

        // 2. 忽略图片加载错误（最常见，无意义）
        if (errorInfo.type === 'resource' && errorInfo.tag === 'IMG') {
            return true;
        }

        // 3. 忽略 CSS/字体/图标加载错误
        if (errorInfo.type === 'resource' && (errorInfo.tag === 'LINK' || errorInfo.tag === 'STYLE')) {
            return true;
        }

        // 4. 忽略图标相关域名错误
        if (errorInfo.type === 'resource' && errorInfo.src) {
            const ignoreDomains = [
                'favicon.yandex.net',
                'icon.horse',
                'api.71xk.com',
                'bing.biturl.top',
                'pearapi.ai',
                'yunzhiapi.cn',
                'google.com/s2/favicons',
                'cdn.jsdelivr.net',
                'unpkg.com',
                'fonts.googleapis.com',
                'fonts.gstatic.com'
            ];
            if (ignoreDomains.some(domain => errorInfo.src.includes(domain))) {
                return true;
            }
        }

        // 5. 忽略 Script error.（跨域脚本错误）
        if (errorInfo.type === 'error' && (errorInfo.message === 'Script error.' || errorInfo.message === 'Script error')) {
            return true;
        }

        // 6. 忽略空错误
        if (!errorInfo.message && !errorInfo.stack) {
            return true;
        }

        // 7. 忽略网络错误（已由用户自行处理）
        if (errorInfo.message && (
            errorInfo.message.includes('NetworkError') ||
            errorInfo.message.includes('Failed to fetch') ||
            errorInfo.message.includes('Network request failed')
        )) {
            return true;
        }

        // ===== 节流：相同错误30秒内不再上报 =====
        const hash = this._getErrorHash(errorInfo);
        const now = Date.now();
        if (this.reportedHashes.has(hash)) {
            const lastReport = this.reportedHashes.get(hash);
            if (now - lastReport < this.HASH_EXPIRE_TIME) {
                return true;
            }
        }
        this.reportedHashes.set(hash, now);

        // 限制 Map 大小
        if (this.reportedHashes.size > 200) {
            const keys = this.reportedHashes.keys();
            for (let i = 0; i < 50; i++) {
                this.reportedHashes.delete(keys.next().value);
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
        // 启动批量上报定时器
        this._startBatchTimer();
    }

    _bindGlobalEvents() {
        window.addEventListener('error', (event) => {
            const target = event.target;
            if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                const src = target.src || target.href;
                const errorInfo = {
                    type: 'resource',
                    tag: target.tagName,
                    src: src ? this.maskSensitive(src) : '',
                    message: `Failed to load ${target.tagName}: ${src || 'unknown'}`,
                    timestamp: Date.now()
                };
                this.handleError(errorInfo);
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
            // 忽略空拒绝
            if (!reason) return;
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
            // 恢复批量上报
            this._startBatchTimer();
        });
        window.addEventListener('offline', () => {
            this._stopBatchTimer();
        });
        window.addEventListener('beforeunload', () => {
            this._flushQueue();
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

        // 限制内存中的错误数量
        if (this.errors.length >= this.maxErrors) this.errors.shift();
        this.errors.push(errorInfo);

        // 控制台输出（仅开发环境或调试模式）
        if (window.location.search.includes('debug=1') || localStorage.getItem('debug_mode') === 'true') {
            console.error('[ErrorHandler]', errorInfo);
        }

        this.showUserFriendlyMessage(errorInfo);
        this.addToBatchQueue(errorInfo);
    }

    // ===== 批量上报队列 =====
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
                // 如果失败，放回队列
                this.batchQueue = [...batch, ...this.batchQueue];
                if (this.batchQueue.length > this.BATCH_MAX_SIZE * 3) {
                    this.batchQueue = this.batchQueue.slice(-this.BATCH_MAX_SIZE * 2);
                }
            }
        } catch (e) {
            // 失败时放回队列
            this.batchQueue = [...batch, ...this.batchQueue];
            if (this.batchQueue.length > this.BATCH_MAX_SIZE * 3) {
                this.batchQueue = this.batchQueue.slice(-this.BATCH_MAX_SIZE * 2);
            }
        }
    }

    showUserFriendlyMessage(errorInfo) {
        // 减少用户提示频率
        if (window._lastErrorTime && Date.now() - window._lastErrorTime < 10000) return;
        window._lastErrorTime = Date.now();

        let userMessage = '';
        if (errorInfo.type === 'resource' && errorInfo.tag === 'SCRIPT') {
            userMessage = '加载脚本失败，请检查网络后重试。';
        } else if (errorInfo.type === 'unhandledrejection') {
            // 不显示用户提示，静默处理
            return;
        } else {
            return;
        }

        if (window.toast && typeof window.toast.show === 'function') {
            window.toast.show(userMessage, 'error', 5000);
        }
    }

    enqueueReport(errorInfo) {
        // 已改用批量上报，此方法保留兼容
        this.addToBatchQueue(errorInfo);
    }

    async _processQueue() {
        // 批量上报已替代队列处理，此方法保留兼容
        if (this.batchQueue.length > 0) {
            this._flushBatchQueue();
        }
    }

    async _sendReport(payload, retries = 3) {
        // 已改用批量上报，此方法保留兼容
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
        // 已改用批量上报，此方法保留兼容
        this._flushBatchQueue();
    }

    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
        this.reportedHashes.clear();
        this.retryQueue = [];
        this.batchQueue = [];
        this._stopBatchTimer();
    }

    // ===== 调试方法 =====
    getStats() {
        return {
            totalErrors: this.errors.length,
            reportedHashes: this.reportedHashes.size,
            batchQueueSize: this.batchQueue.length,
            isProcessing: this.isProcessing,
            reportUrl: this.reportUrl
        };
    }

    // ===== 强制刷新上报 =====
    forceReport() {
        this._flushBatchQueue();
    }

    // ===== 设置调试模式 =====
    setDebugMode(enabled) {
        if (enabled) {
            localStorage.setItem('debug_mode', 'true');
        } else {
            localStorage.removeItem('debug_mode');
        }
    }
}

// 单例初始化
if (!window.errorHandler) {
    window.errorHandler = new ErrorHandler();
}

// 暴露全局方法
window.getErrorStats = function() {
    if (window.errorHandler) {
        return window.errorHandler.getStats();
    }
    return null;
};

window.forceReportErrors = function() {
    if (window.errorHandler) {
        window.errorHandler.forceReport();
    }
};

window.clearErrorLogs = function() {
    if (window.errorHandler) {
        window.errorHandler.clearErrors();
    }
};