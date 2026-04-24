class Navbar {
    constructor() {
        if (window.navbar && window.navbar instanceof Navbar) return window.navbar;
        this.announcements = [];
        this.init();
        window.navbar = this;
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
        // ---------- 搜索按钮：toggle 新搜索模块 ----------
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.replaceWith(searchBtn.cloneNode(true));
            document.getElementById('searchBtn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['search']);
                if (window.newSearchModule) {
                    window.newSearchModule.toggle();
                } else {
                    window.toast.show('搜索模块未加载', 'error');
                }
            });
        }

        const musicBtn = document.getElementById('musicBtn');
        if (musicBtn) {
            musicBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['music']);
                this.toggleMusicPlayer();
            });
        }

        const annBtn = document.getElementById('announcementBtn');
        if (annBtn) {
            annBtn.replaceWith(annBtn.cloneNode(true));
            document.getElementById('announcementBtn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['announcement']);
                window.announcementModule?.toggleModal();
            });
        }

        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
            menuBtn.replaceWith(menuBtn.cloneNode(true));
            document.getElementById('menuBtn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['sidebar']);
                window.sidebar?.toggle?.();
            });
        }

        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) {
            weatherBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['weather']);
                window.app?.modules?.weather?.showModal();
            });
        }

        const fbBtn = document.getElementById('floatingFeedbackBtn');
        if (fbBtn) {
            fbBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['feedback']);
                if (typeof window.openFeedbackModal === 'function') window.openFeedbackModal();
            });
        }

        const submitBtn = document.getElementById('floatingSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['submit']);
                window.open('https://f.wps.cn/g/TI3Gxbe1/', '_blank');
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

    closeAllModalsExcept(keep = []) {
        try {
            if (!keep.includes('music')) this.hideMusicPlayer();
            if (!keep.includes('search') && window.newSearchModule && window.newSearchModule.isOpen) {
                window.newSearchModule.hide();
            }
            if (!keep.includes('sidebar') && window.sidebar?.isVisible()) window.sidebar.hide();
            if (!keep.includes('announcement') && window.announcementModule?.isVisible) window.announcementModule.hide();
            if (!keep.includes('weather')) window.app?.modules?.weather?.hide?.();
            if (!keep.includes('about')) window.aboutModule?.hide?.();
            if (!keep.includes('notebook')) window.app?.hideNotebookModal?.();
        } catch (e) {
            console.error('关闭模态框失败:', e);
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
        document.removeEventListener('click', this.closeAllModalsExcept);
        window.removeEventListener('scroll', this.handleScroll);
    }
}