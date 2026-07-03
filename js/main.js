/* main.js - 增加全局错误边界和统一错误处理，监听导航刷新信号，轮询间隔10秒 */
class App {
    constructor() {
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this.lastWeatherUpdate = null;
        this.notebookModalHideRef = null;
        this._cleanupErrorHandler = null;
        this._storageListenerBound = false;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => { this.init(); });
        } else {
            this.init();
        }
    }

    // ===== 设置全局错误处理 =====
    setupGlobalErrorHandling() {
        if (this._cleanupErrorHandler) return;
        this._cleanupErrorHandler = Utils.setupGlobalErrorHandler();
        console.log('[App] 全局错误处理已启用');
    }

    // ===== 显示友好错误降级 UI =====
    showErrorFallback(message = '页面加载失败，请刷新重试') {
        const container = document.querySelector('.main-content');
        if (!container) return;
        if (document.getElementById('error-fallback-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'error-fallback-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary, #ffffff);
            z-index: 99999;
            padding: 20px;
            text-align: center;
        `;
        overlay.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h2 style="font-size: 18px; margin-bottom: 8px; color: var(--text-primary, #1e293b);">${Utils.escapeHtml(message)}</h2>
            <p style="font-size: 13px; color: var(--text-secondary, #64748b); margin-bottom: 20px;">请检查网络连接后刷新页面</p>
            <button onclick="window.location.reload()" style="
                padding: 10px 24px;
                background: var(--primary-color, #4361ee);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
            ">刷新页面</button>
        `;
        document.body.appendChild(overlay);
    }

    // ===== 隐藏错误降级 UI =====
    hideErrorFallback() {
        const overlay = document.getElementById('error-fallback-overlay');
        if (overlay) overlay.remove();
    }

    async loadNotebookData() {
        const listEl = document.getElementById('notebook-list');
        if (!listEl) return;
        listEl.innerHTML = '<div class="skeleton-notebook-item"></div>'.repeat(5);

        try {
            const response = await Utils.safeFetch('https://api.xjdh688.ccwu.cc/notebook', { timeout: 8000 });
            const data = await response.json();
            const items = data.items || [];
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
            if (this.notebookModalHideRef) {
                this.unregisterModal(this.notebookModalHideRef);
            }
        };
        modalEl.addEventListener('transitionend', onTransitionEnd, { once: true });
        setTimeout(onTransitionEnd, 400);
    }

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
                if (event.data && event.data.type === 'NAV_UPDATED') {
                    console.log('[App] 收到导航更新通知，刷新导航数据...');
                    if (window.optimizedNavigation && typeof window.optimizedNavigation.refreshCurrentSubcategory === 'function') {
                        window.optimizedNavigation.refreshCurrentSubcategory();
                    } else {
                        console.warn('[App] 导航模块未就绪，将刷新页面以应用更新');
                        setTimeout(() => {
                            if (!document.hidden) {
                                window.location.reload();
                            }
                        }, 3000);
                    }
                }
            });
            console.log('[App] Service Worker 消息监听已注册');
        }
    }

    // ===== 监听 localStorage 变化，接收导航刷新信号（轮询间隔改为10秒） =====
    setupNavRefreshListener() {
        if (this._storageListenerBound) return;
        this._storageListenerBound = true;

        const handleStorageChange = (e) => {
            if (e.key === 'nav_refresh_required' && e.newValue) {
                console.log('[App] 收到导航刷新信号 (storage event)，刷新当前子分类');
                this.refreshNavigationIfReady();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        document.addEventListener('navRefreshRequested', () => {
            console.log('[App] 收到导航刷新信号 (custom event)，刷新当前子分类');
            this.refreshNavigationIfReady();
        });

        // ★★★ 修改：轮询间隔从 3000 改为 10000 毫秒（10秒）★★★
        let lastRefreshMark = localStorage.getItem('nav_refresh_required') || '';
        this._navPollingTimer = setInterval(() => {
            if (document.hidden) return;
            const currentMark = localStorage.getItem('nav_refresh_required') || '';
            if (currentMark !== lastRefreshMark && currentMark) {
                lastRefreshMark = currentMark;
                console.log('[App] 轮询检测到导航刷新信号，刷新当前子分类');
                this.refreshNavigationIfReady();
            }
        }, 10000); // 10秒

        // ===== 页面可见性变化时优化轮询 =====
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 页面隐藏时，清除轮询以减少资源消耗
                if (this._navPollingTimer) {
                    clearInterval(this._navPollingTimer);
                    this._navPollingTimer = null;
                    console.log('[App] 页面隐藏，暂停导航刷新轮询');
                }
            } else {
                // 页面可见时，立即检查一次刷新信号，并重新启动轮询
                console.log('[App] 页面可见，恢复导航刷新轮询');
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
                            console.log('[App] 轮询检测到导航刷新信号，刷新当前子分类');
                            this.refreshNavigationIfReady();
                        }
                    }, 10000);
                }
            }
        });

        console.log('[App] 导航刷新监听已设置（轮询间隔10秒）');
    }

    refreshNavigationIfReady() {
        if (window.optimizedNavigation && typeof window.optimizedNavigation.refreshCurrentSubcategory === 'function') {
            window.optimizedNavigation.refreshCurrentSubcategory().catch(err => {
                console.warn('[App] 刷新导航失败:', err);
            });
        } else {
            console.warn('[App] 导航模块未就绪，延迟重试...');
            setTimeout(() => {
                if (window.optimizedNavigation && typeof window.optimizedNavigation.refreshCurrentSubcategory === 'function') {
                    window.optimizedNavigation.refreshCurrentSubcategory().catch(err => {
                        console.warn('[App] 延迟刷新导航失败:', err);
                    });
                } else {
                    console.warn('[App] 导航模块始终未就绪，刷新页面');
                    if (!document.hidden) {
                        window.location.reload();
                    }
                }
            }, 1500);
        }
    }

    init() {
        if (this.isInitialized) return;

        this.setupGlobalErrorHandling();

        try {
            this.initImageFallbackHandler();
            this.initStorage();
            this.initCoreComponents();
            this.initModules();
            this.initDependentComponents();
            this.setupGlobalEvents();
            this.initNotebookModalEvents();
            this.initFloatingButtonsEffect();
            this.initServiceWorkerMessageListener();
            this.setupNavRefreshListener();
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
                    this.modules.about.init();
                } else {
                    this.modules.about = window.aboutModule;
                }
            }

            Promise.all(initPromises.map(p => p?.catch((err) => {
                console.warn('模块初始化警告:', err);
                return null;
            }))).then(() => {
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
        window.addEventListener('offline', () => {
            this.showToast('网络已断开，部分功能可能受限', 'warning');
            if (!document.getElementById('offline-indicator')) {
                const indicator = document.createElement('div');
                indicator.id = 'offline-indicator';
                indicator.style.cssText = `
                    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
                    background: var(--error-color, #ef4444); color: white;
                    padding: 8px 16px; border-radius: 8px;
                    font-size: 12px; z-index: 9999;
                `;
                indicator.textContent = '⚠️ 网络已断开，部分功能不可用';
                document.body.appendChild(indicator);
            }
        });
        window.addEventListener('online', () => {
            const indicator = document.getElementById('offline-indicator');
            if (indicator) indicator.remove();
        });
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
            if (this.activeModals.length > 0) {
                const previous = this.activeModals[this.activeModals.length - 1];
                previous.hide();
            }
            this.activeModals.push(modal);
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
        const modals = [...this.activeModals];
        modals.forEach(modal => {
            if (modal && typeof modal.hide === 'function') {
                modal.hide();
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
            this.modules.wallpaper.refreshWallpaper().catch(err => console.error('壁纸刷新失败:', err));
        }
        if (this.modules.weather && this.modules.weather.loadWeatherData) {
            this.modules.weather.loadWeatherData().catch(err => console.error('天气刷新失败:', err));
        }
        if (this.modules.announcement && this.modules.announcement.loadAnnouncements) {
            this.modules.announcement.loadAnnouncements();
        }
        if (this.components.sidebar) {
            if (this.components.sidebar.loadWallpaperUserInfo) this.components.sidebar.loadWallpaperUserInfo();
            if (this.components.sidebar.loadDailyQuote) this.components.sidebar.loadDailyQuote();
        }
        this.refreshNavigationIfReady();
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
        keysToRemove.forEach(key => Storage.remove(key));
        setTimeout(() => this.refreshAllModules(), 500);
        this.showToast('应用状态已重置', 'success');
    }

    destroy() {
        this.closeAllModals();
        if (this._cleanupErrorHandler) {
            this._cleanupErrorHandler();
            this._cleanupErrorHandler = null;
        }
        if (this._navPollingTimer) {
            clearInterval(this._navPollingTimer);
            this._navPollingTimer = null;
        }
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
        this._storageListenerBound = false;
    }
}

if (!window.Starlink) window.Starlink = {};
if (!window.Starlink.app) {
    window.Starlink.app = new App();
}
window.app = window.Starlink.app;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.app && !window.app.isInitialized) {
            window.app.init();
        }
    });
} else {
    if (window.app && !window.app.isInitialized) {
        window.app.init();
    }
}
window.getApp = function() { return window.app; };