/* navigation.js - 引用 constants.js 常量 */
class OptimizedNavigation {
    constructor() {
        if (window.Starlink && window.Starlink.navigation) return window.Starlink.navigation;

        // 从常量配置读取
        const C = window.APP_CONSTANTS || APP_CONSTANTS;

        this.structure = null;
        this.siteCache = new Map();
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        this.isNavigationClick = false;
        this.skeletonCount = C.NAVIGATION.SKELETON_COUNT || 6;
        this.updateTimer = null;
        this.UPDATE_INTERVAL = C.NAVIGATION.UPDATE_INTERVAL || (5 * 60 * 1000);
        this.apiBase = Utils.getApiBase();
        this.imgObserver = null;
        this.isSearching = false;
        this.searchInput = null;
        this.searchTimer = null;

        this.currentPage = 1;
        this.pageSize = C.NAVIGATION.PAGE_SIZE || 30;
        this.isLoadingMore = false;
        this.hasMore = true;
        this.currentSites = [];
        this.scrollListener = null;
        this.hasShownNoMoreToast = false;

        this.autoRefreshTimer = null;
        this.autoRefreshInterval = C.NAVIGATION.AUTO_REFRESH_INTERVAL || (5 * 60 * 1000);

        this.iconCache = new Map();
        this.iconLoadingSet = new Set();
        this.iconFailedSet = new Set();

        this.BATCH_SIZE = C.NAVIGATION.BATCH_SIZE || 8;
        this.BATCH_DELAY = C.NAVIGATION.BATCH_DELAY || 200;

        this.countsCache = new Map();

        if (window.Starlink) window.Starlink.navigation = this;
        window.optimizedNavigation = this;
    }

    _escapeHtml(str) { return Utils.escapeHtml(str); }

