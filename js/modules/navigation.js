/* navigation.js - 支持分页、重试、缓存延长，移除子分类计数和骨架卡片，移除自动刷新通知 */
class OptimizedNavigation {
    constructor() {
        if (window.Starlink && window.Starlink.navigation) return window.Starlink.navigation;

        this.CONFIG = {
            SKELETON_COUNT: 6,
            PAGE_SIZE: 20,               // 每页加载站点数
            UPDATE_INTERVAL: 5 * 60 * 1000,
            AUTO_REFRESH_INTERVAL: 5 * 60 * 1000,
            BATCH_SIZE: 8,
            BATCH_DELAY: 200,
            STRUCTURE_CACHE_TTL: 30 * 60 * 1000, // 延长至30分钟
            PRELOAD_DELAY: 300,
            MAX_RETRIES: 3,              // 重试次数
            RETRY_DELAY: 1000,           // 初始重试延迟(ms)
        };

        this.structure = null;
        this.structureCacheTime = 0;
        this.siteCache = new Map();      // key: subcategoryId_page_limit, value: { sites, total, timestamp }
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        this.isNavigationClick = false;
        this.isSearching = false;
        this.searchInput = null;
        this.searchTimer = null;
        this.searchQuery = '';
        this.currentPage = 1;
        this.isLoadingMore = false;
        this.hasMore = true;
        this.currentSites = [];           // 当前已加载的所有站点
        this.currentSubcategoryId = null;
        this.totalSitesCount = 0;
        this.scrollListener = null;
        this.hasShownNoMoreToast = false;
        this.updateTimer = null;
        this.autoRefreshTimer = null;
        this.imgObserver = null;
        this._scrollPreloadCleanup = null;
        this.iconCache = new Map();
        this.iconLoadingSet = new Set();
        this.iconFailedSet = new Set();

        if (window.Starlink) window.Starlink.navigation = this;
        window.optimizedNavigation = this;
    }

