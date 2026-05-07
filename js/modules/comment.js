/**
 * 评论模块 - Waline 集成（样式模块化）
 * 动态加载 comment.css，点击悬浮按钮后异步初始化
 */
class CommentModal {
    constructor() {
        this.modal = null;
        this.loaded = false;
        this.styleLoaded = false;
        this._initModal();
        this._bindButton();
    }

    _initModal() {
        if (document.getElementById('commentModal')) {
            this.modal = document.getElementById('commentModal');
        } else {
            const modalHTML = `
                <div class="feedback-modal" id="commentModal">
                    <div class="feedback-modal-content" style="max-width: 700px;">
                        <div class="feedback-modal-header">
                            <h3><i class="fas fa-comments"></i> 评论</h3>
                            <button class="feedback-modal-close">&times;</button>
                        </div>
                        <div class="feedback-modal-body" id="commentBody">
                            <div id="waline-comment"></div>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.modal = document.getElementById('commentModal');
        }
        // 关闭事件
        const closeBtn = this.modal.querySelector('.feedback-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) this.hide();
        });
    }

    _bindButton() {
        const btn = document.getElementById('commentBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.show();
            });
        }
    }

    // 动态加载 CSS
    async _loadStyle() {
        if (this.styleLoaded) return;
        await new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = './css/modules/comment.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
        this.styleLoaded = true;
    }

    // 动态加载 Waline
    async _loadWaline() {
        if (this.loaded) return;
        if (typeof Waline !== 'undefined') {
            this.loaded = true;
            return;
        }
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@waline/client@3/dist/waline.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
        // 等待 Waline 全局可用
        await new Promise(resolve => {
            const check = () => {
                if (typeof Waline !== 'undefined') resolve();
                else setTimeout(check, 50);
            };
            check();
        });
        this.loaded = true;
    }

    show() {
        // 先加载样式和脚本
        this._loadStyle()
            .then(() => this._loadWaline())
            .then(() => {
                if (!this.walineInstance) {
                    this.walineInstance = Waline.init({
                        el: '#waline-comment',
                        serverURL: 'https://yy688.ccwu.cc',  // 替换为你的 Waline 地址
                        dark: 'auto',
                        meta: ['nick', 'mail', 'link'],
                        requiredMeta: ['nick'],
                        pageSize: 10,
                    });
                }
                this.modal.classList.add('active');
            })
            .catch(err => {
                console.error('评论系统加载失败:', err);
                window.toast?.show('评论系统加载失败，请稍后重试', 'error');
            });
    }

    hide() {
        this.modal.classList.remove('active');
    }
}

// 页面加载完初始化
document.addEventListener('DOMContentLoaded', () => {
    window.commentModal = new CommentModal();
});