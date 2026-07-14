/* navigation.js - 按一级分类加载全部数据，缓存到 localStorage */
class OptimizedNavigation {
    constructor() {
        if (window.Starlink && window.Starlink.navigation) return window.Starlink.navigation;

        this.apiBase = Utils.getApiBase();
        this.categoryCache = {};          // 内存缓存：{ categoryName: subcategories[] }
        this.currentLevel1 = null;        // 当前选中的一级分类名
        this.currentLevel2 = null;        // 当前选中的子分类ID
        this.currentSites = [];           // 当前显示的站点列表
        this.isInitialized = false;
        this.stats = { totalWebsites: 0, invalidCount: 0 };
        this.searchQuery = '';
        this.isSearching = false;

        // DOM 引用
        this.level1Nav = document.getElementById('level1Nav');
        this.level2Nav = document.getElementById('level2Nav');
        this.level3Content = document.getElementById('level3Content');
        this.siteCountEl = document.getElementById('siteCount');
        this.invalidCountEl = document.getElementById('invalidCount');

        // 绑定事件
        this.bindEvents();

        if (window.Starlink) window.Starlink.navigation = this;
        window.optimizedNavigation = this;
    }

    // ---------- 工具方法 ----------
    _escapeHtml(str) { return Utils.escapeHtml(str); }
    _formatViews(views) { return Utils.formatViews ? Utils.formatViews(views) : String(views || 0); }

    _getDomain(url) {
        try { return new URL(url).hostname; } catch { return ''; }
    }

    _getFullIconUrl(icon, siteUrl) {
        if (!icon) return '';
        if (icon.startsWith('/icon?domain=')) return this.apiBase + icon;
        if (icon.startsWith('http://') || icon.startsWith('https://')) return icon;
        const domain = this._getDomain(siteUrl);
        if (domain) return this.apiBase + `/icon?domain=${encodeURIComponent(domain)}`;
        return '';
    }

    // ---------- 图标生成（含降级方案） ----------
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
        img.style.display = 'block';

        // 主要图标源（高清）
        const domain = this._getDomain(site.url);
        let primaryUrl = '';
        if (domain) {
            primaryUrl = `https://icon.horse/icon/${domain}?size=512&format=webp`;
        }
        // 若站点自带图标且为http，则优先使用
        if (site.icon && (site.icon.startsWith('http://') || site.icon.startsWith('https://'))) {
            primaryUrl = site.icon;
        }
        // 若还是空，则使用 yandex 备用
        if (!primaryUrl && domain) {
            primaryUrl = `https://favicon.yandex.net/favicon/${domain}`;
        }
        // 若仍然空，则用 google 兜底
        if (!primaryUrl && domain) {
            primaryUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        }

        img.src = primaryUrl || '';

        img.onerror = () => {
            img.style.display = 'none';
            fallbackText.style.display = 'flex';
            // 尝试从备用源重新加载（仅当 primaryUrl 不是 google 或 yandex 时）
            if (domain && !primaryUrl.includes('google.com') && !primaryUrl.includes('yandex.net')) {
                const backupUrl = `https://favicon.yandex.net/favicon/${domain}`;
                const backupImg = new Image();
                backupImg.onload = () => {
                    img.src = backupUrl;
                    img.style.display = 'block';
                    fallbackText.style.display = 'none';
                };
                backupImg.onerror = () => {
                    // 最后尝试 google
                    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                    const googleImg = new Image();
                    googleImg.onload = () => {
                        img.src = googleUrl;
                        img.style.display = 'block';
                        fallbackText.style.display = 'none';
                    };
                    googleImg.src = googleUrl;
                };
                backupImg.src = backupUrl;
            }
        };

