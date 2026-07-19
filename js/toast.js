/* toast.js - 精简版（Toast 提示管理器） */
class ToastManager {
    constructor() {
        this.toasts = new Map();
        this.counter = 0;
        this.defaultDuration = 3000;
        this.maxToasts = 5;
        this.container = this._createContainer();
    }

    _createContainer() {
        const container = document.createElement('div');
        container.className = 'toast-manager-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', duration = this.defaultDuration) {
        const id = ++this.counter;
        const toast = document.createElement('div');
        toast.className = 'toast-item';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `<div class="toast-content"><span>${Utils.escapeHtml(message)}</span></div>`;

        // 限制最大数量
        if (this.toasts.size >= this.maxToasts) {
            const firstId = this.toasts.keys().next().value;
            this.remove(firstId);
        }

        this.container.appendChild(toast);
        const timeoutId = setTimeout(() => this.remove(id), duration);
        this.toasts.set(id, { element: toast, timeoutId });
        
        // 触发进入动画
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
        const ids = Array.from(this.toasts.keys());
        ids.forEach(id => this.remove(id));
    }
}

// 单例
if (!window.toast) {
    window.toast = new ToastManager();
}