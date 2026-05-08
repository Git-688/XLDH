/**
 * 评论模块 - Waline V3 独立模块化版
 * 无全局污染，不影响原有模态框、搜索、笔记功能
 */
class CommentModule {
  // 集中配置，与HTML/CSS完全匹配
  static CONFIG = {
    serverURL: 'https://yy688.ccwu.cc',
    el: '#waline-comment',
    modalId: 'commentModal',
    openBtnId: 'commentBtn',
    closeBtnSelector: '.comment-modal-close',
    activeClass: 'active',
    walineOptions: {
      dark: 'auto',
      meta: ['nick', 'mail', 'link'],
      requiredMeta: ['nick'],
      pageSize: 10,
      login: 'enable',
      copyright: false,
    }
  };

  constructor() {
    this.walineInstance = null;
    this.modal = null;
    this.openBtn = null;
    this.closeBtn = null;
    this.isModalOpen = false; // 独立状态标记，不影响其他模态框

    this._initDOM();
    this._bindEvents();
    this._initWaline();
  }

  /**
   * 初始化DOM元素，仅查询自身相关节点
   * @private
   */
  _initDOM() {
    const { modalId, openBtnId, closeBtnSelector } = CommentModule.CONFIG;
    
    this.modal = document.getElementById(modalId);
    this.openBtn = document.getElementById(openBtnId);
    if (this.modal) this.closeBtn = this.modal.querySelector(closeBtnSelector);

    if (!this.modal) {
      console.error(`[评论模块] 模态框#${modalId}未找到`);
      window.toast?.show?.('评论模块容器未找到', 'error');
    }
  }

  /**
   * 绑定事件，仅作用于自身元素，不委托全局
   * @private
   */
  _bindEvents() {
    // 打开按钮
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }

    // 关闭按钮
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    // 点击遮罩层关闭（仅自身遮罩）
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // ESC键关闭（仅自身激活时生效）
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.close();
      }
    });
  }

  /**
   * Waline初始化，精准校验
   * @private
   */
  _initWaline() {
    const { el, serverURL, walineOptions } = CommentModule.CONFIG;

    if (typeof Waline === 'undefined') {
      const errorMsg = 'Waline核心文件加载失败，请检查网络';
      console.error(`[评论模块] ${errorMsg}`);
      window.toast?.show?.(errorMsg, 'error');
      return;
    }

    if (!document.querySelector(el)) {
      console.error(`[评论模块] Waline挂载容器${el}未找到`);
      return;
    }

    try {
      this.walineInstance = Waline.init({
        el,
        serverURL,
        ...walineOptions,
      });
      console.log('[评论模块] 初始化成功');
    } catch (error) {
      console.error('[评论模块] 初始化失败:', error);
      window.toast?.show?.('评论系统初始化失败', 'error');
    }
  }

  /**
   * 打开模态框，独立滚动锁定，不影响其他模态框
   * @public
   */
  open() {
    const { activeClass } = CommentModule.CONFIG;

    if (!this.modal || !this.walineInstance) {
      window.toast?.show?.('评论系统加载异常，请刷新重试', 'warning');
      return;
    }

    this.modal.classList.add(activeClass);
    this.isModalOpen = true;
    // 仅锁定滚动，不修改其他全局样式
    document.body.style.overflow = 'hidden';
  }

  /**
   * 关闭模态框，安全恢复滚动，不影响其他模态框
   * @public
   */
  close() {
    const { activeClass } = CommentModule.CONFIG;
    if (!this.modal) return;

    this.modal.classList.remove(activeClass);
    this.isModalOpen = false;
    // 安全恢复滚动，不强制覆盖其他模态框的设置
    document.body.style.overflow = '';
  }

  /**
   * 销毁实例
   * @public
   */
  destroy() {
    this.walineInstance?.destroy?.();
    this.walineInstance = null;
    this.close();
  }
}

// 页面加载完成后初始化，不抢占原有业务的执行时序
window.addEventListener('load', () => {
  window.commentModule = new CommentModule();
});

// 页面卸载时销毁
window.addEventListener('beforeunload', () => {
  window.commentModule?.destroy?.();
});
