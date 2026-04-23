/**
 * 星聚导航主应用程序
 * 包含：反馈模态框 + KaTeX + 增强版神木日记（分页、缓存、骨架屏、动态创建模态框）
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
        this.diaryScrollHandler = null;
        // ========================================

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    // ========== 神木日记：动态创建模态框 ==========
    createDiaryModal() {
        if (document.getElementById('diaryModal')) {
            return document.getElementById('diaryModal');
        }

        const modal = document.createElement('div');
        modal.id = 'diaryModal';
        modal.className = 'diary-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            box-sizing: border-box;
        `;

        modal.innerHTML = `
            <div class="modal-content" style="
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 16px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
            ">
                <div class="diary-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid #e9ecef;
                ">
                    <h3 style="margin: 0; font-size: 1.2rem; font-weight: 500; color: #2b2d42;">
                        <i class="fas fa-book-open" style="margin-right: 8px; color: #4361ee;"></i>
                        神木日记
                    </h3>
                    <button id="diaryCloseBtn" style="
                        background: none;
                        border: none;
                        font-size: 1.2rem;
                        cursor: pointer;
                        color: #6c757d;
                        padding: 4px 8px;
                        border-radius: 4px;
                        transition: all 0.2s;
                    ">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="diary-body" style="
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                ">
                    <div class="diary-list" id="diaryList" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 16px 20px;
                    ">
                        <div class="loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>加载日记中...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定关闭事件
        const closeBtn = modal.querySelector('#diaryCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideDiaryModal());
        }

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideDiaryModal();
        });

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                this.hideDiaryModal();
            }
        };
        document.addEventListener('keydown', escHandler);
        modal._escHandler = escHandler;

        return modal;
    }

    // ========== 显示日记模态框 ==========
    showDiaryModal() {
        let modal = document.getElementById('diaryModal');
        if (!modal) {
            modal = this.createDiaryModal();
        }

        modal.style.display = 'flex';
        modal.classList.add('active');

        if (!this.diaryModalHideRef) {
            this.diaryModalHideRef = { hide: this.hideDiaryModal.bind(this) };
        }
        this.registerModal(this.diaryModalHideRef);

        // 重置并加载第一页
        this.loadDiaryBatch(true);
    }

    // ========== 隐藏日记模态框 ==========
    hideDiaryModal() {
        const modal = document.getElementById('diaryModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }

        if (this.diaryModalHideRef) {
            this.unregisterModal(this.diaryModalHideRef);
        }

        const container = document.getElementById('diaryList');
        if (container && this.diaryScrollHandler) {
            container.removeEventListener('scroll', this.diaryScrollHandler);
            this.diaryScrollHandler = null;
        }
    }

    // ========== 加载日记数据（分页） ==========
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

    // ========== 反馈模态框（Twikoo） ==========
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
                onCommentLoaded: () => {
                    const container = document.getElementById('twikoo-feedback');
                    if (container && typeof renderMathInElement !== 'undefined') {
                        renderMathInElement(container, {
                            delimiters: [
                                { left: '$$', right: '$$', display: true },
                                { left: '$', right: '$', display: false }
                            ],
                            throwOnError: false
                        });
                    }
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

    // 日记模态框事件（占位，实际在 createDiaryModal 中绑定）
    initDiaryModalEvents() {}

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
            scrollTimer = setTimeout(() => floatingBtns.style.opacity = '1', 1000);
        }, { passive: true });
    }

    initCoreComponents() {
        try {
            if (typeof CompactSidebar !== 'undefined') {
                if (!window.sidebar || !window.sidebar.isInitialized) {
                    this.components.sidebar = new CompactSidebar();
                    this.components.sidebar.init().catch(e => {
                        console.error('侧边栏初始化失败:', e);
                        this.showToast('侧边栏初始化失败', 'warning');
                    });
                } else {
                    this.components.sidebar = window.sidebar;
                }
            }
        } catch (e) {
            console.error('核心组件初始化失败:', e);
        }
    }

    initModules() {
        try {
            if (typeof SearchModule !== 'undefined') {
                if (!window.searchModule) {
                    this.modules.search = new SearchModule();
                    window.searchModule = this.modules.search;
                } else {
                    this.modules.search = window.searchModule;
                }
            }
            if (typeof WallpaperModule !== 'undefined') this.modules.wallpaper = new WallpaperModule();
            if (typeof GreetingModule !== 'undefined') this.modules.greeting = new GreetingModule();
            if (typeof OptimizedNavigation !== 'undefined') {
                this.modules.navigation = new OptimizedNavigation();
                window.optimizedNavigation = this.modules.navigation;
                this.modules.navigation.init?.();
            }
            if (typeof FooterModule !== 'undefined') this.modules.footer = new FooterModule();
            if (typeof WeatherModule !== 'undefined') this.modules.weather = new WeatherModule();
            if (typeof AnnouncementModule !== 'undefined' && !window.announcementModule) {
                this.modules.announcement = new AnnouncementModule();
                window.announcementModule = this.modules.announcement;
            }
            if (typeof AboutModule !== 'undefined' && !window.aboutModule) {
                this.modules.about = new AboutModule();
                window.aboutModule = this.modules.about;
            }
        } catch (e) {
            console.error('模块初始化失败:', e);
        }
    }

    initDependentComponents() {
        try {
            if (typeof Navbar !== 'undefined') this.components.navbar = new Navbar();
        } catch (e) {}
    }

    setupErrorHandling() {
        const ignored = ['Script error', 'ResizeObserver loop'];
        const handler = (event) => {
            const msg = event.error?.message || event.reason?.message || event.message || '';
            if (!ignored.some(i => msg.includes(i))) {
                console.error('应用错误:', msg);
            }
        };
        window.addEventListener('error', handler);
        window.addEventListener('unhandledrejection', handler);
    }

    initStorage() {
        if (typeof Storage === 'undefined') return;
        if (!Storage.get('first_visit_time')) {
            Storage.set('first_visit_time', new Date().toISOString());
        }
    }

    setupGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showSearch();
            }
        });
    }

    registerModal(modal) {
        if (!modal || typeof modal.hide !== 'function') return;
        if (!this.activeModals.includes(modal)) {
            this.activeModals.push(modal);
        }
    }

    unregisterModal(modal) {
        const idx = this.activeModals.indexOf(modal);
        if (idx > -1) this.activeModals.splice(idx, 1);
    }

    closeAllModals() {
        this.activeModals.forEach(m => { try { m.hide(); } catch (e) {} });
        this.activeModals = [];
        if (this.components.sidebar?.isVisible?.()) this.components.sidebar.hide();
        if (this.components.navbar?.hideMusicPlayer) this.components.navbar.hideMusicPlayer();
        if (this.modules.search?.hide) this.modules.search.hide();
        this.closeFeedbackModal();
    }

    showToast(msg, type = 'info') {
        window.toast?.show(msg, type);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showSearch() {
        if (this.modules.search?.showModal) {
            this.modules.search.showModal();
        } else {
            this.showToast('搜索功能暂不可用', 'warning');
        }
    }

    destroy() {
        this.closeAllModals();
        this.isInitialized = false;
    }
}

// 全局单例
if (!window.app) {
    window.app = new App();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.app?.init());
}
window.getApp = () => window.app;