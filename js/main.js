/**
 * 星聚导航主应用程序（Waline 评论系统版本）
 * 优化 Waline 布局调整，避免 MutationObserver 导致的性能问题
 */
class App {
    constructor() {
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this.lastWeatherUpdate = null;
        this.notebookModalHideRef = null;
        this.walineLayoutTimer = null;  // 用于定时调整布局
        this.walineAdjustAttempts = 0;  // 调整次数计数
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    // ========== 星聚笔记 API 配置（由后端 Worker 代理） ==========
    NOTEBOOK_CONFIG = {
        apiUrl: 'https://api.xjdh688.ccwu.cc/notebook'
    };

    // 加载星聚笔记数据
    async loadNotebookData() {
        const listEl = document.getElementById('notebook-list');
        if (!listEl) return;
        
        listEl.innerHTML = '<div class="loading">加载笔记中...</div>';
        
        try {
            const response = await fetch(this.NOTEBOOK_CONFIG.apiUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            
            const items = Array.isArray(result) ? result : (result.items || result.data || []);
            
            const validItems = items.filter(item => {
                const title = (item.title || item.name || item.note_title || '').toString().trim();
                return title !== '';
            });
            
            validItems.sort((a, b) => (a.numid || 0) - (b.numid || 0));
            
            if (validItems.length === 0) {
                listEl.innerHTML = '<div class="empty">暂无笔记记录（请检查 Worker 环境变量是否已设置）</div>';
                return;
            }
            
            const html = validItems.map(item => {
                const title = Utils.escapeHtml((item.title || item.name || '').toString().trim());
                const time = Utils.escapeHtml(item.time || '--');
                const words = Utils.escapeHtml((item.words || item.content || '').toString().trim()).replace(/\n/g, '<br>');
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
            listEl.innerHTML = `<div class="error">加载失败：${Utils.escapeHtml(error.message)}</div>`;
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

    // ========== 反馈模态框管理（Waline 版本） ==========
    openFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (!modal) return;
        
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        const walineContainer = document.getElementById('twikoo-feedback');
        if (!walineContainer) return;

        // 清理旧实例和定时器
        if (window.walineInstance) {
            try { window.walineInstance.destroy(); } catch (e) {}
        }
        if (this.walineLayoutTimer) {
            clearTimeout(this.walineLayoutTimer);
            this.walineLayoutTimer = null;
        }
        this.walineAdjustAttempts = 0;

        walineContainer.innerHTML = '';
        
        import('https://unpkg.com/@waline/client@v3/dist/waline.js')
            .then(({ init }) => {
                window.walineInstance = init({
                    el: '#twikoo-feedback',
                    serverURL: 'https://yy688.ccwu.cc/',
                    lang: 'zh-CN',
                    dark: 'auto',
                    path: '/feedback',
                    pageSize: 10,
                    requiredMeta: ['nick', 'mail'],
                    login: 'enable',
                    wordLimit: 1000,
                    imageUploader: false,
                    highlighter: true,
                    texRenderer: true,
                    search: false,
                    turnstileKey: '',
                });
                
                window.walineFeedbackInited = true;
                console.log('✅ Waline 评论系统初始化成功');

                // 延迟后开始尝试调整布局（等待 Waline 渲染）
                this.walineLayoutTimer = setTimeout(() => this.tryAdjustWalineLayout(), 300);
            })
            .catch(err => {
                console.error('Waline 初始化失败:', err);
                walineContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#ef4444;">评论系统加载失败，请刷新页面重试</div>';
            });
    }

    /**
     * 定时尝试调整 Waline 布局，最多尝试 10 次 (每次间隔 200ms)
     * 找到关键元素后立即调整并停止
     */
    tryAdjustWalineLayout() {
        this.walineAdjustAttempts++;
        const container = document.getElementById('twikoo-feedback');
        if (!container) return;

        const header = document.querySelector('#feedbackModal .feedback-modal-header h3');
        const statsEl = container.querySelector('.wl-info');
        const sortEl = container.querySelector('.wl-sort');
        const footer = container.querySelector('.wl-footer');

        // 如果还没有关键元素，且未超过尝试次数，则继续等待
        if ((!statsEl || !sortEl || !footer) && this.walineAdjustAttempts < 10) {
            this.walineLayoutTimer = setTimeout(() => this.tryAdjustWalineLayout(), 200);
            return;
        }

        // 一旦开始调整，立即执行
        // 1. 移动统计数到标题后
        if (statsEl && header) {
            const countText = statsEl.textContent.trim();
            if (countText && !header.querySelector('.wl-comment-count')) {
                const span = document.createElement('span');
                span.className = 'wl-comment-count';
                span.style.fontSize = '0.9rem';
                span.style.marginLeft = '12px';
                span.style.fontWeight = '400';
                span.style.color = 'var(--text-secondary)';
                span.textContent = countText;
                header.appendChild(span);
            }
            statsEl.style.display = 'none';
        }

        // 2. 排序按钮居中
        if (sortEl) {
            const cards = container.querySelector('.wl-cards');
            if (cards && cards.parentNode) {
                cards.parentNode.insertBefore(sortEl, cards);
            }
            sortEl.style.display = 'flex';
            sortEl.style.justifyContent = 'center';
            sortEl.style.marginBottom = '16px';
            sortEl.style.padding = '0';
        }

        // 3. 操作按钮左右分布
        if (footer) {
            const actions = footer.querySelector('.wl-actions');
            if (actions) {
                // 防止重复调整
                if (!actions.querySelector('.wl-actions-left') && !actions.querySelector('.wl-actions-right')) {
                    const allBtns = Array.from(actions.children);
                    const loginBtn = allBtns.find(b => b.classList.contains('wl-login') || b.classList.contains('wl-user'));
                    const submitBtn = allBtns.find(b => b.classList.contains('wl-submit'));
                    const otherBtns = allBtns.filter(b => b !== loginBtn && b !== submitBtn);

                    const leftDiv = document.createElement('div');
                    leftDiv.className = 'wl-actions-left';
                    leftDiv.style.display = 'flex';
                    leftDiv.style.gap = '8px';
                    otherBtns.forEach(b => leftDiv.appendChild(b));

                    const rightDiv = document.createElement('div');
                    rightDiv.className = 'wl-actions-right';
                    rightDiv.style.display = 'flex';
                    rightDiv.style.gap = '8px';
                    if (loginBtn) rightDiv.appendChild(loginBtn);
                    if (submitBtn) rightDiv.appendChild(submitBtn);

                    actions.innerHTML = '';
                    actions.appendChild(leftDiv);
                    actions.appendChild(rightDiv);
                }
                actions.style.display = 'flex';
                actions.style.justifyContent = 'space-between';
                actions.style.width = '100%';
                actions.style.alignItems = 'center';
            }
        }

        // 清除定时器
        if (this.walineLayoutTimer) {
            clearTimeout(this.walineLayoutTimer);
            this.walineLayoutTimer = null;
        }
    }

    closeFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        // 清理布局定时器
        if (this.walineLayoutTimer) {
            clearTimeout(this.walineLayoutTimer);
            this.walineLayoutTimer = null;
        }
        this.walineAdjustAttempts = 0;
    }

    initFeedbackModalEvents() {
        const modal = document.getElementById('feedbackModal');
        const closeBtn = modal?.querySelector('.feedback-modal-close');
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
        this.initFloatingButtonsEffect();
        this.isInitialized = true;
        
        window.openFeedbackModal = this.openFeedbackModal.bind(this);
        window.closeFeedbackModal = this.closeFeedbackModal.bind(this);
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
            'Failed to fetch',
            'Unexpected identifier',
            'Unexpected token',
            'Script error.'
        ];
        
        const handleError = (event) => {
            const error = event.error || event.reason;
            const errorMessage = error?.message || event.message || '未知错误';
            
            const shouldIgnore = ignoredErrors.some(ignored => 
                errorMessage.includes(ignored) || (event.filename === '' && errorMessage === 'Script error.')
            );
            
            if (!shouldIgnore) {
                console.error('应用错误:', errorMessage);
                if (!document.hidden) {
                    this.showToast('页面遇到问题，建议刷新页面', 'error');
                }
            } else {
                console.debug('忽略无害错误:', errorMessage);
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