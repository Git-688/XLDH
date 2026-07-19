/* navigation.js - 增强版（更多错误日志和容错） */
class OptimizedNavigation {
    constructor() {
        if (window.Starlink?.navigation) return window.Starlink.navigation;

        this.apiBase = Utils.getApiBase();
        this.categoryCache = {};
        this.currentLevel1 = null;
        this.currentLevel2 = null;
        this.currentSites = [];
        this.isInitialized = false;
        this.totalSites = 0;
        this.searchQuery = '';
        this.isSearching = false;
        this.searchTimer = null;

        this.level1Nav = document.getElementById('level1Nav');
        this.level2Nav = document.getElementById('level2Nav');
        this.level3Content = document.getElementById('level3Content');
        this.siteCountEl = document.getElementById('siteCount');
        this.invalidCountEl = document.getElementById('invalidCount');

        if (window.Starlink) window.Starlink.navigation = this;
        window.optimizedNavigation = this;
    }

    // ---------- 工具 ----------
    _escapeHtml(str) { return Utils.escapeHtml(str); }
    _formatViews(views) { return Utils.formatViews ? Utils.formatViews(views) : String(views || 0); }
    _getDomain(url) { try { return new URL(url).hostname; } catch { return ''; } }

    // ---------- 图标 ----------
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
        img.className = 'site-icon-img';

        const domain = this._getDomain(site.url);
        const iconSources = [];
        if (site.icon && (site.icon.startsWith('http://') || site.icon.startsWith('https://'))) iconSources.push(site.icon);
        if (domain) {
            iconSources.push(
                `https://icon.horse/icon/${domain}?size=256&format=webp`,
                `https://icon.horse/icon/${domain}?size=128`,
                `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
                `https://favicon.yandex.net/favicon/${domain}`
            );
        }

        let currentIndex = 0;
        const loadIcon = (src) => { if (src) img.src = src; else this._showFallback(); };
        const _showFallback = () => { img.style.display = 'none'; fallbackText.style.display = 'flex'; img.dataset.failed = 'true'; };

        img.onerror = function() {
            currentIndex++;
            if (currentIndex < iconSources.length) {
                setTimeout(() => { img.src = iconSources[currentIndex]; }, 300);
            } else {
                _showFallback();
            }
        };
        img.onload = function() {
            img.style.display = 'block';
            fallbackText.style.display = 'none';
            img.dataset.failed = 'false';
            setTimeout(() => { if (img.naturalWidth <= 1 && img.naturalHeight <= 1) img.onerror(); }, 100);
        };

        if (iconSources.length > 0) loadIcon(iconSources[0]);
        else _showFallback();

