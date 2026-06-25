/* navigation.js - 修复 APP_CONSTANTS 未定义问题 */
class OptimizedNavigation {
    constructor() {
        if (window.Starlink && window.Starlink.navigation) return window.Starlink.navigation;

        var C = window.APP_CONSTANTS;
        if (!C) {
            C = {
                NAVIGATION: {
                    SKELETON_COUNT: 6,
                    UPDATE_INTERVAL: 5 * 60 * 1000,
                    AUTO_REFRESH_INTERVAL: 5 * 60 * 1000,
                    PAGE_SIZE: 30,
                    BATCH_SIZE: 8,
                    BATCH_DELAY: 200
                }
            };
        }

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
            var urlObj = new URL(siteUrl);
            var domain = urlObj.hostname;
            if (domain) {
                var base = this.apiBase + '/icon?domain=' + encodeURIComponent(domain);
                if (window.Utils && window.Utils.isWebPSupportedSync()) {
                    return base + '&format=webp';
                }
                return base;
            }
        } catch (e) {}
        return '';
    }

    _createIconElement(iconUrl, siteUrl) {
        var fullIconUrl = this._getFullIconUrl(iconUrl, siteUrl);
        if (fullIconUrl) {
            return '<img class="lazy-icon" data-src="' + this._escapeHtml(fullIconUrl) + '" alt="" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML = \'<i class=\\"fas fa-link\\"></i>\';">';
        } else {
            return '<i class="fas fa-link"></i>';
        }
    }

    _highlightText(text, keyword) {
        if (!keyword || !text) return this._escapeHtml(text);
        var escapedText = this._escapeHtml(text);
        var escapedKeyword = this._escapeHtml(keyword);
        var regex = new RegExp('(' + escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    initLazyLoadObserver() {
        if ('IntersectionObserver' in window) {
            this.imgObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var img = entry.target;
                        var src = img.dataset.src;
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                        }
                        this.imgObserver.unobserve(img);
                    }
                }.bind(this));
            }.bind(this), {
                rootMargin: '300px 0px 300px 0px',
                threshold: 0.01
            });
        }
    }

    preloadNearbyImages(container) {
        if (!container || !this.imgObserver) return;
        var images = container.querySelectorAll('img[data-src]');
        if (images.length === 0) return;

        var preloadTask = function() {
            var viewportHeight = window.innerHeight;
            var scrollTop = window.scrollY || document.documentElement.scrollTop;
            var buffer = 500;

            images.forEach(function(img) {
                var rect = img.getBoundingClientRect();
                var imgTop = rect.top + scrollTop;
                var imgBottom = imgTop + rect.height;
                if (imgBottom + buffer > scrollTop && imgTop - buffer < scrollTop + viewportHeight) {
                    var src = img.dataset.src;
                    if (src && !img.src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        this.imgObserver.unobserve(img);
                    }
                }
            }.bind(this));
        }.bind(this);

        if (window.requestIdleCallback) {
            requestIdleCallback(preloadTask, { timeout: 2000 });
        } else {
            setTimeout(preloadTask, 200);
        }
    }

    bindScrollPreload(container) {
        if (!container) return;
        var scrollTimer = null;
        var scrollHandler = function() {
            if (scrollTimer) clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
                this.preloadNearbyImages(container);
            }.bind(this), 200);
        }.bind(this);
        window.addEventListener('scroll', scrollHandler, { passive: true });
        container.addEventListener('scroll', scrollHandler, { passive: true });
        this._scrollPreloadCleanup = function() {
            window.removeEventListener('scroll', scrollHandler);
            container.removeEventListener('scroll', scrollHandler);
        };
    }

    observeLazyImages(container) {
        if (!this.imgObserver) return;
        var imgs = container.querySelectorAll('img[data-src]');
        imgs.forEach(function(img) { this.imgObserver.observe(img); }.bind(this));
        this.preloadNearbyImages(container);
        this.bindScrollPreload(container);
    }

    async loadBatchSitesBatch(subIds, batchSize) {
        if (!subIds || !subIds.length) return {};
        var results = {};
        var allIds = subIds.slice();
        batchSize = batchSize || this.BATCH_SIZE;
        for (var i = 0; i < allIds.length; i += batchSize) {
            var batch = allIds.slice(i, i + batchSize);
            var batchResult = await this.loadBatchSites(batch);
            for (var key in batchResult) {
                if (batchResult.hasOwnProperty(key)) {
                    results[key] = batchResult[key];
                }
            }
            for (var j = 0; j < batch.length; j++) {
                this.updateSubcategoryCount(batch[j]);
            }
            if (i + batchSize < allIds.length) {
                await new Promise(function(r) { setTimeout(r, this.BATCH_DELAY); }.bind(this));
            }
        }
        return results;
    }

    async loadSites(subcategoryId, forceRefresh) {
        if (!forceRefresh && this.siteCache.has(subcategoryId)) return this.siteCache.get(subcategoryId);
        var response = await Utils.safeFetch(this.apiBase + '/navigation/sites?subcategory_id=' + subcategoryId);
        if (!response.ok) throw new Error('Failed to load sites');
        var sites = await response.json();
        this.siteCache.set(subcategoryId, sites);
        return sites;
    }

    async loadBatchSites(subIds, forceRefresh) {
        if (!subIds || !subIds.length) return {};

        if (!forceRefresh) {
            var allCached = subIds.every(function(id) { return this.siteCache.has(id); }.bind(this));
            if (allCached) {
                var result = {};
                subIds.forEach(function(id) { result[id] = this.siteCache.get(id); }.bind(this));
                return result;
            }
        }

        var uncachedIds = subIds.filter(function(id) { return !this.siteCache.has(id); }.bind(this));
        if (!uncachedIds.length) {
            var result2 = {};
            subIds.forEach(function(id) { result2[id] = this.siteCache.get(id); }.bind(this));
            return result2;
        }

        try {
            var idsParam = uncachedIds.join(',');
            var response = await Utils.safeFetch(this.apiBase + '/navigation/batch-sites?ids=' + idsParam);
            var data = await response.json();

            if (data && data.data) {
                for (var subId in data.data) {
                    if (data.data.hasOwnProperty(subId)) {
                        var id = parseInt(subId);
                        if (!isNaN(id)) {
                            this.siteCache.set(id, data.data[subId]);
                        }
                    }
                }
            }

            var result3 = {};
            subIds.forEach(function(id) {
                result3[id] = this.siteCache.get(id) || [];
            }.bind(this));
            return result3;

        } catch (error) {
            console.warn('批量加载站点失败，降级为逐个加载:', error);
            var result4 = {};
            for (var k = 0; k < subIds.length; k++) {
                var id2 = subIds[k];
                if (!this.siteCache.has(id2)) {
                    result4[id2] = await this.loadSites(id2, true);
                } else {
                    result4[id2] = this.siteCache.get(id2);
                }
            }
            return result4;
        }
    }

    updateSubcategoryCount(subcategoryId) {
        var sites = this.siteCache.get(subcategoryId);
        if (!sites) return;
        var count = sites.filter(function(s) { return s.valid !== false; }).length;
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

            var firstCategory = this.getFirstCategory();
            if (firstCategory) {
                this.selectedLevel1 = firstCategory;
                document.querySelectorAll('.level1-btn').forEach(function(el) {
                    el.classList.toggle('active', el.dataset.level1 === firstCategory);
                });
                this.renderLevel2(firstCategory);

                var firstSub = this.getFirstSubCategory(firstCategory);
                if (firstSub) {
                    var sites = await this.loadSites(firstSub.id);
                    this.currentSites = sites;
                    this.selectedLevel2 = firstSub.id;

                    document.querySelectorAll('.level2-btn').forEach(function(el) {
                        el.classList.toggle('active', parseInt(el.dataset.level2) === firstSub.id);
                    });

                    await this.renderLevel3(firstCategory, firstSub.id);
                    this.updateSubcategoryCount(firstSub.id);

                    var allSubIds = this.structure[firstCategory].subcategories.map(function(s) { return s.id; });
                    var otherSubIds = allSubIds.filter(function(id) { return id !== firstSub.id; });
                    if (otherSubIds.length) {
                        var loadRemaining = function() {
                            this.loadBatchSitesBatch(otherSubIds).catch(function(err) {
                                console.warn('后台加载其他子分类失败:', err);
                            });
                        }.bind(this);
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
            document.addEventListener('visibilitychange', function() {
                if (!document.hidden && this.selectedLevel2) this.refreshCurrentSubcategory();
            }.bind(this));
            this.startAutoRefresh();
        } catch (error) {
            console.error('导航初始化失败:', error);
            this.showError();
        }
    }

    async calculateTotalValidSites() {
        if (!this.structure) return;
        var total = 0;
        for (var catName in this.structure) {
            if (this.structure.hasOwnProperty(catName)) {
                var subcategories = this.structure[catName].subcategories;
                for (var i = 0; i < subcategories.length; i++) {
                    var sub = subcategories[i];
                    var sites = this.siteCache.get(sub.id);
                    if (!sites) {
                        sites = await this.loadSites(sub.id, false);
                    }
                    var validCount = sites.filter(function(s) { return s.valid !== false; }).length;
                    total += validCount;
                }
            }
        }
        this.stats.totalWebsites = total;
        this.updateStatsDisplay();
    }

    async recalculateGlobalInvalidCount() {
        var totalInvalid = 0;
        for (var _i = 0, _arr = Array.from(this.siteCache.entries()); _i < _arr.length; _i++) {
            var _ref = _arr[_i];
            var subId = _ref[0];
            var sites = _ref[1];
            totalInvalid += sites.filter(function(s) { return s.valid === false; }).length;
        }
        if (this.structure) {
            for (var catName2 in this.structure) {
                if (this.structure.hasOwnProperty(catName2)) {
                    var subcategories2 = this.structure[catName2].subcategories;
                    for (var j2 = 0; j2 < subcategories2.length; j2++) {
                        var sub2 = subcategories2[j2];
                        if (!this.siteCache.has(sub2.id)) {
                            var sites2 = await this.loadSites(sub2.id, true);
                            totalInvalid += sites2.filter(function(s) { return s.valid === false; }).length;
                        }
                    }
                }
            }
        }
        this.stats.invalidCount = totalInvalid;
        this.updateStatsDisplay();
    }

    startAutoRefresh() {
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = setInterval(function() {
            if (!document.hidden && !this.isSearching && this.selectedLevel2) {
                this.refreshCurrentSubcategory();
            }
        }.bind(this), this.autoRefreshInterval);
    }

    async refreshCurrentSubcategory() {
        if (!this.selectedLevel2) return;
        this.siteCache.delete(this.selectedLevel2);
        await this.renderLevel3(this.selectedLevel1, this.selectedLevel2);
        await this.recalculateGlobalInvalidCount();
        await this.calculateTotalValidSites();
    }

    async loadNavigationStructure() {
        var response = await Utils.safeFetch(this.apiBase + '/navigation/structure');
        if (!response.ok) throw new Error('Failed to load navigation structure');
        this.structure = await response.json();
        return this.structure;
    }

    async selectLevel1(level1, isUserClick) {
        if (this.selectedLevel1 === level1) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level1-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.level1 === level1); });
        this.selectedLevel1 = level1;
        this.renderLevel2(level1);
        this.showSkeleton();

        var firstSub = this.getFirstSubCategory(level1);
        if (firstSub) {
            var firstSites = await this.loadSites(firstSub.id);
            this.currentSites = firstSites;
            await this.renderLevel3(this.selectedLevel1, firstSub.id);
            this.updateSubcategoryCount(firstSub.id);
            var allSubIds2 = this.structure[level1].subcategories.map(function(s) { return s.id; });
            var otherSubIds2 = allSubIds2.filter(function(id) { return id !== firstSub.id; });
            if (otherSubIds2.length) {
                var loadRemaining2 = function() {
                    this.loadBatchSitesBatch(otherSubIds2).catch(function(err) {
                        console.warn('后台加载其他子分类失败:', err);
                    });
                }.bind(this);
                if (window.requestIdleCallback) {
                    requestIdleCallback(loadRemaining2, { timeout: 2000 });
                } else {
                    setTimeout(loadRemaining2, 300);
                }
            }
        } else {
            this.renderEmptyState();
        }
        setTimeout(function() { this.isNavigationClick = false; }.bind(this), 100);
    }

    async selectLevel2(subcategoryId, subName, isUserClick) {
        if (this.selectedLevel2 === subcategoryId) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level2-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.level2 == subcategoryId); });
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
        setTimeout(function() { this.isNavigationClick = false; }.bind(this), 100);
    }

    getFirstCategory() { return this.structure ? Object.keys(this.structure)[0] : null; }
    getFirstSubCategory(level1) { return this.structure && this.structure[level1] ? this.structure[level1].subcategories[0] : null; }

    renderLevel2(level1) {
        var container = document.getElementById('level2Nav');
        if (!container || !this.structure || !this.structure[level1]) return;
        var subCats = this.structure[level1].subcategories;
        if (!subCats.length) {
            container.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:11px;text-align:center;">暂无子分类</div>';
            this.renderEmptyState();
            return;
        }
        container.innerHTML = subCats.map(function(sub, idx) {
            return '<button class="level2-btn ' + (idx === 0 ? 'active' : '') + '" data-level2="' + sub.id + '" data-level2-name="' + this._escapeHtml(sub.name) + '" title="' + this._escapeHtml(sub.name) + '">' +
                '<span class="level2-btn-text">' + this._escapeHtml(sub.name) + '</span>' +
                '<span class="level2-btn-count" style="display:none;">0</span>' +
                '</button>';
        }.bind(this)).join('');
    }

    async renderLevel3(level1, subcategoryId) {
        var container = document.getElementById('level3Content');
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
        var validCount = this.currentSites.filter(function(s) { return s.valid !== false; }).length;
        this.updateSubcategoryCountDisplay(subcategoryId, validCount);
        await this.calculateTotalValidSites();
    }

    renderSitesPage(resetTrigger) {
        var container = document.getElementById('level3Content');
        if (!container) return;
        if (resetTrigger) container.innerHTML = '';
        var start = (this.currentPage - 1) * this.pageSize;
        var end = start + this.pageSize;
        var pageSites = this.currentSites.slice(start, end);

        var hasMoreData = end < this.currentSites.length;
        this.hasMore = hasMoreData;

        if (this.currentPage === 1) {
            container.innerHTML = '';
            var fragment = document.createDocumentFragment();
            pageSites.forEach(function(site, idx) { fragment.appendChild(this.createSiteCard(site, idx, false, '')); }.bind(this));
            container.appendChild(fragment);
            if (hasMoreData) {
                var loadingDiv = this.createLoadingTrigger(true);
                container.appendChild(loadingDiv);
            }
        } else {
            var oldTrigger = container.querySelector('#scroll-loading-trigger');
            if (oldTrigger) oldTrigger.remove();
            var fragment2 = document.createDocumentFragment();
            pageSites.forEach(function(site, idx) { fragment2.appendChild(this.createSiteCard(site, idx, false, '')); }.bind(this));
            container.appendChild(fragment2);
            if (hasMoreData) {
                var newTrigger = this.createLoadingTrigger(true);
                container.appendChild(newTrigger);
            }
        }
        this.preloadNearbyImages(container);
    }

    createLoadingTrigger(hasMore) {
        var div = document.createElement('div');
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
        var ticking = false;
        this.scrollListener = function() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function() {
                this.checkScrollAndLoadMore();
                ticking = false;
            }.bind(this));
        }.bind(this);
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
        var trigger = document.getElementById('scroll-loading-trigger');
        if (!trigger) return;
        var rect = trigger.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 100) {
            this.loadMore();
        }
    }

    async loadMore() {
        if (this.isLoadingMore || !this.hasMore) return;
        this.isLoadingMore = true;
        var trigger = document.getElementById('scroll-loading-trigger');
        if (trigger) {
            trigger.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;"></div><span>加载中...</span>';
            trigger.style.padding = '16px';
        }
        await new Promise(function(r) { setTimeout(r, 200); });
        this.currentPage++;
        var start = (this.currentPage - 1) * this.pageSize;
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

    createSiteCard(site, index, isSearchResult, keyword) {
        var card = document.createElement('a');
        card.className = 'site-card ' + (site.valid === false ? 'invalid' : '');
        card.href = site.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.title = site.title + '\n' + (site.description || '');

        var iconHtml = this._createIconElement(site.icon, site.url);
        var views = site.views || 0;
        var formattedViews = this._formatViews(views);

        var titleHtml = this._escapeHtml(site.title);
        var descHtml = this._escapeHtml(site.description || '暂无描述');
        if (isSearchResult && keyword) {
            titleHtml = this._highlightText(site.title, keyword);
            descHtml = this._highlightText(site.description || '暂无描述', keyword);
        }

        card.innerHTML = '\n            <div class="card-top">\n                <div class="icon-container">' + iconHtml + '</div>\n                <div class="card-top-right">\n                    <button class="report-dead-link-btn" data-url="' + this._escapeHtml(site.url) + '" data-title="' + this._escapeHtml(site.title) + '" title="报告死链">\n                        <i class="fas fa-exclamation-triangle"></i>\n                    </button>\n                    <div class="views-container">\n                        <i class="fas fa-eye views-icon"></i>\n                        <span class="view-count" data-views="' + views + '">' + formattedViews + '</span>\n                    </div>\n                </div>\n            </div>\n            <div class="divider-line"></div>\n            <div class="card-bottom">\n                <div class="site-title">' + titleHtml + '</div>\n                <div class="site-description">' + descHtml + '</div>\n            </div>\n        ';

        card.addEventListener('click', async function(e) {
            if (e.target.classList.contains('report-dead-link-btn') || e.target.closest('.report-dead-link-btn')) return;
            this.isNavigationClick = true;
            if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;

            var viewEl = card.querySelector('.view-count');
            if (!viewEl) {
                try {
                    await Utils.safeFetch(this.apiBase + '/click', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: site.id, url: site.url }),
                        keepalive: true
                    });
                } catch (err) {}
                setTimeout(function() {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }.bind(this), 100);
                return;
            }

            var oldViews = parseInt(viewEl.dataset.views) || 0;
            var newViews = oldViews + 1;
            viewEl.dataset.views = newViews;
            viewEl.textContent = this._formatViews(newViews);
            viewEl.classList.add('increasing');
            setTimeout(function() { viewEl.classList.remove('increasing'); }, 300);

            var siteIndex = this.currentSites.findIndex(function(s) { return s.id === site.id; });
            if (siteIndex !== -1) {
                this.currentSites[siteIndex].views = (this.currentSites[siteIndex].views || 0) + 1;
            }

            try {
                await Utils.safeFetch(this.apiBase + '/click', {
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

            setTimeout(function() {
                this.isNavigationClick = false;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
            }.bind(this), 100);
        }.bind(this));

        var reportBtn = card.querySelector('.report-dead-link-btn');
        if (reportBtn) {
            if (site.valid === false) {
                reportBtn.disabled = true;
                reportBtn.style.display = 'none';
            } else {
                reportBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (reportBtn.disabled) return;
                    reportBtn.disabled = true;
                    reportBtn.style.opacity = '0.5';
                    reportBtn.style.cursor = 'not-allowed';
                    try {
                        var res = await Utils.safeFetch(this.apiBase + '/report-dead-link', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: reportBtn.dataset.url, title: reportBtn.dataset.title })
                        });
                        if (res.ok) {
                            window.toast.show('已反馈，管理员将处理', 'success');
                            reportBtn.style.display = 'none';
                            card.classList.add('invalid');
                            var currentSubId = this.selectedLevel2;
                            if (currentSubId) {
                                var cachedSites = this.siteCache.get(currentSubId);
                                if (cachedSites) {
                                    var updatedSites = cachedSites.map(function(s) {
                                        if (s.url === reportBtn.dataset.url) {
                                            return { valid: false };
                                        }
                                        return s;
                                    });
                                    this.siteCache.set(currentSubId, updatedSites);
                                    await this.renderLevel3(this.selectedLevel1, currentSubId);
                                } else {
                                    await this.renderLevel3(this.selectedLevel1, currentSubId);
                                }
                                var freshSites = await this.loadSites(currentSubId, true);
                                var validCount2 = freshSites.filter(function(s) { return s.valid !== false; }).length;
                                this.updateSubcategoryCountDisplay(currentSubId, validCount2);
                                await this.recalculateGlobalInvalidCount();
                                await this.calculateTotalValidSites();
                            }
                        } else {
                            var err = await res.json().catch(function() { return {}; });
                            window.toast.show(err.error || '反馈失败', 'error');
                            reportBtn.disabled = false;
                            reportBtn.style.opacity = '';
                            reportBtn.style.cursor = '';
                        }
                    } catch (error) {
                        window.toast.show('网络错误', 'error');
                        reportBtn.disabled = false;
                        reportBtn.style.opacity = '';
                        reportBtn.style.cursor = '';
                    }
                }.bind(this));
            }
        }
        return card;
    }

    createSearchBox() {
        var navHeader = document.querySelector('.navigation-header');
        if (!navHeader || navHeader.querySelector('.nav-search-box')) return;
        var container = document.createElement('div');
        container.className = 'nav-search-box';
        container.innerHTML = '\n            <div class="search-input-wrapper">\n                <i class="fas fa-search search-icon-prefix"></i>\n                <input type="text" id="navSearchInput" placeholder="搜索本站链接..." autocomplete="off">\n                <button class="search-clear-btn" id="navSearchClearBtn" aria-label="清除搜索"><i class="fas fa-times"></i></button>\n            </div>\n            <span class="search-result-hint" id="navSearchHint" style="display:none;"></span>\n        ';
        navHeader.appendChild(container);
        this.searchInput = container.querySelector('#navSearchInput');
        var clearBtn = container.querySelector('#navSearchClearBtn');
        this.searchInput.addEventListener('input', function() {
            var query = this.searchInput.value.trim();
            clearBtn.style.display = query ? 'flex' : 'none';
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(function() { return query ? this.performSearch(query) : this.clearSearch(); }.bind(this), 300);
        }.bind(this));
        clearBtn.addEventListener('click', function() {
            this.searchInput.value = '';
            clearBtn.style.display = 'none';
            this.clearSearch();
            this.searchInput.focus();
        }.bind(this));
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.searchInput && this.searchInput.focus();
            }
        }.bind(this));
    }

    async performSearch(query) {
        if (!query.trim()) return;
        this.isSearching = true;
        var container = document.getElementById('level3Content');
        if (!container) return;
        this.showSkeleton();
        try {
            var searchUrl = this.apiBase + '/search?q=' + encodeURIComponent(query);
            var response = await Utils.safeFetch(searchUrl);
            var results = await response.json();
            container.innerHTML = '';
            if (results.length === 0) {
                var emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-state';
                emptyDiv.innerHTML = '<div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">未找到相关链接</h3><p class="empty-subtitle">试试其他关键词</p>';
                container.appendChild(emptyDiv);
            } else {
                var fragment = document.createDocumentFragment();
                results.forEach(function(site, idx) { fragment.appendChild(this.createSiteCard(site, idx, true, query)); }.bind(this));
                container.appendChild(fragment);
                this.observeLazyImages(container);
            }
            var hint = document.getElementById('navSearchHint');
            if (hint) {
                hint.style.display = 'block';
                hint.textContent = '找到 ' + results.length + ' 个结果，关键词已高亮';
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
        var hint = document.getElementById('navSearchHint');
        if (hint) hint.style.display = 'none';
        if (this.selectedLevel1 && this.structure && this.structure[this.selectedLevel1]) {
            this.selectLevel1(this.selectedLevel1, false);
        } else {
            var firstCat = this.getFirstCategory();
            if (firstCat) {
                this.selectedLevel1 = firstCat;
                this.selectLevel1(firstCat, false);
            } else {
                this.loadNavigationStructure().then(function() {
                    var newFirst = this.getFirstCategory();
                    if (newFirst) this.selectLevel1(newFirst, false);
                }.bind(this));
            }
        }
    }

    bindEvents() {
        document.addEventListener('click', function(e) {
            if (this.isSearching) return;
            var l1 = e.target.closest('.level1-btn');
            if (l1) {
                this.selectLevel1(l1.dataset.level1, true);
                return;
            }
            var l2 = e.target.closest('.level2-btn');
            if (l2) {
                this.selectLevel2(parseInt(l2.dataset.level2), l2.dataset.level2Name, true);
                return;
            }
        }.bind(this));
    }

    updateSubcategoryCountDisplay(subcategoryId, count, retry) {
        var btn = document.querySelector('.level2-btn[data-level2="' + subcategoryId + '"]');
        if (btn) {
            var countSpan = btn.querySelector('.level2-btn-count');
            if (!countSpan) {
                countSpan = document.createElement('span');
                countSpan.className = 'level2-btn-count';
                btn.appendChild(countSpan);
            }
            countSpan.textContent = count;
            countSpan.style.display = 'inline-block';
        } else if (retry < 5) {
            setTimeout(function() { this.updateSubcategoryCountDisplay(subcategoryId, count, (retry || 0) + 1); }.bind(this), 100);
        }
    }

    calculateStats() {
        var catCount = this.structure ? Object.keys(this.structure).length : 0;
        this.stats.totalCategories = catCount;
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        var el1 = document.getElementById('siteCount');
        var el2 = document.getElementById('invalidCount');
        if (el1) el1.textContent = (this.stats.totalWebsites || 0) + '+';
        if (el2) el2.textContent = this.stats.invalidCount || '0';
    }

    updateInvalidCount(increment) {
        if (!this.stats.invalidCount) this.stats.invalidCount = 0;
        this.stats.invalidCount += increment;
        var invalidEl = document.getElementById('invalidCount');
        if (invalidEl) invalidEl.textContent = this.stats.invalidCount;
    }

    renderNavigation() { this.renderLevel1(); }

    renderLevel1() {
        var container = document.getElementById('level1Nav');
        if (!container || !this.structure) return;
        var categories = Object.keys(this.structure);
        container.innerHTML = categories.map(function(cat, idx) {
            return '<button class="level1-btn ' + (idx === 0 ? 'active' : '') + '" data-level1="' + cat + '" title="' + (this.structure[cat].description || '') + '"><span class="level1-btn-text">' + this._escapeHtml(cat) + '</span></button>';
        }.bind(this)).join('');
    }

    showSkeleton() {
        var container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = this.generateSkeletonHTML();
        }
    }

    generateSkeletonHTML() {
        var html = '';
        for (var i = 0; i < this.skeletonCount; i++) {
            html += '\n                <div class="site-card skeleton-card">\n                    <div class="card-top">\n                        <div class="icon-container skeleton-icon"></div>\n                        <div class="card-top-right">\n                            <div class="skeleton-btn skeleton" style="width:14px;height:14px;border-radius:3px;"></div>\n                            <div class="views-container">\n                                <div class="skeleton-views skeleton" style="width:30px;height:14px;"></div>\n                            </div>\n                        </div>\n                    </div>\n                    <div class="divider-line skeleton-divider"></div>\n                    <div class="card-bottom">\n                        <div class="skeleton-title skeleton"></div>\n                        <div class="skeleton-description skeleton"></div>\n                    </div>\n                </div>\n            ';
        }
        return html;
    }

    renderEmptyState() {
        var container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = '';
        }
    }

    showError() {
        var container = document.getElementById('level3Content');
        if (container) container.innerHTML = '';
    }

    startBackgroundUpdates() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.updateTimer = setInterval(function() { this.refreshStructure(); }.bind(this), this.UPDATE_INTERVAL);
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) this.refreshStructure();
        }.bind(this));
    }

    async refreshStructure() {
        try {
            var newStructure = await fetch(this.apiBase + '/navigation/structure').then(function(r) { return r.json(); });
            if (JSON.stringify(newStructure) !== JSON.stringify(this.structure)) {
                this.structure = newStructure;
                this.renderNavigation();
                if (this.selectedLevel1 && this.structure[this.selectedLevel1]) {
                    this.renderLevel2(this.selectedLevel1);
                    var currentSub = document.querySelector('.level2-btn.active');
                    if (currentSub) await this.renderLevel3(this.selectedLevel1, parseInt(currentSub.dataset.level2));
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