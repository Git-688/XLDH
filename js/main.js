/* main.js - 精简版（修复模块类名错误：WallpaperModule -> CarouselModule，CompactSidebar -> ModernSidebar） */
class App {
    constructor() {
        if (window.Starlink?.app) return window.Starlink.app;

        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this.lastWeatherUpdate = null;
        this.notebookModalHideRef = null;
        this._cleanupErrorHandler = null;
        this._storageListenerBound = false;
        this._navPollingTimer = null;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }

        if (!window.Starlink) window.Starlink = {};
        window.Starlink.app = this;
        window.app = this;
    }

    setupGlobalErrorHandling() {
        if (this._cleanupErrorHandler) return;
        this._cleanupErrorHandler = Utils.setupGlobalErrorHandler?.() || null;
    }

    showErrorFallback(message = '页面加载失败，请刷新重试') {
        if (document.getElementById('error-fallback-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'error-fallback-overlay';
        overlay.style.cssText = `
            position:fixed;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;
            align-items:center;justify-content:center;background:var(--bg-primary,#fff);
            z-index:99999;padding:20px;text-align:center;
        `;
        overlay.innerHTML = `
            <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
            <h2 style="font-size:18px;margin-bottom:8px;color:var(--text-primary,#1e293b);">${Utils.escapeHtml?.(message) || message}</h2>
            <p style="font-size:13px;color:var(--text-secondary,#64748b);margin-bottom:20px;">请检查网络连接后刷新页面</p>
            <button onclick="window.location.reload()" style="padding:10px 24px;background:var(--primary-color,#4361ee);color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;">刷新页面</button>
        `;
        document.body.appendChild(overlay);
    }

    hideErrorFallback() {
        document.getElementById('error-fallback-overlay')?.remove();
    }

    async loadNotebookData() {
        const listEl = document.getElementById('notebook-list');
        if (!listEl) return;
        listEl.innerHTML = '<div class="skeleton-notebook-item"></div>'.repeat(5);
        try {
            const response = await Utils.safeFetch?.('https://api.xjdh688.ccwu.cc/notebook', { timeout: 8000 });
            if (!response) throw new Error('Fetch failed');
            const data = await response.json();
            const items = data.items || [];
            if (!items.length) {
                listEl.innerHTML = '<div class="empty">暂无笔记记录<br><small style="color:#999">请稍后刷新页面或联系管理员</small></div>';
                return;
            }
            items.sort((a, b) => a.numid - b.numid);
            listEl.innerHTML = items.map(item => `
                <div class="notebook-item">
                    <div class="notebook-header">
                        <span class="notebook-id">#${item.numid}</span>
                        <span class="notebook-time"><i class="far fa-calendar-alt"></i> ${Utils.escapeHtml?.(item.time) || item.time}</span>
                    </div>
                    <div class="notebook-title">${Utils.escapeHtml?.(item.title) || item.title}</div>
                    <div class="notebook-content">${(Utils.escapeHtml?.(item.words) || item.words).replace(/\n/g,'<br>')}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('加载星聚笔记失败:', error);
            listEl.innerHTML = `<div class="error">加载失败：${error.message}<br><small>可尝试刷新页面</small></div>`;
        }
    }

    showNotebookModal() {
        const modalEl = document.getElementById('notebookModal');
        if (!modalEl) return;
        if (!this.notebookModalHideRef) {
            this.notebookModalHideRef = {
                hide: () => this.hideNotebookModal(),
                isVisible: () => modalEl.classList.contains('active')
            };
        }
        this.registerModal(this.notebookModalHideRef);
        modalEl.classList.add('active');
        this.loadNotebookData();
    }

    hideNotebookModal() {
        const modalEl = document.getElementById('notebookModal');
        if (!modalEl) return;
        modalEl.classList.remove('active');
        const onTransitionEnd = () => {
            modalEl.removeEventListener('transitionend', onTransitionEnd);
            if (this.notebookModalHideRef) this.unregisterModal(this.notebookModalHideRef);
        };
        modalEl.addEventListener('transitionend', onTransitionEnd, { once: true });
        setTimeout(onTransitionEnd, 400);
    }

    initNotebookModalEvents() {
        const modal = document.getElementById('notebookModal');
        const closeBtn = modal?.querySelector('.feedback-modal-close');
        if (!modal) return;
        modal.addEventListener('click', (e) => { if (e.target === modal) this.hideNotebookModal(); });
        closeBtn?.addEventListener('click', () => this.hideNotebookModal());
    }

    initImageFallbackHandler() {
        document.addEventListener('error', (e) => {
            const img = e.target;
            if (img.tagName !== 'IMG' || !img.classList.contains('js-img-fallback')) return;
            e.preventDefault();
            const fbType = img.dataset.fallbackType;
            const parent = img.parentElement;
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
                const defaultSvg = img.dataset.defaultSvg || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM0QTVGOTkiLz4KPHBhdGggZD0iTTQwIDQ0QzQ2LjYyODQgNDQgNTIgMzguNjI4NCA1MiAzMkM1MiAyNS4zNzE2IDQ2LjYyODQgMjAgNDAgMjBDMzMuMzcxNiAyMCAyOCAyNS4zNzE2IDI4IDMyQzI4IDM4LjYyODQgMzMuMzcxNiA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik40MCA1MEMzMCA1MCAxNiA1NCAxNiA2NFY4MEg2NFY1NkM2NCA1NCA1MCA1MCA0MCA1MFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
                img.src = defaultSvg;
            } else if (fbType === 'icon') {
                if (!parent.querySelector('i.fa-link')) {
                    img.style.display = 'none';
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-link';
                    parent.appendChild(icon);
                }
            }
        }, true);
    }

    initServiceWorkerMessageListener() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.type === 'NAV_UPDATED') {
                    this.refreshNavigationIfReady();
                }
            });
        }
    }

    setupNavRefreshListener() {
        if (this._storageListenerBound) return;
        this._storageListenerBound = true;

        window.addEventListener('storage', (e) => {
            if (e.key === 'nav_refresh_required' && e.newValue) this.refreshNavigationIfReady();
        });
        document.addEventListener('navRefreshRequested', () => this.refreshNavigationIfReady());

        let lastRefreshMark = localStorage.getItem('nav_refresh_required') || '';
        this._navPollingTimer = setInterval(() => {
            if (document.hidden) return;
            const currentMark = localStorage.getItem('nav_refresh_required') || '';
            if (currentMark !== lastRefreshMark && currentMark) {
                lastRefreshMark = currentMark;
                this.refreshNavigationIfReady();
            }
        }, 10000);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this._navPollingTimer) {
                    clearInterval(this._navPollingTimer);
                    this._navPollingTimer = null;
                }
            } else {
                const currentMark = localStorage.getItem('nav_refresh_required') || '';
                if (currentMark !== lastRefreshMark && currentMark) {
                    lastRefreshMark = currentMark;
                    this.refreshNavigationIfReady();
                }
                if (!this._navPollingTimer) {
                    this._navPollingTimer = setInterval(() => {
                        if (document.hidden) return;
                        const mark = localStorage.getItem('nav_refresh_required') || '';
                        if (mark !== lastRefreshMark && mark) {
                            lastRefreshMark = mark;
                            this.refreshNavigationIfReady();
                        }
                    }, 10000);
                }
            }
        });
    }

    refreshNavigationIfReady() {
        if (window.optimizedNavigation?.refreshCurrentSubcategory) {
            window.optimizedNavigation.refreshCurrentSubcategory().catch(err => console.warn('[App] 刷新导航失败:', err));
        } else {
            setTimeout(() => {
                if (window.optimizedNavigation?.refreshCurrentSubcategory) {
                    window.optimizedNavigation.refreshCurrentSubcategory().catch(err => console.warn('[App] 延迟刷新导航失败:', err));
                } else if (!document.hidden) {
                    window.location.reload();
                }
            }, 1500);
        }
    }

    initPartnerModule() {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.partner) {
            if (typeof PartnerModule !== 'undefined') {
                window.Starlink.partner = new PartnerModule();
            } else {
                const checkPartner = () => {
                    if (typeof PartnerModule !== 'undefined') {
                        window.Starlink.partner = new PartnerModule();
                    } else {
                        setTimeout(checkPartner, 200);
                    }
                };
                checkPartner();
            }
        }
        window.partnerModule = window.Starlink.partner;
    }

    init() {
        if (this.isInitialized) return;
        this.setupGlobalErrorHandling();
        try {
            this.initImageFallbackHandler();
            this.initCoreComponents();
            this.initModules();
            this.initDependentComponents();
            this.setupGlobalEvents();
            this.initNotebookModalEvents();
            this.initServiceWorkerMessageListener();
            this.setupNavRefreshListener();
            this.initPartnerModule();
            this.isInitialized = true;
            this.hideErrorFallback();
            window.showNotebookModal = this.showNotebookModal.bind(this);
            window.hideNotebookModal = this.hideNotebookModal.bind(this);
        } catch (error) {
            console.error('[App] 初始化失败:', error);
            this.showErrorFallback('应用初始化失败，请刷新重试');
            this.isInitialized = true;
        }
    }

    initCoreComponents() {
        try {
            // 侧边栏组件实际类名为 ModernSidebar（在 sidebar.js 中定义）
            if (typeof ModernSidebar !== 'undefined') {
                if (!window.sidebar?.isInitialized) {
                    this.components.sidebar = new ModernSidebar();
                    // ModernSidebar 的 init 在构造函数中自动调用，无需额外 init
                } else {
                    this.components.sidebar = window.sidebar;
                }
            } else if (typeof CompactSidebar !== 'undefined') {
                // 兼容旧名称（如果存在）
                if (!window.sidebar?.isInitialized) {
                    this.components.sidebar = new CompactSidebar();
                    this.components.sidebar.init?.().catch(error => {
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
            const moduleMap = {
                search: { cls: NewSearchModule, get: () => window.newSearchModule },
                wallpaper: { cls: CarouselModule, get: () => this.modules.wallpaper },  // 修复：WallpaperModule -> CarouselModule
                greeting: { cls: GreetingModule, get: () => this.modules.greeting },
                navigation: { cls: OptimizedNavigation, get: () => this.modules.navigation, set: (m) => { window.optimizedNavigation = m; } },
                weather: { cls: WeatherModule, get: () => this.modules.weather },
                announcement: { cls: AnnouncementModule, get: () => window.announcementModule },
                about: { cls: AboutModule, get: () => window.aboutModule }
            };

            for (const [key, conf] of Object.entries(moduleMap)) {
                if (typeof conf.cls === 'undefined') continue;
                if (!window[key] && !conf.get()) {
                    const instance = new conf.cls();
                    if (conf.set) conf.set(instance);
                    if (key === 'announcement' || key === 'about') {
                        window[key + 'Module'] = instance;
                    }
                    this.modules[key] = instance;
                } else {
                    this.modules[key] = conf.get() || window[key];
                }
                if (this.modules[key]?.init && typeof this.modules[key].init === 'function') {
                    initPromises.push(this.modules[key].init());
                }
            }

            Promise.all(initPromises.map(p => p?.catch(err => console.warn(`模块初始化警告:`, err)))).then(() => {
                // 完成
            });
        } catch (error) {
            console.error('模块初始化失败:', error);
            this.showToast('部分模块初始化失败', 'warning');
        }
    }

    initDependentComponents() {
        try {
            if (typeof Navbar !== 'undefined' && !this.components.navbar) {
                this.components.navbar = new Navbar();
            }
        } catch (error) {
            console.error('依赖组件初始化失败:', error);
        }
    }

    setupGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); this.showSearch(); }
            if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
                e.preventDefault();
                this.refreshPageWithAnimation();
            }
        });
        window.addEventListener('online', () => this.showToast('网络已连接', 'success'));
        window.addEventListener('offline', () => {
            this.showToast('网络已断开，部分功能可能受限', 'warning');
            if (!document.getElementById('offline-indicator')) {
                const indicator = document.createElement('div');
                indicator.id = 'offline-indicator';
                indicator.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--error-color,#ef4444);color:white;padding:8px 16px;border-radius:8px;font-size:12px;z-index:9999;';
                indicator.textContent = '⚠️ 网络已断开，部分功能不可用';
                document.body.appendChild(indicator);
            }
        });
        window.addEventListener('online', () => {
            document.getElementById('offline-indicator')?.remove();
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.refreshOnVisibility();
        });
    }

    refreshOnVisibility() {
        if (this.modules.greeting?.updateDateTime) this.modules.greeting.updateDateTime();
        const now = Date.now();
        if (this.lastWeatherUpdate && (now - this.lastWeatherUpdate > 10 * 60 * 1000)) {
            if (this.modules.weather?.loadWeatherData) {
                this.modules.weather.loadWeatherData();
                this.lastWeatherUpdate = now;
            }
        }
    }

    registerModal(modal) {
        if (!modal || typeof modal.hide !== 'function') return;
        if (!this.activeModals.includes(modal)) {
            if (this.activeModals.length > 0) {
                const previous = this.activeModals[this.activeModals.length - 1];
                previous.hide();
            }
            this.activeModals.push(modal);
            if (this.components.sidebar?.isVisible?.()) this.components.sidebar.hide();
        }
    }

    unregisterModal(modal) {
        const index = this.activeModals.indexOf(modal);
        if (index > -1) this.activeModals.splice(index, 1);
    }

    closeAllModals() {
        const modals = [...this.activeModals];
        modals.forEach(modal => { if (modal && typeof modal.hide === 'function') modal.hide(); });
        this.activeModals = [];
        if (this.components.sidebar?.isVisible?.()) this.components.sidebar.hide();
        if (this.components.navbar?.hideMusicPlayer) this.components.navbar.hideMusicPlayer();
        if (this.modules.search?.isModalOpen && this.modules.search.hide) this.modules.search.hide();
        this.hideNotebookModal();
        if (window.walineFeedback?.isVisible) window.walineFeedback.hide();
        if (window.partnerModule?.isVisible) window.partnerModule.close();
    }

    showToast(message, type = 'info') {
        window.toast?.show(message, type);
    }

    updateAnnouncement(newContent) {
        if (this.modules.announcement) this.modules.announcement.updateAnnouncement?.(newContent);
    }

    refreshWallpaper() {
        if (!this.modules.wallpaper) { this.showToast('壁纸模块未初始化', 'warning'); return; }
        this.modules.wallpaper.refreshWallpaper?.();
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

    toggleSidebar() { this.components.sidebar?.toggle?.(); }
    showSidebar() { this.components.sidebar?.show?.(); }
    hideSidebar() { this.components.sidebar?.hide?.(); }

    showSearch() {
        if (this.modules.search?.showModal) {
            this.modules.search.showModal();
        } else {
            this.showToast('搜索功能暂不可用', 'warning');
        }
    }

    showAnnouncement() {
        if (this.modules.announcement?.showModal) {
            this.modules.announcement.showModal();
        } else {
            this.showToast('公告功能暂不可用', 'warning');
        }
    }

    showWeather() {
        if (this.modules.weather?.showModal) {
            this.modules.weather.showModal();
        } else {
            console.error('天气模块未正确初始化');
            this.showToast('天气功能暂不可用', 'warning');
        }
    }

    showAbout() {
        if (this.modules.about?.show) {
            this.modules.about.show();
        } else {
            this.showToast('关于功能暂不可用', 'warning');
        }
    }

    toggleMusicPlayer() {
        if (this.components.navbar?.toggleMusicPlayer) {
            this.components.navbar.toggleMusicPlayer();
        } else {
            this.showToast('音乐播放器暂不可用', 'warning');
        }
    }

    refreshAllModules() {
        this.showToast('开始刷新所有模块', 'info');
        if (this.modules.wallpaper?.refreshWallpaper) this.modules.wallpaper.refreshWallpaper().catch(err => console.error('壁纸刷新失败:', err));
        if (this.modules.weather?.loadWeatherData) this.modules.weather.loadWeatherData().catch(err => console.error('天气刷新失败:', err));
        if (this.modules.announcement?.loadAnnouncements) this.modules.announcement.loadAnnouncements();
        if (this.components.sidebar) {
            if (this.components.sidebar.loadWallpaperUserInfo) this.components.sidebar.loadWallpaperUserInfo();
            if (this.components.sidebar.loadDailyQuote) this.components.sidebar.loadDailyQuote();
        }
        this.refreshNavigationIfReady();
        setTimeout(() => this.showToast('所有模块已刷新', 'success'), 1500);
    }

    resetApp() {
        if (!confirm('确定要重置应用状态吗？这将清除所有临时数据，但不会删除您的个人配置。')) return;
        this.closeAllModals();
        const keysToRemove = ['sidebar_categories_state', 'last_wallpaper_update', 'musicPlayer_volume', 'musicPlayer_playbackSpeed', 'musicPlayer_playMode', 'musicPlayer_playState', 'musicPlayer_lyricsMode'];
        keysToRemove.forEach(key => Storage.remove?.(key));
        setTimeout(() => this.refreshAllModules(), 500);
        this.showToast('应用状态已重置', 'success');
    }

    destroy() {
        this.closeAllModals();
        if (this._cleanupErrorHandler) { this._cleanupErrorHandler(); this._cleanupErrorHandler = null; }
        if (this._navPollingTimer) { clearInterval(this._navPollingTimer); this._navPollingTimer = null; }
        Object.entries(this.components).forEach(([name, component]) => {
            if (component && typeof component.destroy === 'function') try { component.destroy(); } catch(e) { console.error(`销毁组件 ${name} 失败:`, e); }
        });
        Object.entries(this.modules).forEach(([name, module]) => {
            if (module && typeof module.destroy === 'function') try { module.destroy(); } catch(e) { console.error(`销毁模块 ${name} 失败:`, e); }
        });
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this._storageListenerBound = false;
    }
}

// 单例初始化
if (!window.Starlink) window.Starlink = {};
if (!window.Starlink.app) {
    window.Starlink.app = new App();
}
window.app = window.Starlink.app;

// 确保 DOM 加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (!window.app.isInitialized) window.app.init(); });
} else {
    if (!window.app.isInitialized) window.app.init();
}

window.getApp = () => window.app;