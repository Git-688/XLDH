/**
 * 评论模块 - 星聚导航
 * 延迟加载 Waline，避免页面加载时发起 fetch 请求导致错误
 */
class CommentModule {
  static CONFIG = {
    serverURL: (window.APP_CONFIG && window.APP_CONFIG.WALINE_SERVER) || '',
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
        default() {
          return fetch('https://oiapi.net/api/EmoticonPack?limit=20')
            .then(r => r.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({ src: item.url, title: item.id || '', preview: item.url }));
              }
              return [];
            })
            .catch(() => []);
        },
        search(word) {
          return fetch(`https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&limit=40`)
            .then(r => r.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({ src: item.url, title: item.id || word, preview: item.url }));
              }
              return [];
            })
            .catch(() => []);
        },
        more(word, pageNumber) {
          return fetch(`https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&page=${pageNumber}&limit=40`)
            .then(r => r.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({ src: item.url, title: item.id || word, preview: item.url }));
              }
              return [];
            })
            .catch(() => []);
        }
      },
      locale: {
        level0: '初来乍到', level1: '偶尔光临', level2: '常驻居民',
        level3: '核心会员', level4: '论坛元老', level5: '至尊传说'
      }
    }
  };

  constructor() {
    this.instance = null;
    this.modal = null;
    this.openBtn = null;
    this.searchTimer = null;
    this.searchObserver = null;
    this.loadingWaline = false;
    this._initDOM();
    this._bindEvents();
    // 不自动初始化 Waline，首次点击评论按钮时才加载
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

  // 动态加载 Waline 库并初始化
  async _loadWaline() {
    if (this.instance) return true;
    if (this.loadingWaline) return false;

    const serverURL = CommentModule.CONFIG.serverURL;
    if (!serverURL || serverURL === 'https://yy688.ccwu.cc') {
      console.warn('[评论] Waline 服务未配置或使用默认地址，请检查 APP_CONFIG.WALINE_SERVER');
      const container = document.querySelector(CommentModule.CONFIG.el);
      if (container) container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">评论服务未配置，请联系管理员</div>';
      return false;
    }

    this.loadingWaline = true;
    // 如果 Waline 库尚未加载，动态加载它
    if (typeof Waline === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@waline/client/dist/waline.umd.js';
        script.crossOrigin = 'anonymous';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    try {
      const { el, serverURL: url, walineOptions } = CommentModule.CONFIG;
      const container = document.querySelector(el);
      if (!container) return false;
      this.instance = Waline.init({ el, serverURL: url, ...walineOptions });
      this.loadingWaline = false;
      return true;
    } catch (err) {
      console.error('[评论] 初始化失败', err);
      this.loadingWaline = false;
      const container = document.querySelector(CommentModule.CONFIG.el);
      if (container) container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">评论服务加载失败</div>';
      return false;
    }
  }

  async open() {
    if (!this.modal) return;
    // 如果还没有初始化，尝试加载 Waline
    if (!this.instance && !this.loadingWaline) {
      const container = document.querySelector(CommentModule.CONFIG.el);
      if (container) container.innerHTML = '<div class="loading">加载评论中...</div>';
      await this._loadWaline();
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