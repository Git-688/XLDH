/**
 * 侧边栏组件 - 毛玻璃效果（优化版）
 * 功能：滚动位置保持、transform 动画、视频缓存、模态框互斥、动态高度计算（底部间距与容器一致）
 */
class CompactSidebar {
    constructor() {
        if (!document.getElementById('sidebar')) return;
        if (window.sidebar && window.sidebar instanceof CompactSidebar) {
            return window.sidebar;
        }

        this.categories = [
            // ... 你的分类数据保持不变（此处省略，与之前相同）
        ];

        this.isInitialized = false;
        this.currentVideo = null;
        this.videoCache = null;
        this.lastVideoDate = null;
        this.savedScrollY = 0;
        this.modalRegistered = false;
        this.defaultAvatar = './assets/logo.png';
        this.resizeObserver = null;      // 用于监听容器大小变化
        this.bottomGap = 16;             // 默认底部间距（px），会动态计算
    }

    // 获取默认头像 SVG（省略，与原代码相同）
    getDefaultAvatarSVG() { /* ... */ }

    async init() {
        if (this.isInitialized) return;
        try {
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }
            this.loadExpandedState();
            this.render();
            this.bindEvents();
            await this.loadUserData();
            await this.loadDailyQuote();
            await this.loadWallpaperUserInfo();
            this.createProfileModal();
            this.initResizeObserver();      // 监听容器大小变化
            this.updateDimensions();        // 首次动态计算高度
            this.isInitialized = true;
            window.sidebar = this;
        } catch (error) {
            console.error('侧滑栏初始化失败:', error);
            window.toast?.show('侧滑栏初始化失败', 'error');
        }
    }

    // 初始化 ResizeObserver，监听 .container 的大小变化，动态调整侧滑栏高度
    initResizeObserver() {
        if (typeof ResizeObserver === 'undefined') {
            // 降级：监听窗口 resize 事件
            window.addEventListener('resize', () => this.updateDimensions());
            return;
        }
        const container = document.querySelector('.container');
        if (!container) return;
        this.resizeObserver = new ResizeObserver(() => {
            this.updateDimensions();
        });
        this.resizeObserver.observe(container);
    }

    /**
     * 动态计算侧滑栏的最大高度和底部间距
     * 原理：获取 .container 的上内边距（用于顶部对齐）和下内边距（用于底部留空）
     * 同时确保侧滑栏不超出视口
     */
    updateDimensions() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        // 获取任意一个 .container 元素（通常页面只有一个）
        const container = document.querySelector('.container');
        if (!container) return;

        // 获取容器的上下内边距（像素值）
        const containerStyle = window.getComputedStyle(container);
        const containerPaddingTop = parseFloat(containerStyle.paddingTop);
        const containerPaddingBottom = parseFloat(containerStyle.paddingBottom);

        // 导航栏高度（固定 60px）
        const navbarHeight = 60;
        // 壁纸区域顶部内边距（与 .greeting-section 或 .wallpaper-section 的 margin-top 有关）
        // 这里我们动态获取壁纸区域的 margin-top（如果有），否则使用默认值
        let wallpaperMarginTop = 0;
        const wallpaperSection = document.querySelector('.wallpaper-section');
        if (wallpaperSection) {
            const sectionStyle = window.getComputedStyle(wallpaperSection);
            wallpaperMarginTop = parseFloat(sectionStyle.marginTop);
        }
        // 顶部偏移 = 导航栏高度 + 壁纸区域上边距
        const topOffset = navbarHeight + wallpaperMarginTop;

        // 底部间距：使用容器的下内边距 + 页面底部可能的安全区域
        let bottomGap = containerPaddingBottom;
        // 如果页面底部有额外的 margin（如 footer），可以加上，但通常不需要
        // 这里确保最小底部间距为 16px（避免贴边）
        bottomGap = Math.max(bottomGap, 16);
        this.bottomGap = bottomGap;

        // 计算最大高度：视口高度 - 顶部偏移 - 底部间距
        const maxHeight = window.innerHeight - topOffset - bottomGap;
        if (maxHeight > 0) {
            sidebar.style.maxHeight = `${maxHeight}px`;
        }

        // 同时更新顶部位置（确保与壁纸区域顶部持平）
        sidebar.style.top = `${topOffset}px`;
        // 左侧间距保持原有 CSS 变量控制，无需 JS 干预
    }

    // 渲染（保持与原代码相同，省略详细内容，但保留所有功能）
    render() { /* ... 与原 sidebar.js 相同 */ }

    // 绑定事件（与原相同）
    bindEvents() { /* ... */ }

    // 展开/收起（与原相同）
    toggleCategory(categoryGroup) { /* ... */ }
    saveExpandedState() { /* ... */ }
    loadExpandedState() { /* ... */ }

    // 处理菜单项点击（与原相同）
    handleCategoryItemClick(item) { /* ... */ }
    handleFooterClick(btn) { /* ... */ }

    // 显示/隐藏（滚动位置保存）
    show() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || this.isVisible()) return;

        // 动态更新尺寸（确保显示时高度正确）
        this.updateDimensions();

        this.savedScrollY = window.scrollY;
        document.body.classList.add('sidebar-open');
        document.body.style.top = `-${this.savedScrollY}px`;

        sidebar.classList.add('active');
        if (window.app && !this.modalRegistered) {
            window.app.registerModal(this);
            this.modalRegistered = true;
        }

        this.loadSidebarWallpaper();
    }

    hide() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || !this.isVisible()) return;

        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        document.body.style.top = '';
        window.scrollTo(0, this.savedScrollY);

        if (window.app && this.modalRegistered) {
            window.app.unregisterModal(this);
            this.modalRegistered = false;
        }
        if (this.currentVideo) this.currentVideo.pause();
    }

    toggle() { this.isVisible() ? this.hide() : this.show(); }
    isVisible() { const s = document.getElementById('sidebar'); return s ? s.classList.contains('active') : false; }

    // 壁纸相关（与原相同，含视频缓存）
    async loadSidebarWallpaper() { /* ... */ }
    getLocalWallpaper(dayOfWeek) { /* ... */ }
    async setVideoWallpaper(videoUrl) { /* ... */ }
    setFallbackBackground() { /* ... */ }
    adjustWallpaperSize() { /* ... */ }

    // 用户信息（与原相同）
    async loadWallpaperUserInfo() { /* ... */ }
    observeLazyAvatar(img) { /* ... */ }
    async loadUserData() { /* ... */ }
    async loadDailyQuote() { /* ... */ }

    // 个人资料模态框（与原相同）
    createProfileModal() { /* ... */ }
    bindProfileModalEvents() { /* ... */ }
    async autoGetQQAvatar() { /* ... */ }
    saveProfileSettings() { /* ... */ }
    openProfileModal() { /* ... */ }
    hideProfileModal() { /* ... */ }

    // 辅助方法
    escapeHtml(str) { /* ... */ }

    // 销毁
    destroy() {
        this.hide();
        if (this.currentVideo) this.currentVideo.pause();
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (window.app && this.modalRegistered) window.app.unregisterModal(this);
    }
}

// 自动初始化（单例）
if (!window.sidebarInitialized) {
    window.sidebarInitialized = true;
    const initSidebar = async () => {
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        if (!window.sidebar) {
            window.sidebar = new CompactSidebar();
            await window.sidebar.init();
        }
    };
    initSidebar().catch(console.error);
}
window.getSidebar = () => window.sidebar;