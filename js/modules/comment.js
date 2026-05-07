/**
 * 评论模块 - Waline 集成（静态资源版）
 * 页面初始化时 Waline 已加载，通过悬浮按钮控制模态框
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
        this.walineInstance = Waline.init({
            el: '#waline-comment',
            serverURL: 'https://yy688.ccwu.cc',  // 替换为你的 Waline 地址
            dark: 'auto',
            meta: ['nick', 'mail', 'link'],
            requiredMeta: ['nick'],
            pageSize: 10,
        });
    }

    show() {
        this.modal.classList.add('active');
    }

    hide() {
        this.modal.classList.remove('active');
    }
}

// 页面加载完初始化
document.addEventListener('DOMContentLoaded', () => {
    window.commentModal = new CommentModal();
});