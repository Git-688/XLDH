/**
 * 侧边栏组件 - 简化版本
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
                    { icon: 'fas fa-gift', label: '抽奖转盘', badge: null, action: 'link', link: './pages/chl/抽奖转盘.html' },
                    { icon: 'fas fa-clipboard-list', label: '记分牌', badge: null, action: 'link', link: './pages/chl/记分牌.html' },
                    { icon: 'fas fa-clock', label: '时间屏幕', badge: null, action: 'link', link: './pages/chl/时间屏幕.html' }
                ]
            },
            {
                name: '其他',
                icon: 'fas fa-ellipsis-h',
                expanded: false,
                items: [
                    { icon: 'fas fa-solid fa-chart-pie fa-baidu-stat', label: '百度统计', badge: null, action: 'link', link: 'https://tongji.baidu.com/main/homepage/10000302679/homepage/index' },
                    { icon: 'fas fa-user-circle', label: '头像', badge: null, action: 'link', link: './pages/chl/头像链接.html' },
                    { icon: 'fas fa-image', label: '壁纸', badge: null, action: 'link', link: './pages/chl/壁纸链接.html' },
                    { icon: 'fas fa-star', label: '星空', badge: null, action: 'link', link: './pages/chl/星空.html' },
                    { icon: 'fas fa-gamepad', label: '游戏', badge: null, action: 'link', link: './pages/chl/游戏.html' }
                ]
            }
        ];
        
        this.isInitialized = false;
        this.currentVideo = null;
    }

    /**
     * 初始化侧边栏
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // 等待DOM完全加载
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            this.loadExpandedState();
            this.render();
            this.bindEvents();
            await this.loadUserData();
            await this.loadDailyQuote();
            await this.loadWallpaperUserInfo();
            this.adjustSidebarHeight();
            this.createProfileModal();
            
            this.isInitialized = true;
            
            // 确保全局实例可用
            window.sidebar = this;
            window.CompactSidebar = CompactSidebar;
            
        } catch (error) {
            console.error('侧滑栏初始化失败:', error);
            this.showToast('侧滑栏初始化失败', 'error');
        }
    }

    /**
     * 创建个人资料模态框
     */
    createProfileModal() {
        if (document.getElementById('profileModal')) {
            return;
        }

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
                                    <img id="qqAvatarPreview" src="" alt="QQ头像预览">
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

    /**
     * 绑定个人资料模态框事件
     */
    bindProfileModalEvents() {
        try {
            const profileModal = document.getElementById('profileModal');
            const profileModalClose = document.getElementById('profileModalClose');
            const profileCancelBtn = document.getElementById('profileCancelBtn');
            const profileForm = document.getElementById('profileForm');
            const qqNumberInput = document.getElementById('qqNumber');

            if (!profileModal || !profileForm || !qqNumberInput) {
                return;
            }

            const closeModal = () => {
                profileModal.classList.remove('active');
            };

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

            qqNumberInput.addEventListener('input', () => {
                this.autoGetQQAvatar();
            });

            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfileSettings();
            });
        } catch (error) {
            console.error('绑定个人资料模态框事件失败:', error);
        }
    }

    /**
     * 自动获取QQ头像
     */
    async autoGetQQAvatar() {
        try {
            const qqNumberInput = document.getElementById('qqNumber');
            const qqAvatarPreview = document.getElementById('qqAvatarPreview');
            const qqAvatarStatus = document.getElementById('qqAvatarStatus');

            if (!qqNumberInput || !qqAvatarPreview || !qqAvatarStatus) {
                return;
            }

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
                qqAvatarStatus.textContent = '头像获取成功';
                qqAvatarStatus.className = 'qq-avatar-status success';
                
                const userConfig = Storage.get('userConfig') || {};
                userConfig.avatar = avatarUrl;
                Storage.set('userConfig', userConfig);
                
                const sidebarAvatar = document.getElementById('sidebarWallpaperAvatar');
                if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
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

    /**
     * 获取QQ头像
     */
    async getQQAvatar(qqNumber) {
        try {
            const response = await fetch(`https://api.kuleu.com/api/qqimg?qq=${qqNumber}`);
            if (!response.ok) throw new Error('获取QQ头像失败');
            return response.url;
        } catch (error) {
            console.error('获取QQ头像失败:', error);
            return null;
        }
    }

    /**
     * 获取默认头像SVG
     */
    getDefaultAvatarSVG() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
    }

    /**
     * 保存个人资料设置
     */
    saveProfileSettings() {
        try {
            const nicknameInput = document.getElementById('nickname');
            const signatureInput = document.getElementById('signature');
            const qqAvatarPreview = document.getElementById('qqAvatarPreview');

            if (!nicknameInput || !signatureInput || !qqAvatarPreview) {
                this.showToast('保存失败，表单元素未找到', 'error');
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

            const profileModal = document.getElementById('profileModal');
            if (profileModal) profileModal.classList.remove('active');

            this.showToast('个人信息保存成功', 'success');
            
        } catch (error) {
            console.error('保存个人资料设置失败:', error);
            this.showToast('保存失败，请重试', 'error');
        }
    }

    /**
     * 打开个人资料模态框
     */
    openProfileModal() {
        try {
            const profileModal = document.getElementById('profileModal');
            const userConfig = Storage.get('userConfig') || {};

            if (!profileModal) {
                return;
            }

            const nicknameInput = document.getElementById('nickname');
            const signatureInput = document.getElementById('signature');
            const qqNumberInput = document.getElementById('qqNumber');
            const qqAvatarPreview = document.getElementById('qqAvatarPreview');

            if (nicknameInput) nicknameInput.value = userConfig.nickname || '';
            if (signatureInput) signatureInput.value = userConfig.signature || '';
            if (qqNumberInput) qqNumberInput.value = '';
            if (qqAvatarPreview) {
                qqAvatarPreview.src = userConfig.avatar || this.getDefaultAvatarSVG();
            }

            profileModal.classList.add('active');
        } catch (error) {
            console.error('打开个人资料模态框失败:', error);
            this.showToast('打开设置失败', 'error');
        }
    }

    /**
     * 调整侧边栏高度
     */
    adjustSidebarHeight() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) return;

            const updateHeight = () => {
                const viewportHeight = window.innerHeight;
                const navbarHeight = 60;
                const availableHeight = viewportHeight - navbarHeight;
                sidebar.style.height = `${availableHeight}px`;
            };

            updateHeight();
            
            window.addEventListener('resize', updateHeight);
        } catch (error) {
            console.error('调整侧边栏高度失败:', error);
        }
    }

    /**
     * 加载展开状态
     */
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

    /**
     * 保存展开状态
     */
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

    /**
     * 渲染侧边栏内容
     */
    render() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) {
                return;
            }

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

    /**
     * 绑定事件
     */
    bindEvents() {
        try {
            // 分类切换事件
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

            // 点击外部关闭侧边栏
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

            // ESC键关闭侧边栏
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible()) {
                    this.hide();
                }
            });

        } catch (error) {
            console.error('绑定侧边栏事件失败:', error);
        }
    }

    /**
     * 切换分类展开状态
     */
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
                    if (category.expanded) {
                        itemsContainer.style.maxHeight = itemsContainer.scrollHeight + 'px';
                    } else {
                        itemsContainer.style.maxHeight = '0';
                    }
                }
                
                this.saveExpandedState();
            }
        } catch (error) {
            console.error('切换分类展开状态失败:', error);
        }
    }

    /**
     * 处理分类项点击 - 修改支持链接跳转
     */
    handleCategoryItemClick(categoryItem) {
        try {
            const action = categoryItem.dataset.action;
            const link = categoryItem.dataset.link;
            
            if (link) {
                // 如果是链接，则跳转到指定页面
                window.open(link, '_blank');
                this.hide();
                return;
            }
            
            // 原有的action处理逻辑
            switch(action) {
                case 'search':
                    if (window.searchModule) {
                        window.searchModule.showModal();
                    }
                    break;
                case 'music':
                    if (window.app?.components?.navbar) {
                        window.app.components.navbar.toggleMusicPlayer();
                    }
                    break;
                case 'weather':
                    if (window.app?.modules?.weather) {
                        window.app.modules.weather.showModal();
                    }
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

    /**
     * 处理底部按钮点击
     */
    handleFooterClick(footerBtn) {
        try {
            const icon = footerBtn.querySelector('i');
            if (!icon) return;

            const iconClass = icon.className;
            
            if (iconClass.includes('fa-comment')) {
                window.open('https://support.qq.com/products/760416', '_blank');
            } else if (iconClass.includes('fa-paper-plane')) {
                window.open('https://f.wps.cn/g/TI3Gxbe1/', '_blank');
            } else if (iconClass.includes('fa-info-circle')) {
                if (window.aboutModule) {
                    window.aboutModule.show();
                }
            } else if (iconClass.includes('fa-qq')) {
                window.open('https://qm.qq.com/q/HxcjhEclyM', '_blank');
            }
            
            this.hide();
        } catch (error) {
            console.error('处理底部按钮点击失败:', error);
        }
    }

    /**
     * 打开计算器
     */
    openCalculator() {
        this.showToast('计算器功能开发中');
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        try {
            if (window.app?.showToast) {
                window.app.showToast(message, type);
            } else {
                const toast = document.createElement('div');
                toast.className = `toast toast-${type}`;
                toast.textContent = message;
                toast.style.cssText = `
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    padding: 12px 16px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    border-left: 4px solid var(--primary-color);
                    font-size: 13px;
                `;
                document.body.appendChild(toast);
                
                setTimeout(() => toast.remove(), 3000);
            }
        } catch (error) {
            console.error('显示提示消息失败:', error);
        }
    }

    /**
     * 显示侧边栏
     */
    show() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                this.closeAllModals();
                
                sidebar.classList.add('active');
                this.loadSidebarWallpaper();
                
                // 设置侧滑栏内容滚动
                const sidebarContent = sidebar.querySelector('.sidebar-content');
                const categoriesContainer = sidebar.querySelector('.categories-container');
                
                if (sidebarContent) {
                    sidebarContent.style.overflowY = 'auto';
                    sidebarContent.style.overflowX = 'hidden';
                    sidebarContent.style.height = 'calc(100% - 60px)';
                }
                
                if (categoriesContainer) {
                    categoriesContainer.style.overflowY = 'auto';
                    categoriesContainer.style.overflowX = 'hidden';
                }
                
                // 添加侧滑栏打开时的类名
                document.body.classList.add('sidebar-open');
                
                setTimeout(() => {
                    this.adjustSidebarHeight();
                }, 100);
            }
        } catch (error) {
            console.error('显示侧边栏失败:', error);
        }
    }

    /**
     * 隐藏侧边栏
     */
    hide() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
                
                // 重置侧滑栏内容滚动
                const sidebarContent = sidebar.querySelector('.sidebar-content');
                const categoriesContainer = sidebar.querySelector('.categories-container');
                
                if (sidebarContent) {
                    sidebarContent.style.overflowY = '';
                    sidebarContent.style.overflowX = '';
                    sidebarContent.style.height = '';
                }
                
                if (categoriesContainer) {
                    categoriesContainer.style.overflowY = '';
                    categoriesContainer.style.overflowX = '';
                }
                
                // 移除侧滑栏打开时的类名
                document.body.classList.remove('sidebar-open');
            }
            
            // 暂停视频播放
            if (this.currentVideo) {
                this.currentVideo.pause();
            }
        } catch (error) {
            console.error('隐藏侧边栏失败:', error);
        }
    }

    /**
     * 切换侧边栏显示状态
     */
    toggle() {
        try {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                if (sidebar.classList.contains('active')) {
                    this.hide();
                } else {
                    this.show();
                }
            }
        } catch (error) {
            console.error('切换侧边栏失败:', error);
        }
    }

    /**
     * 检查侧边栏是否可见
     */
    isVisible() {
        const sidebar = document.getElementById('sidebar');
        return sidebar ? sidebar.classList.contains('active') : false;
    }

    /**
     * 关闭所有模态框
     */
    closeAllModals() {
        try {
            if (window.searchModule && window.searchModule.isModalOpen()) {
                window.searchModule.hide();
            }
            
            if (window.app && window.app.components && window.app.components.navbar) {
                window.app.components.navbar.hideMusicPlayer();
            }
            
            if (window.announcementModule) {
                window.announcementModule.hide();
            }
            
            if (window.app && window.app.modules && window.app.modules.weather) {
                window.app.modules.weather.hide();
            }
            
            if (window.aboutModule) {
                window.aboutModule.hide();
            }
        } catch (error) {
            console.error('关闭所有模态框失败:', error);
        }
    }

    /**
     * 加载壁纸用户信息
     */
    async loadWallpaperUserInfo() {
        try {
            const userConfig = Storage.get('userConfig') || {};
            
            const wallpaperAvatar = document.getElementById('sidebarWallpaperAvatar');
            const wallpaperNickname = document.getElementById('sidebarWallpaperNickname');
            const wallpaperSignature = document.getElementById('sidebarWallpaperSignature');
            
            if (wallpaperNickname) {
                wallpaperNickname.textContent = userConfig.nickname || '访客用户';
            }
            
            if (wallpaperAvatar) {
                if (userConfig.avatar) {
                    wallpaperAvatar.src = userConfig.avatar;
                    wallpaperAvatar.style.display = 'block';
                } else {
                    await this.loadRandomAvatar();
                }
            }
            
            if (wallpaperSignature) {
                wallpaperSignature.textContent = userConfig.signature || '探索无限可能';
            }
            
            await this.loadSidebarWallpaper();
            
        } catch (error) {
            console.error('加载壁纸用户信息失败:', error);
        }
    }

    /**
     * 加载侧边栏壁纸
     */
    async loadSidebarWallpaper() {
        try {
            const dayOfWeek = new Date().getDay();
            const mediaInfo = this.getLocalWallpaper(dayOfWeek);
            const sidebarWallpaper = document.getElementById('sidebarWallpaper');
            
            if (sidebarWallpaper && mediaInfo) {
                if (mediaInfo.type === 'video') {
                    await this.setVideoWallpaper(mediaInfo.url);
                } else {
                    this.setFallbackBackground();
                }
            } else {
                this.setFallbackBackground();
            }
        } catch (error) {
            console.error('加载侧边栏壁纸失败:', error);
            this.setFallbackBackground();
        }
    }

    /**
     * 获取本地壁纸
     */
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

    /**
     * 设置视频壁纸
     */
    async setVideoWallpaper(videoUrl) {
        const sidebarWallpaper = document.getElementById('sidebarWallpaper');
        if (!sidebarWallpaper) return;
        
        // 清除现有背景
        sidebarWallpaper.style.backgroundImage = 'none';
        sidebarWallpaper.style.background = 'transparent';
        
        // 移除现有的视频元素
        const existingVideo = sidebarWallpaper.querySelector('video');
        if (existingVideo) {
            existingVideo.remove();
            this.currentVideo = null;
        }
        
        try {
            // 创建新的视频元素
            const video = document.createElement('video');
            video.src = videoUrl;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.preload = "auto";
            
            // 视频样式
            video.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 0;
            `;
            
            // 设置视频属性
            video.setAttribute('autoplay', 'true');
            video.setAttribute('muted', 'true');
            video.setAttribute('loop', 'true');
            video.setAttribute('playsinline', 'true');
            video.setAttribute('preload', 'auto');
            
            // 添加到壁纸容器
            sidebarWallpaper.appendChild(video);
            this.currentVideo = video;
            
            // 设置覆盖层和用户信息的层级
            const overlay = sidebarWallpaper.querySelector('.sidebar-wallpaper-overlay');
            if (overlay) {
                overlay.style.zIndex = '1';
            }
            
            const userInfo = sidebarWallpaper.querySelector('.sidebar-wallpaper-user-info');
            if (userInfo) {
                userInfo.style.zIndex = '2';
            }
            
            // 尝试播放视频
            try {
                await video.play();
            } catch (error) {
                // 静默失败
            }
            
        } catch (error) {
            console.error('设置视频壁纸失败:', error);
            this.setFallbackBackground();
        }
    }

    /**
     * 设置备用背景
     */
    setFallbackBackground() {
        const sidebarWallpaper = document.getElementById('sidebarWallpaper');
        if (sidebarWallpaper) {
            // 移除视频元素
            const existingVideo = sidebarWallpaper.querySelector('video');
            if (existingVideo) {
                existingVideo.remove();
                this.currentVideo = null;
            }
            
            // 设置渐变背景
            sidebarWallpaper.style.backgroundImage = 'none';
            sidebarWallpaper.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    /**
     * 加载随机头像
     */
    async loadRandomAvatar() {
        try {
            const avatarUrl = await this.getAvatar();
            if (avatarUrl) {
                const wallpaperAvatar = document.getElementById('sidebarWallpaperAvatar');
                if (wallpaperAvatar) {
                    wallpaperAvatar.src = avatarUrl;
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

    /**
     * 获取头像
     */
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

    /**
     * 设置默认头像
     */
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

    /**
     * 加载用户数据
     */
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

    /**
     * 加载每日一言
     */
    async loadDailyQuote() {
        try {
            const quoteElement = document.getElementById('dailyQuote');
            if (!quoteElement) {
                return;
            }

            const quote = await this.getDailyQuote();
            let cleanedQuote = quote.replace(/^["'「」"”‘’]|["'「」""”‘’]$/g, '').trim();
            if (!cleanedQuote) cleanedQuote = '每一天都是新的开始，充满无限可能。';
            
            quoteElement.textContent = cleanedQuote;
        } catch (error) {
            console.error('加载每日一言失败:', error);
            const quoteElement = document.getElementById('dailyQuote');
            if (quoteElement) {
                quoteElement.textContent = '每一天都是新的开始，充满无限可能。';
            }
        }
    }

    /**
     * 获取每日一言 - 使用纯文本API
     */
    async getDailyQuote() {
        try {
            const response = await fetch('https://api.kuleu.com/api/yiyan');
            if (!response.ok) return '每一天都是新的开始，充满无限可能。';
            
            // 直接获取纯文本响应
            const text = await response.text();
            return text || '每一天都是新的开始，充满无限可能。';
        } catch (error) {
            console.error('获取每日一言失败:', error);
            return '每一天都是新的开始，充满无限可能。';
        }
    }

    /**
     * 销毁侧边栏
     */
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

// 初始化侧边栏
if (!window.sidebarInitialized) {
    window.sidebarInitialized = true;
    
    const initSidebar = async () => {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
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

// 获取侧边栏实例的全局函数
window.getSidebar = function() {
    return window.sidebar;
};