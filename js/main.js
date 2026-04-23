/**
 * 星链导航主应用程序（反馈模态框 + KaTeX v0.16.45 官方标准配置 + 增强版神木日记）
 */
class App {
    constructor() {
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this.lastWeatherUpdate = null;
        this.diaryModalHideRef = null;
        
        // ========== 神木日记增强配置 ==========
        this.DIARY_CONFIG = {
            API_BASE: 'https://cn.apihz.cn/api/cunchu/textzd.php',
            API_KEY: '4a7768de1cf2e0f41fc0a4005240c837',
            CONTAINER_ID: '10014221',
            PAGE_SIZE: 10,
            CACHE_TTL: 5 * 60 * 1000, // 5分钟内存缓存
        };

        this.diaryState = {
            items: [],           // 当前显示的日记列表
            page: 1,             // 当前页码
            hasMore: true,       // 是否还有更多
            loading: false,      // 是否正在加载
            cache: null,         // { data: [], timestamp, totalPages }
        };
        // ========================================
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    // ========== 增强版神木日记功能 ==========
    async loadDiaryBatch(reset = false) {
        const listEl = document.getElementById('diaryList');
        if (!listEl) return;

        if (reset) {
            this.diaryState.page = 1;
            this.diaryState.items = [];
            this.diaryState.hasMore = true;
            listEl.innerHTML = '';
        }

        if (!this.diaryState.hasMore || this.diaryState.loading) return;

        this.diaryState.loading = true;
        this._showDiaryLoading(listEl, reset);

        try {
            // 检查缓存（仅第一页）
            if (reset && this._isDiaryCacheValid()) {
                const cached = this.diaryState.cache;
                this.diaryState.items = [...cached.data];
                this.diaryState.hasMore = this.diaryState.page < cached.totalPages;
                this._renderDiaryList(listEl, this.diaryState.items);
                this.diaryState.loading = false;
                return;
            }

            // 计算当前页要请求的 ID 范围
            const startId = (this.diaryState.page - 1) * this.DIARY_CONFIG.PAGE_SIZE + 1;
            const endId = startId + this.DIARY_CONFIG.PAGE_SIZE - 1;
            
            const promises = [];
            for (let id = startId; id <= endId; id++) {
                promises.push(
                    fetch(`${this.DIARY_CONFIG.API_BASE}?id=${this.DIARY_CONFIG.CONTAINER_ID}&key=${this.DIARY_CONFIG.API_KEY}&numid=${id}`)
                        .then(res => res.json())
                        .catch(() => ({ code: 500 }))
                );
            }
            
            const results = await Promise.all(promises);
            const validItems = results
                .filter(item => item.code === 200 && item.title?.trim() && item.words?.trim())
                .map(item => ({
                    id: item.id || item.numid,
                    title: item.title.trim(),
                    time: item.time || '--',
                    content: item.words.trim(),
                    expanded: false
                }));

            if (validItems.length === 0) {
                this.diaryState.hasMore = false;
                if (reset) {
                    listEl.innerHTML = '<div class="diary-empty">📭 暂无日记记录</div>';
                }
            } else {
                this.diaryState.items = reset ? validItems : [...this.diaryState.items, ...validItems];
                this.diaryState.page++;
                this.diaryState.hasMore = validItems.length === this.DIARY_CONFIG.PAGE_SIZE;
                
                if (reset) {
                    this.diaryState.cache = {
                        data: this.diaryState.items,
                        timestamp: Date.now(),
                        totalPages: this.diaryState.hasMore ? this.diaryState.page + 1 : this.diaryState.page
                    };
                }
                
                this._renderDiaryList(listEl, this.diaryState.items);
            }
        } catch (error) {
            console.error('加载日记失败:', error);
            if (reset) {
                listEl.innerHTML = `
                    <div class="diary-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>加载失败：${error.message}</p>
                        <button class="diary-retry-btn" onclick="window.app.loadDiaryBatch(true)">重试</button>
                    </div>
                `;
            } else {
                window.toast.show('加载更多失败，请稍后重试', 'error');
            }
        } finally {
            this.diaryState.loading = false;
            this._removeDiaryLoading(listEl);
        }
    }

    _showDiaryLoading(container, isReset) {
        if (isReset) {
            container.innerHTML = `
                <div class="diary-skeleton">
                    ${Array(3).fill(0).map(() => `
                        <div class="diary-skeleton-item">
                            <div class="skeleton-header"></div>
                            <div class="skeleton-title"></div>
                            <div class="skeleton-content"></div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            const loader = document.createElement('div');
            loader.className = 'diary-load-more';
            loader.id = 'diaryLoadMoreIndicator';
            loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
            container.appendChild(loader);
        }
    }

    _removeDiaryLoading(container) {
        const indicator = document.getElementById('diaryLoadMoreIndicator');
        if (indicator) indicator.remove();
    }

    _isDiaryCacheValid() {
        const cache = this.diaryState.cache;
        return cache && (Date.now() - cache.timestamp) < this.DIARY_CONFIG.CACHE_TTL;
    }

    _renderDiaryList(container, items) {
        const existingLoader = document.getElementById('diaryLoadMoreIndicator');
        container.innerHTML = '';
        
        items.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = `diary-item ${item.expanded ? 'expanded' : ''}`;
            itemEl.dataset.index = index;
            itemEl.innerHTML = `
                <div class="diary-item-header">
                    <span class="diary-item-id">#${item.id}</span>
                    <span class="diary-item-time">${this.escapeHtml(item.time)}</span>
                </div>
                <div class="diary-item-title">${this.escapeHtml(item.title)}</div>
                <div class="diary-item-content">${this.escapeHtml(item.content)}</div>
                <div class="diary-item-footer">
                    <button class="diary-expand-btn">
                        <i class="fas fa-chevron-down"></i>
                        <span>展开</span>
                    </button>
                </div>
            `;
            
            const expandBtn = itemEl.querySelector('.diary-expand-btn');
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                item.expanded = !item.expanded;
                itemEl.classList.toggle('expanded');
                const icon = expandBtn.querySelector('i');
                const text = expandBtn.querySelector('span');
                if (item.expanded) {
                    icon.className = 'fas fa-chevron-up';
                    text.textContent = '收起';
                } else {
                    icon.className = 'fas fa-chevron-down';
                    text.textContent = '展开';
                }
            });
            