        container.appendChild(img);
        container.appendChild(fallbackText);
        return container;
    }

    // ---------- 渲染站点卡片 ----------
    _renderSites(sites) {
        const container = this.level3Content;
        if (!container) return;
        if (!sites?.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3 class="empty-title">暂无站点</h3><p style="font-size:12px;color:var(--text-secondary);margin-top:8px;">请通过后台管理添加站点数据</p></div>`;
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

            // 点击统计
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
                    if (response?.ok) {
                        const data = await response.json();
                        if (data.views !== undefined) {
                            viewEl.dataset.views = data.views;
                            viewEl.textContent = this._formatViews(data.views);
                            const subId = this.currentLevel2;
                            if (subId && this.categoryCache[this.currentLevel1]) {
                                const subs = this.categoryCache[this.currentLevel1];
                                const sub = subs.find(s => s.id === subId);
                                if (sub) {
                                    const target = sub.sites.find(s => s.id === site.id);
                                    if (target) target.views = data.views;
                                }
                            }
                        }
                    }
                } catch (err) { /* 静默处理 */ }
            });

            // 报告死链
            const reportBtn = card.querySelector('.report-dead-link-btn');
            reportBtn?.addEventListener('click', async (e) => {
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
                    if (res?.ok) {
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

            fragment.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    // ---------- 加载分类数据（增强日志和缓存降级） ----------
    async loadCategoryData(categoryName, forceRefresh = false) {
        const cacheKey = `nav_data_${categoryName}`;
        const cached = localStorage.getItem(cacheKey);
        const now = Date.now();
        if (!forceRefresh && cached) {
            try {
                const data = JSON.parse(cached);
                if (now - data.timestamp < 30 * 60 * 1000) {
                    console.log(`[Navigation] 使用缓存数据: ${categoryName}`);
                    return data.data;
                }
            } catch (e) { console.warn('[Navigation] 缓存解析失败', e); }
        }
        try {
            console.log(`[Navigation] 请求分类数据: ${categoryName}`);
            const response = await Utils.safeFetch(`${this.apiBase}/navigation/category-sites?category=${encodeURIComponent(categoryName)}`);
            if (!response) throw new Error('No response');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            if (!json.subcategories) throw new Error('Invalid response: missing subcategories');
            localStorage.setItem(cacheKey, JSON.stringify({ data: json, timestamp: now }));
            console.log(`[Navigation] 分类数据加载成功: ${categoryName}`, json);
            return json;
        } catch (error) {
            console.error(`[Navigation] 加载分类数据失败: ${categoryName}`, error);
            // 如果缓存存在，即使过期也返回缓存（降级）
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    console.warn(`[Navigation] 使用过期缓存: ${categoryName}`);
                    return data.data;
                } catch(e) {}
            }
            throw error;
        }
    }

    // ---------- 切换一级分类 ----------
    async selectLevel1(categoryName, isUserClick = false) {
        if (this.currentLevel1 === categoryName && !isUserClick) return;
        this.currentLevel1 = categoryName;
        document.querySelectorAll('.level1-btn').forEach(b => b.classList.toggle('active', b.dataset.level1 === categoryName));

        try {
            const data = await this.loadCategoryData(categoryName);
            this.categoryCache[categoryName] = data.subcategories || [];
            this.renderLevel2(categoryName);

            const subs = this.categoryCache[categoryName];
            if (subs?.length) {
                const firstSub = subs[0];
                this.currentLevel2 = firstSub.id;
                this.renderLevel3(firstSub.id);
                document.querySelectorAll('.level2-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.level2) === firstSub.id));
            } else {
                this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3 class="empty-title">该分类下暂无子分类</h3></div>`;
            }
            this.updateStats();
        } catch (error) {
            console.error('[Navigation] 切换分类失败:', error);
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">加载失败，请重试</h3><p style="font-size:12px;color:var(--text-secondary);margin-top:8px;">${Utils.escapeHtml(error.message)}</p><button onclick="window.optimizedNavigation?.refreshCurrentSubcategory()" style="margin-top:10px;padding:6px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:6px;cursor:pointer;">重试</button></div>`;
        }
    }

    // ---------- 渲染二级导航 ----------
    renderLevel2(categoryName) {
        const subs = this.categoryCache[categoryName] || [];
        if (!subs.length) {
            this.level2Nav.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:11px;text-align:center;">暂无子分类</div>';
            return;
        }
        this.level2Nav.innerHTML = subs.map((sub, idx) =>
            `<button class="level2-btn ${idx === 0 ? 'active' : ''}" data-level2="${sub.id}">
                <span class="level2-btn-text">${this._escapeHtml(sub.name)}</span>
            </button>`
        ).join('');

        this.level2Nav.querySelectorAll('.level2-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.level2);
                this.currentLevel2 = id;
                document.querySelectorAll('.level2-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderLevel3(id);
            });
        });
    }

    // ---------- 渲染三级内容 ----------
    renderLevel3(subcategoryId) {
        let sites = null;
        for (const catName in this.categoryCache) {
            const subs = this.categoryCache[catName];
            const found = subs.find(sub => sub.id === subcategoryId);
            if (found) { sites = found.sites || []; break; }
        }
        if (!sites) {
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">数据未加载</h3></div>`;
            return;
        }
        this.currentSites = sites;
        this._renderSites(sites);
    }

    // ---------- 获取总站点数 ----------
    async fetchTotalSitesCount() {
        try {
            const response = await Utils.safeFetch(`${this.apiBase}/total-sites-count`, { timeout: 5000 });
            const data = await response.json();
            if (data.total !== undefined) {
                this.totalSites = data.total;
                if (this.siteCountEl) this.siteCountEl.textContent = this.totalSites + '+';
            }
        } catch (error) {
            console.warn('获取总站点数失败:', error);
            if (this.siteCountEl && !this.siteCountEl.textContent) this.siteCountEl.textContent = '?+';
        }
    }

    async updateStats() {
        await this.fetchTotalSitesCount();
    }

    // ---------- 搜索 ----------
    createSearchBox() {
        const navHeader = document.querySelector('.navigation-header');
        if (!navHeader || navHeader.querySelector('.nav-search-box')) return;
        const container = document.createElement('div');
        container.className = 'nav-search-box';
        container.innerHTML = `
            <div class="search-input-wrapper">
                <i class="fas fa-search search-icon-prefix"></i>
                <input type="text" id="navSearchInput" placeholder="搜索本站链接..." autocomplete="off">
                <button class="search-clear-btn" id="navSearchClearBtn"><i class="fas fa-times"></i></button>
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
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); input?.focus(); }
        });
    }

    async performSearch(query) {
        if (!query.trim()) return;
        this.isSearching = true;
        this.searchQuery = query;
        this.level3Content.innerHTML = '';
        try {
            const response = await Utils.safeFetch(`${this.apiBase}/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            if (!results.length) {
                this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">未找到相关链接</h3></div>`;
            } else {
                this._renderSites(results);
            }
            hint.style.display = 'block';
            hint.textContent = `找到 ${results.length} 个结果`;
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
            this.renderLevel3(this.currentLevel2);
        } else if (this.currentLevel1 && this.categoryCache[this.currentLevel1]) {
            const subs = this.categoryCache[this.currentLevel1];
            if (subs.length) this.renderLevel3(subs[0].id);
        }
    }

    // ---------- 初始化 ----------
    async init() {
        if (this.isInitialized) return;
        try {
            console.log('[Navigation] 开始初始化...');
            const resp = await Utils.safeFetch(`${this.apiBase}/navigation/structure`);
            if (!resp) throw new Error('No response from structure API');
            const structure = await resp.json();
            const categories = Object.keys(structure);
            if (!categories.length) throw new Error('No categories');
            console.log('[Navigation] 获取到分类结构:', categories);

            this.level1Nav.innerHTML = categories.map((cat, idx) =>
                `<button class="level1-btn ${idx === 0 ? 'active' : ''}" data-level1="${cat}">${this._escapeHtml(cat)}</button>`
            ).join('');

            this.level1Nav.addEventListener('click', (e) => {
                const btn = e.target.closest('.level1-btn');
                if (btn) this.selectLevel1(btn.dataset.level1, true);
            });

            const firstCat = categories[0];
            await this.selectLevel1(firstCat, false);
            this.createSearchBox();
            await this.updateStats();
            this.isInitialized = true;
            console.log('[Navigation] 初始化完成');
        } catch (error) {
            console.error('[Navigation] 初始化失败:', error);
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">加载失败，请刷新页面</h3><p style="font-size:12px;color:var(--text-secondary);margin-top:8px;">${Utils.escapeHtml(error.message)}</p><button onclick="window.location.reload()" style="margin-top:10px;padding:6px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:6px;cursor:pointer;">刷新</button></div>`;
        }
    }

    // ---------- 刷新 ----------
    async refreshCurrentSubcategory() {
        if (!this.currentLevel1 || !this.currentLevel2) return;
        try {
            console.log('[Navigation] 手动刷新子分类:', this.currentLevel1, this.currentLevel2);
            await this.loadCategoryData(this.currentLevel1, true);
            this.renderLevel3(this.currentLevel2);
            await this.updateStats();
            window.toast?.show('刷新成功', 'success');
        } catch (error) {
            console.error('[Navigation] 刷新子分类失败:', error);
            window.toast?.show('刷新失败，请重试', 'error');
        }
    }

    destroy() { /* 清理事件等 */ }
}

window.OptimizedNavigation = OptimizedNavigation;