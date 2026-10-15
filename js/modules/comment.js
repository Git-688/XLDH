/* comment.js - 已从 Waline 迁移至 Twikoo，支持 Twikoo 2.x 动态加载 */
class CommentModule {
  static CONFIG = {
    // ===== Twikoo 后端地址（自定义域名） =====
    twikooEnvId: (window.APP_CONFIG && window.APP_CONFIG.TWIKOO_ENV_ID) || 'https://pl688.ccwu.cc',
    // ===== Twikoo 2.x 前端 SDK（ESM）CDN 地址 =====
    twikooCdnList: [
      'https://cdn.jsdelivr.net/npm/twikoo@2/dist/twikoo.min.js',
      'https://unpkg.com/twikoo@2/dist/twikoo.min.js',
      'https://cdn.jsdelivr.net/npm/twikoo@2.0.14/dist/twikoo.min.js'
    ],
    el: '#twikoo-comment',
    modalId: 'commentModal',
    openBtnId: 'commentBtn',
    activeClass: 'active',
    // ===== 初始化重试配置 =====
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
    this._sdkLoadingPromise = null;
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

  // ===== 动态加载 Twikoo 2.x SDK（ESM） =====
  async _loadTwikooSDK() {
    if (window.twikoo && typeof window.twikoo.init === 'function') return true;
    if (this._sdkLoadingPromise) return this._sdkLoadingPromise;

    this._sdkLoadingPromise = (async () => {
      const cdnList = CommentModule.CONFIG.twikooCdnList;
      for (const url of cdnList) {
        try {
          console.log(`[评论] 尝试加载 Twikoo SDK: ${url}`);
          const mod = await import(/* @vite-ignore */ url);
          const twikoo = mod.default || mod;
          if (twikoo && typeof twikoo.init === 'function') {
            window.twikoo = twikoo;
            console.log('[评论] Twikoo SDK 加载成功');
            return true;
          }
        } catch (err) {
          console.warn(`[评论] 从 ${url} 加载失败:`, err.message || err);
        }
      }
      console.error('[评论] 所有 CDN 均加载 Twikoo SDK 失败');
      return false;
    })();

    const result = await this._sdkLoadingPromise;
    if (!result) this._sdkLoadingPromise = null;
    return result;
  }

  // ===== 初始化 Twikoo =====
  async _initTwikoo() {
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

    const { el, twikooEnvId } = CommentModule.CONFIG;
    console.log(`[评论] 初始化 Twikoo（第 ${this._initAttempts} 次尝试），envId: ${twikooEnvId}`);

    const container = document.querySelector(el);
    if (!container) {
      console.warn('[评论] 未找到 Twikoo 挂载容器');
      this._initCooldownUntil = now + CommentModule.CONFIG.INIT_COOLDOWN_MS;
      return;
    }

    container.innerHTML = '<div class="twikoo-fallback" style="padding:20px;text-align:center;color:#999;">评论系统加载中...</div>';

    const sdkLoaded = await this._loadTwikooSDK();
    if (!sdkLoaded) {
      console.warn('[评论] Twikoo SDK 加载失败，进入冷却等待');
      container.innerHTML = '<div class="twikoo-fallback" style="padding:20px;text-align:center;color:#999;">评论系统加载失败，请稍后再试。</div>';
      this._initCooldownUntil = now + CommentModule.CONFIG.INIT_COOLDOWN_MS;
      return;
    }

    try {
      container.innerHTML = '';
      this.instance = window.twikoo.init({
        envId: twikooEnvId,
        el: el,
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
    this._sdkLoadingPromise = null;
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