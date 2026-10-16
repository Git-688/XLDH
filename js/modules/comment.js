/* comment.js - Twikoo 评论模块 */

const TWIKOO_STYLES = `
#twikoo-comment.twikoo {
  --twikoo-theme: var(--primary-color, #4361ee);
  --twikoo-bg: var(--bg-card, #ffffff);
  --twikoo-bg-secondary: var(--bg-secondary, #f8f9fa);
  --twikoo-border: var(--border-color, #e9ecef);
  --twikoo-text: var(--text-primary, #2b2d42);
  --twikoo-text-secondary: var(--text-secondary, #6c757d);
}

#twikoo-comment.twikoo .tk-submit {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e9ecef);
  border-radius: 8px;
  padding: 12px;
  color: var(--text-primary, #2b2d42);
}

#twikoo-comment.twikoo .tk-row {
  background: transparent;
}

#twikoo-comment.twikoo .tk-input {
  background: var(--bg-card, #ffffff);
  color: var(--text-primary, #2b2d42);
  border: 1px solid var(--border-color, #e9ecef);
  border-radius: 8px;
}

#twikoo-comment.twikoo .tk-input:focus {
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

#twikoo-comment.twikoo .tk-meta-input .el-input-group__prepend,
#twikoo-comment.twikoo .tk-meta-input > .el-input > .el-input-group__prepend {
  background: var(--bg-secondary, #f8f9fa);
  color: var(--text-secondary, #6c757d);
  border-color: var(--border-color, #e9ecef);
}

#twikoo-comment.twikoo .tk-submit .el-button--primary {
  background: var(--primary-color, #4361ee);
  border-color: var(--primary-color, #4361ee);
  color: #fff;
  border-radius: 8px;
}

#twikoo-comment.twikoo .tk-submit .el-button--primary:hover {
  background: var(--secondary-color, #3a0ca3);
  border-color: var(--secondary-color, #3a0ca3);
}

#twikoo-comment.twikoo .tk-submit .el-button:not(.el-button--primary) {
  background: var(--bg-card, #ffffff);
  border-color: var(--border-color, #e9ecef);
  color: var(--text-secondary, #6c757d);
  border-radius: 8px;
}

#twikoo-comment.twikoo .tk-submit .el-button:not(.el-button--primary):hover {
  border-color: var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
}

#twikoo-comment.twikoo .tk-comments {
  padding: 0;
  margin: 0;
}

#twikoo-comment.twikoo .tk-comment {
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  padding: 12px 0;
  background: transparent;
}

#twikoo-comment.twikoo .tk-nick,
#twikoo-comment.twikoo .tk-content {
  color: var(--text-primary, #2b2d42);
}

#twikoo-comment.twikoo .tk-time {
  color: var(--text-secondary, #6c757d);
}

#twikoo-comment.twikoo .tk-action-icon,
#twikoo-comment.twikoo .tk-action-link {
  color: var(--text-secondary, #6c757d);
}

#twikoo-comment.twikoo .tk-action-icon:hover,
#twikoo-comment.twikoo .tk-action-link:hover {
  color: var(--primary-color, #4361ee);
}

#twikoo-comment.twikoo .tk-emoji,
#twikoo-comment.twikoo .tk-emoji-container {
  background: transparent;
  border: none;
}

#twikoo-comment.twikoo .tk-pagination,
#twikoo-comment.twikoo .tk-pagination-page {
  background: transparent;
}

.dark-mode #twikoo-comment.twikoo {
  --twikoo-bg: #2d2d2d;
  --twikoo-bg-secondary: #1e1e1e;
  --twikoo-border: #404040;
  --twikoo-text: #f8f9fa;
  --twikoo-text-secondary: #adb5bd;
}

.dark-mode #twikoo-comment.twikoo .tk-submit {
  background: var(--bg-card, #2d2d2d);
  border-color: var(--border-color, #404040);
}

.dark-mode #twikoo-comment.twikoo .tk-input {
  background: var(--bg-secondary, #1e1e1e);
  color: var(--text-primary, #f8f9fa);
  border-color: var(--border-color, #404040);
}

.dark-mode #twikoo-comment.twikoo .tk-meta-input .el-input-group__prepend {
  background: var(--bg-card, #2d2d2d);
  color: var(--text-secondary, #adb5bd);
  border-color: var(--border-color, #404040);
}

.dark-mode #twikoo-comment.twikoo .tk-comment {
  border-bottom-color: var(--border-color, #404040);
}

.dark-mode #twikoo-comment.twikoo .tk-nick,
.dark-mode #twikoo-comment.twikoo .tk-content {
  color: var(--text-primary, #f8f9fa);
}

.dark-mode #twikoo-comment.twikoo .tk-time {
  color: var(--text-secondary, #adb5bd);
}
`;

class CommentModule {
  static CONFIG = {
    twikooEnvId: (window.APP_CONFIG && window.APP_CONFIG.TWIKOO_ENV_ID) || 'https://pl688.ccwu.cc',
    twikooStyles: TWIKOO_STYLES,
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

    const { el, twikooEnvId, twikooStyles } = CommentModule.CONFIG;
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
        styles: twikooStyles,
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