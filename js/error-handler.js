/* error-handler.js - 精简版（节流上报、批量上报、错误过滤） */
class ErrorHandler {
    constructor() {
        if (window._errorHandlerInstance) return window._errorHandlerInstance;
        
        this.errors = [];
        this.maxErrors = 50;
        this.reportUrl = window.APP_CONFIG?.API_BASE ? `${window.APP_CONFIG.API_BASE}/log` : null;
        this.reportedHashes = new Map();
        this.batchQueue = [];
        this.batchTimer = null;
        this.BATCH_INTERVAL = 5000;
        this.BATCH_MAX_SIZE = 10;
        this.HASH_EXPIRE_TIME = 30000;
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
        // 1. 忽略空的资源错误
        if (errorInfo.type === 'resource' && !errorInfo.message && !errorInfo.stack && !errorInfo.src) return true;
        
        // 2. 忽略图片/CSS/字体/图标加载错误
        if (errorInfo.type === 'resource') {
            const ignoreTags = ['IMG', 'LINK', 'STYLE'];
            if (ignoreTags.includes(errorInfo.tag)) return true;
            
            const ignoreDomains = [
                'favicon.yandex.net', 'icon.horse', 'api.71xk.com', 'bing.biturl.top',
                'pearapi.ai', 'yunzhiapi.cn', 'google.com/s2/favicons',
                'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'
            ];
            if (errorInfo.src && ignoreDomains.some(d => errorInfo.src.includes(d))) return true;
        }
        
        // 3. 忽略 Script error（跨域脚本错误）
        if (errorInfo.type === 'error' && ['Script error.', 'Script error'].includes(errorInfo.message)) return true;
        
        // 4. 忽略空错误和网络错误
        if (!errorInfo.message && !errorInfo.stack) return true;
        if (errorInfo.message?.includes('NetworkError') || 
            errorInfo.message?.includes('Failed to fetch') || 
            errorInfo.message?.includes('Network request failed')) return true;
        
        // 5. 节流：相同错误30秒内不再上报
        const hash = this._getErrorHash(errorInfo);
        const now = Date.now();
        const lastReport = this.reportedHashes.get(hash);
        if (lastReport && now - lastReport < this.HASH_EXPIRE_TIME) return true;
        this.reportedHashes.set(hash, now);
        
        // 限制 Map 大小
        if (this.reportedHashes.size > 200) {
            const keys = this.reportedHashes.keys();
            for (let i = 0; i < 50; i++) keys.next().value && this.reportedHashes.delete(keys.next().value);
        }
        return false;
    }

    maskSensitive(str) {
        if (!str) return '';
        str = String(str)
            .replace(/\b(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}\b/g, '$1.***.***')
            .replace(/\b[\w.-]+@[\w.-]+\.\w{2,4}\b/g, '***@***.***')
            .replace(/\b1[3-9]\d{9}\b/g, '1**********');
        return str.length > 500 ? str.substring(0, 500) + '…(truncated)' : str;
    }

    init() {
        this._bindGlobalEvents();
        this._startBatchTimer();
    }

    _bindGlobalEvents() {
        window.addEventListener('error', (event) => {
            const target = event.target;
            if (target && ['IMG', 'SCRIPT', 'LINK'].includes(target.tagName)) {
                const src = target.src || target.href;
                this.handleError({
                    type: 'resource',
                    tag: target.tagName,
                    src: src ? this.maskSensitive(src) : '',
                    message: `Failed to load ${target.tagName}: ${src || 'unknown'}`,
                    timestamp: Date.now()
                });
                return;
            }
            const { message, filename, lineno, colno, error } = event;
            if (message === 'Script error.' || message === 'Script error') return;
            this.handleError({
                type: 'error',
                message: this.maskSensitive(message),
                filename: this.maskSensitive(filename),
                lineno, colno,
                stack: error ? this.maskSensitive(error.stack) : undefined,
                timestamp: Date.now()
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            if (!reason) return;
            this.handleError({
                type: 'unhandledrejection',
                message: reason?.message ? this.maskSensitive(reason.message) : this.maskSensitive(String(reason)),
                stack: reason?.stack ? this.maskSensitive(reason.stack) : undefined,
                timestamp: Date.now()
            });
        });
    }

    _startBatchTimer() {
        if (this.batchTimer) return;
        this.batchTimer = setInterval(() => {
            if (this.batchQueue.length > 0 && navigator.onLine) this._flushBatchQueue();
        }, this.BATCH_INTERVAL);
    }

    _stopBatchTimer() {
        if (this.batchTimer) { clearInterval(this.batchTimer); this.batchTimer = null; }
    }

    report(error, module = 'unknown') {
        const errorInfo = error instanceof Error ? {
            type: 'manual', module,
            message: this.maskSensitive(error.message),
            stack: this.maskSensitive(error.stack),
            timestamp: Date.now()
        } : {
            type: 'manual', module,
            details: this.maskSensitive(JSON.stringify(error)),
            timestamp: Date.now()
        };
        this.handleError(errorInfo);
    }

    handleError(errorInfo) {
        if (this.shouldIgnore(errorInfo)) return;
        
        if (this.errors.length >= this.maxErrors) this.errors.shift();
        this.errors.push(errorInfo);
        
        // 开发环境输出
        if (window.location.search.includes('debug=1') || localStorage.getItem('debug_mode') === 'true') {
            console.error('[ErrorHandler]', errorInfo);
        }
        
        this.showUserFriendlyMessage(errorInfo);
        this.addToBatchQueue(errorInfo);
    }

    addToBatchQueue(errorInfo) {
        if (!this.reportUrl) return;
        const safeInfo = this._preparePayload(errorInfo);
        this.batchQueue.push(safeInfo);
        if (this.batchQueue.length >= this.BATCH_MAX_SIZE) this._flushBatchQueue();
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
                if (navigator.sendBeacon(this.reportUrl, JSON.stringify(payload))) return;
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

    showUserFriendlyMessage(errorInfo) {
        // 减少用户提示频率
        if (window._lastErrorTime && Date.now() - window._lastErrorTime < 10000) return;
        window._lastErrorTime = Date.now();

        let userMessage = '';
        if (errorInfo.type === 'resource' && errorInfo.tag === 'SCRIPT') {
            userMessage = '加载脚本失败，请检查网络后重试。';
        } else if (errorInfo.type === 'unhandledrejection') {
            return; // 静默处理
        } else {
            return;
        }
        window.toast?.show(userMessage, 'error', 5000);
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

    getErrors() { return [...this.errors]; }
    clearErrors() { this.errors = []; this.reportedHashes.clear(); this.batchQueue = []; this._stopBatchTimer(); }

    getStats() {
        return {
            totalErrors: this.errors.length,
            reportedHashes: this.reportedHashes.size,
            batchQueueSize: this.batchQueue.length,
            reportUrl: this.reportUrl
        };
    }

    forceReport() { this._flushBatchQueue(); }
    setDebugMode(enabled) { enabled ? localStorage.setItem('debug_mode', 'true') : localStorage.removeItem('debug_mode'); }
}

// 单例
if (!window.errorHandler) {
    window.errorHandler = new ErrorHandler();
}

window.getErrorStats = function() { return window.errorHandler?.getStats() || null; };
window.forceReportErrors = function() { window.errorHandler?.forceReport(); };
window.clearErrorLogs = function() { window.errorHandler?.clearErrors(); };