/**
 * Waline 评论系统 - 独立反馈模块（修复版）
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

        if (!this._initialized) {
            this._showLoading();
        }
        this._initWaline();
    }

    hide() {
        if (!this.isVisible || !this.modal) return;
        this.modal.classList.remove('active');
        // 动画时长 250ms 与 CSS 一致
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 250);
        this.isVisible = false;

        if (window.app && typeof window.app.unregisterModal === 'function') {
            window.app.unregisterModal({ hide: this.hide.bind(this) });
        }
    }

    _showLoading() {
        if (this.walineContainer) {
            this.walineContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary)">评论系统加载中...</div>';
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
            existing.addEventListener('error', () => {
                this._showLoadError();
            });
            return;
        }

        const script = document.createElement('script');
        // 使用 jsdelivr CDN，与 CSS 统一
        script.src = 'https://cdn.jsdelivr.net/npm/@waline/client@3/dist/waline.js';
        script.async = true;
        script.onload = () => {
            this._loaded = true;
            console.log('✅ Waline 脚本加载成功');
            this._tryInitIfPending();
        };
        script.onerror = () => {
            console.error('❌ Waline 脚本加载失败');
            this._showLoadError();
        };
        document.head.appendChild(script);
    }

    _initWaline() {
        if (!this._loaded) {
            this._openPending = true;
            return;
        }
        if (this._initialized) return;
        if (!this.walineContainer) return;

        if (typeof Waline === 'undefined') {
            this._showLoadError();
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
            this._openPending = false;
            console.log('✅ Waline 评论初始化完成');
        } catch (err) {
            console.error('Waline 初始化失败:', err);
            this._showLoadError();
        }
    }

    _showLoadError() {
        if (this.walineContainer) {
            this.walineContainer.innerHTML = `
                <div style="text-align:center;padding:20px;color:var(--text-secondary)">
                    <p>评论系统加载失败</p>
                    <button onclick="window.walineFeedback._retry();" style="margin-top:8px;padding:4px 16px;border:1px solid #999;border-radius:4px;background:#fff;cursor:pointer;">重新加载</button>
                </div>`;
        }
    }

    _retry() {
        this._loaded = false;
        this._initialized = false;
        this._showLoading();
        const oldScript = document.querySelector('script[src*="@waline/client"]');
        if (oldScript) oldScript.remove();
        this._loadWalineScript();
        this._initWaline();
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.walineFeedback = new WalineFeedback();
    });
} else {
    window.walineFeedback = new WalineFeedback();
}