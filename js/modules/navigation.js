/**
 * 优化分类导航系统 - 分页加载版（高清图标、死链报告实时刷新、父级计数更新、搜索关键词高亮）
 */
class OptimizedNavigation {
    constructor() {
        this.structure = null;
        this.siteCache = new Map();
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        this.isNavigationClick = false;
        this.skeletonCount = 6;
        this.updateTimer = null;
        this.UPDATE_INTERVAL = 5 * 60 * 1000;
        this.apiBase = Utils.getApiBase();
        this.imgObserver = null;
        this.isSearching = false;
        this.searchInput = null;
        this.searchTimer = null;
        this.loadedLevel1Set = new Set();

        // 分页相关
        this.currentPage = 1;
        this.pageSize = 30;
        this.isLoadingMore = false;
        this.hasMore = true;
        this.currentSites = [];
        this.scrollListener = null;
    }

    _escapeHtml(str) {
        return Utils.escapeHtml(str);
    }

    _formatViews(views) {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1).replace('.0', '')}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1).replace('.0', '')}K`;
        return String(views);
    }

    // 高清图标辅助方法
    _getHighResFavicon(url) {
        if (!url) return '';
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch (e) {
            return '';
        }
    }

    // 关键词高亮辅助方法
    _highlightText(text, keyword) {
        if (!keyword || !text) return this._escapeHtml(text);
        const escapedText = this._escapeHtml(text);
        const escapedKeyword = this._escapeHtml(keyword);
        // 不区分大小写匹配
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
            if (firstCategory) {
                await this.loadSubcategoryCountsForLevel1(firstCategory);
                this.selectLevel1(firstCategory, false);
            }
            this.isInitialized = true;
            this.startBackgroundUpdates();
        } catch (error) {
            console.error('导航初始化失败:', error);
            this.showError();
        }
    }

    async loadNavigationStructure() {
        const response = await Utils.safeFetch(`${this.apiBase}/navigation/structure`);
        if (!response.ok) throw new Error('Failed to load navigation structure');
        this.structure = await response.json();
    }

    async loadSites(subcategoryId, forceRefresh = false) {
        if (!forceRefresh && this.siteCache.has(subcategoryId)) {
            return this.siteCache.get(subcategoryId);
        }
        const response = await Utils.safeFetch(`${this.apiBase}/navigation/sites?subcategory_id=${subcategoryId}`);
        if (!response.ok) throw new Error('Failed to load sites');
        let sites = await response.json();
        sites = sites.map(s => {
            let finalIcon = s.icon;
            if (!finalIcon || finalIcon === '/' || finalIcon === 'https://xjdh688.ccwu.cc' || finalIcon === 'https://xjdh688.ccwu.cc/') {
                finalIcon = this._getHighResFavicon(s.url);
            } else if (finalIcon && (finalIcon.includes('api.71xk.com') || finalIcon.includes('favicon') || (finalIcon.startsWith('http') && !finalIcon.includes('favicon.yandex.net') && !finalIcon.includes('google.com/s2/favicons')))) {
                finalIcon = this._getHighResFavicon(s.url);
            }
            return { ...s, icon: finalIcon };
        });
        this.siteCache.set(subcategoryId, sites);
        return sites;
    }

    async loadSubcategoryCountsForLevel1(level1) {
        if (!this.structure?.[level1]) return;
        // 强制重新加载所有子分类的计数（即使已经加载过）
        const subcategories = this.structure[level1].subcategories;
        let totalValidSites = 0;
        const concurrency = 5;
        const chunks = [];
        for (let i = 0; i < subcategories.length; i += concurrency) {
            chunks.push(subcategories.slice(i, i + concurrency));
        }
        for (const chunk of chunks) {
            const promises = chunk.map(async (sub) => {
                const subId = sub.id;
                const sites = await this.loadSites(subId, true); // 强制刷新
                const validCount = sites.filter(s => s.valid !== false).length;
                this.updateSubcategoryCountDisplay(subId, validCount);
                return validCount;
            });
            const counts = await Promise.all(promises);
            totalValidSites += counts.reduce((sum, c) => sum + c, 0);
        }
        // 更新总网站数
        this.stats.totalWebsites = totalValidSites;
        this.updateStatsDisplay();
        this.loadedLevel1Set.add(level1);
    }

    async recalculateTotalWebsites() {
        let total = 0;
        for (const sites of this.siteCache.values()) {
            total += sites.filter(s => s.valid !== false).length;
        }
        this.stats.totalWebsites = total;
        this.updateStatsDisplay();
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
        for (const sub of subCats) {
            const cached = this.siteCache.get(sub.id);
            if (cached) {
                const validCount = cached.filter(s => s.valid !== false).length;
                this.updateSubcategoryCountDisplay(sub.id, validCount);
            }
        }
    }

    async renderLevel3(level1, subcategoryId) {
        const container = document.getElementById('level3Content');
        if (!container) return;
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoadingMore = false;
        this.currentSites = await this.loadSites(subcategoryId);
        if (!this.currentSites.length) {
            this.renderEmptyState();
            return;
        }
        this.renderSitesPage();
        this.observeLazyImages(container);
        this.bindScrollLoadMore();
        this.updateSubcategoryCountDisplay(subcategoryId, this.currentSites.filter(s => s.valid !== false).length);
    }

    renderSitesPage() {
        const container = document.getElementById('level3Content');
        if (!container) return;
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageSites = this.currentSites.slice(start, end);
        if (this.currentPage === 1) {
            container.innerHTML = '';
            const fragment = document.createDocumentFragment();
            pageSites.forEach((site, idx) => {
                fragment.appendChild(this.createSiteCard(site, idx, false, ''));
            });
            container.appendChild(fragment);
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'scroll-loading-trigger';
            loadingDiv.style.textAlign = 'center';
            loadingDiv.style.padding = '10px';
            loadingDiv.style.display = this.hasMore ? 'block' : 'none';
            loadingDiv.innerHTML = '<div class="loading-spinner" style="width:24px;height:24px;"></div><span>加载更多...</span>';
            container.appendChild(loadingDiv);
        } else {
            const loadingDiv = container.querySelector('#scroll-loading-trigger');
            if (loadingDiv) loadingDiv.remove();
            const fragment = document.createDocumentFragment();
            pageSites.forEach((site, idx) => {
                fragment.appendChild(this.createSiteCard(site, idx, false, ''));
            });
            container.appendChild(fragment);
            const newLoadingDiv = document.createElement('div');
            newLoadingDiv.id = 'scroll-loading-trigger';
            newLoadingDiv.style.textAlign = 'center';
            newLoadingDiv.style.padding = '10px';
            newLoadingDiv.style.display = this.hasMore ? 'block' : 'none';
            newLoadingDiv.innerHTML = '<div class="loading-spinner" style="width:24px;height:24px;"></div><span>加载更多...</span>';
            container.appendChild(newLoadingDiv);
        }
        if (end >= this.currentSites.length) {
            this.hasMore = false;
            const loadingDiv = container.querySelector('#scroll-loading-trigger');
            if (loadingDiv) {
                loadingDiv.innerHTML = '～到·底·了～';
                loadingDiv.style.display = 'flex';
                loadingDiv.style.alignItems = 'center';
                loadingDiv.style.justifyContent = 'center';
                loadingDiv.style.padding = '20px 0';
                loadingDiv.style.minHeight = '60px';
                loadingDiv.style.color = 'var(--text-secondary)';
            }
        }
    }

    bindScrollLoadMore() {
        const container = document.getElementById('level3Content');
        if (!container) return;
        // 先移除已有的监听器，确保只保留一个
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            container.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        const scrollHandler = () => {
            if (this.isLoadingMore || !this.hasMore) return;
            const loadingDiv = container.querySelector('#scroll-loading-trigger');
            if (!loadingDiv) return;
            const rect = loadingDiv.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            if (rect.top <= windowHeight + 100) {
                this.loadMore();
            }
        };
        this.scrollListener = scrollHandler;
        window.addEventListener('scroll', this.scrollListener);
        container.addEventListener('scroll', this.scrollListener);
    }

    async loadMore() {
        if (this.isLoadingMore || !this.hasMore) return;
        this.isLoadingMore = true;
        const loadingDiv = document.getElementById('scroll-loading-trigger');
        if (loadingDiv) {
            loadingDiv.innerHTML = '<div class="loading-spinner" style="width:24px;height:24px;"></div><span>加载中...</span>';
            loadingDiv.style.display = 'block';
            loadingDiv.style.alignItems = '';
            loadingDiv.style.justifyContent = '';
            loadingDiv.style.padding = '10px';
            loadingDiv.style.minHeight = '';
        }
        await new Promise(r => setTimeout(r, 200));
        this.currentPage++;
        const start = (this.currentPage - 1) * this.pageSize;
        if (start >= this.currentSites.length) {
            this.hasMore = false;
            if (loadingDiv) {
                loadingDiv.innerHTML = '～到·底·了～';
                loadingDiv.style.display = 'flex';
                loadingDiv.style.alignItems = 'center';
                loadingDiv.style.justifyContent = 'center';
                loadingDiv.style.padding = '20px 0';
                loadingDiv.style.minHeight = '60px';
                loadingDiv.style.color = 'var(--text-secondary)';
            }
            this.isLoadingMore = false;
            return;
        }
        this.renderSitesPage();
        this.isLoadingMore = false;
        const container = document.getElementById('level3Content');
        if (container) this.observeLazyImages(container);
    }

    createSiteCard(site, index, isSearchResult = false, keyword = '') {
        const card = document.createElement('a');
        card.className = `site-card ${site.valid === false ? 'invalid' : ''}`;
        card.href = site.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.title = `${site.title}\n${site.description || ''}`;

        let iconHtml = '<i class="fas fa-link"></i>';
        const origin = window.location.origin;
        const hostname = window.location.hostname;
        
        let finalIcon = site.icon;
        if (!finalIcon || finalIcon === '/' || finalIcon === origin || finalIcon.includes(hostname)) {
            finalIcon = this._getHighResFavicon(site.url);
        } else if (finalIcon && (finalIcon.includes('api.71xk.com') || finalIcon.includes('favicon') || (finalIcon.startsWith('http') && !finalIcon.includes('favicon.yandex.net') && !finalIcon.includes('google.com/s2/favicons')))) {
            finalIcon = this._getHighResFavicon(site.url);
        }
        
        if (finalIcon && finalIcon.trim() && finalIcon !== origin && !finalIcon.includes(hostname) && finalIcon !== '/' && finalIcon !== '') {
            const raw = finalIcon.trim();
            if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('./') || /\.(png|jpg|jpeg|ico|svg)/i.test(raw)) {
                iconHtml = `<img data-src="${this._escapeHtml(raw)}" alt="" loading="lazy" class="lazy-icon" 
                            onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fas fa-link\\'></i>';">`;
            } else if (raw.startsWith('fas ') || raw.startsWith('fab ')) {
                iconHtml = `<i class="${raw}"></i>`;
            } else {
                iconHtml = `<span>${this._escapeHtml(raw)}</span>`;
            }
        }

        const views = site.views || 0;
        const formattedViews = this._formatViews(views);
        
        // 高亮处理标题和描述
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
                <div class="site-title">${titleHtml}</div>
                <div class="site-description">${descHtml}</div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('report-dead-link-btn') || e.target.closest('.report-dead-link-btn')) return;
            this.isNavigationClick = true;
            if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
            Utils.safeFetch(`${this.apiBase}/click`, {
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
                reportBtn.style.display = 'none';
                if (!card.querySelector('.reported-msg')) {
                    const msgSpan = document.createElement('span');
                    msgSpan.className = 'reported-msg';
                    msgSpan.textContent = '已报告，等待处理';
                    msgSpan.style.fontSize = '11px';
                    msgSpan.style.color = '#999';
                    const container = card.querySelector('.card-top-right');
                    if (container) container.appendChild(msgSpan);
                }
            } else {
                reportBtn.addEventListener('click', async (e) => {
                    e.preventDefault(); e.stopPropagation();
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
                            const currentSubId = this.selectedLevel2;
                            if (currentSubId) {
                                // 刷新当前子分类缓存和视图
                                this.siteCache.delete(currentSubId);
                                const freshSites = await this.loadSites(currentSubId, true);
                                this.currentSites = freshSites;
                                this.currentPage = 1;
                                this.hasMore = true;
                                this.renderSitesPage();
                                const validCount = freshSites.filter(s => s.valid !== false).length;
                                this.updateSubcategoryCountDisplay(currentSubId, validCount);
                                // 更新父级分类的总计数
                                if (this.selectedLevel1) {
                                    await this.loadSubcategoryCountsForLevel1(this.selectedLevel1);
                                }
                            } else {
                                card.classList.add('invalid');
                                reportBtn.style.display = 'none';
                                const msgSpan = document.createElement('span');
                                msgSpan.className = 'reported-msg';
                                msgSpan.textContent = '已报告，等待处理';
                                msgSpan.style.fontSize = '11px';
                                msgSpan.style.color = '#999';
                                const container = card.querySelector('.card-top-right');
                                if (container && !container.querySelector('.reported-msg')) container.appendChild(msgSpan);
                            }
                            this.updateInvalidCount(1);
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
                results.forEach((site, idx) => {
                    fragment.appendChild(this.createSiteCard(site, idx, true, query));
                });
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
            if (l1) { this.selectLevel1(l1.dataset.level1, true); return; }
            const l2 = e.target.closest('.level2-btn');
            if (l2) { this.selectLevel2(l2.dataset.level2, l2.dataset.level2Name, true); return; }
        });
    }

    async selectLevel1(level1, isUserClick = false) {
        if (this.selectedLevel1 === level1) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level1-btn').forEach(b => b.classList.toggle('active', b.dataset.level1 === level1));
        this.selectedLevel1 = level1;
        this.renderLevel2(level1);
        this.showSkeleton();

        // 强制重新加载该一级分类下所有子分类的计数
        await this.loadSubcategoryCountsForLevel1(level1);

        const firstSub = this.getFirstSubCategory(level1);
        if (firstSub) {
            await this.selectLevel2(firstSub.id, firstSub.name, isUserClick);
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
        this.loadedLevel1Set.clear();
        this.showSkeleton();
        this.init();
    }

    destroy() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        if (this.imgObserver) this.imgObserver.disconnect();
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            const container = document.getElementById('level3Content');
            if (container) container.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
    }
}

window.getOptimizedNavigation = function() { return window.optimizedNavigation; };