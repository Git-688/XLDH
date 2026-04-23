/**
 * 星链导航主应用程序（反馈模态框 + KaTeX v0.16.45 官方标准配置）
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

    // ========== 星聚笔记 API 配置 ==========
    NOTEBOOK_CONFIG = {
        apiUrl: 'https://cn.apihz.cn/api/cunchu/textzd.php',
        id: '10014221',
        key: '4a7768de1cf2e0f41fc0a4005240c837',
        maxNumId: 20  // 最多查询的记录ID，可根据需要调整
    };

    // 加载星聚笔记数据（并行请求）
    async loadNotebookData() {
        const listEl = document.getElementById('notebook-list');
        if (!listEl) return;
        
        listEl.innerHTML = '<div class="loading">加载笔记中...</div>';
        
        try {
            // 并行请求所有 numid
            const promises = [];
            for (let i = 1; i <= this.NOTEBOOK_CONFIG.maxNumId; i++) {
                promises.push(
                    fetch(`${this.NOTEBOOK_CONFIG.apiUrl}?id=${this.NOTEBOOK_CONFIG.id}&key=${this.NOTEBOOK_CONFIG.key}&numid=${i}`)
                        .then(res => res.json())
                        .then(data => ({ numid: i, ...data }))
                        .catch(err => ({ numid: i, code: 500, msg: err.message }))
                );
            }
            
            const results = await Promise.all(promises);
            
            // 筛选有效记录 (code === 200 且标题和内容不为空)
            const validItems = results.filter(item => {
                if (item.code !== 200) return false;
                const title = item.title || '';
                const words = item.words || '';
                return title.trim() !== '' && words.trim() !== '';
            });
            
            // 按记录ID倒序排列（最新的在前面）
            validItems.sort((a, b) => b.numid - a.numid);
            
            if (validItems.length === 0) {
                listEl.innerHTML = '<div class="empty">暂无笔记记录</div>';
                return;
            }
            
            // 渲染笔记列表
            const html = validItems.map(item => {
                const title = this.escapeHtml(item.title.trim());
                const time = this.escapeHtml(item.time || '--');
                const words = this.escapeHtml(item.words.trim()).replace(/\n/g, '<br>');
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
            listEl.innerHTML = `<div class="error">加载失败：${this.escapeHtml(error.message)}</div>`;
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
    // =========================================

    // ========== 反馈模态框管理（官方标准配置，无额外处理）==========
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
                // 完全按照官方文档配置
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
                    // 再次调用渲染，确保所有公式都被处理
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
    // =========================================

    init() {
        if (this.isInitialized) return;
        this.setupErrorHandling();
        this.initStorage();
        this.initCoreComponents();
        this.initModules();
        this.initDependentComponents();
        this.setupGlobalEvents();
        this.initNotebookModalEvents();
        this.initFeedbackModalEvents();
        this.initFloatingButtonsEffect(); // 新增：悬浮按钮滚动效果
        this.isInitialized = true;
        
        window.openFeedbackModal = this.openFeedbackModal.bind(this);
        window.closeFeedbackModal = this.closeFeedbackModal.bind(this);
        window.showNotebookModal = this.showNotebookModal.bind(this);
        window.hideNotebookModal = this.hideNotebookModal.bind(this);
    }

    // ========== 新增：悬浮按钮滚动半透明效果 ==========
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
    // =========================================

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
            
            // 搜索模块（确保只实例化一次）
            if (typeof SearchModule !== 'undefined' && !window.searchModule) {
                this.modules.search = new SearchModule();
                window.searchModule = this.modules.search;
                initPromises.push(this.modules.search.init?.());
                console.log('搜索模块已通过App初始化');
            } else if (window.searchModule) {
                this.modules.search = window.searchModule;
                console.log('使用现有的搜索模块实例');
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
            // 重点修复：仅在 window.navbar 不存在时创建实例
            if (typeof Navbar !== 'undefined' && !window.navbar) {
                this.components.navbar = new Navbar();
                window.navbar = this.components.navbar;
                console.log('Navbar 通过 App 初始化');
            } else if (window.navbar) {
                this.components.navbar = window.navbar;
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
        this.hideNotebookModal();
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