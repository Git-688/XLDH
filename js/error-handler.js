/**
 * 全局错误处理管理器（过滤第三方脚本错误，脱敏上报）
 */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
        this.reportUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ? 
                         `${window.APP_CONFIG.API_BASE}/log` : null;
        this.init();
    }

    // 脱敏函数：隐藏 IP 最后一段，过滤邮箱，截断过长字符串
    maskSensitive(str) {
        if (!str) return '';
        str = String(str);
        // 脱敏 IP 地址（保留前两段）
        str = str.replace(/\b(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}\b/g, '$1.***.***');
        // 脱敏邮箱地址
        str = str.replace(/\b[\w.-]+@[\w.-]+\.\w{2,4}\b/g, '***@***.***');
        // 脱敏可能的手机号（简单处理）
        str = str.replace(/\b1[3-9]\d{9}\b/g, '1**********');
        // 截断过长字符串（超过 500 字符）
        if (str.length > 500) str = str.substring(0, 500) + '…(truncated)';
        return str;
    }

    init() {
        // 捕获 JavaScript 运行时错误
        window.addEventListener('error', (event) => {
            const { message, filename, lineno, colno, error } = event;
            // 忽略第三方脚本错误（如跨域限制导致的 Script error.）
            if (message === 'Script error.' || message === 'Script error') {
                return;
            }
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

        // 捕获未处理的 Promise 拒绝
        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            this.handleError({
                type: 'unhandledrejection',
                message: reason?.message ? this.maskSensitive(reason.message) : this.maskSensitive(String(reason)),
                stack: reason?.stack ? this.maskSensitive(reason.stack) : undefined,
                timestamp: Date.now()
            });
        });

        // 捕获资源加载错误（图片、脚本、样式等）
        window.addEventListener('error', (event) => {
            const target = event.target;
            if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                // 忽略特定资源的错误，如 cloudflare insights
                if (target.src && target.src.includes('cloudflareinsights.com')) {
                    return;
                }
                this.handleError({
                    type: 'resource',
                    tag: target.tagName,
                    src: this.maskSensitive(target.src || target.href),
                    timestamp: Date.now()
                });
            }
        }, true); // 捕获阶段
    }

    // 手动上报错误（供模块调用）
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

    // 统一错误处理
    handleError(errorInfo) {
        // 限制内存中存储的错误数量
        if (this.errors.length >= this.maxErrors) {
            this.errors.shift();
        }
        this.errors.push(errorInfo);
        // 控制台输出（脱敏后）
        console.error('[ErrorHandler]', errorInfo);
        // 显示用户友好提示（避免频繁弹窗）
        this.showUserFriendlyMessage(errorInfo);
        // 上报到服务器
        this.reportToServer(errorInfo);
    }

    // 显示用户友好提示（非技术性）
    showUserFriendlyMessage(errorInfo) {
        // 避免短时间内重复提示
        if (window._lastErrorTime && Date.now() - window._lastErrorTime < 5000) return;
        window._lastErrorTime = Date.now();

        let userMessage = '页面遇到一些小问题，请尝试刷新。';
        if (errorInfo.type === 'resource' && errorInfo.tag === 'SCRIPT') {
            userMessage = '加载脚本失败，请检查网络后重试。';
        } else if (errorInfo.message && errorInfo.message.includes('NetworkError')) {
            userMessage = '网络连接异常，请检查网络后重试。';
        } else if (errorInfo.message && errorInfo.message.includes('Failed to fetch')) {
            userMessage = '请求后端服务失败，请稍后重试。';
        } else if (errorInfo.type === 'unhandledrejection') {
            userMessage = '操作未能完成，请重试。';
        }

        if (window.toast && typeof window.toast.show === 'function') {
            window.toast.show(userMessage, 'error', 5000);
        } else {
            console.warn('[ErrorHandler] toast not available, message:', userMessage);
        }
    }

    // 上报错误到服务器（使用 sendBeacon 或 fetch）
    async reportToServer(errorInfo) {
        if (!this.reportUrl) return;
        try {
            // 为了安全，再次对发送的数据进行脱敏（已在构造时脱敏，再次确保）
            const safeInfo = {
                ...errorInfo,
                message: this.maskSensitive(errorInfo.message || ''),
                stack: this.maskSensitive(errorInfo.stack || ''),
                filename: this.maskSensitive(errorInfo.filename || ''),
                details: this.maskSensitive(errorInfo.details || '')
            };
            const payload = JSON.stringify(safeInfo);
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

    // 获取已捕获的错误列表
    getErrors() {
        return [...this.errors];
    }

    // 清空错误列表
    clearErrors() {
        this.errors = [];
    }
}

// 单例初始化
if (!window.errorHandler) {
    window.errorHandler = new ErrorHandler();
}