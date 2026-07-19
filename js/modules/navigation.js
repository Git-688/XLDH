/* navigation.js - 异步分页加载 + 图标缓存持久化 + 预加载 + IntersectionObserver 懒加载增强 */
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

        // 站点数据缓存：key = `${subId}_${page}`, value = { sites, total, page, limit }
        this.siteCache = new Map();
        this.subCounts = {};

        // 图标缓存（持久化到 localStorage）
        this.iconCache = this.loadIconCache();

        // 懒加载观察器
        this.lazyObserver = null;
        this.observedElements = new WeakSet();

        // DOM 元素
        this.level1Nav = document.getElementById('level1Nav');
        this.level2Nav = document.getElementById('level2Nav');
        this.level3Content = document.getElementById('level3Content');
        this.siteCountEl = document.getElementById('siteCount');
        this.invalidCountEl = document.getElementById('invalidCount');

        this.intersectionObserver = null;
        this.loadMoreTrigger = null;

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

    // ===== 创建图标元素（带懒加载和占位） =====
    _createIconElement(site) {
        const container = document.createElement('span');
        container.className = 'icon-container icon-placeholder';

        const titleFirstChar = site.title ? site.title.charAt(0).toUpperCase() : '?';
        const fallbackText = document.createElement('span');
        fallbackText.className = 'icon-fallback-text';
        fallbackText.textContent = titleFirstChar;
        fallbackText.style.display = 'none';

        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = '';
        img.style.display = 'none'; // 初始隐藏，加载后显示
        img.className = 'site-icon-img';
        img.dataset.domain = this._getDomain(site.url) || '';

        // 收集图标源
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

        // 检查缓存
        if (domain && this._getCachedIcon(domain)) {
            // 有缓存，立即加载
            img.src = this._getCachedIcon(domain);
            img.style.display = 'block';
            container.classList.remove('icon-placeholder');
        } else if (iconSources.length > 0) {
            // 无缓存，存储源列表供懒加载使用
            img.dataset.sources = JSON.stringify(iconSources);
            // 显示占位（已添加 icon-placeholder 类）
        } else {
            // 无任何源，直接显示降级
            img.style.display = 'none';
            fallbackText.style.display = 'flex';
            container.classList.remove('icon-placeholder');
        }

        // 加载完成后的处理
        img.onload = () => {
            img.style.display = 'block';
            fallbackText.style.display = 'none';
            container.classList.remove('icon-placeholder');
            if (domain && img.src) {
                this._setCachedIcon(domain, img.src);
            }
            // 检查图片实际尺寸，若为无效图片则触发降级
            setTimeout(() => {
                if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
                    img.onerror();
                }
            }, 100);
        };

        img.onerror = () => {
            // 尝试下一个源或降级
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

        // 标记为待观察（如果未加载完成）
        if (img.dataset.sources && !img.src) {
            container.dataset.lazy = 'true';
        }

        return container;
    }

    // ===== 懒加载观察器初始化 =====
    initLazyObserver() {
        if (this.lazyObserver) return;
        this.lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const container = entry.target;
                    const img = container.querySelector('.site-icon-img');
                    if (img && img.dataset.sources && !img.src) {
                        const sources = JSON.parse(img.dataset.sources);
                        if (sources.length > 0) {
                            // 取第一个源，并尝试加载
                            const firstSrc = sources.shift();
                            img.dataset.sources = JSON.stringify(sources);
                            img.src = firstSrc;
                            // 移除占位样式
                            container.classList.remove('icon-placeholder');
                        }
                    }
                    // 取消观察已触发的元素
                    if (this.lazyObserver) {
                        this.lazyObserver.unobserve(container);
                    }
                }
            });
        }, {
            rootMargin: '200px 0px', // 提前加载
            threshold: 0.01
        });
    }

    // ===== 观察容器内待加载的图标 =====
    observeLazyIcons(container) {
        if (!this.lazyObserver) this.initLazyObserver();
        const lazyContainers = container.querySelectorAll('.icon-container[data-lazy="true"]');
        lazyContainers.forEach(el => {
            if (!this.observedElements.has(el)) {
                this.lazyObserver.observe(el);
                this.observedElements.add(el);
            }
        });
    }

    // ===== 渲染站点卡片（增强懒加载） =====
    _renderSites(sites) {
        const container = this.level3Content;
        if (!container) return;
        if (!sites || !sites.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3 class="empty-title">暂无站点</h3></div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        sites.forEach((site) => {
            const card = document.createElement('a');
            card.className = 'site-card';
            card.href = site.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.title = `${site.title}\n${site.description || ''}`;

            const iconEl = this._createIconElement(site);
            const views = site.views || 0;
            const formattedViews = this._formatViews(views);

            card.innerHTML = `
                <div class="card-top"></div>
                <div class="site-description">${this._escapeHtml(site.description || '暂无描述')}</div>
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

            // 点击事件：乐观更新 + 同步校正
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
                        }
                    }
                } catch (err) {
                    if (window.errorHandler) {
                        window.errorHandler.report(err, 'navigation.clickUpdate');
                    }
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

            fragment.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(fragment);

        // 观察懒加载图标
        this.observeLazyIcons(container);
        this.updateLoadMoreTrigger();
    }

    // ===== 追加站点卡片（用于滚动加载更多） =====
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
            const card = document.createElement('a');
            card.className = 'site-card';
            card.href = site.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.title = `${site.title}\n${site.description || ''}`;

            const iconEl = this._createIconElement(site);
            const views = site.views || 0;
            const formattedViews = this._formatViews(views);

            card.innerHTML = `
                <div class="card-top"></div>
                <div class="site-description">${this._escapeHtml(site.description || '暂无描述')}</div>
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

            // 点击事件（与 _renderSites 一致）
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
                        }
                    }
                } catch (err) {
                    if (window.errorHandler) {
                        window.errorHandler.report(err, 'navigation.clickUpdate');
                    }
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

            fragment.appendChild(card);
        });

        container.appendChild(fragment);

        // 观察新添加的懒加载图标
        this.observeLazyIcons(container);
        this.updateLoadMoreTrigger();
    }

    // ===== 显示骨架屏 =====
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

    // ===== 显示错误状态 =====
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

    // ===== 更新加载更多触发器 =====
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

    // ===== 设置 IntersectionObserver =====
    setupIntersectionObserver(trigger) {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
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

    // ===== 加载更多站点 =====
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

    // ===== 加载子分类站点（调用 API） =====
    async loadSubcategorySites(subId, page) {
        const url = `${this.apiBase}/navigation/sites?subcategory_id=${subId}&page=${page}&limit=${this.pageSize}`;
        const response = await Utils.safeFetch(url, { timeout: 10000 });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data;
    }

    // ===== 刷新当前子分类 =====
    async refreshCurrentSubcategory() {
        if (!this.currentLevel2) return;
        const keysToDelete = [];
        for (const key of this.siteCache.keys()) {
            if (key.startsWith(`${this.currentLevel2}_`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.siteCache.delete(key));

        this.currentPage = 1;
        this.hasMoreData = true;
        await this.selectLevel2(this.currentLevel2, true);
        await this.updateStats();
    }

    // ===== 选择一级分类 =====
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

    // ===== 加载一级分类数据（含缓存） =====
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

        const response = await Utils.safeFetch(`${this.apiBase}/navigation/category-sites?category=${encodeURIComponent(categoryName)}`);
        const json = await response.json();
        if (!json.subcategories) throw new Error('Invalid response');

        const cacheData = { data: json, timestamp: now };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        return json;
    }

    // ===== 渲染二级导航 =====
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

    // ===== 获取子分类计数 =====
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

    // ===== 选择二级分类 =====
    async selectLevel2(subId, forceRefresh = false) {
        if (this.currentLevel2 === subId && !forceRefresh) return;

        this.currentLevel2 = subId;
        this.currentPage = 1;
        this.hasMoreData = true;
        this.isSearching = false;

        document.querySelectorAll('.level2-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.level2) === subId);
        });

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

        const input = document.getElementById('navSearchInput');
        const clearBtn = document.getElementById('navSearchClearBtn');
        const hint = document.getElementById('navSearchHint');

        input.addEventListener('input', () => {
            const query = input.value.trim();
            clearBtn.style.display = query ? 'flex' : 'none';
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                if (query) this.performSearch(query);
                else this.clearSearch();
            }, 300);
        });
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
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

    async performSearch(query) {
        if (!query.trim()) return;
        this.isSearching = true;
        this.searchQuery = query;
        this._showSkeleton();
        try {
            const response = await Utils.safeFetch(`${this.apiBase}/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            if (!results.length) {
                this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">未找到相关链接</h3></div>`;
            } else {
                this._renderSites(results);
            }
            document.getElementById('navSearchHint').style.display = 'block';
            document.getElementById('navSearchHint').textContent = `找到 ${results.length} 个结果`;
            const trigger = this.level3Content.querySelector('.load-more-trigger');
            if (trigger) trigger.style.display = 'none';
        } catch (e) {
            this.level3Content.innerHTML = '<div class="empty-state">搜索失败，请重试</div>';
        } finally {
            this.isSearching = false;
        }
    }

    clearSearch() {
        if (!this.isSearching && !this.searchQuery) return;
        this.isSearching = false;
        this.searchQuery = '';
        document.getElementById('navSearchHint').style.display = 'none';
        if (this.currentLevel2) {
            this.selectLevel2(this.currentLevel2, true);
        } else if (this.currentLevel1 && this.categoryCache[this.currentLevel1]) {
            const subs = this.categoryCache[this.currentLevel1];
            if (subs.length) this.selectLevel2(subs[0].id, true);
        }
    }

    // ===== 更新统计 =====
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

    // ===== 初始化 =====
    async init() {
        if (this.isInitialized) return;

        try {
            const resp = await Utils.safeFetch(`${this.apiBase}/navigation/structure`);
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

            // 预加载所有一级分类数据（空闲时执行）
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => this.preloadAllCategories());
            } else {
                setTimeout(() => this.preloadAllCategories(), 2000);
            }

            this.isInitialized = true;
        } catch (error) {
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">加载失败，请刷新页面</h3></div>`;
        }
    }

    // ===== 预加载所有一级分类结构 =====
    async preloadAllCategories() {
        try {
            const resp = await Utils.safeFetch(`${this.apiBase}/navigation/structure`, { timeout: 5000 });
            const structure = await resp.json();
            const categories = Object.keys(structure);
            await Promise.all(categories.map(cat => this.loadCategoryData(cat, false)));
        } catch (e) {}
    }

    // ===== 销毁 =====
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
        if (this.lazyObserver) {
            this.lazyObserver.disconnect();
            this.lazyObserver = null;
        }
    }
}

window.OptimizedNavigation = OptimizedNavigation;