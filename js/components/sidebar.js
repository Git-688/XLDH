/**
 * 侧边栏组件 - 保留原始 HTML 结构，只更新动态内容
 * 修复：确保壁纸区域、用户信息不丢失，定位正确
 */
class CompactSidebar {
  constructor() {
    if (!document.getElementById('sidebar')) return;
    if (window.sidebar && window.sidebar instanceof CompactSidebar) {
      return window.sidebar;
    }

    this.categories = [
      { name: '常用工具', icon: 'fas fa-tools', expanded: true, items: [
        { icon: 'fas fa-mobile-alt', label: '手机软件', action: 'link', link: './pages/chl/手机软件.html' },
        { icon: 'fas fa-desktop', label: '电脑软件', action: 'link', link: './pages/chl/电脑软件.html' },
        { icon: 'fas fa-film', label: '电影大全', action: 'link', link: './pages/chl/影视推荐.html' },
        { icon: 'fas fa-images', label: '共享图片', action: 'link', link: './pages/chl/共享图片链接.html' }
      ] },
      { name: '网盘工具', icon: 'fas fa-cloud', expanded: false, items: [
        { icon: 'fas fa-cloud-upload-alt', label: '夸克网盘', link: './pages/chl/夸克网盘.html' },
        { icon: 'fas fa-hdd', label: '123云盘', link: './pages/chl/123云盘.html' },
        { icon: 'fas fa-cloud', label: '天翼云盘', link: './pages/chl/天翼云盘.html' },
        { icon: 'fas fa-box', label: '115生活', link: './pages/chl/115生活.html' },
        { icon: 'fas fa-database', label: '阿里云盘', link: './pages/chl/阿里云盘.html' },
        { icon: 'fas fa-sim-card', label: '移动网盘', link: './pages/chl/移动网盘.html' },
        { icon: 'fab fa-baidu', label: '百度网盘', link: './pages/chl/百度网盘.html' },
        { icon: 'fas fa-server', label: '城通网盘', link: './pages/chl/城通网盘.html' },
        { icon: 'fas fa-file-archive', label: '蓝奏云', link: './pages/chl/蓝奏云链接.html' }
      ] },
      { name: '学习资源', icon: 'fas fa-graduation-cap', expanded: false, items: [
        { icon: 'fas fa-child', label: '小学阶段', link: './pages/chl/小学阶段.html' },
        { icon: 'fas fa-school', label: '初中阶段', link: './pages/chl/初中阶段.html' },
        { icon: 'fas fa-university', label: '高中阶段', link: './pages/chl/高中阶段.html' },
        { icon: 'fas fa-user-graduate', label: '大学生活', link: './pages/chl/大学生活.html' },
        { icon: 'fas fa-briefcase', label: '社会实践', link: './pages/chl/社会实践.html' }
      ] },
      { name: '自制小工具', icon: 'fas fa-cogs', expanded: false, items: [
        { icon: 'fas fa-scroll', label: '手持弹幕', link: './pages/chl/手持弹幕.html' },
        { icon: 'fas fa-gift', label: '幸运大转盘', link: './pages/chl/幸运大转盘.html' },
        { icon: 'fas fa-clipboard-list', label: '记分牌', link: './pages/chl/记分牌.html' },
        { icon: 'fas fa-clock', label: '时间屏幕', link: './pages/chl/时间屏幕.html' }
      ] },
      { name: '其他', icon: 'fas fa-ellipsis-h', expanded: false, items: [
        { icon: 'fas fa-fire', label: '烟花模拟器', link: './pages/chl/烟花模拟器.html' }
      ] }
    ];

    this.isInitialized = false;
    this.modalRegistered = false;
    this.defaultAvatar = './assets/logo.png';
    this.wallpaperCache = null;
    this.wallpaperDate = null;
  }

