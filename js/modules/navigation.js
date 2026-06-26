/* navigation.js - 优化版：结构缓存、智能预加载、搜索状态记忆、内存管理 */
class OptimizedNavigation {
    constructor() {
        if (window.Starlink && window.Starlink.navigation) return window.Starlink.navigation;

        // ===== 配置常量 =====
        this.CONFIG = {
            SKELETON_COUNT: 6,
            PAGE_SIZE: 30,
            UPDATE_INTERVAL: 5 * 60 * 1000,
            AUTO_REFRESH_INTERVAL: 5 * 60 * 1000,
            BATCH_SIZE: 8,
            BATCH_DELAY: 200,
            STRUCTURE_CACHE_TTL: 10 * 60 * 1000,  // 结构缓存10分钟
            PRELOAD_DELAY: 300,
            MAX_RETRY: 3,
            RETRY_DELAY: 500,
        };

        // ===== 状态变量 =====
        this.structure = null;
        this.structureCacheTime = 0;
        this.siteCache = new Map();
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        this.isNavigationClick = false;
        this.isSearching = false;
        this.searchInput = null;
        this.searchTimer = null;
        this.searchQuery = '';           // 保存当前搜索词，用于恢复

        // ===== 分页状态 =====
        this.currentPage = 1;
        this.isLoadingMore = false;
        this.hasMore = true;
        this.currentSites = [];
        this.scrollListener = null;
        this.hasShownNoMoreToast = false;

        // ===== 计时器 =====
        this.updateTimer = null;
        this.autoRefreshTimer = null;

        // ===== DOM 引用 =====
        this.imgObserver = null;
        this._scrollPreloadCleanup = null;

        // ===== 图标缓存 =====
        this.iconCache = new Map();
        this.iconLoadingSet = new Set();
        this.iconFailedSet = new Set();

        // ===== 组件挂载 =====
        if (window.Starlink) window.Starlink.navigation = this;
        window.optimizedNavigation = this;
    }

    // ========================================
    // 工具方法
    // ========================================

    _escapeHtml(str) { return Utils.escapeHtml(str); }

    _formatViews(views) {
        if (views >= 1000000) return (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (views >= 1000) return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(views);
    }

    _getFullIconUrl(icon, siteUrl) {
        if (!icon) return '';
        if (icon.startsWith('/icon?domain=')) {
            if (window.Utils?.isWebPSupportedSync?.()) {
                return this.apiBase + icon + '&format=webp';
            }
            return this.apiBase + icon;
        }
        if (icon.startsWith('http://') || icon.startsWith('https://')) {
            if (window.Utils?.isWebPSupportedSync?.() && !icon.match(/\.svg$/i)) {
                return window.Utils.toWebPUrl(icon, 80, 128, 128);
            }
            return icon;
        }
        try {
            const urlObj = new URL(siteUrl);
            const domain = urlObj.hostname;
            if (domain) {
                const base = this.apiBase + `/icon?domain=${encodeURIComponent(domain)}`;
                if (window.Utils?.isWebPSupportedSync?.()) {
                    return base + '&format=webp';
                }
                return base;
            }
        } catch (e) {}
        return '';
    }

    _createIconElement(iconUrl, siteUrl) {
        const fullIconUrl = this._getFullIconUrl(iconUrl, siteUrl);
        if (fullIconUrl) {
            return `<img class="lazy-icon" data-src="${this._escapeHtml(fullIconUrl)}" alt="" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML = '<i class=\\'fas fa-link\\'></i>';">`;
        }
        return '<i class="fas fa-link"></i>';
    }

    _highlightText(text, keyword) {
        if (!keyword || !text) return this._escapeHtml(text);
        const escapedText = this._escapeHtml(text);
        const escapedKeyword = this._escapeHtml(keyword);
        const regex = new RegExp(`(${escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    _generateSkeletonHTML() {
        let html = '';
        for (let i = 0; i < this.CONFIG.SKELETON_COUNT; i++) {
            html += `
                <div class="site-card skeleton-card">
                    <div class="card-top">
                        <div class="icon-container skeleton-icon"></div>
                        <div class="card-top-right">
                            <div class="skeleton-btn skeleton" style="width:14px;height:14px;border-radius:3px;"></div>
                            <div class="views-container">
                                <div class="skeleton-views skeleton" style="width:30px;height:14px;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="divider-line skeleton-divider"></div>
                    <div class="card-bottom">
                        <div class="skeleton-title skeleton"></div>
                        <div class="skeleton-description skeleton"></div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    // ========================================
    // 懒加载 & 图片预加载
    // ========================================

    initLazyLoadObserver() {
        if (this.imgObserver) return;
        if ('IntersectionObserver' in window) {
            this.imgObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                        }
                        this.imgObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '300px 0px 300px 0px',
                threshold: 0.01
            });
        }
    }

