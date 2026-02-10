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
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    /**
     * 初始化应用程序
     */
    init() {
        if (this.isInitialized) {
            return;
        }
        
        this.setupErrorHandling();
        this.initStorage();
        this.initCoreComponents();
        this.initModules();
        this.initDependentComponents();
        this.setupGlobalEvents();
        
        this.isInitialized = true;
        
        this.start();
    }

    /**
     * 初始化核心组件
     */
    initCoreComponents() {
        try {
            // 确保侧边栏优先初始化
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

    /**
     * 初始化所有模块
     */
    initModules() {
        try {
            // 并行初始化所有模块
            const initPromises = [];
            
            // 搜索模块优先初始化
            if (typeof SearchModule !== 'undefined') {
                try {
                    // 确保只初始化一次
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
            
            // 修复导航模块初始化 - 改为 OptimizedNavigation
            if (typeof OptimizedNavigation !== 'undefined') {
                this.modules.navigation = new OptimizedNavigation();
                initPromises.push(this.modules.navigation.init?.());
            }
            
            if (typeof FooterModule !== 'undefined') {
                this.modules.footer = new FooterModule();
                // 防止footer.js启动定时器
                if (this.modules.footer.startUptimeTimer) {
                    const originalStartUptimeTimer = this.modules.footer.startUptimeTimer;
                    this.modules.footer.startUptimeTimer = () => {
                        console.log('运行时间定时器已由main.js接管，禁止footer.js启动');
                        // 只调用一次更新，不启动定时器
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
            
            // 注意：移除了 ActivityModule 的初始化
            
            // 并行执行所有初始化
            Promise.all(initPromises.map(p => p?.catch(() => {}))).then(() => {
                console.log('所有模块初始化完成');
            });

        } catch (error) {
            console.error('模块初始化失败:', error);
            this.showToast('部分模块初始化失败', 'warning');
        }
    }

    /**
     * 初始化依赖组件
     */
    initDependentComponents() {
        try {
            if (typeof Navbar !== 'undefined') {
                this.components.navbar = new Navbar();
            }
        } catch (error) {
            console.error('依赖组件初始化失败:', error);
        }
    }

    /**
     * 设置错误处理
     */
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

    /**
     * 初始化本地存储
     */
    initStorage() {
        if (typeof Storage === 'undefined') {
            console.error('浏览器不支持localStorage');
            this.showToast('浏览器不支持本地存储，部分功能可能受限', 'warning');
            return;
        }
        
        this.initDefaultData();
    }

    /**
     * 初始化默认数据
     */
    initDefaultData() {
        const defaultAnnouncement = [
            {
                id: 'single_announcement',
                title: '星链导航公告',
                focus: '星链导航已正式发布，带来全新体验和更多实用功能，优化了性能和使用体验。',
                updates: [
                    '全新界面设计 - 更加现代化和美观的视觉体验',
                    '音乐播放器 - 支持多平台音乐搜索和播放',
                    '个性化设置 - 可自定义主题和布局',
                    '更多实用工具 - 新增多个日常使用的小工具',
                    '性能优化 - 更快的加载速度和响应时间'
                ],
                time: new Date().toLocaleDateString('zh-CN'),
                source: '系统公告',
                read: false,
                timestamp: Date.now()
            }
        ];
        
        const currentAnnouncements = Storage.get('announcements');
        if (!currentAnnouncements || currentAnnouncements.length === 0) {
            Storage.set('announcements', defaultAnnouncement);
        }
        
        if (!Storage.get('first_visit_time')) {
            Storage.set('first_visit_time', new Date().toISOString());
        }
        
        // 初始化累计运行时间
        this.initAccumulatedUptime();
        
        this.updateVisitStats();
    }

    /**
     * 初始化累计运行时间
     */
    initAccumulatedUptime() {
        try {
            // 获取存储的累计运行时间
            let accumulatedTime = Storage.get('accumulated_uptime') || 0;
            
            // 获取上次更新时间
            let lastUpdateTime = Storage.get('last_uptime_update');
            
            // 如果从未存储过，则初始化
            if (!lastUpdateTime) {
                lastUpdateTime = Date.now();
                Storage.set('last_uptime_update', lastUpdateTime);
                Storage.set('accumulated_uptime', 0);
            } else {
                // 计算从上一次更新到现在的时间差
                const now = Date.now();
                const timeDiff = now - lastUpdateTime;
                
                // 累加到总运行时间
                accumulatedTime += timeDiff;
                
                // 更新存储
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

    /**
     * 更新访问统计
     */
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

    /**
     * 设置全局事件
     */
    setupGlobalEvents() {
        // 按键事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Ctrl + K 打开搜索
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showSearch();
            }
            
            // F5 或 Ctrl+R 刷新页面数据
            if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
                e.preventDefault();
                this.refreshPageWithAnimation();
            }
        });
        
        // 网络状态监控
        window.addEventListener('online', () => {
            this.showToast('网络已连接', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showToast('网络已断开，部分功能可能受限', 'warning');
        });
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // 页面重新可见时刷新必要数据
                this.refreshOnVisibility();
            }
        });
    }

    /**
     * 页面重新可见时刷新数据
     */
    refreshOnVisibility() {
        // 刷新时间显示
        if (this.modules.greeting && this.modules.greeting.updateDateTime) {
            this.modules.greeting.updateDateTime();
        }
        
        // 刷新天气数据（如果可见时间超过10分钟）
        const now = Date.now();
        if (this.lastWeatherUpdate && (now - this.lastWeatherUpdate > 10 * 60 * 1000)) {
            if (this.modules.weather && this.modules.weather.loadWeatherData) {
                this.modules.weather.loadWeatherData();
                this.lastWeatherUpdate = now;
            }
        }
    }

    /**
     * 注册模态框
     */
    registerModal(modal) {
        if (!modal || typeof modal.hide !== 'function') {
            return;
        }
        
        if (!this.activeModals.includes(modal)) {
            this.activeModals.push(modal);
            
            // 确保只有一个模态框处于活动状态
            if (this.activeModals.length > 1) {
                const previousModal = this.activeModals[this.activeModals.length - 2];
                if (previousModal && previousModal.hide) {
                    previousModal.hide();
                }
            }
            
            // 关闭侧边栏
            if (this.components.sidebar && this.components.sidebar.isVisible && this.components.sidebar.isVisible()) {
                this.components.sidebar.hide();
            }
        }
    }

    /**
     * 注销模态框
     */
    unregisterModal(modal) {
        const index = this.activeModals.indexOf(modal);
        if (index > -1) {
            this.activeModals.splice(index, 1);
        }
    }

    /**
     * 关闭所有模态框和侧边栏
     */
    closeAllModals() {
        // 关闭所有注册的模态框
        this.activeModals.forEach((modal) => {
            if (modal && typeof modal.hide === 'function') {
                try {
                    modal.hide();
                } catch (error) {
                    console.error('关闭模态框失败:', error);
                }
            }
        });
        this.activeModals = [];
        
        // 关闭侧边栏
        if (this.components.sidebar && this.components.sidebar.isVisible && this.components.sidebar.isVisible()) {
            this.components.sidebar.hide();
        }
        
        // 关闭音乐播放器
        if (this.components.navbar && this.components.navbar.hideMusicPlayer) {
            this.components.navbar.hideMusicPlayer();
        }
        
        // 关闭搜索模态框
        if (this.modules.search && this.modules.search.isModalOpen && this.modules.search.hide) {
            this.modules.search.hide();
        }
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        if (!message || typeof message !== 'string') {
            return;
        }
        
        // 应用未完全初始化时不显示错误提示
        if (type === 'error' && !this.isInitialized) {
            return;
        }
        
        // 优先使用导航栏的toast
        if (this.components.navbar && this.components.navbar.showToast) {
            this.components.navbar.showToast(message, type);
            return;
        }
        
        // 创建toast容器
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        
        // 图标映射
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle'
        };
        
        const icon = icons[type] || 'info-circle';
        const escapedMessage = this.escapeHtml(message);
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${icon}"></i>
                <span>${escapedMessage}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // 显示动画
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // 自动关闭
        setTimeout(() => {
            this.hideToast(toast);
        }, 3000);
    }

    /**
     * 隐藏提示消息
     */
    hideToast(toastElement) {
        if (!toastElement || !toastElement.parentNode) {
            return;
        }
        
        // 隐藏动画
        toastElement.classList.remove('show');
        
        // 移除元素
        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
        }, 300);
    }

    /**
     * 转义HTML字符
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 获取累计运行时间（从首次访问开始）
     */
    getAccumulatedUptime() {
        try {
            // 获取存储的累计时间
            let accumulatedTime = this.accumulatedUptime || 0;
            
            // 如果页面正在运行，加上从上次更新到现在的时间
            const now = Date.now();
            if (this.lastUptimeUpdate) {
                accumulatedTime += (now - this.lastUptimeUpdate);
            }
            
            // 转换为天、时、分、秒
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
            return {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                totalMs: 0,
                formatted: '0天 0时 0分 0秒'
            };
        }
    }

    /**
     * 保存当前运行时间状态
     */
    saveUptimeState() {
        try {
            const now = Date.now();
            let accumulatedTime = this.accumulatedUptime || 0;
            
            // 如果上次更新时间存在，加上从上次更新到现在的时间
            if (this.lastUptimeUpdate) {
                accumulatedTime += (now - this.lastUptimeUpdate);
            }
            
            // 保存到本地存储
            Storage.set('accumulated_uptime', accumulatedTime);
            Storage.set('last_uptime_update', now);
            
            // 更新内存中的值
            this.accumulatedUptime = accumulatedTime;
            this.lastUptimeUpdate = now;
            
        } catch (error) {
            console.error('保存运行时间状态失败:', error);
        }
    }

    /**
     * 获取访问统计
     */
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

    /**
     * 更新公告
     */
    updateAnnouncement(newContent) {
        if (!this.modules.announcement || !newContent) {
            return;
        }

        this.modules.announcement.updateAnnouncement(newContent);
    }

    /**
     * 刷新壁纸
     */
    refreshWallpaper() {
        if (!this.modules.wallpaper) {
            this.showToast('壁纸模块未初始化', 'warning');
            return;
        }

        this.modules.wallpaper.refreshWallpaper();
        this.showToast('正在刷新壁纸...', 'info');
    }

    /**
     * 优化页面刷新功能
     */
    refreshPageWithAnimation() {
        this.showToast('正在刷新页面数据...', 'info');
        
        // 添加刷新动画效果
        document.body.style.opacity = '0.8';
        document.body.style.transition = 'opacity 0.3s ease';
        
        // 延迟刷新，让用户看到动画
        setTimeout(() => {
            // 调用现有刷新方法
            this.refreshAllModules();
            
            // 恢复透明度
            setTimeout(() => {
                document.body.style.opacity = '1';
                this.showToast('页面刷新完成', 'success');
            }, 500);
        }, 300);
    }

    /**
     * 启动应用程序
     */
    start() {
        // 显示欢迎消息
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
        
        // 启动定时器（防止闪烁的优化版）
        this.startOptimizedTimers();
        
        // 监听页面卸载事件，保存运行时间状态
        window.addEventListener('beforeunload', () => {
            this.saveUptimeState();
        });
        
        // 监听页面可见性变化，保存状态
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveUptimeState();
            }
        });
    }

    /**
     * 启动优化的定时器（防止闪烁）
     */
    startOptimizedTimers() {
        // 清除可能存在的旧定时器
        if (this.uptimeTimer) {
            clearInterval(this.uptimeTimer);
        }
        
        // 初始立即更新
        this.updateAllStats();
        
        // 每秒更新一次（使用更稳定的时间间隔）
        this.uptimeTimer = setInterval(() => {
            this.updateAllStats();
        }, 1000);
    }

    /**
     * 更新所有统计数据
     */
    updateAllStats() {
        const now = Date.now();
        
        // 每5秒自动保存一次运行时间状态（防止数据丢失）
        if (!this.lastAutoSave || (now - this.lastAutoSave >= 5000)) {
            this.saveUptimeState();
            this.lastAutoSave = now;
        }
        
        // 更新运行时间
        const uptime = this.getAccumulatedUptime();
        const uptimeElement = document.getElementById('uptime');
        if (uptimeElement) {
            // 使用textContent而不是innerHTML，避免重新解析HTML
            uptimeElement.textContent = `${uptime.days}天 ${uptime.hours}时 ${uptime.minutes}分 ${uptime.seconds}秒`;
        }
        
        // 更新访问次数（每5秒更新一次，避免过于频繁）
        if (now - this.lastVisitUpdate >= 5000 || !this.lastVisitUpdate) {
            const visitStats = this.getVisitStats();
            const visitCountElement = document.getElementById('visitCount');
            if (visitCountElement) {
                visitCountElement.textContent = visitStats.count;
            }
            this.lastVisitUpdate = now;
        }
    }

    /**
     * 重置运行时间统计
     */
    resetUptimeStats() {
        if (confirm('确定要重置运行时间统计吗？这将清除累计运行时间，重新开始计时。')) {
            try {
                // 重置存储
                Storage.set('accumulated_uptime', 0);
                Storage.set('last_uptime_update', Date.now());
                
                // 重置内存中的值
                this.accumulatedUptime = 0;
                this.lastUptimeUpdate = Date.now();
                
                // 立即更新显示
                this.updateAllStats();
                
                this.showToast('运行时间统计已重置', 'success');
            } catch (error) {
                console.error('重置运行时间统计失败:', error);
                this.showToast('重置失败，请重试', 'error');
            }
        }
    }

    /**
     * 切换侧边栏显示状态
     */
    toggleSidebar() {
        if (this.components.sidebar && this.components.sidebar.toggle) {
            this.components.sidebar.toggle();
        }
    }

    /**
     * 显示侧边栏
     */
    showSidebar() {
        if (this.components.sidebar && this.components.sidebar.show) {
            this.components.sidebar.show();
        }
    }

    /**
     * 隐藏侧边栏
     */
    hideSidebar() {
        if (this.components.sidebar && this.components.sidebar.hide) {
            this.components.sidebar.hide();
        }
    }

    /**
     * 显示搜索模态框
     */
    showSearch() {
        if (this.modules.search && this.modules.search.showModal) {
            this.modules.search.showModal();
        } else {
            this.showToast('搜索功能暂不可用', 'warning');
        }
    }

    /**
     * 显示公告模态框
     */
    showAnnouncement() {
        if (this.modules.announcement && this.modules.announcement.showModal) {
            this.modules.announcement.showModal();
        } else {
            this.showToast('公告功能暂不可用', 'warning');
        }
    }

    /**
     * 显示天气模态框
     */
    showWeather() {
        if (this.modules.weather && typeof this.modules.weather.showModal === 'function') {
            this.modules.weather.showModal();
        } else {
            console.error('天气模块未正确初始化');
            this.showToast('天气功能暂不可用', 'warning');
        }
    }

    /**
     * 显示关于模态框
     */
    showAbout() {
        if (this.modules.about && this.modules.about.show) {
            this.modules.about.show();
        } else {
            this.showToast('关于功能暂不可用', 'warning');
        }
    }

    /**
     * 切换音乐播放器
     */
    toggleMusicPlayer() {
        if (this.components.navbar && this.components.navbar.toggleMusicPlayer) {
            this.components.navbar.toggleMusicPlayer();
        } else {
            this.showToast('音乐播放器暂不可用', 'warning');
        }
    }

    /**
     * 强制刷新所有模块
     */
    refreshAllModules() {
        this.showToast('开始刷新所有模块', 'info');
        
        // 刷新壁纸
        if (this.modules.wallpaper && this.modules.wallpaper.refreshWallpaper) {
            this.modules.wallpaper.refreshWallpaper().catch(err => {
                console.error('壁纸刷新失败:', err);
            });
        }
        
        // 刷新天气
        if (this.modules.weather && this.modules.weather.loadWeatherData) {
            this.modules.weather.loadWeatherData().catch(err => {
                console.error('天气刷新失败:', err);
            });
        }
        
        // 刷新公告
        if (this.modules.announcement && this.modules.announcement.loadAnnouncements) {
            this.modules.announcement.loadAnnouncements();
        }
        
        // 刷新侧边栏用户信息
        if (this.components.sidebar) {
            if (this.components.sidebar.loadWallpaperUserInfo) {
                this.components.sidebar.loadWallpaperUserInfo();
            }
            if (this.components.sidebar.loadDailyQuote) {
                this.components.sidebar.loadDailyQuote();
            }
        }
        
        // 延迟显示完成消息
        setTimeout(() => {
            this.showToast('所有模块已刷新', 'success');
        }, 1500);
    }

    /**
     * 重置应用状态
     */
    resetApp() {
        if (!confirm('确定要重置应用状态吗？这将清除所有临时数据，但不会删除您的个人配置。')) {
            return;
        }
        
        this.closeAllModals();
        
        // 清除临时存储
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
        
        // 重新初始化模块
        setTimeout(() => {
            this.refreshAllModules();
        }, 500);
        
        this.showToast('应用状态已重置', 'success');
    }

    /**
     * 销毁应用程序
     */
    destroy() {
        // 保存运行时间状态
        this.saveUptimeState();
        
        // 关闭所有模态框和侧边栏
        this.closeAllModals();
        
        // 清除定时器
        if (this.uptimeTimer) {
            clearInterval(this.uptimeTimer);
        }
        
        // 销毁组件
        Object.entries(this.components).forEach(([name, component]) => {
            if (component && typeof component.destroy === 'function') {
                try {
                    component.destroy();
                } catch (error) {
                    console.error(`销毁组件 ${name} 失败:`, error);
                }
            }
        });
        
        // 销毁模块
        Object.entries(this.modules).forEach(([name, module]) => {
            if (module && typeof module.destroy === 'function') {
                try {
                    module.destroy();
                } catch (error) {
                    console.error(`销毁模块 ${name} 失败:`, error);
                }
            }
        });
        
        // 清理全局引用
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        
        // 移除事件监听器
        window.removeEventListener('online', () => {});
        window.removeEventListener('offline', () => {});
        document.removeEventListener('visibilitychange', () => {});
        window.removeEventListener('beforeunload', () => {});
    }
}

// 初始化应用
if (!window.app) {
    window.app = new App();
}

// DOM加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.app && !window.app.isInitialized) {
            window.app.init();
        }
    });
}

// 全局访问函数
window.getApp = function() {
    return window.app;
};

// 全局重置运行时间函数（用于调试）
window.resetUptime = function() {
    if (window.app && window.app.resetUptimeStats) {
        window.app.resetUptimeStats();
    }
};