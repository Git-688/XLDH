/**
 * 评论模块 - Waline 集成
 * 点击悬浮按钮加载评论，模态框展示
 */
class CommentModal {
    constructor() {
        this.modal = null;
        this.loaded = false;
        this._initModal();
        this._bindButton();
    }

    _initModal() {
        // 如果已存在（例如页面硬编码），直接用，否则创建
        if (document.getElementById('commentModal')) {
            this.modal = document.getElementById('commentModal');
        } else {
            const modalHTML = `
                <div class="feedback-modal" id="commentModal">
                    <div class="feedback-modal-content" style="max-width: 700px;">
                        <div class="feedback-modal-header">
                            <h3><i class="fas fa-comments" style="font-size: 1.05rem;"></i> 评论</h3>
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

    async _loadWaline() {
        if (this.loaded) return;
        if (typeof Waline !== 'undefined') {
            this.loaded = true;
            return;
        }
        // 动态加载 Waline 脚本
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@waline/client@3/dist/waline.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
        // 等待全局 Waline 可用
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
        this._loadWaline()
            .then(() => {
                // 初始化 Waline（如果尚未初始化）
                if (!this.walineInstance) {
                    this.walineInstance = Waline.init({
                        el: '#waline-comment',
                        serverURL: 'https://yy688.ccwu.cc',  // 替换为你的 Waline 服务地址
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