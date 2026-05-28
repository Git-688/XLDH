/**
 * 侧边栏组件 - 毛玻璃效果（最终修复底部遮挡版）
 * 功能：动态计算最大高度，确保底部按钮始终可见
 */
class CompactSidebar {
    constructor() {
        if (!document.getElementById('sidebar')) return;
        if (window.sidebar && window.sidebar instanceof CompactSidebar) {
            return window.sidebar;
        }

        this.categories = [
            {
                name: '常用工具',
                icon: 'fas fa-tools',
                expanded: true,
                items: [
                    { icon: 'fas fa-mobile-alt', label: '手机软件', badge: null, action: 'link', link: './pages/chl/手机软件.html' },
                    { icon: 'fas fa-desktop', label: '电脑软件', badge: null, action: 'link', link: './pages/chl/电脑软件.html' },
                    { icon: 'fas fa-film', label: '电影大全', badge: null, action: 'link', link: './pages/chl/影视推荐.html' },
                    { icon: 'fas fa-images', label: '共享图片', badge: null, action: 'link', link: './pages/chl/共享图片链接.html' }
                ]
            },
            {
                name: '网盘工具',
                icon: 'fas fa-cloud',
                expanded: false,
                items: [
                    { icon: 'fas fa-cloud-upload-alt', label: '夸克网盘', badge: null, action: 'link', link: './pages/chl/夸克网盘.html' },
                    { icon: 'fas fa-hdd', label: '123云盘', badge: null, action: 'link', link: './pages/chl/123云盘.html' },
                    { icon: 'fas fa-cloud', label: '天翼云盘', badge: null, action: 'link', link: './pages/chl/天翼云盘.html' },
                    { icon: 'fas fa-box', label: '115生活', badge: null, action: 'link', link: './pages/chl/115生活.html' },
                    { icon: 'fas fa-database', label: '阿里云盘', badge: null, action: 'link', link: './pages/chl/阿里云盘.html' },
                    { icon: 'fas fa-sim-card', label: '移动网盘', badge: null, action: 'link', link: './pages/chl/移动网盘.html' },
                    { icon: 'fab fa-baidu', label: '百度网盘', badge: null, action: 'link', link: './pages/chl/百度网盘.html' },
                    { icon: 'fas fa-server', label: '城通网盘', badge: null, action: 'link', link: './pages/chl/城通网盘.html' },
                    { icon: 'fas fa-file-archive', label: '蓝奏云', badge: null, action: 'link', link: './pages/chl/蓝奏云链接.html' }
                ]
            },
            {
                name: '学习资源',
                icon: 'fas fa-graduation-cap',
                expanded: false,
                items: [
                    { icon: 'fas fa-child', label: '小学阶段', badge: null, action: 'link', link: './pages/chl/小学阶段.html' },
                    { icon: 'fas fa-school', label: '初中阶段', badge: null, action: 'link', link: './pages/chl/初中阶段.html' },
                    { icon: 'fas fa-university', label: '高中阶段', badge: null, action: 'link', link: './pages/chl/高中阶段.html' },
                    { icon: 'fas fa-user-graduate', label: '大学生活', badge: null, action: 'link', link: './pages/chl/大学生活.html' },
                    { icon: 'fas fa-briefcase', label: '社会实践', badge: null, action: 'link', link: './pages/chl/社会实践.html' }
                ]
            },
            {
                name: '自制小工具',
                icon: 'fas fa-cogs',
                expanded: false,
                items: [
                    { icon: 'fas fa-scroll', label: '手持弹幕', badge: null, action: 'link', link: './pages/chl/手持弹幕.html' },
                    { icon: 'fas fa-gift', label: '幸运大转盘', badge: null, action: 'link', link: './pages/chl/幸运大转盘.html' },
                    { icon: 'fas fa-clipboard-list', label: '记分牌', badge: null, action: 'link', link: './pages/chl/记分牌.html' },
                    { icon: 'fas fa-clock', label: '时间屏幕', badge: null, action: 'link', link: './pages/chl/时间屏幕.html' }
                ]
            },
            {
                name: '其他',
                icon: 'fas fa-ellipsis-h',
                expanded: false,
                items: [
                    { icon: 'fas fa-fire', label: '烟花模拟器', badge: null, action: 'link', link: './pages/chl/烟花模拟器.html' }
                ]
            }
        ];

        this.isInitialized = false;
        this.currentVideo = null;
        this.videoCache = null;
        this.lastVideoDate = null;
        this.savedScrollY = 0;
        this.modalRegistered = false;
        this.defaultAvatar = './assets/logo.png';
        this.resizeObserver = null;

        this.updateDimensions = this.updateDimensions.bind(this);
        this.throttledUpdate = this.throttle(this.updateDimensions, 100);
    }

    throttle(fn, delay) {
        let last = 0;
        return function(...args) {
            const now = Date.now();
            if (now - last >= delay) {
                last = now;
                fn.apply(this, args);
            }
        };
    }

