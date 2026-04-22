/**
 * 星链导航主应用程序（优化6：错误边界与降级版）
 */
class App {
    constructor() {
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this.lastWeatherUpdate = null;
        this.diaryModalHideRef = null;
        
        // 错误收集
        this.errorLog = [];
        this.maxErrorLogSize = 20;
        
        // 模块降级状态
        this.moduleStatus = new Map();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    // ========== 日记功能相关常量和方法 ==========
    DIARY_IDS = [1,2,3,4,5,6,7,8,9,10];

    async loadDiaryBatch() {
        const listEl = document.getElementById('diaryList');
        if (!listEl) return;
        
        listEl.innerHTML = '<div class="loading">加载日记中...</div>';
        
        try {
            const promises = this.DIARY_IDS.map(id =>
                fetch(`https://cn.apihz.cn/api/cunchu/textzd.php?id=10014221&key=4a7768de1cf2e0f41fc0a4005240c837&numid=${id}`)
                    .then(res => res.json())
                    .then(data => ({ id, ...data }))
                    .catch(err => ({ id, code: 500, msg: err.message }))
            );
            
            const results = await Promise.all(promises);
            
            const validItems = results.filter(item => {
                if (item.code !== 200) return false;
                const title = item.title || '';
                const words = item.words || '';
                return title.trim() !== '' && words.trim() !== '';
            });
            
            if (validItems.length === 0) {
                listEl.innerHTML = '<div class="empty">暂无日记记录</div>';
                return;
            }
            
            const html = validItems.map(item => {
                const title = item.title.trim();
                const time = item.time || '--';
                const words = item.words.trim();
                
                return `
                    <div class="diary-item">
                        <div class="diary-item-header">
                            <span class="diary-item-id">#${item.id}</span>
                            <span class="diary-item-time">${time}</span>
                        </div>
                        <div class="diary-item-title">${this.escapeHtml(title)}</div>
                        <div class="diary-item-content">${this.escapeHtml(words)}</div>
                    </div>
                `;
            }).join('');
            
            listEl.innerHTML = html;
            
        } catch (error) {
            listEl.innerHTML = `<div class="error">加载失败：${error.message}</div>`;
        }
    }

    showDiaryModal() {
        const modal = document.getElementById('diaryModal');
        if (!modal) return;
        modal.style.display = 'flex';
        
        if (!this.diaryModalHideRef) {
            this.diaryModalHideRef = { hide: this.hideDiaryModal.bind(this) };
        }
        this.registerModal(this.diaryModalHideRef);
        
        this.loadDiaryBatch();
    }

    hideDiaryModal() {
        const modal = document.getElementById('diaryModal');
        if (modal) modal.style.display = 'none';
        if (this.diaryModalHideRef) {
            this.unregisterModal(this.diaryModalHideRef);
        }
    }

    initDiaryModalEvents() {
        const modal = document.getElementById('diaryModal');
        const closeBtn = document.getElementById('diaryCloseBtn');
        
        if (!modal || !closeBtn) return;
        
        closeBtn.addEventListener('click', () => this.hideDiaryModal());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideDiaryModal();
        });
    }

    // ========== 反馈模态框管理 ==========
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

    // ========== 主初始化流程 ==========
    init() {
        if (this.isInitialized) return;
        
        this.setupErrorHandling();
        this.initStorage();
        
        // 显示加载状态
        this.showInitialLoading();
        
        // 按顺序初始化核心组件和模块
        this.initCoreComponents()
            .then(() => this.initModules())
            .then(() => {
                this.initDependentComponents();
                this.setupGlobalEvents();
                this.initDiaryModalEvents();
                this.initFeedbackModalEvents();
                this.initFloatingButtonsEffect();
                this.isInitialized = true;
                this.hideInitialLoading();
                
                // 检查模块降级状态并提示
                this.reportModuleStatus();
            })
            .catch(error => {
                console.error('应用初始化失败:', error);
                this.logError('init', '应用初始化失败', error);
                this.showToast('应用初始化失败，请刷新页面', 'error');
                this.hideInitialLoading();
                this.showFatalError();
            });
        
        window.openFeedbackModal = this.openFeedbackModal.bind(this);
        window.closeFeedbackModal = this.closeFeedbackModal.bind(this);
    }

    showInitialLoading() {
        const loader = document.createElement('div');
        loader.id = 'app-loading-bar';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, #4361ee, #7209b7);
            z-index: 99999;
            animation: loadingProgress 2s ease-in-out infinite;
        `;
        if (!document.getElementById('app-loading-bar')) {
            document.body.appendChild(loader);
        }
    }

    hideInitialLoading() {
        const loader = document.getElementById('app-loading-bar');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 300);
        }
    }

    showFatalError() {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 100000;
            text-align: center;
            max-width: 90%;
        `;
        container.innerHTML = `
            <h3 style="color: #ef4444; margin-bottom: 12px;">⚠️ 应用启动失败</h3>
            <p style="margin-bottom: 16px;">请尝试刷新页面或检查网络连接</p>
            <button onclick="location.reload()" style="background: #4361ee; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer;">刷新页面</button>
        `;
        document.body.appendChild(container);
    }

    // ========== 错误处理与降级 ==========
    setupErrorHandling() {
        const ignoredErrors = [
            'Script error',
            'ResizeObserver loop',
            'Loading failed',
            'Failed to fetch',
            'NetworkError',
            'AbortError'
        ];
        
        const handleError = (event) => {
            const error = event.error || event.reason;
            const errorMessage = error?.message || event.message || '未知错误';
            
            const shouldIgnore = ignoredErrors.some(ignored => 
                errorMessage.includes(ignored)
            );
            
            if (!shouldIgnore) {
                console.error('应用错误:', errorMessage, error);
                this.logError('global', errorMessage, error);
                
                if (!document.hidden) {
                    // 避免过多提示
                    if (this.errorLog.length <= 3) {
                        this.showToast('页面遇到问题，部分功能可能异常', 'warning');
                    }
                }
            }
        };
        
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleError);
    }

    logError(source, message, error) {
        const entry = {
            time: new Date().toISOString(),
            source,
            message,
            stack: error?.stack || null
        };
        this.errorLog.unshift(entry);
        if (this.errorLog.length > this.maxErrorLogSize) {
            this.errorLog.pop();
        }
    }

    getErrorLog() {
        return this.errorLog;
    }

    // ========== 悬浮按钮滚动效果 ==========
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

    // ========== 核心组件初始化（带降级） ==========
    async initCoreComponents() {
        try {
            if (typeof CompactSidebar !== 'undefined') {
                if (!window.sidebar || !window.sidebar.isInitialized) {
                    this.components.sidebar = new CompactSidebar();
                    await this.components.sidebar.init().catch(error => {
                        console.error('侧边栏初始化失败:', error);
                        this.moduleStatus.set('sidebar', { status: 'error', error });
                        this.showToast('侧边栏初始化失败，部分功能可能不可用', 'warning');
                    });
                    if (!this.moduleStatus.has('sidebar')) {
                        this.moduleStatus.set('sidebar', { status: 'ok' });
                    }
                } else {
                    this.components.sidebar = window.sidebar;
                }
            }
        } catch (error) {
            console.error('核心组件初始化失败:', error);
            this.logError('coreComponents', '核心组件初始化失败', error);
            this.moduleStatus.set('sidebar', { status: 'error', error });
        }
    }

    // ========== 模块初始化（逐个捕获错误，支持降级展示） ==========
    async initModules() {
        const moduleConfigs = [
            { name: 'search', class: 'SearchModule', displayName: '搜索' },
            { name: 'wallpaper', class: 'WallpaperModule', displayName: '壁纸' },
            { name: 'greeting', class: 'GreetingModule', displayName: '问候语' },
            { name: 'navigation', class: 'OptimizedNavigation', displayName: '导航' },
            { name: 'footer', class: 'FooterModule', displayName: '页脚统计' },
            { name: 'weather', class: 'WeatherModule', displayName: '天气' },
            { name: 'announcement', class: 'AnnouncementModule', displayName: '公告' },
            { name: 'about', class: 'AboutModule', displayName: '关于' }
        ];

        for (const cfg of moduleConfigs) {
            try {
                await this.initSingleModule(cfg);
            } catch (error) {
                console.error(`${cfg.displayName}模块初始化失败:`, error);
                this.logError(`module:${cfg.name}`, `${cfg.displayName}初始化失败`, error);
                this.moduleStatus.set(cfg.name, { status: 'error', error });
                this.applyModuleFallback(cfg.name);
            }
        }
    }

    async initSingleModule(cfg) {
        const ModuleClass = window[cfg.class];
        if (!ModuleClass) {
            throw new Error(`类 ${cfg.class} 未定义`);
        }

        // 特殊处理某些模块（如已有全局实例）
        if (cfg.name === 'search' && window.searchModule instanceof ModuleClass) {
            this.modules.search = window.searchModule;
            this.moduleStatus.set('search', { status: 'ok' });
            return;
        }
        if (cfg.name === 'announcement' && window.announcementModule) {
            this.modules.announcement = window.announcementModule;
            this.moduleStatus.set('announcement', { status: 'ok' });
            return;
        }
        if (cfg.name === 'about' && window.aboutModule) {
            this.modules.about = window.aboutModule;
            this.moduleStatus.set('about', { status: 'ok' });
            return;
        }

        const instance = new ModuleClass();
        if (instance.init) {
            await instance.init();
        }
        this.modules[cfg.name] = instance;
        
        // 设置全局引用
        if (cfg.name === 'navigation') window.optimizedNavigation = instance;
        if (cfg.name === 'search') window.searchModule = instance;
        if (cfg.name === 'announcement') window.announcementModule = instance;
        if (cfg.name === 'about') window.aboutModule = instance;
        
        this.moduleStatus.set(cfg.name, { status: 'ok' });
    }

    applyModuleFallback(moduleName) {
        // 根据不同模块进行降级处理
        switch (moduleName) {
            case 'navigation':
                this.showNavigationFallback();
                break;
            case 'wallpaper':
                this.showWallpaperFallback();
                break;
            case 'weather':
                // 天气模块失败不影响主要功能
                break;
            default:
                // 其他模块静默降级
                break;
        }
    }

    showNavigationFallback() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h3 class="empty-title">导航数据加载失败</h3>
                    <p class="empty-subtitle">请检查网络连接</p>
                    <button class="retry-btn" onclick="window.app.retryModule('navigation')" style="margin-top: 16px; padding: 8px 20px; background: #4361ee; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-redo"></i> 重试
                    </button>
                </div>
            `;
        }
    }

    showWallpaperFallback() {
        const wallpaperImg = document.getElementById('wallpaper');
        if (wallpaperImg) {
            wallpaperImg.style.display = 'none';
        }
        const info = document.getElementById('wallpaperInfo');
        if (info) {
            info.innerHTML = '<span style="color: #999;">壁纸加载失败</span>';
        }
    }

    retryModule(moduleName) {
        this.showToast(`正在重新加载${moduleName}模块...`, 'info');
        
        const cfg = {
            navigation: { class: 'OptimizedNavigation', displayName: '导航' },
            wallpaper: { class: 'WallpaperModule', displayName: '壁纸' },
            weather: { class: 'WeatherModule', displayName: '天气' }
        }[moduleName];
        
        if (!cfg) return;
        
        this.initSingleModule({ name: moduleName, ...cfg })
            .then(() => {
                this.moduleStatus.set(moduleName, { status: 'ok' });
                this.showToast(`${cfg.displayName}模块已恢复`, 'success');
                // 如果之前有降级UI，刷新页面显示
                if (moduleName === 'navigation' && this.modules.navigation) {
                    this.modules.navigation.refresh();
                }
            })
            .catch(error => {
                console.error(`重试${moduleName}失败:`, error);
                this.showToast(`重试失败，请刷新页面`, 'error');
            });
    }

    reportModuleStatus() {
        const failedModules = [];
        for (const [name, status] of this.moduleStatus) {
            if (status.status === 'error') {
                failedModules.push(name);
            }
        }
        if (failedModules.length > 0) {
            console.warn('部分模块初始化失败:', failedModules);
            // 避免过多提示
            if (failedModules.length <= 2) {
                this.showToast('部分功能加载失败，可尝试刷新', 'warning');
            }
        }
    }

    // ========== 其他组件初始化 ==========
    initDependentComponents() {
        try {
            if (typeof Navbar !== 'undefined') {
                this.components.navbar = new Navbar();
            }
        } catch (error) {
            console.error('依赖组件初始化失败:', error);
            this.logError('dependentComponents', '依赖组件初始化失败', error);
        }
    }

    // ========== 存储初始化 ==========
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

    // ========== 全局事件 ==========
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

    // ========== 模态框管理 ==========
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

    // ========== 公共 API ==========
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