/* navigation.js - 修复分类导航空白问题 */
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

        // 如果容器元素不存在，则无法工作
        if (!this.level1Nav || !this.level2Nav || !this.level3Content) {
            console.error('导航容器元素缺失，请检查DOM结构');
            return;
        }

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

        // 优先使用管理员上传的图标
        let iconSrc = null;
        if (site.icon && (site.icon.startsWith('http://') || site.icon.startsWith('https://'))) {
            iconSrc = site.icon;
        } else {
            const domain = this._getDomain(site.url);
            if (domain) {
                // 只使用一个外部源，减少请求数
                iconSrc = `https://favicon.yandex.net/favicon/${domain}`;
            }
        }

        const loadIcon = (src) => {
            if (src) {
                img.src = src;
                img.style.display = 'block';
                fallbackText.style.display = 'none';
            } else {
                this._showFallback(img, fallbackText);
            }
        };

        img.onerror = () => {
            this._showFallback(img, fallbackText);
        };
        img.onload = () => {
            if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
                this._showFallback(img, fallbackText);
            } else {
                img.style.display = 'block';
                fallbackText.style.display = 'none';
            }
        };

        if (iconSrc) loadIcon(iconSrc);
        else this._showFallback(img, fallbackText);

        container.appendChild(img);
        container.appendChild(fallbackText);
        return container;
    }

    _showFallback(img, fallbackText) {
        img.style.display = 'none';
        fallbackText.style.display = 'flex';
        img.dataset.failed = 'true';
    }

    // ---------- 渲染站点卡片 ----------
    _renderSites(sites) {
        const container = this.level3Content;
        if (!container) return;
        if (!sites?.length) {
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

            // 点击统计（乐观更新，但增加重试）
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
                    } else {
                        // 回滚乐观更新
                        viewEl.dataset.views = oldViews;
                        viewEl.textContent = this._formatViews(oldViews);
                    }
                } catch (err) {
                    // 回滚
                    viewEl.dataset.views = oldViews;
                    viewEl.textContent = this._formatViews(oldViews);
                }
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

    // ---------- 加载分类数据 ----------
    async loadCategoryData(categoryName, forceRefresh = false) {
        const cacheKey = `nav_data_${categoryName}`;
        // 如果强制刷新，清除缓存
        if (forceRefresh) {
            localStorage.removeItem(cacheKey);
        }

        const cached = localStorage.getItem(cacheKey);
        const now = Date.now();
        if (!forceRefresh && cached) {
            try {
                const data = JSON.parse(cached);
                // 如果缓存时间在5分钟内且数据非空，使用缓存；否则重新请求
                if (now - data.timestamp < 5 * 60 * 1000 && data.data && Object.keys(data.data).length > 0) {
                    return data.data;
                }
            } catch (e) {
                // 缓存损坏，重新请求
                localStorage.removeItem(cacheKey);
            }
        }

        try {
            const response = await Utils.safeFetch(`${this.apiBase}/navigation/category-sites?category=${encodeURIComponent(categoryName)}`, { timeout: 15000 });
            if (!response) throw new Error('网络请求失败');
            const json = await response.json();
            if (!json.subcategories) throw new Error('数据格式错误');
            // 仅在数据非空时缓存
            if (json.subcategories.length > 0) {
                localStorage.setItem(cacheKey, JSON.stringify({ data: json, timestamp: now }));
            } else {
                // 如果返回空数组，不缓存（避免缓存空数据）
                localStorage.removeItem(cacheKey);
            }
            return json;
        } catch (error) {
            console.error('加载分类数据失败:', error);
            // 如果缓存存在，返回缓存（即使过期）
            if (cached) {
                try {
                    const old = JSON.parse(cached);
                    if (old.data) return old.data;
                } catch (e) {}
            }
            throw error;
        }
    }

    // ---------- 切换一级分类 ----------
    async selectLevel1(categoryName, isUserClick = false) {
        if (this.currentLevel1 === categoryName && !isUserClick) return;
        this.currentLevel1 = categoryName;
        document.querySelectorAll('.level1-btn').forEach(b => b.classList.toggle('active', b.dataset.level1 === categoryName));

        // 显示加载骨架
        this.level3Content.innerHTML = `
            <div style="grid-column:1/-1;display:flex;justify-content:center;padding:40px 0;">
                <div class="loading-spinner" style="width:32px;height:32px;border:3px solid var(--border-color);border-top-color:var(--primary-color);border-radius:50%;animation:spin 1s linear infinite;"></div>
            </div>
        `;

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
            console.error('切换分类失败:', error);
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">加载失败，请重试</h3><button onclick="window.optimizedNavigation?.refreshCurrentSubcategory()" style="margin-top:10px;padding:6px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:6px;cursor:pointer;">重试</button></div>`;
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
        // ... 保持原样 ...
    }

    async performSearch(query) {
        // ... 保持原样 ...
    }

    clearSearch() {
        // ... 保持原样 ...
    }

    // ---------- 初始化 ----------
    async init() {
        if (this.isInitialized) return;
        try {
            const resp = await Utils.safeFetch(`${this.apiBase}/navigation/structure`, { timeout: 10000 });
            if (!resp) throw new Error('No response from structure API');
            const structure = await resp.json();
            const categories = Object.keys(structure);
            if (!categories.length) {
                // 分类为空，显示友好提示
                this.level1Nav.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:13px;text-align:center;">暂无分类，请管理员添加</div>';
                this.level2Nav.innerHTML = '';
                this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3 class="empty-title">暂无导航数据</h3><p class="empty-subtitle">请前往后台管理添加分类</p></div>`;
                return;
            }

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
        } catch (error) {
            console.error('导航初始化失败:', error);
            this.level1Nav.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:13px;text-align:center;">加载失败，请刷新</div>';
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">加载失败，请刷新页面</h3><button onclick="window.location.reload()" style="margin-top:10px;padding:6px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:6px;cursor:pointer;">刷新</button></div>`;
        }
    }

    // ---------- 刷新 ----------
    async refreshCurrentSubcategory() {
        if (!this.currentLevel1 || !this.currentLevel2) return;
        try {
            // 强制刷新，清除缓存
            await this.loadCategoryData(this.currentLevel1, true);
            this.renderLevel3(this.currentLevel2);
            await this.updateStats();
            window.toast?.show('导航数据已刷新', 'success');
        } catch (error) {
            console.error('刷新子分类失败:', error);
            window.toast?.show('刷新失败，请重试', 'error');
        }
    }

    destroy() { /* 清理事件等 */ }
}

window.OptimizedNavigation = OptimizedNavigation;