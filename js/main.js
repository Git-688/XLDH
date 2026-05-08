/**
 * 星聚导航主应用程序（最终版）
 * 完整功能：笔记、搜索、天气、音乐、评论等
 */
class App {
    constructor() {
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this.lastWeatherUpdate = null;
        this.notebookModalHideRef = null;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    // 加载星聚笔记数据
    async loadNotebookData() {
        const listEl = document.getElementById('notebook-list');
        if (!listEl) return;
        listEl.innerHTML = '<div class="loading">加载笔记中...</div>';
        
        const fetchNotebook = async (retry = 2) => {
            try {
                const response = await fetch('https://api.xjdh688.ccwu.cc/notebook');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                return data.items || [];
            } catch (error) {
                if (retry > 0) {
                    return fetchNotebook(retry - 1);
                }
                throw error;
            }
        };

        try {
            const items = await fetchNotebook(2);
            if (items.length === 0) {
                listEl.innerHTML = '<div class="empty">暂无笔记记录<br><small style="color:#999">请稍后刷新页面或联系管理员</small></div>';
                return;
            }
            items.sort((a, b) => a.numid - b.numid);
            const html = items.map(item => {
                const title = Utils.escapeHtml((item.title || '').trim());
                const time = Utils.escapeHtml(item.time || '--');
                const words = Utils.escapeHtml((item.words || '').trim()).replace(/\n/g, '<br>');
                const numid = item.numid;
                return `
                    <div class="notebook-item">
                        <div class="notebook-header">
                            <span class="notebook-id">#${numid}</span>
                            <span class="notebook-time"><i class="far fa-calendar-alt"></i> ${time}</span>
                        </div>
                        <div class="notebook-title">${title}</div>
                        <div class="notebook-content">${words}</div>
                    </div>
                `;
            }).join('');
            listEl.innerHTML = html;
        } catch (error) {
            console.error('加载星聚笔记失败:', error);
            listEl.innerHTML = `<div class="error">加载失败：${Utils.escapeHtml(error.message)}<br><small>可尝试刷新页面</small></div>`;
        }
    }

    // 显示星聚笔记模态框
    showNotebookModal() {
        const modal = document.getElementById('notebookModal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.classList.add('active');
        if (!this.notebookModalHideRef) {
            this.notebookModalHideRef = { hide: this.hideNotebookModal.bind(this) };
        }
        this.registerModal(this.notebookModalHideRef);
        this.loadNotebookData();
    }

    // 隐藏星聚笔记模态框
    hideNotebookModal() {
        const modal = document.getElementById('notebookModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        if (this.notebookModalHideRef) {
            this.unregisterModal(this.notebookModalHideRef);
        }
    }

    // 初始化星聚笔记模态框事件
    initNotebookModalEvents() {
        const modal = document.getElementById('notebookModal');
        const closeBtn = modal?.querySelector('.feedback-modal-close');
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideNotebookModal();
        });
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideNotebookModal());
        }
    }

    // 全局图片错误捕获（CSP修复）
    initImageFallbackHandler() {
        document.addEventListener('error', (e) => {
            const img = e.target;
            if (img.tagName !== 'IMG' || !img.classList.contains('js-img-fallback')) return;
            e.preventDefault();
            const fbType = img.dataset.fallbackType;
            const parent = img.parentElement;
            
            // 防止重复触发
            img.classList.remove('js-img-fallback');
            
            if (fbType === 'hideAndShowIcon') {
                img.style.display = 'none';
                if (parent && !parent.querySelector('.js-fallback-icon')) {
                    const iconClass = img.dataset.fallbackIconClass || 'fas fa-rocket';
                    const icon = document.createElement('i');
                    icon.className = `${iconClass} js-fallback-icon`;
                    parent.appendChild(icon);
                }
            } else if (fbType === 'defaultAvatar') {
                const defaultSvg = img.dataset.defaultSvg || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
                img.src = defaultSvg;
            } else if (fbType === 'icon') {
                if (!parent.querySelector('i.fa-link')) {
                    img.style.display = 'none';
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-link';
                    parent.appendChild(icon);
                }
            }
        }, true); // 捕获阶段，因为图片error不冒泡
    }

    // 应用初始化
    init() {
        if (this.isInitialized) return;
        this.setupErrorHandling();
        this.initImageFallbackHandler();
        this.initStorage();
        this.initCoreComponents();
        this.initModules();
        this.initDependentComponents();
        this.setupGlobalEvents();
        this.initNotebookModalEvents();
        this.initFloatingButtonsEffect();
        this.isInitialized = true;

        // 挂载全局便捷方法
        window.showNotebookModal = this.showNotebookModal.bind(this);
        window.hideNotebookModal = this.hideNotebookModal.bind(this);
    }

    // 悬浮按钮滚动半透明效果
    initFloatingButtonsEffect() {
        let scrollTimer;
        const floatingBtns = document.querySelector('.floating-buttons');
        if (!floatingBtns) return;
        window.addEventListener('scroll', () => {
            floatingBtns.style.opacity = '0.4';
            floatingBtns.style.transition = 'opacity 0.3s ease';
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                floatingBtns.style.opacity = '1';
            }, 1000);
        }, { passive: true });
    }

    initCoreComponents() {
        try {
            if (typeof CompactSidebar !== 'undefined') {
                if (!window.sidebar || !window.sidebar.isInitialized) {
                    this.components.sidebar = new CompactSidebar();
                    this.components.sidebar.init().catch(error => {
                        console.error('侧边栏初始化失败:', error);
                        this.showToast('侧边栏初始化失败，部分功能可能不可用', 'warning');
                    });
                } else {
                    this.components.sidebar = window.sidebar;
                }
            }
        } catch (error) {
            console.error('核心组件初始化失败:', error);
            this.showToast('核心组件初始化失败', 'error');
        }
    }

    initModules() {
        try {
            const initPromises = [];

            if (typeof NewSearchModule !== 'undefined') {
                if (!window.newSearchModule) {
                    this.modules.search = new NewSearchModule();
                    window.newSearchModule = this.modules.search;
                } else {
                    this.modules.search = window.newSearchModule;
                }
                initPromises.push(this.modules.search.init?.());
            }

            if (typeof WallpaperModule !== 'undefined') {
                this.modules.wallpaper = new WallpaperModule();
                initPromises.push(this.modules.wallpaper.init?.());
            }

            if (typeof GreetingModule !== 'undefined') {
                this.modules.greeting = new GreetingModule();
                initPromises.push(this.modules.greeting.init?.());
            }

            if (typeof OptimizedNavigation !== 'undefined') {
                this.modules.navigation = new OptimizedNavigation();
                window.optimizedNavigation = this.modules.navigation;
                initPromises.push(this.modules.navigation.init?.());
            }

            if (typeof FooterModule !== 'undefined') {
                this.modules.footer = new FooterModule();
                initPromises.push(this.modules.footer.init?.());
            }

            if (typeof WeatherModule !== 'undefined') {
                this.modules.weather = new WeatherModule();
                initPromises.push(this.modules.weather.init?.());
            }

            if (typeof AnnouncementModule !== 'undefined') {
                if (!window.announcementModule) {
                    this.modules.announcement = new AnnouncementModule();
                    window.announcementModule = this.modules.announcement;
                } else {
                    this.modules.announcement = window.announcementModule;
                }
            }

            if (typeof AboutModule !== 'undefined') {
                if (!window.aboutModule) {
                    this.modules.about = new AboutModule();
                    window.aboutModule = this.modules.about;
                    this.modules.about.init(); // AboutModule 需要手动初始化
                } else {
                    this.modules.about = window.aboutModule;
                }
            }

            // 等待所有模块初始化完成（静默失败）
            Promise.all(initPromises.map(p => p?.catch(() => {}))).then(() => {
                console.log('所有模块初始化完成');
            });

        } catch (error) {
            console.error('模块初始化失败:', error);
            this.showToast('部分模块初始化失败', 'warning');
        }
    }

    initDependentComponents() {
        try {
            if (typeof Navbar !== 'undefined') {
                this.components.navbar = new Navbar();
            }
        } catch (error) {
            console.error('依赖组件初始化失败:', error);
        }
    }

    // 全局错误处理
    setupErrorHandling() {
        const shouldIgnore = (message) => {
            const m = String(message || '');
            return m === 'Script error.' || m === 'null' || m === 'undefined' || m.trim() === '';
        };

        const handleError = (event) => {
            const msg = event.message || (event.error && event.error.message) || '';
            if (shouldIgnore(msg)) return;
            const error = event.error || event.reason;
            const errorMessage = error?.message || msg || '未知错误';
            if (shouldIgnore(errorMessage)) return;
            console.error('应用错误:', errorMessage);
            if (!document.hidden) this.showToast('页面遇到问题，建议刷新页面', 'error');
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleError);
    }

    initStorage() {
        if (typeof Storage === 'undefined') {
            console.error('浏览器不支持localStorage');
            this.showToast('浏览器不支持本地存储，部分功能可能受限', 'warning');
            return;
        }
        this.initDefaultData();
    }

    initDefaultData() {
        if (!Storage.get('first_visit_time')) {
            Storage.set('first_visit_time', new Date().toISOString());
        }
        this.updateVisitStats();
    }

    updateVisitStats() {
        try {
            let visitCount = Storage.get('visit_count') || 0;
            visitCount++;
            Storage.set('visit_count', visitCount);
            Storage.set('last_visit_time', new Date().toISOString());
        } catch (error) {
            console.warn('更新访问统计失败:', error);
        }
    }

    setupGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showSearch();
            }
            if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
                e.preventDefault();
                this.refreshPageWithAnimation();
            }
        });
        window.addEventListener('online', () => this.showToast('网络已连接', 'success'));
        window.addEventListener('offline', () => this.showToast('网络已断开，部分功能可能受限', 'warning'));
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.refreshOnVisibility();
        });
    }

    refreshOnVisibility() {
        if (this.modules.greeting && this.modules.greeting.updateDateTime) {
            this.modules.greeting.updateDateTime();
        }
        const now = Date.now();
        if (this.lastWeatherUpdate && (now - this.lastWeatherUpdate > 10 * 60 * 1000)) {
            if (this.modules.weather && this.modules.weather.loadWeatherData) {
                this.modules.weather.loadWeatherData();
                this.lastWeatherUpdate = now;
            }
        }
    }

    registerModal(modal) {
        if (!modal || typeof modal.hide !== 'function') return;
        if (!this.activeModals.includes(modal)) {
            this.activeModals.push(modal);
            if (this.activeModals.length > 1) {
                const previousModal = this.activeModals[this.activeModals.length - 2];
                if (previousModal && previousModal.hide) previousModal.hide();
            }
            if (this.components.sidebar && this.components.sidebar.isVisible && this.components.sidebar.isVisible()) {
                this.components.sidebar.hide();
            }
        }
    }

    unregisterModal(modal) {
        const index = this.activeModals.indexOf(modal);
        if (index > -1) this.activeModals.splice(index, 1);
    }

    closeAllModals() {
        this.activeModals.forEach(modal => {
            if (modal && typeof modal.hide === 'function') {
                try { modal.hide(); } catch (error) { console.error('关闭模态框失败:', error); }
            }
        });
        this.activeModals = [];

        if (this.components.sidebar?.isVisible?.()) this.components.sidebar.hide();
        if (this.components.navbar?.hideMusicPlayer) this.components.navbar.hideMusicPlayer();
        if (this.modules.search?.isModalOpen && this.modules.search.hide) this.modules.search.hide();
        this.hideNotebookModal();
        if (window.walineFeedback?.isVisible) window.walineFeedback.hide();
    }

    showToast(message, type = 'info') {
        window.toast.show(message, type);
    }

    getVisitStats() {
        const visitCount = Storage.get('visit_count') || 0;
        const firstVisitTime = Storage.get('first_visit_time');
        const lastVisitTime = Storage.get('last_visit_time');
        return {
            count: visitCount,
            firstVisit: firstVisitTime ? new Date(firstVisitTime) : null,
            lastVisit: lastVisitTime ? new Date(lastVisitTime) : null,
            formatted: `访问 ${visitCount} 次`
        };
    }

    updateAnnouncement(newContent) {
        if (!this.modules.announcement || !newContent) return;
        this.modules.announcement.updateAnnouncement(newContent);
    }

    refreshWallpaper() {
        if (!this.modules.wallpaper) {
            this.showToast('壁纸模块未初始化', 'warning');
            return;
        }
        this.modules.wallpaper.refreshWallpaper();
        this.showToast('正在刷新壁纸...', 'info');
    }

    refreshPageWithAnimation() {
        this.showToast('正在刷新页面数据...', 'info');
        document.body.style.opacity = '0.8';
        document.body.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            this.refreshAllModules();
            setTimeout(() => {
                document.body.style.opacity = '1';
                this.showToast('页面刷新完成', 'success');
            }, 500);
        }, 300);
    }

    toggleSidebar() {
        if (this.components.sidebar && this.components.sidebar.toggle) {
            this.components.sidebar.toggle();
        }
    }

    showSidebar() {
        if (this.components.sidebar && this.components.sidebar.show) {
            this.components.sidebar.show();
        }
    }

    hideSidebar() {
        if (this.components.sidebar && this.components.sidebar.hide) {
            this.components.sidebar.hide();
        }
    }

    showSearch() {
        if (this.modules.search && this.modules.search.showModal) {
            this.modules.search.showModal();
        } else {
            this.showToast('搜索功能暂不可用', 'warning');
        }
    }

    showAnnouncement() {
        if (this.modules.announcement && this.modules.announcement.showModal) {
            this.modules.announcement.showModal();
        } else {
            this.showToast('公告功能暂不可用', 'warning');
        }
    }

    showWeather() {
        if (this.modules.weather && typeof this.modules.weather.showModal === 'function') {
            this.modules.weather.showModal();
        } else {
            console.error('天气模块未正确初始化');
            this.showToast('天气功能暂不可用', 'warning');
        }
    }

    showAbout() {
        if (this.modules.about && this.modules.about.show) {
            this.modules.about.show();
        } else {
            this.showToast('关于功能暂不可用', 'warning');
        }
    }

    toggleMusicPlayer() {
        if (this.components.navbar && this.components.navbar.toggleMusicPlayer) {
            this.components.navbar.toggleMusicPlayer();
        } else {
            this.showToast('音乐播放器暂不可用', 'warning');
        }
    }

    refreshAllModules() {
        this.showToast('开始刷新所有模块', 'info');

        if (this.modules.wallpaper && this.modules.wallpaper.refreshWallpaper) {
            this.modules.wallpaper.refreshWallpaper().catch(err => {
                console.error('壁纸刷新失败:', err);
            });
        }

        if (this.modules.weather && this.modules.weather.loadWeatherData) {
            this.modules.weather.loadWeatherData().catch(err => {
                console.error('天气刷新失败:', err);
            });
        }

        if (this.modules.announcement && this.modules.announcement.loadAnnouncements) {
            this.modules.announcement.loadAnnouncements();
        }

        if (this.components.sidebar) {
            if (this.components.sidebar.loadWallpaperUserInfo) {
                this.components.sidebar.loadWallpaperUserInfo();
            }
            if (this.components.sidebar.loadDailyQuote) {
                this.components.sidebar.loadDailyQuote();
            }
        }

        setTimeout(() => {
            this.showToast('所有模块已刷新', 'success');
        }, 1500);
    }

    resetApp() {
        if (!confirm('确定要重置应用状态吗？这将清除所有临时数据，但不会删除您的个人配置。')) return;

        this.closeAllModals();

        const keysToRemove = [
            'sidebar_categories_state',
            'last_wallpaper_update',
            'musicPlayer_volume',
            'musicPlayer_playbackSpeed',
            'musicPlayer_playMode',
            'musicPlayer_playState',
            'musicPlayer_lyricsMode'
        ];

        keysToRemove.forEach(key => {
            Storage.remove(key);
        });

        setTimeout(() => {
            this.refreshAllModules();
        }, 500);

        this.showToast('应用状态已重置', 'success');
    }

    destroy() {
        this.closeAllModals();
        Object.entries(this.components).forEach(([name, component]) => {
            if (component && typeof component.destroy === 'function') {
                try { component.destroy(); } catch (error) { console.error(`销毁组件 ${name} 失败:`, error); }
            }
        });
        Object.entries(this.modules).forEach(([name, module]) => {
            if (module && typeof module.destroy === 'function') {
                try { module.destroy(); } catch (error) { console.error(`销毁模块 ${name} 失败:`, error); }
            }
        });
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
    }
}

// 单例启动
if (!window.app) {
    window.app = new App();
}

// 如果尚未启动，再次尝试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.app && !window.app.isInitialized) {
            window.app.init();
        }
    });
}

window.getApp = function() {
    return window.app;
};