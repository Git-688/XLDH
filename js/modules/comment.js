/* comment.js - 完整版（含用户信息显示） */
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
      editorToolbar: [
        'bold', 'italic', 'link', 'image', 'code', 'blockquote',
        'heading', 'ul', 'ol', 'hr', 'strike', 'spoiler'
      ],
      emoji: [
        'https://cdn.jsdelivr.net/gh/walinejs/emojis/weibo',
        'https://cdn.jsdelivr.net/gh/walinejs/emojis/bmoji',
        'https://unpkg.com/@waline/emojis@1.4.0/alus',
        'https://unpkg.com/@waline/emojis@1.4.0/bilibili',
        'https://unpkg.com/@waline/emojis@1.4.0/qq',
        'https://unpkg.com/@waline/emojis@1.4.0/tieba',
        'https://unpkg.com/@waline/emojis@1.4.0/tw-emoji',
        'https://unpkg.com/@waline/emojis@1.4.0/soul-emoji',
        'https://tc688.ccwu.cc/file/plxt/Q_emoji/',
      ],
      search: {
        default() {
          return fetch('https://oiapi.net/api/EmoticonPack?limit=20')
            .then(r => r.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({ src: item.url, title: item.id || '', preview: item.url }));
              }
              return [];
            })
            .catch(() => []);
        },
        search(word) {
          return fetch(`https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&limit=40`)
            .then(r => r.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({ src: item.url, title: item.id || word, preview: item.url }));
              }
              return [];
            })
            .catch(() => []);
        },
        more(word, pageNumber) {
          return fetch(`https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&page=${pageNumber}&limit=40`)
            .then(r => r.json())
            .then(json => {
              if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
                return json.data.map(item => ({ src: item.url, title: item.id || word, preview: item.url }));
              }
              return [];
            })
            .catch(() => []);
        }
      },
      locale: {
        level0: '初来乍到',
        level1: '偶尔光临',
        level2: '常驻居民',
        level3: '核心会员',
        level4: '论坛元老',
        level5: '至尊传说'
      },
      comment: (comment) => {
        // 1. 成就徽章（保留原逻辑）
        const achievement = comment.meta?.achievement;
        if (achievement) {
          comment.nick = `${comment.nick} <span class="achievement-badge">${achievement}</span>`;
        }

        // 2. 用户信息卡片（从 meta.userInfo 读取）
        const userInfo = comment.meta?.userInfo || {};
        if (userInfo.ip || userInfo.browser || userInfo.os || userInfo.geo) {
          // IP 脱敏（IPv4 仅显示前两段）
          let ipDisplay = '';
          if (userInfo.ip) {
            const parts = userInfo.ip.split('.');
            if (parts.length === 4) {
              ipDisplay = parts.slice(0, 2).join('.') + '.***.***';
            } else {
              ipDisplay = userInfo.ip; // IPv6 直接显示（可自行调整）
            }
          }

          // 地理位置组合
          const geo = userInfo.geo || {};
          let geoDisplay = '';
          if (geo.city) geoDisplay = geo.city;
          if (geo.province && geo.city) geoDisplay += `, ${geo.province}`;
          else if (geo.province) geoDisplay = geo.province;

          // 构建 HTML 卡片（内联样式，亦可通过 CSS 类控制）
          let infoHtml = `<div class="comment-user-info" style="font-size: 12px; color: #888; margin-top: 6px; display: flex; gap: 14px; flex-wrap: wrap; border-top: 1px solid #eee; padding-top: 6px;">`;
          if (ipDisplay) infoHtml += `<span><i class="fas fa-network-wired"></i> ${ipDisplay}</span>`;
          if (userInfo.browser) infoHtml += `<span><i class="fas fa-compass"></i> ${userInfo.browser}</span>`;
          if (userInfo.os) infoHtml += `<span><i class="fas fa-desktop"></i> ${userInfo.os}</span>`;
          if (geoDisplay) infoHtml += `<span><i class="fas fa-map-marker-alt"></i> ${geoDisplay}</span>`;
          infoHtml += `</div>`;

          // 追加到评论内容末尾
          comment.content = comment.content + infoHtml;
        }

        return comment;
      }
    }
  };

  // ===== 模块核心方法 =====
  constructor() {
    if (window.Starlink && window.Starlink.comment) return window.Starlink.comment;
    this.instance = null;
    this.modal = null;
    this.openBtn = null;
    this.searchTimer = null;
    this.searchObserver = null;
    this.draftObserver = null;
    this.isVisible = false;
    this._initDOM();
    this._bindEvents();
    this._initWaline();
    this._watchSearchPanel();
    this._initDraftAutoSave();
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

  _initWaline() {
    const { el, serverURL, walineOptions } = CommentModule.CONFIG;
    if (typeof Waline === 'undefined') {
      const container = document.querySelector(el);
      if (container) {
        container.innerHTML = '<div class="waline-comment-fallback" style="padding:20px;text-align:center;color:#999;">评论系统加载中，请稍后再试...</div>';
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
        container.innerHTML = '<div class="waline-comment-fallback" style="padding:20px;text-align:center;color:#999;">评论系统暂时不可用，请稍后再试。</div>';
      }
    }
  }

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

  _initDraftAutoSave() {
    const container = document.querySelector(CommentModule.CONFIG.el);
    if (!container) return;
    this.draftObserver = new MutationObserver(() => {
      const textarea = container.querySelector('.wl-editor textarea');
      if (textarea && !textarea.dataset.draftBound) {
        textarea.dataset.draftBound = 'true';
        const draft = localStorage.getItem('waline_draft');
        if (draft && textarea.value === '') {
          textarea.value = draft;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        textarea.addEventListener('input', (e) => {
          localStorage.setItem('waline_draft', e.target.value);
        });
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
    clearTimeout(this.searchTimer);
    this.searchObserver?.disconnect();
    this.draftObserver?.disconnect();
    this.instance?.destroy?.();
    this.instance = null;
  }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  if (!window.Starlink) window.Starlink = {};
  if (!window.Starlink.comment) {
    window.Starlink.comment = new CommentModule();
  }
  window.commentModule = window.Starlink.comment;
});
