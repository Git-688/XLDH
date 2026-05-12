/**
 * 评论模块 - Waline V3 修复版（关闭按钮事件委托）
 * 集成 QQ 表情搜索 API + 输入自动搜索（防抖500ms）
 * 已恢复显示 “Powered by Waline” 和订阅链接
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
      // ⚠️ 已移除 noCopyright 和 noRss，让版权和订阅显示
      // noCopyright: true,
      // noRss: true,

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
              if (json.code === 200 && Array.isArray(json.data)) {
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
              if (json.code === 200 && Array.isArray(json.data)) {
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
              if (json.code === 200 && Array.isArray(json.data)) {
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

  // 观察搜索面板，绑定自动搜索
  _watchSearchPanel() {
    if (this.searchObserver) this.searchObserver.disconnect();

    this.searchObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && (node.matches?.('.wl-search') || node.querySelector?.('.wl-search'))) {
            const panel = node.matches('.wl-search') ? node : node.querySelector('.wl-search');
            if (panel) this._bindSearchInput(panel);
          }
        });
      });
    });

    const container = document.querySelector(CommentModule.CONFIG.el);
    if (container) {
      this.searchObserver.observe(container, { childList: true, subtree: true });
    }
  }

  _bindSearchInput(searchPanel) {
    const input = searchPanel.querySelector('input');
    const searchBtn = searchPanel.querySelector('button');
    if (!input || !searchBtn) return;

    if (input.dataset.autoSearchBound === 'true') return;
    input.dataset.autoSearchBound = 'true';

    const triggerSearch = () => {
      clearTimeout(this.searchInputTimer);
      const word = input.value.trim();
      if (word) {
        searchBtn.click();
      }
    };

    input.addEventListener('input', () => {
      clearTimeout(this.searchInputTimer);
      this.searchInputTimer = setTimeout(triggerSearch, 500);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(this.searchInputTimer);
        triggerSearch();
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
    console.log('[评论] 实例已销毁');
  }
}

// 启动
document.addEventListener('DOMContentLoaded', () => window.commentModule = new CommentModule());
window.addEventListener('beforeunload', () => window.commentModule?.destroy?.());