    _formatViews(views) {
        if (views >= 1000000) return (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (views >= 1000) return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(views);
    }

    _getFullIconUrl(icon, siteUrl) {
        if (!icon) return '';
        if (icon.startsWith('/icon?domain=')) {
            if (window.Utils && window.Utils.isWebPSupportedSync()) {
                return this.apiBase + icon + '&format=webp';
            }
            return this.apiBase + icon;
        }
        if (icon.startsWith('http://') || icon.startsWith('https://')) {
            if (window.Utils && window.Utils.isWebPSupportedSync() && !icon.match(/\.svg$/i)) {
                return window.Utils.toWebPUrl(icon, 80, 128, 128);
            }
            return icon;
        }
        try {
            const urlObj = new URL(siteUrl);
            const domain = urlObj.hostname;
            if (domain) {
                const base = this.apiBase + `/icon?domain=${encodeURIComponent(domain)}`;
                if (window.Utils && window.Utils.isWebPSupportedSync()) {
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
        } else {
            return '<i class="fas fa-link"></i>';
        }
    }

    _highlightText(text, keyword) {
        if (!keyword || !text) return this._escapeHtml(text);
        const escapedText = this._escapeHtml(text);
        const escapedKeyword = this._escapeHtml(keyword);
        const regex = new RegExp(`(${escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    initLazyLoadObserver() {
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

        const preloadTask = () => {
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
        };

        if (window.requestIdleCallback) {
            requestIdleCallback(preloadTask, { timeout: 2000 });
        } else {
            setTimeout(preloadTask, 200);
        }
    }

    bindScrollPreload(container) {
        if (!container) return;
        let scrollTimer = null;
        const scrollHandler = () => {
            if (scrollTimer) clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                this.preloadNearbyImages(container);
            }, 200);
        };
        window.addEventListener('scroll', scrollHandler, { passive: true });
        container.addEventListener('scroll', scrollHandler, { passive: true });
        this._scrollPreloadCleanup = () => {
            window.removeEventListener('scroll', scrollHandler);
            container.removeEventListener('scroll', scrollHandler);
        };
    }

    observeLazyImages(container) {
        if (!this.imgObserver) return;
        const imgs = container.querySelectorAll('img[data-src]');
        imgs.forEach(img => this.imgObserver.observe(img));
        this.preloadNearbyImages(container);
        this.bindScrollPreload(container);
    }

    async loadBatchSitesBatch(subIds, batchSize = this.BATCH_SIZE) {
        if (!subIds || !subIds.length) return {};
        const results = {};
        const allIds = [...subIds];
        for (let i = 0; i < allIds.length; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize);
            const batchResult = await this.loadBatchSites(batch);
            Object.assign(results, batchResult);
            for (const id of batch) {
                this.updateSubcategoryCount(id);
            }
            if (i + batchSize < allIds.length) {
                await new Promise(r => setTimeout(r, this.BATCH_DELAY));
            }
        }
        return results;
    }

    async loadSites(subcategoryId, forceRefresh = false) {
        if (!forceRefresh && this.siteCache.has(subcategoryId)) return this.siteCache.get(subcategoryId);
        const response = await Utils.safeFetch(`${this.apiBase}/navigation/sites?subcategory_id=${subcategoryId}`);
        if (!response.ok) throw new Error('Failed to load sites');
        const sites = await response.json();
        this.siteCache.set(subcategoryId, sites);
        return sites;
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
            const response = await Utils.safeFetch(`${this.apiBase}/navigation/batch-sites?ids=${idsParam}`);
            const data = await response.json();

            if (data && data.data) {
                for (const [subId, sites] of Object.entries(data.data)) {
                    const id = parseInt(subId);
                    if (!isNaN(id)) {
                        this.siteCache.set(id, sites);
                    }
                }
            }

            const result = {};
            subIds.forEach(id => {
                result[id] = this.siteCache.get(id) || [];
            });
            return result;

        } catch (error) {
            console.warn('批量加载站点失败，降级为逐个加载:', error);
            const result = {};
            for (const id of subIds) {
                if (!this.siteCache.has(id)) {
                    result[id] = await this.loadSites(id, true);
                } else {
                    result[id] = this.siteCache.get(id);
                }
            }
            return result;
        }
    }

    updateSubcategoryCount(subcategoryId) {
        const sites = this.siteCache.get(subcategoryId);
        if (!sites) return;
        const count = sites.filter(s => s.valid !== false).length;
        this.updateSubcategoryCountDisplay(subcategoryId, count);
    }

    async init() {
        if (this.isInitialized) return;
        this.initLazyLoadObserver();
        this.showSkeleton();
        this.bindEvents();
        this.createSearchBox();
        try {
            await this.loadNavigationStructure();
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
                    const sites = await this.loadSites(firstSub.id);
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
                        const loadRemaining = () => {
                            this.loadBatchSitesBatch(otherSubIds).catch(err => {
                                console.warn('后台加载其他子分类失败:', err);
                            });
                        };
                        if (window.requestIdleCallback) {
                            requestIdleCallback(loadRemaining, { timeout: 2000 });
                        } else {
                            setTimeout(loadRemaining, 500);
                        }
                    }
                } else {
                    this.renderEmptyState();
                }
            } else {
                this.renderEmptyState();
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
        }
    }

    async calculateTotalValidSites() {
        if (!this.structure) return;
        let total = 0;
        for (const catName in this.structure) {
            const subcategories = this.structure[catName].subcategories;
            for (const sub of subcategories) {
                let sites = this.siteCache.get(sub.id);
                if (!sites) {
                    sites = await this.loadSites(sub.id, false);
                }
                const validCount = sites.filter(s => s.valid !== false).length;
                total += validCount;
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
                const subcategories = this.structure[catName].subcategories;
                for (const sub of subcategories) {
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

    startAutoRefresh() {
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = setInterval(() => {
            if (!document.hidden && !this.isSearching && this.selectedLevel2) {
                this.refreshCurrentSubcategory();
            }
        }, this.autoRefreshInterval);
    }

    async refreshCurrentSubcategory() {
        if (!this.selectedLevel2) return;
        this.siteCache.delete(this.selectedLevel2);
        await this.renderLevel3(this.selectedLevel1, this.selectedLevel2);
        await this.recalculateGlobalInvalidCount();
        await this.calculateTotalValidSites();
    }

    async loadNavigationStructure() {
        const response = await Utils.safeFetch(`${this.apiBase}/navigation/structure`);
        if (!response.ok) throw new Error('Failed to load navigation structure');
        this.structure = await response.json();
        return this.structure;
    }

    async selectLevel1(level1, isUserClick = false) {
        if (this.selectedLevel1 === level1) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level1-btn').forEach(b => b.classList.toggle('active', b.dataset.level1 === level1));
        this.selectedLevel1 = level1;
        this.renderLevel2(level1);
        this.showSkeleton();

        const firstSub = this.getFirstSubCategory(level1);
        if (firstSub) {
            const firstSites = await this.loadSites(firstSub.id);
            this.currentSites = firstSites;
            await this.renderLevel3(this.selectedLevel1, firstSub.id);
            this.updateSubcategoryCount(firstSub.id);
            const allSubIds = this.structure[level1].subcategories.map(s => s.id);
            const otherSubIds = allSubIds.filter(id => id !== firstSub.id);
            if (otherSubIds.length) {
                const loadRemaining = () => {
                    this.loadBatchSitesBatch(otherSubIds).catch(err => {
                        console.warn('后台加载其他子分类失败:', err);
                    });
                };
                if (window.requestIdleCallback) {
                    requestIdleCallback(loadRemaining, { timeout: 2000 });
                } else {
                    setTimeout(loadRemaining, 300);
                }
            }
        } else {
            this.renderEmptyState();
        }
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    async selectLevel2(subcategoryId, subName, isUserClick = false) {
        if (this.selectedLevel2 === subcategoryId) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level2-btn').forEach(b => b.classList.toggle('active', b.dataset.level2 == subcategoryId));
        this.selectedLevel2 = subcategoryId;
        this.hasShownNoMoreToast = false;
        if (!this.siteCache.has(subcategoryId)) {
            await this.loadSites(subcategoryId);
            this.updateSubcategoryCount(subcategoryId);
        }
        await this.renderLevel3(this.selectedLevel1, subcategoryId);
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.startAutoRefresh();
        }
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    getFirstCategory() { return this.structure ? Object.keys(this.structure)[0] : null; }
    getFirstSubCategory(level1) { return this.structure?.[level1]?.subcategories[0] || null; }

    renderLevel2(level1) {
        const container = document.getElementById('level2Nav');
        if (!container || !this.structure?.[level1]) return;
        const subCats = this.structure[level1].subcategories;
        if (!subCats.length) {
            container.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:11px;text-align:center;">暂无子分类</div>';
            this.renderEmptyState();
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
        this.currentSites = await this.loadSites(subcategoryId);
        if (!this.currentSites.length) {
            this.renderEmptyState();
            return;
        }
        this.renderSitesPage(true);
        this.observeLazyImages(container);
        this.bindInfiniteScroll();
        const validCount = this.currentSites.filter(s => s.valid !== false).length;
        this.updateSubcategoryCountDisplay(subcategoryId, validCount);
        await this.calculateTotalValidSites();
    }

    renderSitesPage(resetTrigger = true) {
        const container = document.getElementById('level3Content');
        if (!container) return;
        if (resetTrigger) container.innerHTML = '';
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageSites = this.currentSites.slice(start, end);

        const hasMoreData = end < this.currentSites.length;
        this.hasMore = hasMoreData;

        if (this.currentPage === 1) {
            container.innerHTML = '';
            const fragment = document.createDocumentFragment();
            pageSites.forEach((site, idx) => fragment.appendChild(this.createSiteCard(site, idx, false, '')));
            container.appendChild(fragment);
            if (hasMoreData) {
                const loadingDiv = this.createLoadingTrigger(true);
                container.appendChild(loadingDiv);
            }
        } else {
            const oldTrigger = container.querySelector('#scroll-loading-trigger');
            if (oldTrigger) oldTrigger.remove();
            const fragment = document.createDocumentFragment();
            pageSites.forEach((site, idx) => fragment.appendChild(this.createSiteCard(site, idx, false, '')));
            container.appendChild(fragment);
            if (hasMoreData) {
                const newTrigger = this.createLoadingTrigger(true);
                container.appendChild(newTrigger);
            }
        }
        this.preloadNearbyImages(container);
    }

    createLoadingTrigger(hasMore) {
        const div = document.createElement('div');
        div.id = 'scroll-loading-trigger';
        div.className = 'scroll-loading-trigger';
        div.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;"></div><span>加载更多...</span>';
        div.style.textAlign = 'center';
        div.style.display = 'flex';
        div.style.justifyContent = 'center';
        div.style.alignItems = 'center';
        div.style.gap = '8px';
        div.style.padding = '16px';
        return div;
    }

    bindInfiniteScroll() {
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
        }
        let ticking = false;
        this.scrollListener = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                this.checkScrollAndLoadMore();
                ticking = false;
            });
        };
        window.addEventListener('scroll', this.scrollListener, { passive: true });
    }

    checkScrollAndLoadMore() {
        if (this.isLoadingMore || this.isSearching) return;
        if (!this.hasMore && !this.hasShownNoMoreToast) {
            this.hasShownNoMoreToast = true;
            if (window.toast && window.toast.show) {
                window.toast.show('～ 到·底·了 ～', 'info', 2000);
            }
            return;
        }
        const trigger = document.getElementById('scroll-loading-trigger');
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 100) {
            this.loadMore();
        }
    }

    async loadMore() {
        if (this.isLoadingMore || !this.hasMore) return;
        this.isLoadingMore = true;
        const trigger = document.getElementById('scroll-loading-trigger');
        if (trigger) {
            trigger.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;"></div><span>加载中...</span>';
            trigger.style.padding = '16px';
        }
        await new Promise(r => setTimeout(r, 200));
        this.currentPage++;
        const start = (this.currentPage - 1) * this.pageSize;
        if (start >= this.currentSites.length) {
            this.hasMore = false;
            if (trigger) trigger.remove();
            if (!this.hasShownNoMoreToast && window.toast && window.toast.show) {
                this.hasShownNoMoreToast = true;
                window.toast.show('～ 到·底·了 ～', 'info', 2000);
            }
            this.isLoadingMore = false;
            return;
        }
        this.renderSitesPage(false);
        this.isLoadingMore = false;
        this.checkScrollAndLoadMore();
    }

    createSiteCard(site, index, isSearchResult = false, keyword = '') {
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

        card.addEventListener('click', async (e) => {
            if (e.target.classList.contains('report-dead-link-btn') || e.target.closest('.report-dead-link-btn')) return;
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
                } catch (err) {}
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
                return;
            }

            let oldViews = parseInt(viewEl.dataset.views) || 0;
            let newViews = oldViews + 1;
            viewEl.dataset.views = newViews;
            viewEl.textContent = this._formatViews(newViews);
            viewEl.classList.add('increasing');
            setTimeout(() => viewEl.classList.remove('increasing'), 300);

            const siteIndex = this.currentSites.findIndex(s => s.id === site.id);
            if (siteIndex !== -1) {
                this.currentSites[siteIndex].views = (this.currentSites[siteIndex].views || 0) + 1;
            }

            try {
                await Utils.safeFetch(`${this.apiBase}/click`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: site.id, url: site.url }),
                    keepalive: true
                });
            } catch (err) {
                console.warn('点击计数上报失败:', err);
                viewEl.dataset.views = oldViews;
                viewEl.textContent = this._formatViews(oldViews);
                if (siteIndex !== -1) {
                    this.currentSites[siteIndex].views = oldViews;
                }
                if (window.toast) window.toast.show('计数上报失败，请检查网络', 'warning');
            }

            setTimeout(() => {
                this.isNavigationClick = false;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
            }, 100);
        });

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
                                        if (s.url === reportBtn.dataset.url) {
                                            return { ...s, valid: false };
                                        }
                                        return s;
                                    });
                                    this.siteCache.set(currentSubId, updatedSites);
                                    await this.renderLevel3(this.selectedLevel1, currentSubId);
                                } else {
                                    await this.renderLevel3(this.selectedLevel1, currentSubId);
                                }
                                const freshSites = await this.loadSites(currentSubId, true);
                                const validCount = freshSites.filter(s => s.valid !== false).length;
                                this.updateSubcategoryCountDisplay(currentSubId, validCount);
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

    async performSearch(query) {
        if (!query.trim()) return;
        this.isSearching = true;
        const container = document.getElementById('level3Content');
        if (!container) return;
        this.showSkeleton();
        try {
            const searchUrl = `${this.apiBase}/search?q=${encodeURIComponent(query)}`;
            const response = await Utils.safeFetch(searchUrl);
            const results = await response.json();
            container.innerHTML = '';
            if (results.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-state';
                emptyDiv.innerHTML = `<div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">未找到相关链接</h3><p class="empty-subtitle">试试其他关键词</p>`;
                container.appendChild(emptyDiv);
            } else {
                const fragment = document.createDocumentFragment();
                results.forEach((site, idx) => fragment.appendChild(this.createSiteCard(site, idx, true, query)));
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

    clearSearch() {
        if (!this.isSearching) return;
        this.isSearching = false;
        const hint = document.getElementById('navSearchHint');
        if (hint) hint.style.display = 'none';
        if (this.selectedLevel1 && this.structure?.[this.selectedLevel1]) {
            this.selectLevel1(this.selectedLevel1, false);
        } else {
            const firstCat = this.getFirstCategory();
            if (firstCat) {
                this.selectedLevel1 = firstCat;
                this.selectLevel1(firstCat, false);
            } else {
                this.loadNavigationStructure().then(() => {
                    const newFirst = this.getFirstCategory();
                    if (newFirst) this.selectLevel1(newFirst, false);
                });
            }
        }
    }

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

    updateSubcategoryCountDisplay(subcategoryId, count, retry = 0) {
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
            setTimeout(() => this.updateSubcategoryCountDisplay(subcategoryId, count, retry + 1), 100);
        }
    }

    calculateStats() {
        const catCount = this.structure ? Object.keys(this.structure).length : 0;
        this.stats.totalCategories = catCount;
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const el1 = document.getElementById('siteCount');
        const el2 = document.getElementById('invalidCount');
        if (el1) el1.textContent = `${this.stats.totalWebsites || 0}+`;
        if (el2) el2.textContent = this.stats.invalidCount || '0';
    }

    updateInvalidCount(increment) {
        if (!this.stats.invalidCount) this.stats.invalidCount = 0;
        this.stats.invalidCount += increment;
        const invalidEl = document.getElementById('invalidCount');
        if (invalidEl) invalidEl.textContent = this.stats.invalidCount;
    }

    renderNavigation() { this.renderLevel1(); }

    renderLevel1() {
        const container = document.getElementById('level1Nav');
        if (!container || !this.structure) return;
        const categories = Object.keys(this.structure);
        container.innerHTML = categories.map((cat, idx) =>
            `<button class="level1-btn ${idx === 0 ? 'active' : ''}" data-level1="${cat}" title="${this.structure[cat].description || ''}"><span class="level1-btn-text">${this._escapeHtml(cat)}</span></button>`
        ).join('');
    }

    showSkeleton() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = this.generateSkeletonHTML();
        }
    }

    generateSkeletonHTML() {
        let html = '';
        for (let i = 0; i < this.skeletonCount; i++) {
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

    renderEmptyState() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = '';
        }
    }

    showError() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = '';
    }

    startBackgroundUpdates() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.updateTimer = setInterval(() => this.refreshStructure(), this.UPDATE_INTERVAL);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.refreshStructure();
        });
    }

    async refreshStructure() {
        try {
            const newStructure = await fetch(`${this.apiBase}/navigation/structure`).then(r => r.json());
            if (JSON.stringify(newStructure) !== JSON.stringify(this.structure)) {
                this.structure = newStructure;
                this.renderNavigation();
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

    refresh() {
        this.structure = null;
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
        if (this._scrollPreloadCleanup) this._scrollPreloadCleanup();
        this.iconCache.clear();
        this.iconLoadingSet.clear();
        this.iconFailedSet.clear();
        this.countsCache.clear();
    }
}

window.getOptimizedNavigation = function() { return window.optimizedNavigation; };