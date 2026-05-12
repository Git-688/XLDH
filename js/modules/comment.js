/**
 * 评论模块 - 最终可用版
 * 功能：订阅/版权/归属地/设备/等级/QQ表情/自动搜索
 */
class CommentModule {
  static CONFIG = {
    serverURL: 'https://yy688.ccwu.cc',
    el: '#waline-comment',
    modalId: 'commentModal',
    openBtnId: 'commentBtn',
    activeClass: 'active',
    walineOptions: {
      dark: 'auto',
      meta: ['nick', 'mail', 'link', 'ua'],
      requiredMeta: ['nick'],
      pageSize: 10,
      login: 'enable',
      noCopyright: false,
      noRss: false,
      disableRegion: false,
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
              if (Array.isArray(json.data)) {
                return json.data.map(item => ({ src: item.url, title: item.id, preview: item.url }));
              }
              return [];
            })
            .catch(() => []);
        },
        search(word) {
          return fetch(`https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&limit=40`)
            .then(r => r.json())
            .then(json => {
              if (Array.isArray(json.data)) {
                return json.data.map(item => ({ src: item.url, title: item.id, preview: item.url }));
              }
              return [];
            })
            .catch(() => []);
        },
        more(word, page) {
          return fetch(`https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&page=${page}&limit=40`)
            .then(r => r.json())
            .then(json => {
              if (Array.isArray(json.data)) {
                return json.data.map(item => ({ src: item.url, title: item.id, preview: item.url }));
              }
              return [];
            })
            .catch(() => []);
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
    this._initDOM();
    this._bindEvents();
    this._initWaline();
    this._watchSearchPanel();
  }

  _initDOM() {
    this.modal = document.getElementById(CommentModule.CONFIG.modalId);
    this.openBtn = document.getElementById(CommentModule.CONFIG.openBtnId);
    if (!this.modal) console.error('[评论] 模态框未找到');
    if (!this.openBtn) console.error('[评论] 按钮未找到');
  }

  _bindEvents() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }
    if (this.modal) {
      this.modal.addEventListener('click', e => {
        if (e.target.closest('.feedback-modal-close') || e.target === this.modal) this.close();
      });
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.modal?.classList.contains('active')) this.close();
    });
  }

  _initWaline() {
    if (typeof Waline === 'undefined') return;
    const c = document.querySelector(CommentModule.CONFIG.el);
    if (!c) return;
    try {
      this.instance = Waline.init({ el: CommentModule.CONFIG.el, serverURL: CommentModule.CONFIG.serverURL, ...CommentModule.CONFIG.walineOptions });
    } catch (e) { console.error(e); }
  }

  _watchSearchPanel() {
    const container = document.querySelector(CommentModule.CONFIG.el);
    if (!container) return;
    this.searchObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            const p = node.matches('.wl-search') ? node : node.querySelector('.wl-search');
            if (p) { this._bindAutoSearch(p); return; }
          }
        }
      }
    });
    this.searchObserver.observe(container, { childList: true, subtree: true });
  }

  _bindAutoSearch(panel) {
    const inp = panel.querySelector('input');
    const btn = panel.querySelector('button');
    if (!inp || !btn || inp.dataset.auto === 'true') return;
    inp.dataset.auto = 'true';
    const go = () => { clearTimeout(this.searchTimer); if (inp.value.trim()) btn.click(); };
    inp.addEventListener('input', () => { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(go, 500); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  open() {
    if (!this.modal) return;
    if (!this.instance) this._initWaline();
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  destroy() {
    clearTimeout(this.searchTimer);
    this.searchObserver?.disconnect();
    this.instance?.destroy?.();
    this.instance = null;
  }
}

document.addEventListener('DOMContentLoaded', () => window.commentModule = new CommentModule());
window.addEventListener('beforeunload', () => window.commentModule?.destroy?.());