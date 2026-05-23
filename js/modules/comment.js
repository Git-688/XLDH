/**
 * 评论模块 - 最终修复版
 */
class CommentModule {
    static CONFIG = {
        serverURL: (window.APP_CONFIG && window.APP_CONFIG.WALINE_SERVER) || 'https://yy688.ccwu.cc',
        el: '#waline-comment',
        modalId: 'commentModal',
        openBtnId: 'commentBtn',
        activeClass: 'active',
        walineOptions: {
            dark: 'auto',
            meta: ['nick', 'mail', 'link', 'ua', 'region'],
            requiredMeta: ['nick'],
            pageSize: 10,
            login: 'disable',        // 改为 disable 避免强制登录
            noCopyright: false,
            noRss: false,
            emoji: [                 // 仍可配置，但即使加载失败也不影响
                'https://unpkg.com/@waline/emojis@1.4.0/bilibili',
                'https://unpkg.com/@waline/emojis@1.4.0/qq',
                'https://unpkg.com/@waline/emojis@1.4.0/tieba',
                'https://unpkg.com/@waline/emojis@1.4.0/weibo',
                'https://unpkg.com/@waline/emojis@1.4.0/alus',
            ],
            locale: {
                level0: '初来乍到',
                level1: '偶尔光临',
                level2: '常驻居民',
                level3: '核心会员',
                level4: '论坛元老',
                level5: '至尊传说'
            }
        }
    };

    constructor() {
        this.instance = null;
        this.modal = null;
        this.openBtn = null;
        this.searchTimer = null;
        this.searchObserver = null;
        this._patchFetchError();   // 只捕获网络错误，不拦截表情包
        this._initDOM();
        this._bindEvents();
        this._initWaline();
        this._watchSearchPanel();
    }

    // 仅捕获 fetch 错误，不返回假数据（让 Waline 自己处理）
    _patchFetchError() {
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
            return originalFetch.apply(this, arguments).catch(err => {
                console.warn('[评论模块] 网络请求失败:', input, err);
                // 为了不打断 Waline 流程，返回一个空响应（但保留状态码）
                return new Response(null, { status: 500, statusText: 'Network Error' });
            });
        };
    }

    _initDOM() {
        const { modalId, openBtnId } = CommentModule.CONFIG;
        this.modal = document.getElementById(modalId);
        this.openBtn = document.getElementById(openBtnId);
    }

    _bindEvents() {
        if (this.openBtn) this.openBtn.addEventListener('click', () => this.open());
        if (this.modal) {
            this.modal.addEventListener('click', e => {
                if (e.target.closest('.feedback-modal-close')) {
                    this.close();
                    return;
                }
                if (e.target === this.modal) this.close();
            });
        }
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.modal?.classList.contains(CommentModule.CONFIG.activeClass))
                this.close();
        });
    }

    _initWaline() {
        const { el, serverURL, walineOptions } = CommentModule.CONFIG;
        if (typeof Waline === 'undefined') return;
        const container = document.querySelector(el);
        if (!container) return;
        try {
            this.instance = Waline.init({ el, serverURL, ...walineOptions });
        } catch (err) {
            console.error('[评论] Waline 初始化失败:', err);
            if (container) {
                container.innerHTML = '<div class="comment-error">评论系统暂时不可用，请稍后再试。</div>';
            }
        }
    }

    _watchSearchPanel() {
        const container = document.querySelector(CommentModule.CONFIG.el);
        if (!container) return;
        this.searchObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        const panel = node.matches('.wl-search') ? node : node.querySelector('.wl-search');
                        if (panel) this._bindAutoSearch(panel);
                    }
                }
            }
        });
        this.searchObserver.observe(container, { childList: true, subtree: true });
    }

    _bindAutoSearch(panel) {
        const input = panel.querySelector('input');
        const btn = panel.querySelector('button');
        if (!input || !btn || input.dataset.auto === 'true') return;
        input.dataset.auto = 'true';
        const trigger = () => {
            clearTimeout(this.searchTimer);
            if (input.value.trim()) btn.click();
        };
        input.addEventListener('input', () => {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(trigger, 500);
        });
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                clearTimeout(this.searchTimer);
                trigger();
            }
        });
    }

    open() {
        if (!this.modal) return;
        if (!this.instance) {
            this._initWaline();
            if (!this.instance) return;
        }
        this.modal.classList.add(CommentModule.CONFIG.activeClass);
        document.body.style.overflow = 'hidden';
    }

    close() {
        if (!this.modal) return;
        this.modal.classList.remove(CommentModule.CONFIG.activeClass);
        document.body.style.overflow = '';
    }

    destroy() {
        clearTimeout(this.searchTimer);
        this.searchObserver?.disconnect();
        this.instance?.destroy?.();
        this.instance = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.commentModule = new CommentModule();
});

window.addEventListener('beforeunload', () => {
    window.commentModule?.destroy?.();
});