    getDefaultAvatarSVG() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
    }

    async init() {
        if (this.isInitialized) return;
        try {
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }
            this.loadExpandedState();
            this.render();
            this.bindEvents();
            await this.loadUserData();
            await this.loadDailyQuote();
            await this.loadWallpaperUserInfo();
            this.createProfileModal();
            this.initResizeObserver();
            this.updateDimensions();
            window.addEventListener('resize', this.throttledUpdate);
            window.addEventListener('orientationchange', this.updateDimensions);
            window.addEventListener('scroll', this.throttledUpdate); // 滚动时重新计算（处理移动端地址栏变化）
            this.isInitialized = true;
            window.sidebar = this;
        } catch (error) {
            console.error('侧滑栏初始化失败:', error);
            window.toast?.show('侧滑栏初始化失败', 'error');
        }
    }

    initResizeObserver() {
        if (typeof ResizeObserver === 'undefined') return;
        const container = document.querySelector('.container');
        if (!container) return;
        this.resizeObserver = new ResizeObserver(() => this.throttledUpdate());
        this.resizeObserver.observe(container);
    }

    updateDimensions() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        // 动态获取导航栏实际高度
        const navbar = document.querySelector('.navbar');
        const navbarHeight = navbar ? navbar.offsetHeight : 60;

        // 计算壁纸区域的上边距（margin-top + padding-top）
        const wallpaperSection = document.querySelector('.wallpaper-section');
        let wallpaperTop = 0;
        if (wallpaperSection) {
            const style = window.getComputedStyle(wallpaperSection);
            const marginTop = parseFloat(style.marginTop) || 0;
            const paddingTop = parseFloat(style.paddingTop) || 0;
            wallpaperTop = marginTop + paddingTop;
        }
        const topOffset = navbarHeight + wallpaperTop;
        sidebar.style.top = `${topOffset}px`;

        // 获取 CSS 中定义的 bottom 值（包括安全区）
        const computedStyle = window.getComputedStyle(sidebar);
        let bottomVal = parseFloat(computedStyle.bottom);
        if (isNaN(bottomVal)) bottomVal = 16; // 默认 16px

        // 计算最大高度 = 视口高度 - top - bottom
        const viewportHeight = window.innerHeight;
        const maxHeight = viewportHeight - topOffset - bottomVal;
        if (maxHeight > 0) {
            sidebar.style.maxHeight = `${maxHeight}px`;
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

    render() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        const categoriesContainer = sidebar.querySelector('.sidebar-categories');
        if (categoriesContainer) {
            categoriesContainer.innerHTML = this.categories.map(category => `
                <div class="category-group ${category.expanded ? 'expanded' : ''}" data-category="${this.escapeHtml(category.name)}">
                    <div class="category-group-header">
                        <div class="category-group-name">
                            <div class="category-group-icon">
                                <i class="${category.icon}"></i>
                            </div>
                            <span>${this.escapeHtml(category.name)}</span>
                        </div>
                        <button class="category-toggle" aria-label="${category.expanded ? '收起' : '展开'}">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="category-items" style="max-height: ${category.expanded ? '500px' : '0'}">
                        ${category.items.map(item => `
                            <button class="category-item" data-action="${item.action || ''}" data-link="${item.link || ''}">
                                <div class="category-icon">
                                    <i class="${item.icon}"></i>
                                </div>
                                <div class="category-label">${this.escapeHtml(item.label)}</div>
                                ${item.badge ? `<div class="category-badge">${this.escapeHtml(item.badge)}</div>` : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
    }

    bindEvents() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
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
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !document.getElementById('menuBtn')?.contains(e.target)) {
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
        const category = this.categories.find(cat => cat.name === categoryName);
        if (category) {
            category.expanded = !category.expanded;
            categoryGroup.classList.toggle('expanded', category.expanded);
            const itemsContainer = categoryGroup.querySelector('.category-items');
            if (itemsContainer) {
                itemsContainer.style.maxHeight = category.expanded ? itemsContainer.scrollHeight + 'px' : '0';
            }
            this.saveExpandedState();
        }
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
                window.app?.components?.navbar?.toggleMusicPlayer();
                break;
            case 'weather':
                window.app?.modules?.weather?.showModal();
                break;
            default:
                break;
        }
    }

    handleFooterClick(btn) {
        const icon = btn.querySelector('i');
        if (!icon) return;
        const iconClass = icon.className;
        if (iconClass.includes('fa-pen')) {
            window.showNotebookModal?.();
        } else if (iconClass.includes('fa-gift')) {
            window.open('./pages/tools/羊毛福利.html', '_blank');
        } else if (iconClass.includes('fa-info-circle')) {
            window.aboutModule?.show();
        } else if (iconClass.includes('fa-qq')) {
            window.open('https://qm.qq.com/q/HxcjhEclyM', '_blank');
        }
    }

    show() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || this.isVisible()) return;
        this.updateDimensions();
        this.savedScrollY = window.scrollY;
        document.body.classList.add('sidebar-open');
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.savedScrollY}px`;
        document.body.style.width = '100%';
        sidebar.classList.add('active');
        if (window.app && !this.modalRegistered) {
            window.app.registerModal(this);
            this.modalRegistered = true;
        }
        this.loadSidebarWallpaper();
    }

    hide() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || !this.isVisible()) return;
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, this.savedScrollY);
        if (window.app && this.modalRegistered) {
            window.app.unregisterModal(this);
            this.modalRegistered = false;
        }
        if (this.currentVideo) this.currentVideo.pause();
    }

    toggle() {
        this.isVisible() ? this.hide() : this.show();
    }

    isVisible() {
        const sidebar = document.getElementById('sidebar');
        return sidebar ? sidebar.classList.contains('active') : false;
    }

    async loadSidebarWallpaper() {
        const dayOfWeek = new Date().getDay();
        const mediaInfo = this.getLocalWallpaper(dayOfWeek);
        const today = new Date().toDateString();
        if (this.videoCache && this.lastVideoDate === today) {
            const sidebarWallpaper = document.getElementById('sidebarWallpaper');
            if (sidebarWallpaper && this.videoCache.parentNode !== sidebarWallpaper) {
                const oldVideo = sidebarWallpaper.querySelector('video');
                if (oldVideo) oldVideo.remove();
                sidebarWallpaper.appendChild(this.videoCache);
                this.currentVideo = this.videoCache;
            }
            return;
        }
        await this.setVideoWallpaper(mediaInfo.url);
        this.lastVideoDate = today;
    }

    getLocalWallpaper(dayOfWeek) {
        const videoWallpapers = {
            0: './assets/wallpapers/sunday.mp4',
            1: './assets/wallpapers/monday.mp4',
            2: './assets/wallpapers/tuesday.mp4',
            3: './assets/wallpapers/wednesday.mp4',
            4: './assets/wallpapers/thursday.mp4',
            5: './assets/wallpapers/friday.mp4',
            6: './assets/wallpapers/saturday.mp4'
        };
        return { type: 'video', url: videoWallpapers[dayOfWeek] || './assets/wallpapers/monday.mp4' };
    }

    async setVideoWallpaper(videoUrl) {
        const sidebarWallpaper = document.getElementById('sidebarWallpaper');
        if (!sidebarWallpaper) return;
        if (this.currentVideo && this.currentVideo.parentNode) {
            this.currentVideo.remove();
        }
        try {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.preload = "auto";
            video.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
                z-index: 0;
            `;
            video.setAttribute('autoplay', 'true');
            video.setAttribute('muted', 'true');
            video.setAttribute('loop', 'true');
            video.setAttribute('playsinline', 'true');
            video.onerror = () => this.setFallbackBackground();
            sidebarWallpaper.appendChild(video);
            this.currentVideo = video;
            this.videoCache = video;
            const overlay = sidebarWallpaper.querySelector('.sidebar-wallpaper-overlay');
            if (overlay) overlay.style.zIndex = '1';
            const userInfo = sidebarWallpaper.querySelector('.sidebar-wallpaper-user-info');
            if (userInfo) userInfo.style.zIndex = '2';
            try {
                await video.play();
            } catch (e) {
                this.setFallbackBackground();
            }
        } catch (error) {
            this.setFallbackBackground();
        }
    }

    setFallbackBackground() {
        const sidebarWallpaper = document.getElementById('sidebarWallpaper');
        if (sidebarWallpaper) {
            if (this.currentVideo) this.currentVideo.remove();
            sidebarWallpaper.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    adjustWallpaperSize() {
        const sidebar = document.getElementById('sidebar');
        const wallpaper = document.getElementById('sidebarWallpaper');
        if (!sidebar || !wallpaper) return;
        const sidebarWidth = sidebar.offsetWidth;
        wallpaper.style.width = `${sidebarWidth}px`;
        wallpaper.style.maxWidth = '100%';
        if (this.currentVideo) {
            this.currentVideo.style.width = '100%';
            this.currentVideo.style.height = '100%';
            this.currentVideo.style.objectFit = 'contain';
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
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const target = entry.target;
                        const src = target.getAttribute('data-src');
                        if (src) target.src = src;
                        observer.unobserve(target);
                    }
                });
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
        const closeModal = () => {
            profileModal.classList.remove('active');
        };
        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && profileModal.classList.contains('active')) closeModal();
        });
        qqInput?.addEventListener('input', () => this.autoGetQQAvatar());
        form?.addEventListener('submit', (e) => {
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
        window.toast?.show('个人信息保存成功', 'success');
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
        if (this.currentVideo) this.currentVideo.pause();
        if (this.resizeObserver) this.resizeObserver.disconnect();
        window.removeEventListener('resize', this.throttledUpdate);
        window.removeEventListener('orientationchange', this.updateDimensions);
        window.removeEventListener('scroll', this.throttledUpdate);
        if (window.app && this.modalRegistered) window.app.unregisterModal(this);
    }
}

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