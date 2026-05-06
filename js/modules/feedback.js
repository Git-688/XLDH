/**
 * 用户反馈模块 - 基于 Waline 评论系统
 * 健壮初始化：等待 Waline 脚本加载完成再初始化
 */
class FeedbackModule {
    constructor() {
        this.modal = document.getElementById('feedbackModal');
        this.closeBtn = this.modal ? this.modal.querySelector('.feedback-modal-close') : null;
        this.triggerBtn = document.getElementById('floatingFeedbackBtn');
        this.isVisible = false;
        this.isInited = false;
        this.escHandler = null;
        this.walineInstance = null;
        this.initCheckAttempts = 0;
        this.maxInitCheckAttempts = 30;   // 最长等待 15 秒
        this.init();

        // 确保 Waline 加载完成后自动初始化（以免首次打开延迟）
        this.waitForWaline();
    }

    /**
     * 轮询等待 Waline 全局对象可用
     */
    waitForWaline() {
        if (typeof Waline !== 'undefined') {
            this.isInited = true; // 提前标记避免重复 init
            return;
        }
        this.initCheckAttempts++;
        if (this.initCheckAttempts > this.maxInitCheckAttempts) {
            console.error('Waline 脚本加载超时，请刷新页面或检查网络');
            return;
        }
        setTimeout(() => this.waitForWaline(), 500);
    }

    init() {
        if (!this.modal) {
            console.warn('FeedbackModule: 找不到 #feedbackModal');
            return;
        }

        // 关闭按钮
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }

        // 点击遮罩关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        // ESC 关闭
        this.escHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escHandler);

        // 浮动按钮点击
        if (this.triggerBtn) {
            this.triggerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            });
        }

        window.feedbackModule = this;
    }

    open() {
        if (this.isVisible) return;
        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
        this.isVisible = true;

        if (window.app && typeof window.app.registerModal === 'function') {
            window.app.registerModal({ hide: this.hide.bind(this) });
        }

        // 如果还没有初始化，尝试初始化（可能 waitForWaline 已完成）
        if (!this.isInited) {
            this.initWaline();
        }
    }

    hide() {
        if (!this.isVisible) return;
        this.modal.classList.remove('active');
        this.modal.style.display = 'none';
        this.isVisible = false;

        if (window.app && typeof window.app.unregisterModal === 'function') {
            window.app.unregisterModal({ hide: this.hide.bind(this) });
        }
    }

    toggle() {
        this.isVisible ? this.hide() : this.open();
    }

    /**
     * 真正初始化 Waline（只有 Waline 已加载且容器存在时才执行）
     */
    initWaline() {
        const container = document.getElementById('waline-feedback');
        if (!container) {
            console.warn('Waline 容器缺失 #waline-feedback');
            return;
        }
        if (typeof Waline === 'undefined') {
            // Waline 还没加载，但 waitForWaline 会负责延迟初始化，
            // 这里只记录一次，不反复弹警告
            if (!this._warnedOnce) {
                console.log('Waline 脚本尚未就绪，将在加载完成后自动初始化');
                this._warnedOnce = true;
            }
            return;
        }

        // 销毁旧实例（如果有）
        if (this.walineInstance && typeof this.walineInstance.destroy === 'function') {
            try { this.walineInstance.destroy(); } catch (e) {}
        }

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

        this.isInited = true;
        this._warnedOnce = false;
        console.log('✅ Waline 评论初始化完成');
    }

    destroy() {
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
        }
        if (this.walineInstance && typeof this.walineInstance.destroy === 'function') {
            this.walineInstance.destroy();
            this.walineInstance = null;
        }
        this.isInited = false;
        this.hide();
    }
}

// DOM 加载后实例化（此时 Waline 脚本可能还在加载，但我们的轮询会处理）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FeedbackModule();
    });
} else {
    new FeedbackModule();
}