/**
 * 星链导航主应用程序
 * 负责初始化和管理所有组件和模块
 * @class App
 */
class App {
    constructor() {
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this.uptimeTimer = null;
        this.lastUptimeUpdate = 0;
        this.diaryModalHideRef = null;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    // ========== 日记功能相关常量和方法 ==========
    DIARY_IDS = [1,2,3,4,5,6,7,8,9,10];  // 可修改范围

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
            
            // 过滤：只保留 code===200 且标题和内容均非空
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
        
        // 每次打开重新加载
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
    // =========================================

    init() {
        if (this.isInitialized) return;
        this.setupErrorHandling();
        this.initStorage();
        this.initCoreComponents();
        this.initModules();
        this.initDependentComponents();
        this.setupGlobalEvents();
        this.initDiaryModalEvents();  // 新增
        this.isInitialized = true;
        this.start();
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
                        console.log('搜索模块已通过App初始化');
                    } else {
                        this.modules.search = window.searchModule;
                        console.log('使用现有的搜索模块实例');
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
                if (this.modules.footer.startUptimeTimer) {
                    const originalStartUptimeTimer = this.modules.footer.startUptimeTimer;
                    this.modules.footer.startUptimeTimer = () => {
                        console.log('运行时间定时器已由main.js接管，禁止footer.js启动');
                        if (this.modules.footer.updateUptime) {
                            this.modules.footer.updateUptime();
                        }
                    };
                }
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
        
        this.initAccumulatedUptime();
        this.updateVisitStats();
    }

    initAccumulatedUptime() {
        try {
            let accumulatedTime = Storage.get('accumulated_uptime') || 0;
            let lastUpdateTime = Storage.get('last_uptime_update');
            
            if (!lastUpdateTime) {
                lastUpdateTime = Date.now();
                Storage.set('last_uptime_update', lastUpdateTime);
                Storage.set('accumulated_uptime', 0);
            } else {
                const now = Date.now();
                const timeDiff = now - lastUpdateTime;
                accumulatedTime += timeDiff;
                Storage.set('accumulated_uptime', accumulatedTime);
                Storage.set('last_uptime_update', now);
            }
            
            this.accumulatedUptime = accumulatedTime;
            this.lastUptimeUpdate = lastUpdateTime;
        } catch (error) {
            console.error('初始化累计运行时间失败:', error);
            this.accumulatedUptime = 0;
            this.lastUptimeUpdate = Date.now();
        }
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
    }

    /**
     * 显示 Toast 提示
     * @param {string} message 
     * @param {string} type info/success/warning/error
     */
    showToast(message, type = 'info') {
        window.toast.show(message, type);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getAccumulatedUptime() {
        try {
            let accumulatedTime = this.accumulatedUptime || 0;
            const now = Date.now();
            if (this.lastUptimeUpdate) {
                accumulatedTime += (now - this.lastUptimeUpdate);
            }
            const days = Math.floor(accumulatedTime / (1000 * 60 * 60 * 24));
            const hours = Math.floor((accumulatedTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((accumulatedTime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((accumulatedTime % (1000 * 60)) / 1000);
            
            return {
                days,
                hours,
                minutes,
                seconds,
                totalMs: accumulatedTime,
                formatted: days > 0 ? `${days}天 ${hours}时 ${minutes}分 ${seconds}秒` : 
                           hours > 0 ? `${hours}时 ${minutes}分 ${seconds}秒` : 
                           minutes > 0 ? `${minutes}分 ${seconds}秒` : 
                           `${seconds}秒`
            };
        } catch (error) {
            console.error('获取累计运行时间失败:', error);
            return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, formatted: '0天 0时 0分 0秒' };
        }
    }

    saveUptimeState() {
        try {
            const now = Date.now();
            let accumulatedTime = this.accumulatedUptime || 0;
            if (this.lastUptimeUpdate) {
                accumulatedTime += (now - this.lastUptimeUpdate);
            }
            Storage.set('accumulated_uptime', accumulatedTime);
            Storage.set('last_uptime_update', now);
            this.accumulatedUptime = accumulatedTime;
            this.lastUptimeUpdate = now;
        } catch (error) {
            console.error('保存运行时间状态失败:', error);
        }
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

    start() {
        setTimeout(() => {
            const visitStats = this.getVisitStats();
            if (visitStats.count === 1) {
                this.showToast('欢迎首次访问星链导航！', 'success');
            } else if (visitStats.count === 10) {
                this.showToast('感谢您的第10次访问！', 'success');
            } else if (visitStats.count === 100) {
                this.showToast('恭喜！这是您的第100次访问！', 'success');
            }
        }, 1500);
        
        this.startOptimizedTimers();
        
        window.addEventListener('beforeunload', () => {
            this.saveUptimeState();
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveUptimeState();
            }
        });
    }

    startOptimizedTimers() {
        if (this.uptimeTimer) clearInterval(this.uptimeTimer);
        this.updateAllStats();
        this.uptimeTimer = setInterval(() => {
            this.updateAllStats();
        }, 1000);
    }

    updateAllStats() {
        const now = Date.now();
        
        if (!this.lastAutoSave || (now - this.lastAutoSave >= 5000)) {
            this.saveUptimeState();
            this.lastAutoSave = now;
        }
        
        const uptime = this.getAccumulatedUptime();
        const uptimeElement = document.getElementById('uptime');
        if (uptimeElement) {
            uptimeElement.textContent = `${uptime.days}天 ${uptime.hours}时 ${uptime.minutes}分 ${uptime.seconds}秒`;
        }
        
        if (now - this.lastVisitUpdate >= 5000 || !this.lastVisitUpdate) {
            const visitStats = this.getVisitStats();
            const visitCountElement = document.getElementById('visitCount');
            if (visitCountElement) {
                visitCountElement.textContent = visitStats.count;
            }
            this.lastVisitUpdate = now;
        }
    }

    resetUptimeStats() {
        if (confirm('确定要重置运行时间统计吗？这将清除累计运行时间，重新开始计时。')) {
            try {
                Storage.set('accumulated_uptime', 0);
                Storage.set('last_uptime_update', Date.now());
                this.accumulatedUptime = 0;
                this.lastUptimeUpdate = Date.now();
                this.updateAllStats();
                this.showToast('运行时间统计已重置', 'success');
            } catch (error) {
                console.error('重置运行时间统计失败:', error);
                this.showToast('重置失败，请重试', 'error');
            }
        }
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
        this.saveUptimeState();
        this.closeAllModals();
        if (this.uptimeTimer) clearInterval(this.uptimeTimer);
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
        window.removeEventListener('online', () => {});
        window.removeEventListener('offline', () => {});
        document.removeEventListener('visibilitychange', () => {});
        window.removeEventListener('beforeunload', () => {});
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

window.resetUptime = function() {
    if (window.app && window.app.resetUptimeStats) {
        window.app.resetUptimeStats();
    }
};