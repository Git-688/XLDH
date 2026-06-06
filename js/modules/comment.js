/**
 * 评论模块 - 完整增强版（表情按钮修正版）
 * 功能：显示全部编辑器按钮、评论成就徽章、草稿自动保存、表情选择
 */
class CommentModule {
  static CONFIG = {
    serverURL: (window.APP_CONFIG && window.APP_CONFIG.WALINE_SERVER) || 'https://yy688.ccwu.cc',
    el: '#waline-comment',
    modalId: 'commentModal',
    openBtnId: 'commentBtn',
    activeClass: 'active',
    walineOptions: {
      dark: 'auto',
      meta: ['nick', 'mail', 'link', 'ua', 'region'],
      requiredMeta: ['nick'],
      pageSize: 10,
      login: 'enable',
      // 编辑器工具栏（移除 'emoji'，因为表情通过独立配置启用）
      editorToolbar: [
        'bold',      // 加粗
        'italic',    // 斜体
        'link',      // 插入链接
        'image',     // 插入图片
        'code',      // 插入代码块
        'blockquote',// 引用
        'heading',   // 标题
        'ul',        // 无序列表
        'ol',        // 有序列表
        'hr',        // 分割线
        'strike',    // 删除线
        'spoiler'    // 剧透（黑幕）
      ],
      // 表情配置（独立启用，显示表情按钮）
      emoji: [
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/qq',
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/bilibili',
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/tieba',
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/weibo',
        'https://cdn.jsdelivr.net/npm/@waline/emojis@1.4.0/alus'
      ],
      // 表情包搜索（增强功能）
      search: {
        default() {
          return fetch('https://oiapi.net/api/EmoticonPack?limit=20')
            .then(r => r.json())
            .then(json => {
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
        search(word) {
          return fetch(
            `https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&limit=40`
          )
            .then(r => r.json())
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
        more(word, pageNumber) {
          return fetch(
            `https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&page=${pageNumber}&limit=40`
          )
            .then(r => r.json())
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
      },
      // 等级标签
      locale: {
        level0: '初来乍到',
        level1: '偶尔光临',
        level2: '常驻居民',
        level3: '核心会员',
        level4: '论坛元老',
        level5: '至尊传说'
      },
      // 成就徽章自定义渲染
      comment: (comment) => {
        const achievement = comment.meta?.achievement;
        if (achievement) {
          comment.nick = `${comment.nick} <span class="achievement-badge">${achievement}</span>`;
        }
        return comment;
      }
    }
  };

  constructor() {
    this.instance = null;
    this.modal = null;
    this.openBtn = null;
    this.searchTimer = null;
    this.searchObserver = null;
    this.draftObserver = null;

    this._initDOM();
    this._bindEvents();
    this._initWaline();
    this._watchSearchPanel();
    this._initDraftAutoSave();
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
      if (e.key === 'Escape' && this.modal?.classList.contains(CommentModule.CONFIG.activeClass))
        this.close();
    });
  }

  _initWaline() {
    const { el, serverURL, walineOptions } = CommentModule.CONFIG;
    if (typeof Waline === 'undefined') {
      console.warn('[评论] Waline 库未加载，评论功能不可用');
      const container = document.querySelector(el);
      if (container) {
        container.innerHTML = '<div class="waline-comment-fallback" style="padding: 20px; text-align: center; color: #999;">评论系统加载中，请稍后再试...</div>';
      }
      return;
    }
    const container = document.querySelector(el);
    if (!container) return;
    try {
      this.instance = Waline.init({ el, serverURL, ...walineOptions });
      console.log('[评论] Waline 初始化成功');
    } catch (err) {
      console.error('[评论] 初始化失败', err);
      if (container) {
        container.innerHTML = '<div class="waline-comment-fallback" style="padding: 20px; text-align: center; color: #999;">评论系统暂时不可用，请稍后再试。</div>';
      }
    }
  }

  // 自动搜索（原有功能）
  _watchSearchPanel() {
    const container = document.querySelector(CommentModule.CONFIG.el);
    if (!container) return;

    this.searchObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const panel = node.matches('.wl-search') ? node : node.querySelector('.wl-search');
            if (panel) { this._bindAutoSearch(panel); return; }
          }
        }
      }
    });
    this.searchObserver.observe(container, { childList: true, subtree: true });
  }

  _bindAutoSearch(panel) {
    const input = panel.querySelector('input');
    const btn = panel.querySelector('button');
    if (!input || !btn || input.dataset.auto === 'true') return;
    input.dataset.auto = 'true';

    const trigger = () => {
      clearTimeout(this.searchTimer);
      if (input.value.trim()) btn.click();
    };

    input.addEventListener('input', () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(trigger, 500);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { clearTimeout(this.searchTimer); trigger(); }
    });
  }

  // 草稿自动保存（localStorage）
  _initDraftAutoSave() {
    const container = document.querySelector(CommentModule.CONFIG.el);
    if (!container) return;

    this.draftObserver = new MutationObserver(() => {
      const textarea = container.querySelector('.wl-editor textarea');
      if (textarea && !textarea.dataset.draftBound) {
        textarea.dataset.draftBound = 'true';
        // 恢复草稿
        const draft = localStorage.getItem('waline_draft');
        if (draft && textarea.value === '') {
          textarea.value = draft;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // 自动保存
        textarea.addEventListener('input', (e) => {
          localStorage.setItem('waline_draft', e.target.value);
        });
        // 提交成功后清除草稿
        const form = container.querySelector('.wl-panel form');
        if (form) {
          form.addEventListener('submit', () => {
            localStorage.removeItem('waline_draft');
          });
        }
      }
    });
    this.draftObserver.observe(container, { childList: true, subtree: true });
  }

  open() {
    if (!this.modal) return;
    if (!this.instance) { this._initWaline(); if (!this.instance) return; }
    this.modal.classList.add(CommentModule.CONFIG.activeClass);
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove(CommentModule.CONFIG.activeClass);
    document.body.style.overflow = '';
  }

  destroy() {
    clearTimeout(this.searchTimer);
    this.searchObserver?.disconnect();
    this.draftObserver?.disconnect();
    this.instance?.destroy?.();
    this.instance = null;
  }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  window.commentModule = new CommentModule();
});
window.addEventListener('beforeunload', () => {
  window.commentModule?.destroy?.();
});