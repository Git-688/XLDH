/* error-handler.js */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
        this.reportUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ? 
                         `${window.APP_CONFIG.API_BASE}/log` : null;
        this.init();
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
        if (errorInfo.type === 'error' && errorInfo.message === 'Script error.') return true;
        return false;
    }

    init() {
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
        this.reportToServer(errorInfo);
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
        } else {
            console.warn('[ErrorHandler] toast not available, message:', userMessage);
        }
    }

    async reportToServer(errorInfo) {
        if (!this.reportUrl) return;
        const safeInfo = {
            ...errorInfo,
            message: this.maskSensitive(errorInfo.message || ''),
            stack: this.maskSensitive(errorInfo.stack || ''),
            filename: this.maskSensitive(errorInfo.filename || ''),
            details: this.maskSensitive(errorInfo.details || ''),
            src: this.maskSensitive(errorInfo.src || ''),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        const payload = JSON.stringify(safeInfo);
        const send = async (retries = 2) => {
            try {
                if (navigator.sendBeacon) {
                    navigator.sendBeacon(this.reportUrl, payload);
                } else {
                    await fetch(this.reportUrl, {
                        method: 'POST',
                        body: payload,
                        headers: { 'Content-Type': 'application/json' },
                        keepalive: true
                    });
                }
            } catch (e) {
                if (retries > 0) {
                    setTimeout(() => send(retries - 1), 500);
                }
            }
        };
        send();
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