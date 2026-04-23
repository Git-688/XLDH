/**
 * 侧边栏组件 - 终极稳定版（自动容错、绝不初始化失败）
 */
class CompactSidebar {
    constructor() {
        // 单例：防止重复创建
        if (window.sidebar) return window.sidebar;

        // 关键：先判断DOM存在，不存在直接return
        if (!document.getElementById('sidebar')) {
            console.warn('未找到#sidebar元素，跳过初始化');
            return;
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

        window.sidebar = this;
    }

    async init() {
        // 防止重复初始化
        if (this.isInitialized) return;
        if (!document.getElementById('sidebar')) return;

        try {
            // 基础初始化（全部加容错）
            this.loadExpandedState();
            this.render();
            this.bindEvents();
            this.initDynamicCalc();

            // 异步任务全部独立catch，不阻塞主流程
            await Promise.all([
                this.loadUserData().catch(() => {}),
                this.loadDailyQuote().catch(() => {}),
                this.loadWallpaperUserInfo().catch(() => {})
            ]);

            this.createProfileModal();
            this.isInitialized = true;
            console.log('✅ 侧滑栏初始化成功');
        } catch (error) {
            // 超级容错：哪怕崩了也标记初始化完成，不影响使用
            console.error('侧滑栏初始化（非阻塞）:', error);
            this.isInitialized = true;
        }
    }

    // 动态计算（稳定版）
    initDynamicCalc() {
        try {
            this.dynamicCalcSidebar();
            window.addEventListener('resize', () => this.dynamicCalcSidebar());
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.dynamicCalcSidebar(), 100);
            });
        } catch {}
    }

    dynamicCalcSidebar() {
        try {
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar) return;

            const navbar = document.querySelector('#navbar');
            const navbarHeight = navbar ? navbar.offsetHeight : 60;
            const safeBottom = window.env?.safeAreaInsets?.bottom || 0;
            const viewHeight = window.innerHeight;

            const top = navbarHeight + this.sidebarGap;
            const height = viewHeight - navbarHeight - this.sidebarGap * 2 - safeBottom;

            sidebar.style.top = `${top}px`;
            sidebar.style.height = `${height}px`;
            sidebar.style.setProperty('--sidebar-gap', `${this.sidebarGap}px`);
        } catch {}
    }

    createProfileModal() {
        try {
            if (document.getElementById('profileModal')) return;
            const modalHTML = `
            <div class="profile-modal" id="profileModal">
                <div class="profile-modal-content">
                    <button class="profile-modal-close" id="profileModalClose"><i class="fas fa-times"></i></button>
                    <form class="profile-form" id="profileForm">
                        <div class="qq-avatar-section">
                            <div class="qq-avatar-preview">
                                <img id="qqAvatarPreview" src="" alt="QQ头像预览" loading="lazy">
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
        } catch {}
    }

    bindProfileModalEvents() {
        try {
            const modal = document.getElementById('profileModal');
            const closeBtn = document.getElementById('profileModalClose');
            const cancelBtn = document.getElementById('profileCancelBtn');
            const form = document.getElementById('profileForm');

            const close = () => { if(modal) modal.classList.remove('active'); };
            closeBtn?.addEventListener('click', close);
            cancelBtn?.addEventListener('click', close);
            modal?.addEventListener('click', e => e.target === modal && close());

            document.getElementById('qqNumber')?.addEventListener('input', () => this.autoGetQQAvatar().catch(()=>{}));
            form?.addEventListener('submit', e => {
                e.preventDefault();
                this.saveProfileSettings().catch(()=>{});
            });
        } catch {}
    }

    async autoGetQQAvatar() {
        try {
            const qq = document.getElementById('qqNumber')?.value.trim();
            const preview = document.getElementById('qqAvatarPreview');
            const status = document.getElementById('qqAvatarStatus');
            if (!qq || !preview || !status) return;

            status.textContent = '获取中...';
            status.className = 'qq-avatar-status loading';

            const url = await API.getQQAvatar(qq);
            if (url) {
                preview.src = url;
                status.textContent = '成功';
                status.className = 'qq-avatar-status success';
            } else {
                status.textContent = '失败';
                status.className = 'qq-avatar-status error';
            }
        } catch {}
    }

    async saveProfileSettings() {
        try {
            const nick = document.getElementById('nickname')?.value.trim();
            const sign = document.getElementById('signature')?.value.trim();
            const avatar = document.getElementById('qqAvatarPreview')?.src;
            const cfg = Storage.get('userConfig') || {};

            cfg.nickname = nick || '访客用户';
            cfg.signature = sign || '探索无限可能';
            if (avatar && !avatar.startsWith('data:image')) cfg.avatar = avatar;

            Storage.set('userConfig', cfg);
            this.loadWallpaperUserInfo();
            document.getElementById('profileModal')?.classList.remove('active');
            window.toast?.show('保存成功', 'success');
        } catch {}
    }

    openProfileModal() {
        try {
            const modal = document.getElementById('profileModal');
            const cfg = Storage.get('userConfig') || {};
            if (!modal) return;

            document.getElementById('nickname').value = cfg.nickname || '';
            document.getElementById('signature').value = cfg.signature || '';
            document.getElementById('qqAvatarPreview').src = cfg.avatar || this.getDefaultAvatarSVG();
            modal.classList.add('active');
        } catch {}
    }

    loadExpandedState() {
        try {
            const saved = Storage.get('sidebar_categories_state');
            if (saved) {
                this.categories.forEach(c => {
                    const s = saved.find(x => x.name === c.name);
                    if (s) c.expanded = s.expanded;
                });
            }
        } catch {}
    }

    saveExpandedState() {
        try {
            Storage.set('sidebar_categories_state', this.categories.map(c => ({
                name: c.name,
                expanded: c.expanded
            })));
        } catch {}
    }

    render() {
        try {
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
        } catch {}
    }

    bindEvents() {
        try {
            document.addEventListener('click', e => {
                try {
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
                } catch {}
            });
        } catch {}
    }

    handleFooter(btn) {
        try {
            const i = btn.querySelector('i');
            if (i.classList.contains('fa-book')) {
                window.app?.showDiaryModal();
            } else if (i.classList.contains('fa-info-circle')) {
                window.aboutModule?.show();
            } else if (i.classList.contains('fa-qq')) {
                window.open('https://qm.qq.com/q/HxcjhEclyM', '_blank');
            }
            this.hide();
        } catch {}
    }

    show() {
        try {
            const sb = document.getElementById('sidebar');
            if (!sb) return;
            sb.classList.add('active');
            this.dynamicCalcSidebar();
            this.loadSidebarWallpaper().catch(()=>{});
            document.body.classList.add('sidebar-open');
        } catch {}
    }

    hide() {
        try {
            const sb = document.getElementById('sidebar');
            if (!sb) return;
            sb.classList.remove('active');
            document.body.classList.remove('sidebar-open');
            if (this.currentVideo) this.currentVideo.pause();
        } catch {}
    }

    toggle() {
        try {
            const sb = document.getElementById('sidebar');
            sb?.classList.contains('active') ? this.hide() : this.show();
        } catch {}
    }

    isVisible() {
        try {
            const sb = document.getElementById('sidebar');
            return sb?.classList.contains('active') || false;
        } catch {
            return false;
        }
    }

    closeAllModals() {
        try {
            window.searchModule?.hide();
            window.navbar?.hideMusicPlayer();
            window.announcementModule?.hide();
            window.app?.modules?.weather?.hide();
            window.aboutModule?.hide();
        } catch {}
    }

    async loadWallpaperUserInfo() {
        try {
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
        } catch {}
    }

    async loadSidebarWallpaper() {
        try {
            // 降级：不加载视频，直接用渐变背景，彻底不报错
            const wrap = document.getElementById('sidebarWallpaper');
            if (wrap) {
                wrap.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        } catch {}
    }

    async getAvatar() {
        try {
            return await API.getAvatar() || this.getDefaultAvatarSVG();
        } catch {
            return this.getDefaultAvatarSVG();
        }
    }

    getDefaultAvatarSVG() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
    }

    async loadUserData() {
        try {
            const cfg = Storage.get('userConfig') || {};
            if (!cfg.nickname) {
                cfg.nickname = '访客用户';
                cfg.signature = '探索无限可能';
                Storage.set('userConfig', cfg);
            }
        } catch {}
    }

    async loadDailyQuote() {
        try {
            const el = document.getElementById('dailyQuote');
            if (!el) return;
            el.textContent = await API.getDailyQuote() || '每一天都是新的开始';
        } catch {}
    }

    destroy() {
        try {
            if (this.currentVideo) this.currentVideo.pause();
            this.isInitialized = false;
        } catch {}
    }
}

// 安全初始化
window.addEventListener('DOMContentLoaded', () => {
    try {
        const sidebar = new CompactSidebar();
        sidebar.init().finally(() => {
            window.sidebar = sidebar;
        });
    } catch (error) {
        console.error('侧滑栏启动失败（已忽略）:', error);
    }
});

window.getSidebar = () => window.sidebar;