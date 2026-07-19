/* sidebar.js - 精简版（侧边栏底部福利替换为投稿 + 修复投稿按钮依赖 + QQ号持久化） */
(function() {
    const CATEGORIES_DATA = [
        { name: '常用工具', icon: 'fas fa-tools', expanded: true, items: [
            { icon: 'fas fa-mobile-alt', label: '手机软件', link: './pages/chl/手机软件.html' },
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

    const FOOTER_BUTTONS = [
        { icon: 'fas fa-pen', action: 'notebook', color: '#8b5cf6' },
        { icon: 'fas fa-paper-plane', action: 'submit', color: '#06b6d4' },
        { icon: 'fas fa-info-circle', action: 'about', color: '#ec4899' },
        { icon: 'fab fa-qq', action: 'qq', color: '#3b82f6' }
    ];

    class ModernSidebar {
        constructor() {
            if (window.Starlink?.sidebar) return window.Starlink.sidebar;
            this.sidebarEl = document.getElementById('sidebar');
            this.isOpen = false;
            this.categories = JSON.parse(JSON.stringify(CATEGORIES_DATA));
            this.userConfig = null;
            this._savedScrollY = 0;
            this.init();
            if (window.Starlink) window.Starlink.sidebar = this;
            window.sidebar = this;
        }

        init() {
            if (!this.sidebarEl) return;
            this.render();
            this.bindEvents();
            this.loadUserData();
            this.loadDailyQuote();
            this.loadExpandedState();
            this.setFixedTop();
            this.loadWallpaperBackground();
            this.initTouchGestures();
            window.addEventListener('resize', () => this.setFixedTop());
        }

        initTouchGestures() {
            let touchStartX = 0, touchStartTime = 0;
            const threshold = 50, edgeWidth = 30;

            document.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartTime = Date.now();
            }, { passive: true });

            document.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                const diffX = touchEndX - touchStartX;
                const duration = Date.now() - touchStartTime;
                const isFastSwipe = duration < 300 && Math.abs(diffX) > threshold;
                if (isFastSwipe && diffX < -threshold && this.isOpen) { this.hide(); e.preventDefault(); }
                else if (isFastSwipe && diffX > threshold && touchStartX < edgeWidth && !this.isOpen) { this.show(); e.preventDefault(); }
            });
        }

        render() {
            this.sidebarEl.innerHTML = `
                <div class="sidebar-wallpaper" id="sidebarWallpaper">
                    <div class="sidebar-wallpaper-overlay"></div>
                    <div class="sidebar-wallpaper-user-info">
                        <div class="sidebar-wallpaper-avatar" id="sidebarAvatarBtn">
                            <img id="sidebarAvatarImg" src="./assets/logo.png" alt="头像" loading="lazy">
                        </div>
                        <div class="sidebar-wallpaper-user-text">
                            <div class="sidebar-wallpaper-nickname" id="sidebarUserName">访客用户</div>
                            <div class="sidebar-wallpaper-signature" id="sidebarUserBio">探索无限可能</div>
                        </div>
                    </div>
                </div>
                <div class="daily-quote-card"><p id="sidebarQuote">加载中...</p></div>
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
            container.innerHTML = this.categories.map((cat, i) => `
                <div class="category-group ${cat.expanded ? 'expanded' : ''}" data-category-index="${i}">
                    <div class="category-group-header">
                        <div class="category-name"><i class="${cat.icon}"></i><span>${this._escapeHtml(cat.name)}</span></div>
                        <button class="category-toggle"><i class="fas fa-chevron-down"></i></button>
                    </div>
                    <div class="category-items">${cat.items.map(item => `
                        <button class="category-item" data-link="${this._escapeHtml(item.link)}">
                            <i class="${item.icon}"></i><span>${this._escapeHtml(item.label)}</span>
                        </button>
                    `).join('')}</div>
                </div>
            `).join('');
        }

        renderFooter() {
            const container = document.getElementById('sidebarFooter');
            if (!container) return;
            container.innerHTML = FOOTER_BUTTONS.map(btn => `
                <button class="footer-btn" data-action="${btn.action}" style="color:${btn.color};">
                    <i class="${btn.icon}"></i>
                </button>
            `).join('');
        }

        bindEvents() {
            document.addEventListener('click', (e) => {
                if (!this.isOpen) return;
                const menuBtn = document.getElementById('menuBtn');
                const isMenuBtn = menuBtn?.contains(e.target);
                const isSidebar = this.sidebarEl?.contains(e.target);
                if (!isSidebar && !isMenuBtn) this.hide();
            });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) this.hide(); });

            const menuBtn = document.getElementById('menuBtn');
            if (menuBtn && !menuBtn._sidebarBound) {
                menuBtn._sidebarBound = true;
                menuBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
            }
        }

        bindComponentEvents() {
            // 分类展开/收起
            this.sidebarEl.querySelectorAll('.category-group').forEach((group, idx) => {
                const header = group.querySelector('.category-group-header');
                header?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isExpanded = group.classList.contains('expanded');
                    group.classList.toggle('expanded');
                    this.categories[idx].expanded = !isExpanded;
                    this.saveExpandedState();
                });
            });

            // 分类项点击
            this.sidebarEl.querySelectorAll('.category-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const link = item.dataset.link;
                    if (link) { window.open(link, '_blank'); this.hide(); }
                });
            });

            // 底部按钮
            this.sidebarEl.querySelectorAll('.footer-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleFooterAction(btn.dataset.action);
                    this.hide();
                });
            });

            // 头像
            document.getElementById('sidebarAvatarBtn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openProfileModal();
            });
        }

        // 底部按钮处理
        handleFooterAction(action) {
            switch (action) {
                case 'notebook':
                    window.showNotebookModal?.();
                    break;
                case 'submit': {
                    const submitModule = window.Starlink?.app?.modules?.submit || window.submitModule;
                    if (submitModule?.show) submitModule.show();
                    else {
                        const submitModal = document.getElementById('submitModal');
                        if (submitModal) {
                            submitModal.classList.add('active');
                            window.Starlink?.app?.registerModal({
                                hide: () => submitModal.classList.remove('active'),
                                isVisible: () => submitModal.classList.contains('active')
                            });
                        }
                    }
                    break;
                }
                case 'about':
                    window.aboutModule?.show?.();
                    break;
                case 'qq':
                    window.open('https://qm.qq.com/q/HxcjhEclyM', '_blank');
                    break;
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
            } catch (e) { /* 静默处理 */ }
        }

        async loadDailyQuote() {
            const quoteEl = document.getElementById('sidebarQuote');
            if (!quoteEl) return;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                const response = await fetch('https://api.kuleu.com/api/yiyan', { signal: controller.signal });
                clearTimeout(timeoutId);
                const text = response.ok ? await response.text() : null;
                quoteEl.textContent = text?.trim() || '每一天都是新的开始，充满无限可能。';
            } catch { quoteEl.textContent = '每一天都是新的开始，充满无限可能。'; }
        }

        async loadWallpaperBackground() {
            const wallpaperDiv = document.getElementById('sidebarWallpaper');
            if (!wallpaperDiv) return;
            try {
                const response = await fetch('https://bing.biturl.top/?resolution=1366&format=json&index=0');
                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        wallpaperDiv.style.backgroundImage = `url(${data.url})`;
                        wallpaperDiv.style.backgroundSize = 'cover';
                        wallpaperDiv.style.backgroundPosition = 'center';
                    }
                }
            } catch (e) {
                wallpaperDiv.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        }

        // 个人资料 Modal（QQ号持久化）
        openProfileModal() {
            const currentAvatar = this.userConfig?.avatar || './assets/logo.png';
            const currentQQ = this.userConfig?.qq || '';
            const containerPadding = getComputedStyle(document.documentElement).getPropertyValue('--container-padding-xs').trim() || '16px';
            const modalHtml = `
                <div id="profileModal" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:10002;display:flex;align-items:center;justify-content:center;">
                    <div class="profile-modal-card" style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.12);width:360px;max-width:calc(100% - 2*${containerPadding});padding:0;overflow:hidden;">
                        <div style="padding:10px 14px 8px;border-bottom:1px solid rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:space-between;">
                            <h3 style="margin:0;font-size:16px;font-weight:600;color:var(--text-primary,#1e293b);">个人资料</h3>
                            <div style="width:32px;height:32px;border-radius:8px;overflow:hidden;background:#f0f0f0;flex-shrink:0;">
                                <img id="profileAvatarPreview" src="${this._escapeHtml(currentAvatar)}" alt="头像预览" style="width:100%;height:100%;object-fit:cover;">
                            </div>
                        </div>
                        <div style="padding:16px 20px;">
                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:12px;margin-bottom:6px;color:var(--text-secondary,#64748b);">QQ号码（自动获取头像）</label>
                                <input type="text" id="profileQQ" placeholder="输入QQ号" value="${this._escapeHtml(currentQQ)}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e0e0e0;background:#fff;font-size:13px;">
                                <div id="qqAvatarStatus" style="font-size:11px;margin-top:6px;color:#666;"></div>
                            </div>
                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:12px;margin-bottom:6px;color:var(--text-secondary,#64748b);">昵称</label>
                                <input type="text" id="profileNickname" placeholder="昵称" value="${this._escapeHtml(this.userConfig?.nickname || '')}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e0e0e0;background:#fff;font-size:13px;">
                            </div>
                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:12px;margin-bottom:6px;color:var(--text-secondary,#64748b);">个性签名</label>
                                <input type="text" id="profileSignature" placeholder="个性签名" value="${this._escapeHtml(this.userConfig?.signature || '')}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e0e0e0;background:#fff;font-size:13px;">
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                                <div style="font-size:11px;color:#ef4444;background:rgba(239,68,68,0.1);padding:4px 8px;border-radius:6px;">
                                    <i class="fas fa-info-circle"></i> QQ号仅供获取头像！
                                </div>
                                <div style="display:flex;gap:12px;">
                                    <button id="profileCancelBtn" style="padding:8px 20px;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:30px;cursor:pointer;font-size:13px;">取消</button>
                                    <button id="profileSaveBtn" style="padding:8px 20px;background:#4361ee;color:white;border:none;border-radius:30px;cursor:pointer;font-size:13px;">保存</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('profileModal');
            const qqInput = document.getElementById('profileQQ');
            const statusDiv = document.getElementById('qqAvatarStatus');
            const saveBtn = document.getElementById('profileSaveBtn');
            const cancelBtn = document.getElementById('profileCancelBtn');
            const avatarPreview = document.getElementById('profileAvatarPreview');

            modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

            qqInput?.addEventListener('blur', async () => {
                const qq = qqInput.value.trim();
                if (!qq || !/^[1-9][0-9]{4,11}$/.test(qq)) { statusDiv.textContent = qq ? 'QQ号格式不正确' : ''; statusDiv.style.color = qq ? '#ef4444' : ''; return; }
                statusDiv.textContent = '获取头像中...';
                statusDiv.style.color = '#666';
                try {
                    const avatarUrl = `https://api.kuleu.com/api/qqimg?qq=${qq}`;
                    const testImg = new Image();
                    testImg.onload = () => {
                        this.userConfig.avatar = avatarUrl;
                        statusDiv.textContent = '头像获取成功';
                        statusDiv.style.color = '#10b981';
                        if (avatarPreview) avatarPreview.src = avatarUrl;
                        const sidebarAvatar = document.getElementById('sidebarAvatarImg');
                        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
                    };
                    testImg.onerror = () => { statusDiv.textContent = '获取头像失败，请检查QQ号'; statusDiv.style.color = '#ef4444'; };
                    testImg.src = avatarUrl;
                } catch (e) { statusDiv.textContent = '获取失败'; statusDiv.style.color = '#ef4444'; }
            });

            saveBtn?.addEventListener('click', () => {
                const newName = document.getElementById('profileNickname')?.value.trim() || '访客用户';
                const newSig = document.getElementById('profileSignature')?.value.trim() || '探索无限可能';
                const newQQ = document.getElementById('profileQQ')?.value.trim() || '';
                const userConfig = Storage.get('userConfig') || {};
                userConfig.nickname = newName;
                userConfig.signature = newSig;
                userConfig.qq = newQQ;
                if (this.userConfig.avatar) userConfig.avatar = this.userConfig.avatar;
                Storage.set('userConfig', userConfig);
                this.loadUserData();
                modal?.remove();
                if (window.toast) window.toast.show('个人信息已保存', 'success');
            });

            cancelBtn?.addEventListener('click', () => modal?.remove());
        }

        setFixedTop() {
            const wallpaperSection = document.querySelector('.wallpaper-section');
            if (!wallpaperSection || !this.sidebarEl) return;
            const topPos = wallpaperSection.offsetTop;
            const extraOffset = window.innerWidth >= 1200 ? 24 : window.innerWidth >= 992 ? 20 : window.innerWidth >= 768 ? 16 : 16;
            this.sidebarEl.style.top = `${topPos + extraOffset}px`;
        }

        closeOtherModals() {
            window.Starlink?.search?.hide?.();
            window.newSearchModule?.hide?.();
            window.Starlink?.announcement?.hide?.();
            window.announcementModule?.hide?.();
            window.Starlink?.navbar?.hideMusicPlayer?.();
            window.app?.components?.navbar?.hideMusicPlayer?.();
            window.Starlink?.weather?.hide?.();
            window.app?.modules?.weather?.hide?.();
            window.Starlink?.about?.hide?.();
            window.aboutModule?.hide?.();
            window.Starlink?.app?.hideNotebookModal?.();
            window.hideNotebookModal?.();
            const submitModal = document.getElementById('submitModal');
            if (submitModal?.classList.contains('active')) submitModal.classList.remove('active');
            document.getElementById('profileModal')?.remove();
        }

        saveExpandedState() {
            Storage.set('sidebar_categories_state', this.categories.map(cat => ({ name: cat.name, expanded: cat.expanded })));
        }

        loadExpandedState() {
            const saved = Storage.get('sidebar_categories_state');
            if (saved) saved.forEach(savedCat => {
                const cat = this.categories.find(c => c.name === savedCat.name);
                if (cat) cat.expanded = savedCat.expanded;
            });
        }

        _escapeHtml(str) { return str?.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m] || m)) || ''; }

        show() {
            if (this.isOpen) return;
            this._savedScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
            this.closeOtherModals();
            this.isOpen = true;
            this.sidebarEl.classList.add('active');
            if (window.Starlink?.app && !window._sidebarModalRegistered) {
                window.Starlink.app.registerModal(this);
                window._sidebarModalRegistered = true;
            }
        }

        hide() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.sidebarEl.classList.remove('active');
            document.body.classList.remove('sidebar-open');
            if (typeof this._savedScrollY === 'number' && this._savedScrollY !== undefined) {
                window.scrollTo(0, this._savedScrollY);
                this._savedScrollY = 0;
            }
        }

        toggle() { this.isOpen ? this.hide() : this.show(); }
        isVisible() { return this.isOpen; }
        destroy() { this.hide(); }
    }

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.Starlink) window.Starlink = {};
            if (!window.Starlink.sidebar) window.Starlink.sidebar = new ModernSidebar();
        });
    } else {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.sidebar) window.Starlink.sidebar = new ModernSidebar();
    }
})();