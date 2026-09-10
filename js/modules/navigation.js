/* navigation.js - 异步分页加载 + 图标缓存持久化 + 预加载 + 自动重试 + 批量图标 + 搜索防抖节流 */

class OptimizedNavigation {
    constructor() {
        if (window.Starlink && window.Starlink.navigation) return window.Starlink.navigation;

        this.apiBase = Utils.getApiBase();
        this.categoryCache = {};
        this.currentLevel1 = null;
        this.currentLevel2 = null;
        this.currentSites = [];
        this.isInitialized = false;
        this.totalSites = 0;
        this.searchQuery = '';
        this.isSearching = false;

        // 分页配置
        this.pageSize = 20;
        this.currentPage = 1;
        this.hasMoreData = true;
        this.isLoadingMore = false;

        // 站点数据缓存
        this.siteCache = new Map();
        this.subCounts = {};

        // 图标缓存
        this.iconCache = this.loadIconCache();
        this.MAX_ICON_CACHE_SIZE = 200;

        // ===== 改动 8：搜索防抖节流 =====
        this.searchAbortController = null;
        this.searchTimer = null;
        this.lastInputTime = 0;

        // DOM 元素
        this.level1Nav = document.getElementById('level1Nav');
        this.level2Nav = document.getElementById('level2Nav');
        this.level3Content = document.getElementById('level3Content');
        this.siteCountEl = document.getElementById('siteCount');
        this.invalidCountEl = document.getElementById('invalidCount');

        this.intersectionObserver = null;
        this.loadMoreTrigger = null;
        this._isDestroyed = false;

        if (window.Starlink) window.Starlink.navigation = this;
        window.optimizedNavigation = this;
    }

    // ===== 图标缓存 =====
    loadIconCache() {
        try {
            const raw = localStorage.getItem('nav_icon_cache');
            if (raw) {
                const data = JSON.parse(raw);
                if (data.timestamp && (Date.now() - data.timestamp) < 7 * 24 * 60 * 60 * 1000) {
                    return data.map || {};
                }
            }
        } catch (e) {}
        return {};
    }

