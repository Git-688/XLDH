/**
 * Toast 管理器 - 全局统一提示
 * @class ToastManager
 */
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map(); // 存储当前显示的 toast 元素
        this.counter = 0;
        this.defaultDuration = 3000;
        this.maxToasts = 5;      // 同时最多显示条数
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
     * 显示 Toast 提示
     * @param {string} message 提示内容
     * @param {string} type 类型：info/success/warning/error
     * @param {number} duration 显示时长（毫秒）
     * @returns {number} 当前 Toast 的 ID
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        const id = ++this.counter;
        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getIcon(type)}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
            <button class="toast-close" aria-label="关闭">×</button>
        `;

        // 点击关闭按钮移除
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(id);
        });

        // 自动移除
        const timeoutId = setTimeout(() => this.remove(id), duration);

        // 如果超过最大数量，移除最早的一个
        if (this.toasts.size >= this.maxToasts) {
            const firstId = this.toasts.keys().next().value;
            this.remove(firstId);
        }

        this.container.appendChild(toast);
        this.toasts.set(id, { element: toast, timeoutId });

        // 触发重排以启动动画
        requestAnimationFrame(() => toast.classList.add('show'));

        return id;
    }

    /**
     * 移除指定 Toast
     * @param {number} id 
     */
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

    /**
     * 清除所有 Toast
     */
    clearAll() {
        this.toasts.forEach((_, id) => this.remove(id));
    }

    /**
     * 根据类型获取 FontAwesome 图标名
     */
    getIcon(type) {
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * 转义 HTML 防止 XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 全局单例
window.toast = new ToastManager();