  async init() {
    if (this.isInitialized) return;
    try {
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
      }
      this.loadExpandedState();
      this.renderCategories();      // 只渲染分类列表
      this.renderFooter();          // 只渲染底部按钮
      this.bindEvents();
      await this.loadUserData();
      await this.loadDailyQuote();
      await this.loadWallpaperUserInfo();
      await this.loadSidebarWallpaper();
      this.createProfileModal();
      this.syncExpandedHeights();
      this.isInitialized = true;
      window.sidebar = this;
    } catch (error) {
      console.error('侧滑栏初始化失败:', error);
      if (window.toast && window.toast.show) window.toast.show('侧滑栏初始化失败', 'error');
    }
  }

  loadExpandedState() {
    try {
      const savedState = Storage.get('sidebar_categories_state');
      if (savedState) {
        this.categories.forEach(cat => {
          const saved = savedState.find(s => s.name === cat.name);
          if (saved) cat.expanded = saved.expanded;
        });
      }
    } catch (error) {
      console.error('加载展开状态失败:', error);
    }
  }

  saveExpandedState() {
    const stateToSave = this.categories.map(cat => ({ name: cat.name, expanded: cat.expanded }));
    Storage.set('sidebar_categories_state', stateToSave);
  }

  // 只渲染分类列表，不破坏壁纸区域和用户信息区域
  renderCategories() {
    const container = document.querySelector('.sidebar-categories');
    if (!container) return;
    let html = '';
    for (let i = 0; i < this.categories.length; i++) {
      const category = this.categories[i];
      const expandedClass = category.expanded ? 'expanded' : '';
      const categoryName = this.escapeHtml(category.name);
      let itemsHtml = '';
      for (let j = 0; j < category.items.length; j++) {
        const item = category.items[j];
        const action = item.action || '';
        const link = item.link || '';
        const icon = item.icon;
        const label = this.escapeHtml(item.label);
        const badgeHtml = item.badge ? `<div class="category-badge">${this.escapeHtml(item.badge)}</div>` : '';
        itemsHtml += `
          <button class="category-item" data-action="${action}" data-link="${link}">
            <div class="category-icon"><i class="${icon}"></i></div>
            <div class="category-label">${label}</div>
            ${badgeHtml}
          </button>
        `;
      }
      html += `
        <div class="category-group ${expandedClass}" data-category="${categoryName}">
          <div class="category-group-header">
            <div class="category-group-name">
              <div class="category-group-icon"><i class="${category.icon}"></i></div>
              <span>${categoryName}</span>
            </div>
            <button class="category-toggle" aria-label="${category.expanded ? '收起' : '展开'}">
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>
          <div class="category-items">
            ${itemsHtml}
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  // 只渲染底部按钮，保留原始按钮的 data-action
  renderFooter() {
    const footer = document.querySelector('.sidebar-footer');
    if (!footer) return;
    footer.innerHTML = `
      <button class="footer-btn" data-action="notebook"><i class="fas fa-pen"></i></button>
      <button class="footer-btn" data-action="gift"><i class="fas fa-gift"></i></button>
      <button class="footer-btn" data-action="about"><i class="fas fa-info-circle"></i></button>
      <button class="footer-btn" data-action="qq"><i class="fab fa-qq"></i></button>
    `;
  }

  syncExpandedHeights() {
    const expandedGroups = document.querySelectorAll('.category-group.expanded .category-items');
    for (let i = 0; i < expandedGroups.length; i++) {
      const container = expandedGroups[i];
      if (container.style.maxHeight && container.style.maxHeight !== 'none') continue;
      container.style.maxHeight = 'none';
      const fullHeight = container.scrollHeight + 'px';
      container.style.maxHeight = fullHeight;
      const group = container.closest('.category-group');
      const onTransitionEnd = function() {
        if (group && group.classList.contains('expanded')) {
          container.style.maxHeight = 'none';
        }
        container.removeEventListener('transitionend', onTransitionEnd);
      };
      container.addEventListener('transitionend', onTransitionEnd, { once: true });
    }
  }

  bindEvents() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // 事件委托处理分类展开/收起、分类项点击、底部按钮点击、头像点击
    sidebar.addEventListener('click', (e) => {
      const categoryHeader = e.target.closest('.category-group-header');
      const categoryItem = e.target.closest('.category-item');
      const footerBtn = e.target.closest('.footer-btn');
      const avatar = e.target.closest('.sidebar-wallpaper-avatar');
      if (categoryHeader) {
        this.toggleCategory(categoryHeader.closest('.category-group'));
      } else if (categoryItem) {
        this.handleCategoryItemClick(categoryItem);
        this.hide();
      } else if (footerBtn) {
        this.handleFooterClick(footerBtn);
        this.hide();
      } else if (avatar) {
        this.openProfileModal();
      }
    });

    // 点击外部关闭侧滑栏
    document.addEventListener('click', (e) => {
      const sidebarEl = document.getElementById('sidebar');
      const menuBtn = document.getElementById('menuBtn');
      if (sidebarEl && sidebarEl.classList.contains('active') &&
          !sidebarEl.contains(e.target) &&
          !(menuBtn && menuBtn.contains(e.target))) {
        this.hide();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) this.hide();
    });
  }

  toggleCategory(categoryGroup) {
    if (!categoryGroup) return;
    const categoryName = categoryGroup.dataset.category;
    let category = null;
    for (let i = 0; i < this.categories.length; i++) {
      if (this.categories[i].name === categoryName) {
        category = this.categories[i];
        break;
      }
    }
    if (!category) return;

    const itemsContainer = categoryGroup.querySelector('.category-items');
    if (!itemsContainer) return;

    if (category.expanded) {
      itemsContainer.style.maxHeight = null;
      category.expanded = false;
      categoryGroup.classList.remove('expanded');
    } else {
      categoryGroup.classList.add('expanded');
      itemsContainer.style.maxHeight = 'none';
      const fullHeight = itemsContainer.scrollHeight + 'px';
      itemsContainer.style.maxHeight = '0';
      void itemsContainer.offsetHeight;
      itemsContainer.style.maxHeight = fullHeight;
      category.expanded = true;

      const onTransitionEnd = function() {
        if (category.expanded) {
          itemsContainer.style.maxHeight = 'none';
        }
        itemsContainer.removeEventListener('transitionend', onTransitionEnd);
      };
      itemsContainer.addEventListener('transitionend', onTransitionEnd, { once: true });
    }
    this.saveExpandedState();
  }

  handleCategoryItemClick(item) {
    const action = item.dataset.action;
    const link = item.dataset.link;
    if (link) {
      window.open(link, '_blank');
      return;
    }
    switch (action) {
      case 'search':
        if (window.newSearchModule) window.newSearchModule.show();
        break;
      case 'music':
        if (window.app && window.app.components && window.app.components.navbar) {
          window.app.components.navbar.toggleMusicPlayer();
        }
        break;
      case 'weather':
        if (window.app && window.app.modules && window.app.modules.weather) {
          window.app.modules.weather.showModal();
        }
        break;
      default: break;
    }
  }

  handleFooterClick(btn) {
    const action = btn.dataset.action;
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
    this.hide();
  }

  show() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || this.isVisible()) return;
    sidebar.classList.add('active');
    if (window.app && !this.modalRegistered) {
      window.app.registerModal(this);
      this.modalRegistered = true;
    }
  }

  hide() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || !this.isVisible()) return;
    sidebar.classList.remove('active');
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

  async getBingWallpaper() {
    const today = new Date().toDateString();
    if (this.wallpaperCache && this.wallpaperDate === today) {
      return this.wallpaperCache;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const resolution = window.innerWidth >= 1920 ? 1920 : 1366;
      const response = await fetch(`https://bing.biturl.top/?resolution=${resolution}&format=json&index=0`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.url) {
        let imageUrl = data.url;
        if (!imageUrl.startsWith('http')) {
          imageUrl = 'https://bing.biturl.top' + imageUrl;
        }
        this.wallpaperCache = imageUrl;
        this.wallpaperDate = today;
        return imageUrl;
      }
      throw new Error('无效壁纸数据');
    } catch (error) {
      console.error('获取必应壁纸失败:', error);
      return null;
    }
  }

  async loadSidebarWallpaper() {
    const sidebarWallpaper = document.getElementById('sidebarWallpaper');
    if (!sidebarWallpaper) return;
    const imgUrl = await this.getBingWallpaper();
    if (imgUrl) {
      sidebarWallpaper.style.backgroundImage = `url(${imgUrl})`;
      sidebarWallpaper.style.backgroundSize = 'cover';
      sidebarWallpaper.style.backgroundPosition = 'center';
    } else {
      sidebarWallpaper.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  }

  async loadWallpaperUserInfo() {
    try {
      const userConfig = Storage.get('userConfig') || {};
      const wallpaperNickname = document.getElementById('sidebarWallpaperNickname');
      const wallpaperSignature = document.getElementById('sidebarWallpaperSignature');
      const wallpaperAvatar = document.getElementById('sidebarWallpaperAvatar');
      if (wallpaperNickname) wallpaperNickname.textContent = userConfig.nickname || '访客用户';
      if (wallpaperSignature) wallpaperSignature.textContent = userConfig.signature || '探索无限可能';
      if (wallpaperAvatar) {
        if (userConfig.avatar && userConfig.avatar !== '') {
          wallpaperAvatar.setAttribute('data-src', userConfig.avatar);
          this.observeLazyAvatar(wallpaperAvatar);
        } else {
          wallpaperAvatar.src = this.defaultAvatar;
        }
      }
    } catch (error) {
      console.error('加载壁纸用户信息失败:', error);
    }
  }

  observeLazyAvatar(img) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          if (entry.isIntersecting) {
            const target = entry.target;
            const src = target.getAttribute('data-src');
            if (src) target.src = src;
            observer.unobserve(target);
          }
        }
      });
      observer.observe(img);
    } else if (img.getAttribute('data-src')) {
      img.src = img.getAttribute('data-src');
    }
  }

  async loadUserData() {
    const userConfig = Storage.get('userConfig') || {};
    if (!userConfig.nickname) {
      userConfig.nickname = '访客用户';
      userConfig.signature = '探索无限可能';
      Storage.set('userConfig', userConfig);
    }
  }

  async loadDailyQuote() {
    const quoteElement = document.getElementById('dailyQuote');
    if (!quoteElement) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch('https://api.kuleu.com/api/yiyan', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error();
      const text = await response.text();
      quoteElement.textContent = text.trim() || '每一天都是新的开始，充满无限可能。';
    } catch {
      quoteElement.textContent = '每一天都是新的开始，充满无限可能。';
    }
  }

  createProfileModal() {
    if (document.getElementById('profileModal')) return;
    const modalHTML = `
      <div class="profile-modal" id="profileModal">
        <div class="profile-modal-content">
          <button class="profile-modal-close" id="profileModalClose"><i class="fas fa-times"></i></button>
          <form class="profile-form" id="profileForm">
            <div class="qq-avatar-section">
              <div class="qq-avatar-preview">
                <img id="qqAvatarPreview" src="${this.defaultAvatar}" alt="QQ头像预览" loading="lazy" class="js-img-fallback" data-fallback-type="defaultAvatar">
              </div>
              <div class="qq-avatar-input-group">
                <input type="text" class="form-input qq-avatar-input" id="qqNumber" placeholder="输入QQ号码，自动获取头像">
                <div class="qq-avatar-status" id="qqAvatarStatus"></div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="nickname">昵称</label>
              <input type="text" class="form-input" id="nickname" placeholder="请输入昵称">
            </div>
            <div class="form-group">
              <label class="form-label" for="signature">个性签名</label>
              <textarea class="form-input form-textarea" id="signature" placeholder="请输入个性签名"></textarea>
            </div>
            <div class="profile-modal-actions">
              <button type="button" class="profile-cancel-btn" id="profileCancelBtn">取消</button>
              <button type="submit" class="profile-save-btn">保存设置</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindProfileModalEvents();
  }

  bindProfileModalEvents() {
    const profileModal = document.getElementById('profileModal');
    const closeBtn = document.getElementById('profileModalClose');
    const cancelBtn = document.getElementById('profileCancelBtn');
    const form = document.getElementById('profileForm');
    const qqInput = document.getElementById('qqNumber');
    if (!profileModal) return;
    const closeModal = () => { profileModal.classList.remove('active'); };
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && profileModal.classList.contains('active')) closeModal();
    });
    if (qqInput) qqInput.addEventListener('input', () => this.autoGetQQAvatar());
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProfileSettings();
    });
  }

  async autoGetQQAvatar() {
    const qqNumber = document.getElementById('qqNumber')?.value.trim();
    const preview = document.getElementById('qqAvatarPreview');
    const status = document.getElementById('qqAvatarStatus');
    if (!qqNumber || !preview) return;
    if (!/^[1-9][0-9]{4,11}$/.test(qqNumber)) {
      if (status) { status.textContent = 'QQ号码格式不正确'; status.className = 'qq-avatar-status error'; }
      return;
    }
    try {
      if (status) { status.textContent = '获取中...'; status.className = 'qq-avatar-status loading'; }
      const response = await fetch(`https://api.kuleu.com/api/qqimg?qq=${qqNumber}`);
      if (response.ok) {
        preview.src = response.url;
        if (status) { status.textContent = '头像获取成功'; status.className = 'qq-avatar-status success'; }
        const userConfig = Storage.get('userConfig') || {};
        userConfig.avatar = response.url;
        Storage.set('userConfig', userConfig);
        const sidebarAvatar = document.getElementById('sidebarWallpaperAvatar');
        if (sidebarAvatar) {
          sidebarAvatar.setAttribute('data-src', response.url);
          this.observeLazyAvatar(sidebarAvatar);
        }
      } else {
        throw new Error();
      }
    } catch {
      if (status) { status.textContent = '获取头像失败'; status.className = 'qq-avatar-status error'; }
    }
  }

  saveProfileSettings() {
    const nickname = document.getElementById('nickname')?.value.trim();
    const signature = document.getElementById('signature')?.value.trim();
    const avatarPreview = document.getElementById('qqAvatarPreview');
    const userConfig = Storage.get('userConfig') || {};
    if (nickname) userConfig.nickname = nickname;
    if (signature) userConfig.signature = signature;
    if (avatarPreview && avatarPreview.src !== this.defaultAvatar && !avatarPreview.src.includes('data:image/svg+xml')) {
      userConfig.avatar = avatarPreview.src;
    }
    Storage.set('userConfig', userConfig);
    this.loadWallpaperUserInfo();
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('active');
    if (window.toast && window.toast.show) window.toast.show('个人信息保存成功', 'success');
  }

  openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    const userConfig = Storage.get('userConfig') || {};
    const nicknameInput = document.getElementById('nickname');
    const signatureInput = document.getElementById('signature');
    const qqInput = document.getElementById('qqNumber');
    const avatarPreview = document.getElementById('qqAvatarPreview');
    if (nicknameInput) nicknameInput.value = userConfig.nickname || '';
    if (signatureInput) signatureInput.value = userConfig.signature || '';
    if (qqInput) qqInput.value = '';
    if (avatarPreview) avatarPreview.src = userConfig.avatar || this.defaultAvatar;
    modal.classList.add('active');
  }

  hideProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('active');
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  destroy() {
    this.hide();
    if (window.app && this.modalRegistered) window.app.unregisterModal(this);
  }
}

// 初始化侧边栏
if (!window.sidebarInitialized) {
  window.sidebarInitialized = true;
  const initSidebar = async () => {
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    if (!window.sidebar) {
      window.sidebar = new CompactSidebar();
      await window.sidebar.init();
    }
  };
  initSidebar().catch(console.error);
}
window.getSidebar = () => window.sidebar;