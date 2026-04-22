/**
 * 侧边栏组件 - 动态计算悬浮毛玻璃版
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
    }

    // 核心：动态计算侧边栏位置（自动适配导航栏+底部工具栏）
    computeSidebarPosition() {
        const sidebar = document.getElementById('sidebar');
        const navbar = document.getElementById('navbar');
        if (!sidebar || !navbar) return;

        const navbarHeight = navbar.offsetHeight;
        const gap = parseInt(getComputedStyle(sidebar).getPropertyValue('--sidebar-gap') || 30);
        const bottomSafe = parseInt(getComputedStyle(document.documentElement).getPropertyValue('safe-area-inset-bottom') || 0);
        
        const top = navbarHeight + gap;
        const bottom = gap + bottomSafe;
        const maxHeight = `calc(100vh - ${top}px - ${bottom}px)`;

        sidebar.style.setProperty('--sidebar-top', `${top}px`);
        sidebar.style.setProperty('--sidebar-bottom', `${bottom}px`);
        sidebar.style.setProperty('--sidebar-max-height', maxHeight);
    }

    async init() {
        if (this.isInitialized) return;
        try {
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
            this.createProfileModal();

            // 初始化动态计算 + 监听窗口变化
            this.computeSidebarPosition();
            window.addEventListener('resize', () => this.computeSidebarPosition());
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.computeSidebarPosition(), 100);
            });

            this.isInitialized = true;
            window.sidebar = this;
        } catch (error) {
            console.error('侧滑栏初始化失败:', error);
            window.toast.show('侧滑栏初始化失败', 'error');
        }
    }

    createProfileModal() {
        if (document.getElementById('profileModal')) return;
        const modalHTML = `
        <div class="profile-modal" id="profileModal">
            <div class="profile-modal-content">
                <form class="profile-form" id="profileForm">
                    <div class="qq-avatar-section">
                        <div class="qq-avatar-preview">
                            <img id="qqAvatarPreview" src="" alt="QQ头像预览" loading="lazy" decoding="async">
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
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.bindProfileModalEvents();
    }

    bindProfileModalEvents() {
        const modal = document.getElementById('profileModal');
        const closeBtn = document.getElementById('profileCancelBtn');
        const form = document.getElementById('profileForm');
        const qqInput = document.getElementById('qqNumber');

        const close = () => modal.classList.remove('active');
        closeBtn?.addEventListener('click', close);
        modal?.addEventListener('click', e => e.target === modal && close());
        document.addEventListener('keydown', e => e.key === 'Escape' && modal.classList.contains('active') && close());
        qqInput?.addEventListener('input', () => this.autoGetQQAvatar());
        form?.addEventListener('submit', e => { e.preventDefault(); this.saveProfileSettings(); });
    }

    async autoGetQQAvatar() {
        const qq = document.getElementById('qqNumber')?.value.trim();
        const preview = document.getElementById('qqAvatarPreview');
        const status = document.getElementById('qqAvatarStatus');
        if (!qq || !preview || !status) return;

        if (!/^[1-9][0-9]{4,11}$/.test(qq)) {
            status.textContent = 'QQ格式错误'; status.className = 'qq-avatar-status error';
            return;
        }
        status.textContent = '获取中...'; status.className = 'qq-avatar-status loading';

        const url = await API.getQQAvatar(qq);
        if (url) {
            preview.src = url;
            status.textContent = '获取成功'; status.className = 'qq-avatar-status success';
            Storage.set('userConfig', { ...Storage.get('userConfig'), avatar: url });
        } else {
            status.textContent = '获取失败'; status.className = 'qq-avatar-status error';
        }
    }

    saveProfileSettings() {
        const user = {
            nickname: document.getElementById('nickname')?.value.trim() || '访客用户',
            signature: document.getElementById('signature')?.value.trim() || '探索无限可能',
            avatar: document.getElementById('qqAvatarPreview')?.src || this.getDefaultAvatarSVG()
        };
        Storage.set('userConfig', user);
        this.loadWallpaperUserInfo();
        document.getElementById('profileModal').classList.remove('active');
        window.toast.show('保存成功', 'success');
    }

    openProfileModal() {
        const modal = document.getElementById('profileModal');
        const user = Storage.get('userConfig') || {};
        document.getElementById('nickname').value = user.nickname || '';
        document.getElementById('signature').value = user.signature || '';
        document.getElementById('qqAvatarPreview').src = user.avatar || this.getDefaultAvatarSVG();
        document.getElementById('qqNumber').value = '';
        modal.classList.add('active');
    }

    render() {
        const container = document.querySelector('.sidebar-categories');
        if (!container) return;
        container.innerHTML = this.categories.map(cat => `
        <div class="category-group ${cat.expanded ? 'expanded' : ''}" data-category="${cat.name}">
            <div class="category-group-header">
                <div class="category-group-name">
                    <div class="category-group-icon"><i class="${cat.icon}"></i></div>
                    <span>${cat.name}</span>
                </div>
                <button class="category-toggle"><i class="fas fa-chevron-down"></i></button>
            </div>
            <div class="category-items" style="max-height: ${cat.expanded ? '500px' : '0'}">
                ${cat.items.map(item => `
                <button class="category-item" data-link="${item.link}">
                    <div class="category-icon"><i class="${item.icon}"></i></div>
                    <div class="category-label">${item.label}</div>
                    ${item.badge ? `<div class="category-badge">${item.badge}</div>` : ''}
                </button>`).join('')}
            </div>
        </div>`).join('');
    }

    bindEvents() {
        document.addEventListener('click', e => {
            const header = e.target.closest('.category-group-header');
            const item = e.target.closest('.category-item');
            const avatar = e.target.closest('.sidebar-wallpaper-avatar');

            if (header) {
                const group = header.closest('.category-group');
                const name = group.dataset.category;
                const cat = this.categories.find(c => c.name === name);
                if (cat) {
                    cat.expanded = !cat.expanded;
                    group.classList.toggle('expanded', cat.expanded);
                    group.querySelector('.category-items').style.maxHeight = cat.expanded ? '500px' : '0';
                    Storage.set('sidebar_categories_state', this.categories.map(c => ({name:c.name, expanded:c.expanded})));
                }
            }
            if (item) {
                const link = item.dataset.link;
                link && window.open(link, '_blank');
                this.hide();
            }
            if (avatar) this.openProfileModal();
        });
    }

    show() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        this.closeAllModals();
        this.computeSidebarPosition();
        sidebar.classList.add('active');
        this.loadSidebarWallpaper();
        document.body.classList.add('sidebar-open');
    }

    hide() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        this.currentVideo?.pause();
    }

    toggle() {
        this.isVisible() ? this.hide() : this.show();
    }

    isVisible() {
        return document.getElementById('sidebar')?.classList.contains('active') || false;
    }

    closeAllModals() {
        window.searchModule?.hide();
        window.announcementModule?.hide();
        window.app?.modules.weather?.hide();
        window.aboutModule?.hide();
    }

    async loadSidebarWallpaper() {
        const wallpaper = document.getElementById('sidebarWallpaper');
        if (!wallpaper) return;
        const video = document.createElement('video');
        video.src = `./assets/wallpapers/${['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]}.mp4`;
        video.autoplay = true; video.muted = true; video.loop = true; video.playsInline = true;
        video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0';
        wallpaper.innerHTML = `<div class="sidebar-wallpaper-overlay"></div>`;
        wallpaper.appendChild(video);
        this.currentVideo = video;
    }

    async loadWallpaperUserInfo() {
        const user = Storage.get('userConfig') || { nickname:'访客用户', signature:'探索无限可能', avatar:this.getDefaultAvatarSVG() };
        document.getElementById('sidebarWallpaperNickname').textContent = user.nickname;
        document.getElementById('sidebarWallpaperSignature').textContent = user.signature;
        const avatar = document.getElementById('sidebarWallpaperAvatar');
        if (avatar) { avatar.innerHTML = `<img src="${user.avatar}" loading="lazy" decoding="async" alt="avatar">`; }
    }

    async loadDailyQuote() {
        const quote = await API.getDailyQuote();
        document.getElementById('dailyQuote').textContent = quote.replace(/^["'「」]|["'」]$/g, '');
    }

    loadExpandedState() {
        const state = Storage.get('sidebar_categories_state');
        if (state) state.forEach(s => {
            const cat = this.categories.find(c => c.name === s.name);
            if (cat) cat.expanded = s.expanded;
        });
    }

    getDefaultAvatarSVG() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
    }

    destroy() {
        this.currentVideo?.pause();
        this.isInitialized = false;
    }
}

// 自动初始化
if (!window.sidebarInitialized) {
    window.sidebarInitialized = true;
    document.addEventListener('DOMContentLoaded', () => {
        window.sidebar = new CompactSidebar();
        window.sidebar.init();
    });
}
window.getSidebar = () => window.sidebar;