            container.appendChild(itemEl);
        });
        
        if (existingLoader) {
            container.appendChild(existingLoader);
        }
        
        this._setupDiaryInfiniteScroll(container);
    }

    _setupDiaryInfiniteScroll(container) {
        if (this.diaryScrollHandler) {
            container.removeEventListener('scroll', this.diaryScrollHandler);
        }
        
        this.diaryScrollHandler = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 50) {
                if (this.diaryState.hasMore && !this.diaryState.loading) {
                    this.loadDiaryBatch(false);
                }
            }
        };
        
        container.addEventListener('scroll', this.diaryScrollHandler);
    }

    showDiaryModal() {
        const modal = document.getElementById('diaryModal');
        if (!modal) return;
        
        modal.style.display = 'flex';
        if (!this.diaryModalHideRef) {
            this.diaryModalHideRef = { hide: this.hideDiaryModal.bind(this) };
        }
        this.registerModal(this.diaryModalHideRef);
        
        this.loadDiaryBatch(true);
    }

    hideDiaryModal() {
        const modal = document.getElementById('diaryModal');
        if (modal) modal.style.display = 'none';
        if (this.diaryModalHideRef) {
            this.unregisterModal(this.diaryModalHideRef);
        }
        const container = document.getElementById('diaryList');
        if (container && this.diaryScrollHandler) {
            container.removeEventListener('scroll', this.diaryScrollHandler);
        }
    }

    // ========== 原有日记相关方法（已整合，此处保留兼容） ==========
    // 原 DIARY_IDS 和旧 loadDiaryBatch 已替换，不再需要

    initDiaryModalEvents() {
        const modal = document.getElementById('diaryModal');
        const closeBtn = document.getElementById('diaryCloseBtn');
        
        if (!modal || !closeBtn) return;
        
        closeBtn.addEventListener('click', () => this.hideDiaryModal());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideDiaryModal();
        });
    }
    // =========================================

    // ========== 反馈模态框管理（官方标准配置）==========
    openFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (!modal) return;
        
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        if (!window.twikooFeedbackInited && typeof twikoo !== 'undefined') {
            twikoo.init({
                envId: 'https://twikoo688.netlify.app/.netlify/functions/twikoo',
                el: '#twikoo-feedback',
                lang: 'zh-CN',
                path: '/feedback',
                katex: {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                },
                onCommentLoaded: function() {
                    const container = document.getElementById('twikoo-feedback');
                    if (!container || typeof renderMathInElement === 'undefined') return;
                    renderMathInElement(container, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\(', right: '\\)', display: false },
                            { left: '\\[', right: '\\]', display: true }
                        ],
                        throwOnError: false
                    });
                }
            });
            window.twikooFeedbackInited = true;
        }
    }

    closeFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    initFeedbackModalEvents() {
        const modal = document.getElementById('feedbackModal');
        const closeBtn = document.querySelector('.feedback-modal-close');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeFeedbackModal();
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeFeedbackModal());
        }
    }

    // ========== 核心初始化 ==========
    init() {
        if (this.isInitialized) return;
        this.setupErrorHandling();
        this.initStorage();
        this.initCoreComponents();
        this.initModules();
        this.initDependentComponents();
        this.setupGlobalEvents();
        this.initDiaryModalEvents();
        this.initFeedbackModalEvents();
        this.initFloatingButtonsEffect();
        this.isInitialized = true;
        
        window.openFeedbackModal = this.openFeedbackModal.bind(this);
        window.closeFeedbackModal = this.closeFeedbackModal.bind(this);
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
            
            if (typeof SearchModule !== 'undefined') {
                try {
                    if (!window.searchModule || !(window.searchModule instanceof SearchModule)) {
                        this.modules.search = new SearchModule();
                        window.searchModule = this.modules.search;
                        initPromises.push(this.modules.search.init?.());
                    } else {
                        this.modules.search = window.searchModule;
                    }
                } catch (error) {
                    console.error('搜索模块初始化失败:', error);
                }
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
                } else {
                    this.modules.about = window.aboutModule;
                }
            }
            
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

    setupErrorHandling() {
        const ignoredErrors = [
            'Script error',
            'ResizeObserver loop',
            'Loading failed',
            'Failed to fetch'
        ];
        
        const handleError = (event) => {
            const error = event.error || event.reason;
            const errorMessage = error?.message || event.message || '未知错误';
            
            const shouldIgnore = ignoredErrors.some(ignored => 
                errorMessage.includes(ignored)
            );
            
            if (!shouldIgnore) {
                console.error('应用错误:', errorMessage);
                if (!document.hidden) {
                    this.showToast('页面遇到问题，建议刷新页面', 'error');
                }
            }
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
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showSearch();
            }
            if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
                e.preventDefault();
                this.refreshPageWithAnimation();
            }
        });
        
        window.addEventListener('online', () => {
            this.showToast('网络已连接', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showToast('网络已断开，部分功能可能受限', 'warning');
        });
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshOnVisibility();
            }
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
        this.activeModals.forEach((modal) => {
            if (modal && typeof modal.hide === 'function') {
                try { modal.hide(); } catch (error) { console.error('关闭模态框失败:', error); }
            }
        });
        this.activeModals = [];
        
        if (this.components.sidebar && this.components.sidebar.isVisible && this.components.sidebar.isVisible()) {
            this.components.sidebar.hide();
        }
        if (this.components.navbar && this.components.navbar.hideMusicPlayer) {
            this.components.navbar.hideMusicPlayer();
        }
        if (this.modules.search && this.modules.search.isModalOpen && this.modules.search.hide) {
            this.modules.search.hide();
        }
        this.closeFeedbackModal();
    }

    showToast(message, type = 'info') {
        window.toast.show(message, type);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

if (!window.app) {
    window.app = new App();
}

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