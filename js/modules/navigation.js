/**
 * 优化分类导航系统 - 性能优化版（图片懒加载）
 */
class OptimizedNavigation {
    constructor() {
        this.navigationData = null;
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        this.isNavigationClick = false;
        this.skeletonCount = 6;
        this.cacheKey = 'nav_data_cache';
        this.updateTimer = null;
        this.UPDATE_INTERVAL = 5 * 60 * 1000;
        this.quietUpdate = true;
        this.pendingNavRequest = null;
        this.allSitesFlat = [];
        this.searchInput = null;
        this.isSearching = false;
        this.searchTimer = null;
        this.apiBase = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://api.xjdh688.ccwu.cc';
        this.imgObserver = null;
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

    async init() {
        if (this.isInitialized) return;
        this.initLazyLoadObserver();
        this.showSkeleton();
        this.bindEvents();
        this.createSearchBox();
        try {
            await this.loadNavigationData();
            this.buildFlatSiteList();
            this.calculateStats();
            this.renderNavigation();
            const firstCategory = this.getFirstCategory();
            if (firstCategory) this.selectLevel1(firstCategory, false);
            this.isInitialized = true;
            this.startBackgroundUpdates();
        } catch (error) {
            console.error('导航初始化失败:', error);
            const cached = this.loadCache();
            if (cached) {
                this.navigationData = cached;
                this.buildFlatSiteList();
                this.calculateStats();
                this.renderNavigation();
                const firstCategory = this.getFirstCategory();
                if (firstCategory) this.selectLevel1(firstCategory, false);
                window.toast.show('网络异常，已加载本地缓存数据', 'warning');
                this.isInitialized = true;
                this.startBackgroundUpdates();
            } else {
                this.showError();
            }
        }
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
                // 使用 data-src 进行懒加载
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

        // 卡片点击统计
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
                reportBtn.style.display = 'none';
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
                            reportBtn.style.display = 'none';
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

    renderLevel3(level1, level2) {
        const container = document.getElementById('level3Content');
        if (!container || !this.navigationData?.categories?.[level1]?.[level2]) return;
        const sites = this.navigationData.categories[level1][level2];
        container.innerHTML = '';
        if (!sites.length) { this.renderEmptyState(); return; }
        const fragment = document.createDocumentFragment();
        sites.forEach((site, idx) => {
            fragment.appendChild(this.createSiteCard(site, idx));
        });
        container.appendChild(fragment);
        // 观察懒加载图片
        this.observeLazyImages(container);
    }

    // 其余方法（bindEvents, search, etc.）与之前相同，省略以节省篇幅，但保持功能完整
    // 注意：其他方法中如果动态添加内容，也需要调用 observeLazyImages
}

window.getOptimizedNavigation = function() { return window.optimizedNavigation; };