        container.appendChild(img);
        container.appendChild(fallbackText);
        return container;
    }

    // ---------- 渲染站点卡片 ----------
    _renderSites(sites) {
        const container = this.level3Content;
        if (!container) return;
        if (!sites || !sites.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3 class="empty-title">暂无站点</h3></div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        sites.forEach((site, index) => {
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

            // 将图标插入 card-top
            const cardTop = card.querySelector('.card-top');
            cardTop.appendChild(iconEl);
            const titleSpan = document.createElement('span');
            titleSpan.className = 'site-title';
            titleSpan.textContent = site.title;
            cardTop.appendChild(titleSpan);

            // 点击事件（增加浏览量）
            card.addEventListener('click', async (e) => {
                if (e.target.closest('.report-dead-link-btn')) return;
                const viewEl = card.querySelector('.view-count');
                if (!viewEl) return;
                const oldViews = parseInt(viewEl.dataset.views) || 0;
                const newViews = oldViews + 1;
                viewEl.dataset.views = newViews;
                viewEl.textContent = this._formatViews(newViews);
                viewEl.classList.add('increasing');
                setTimeout(() => viewEl.classList.remove('increasing'), 300);

                try {
                    await Utils.safeFetch(`${this.apiBase}/click`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: site.id, url: site.url }),
                        keepalive: true
                    });
                } catch (err) { /* 静默处理 */ }
            });

            // 死链上报
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
    }

    // ---------- 加载一级分类数据（含缓存） ----------
    async loadCategoryData(categoryName, forceRefresh = false) {
        const cacheKey = `nav_data_${categoryName}`;
        const cached = localStorage.getItem(cacheKey);
        const now = Date.now();
        if (!forceRefresh && cached) {
            try {
                const data = JSON.parse(cached);
                if (now - data.timestamp < 30 * 60 * 1000) { // 30分钟缓存
                    return data.data;
                }
            } catch (e) {}
        }

        // 请求接口
        const response = await Utils.safeFetch(`${this.apiBase}/navigation/category-sites?category=${encodeURIComponent(categoryName)}`);
        const json = await response.json();
        if (!json.subcategories) throw new Error('Invalid response');

        // 存入缓存
        const cacheData = { data: json, timestamp: now };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        return json;
    }

    // ---------- 切换一级分类 ----------
    async selectLevel1(categoryName, isUserClick = false) {
        if (this.currentLevel1 === categoryName && !isUserClick) return;
        this.currentLevel1 = categoryName;

        // 更新一级按钮状态
        document.querySelectorAll('.level1-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.level1 === categoryName);
        });

        // 加载数据
        const data = await this.loadCategoryData(categoryName);
        this.categoryCache[categoryName] = data.subcategories || [];

        // 渲染二级导航
        this.renderLevel2(categoryName);

        // 默认选中第一个子分类
        const subs = this.categoryCache[categoryName];
        if (subs && subs.length) {
            const firstSub = subs[0];
            this.currentLevel2 = firstSub.id;
            this.renderLevel3(firstSub.id);
            // 高亮二级按钮
            document.querySelectorAll('.level2-btn').forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.level2) === firstSub.id);
            });
        } else {
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3 class="empty-title">该分类下暂无子分类</h3></div>`;
        }

        // 更新统计（如果已有缓存，可快速计算）
        this.updateStats();
    }

    // ---------- 渲染二级导航 ----------
    renderLevel2(categoryName) {
        const subs = this.categoryCache[categoryName] || [];
        if (!subs.length) {
            this.level2Nav.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:11px;text-align:center;">暂无子分类</div>';
            return;
        }
        this.level2Nav.innerHTML = subs.map((sub, idx) =>
            `<button class="level2-btn ${idx === 0 ? 'active' : ''}" data-level2="${sub.id}" data-level2-name="${this._escapeHtml(sub.name)}">
                <span class="level2-btn-text">${this._escapeHtml(sub.name)}</span>
            </button>`
        ).join('');

        // 绑定二级点击事件（使用事件委托）
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

    // ---------- 渲染三级内容（根据子分类ID） ----------
    renderLevel3(subcategoryId) {
        let sites = null;
        // 从缓存中查找
        for (const catName in this.categoryCache) {
            const subs = this.categoryCache[catName];
            const found = subs.find(sub => sub.id === subcategoryId);
            if (found) {
                sites = found.sites || [];
                break;
            }
        }
        if (!sites) {
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">数据未加载</h3></div>`;
            return;
        }
        this.currentSites = sites;
        this._renderSites(sites);
    }

    // ---------- 更新统计（总站点数、无效数） ----------
    updateStats() {
        let total = 0;
        for (const catName in this.categoryCache) {
            const subs = this.categoryCache[catName];
            for (const sub of subs) {
                total += (sub.sites || []).length;
            }
        }
        this.stats.totalWebsites = total;
        // 无效数无法从缓存获取，可忽略或单独请求
        if (this.siteCountEl) this.siteCountEl.textContent = `${total}+`;
        // invalidCount 暂不更新，或通过额外接口获取
    }

    // ---------- 搜索功能 ----------
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
        this.level3Content.innerHTML = '';
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

        // 获取一级分类列表（从 structure 接口获取分类名）
        try {
            const resp = await Utils.safeFetch(`${this.apiBase}/navigation/structure`);
            const structure = await resp.json();
            const categories = Object.keys(structure);
            if (!categories.length) throw new Error('No categories');

            // 渲染一级导航
            this.level1Nav.innerHTML = categories.map((cat, idx) =>
                `<button class="level1-btn ${idx === 0 ? 'active' : ''}" data-level1="${cat}">${this._escapeHtml(cat)}</button>`
            ).join('');

            // 绑定一级点击事件（事件委托）
            this.level1Nav.addEventListener('click', (e) => {
                const btn = e.target.closest('.level1-btn');
                if (btn) {
                    const cat = btn.dataset.level1;
                    this.selectLevel1(cat, true);
                }
            });

            // 默认加载第一个分类
            const firstCat = categories[0];
            await this.selectLevel1(firstCat, false);
            this.createSearchBox();
            this.isInitialized = true;
        } catch (error) {
            console.error('导航初始化失败:', error);
            this.level3Content.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">加载失败，请刷新页面</h3></div>`;
        }
    }

    // ---------- 对外刷新接口 ----------
    async refreshCurrentSubcategory() {
        if (!this.currentLevel1 || !this.currentLevel2) return;
        // 强制刷新当前分类的缓存
        await this.loadCategoryData(this.currentLevel1, true);
        // 重新渲染当前子分类
        this.renderLevel3(this.currentLevel2);
        this.updateStats();
    }

    // ---------- 销毁 ----------
    destroy() {
        // 清理事件等
    }
}

// 导出（用于全局）
window.OptimizedNavigation = OptimizedNavigation;