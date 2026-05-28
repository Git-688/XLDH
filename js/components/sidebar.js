/**
 * ModernSidebar - 简约现代悬浮侧滑栏
 * 完全替代旧的 CompactSidebar，提供相同接口 (init, show, hide, toggle, isVisible, destroy)
 */
class ModernSidebar {
  constructor() {
    if (window.sidebar && window.sidebar instanceof ModernSidebar) return window.sidebar;
    this.isInitialized = false;
    this.modalRegistered = false;
    this.isVisibleFlag = false;
    this.categories = this.getCategoryData();
    this.userConfig = null;
    this.init();
  }

  getCategoryData() {
    // 与原来保持一致的功能分类
    return [
      { name: '常用工具', icon: 'fas fa-tools', expanded: true, links: [
        { icon: 'fas fa-mobile-alt', label: '手机软件', url: './pages/chl/手机软件.html' },
        { icon: 'fas fa-desktop', label: '电脑软件', url: './pages/chl/电脑软件.html' },
        { icon: 'fas fa-film', label: '电影大全', url: './pages/chl/影视推荐.html' },
        { icon: 'fas fa-images', label: '共享图片', url: './pages/chl/共享图片链接.html' }
      ] },
      { name: '网盘工具', icon: 'fas fa-cloud', expanded: false, links: [
        { icon: 'fas fa-cloud-upload-alt', label: '夸克网盘', url: './pages/chl/夸克网盘.html' },
        { icon: 'fas fa-hdd', label: '123云盘', url: './pages/chl/123云盘.html' },
        { icon: 'fas fa-cloud', label: '天翼云盘', url: './pages/chl/天翼云盘.html' },
        { icon: 'fas fa-box', label: '115生活', url: './pages/chl/115生活.html' },
        { icon: 'fas fa-database', label: '阿里云盘', url: './pages/chl/阿里云盘.html' },
        { icon: 'fas fa-sim-card', label: '移动网盘', url: './pages/chl/移动网盘.html' },
        { icon: 'fab fa-baidu', label: '百度网盘', url: './pages/chl/百度网盘.html' },
        { icon: 'fas fa-server', label: '城通网盘', url: './pages/chl/城通网盘.html' },
        { icon: 'fas fa-file-archive', label: '蓝奏云', url: './pages/chl/蓝奏云链接.html' }
      ] },
      { name: '学习资源', icon: 'fas fa-graduation-cap', expanded: false, links: [
        { icon: 'fas fa-child', label: '小学阶段', url: './pages/chl/小学阶段.html' },
        { icon: 'fas fa-school', label: '初中阶段', url: './pages/chl/初中阶段.html' },
        { icon: 'fas fa-university', label: '高中阶段', url: './pages/chl/高中阶段.html' },
        { icon: 'fas fa-user-graduate', label: '大学生活', url: './pages/chl/大学生活.html' },
        { icon: 'fas fa-briefcase', label: '社会实践', url: './pages/chl/社会实践.html' }
      ] },
      { name: '自制小工具', icon: 'fas fa-cogs', expanded: false, links: [
        { icon: 'fas fa-scroll', label: '手持弹幕', url: './pages/chl/手持弹幕.html' },
        { icon: 'fas fa-gift', label: '幸运大转盘', url: './pages/chl/幸运大转盘.html' },
        { icon: 'fas fa-clipboard-list', label: '记分牌', url: './pages/chl/记分牌.html' },
        { icon: 'fas fa-clock', label: '时间屏幕', url: './pages/chl/时间屏幕.html' }
      ] },
      { name: '其他', icon: 'fas fa-ellipsis-h', expanded: false, links: [
        { icon: 'fas fa-fire', label: '烟花模拟器', url: './pages/chl/烟花模拟器.html' }
      ] }
    ];
  }

  async init() {
    if (this.isInitialized) return;
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    this.loadUserConfig();
    this.render();
    this.bindEvents();
    await this.loadDailyQuote();
    this.isInitialized = true;
    window.sidebar = this;
  }

