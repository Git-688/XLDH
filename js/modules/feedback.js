/**
 * Waline 评论系统 - 独立反馈模块
 */
class WalineFeedback {
    constructor() {
        this.modal = document.getElementById('feedbackModal');
        this.closeBtn = this.modal?.querySelector('.feedback-modal-close') || null;
        this.triggerBtn = document.getElementById('floatingFeedbackBtn');
        this.walineContainer = document.getElementById('waline-feedback');
        this.isVisible = false;
        this.walineInstance = null;
        this._loaded = false;
        this._initialized = false;
        this._openPending = false;
        this._loadingIndicator = null;

        this._initModalEvents();
        this._loadWalineScript();
    }

    _initModalEvents() {
        if (!this.modal) return;
        this.closeBtn?.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) this.hide();
        });
        // 移除 triggerBtn 绑定，统一由 navbar 处理（避免冲突）
        // 下面用 toggle 对外提供方法
    }

    toggle() {
        this.isVisible ? this.hide() : this.open();
    }

    open() {
        if (this.isVisible || !this.modal) return;
        this.isVisible = true;
        this.modal.style.display = 'flex';
        requestAnimationFrame(() => {
            this.modal.classList.add('active');
        });

        if (window.app && typeof window.app.registerModal === 'function') {
            window.app.registerModal({ hide: this.hide.bind(this) });
        }

        // 显示加载提示
        if (!this._initialized) {
            this._showLoading();
        }
        this._initWaline();
    }

    hide() {
        if (!this.isVisible || !this.modal) return;
        this.modal.classList.remove('active');
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
        this.isVisible = false;

        if (window.app && typeof window.app.unregisterModal === 'function') {
            window.app.unregisterModal({ hide: this.hide.bind(this) });
        }
    }

    _showLoading() {
        if (this.walineContainer) {
            this.walineContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary)">加载评论中...</div>';
        }
    }

    _loadWalineScript() {
        if (typeof Waline !== 'undefined') {
            this._loaded = true;
            this._tryInitIfPending();
            return;
        }
        const existing = document.querySelector('script[src*="@waline/client"]');
        if (existing) {
            existing.addEventListener('load', () => {
                this._loaded = true;
                this._tryInitIfPending();
            });
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@waline/client@v3/dist/waline.js';
        script.async = true;
        script.onload = () => {
            this._loaded = true;
            this._tryInitIfPending();
        };
        script.onerror = () => {
            if (this.walineContainer) {
                this.walineContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary)">评论系统加载失败，请刷新页面重试</div>';
            }
        };
        document.head.appendChild(script);
    }

    _initWaline() {
        if (!this._loaded || this._initialized) {
            if (!this._loaded) {
                this._openPending = true;
            }
            return;
        }
        if (!this.walineContainer) return;

        this.walineContainer.innerHTML = '';
        try {
            this.walineInstance = Waline.init({
                el: '#waline-feedback',
                serverURL: 'https://yy688.ccwu.cc/',
                lang: 'zh-CN',
                dark: 'auto',
                path: '/feedback',
                pageSize: 10,
                requiredMeta: ['nick', 'mail'],
                login: 'enable',
                wordLimit: 1000,
                imageUploader: false,
                highlighter: true,
                texRenderer: true,
                search: false,
            });
            this._initialized = true;
            this._openPending = false;
        } catch (err) {
            console.error('Waline 初始化失败:', err);
            if (this.walineContainer) {
                this.walineContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary)">评论初始化失败，请刷新重试</div>';
            }
        }
    }

    _tryInitIfPending() {
        if (this._openPending && this._loaded && !this._initialized) {
            this._initWaline();
            this._openPending = false;
        }
    }

    destroy() {
        this.hide();
        if (this.walineInstance && typeof this.walineInstance.destroy === 'function') {
            this.walineInstance.destroy();
            this.walineInstance = null;
        }
        this._initialized = false;
    }
}

// 单例初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.walineFeedback = new WalineFeedback();
    });
} else {
    window.walineFeedback = new WalineFeedback();
}