    // ===== 工具方法 =====
    _escapeHtml(str) { return Utils.escapeHtml(str); }
    _formatViews(views) {
        if (views >= 1000000) return (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (views >= 1000) return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(views);
    }
    _getFullIconUrl(icon, siteUrl) {
        if (!icon) return '';
        if (icon.startsWith('/icon?domain=')) {
            if (window.Utils?.isWebPSupportedSync?.()) return this.apiBase + icon + '&format=webp';
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
                if (window.Utils?.isWebPSupportedSync?.()) return base + '&format=webp';
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
    // 简化的骨架：显示加载中状态（移除卡片骨架）
    showSkeleton() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>加载中...</p></div>`;
        }
    }

    // ===== 懒加载 & 图片预加载 =====
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

    // ===== 数据加载（带重试） =====
    async _fetchWithRetry(url, options = {}, retries = this.CONFIG.MAX_RETRIES) {
        let lastError;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await Utils.safeFetch(url, { ...options, timeout: 15000 });
                return response;
            } catch (error) {
                lastError = error;
                console.warn(`请求失败，${i+1}/${retries} 重试:`, error.message);
                if (i < retries - 1) {
                    const delay = this.CONFIG.RETRY_DELAY * Math.pow(2, i);
                    await new Promise(r => setTimeout(r, delay));
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

    // 加载分页站点数据
    async loadSitesPage(subcategoryId, page = 1, limit = this.CONFIG.PAGE_SIZE, forceRefresh = false) {
        const cacheKey = `${subcategoryId}_page_${page}_${limit}`;
        if (!forceRefresh && this.siteCache.has(cacheKey)) {
            return this.siteCache.get(cacheKey);
        }
        try {
            const response = await this._fetchWithRetry(`${this.apiBase}/navigation/sites?subcategory_id=${subcategoryId}&page=${page}&limit=${limit}`);
            const data = await response.json();
            // data: { sites, total, page, limit }
            this.siteCache.set(cacheKey, data);
            return data;
        } catch (error) {
            const cached = this.siteCache.get(cacheKey);
            if (cached) {
                console.warn('加载站点失败，使用缓存:', error);
                return cached;
            }
            throw error;
        }
    }

    // 批量加载（仍用于预加载，但缓存延长）
    async loadBatchSites(subIds, forceRefresh = false) {
        if (!subIds || !subIds.length) return {};
        const cacheKey = `batch_${subIds.join(',')}`;
        if (!forceRefresh && this.siteCache.has(cacheKey)) {
            return this.siteCache.get(cacheKey);
        }
        try {
            const idsParam = subIds.join(',');
            const response = await this._fetchWithRetry(`${this.apiBase}/navigation/batch-sites?ids=${idsParam}`);
            const data = await response.json();
            if (data?.data) {
                this.siteCache.set(cacheKey, data.data);
                // 同时将每个子分类的第一页也缓存（供分页使用）
                for (const [subId, sites] of Object.entries(data.data)) {
                    const pageKey = `${subId}_page_1_${this.CONFIG.PAGE_SIZE}`;
                    if (!this.siteCache.has(pageKey)) {
                        this.siteCache.set(pageKey, { sites, total: sites.length, page: 1, limit: this.CONFIG.PAGE_SIZE });
                    }
                }
                return data.data;
            }
            return {};
        } catch (error) {
            const cached = this.siteCache.get(cacheKey);
            if (cached) {
                console.warn('批量加载失败，使用缓存:', error);
                return cached;
            }
            throw error;
        }
    }

    // 获取子分类的缓存数据（分页）
    getCachedSites(subcategoryId) {
        const pageKey = `${subcategoryId}_page_1_${this.CONFIG.PAGE_SIZE}`;
        return this.siteCache.get(pageKey);
    }

    // ===== 导航状态管理 =====
    getFirstCategory() { return this.structure ? Object.keys(this.structure)[0] : null; }
    getFirstSubCategory(level1) { return this.structure?.[level1]?.subcategories?.[0] || null; }

    // 移除子分类计数功能，此方法保留为空（不执行任何操作）
    updateSubcategoryCount(subcategoryId) {
        // 不再更新计数显示
        return;
    }

    // 移除原有的计数显示更新方法，不再使用
    // _updateSubcategoryCountDisplay 已删除

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
                const pageKey = `${sub.id}_page_1_${this.CONFIG.PAGE_SIZE}`;
                let cached = this.siteCache.get(pageKey);
                if (!cached) {
                    try {
                        const data = await this.loadSitesPage(sub.id, 1, this.CONFIG.PAGE_SIZE, true);
                        cached = data;
                    } catch (e) { continue; }
                }
                if (cached && cached.sites) {
                    total += cached.sites.filter(s => s.valid !== false).length;
                }
            }
        }
        this.stats.totalWebsites = total;
        this.updateStatsDisplay();
    }

    async recalculateGlobalInvalidCount() {
        let totalInvalid = 0;
        for (const [key, cached] of this.siteCache.entries()) {
            if (key.startsWith('batch_') || key.includes('_page_')) {
                const sites = cached.sites || [];
                totalInvalid += sites.filter(s => s.valid === false).length;
            }
        }
        // 对于未缓存的分页，我们无法计算，但大多数情况已缓存
        this.stats.invalidCount = totalInvalid;
        this.updateStatsDisplay();
    }

    // ===== 渲染方法 =====
    renderNavigation() { this._renderLevel1(); }

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
        // 移除计数 span
        container.innerHTML = subCats.map((sub, idx) =>
            `<button class="level2-btn ${idx === 0 ? 'active' : ''}" data-level2="${sub.id}" data-level2-name="${this._escapeHtml(sub.name)}" title="${this._escapeHtml(sub.name)}">
                <span class="level2-btn-text">${this._escapeHtml(sub.name)}</span>
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
        this.currentSubcategoryId = subcategoryId;
        this.currentSites = [];
        this.totalSitesCount = 0;

        const cached = this.getCachedSites(subcategoryId);
        if (cached && cached.sites) {
            this.currentSites = cached.sites;
            this.totalSitesCount = cached.total || cached.sites.length;
            this.hasMore = this.totalSitesCount > this.CONFIG.PAGE_SIZE;
            this._renderSitesPage(true);
            this.observeLazyImages(container);
            this._bindInfiniteScroll();
            // 不再更新计数
            await this.calculateTotalValidSites();
            return;
        }

        this.showSkeleton();
        try {
            const data = await this.loadSitesPage(subcategoryId, 1, this.CONFIG.PAGE_SIZE, true);
            this.currentSites = data.sites || [];
            this.totalSitesCount = data.total || this.currentSites.length;
            this.hasMore = this.totalSitesCount > this.CONFIG.PAGE_SIZE;
            this._renderSitesPage(true);
            this.observeLazyImages(container);
            this._bindInfiniteScroll();
            await this.calculateTotalValidSites();
        } catch (error) {
            console.error('加载站点失败:', error);
            this.showError('加载站点数据失败，请检查网络后重试');
        }
    }

    _renderSitesPage(resetTrigger = true) {
        const container = document.getElementById('level3Content');
        if (!container) return;
        if (resetTrigger) container.innerHTML = '';
        const start = (this.currentPage - 1) * this.CONFIG.PAGE_SIZE;
        const end = Math.min(start + this.CONFIG.PAGE_SIZE, this.currentSites.length);
        const pageSites = this.currentSites.slice(start, end);
        this.hasMore = end < this.totalSitesCount;

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

    showError(message = '加载失败，请刷新重试') {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h3 class="empty-title">${this._escapeHtml(message)}</h3>
                    <p class="empty-subtitle">点击下方按钮重试</p>
                    <button onclick="window.optimizedNavigation?.refresh()" style="
                        margin-top: 12px;
                        padding: 8px 20px;
                        background: var(--primary-color);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                    ">重新加载</button>
                </div>
            `;
        }
    }

    // ===== 站点卡片创建 =====
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

        // 点击计数
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

        // 死链报告
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
                                // 清除该子分类的分页缓存
                                for (const key of this.siteCache.keys()) {
                                    if (key.startsWith(`${currentSubId}_page_`)) {
                                        this.siteCache.delete(key);
                                    }
                                }
                                await this.renderLevel3(this.selectedLevel1, currentSubId);
                                const freshData = await this.loadSitesPage(currentSubId, 1, this.CONFIG.PAGE_SIZE, true);
                                // 更新计数（但计数已移除，仅刷新数据）
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

    // ===== 分类切换逻辑 =====
    async selectLevel1(level1, isUserClick = false) {
        if (this.selectedLevel1 === level1) return;
        this.isNavigationClick = true;

        document.querySelectorAll('.level1-btn').forEach(b => b.classList.toggle('active', b.dataset.level1 === level1));
        this.selectedLevel1 = level1;
        this.renderLevel2(level1);
        this.showSkeleton();

        const firstSub = this.getFirstSubCategory(level1);
        if (firstSub) {
            this.selectedLevel2 = firstSub.id;
            document.querySelectorAll('.level2-btn').forEach(el => {
                el.classList.toggle('active', parseInt(el.dataset.level2) === firstSub.id);
            });
            await this.renderLevel3(this.selectedLevel1, firstSub.id);
            // 不再更新计数

            // 预加载该分类下其他子分类的第一页
            const allSubIds = this.structure[level1].subcategories.map(s => s.id);
            const otherSubIds = allSubIds.filter(id => id !== firstSub.id);
            if (otherSubIds.length) {
                const preload = () => {
                    for (const subId of otherSubIds) {
                        this.loadSitesPage(subId, 1, this.CONFIG.PAGE_SIZE, true).catch(err => {
                            console.warn('预加载子分类失败:', err);
                        });
                    }
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

        await this.renderLevel3(this.selectedLevel1, subcategoryId);
        await this.calculateTotalValidSites();

        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.startAutoRefresh();
        }
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    // ===== 搜索功能 =====
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

    clearSearch() {
        if (!this.isSearching && !this.searchQuery) return;
        this.isSearching = false;
        this.searchQuery = '';
        const hint = document.getElementById('navSearchHint');
        if (hint) hint.style.display = 'none';

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

    // ===== 无限滚动 =====
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
        if (start >= this.totalSitesCount) {
            this.hasMore = false;
            if (trigger) trigger.remove();
            if (!this.hasShownNoMoreToast) {
                this.hasShownNoMoreToast = true;
                window.toast?.show?.('～ 到·底·了 ～', 'info', 2000);
            }
            this.isLoadingMore = false;
            return;
        }
        // 如果当前页数据尚未在 this.currentSites 中，需要从缓存或服务器加载
        if (this.currentSites.length < start + this.CONFIG.PAGE_SIZE) {
            const pageKey = `${this.currentSubcategoryId}_page_${this.currentPage}_${this.CONFIG.PAGE_SIZE}`;
            let pageData = this.siteCache.get(pageKey);
            if (!pageData) {
                try {
                    pageData = await this.loadSitesPage(this.currentSubcategoryId, this.currentPage, this.CONFIG.PAGE_SIZE, true);
                } catch (e) {
                    console.warn('加载分页失败:', e);
                    this.isLoadingMore = false;
                    return;
                }
            }
            if (pageData && pageData.sites) {
                this.currentSites = this.currentSites.concat(pageData.sites);
            }
        }
        this._renderSitesPage(false);
        this.isLoadingMore = false;
        this._checkScrollAndLoadMore();
    }

    // ===== 事件绑定 =====
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

    // ===== 定时任务 =====
    startAutoRefresh() {
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = setInterval(() => {
            if (!document.hidden && !this.isSearching && this.selectedLevel2) {
                this.refreshCurrentSubcategory();
            }
        }, this.CONFIG.AUTO_REFRESH_INTERVAL);
    }

    // 手动刷新当前子分类（用于后台点击刷新导航后，由外部调用）
    async refreshCurrentSubcategory() {
        if (!this.selectedLevel2) return;
        const subId = this.selectedLevel2;
        // 清除该子分类的所有分页缓存
        for (const key of this.siteCache.keys()) {
            if (key.startsWith(`${subId}_page_`)) {
                this.siteCache.delete(key);
            }
        }
        // 也清除批量缓存（可能包含该子分类）
        for (const key of this.siteCache.keys()) {
            if (key.startsWith('batch_') && key.includes(String(subId))) {
                this.siteCache.delete(key);
            }
        }
        await this.renderLevel3(this.selectedLevel1, subId);
        await this.calculateTotalValidSites();
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

    // ===== 初始化 & 销毁 =====
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
                    this.selectedLevel2 = firstSub.id;
                    document.querySelectorAll('.level2-btn').forEach(el => {
                        el.classList.toggle('active', parseInt(el.dataset.level2) === firstSub.id);
                    });
                    await this.renderLevel3(firstCategory, firstSub.id);

                    // 预加载其他子分类
                    const allSubIds = this.structure[firstCategory].subcategories.map(s => s.id);
                    const otherSubIds = allSubIds.filter(id => id !== firstSub.id);
                    if (otherSubIds.length) {
                        const preload = () => {
                            for (const subId of otherSubIds) {
                                this.loadSitesPage(subId, 1, this.CONFIG.PAGE_SIZE, true).catch(err => {
                                    console.warn('初始预加载失败:', err);
                                });
                            }
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
            this.showError('导航数据加载失败，请检查网络后刷新重试');
            if (this.structure) {
                this.renderNavigation();
                const firstCat = this.getFirstCategory();
                if (firstCat) {
                    this.selectedLevel1 = firstCat;
                    this.renderLevel2(firstCat);
                    const firstSub = this.getFirstSubCategory(firstCat);
                    if (firstSub) {
                        this.selectedLevel2 = firstSub.id;
                        const cached = this.getCachedSites(firstSub.id);
                        if (cached && cached.sites) {
                            this.currentSites = cached.sites;
                            this.totalSitesCount = cached.total || cached.sites.length;
                            this.hasMore = this.totalSitesCount > this.CONFIG.PAGE_SIZE;
                            await this.renderLevel3(firstCat, firstSub.id);
                        } else {
                            this._renderEmptyState();
                            setTimeout(() => {
                                this.loadSitesPage(firstSub.id, 1, this.CONFIG.PAGE_SIZE, true).then(data => {
                                    this.currentSites = data.sites || [];
                                    this.totalSitesCount = data.total || this.currentSites.length;
                                    this.hasMore = this.totalSitesCount > this.CONFIG.PAGE_SIZE;
                                    this.renderLevel3(firstCat, firstSub.id);
                                }).catch(() => {});
                            }, 3000);
                        }
                    }
                }
            }
            this.isInitialized = true;
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