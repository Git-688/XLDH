/**
 * 评论模块 - 星聚导航最终版
 * 使用 jsdelivr 表情包 CDN，支持多选项卡
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

      // 使用 jsdelivr 表情包（稳定，且已在 CSP 白名单）
      emoji: [
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/qq',
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/bilibili',
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/tieba',
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/weibo',
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/alus',
      ],

      // 自定义表情搜索（QQ 表情包 API，可选）
      search: {
        default() {
          return fetch('https://oiapi.net/api/EmoticonPack?limit=20')
            .then(r => r.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({
                  src: item.url,
                  title: item.id || '',
                  preview: item.url
                }));
              }
              return [];
            })
            .catch(() => []);
        },
        search(word) {
          return fetch(
            `https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&limit=40`
          )
            .then(r => r.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({
                  src: item.url,
                  title: item.id || word,
                  preview: item.url
                }));
              }
              return [];
            })
            .catch(() => []);
        },
        more(word, pageNumber) {
          return fetch(
            `https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&page=${pageNumber}&limit=40`
          )
            .then(r => r.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({
                  src: item.url,
                  title: item.id || word,
                  preview: item.url
                }));
              }
              return [];
            })
            .catch(() => []);
        }
      },

      // 五字社区等级标签
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

    this._initDOM();
    this._bindEvents();
    this._initWaline();
    this._watchSearchPanel();
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
        if (e.target.closest('.feedback-modal-close')) { this.close(); return; }
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
    if (typeof Waline === 'undefined') {
      console.warn('[评论] Waline 库未加载，评论功能不可用');
      const container = document.querySelector(el);
      if (container) {
        container.innerHTML = '<div class="waline-comment-fallback" style="padding: 20px; text-align: center; color: #999;">评论系统加载中，请稍后再试...</div>';
      }
      return;
    }
    const container = document.querySelector(el);
    if (!container) return;
    try {
      this.instance = Waline.init({ el, serverURL, ...walineOptions });
      console.log('[评论] Waline 初始化成功');
    } catch (err) {
      console.error('[评论] 初始化失败', err);
      if (container) {
        container.innerHTML = '<div class="waline-comment-fallback" style="padding: 20px; text-align: center; color: #999;">评论系统暂时不可用，请稍后再试。</div>';
      }
    }
  }

  // 自动搜索
  _watchSearchPanel() {
    const container = document.querySelector(CommentModule.CONFIG.el);
    if (!container) return;

    this.searchObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const panel = node.matches('.wl-search') ? node : node.querySelector('.wl-search');
            if (panel) { this._bindAutoSearch(panel); return; }
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
      if (e.key === 'Enter') { clearTimeout(this.searchTimer); trigger(); }
    });
  }

  open() {
    if (!this.modal) return;
    if (!this.instance) { this._initWaline(); if (!this.instance) return; }
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