  loadUserConfig() {
    const stored = localStorage.getItem('starlink_userConfig');
    if (stored) {
      this.userConfig = JSON.parse(stored);
    } else {
      this.userConfig = { nickname: '访客用户', bio: '探索无限可能', avatar: '' };
      localStorage.setItem('starlink_userConfig', JSON.stringify(this.userConfig));
    }
  }

  saveUserConfig() {
    localStorage.setItem('starlink_userConfig', JSON.stringify(this.userConfig));
  }

  render() {
    let sidebar = document.getElementById('sidebar');
    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.id = 'sidebar';
      sidebar.className = 'sidebar';
      document.body.appendChild(sidebar);
    }
    // 清空并重新渲染内容
    sidebar.innerHTML = `
      <div class="sidebar-content">
        <div class="user-section">
          <div class="user-avatar" id="sidebarAvatar">
            ${this.userConfig.avatar ? `<img src="${this.userConfig.avatar}" alt="avatar">` : '<i class="fas fa-user fa-2x"></i>'}
          </div>
          <div class="user-info">
            <div class="user-name" id="sidebarUserName">${this.escapeHtml(this.userConfig.nickname)}</div>
            <div class="user-bio" id="sidebarUserBio">${this.escapeHtml(this.userConfig.bio)}</div>
          </div>
        </div>
        <div class="daily-quote" id="dailyQuote">✨ 每一天都是新的开始</div>
        <div class="categories-list" id="categoriesList"></div>
      </div>
      <div class="sidebar-footer">
        <button class="footer-btn" data-action="notebook"><i class="fas fa-pen"></i><span>笔记</span></button>
        <button class="footer-btn" data-action="gift"><i class="fas fa-gift"></i><span>羊毛</span></button>
        <button class="footer-btn" data-action="about"><i class="fas fa-info-circle"></i><span>关于</span></button>
        <button class="footer-btn" data-action="qq"><i class="fab fa-qq"></i><span>QQ群</span></button>
      </div>
    `;
    this.renderCategories();
  }

  renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    container.innerHTML = this.categories.map(cat => `
      <div class="category-item ${cat.expanded ? 'expanded' : ''}" data-category="${this.escapeHtml(cat.name)}">
        <div class="category-header">
          <div class="category-title">
            <i class="${cat.icon}"></i>
            <span>${this.escapeHtml(cat.name)}</span>
          </div>
          <div class="category-toggle"><i class="fas fa-chevron-down"></i></div>
        </div>
        <div class="category-links">
          ${cat.links.map(link => `
            <a class="category-link" href="${link.url}" target="_blank">
              <i class="${link.icon}"></i>
              <span>${this.escapeHtml(link.label)}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `).join('');
    // 为刚渲染的每个 expanded 分类正确设置 max-height（因为 CSS 中用 max-height 过渡）
    document.querySelectorAll('.category-item.expanded .category-links').forEach(el => {
      el.style.maxHeight = el.scrollHeight + 'px';
    });
  }

  bindEvents() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // 点击分类头部展开/收起
    sidebar.addEventListener('click', (e) => {
      const header = e.target.closest('.category-header');
      if (header) {
        const item = header.closest('.category-item');
        if (item) this.toggleCategory(item);
        return;
      }
      const avatar = e.target.closest('.user-avatar');
      if (avatar) {
        this.openProfileModal();
        return;
      }
      const footerBtn = e.target.closest('.footer-btn');
      if (footerBtn) {
        const action = footerBtn.dataset.action;
        this.handleFooterAction(action);
      }
    });

    // 外部点击关闭
    document.addEventListener('click', (e) => {
      if (this.isVisible() && !sidebar.contains(e.target) && !document.getElementById('menuBtn')?.contains(e.target)) {
        this.hide();
      }
    });

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) this.hide();
    });
  }

  toggleCategory(item) {
    const linksDiv = item.querySelector('.category-links');
    const isExpanded = item.classList.contains('expanded');
    if (isExpanded) {
      // 收起
      item.classList.remove('expanded');
      linksDiv.style.maxHeight = null;
    } else {
      // 展开
      item.classList.add('expanded');
      linksDiv.style.maxHeight = linksDiv.scrollHeight + 'px';
      // 过渡结束后清除内联样式，避免影响下次收起
      const onEnd = () => {
        if (item.classList.contains('expanded')) {
          linksDiv.style.maxHeight = 'none';
        }
        linksDiv.removeEventListener('transitionend', onEnd);
      };
      linksDiv.addEventListener('transitionend', onEnd, { once: true });
    }
    // 保存展开状态到 localStorage
    const catName = item.dataset.category;
    const category = this.categories.find(c => c.name === catName);
    if (category) {
      category.expanded = !isExpanded;
      localStorage.setItem('starlink_sidebar_categories', JSON.stringify(this.categories.map(c => ({ name: c.name, expanded: c.expanded }))));
    }
  }

  handleFooterAction(action) {
    switch (action) {
      case 'notebook':
        if (window.showNotebookModal) window.showNotebookModal();
        break;
      case 'gift':
        window.open('./pages/tools/羊毛福利.html', '_blank');
        break;
      case 'about':
        if (window.aboutModule && window.aboutModule.show) window.aboutModule.show();
        break;
      case 'qq':
        window.open('https://qm.qq.com/q/HxcjhEclyM', '_blank');
        break;
      default: break;
    }
    this.hide(); // 点击后关闭侧滑栏（可选，根据喜好）
  }

  async loadDailyQuote() {
    const quoteEl = document.getElementById('dailyQuote');
    if (!quoteEl) return;
    try {
      const res = await fetch('https://api.kuleu.com/api/yiyan');
      const text = await res.text();
      quoteEl.textContent = text.trim() || '✨ 每一天都是新的开始';
    } catch {
      quoteEl.textContent = '✨ 每一天都是新的开始';
    }
  }

  openProfileModal() {
    // 简单弹窗修改资料（与原来的 profile modal 类似，但为了简约，用原生 prompt）
    const newName = prompt('请输入昵称', this.userConfig.nickname);
    if (newName && newName.trim()) {
      this.userConfig.nickname = newName.trim();
      const nameEl = document.getElementById('sidebarUserName');
      if (nameEl) nameEl.textContent = this.escapeHtml(this.userConfig.nickname);
      this.saveUserConfig();
    }
    const newBio = prompt('请输入个性签名', this.userConfig.bio);
    if (newBio !== null) {
      this.userConfig.bio = newBio.trim() || '探索无限可能';
      const bioEl = document.getElementById('sidebarUserBio');
      if (bioEl) bioEl.textContent = this.escapeHtml(this.userConfig.bio);
      this.saveUserConfig();
    }
    // 头像更改（简化，不实现QQ获取，只做演示）
    const avatarUrl = prompt('头像图片URL（可选）', this.userConfig.avatar);
    if (avatarUrl !== null) {
      this.userConfig.avatar = avatarUrl.trim();
      const avatarDiv = document.querySelector('.user-avatar');
      if (avatarDiv) {
        if (avatarUrl) {
          avatarDiv.innerHTML = `<img src="${this.escapeHtml(avatarUrl)}" alt="avatar">`;
        } else {
          avatarDiv.innerHTML = '<i class="fas fa-user fa-2x"></i>';
        }
      }
      this.saveUserConfig();
    }
  }

  show() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || this.isVisible()) return;
    sidebar.classList.add('active');
    this.isVisibleFlag = true;
    if (window.app && !this.modalRegistered) {
      window.app.registerModal(this);
      this.modalRegistered = true;
    }
  }

  hide() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || !this.isVisible()) return;
    sidebar.classList.remove('active');
    this.isVisibleFlag = false;
    if (window.app && this.modalRegistered) {
      window.app.unregisterModal(this);
      this.modalRegistered = false;
    }
  }

  toggle() {
    this.isVisible() ? this.hide() : this.show();
  }

  isVisible() {
    const sidebar = document.getElementById('sidebar');
    return sidebar ? sidebar.classList.contains('active') : false;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
      return c;
    });
  }

  destroy() {
    this.hide();
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.remove();
    delete window.sidebar;
  }
}

// 自动初始化
if (!window.sidebarInitialized) {
  window.sidebarInitialized = true;
  window.sidebar = new ModernSidebar();
}
window.getSidebar = () => window.sidebar;