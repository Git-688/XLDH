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
        this._loaded = false;       // Waline 库是否已加载
        this._initialized = false;  // Waline 实例是否已创建

        this._initModalEvents();
        this._loadWalineScript();
    }

    // ========== 模态框基础事件 ==========
    _initModalEvents() {
        if (!this.modal) return;

        // 关闭按钮
        this.closeBtn?.addEventListener('click', () => this.hide());

        // 点击遮罩关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) this.hide();
        });

        // 浮动按钮触发
        this.triggerBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });
    }

    // ========== 动态加载 Waline 脚本 ==========
    _loadWalineScript() {
        // 如果已经全局存在或正在加载，直接尝试初始化
        if (typeof Waline !== 'undefined') {
            this._loaded = true;
            return;
        }

        // 避免重复加载
        if (document.querySelector('script[src*="@waline/client"]')) {
            // 脚本标签已存在但未加载完成，监听 load 事件
            const existingScript = document.querySelector('script[src*="@waline/client"]');
            existingScript.addEventListener('load', () => {
                this._loaded = true;
            });
            existingScript.addEventListener('error', () => {
                console.error('Waline 脚本加载失败');
                this._showLoadError();
            });
            return;
        }

        // 动态创建脚本
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@waline/client@v3/dist/waline.js';
        script.async = true;
        script.onload = () => {
            this._loaded = true;
            console.log('✅ Waline 脚本动态加载成功');
        };
        script.onerror = () => {
            console.error('❌ Waline 脚本动态加载失败');
            this._showLoadError();
        };
        document.head.appendChild(script);
    }

    _showLoadError() {
        if (this.walineContainer) {
            this.walineContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary)">评论系统加载失败，请刷新页面后重试</div>';
        }
    }

    // ========== Waline 初始化 ==========
    _initWaline() {
        if (!this.walineContainer || this._initialized) return;

        // 确保脚本已加载
        if (!this._loaded || typeof Waline === 'undefined') {
            // 尚未加载，等待脚本 onload 后自动调用 _initWaline
            return;
        }

        // 清空容器中的旧提示
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
            this._showLoadError();
        }
    }

    // ========== 显示/隐藏控制 ==========
    open() {
        if (this.isVisible || !this.modal) return;

        // 如果 Waline 尚未初始化，立刻尝试初始化（脚本可能已经就绪）
        if (!this._initialized) {
            this._initWaline();
        }

        this.modal.style.display = 'flex';
        // 等待一帧后添加 active 类以触发过渡动画
        requestAnimationFrame(() => {
            this.modal.classList.add('active');
        });
        this.isVisible = true;

        // 注册到全局 App，以便统一管理模态框
        if (window.app && typeof window.app.registerModal === 'function') {
            window.app.registerModal({ hide: this.hide.bind(this) });
        }
    }

    hide() {
        if (!this.isVisible || !this.modal) return;

        this.modal.classList.remove('active');
        // 等待过渡动画完成后隐藏
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

    // ========== 清理 ==========
    destroy() {
        this.hide();
        if (this.walineInstance && typeof this.walineInstance.destroy === 'function') {
            this.walineInstance.destroy();
            this.walineInstance = null;
        }
        this._initialized = false;
    }
}

// 在 DOM 准备完毕后实例化（单例）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.walineFeedback = new WalineFeedback();
    });
} else {
    window.walineFeedback = new WalineFeedback();
}