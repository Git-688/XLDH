/* comment.js - 动态加载 Waline */
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
      editorToolbar: ['bold', 'italic', 'link', 'image', 'code', 'blockquote', 'heading', 'ul', 'ol', 'hr', 'strike', 'spoiler'],
      emoji: [
        'https://cdn.jsdelivr.net/gh/walinejs/emojis/weibo',
        'https://cdn.jsdelivr.net/gh/walinejs/emojis/bmoji',
        'https://unpkg.com/@waline/emojis@1.4.0/alus',
        'https://unpkg.com/@waline/emojis@1.4.0/bilibili',
        'https://unpkg.com/@waline/emojis@1.4.0/qq',
        'https://unpkg.com/@waline/emojis@1.4.0/tieba',
        'https://unpkg.com/@waline/emojis@1.4.0/tw-emoji',
        'https://unpkg.com/@waline/emojis@1.4.0/soul-emoji',
        'https://tc688.ccwu.cc/file/plxt/Q_emoji/',
      ],
      search: {
        default() {
          return fetch('https://oiapi.net/api/EmoticonPack?limit=20')
            .then(r => r.json())
            .then(json => (json.code === 200 || json.code === 1) && Array.isArray(json.data) ? json.data.map(item => ({ src: item.url, title: item.id || '', preview: item.url })) : []);
        },
        search(word) {
          return fetch(`https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&limit=40`)
            .then(r => r.json())
            .then(json => (json.code === 200 || json.code === 1) && Array.isArray(json.data) ? json.data.map(item => ({ src: item.url, title: item.id || word, preview: item.url })) : []);
        },
        more(word, pageNumber) {
          return fetch(`https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&page=${pageNumber}&limit=40`)
            .then(r => r.json())
            .then(json => (json.code === 200 || json.code === 1) && Array.isArray(json.data) ? json.data.map(item => ({ src: item.url, title: item.id || word, preview: item.url })) : []);
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
    if (window.Starlink && window.Starlink.comment) return window.Starlink.comment;
    this.instance = null;
    this.modal = null;
    this.openBtn = null;
    this.isVisible = false;
    this._initDOM();
    this._bindEvents();
    // 移除 _initWaline 的同步调用，改为 open 时加载
    if (window.Starlink) window.Starlink.comment = this;
    window.commentModule = this;
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
      if (e.key === 'Escape' && this.isVisible) this.close();
    });
  }

  async open() {
    if (!this.modal) return;
    if (!this.instance) {
      // 动态加载 Waline
      try {
        const Waline = await import('https://cdn.jsdelivr.net/npm/@waline/client@3.15.2/dist/waline.umd.js');
        const container = document.querySelector(CommentModule.CONFIG.el);
        if (container) {
          this.instance = Waline.init({ el: CommentModule.CONFIG.el, serverURL: CommentModule.CONFIG.serverURL, ...CommentModule.CONFIG.walineOptions });
        }
      } catch (err) {
        console.error('Waline 加载失败', err);
        const container = document.querySelector(CommentModule.CONFIG.el);
        if (container) container.innerHTML = '<div class="waline-comment-fallback">评论系统加载失败，请刷新重试</div>';
        return;
      }
    }
    if (window.Starlink?.sidebar && window.Starlink.sidebar.isVisible?.()) window.Starlink.sidebar.hide();
    else if (window.sidebar && window.sidebar.isVisible?.()) window.sidebar.hide();
    this.modal.classList.add(CommentModule.CONFIG.activeClass);
    this.isVisible = true;
    document.body.style.overflow = 'hidden';
    if (window.Starlink?.app) window.Starlink.app.registerModal(this);
    else if (window.app) window.app.registerModal(this);
  }

  close() {
    if (!this.modal || !this.isVisible) return;
    this.modal.classList.remove(CommentModule.CONFIG.activeClass);
    const onTransitionEnd = () => {
      document.body.style.overflow = '';
      this.isVisible = false;
      if (window.Starlink?.app) window.Starlink.app.unregisterModal(this);
      else if (window.app) window.app.unregisterModal(this);
      this.modal.removeEventListener('transitionend', onTransitionEnd);
    };
    this.modal.addEventListener('transitionend', onTransitionEnd, { once: true });
    setTimeout(onTransitionEnd, 400);
  }

  destroy() {
    this.instance?.destroy?.();
    this.instance = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.Starlink) window.Starlink = {};
  if (!window.Starlink.comment) {
    window.Starlink.comment = new CommentModule();
  }
  window.commentModule = window.Starlink.comment;
});