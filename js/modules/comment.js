/**
 * 评论模块 - Waline V3 修复版
 * 已集成 QQ 表情包搜索 API (oiapi.net)
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

      // 自定义表情搜索 (替换 Giphy)
      search: {
        // 打开搜索框时默认展示（随机热门）
        default() {
          return fetch('https://oiapi.net/api/EmoticonPack?limit=20')
            .then(res => res.json())
            .then(json => {
              if (json.code === 200 && Array.isArray(json.data)) {
                return json.data.map(item => ({
                  src: item.url,       // 图片地址
                  title: item.id || '', // 可选，用作 alt
                  preview: item.url    // 缩略图（这里直接用原图）
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
          // pageNumber 从 1 开始，对应 API 的 page 参数
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
    this._initDOM();
    this._bindEvents();
    this._initWaline();
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
    this.walineInstance?.destroy?.();
    this.walineInstance = null;
  }
}

// 启动
document.addEventListener('DOMContentLoaded', () => window.commentModule = new CommentModule());
window.addEventListener('beforeunload', () => window.commentModule?.destroy?.());