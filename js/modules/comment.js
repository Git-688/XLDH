/* comment.js - 增强 IP 功能（脱敏 + 地域旗帜） */
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
        const achievement = comment.meta?.achievement;
        if (achievement) {
          comment.nick = `${comment.nick} <span class="achievement-badge">${achievement}</span>`;
        }
        return comment;
      },
      after: function() {
        if (window.commentModule && window.commentModule._addMetaIcons) {
          window.commentModule._addMetaIcons();
        }
      }
    }
  };

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
    const options = {
      ...walineOptions,
      after: () => {
        if (walineOptions.after) walineOptions.after();
        this._addMetaIcons();
      }
    };

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
      this.instance = Waline.init({ el, serverURL, ...options });
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

  // ========== 新增工具方法 ==========

  /**
   * 解析 UA 字符串（与之前相同）
   */
  _parseUA(uaString) {
    if (!uaString) return { os: '', browser: '', device: '' };
    const ua = uaString.toLowerCase();

    let os = '';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
    else if (ua.includes('chrome os')) os = 'Chrome OS';

    let browser = '';
    if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opr') || ua.includes('opera')) browser = 'Opera';
    else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';

    let device = '';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) device = 'mobile';
    else if (ua.includes('tablet') || ua.includes('ipad')) device = 'tablet';
    else device = 'desktop';

    return { os, browser, device };
  }

  /**
   * 国家名称 → 国旗 Emoji 映射（常用国家）
   */
  _getCountryFlag(countryName) {
    const map = {
      '中国': '🇨🇳',
      '美国': '🇺🇸',
      '日本': '🇯🇵',
      '韩国': '🇰🇷',
      '英国': '🇬🇧',
      '法国': '🇫🇷',
      '德国': '🇩🇪',
      '俄罗斯': '🇷🇺',
      '加拿大': '🇨🇦',
      '澳大利亚': '🇦🇺',
      '印度': '🇮🇳',
      '巴西': '🇧🇷',
      '南非': '🇿🇦',
      '意大利': '🇮🇹',
      '西班牙': '🇪🇸',
      '荷兰': '🇳🇱',
      '新加坡': '🇸🇬',
      '马来西亚': '🇲🇾',
      '泰国': '🇹🇭',
      '越南': '🇻🇳',
      '菲律宾': '🇵🇭',
      '印度尼西亚': '🇮🇩',
      '巴基斯坦': '🇵🇰',
      '尼日利亚': '🇳🇬',
      '墨西哥': '🇲🇽',
      '阿根廷': '🇦🇷',
      '智利': '🇨🇱',
      '哥伦比亚': '🇨🇴',
      '秘鲁': '🇵🇪',
      '埃及': '🇪🇬',
      '沙特阿拉伯': '🇸🇦',
      '阿联酋': '🇦🇪',
      '土耳其': '🇹🇷',
      '伊朗': '🇮🇷',
      '伊拉克': '🇮🇶',
      '阿富汗': '🇦🇫',
      '以色列': '🇮🇱',
      '巴勒斯坦': '🇵🇸',
      '新西兰': '🇳🇿',
      '波兰': '🇵🇱',
      '乌克兰': '🇺🇦',
      '白俄罗斯': '🇧🇾',
      '哈萨克斯坦': '🇰🇿',
      '乌兹别克斯坦': '🇺🇿',
      '蒙古': '🇲🇳',
      '朝鲜': '🇰🇵',
      '台湾': '🇨🇳', // 台湾是中国的一部分
      '香港': '🇭🇰',
      '澳门': '🇲🇴',
    };
    // 模糊匹配（如果传入包含国家名的字符串）
    for (const [key, flag] of Object.entries(map)) {
      if (countryName.includes(key)) return flag;
    }
    return '🌍'; // 默认地球图标
  }

  /**
   * IP 脱敏（保留前两段，后两段隐藏）
   */
  _maskIP(ip) {
    if (!ip) return '';
    // IPv4 脱敏
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    // IPv6 简化脱敏（只保留前两组）
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length >= 4) {
        return `${parts[0]}:${parts[1]}:****:****`;
      }
    }
    return ip; // 无法识别则原样返回
  }

  // ===== 核心：添加元数据图标（增强版） =====
  _addMetaIcons() {
    const container = document.querySelector(CommentModule.CONFIG.el);
    if (!container) return;

    const items = container.querySelectorAll('.wl-comment-item');
    items.forEach(item => {
      const metaEl = item.querySelector('.wl-meta');
      if (!metaEl) return;
      if (metaEl.dataset.iconed === 'true') return;
      metaEl.dataset.iconed = 'true';

      const spans = metaEl.querySelectorAll('span');
      let uaText = '';
      let ipText = '';
      let regionText = '';

      spans.forEach(span => {
        const txt = span.textContent.trim();
        // 识别 UA
        if (txt.includes('on') || /Windows|macOS|Linux|Android|iOS/i.test(txt)) {
          uaText = txt;
        }
        // 识别 IP
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(txt) || txt.includes(':')) {
          ipText = txt;
        }
        // 识别地域（常见格式：国家 省份 城市，或只有国家）
        if (/[\u4e00-\u9fa5]/.test(txt) && !txt.includes('on') && !txt.includes('Windows')) {
          regionText = txt;
        }
      });

      // ----- 1. 处理 IP：脱敏 + 图标 -----
      if (ipText) {
        const ipSpan = Array.from(spans).find(s => /^(\d{1,3}\.){3}\d{1,3}$/.test(s.textContent.trim()) || s.textContent.includes(':'));
        if (ipSpan) {
          const masked = this._maskIP(ipText);
          // 如果脱敏后不等于原文本，更新显示
          if (masked !== ipText) {
            ipSpan.textContent = masked;
          }
          // 在 IP 前添加地球图标
          ipSpan.innerHTML = `<span style="margin-right:4px;">🌍</span>${ipSpan.textContent}`;
        }
      }

      // ----- 2. 处理 UA：添加设备/浏览器/系统图标 -----
      if (uaText) {
        const { os, browser, device } = this._parseUA(uaText);
        let icon = '';
        if (device === 'mobile') icon = '📱 ';
        else if (device === 'tablet') icon = '📟 ';
        else icon = '🖥️ ';
        if (browser) icon += `🌐 ${browser} `;
        if (os) icon += `💻 ${os} `;
        if (icon) {
          const uaSpan = Array.from(spans).find(s => s.textContent.includes('on') || /Windows|macOS|Linux|Android|iOS/i.test(s.textContent));
          if (uaSpan) {
            uaSpan.innerHTML = `<span style="margin-right:4px;">${icon}</span>${uaSpan.textContent}`;
          }
        }
      }

      // ----- 3. 处理地域：添加国旗图标，并规范化显示 -----
      if (regionText) {
        const regionSpan = Array.from(spans).find(s => /[\u4e00-\u9fa5]/.test(s.textContent) && !s.textContent.includes('on') && !s.textContent.includes('Windows'));
        if (regionSpan) {
          // 提取国家名（取第一个词，通常是国家）
          const country = regionText.split(/\s+/)[0] || regionText;
          const flag = this._getCountryFlag(country);
          // 美化显示：如果地域文本只包含国家名，可以直接显示，否则保留原样
          // 在文本前加上国旗和分隔符
          regionSpan.innerHTML = `<span style="margin-right:4px;">${flag}</span>${regionText}`;
        }
      }
    });
  }

  // ========== 其余方法保持不变 ==========

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