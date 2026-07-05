/* comment.js - 已移除表情包搜索，改用 ES Module 导入 Waline */
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
      editorToolbar: [
        'bold', 'italic', 'link', 'image', 'code', 'blockquote',
        'heading', 'ul', 'ol', 'hr', 'strike', 'spoiler'
      ],
      // ===== 自定义表情包（替换为您的部署地址） =====
      emoji: [
        'https://cdn.jsdelivr.net/gh/walinejs/emojis/weibo'
        // 或使用官方测试：'https://unpkg.com/@waline/emojis@1.4.0/weibo'
      ],
      // ===== 搜索功能已移除 =====
      locale: {
        level0: '初来乍到',
        level1: '偶尔光临',
        level2: '常驻居民',
        level3: '核心会员',
        level4: '论坛元老',
        level5: '至尊传说'
      },
      comment: (comment) => {
        const achievement = comment.meta?.achievement;
        if (achievement) {
          comment.nick = `${comment.nick} <span class="achievement-badge">${achievement}</span>`;
        }
        return comment;
      }
    }
  };

  // ===== 核心方法 =====
  constructor() {
    if (window.Starlink && window.Starlink.comment) return window.Starlink.comment;
    this.instance = null;
    this.modal = null;
    this.openBtn = null;
    this.draftObserver = null;
    this.isVisible = false;
    this._initializing = null; // 用于防止重复初始化
    this._initDOM();
    this._bindEvents();
    // 不再立即初始化 Waline，改为懒加载
    this._initDraftAutoSave();
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

  // ===== 改为异步 ES Module 初始化 =====
  async _initWaline() {
    // 如果已经初始化或正在初始化，直接返回
    if (this.instance) return this.instance;
    if (this._initializing) return this._initializing;

    this._initializing = (async () => {
      const { el, serverURL, walineOptions } = CommentModule.CONFIG;
      const container = document.querySelector(el);
      if (!container) throw new Error('Waline 容器不存在');

      try {
        // 动态导入 Waline（ES Module 方式）
        const { init } = await import('https://unpkg.com/@waline/client@v3/dist/waline.js');
        const instance = init({ el, serverURL, ...walineOptions });
        this.instance = instance;
        return instance;
      } catch (err) {
        console.error('[评论] 初始化失败', err);
        container.innerHTML = '<div class="waline-comment-fallback" style="padding:20px;text-align:center;color:#999;">评论系统加载失败，请稍后再试。</div>';
        throw err;
      } finally {
        this._initializing = null;
      }
    })();

    return this._initializing;
  }

  _initDraftAutoSave() {
    const container = document.querySelector(CommentModule.CONFIG.el);
    if (!container) return;
    this.draftObserver = new MutationObserver(() => {
      const textarea = container.querySelector('.wl-editor textarea');
      if (textarea && !textarea.dataset.draftBound) {
        textarea.dataset.draftBound = 'true';
        const draft = localStorage.getItem('waline_draft');
        if (draft && textarea.value === '') {
          textarea.value = draft;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        textarea.addEventListener('input', (e) => {
          localStorage.setItem('waline_draft', e.target.value);
        });
        const form = container.querySelector('.wl-panel form');
        if (form) {
          form.addEventListener('submit', () => {
            localStorage.removeItem('waline_draft');
          });
        }
      }
    });
    this.draftObserver.observe(container, { childList: true, subtree: true });
  }

  async open() {
    if (!this.modal) return;
    // 确保 Waline 已初始化
    if (!this.instance) {
      try {
        await this._initWaline();
      } catch (err) {
        // 初始化失败，仍打开模态框但显示错误信息
        // 已经由 _initWaline 渲染了错误信息
      }
    }
    // 如果 instance 仍然为空，可能是初始化失败，但模态框可以打开显示错误信息
    if (window.Starlink?.sidebar && window.Starlink.sidebar.isVisible?.()) {
      window.Starlink.sidebar.hide();
    } else if (window.sidebar && window.sidebar.isVisible?.()) {
      window.sidebar.hide();
    }
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
    this.draftObserver?.disconnect();
    this.instance?.destroy?.();
    this.instance = null;
  }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  if (!window.Starlink) window.Starlink = {};
  if (!window.Starlink.comment) {
    window.Starlink.comment = new CommentModule();
  }
  window.commentModule = window.Starlink.comment;
});