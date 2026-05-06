/**
 * Waline 评论系统 - 独立反馈模块
 * 动态加载 Waline，简洁初始化，自带模态框管理
 */
class WalineFeedback {
    constructor() {
        this.modal = document.getElementById('feedbackModal');
        this.closeBtn = this.modal?.querySelector('.feedback-modal-close') || null;
        this.triggerBtn = document.getElementById('floatingFeedbackBtn');
        this.walineContainer = document.getElementById('waline-feedback');
        this.isVisible = false;
        this.walineInstance = null;
        this._loaded = false;       // 脚本是否已加载
        this._initialized = false;  // 实例是否已创建
        this._openPending = false;  // 是否有待处理的初始化请求

        this._initModalEvents();
        this._loadWalineScript();
    }

    // ========== 模态框基础事件 ==========
    _initModalEvents() {
        if (!this.modal) return;

        this.closeBtn?.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) this.hide();
        });
        this.triggerBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });
    }

    // ========== 动态加载 Waline 脚本 ==========
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
            console.log('✅ Waline 脚本动态加载成功');
            this._tryInitIfPending();
        };
        script.onerror = () => {
            console.error('❌ Waline 脚本加载失败');
            if (this.walineContainer) {
                this.walineContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary)">评论系统加载失败，请刷新页面重试</div>';
            }
        };
        document.head.appendChild(script);
    }

    _tryInitIfPending() {
        if (this._openPending) {
            this._initWaline();
            this._openPending = false;
        }
    }

    // ========== Waline 初始化 ==========
    _initWaline() {
        if (!this.walineContainer || this._initialized) return;
        if (!this._loaded || typeof Waline === 'undefined') {
            this._openPending = true;
            return;
        }

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
            console.log('✅ Waline 评论初始化完成');
        } catch (err) {
            console.error('Waline 初始化失败:', err);
            if (this.walineContainer) {
                this.walineContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary)">评论初始化失败，请刷新重试</div>';
            }
        }
    }

    // ========== 显示/隐藏控制 ==========
    open() {
        if (this.isVisible || !this.modal) return;

        this.modal.style.display = 'flex';
        requestAnimationFrame(() => {
            this.modal.classList.add('active');
        });
        this.isVisible = true;

        // 注册到全局 App
        if (window.app && typeof window.app.registerModal === 'function') {
            window.app.registerModal({ hide: this.hide.bind(this) });
        }

        // 初始化 Waline（如果尚未完成）
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

    toggle() {
        this.isVisible ? this.hide() : this.open();
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