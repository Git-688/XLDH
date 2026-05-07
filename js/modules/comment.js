/**
 * 评论模块 - Waline 集成（生产就绪版）
 * 特点：
 * - 延迟初始化（首次打开模态框时才实例化 Waline）
 * - 锁定 Waline 版本 3.0.0-alpha.8
 * - 固定评论路径防止数据错乱
 * - 销毁实例避免内存泄漏
 * - 完整错误处理
 */
class CommentModal {
    constructor() {
        this.walineInstance = null;
        this.initialized = false;      // 标记是否已初始化
        this.modal = document.getElementById('commentModal');
        if (!this.modal) {
            console.error('评论模态框未找到');
            return;
        }
        this._bindButton();
    }

    _bindButton() {
        const btn = document.getElementById('commentBtn');
        if (btn) {
            btn.addEventListener('click', () => this.show());
        }
        const closeBtn = this.modal.querySelector('.feedback-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) this.hide();
        });
        // 页面卸载时销毁实例
        window.addEventListener('beforeunload', () => this.destroy());
    }

    // 仅当首次打开模态框时初始化，避免容器隐藏时尺寸异常
    _initWaline() {
        if (this.initialized) return;
        if (typeof Waline === 'undefined') {
            console.error('Waline 脚本未加载，请检查 CDN');
            window.toast?.show('评论系统加载失败，请刷新页面', 'error');
            return;
        }
        try {
            this.walineInstance = Waline.init({
                el: '#waline-comment',
                serverURL: 'https://yy688.ccwu.cc',
                dark: 'auto',
                meta: ['nick', 'mail', 'link'],
                requiredMeta: ['nick'],
                pageSize: 10,
                // 固定评论路径，避免因动态 query 参数导致数据错乱
                path: window.location.pathname,
            });
            this.initialized = true;
            console.log('Waline 初始化成功');
        } catch (error) {
            console.error('Waline 初始化失败:', error);
            window.toast?.show('评论系统初始化失败，请稍后再试', 'error');
        }
    }

    show() {
        if (!this.modal) return;
        // 首次打开时初始化
        if (!this.initialized) {
            this._initWaline();
            // 如果初始化失败，直接返回不打开模态框
            if (!this.initialized) return;
        }
        this.modal.classList.add('active');
    }

    hide() {
        this.modal?.classList.remove('active');
    }

    // 销毁 Waline 实例，释放内存
    destroy() {
        if (this.walineInstance && typeof this.walineInstance.destroy === 'function') {
            this.walineInstance.destroy();
            this.walineInstance = null;
            this.initialized = false;
            console.log('Waline 实例已销毁');
        }
    }
}

// 页面加载完成后实例化 CommentModal，但不初始化 Waline
document.addEventListener('DOMContentLoaded', () => {
    window.commentModal = new CommentModal();
});