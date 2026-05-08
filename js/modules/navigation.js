/**
 * 优化分类导航系统（基于后端 Worker + D1）
 * 包含：缓存容错、后台静默更新、去重请求、全站搜索
 * CSP修复：移除图片 onerror 内联事件
 */
class OptimizedNavigation {
    constructor() {
        this.navigationData = null;
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        
        this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        this.isNavigationClick = false;
        this.skeletonCount = 6;
        this.cacheKey = 'nav_data_cache';
        this.updateTimer = null;
        this.UPDATE_INTERVAL = 5 * 60 * 1000;
        this.quietUpdate = true;
        this.pendingNavRequest = null;            // 去重请求

        // 搜索相关
        this.allSitesFlat = [];                   // 扁平化的所有网站列表
        this.searchInput = null;                  // 搜索框元素
        this.isSearching = false;                 // 是否处于搜索模式
        this.searchTimer = null;                  // 防抖定时器
    }

    /* ==================== 安全工具 ==================== */
    _escapeHtml(str) {
        if (typeof Utils !== 'undefined' && typeof Utils.escapeHtml === 'function') {
            return Utils.escapeHtml(str);
        }
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }

    _formatViews(views) {
        if (typeof Utils !== 'undefined' && typeof Utils.formatViews === 'function') {
            return Utils.formatViews(views);
        }
        if (views >= 1000000) return `${(views / 1000000).toFixed(1).replace('.0', '')}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1).replace('.0', '')}K`;
        return String(views);
    }

    /* ==================== 初始化 ==================== */
    async init() {
        if (this.isInitialized) return;
        this.showSkeleton();
        this.bindEvents();
        this.createSearchBox();                  // 添加搜索框
        try {
            await this.loadNavigationData();
            this.buildFlatSiteList();            // 构建扁平网站列表
            this.calculateStats();
            this.renderNavigation();
            const firstCategory = this.getFirstCategory();
            if (firstCategory) this.selectLevel1(firstCategory, false);
            this.isInitialized = true;
            this.startBackgroundUpdates();
        } catch (error) {
            console.error('导航初始化失败:', error);
            const cached = this.loadCache();
            if (cached) {
                this.navigationData = cached;
                this.buildFlatSiteList();
                this.calculateStats();
                this.renderNavigation();
                const firstCategory = this.getFirstCategory();
                if (firstCategory) this.selectLevel1(firstCategory, false);
                window.toast.show('网络异常，已加载本地缓存数据', 'warning');
                this.isInitialized = true;
                this.startBackgroundUpdates();
            } else {
                this.showError();
            }
        }
    }

