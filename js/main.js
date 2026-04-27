/**
 * 星聚导航主应用程序（模块版）
 * 实现 Code Splitting：首屏核心模块静态导入，非首屏模块动态导入
 */
import { default as CompactSidebar } from './components/sidebar.js';
import { default as Navbar } from './components/navbar.js';
import { default as GreetingModule } from './modules/greeting.js';
import { default as WallpaperModule } from './modules/wallpaper.js';
import { default as OptimizedNavigation } from './modules/navigation.js';
import { default as FooterModule } from './modules/stats.js';
import { default as AnnouncementModule } from './modules/announcement.js';
import { default as CompactTagsModule } from './modules/compact-tags.js';
import { default as AboutModule } from './modules/about.js';

class App {
    constructor() {
        this.components = {};
        this.modules = {};
        this.activeModals = [];
        this.isInitialized = false;
        this.lastWeatherUpdate = null;
        this.notebookModalHideRef = null;

        this.NOTEBOOK_CONFIG = {
            apiUrl: 'https://cn.apihz.cn/api/cunchu/textzd.php',
            id: '10014221',
            key: '4a7768de1cf2e0f41fc0a4005240c837',
            maxNumId: 20
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        if (this.isInitialized) return;
        this.setupErrorHandling();
        await this.loadCoreModules();
        this.initDependentComponents();
        this.setupGlobalEvents();
        this.initNotebookModalEvents();
        this.initFeedbackModalEvents();
        this.initFloatingButtonsEffect();
        this.isInitialized = true;

        window.openFeedbackModal = () => this.openFeedbackModal();
        window.closeFeedbackModal = () => this.closeFeedbackModal();
        window.showNotebookModal = () => this.showNotebookModal();
        window.hideNotebookModal = () => this.hideNotebookModal();
    }

    // ========== 核心模块首屏加载 ==========
    async loadCoreModules() {
        // 侧边栏
        this.components.sidebar = new CompactSidebar();
        await this.components.sidebar.init();

        // 导航栏（绑定全局按钮事件）
        this.components.navbar = new Navbar();

        // 问候区
        this.modules.greeting = new GreetingModule();
        this.modules.greeting.init();

        // 壁纸轮播
        this.modules.wallpaper = new WallpaperModule();

        // 分类导航（首屏最重要）
        this.modules.navigation = new OptimizedNavigation();
        await this.modules.navigation.init();

        // 页脚统计
        this.modules.footer = new FooterModule();
        this.modules.footer.init();

        // 常用标签
        this.modules.tags = new CompactTagsModule();

        // 公告（只创建模态框和按钮，不弹出）
        this.modules.announcement = new AnnouncementModule();

        // 关于网站
        this.modules.about = new AboutModule();
        await this.modules.about.init();
        window.aboutModule = this.modules.about;
    }

    // ========== 按需加载功能 ==========
    async loadSearchModule() {
        if (this.modules.search) return this.modules.search;
        const { default: NewSearchModule } = await import('./modules/search.js');
        this.modules.search = new NewSearchModule();
        window.newSearchModule = this.modules.search;
        return this.modules.search;
    }

    async showSearch() {
        const search = await this.loadSearchModule();
        search.show();
    }

    async loadWeatherModule() {
        if (this.modules.weather) return this.modules.weather;
        const { default: WeatherModule } = await import('./modules/weather.js');
        this.modules.weather = new WeatherModule();
        await this.modules.weather.init();
        window.weatherModule = this.modules.weather;
        return this.modules.weather;
    }

    async showWeather() {
        const weather = await this.loadWeatherModule();
        weather.showModal();
    }

    async loadMusicModule() {
        if (window.musicPlayer) return window.musicPlayer;
        const { default: initMusicPlayer } = await import('./xfyy/music-main.js');
        const player = await initMusicPlayer();
        window.musicPlayer = player;
        return player;
    }

    async toggleMusicPlayer() {
        const player = await this.loadMusicModule();
        if (this.components.navbar?.toggleMusicPlayerCore) {
            this.components.navbar.toggleMusicPlayerCore(player);
        }
    }

    // ========== 反馈/笔记模态框 ==========
    openFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.classList.add('active');
        this.registerModal({ hide: () => this.closeFeedbackModal() });

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
                onCommentLoaded: function () {
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
        this.unregisterModal({ hide: this.closeFeedbackModal.bind(this) });
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

    async loadNotebookData() {
        const listEl = document.getElementById('notebook-list');
        if (!listEl) return;
        if (listEl.innerHTML !== '' && !listEl.querySelector('.loading')) return; // already loaded

        listEl.innerHTML = '<div class="loading">加载笔记中...</div>';
        try {
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
            const validItems = results.filter(item => {
                if (item.code !== 200) return false;
                const title = item.title || '';
                const words = item.words || '';
                return title.trim() !== '' && words.trim() !== '';
            });
            validItems.sort((a, b) => a.numid - b.numid);

            if (validItems.length === 0) {
                listEl.innerHTML = '<div class="empty">暂无笔记记录</div>';
                return;
            }
            const html = validItems.map(item => {
                const title = this.escapeHtml(item.title.trim());
                const time = this.escapeHtml(item.time || '--');
                const words = this.escapeHtml(item.words.trim()).replace(/\n/g, '<br>');
                return `
                    <div class="notebook-item">
                        <div class="notebook-header">
                            <span class="notebook-id">#${item.numid}</span>
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

    showNotebookModal() {
        const modal = document.getElementById('notebookModal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.classList.add('active');
        this.notebookModalHideRef = { hide: () => this.hideNotebookModal() };
        this.registerModal(this.notebookModalHideRef);
        this.loadNotebookData();
    }

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

    initNotebookModalEvents() {
        const modal = document.getElementById('notebookModal');
        const closeBtn = modal?.querySelector('.feedback-modal-close');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideNotebookModal();
            });
        }
        if (closeBtn) closeBtn.addEventListener('click', () => this.hideNotebookModal());
    }

    // ========== 悬浮按钮效果 ==========
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

    // ========== 模态框管理 ==========
    registerModal(modal) {
        if (!modal || typeof modal.hide !== 'function') return;
        if (!this.activeModals.includes(modal)) {
            // 关闭前一个模态框
            if (this.activeModals.length > 0) {
                const prev = this.activeModals[this.activeModals.length - 1];
                if (prev?.hide) prev.hide();
            }
            this.activeModals.push(modal);
        }
    }

    unregisterModal(modal) {
        const index = this.activeModals.findIndex(m => m === modal || (m.hide && modal.hide && m.hide === modal.hide));
        if (index > -1) this.activeModals.splice(index, 1);
    }

    closeAllModals() {
        // 关闭所有注册的模态框
        this.activeModals.forEach(modal => {
            if (modal?.hide) modal.hide();
        });
        this.activeModals = [];

        // 强制关闭已知模态框
        if (this.components.sidebar?.isVisible?.()) this.components.sidebar.hide();
        if (this.components.navbar?.hideMusicPlayer) this.components.navbar.hideMusicPlayer();
        if (this.modules.search?.hide) this.modules.search.hide();
        if (this.modules.weather?.hide) this.modules.weather.hide();
        if (this.modules.announcement?.hide) this.modules.announcement.hide();
        if (this.modules.about?.hide) this.modules.about.hide();
        this.closeFeedbackModal();
        this.hideNotebookModal();
    }

    // ========== 工具方法 ==========
    showToast(message, type = 'info') {
        if (window.toast) {
            window.toast.show(message, type);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupErrorHandling() {
        const ignoredErrors = ['Script error', 'ResizeObserver loop', 'Loading failed', 'Failed to fetch'];
        const handleError = (event) => {
            const error = event.error || event.reason;
            const message = error?.message || event.message || '未知错误';
            if (!ignoredErrors.some(ignored => message.includes(ignored))) {
                console.error('应用错误:', message);
                if (!document.hidden) this.showToast('页面遇到问题，建议刷新页面', 'error');
            }
        };
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleError);
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
            // 刷新（改为刷新数据，非浏览器刷新）
            if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
                e.preventDefault();
                this.refreshPageWithAnimation();
            }
        });

        window.addEventListener('online', () => this.showToast('网络已连接', 'success'));
        window.addEventListener('offline', () => this.showToast('网络已断开', 'warning'));

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // 前台时更新时间（由greeting模块处理）
                if (this.modules.greeting?.updateDateTime) {
                    this.modules.greeting.updateDateTime();
                }
                // 天气超过10分钟自动刷新
                const now = Date.now();
                if (this.lastWeatherUpdate && (now - this.lastWeatherUpdate > 10 * 60 * 1000)) {
                    if (this.modules.weather?.loadWeatherData) {
                        this.modules.weather.loadWeatherData();
                        this.lastWeatherUpdate = now;
                    }
                }
            }
        });
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

    refreshAllModules() {
        this.modules.wallpaper?.refresh?.();
        this.modules.weather?.refreshWeather?.();
        this.modules.navigation?.refresh?.();
        this.components.sidebar?.loadDailyQuote?.();
        this.components.sidebar?.loadWallpaperUserInfo?.();
        this.modules.greeting?.refreshHolidayData?.();
    }

    // 提供给外部获取 App 实例
    static getInstance() {
        return window.app;
    }
}

// 创建全局实例
window.app = new App();
window.getApp = () => window.app;