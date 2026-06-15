/**
 * Toast 管理器 - 全局统一提示（底部居中，简约现代风格）
 */
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.counter = 0;
        this.defaultDuration = 3000;
        this.maxToasts = 5;
        this.initContainer();
    }

    initContainer() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.className = 'toast-manager-container';
        this.container.setAttribute('aria-live', 'polite');
        document.body.appendChild(this.container);
    }

    /**
     * 显示提示
     * @param {string} message 提示内容
     * @param {string} type 类型：info, success, warning, error
     * @param {number} duration 显示时长（毫秒），默认3000
     * @returns {number} toast ID
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        const id = ++this.counter;
        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.setAttribute('role', 'alert');
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${icon}"></i>
                <span>${Utils.escapeHtml(message)}</span>
            </div>
            <button class="toast-close" aria-label="关闭">×</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(id));
        
        const timeoutId = setTimeout(() => this.remove(id), duration);

        if (this.toasts.size >= this.maxToasts) {
            const firstId = this.toasts.keys().next().value;
            this.remove(firstId);
        }

        this.container.appendChild(toast);
        this.toasts.set(id, { element: toast, timeoutId });
        
        requestAnimationFrame(() => toast.classList.add('show'));
        return id;
    }

    remove(id) {
        const item = this.toasts.get(id);
        if (!item) return;
        const { element, timeoutId } = item;
        clearTimeout(timeoutId);
        element.classList.remove('show');
        element.addEventListener('transitionend', () => {
            if (element.parentNode) element.remove();
        });
        this.toasts.delete(id);
    }

    clearAll() {
        this.toasts.forEach((_, id) => this.remove(id));
    }

    getIcon(type) {
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// 单例
window.toast = new ToastManager();