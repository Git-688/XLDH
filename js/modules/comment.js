/**
 * 评论模块 - Waline V3 修复版
 * 集成 QQ 表情搜索 + 自动搜索 (防抖 500ms)
 * 已移除版权信息和订阅链接
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
      
      noCopyright: true,   // 隐藏 “Powered by Waline”
      // noRss: false,         // 隐藏订阅链接

      emoji: [
        'https://unpkg.com/@waline/emojis@1.4.0/bilibili',
        'https://unpkg.com/@waline/emojis@1.4.0/qq',
        'https://unpkg.com/@waline/emojis@1.4.0/tieba',
        'https://unpkg.com/@waline/emojis@1.4.0/weibo',
        'https://unpkg.com/@waline/emojis@1.4.0/alus',
      ],

      // 自定义表情搜索 (QQ 表情包 API)
      search: {
        // 默认推荐
        default() {
          return fetch('https://oiapi.net/api/EmoticonPack?limit=20')
            .then(res => res.json())
            .then(json => {
              // 该 API 成功时 code 为 1
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({
                  src: item.url,
                  title: item.id || '',
                  preview: item.url
                }));
              }
              return [];
            })
            .catch(() => []);
        },
        // 关键词搜索
        search(word) {
          return fetch(
            `https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&limit=40`
          )
            .then(res => res.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({
                  src: item.url,
                  title: item.id || word,
                  preview: item.url
                }));
              }
              return [];
            })
            .catch(() => []);
        },
        // 加载更多（分页）
        more(word, pageNumber) {
          return fetch(
            `https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&page=${pageNumber}&limit=40`
          )
            .then(res => res.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({
                  src: item.url,
                  title: item.id || word,
                  preview: item.url
                }));
              }
              return [];
            })
            .catch(() => []);
        }
      }
    }
  };

  constructor() {
    this.walineInstance = null;
    this.modal = null;
    this.openBtn = null;
    this.searchInputTimer = null;
    this.searchObserver = null;

    this._initDOM();
    this._bindEvents();
    this._initWaline();
    this._watchSearchPanel();
  }

  _initDOM() {
    const { modalId, openBtnId } = CommentModule.CONFIG;
    this.modal = document.getElementById(modalId);
    this.openBtn = document.getElementById(openBtnId);
    if (!this.modal) console.error('[评论] 模态框未找到');
  }

  _bindEvents() {
    if (this.openBtn) this.openBtn.addEventListener('click', () => this.open());
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target.closest('.feedback-modal-close')) { this.close(); return; }
        if (e.target === this.modal) this.close();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains(CommentModule.CONFIG.activeClass))
        this.close();
    });
  }

  _initWaline() {
    const { el, serverURL, walineOptions } = CommentModule.CONFIG;
    if (typeof Waline === 'undefined') { console.error('[评论] Waline 脚本未加载'); return; }
    const container = document.querySelector(el);
    if (!container) { console.error('[评论] 挂载容器未找到'); return; }
    try {
      this.walineInstance = Waline.init({ el, serverURL, ...walineOptions });
      console.log('[评论] Waline 初始化成功');
    } catch (error) { console.error('[评论] Waline 初始化失败:', error); }
  }

  // 监听搜索面板，绑定输入自动搜索
  _watchSearchPanel() {
    if (this.searchObserver) this.searchObserver.disconnect();

    const container = document.querySelector(CommentModule.CONFIG.el);
    if (!container) return;

    this.searchObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const panel = node.matches('.wl-search') ? node : node.querySelector('.wl-search');
            if (panel) {
              this._bindAutoSearch(panel);
              return;
            }
          }
        }
      }
    });

    this.searchObserver.observe(container, { childList: true, subtree: true });
  }

  _bindAutoSearch(panel) {
    const input = panel.querySelector('input');
    const btn = panel.querySelector('button');

    if (!input || !btn) {
      console.warn('[自动搜索] 未找到输入框或按钮');
      return;
    }

    if (input.dataset.autoSearchBound === 'true') return;
    input.dataset.autoSearchBound = 'true';

    const trigger = () => {
      clearTimeout(this.searchInputTimer);
      const word = input.value.trim();
      if (word) {
        btn.click();
      }
    };

    input.addEventListener('input', () => {
      clearTimeout(this.searchInputTimer);
      this.searchInputTimer = setTimeout(trigger, 500);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(this.searchInputTimer);
        trigger();
      }
    });
  }

  open() {
    if (!this.modal) return;
    if (!this.walineInstance) { this._initWaline(); if (!this.walineInstance) return; }
    this.modal.classList.add(CommentModule.CONFIG.activeClass);
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove(CommentModule.CONFIG.activeClass);
    document.body.style.overflow = '';
  }

  destroy() {
    clearTimeout(this.searchInputTimer);
    if (this.searchObserver) this.searchObserver.disconnect();
    this.walineInstance?.destroy?.();
    this.walineInstance = null;
  }
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
  window.commentModule = new CommentModule();
});

window.addEventListener('beforeunload', () => {
  window.commentModule?.destroy?.();
});