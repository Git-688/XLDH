/**
 * 优化分类导航系统（基于后端 Worker + D1）
 * 包含：缓存容错、后台静默更新、去重请求、全站搜索
 * 修复：补充 startBackgroundUpdates 方法，解决“网络异常”误报
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
        this.pendingNavRequest = null;

        this.allSitesFlat = [];
        this.searchInput = null;
        this.isSearching = false;
        this.searchTimer = null;
    }

    _escapeHtml(str) {
        if (typeof Utils !== 'undefined' && typeof Utils.escapeHtml === 'function') return Utils.escapeHtml(str);
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    _formatViews(views) {
        if (typeof Utils !== 'undefined' && typeof Utils.formatViews === 'function') return Utils.formatViews(views);
        if (views >= 1000000) return `${(views / 1000000).toFixed(1).replace('.0', '')}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1).replace('.0', '')}K`;
        return String(views);
    }

    async init() {
        if (this.isInitialized) return;
        this.showSkeleton();
        this.bindEvents();
        this.createSearchBox();
        try {
            await this.loadNavigationData();
            this.buildFlatSiteList();
            this.calculateStats();
            this.renderNavigation();
            const firstCategory = this.getFirstCategory();
            if (firstCategory) this.selectLevel1(firstCategory, false);
            this.isInitialized = true;
            this.startBackgroundUpdates();         // ✅ 现在方法已定义
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
                this.startBackgroundUpdates();     // ✅ 缓存态也启动后台更新
            } else {
                this.showError();
            }
        }
    }

    /* ==================== 后台静默更新 ==================== */
    startBackgroundUpdates() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.updateTimer = setInterval(() => this.fetchLatestFromAPI(true), this.UPDATE_INTERVAL);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.fetchLatestFromAPI(true);
        });
    }

    createSearchBox() {
        const navHeader = document.querySelector('.navigation-header');
        if (!navHeader || navHeader.querySelector('.nav-search-box')) return;

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

        navHeader.appendChild(container);
        this.searchInput = container.querySelector('#navSearchInput');
        const clearBtn = container.querySelector('#navSearchClearBtn');

        this.searchInput.addEventListener('input', () => {
            const query = this.searchInput.value.trim();
            clearBtn.style.display = query ? 'flex' : 'none';
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => query ? this.performSearch(query) : this.clearSearch(), 300);
        });

        clearBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            clearBtn.style.display = 'none';
            this.clearSearch();
            this.searchInput.focus();
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.searchInput?.focus();
            }
        });
    }

    buildFlatSiteList() {
        this.allSitesFlat = [];
        if (!this.navigationData?.categories) return;
        for (const [catName, subCats] of Object.entries(this.navigationData.categories)) {
            for (const [subName, sites] of Object.entries(subCats)) {
                for (const site of sites) {
                    this.allSitesFlat.push({ ...site, category: catName, subcategory: subName });
                }
            }
        }
    }

    performSearch(query) {
        if (!this.allSitesFlat.length) return;
        this.isSearching = true;
        const keyword = query.toLowerCase();
        const results = this.allSitesFlat.filter(site =>
            (site.title && site.title.toLowerCase().includes(keyword)) ||
            (site.description && site.description.toLowerCase().includes(keyword)) ||
            (site.url && site.url.toLowerCase().includes(keyword))
        );

        const container = document.getElementById('level3Content');
        if (!container) return;
        container.innerHTML = results.length === 0
            ? `<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">未找到相关链接</h3><p class="empty-subtitle">试试其他关键词</p></div>`
            : '';
        results.forEach((site, idx) => container.appendChild(this.createSiteCard(site, idx)));

        const hint = document.getElementById('navSearchHint');
        if (hint) { hint.style.display = 'block'; hint.textContent = `找到 ${results.length} 个结果`; }

        document.querySelectorAll('.level1-btn, .level2-btn').forEach(b => b.classList.remove('active'));
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
    }

    clearSearch() {
        if (!this.isSearching) return;
        this.isSearching = false;
        const hint = document.getElementById('navSearchHint');
        if (hint) hint.style.display = 'none';
        if (this.selectedLevel1 && this.navigationData?.categories?.[this.selectedLevel1]) {
            this.selectLevel1(this.selectedLevel1, false);
        } else {
            const firstCat = this.getFirstCategory();
            if (firstCat) this.selectLevel1(firstCat, false);
        }
    }

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
                    await new Promise(r => setTimeout(r, Math.pow(2, retryCount) * 1000));
                    return this.loadFromAPI(retryCount + 1);
                }
                throw new Error('无法加载导航数据，请检查网络');
            } finally {
                this.pendingNavRequest = null;
            }
        })();
        return this.pendingNavRequest;
    }

    saveCache(data) { try { sessionStorage.setItem(this.cacheKey, JSON.stringify({ data, timestamp: Date.now() })); } catch {} }
    loadCache() {
        try {
            const raw = sessionStorage.getItem(this.cacheKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return Date.now() - parsed.timestamp < 86400000 ? parsed.data : null;
        } catch { return null; }
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
            this.buildFlatSiteList();
            this.calculateStats();
            if (!silent && this.quietUpdate) window.toast.show('导航数据已自动更新', 'info');
            if (!this.isSearching && (!this.selectedLevel1 || latest.categories.hasOwnProperty(this.selectedLevel1))) this.renderAll();
        } catch (e) { console.warn('后台更新失败:', e.message); }
    }

    calculateStats() {
        if (this.navigationData?.categories) {
            let total = 0, invalid = 0;
            for (const cat in this.navigationData.categories) {
                for (const sub in this.navigationData.categories[cat]) {
                    const sites = this.navigationData.categories[cat][sub];
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
        if (this.selectedLevel1) this.selectLevel1(this.selectedLevel1, false);
        else if (this.getFirstCategory()) this.selectLevel1(this.getFirstCategory(), false);
    }

    renderNavigation() { this.renderLevel1(); this.renderEmptyState(); }

    renderLevel1() {
        const container = document.getElementById('level1Nav');
        if (!container || !this.navigationData?.categories) return;
        const categories = Object.keys(this.navigationData.categories);
        container.innerHTML = categories.map((cat, idx) =>
            `<button class="level1-btn ${idx === 0 ? 'active' : ''}" data-level1="${cat}" title="${this.navigationData.descriptions?.[cat] || ''}">
                <span class="level1-btn-text">${this._escapeHtml(cat)}</span>
            </button>`
        ).join('');
    }

    renderLevel2(level1) {
        const container = document.getElementById('level2Nav');
        if (!container || !this.navigationData?.categories?.[level1]) return;
        const subCats = Object.keys(this.navigationData.categories[level1]);
        if (!subCats.length) { container.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:11px;text-align:center;">暂无子分类</div>'; return; }
        container.innerHTML = subCats.map((subName, idx) => {
            const sites = this.navigationData.categories[level1][subName] || [];
            return `<button class="level2-btn ${idx === 0 ? 'active' : ''}" data-level2="${subName}" title="${subName}">
                <span class="level2-btn-text">${this._escapeHtml(subName)}</span>${sites.length ? `<span class="level2-btn-count">${sites.length}</span>` : ''}
            </button>`;
        }).join('');
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
                method: 'POST', headers: { 'Content-Type': 'application/json' },
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
            setTimeout(() => { this.isNavigationClick = false; if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false; }, 100);
        });

        const reportBtn = card.querySelector('.report-dead-link-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', async (e) => {
                e.preventDefault(); e.stopPropagation();
                try {
                    const res = await fetch('https://api.xjdh688.ccwu.cc/report-dead-link', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: reportBtn.dataset.url, title: reportBtn.dataset.title })
                    });
                    window.toast.show(res.ok ? '已收到反馈' : '反馈失败', res.ok ? 'success' : 'error');
                } catch { window.toast.show('网络错误', 'error'); }
            });
        }
        return card;
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (this.isSearching) return;
            const l1 = e.target.closest('.level1-btn');
            if (l1) { this.selectLevel1(l1.dataset.level1, true); return; }
            const l2 = e.target.closest('.level2-btn');
            if (l2) { this.selectLevel2(l2.dataset.level2, true); return; }
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
        firstSub ? this.selectLevel2(firstSub, isUserClick) : this.renderEmptyState();
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

    getFirstCategory() { return this.navigationData?.categories ? Object.keys(this.navigationData.categories)[0] : null; }
    getFirstSubCategory(level1) { const subs = this.navigationData?.categories?.[level1]; return subs ? Object.keys(subs)[0] : null; }

    showSkeleton() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = this.generateSkeletonHTML();
    }

    generateSkeletonHTML() {
        return Array(this.skeletonCount).fill(`
            <div class="site-card skeleton-card">
                <div class="card-top"><div class="icon-container skeleton-icon"></div><div class="card-top-right"><div class="skeleton-btn"></div><div class="views-container"><div class="skeleton-views"></div></div></div></div>
                <div class="divider-line skeleton-divider"></div>
                <div class="card-bottom"><div class="site-title skeleton-title"></div><div class="site-description skeleton-description"></div></div>
            </div>
        `).join('');
    }

    renderEmptyState() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-compass"></i></div><h3 class="empty-title">选择一个分类开始探索</h3><p class="empty-subtitle">点击左侧分类查看详细内容</p></div>`;
    }

    showError() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">导航数据加载失败</h3><p class="empty-subtitle">请检查网络或稍后重试</p></div>`;
    }

    refresh() { this.selectedLevel1 = null; this.selectedLevel2 = null; this.showSkeleton(); this.init(); }
    destroy() { if (this.updateTimer) clearInterval(this.updateTimer); }
}

window.getOptimizedNavigation = function() { return window.optimizedNavigation; };