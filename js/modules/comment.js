/* comment.js - 已从 Waline 迁移至 Twikoo，使用 styles 参数注入自定义样式（无 !important 覆盖） */
class CommentModule {
  static CONFIG = {
    // ===== Twikoo 后端地址（自定义域名） =====
    twikooEnvId: (window.APP_CONFIG && window.APP_CONFIG.TWIKOO_ENV_ID) || 'https://pl688.ccwu.cc',
    // ===== 自定义样式文件（Twikoo 会在默认样式之后注入，优先级更高） =====
    twikooStylesUrl: './css/modules/comment.css',
    el: '#twikoo-comment',
    modalId: 'commentModal',
    openBtnId: 'commentBtn',
    activeClass: 'active',
    INIT_MAX_ATTEMPTS: 3,
    INIT_COOLDOWN_MS: 30 * 1000,
  };

  constructor() {
    if (window.Starlink && window.Starlink.comment) return window.Starlink.comment;
    this.instance = null;
    this.modal = null;
    this.openBtn = null;
    this.isVisible = false;
    this._initialized = false;
    this._initAttempts = 0;
    this._initCooldownUntil = 0;
    this._initFailed = false;
    this._initDOM();
    this._bindEvents();
    this._initTwikoo();
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

  // ===== 初始化 Twikoo =====
  _initTwikoo() {
    if (this._initialized) return;

    const now = Date.now();
    if (this._initCooldownUntil && now < this._initCooldownUntil) {
      console.log(`[评论] Twikoo 初始化冷却中，剩余 ${Math.ceil((this._initCooldownUntil - now) / 1000)} 秒`);
      return;
    }

    if (this._initAttempts >= CommentModule.CONFIG.INIT_MAX_ATTEMPTS) {
      if (!this._initFailed) {
        this._initFailed = true;
        const container = document.querySelector(CommentModule.CONFIG.el);
        if (container) {
          container.innerHTML = '<div class="twikoo-fallback" style="padding:20px;text-align:center;color:#999;">评论系统暂时不可用，请稍后再试。</div>';
        }
        console.warn('[评论] Twikoo 初始化已达最大尝试次数，停止重试');
      }
      return;
    }

    this._initAttempts++;

    const { el, twikooEnvId, twikooStylesUrl } = CommentModule.CONFIG;
    console.log(`[评论] 初始化 Twikoo（第 ${this._initAttempts} 次尝试），envId: ${twikooEnvId}`);

    const container = document.querySelector(el);
    if (!container) {
      console.warn('[评论] 未找到 Twikoo 挂载容器');
      this._initCooldownUntil = now + CommentModule.CONFIG.INIT_COOLDOWN_MS;
      return;
    }

    if (typeof window.twikoo === 'undefined' || typeof window.twikoo.init !== 'function') {
      console.warn('[评论] Twikoo SDK 尚未加载，进入冷却等待');
      container.innerHTML = '<div class="twikoo-fallback" style="padding:20px;text-align:center;color:#999;">评论系统加载中，请稍后再试...</div>';
      this._initCooldownUntil = now + CommentModule.CONFIG.INIT_COOLDOWN_MS;
      return;
    }

    try {
      container.innerHTML = '';
      this.instance = window.twikoo.init({
        envId: twikooEnvId,
        el: el,
        // ===== 关键：Twikoo 会在自身默认样式之后加载此 CSS，从而无需 !important 即可覆盖 =====
        styles: twikooStylesUrl,
      });
      this._initialized = true;
      this._initFailed = false;
      this._initAttempts = 0;
      this._initCooldownUntil = 0;
      console.log('[评论] Twikoo 初始化成功');
    } catch (err) {
      console.error('[评论] 初始化失败', err);
      this._initCooldownUntil = now + CommentModule.CONFIG.INIT_COOLDOWN_MS;
      container.innerHTML = '<div class="twikoo-fallback" style="padding:20px;text-align:center;color:#999;">评论系统暂时不可用，请稍后再试。</div>';
    }
  }

  async open() {
    if (!this.modal) return;
    if (!this._initialized) {
      await this._initTwikoo();
      if (!this._initialized) {
        if (this._initFailed) {
          window.toast?.show('评论系统暂时不可用，请稍后再试', 'error');
        } else {
          window.toast?.show('评论系统加载中，请稍后重试', 'info');
        }
        return;
      }
    }
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
    if (this.instance && typeof this.instance.destroy === 'function') {
      try { this.instance.destroy(); } catch (e) { console.warn('[评论] destroy 实例失败:', e); }
    }
    this.instance = null;
    this._initialized = false;
    this._initAttempts = 0;
    this._initCooldownUntil = 0;
    this._initFailed = false;
    this.isVisible = false;
    document.body.style.overflow = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.Starlink) window.Starlink = {};
  if (!window.Starlink.comment) {
    window.Starlink.comment = new CommentModule();
  }
  window.commentModule = window.Starlink.comment;
});