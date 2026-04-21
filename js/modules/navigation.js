/**
 * 优化分类导航系统（完全基于后端 Worker + D1）
 */
class OptimizedNavigation {
    constructor() {
        this.navigationData = null;
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        
        this.stats = { totalCategories: 0, totalWebsites: 0, invalidCount: 0 };
        this.isNavigationClick = false;
        this.apiBase = window.APP_CONFIG?.API_BASE || 'https://api.xldh688.eu.cc';
        this.skeletonCount = 6;
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
            if (firstCategory) this.selectLevel1(firstCategory, false);
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
                            <div class="views-container"><div class="skeleton-views"></div></div>
                        </div>
                    </div>
                    <div class="divider-line skeleton-divider"></div>
                    <div class="card-bottom">
                        <div class="site-title skeleton-title"></div>
                        <div class="site-description skeleton-description"></div>
                    </div>
                </div>`;
        }
        return html;
    }

    async loadNavigationData(retryCount = 0) {
        const apiUrl = `${this.apiBase}/navigation?_=${Date.now()}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.navigationData = await response.json();
        } catch (error) {
            if (retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.loadNavigationData(retryCount + 1);
            }
            throw new Error('无法加载导航数据');
        }
    }

    calculateStats() {
        if (this.navigationData?.categories) {
            let totalWebsites = 0, invalidCount = 0;
            for (const cat in this.navigationData.categories) {
                for (const sub in this.navigationData.categories[cat]) {
                    const sites = this.navigationData.categories[cat][sub];
                    totalWebsites += sites.length;
                    invalidCount += sites.filter(s => s.valid === false).length;
                }
            }
            this.stats.totalCategories = Object.keys(this.navigationData.categories).length;
            this.stats.totalWebsites = totalWebsites;
            this.stats.invalidCount = invalidCount;
        } else {
            this.stats.totalCategories = this.stats.totalWebsites = this.stats.invalidCount = 0;
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
    }

    renderLevel1() {
        const container = document.getElementById('level1Nav');
        if (!container || !this.navigationData?.categories) return;
        const categories = Object.keys(this.navigationData.categories);
        container.innerHTML = '';
        categories.forEach((catName, idx) => {
            const btn = document.createElement('button');
            btn.className = `level1-btn ${idx === 0 ? 'active' : ''}`;
            btn.dataset.level1 = catName;
            btn.title = this.navigationData.descriptions?.[catName] || '';
            btn.innerHTML = `<span class="level1-btn-text">${catName}</span>`;
            container.appendChild(btn);
        });
    }

    renderLevel2(level1) {
        const container = document.getElementById('level2Nav');
        if (!container || !this.navigationData?.categories?.[level1]) return;
        const subCategories = Object.keys(this.navigationData.categories[level1]);
        container.innerHTML = '';
        if (subCategories.length === 0) {
            container.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:11px;text-align:center;">该分类下暂无子分类</div>';
            return;
        }
        subCategories.forEach((subName, idx) => {
            const sites = this.navigationData.categories[level1][subName] || [];
            const btn = document.createElement('button');
            btn.className = `level2-btn ${idx === 0 ? 'active' : ''}`;
            btn.dataset.level2 = subName;
            btn.title = subName;
            btn.innerHTML = `<span class="level2-btn-text">${subName}</span>${sites.length ? `<span class="level2-btn-count">${sites.length}</span>` : ''}`;
            container.appendChild(btn);
        });
    }

    renderLevel3(level1, level2) {
        const container = document.getElementById('level3Content');
        if (!container || !this.navigationData?.categories?.[level1]?.[level2]) return;
        const sites = this.navigationData.categories[level1][level2];
        if (!sites?.length) { this.renderEmptyState(); return; }
        const sortedSites = [...sites].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const fragment = document.createDocumentFragment();
        sortedSites.forEach(site => {
            const card = this.createSiteCard(site);
            fragment.appendChild(card);
        });
        container.innerHTML = '';
        container.appendChild(fragment);
        const cards = container.querySelectorAll('.site-card');
        cards.forEach((card, idx) => {
            requestAnimationFrame(() => card.style.animation = `fadeIn 0.2s ease ${idx * 0.02}s forwards`);
        });
        this.showStatsSummary();
    }

    createSiteCard(site) {
        const card = document.createElement('a');
        card.className = 'site-card';
        card.href = site.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.title = `${site.title}\n${site.description || ''}`;
        card.dataset.url = site.url;
        card.dataset.title = site.title;
        if (site.valid === false) card.classList.add('invalid');
        
        const views = site.views || 0;
        const formattedViews = this.formatViews(views);
        const iconHtml = this.getIconHtml(site);
        
        card.innerHTML = `
            <div class="card-top">
                <div class="icon-container">${iconHtml}</div>
                <div class="card-top-right">
                    <button class="report-dead-link-btn" data-url="${this.escapeHtml(site.url)}" data-title="${this.escapeHtml(site.title)}" title="报告死链">
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
                <div class="site-title">${this.escapeHtml(site.title)}</div>
                <div class="site-description">${this.escapeHtml(site.description || '暂无描述')}</div>
            </div>`;
        
        // 点击统计
        card.addEventListener('click', (e) => {
            if (e.target.closest('.report-dead-link-btn')) return;
            this.isNavigationClick = true;
            if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
            fetch(`${this.apiBase}/click`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: site.url, title: site.title })
            }).catch(err => console.warn('点击上报失败:', err));
            const viewCountEl = card.querySelector('.view-count');
            if (viewCountEl) {
                let cur = parseInt(viewCountEl.dataset.views) || 0;
                cur++;
                viewCountEl.dataset.views = cur;
                viewCountEl.textContent = this.formatViews(cur);
                viewCountEl.classList.add('increasing');
                setTimeout(() => viewCountEl.classList.remove('increasing'), 300);
            }
            setTimeout(() => {
                this.isNavigationClick = false;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
            }, 100);
        }, true);
        
        return card;
    }

    getIconHtml(site) {
        if (!site.icon) return '<i class="fas fa-link"></i>';
        if (site.icon.startsWith('http') || site.icon.includes('assets/') || site.icon.match(/\.(png|jpg|jpeg|ico|svg)/i))
            return `<img src="${site.icon}" alt="${this.escapeHtml(site.title)}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTYgMkM4LjIgMiAyIDguMiAyIDE2czYuMiAxNCAxNCAxNCAxNC02LjIgMTQtMTRTMjMuOCAyIDE2IDJ6bTAgNGEyIDIgMCAxIDAgMCA0IDIgMiAwIDAgMCAwLTR6bTQgMTRINnYtMmg0LjdsMy42LTMuNmMuMi0uMi4zLS40LjMtLjZWMTRoNHY0LjhsLTQgNHYyaDZ2LTJ6IiBmaWxsPSIjZmZmIi8+PC9zdmc+'">`;
        if (site.icon.startsWith('fas ') || site.icon.startsWith('fab ') || site.icon.startsWith('far '))
            return `<i class="${site.icon}"></i>`;
        return `<span>${site.icon}</span>`;
    }

    formatViews(views) {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1).replace('.0', '')}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1).replace('.0', '')}K`;
        return views.toString();
    }

    renderEmptyState() {
        const container = document.getElementById('level3Content');
        if (!container) return;
        container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-compass"></i></div><h3 class="empty-title">暂无内容</h3><p class="empty-subtitle">该分类下暂时没有链接</p></div>`;
    }

    showStatsSummary() {}

    selectLevel1(level1, isUserClick = false) {
        if (this.selectedLevel1 === level1) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level1-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.level1 === level1));
        this.selectedLevel1 = level1;
        if (window.innerWidth <= 1023 && isUserClick) {
            const active = document.querySelector('.level1-btn.active');
            if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
            const active = document.querySelector('.level2-btn.active');
            if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        this.showSkeleton();
        setTimeout(() => this.renderLevel3(this.selectedLevel1, level2), 50);
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    getFirstCategory() {
        return this.navigationData?.categories ? Object.keys(this.navigationData.categories)[0] : null;
    }

    getFirstSubCategory(level1) {
        const subs = this.navigationData?.categories?.[level1];
        return subs ? Object.keys(subs)[0] : null;
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const level1Btn = e.target.closest('.level1-btn');
            if (level1Btn) {
                this.isNavigationClick = true;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
                this.selectLevel1(level1Btn.dataset.level1, true);
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
            }
            const level2Btn = e.target.closest('.level2-btn');
            if (level2Btn) {
                this.isNavigationClick = true;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
                this.selectLevel2(level2Btn.dataset.level2, true);
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
            }
            // 报告死链按钮委托
            const reportBtn = e.target.closest('.report-dead-link-btn');
            if (reportBtn) {
                e.preventDefault();
                e.stopPropagation();
                const url = reportBtn.dataset.url;
                const title = reportBtn.dataset.title;
                fetch(`${this.apiBase}/report-dead-link`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, title })
                }).then(res => {
                    if (res.ok) window.toast.show('已收到反馈，我们将尽快核实处理，感谢您！', 'success');
                    else window.toast.show('反馈失败，请稍后再试', 'error');
                }).catch(() => window.toast.show('网络错误', 'error'));
            }
        });
        this.setupTouchSupport();
    }

    setupTouchSupport() {
        const containers = document.querySelectorAll('.navigation-left, .navigation-middle');
        containers.forEach(container => {
            if (window.innerWidth > 1023) return;
            let startX = 0, scrollLeft = 0;
            container.addEventListener('touchstart', (e) => {
                startX = e.touches[0].pageX - container.offsetLeft;
                scrollLeft = container.scrollLeft;
            });
            container.addEventListener('touchmove', (e) => {
                if (!startX) return;
                e.preventDefault();
                const x = e.touches[0].pageX - container.offsetLeft;
                container.scrollLeft = scrollLeft - (x - startX) * 2;
            });
            container.addEventListener('touchend', () => { startX = 0; });
        });
    }

    showError() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="empty-title">导航数据加载失败</h3><p class="empty-subtitle">请检查网络或稍后重试</p><button class="retry-btn" onclick="window.optimizedNavigation.refresh()" style="margin-top:16px;padding:8px 20px;background:#4361ee;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-redo"></i> 重试</button></div>`;
        }
    }

    refresh() {
        this.selectedLevel1 = this.selectedLevel2 = null;
        this.showSkeleton();
        this.init();
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.getOptimizedNavigation = () => window.optimizedNavigation;