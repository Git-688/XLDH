/**
 * 用户反馈模块 - 基于 Waline 评论系统
 * 特性：
 *   - 多 CDN 动态加载，自动降级
 *   - 加载中 / 错误状态可视提示
 *   - 初始化防竞态，可重试
 *   - 增强的 Waline 配置（表情、反应、暗色适配）
 */
class FeedbackModule {
    constructor() {
        this.modal = document.getElementById('feedbackModal');
        this.closeBtn = this.modal ? this.modal.querySelector('.feedback-modal-close') : null;
        this.triggerBtn = document.getElementById('floatingFeedbackBtn');
        this.isVisible = false;
        this.isInited = false;              // Waline 是否已初始化完成
        this.isLoading = false;             // 是否正在加载脚本
        this.walineInstance = null;
        this.escHandler = null;
        this._initUI();                     // 创建加载/错误占位元素
        this._bindBaseEvents();             // 绑定模态框开关事件
        window.feedbackModule = this;
    }

    /* ---------- 1. 动态加载 Waline 脚本 ---------- */
    _loadWalineScript() {
        return new Promise((resolve, reject) => {
            // 如果之前已经加载过（Waline 全局对象存在），直接返回
            if (typeof Waline !== 'undefined') {
                return resolve();
            }

            const CDN_LIST = [
                'https://cdn.jsdelivr.net/npm/@waline/client@v3/dist/waline.js',
                'https://unpkg.com/@waline/client@v3/dist/waline.js'
            ];

            const tryLoad = (index) => {
                if (index >= CDN_LIST.length) {
                    return reject(new Error('所有 CDN 均加载失败'));
                }
                const script = document.createElement('script');
                script.src = CDN_LIST[index];
                script.id = 'waline-script';        // 防止重复插入
                const prevScript = document.getElementById('waline-script');
                if (prevScript) prevScript.remove();

                script.onload = () => resolve();
                script.onerror = () => {
                    console.warn(`CDN 失败: ${CDN_LIST[index]}，尝试下一个`);
                    script.remove();
                    tryLoad(index + 1);
                };
                document.head.appendChild(script);
            };

            tryLoad(0);
        });
    }

    /* ---------- 2. 准备 UI 状态元素 ---------- */
    _initUI() {
        if (!this.modal) return;
        // 在 waline-feedback 容器内插入加载和错误提示
        const container = document.getElementById('waline-feedback');
        if (!container) return;

        // 避免重复插入
        if (container.querySelector('.waline-loading')) return;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'waline-loading';
        loadingDiv.style.display = 'none';
        loadingDiv.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <div class="loading-spinner" style="margin:0 auto 12px; width:24px; height:24px; border:2px solid var(--border-color); border-top-color: var(--primary-color); border-radius:50%; animation:spin 1s linear infinite;"></div>
                <p style="font-size:13px; color:var(--text-secondary);">评论加载中...</p>
            </div>
        `;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'waline-error';
        errorDiv.style.display = 'none';
        errorDiv.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size:24px; color:var(--error-color); margin-bottom:8px; display:block;"></i>
                <p style="font-size:13px; color:var(--error-color); margin-bottom:12px;">评论系统暂时不可用，请稍后重试。</p>
                <button class="retry-comment-btn" style="background:var(--primary-color); color:#fff; border:none; padding:6px 16px; border-radius:6px; cursor:pointer; font-size:13px;">重新加载</button>
            </div>
        `;

        container.appendChild(loadingDiv);
        container.appendChild(errorDiv);
    }

    /* ---------- 3. 显示状态 ---------- */
    _showLoading() {
        const loadEl = document.querySelector('#waline-feedback .waline-loading');
        const errEl = document.querySelector('#waline-feedback .waline-error');
        if (loadEl) loadEl.style.display = 'block';
        if (errEl) errEl.style.display = 'none';
        // 隐藏 waline 自己的容器（如果已经存在）
        const walineBox = document.querySelector('#waline-feedback .wl-panel');
        if (walineBox) walineBox.style.display = 'none';
    }