    /* ==================== 搜索框创建 ==================== */
    createSearchBox() {
        const header = document.querySelector('.navigation-header');
        if (!header) return;

        // 避免重复创建
        if (header.querySelector('.nav-search-box')) return;

        const container = document.createElement('div');
        container.className = 'nav-search-box';
        container.innerHTML = `
            <div class="search-input-wrapper">
                <i class="fas fa-search search-icon-prefix"></i>
                <input type="text" id="navSearchInput" placeholder="搜索本站链接..." autocomplete="off">
                <button class="search-clear-btn" id="navSearchClearBtn" style="display:none;" aria-label="清除搜索">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <span class="search-result-hint" id="navSearchHint" style="display:none;"></span>
        `;

        // 插入到 header-content 右侧，stats 之前
        const headerContent = header.querySelector('.header-content');
        if (headerContent) {
            headerContent.insertBefore(container, headerContent.querySelector('.navigation-stats'));
        } else {
            header.appendChild(container);
        }

        this.searchInput = container.querySelector('#navSearchInput');
        const clearBtn = container.querySelector('#navSearchClearBtn');
        const hintEl = container.querySelector('#navSearchHint');

        // 输入事件（防抖）
        this.searchInput.addEventListener('input', () => {
            const query = this.searchInput.value.trim();
            clearBtn.style.display = query ? 'flex' : 'none';

            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                if (query) {
                    this.performSearch(query);
                } else {
                    this.clearSearch();
                }
            }, 300);
        });

        // 清除按钮
        clearBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            clearBtn.style.display = 'none';
            this.clearSearch();
            this.searchInput.focus();
        });

        // 快捷键：Ctrl+K 聚焦搜索框
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.searchInput?.focus();
            }
        });
    }

    /* 构建扁平网站列表，供搜索使用 */
    buildFlatSiteList() {
        this.allSitesFlat = [];
        if (!this.navigationData?.categories) return;
        for (const [catName, subCats] of Object.entries(this.navigationData.categories)) {
            for (const [subName, sites] of Object.entries(subCats)) {
                sites.forEach(site => {
                    this.allSitesFlat.push({
                        ...site,
                        category: catName,
                        subcategory: subName
                    });
                });
            }
        }
    }

    /* 执行搜索 */
    performSearch(query) {
        if (!this.allSitesFlat.length) return;
        this.isSearching = true;

        const keyword = query.toLowerCase();
        const results = this.allSitesFlat.filter(site =>
            (site.title && site.title.toLowerCase().includes(keyword)) ||
            (site.description && site.description.toLowerCase().includes(keyword)) ||
            (site.url && site.url.toLowerCase().includes(keyword))
        );

        // 展示搜索结果
        const container = document.getElementById('level3Content');
        if (!container) return;
        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-search"></i></div>
                    <h3 class="empty-title">未找到相关链接</h3>
                    <p class="empty-subtitle">试试其他关键词</p>
                </div>`;
        } else {
            results.forEach((site, idx) => {
                const card = this.createSiteCard(site, idx);
                container.appendChild(card);
            });
        }

        // 更新提示
        const hint = document.getElementById('navSearchHint');
        if (hint) {
            hint.style.display = 'block';
            hint.textContent = `找到 ${results.length} 个结果`;
        }

        // 清空一级/二级高亮（不选中任何分类）
        document.querySelectorAll('.level1-btn, .level2-btn').forEach(b => b.classList.remove('active'));
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
    }

    /* 清除搜索，恢复原视图 */
    clearSearch() {
        if (!this.isSearching) return;
        this.isSearching = false;

        const hint = document.getElementById('navSearchHint');
        if (hint) hint.style.display = 'none';

        // 恢复之前选中的分类/子分类，或默认第一个
        if (this.selectedLevel1 && this.navigationData?.categories?.[this.selectedLevel1]) {
            this.selectLevel1(this.selectedLevel1, false);
        } else {
            const firstCat = this.getFirstCategory();
            if (firstCat) this.selectLevel1(firstCat, false);
        }
    }

    /* ==================== 数据加载与缓存（含去重） ==================== */
    async loadNavigationData(retryCount = 0) {
        try {
            const data = await this.loadFromAPI(retryCount);
            this.navigationData = data;
            this.saveCache(data);
            console.log('✅ 导航数据从 API 加载成功');
        } catch (error) {
            const cached = this.loadCache();
            if (cached) {
                console.warn('⚠️ 使用本地缓存的导航数据');
                this.navigationData = cached;
                window.toast.show('数据更新失败，展示近期缓存', 'warning');
            } else {
                throw error;
            }
        }
    }

    async loadFromAPI(retryCount = 0) {
        if (this.pendingNavRequest) return this.pendingNavRequest;

        const apiUrl = `https://api.xjdh688.ccwu.cc/navigation?_=${Date.now()}`;
        this.pendingNavRequest = (async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                const response = await fetch(apiUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                if (retryCount < 3) {
                    const delay = Math.pow(2, retryCount) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.loadFromAPI(retryCount + 1);
                }
                throw new Error('无法加载导航数据，请检查网络');
            } finally {
                this.pendingNavRequest = null;
            }
        })();
        return this.pendingNavRequest;
    }

    saveCache(data) {
        try {
            sessionStorage.setItem(this.cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {}
    }

    loadCache() {
        try {
            const raw = sessionStorage.getItem(this.cacheKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp < 86400000) return parsed.data;
        } catch (e) {}
        return null;
    }

    async fetchLatestFromAPI(silent = false) {
        try {
            const apiUrl = `https://api.xjdh688.ccwu.cc/navigation?_=${Date.now()}`;
            const response = await fetch(apiUrl);
            if (!response.ok) return;
            const latest = await response.json();
            if (!latest?.categories) return;
            const oldStr = JSON.stringify(this.navigationData?.categories || {});
            const newStr = JSON.stringify(latest.categories || {});
            if (oldStr === newStr) return;
            this.navigationData = latest;
            this.saveCache(latest);
            this.buildFlatSiteList();          // 更新扁平列表
            this.calculateStats();
            if (!silent && this.quietUpdate) {
                window.toast.show('导航数据已自动更新', 'info');
            }
            if (!this.isSearching) {
                if (!this.selectedLevel1 || latest.categories.hasOwnProperty(this.selectedLevel1)) {
                    this.renderAll();
                }
            }
            console.log('🔄 后台静默更新完成');
        } catch (e) {
            console.warn('后台更新失败:', e.message);
        }
    }

    /* ==================== 统计与渲染 ==================== */
    calculateStats() {
        if (this.navigationData?.categories) {
            let total = 0, invalid = 0;
            for (const category in this.navigationData.categories) {
                for (const sub in this.navigationData.categories[category]) {
                    const sites = this.navigationData.categories[category][sub];
                    total += sites.length;
                    invalid += sites.filter(s => s.valid === false).length;
                }
            }
            this.stats.totalWebsites = total;
            this.stats.invalidCount = invalid;
            this.stats.totalCategories = Object.keys(this.navigationData.categories).length;
        }
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const el1 = document.getElementById('siteCount');
        const el2 = document.getElementById('invalidCount');
        if (el1) el1.textContent = `${this.stats.totalWebsites}+`;
        if (el2) el2.textContent = this.stats.invalidCount;
    }

    renderAll() {
        this.renderNavigation();
        if (this.selectedLevel1) {
            this.selectLevel1(this.selectedLevel1, false);
        } else if (this.getFirstCategory()) {
            this.selectLevel1(this.getFirstCategory(), false);
        }
    }

    renderNavigation() {
        this.renderLevel1();
        this.renderEmptyState();
    }

    renderLevel1() {
        const container = document.getElementById('level1Nav');
        if (!container || !this.navigationData?.categories) return;
        const categories = Object.keys(this.navigationData.categories);
        container.innerHTML = '';
        categories.forEach((cat, idx) => {
            const btn = document.createElement('button');
            btn.className = `level1-btn ${idx === 0 ? 'active' : ''}`;
            btn.dataset.level1 = cat;
            btn.title = this.navigationData.descriptions?.[cat] || '';
            btn.innerHTML = `<span class="level1-btn-text">${this._escapeHtml(cat)}</span>`;
            container.appendChild(btn);
        });
    }

    renderLevel2(level1) {
        const container = document.getElementById('level2Nav');
        if (!container || !this.navigationData?.categories?.[level1]) return;
        const subCats = Object.keys(this.navigationData.categories[level1]);
        container.innerHTML = '';
        if (!subCats.length) {
            container.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:11px;text-align:center;">暂无子分类</div>';
            return;
        }
        subCats.forEach((subName, idx) => {
            const sites = this.navigationData.categories[level1][subName] || [];
            const btn = document.createElement('button');
            btn.className = `level2-btn ${idx === 0 ? 'active' : ''}`;
            btn.dataset.level2 = subName;
            btn.title = subName;
            btn.innerHTML = `<span class="level2-btn-text">${this._escapeHtml(subName)}</span>
                ${sites.length ? `<span class="level2-btn-count">${sites.length}</span>` : ''}`;
            container.appendChild(btn);
        });
    }

    renderLevel3(level1, level2) {
        const container = document.getElementById('level3Content');
        if (!container || !this.navigationData?.categories?.[level1]?.[level2]) return;
        const sites = this.navigationData.categories[level1][level2];
        container.innerHTML = '';
        if (!sites.length) { this.renderEmptyState(); return; }
        sites.forEach((site, idx) => container.appendChild(this.createSiteCard(site, idx)));
    }

    createSiteCard(site, index) {
        const card = document.createElement('a');
        card.className = `site-card ${site.valid === false ? 'invalid' : ''}`;
        card.href = site.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.title = `${site.title}\n${site.description || ''}`;

        let iconHtml = '<i class="fas fa-link"></i>';
        if (site.icon) {
            const raw = site.icon.trim();
            if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('./') || /\.(png|jpg|jpeg|ico|svg)/i.test(raw)) {
                iconHtml = `<img src="${this._escapeHtml(raw)}" alt="" loading="lazy" class="js-img-fallback" data-fallback-type="icon">`;
            } else if (raw.startsWith('fas ') || raw.startsWith('fab ')) {
                iconHtml = `<i class="${raw}"></i>`;
            } else {
                iconHtml = `<span>${this._escapeHtml(raw)}</span>`;
            }
        }

        const views = site.views || 0;
        const formattedViews = this._formatViews(views);

        card.innerHTML = `
            <div class="card-top">
                <div class="icon-container">${iconHtml}</div>
                <div class="card-top-right">
                    <button class="report-dead-link-btn" data-url="${this._escapeHtml(site.url)}" data-title="${this._escapeHtml(site.title)}" title="报告死链">
                        <i class="fas fa-exclamation-triangle"></i>
                    </button>
                    <div class="views-container">
                        <i class="fas fa-eye views-icon"></i>
                        <span class="view-count" data-views="${views}">${formattedViews}</span>
                    </div>
                </div>
            </div>
            <div class="divider-line"></div>
            <div class="card-bottom">
                <div class="site-title">${this._escapeHtml(site.title)}</div>
                <div class="site-description">${this._escapeHtml(site.description || '暂无描述')}</div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('report-dead-link-btn') || e.target.closest('.report-dead-link-btn')) return;
            this.isNavigationClick = true;
            if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
            fetch('https://api.xjdh688.ccwu.cc/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: site.url, title: site.title })
            }).catch(() => {});
            const viewEl = card.querySelector('.view-count');
            if (viewEl) {
                let cur = parseInt(viewEl.dataset.views) || 0;
                cur++;
                viewEl.dataset.views = cur;
                viewEl.textContent = this._formatViews(cur);
                viewEl.classList.add('increasing');
                setTimeout(() => viewEl.classList.remove('increasing'), 300);
            }
            setTimeout(() => {
                this.isNavigationClick = false;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
            }, 100);
        });

        const reportBtn = card.querySelector('.report-dead-link-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = reportBtn.dataset.url;
                const title = reportBtn.dataset.title;
                try {
                    const res = await fetch('https://api.xjdh688.ccwu.cc/report-dead-link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, title })
                    });
                    window.toast.show(res.ok ? '已收到反馈' : '反馈失败', res.ok ? 'success' : 'error');
                } catch {
                    window.toast.show('网络错误', 'error');
                }
            });
        }
        return card;
    }

    /* ==================== 事件绑定（含搜索模式拦截） ==================== */
    bindEvents() {
        document.addEventListener('click', (e) => {
            // 搜索模式下不响应分类切换
            if (this.isSearching) return;

            const level1Btn = e.target.closest('.level1-btn');
            if (level1Btn) {
                this.isNavigationClick = true;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
                this.selectLevel1(level1Btn.dataset.level1, true);
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
                return;
            }
            const level2Btn = e.target.closest('.level2-btn');
            if (level2Btn) {
                this.isNavigationClick = true;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
                this.selectLevel2(level2Btn.dataset.level2, true);
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
                return;
            }
        });
    }

    selectLevel1(level1, isUserClick = false) {
        if (this.selectedLevel1 === level1) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level1-btn').forEach(b => b.classList.toggle('active', b.dataset.level1 === level1));
        this.selectedLevel1 = level1;
        this.renderLevel2(level1);
        this.showSkeleton();
        const firstSub = this.getFirstSubCategory(level1);
        if (firstSub) this.selectLevel2(firstSub, isUserClick);
        else this.renderEmptyState();
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    selectLevel2(level2, isUserClick = false) {
        if (this.selectedLevel2 === level2) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level2-btn').forEach(b => b.classList.toggle('active', b.dataset.level2 === level2));
        this.selectedLevel2 = level2;
        this.showSkeleton();
        setTimeout(() => this.renderLevel3(this.selectedLevel1, level2), 50);
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    getFirstCategory() {
        return this.navigationData?.categories ? Object.keys(this.navigationData.categories)[0] : null;
    }

    getFirstSubCategory(level1) {
        const subs = this.navigationData?.categories?.[level1];
        return subs ? Object.keys(subs)[0] : null;
    }

    showSkeleton() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = this.generateSkeletonHTML();
    }

    generateSkeletonHTML() {
        let html = '';
        for (let i = 0; i < this.skeletonCount; i++) {
            html += `<div class="site-card skeleton-card">
                <div class="card-top"><div class="icon-container skeleton-icon"></div><div class="card-top-right"><div class="skeleton-btn"></div><div class="views-container"><div class="skeleton-views"></div></div></div></div>
                <div class="divider-line skeleton-divider"></div>
                <div class="card-bottom"><div class="site-title skeleton-title"></div><div class="site-description skeleton-description"></div></div>
            </div>`;
        }
        return html;
    }

    renderEmptyState() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-compass"></i></div><h3 class="empty-title">选择一个分类开始探索</h3><p class="empty-subtitle">点击左侧分类查看详细内容</p></div>`;
        }
    }

    showError() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">导航数据加载失败</h3><p class="empty-subtitle">请检查网络或稍后重试</p></div>`;
        }
    }

    refresh() {
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.showSkeleton();
        this.init();
    }

    destroy() {
        if (this.updateTimer) clearInterval(this.updateTimer);
    }
}

window.getOptimizedNavigation = function() {
    return window.optimizedNavigation;
};