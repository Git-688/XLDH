/**
 * Waline 评论模块 - 支持动态加载、错误重试、CORS 提示
 */
class CommentModule {
  static CONFIG = {
    // 从全局配置读取 Waline 服务地址
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
        level0: '初来乍到', level1: '偶尔光临', level2: '常驻居民',
        level3: '核心会员', level4: '论坛元老', level5: '至尊传说'
      }
    }
  };

  constructor() {
    this.instance = null;
    this.modal = null;
    this.openBtn = null;
    this.isInitializing = false;
    this.initAttempts = 0;
    this.maxAttempts = 3;
    this._initDOM();
    this._bindEvents();
    // 预加载 Waline 库（但不初始化，等待用户点击）
    this._preloadWalineLibrary();
  }

  _initDOM() {
    this.modal = document.getElementById(CommentModule.CONFIG.modalId);
    this.openBtn = document.getElementById(CommentModule.CONFIG.openBtnId);
  }

  _bindEvents() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target.closest('.feedback-modal-close')) {
          this.close();
          return;
        }
        if (e.target === this.modal) this.close();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains(CommentModule.CONFIG.activeClass)) {
        this.close();
      }
    });
  }

  // 预先加载 Waline 库（不阻塞页面）
  _preloadWalineLibrary() {
    if (typeof Waline !== 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@waline/client/dist/waline.umd.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    document.head.appendChild(script);
  }

  async _ensureWalineReady() {
    if (typeof Waline !== 'undefined') return true;
    // 等待库加载完成
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (typeof Waline !== 'undefined') {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 5000);
    });
  }

  async _initWaline() {
    if (this.instance) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    // 显示加载中
    const container = document.querySelector(CommentModule.CONFIG.el);
    if (container) container.innerHTML = '<div class="loading">加载评论组件...</div>';

    try {
      const libReady = await this._ensureWalineReady();
      if (!libReady) throw new Error('Waline 库加载超时');

      const { el, serverURL, walineOptions } = CommentModule.CONFIG;
      const containerElem = document.querySelector(el);
      if (!containerElem) throw new Error('评论容器不存在');

      // 测试服务是否可访问（可选，用于提前提示）
      const testUrl = `${serverURL}/api/comment?path=${encodeURIComponent(window.location.pathname)}&page=1&pageSize=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const testRes = await fetch(testUrl, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);
      if (!testRes || !testRes.ok) {
        console.warn('Waline 服务似乎不可用，请检查服务器状态');
        containerElem.innerHTML = `
          <div style="padding:20px;text-align:center;color:#999;">
            <i class="fas fa-exclamation-triangle"></i> 评论服务暂时不可用<br>
            <small>请联系管理员检查 Waline 服务</small>
          </div>
        `;
        this.isInitializing = false;
        return false;
      }

      // 初始化 Waline
      this.instance = Waline.init({
        el,
        serverURL,
        ...walineOptions
      });
      this.isInitializing = false;
      this.initAttempts = 0;
      return true;
    } catch (err) {
      console.error('Waline 初始化失败:', err);
      this.isInitializing = false;
      this.initAttempts++;
      const container = document.querySelector(CommentModule.CONFIG.el);
      if (container) {
        let errorMsg = '评论加载失败';
        if (err.message.includes('CORS')) errorMsg = '跨域错误：请检查 Waline 服务端 CORS 配置';
        else if (err.message.includes('超时')) errorMsg = '服务连接超时，请稍后重试';
        else errorMsg = err.message || '未知错误';
        container.innerHTML = `
          <div style="padding:20px;text-align:center;color:#e74c3c;">
            <i class="fas fa-times-circle"></i> ${errorMsg}<br>
            <button id="waline-retry-btn" class="waline-retry-btn" style="margin-top:12px;padding:6px 12px;border:none;border-radius:4px;background:#4361ee;color:#fff;cursor:pointer;">重试</button>
          </div>
        `;
        const retryBtn = container.querySelector('#waline-retry-btn');
        if (retryBtn) retryBtn.onclick = () => this._initWaline();
      }
      return false;
    }
  }

  async open() {
    if (!this.modal) return;
    // 如果未初始化，尝试初始化
    if (!this.instance && !this.isInitializing) {
      await this._initWaline();
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
    if (this.instance && typeof this.instance.destroy === 'function') {
      this.instance.destroy();
    }
    this.instance = null;
  }
}

// 启动模块
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.commentModule = new CommentModule();
  });
} else {
  window.commentModule = new CommentModule();
}