    saveIconCache() {
        try {
            const keys = Object.keys(this.iconCache);
            if (keys.length > this.MAX_ICON_CACHE_SIZE) {
                const toRemove = keys.slice(0, keys.length - this.MAX_ICON_CACHE_SIZE);
                toRemove.forEach(key => delete this.iconCache[key]);
            }
            localStorage.setItem('nav_icon_cache', JSON.stringify({
                map: this.iconCache,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }

    _getCachedIcon(domain) {
        return this.iconCache[domain] || null;
    }

    _setCachedIcon(domain, iconUrl) {
        if (!domain) return;
        this.iconCache[domain] = iconUrl;
        this.saveIconCache();
    }

    // ===== 工具方法 =====
    _escapeHtml(str) { return Utils.escapeHtml(str); }
    _formatViews(views) { return Utils.formatViews ? Utils.formatViews(views) : String(views || 0); }

    _getDomain(url) {
        try { return new URL(url).hostname; } catch { return ''; }
    }

    // ===== 创建图标元素 =====
    _createIconElement(site) {
        const container = document.createElement('span');
        container.className = 'icon-container';

        const titleFirstChar = site.title ? site.title.charAt(0).toUpperCase() : '?';
        const fallbackText = document.createElement('span');
        fallbackText.className = 'icon-fallback-text';
        fallbackText.textContent = titleFirstChar;
        fallbackText.style.display = 'none';

        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = '';
        img.style.display = 'none';
        img.className = 'site-icon-img';
        img.dataset.domain = this._getDomain(site.url) || '';

        const domain = img.dataset.domain;
        const iconSources = [];
        if (site.icon && (site.icon.startsWith('http://') || site.icon.startsWith('https://'))) {
            iconSources.push(site.icon);
        }
        if (domain) {
            iconSources.push(
                `https://icon.horse/icon/${domain}?size=256&format=webp`,
                `https://icon.horse/icon/${domain}?size=128`,
                `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
                `https://favicon.yandex.net/favicon/${domain}`
            );
        }

        if (domain && this._getCachedIcon(domain)) {
            img.src = this._getCachedIcon(domain);
            img.style.display = 'block';
        } else if (iconSources.length > 0) {
            const firstSrc = iconSources.shift();
            img.dataset.sources = JSON.stringify(iconSources);
            img.src = firstSrc;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
            fallbackText.style.display = 'flex';
        }

        img.onload = () => {
            img.style.display = 'block';
            fallbackText.style.display = 'none';
            container.classList.remove('icon-placeholder');
            if (domain && img.src) {
                this._setCachedIcon(domain, img.src);
            }
            setTimeout(() => {
                if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
                    img.onerror();
                }
            }, 100);
        };

        img.onerror = () => {
            const sources = JSON.parse(img.dataset.sources || '[]');
            if (sources.length > 0) {
                const nextSrc = sources.shift();
                img.dataset.sources = JSON.stringify(sources);
                img.src = nextSrc;
            } else {
                img.style.display = 'none';
                fallbackText.style.display = 'flex';
                container.classList.remove('icon-placeholder');
            }
        };

        container.appendChild(img);
        container.appendChild(fallbackText);

        return container;
    }

    // ===== 渲染站点卡片 =====
    _renderSites(sites) {
        const container = this.level3Content;
        if (!container) return;
        if (!sites || !sites.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3 class="empty-title">暂无站点</h3></div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        sites.forEach((site) => {
            const card = this._createSiteCard(site);
            fragment.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
        this.updateLoadMoreTrigger();
    }

    _createSiteCard(site) {
        const card = document.createElement('a');
        card.className = 'site-card';
        card.href = site.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.title = `${site.title}\n${site.description || ''}`;

        const iconEl = this._createIconElement(site);
        const views = site.views || 0;
        const formattedViews = this._formatViews(views);
        const desc = site.description || '暂无描述';

        card.innerHTML = `
            <div class="card-top"></div>
            <div class="site-description">${this._escapeHtml(desc)}</div>
            <div class="divider-line"></div>
            <div class="card-bottom">
                <span class="view-count" data-views="${views}">${formattedViews}</span>
                <button class="report-dead-link-btn" data-url="${this._escapeHtml(site.url)}" data-title="${this._escapeHtml(site.title)}" title="报告死链">
                    <i class="fas fa-exclamation-circle"></i>
                </button>
            </div>
        `;

        const cardTop = card.querySelector('.card-top');
        cardTop.appendChild(iconEl);
        const titleSpan = document.createElement('span');
        titleSpan.className = 'site-title';
        titleSpan.textContent = site.title;
        cardTop.appendChild(titleSpan);

        card.addEventListener('click', async (e) => {
            if (e.target.closest('.report-dead-link-btn')) return;
            const viewEl = card.querySelector('.view-count');
            if (!viewEl) return;
            const oldViews = parseInt(viewEl.dataset.views) || 0;
            const optimisticViews = oldViews + 1;
            viewEl.dataset.views = optimisticViews;
            viewEl.textContent = this._formatViews(optimisticViews);
            viewEl.classList.add('increasing');
            setTimeout(() => viewEl.classList.remove('increasing'), 300);

            let updateSuccess = false;
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
                        const correctedViews = data.views;
                        viewEl.dataset.views = correctedViews;
                        viewEl.textContent = this._formatViews(correctedViews);
                        const cacheKey = `${this.currentLevel2}_${this.currentPage}`;
                        if (this.siteCache.has(cacheKey)) {
                            const cached = this.siteCache.get(cacheKey);
                            const targetSite = cached.sites.find(s => s.id === site.id);
                            if (targetSite) {
                                targetSite.views = correctedViews;
                                this.siteCache.set(cacheKey, cached);
                            }
                        }
                        updateSuccess = true;
                    }
                }
            } catch (err) {
                if (window.errorHandler) window.errorHandler.reportError(err, 'navigation.clickUpdate');
            }

            if (!updateSuccess) {
                viewEl.dataset.views = oldViews;
                viewEl.textContent = this._formatViews(oldViews);
            }
        });

        const reportBtn = card.querySelector('.report-dead-link-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (reportBtn.disabled) return;
                reportBtn.disabled = true;
                reportBtn.style.opacity = '0.5';
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
                    } else {
                        const err = await res.json().catch(() => ({}));
                        window.toast.show(err.error || '反馈失败', 'error');
                        reportBtn.disabled = false;
                        reportBtn.style.opacity = '';
                    }
                } catch (err) {
                    window.toast.show('网络错误', 'error');
                    reportBtn.disabled = false;
                    reportBtn.style.opacity = '';
                }
            });
        }

