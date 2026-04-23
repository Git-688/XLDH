/**
 * 侧边栏组件 - 遮挡修复+上下等距留白最终版
 * 动态计算导航栏高度，上下留白完全相等，底部按钮居中适配
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
        this.currentVideo = null;
        // 留白配置（最小留白，保证不会贴边）
        this.gapConfig = {
            desktop: { min: 24, max: 80 },
            mobile: { min: 16, max: 60 }
        };
        // 侧滑栏最小高度（保证内容完整显示）
        this.minHeightConfig = {
            desktop: 500,
            mobile: 400
        };
    }

    // ========== 核心修复：动态计算上下等距留白，彻底解决导航栏遮挡 ==========
    calcSidebarPosition() {
        const sidebar = document.getElementById('sidebar');
        const navbar = document.getElementById('navbar');
        if (!sidebar || !navbar) return;

        // 1. 获取核心尺寸（动态获取，非写死）
        const navbarHeight = navbar.offsetHeight || 60; // 导航栏实际高度
        const viewportHeight = window.innerHeight; // 浏览器视口总高度
        const isMobile = window.innerWidth < 768;
        
        // 2. 获取当前设备配置
        const gapConfig = isMobile ? this.gapConfig.mobile : this.gapConfig.desktop;
        const minSidebarHeight = isMobile ? this.minHeightConfig.mobile : this.minHeightConfig.desktop;
        
        // 3. 计算侧滑栏可放置的总可用高度（导航栏底部 → 视口底部）
        const availableTotalHeight = viewportHeight - navbarHeight;
        
        // 4. 计算侧滑栏最优高度
        // 最大可用高度 = 总可用高度 - 2倍最小留白（保证上下至少有minGap的距离）
        const maxAvailableSidebarHeight = availableTotalHeight - 2 * gapConfig.min;
        // 侧滑栏最终高度 = 不超过最大可用高度，不低于最小高度
        const sidebarHeight = Math.min(maxAvailableSidebarHeight, Math.max(minSidebarHeight, availableTotalHeight * 0.9));
        
        // 5. 核心：上下等距留白计算（导航栏底部到侧滑栏顶部 = 侧滑栏底部到视口底部）
        const totalGap = availableTotalHeight - sidebarHeight;
        const finalEqualGap = totalGap / 2; // 上下完全相等的留白
        
        // 6. 应用最终样式（彻底避免导航栏遮挡）
        sidebar.style.height = `${sidebarHeight}px`;
        sidebar.style.top = `${navbarHeight + finalEqualGap}px`; // 顶部从导航栏底部+留白开始
        sidebar.style.bottom = `${finalEqualGap}px`; // 底部留白和顶部完全相等
        sidebar.style.left = isMobile ? '16px' : '24px'; // 左侧边距适配

        // 同步调整壁纸尺寸
        this.adjustWallpaperSize();
    }

    // 调整壁纸尺寸，保证和侧滑栏同宽、完整显示
    adjustWallpaperSize() {
        const sidebar = document.getElementById('sidebar');
        const wallpaper = document.getElementById('sidebarWallpaper');
        if (!sidebar || !wallpaper) return;

        const sidebarWidth = sidebar.offsetWidth;
        wallpaper.style.width = `${sidebarWidth}px`;
        wallpaper.style.maxWidth = '100%';

        const mediaEl = wallpaper.querySelector('video, img');
        if (mediaEl) {
            mediaEl.style.width = '100%';
            mediaEl.style.height = '100%';
            mediaEl.style.objectFit = 'contain';
        }
    }

    // 窗口变化防抖处理
    handleResize() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.calcSidebarPosition();
            }, 100);
        }, { passive: true });

        // 屏幕旋转适配
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.calcSidebarPosition();
            }, 200);
        }, { passive: true });
    }

    async init() {
        if (this.isInitialized) return;
        try {
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }

            // 初始化先计算位置
            this.calcSidebarPosition();
            // 绑定窗口变化事件
            this.handleResize();
            // 页面完全加载后再次校准（避免导航栏渲染延迟导致的尺寸错误）
            window.addEventListener('load', () => {
                setTimeout(() => this.calcSidebarPosition(), 200);
            });

            this.loadExpandedState();
            this.render();
            this.bindEvents();
            await this.loadUserData();
            await this.loadDailyQuote();
            await this.loadWallpaperUserInfo();
            this.createProfileModal();
            
            this.isInitialized = true;
            window.sidebar = this;
            window.CompactSidebar = CompactSidebar;
            
        } catch (error) {
            console.error('侧滑栏初始化失败:', error);
            window.toast?.show?.('侧滑栏初始化失败', 'error');
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
                                    <img id="qqAvatarPreview" src="" alt="QQ头像预览" loading="lazy" decoding="async">
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
            profileModalClose?.addEventListener('click', closeModal);
            profileCancelBtn?.addEventListener('click', closeModal);
            profileModal.addEventListener('click', (e) => e.target === profileModal && closeModal());
            document.addEventListener('keydown', (e) => e.key === 'Escape' && profileModal.classList.contains('active') && closeModal());
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
                qqAvatarPreview.src = this.getDefaultAvatarSVG();
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
                qqAvatarPreview.setAttribute('loading', 'lazy');
                qqAvatarPreview.setAttribute('decoding', 'async');
                qqAvatarStatus.textContent = '头像获取成功';
                qqAvatarStatus.className = 'qq-avatar-status success';
                
                const userConfig = Storage.get('userConfig') || {};
                userConfig.avatar = avatarUrl;
                Storage.set('userConfig', userConfig);
                
                const sidebarAvatar = document.getElementById('sidebarWallpaperAvatar');
                if (sidebarAvatar) {
                    sidebarAvatar.src = avatarUrl;
                    sidebarAvatar.setAttribute('loading', 'lazy');
                    sidebarAvatar.setAttribute('decoding', 'async');
                }
            } else {
                qqAvatarStatus.textContent = '获取头像失败';
                qqAvatarStatus.className = 'qq-avatar-status error';
            }
        } catch (error) {
            console.error('自动获取QQ头像失败:', error);
            document.getElementById('qqAvatarStatus')?.textContent && (document.getElementById('qqAvatarStatus').textContent = '获取失败，请重试');
        }
    }

    async getQQAvatar(qqNumber) {
        try {
            const response = await fetch(`https://api.kuleu.com/api/qqimg?qq=${qqNumber}`);
            return response.ok ? response.url : null;
        } catch (error) {
            console.error('获取QQ头像失败:', error);
            return null;
        }
    }

    getDefaultAvatarSVG() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
    }

    saveProfileSettings() {
        try {
            const nicknameInput = document.getElementById('nickname');
            const signatureInput = document.getElementById('signature');
            const qqAvatarPreview = document.getElementById('qqAvatarPreview');
            if (!nicknameInput || !signatureInput || !qqAvatarPreview) {
                window.toast?.show?.('保存失败，表单元素未找到', 'error');
                return;
            }

            const nickname = nicknameInput.value.trim();
            const signature = signatureInput.value.trim();
            const qqAvatar = qqAvatarPreview.src;
            const userConfig = Storage.get('userConfig') || {};
            userConfig.nickname = nickname || userConfig.nickname || '访客用户';
            userConfig.signature = signature || userConfig.signature || '探索无限可能';
            
            if (qqAvatar && !qqAvatar.includes('data:image/svg+xml')) {
                userConfig.avatar = qqAvatar;
            }
            Storage.set('userConfig', userConfig);
            this.loadWallpaperUserInfo();
            document.getElementById('profileModal')?.classList.remove('active');
            window.toast?.show?.('个人信息保存成功', 'success');
            
        } catch (error) {
            console.error('保存个人资料设置失败:', error);
            window.toast?.show?.('保存失败，请重试', 'error');
        }
    }

    openProfileModal() {
        try {
            const profileModal = document.getElementById('profileModal');
            const userConfig = Storage.get('userConfig') || {};
            if (!profileModal) return;

            document.getElementById('nickname').value = userConfig.nickname || '';
            document.getElementById('signature').value = userConfig.signature || '';
            document.getElementById('qqNumber').value = '';
            const avatarPreview = document.getElementById('qqAvatarPreview');
            if (avatarPreview) {
                avatarPreview.src = userConfig.avatar || this.getDefaultAvatarSVG();
                avatarPreview.setAttribute('loading', 'lazy');
            }
            profileModal.classList.add('active');
        } catch (error) {
            console.error('打开个人资料模态框失败:', error);
            window.toast?.show?.('打开设置失败', 'error');
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
                    <div class="category-group ${category.expanded ? 'expanded' : ''}" data-category="${category.name}">
                        <div class="category-group-header">
                            <div class="category-group-name">
                                <div class="category-group-icon">
                                    <i class="${category.icon}"></i>
                                </div>
                                <span>${category.name}</span>
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
                                    <div class="category-label">${item.label}</div>
                                    ${item.badge ? `<div class="category-badge">${item.badge}</div>` : ''}
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
                        !sidebar.contains(e.target) && !menuBtn?.contains(e.target)) {
                        this.hide();
                    }
                } catch (error) {
                    console.error('处理外部点击事件失败:', error);
                }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible()) this.hide();
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
                    itemsContainer.style.maxHeight = category.expanded ? `${itemsContainer.scrollHeight}px` : '0';
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
                    window.searchModule?.showModal?.();
                    break;
                case 'music':
                    window.app?.components?.navbar?.toggleMusicPlayer?.();
                    break;
                case 'weather':
                    window.app?.modules?.weather?.showModal?.();
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
            if (iconClass.includes('fa-book')) {
                window.app?.showDiaryModal?.();
                this.hide();
            } else if (iconClass.includes('fa-gift')) {
                this.hide();
            } else if (iconClass.includes('fa-info-circle')) {
                window.aboutModule?.show?.();
                this.hide();
            } else if (iconClass.includes('fa-qq')) {
                window.open('https://qm.qq.com/q/HxcjhEclyM', '_blank');
                this.hide();
            }
        } catch (error) {
            console.error('处理底部按钮点击失败:', error);
        }
    }

    openCalculator() {
        window.toast?.show?.('计算器功能开发中', 'info');
    }

    show() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                this.closeAllModals();
                // 显示前重新计算位置，确保适配最新窗口尺寸
                this.calcSidebarPosition();
                sidebar.classList.add('active');
                document.body.classList.add('sidebar-open');
                this.loadSidebarWallpaper();
                
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
            if (this.currentVideo) {
                this.currentVideo.pause();
                this.currentVideo = null;
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
            window.searchModule?.isModalOpen?.() && window.searchModule.hide?.();
            window.app?.components?.navbar?.hideMusicPlayer?.();
            window.announcementModule?.hide?.();
            window.app?.modules?.weather?.hide?.();
            window.aboutModule?.hide?.();
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
            if (wallpaperAvatar) {
                if (userConfig.avatar) {
                    wallpaperAvatar.src = userConfig.avatar;
                    wallpaperAvatar.setAttribute('loading', 'lazy');
                    wallpaperAvatar.style.display = 'block';
                } else {
                    await this.loadRandomAvatar();
                }
            }
            if (wallpaperSignature) wallpaperSignature.textContent = userConfig.signature || '探索无限可能';
            await this.loadSidebarWallpaper();
        } catch (error) {
            console.error('加载壁纸用户信息失败:', error);
        }
    }

    async loadSidebarWallpaper() {
        try {
            const dayOfWeek = new Date().getDay();
            const mediaInfo = this.getLocalWallpaper(dayOfWeek);
            const sidebarWallpaper = document.getElementById('sidebarWallpaper');
            if (sidebarWallpaper && mediaInfo) {
                mediaInfo.type === 'video' ? await this.setVideoWallpaper(mediaInfo.url) : this.setFallbackBackground();
            } else {
                this.setFallbackBackground();
            }
        } catch (error) {
            console.error('加载侧边栏壁纸失败:', error);
            this.setFallbackBackground();
        }
    }

    getLocalWallpaper(dayOfWeek) {
        const videoWallpapers = {
            0: { type: 'video', url: './assets/wallpapers/sunday.mp4' },
            1: { type: 'video', url: './assets/wallpapers/monday.mp4' },
            2: { type: 'video', url: './assets/wallpapers/tuesday.mp4' },
            3: { type: 'video', url: './assets/wallpapers/wednesday.mp4' },
            4: { type: 'video', url: './assets/wallpapers/thursday.mp4' },
            5: { type: 'video', url: './assets/wallpapers/friday.mp4' },
            6: { type: 'video', url: './assets/wallpapers/saturday.mp4' }
        };
        return videoWallpapers[dayOfWeek] || { type: 'video', url: './assets/wallpapers/monday.mp4' };
    }

    async setVideoWallpaper(videoUrl) {
        const sidebarWallpaper = document.getElementById('sidebarWallpaper');
        if (!sidebarWallpaper) return;
        sidebarWallpaper.style.backgroundImage = 'none';
        sidebarWallpaper.style.background = 'transparent';
        const existingVideo = sidebarWallpaper.querySelector('video');
        if (existingVideo) {
            existingVideo.remove();
            this.currentVideo = null;
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
            video.onerror = () => {
                console.warn('视频加载失败，使用备用背景');
                this.setFallbackBackground();
            };
            sidebarWallpaper.appendChild(video);
            this.currentVideo = video;
            const overlay = sidebarWallpaper.querySelector('.sidebar-wallpaper-overlay');
            overlay && (overlay.style.zIndex = '1');
            const userInfo = sidebarWallpaper.querySelector('.sidebar-wallpaper-user-info');
            userInfo && (userInfo.style.zIndex = '2');
            video.onloadedmetadata = () => this.adjustWallpaperSize();
            await video.play().catch(() => {
                console.warn('视频自动播放失败，使用备用背景');
                this.setFallbackBackground();
            });
        } catch (error) {
            console.error('设置视频壁纸失败:', error);
            this.setFallbackBackground();
        }
    }

    setFallbackBackground() {
        const sidebarWallpaper = document.getElementById('sidebarWallpaper');
        if (sidebarWallpaper) {
            const existingVideo = sidebarWallpaper.querySelector('video');
            existingVideo && existingVideo.remove() && (this.currentVideo = null);
            sidebarWallpaper.style.backgroundImage = 'none';
            sidebarWallpaper.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    async loadRandomAvatar() {
        try {
            const avatarUrl = await this.getAvatar();
            if (avatarUrl) {
                const wallpaperAvatar = document.getElementById('sidebarWallpaperAvatar');
                if (wallpaperAvatar) {
                    wallpaperAvatar.src = avatarUrl;
                    wallpaperAvatar.setAttribute('loading', 'lazy');
                    wallpaperAvatar.style.display = 'block';
                    const userConfig = Storage.get('userConfig') || {};
                    userConfig.avatar = avatarUrl;
                    Storage.set('userConfig', userConfig);
                }
            } else {
                this.setDefaultAvatar();
            }
        } catch (error) {
            console.error('加载随机头像失败:', error);
            this.setDefaultAvatar();
        }
    }

    async getAvatar() {
        try {
            const randomId = Math.floor(Math.random() * 1000);
            const response = await fetch(`https://api.multiavatar.com/${randomId}.png`);
            return response.ok ? response.url : null;
        } catch (error) {
            console.error('获取头像失败:', error);
            return null;
        }
    }

    setDefaultAvatar() {
        const wallpaperAvatar = document.getElementById('sidebarWallpaperAvatar');
        if (wallpaperAvatar) {
            const defaultAvatar = this.getDefaultAvatarSVG();
            wallpaperAvatar.src = defaultAvatar;
            wallpaperAvatar.style.display = 'block';
            const userConfig = Storage.get('userConfig') || {};
            userConfig.avatar = defaultAvatar;
            Storage.set('userConfig', userConfig);
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
            let cleanedQuote = quote.replace(/^["'「」"”‘’]|["'「」""”‘’]$/g, '').trim();
            quoteElement.textContent = cleanedQuote || '每一天都是新的开始，充满无限可能。';
        } catch (error) {
            console.error('加载每日一言失败:', error);
            document.getElementById('dailyQuote') && (document.getElementById('dailyQuote').textContent = '每一天都是新的开始，充满无限可能。');
        }
    }

    async getDailyQuote() {
        try {
            const response = await fetch('https://api.kuleu.com/api/yiyan');
            return response.ok ? await response.text() : '每一天都是新的开始，充满无限可能。';
        } catch (error) {
            console.error('获取每日一言失败:', error);
            return '每一天都是新的开始，充满无限可能。';
        }
    }

    destroy() {
        try {
            if (this.currentVideo) {
                this.currentVideo.pause();
                this.currentVideo = null;
            }
            this.isInitialized = false;
        } catch (error) {
            console.error('销毁侧边栏失败:', error);
        }
    }
}

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
    initSidebar().catch(error => console.error('侧边栏初始化失败:', error));
}

window.getSidebar = function() {
    return window.sidebar;
};
