/**
 * 全局错误处理管理器（修复版：兼容 toast 未加载情况）
 */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
        this.reportUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ? 
                         `${window.APP_CONFIG.API_BASE}/log` : null;
        this.init();
    }

    init() {
        window.addEventListener('error', (event) => {
            const { message, filename, lineno, colno, error } = event;
            this.handleError({
                type: 'error',
                message,
                filename,
                lineno,
                colno,
                stack: error?.stack,
                timestamp: Date.now()
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            this.handleError({
                type: 'unhandledrejection',
                message: reason?.message || String(reason),
                stack: reason?.stack,
                timestamp: Date.now()
            });
        });

        window.addEventListener('error', (event) => {
            const target = event.target;
            if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                this.handleError({
                    type: 'resource',
                    tag: target.tagName,
                    src: target.src || target.href,
                    timestamp: Date.now()
                });
            }
        }, true);
    }

    report(error, module = 'unknown') {
        let errorInfo;
        if (error instanceof Error) {
            errorInfo = {
                type: 'manual',
                module,
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            };
        } else {
            errorInfo = {
                type: 'manual',
                module,
                details: error,
                timestamp: Date.now()
            };
        }
        this.handleError(errorInfo);
    }

    handleError(errorInfo) {
        if (this.errors.length >= this.maxErrors) {
            this.errors.shift();
        }
        this.errors.push(errorInfo);
        console.error('[ErrorHandler]', errorInfo);
        this.showUserFriendlyMessage(errorInfo);
        this.reportToServer(errorInfo);
    }

    showUserFriendlyMessage(errorInfo) {
        if (window._lastErrorTime && Date.now() - window._lastErrorTime < 5000) return;
        window._lastErrorTime = Date.now();

        let userMessage = '页面遇到一些小问题，请尝试刷新。';
        if (errorInfo.type === 'resource') {
            userMessage = `加载资源失败: ${errorInfo.src}`;
        } else if (errorInfo.message && errorInfo.message.includes('NetworkError')) {
            userMessage = '网络连接异常，请检查网络后重试。';
        } else if (errorInfo.message && errorInfo.message.includes('Failed to fetch')) {
            userMessage = '请求后端服务失败，请稍后重试。';
        }

        // 安全调用 toast
        if (window.toast && typeof window.toast.show === 'function') {
            window.toast.show(userMessage, 'error', 5000);
        } else {
            // 降级方案：控制台警告，不打扰用户（避免 alert）
            console.warn('[ErrorHandler] toast not available, message:', userMessage);
        }
    }

    async reportToServer(errorInfo) {
        if (!this.reportUrl) return;
        try {
            const payload = JSON.stringify(errorInfo);
            if (navigator.sendBeacon) {
                navigator.sendBeacon(this.reportUrl, payload);
            } else {
                fetch(this.reportUrl, {
                    method: 'POST',
                    body: payload,
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true
                }).catch(() => {});
            }
        } catch (e) {}
    }

    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
    }
}

if (!window.errorHandler) {
    window.errorHandler = new ErrorHandler();
}