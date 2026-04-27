/**
 * 优化分类导航系统（完全基于后端 Worker + D1）
 * 已统一使用全局 Utils.escapeHtml
 */
export default class OptimizedNavigation {
    constructor() {
        this.navigationData = null;
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        
        this.stats = {
            totalCategories: 0,
            totalWebsites: 0,
            invalidCount: 0
        };
        
        this.isNavigationClick = false;
        this.skeletonCount = 6;
    }

    // ========== 安全 escape ==========
    _e(text) {
        if (window.Utils && typeof window.Utils.escapeHtml === 'function') {
            return window.Utils.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    async init() {
        if (this.isInitialized) return;
        this.showSkeleton();
        try {
            await this.loadNavigationData();
            this.calculateStats();
            this.renderNavigation();
            this.bindEvents();
            const firstCategory = this.getFirstCategory();
            if (firstCategory) {
                this.selectLevel1(firstCategory, false);
            }
            this.isInitialized = true;
        } catch (error) {
            console.error('优化分类导航初始化失败:', error);
            this.showError();
        }
    }

    showSkeleton() {
        const container = document.getElementById('level3Content');
        if (!container) return;
        container.innerHTML = this.generateSkeletonHTML();
    }

    generateSkeletonHTML() {
        let html = '';
        for (let i = 0; i < this.skeletonCount; i++) {
            html += `
                <div class="site-card skeleton-card">
                    <div class="card-top">
                        <div class="icon-container skeleton-icon"></div>
                        <div class="card-top-right">
                            <div class="skeleton-btn"></div>
                            <div class="views-container">
                                <div class="skeleton-views"></div>
                            </div>
                        </div>
                    </div>
                    <div class="divider-line skeleton-divider"></div>
                    <div class="card-bottom">
                        <div class="site-title skeleton-title"></div>
                        <div class="site-description skeleton-description"></div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    async loadNavigationData(retryCount = 0) {
        const apiUrl = `https://api.xldh688.eu.cc/navigation?_=${Date.now()}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.navigationData = await response.json();
        } catch (error) {
            if (retryCount < 3) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                return this.loadNavigationData(retryCount + 1);
            }
            throw error;
        }
    }

    calculateStats() {
        if (this.navigationData?.categories) {
            let totalWebsites = 0, invalidCount = 0;
            for (const cat in this.navigationData.categories) {
                for (const sub in this.navigationData.categories[cat]) {
                    const sites = this.navigationData.categories[cat][sub];
                    totalWebsites += sites.length;
                    invalidCount += sites.filter(site => site.valid === false).length;
                }
            }
            this.stats.totalCategories = Object.keys(this.navigationData.categories).length;
            this.stats.totalWebsites = totalWebsites;
            this.stats.invalidCount = invalidCount;
        } else {
            this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        }
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const siteCountEl = document.getElementById('siteCount');
        const invalidCountEl = document.getElementById('invalidCount');
        if (siteCountEl) siteCountEl.textContent = `${this.stats.totalWebsites}+`;
        if (invalidCountEl) invalidCountEl.textContent = this.stats.invalidCount;
    }

    renderNavigation() {
        this.renderLevel1();
        this.renderEmptyState();
    }

    renderLevel1() {
        const container = document.getElementById('level1Nav');
        if (!container || !this.navigationData?.categories) return;
        const categories = Object.keys(this.navigationData.categories);
        container.innerHTML = '';
        categories.forEach((categoryName, index) => {
            const button = document.createElement('button');
            button.className = `level1-btn ${index === 0 ? 'active' : ''}`;
            button.dataset.level1 = categoryName;
            button.title = this._e(this.navigationData.descriptions?.[categoryName] || '');
            button.innerHTML = `<span class="level1-btn-text">${this._e(categoryName)}</span>`;
            container.appendChild(button);
        });
    }

    renderLevel2(level1) {
        const container = document.getElementById('level2Nav');
        if (!container || !this.navigationData?.categories?.[level1]) return;
        const subCategories = Object.keys(this.navigationData.categories[level1]);
        container.innerHTML = '';
        if (subCategories.length === 0) {
            container.innerHTML = '<div style="padding:16px; color:var(--text-secondary); font-size:11px; text-align:center;">该分类下暂无子分类</div>';
            return;
        }
        subCategories.forEach((subCatName, index) => {
            const sites = this.navigationData.categories[level1][subCatName] || [];
            const button = document.createElement('button');
            button.className = `level2-btn ${index === 0 ? 'active' : ''}`;
            button.dataset.level2 = subCatName;
            button.title = this._e(subCatName);
            button.innerHTML = `
                <span class="level2-btn-text">${this._e(subCatName)}</span>
                ${sites.length > 0 ? `<span class="level2-btn-count">${sites.length}</span>` : ''}
            `;
            container.appendChild(button);
        });
    }

    renderLevel3(level1, level2) {
        const container = document.getElementById('level3Content');
        if (!container || !this.navigationData?.categories?.[level1]?.[level2]) return;
        const sites = this.navigationData.categories[level1][level2];
        if (!sites || sites.length === 0) {
            this.renderEmptyState();
            return;
        }
        const sortedSites = [...sites].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const fragment = document.createDocumentFragment();

        sortedSites.forEach((site) => {
            const card = document.createElement('a');
            card.className = 'site-card';
            card.href = site.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.title = `${this._e(site.title)}\n${this._e(site.description || '')}`;
            card.dataset.url = site.url;
            card.dataset.title = site.title;
            const isValid = site.valid !== false;
            if (!isValid) card.classList.add('invalid');

            let iconHtml = '';
            if (site.icon) {
                if (site.icon.startsWith('http') || site.icon.startsWith('./') || site.icon.includes('assets/') || site.icon.match(/\.(png|jpg|ico|svg)/)) {
                    iconHtml = `<img src="${this._e(site.icon)}" alt="${this._e(site.title)}" onerror="this.onerror=null;this.src='data:image/svg+xml;base64,...'">`;
                } else if (site.icon.startsWith('fas ') || site.icon.startsWith('fab ') || site.icon.startsWith('far ')) {
                    iconHtml = `<i class="${this._e(site.icon)}"></i>`;
                } else {
                    iconHtml = `<span>${this._e(site.icon)}</span>`;
                }
            } else {
                iconHtml = '<i class="fas fa-link"></i>';
            }

            const views = site.views || 0;
            const formattedViews = this.formatViews(views);

            card.innerHTML = `
                <div class="card-top">
                    <div class="icon-container">${iconHtml}</div>
                    <div class="card-top-right">
                        <button class="report-dead-link-btn" data-url="${this._e(site.url)}" data-title="${this._e(site.title)}" title="报告死链">
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
                    <div class="site-title">${this._e(site.title)}</div>
                    <div class="site-description">${this._e(site.description || '暂无描述')}</div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('report-dead-link-btn') || e.target.closest('.report-dead-link-btn')) return;
                this.isNavigationClick = true;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
                fetch('https://api.xldh688.eu.cc/click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: site.url, title: site.title })
                }).catch(() => {});
                const viewCountEl = card.querySelector('.view-count');
                if (viewCountEl) {
                    let currentViews = parseInt(viewCountEl.dataset.views) || 0;
                    currentViews++;
                    viewCountEl.dataset.views = currentViews;
                    viewCountEl.textContent = this.formatViews(currentViews);
                    viewCountEl.classList.add('increasing');
                    setTimeout(() => viewCountEl.classList.remove('increasing'), 300);
                }
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
            }, true);

            const reportBtn = card.querySelector('.report-dead-link-btn');
            if (reportBtn) {
                reportBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const res = await fetch('https://api.xldh688.eu.cc/report-dead-link', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: reportBtn.dataset.url, title: reportBtn.dataset.title })
                        });
                        if (res.ok) window.toast.show('已收到反馈，感谢您！', 'success');
                        else window.toast.show('反馈失败', 'error');
                    } catch { window.toast.show('网络错误', 'error'); }
                });
            }

            fragment.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
        container.querySelectorAll('.site-card').forEach((card, index) => {
            requestAnimationFrame(() => {
                card.style.animation = `fadeIn 0.2s ease ${index * 0.02}s forwards`;
            });
        });
    }

    formatViews(views) {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1).replace('.0', '')}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1).replace('.0', '')}K`;
        return views.toString();
    }

    renderEmptyState() {
        const container = document.getElementById('level3Content');
        if (!container) return;
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-compass"></i></div>
                <h3 class="empty-title">选择一个分类开始探索</h3>
                <p class="empty-subtitle">点击左侧分类查看详细内容</p>
            </div>
        `;
    }

    selectLevel1(level1, isUserClick = false) {
        if (this.selectedLevel1 === level1) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level1-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.level1 === level1));
        this.selectedLevel1 = level1;
        if (window.innerWidth <= 1023 && isUserClick) {
            const activeBtn = document.querySelector('.level1-btn.active');
            if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        this.renderLevel2(level1);
        this.showSkeleton();
        const firstLevel2 = this.getFirstSubCategory(level1);
        if (firstLevel2) this.selectLevel2(firstLevel2, isUserClick);
        else this.renderEmptyState();
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    selectLevel2(level2, isUserClick = false) {
        if (this.selectedLevel2 === level2) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level2-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.level2 === level2));
        this.selectedLevel2 = level2;
        if (window.innerWidth <= 1023 && isUserClick) {
            const activeBtn = document.querySelector('.level2-btn.active');
            if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        this.showSkeleton();
        setTimeout(() => this.renderLevel3(this.selectedLevel1, level2), 50);
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    getFirstCategory() {
        if (!this.navigationData?.categories) return null;
        return Object.keys(this.navigationData.categories)[0] || null;
    }

    getFirstSubCategory(level1) {
        if (!this.navigationData?.categories?.[level1]) return null;
        return Object.keys(this.navigationData.categories[level1])[0] || null;
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const level1Btn = e.target.closest('.level1-btn');
            if (level1Btn) {
                this.selectLevel1(level1Btn.dataset.level1, true);
            }
            const level2Btn = e.target.closest('.level2-btn');
            if (level2Btn) {
                this.selectLevel2(level2Btn.dataset.level2, true);
            }
        });
        this.setupTouchSupport();
    }

    setupTouchSupport() {
        // 省略，保留原逻辑
    }

    showError() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h3 class="empty-title">导航数据加载失败</h3>
                    <p class="empty-subtitle">请检查网络或稍后重试</p>
                </div>
            `;
        }
    }

    refresh() {
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.showSkeleton();
        this.init();
    }
}