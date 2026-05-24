/**
 * 全局错误处理管理器
 * 功能：捕获未处理异常、Promise rejection，统一上报，并提供友好的用户提示
 */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
        // 后端日志接口（可选，需要 Worker 支持 /log 端点）
        this.reportUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ? 
                         `${window.APP_CONFIG.API_BASE}/log` : null;
        this.init();
    }

    init() {
        // 捕获同步错误
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

        // 捕获 Promise 未处理 rejection
        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            this.handleError({
                type: 'unhandledrejection',
                message: reason?.message || String(reason),
                stack: reason?.stack,
                timestamp: Date.now()
            });
        });

        // 捕获资源加载错误（图片、脚本、样式）
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

    /**
     * 手动上报错误（供模块内部调用）
     * @param {Error|Object} error 错误对象或自定义信息
     * @param {string} [module] 模块名称
     */
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

    /**
     * 内部处理错误：存储、显示用户提示、上报服务器
     */
    handleError(errorInfo) {
        // 避免重复存储过多个错误
        if (this.errors.length >= this.maxErrors) {
            this.errors.shift();
        }
        this.errors.push(errorInfo);

        // 输出到控制台（生产环境可保留）
        console.error('[ErrorHandler]', errorInfo);

        // 显示用户友好的提示（避免频繁弹窗）
        this.showUserFriendlyMessage(errorInfo);

        // 上报到服务器
        this.reportToServer(errorInfo);
    }

    showUserFriendlyMessage(errorInfo) {
        // 避免短时间内弹出过多提示（5秒内最多一次）
        if (window._lastErrorTime && Date.now() - window._lastErrorTime < 5000) {
            return;
        }
        window._lastErrorTime = Date.now();

        let userMessage = '页面遇到一些小问题，请尝试刷新。';
        if (errorInfo.type === 'resource') {
            userMessage = `加载资源失败: ${errorInfo.src}`;
        } else if (errorInfo.message && errorInfo.message.includes('NetworkError')) {
            userMessage = '网络连接异常，请检查网络后重试。';
        } else if (errorInfo.message && errorInfo.message.includes('Failed to fetch')) {
            userMessage = '请求后端服务失败，请稍后重试。';
        }

        if (window.toast && typeof window.toast.show === 'function') {
            window.toast.show(userMessage, 'error', 5000);
        } else {
            alert(userMessage);
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
        } catch (e) {
            // 静默失败
        }
    }

    /**
     * 获取所有错误记录（用于调试）
     */
    getErrors() {
        return [...this.errors];
    }

    /**
     * 清空错误记录
     */
    clearErrors() {
        this.errors = [];
    }
}

// 全局单例
if (!window.errorHandler) {
    window.errorHandler = new ErrorHandler();
}