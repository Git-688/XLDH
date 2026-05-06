/**
 * 用户反馈模块 - 基于 Waline 评论系统
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
        this.init();
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

    initWaline() {
        const container = document.getElementById('waline-feedback');
        if (!container) {
            console.warn('Waline 容器缺失 #waline-feedback');
            return;
        }
        if (typeof Waline === 'undefined') {
            console.warn('Waline 脚本未加载，稍后重试');
            // 如果脚本还在加载中，延迟重试
            setTimeout(() => this.initWaline(), 500);
            return;
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

// DOM 加载后实例化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FeedbackModule();
    });
} else {
    new FeedbackModule();
}