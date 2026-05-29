// sidebar.js - 现代悬浮侧滑栏（动态顶部、底部安全区、必应壁纸、QQ头像获取）
(function() {
    // 分类数据
    const CATEGORIES_DATA = [
        { name: '常用工具', icon: 'fas fa-tools', expanded: true, items: [
            { icon: 'fas fa-mobile-alt', label: '手机软件', action: 'link', link: './pages/chl/手机软件.html' },
            { icon: 'fas fa-desktop', label: '电脑软件', action: 'link', link: './pages/chl/电脑软件.html' },
            { icon: 'fas fa-film', label: '电影大全', action: 'link', link: './pages/chl/影视推荐.html' },
            { icon: 'fas fa-images', label: '共享图片', action: 'link', link: './pages/chl/共享图片链接.html' }
        ] },
        { name: '网盘工具', icon: 'fas fa-cloud', expanded: false, items: [
            { icon: 'fas fa-cloud-upload-alt', label: '夸克网盘', link: './pages/chl/夸克网盘.html' },
            { icon: 'fas fa-desktop', label: '电脑软件', link: './pages/chl/电脑软件.html' },
            { icon: 'fas fa-film', label: '电影大全', link: './pages/chl/影视推荐.html' },
            { icon: 'fas fa-images', label: '共享图片', link: './pages/chl/共享图片链接.html' }
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

    // 底部按钮配置（只有图标，无文字）
    const FOOTER_BUTTONS = [
        { icon: 'fas fa-pen', action: 'notebook' },
        { icon: 'fas fa-gift', action: 'gift' },
        { icon: 'fas fa-info-circle', action: 'about' },
        { icon: 'fab fa-qq', action: 'qq' }
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
            this.loadBingWallpaper();
            this.setSidebarPosition();           // 动态设置 top
            window.addEventListener('resize', () => this.setSidebarPosition());
            window.addEventListener('orientationchange', () => this.setSidebarPosition());
            window.sidebar = this;
        }

        // 动态计算侧滑栏顶部位置（与导航栏底部对齐）
        setSidebarPosition() {
            const navbar = document.querySelector('.navbar');
            let top = 60; // 默认值
            if (navbar) {
                const rect = navbar.getBoundingClientRect();
                top = rect.bottom;
            }
            this.sidebarEl.style.top = top + 'px';
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
                <div class="sidebar-wallpaper" id="sidebarWallpaper">
                    <div class="sidebar-wallpaper-overlay"></div>
                    <div class="sidebar-user-info">
                        <div class="user-avatar" id="sidebarAvatarBtn">
                            <img id="sidebarAvatarImg" src="./assets/logo.png" alt="头像" loading="lazy">
                        </div>
                        <div class="user-info">
                            <div class="user-name" id="sidebarUserName">访客用户</div>
                            <div class="user-bio" id="sidebarUserBio">探索无限可能</div>
                        </div>
                    </div>
                </div>
                <div class="daily-quote">
                    <p class="quote-text" id="sidebarQuote">加载中...</p>
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
            });

            // 分类项点击
            const categoryItems = this.sidebarEl.querySelectorAll('.category-item');
            categoryItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const link = item.dataset.link;
                    if (link) {
                        window.open(link, '_blank');
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

            // 头像点击 - 打开个人资料模态框
            const avatarBtn = document.getElementById('sidebarAvatarBtn');
            if (avatarBtn) {
                avatarBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openProfileModal();
                });
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
        }

        async loadBingWallpaper() {
            const wallpaperDiv = document.getElementById('sidebarWallpaper');
            if (!wallpaperDiv) return;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const resolution = window.innerWidth >= 1920 ? 1920 : 1366;
                const response = await fetch(`https://bing.biturl.top/?resolution=${resolution}&format=json&index=0`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        let imageUrl = data.url;
                        if (!imageUrl.startsWith('http')) {
                            imageUrl = 'https://bing.biturl.top' + imageUrl;
                        }
                        wallpaperDiv.style.backgroundImage = `url(${imageUrl})`;
                        return;
                    }
                }
                throw new Error('壁纸获取失败');
            } catch (error) {
                console.warn('必应壁纸加载失败，使用默认渐变', error);
                wallpaperDiv.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
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
            let modal = document.getElementById('profileModal');
            if (modal) {
                modal.classList.add('active');
                this.fillProfileModalData();
                return;
            }
            const modalHtml = `
                <div class="profile-modal" id="profileModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);z-index:10002;display:flex;align-items:center;justify-content:center;">
                    <div style="background:var(--bg-card);border-radius:20px;padding:24px;width:340px;max-width:90%;">
                        <h3 style="margin-bottom:16px;font-size:18px;">个人资料</h3>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:12px;margin-bottom:4px;color:var(--text-secondary);">QQ号码</label>
                            <input type="text" id="profileQQ" placeholder="输入QQ号码自动获取头像" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ddd;background:var(--bg-input);">
                            <div id="qqAvatarStatus" style="font-size:11px;margin-top:4px;color:#888;"></div>
                        </div>
                        <div style="margin-bottom:16px;">
                            <label style="display:block;font-size:12px;margin-bottom:4px;color:var(--text-secondary);">昵称</label>
                            <input type="text" id="profileNickname" placeholder="昵称" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ddd;background:var(--bg-input);">
                        </div>
                        <div style="margin-bottom:20px;">
                            <label style="display:block;font-size:12px;margin-bottom:4px;color:var(--text-secondary);">个性签名</label>
                            <input type="text" id="profileSignature" placeholder="个性签名" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ddd;background:var(--bg-input);">
                        </div>
                        <div style="display:flex;gap:12px;justify-content:flex-end;">
                            <button id="profileSaveBtn" style="padding:8px 20px;background:#4361ee;color:white;border:none;border-radius:30px;cursor:pointer;">保存</button>
                            <button id="profileCloseBtn" style="padding:8px 20px;background:#e2e8f0;border:none;border-radius:30px;cursor:pointer;">取消</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('profileModal');
            this.fillProfileModalData();
            this.bindProfileModalEvents(modal);
        }

        fillProfileModalData() {
            const userConfig = Storage.get('userConfig') || {};
            const nicknameInput = document.getElementById('profileNickname');
            const signatureInput = document.getElementById('profileSignature');
            const qqInput = document.getElementById('profileQQ');
            if (nicknameInput) nicknameInput.value = userConfig.nickname || '';
            if (signatureInput) signatureInput.value = userConfig.signature || '';
            if (qqInput) qqInput.value = userConfig.qq || '';
            const qqField = document.getElementById('profileQQ');
            if (qqField && !qqField._bound) {
                qqField._bound = true;
                qqField.addEventListener('input', this.debounce(() => this.fetchQQAvatar(), 500));
            }
        }

        debounce(func, wait) {
            let timeout;
            return function() {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, arguments), wait);
            };
        }

        async fetchQQAvatar() {
            const qqInput = document.getElementById('profileQQ');
            const statusDiv = document.getElementById('qqAvatarStatus');
            if (!qqInput) return;
            const qq = qqInput.value.trim();
            if (!qq || !/^[1-9][0-9]{4,11}$/.test(qq)) {
                if (statusDiv) statusDiv.textContent = '';
                return;
            }
            if (statusDiv) statusDiv.textContent = '获取头像中...';
            try {
                const response = await fetch(`https://api.kuleu.com/api/qqimg?qq=${qq}`);
                if (response.ok) {
                    const avatarUrl = response.url;
                    if (statusDiv) statusDiv.textContent = '✓ 头像获取成功';
                    const userConfig = Storage.get('userConfig') || {};
                    userConfig.avatar = avatarUrl;
                    userConfig.qq = qq;
                    Storage.set('userConfig', userConfig);
                    const sidebarAvatar = document.getElementById('sidebarAvatarImg');
                    if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
                } else {
                    if (statusDiv) statusDiv.textContent = '获取失败，请检查QQ号';
                }
            } catch (error) {
                console.warn('QQ头像获取失败', error);
                if (statusDiv) statusDiv.textContent = '网络错误，请重试';
            }
        }

        bindProfileModalEvents(modal) {
            const saveBtn = document.getElementById('profileSaveBtn');
            const closeBtn = document.getElementById('profileCloseBtn');
            const closeModal = () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            };
            saveBtn?.addEventListener('click', () => {
                const newNickname = document.getElementById('profileNickname')?.value.trim() || '访客用户';
                const newSignature = document.getElementById('profileSignature')?.value.trim() || '探索无限可能';
                const qq = document.getElementById('profileQQ')?.value.trim() || '';
                const userConfig = Storage.get('userConfig') || {};
                userConfig.nickname = newNickname;
                userConfig.signature = newSignature;
                userConfig.qq = qq;
                Storage.set('userConfig', userConfig);
                this.loadUserData();
                closeModal();
                if (window.toast) window.toast.show('个人信息已保存', 'success');
            });
            closeBtn?.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
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