/* navbar.js - 精简版（修复搜索按钮点击无反应） */
class Navbar {
    constructor() {
        if (window.Starlink?.navbar) return window.Starlink.navbar;
        
        this.announcements = [];
        this.escapeHandler = null;
        this.init();
        
        if (window.Starlink) window.Starlink.navbar = this;
        window.navbar = this;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    init() {
        try {
            this.bindEvents();
            this.loadAnnouncements();
            setTimeout(() => this.handleScroll(), 100);
        } catch (e) {
            console.error('导航栏初始化失败:', e);
        }
    }

    // ---------- 事件绑定 ----------
    bindEvents() {
        // 搜索按钮 - 直接调用搜索模块的 toggle 方法，简化逻辑
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 直接调用 newSearchModule 的 toggle，并确保其他模态关闭
                this.closeAllModalsExcept(['search']).then(() => {
                    if (window.newSearchModule && typeof window.newSearchModule.toggle === 'function') {
                        window.newSearchModule.toggle();
                    } else if (window.Starlink?.search && typeof window.Starlink.search.toggle === 'function') {
                        window.Starlink.search.toggle();
                    } else {
                        console.warn('搜索模块未加载');
                        window.toast?.show('搜索功能暂不可用', 'warning');
                    }
                }).catch(err => {
                    console.error('搜索切换失败:', err);
                    window.toast?.show('搜索功能出错', 'error');
                });
            });
        }

        // 音乐按钮
        const musicBtn = document.getElementById('musicBtn');
        if (musicBtn) {
            musicBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleFeatureToggle('music', () => this.toggleMusicPlayer());
            });
        }

        // 公告按钮
        const annBtn = document.getElementById('announcementBtn');
        if (annBtn) {
            annBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleFeatureToggle('announcement', () => {
                    window.Starlink?.announcement?.toggleModal?.() || window.announcementModule?.toggleModal?.();
                });
            });
        }

        // 天气按钮
        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) {
            weatherBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['weather']).then(() => {
                    window.Starlink?.weather?.showModal?.() || window.app?.modules?.weather?.showModal?.();
                });
            });
        }

        // 投稿按钮（浮动）
        const submitBtn = document.getElementById('floatingSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['submit']).then(() => {
                    window.Starlink?.submit?.show?.() || window.submitModule?.show?.();
                });
            });
        }

        // 点击外部关闭音乐播放器
        document.addEventListener('click', (e) => {
            const mp = document.getElementById('musicPlayer');
            const mb = document.getElementById('musicBtn');
            if (mp?.classList.contains('show') && !mp.contains(e.target) && !mb?.contains(e.target)) {
                this.hideMusicPlayer();
            }
        });

        // ESC 关闭所有模态
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') this.closeAllModalsExcept([]);
        };
        document.addEventListener('keydown', this.escapeHandler);

        // 滚动监听
        window.addEventListener('scroll', () => this.handleScroll());

        // 回到顶部
        const btt = document.getElementById('backToTop');
        if (btt) btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // ---------- 模态管理 ----------
    async closeAllModalsExcept(keep = []) {
        const keepSet = new Set(keep);
        const modalMap = {
            music: window.Starlink?.musicPlayer,
            search: window.Starlink?.search,
            announcement: window.Starlink?.announcement,
            sidebar: window.Starlink?.sidebar,
            weather: window.Starlink?.weather,
            about: window.Starlink?.about,
            notebook: window.Starlink?.app?.notebookModalHideRef,
            submit: window.Starlink?.submit
        };

        // 关闭注册的模态
        const activeModals = window.Starlink?.app?.activeModals || [];
        for (const modal of activeModals) {
            const shouldClose = !Object.entries(modalMap).some(([key, m]) => m === modal && keepSet.has(key));
            if (shouldClose && modal?.hide) {
                try {
                    await new Promise(resolve => {
                        modal.hide();
                        setTimeout(resolve, 300);
                    });
                } catch (e) {
                    console.warn('关闭模态失败:', e);
                }
            }
        }

        // 特殊处理：音乐播放器
        if (!keepSet.has('music')) {
            const mp = document.getElementById('musicPlayer');
            if (mp?.classList.contains('show')) this.hideMusicPlayer();
        }

        // 特殊处理：搜索
        if (!keepSet.has('search')) {
            window.Starlink?.search?.hide?.();
            window.newSearchModule?.hide?.();
        }

        // 特殊处理：侧边栏
        if (!keepSet.has('sidebar')) {
            window.Starlink?.sidebar?.hide?.();
            window.sidebar?.hide?.();
        }

        // 特殊处理：公告
        if (!keepSet.has('announcement')) {
            window.Starlink?.announcement?.hide?.();
            window.announcementModule?.hide?.();
        }

        // 特殊处理：天气
        if (!keepSet.has('weather')) {
            window.Starlink?.weather?.hide?.();
            window.app?.modules?.weather?.hide?.();
        }

        // 特殊处理：关于
        if (!keepSet.has('about')) {
            window.Starlink?.about?.hide?.();
            window.aboutModule?.hide?.();
        }

        // 特殊处理：笔记
        if (!keepSet.has('notebook')) {
            window.Starlink?.app?.hideNotebookModal?.();
        }

        // 特殊处理：投稿
        if (!keepSet.has('submit')) {
            window.Starlink?.submit?.hide?.();
            window.submitModule?.hide?.();
        }
    }

    async handleFeatureToggle(featureKey, toggleFn) {
        await this.closeAllModalsExcept([featureKey]);
        toggleFn();
    }

    isFeatureOpen(key) {
        const map = {
            search: window.Starlink?.search?.isOpen || window.newSearchModule?.isOpen,
            music: document.getElementById('musicPlayer')?.classList.contains('show'),
            announcement: window.Starlink?.announcement?.isVisible || window.announcementModule?.isVisible,
            sidebar: window.Starlink?.sidebar?.isVisible?.() || window.sidebar?.isVisible?.()
        };
        return map[key] || false;
    }

    // ---------- 音乐播放器控制 ----------
    toggleMusicPlayer() {
        const mp = document.getElementById('musicPlayer');
        if (!mp || mp.classList.contains('animating')) return;
        mp.classList.contains('show') ? this.hideMusicPlayer() : this.showMusicPlayer();
    }

    showMusicPlayer() {
        const mp = document.getElementById('musicPlayer');
        const mb = document.getElementById('musicBtn');
        if (!mp) return;
        mp.classList.add('animating');
        mb?.classList.add('loading');
        mp.style.display = 'block';
        mp.style.zIndex = '10000';
        setTimeout(() => {
            mp.classList.add('show');
            mb?.classList.add('active');
            mb?.classList.remove('loading');
            setTimeout(() => mp.classList.remove('animating'), 600);
        }, 10);
    }

    hideMusicPlayer() {
        const mp = document.getElementById('musicPlayer');
        const mb = document.getElementById('musicBtn');
        if (!mp) return;
        mp.classList.add('animating', 'hiding');
        mb?.classList.remove('active');
        mp.classList.remove('show');
        setTimeout(() => {
            mp.style.display = 'none';
            mp.classList.remove('animating', 'hiding');
        }, 600);
    }

    // ---------- 滚动处理 ----------
    handleScroll() {
        const navbar = document.getElementById('navbar');
        const btt = document.getElementById('backToTop');
        if (window.scrollY > 100) navbar?.classList.add('scrolled');
        else navbar?.classList.remove('scrolled');
        if (btt) btt.classList.toggle('visible', window.scrollY > 300);
    }

    // ---------- 公告 ----------
    loadAnnouncements() {
        this.announcements = Storage.get('announcements') || [{
            id: 'single_announcement',
            title: '星聚导航公告',
            focus: '本站为纯前端静态资源导航站，不存储文件、不收集隐私、无服务器后台',
            updates: ['全新界面设计', '音乐播放器', '个性化设置', '更多实用工具', '性能优化'],
            time: new Date().toLocaleString('zh-CN'),
            read: false
        }];
    }

    getUnreadAnnouncementCount() {
        return 0;
    }

    // ---------- 清理 ----------
    destroy() {
        window.removeEventListener('scroll', this.handleScroll);
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.navbar) window.Starlink.navbar = new Navbar();
    });
} else {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.navbar) window.Starlink.navbar = new Navbar();
}