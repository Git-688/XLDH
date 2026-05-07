/**
 * 评论模块 - Waline 集成 (V3 API 适配版)
 * 采用 Waline Client V3 的 init 初始化方式，非动态加载
 */
class CommentModal {
    constructor() {
        this.walineInstance = null;
        this.modal = document.getElementById('commentModal');
        if (!this.modal) {
            console.error('评论模态框未找到');
            return;
        }
        this._bindButton();
        // 确保 DOM 容器存在后，再进行 Waline 初始化
        this._initWaline();
    }

    _bindButton() {
        const btn = document.getElementById('commentBtn');
        if (btn) {
            btn.addEventListener('click', () => this.show());
        }
        // 关闭按钮
        const closeBtn = this.modal.querySelector('.feedback-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) this.hide();
        });
    }

    _initWaline() {
        if (typeof Waline === 'undefined') {
            console.error('Waline 未加载，请检查脚本引入');
            return;
        }
        // 关键修复：Waline V3 使用 Waline.init() 而非 new Waline.init()
        try {
            this.walineInstance = Waline.init({
                el: '#waline-comment',
                serverURL: 'https://yy688.ccwu.cc',
                dark: 'auto',
                meta: ['nick', 'mail', 'link'],
                requiredMeta: ['nick'],
                pageSize: 10,
            });
        } catch (error) {
            console.error('Waline 初始化失败:', error);
            window.toast?.show('评论系统初始化失败，请稍后刷新重试', 'error');
        }
    }

    show() {
        if (!this.modal || !this.walineInstance) {
            window.toast?.show('评论系统正在加载中，请稍后再试', 'warning');
            return;
        }
        this.modal.classList.add('active');
    }

    hide() {
        this.modal?.classList.remove('active');
    }
}

// 页面加载完初始化
document.addEventListener('DOMContentLoaded', () => {
    window.commentModal = new CommentModal();
});