    preloadNearbyImages(container) {
        if (!container || !this.imgObserver) return;
        const images = container.querySelectorAll('img[data-src]');
        if (images.length === 0) return;

        const viewportHeight = window.innerHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const buffer = 500;

        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            const imgTop = rect.top + scrollTop;
            const imgBottom = imgTop + rect.height;
            if (imgBottom + buffer > scrollTop && imgTop - buffer < scrollTop + viewportHeight) {
                const src = img.dataset.src;
                if (src && !img.src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    this.imgObserver.unobserve(img);
                }
            }
        });
    }

    observeLazyImages(container) {
        if (!this.imgObserver) return;
        const imgs = container.querySelectorAll('img[data-src]');
        imgs.forEach(img => this.imgObserver.observe(img));
        this.preloadNearbyImages(container);
        this._bindScrollPreload(container);
    }

    _bindScrollPreload(container) {
        if (this._scrollPreloadCleanup) {
            this._scrollPreloadCleanup();
            this._scrollPreloadCleanup = null;
        }
        let scrollTimer = null;
        const scrollHandler = () => {
            if (scrollTimer) clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => this.preloadNearbyImages(container), 200);
        };
        window.addEventListener('scroll', scrollHandler, { passive: true });
        container.addEventListener('scroll', scrollHandler, { passive: true });
        this._scrollPreloadCleanup = () => {
            window.removeEventListener('scroll', scrollHandler);
            container.removeEventListener('scroll', scrollHandler);
        };
    }

    // ========================================
    // 数据加载（含缓存 & 重试）
    // ========================================

    async _fetchWithRetry(url, options = {}, retries = this.CONFIG.MAX_RETRY) {
        let lastError = null;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await Utils.safeFetch(url, {
                    ...options,
                    timeout: 15000,
                    _noRetry: true,
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response;
            } catch (error) {
                lastError = error;
                if (attempt < retries - 1) {
                    await new Promise(r => setTimeout(r, this.CONFIG.RETRY_DELAY * (attempt + 1)));
                }
            }
        }
        throw lastError || new Error('请求失败');
    }

    async loadNavigationStructure(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.structure && (now - this.structureCacheTime) < this.CONFIG.STRUCTURE_CACHE_TTL) {
            return this.structure;
        }
        try {
            const response = await this._fetchWithRetry(`${this.apiBase}/navigation/structure`);
            this.structure = await response.json();
            this.structureCacheTime = now;
            return this.structure;
        } catch (error) {
            if (this.structure) {
                console.warn('获取结构失败，使用缓存结构:', error);
                return this.structure;
            }
            throw error;
        }
    }

    async loadSites(subcategoryId, forceRefresh = false) {
        if (!forceRefresh && this.siteCache.has(subcategoryId)) {
            return this.siteCache.get(subcategoryId);
        }
        try {
            const response = await this._fetchWithRetry(`${this.apiBase}/navigation/sites?subcategory_id=${subcategoryId}`);
            const sites = await response.json();
            this.siteCache.set(subcategoryId, sites);
            return sites;
        } catch (error) {
            const cached = this.siteCache.get(subcategoryId);
            if (cached) {
                console.warn('加载站点失败，使用缓存:', error);
                return cached;
            }
            throw error;
        }
    }

    async loadBatchSites(subIds, forceRefresh = false) {
        if (!subIds || !subIds.length) return {};

        if (!forceRefresh) {
            const allCached = subIds.every(id => this.siteCache.has(id));
            if (allCached) {
                const result = {};
                subIds.forEach(id => { result[id] = this.siteCache.get(id); });
                return result;
            }
        }

        const uncachedIds = subIds.filter(id => !this.siteCache.has(id));
        if (!uncachedIds.length) {
            const result = {};
            subIds.forEach(id => { result[id] = this.siteCache.get(id); });
            return result;
        }

        try {
            const idsParam = uncachedIds.join(',');
            const response = await this._fetchWithRetry(`${this.apiBase}/navigation/batch-sites?ids=${idsParam}`);
            const data = await response.json();

            if (data?.data) {
                for (const [subId, sites] of Object.entries(data.data)) {
                    const id = parseInt(subId);
                    if (!isNaN(id)) this.siteCache.set(id, sites);
                }
            }

            const result = {};
            subIds.forEach(id => {
                result[id] = this.siteCache.get(id) || [];
            });
            return result;
        } catch (error) {
            console.warn('批量加载失败，逐个加载:', error);
            const result = {};
            for (const id of subIds) {
                result[id] = await this.loadSites(id, true);
            }
            return result;
        }
    }

    async loadBatchSitesBatch(subIds, batchSize = this.CONFIG.BATCH_SIZE) {
        if (!subIds || !subIds.length) return {};
        const results = {};
        for (let i = 0; i < subIds.length; i += batchSize) {
            const batch = subIds.slice(i, i + batchSize);
            const batchResult = await this.loadBatchSites(batch);
            Object.assign(results, batchResult);
            batch.forEach(id => this.updateSubcategoryCount(id));
            if (i + batchSize < subIds.length) {
                await new Promise(r => setTimeout(r, this.CONFIG.BATCH_DELAY));
            }
        }
        return results;
    }

    // ========================================
    // 导航状态管理
    // ========================================

    getFirstCategory() {
        return this.structure ? Object.keys(this.structure)[0] : null;
    }

    getFirstSubCategory(level1) {
        return this.structure?.[level1]?.subcategories?.[0] || null;
    }

    updateSubcategoryCount(subcategoryId) {
        const sites = this.siteCache.get(subcategoryId);
        if (!sites) return;
        const count = sites.filter(s => s.valid !== false).length;
        this._updateSubcategoryCountDisplay(subcategoryId, count);
    }

    _updateSubcategoryCountDisplay(subcategoryId, count, retry = 0) {
        const btn = document.querySelector(`.level2-btn[data-level2="${subcategoryId}"]`);
        if (btn) {
            let countSpan = btn.querySelector('.level2-btn-count');
            if (!countSpan) {
                countSpan = document.createElement('span');
                countSpan.className = 'level2-btn-count';
                btn.appendChild(countSpan);
            }
            countSpan.textContent = count;
            countSpan.style.display = 'inline-block';
        } else if (retry < 5) {
            setTimeout(() => this._updateSubcategoryCountDisplay(subcategoryId, count, retry + 1), 100);
        }
    }

    updateStatsDisplay() {
        const el1 = document.getElementById('siteCount');
        const el2 = document.getElementById('invalidCount');
        if (el1) el1.textContent = `${this.stats.totalWebsites || 0}+`;
        if (el2) el2.textContent = this.stats.invalidCount || '0';
    }

    calculateStats() {
        this.stats.totalCategories = this.structure ? Object.keys(this.structure).length : 0;
        this.updateStatsDisplay();
    }

    async calculateTotalValidSites() {
        if (!this.structure) return;
        let total = 0;
        for (const catName in this.structure) {
            for (const sub of this.structure[catName].subcategories) {
                let sites = this.siteCache.get(sub.id);
                if (!sites) sites = await this.loadSites(sub.id, true);
                total += sites.filter(s => s.valid !== false).length;
            }
        }
        this.stats.totalWebsites = total;
        this.updateStatsDisplay();
    }

    async recalculateGlobalInvalidCount() {
        let totalInvalid = 0;
        for (const [subId, sites] of this.siteCache.entries()) {
            totalInvalid += sites.filter(s => s.valid === false).length;
        }
        if (this.structure) {
            for (const catName in this.structure) {
                for (const sub of this.structure[catName].subcategories) {
                    if (!this.siteCache.has(sub.id)) {
                        const sites = await this.loadSites(sub.id, true);
                        totalInvalid += sites.filter(s => s.valid === false).length;
                    }
                }
            }
        }
        this.stats.invalidCount = totalInvalid;
        this.updateStatsDisplay();
    }

    // ========================================
    // 渲染方法
    // ========================================

    renderNavigation() {
        this._renderLevel1();
    }

    _renderLevel1() {
        const container = document.getElementById('level1Nav');
        if (!container || !this.structure) return;
        const categories = Object.keys(this.structure);
        container.innerHTML = categories.map((cat, idx) =>
            `<button class="level1-btn ${idx === 0 ? 'active' : ''}" data-level1="${cat}" title="${this.structure[cat].description || ''}">
                <span class="level1-btn-text">${this._escapeHtml(cat)}</span>
            </button>`
        ).join('');
    }

    renderLevel2(level1) {
        const container = document.getElementById('level2Nav');
        if (!container || !this.structure?.[level1]) return;
        const subCats = this.structure[level1].subcategories;
        if (!subCats.length) {
            container.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:11px;text-align:center;">暂无子分类</div>';
            this._renderEmptyState();
            return;
        }
        container.innerHTML = subCats.map((sub, idx) =>
            `<button class="level2-btn ${idx === 0 ? 'active' : ''}" data-level2="${sub.id}" data-level2-name="${this._escapeHtml(sub.name)}" title="${this._escapeHtml(sub.name)}">
                <span class="level2-btn-text">${this._escapeHtml(sub.name)}</span>
                <span class="level2-btn-count" style="display:none;">0</span>
            </button>`
        ).join('');
    }

    async renderLevel3(level1, subcategoryId) {
        const container = document.getElementById('level3Content');
        if (!container) return;
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoadingMore = false;
        this.hasShownNoMoreToast = false;
        this.currentSites = await this.loadSites(subcategoryId, true);
        if (!this.currentSites.length) {
            this._renderEmptyState();
            return;
        }
        this._renderSitesPage(true);
        this.observeLazyImages(container);
        this._bindInfiniteScroll();
        const validCount = this.currentSites.filter(s => s.valid !== false).length;
        this._updateSubcategoryCountDisplay(subcategoryId, validCount);
        await this.calculateTotalValidSites();
    }

    _renderSitesPage(resetTrigger = true) {
        const container = document.getElementById('level3Content');
        if (!container) return;
        if (resetTrigger) container.innerHTML = '';
        const start = (this.currentPage - 1) * this.CONFIG.PAGE_SIZE;
        const end = start + this.CONFIG.PAGE_SIZE;
        const pageSites = this.currentSites.slice(start, end);
        this.hasMore = end < this.currentSites.length;

        if (this.currentPage === 1) {
            container.innerHTML = '';
            const fragment = document.createDocumentFragment();
            pageSites.forEach((site, idx) => fragment.appendChild(this._createSiteCard(site, idx, false, '')));
            container.appendChild(fragment);
            if (this.hasMore) container.appendChild(this._createLoadingTrigger(true));
        } else {
            const oldTrigger = container.querySelector('#scroll-loading-trigger');
            if (oldTrigger) oldTrigger.remove();
            const fragment = document.createDocumentFragment();
            pageSites.forEach((site, idx) => fragment.appendChild(this._createSiteCard(site, idx, false, '')));
            container.appendChild(fragment);
            if (this.hasMore) container.appendChild(this._createLoadingTrigger(true));
        }
        this.preloadNearbyImages(container);
    }

    _createLoadingTrigger(hasMore) {
        const div = document.createElement('div');
        div.id = 'scroll-loading-trigger';
        div.className = 'scroll-loading-trigger';
        div.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;"></div><span>加载更多...</span>';
        Object.assign(div.style, { textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px' });
        return div;
    }

    _renderEmptyState() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = '';
    }

    showSkeleton() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = this._generateSkeletonHTML();
    }

    showError() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = '<div class="empty-state">加载失败，请刷新重试</div>';
    }

    // ========================================
    // 站点卡片创建（含点击计数、死链报告）
    // ========================================

    _createSiteCard(site, index, isSearchResult = false, keyword = '') {
        const card = document.createElement('a');
        card.className = `site-card ${site.valid === false ? 'invalid' : ''}`;
        card.href = site.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.title = `${site.title}\n${site.description || ''}`;

        const iconHtml = this._createIconElement(site.icon, site.url);
        const views = site.views || 0;
        const formattedViews = this._formatViews(views);

        let titleHtml = this._escapeHtml(site.title);
        let descHtml = this._escapeHtml(site.description || '暂无描述');
        if (isSearchResult && keyword) {
            titleHtml = this._highlightText(site.title, keyword);
            descHtml = this._highlightText(site.description || '暂无描述', keyword);
        }

        card.innerHTML = `
            <div class="card-top">
                <div class="icon-container">${iconHtml}</div>
                <div class="card-top-right">
                    <button class="report-dead-link-btn" data-url="${this._escapeHtml(site.url)}" data-title="${this._escapeHtml(site.title)}" title="报告死链">
                        <i class="fas fa-exclamation-circle"></i>
                    </button>
                    <div class="views-container">
                        <i class="fas fa-eye views-icon"></i>
                        <span class="view-count" data-views="${views}">${formattedViews}</span>
                    </div>
                </div>
            </div>
            <div class="divider-line"></div>
            <div class="card-bottom">
                <div class="site-title">${titleHtml}</div>
                <div class="site-description">${descHtml}</div>
            </div>
        `;

        // —— 点击计数 ——
        card.addEventListener('click', async (e) => {
            if (e.target.closest('.report-dead-link-btn')) return;
            this.isNavigationClick = true;
            if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;

            const viewEl = card.querySelector('.view-count');
            if (!viewEl) {
                try {
                    await Utils.safeFetch(`${this.apiBase}/click`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: site.id, url: site.url }),
                        keepalive: true
                    });
                } catch {}
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
                return;
            }

            const oldViews = parseInt(viewEl.dataset.views) || 0;
            const newViews = oldViews + 1;
            viewEl.dataset.views = newViews;
            viewEl.textContent = this._formatViews(newViews);
            viewEl.classList.add('increasing');
            setTimeout(() => viewEl.classList.remove('increasing'), 300);

            try {
                const response = await Utils.safeFetch(`${this.apiBase}/click`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: site.id, url: site.url }),
                    keepalive: true
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.views !== undefined) {
                        viewEl.dataset.views = data.views;
                        viewEl.textContent = this._formatViews(data.views);
                    }
                }
            } catch {
                viewEl.dataset.views = oldViews;
                viewEl.textContent = this._formatViews(oldViews);
            }

            const siteIndex = this.currentSites.findIndex(s => s.id === site.id);
            if (siteIndex !== -1) this.currentSites[siteIndex].views = parseInt(viewEl.dataset.views);

            setTimeout(() => {
                this.isNavigationClick = false;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
            }, 100);
        });

        // —— 死链报告 ——
        const reportBtn = card.querySelector('.report-dead-link-btn');
        if (reportBtn) {
            if (site.valid === false) {
                reportBtn.disabled = true;
                reportBtn.style.display = 'none';
            } else {
                reportBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (reportBtn.disabled) return;
                    reportBtn.disabled = true;
                    reportBtn.style.opacity = '0.5';
                    reportBtn.style.cursor = 'not-allowed';
                    try {
                        const res = await Utils.safeFetch(`${this.apiBase}/report-dead-link`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: reportBtn.dataset.url, title: reportBtn.dataset.title })
                        });
                        if (res.ok) {
                            window.toast.show('已反馈，管理员将处理', 'success');
                            reportBtn.style.display = 'none';
                            card.classList.add('invalid');
                            const currentSubId = this.selectedLevel2;
                            if (currentSubId) {
                                const cachedSites = this.siteCache.get(currentSubId);
                                if (cachedSites) {
                                    const updatedSites = cachedSites.map(s => {
                                        if (s.url === reportBtn.dataset.url) return { ...s, valid: false };
                                        return s;
                                    });
                                    this.siteCache.set(currentSubId, updatedSites);
                                    await this.renderLevel3(this.selectedLevel1, currentSubId);
                                } else {
                                    await this.renderLevel3(this.selectedLevel1, currentSubId);
                                }
                                const freshSites = await this.loadSites(currentSubId, true);
                                const validCount = freshSites.filter(s => s.valid !== false).length;
                                this._updateSubcategoryCountDisplay(currentSubId, validCount);
                                await this.recalculateGlobalInvalidCount();
                                await this.calculateTotalValidSites();
                            }
                        } else {
                            const err = await res.json().catch(() => ({}));
                            window.toast.show(err.error || '反馈失败', 'error');
                            reportBtn.disabled = false;
                            reportBtn.style.opacity = '';
                            reportBtn.style.cursor = '';
                        }
                    } catch {
                        window.toast.show('网络错误', 'error');
                        reportBtn.disabled = false;
                        reportBtn.style.opacity = '';
                        reportBtn.style.cursor = '';
                    }
                });
            }
        }
        return card;
    }

    // ========================================
    // 分类切换逻辑（核心优化点）
    // ========================================

    async selectLevel1(level1, isUserClick = false) {
        if (this.selectedLevel1 === level1) return;
        this.isNavigationClick = true;

        // 更新一级按钮
        document.querySelectorAll('.level1-btn').forEach(b => b.classList.toggle('active', b.dataset.level1 === level1));
        this.selectedLevel1 = level1;
        this.renderLevel2(level1);
        this.showSkeleton();

        const firstSub = this.getFirstSubCategory(level1);
        if (firstSub) {
            // —— 修复点1：同步更新状态和UI ——
            this.selectedLevel2 = firstSub.id;
            document.querySelectorAll('.level2-btn').forEach(el => {
                el.classList.toggle('active', parseInt(el.dataset.level2) === firstSub.id);
            });

            const firstSites = await this.loadSites(firstSub.id, true);
            this.currentSites = firstSites;
            await this.renderLevel3(this.selectedLevel1, firstSub.id);
            this.updateSubcategoryCount(firstSub.id);

            // —— 优化：后台预加载该分类下所有子分类数据 ——
            const allSubIds = this.structure[level1].subcategories.map(s => s.id);
            const otherSubIds = allSubIds.filter(id => id !== firstSub.id);
            if (otherSubIds.length) {
                const preload = () => {
                    this.loadBatchSitesBatch(otherSubIds).catch(err => {
                        console.warn('预加载子分类失败:', err);
                    });
                };
                if (window.requestIdleCallback) {
                    requestIdleCallback(preload, { timeout: this.CONFIG.PRELOAD_DELAY });
                } else {
                    setTimeout(preload, this.CONFIG.PRELOAD_DELAY);
                }
            }
        } else {
            this._renderEmptyState();
        }
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    async selectLevel2(subcategoryId, subName, isUserClick = false) {
        if (this.selectedLevel2 === subcategoryId) return;
        this.isNavigationClick = true;

        document.querySelectorAll('.level2-btn').forEach(b => b.classList.toggle('active', b.dataset.level2 == subcategoryId));
        this.selectedLevel2 = subcategoryId;
        this.hasShownNoMoreToast = false;

        // 强制刷新
        const sites = await this.loadSites(subcategoryId, true);
        this.currentSites = sites;
        await this.renderLevel3(this.selectedLevel1, subcategoryId);

        const validCount = sites.filter(s => s.valid !== false).length;
        this._updateSubcategoryCountDisplay(subcategoryId, validCount);
        await this.calculateTotalValidSites();

        // 重置自动刷新计时器
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.startAutoRefresh();
        }
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    // ========================================
    // 搜索功能（含状态记忆）
    // ========================================

    createSearchBox() {
        const navHeader = document.querySelector('.navigation-header');
        if (!navHeader || navHeader.querySelector('.nav-search-box')) return;

        const container = document.createElement('div');
        container.className = 'nav-search-box';
        container.innerHTML = `
            <div class="search-input-wrapper">
                <i class="fas fa-search search-icon-prefix"></i>
                <input type="text" id="navSearchInput" placeholder="搜索本站链接..." autocomplete="off">
                <button class="search-clear-btn" id="navSearchClearBtn" aria-label="清除搜索"><i class="fas fa-times"></i></button>
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
            this.searchTimer = setTimeout(() => {
                if (query) {
                    this.performSearch(query);
                } else {
                    this.clearSearch();
                }
            }, 300);
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

    async performSearch(query) {
        if (!query.trim()) return;
        this.isSearching = true;
        this.searchQuery = query;

        const container = document.getElementById('level3Content');
        if (!container) return;
        this.showSkeleton();

        try {
            const response = await this._fetchWithRetry(`${this.apiBase}/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            container.innerHTML = '';
            if (results.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-state';
                emptyDiv.innerHTML = `<div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">未找到相关链接</h3><p class="empty-subtitle">试试其他关键词</p>`;
                container.appendChild(emptyDiv);
            } else {
                const fragment = document.createDocumentFragment();
                results.forEach((site, idx) => fragment.appendChild(this._createSiteCard(site, idx, true, query)));
                container.appendChild(fragment);
                this.observeLazyImages(container);
            }
            const hint = document.getElementById('navSearchHint');
            if (hint) {
                hint.style.display = 'block';
                hint.textContent = `找到 ${results.length} 个结果，关键词已高亮`;
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="empty-state">搜索失败，请重试</div>';
        } finally {
            this.isSearching = false;
        }
    }

    // —— 修复点2：清除搜索后恢复之前状态 ——
    clearSearch() {
        if (!this.isSearching && !this.searchQuery) return;
        this.isSearching = false;
        this.searchQuery = '';
        const hint = document.getElementById('navSearchHint');
        if (hint) hint.style.display = 'none';

        // 恢复当前选中的子分类
        if (this.selectedLevel2) {
            this.selectLevel2(this.selectedLevel2, null, false);
        } else if (this.selectedLevel1 && this.structure?.[this.selectedLevel1]) {
            const firstSub = this.getFirstSubCategory(this.selectedLevel1);
            if (firstSub) this.selectLevel2(firstSub.id, null, false);
        } else {
            const firstCat = this.getFirstCategory();
            if (firstCat) {
                this.selectedLevel1 = firstCat;
                this.selectLevel1(firstCat, false);
            } else {
                this.loadNavigationStructure(true).then(() => {
                    const newFirst = this.getFirstCategory();
                    if (newFirst) this.selectLevel1(newFirst, false);
                });
            }
        }
    }

    // ========================================
    // 无限滚动
    // ========================================

    _bindInfiniteScroll() {
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        let ticking = false;
        this.scrollListener = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                this._checkScrollAndLoadMore();
                ticking = false;
            });
        };
        window.addEventListener('scroll', this.scrollListener, { passive: true });
    }

    _checkScrollAndLoadMore() {
        if (this.isLoadingMore || this.isSearching) return;
        if (!this.hasMore) {
            if (!this.hasShownNoMoreToast) {
                this.hasShownNoMoreToast = true;
                window.toast?.show?.('～ 到·底·了 ～', 'info', 2000);
            }
            return;
        }
        const trigger = document.getElementById('scroll-loading-trigger');
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 100) {
            this._loadMore();
        }
    }

    async _loadMore() {
        if (this.isLoadingMore || !this.hasMore) return;
        this.isLoadingMore = true;
        const trigger = document.getElementById('scroll-loading-trigger');
        if (trigger) {
            trigger.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;"></div><span>加载中...</span>';
        }
        await new Promise(r => setTimeout(r, 200));
        this.currentPage++;
        const start = (this.currentPage - 1) * this.CONFIG.PAGE_SIZE;
        if (start >= this.currentSites.length) {
            this.hasMore = false;
            if (trigger) trigger.remove();
            if (!this.hasShownNoMoreToast) {
                this.hasShownNoMoreToast = true;
                window.toast?.show?.('～ 到·底·了 ～', 'info', 2000);
            }
            this.isLoadingMore = false;
            return;
        }
        this._renderSitesPage(false);
        this.isLoadingMore = false;
        this._checkScrollAndLoadMore();
    }

    // ========================================
    // 事件绑定
    // ========================================

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (this.isSearching) return;
            const l1 = e.target.closest('.level1-btn');
            if (l1) {
                this.selectLevel1(l1.dataset.level1, true);
                return;
            }
            const l2 = e.target.closest('.level2-btn');
            if (l2) {
                this.selectLevel2(l2.dataset.level2, l2.dataset.level2Name, true);
                return;
            }
        });
    }

    // ========================================
    // 定时任务
    // ========================================

    startAutoRefresh() {
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = setInterval(() => {
            if (!document.hidden && !this.isSearching && this.selectedLevel2) {
                this.refreshCurrentSubcategory();
            }
        }, this.CONFIG.AUTO_REFRESH_INTERVAL);
    }

    async refreshCurrentSubcategory() {
        if (!this.selectedLevel2) return;
        await this.selectLevel2(this.selectedLevel2, null, false);
    }

    startBackgroundUpdates() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.updateTimer = setInterval(() => this._refreshStructure(), this.CONFIG.UPDATE_INTERVAL);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this._refreshStructure();
        });
    }

    async _refreshStructure() {
        try {
            const response = await this._fetchWithRetry(`${this.apiBase}/navigation/structure`);
            const newStructure = await response.json();
            if (JSON.stringify(newStructure) !== JSON.stringify(this.structure)) {
                this.structure = newStructure;
                this.structureCacheTime = Date.now();
                this._renderLevel1();
                if (this.selectedLevel1 && this.structure[this.selectedLevel1]) {
                    this.renderLevel2(this.selectedLevel1);
                    const currentSub = document.querySelector('.level2-btn.active');
                    if (currentSub) await this.renderLevel3(this.selectedLevel1, currentSub.dataset.level2);
                }
                await this.recalculateGlobalInvalidCount();
                await this.calculateTotalValidSites();
            }
        } catch (e) {
            console.warn('后台更新失败:', e);
        }
    }

    // ========================================
    // 初始化 & 销毁
    // ========================================

    async init() {
        if (this.isInitialized) return;
        this.apiBase = Utils.getApiBase();
        this.initLazyLoadObserver();
        this.showSkeleton();
        this.bindEvents();
        this.createSearchBox();

        try {
            await this.loadNavigationStructure(true);
            this.calculateStats();
            this.renderNavigation();
            await this.calculateTotalValidSites();

            const firstCategory = this.getFirstCategory();
            if (firstCategory) {
                this.selectedLevel1 = firstCategory;
                document.querySelectorAll('.level1-btn').forEach(el => {
                    el.classList.toggle('active', el.dataset.level1 === firstCategory);
                });
                this.renderLevel2(firstCategory);

                const firstSub = this.getFirstSubCategory(firstCategory);
                if (firstSub) {
                    const sites = await this.loadSites(firstSub.id, true);
                    this.currentSites = sites;
                    this.selectedLevel2 = firstSub.id;
                    document.querySelectorAll('.level2-btn').forEach(el => {
                        el.classList.toggle('active', parseInt(el.dataset.level2) === firstSub.id);
                    });
                    await this.renderLevel3(firstCategory, firstSub.id);
                    this.updateSubcategoryCount(firstSub.id);

                    const allSubIds = this.structure[firstCategory].subcategories.map(s => s.id);
                    const otherSubIds = allSubIds.filter(id => id !== firstSub.id);
                    if (otherSubIds.length) {
                        const preload = () => {
                            this.loadBatchSitesBatch(otherSubIds).catch(err => {
                                console.warn('初始预加载失败:', err);
                            });
                        };
                        if (window.requestIdleCallback) {
                            requestIdleCallback(preload, { timeout: 2000 });
                        } else {
                            setTimeout(preload, 500);
                        }
                    }
                } else {
                    this._renderEmptyState();
                }
            } else {
                this._renderEmptyState();
            }

            await this.recalculateGlobalInvalidCount();
            this.isInitialized = true;
            this.startBackgroundUpdates();
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.selectedLevel2) this.refreshCurrentSubcategory();
            });
            this.startAutoRefresh();
        } catch (error) {
            console.error('导航初始化失败:', error);
            this.showError();
            // 降级：从缓存恢复结构
            if (this.structure) {
                this.renderNavigation();
                const firstCat = this.getFirstCategory();
                if (firstCat) {
                    this.selectedLevel1 = firstCat;
                    this.renderLevel2(firstCat);
                    const firstSub = this.getFirstSubCategory(firstCat);
                    if (firstSub) {
                        this.selectedLevel2 = firstSub.id;
                        this._renderEmptyState();
                        // 延迟重试加载站点
                        setTimeout(() => {
                            this.loadSites(firstSub.id, true).then(sites => {
                                this.currentSites = sites;
                                this.renderLevel3(firstCat, firstSub.id);
                            }).catch(() => {});
                        }, 2000);
                    }
                }
            }
        }
    }

    refresh() {
        this.structure = null;
        this.structureCacheTime = 0;
        this.siteCache.clear();
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.showSkeleton();
        this.init();
    }

    destroy() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        if (this.imgObserver) this.imgObserver.disconnect();
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        if (this._scrollPreloadCleanup) {
            this._scrollPreloadCleanup();
            this._scrollPreloadCleanup = null;
        }
        this.iconCache.clear();
        this.iconLoadingSet.clear();
        this.iconFailedSet.clear();
        this.siteCache.clear();
        this.isInitialized = false;
    }
}

window.getOptimizedNavigation = function() { return window.optimizedNavigation; };