/**
 * 侧边栏组件 - 悬浮毛玻璃优化版（壁纸改为必应每日壁纸）
 */
class CompactSidebar {
    constructor() {
        if (!document.getElementById('sidebar')) {
            return;
        }
        
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
        this.gapConfig = {
            desktop: { min: 24, max: 60 },
            mobile: { min: 16, max: 40 }
        };
        this.navbarHeight = 60;
        this.minSidebarHeight = 400;

        this.defaultAvatar = './assets/logo.png';
        this.originalBodyOverflow = '';
        this.originalBodyPosition = '';
        this.originalBodyTop = '';
        this.savedScrollTop = 0;
        
        // 壁纸缓存
        this.cachedWallpaperUrl = null;
        this.cachedWallpaperDate = null;
    }

    // 获取安全区域底部高度
    getSafeBottom() {
        let safeBottom = 0;
        if (window.innerWidth < 768) {
            const div = document.createElement('div');
            div.style.cssText = 'position: fixed; bottom: 0; left: 0; width: 1px; height: 1px; padding-bottom: env(safe-area-inset-bottom); pointer-events: none;';
            document.body.appendChild(div);
            const computedPadding = getComputedStyle(div).paddingBottom;
            safeBottom = parseFloat(computedPadding) || 0;
            document.body.removeChild(div);
            if (safeBottom < 10) safeBottom = 34;
        }
        return safeBottom;
    }

    calcSidebarPosition() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const navbar = document.querySelector('.navbar');
        const actualNavbarHeight = navbar ? navbar.offsetHeight : this.navbarHeight;
        this.navbarHeight = actualNavbarHeight;

        const viewportHeight = window.innerHeight;
        const isMobile = window.innerWidth < 768;
        
        const gapConfig = isMobile ? this.gapConfig.mobile : this.gapConfig.desktop;
        const safeBottom = this.getSafeBottom();
        
        const maxAvailableHeight = viewportHeight - this.navbarHeight - 2 * gapConfig.min - safeBottom;
        let sidebarHeight = Math.min(maxAvailableHeight, Math.max(this.minSidebarHeight, viewportHeight * 0.9 - safeBottom));
        
        const totalMargin = viewportHeight - this.navbarHeight - sidebarHeight - safeBottom;
        const margin = totalMargin / 2;
        
        sidebar.style.top = `${this.navbarHeight + margin}px`;
        sidebar.style.height = `${sidebarHeight}px`;
        sidebar.style.bottom = 'auto';
        sidebar.style.maxHeight = 'none';

        const footer = sidebar.querySelector('.sidebar-footer');
        if (footer) {
            const basePadding = Math.max(8, Math.floor(margin * 0.4));
            const targetPadding = Math.min(basePadding, 16);
            footer.style.paddingTop = `${targetPadding}px`;
            footer.style.paddingBottom = `max(${targetPadding}px, env(safe-area-inset-bottom))`;
            footer.style.marginTop = '0';
            footer.style.marginBottom = '0';
            footer.style.display = 'flex';
            footer.style.alignItems = 'center';
            footer.style.gap = '6px';
        }

