/* navigation.js - 全部加载、无分页、无懒加载、无加载提示，已增加错误上报，新布局：图标占1/4 */
class OptimizedNavigation {
    constructor() {
        if (window.Starlink && window.Starlink.navigation) return window.Starlink.navigation;

        this.CONFIG = {
            STRUCTURE_CACHE_TTL: 30 * 60 * 1000,
            MAX_RETRIES: 3,
            RETRY_DELAY: 1000,
        };

        this.structure = null;
        this.structureCacheTime = 0;
        this.siteCache = new Map();
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        this.isSearching = false;
        this.searchInput = null;
        this.searchTimer = null;
        this.searchQuery = '';
        this.currentSites = [];
        this.currentSubcategoryId = null;
        this.updateTimer = null;
        this.autoRefreshTimer = null;

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
            return this.apiBase + icon;
        }
        if (icon.startsWith('http://') || icon.startsWith('https://')) {
            return icon;
        }
        try {
            const urlObj = new URL(siteUrl);
            const domain = urlObj.hostname;
            if (domain) {
                return this.apiBase + `/icon?domain=${encodeURIComponent(domain)}`;
            }
        } catch (e) {}
        return '';
    }

    _createIconElement(iconUrl, siteUrl) {
        const fullIconUrl = this._getFullIconUrl(iconUrl, siteUrl);
        if (fullIconUrl) {
            return `<img src="${this._escapeHtml(fullIconUrl)}" alt="" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML = '<i class=\\'fas fa-link\\'></i>';">`;
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

    showSkeleton() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = '';
    }

    showError(message = '加载失败，请刷新页面重试') {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h3 class="empty-title">${this._escapeHtml(message)}</h3>
                </div>
            `;
        }
    }

    async _fetchWithRetry(url, options = {}, retries = this.CONFIG.MAX_RETRIES) {
        let lastError;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await Utils.safeFetch(url, { ...options, timeout: 15000 });
                return response;
            } catch (error) {
                lastError = error;
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
            if (window.errorHandler) {
                window.errorHandler.report(error, 'navigation.loadNavigationStructure');
            }
            if (this.structure) {
                return this.structure;
            }
            throw error;
        }
    }

    async loadAllSites(subcategoryId, forceRefresh = false) {
        if (!forceRefresh && this.siteCache.has(subcategoryId)) {
            return this.siteCache.get(subcategoryId);
        }
        try {
            const response = await this._fetchWithRetry(`${this.apiBase}/navigation/sites?subcategory_id=${subcategoryId}&page=1&limit=9999`);
            const data = await response.json();
            const sites = data.sites || [];
            this.siteCache.set(subcategoryId, sites);
            return sites;
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.report(error, 'navigation.loadAllSites');
            }
            const cached = this.siteCache.get(subcategoryId);
            if (cached) {
                return cached;
            }
            throw error;
        }
    }

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
                for (const [subId, sites] of Object.entries(data.data)) {
                    const id = parseInt(subId);
                    if (!isNaN(id)) this.siteCache.set(id, sites);
                }
                this.siteCache.set(cacheKey, data.data);
                return data.data;
            }
            return {};
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.report(error, 'navigation.loadBatchSites');
            }
            const cached = this.siteCache.get(cacheKey);
            if (cached) {
                return cached;
            }
            throw error;
        }
    }

    getFirstCategory() { return this.structure ? Object.keys(this.structure)[0] : null; }
    getFirstSubCategory(level1) { return this.structure?.[level1]?.subcategories?.[0] || null; }

    async calculateTotalValidSites() {
        if (!this.structure) return;
        let total = 0;
        let invalid = 0;
        for (const catName in this.structure) {
            for (const sub of this.structure[catName].subcategories) {
                let sites = this.siteCache.get(sub.id);
                if (!sites) {
                    try {
                        sites = await this.loadAllSites(sub.id, true);
                    } catch (e) {
                        if (window.errorHandler) {
                            window.errorHandler.report(e, 'navigation.calculateTotalValidSites');
                        }
                        continue;
                    }
                }
                if (sites) {
                    total += sites.filter(s => s.valid !== false).length;
                    invalid += sites.filter(s => s.valid === false).length;
                }
            }
        }
        this.stats.totalWebsites = total;
        this.stats.invalidCount = invalid;
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const el1 = document.getElementById('siteCount');
        const el2 = document.getElementById('invalidCount');
        if (el1) el1.textContent = `${this.stats.totalWebsites || 0}+`;
        if (el2) el2.textContent = this.stats.invalidCount || '0';
    }

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
        container.innerHTML = subCats.map((sub, idx) =>
            `<button class="level2-btn ${idx === 0 ? 'active' : ''}" data-level2="${sub.id}" data-level2-name="${this._escapeHtml(sub.name)}" title="${this._escapeHtml(sub.name)}">
                <span class="level2-btn-text">${this._escapeHtml(sub.name)}</span>
            </button>`
        ).join('');
    }

    async renderLevel3(level1, subcategoryId) {
        const container = document.getElementById('level3Content');
        if (!container) return;
        this.currentSubcategoryId = subcategoryId;
        this.currentSites = [];

        let sites = this.siteCache.get(subcategoryId);
        if (!sites) {
            try {
                sites = await this.loadAllSites(subcategoryId, true);
            } catch (error) {
                if (window.errorHandler) {
                    window.errorHandler.report(error, 'navigation.renderLevel3');
                }
                this.showError('加载站点数据失败，请刷新页面重试');
                return;
            }
        }
        this.currentSites = sites;
        this._renderSites(sites);
        await this.calculateTotalValidSites();
    }

    _renderSites(sites) {
        const container = document.getElementById('level3Content');
        if (!container) return;
        if (!sites || !sites.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3 class="empty-title">暂无站点</h3></div>`;
            return;
        }
        const fragment = document.createDocumentFragment();
        sites.forEach((site, idx) => fragment.appendChild(this._createSiteCard(site, idx, false, '')));
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    _renderEmptyState() {
        const container = document.getElementById('level3Content');
        if (container) container.innerHTML = '';
    }

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
            <div class="card-layout">
                <div class="card-left">
                    <div class="icon-container">${iconHtml}</div>
                </div>
                <div class="card-right">
                    <div class="card-top-row">
                        <span class="view-count" data-views="${views}">${formattedViews}</span>
                        <button class="report-dead-link-btn" data-url="${this._escapeHtml(site.url)}" data-title="${this._escapeHtml(site.title)}" title="报告死链">
                            <i class="fas fa-exclamation-circle"></i>
                        </button>
                    </div>
                    <div class="site-title">${titleHtml}</div>
                </div>
            </div>
            <div class="divider-line"></div>
            <div class="card-bottom">
                <div class="site-description">${descHtml}</div>
            </div>
        `;

        card.addEventListener('click', async (e) => {
            if (e.target.closest('.report-dead-link-btn')) return;
            const viewEl = card.querySelector('.view-count');
            if (!viewEl) {
                try {
                    await Utils.safeFetch(`${this.apiBase}/click`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: site.id, url: site.url }),
                        keepalive: true
                    });
                } catch (err) {
                    if (window.errorHandler) {
                        window.errorHandler.report(err, 'navigation.clickWithoutView');
                    }
                }
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
            } catch (err) {
                if (window.errorHandler) {
                    window.errorHandler.report(err, 'navigation.clickUpdate');
                }
                viewEl.dataset.views = oldViews;
                viewEl.textContent = this._formatViews(oldViews);
            }
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
                                this.siteCache.delete(currentSubId);
                                await this.renderLevel3(this.selectedLevel1, currentSubId);
                                await this.calculateTotalValidSites();
                            }
                        } else {
                            const err = await res.json().catch(() => ({}));
                            window.toast.show(err.error || '反馈失败', 'error');
                            reportBtn.disabled = false;
                            reportBtn.style.opacity = '';
                            reportBtn.style.cursor = '';
                        }
                    } catch (err) {
                        if (window.errorHandler) {
                            window.errorHandler.report(err, 'navigation.reportDeadLink');
                        }
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

    async selectLevel1(level1, isUserClick = false) {
        if (this.selectedLevel1 === level1) return;
        this.selectedLevel1 = level1;
        document.querySelectorAll('.level1-btn').forEach(b => b.classList.toggle('active', b.dataset.level1 === level1));
        this.renderLevel2(level1);
        this.showSkeleton();

        const firstSub = this.getFirstSubCategory(level1);
        if (firstSub) {
            this.selectedLevel2 = firstSub.id;
            document.querySelectorAll('.level2-btn').forEach(el => {
                el.classList.toggle('active', parseInt(el.dataset.level2) === firstSub.id);
            });
            try {
                await this.renderLevel3(this.selectedLevel1, firstSub.id);
            } catch (error) {
                if (window.errorHandler) {
                    window.errorHandler.report(error, 'navigation.selectLevel1.renderLevel3');
                }
            }

            const allSubIds = this.structure[level1].subcategories.map(s => s.id);
            const otherSubIds = allSubIds.filter(id => id !== firstSub.id);
            if (otherSubIds.length) {
                const preload = () => {
                    for (const subId of otherSubIds) {
                        this.loadAllSites(subId, true).catch(err => {
                            if (window.errorHandler) {
                                window.errorHandler.report(err, 'navigation.selectLevel1.preload');
                            }
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
    }

    async selectLevel2(subcategoryId, subName, isUserClick = false) {
        if (this.selectedLevel2 === subcategoryId) return;
        this.selectedLevel2 = subcategoryId;
        document.querySelectorAll('.level2-btn').forEach(b => b.classList.toggle('active', b.dataset.level2 == subcategoryId));
        try {
            await this.renderLevel3(this.selectedLevel1, subcategoryId);
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.report(error, 'navigation.selectLevel2.renderLevel3');
            }
        }
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.startAutoRefresh();
        }
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
        container.innerHTML = '';
        try {
            const response = await this._fetchWithRetry(`${this.apiBase}/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            if (results.length === 0) {
                container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">未找到相关链接</h3></div>`;
            } else {
                const fragment = document.createDocumentFragment();
                results.forEach((site, idx) => fragment.appendChild(this._createSiteCard(site, idx, true, query)));
                container.appendChild(fragment);
            }
            const hint = document.getElementById('navSearchHint');
            if (hint) {
                hint.style.display = 'block';
                hint.textContent = `找到 ${results.length} 个结果`;
            }
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.report(error, 'navigation.performSearch');
            }
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
                }).catch(err => {
                    if (window.errorHandler) {
                        window.errorHandler.report(err, 'navigation.clearSearch');
                    }
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

    startAutoRefresh() {
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = setInterval(() => {
            if (!document.hidden && !this.isSearching && this.selectedLevel2) {
                this.refreshCurrentSubcategory();
            }
        }, 5 * 60 * 1000);
    }

    async refreshCurrentSubcategory() {
        if (!this.selectedLevel2) return;
        const subId = this.selectedLevel2;
        this.siteCache.delete(subId);
        try {
            await this.renderLevel3(this.selectedLevel1, subId);
            await this.calculateTotalValidSites();
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.report(error, 'navigation.refreshCurrentSubcategory');
            }
        }
    }

    startBackgroundUpdates() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.updateTimer = setInterval(() => this._refreshStructure(), 5 * 60 * 1000);
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
                await this.calculateTotalValidSites();
            }
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.report(error, 'navigation._refreshStructure');
            }
        }
    }

    async init() {
        if (this.isInitialized) return;
        this.apiBase = Utils.getApiBase();
        this.bindEvents();
        this.createSearchBox();
        try {
            await this.loadNavigationStructure(true);
            this.renderNavigation();
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
                    const allSubIds = this.structure[firstCategory].subcategories.map(s => s.id);
                    const otherSubIds = allSubIds.filter(id => id !== firstSub.id);
                    if (otherSubIds.length) {
                        const preload = () => {
                            for (const subId of otherSubIds) {
                                this.loadAllSites(subId, true).catch(err => {
                                    if (window.errorHandler) {
                                        window.errorHandler.report(err, 'navigation.init.preload');
                                    }
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
            await this.calculateTotalValidSites();
            this.isInitialized = true;
            this.startBackgroundUpdates();
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.selectedLevel2) this.refreshCurrentSubcategory();
            });
            this.startAutoRefresh();
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.report(error, 'navigation.init');
            }
            this.showError('导航数据加载失败，请刷新页面重试');
            if (this.structure) {
                this.renderNavigation();
                const firstCat = this.getFirstCategory();
                if (firstCat) {
                    this.selectedLevel1 = firstCat;
                    this.renderLevel2(firstCat);
                    const firstSub = this.getFirstSubCategory(firstCat);
                    if (firstSub) {
                        this.selectedLevel2 = firstSub.id;
                        const sites = this.siteCache.get(firstSub.id);
                        if (sites) {
                            this.currentSites = sites;
                            this._renderSites(sites);
                        } else {
                            this._renderEmptyState();
                            setTimeout(() => {
                                this.loadAllSites(firstSub.id, true).then(s => {
                                    this.currentSites = s;
                                    this._renderSites(s);
                                }).catch(err => {
                                    if (window.errorHandler) {
                                        window.errorHandler.report(err, 'navigation.init.retry');
                                    }
                                });
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
        this.init();
    }

    destroy() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        this.siteCache.clear();
        this.isInitialized = false;
    }
}

window.getOptimizedNavigation = function() { return window.optimizedNavigation; };
