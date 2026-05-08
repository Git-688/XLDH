/**
 * 评论模块 - Waline V3 独立模块化版
 * 新增加载兜底、重试机制、完善错误处理
 */
class CommentModule {
  // 所有可修改配置集中管理，后续维护仅需改这里
  static CONFIG = {
    // 替换为你自己的Waline服务端地址
    serverURL: 'https://yy688.ccwu.cc',
    // DOM元素配置，与HTML结构一一对应
    el: '#waline-comment',
    modalId: 'commentModal',
    openBtnId: 'commentBtn',
    closeBtnSelector: '.feedback-modal-close',
    activeClass: 'active',
    // 加载重试配置
    maxRetryTimes: 5,
    retryInterval: 500,
    // Waline核心配置
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
    this.retryCount = 0;

    // 初始化流程
    this._initDOM();
    this._bindEvents();
    this._waitForWalineLoad();
  }

  /**
   * 初始化DOM元素，集中管理，避免重复查询
   * @private
   */
  _initDOM() {
    const { modalId, openBtnId, closeBtnSelector } = CommentModule.CONFIG;
    
    this.modal = document.getElementById(modalId);
    this.openBtn = document.getElementById(openBtnId);
    if (this.modal) this.closeBtn = this.modal.querySelector(closeBtnSelector);

    // 错误提示
    if (!this.modal) {
      console.error(`[评论模块] 模态框#${modalId}未找到，请检查HTML结构`);
      window.toast?.show?.('评论模块容器未找到', 'error');
    }
    if (!this.openBtn) {
      console.warn(`[评论模块] 打开按钮#${openBtnId}未找到`);
    }
  }

  /**
   * 集中绑定所有事件
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

    // 点击遮罩层关闭
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains(CommentModule.CONFIG.activeClass)) {
        this.close();
      }
    });
  }

  /**
   * 等待Waline加载完成，带重试机制
   * @private
   */
  _waitForWalineLoad() {
    const { maxRetryTimes, retryInterval } = CommentModule.CONFIG;

    // 检查Waline是否已加载
    if (typeof Waline !== 'undefined') {
      console.log('[评论模块] Waline加载完成，开始初始化');
      this._initWaline();
      return;
    }

    // 重试次数未到上限，继续等待
    if (this.retryCount < maxRetryTimes) {
      this.retryCount++;
      console.log(`[评论模块] Waline未加载，第${this.retryCount}次重试`);
      setTimeout(() => this._waitForWalineLoad(), retryInterval);
      return;
    }

    // 重试次数耗尽，加载失败
    const errorMsg = '评论系统加载失败，请检查网络后刷新页面重试';
    console.error(`[评论模块] Waline加载失败，已重试${maxRetryTimes}次`);
    window.toast?.show?.(errorMsg, 'error');
  }

  /**
   * Waline V3 初始化
   * @private
   */
  _initWaline() {
    const { el, serverURL, walineOptions } = CommentModule.CONFIG;

    // 挂载容器校验
    if (!document.querySelector(el)) {
      console.error(`[评论模块] Waline挂载容器${el}未找到`);
      window.toast?.show?.('评论系统挂载容器不存在', 'error');
      return;
    }

    // 初始化实例
    try {
      this.walineInstance = Waline.init({
        el,
        serverURL,
        ...walineOptions,
      });
      console.log('[评论模块] Waline初始化成功');
    } catch (error) {
      console.error('[评论模块] Waline初始化失败:', error);
      window.toast?.show?.('评论系统初始化失败，请稍后重试', 'error');
    }
  }

  /**
   * 打开评论模态框 - 全局可调用
   * @public
   */
  open() {
    const { activeClass } = CommentModule.CONFIG;

    if (!this.modal) {
      window.toast?.show?.('评论模块容器不存在', 'error');
      return;
    }
    if (!this.walineInstance) {
      window.toast?.show?.('评论系统加载中，请稍后再试', 'warning');
      return;
    }

    this.modal.classList.add(activeClass);
    document.body.style.overflow = 'hidden'; // 禁止页面滚动
  }

  /**
   * 关闭评论模态框 - 全局可调用
   * @public
   */
  close() {
    const { activeClass } = CommentModule.CONFIG;
    if (!this.modal) return;

    this.modal.classList.remove(activeClass);
    document.body.style.overflow = ''; // 恢复页面滚动
  }

  /**
   * 销毁实例，页面卸载时调用，避免内存泄漏
   * @public
   */
  destroy() {
    this.walineInstance?.destroy?.();
    this.walineInstance = null;
    console.log('[评论模块] 已销毁');
  }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 挂载到window，全局可调用 window.commentModule.open()/close()
  window.commentModule = new CommentModule();
});

// 页面卸载时销毁实例
window.addEventListener('beforeunload', () => {
  window.commentModule?.destroy?.();
});