        this.adjustWallpaperSize();
    }

    adjustWallpaperSize() {
        const sidebar = document.getElementById('sidebar');
        const wallpaper = document.getElementById('sidebarWallpaper');
        if (!sidebar || !wallpaper) return;

        const sidebarWidth = sidebar.offsetWidth;
        wallpaper.style.width = `${sidebarWidth}px`;
        wallpaper.style.maxWidth = '100%';
    }

    handleResize() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.calcSidebarPosition();
            }, 100);
        }, { passive: true });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.calcSidebarPosition();
            }, 200);
        }, { passive: true });
    }

    observeLazyAvatar(img) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const target = entry.target;
                        const src = target.getAttribute('data-src');
                        if (src) {
                            target.src = src;
                            target.removeAttribute('data-src');
                        }
                        observer.unobserve(target);
                    }
                });
            });
            observer.observe(img);
        } else {
            if (img.getAttribute('data-src')) {
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
            }
        }
    }

    async init() {
        if (this.isInitialized) return;
        try {
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }

            this.calcSidebarPosition();
            this.handleResize();

            this.loadExpandedState();
            this.render();
            this.bindEvents();
            await this.loadUserData();
            await this.loadDailyQuote();
            await this.loadWallpaperUserInfo();
            await this.loadBingWallpaper(); // 加载必应壁纸
            this.createProfileModal();
            
            this.isInitialized = true;
            
            window.sidebar = this;
            window.CompactSidebar = CompactSidebar;
            
        } catch (error) {
            console.error('侧滑栏初始化失败:', error);
            window.toast.show('侧滑栏初始化失败', 'error');
        }
    }

    // 获取必应每日壁纸（自动缓存，每日更新）
    async loadBingWallpaper() {
        const sidebarWallpaper = document.getElementById('sidebarWallpaper');
        if (!sidebarWallpaper) return;

        const today = new Date().toISOString().slice(0, 10);
        // 检查缓存是否有效（同一天）
        if (this.cachedWallpaperUrl && this.cachedWallpaperDate === today) {
            this.setWallpaperBackground(this.cachedWallpaperUrl);
            return;
        }

        try {
            // 使用官方必应接口
            const response = await Utils.safeFetch('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN', { timeout: 8000 });
            const data = await response.json();
            if (data.images && data.images.length && data.images[0].url) {
                const imageUrl = 'https://cn.bing.com' + data.images[0].url;
                this.cachedWallpaperUrl = imageUrl;
                this.cachedWallpaperDate = today;
                this.setWallpaperBackground(imageUrl);
            } else {
                throw new Error('无效的壁纸数据');
            }
        } catch (error) {
            console.error('获取必应壁纸失败:', error);
            // 降级：使用默认渐变背景
            this.setFallbackBackground();
        }
    }

    setWallpaperBackground(url) {
        const sidebarWallpaper = document.getElementById('sidebarWallpaper');
        if (!sidebarWallpaper) return;
        // 清除可能存在的视频元素
        const existingVideo = sidebarWallpaper.querySelector('video');
        if (existingVideo) existingVideo.remove();
        // 设置背景图片
        sidebarWallpaper.style.backgroundImage = `url('${url}')`;
        sidebarWallpaper.style.backgroundSize = 'cover';
        sidebarWallpaper.style.backgroundPosition = 'center';
        sidebarWallpaper.style.backgroundRepeat = 'no-repeat';
        // 确保 overlay 存在
        const overlay = sidebarWallpaper.querySelector('.sidebar-wallpaper-overlay');
        if (overlay) overlay.style.zIndex = '1';
        const userInfo = sidebarWallpaper.querySelector('.sidebar-wallpaper-user-info');
        if (userInfo) userInfo.style.zIndex = '2';
    }

    setFallbackBackground() {
        const sidebarWallpaper = document.getElementById('sidebarWallpaper');
        if (sidebarWallpaper) {
            const existingVideo = sidebarWallpaper.querySelector('video');
            if (existingVideo) existingVideo.remove();
            sidebarWallpaper.style.backgroundImage = 'none';
            sidebarWallpaper.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    disableBodyScroll() {
        if (typeof document === 'undefined') return;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        this.originalBodyOverflow = document.body.style.overflow;
        this.originalBodyPosition = document.body.style.position;
        this.originalBodyTop = document.body.style.top;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollTop}px`;
        document.body.style.width = '100%';
        this.savedScrollTop = scrollTop;
    }

    enableBodyScroll() {
        if (typeof document === 'undefined') return;
        document.body.style.overflow = this.originalBodyOverflow || '';
        document.body.style.position = this.originalBodyPosition || '';
        document.body.style.top = this.originalBodyTop || '';
        document.body.style.width = '';
        if (this.savedScrollTop !== undefined) {
            window.scrollTo(0, this.savedScrollTop);
        }
    }

    createProfileModal() {
        if (document.getElementById('profileModal')) return;
        try {
            const modalHTML = `
                <div class="profile-modal" id="profileModal">
                    <div class="profile-modal-content">
                        <button class="profile-modal-close" id="profileModalClose">
                            <i class="fas fa-times"></i>
                        </button>
                        <form class="profile-form" id="profileForm">
                            <div class="qq-avatar-section">
                                <div class="qq-avatar-preview">
                                    <img id="qqAvatarPreview" src="" alt="QQ头像预览" loading="lazy" decoding="async" class="js-img-fallback" data-fallback-type="defaultAvatar" data-default-svg="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=">
                                </div>
                                <div class="qq-avatar-input-group">
                                    <input type="text" class="form-input qq-avatar-input" id="qqNumber" 
                                           placeholder="输入QQ号码，自动获取头像">
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
        } catch (error) {
            console.error('创建个人资料模态框失败:', error);
        }
    }

    bindProfileModalEvents() {
        try {
            const profileModal = document.getElementById('profileModal');
            const profileModalClose = document.getElementById('profileModalClose');
            const profileCancelBtn = document.getElementById('profileCancelBtn');
            const profileForm = document.getElementById('profileForm');
            const qqNumberInput = document.getElementById('qqNumber');
            if (!profileModal || !profileForm || !qqNumberInput) return;
            
            const closeModal = () => profileModal.classList.remove('active');
            
            if (profileModalClose) profileModalClose.addEventListener('click', closeModal);
            if (profileCancelBtn) profileCancelBtn.addEventListener('click', closeModal);
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) closeModal();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && profileModal.classList.contains('active')) {
                    closeModal();
                }
            });
            qqNumberInput.addEventListener('input', () => this.autoGetQQAvatar());
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfileSettings();
            });
        } catch (error) {
            console.error('绑定个人资料模态框事件失败:', error);
        }
    }

    async autoGetQQAvatar() {
        try {
            const qqNumberInput = document.getElementById('qqNumber');
            const qqAvatarPreview = document.getElementById('qqAvatarPreview');
            const qqAvatarStatus = document.getElementById('qqAvatarStatus');
            if (!qqNumberInput || !qqAvatarPreview || !qqAvatarStatus) return;
            
            const qqNumber = qqNumberInput.value.trim();
            qqAvatarStatus.textContent = '';
            qqAvatarStatus.className = 'qq-avatar-status';
            
            if (!qqNumber) {
                qqAvatarPreview.src = this.defaultAvatar;
                return;
            }
            if (!/^[1-9][0-9]{4,11}$/.test(qqNumber)) {
                qqAvatarStatus.textContent = 'QQ号码格式不正确';
                qqAvatarStatus.className = 'qq-avatar-status error';
                return;
            }
            
            qqAvatarStatus.textContent = '获取中...';
            qqAvatarStatus.className = 'qq-avatar-status loading';
            const avatarUrl = await this.getQQAvatar(qqNumber);
            
            if (avatarUrl) {
                qqAvatarPreview.src = avatarUrl;
                this.ensureFallbackAttr(qqAvatarPreview);
                qqAvatarPreview.setAttribute('loading', 'lazy');
                qqAvatarPreview.setAttribute('decoding', 'async');
                qqAvatarStatus.textContent = '头像获取成功';
                qqAvatarStatus.className = 'qq-avatar-status success';
                
                const userConfig = Storage.get('userConfig') || {};
                userConfig.avatar = avatarUrl;
                Storage.set('userConfig', userConfig);
                
                const sidebarAvatar = document.getElementById('sidebarWallpaperAvatar');
                if (sidebarAvatar) {
                    sidebarAvatar.setAttribute('data-src', avatarUrl);
                    sidebarAvatar.classList.add('lazy-avatar');
                    this.observeLazyAvatar(sidebarAvatar);
                }
            } else {
                qqAvatarStatus.textContent = '获取头像失败';
                qqAvatarStatus.className = 'qq-avatar-status error';
            }
        } catch (error) {
            console.error('自动获取QQ头像失败:', error);
            const qqAvatarStatus = document.getElementById('qqAvatarStatus');
            if (qqAvatarStatus) {
                qqAvatarStatus.textContent = '获取失败，请重试';
                qqAvatarStatus.className = 'qq-avatar-status error';
            }
        }
    }

    ensureFallbackAttr(imgEl) {
        if (!imgEl) return;
        imgEl.classList.add('js-img-fallback');
        imgEl.dataset.fallbackType = 'defaultAvatar';
        imgEl.dataset.defaultSvg = this.getDefaultAvatarSVG();
    }

    getDefaultAvatarSVG() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
    }

    async getQQAvatar(qqNumber) {
        try {
            const response = await Utils.safeFetch(`https://api.kuleu.com/api/qqimg?qq=${qqNumber}`, { timeout: 5000 });
            return response.url;
        } catch (error) {
            Utils.handleApiError(error, '获取QQ头像失败', false);
            return null;
        }
    }

    saveProfileSettings() {
        try {
            const nicknameInput = document.getElementById('nickname');
            const signatureInput = document.getElementById('signature');
            const qqAvatarPreview = document.getElementById('qqAvatarPreview');
            if (!nicknameInput || !signatureInput || !qqAvatarPreview) {
                window.toast.show('保存失败，表单元素未找到', 'error');
                return;
            }
            const nickname = nicknameInput.value.trim();
            const signature = signatureInput.value.trim();
            const qqAvatar = qqAvatarPreview.src;
            const userConfig = Storage.get('userConfig') || {};
            userConfig.nickname = nickname || userConfig.nickname || '访客用户';
            userConfig.signature = signature || userConfig.signature || '探索无限可能';
            
            if (qqAvatar && !qqAvatar.includes('data:image/svg+xml') && qqAvatar !== this.defaultAvatar) {
                userConfig.avatar = qqAvatar;
            } else {
                userConfig.avatar = '';
            }
            Storage.set('userConfig', userConfig);
            this.loadWallpaperUserInfo();
            const profileModal = document.getElementById('profileModal');
            if (profileModal) profileModal.classList.remove('active');
            window.toast.show('个人信息保存成功', 'success');
        } catch (error) {
            console.error('保存个人资料设置失败:', error);
            window.toast.show('保存失败，请重试', 'error');
        }
    }

    openProfileModal() {
        try {
            const profileModal = document.getElementById('profileModal');
            const userConfig = Storage.get('userConfig') || {};
            if (!profileModal) return;
            
            const nicknameInput = document.getElementById('nickname');
            const signatureInput = document.getElementById('signature');
            const qqNumberInput = document.getElementById('qqNumber');
            const qqAvatarPreview = document.getElementById('qqAvatarPreview');
            
            if (nicknameInput) nicknameInput.value = userConfig.nickname || '';
            if (signatureInput) signatureInput.value = userConfig.signature || '';
            if (qqNumberInput) qqNumberInput.value = '';
            if (qqAvatarPreview) {
                qqAvatarPreview.src = userConfig.avatar || this.defaultAvatar;
                this.ensureFallbackAttr(qqAvatarPreview);
                qqAvatarPreview.setAttribute('loading', 'lazy');
                qqAvatarPreview.setAttribute('decoding', 'async');
            }
            profileModal.classList.add('active');
        } catch (error) {
            console.error('打开个人资料模态框失败:', error);
            window.toast.show('打开设置失败', 'error');
        }
    }

    loadExpandedState() {
        try {
            const savedState = Storage.get('sidebar_categories_state');
            if (savedState) {
                this.categories.forEach(cat => {
                    const savedCat = savedState.find(s => s.name === cat.name);
                    if (savedCat) cat.expanded = savedCat.expanded;
                });
            }
        } catch (error) {
            console.error('加载展开状态失败:', error);
        }
    }

    saveExpandedState() {
        try {
            const stateToSave = this.categories.map(cat => ({
                name: cat.name,
                expanded: cat.expanded
            }));
            Storage.set('sidebar_categories_state', stateToSave);
        } catch (error) {
            console.error('保存展开状态失败:', error);
        }
    }

    render() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) return;
            
            const categoriesContainer = sidebar.querySelector('.sidebar-categories');
            if (categoriesContainer) {
                categoriesContainer.innerHTML = this.categories.map(category => `
                    <div class="category-group ${category.expanded ? 'expanded' : ''}" data-category="${Utils.escapeHtml(category.name)}">
                        <div class="category-group-header">
                            <div class="category-group-name">
                                <div class="category-group-icon">
                                    <i class="${category.icon}"></i>
                                </div>
                                <span>${Utils.escapeHtml(category.name)}</span>
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
                                    <div class="category-label">${Utils.escapeHtml(item.label)}</div>
                                    ${item.badge ? `<div class="category-badge">${Utils.escapeHtml(item.badge)}</div>` : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('渲染侧边栏内容失败:', error);
        }
    }

    bindEvents() {
        try {
            document.addEventListener('click', (e) => {
                try {
                    const categoryHeader = e.target.closest('.category-group-header');
                    const categoryItem = e.target.closest('.category-item');
                    const footerBtn = e.target.closest('.footer-btn');
                    const avatar = e.target.closest('.sidebar-wallpaper-avatar');
                    
                    if (categoryHeader) {
                        this.toggleCategory(categoryHeader.closest('.category-group'));
                    } else if (categoryItem) {
                        this.handleCategoryItemClick(categoryItem);
                    } else if (footerBtn) {
                        this.handleFooterClick(footerBtn);
                    } else if (avatar) {
                        this.openProfileModal();
                    }
                } catch (error) {
                    console.error('处理侧边栏点击事件失败:', error);
                }
            });
            
            document.addEventListener('click', (e) => {
                try {
                    const sidebar = document.getElementById('sidebar');
                    const menuBtn = document.getElementById('menuBtn');
                    
                    if (sidebar && sidebar.classList.contains('active') && 
                        !sidebar.contains(e.target) && 
                        !menuBtn?.contains(e.target)) {
                        this.hide();
                    }
                } catch (error) {
                    console.error('处理外部点击事件失败:', error);
                }
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible()) {
                    this.hide();
                }
            });
        } catch (error) {
            console.error('绑定侧边栏事件失败:', error);
        }
    }

    toggleCategory(categoryGroup) {
        if (!categoryGroup) return;
        try {
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
        } catch (error) {
            console.error('切换分类展开状态失败:', error);
        }
    }

    handleCategoryItemClick(categoryItem) {
        try {
            const action = categoryItem.dataset.action;
            const link = categoryItem.dataset.link;
            
            if (link) {
                window.open(link, '_blank');
                this.hide();
                return;
            }
            
            switch(action) {
                case 'search':
                    if (window.searchModule) window.searchModule.showModal();
                    break;
                case 'music':
                    if (window.app?.components?.navbar) window.app.components.navbar.toggleMusicPlayer();
                    break;
                case 'weather':
                    if (window.app?.modules?.weather) window.app.modules.weather.showModal();
                    break;
                case 'calculator':
                    this.openCalculator();
                    break;
            }
            
            this.hide();
        } catch (error) {
            console.error('处理分类项点击失败:', error);
        }
    }

    handleFooterClick(footerBtn) {
        try {
            const icon = footerBtn.querySelector('i');
            if (!icon) return;
            const iconClass = icon.className;
            
            if (iconClass.includes('fa-pen')) {
                if (window.app && typeof window.app.showNotebookModal === 'function') {
                    window.app.showNotebookModal();
                } else {
                    const modal = document.getElementById('notebookModal');
                    if (modal) {
                        modal.style.display = 'flex';
                        modal.classList.add('active');
                        if (window.app && typeof window.app.loadNotebookData === 'function') {
                            window.app.loadNotebookData();
                        }
                    }
                }
                this.hide();
                return;
            }
            
            if (iconClass.includes('fa-gift')) {
                window.open('./pages/tools/羊毛福利.html', '_blank');
                this.hide();
                return;
            }
            
            if (iconClass.includes('fa-info-circle')) {
                if (window.aboutModule) window.aboutModule.show();
                this.hide();
                return;
            }
            
            if (iconClass.includes('fa-qq')) {
                window.open('https://qm.qq.com/q/HxcjhEclyM', '_blank');
                this.hide();
                return;
            }
        } catch (error) {
            console.error('处理底部按钮点击失败:', error);
        }
    }

    openCalculator() {
        window.toast.show('计算器功能开发中', 'info');
    }

    show() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                this.closeAllModals();
                this.calcSidebarPosition();
                sidebar.classList.add('active');
                document.body.classList.add('sidebar-open');
                if (window.innerWidth < 768) {
                    this.disableBodyScroll();
                }
                // 每次打开侧边栏时，可刷新壁纸（但每日一次即可，不重复请求）
                if (this.cachedWallpaperDate !== new Date().toISOString().slice(0, 10)) {
                    this.loadBingWallpaper();
                }
                
                const sidebarContent = sidebar.querySelector('.sidebar-content');
                const categoriesContainer = sidebar.querySelector('.categories-container');
                
                if (sidebarContent) {
                    sidebarContent.style.overflowY = 'auto';
                    sidebarContent.style.overflowX = 'hidden';
                }
                if (categoriesContainer) {
                    categoriesContainer.style.overflowY = 'auto';
                    categoriesContainer.style.overflowX = 'hidden';
                }
                
                setTimeout(() => this.adjustWallpaperSize(), 100);
            }
        } catch (error) {
            console.error('显示侧边栏失败:', error);
        }
    }

    hide() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-open');
                if (window.innerWidth < 768) {
                    this.enableBodyScroll();
                }
                
                const sidebarContent = sidebar.querySelector('.sidebar-content');
                const categoriesContainer = sidebar.querySelector('.categories-container');
                
                if (sidebarContent) {
                    sidebarContent.style.overflowY = '';
                    sidebarContent.style.overflowX = '';
                }
                if (categoriesContainer) {
                    categoriesContainer.style.overflowY = '';
                    categoriesContainer.style.overflowX = '';
                }
            }
        } catch (error) {
            console.error('隐藏侧边栏失败:', error);
        }
    }

    toggle() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.contains('active') ? this.hide() : this.show();
            }
        } catch (error) {
            console.error('切换侧边栏失败:', error);
        }
    }

    isVisible() {
        const sidebar = document.getElementById('sidebar');
        return sidebar ? sidebar.classList.contains('active') : false;
    }

    closeAllModals() {
        try {
            if (window.searchModule && window.searchModule.isModalOpen()) window.searchModule.hide();
            if (window.app?.components?.navbar) window.app.components.navbar.hideMusicPlayer();
            if (window.announcementModule) window.announcementModule.hide();
            if (window.app?.modules?.weather) window.app.modules.weather.hide();
            if (window.aboutModule) window.aboutModule.hide();
        } catch (error) {
            console.error('关闭所有模态框失败:', error);
        }
    }

    async loadWallpaperUserInfo() {
        try {
            const userConfig = Storage.get('userConfig') || {};
            
            const wallpaperAvatar = document.getElementById('sidebarWallpaperAvatar');
            const wallpaperNickname = document.getElementById('sidebarWallpaperNickname');
            const wallpaperSignature = document.getElementById('sidebarWallpaperSignature');
            
            if (wallpaperNickname) wallpaperNickname.textContent = userConfig.nickname || '访客用户';
            if (wallpaperSignature) wallpaperSignature.textContent = userConfig.signature || '探索无限可能';
            
            if (wallpaperAvatar) {
                if (userConfig.avatar && userConfig.avatar !== '') {
                    wallpaperAvatar.setAttribute('data-src', userConfig.avatar);
                    wallpaperAvatar.classList.add('lazy-avatar');
                    this.observeLazyAvatar(wallpaperAvatar);
                } else {
                    wallpaperAvatar.src = this.defaultAvatar;
                }
            }
        } catch (error) {
            console.error('加载壁纸用户信息失败:', error);
        }
    }

    async loadUserData() {
        try {
            const userConfig = Storage.get('userConfig') || {};
            if (!userConfig.nickname) {
                userConfig.nickname = '访客用户';
                userConfig.signature = '探索无限可能';
                Storage.set('userConfig', userConfig);
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
    }

    async loadDailyQuote() {
        try {
            const quoteElement = document.getElementById('dailyQuote');
            if (!quoteElement) return;
            
            const quote = await this.getDailyQuote();
            let cleanedQuote = quote.replace(/^["'「」"”'']|["'「」""”'']$/g, '').trim();
            if (!cleanedQuote) cleanedQuote = '每一天都是新的开始，充满无限可能。';
            
            quoteElement.textContent = cleanedQuote;
        } catch (error) {
            console.error('加载每日一言失败:', error);
            const quoteElement = document.getElementById('dailyQuote');
            if (quoteElement) quoteElement.textContent = '每一天都是新的开始，充满无限可能。';
        }
    }

    async getDailyQuote() {
        try {
            const response = await Utils.safeFetch('https://api.kuleu.com/api/yiyan', { timeout: 5000 });
            const text = await response.text();
            return text || '每一天都是新的开始，充满无限可能。';
        } catch (error) {
            Utils.handleApiError(error, '获取每日一言失败', false);
            return '每一天都是新的开始，充满无限可能。';
        }
    }

    destroy() {
        try {
            this.isInitialized = false;
        } catch (error) {
            console.error('销毁侧边栏失败:', error);
        }
    }
}

// 单例初始化
if (!window.sidebarInitialized) {
    window.sidebarInitialized = true;
    
    const initSidebar = async () => {
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        if (!window.sidebar) {
            window.CompactSidebar = CompactSidebar;
            window.sidebar = new CompactSidebar();
            await window.sidebar.init();
        }
    };
    
    initSidebar().catch(error => {
        console.error('侧边栏初始化失败:', error);
    });
}

window.getSidebar = function() {
    return window.sidebar;
};