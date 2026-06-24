/* sidebar.js */
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
        { icon: 'fas fa-gift', action: 'gift', color: '#f97316' },
        { icon: 'fas fa-info-circle', action: 'about', color: '#ec4899' },
        { icon: 'fab fa-qq', action: 'qq', color: '#3b82f6' }
    ];

    class ModernSidebar {
        constructor() {
            if (window.Starlink && window.Starlink.sidebar) return window.Starlink.sidebar;
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
            let touchStartX = 0;
            let touchStartTime = 0;
            const threshold = 50;
            const edgeWidth = 30;

            document.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartTime = Date.now();
            }, { passive: true });

            document.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                const diffX = touchEndX - touchStartX;
                const absDiff = Math.abs(diffX);
                const duration = Date.now() - touchStartTime;
                
                const isFastSwipe = duration < 300 && absDiff > threshold;
                
                if (isFastSwipe && diffX < -threshold && this.isOpen) {
                    this.hide();
                    e.preventDefault();
                } else if (isFastSwipe && diffX > threshold && touchStartX < edgeWidth && !this.isOpen) {
                    this.show();
                    e.preventDefault();
                }
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
                <div class="daily-quote-card">
                    <p id="sidebarQuote">加载中...</p>
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
                    itemsHtml += `
                        <button class="category-item" data-link="${this.escapeHtml(item.link)}">
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
                    <button class="footer-btn" data-action="${btn.action}" style="color: ${btn.color};">
                        <i class="${btn.icon}"></i>
                    </button>
                `;
            }
            container.innerHTML = html;
        }

        bindEvents() {
            document.addEventListener('click', (e) => {
                if (!this.isOpen) return;
                const menuBtn = document.getElementById('menuBtn');
                const isMenuBtn = menuBtn && menuBtn.contains(e.target);
                const isSidebar = this.sidebarEl && this.sidebarEl.contains(e.target);
                if (!isSidebar && !isMenuBtn) {
                    this.hide();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) this.hide();
            });

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

            const footerBtns = this.sidebarEl.querySelectorAll('.footer-btn');
            footerBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    this.handleFooterAction(action);
                    this.hide();
                });
            });

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

        openProfileModal() {
            const currentAvatar = (this.userConfig && this.userConfig.avatar) ? this.userConfig.avatar : './assets/logo.png';
            const containerPadding = getComputedStyle(document.documentElement).getPropertyValue('--container-padding-xs').trim() || '16px';
            const modalHtml = `
                <div id="profileModal" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:10002;display:flex;align-items:center;justify-content:center;">
                    <div class="profile-modal-card" style="
                        background: #ffffff;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                        width: 360px;
                        max-width: calc(100% - 2 * ${containerPadding});
                        padding: 0;
                        overflow: hidden;
                    ">
                        <div style="
                            padding: 10px 14px 8px;
                            border-bottom: 1px solid rgba(0,0,0,0.08);
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        ">
                            <h3 style="margin:0;font-size:16px;font-weight:600;color:var(--text-primary, #1e293b);">个人资料</h3>
                            <div style="width:32px;height:32px;border-radius:8px;overflow:hidden;background:#f0f0f0;flex-shrink:0;">
                                <img id="profileAvatarPreview" src="${this.escapeHtml(currentAvatar)}" alt="头像预览" style="width:100%;height:100%;object-fit:cover;">
                            </div>
                        </div>
                        <div style="padding:16px 20px;">
                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:12px;margin-bottom:6px;color:var(--text-secondary, #64748b);">QQ号码（自动获取头像）</label>
                                <input type="text" id="profileQQ" placeholder="输入QQ号" value="" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e0e0e0;background:#ffffff;font-size:13px;">
                                <div id="qqAvatarStatus" style="font-size:11px;margin-top:6px;color:#666;"></div>
                            </div>
                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:12px;margin-bottom:6px;color:var(--text-secondary, #64748b);">昵称</label>
                                <input type="text" id="profileNickname" placeholder="昵称" value="${this.escapeHtml(this.userConfig?.nickname || '')}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e0e0e0;background:#ffffff;font-size:13px;">
                            </div>
                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:12px;margin-bottom:6px;color:var(--text-secondary, #64748b);">个性签名</label>
                                <input type="text" id="profileSignature" placeholder="个性签名" value="${this.escapeHtml(this.userConfig?.signature || '')}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e0e0e0;background:#ffffff;font-size:13px;">
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

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            if (qqInput) {
                qqInput.addEventListener('blur', async () => {
                    const qq = qqInput.value.trim();
                    if (qq && /^[1-9][0-9]{4,11}$/.test(qq)) {
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
                            testImg.onerror = () => {
                                statusDiv.textContent = '获取头像失败，请检查QQ号';
                                statusDiv.style.color = '#ef4444';
                            };
                            testImg.src = avatarUrl;
                        } catch (e) {
                            statusDiv.textContent = '获取失败';
                            statusDiv.style.color = '#ef4444';
                        }
                    } else if (qq) {
                        statusDiv.textContent = 'QQ号格式不正确';
                        statusDiv.style.color = '#ef4444';
                    } else {
                        statusDiv.textContent = '';
                    }
                });
            }

            saveBtn?.addEventListener('click', () => {
                const newName = document.getElementById('profileNickname')?.value.trim() || '访客用户';
                const newSig = document.getElementById('profileSignature')?.value.trim() || '探索无限可能';
                const userConfig = Storage.get('userConfig') || {};
                userConfig.nickname = newName;
                userConfig.signature = newSig;
                if (this.userConfig.avatar) userConfig.avatar = this.userConfig.avatar;
                Storage.set('userConfig', userConfig);
                this.loadUserData();
                modal?.remove();
                if (window.toast) window.toast.show('个人信息已保存', 'success');
            });

            cancelBtn?.addEventListener('click', () => {
                modal?.remove();
            });
        }

        setFixedTop() {
            const wallpaperSection = document.querySelector('.wallpaper-section');
            if (!wallpaperSection || !this.sidebarEl) return;
            const topPos = wallpaperSection.offsetTop;
            let extraOffset = 0;
            const screenWidth = window.innerWidth;
            if (screenWidth >= 1200) extraOffset = 24;
            else if (screenWidth >= 992) extraOffset = 20;
            else if (screenWidth >= 768) extraOffset = 16;
            else extraOffset = 16;
            this.sidebarEl.style.top = `${topPos + extraOffset}px`;
        }

        closeOtherModals() {
            if (window.Starlink?.search && typeof window.Starlink.search.hide === 'function') window.Starlink.search.hide();
            else if (window.newSearchModule && typeof window.newSearchModule.hide === 'function') window.newSearchModule.hide();
            
            if (window.Starlink?.announcement && typeof window.Starlink.announcement.hide === 'function') window.Starlink.announcement.hide();
            else if (window.announcementModule && typeof window.announcementModule.hide === 'function') window.announcementModule.hide();
            
            if (window.Starlink?.navbar?.hideMusicPlayer) window.Starlink.navbar.hideMusicPlayer();
            else if (window.app?.components?.navbar) window.app.components.navbar.hideMusicPlayer();
            
            if (window.Starlink?.weather && typeof window.Starlink.weather.hide === 'function') window.Starlink.weather.hide();
            else if (window.app?.modules?.weather && typeof window.app.modules.weather.hide === 'function') window.app.modules.weather.hide();
            
            if (window.Starlink?.about && typeof window.Starlink.about.hide === 'function') window.Starlink.about.hide();
            else if (window.aboutModule && typeof window.aboutModule.hide === 'function') window.aboutModule.hide();
            
            if (window.Starlink?.app?.hideNotebookModal && typeof window.Starlink.app.hideNotebookModal === 'function') window.Starlink.app.hideNotebookModal();
            else if (window.hideNotebookModal && typeof window.hideNotebookModal === 'function') window.hideNotebookModal();
            
            const submitModal = document.getElementById('submitModal');
            if (submitModal && submitModal.classList.contains('active')) submitModal.classList.remove('active');
            const profileModal = document.getElementById('profileModal');
            if (profileModal && profileModal.parentNode) profileModal.remove();
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

        toggle() {
            this.isOpen ? this.hide() : this.show();
        }

        isVisible() {
            return this.isOpen;
        }

        destroy() {
            this.hide();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.Starlink) window.Starlink = {};
            if (!window.Starlink.sidebar) {
                window.Starlink.sidebar = new ModernSidebar();
            }
        });
    } else {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.sidebar) {
            window.Starlink.sidebar = new ModernSidebar();
        }
    }
})();