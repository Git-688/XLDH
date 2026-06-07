// navbar.js - 导航栏模块（修复模态框动画，支持等待关闭完成）
class Navbar {
    constructor() {
        if (window.navbar && window.navbar instanceof Navbar) return window.navbar;
        this.announcements = [];
        this.init();
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
            this.updateNotificationBadge();
            setTimeout(() => this.handleScroll(), 100);
        } catch (e) {
            console.error('导航栏初始化失败:', e);
        }
    }

    bindEvents() {
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.newSearchModule && typeof window.newSearchModule.toggle === 'function') {
                    this.handleFeatureToggle('search', () => window.newSearchModule.toggle());
                }
            });
        }

        const musicBtn = document.getElementById('musicBtn');
        if (musicBtn) {
            musicBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleFeatureToggle('music', () => this.toggleMusicPlayer());
            });
        }

        const annBtn = document.getElementById('announcementBtn');
        if (annBtn) {
            annBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleFeatureToggle('announcement', () => window.announcementModule?.toggleModal());
            });
        }

        // 菜单按钮事件绑定由新侧滑栏负责，此处不做重复绑定

        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) {
            weatherBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['weather']).then(() => {
                    window.app?.modules?.weather?.showModal();
                });
            });
        }

        const submitBtn = document.getElementById('floatingSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['submit']).then(() => {
                    document.getElementById('submitModal')?.classList.add('active');
                });
            });
        }

        document.addEventListener('click', (e) => {
            const mp = document.getElementById('musicPlayer');
            const mb = document.getElementById('musicBtn');
            if (mp && mp.classList.contains('show') && !mp.contains(e.target) && !mb.contains(e.target)) {
                this.hideMusicPlayer();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModalsExcept([]);
        });

        window.addEventListener('scroll', this.handleScroll.bind(this));

        const btt = document.getElementById('backToTop');
        if (btt) btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    /**
     * 异步关闭除保留功能外的所有模态框，等待动画完成
     * @param {Array<string>} keep 保留的功能标识数组，如 ['search', 'music', 'announcement', 'sidebar', 'weather', 'about', 'notebook', 'submit']
     * @returns {Promise<void>}
     */
    closeAllModalsExcept(keep = []) {
        const closePromises = [];

        // 获取当前应用注册的所有活动模态框实例
        const activeModals = window.app?.activeModals || [];
        for (const modal of activeModals) {
            let shouldClose = true;
            if (keep.includes('music') && modal === window.musicPlayer) shouldClose = false;
            if (keep.includes('search') && modal === window.newSearchModule) shouldClose = false;
            if (keep.includes('announcement') && modal === window.announcementModule) shouldClose = false;
            if (keep.includes('sidebar') && modal === window.sidebar) shouldClose = false;
            if (keep.includes('weather') && modal === window.app?.modules?.weather) shouldClose = false;
            if (keep.includes('about') && modal === window.aboutModule) shouldClose = false;
            if (keep.includes('notebook') && modal === window.app?.notebookModalHideRef) shouldClose = false;
            if (keep.includes('submit') && modal === window.submitModule) shouldClose = false;

            if (shouldClose && modal && typeof modal.hide === 'function') {
                const promise = new Promise((resolve) => {
                    modal.hide();
                    // 轮询检查模态框是否已完全关闭（isVisible 变为 false）
                    const interval = setInterval(() => {
                        if (!modal.isVisible) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 50);
                    // 后备超时，避免无限等待
                    setTimeout(() => {
                        clearInterval(interval);
                        resolve();
                    }, 500);
                });
                closePromises.push(promise);
            }
        }

        // 额外处理一些未通过 app.registerModal 注册但需要关闭的组件
        if (!keep.includes('music')) {
            const musicPlayer = document.getElementById('musicPlayer');
            if (musicPlayer && musicPlayer.classList.contains('show') && this.hideMusicPlayer) {
                this.hideMusicPlayer();
            }
        }
        if (!keep.includes('search') && window.newSearchModule && window.newSearchModule.isOpen && window.newSearchModule.hide) {
            window.newSearchModule.hide();
        }
        if (!keep.includes('sidebar') && window.sidebar && window.sidebar.isVisible && window.sidebar.isVisible()) {
            window.sidebar.hide();
        }
        if (!keep.includes('announcement') && window.announcementModule && window.announcementModule.isVisible && window.announcementModule.hide) {
            window.announcementModule.hide();
        }
        if (!keep.includes('weather') && window.app?.modules?.weather && window.app.modules.weather.isShowing && window.app.modules.weather.hide) {
            window.app.modules.weather.hide();
        }
        if (!keep.includes('about') && window.aboutModule && window.aboutModule.isShowing && window.aboutModule.hide) {
            window.aboutModule.hide();
        }
        if (!keep.includes('notebook') && window.app && window.app.hideNotebookModal) {
            window.app.hideNotebookModal();
        }
        if (!keep.includes('submit') && window.submitModule && window.submitModule.isVisible && window.submitModule.hide) {
            window.submitModule.hide();
        }

        return Promise.all(closePromises);
    }

    /**
     * 打开或关闭指定功能，会先关闭其他模态框
     * @param {string} featureKey 功能标识
     * @param {Function} toggleFn 切换功能的函数
     */
    async handleFeatureToggle(featureKey, toggleFn) {
        await this.closeAllModalsExcept([featureKey]);
        toggleFn();
    }

    isFeatureOpen(key) {
        switch (key) {
            case 'search': return window.newSearchModule?.isOpen === true;
            case 'music': return document.getElementById('musicPlayer')?.classList.contains('show') === true;
            case 'announcement': return window.announcementModule?.isVisible === true;
            case 'sidebar': return window.sidebar && typeof window.sidebar.isVisible === 'function' && window.sidebar.isVisible();
            default: return false;
        }
    }

    toggleMusicPlayer() {
        const mp = document.getElementById('musicPlayer');
        const mb = document.getElementById('musicBtn');
        if (!mp || !mb || mp.classList.contains('animating')) return;
        mp.classList.contains('show') ? this.hideMusicPlayer() : this.showMusicPlayer();
    }

    showMusicPlayer() {
        const mp = document.getElementById('musicPlayer');
        const mb = document.getElementById('musicBtn');
        if (!mp || !mb) return;
        mp.classList.add('animating');
        mb.classList.add('loading');
        mp.style.display = 'block';
        mp.style.zIndex = '10000';
        setTimeout(() => {
            mp.classList.add('show');
            mb.classList.add('active');
            mb.classList.remove('loading');
            setTimeout(() => mp.classList.remove('animating'), 600);
        }, 10);
    }

    hideMusicPlayer() {
        const mp = document.getElementById('musicPlayer');
        const mb = document.getElementById('musicBtn');
        if (!mp || !mb) return;
        mp.classList.add('animating', 'hiding');
        mb.classList.remove('active');
        mp.classList.remove('show');
        setTimeout(() => {
            mp.style.display = 'none';
            mp.classList.remove('animating', 'hiding');
        }, 600);
    }

    handleScroll() {
        const navbar = document.getElementById('navbar');
        const btt = document.getElementById('backToTop');
        if (window.scrollY > 100) navbar?.classList.add('scrolled');
        else navbar?.classList.remove('scrolled');
        if (btt) btt.classList.toggle('visible', window.scrollY > 300);
    }

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

    updateNotificationBadge() {
        const btn = document.getElementById('announcementBtn');
        if (!btn) return;
        const unread = this.getUnreadAnnouncementCount();
        let badge = btn.querySelector('.nav-badge');
        if (unread > 0) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'nav-badge';
                btn.appendChild(badge);
            }
            badge.textContent = unread > 9 ? '9+' : unread;
            badge.classList.add('show');
            btn.classList.add('has-unread');
        } else if (badge) {
            badge.classList.remove('show');
            setTimeout(() => badge.remove(), 300);
            btn.classList.remove('has-unread');
        }
    }

    getUnreadAnnouncementCount() {
        if (window.app?.modules?.announcement) return window.app.modules.announcement.getUnreadCount();
        const stored = Storage.get('announcements') || [];
        return stored.filter(a => !a.read).length;
    }

    destroy() {
        window.removeEventListener('scroll', this.handleScroll);
    }
}