    _showError() {
        const loadEl = document.querySelector('#waline-feedback .waline-loading');
        const errEl = document.querySelector('#waline-feedback .waline-error');
        if (loadEl) loadEl.style.display = 'none';
        if (errEl) errEl.style.display = 'block';
    }

    _hideStatusEls() {
        const loadEl = document.querySelector('#waline-feedback .waline-loading');
        const errEl = document.querySelector('#waline-feedback .waline-error');
        if (loadEl) loadEl.style.display = 'none';
        if (errEl) errEl.style.display = 'none';
    }

    /* ---------- 4. 真正初始化 Waline ---------- */
    _initWaline() {
        const container = document.getElementById('waline-feedback');
        if (!container) {
            console.error('Waline 容器缺失');
            return;
        }
        if (typeof Waline === 'undefined') {
            console.error('Waline 全局对象不存在，无法初始化');
            this._showError();
            return;
        }

        // 销毁旧实例
        if (this.walineInstance) {
            try { this.walineInstance.destroy(); } catch (e) {}
            this.walineInstance = null;
        }

        // 清除容器内可能残留的旧评论 DOM（保留我们的状态元素）
        Array.from(container.children).forEach(child => {
            if (!child.classList.contains('waline-loading') && !child.classList.contains('waline-error')) {
                child.remove();
            }
        });

        this._hideStatusEls();

        this.walineInstance = Waline.init({
            el: '#waline-feedback',
            serverURL: 'https://yy688.ccwu.cc/',      // 你的 Waline 服务地址
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
            emoji: [
                '//unpkg.com/@waline/emojis@1.1.0/tw-emoji',   // Twemoji 表情
            ],
            reaction: true,                  // 开启快速反应
            locale: {
                placeholder: '请在此处留下您的建议或问题...',
                reactionTitle: '快速表态',
                reaction0: '👍',
                reaction1: '🎉',
                reaction2: '❤️',
                reaction3: '😄',
                reaction4: '🤔',
                reaction5: '😢',
            }
        });

        this.isInited = true;
        console.log('✅ Waline 评论系统初始化完成');
    }

    /* ---------- 5. 公共方法：打开反馈框 ---------- */
    async open() {
        if (this.isVisible) return;

        // 关闭其他模态框
        if (window.app && typeof window.app.closeAllModals === 'function') {
            window.app.closeAllModals();
        }

        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
        this.isVisible = true;

        if (window.app && typeof window.app.registerModal === 'function') {
            window.app.registerModal({ hide: this.hide.bind(this) });
        }

        if (!this.isInited && !this.isLoading) {
            this.isLoading = true;
            this._showLoading();
            try {
                await this._loadWalineScript();
                this._initWaline();
            } catch (error) {
                console.error('Waline 加载失败:', error);
                this._showError();
            } finally {
                this.isLoading = false;
            }
        } else if (this.isInited) {
            // 如果已初始化但可能实例被销毁（如 tab 切换），重新初始化
            if (!this.walineInstance) {
                this._initWaline();
            }
        }

        // 绑定重新加载按钮事件（每次打开时重新绑定，避免事件失效）
        const retryBtn = document.querySelector('#waline-feedback .retry-comment-btn');
        if (retryBtn) {
            retryBtn.onclick = () => {
                this._showLoading();
                this.isLoading = true;
                this._loadWalineScript()
                    .then(() => this._initWaline())
                    .catch(() => this._showError())
                    .finally(() => this.isLoading = false);
            };
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

    /* ---------- 6. 基础事件绑定 ---------- */
    _bindBaseEvents() {
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
            if (e.key === 'Escape' && this.isVisible) this.hide();
        };
        document.addEventListener('keydown', this.escHandler);

        // 浮动按钮
        if (this.triggerBtn) {
            this.triggerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            });
        }
    }

    /* ---------- 7. 销毁 ---------- */
    destroy() {
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
        }
        if (this.walineInstance) {
            try { this.walineInstance.destroy(); } catch (e) {}
            this.walineInstance = null;
        }
        this.isInited = false;
        this.hide();
    }
}

// 页面加载后自动实例化
(() => {
    const initFeedback = () => {
        if (!window.feedbackModule) {
            new FeedbackModule();
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFeedback);
    } else {
        initFeedback();
    }
})();