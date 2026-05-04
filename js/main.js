/**
 * 星聚导航主应用程序（Waline 评论系统版本）
 * 已优化布局调整，避免性能问题
 */
class App {
    constructor() {
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this.lastWeatherUpdate = null;
        this.notebookModalHideRef = null;
        this.walineLayoutTimer = null;
        this.walineAdjustAttempts = 0;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }

    NOTEBOOK_CONFIG = {
        apiUrl: 'https://api.xjdh688.ccwu.cc/notebook'
    };

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

    hideNotebookModal() {
        const modal = document.getElementById('notebookModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        if (this.notebookModalHideRef) this.unregisterModal(this.notebookModalHideRef);
    }

    initNotebookModalEvents() {
        const modal = document.getElementById('notebookModal');
        const closeBtn = modal?.querySelector('.feedback-modal-close');
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideNotebookModal();
        });
        if (closeBtn) closeBtn.addEventListener('click', () => this.hideNotebookModal());
    }

    // ========== 反馈模态框（Waline） ==========
    openFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        const walineContainer = document.getElementById('twikoo-feedback');
        if (!walineContainer) return;

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
                console.log('✅ Waline 初始化成功');
                this.walineLayoutTimer = setTimeout(() => this.tryAdjustWalineLayout(), 300);
            })
            .catch(err => {
                console.error('Waline 初始化失败:', err);
                walineContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#ef4444;">评论系统加载失败，请刷新页面重试</div>';
            });
    }

    tryAdjustWalineLayout() {
        this.walineAdjustAttempts++;
        const container = document.getElementById('twikoo-feedback');
        if (!container) return;

        const header = document.querySelector('#feedbackModal .feedback-modal-header h3');
        const statsEl = container.querySelector('.wl-info');
        const sortEl = container.querySelector('.wl-sort');
        const footer = container.querySelector('.wl-footer');
        const countEl = container.querySelector('.wl-count');

        if ((!statsEl || !sortEl || !footer) && this.walineAdjustAttempts < 10) {
            this.walineLayoutTimer = setTimeout(() => this.tryAdjustWalineLayout(), 200);
            return;
        }

        // 1. 统计数移到标题右侧
        if (statsEl && header) {
            const countText = statsEl.textContent.trim();
            if (countText && !header.querySelector('.wl-comment-count')) {
                const span = document.createElement('span');
                span.className = 'wl-comment-count';
                span.textContent = countText;
                header.appendChild(span);
            }
            statsEl.style.display = 'none';
        }

        // 2. 排序按钮居中（CSS 已处理）
        if (sortEl) {
            const cards = container.querySelector('.wl-cards');
            if (cards && cards.parentNode) {
                cards.parentNode.insertBefore(sortEl, cards);
            }
        }

        // 3. 操作按钮左右分布
        if (footer) {
            const actions = footer.querySelector('.wl-actions');
            if (actions && !actions.querySelector('.wl-actions-left')) {
                const allBtns = Array.from(actions.children);
                const loginBtn = allBtns.find(b => b.classList.contains('wl-login') || b.classList.contains('wl-user'));
                const submitBtn = allBtns.find(b => b.classList.contains('wl-submit'));
                const otherBtns = allBtns.filter(b => b !== loginBtn && b !== submitBtn);

                const leftDiv = document.createElement('div');
                leftDiv.className = 'wl-actions-left';
                otherBtns.forEach(b => leftDiv.appendChild(b));

                const rightDiv = document.createElement('div');
                rightDiv.className = 'wl-actions-right';
                if (loginBtn) rightDiv.appendChild(loginBtn);
                if (submitBtn) rightDiv.appendChild(submitBtn);

                actions.innerHTML = '';
                actions.appendChild(leftDiv);
                actions.appendChild(rightDiv);
            }
        }

        // 4. 字数统计移到输入框下方右下角
        if (countEl) {
            const panel = container.querySelector('.wl-panel');
            if (panel && !panel.contains(countEl)) {
                panel.appendChild(countEl);
            }
        }

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
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeFeedbackModal());
    }

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

    initFloatingButtonsEffect() {
        let scrollTimer;
        const floatingBtns = document.querySelector('.floating-buttons');
        if (!floatingBtns) return;
        window.addEventListener('scroll', () => {
            floatingBtns.style.opacity = '0.4';
            floatingBtns.style.transition = 'opacity 0.3s ease';
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => { floatingBtns.style.opacity = '1'; }, 1000);
        }, { passive: true });
    }

    initCoreComponents() {
        try {
            if (typeof CompactSidebar !== 'undefined') {
                if (!window.sidebar || !window.sidebar.isInitialized) {
                    this.components.sidebar = new CompactSidebar();
                    this.components.sidebar.init().catch(err => console.error('侧边栏初始化失败:', err));
                } else {
                    this.components.sidebar = window.sidebar;
                }
            }
        } catch (e) { console.error('核心组件初始化失败:', e); }
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
                    } else this.modules.search = window.searchModule;
                } catch (e) { console.error('搜索模块初始化失败:', e); }
            }
            if (typeof WallpaperModule !== 'undefined') { this.modules.wallpaper = new WallpaperModule(); initPromises.push(this.modules.wallpaper.init?.()); }
            if (typeof GreetingModule !== 'undefined') { this.modules.greeting = new GreetingModule(); initPromises.push(this.modules.greeting.init?.()); }
            if (typeof OptimizedNavigation !== 'undefined') { this.modules.navigation = new OptimizedNavigation(); window.optimizedNavigation = this.modules.navigation; initPromises.push(this.modules.navigation.init?.()); }
            if (typeof FooterModule !== 'undefined') { this.modules.footer = new FooterModule(); initPromises.push(this.modules.footer.init?.()); }
            if (typeof WeatherModule !== 'undefined') { this.modules.weather = new WeatherModule(); initPromises.push(this.modules.weather.init?.()); }
            if (typeof AnnouncementModule !== 'undefined') {
                if (!window.announcementModule) { this.modules.announcement = new AnnouncementModule(); window.announcementModule = this.modules.announcement; }
                else this.modules.announcement = window.announcementModule;
            }
            if (typeof AboutModule !== 'undefined') {
                if (!window.aboutModule) { this.modules.about = new AboutModule(); window.aboutModule = this.modules.about; }
                else this.modules.about = window.aboutModule;
            }
            Promise.all(initPromises.map(p => p?.catch(() => {}))).then(() => console.log('所有模块初始化完成'));
        } catch (e) { console.error('模块初始化失败:', e); }
    }

    initDependentComponents() {
        try { if (typeof Navbar !== 'undefined') this.components.navbar = new Navbar(); } catch (e) { console.error('依赖组件初始化失败:', e); }
    }

    setupErrorHandling() {
        const ignored = ['Script error', 'ResizeObserver loop', 'Loading failed', 'Failed to fetch', 'Unexpected identifier', 'Unexpected token', 'Script error.'];
        const handler = (event) => {
            const msg = (event.error || event.reason)?.message || event.message || '未知错误';
            if (!ignored.some(ig => msg.includes(ig) || (event.filename === '' && msg === 'Script error.'))) {
                console.error('应用错误:', msg);
                if (!document.hidden) this.showToast('页面遇到问题，建议刷新页面', 'error');
            }
        };
        window.addEventListener('error', handler);
        window.addEventListener('unhandledrejection', handler);
    }

    initStorage() {
        if (typeof Storage === 'undefined') return;
        if (!Storage.get('first_visit_time')) Storage.set('first_visit_time', new Date().toISOString());
        let vc = Storage.get('visit_count') || 0; Storage.set('visit_count', ++vc); Storage.set('last_visit_time', new Date().toISOString());
    }

    setupGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); this.showSearch(); }
            if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) { e.preventDefault(); this.refreshPageWithAnimation(); }
        });
        window.addEventListener('online', () => this.showToast('网络已连接', 'success'));
        window.addEventListener('offline', () => this.showToast('网络已断开', 'warning'));
        document.addEventListener('visibilitychange', () => { if (!document.hidden) this.refreshOnVisibility(); });
    }

    refreshOnVisibility() {
        if (this.modules.greeting?.updateDateTime) this.modules.greeting.updateDateTime();
        const now = Date.now();
        if (this.lastWeatherUpdate && (now - this.lastWeatherUpdate > 10*60*1000)) {
            if (this.modules.weather?.loadWeatherData) { this.modules.weather.loadWeatherData(); this.lastWeatherUpdate = now; }
        }
    }

    registerModal(modal) {
        if (!modal?.hide) return;
        if (!this.activeModals.includes(modal)) {
            this.activeModals.push(modal);
            if (this.activeModals.length > 1) {
                const prev = this.activeModals[this.activeModals.length-2];
                if (prev?.hide) prev.hide();
            }
            if (this.components.sidebar?.isVisible?.()) this.components.sidebar.hide();
        }
    }
    unregisterModal(modal) { const idx = this.activeModals.indexOf(modal); if (idx > -1) this.activeModals.splice(idx, 1); }
    closeAllModals() {
        [...this.activeModals].forEach(m => { try { m.hide(); } catch(e) {} });
        this.activeModals = [];
        if (this.components.sidebar?.isVisible?.()) this.components.sidebar.hide();
        if (this.components.navbar?.hideMusicPlayer) this.components.navbar.hideMusicPlayer();
        if (this.modules.search?.isModalOpen && this.modules.search.hide) this.modules.search.hide();
        this.closeFeedbackModal();
        this.hideNotebookModal();
    }

    showToast(msg, type='info') { window.toast.show(msg, type); }
    showSearch() { this.modules.search?.showModal?.() || this.showToast('搜索暂不可用', 'warning'); }
    showAnnouncement() { this.modules.announcement?.showModal?.() || this.showToast('公告暂不可用', 'warning'); }
    showWeather() { this.modules.weather?.showModal?.() || this.showToast('天气暂不可用', 'warning'); }
    showAbout() { this.modules.about?.show?.() || this.showToast('关于暂不可用', 'warning'); }
    toggleMusicPlayer() { this.components.navbar?.toggleMusicPlayer?.() || this.showToast('音乐暂不可用', 'warning'); }

    refreshAllModules() {
        this.modules.wallpaper?.refreshWallpaper?.();
        this.modules.weather?.loadWeatherData?.();
        this.modules.announcement?.loadAnnouncements?.();
        this.components.sidebar?.loadWallpaperUserInfo?.();
        this.components.sidebar?.loadDailyQuote?.();
    }

    refreshPageWithAnimation() {
        document.body.style.opacity = '0.8';
        document.body.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            this.refreshAllModules();
            setTimeout(() => { document.body.style.opacity = '1'; }, 500);
        }, 300);
    }

    toggleSidebar() { this.components.sidebar?.toggle?.(); }
    showSidebar() { this.components.sidebar?.show?.(); }
    hideSidebar() { this.components.sidebar?.hide?.(); }

    destroy() {
        this.closeAllModals();
        Object.entries(this.components).forEach(([n,c]) => c?.destroy?.());
        Object.entries(this.modules).forEach(([n,m]) => m?.destroy?.());
        this.components = {}; this.modules = {}; this.activeModals = []; this.isInitialized = false;
    }
}

if (!window.app) {
    window.app = new App();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.app && !window.app.isInitialized) window.app.init();
    });
}
window.getApp = () => window.app;