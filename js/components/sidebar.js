// sidebar.js - 现代悬浮侧滑栏 (无依赖，独立运行)
(function() {
    // 分类数据 (与原来保持一致)
    const CATEGORIES_DATA = [
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

    // 底部按钮配置
    const FOOTER_BUTTONS = [
        { icon: 'fas fa-pen', label: '笔记', action: 'notebook' },
        { icon: 'fas fa-gift', label: '福利', action: 'gift' },
        { icon: 'fas fa-info-circle', label: '关于', action: 'about' },
        { icon: 'fab fa-qq', label: 'QQ群', action: 'qq' }
    ];

    class ModernSidebar {
        constructor() {
            this.sidebarEl = document.getElementById('sidebar');
            this.overlay = null;
            this.isOpen = false;
            this.categories = JSON.parse(JSON.stringify(CATEGORIES_DATA));
            this.userConfig = null;
            this.init();
        }

        init() {
            if (!this.sidebarEl) return;
            this.createOverlay();
            this.render();
            this.bindEvents();
            this.loadUserData();
            this.loadDailyQuote();
            this.loadExpandedState();
            window.sidebar = this;
        }

        createOverlay() {
            if (!document.querySelector('.sidebar-overlay')) {
                this.overlay = document.createElement('div');
                this.overlay.className = 'sidebar-overlay';
                document.body.appendChild(this.overlay);
            } else {
                this.overlay = document.querySelector('.sidebar-overlay');
            }
        }

        render() {
            this.sidebarEl.innerHTML = `
                <div class="sidebar-header">
                    <div class="user-profile">
                        <div class="user-avatar" id="sidebarAvatarBtn">
                            <img id="sidebarAvatarImg" src="./assets/logo.png" alt="头像" loading="lazy">
                        </div>
                        <div class="user-info">
                            <div class="user-name" id="sidebarUserName">访客用户</div>
                            <div class="user-bio" id="sidebarUserBio">探索无限可能</div>
                        </div>
                    </div>
                    <div class="daily-quote">
                        <p class="quote-text" id="sidebarQuote">加载中...</p>
                    </div>
                </div>
                <div class="sidebar-search">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" id="sidebarSearchInput" placeholder="搜索分类...">
                    </div>
                </div>
                <div class="sidebar-categories" id="sidebarCategoriesContainer"></div>
                <div class="sidebar-footer" id="sidebarFooter"></div>
            `;

            this.renderCategories();
            this.renderFooter();
            this.bindComponentEvents();
        }

        renderCategories() {
            const container = document.getElementById('sidebarCategoriesContainer');
            if (!container) return;

            let html = '';
            for (let i = 0; i < this.categories.length; i++) {
                const cat = this.categories[i];
                const expandedClass = cat.expanded ? 'expanded' : '';
                let itemsHtml = '';
                for (let j = 0; j < cat.items.length; j++) {
                    const item = cat.items[j];
                    const linkAttr = item.link ? `data-link="${this.escapeHtml(item.link)}"` : '';
                    const actionAttr = item.action ? `data-action="${item.action}"` : '';
                    itemsHtml += `
                        <button class="category-item" ${linkAttr} ${actionAttr}>
                            <i class="${item.icon}"></i>
                            <span>${this.escapeHtml(item.label)}</span>
                        </button>
                    `;
                }
                html += `
                    <div class="category-group ${expandedClass}" data-category-index="${i}">
                        <div class="category-group-header">
                            <div class="category-name">
                                <i class="${cat.icon}"></i>
                                <span>${this.escapeHtml(cat.name)}</span>
                            </div>
                            <button class="category-toggle" aria-label="展开/收起">
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

        renderFooter() {
            const container = document.getElementById('sidebarFooter');
            if (!container) return;
            let html = '';
            for (const btn of FOOTER_BUTTONS) {
                html += `
                    <button class="footer-btn" data-action="${btn.action}">
                        <i class="${btn.icon}"></i>
                        <span>${btn.label}</span>
                    </button>
                `;
            }
            container.innerHTML = html;
        }

        bindEvents() {
            // 全局点击关闭侧滑栏
            document.addEventListener('click', (e) => {
                if (!this.isOpen) return;
                const menuBtn = document.getElementById('menuBtn');
                const isMenuBtn = menuBtn && menuBtn.contains(e.target);
                const isSidebar = this.sidebarEl && this.sidebarEl.contains(e.target);
                const isOverlay = this.overlay && this.overlay.contains(e.target);
                if (!isSidebar && !isMenuBtn && (isOverlay || !e.target.closest('.sidebar'))) {
                    this.hide();
                }
            });

            // ESC 关闭
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.hide();
                }
            });

            // 菜单按钮
            const menuBtn = document.getElementById('menuBtn');
            if (menuBtn && !menuBtn._sidebarBound) {
                menuBtn._sidebarBound = true;
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggle();
                });
            }
        }

        bindComponentEvents() {
            // 分类展开/收起
            const groups = this.sidebarEl.querySelectorAll('.category-group');
            groups.forEach((group, idx) => {
                const header = group.querySelector('.category-group-header');
                const toggleBtn = group.querySelector('.category-toggle');
                const clickHandler = (e) => {
                    e.stopPropagation();
                    const isExpanded = group.classList.contains('expanded');
                    if (isExpanded) {
                        group.classList.remove('expanded');
                        this.categories[idx].expanded = false;
                    } else {
                        group.classList.add('expanded');
                        this.categories[idx].expanded = true;
                    }
                    this.saveExpandedState();
                };
                if (header) header.addEventListener('click', clickHandler);
                if (toggleBtn) toggleBtn.addEventListener('click', clickHandler);
            });

            // 分类项点击
            const categoryItems = this.sidebarEl.querySelectorAll('.category-item');
            categoryItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const link = item.dataset.link;
                    const action = item.dataset.action;
                    if (link) {
                        window.open(link, '_blank');
                        this.hide();
                    } else if (action === 'search') {
                        if (window.newSearchModule) window.newSearchModule.show();
                        this.hide();
                    } else if (action === 'music') {
                        if (window.app?.components?.navbar) window.app.components.navbar.toggleMusicPlayer();
                        this.hide();
                    } else if (action === 'weather') {
                        if (window.app?.modules?.weather) window.app.modules.weather.showModal();
                        this.hide();
                    }
                });
            });

            // 底部按钮
            const footerBtns = this.sidebarEl.querySelectorAll('.footer-btn');
            footerBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    this.handleFooterAction(action);
                    this.hide();
                });
            });

            // 头像点击 - 打开个人资料
            const avatarBtn = document.getElementById('sidebarAvatarBtn');
            if (avatarBtn) {
                avatarBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openProfileModal();
                });
            }

            // 搜索过滤功能
            const searchInput = document.getElementById('sidebarSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const keyword = e.target.value.trim().toLowerCase();
                    this.filterCategories(keyword);
                });
            }
        }

        filterCategories(keyword) {
            const groups = this.sidebarEl.querySelectorAll('.category-group');
            if (!keyword) {
                groups.forEach(group => group.style.display = '');
                return;
            }
            groups.forEach(group => {
                const categoryName = group.querySelector('.category-name span')?.innerText.toLowerCase() || '';
                const items = group.querySelectorAll('.category-item');
                let hasMatch = categoryName.includes(keyword);
                items.forEach(item => {
                    const label = item.querySelector('span')?.innerText.toLowerCase() || '';
                    const matches = label.includes(keyword);
                    item.style.display = matches ? 'flex' : 'none';
                    if (matches) hasMatch = true;
                });
                group.style.display = hasMatch ? '' : 'none';
                if (hasMatch && !group.classList.contains('expanded')) {
                    group.classList.add('expanded');
                }
            });
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
        }

        async loadUserData() {
            try {
                this.userConfig = Storage.get('userConfig') || {};
                const userName = document.getElementById('sidebarUserName');
                const userBio = document.getElementById('sidebarUserBio');
                const avatarImg = document.getElementById('sidebarAvatarImg');
                if (userName) userName.textContent = this.userConfig.nickname || '访客用户';
                if (userBio) userBio.textContent = this.userConfig.signature || '探索无限可能';
                if (avatarImg && this.userConfig.avatar) {
                    avatarImg.src = this.userConfig.avatar;
                    avatarImg.onerror = () => { avatarImg.src = './assets/logo.png'; };
                }
            } catch (e) { console.warn('加载用户数据失败', e); }
        }

        async loadDailyQuote() {
            const quoteEl = document.getElementById('sidebarQuote');
            if (!quoteEl) return;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                const response = await fetch('https://api.kuleu.com/api/yiyan', { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const text = await response.text();
                    quoteEl.textContent = text.trim() || '每一天都是新的开始，充满无限可能。';
                } else {
                    quoteEl.textContent = '每一天都是新的开始，充满无限可能。';
                }
            } catch {
                quoteEl.textContent = '每一天都是新的开始，充满无限可能。';
            }
        }

        openProfileModal() {
            // 复用原有的个人资料模态框
            if (window.sidebar && typeof window.sidebar.openProfileModal === 'function') {
                // 如果旧sidebar有方法，调用；否则创建简单弹窗
            }
            const profileModal = document.getElementById('profileModal');
            if (profileModal) {
                profileModal.classList.add('active');
                const userConfig = Storage.get('userConfig') || {};
                const nicknameInput = document.getElementById('nickname');
                const signatureInput = document.getElementById('signature');
                if (nicknameInput) nicknameInput.value = userConfig.nickname || '';
                if (signatureInput) signatureInput.value = userConfig.signature || '';
            } else {
                // 如果不存在则动态创建简单弹窗（保持功能）
                this.createSimpleProfileModal();
            }
        }

        createSimpleProfileModal() {
            const modalHtml = `
                <div class="profile-modal" id="profileModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);z-index:10002;display:flex;align-items:center;justify-content:center;">
                    <div style="background:var(--bg-card);border-radius:20px;padding:24px;width:300px;max-width:90%;">
                        <h3 style="margin-bottom:16px;">个人资料</h3>
                        <input type="text" id="tempNickname" placeholder="昵称" value="${this.escapeHtml(this.userConfig?.nickname || '')}" style="width:100%;padding:10px;margin-bottom:12px;border-radius:10px;border:1px solid #ddd;">
                        <input type="text" id="tempSignature" placeholder="个性签名" value="${this.escapeHtml(this.userConfig?.signature || '')}" style="width:100%;padding:10px;margin-bottom:20px;border-radius:10px;border:1px solid #ddd;">
                        <div style="display:flex;gap:12px;justify-content:flex-end;">
                            <button id="profileSaveBtn" style="padding:8px 20px;background:#4361ee;color:white;border:none;border-radius:30px;">保存</button>
                            <button id="profileCloseBtn" style="padding:8px 20px;background:#e2e8f0;border:none;border-radius:30px;">取消</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('profileModal');
            const saveBtn = document.getElementById('profileSaveBtn');
            const closeBtn = document.getElementById('profileCloseBtn');
            const closeModal = () => modal?.remove();
            saveBtn?.addEventListener('click', () => {
                const newName = document.getElementById('tempNickname')?.value.trim() || '访客用户';
                const newSig = document.getElementById('tempSignature')?.value.trim() || '探索无限可能';
                const userConfig = Storage.get('userConfig') || {};
                userConfig.nickname = newName;
                userConfig.signature = newSig;
                Storage.set('userConfig', userConfig);
                this.loadUserData();
                closeModal();
                if (window.toast) window.toast.show('个人信息已保存', 'success');
            });
            closeBtn?.addEventListener('click', closeModal);
            modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        }

        saveExpandedState() {
            const state = this.categories.map(cat => ({ name: cat.name, expanded: cat.expanded }));
            Storage.set('sidebar_categories_state', state);
        }

        loadExpandedState() {
            const saved = Storage.get('sidebar_categories_state');
            if (saved && Array.isArray(saved)) {
                saved.forEach(savedCat => {
                    const cat = this.categories.find(c => c.name === savedCat.name);
                    if (cat) cat.expanded = savedCat.expanded;
                });
            }
        }

        escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }

        show() {
            if (this.isOpen) return;
            this.isOpen = true;
            this.sidebarEl.classList.add('active');
            if (this.overlay) this.overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (window.app && !window._sidebarModalRegistered) {
                window.app.registerModal(this);
                window._sidebarModalRegistered = true;
            }
        }

        hide() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.sidebarEl.classList.remove('active');
            if (this.overlay) this.overlay.classList.remove('active');
            document.body.style.overflow = '';
            // 重置搜索过滤
            const searchInput = document.getElementById('sidebarSearchInput');
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                this.filterCategories('');
            }
        }

        toggle() {
            this.isOpen ? this.hide() : this.show();
        }

        isVisible() {
            return this.isOpen;
        }

        destroy() {
            this.hide();
            if (this.overlay) this.overlay.remove();
        }
    }

    // 等待 DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.sidebar || !(window.sidebar instanceof ModernSidebar)) {
                window.sidebar = new ModernSidebar();
            }
        });
    } else {
        if (!window.sidebar || !(window.sidebar instanceof ModernSidebar)) {
            window.sidebar = new ModernSidebar();
        }
    }
})();