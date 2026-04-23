/**
 * 导航栏组件（单例模式）
 * 修复：添加异常捕获，防止“搜索功能出错”无具体信息
 */
class Navbar {
    constructor() {
        if (window.navbar && window.navbar instanceof Navbar) {
            return window.navbar;
        }
        this.announcements = [];
        this.searchModuleReady = false;
        this.init();
        window.navbar = this;
    }

    init() {
        try {
            this.bindEvents();
            this.loadAnnouncements();
            this.updateNotificationBadge();
            setTimeout(() => this.handleScroll(), 100);
            setTimeout(() => this.checkSearchModule(), 1000);
        } catch (error) {
            console.error('导航栏初始化失败:', error);
        }
    }

    checkSearchModule() {
        if (window.searchModule && typeof window.searchModule.showModal === 'function') {
            this.searchModuleReady = true;
        } else if (typeof SearchModule !== 'undefined') {
            try {
                window.searchModule = new SearchModule();
                this.searchModuleReady = true;
            } catch (e) {
                console.error('动态初始化搜索模块失败:', e);
            }
        }
    }

    bindEvents() {
        try {
            // 搜索按钮
            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn) {
                searchBtn.replaceWith(searchBtn.cloneNode(true));
                const newSearchBtn = document.getElementById('searchBtn');
                newSearchBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeAllModalsExcept(['search']);
                    this.handleSearchButtonClick();
                });
            }

            // 音乐按钮
            const musicBtn = document.getElementById('musicBtn');
            if (musicBtn) {
                musicBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeAllModalsExcept(['music']);
                    this.toggleMusicPlayer();
                });
            }

            // 公告按钮
            const announcementBtn = document.getElementById('announcementBtn');
            if (announcementBtn) {
                announcementBtn.replaceWith(announcementBtn.cloneNode(true));
                const newAnnouncementBtn = document.getElementById('announcementBtn');
                newAnnouncementBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeAllModalsExcept(['announcement']);
                    if (window.announcementModule) window.announcementModule.toggleModal();
                });
            }

            // 菜单按钮
            const menuBtn = document.getElementById('menuBtn');
            if (menuBtn) {
                menuBtn.replaceWith(menuBtn.cloneNode(true));
                const newMenuBtn = document.getElementById('menuBtn');
                newMenuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeAllModalsExcept(['sidebar']);
                    if (window.sidebar && typeof window.sidebar.toggle === 'function') {
                        window.sidebar.toggle();
                    }
                });
            }

            // 天气按钮
            const weatherBtn = document.getElementById('weatherBtn');
            if (weatherBtn) {
                weatherBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeAllModalsExcept(['weather']);
                    if (window.app && window.app.modules && window.app.modules.weather) {
                        window.app.modules.weather.showModal();
                    }
                });
            }

            // 反馈按钮
            const floatingFeedbackBtn = document.getElementById('floatingFeedbackBtn');
            if (floatingFeedbackBtn) {
                floatingFeedbackBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeAllModalsExcept(['feedback']);
                    if (typeof window.openFeedbackModal === 'function') window.openFeedbackModal();
                });
            }

            // 投稿按钮
            const floatingSubmitBtn = document.getElementById('floatingSubmitBtn');
            if (floatingSubmitBtn) {
                floatingSubmitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeAllModalsExcept(['submit']);
                    window.open('https://f.wps.cn/g/TI3Gxbe1/', '_blank');
                });
            }

            document.addEventListener('click', this.handleDocumentClick.bind(this));
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeAllModalsExcept([]);
            });
            window.addEventListener('scroll', this.handleScroll.bind(this));

            const backToTop = document.getElementById('backToTop');
            if (backToTop) {
                backToTop.addEventListener('click', () => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }
        } catch (error) {
            console.error('导航栏事件绑定失败:', error);
        }
    }

    closeAllModalsExcept(keepModules = []) {
        try {
            if (!keepModules.includes('music')) this.hideMusicPlayer();
            if (!keepModules.includes('search') && window.searchModule) {
                if (window.searchModule.isModalOpen && window.searchModule.isModalOpen()) window.searchModule.hide();
            }
            if (!keepModules.includes('sidebar') && window.sidebar) {
                if (window.sidebar.isVisible && window.sidebar.isVisible()) window.sidebar.hide();
            }
            if (!keepModules.includes('announcement') && window.announcementModule) {
                if (window.announcementModule.isVisible) window.announcementModule.hide();
            }
            if (!keepModules.includes('weather') && window.app && window.app.modules && window.app.modules.weather) {
                if (window.app.modules.weather.hide) window.app.modules.weather.hide();
            }
            if (!keepModules.includes('about') && window.aboutModule) {
                if (window.aboutModule.hide) window.aboutModule.hide();
            }
            if (!keepModules.includes('notebook') && window.app && typeof window.app.hideNotebookModal === 'function') {
                window.app.hideNotebookModal();
            }
        } catch (error) {
            console.error('关闭模态框失败:', error);
        }
    }

    handleSearchButtonClick() {
        try {
            if (window.searchModule && typeof window.searchModule.showModal === 'function') {
                if (window.searchModule.isModalOpen && window.searchModule.isModalOpen()) {
                    window.searchModule.hide();
                } else {
                    window.searchModule.showModal();
                }
            } else if (typeof SearchModule !== 'undefined') {
                window.searchModule = new SearchModule();
                window.searchModule.showModal();
            } else {
                window.toast.show('搜索功能暂不可用', 'error');
            }
        } catch (error) {
            console.error('处理搜索按钮点击失败:', error);
            window.toast.show('搜索功能出错: ' + error.message, 'error');
        }
    }

    toggleMusicPlayer() {
        try {
            const musicPlayer = document.getElementById('musicPlayer');
            const musicBtn = document.getElementById('musicBtn');
            if (!musicPlayer || !musicBtn) return;
            if (musicPlayer.classList.contains('animating')) return;
            if (musicPlayer.classList.contains('show')) {
                this.hideMusicPlayer();
            } else {
                this.showMusicPlayer();
            }
        } catch (error) {
            console.error('切换音乐播放器失败:', error);
        }
    }

    showMusicPlayer() {
        try {
            const musicPlayer = document.getElementById('musicPlayer');
            const musicBtn = document.getElementById('musicBtn');
            if (!musicPlayer || !musicBtn) return;
            musicPlayer.classList.add('animating');
            musicBtn.classList.add('loading');
            musicPlayer.style.display = 'block';
            musicPlayer.style.zIndex = '10000';
            setTimeout(() => {
                musicPlayer.classList.add('show');
                musicBtn.classList.add('active');
                musicBtn.classList.remove('loading');
                setTimeout(() => musicPlayer.classList.remove('animating'), 600);
            }, 10);
        } catch (error) {
            console.error('显示音乐播放器失败:', error);
        }
    }

    hideMusicPlayer() {
        try {
            const musicPlayer = document.getElementById('musicPlayer');
            const musicBtn = document.getElementById('musicBtn');
            if (!musicPlayer || !musicBtn) return;
            musicPlayer.classList.add('animating', 'hiding');
            musicBtn.classList.remove('active');
            musicPlayer.classList.remove('show');
            setTimeout(() => {
                musicPlayer.style.display = 'none';
                musicPlayer.classList.remove('animating', 'hiding');
            }, 600);
        } catch (error) {
            console.error('隐藏音乐播放器失败:', error);
        }
    }

    handleDocumentClick(e) {
        try {
            const musicPlayer = document.getElementById('musicPlayer');
            const musicBtn = document.getElementById('musicBtn');
            if (musicPlayer && musicPlayer.classList.contains('show') && 
                !musicPlayer.contains(e.target) && !musicBtn.contains(e.target)) {
                this.hideMusicPlayer();
            }
        } catch (error) {
            console.error('处理文档点击事件失败:', error);
        }
    }

    handleScroll() {
        try {
            const navbar = document.getElementById('navbar');
            const backToTop = document.getElementById('backToTop');
            if (navbar && window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else if (navbar) {
                navbar.classList.remove('scrolled');
            }
            if (backToTop) {
                if (window.scrollY > 300) backToTop.classList.add('visible');
                else backToTop.classList.remove('visible');
            }
        } catch (error) {
            console.error('处理滚动事件失败:', error);
        }
    }

    loadAnnouncements() {
        try {
            this.announcements = Storage.get('announcements') || [
                {
                    id: 'single_announcement',
                    title: '星聚导航公告',
                    subtitle: '重要通知',
                    focus: '本站为纯前端静态资源导航站，不存储文件、不收集隐私、无服务器后台',
                    updates: [
                        '全新界面设计 - 更加现代化和美观的视觉体验',
                        '音乐播放器 - 支持多平台音乐搜索和播放',
                        '个性化设置 - 可自定义主题和布局',
                        '更多实用工具 - 新增多个日常使用的小工具',
                        '性能优化 - 更快的加载速度和响应时间'
                    ],
                    time: new Date().toLocaleString('zh-CN'),
                    source: '系统公告',
                    read: false
                }
            ];
        } catch (error) {
            console.error('加载公告数据失败:', error);
        }
    }

    updateNotificationBadge() {
        try {
            const announcementBtn = document.getElementById('announcementBtn');
            if (!announcementBtn) return;
            const existingBadge = announcementBtn.querySelector('.nav-badge');
            const unreadCount = this.getUnreadAnnouncementCount();
            if (unreadCount > 0) {
                if (!existingBadge) {
                    const badge = document.createElement('div');
                    badge.className = 'nav-badge';
                    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    announcementBtn.appendChild(badge);
                    setTimeout(() => badge.classList.add('show'), 100);
                } else {
                    existingBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                }
                announcementBtn.classList.add('has-unread');
            } else if (existingBadge) {
                existingBadge.classList.remove('show');
                setTimeout(() => {
                    if (existingBadge.parentNode) {
                        existingBadge.parentNode.removeChild(existingBadge);
                    }
                }, 300);
                announcementBtn.classList.remove('has-unread');
            }
        } catch (error) {
            console.error('更新通知徽章失败:', error);
        }
    }

    getUnreadAnnouncementCount() {
        try {
            if (window.app && window.app.modules.announcement) {
                return window.app.modules.announcement.getUnreadCount();
            }
            const announcements = Storage.get('announcements') || [];
            return announcements.filter(ann => !ann.read).length;
        } catch (error) {
            console.error('获取未读公告数量失败:', error);
            return 0;
        }
    }

    destroy() {
        try {
            document.removeEventListener('click', this.handleDocumentClick);
            window.removeEventListener('scroll', this.handleScroll);
        } catch (error) {
            console.error('销毁导航栏失败:', error);
        }
    }
}