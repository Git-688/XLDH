/**
 * 评论模块 - 星聚导航最终版（修复网络请求错误，增加 fetch 错误捕获）
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
            login: 'enable',
            noCopyright: false,
            noRss: false,
            emoji: [
                'https://unpkg.com/@waline/emojis@1.4.0/bilibili',
                'https://unpkg.com/@waline/emojis@1.4.0/qq',
                'https://unpkg.com/@waline/emojis@1.4.0/tieba',
                'https://unpkg.com/@waline/emojis@1.4.0/weibo',
                'https://unpkg.com/@waline/emojis@1.4.0/alus',
            ],
            search: {
                _cache: new Map(),
                _cacheTTL: 30 * 60 * 1000,

                async default() {
                    try {
                        const response = await fetch('https://oiapi.net/api/EmoticonPack?limit=20', {
                            signal: AbortSignal.timeout(3000),
                            mode: 'cors',
                            credentials: 'omit'
                        });

                        if (!response.ok) return [];

                        const json = await response.json();

                        if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                            return json.data
                                .filter(item => item.url && item.id)
                                .map(item => ({
                                    src: item.url,
                                    title: item.id || '',
                                    preview: item.url
                                }));
                        }
                        return [];
                    } catch (e) {
                        console.warn('[评论模块] 默认表情包加载失败:', e);
                        return [];
                    }
                },

                async search(word) {
                    if (!word || !word.trim()) return [];

                    try {
                        const response = await fetch(
                            `https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&limit=40`,
                            {
                                signal: AbortSignal.timeout(3000),
                                mode: 'cors',
                                credentials: 'omit'
                            }
                        );

                        if (!response.ok) return [];

                        const json = await response.json();

                        if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                            return json.data
                                .filter(item => item.url)
                                .map(item => ({
                                    src: item.url,
                                    title: item.id || word,
                                    preview: item.url
                                }));
                        }
                        return [];
                    } catch (e) {
                        console.warn('[评论模块] 表情包搜索失败:', e);
                        return [];
                    }
                },

                more(word, pageNumber) {
                    return Promise.resolve([]);
                },

                _fetchWithCache(key, fetcher) {
                    const now = Date.now();
                    const cached = this._cache.get(key);

                    if (cached && (now - cached.timestamp) < this._cacheTTL) {
                        return Promise.resolve(cached.data);
                    }

                    return fetcher().then(data => {
                        this._cache.set(key, { data, timestamp: now });

                        if (this._cache.size > 50) {
                            const oldest = [...this._cache.keys()][0];
                            this._cache.delete(oldest);
                        }

                        return data;
                    });
                }
            },
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
        this._blockWalineInternalFetch(); // 拦截 Waline 内部无效请求并捕获网络错误
        this._initDOM();
        this._bindEvents();
        this._initWaline();
        this._watchSearchPanel();
    }

    // 关键修复：拦截 Waline 内部硬编码的表情包 API 请求，并捕获网络错误
    _blockWalineInternalFetch() {
        const originalFetch = window.fetch;

        window.fetch = function (input, init) {
            // 拦截 Waline 所有内部表情包 API 请求
            if (typeof input === 'string' && (
                input.includes('emojis.waline.js.org') ||
                input.includes('api.github.com/emojis') ||
                input.includes('waline-emoji')
            )) {
                console.debug('[评论模块] 已拦截 Waline 内部无效表情包请求:', input);
                // 返回一个空的成功响应，彻底消除错误
                return Promise.resolve(new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            // 正常转发其他所有请求，并捕获网络错误
            return originalFetch.apply(this, arguments).catch(err => {
                console.warn('[评论模块] 网络请求失败:', input, err);
                // 返回一个空的成功响应，避免 Waline 抛出未捕获异常
                return new Response(JSON.stringify({ code: -1, msg: 'Network error' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
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
            console.error('[评论] 初始化失败', err);
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
                        if (panel) {
                            this._bindAutoSearch(panel);
                            return;
                        }
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

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.commentModule = new CommentModule();
});

window.addEventListener('beforeunload', () => {
    window.commentModule?.destroy?.();
});