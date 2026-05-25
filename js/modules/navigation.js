/**
 * 优化分类导航系统 - 拼音搜索版（调用 /search 接口）
 * 功能：三级导航、搜索（后端拼音搜索）、死链报告、自动更新、按需加载站点、图片懒加载
 */
class OptimizedNavigation {
    constructor() {
        this.structure = null;           // 分类结构（无站点）
        this.siteCache = new Map();      // 站点缓存 key: subcategory_id, value: sites[]
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        this.isNavigationClick = false;
        this.skeletonCount = 6;
        this.updateTimer = null;
        this.UPDATE_INTERVAL = 5 * 60 * 1000;
        this.quietUpdate = true;
        this.apiBase = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://api.xjdh688.ccwu.cc';
        this.imgObserver = null;
        this.isSearching = false;
        this.searchInput = null;
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
            }, { rootMargin: '200px' });
        }
    }

    observeLazyImages(container) {
        if (!this.imgObserver) return;
        const imgs = container.querySelectorAll('img[data-src]');
        imgs.forEach(img => this.imgObserver.observe(img));
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
            const firstCategory = this.getFirstCategory();
            if (firstCategory) this.selectLevel1(firstCategory, false);
            this.isInitialized = true;
            this.startBackgroundUpdates();
        } catch (error) {
            console.error('导航初始化失败:', error);
            this.showError();
        }
    }

    async loadNavigationStructure() {
        const response = await fetch(`${this.apiBase}/navigation/structure`);
        if (!response.ok) throw new Error('Failed to load navigation structure');
        this.structure = await response.json();
    }

    async loadSites(subcategoryId) {
        if (this.siteCache.has(subcategoryId)) {
            return this.siteCache.get(subcategoryId);
        }
        const response = await fetch(`${this.apiBase}/navigation/sites?subcategory_id=${subcategoryId}`);
        if (!response.ok) throw new Error('Failed to load sites');
        const sites = await response.json();
        this.siteCache.set(subcategoryId, sites);
        return sites;
    }

    calculateStats() {
        const catCount = this.structure ? Object.keys(this.structure).length : 0;
        this.stats.totalCategories = catCount;
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const el1 = document.getElementById('siteCount');
        const el2 = document.getElementById('invalidCount');
        if (el1) el1.textContent = `${this.stats.totalWebsites || '?'}+`;
        if (el2) el2.textContent = this.stats.invalidCount || '0';
    }

    renderNavigation() {
        this.renderLevel1();
        this.renderEmptyState();
    }

    renderLevel1() {
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
        this.showSkeleton();
        try {
            const sites = await this.loadSites(subcategoryId);
            container.innerHTML = '';
            if (!sites.length) {
                this.renderEmptyState();
                return;
            }
            const fragment = document.createDocumentFragment();
            sites.forEach((site, idx) => {
                fragment.appendChild(this.createSiteCard(site, idx));
            });
            container.appendChild(fragment);
            this.observeLazyImages(container);
            // 更新计数显示
            const btn = document.querySelector(`.level2-btn[data-level2="${subcategoryId}"]`);
            if (btn) {
                const countSpan = btn.querySelector('.level2-btn-count');
                if (countSpan) {
                    countSpan.textContent = sites.length;
                    countSpan.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('加载站点失败:', error);
            container.innerHTML = '<div class="empty-state">加载失败，请重试</div>';
        }
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
                iconHtml = `<img data-src="${this._escapeHtml(raw)}" alt="" loading="lazy" class="lazy-icon" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fas fa-link\\'></i>';">`;
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
            fetch(`${this.apiBase}/click`, {
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
            if (site.valid === false) {
                reportBtn.disabled = true;
                reportBtn.style.opacity = '0.5';
                reportBtn.style.cursor = 'not-allowed';
                reportBtn.title = '该链接已报告，等待管理员处理';
                const icon = reportBtn.querySelector('i');
                if (icon) icon.style.color = '#999';
            } else {
                reportBtn.addEventListener('click', async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (reportBtn.disabled) return;
                    reportBtn.disabled = true;
                    reportBtn.style.opacity = '0.5';
                    reportBtn.style.cursor = 'not-allowed';
                    try {
                        const res = await fetch(`${this.apiBase}/report-dead-link`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: reportBtn.dataset.url, title: reportBtn.dataset.title })
                        });
                        if (res.ok) {
                            window.toast.show('已反馈，管理员将处理', 'success');
                            reportBtn.disabled = true;
                            reportBtn.title = '已报告，等待处理';
                            reportBtn.style.opacity = '0.5';
                            const icon = reportBtn.querySelector('i');
                            if (icon) icon.style.color = '#999';
                            card.classList.add('invalid');
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
                <input type="text" id="navSearchInput" placeholder="搜索本站链接（支持拼音/首字母）..." autocomplete="off">
                <button class="search-clear-btn" id="navSearchClearBtn" aria-label="清除搜索">
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

    async performSearch(query) {
        if (!query.trim()) return;
        this.isSearching = true;
        const container = document.getElementById('level3Content');
        if (!container) return;
        this.showSkeleton();
        try {
            // 构建请求 URL
            let searchUrl = `${this.apiBase}/search?q=${encodeURIComponent(query)}`;
            // 如果拼音库已加载，计算拼音参数
            if (window.pinyin && typeof window.pinyin.pinyin === 'function') {
                const fullPinyin = window.pinyin.pinyin(query, { toneType: 'none', type: 'array' }).join('').toLowerCase();
                const initialPinyin = window.pinyin.pinyin(query, { pattern: 'first', toneType: 'none' }).toLowerCase();
                searchUrl += `&pinyin_full=${encodeURIComponent(fullPinyin)}&pinyin_initial=${encodeURIComponent(initialPinyin)}`;
            }
            const response = await fetch(searchUrl);
            if (!response.ok) throw new Error('搜索失败');
            const results = await response.json();
            container.innerHTML = '';
            if (results.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-state';
                emptyDiv.innerHTML = `<div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">未找到相关链接</h3><p class="empty-subtitle">试试其他关键词</p>`;
                container.appendChild(emptyDiv);
            } else {
                const fragment = document.createDocumentFragment();
                results.forEach((site, idx) => {
                    fragment.appendChild(this.createSiteCard(site, idx));
                });
                container.appendChild(fragment);
                this.observeLazyImages(container);
            }
            const hint = document.getElementById('navSearchHint');
            if (hint) {
                hint.style.display = 'block';
                hint.textContent = `找到 ${results.length} 个结果（支持拼音/首字母）`;
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
            if (l1) { this.selectLevel1(l1.dataset.level1, true); return; }
            const l2 = e.target.closest('.level2-btn');
            if (l2) { this.selectLevel2(l2.dataset.level2, l2.dataset.level2Name, true); return; }
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
        if (firstSub) {
            this.selectLevel2(firstSub.id, firstSub.name, isUserClick);
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
        await this.renderLevel3(this.selectedLevel1, subcategoryId);
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    getFirstCategory() {
        return this.structure ? Object.keys(this.structure)[0] : null;
    }
    getFirstSubCategory(level1) {
        return this.structure?.[level1]?.subcategories[0] || null;
    }

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
                    if (currentSub) {
                        const subId = currentSub.dataset.level2;
                        await this.renderLevel3(this.selectedLevel1, subId);
                    }
                }
            }
        } catch (e) { console.warn('后台更新失败:', e); }
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
        if (this.imgObserver) this.imgObserver.disconnect();
    }
}

window.getOptimizedNavigation = function() { return window.optimizedNavigation; };