        return card;
    }

    _appendSites(sites) {
        const container = this.level3Content;
        if (!container) return;
        if (!sites || !sites.length) return;

        const existingTrigger = container.querySelector('.load-more-trigger');
        if (existingTrigger) existingTrigger.remove();
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const fragment = document.createDocumentFragment();
        sites.forEach((site) => {
            fragment.appendChild(this._createSiteCard(site));
        });

        container.appendChild(fragment);
        this.updateLoadMoreTrigger();
    }

    _showSkeleton() {
        const container = this.level3Content;
        if (!container) return;
        let html = '';
        for (let i = 0; i < 8; i++) {
            html += `
                <div class="skeleton-card">
                    <div class="skeleton-icon"></div>
                    <div class="skeleton-title"></div>
                    <div class="skeleton-description"></div>
                    <div class="skeleton-views"></div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    _showError(message = '加载失败，请点击重试') {
        const container = this.level3Content;
        if (!container) return;
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3 class="empty-title">${this._escapeHtml(message)}</h3>
                <button class="retry-btn" id="navRetryBtn">重试</button>
            </div>
        `;
        const retryBtn = container.querySelector('#navRetryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (this.currentLevel2) {
                    this.selectLevel2(this.currentLevel2, true);
                }
            });
        }
    }

    updateLoadMoreTrigger() {
        const container = this.level3Content;
        if (!container) return;

        const oldTrigger = container.querySelector('.load-more-trigger');
        if (oldTrigger) oldTrigger.remove();

        if (this.isSearching) return;

        if (!this.hasMoreData || this.currentLevel2 === null) {
            const footer = document.createElement('div');
            footer.className = 'load-more-trigger';
            footer.style.textAlign = 'center';
            footer.style.padding = '20px';
            footer.style.color = 'var(--text-secondary)';
            footer.style.fontSize = '12px';
            footer.textContent = '— 已加载全部 —';
            container.appendChild(footer);
            return;
        }

        const trigger = document.createElement('div');
        trigger.className = 'load-more-trigger';
        trigger.style.height = '1px';
        trigger.style.width = '100%';
        trigger.style.visibility = 'hidden';
        container.appendChild(trigger);

        this.setupIntersectionObserver(trigger);
    }

    setupIntersectionObserver(trigger) {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isLoadingMore && this.hasMoreData && !this.isSearching) {
                    this.loadMoreSites();
                }
            });
        }, {
            rootMargin: '0px 0px 100px 0px',
            threshold: 0.1
        });

        if (trigger) {
            this.intersectionObserver.observe(trigger);
            this.loadMoreTrigger = trigger;
        }
    }

    async loadMoreSites() {
        if (this.isLoadingMore || !this.hasMoreData || !this.currentLevel2 || this.isSearching) return;
        this.isLoadingMore = true;

        const nextPage = this.currentPage + 1;
        const cacheKey = `${this.currentLevel2}_${nextPage}`;

        if (this.siteCache.has(cacheKey)) {
            const data = this.siteCache.get(cacheKey);
            this._appendSites(data.sites);
            this.currentPage = nextPage;
            this.hasMoreData = data.sites.length >= this.pageSize;
            this.isLoadingMore = false;
            this.updateLoadMoreTrigger();
            return;
        }

        try {
            const data = await this.loadSubcategorySites(this.currentLevel2, nextPage);
            this.siteCache.set(cacheKey, data);
            this._appendSites(data.sites);
            this.currentPage = nextPage;
            this.hasMoreData = data.sites.length >= this.pageSize;
        } catch (error) {
            const container = this.level3Content;
            const trigger = container.querySelector('.load-more-trigger');
            if (trigger) {
                trigger.style.visibility = 'visible';
                trigger.style.height = 'auto';
                trigger.style.padding = '20px';
                trigger.innerHTML = `<button class="retry-btn" id="navLoadMoreRetry">重试加载更多</button>`;
                const retryBtn = trigger.querySelector('#navLoadMoreRetry');
                retryBtn.addEventListener('click', () => {
                    trigger.remove();
                    this.loadMoreSites();
                });
            }
        } finally {
            this.isLoadingMore = false;
        }
    }

    async loadSubcategorySites(subId, page) {
        const url = `${this.apiBase}/navigation/sites?subcategory_id=${subId}&page=${page}&limit=${this.pageSize}`;
        const response = await Utils.safeFetch(url, { timeout: 10000 });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data;
    }

    async refreshCurrentSubcategory() {
        if (!this.currentLevel2) return;
        const keysToDelete = [];
        for (const key of this.siteCache.keys()) {
            if (key.startsWith(`${this.currentLevel2}_`)) keysToDelete.push(key);
        }
        keysToDelete.forEach(key => this.siteCache.delete(key));

        this.currentPage = 1;
        this.hasMoreData = true;
        await this.selectLevel2(this.currentLevel2, true);
        await this.updateStats();
    }

    async selectLevel1(categoryName, isUserClick = false) {
        if (this.currentLevel1 === categoryName && !isUserClick) return;
        this.currentLevel1 = categoryName;
        this.currentLevel2 = null;
        this.currentPage = 1;
        this.hasMoreData = true;

        document.querySelectorAll('.level1-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.level1 === categoryName);
        });

        const data = await this.loadCategoryData(categoryName);
        this.categoryCache[categoryName] = data.subcategories || [];

        this.renderLevel2(categoryName);

        const subs = this.categoryCache[categoryName];
        if (subs && subs.length) {
            const firstSub = subs[0];
            await this.selectLevel2(firstSub.id, true);
        } else {
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3 class="empty-title">该分类下暂无子分类</h3></div>`;
        }

        await this.updateStats();
    }

    async loadCategoryData(categoryName, forceRefresh = false) {
        const cacheKey = `nav_data_${categoryName}`;
        const cached = localStorage.getItem(cacheKey);
        const now = Date.now();
        if (!forceRefresh && cached) {
            try {
                const data = JSON.parse(cached);
                if (now - data.timestamp < 30 * 60 * 1000) {
                    return data.data;
                }
            } catch (e) {}
        }

        const MAX_RETRIES = 3;
        let lastError = null;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const response = await Utils.safeFetch(
                    `${this.apiBase}/navigation/category-sites?category=${encodeURIComponent(categoryName)}`,
                    { timeout: 15000 }
                );

                if (response.status === 503 && attempt < MAX_RETRIES - 1) {
                    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                    continue;
                }

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const json = await response.json();
                if (!json.subcategories) throw new Error('Invalid response');

                const cacheData = { data: json, timestamp: now };
                try { localStorage.setItem(cacheKey, JSON.stringify(cacheData)); } catch (e) {}
                return json;
            } catch (error) {
                lastError = error;
                console.warn(`加载分类 ${categoryName} 第 ${attempt + 1} 次失败:`, error.message);
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                }
            }
        }
        throw lastError || new Error('加载失败');
    }

    renderLevel2(categoryName) {
        const subs = this.categoryCache[categoryName] || [];
        if (!subs.length) {
            this.level2Nav.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:11px;text-align:center;">暂无子分类</div>';
            return;
        }

        const subIds = subs.map(s => s.id);
        this.fetchSubcategoryCounts(subIds).then(counts => {
            this.subCounts = counts;
            this.level2Nav.innerHTML = subs.map((sub, idx) => {
                const count = counts[sub.id] || 0;
                const isActive = (this.currentLevel2 === sub.id);
                return `<button class="level2-btn ${isActive ? 'active' : ''}" data-level2="${sub.id}" data-level2-name="${this._escapeHtml(sub.name)}">
                    <span class="level2-btn-text">${this._escapeHtml(sub.name)}</span>
                    ${count > 0 ? `<span class="level2-btn-count">${count}</span>` : ''}
                </button>`;
            }).join('');

            this.level2Nav.querySelectorAll('.level2-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.level2);
                    this.selectLevel2(id, true);
                });
            });
        }).catch(() => {
            this.level2Nav.innerHTML = subs.map((sub, idx) => {
                const isActive = (this.currentLevel2 === sub.id);
                return `<button class="level2-btn ${isActive ? 'active' : ''}" data-level2="${sub.id}" data-level2-name="${this._escapeHtml(sub.name)}">
                    <span class="level2-btn-text">${this._escapeHtml(sub.name)}</span>
                </button>`;
            }).join('');

            this.level2Nav.querySelectorAll('.level2-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.level2);
                    this.selectLevel2(id, true);
                });
            });
        });
    }

    async fetchSubcategoryCounts(subIds) {
        if (!subIds || !subIds.length) return {};
        const url = `${this.apiBase}/subcategory/counts?ids=${subIds.join(',')}`;
        try {
            const response = await Utils.safeFetch(url, { timeout: 5000 });
            const counts = await response.json();
            return counts;
        } catch (e) {
            return {};
        }
    }

    async selectLevel2(subId, forceRefresh = false) {
        if (this.currentLevel2 === subId && !forceRefresh) return;

        this.currentLevel2 = subId;
        this.currentPage = 1;
        this.hasMoreData = true;
        this.isSearching = false;

        document.querySelectorAll('.level2-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.level2) === subId);
        });

        if (forceRefresh) {
            const keysToDelete = [];
            for (const key of this.siteCache.keys()) {
                if (key.startsWith(`${subId}_`)) keysToDelete.push(key);
            }
            keysToDelete.forEach(key => this.siteCache.delete(key));
        }

        const cacheKey = `${subId}_1`;
        if (!forceRefresh && this.siteCache.has(cacheKey)) {
            const data = this.siteCache.get(cacheKey);
            this._renderSites(data.sites);
            this.hasMoreData = data.sites.length >= this.pageSize;
            this.updateLoadMoreTrigger();
            return;
        }

        this._showSkeleton();

        try {
            const data = await this.loadSubcategorySites(subId, 1);
            this.siteCache.set(cacheKey, data);
            this._renderSites(data.sites);
            this.hasMoreData = data.sites.length >= this.pageSize;
            this.updateLoadMoreTrigger();
        } catch (error) {
            this._showError('加载失败，请点击重试');
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

        const input = document.getElementById('navSearchInput');
        const clearBtn = document.getElementById('navSearchClearBtn');

        // ===== 改动 8：防抖 + 节流 =====
        input.addEventListener('input', () => {
            const query = input.value.trim();
            clearBtn.style.display = query ? 'flex' : 'none';

            const now = Date.now();
            if (now - this.lastInputTime < 100) return;
            this.lastInputTime = now;

            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                if (query) this.performSearch(query);
                else this.clearSearch();
            }, 300);
        });

        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            if (this.searchAbortController) {
                this.searchAbortController.abort();
                this.searchAbortController = null;
            }
            this.clearSearch();
            input.focus();
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                input?.focus();
            }
        });
    }

    // ===== 改动 8：AbortController 取消上一次请求 =====
    async performSearch(query) {
        if (!query.trim()) return;

        if (this.searchAbortController) {
            this.searchAbortController.abort();
        }
        this.searchAbortController = new AbortController();

        this.isSearching = true;
        this.searchQuery = query;
        this._showSkeleton();
        try {
            const response = await Utils.safeFetch(
                `${this.apiBase}/search?q=${encodeURIComponent(query)}`,
                { signal: this.searchAbortController.signal }
            );
            const results = await response.json();
            if (!results.length) {
                this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">未找到相关链接</h3></div>`;
            } else {
                this._renderSites(results);
            }
            const hintEl = document.getElementById('navSearchHint');
            if (hintEl) {
                hintEl.style.display = 'block';
                hintEl.textContent = `找到 ${results.length} 个结果`;
            }
            const trigger = this.level3Content.querySelector('.load-more-trigger');
            if (trigger) trigger.style.display = 'none';
        } catch (e) {
            if (e.name === 'AbortError') return;
            this.level3Content.innerHTML = '<div class="empty-state">搜索失败，请重试</div>';
        } finally {
            this.isSearching = false;
            this.searchAbortController = null;
        }
    }

    clearSearch() {
        if (!this.isSearching && !this.searchQuery) return;
        this.isSearching = false;
        this.searchQuery = '';
        const hintEl = document.getElementById('navSearchHint');
        if (hintEl) hintEl.style.display = 'none';
        if (this.currentLevel2) {
            this.selectLevel2(this.currentLevel2, true);
        } else if (this.currentLevel1 && this.categoryCache[this.currentLevel1]) {
            const subs = this.categoryCache[this.currentLevel1];
            if (subs.length) this.selectLevel2(subs[0].id, true);
        }
    }

    async updateStats() {
        await this.fetchTotalSitesCount();
    }

    async fetchTotalSitesCount() {
        try {
            const response = await Utils.safeFetch(`${this.apiBase}/total-sites-count`, { timeout: 5000 });
            const data = await response.json();
            if (data.total !== undefined) {
                this.totalSites = data.total;
                if (this.siteCountEl) {
                    this.siteCountEl.textContent = this.totalSites + '+';
                }
            }
        } catch (error) {
            if (this.siteCountEl && !this.siteCountEl.textContent) {
                this.siteCountEl.textContent = '?+';
            }
        }
    }

    async init() {
        if (this.isInitialized) return;

        const MAX_RETRIES = 3;
        let lastError = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const resp = await Utils.safeFetch(`${this.apiBase}/navigation/structure`, { timeout: 15000 });

                if (resp.status === 503 && attempt < MAX_RETRIES - 1) {
                    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                    continue;
                }

                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

                const structure = await resp.json();
                const categories = Object.keys(structure);
                if (!categories.length) throw new Error('No categories');

                this.level1Nav.innerHTML = categories.map((cat, idx) =>
                    `<button class="level1-btn ${idx === 0 ? 'active' : ''}" data-level1="${cat}">${this._escapeHtml(cat)}</button>`
                ).join('');

                this.level1Nav.addEventListener('click', (e) => {
                    const btn = e.target.closest('.level1-btn');
                    if (btn) {
                        const cat = btn.dataset.level1;
                        this.selectLevel1(cat, true);
                    }
                });

                const firstCat = categories[0];
                await this.selectLevel1(firstCat, false);
                this.createSearchBox();

                await this.updateStats();

                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => this.preloadAllCategories());
                } else {
                    setTimeout(() => this.preloadAllCategories(), 2000);
                }

                this.isInitialized = true;

                // ===== 改动 7：批量图标预取 =====
                setTimeout(() => this._prefetchIcons(), 2000);
                return;
            } catch (error) {
                lastError = error;
                console.warn(`导航初始化第 ${attempt + 1} 次失败:`, error.message);
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                }
            }
        }

        console.error('导航初始化失败:', lastError);
        this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">加载失败，请刷新页面</h3><button class="retry-btn" id="navInitRetryBtn" style="margin-top:12px;">重试</button></div>`;
        const retryBtn = document.getElementById('navInitRetryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.isInitialized = false;
                this.init();
            });
        }
    }

    // ===== 改动 7：批量图标预取 =====
    async _prefetchIcons() {
        try {
            const domains = new Set();
            for (const cached of this.siteCache.values()) {
                const sites = cached.sites || (cached.data && cached.data.sites);
                if (sites) {
                    for (const site of sites) {
                        const domain = this._getDomain(site.url);
                        if (domain && !this._getCachedIcon(domain)) domains.add(domain);
                    }
                }
            }
            if (domains.size === 0) return;

            const domainList = Array.from(domains).slice(0, 50);
            const resp = await Utils.safeFetch(
                `${this.apiBase}/batch-icons?domains=${domainList.map(d => encodeURIComponent(d)).join(',')}`,
                { timeout: 5000 }
            );
            const data = await resp.json();
            if (data.icons) {
                Object.values(data.icons).forEach(url => {
                    if (url) {
                        const img = new Image();
                        img.src = this.apiBase + url;
                    }
                });
            }
        } catch (e) {
            // 静默失败
        }
    }

    async preloadAllCategories() {
        try {
            const resp = await Utils.safeFetch(`${this.apiBase}/navigation/structure`, { timeout: 5000 });
            const structure = await resp.json();
            const categories = Object.keys(structure);
            await Promise.all(categories.map(cat => this.loadCategoryData(cat, false).catch(() => null)));
        } catch (e) {}
    }

    destroy() {
        this._isDestroyed = true;
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
        if (this.loadMoreTrigger) {
            this.loadMoreTrigger = null;
        }
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }
        if (this.searchAbortController) {
            this.searchAbortController.abort();
            this.searchAbortController = null;
        }
        this.siteCache.clear();
        this.iconCache = {};
    }
}

window.OptimizedNavigation = OptimizedNavigation;