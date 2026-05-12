/**
 * 评论模块 - Waline V3 修复版
 * 已集成 QQ 表情搜索 API，并实现输入后自动搜索（防抖 500ms）
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
      noCopyright: true,
      noRss: true,

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
    this.searchInputTimer = null;   // 防抖定时器
    this.searchObserver = null;     // 监听搜索面板的观察者

    this._initDOM();
    this._bindEvents();
    this._initWaline();
    this._watchSearchPanel();       // 启动自动搜索监听
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

  // 观察搜索面板的出现，并给输入框绑定自动搜索
  _watchSearchPanel() {
    // 如果已经有一个观察者，先断开
    if (this.searchObserver) this.searchObserver.disconnect();

    this.searchObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && (node.matches?.('.wl-search') || node.querySelector?.('.wl-search'))) {
            // 搜索面板已插入 DOM，绑定输入事件
            const searchPanel = node.matches('.wl-search') ? node : node.querySelector('.wl-search');
            if (searchPanel) this._bindSearchInput(searchPanel);
          }
        });
      });
    });

    // 观察评论容器下所有子节点的增加
    const container = document.querySelector(CommentModule.CONFIG.el);
    if (container) {
      this.searchObserver.observe(container, { childList: true, subtree: true });
    }
  }

  // 在搜索面板中找到输入框，绑定 input 事件
  _bindSearchInput(searchPanel) {
    const input = searchPanel.querySelector('input');
    const searchBtn = searchPanel.querySelector('button'); // 通常是搜索按钮
    if (!input || !searchBtn) return;

    // 防止重复绑定
    if (input.dataset.autoSearchBound === 'true') return;
    input.dataset.autoSearchBound = 'true';

    const triggerSearch = () => {
      clearTimeout(this.searchInputTimer);
      const word = input.value.trim();
      if (word) {
        // 模拟点击搜索按钮，让 Waline 内部调用我们提供的 search 函数
        searchBtn.click();
      }
    };

    // 防抖 500ms 后自动搜索
    input.addEventListener('input', () => {
      clearTimeout(this.searchInputTimer);
      this.searchInputTimer = setTimeout(triggerSearch, 500);
    });

    // 按回车立即搜索
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
    // 清理定时器和观察者
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