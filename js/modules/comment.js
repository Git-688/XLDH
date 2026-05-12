/**
 * 评论模块 - Waline V3 修复版（关闭按钮事件委托）
 * 现已添加多套表情包支持
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
      meta: ['nick', 'mail', 'link'],
      requiredMeta: ['nick'],
      pageSize: 10,
      login: 'enable',
      copyright: false,
      // 多套表情包
      emoji: [
        'https://unpkg.com/@waline/emojis@1.4.0/bilibili',
        'https://unpkg.com/@waline/emojis@1.4.0/qq',
        'https://unpkg.com/@waline/emojis@1.4.0/tieba',
        'https://unpkg.com/@waline/emojis@1.4.0/weibo',
        'https://unpkg.com/@waline/emojis@1.4.0/alus',
      ],
    }
  };

  constructor() {
    this.walineInstance = null;
    this.modal = null;
    this.openBtn = null;

    this._initDOM();
    this._bindEvents();
    this._initWaline();
  }

  _initDOM() {
    const { modalId, openBtnId } = CommentModule.CONFIG;
    this.modal = document.getElementById(modalId);
    this.openBtn = document.getElementById(openBtnId);
    if (!this.modal) {
      console.error('[评论] 模态框未找到');
    }
  }

  _bindEvents() {
    // 打开按钮
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }

    // 通过事件委托处理关闭按钮和背景点击
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        // 点击关闭按钮（包括内部任何子元素）
        if (e.target.closest('.feedback-modal-close')) {
          this.close();
          return;
        }
        // 点击背景（透明，但仍可关闭）
        if (e.target === this.modal) {
          this.close();
        }
      });
    }

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains(CommentModule.CONFIG.activeClass)) {
        this.close();
      }
    });
  }

  _initWaline() {
    const { el, serverURL, walineOptions } = CommentModule.CONFIG;

    if (typeof Waline === 'undefined') {
      console.error('[评论] Waline 脚本未加载');
      return;
    }

    const container = document.querySelector(el);
    if (!container) {
      console.error('[评论] 挂载容器未找到');
      return;
    }

    try {
      this.walineInstance = Waline.init({
        el,
        serverURL,
        ...walineOptions,
      });
      console.log('[评论] Waline 初始化成功');
    } catch (error) {
      console.error('[评论] Waline 初始化失败:', error);
    }
  }

  open() {
    if (!this.modal) return;
    if (!this.walineInstance) {
      console.warn('[评论] 实例未初始化，重新初始化...');
      this._initWaline();
      if (!this.walineInstance) return;
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
    this.walineInstance?.destroy?.();
    this.walineInstance = null;
    console.log('[评论] 实例已销毁');
  }
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
  window.commentModule = new CommentModule();
});

window.addEventListener('beforeunload', () => {
  window.commentModule?.destroy?.();
});