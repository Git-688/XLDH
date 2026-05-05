/**
 * 用户反馈模块 - 基于 Twikoo 评论系统
 * 独立封装，方便维护
 */
class FeedbackModule {
    constructor() {
        this.modal = document.getElementById('feedbackModal');
        this.closeBtn = this.modal ? this.modal.querySelector('.feedback-modal-close') : null;
        this.triggerBtn = document.getElementById('floatingFeedbackBtn');
        this.isVisible = false;
        this.isInited = false;
        this.escHandler = null;
        this.init();
    }

    /**
     * 初始化：绑定事件，不立即加载 Twikoo
     */
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

        // 挂载到全局，方便调用
        window.feedbackModule = this;
    }

    /**
     * 显示评论弹窗，首次显示时初始化 Twikoo
     */
    open() {
        if (this.isVisible) return;
        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
        this.isVisible = true;

        // 注册到 App 模态框管理（如果存在）
        if (window.app && typeof window.app.registerModal === 'function') {
            window.app.registerModal({ hide: this.hide.bind(this) });
        }

        // 首次打开时初始化 Twikoo
        if (!this.isInited) {
            this.initTwikoo();
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
     * 初始化 Twikoo 评论系统
     */
    initTwikoo() {
        const container = document.getElementById('twikoo-feedback');
        if (!container || typeof twikoo === 'undefined') {
            console.warn('Twikoo 未加载或容器缺失');
            return;
        }

        twikoo.init({
            envId: 'https://twikoo688.netlify.app/.netlify/functions/twikoo',
            el: '#twikoo-feedback',
            lang: 'zh-CN',
            path: '/feedback',
            // 启用 KaTeX 数学公式支持
            katex: {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            },
            onCommentLoaded: function () {
                if (typeof renderMathInElement !== 'undefined') {
                    renderMathInElement(container, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\(', right: '\\)', display: false },
                            { left: '\\[', right: '\\]', display: true }
                        ],
                        throwOnError: false
                    });
                }
            }
        });
        this.isInited = true;
    }

    /**
     * 销毁模块
     */
    destroy() {
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
        }
        // 移除 Twikoo 初始化标记，重新打开可再次初始化
        this.isInited = false;
        this.hide();
    }
}

// 当 DOM 加载完成后实例化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FeedbackModule();
    });
} else {
    new FeedbackModule();
}