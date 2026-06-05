/**
 * 评论模块 - 星聚导航最终版
 * 功能：QQ表情搜索 + 输入自动搜索(防抖500ms)
 * 显示：订阅链接、版权、归属地、设备信息、五字社区等级
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
      noCopyright: false,
      noRss: false,

      emoji: [
        'https://unpkg.com/@waline/emojis@1.4.0/bilibili',
        'https://unpkg.com/@waline/emojis@1.4.0/qq',
        'https://unpkg.com/@waline/emojis@1.4.0/tieba',
        'https://unpkg.com/@waline/emojis@1.4.0/weibo',
        'https://unpkg.com/@waline/emojis@1.4.0/alus',
      ],

      // 【关键】删除顶层search配置，Waline才会渲染左上角笑脸按钮
      // 五字社区等级标签
      locale: {
        level0: '初来乍到',
        level1: '偶尔光临',
        level2: '常驻居民',
        level3: '核心会员',
        level4: '论坛元老',
        level5: '至尊传说'
      }
    }
  };

  constructor() {
    this.instance = null;
    this.modal = null;
    this.openBtn = null;
    this.searchTimer = null;
    this.searchObserver = null;
    this.emojiTimer = null;
    this.emojiPage = 1; // 表情分页页码，对接原more分页接口

    this._initDOM();
    this._bindEvents();
    this._initWaline();
    this._watchSearchPanel();
    // 监听表情弹窗DOM渲染，挂载自定义搜索
    this.emojiObserver = new MutationObserver(() => this.bindEmojiSearch());
  }

  // 原有QQ表情接口封装，保留default/search/more三个接口逻辑
  async fetchEmoji(word = '', page = 1, limit = 40) {
    if (!word) {
      // default默认列表
      const res = await fetch('https://oiapi.net/api/EmoticonPack?limit=20').catch(() => ({ json: () => ({ data: [] }) }));
      const json = await res.json();
      if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
        return json.data.map(item => ({ src: item.url, title: item.id || '', preview: item.url }));
      }
      return [];
    } else {
      // search / more分页
      const api = `https://oiapi.net/api/EmoticonPack?keyword=${encodeURIComponent(word)}&page=${page}&limit=${limit}`;
      const res = await fetch(api).catch(() => ({ json: () => ({ data: [] }) }));
      const json = await res.json();
      if ((json.code === 200 || json.code === 1) && Array.isArray(json.data)) {
        return json.data.map(item => ({ src: item.url, title: item.id || word, preview: item.url }));
      }
      return [];
    }
  }

  // 绑定表情弹窗搜索、分页加载
  async bindEmojiSearch() {
    const wrap = document.querySelector('.wl-emoji-wrap');
    const input = wrap?.querySelector('input');
    const listDom = wrap?.querySelector('.wl-emoji-list');
    const loadMoreBtn = wrap?.querySelector('.wl-emoji-more');
    if (!wrap || !input || !listDom || input.dataset.bindEmoji) return;
    input.dataset.bindEmoji = '1';

    // 初始化默认表情
    const initList = await this.fetchEmoji();
    listDom.innerHTML = initList.map(item => `<img src="${item.src}" data-src="${item.src}" class="wl-emoji-item" alt="${item.title}">`).join('');

    // 输入防抖500ms搜索
    input.addEventListener('input', () => {
      clearTimeout(this.emojiTimer);
      this.emojiPage = 1;
      const kw = input.value.trim();
      this.emojiTimer = setTimeout(async () => {
        const data = await this.fetchEmoji(kw, 1, 40);
        listDom.innerHTML = data.map(item => `<img src="${item.src}" data-src="${item.src}" class="wl-emoji-item" alt="${item.title}">`).join('');
      }, 500);
    });

    // 加载更多分页（对接原more方法）
    if (loadMoreBtn) {
      loadMoreBtn.onclick = async () => {
        this.emojiPage += 1;
        const kw = input.value.trim();
        const moreData = await this.fetchEmoji(kw, this.emojiPage, 40);
        moreData.forEach(item => {
          const img = document.createElement('img');
          img.src = item.src;
          img.dataset.src = item.src;
          img.className = 'wl-emoji-item';
          img.alt = item.title;
          listDom.appendChild(img);
        });
      };
    }
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
    if (typeof Waline === 'undefined') return;
    const container = document.querySelector(el);
    if (!container) return;
    try {
      this.instance = Waline.init({ el, serverURL, ...walineOptions });
      // 监听表情面板动态生成
      this.emojiObserver.observe(container, { childList: true, subtree: true });
    } catch (err) {
      console.error('[评论] 初始化失败', err);
    }
  }

  // 评论框内搜索自动搜索防抖（原有逻辑保留不动）
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
    clearTimeout(this.emojiTimer);
    this.searchObserver?.disconnect();
    this.emojiObserver?.disconnect();
    this.instance?.destroy?.();
    this.instance = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.commentModule = new CommentModule();
});
window.addEventListener('beforeunload', () => {
  window.commentModule?.destroy?.();
});
