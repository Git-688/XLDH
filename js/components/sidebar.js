/**
 * 侧边栏组件 - 动态计算版（悬浮毛玻璃·上下等距留白）
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
        this.sidebarGap = 16;
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
            this.initDynamicCalc();
            await this.loadUserData();
            await this.loadDailyQuote();
            await this.loadWallpaperUserInfo();
            this.createProfileModal();
            this.isInitialized = true;
            window.sidebar = this;
        } catch (error) {
            console.error('侧滑栏初始化失败:', error);
            window.toast.show('侧滑栏初始化失败', 'error');
        }
    }

    initDynamicCalc() {
        this.dynamicCalcSidebar();
        window.addEventListener('resize', () => this.dynamicCalcSidebar());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.dynamicCalcSidebar(), 100);
        });
        const observer = new MutationObserver(() => {
            if (document.querySelector('.sidebar.active')) {
                this.dynamicCalcSidebar();
            }
        });
        observer.observe(document.querySelector('.sidebar'), { attributes: true });
    }

    dynamicCalcSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const navbar = document.querySelector('#navbar');
        const navbarHeight = navbar ? navbar.offsetHeight : 60;
        const safeBottom = window.env?.safeAreaInsets?.bottom || 0;
        const viewHeight = window.innerHeight;
        const top = navbarHeight + this.sidebarGap;
        const bottomSpace = this.sidebarGap + safeBottom;
        const height = viewHeight - navbarHeight - this.sidebarGap - bottomSpace;
        sidebar.style.top = `${top}px`;
        sidebar.style.height = `${height}px`;
        sidebar.style.setProperty('--sidebar-gap', `${this.sidebarGap}px`);
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
        const closeBtn = document.getElementById('profileModalClose');
        const cancelBtn = document.getElementById('profileCancelBtn');
        const form = document.getElementById('profileForm');
        const qqInput = document.getElementById('qqNumber');
        if (!modal || !form) return;
        const close = () => modal.classList.remove('active');
        closeBtn?.addEventListener('click', close);
        cancelBtn?.addEventListener('click', close);
        modal.addEventListener('click', e => e.target === modal && close());
        qqInput?.addEventListener('input', () => this.autoGetQQAvatar());
        form.addEventListener('submit', e => {
            e.preventDefault();
            this.saveProfileSettings();
        });
    }

    async autoGetQQAvatar() {
        const qq = document.getElementById('qqNumber')?.value.trim();
        const preview = document.getElementById('qqAvatarPreview');
        const status = document.getElementById('qqAvatarStatus');
        if (!qq || !preview || !status) return;
        if (!/^[1-9][0-9]{4,11}$/.test(qq)) {
            status.textContent = 'QQ号码格式错误';
            status.className = 'qq-avatar-status error';
            return;
        }
        status.textContent = '获取中...';
        status.className = 'qq-avatar-status loading';
        const url = await API.getQQAvatar(qq);
        if (url) {
            preview.src = url;
            status.textContent = '获取成功';
            status.className = 'qq-avatar-status success';
        } else {
            status.textContent = '获取失败';
            status.className = 'qq-avatar-status error';
        }
    }

    saveProfileSettings() {
        const nick = document.getElementById('nickname')?.value.trim();
        const sign = document.getElementById('signature')?.value.trim();
        const avatar = document.getElementById('qqAvatarPreview')?.src;
        const cfg = Storage.get('userConfig') || {};
        cfg.nickname = nick || '访客用户';
        cfg.signature = sign || '探索无限可能';
        if (avatar && !avatar.includes('data:image')) cfg.avatar = avatar;
        Storage.set('userConfig', cfg);
        this.loadWallpaperUserInfo();
        document.getElementById('profileModal')?.classList.remove('active');
        window.toast.show('保存成功', 'success');
    }

    openProfileModal() {
        const modal = document.getElementById('profileModal');
        const cfg = Storage.get('userConfig') || {};
        if (!modal) return;
        document.getElementById('nickname').value = cfg.nickname || '';
        document.getElementById('signature').value = cfg.signature || '';
        document.getElementById('qqAvatarPreview').src = cfg.avatar || this.getDefaultAvatarSVG();
        modal.classList.add('active');
    }

    loadExpandedState() {
        const saved = Storage.get('sidebar_categories_state');
        if (saved) {
            this.categories.forEach(c => {
                const s = saved.find(x => x.name === c.name);
                if (s) c.expanded = s.expanded;
            });
        }
    }

    saveExpandedState() {
        Storage.set('sidebar_categories_state', this.categories.map(c => ({
            name: c.name,
            expanded: c.expanded
        })));
    }

    render() {
        const el = document.querySelector('.sidebar-categories');
        if (!el) return;
        el.innerHTML = this.categories.map(c => `
        <div class="category-group ${c.expanded ? 'expanded' : ''}" data-category="${c.name}">
            <div class="category-group-header">
                <div class="category-group-name">
                    <div class="category-group-icon"><i class="${c.icon}"></i></div>
                    <span>${c.name}</span>
                </div>
                <button class="category-toggle"><i class="fas fa-chevron-down"></i></button>
            </div>
            <div class="category-items" style="max-height: ${c.expanded ? '500px' : 0}">
                ${c.items.map(i => `
                <button class="category-item" data-link="${i.link}">
                    <div class="category-icon"><i class="${i.icon}"></i></div>
                    <div class="category-label">${i.label}</div>
                    ${i.badge ? `<div class="category-badge">${i.badge}</div>` : ''}
                </button>`).join('')}
            </div>
        </div>`).join('');
    }

    bindEvents() {
        document.addEventListener('click', e => {
            const header = e.target.closest('.category-group-header');
            const item = e.target.closest('.category-item');
            const avatar = e.target.closest('.sidebar-wallpaper-avatar');
            const footer = e.target.closest('.footer-btn');
            if (header) {
                const g = header.closest('.category-group');
                const name = g.dataset.category;
                const cat = this.categories.find(x => x.name === name);
                if (cat) {
                    cat.expanded = !cat.expanded;
                    g.classList.toggle('expanded', cat.expanded);
                    g.querySelector('.category-items').style.maxHeight = cat.expanded ? '500px' : '0';
                    this.saveExpandedState();
                }
            } else if (item) {
                const link = item.dataset.link;
                if (link) window.open(link, '_blank');
                this.hide();
            } else if (avatar) {
                this.openProfileModal();
            } else if (footer) {
                this.handleFooter(footer);
            }
        });
    }

    handleFooter(btn) {
        const i = btn.querySelector('i');
        if (i.classList.contains('fa-book')) {
            window.app?.showDiaryModal();
        } else if (i.classList.contains('fa-info-circle')) {
            window.aboutModule?.show();
        } else if (i.classList.contains('fa-qq')) {
            window.open('https://qm.qq.com/q/HxcjhEclyM', '_blank');
        }
        this.hide();
    }

    show() {
        const sb = document.getElementById('sidebar');
        if (!sb) return;
        this.closeAllModals();
        sb.classList.add('active');
        this.dynamicCalcSidebar();
        this.loadSidebarWallpaper();
        document.body.classList.add('sidebar-open');
    }

    hide() {
        const sb = document.getElementById('sidebar');
        if (!sb) return;
        sb.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        if (this.currentVideo) this.currentVideo.pause();
    }

    toggle() {
        const sb = document.getElementById('sidebar');
        sb?.classList.contains('active') ? this.hide() : this.show();
    }

    isVisible() {
        const sb = document.getElementById('sidebar');
        return sb?.classList.contains('active') || false;
    }

    closeAllModals() {
        window.searchModule?.hide();
        window.navbar?.hideMusicPlayer();
        window.announcementModule?.hide();
        window.app?.modules?.weather?.hide();
        window.aboutModule?.hide();
    }

    async loadWallpaperUserInfo() {
        const cfg = Storage.get('userConfig') || {};
        const avatar = document.getElementById('sidebarWallpaperAvatar');
        const nick = document.getElementById('sidebarWallpaperNickname');
        const sign = document.getElementById('sidebarWallpaperSignature');
        if (nick) nick.textContent = cfg.nickname || '访客用户';
        if (sign) sign.textContent = cfg.signature || '探索无限可能';
        if (avatar) {
            avatar.src = cfg.avatar || await this.getAvatar();
            avatar.loading = 'lazy';
        }
    }

    async loadSidebarWallpaper() {
        const d = new Date().getDay();
        const url = `./assets/wallpapers/${['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d]}.mp4`;
        this.setVideoWallpaper(url);
    }

    async setVideoWallpaper(url) {
        const wrap = document.getElementById('sidebarWallpaper');
        if (!wrap) return;
        wrap.querySelector('video')?.remove();
        const v = document.createElement('video');
        v.src = url;
        v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
        v.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0';
        wrap.appendChild(v);
        this.currentVideo = v;
        v.play().catch(() => this.setFallbackBg());
    }

    setFallbackBg() {
        const wrap = document.getElementById('sidebarWallpaper');
        if (wrap) wrap.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    async getAvatar() {
        const u = await API.getAvatar();
        return u || this.getDefaultAvatarSVG();
    }

    getDefaultAvatarSVG() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
    }

    async loadDailyQuote() {
        const el = document.getElementById('dailyQuote');
        if (!el) return;
        el.textContent = await API.getDailyQuote();
    }

    destroy() {
        if (this.currentVideo) this.currentVideo.pause();
        this.isInitialized = false;
    }
}

if (!window.sidebarInitialized) {
    window.sidebarInitialized = true;
    window.addEventListener('DOMContentLoaded', () => {
        window.sidebar = new CompactSidebar();
        window.sidebar.init();
    });
}
window.getSidebar = () => window.sidebar;
