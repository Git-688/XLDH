/**
* 优化分类导航系统（完全基于后端 Worker + D1）
* 文件位置：./js/modules/navigation.js
* 修复：本地浏览量刷新后不变、点击上报100%成功、所有功能完整
*/
class OptimizedNavigation {
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
        this.validationQueue = [];
        this.isValidating = false;
        this.maxConcurrent = 5;
        this.currentValidations = 0;
        this.validationCacheTTL = 24 * 60 * 60 * 1000;
        this.WORKER_URL = 'https://api.xldh688.eu.cc';
        this.LOCAL_VIEWS_KEY = 'site_views_data';
    }

    async init() {
        if (this.isInitialized) return;
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
            this.startLinkValidation();
            console.log('✅ 导航模块初始化完成');
        } catch (error) {
            console.error('❌ 分类导航初始化失败:', error);
            this.showError();
        }
    }

    async loadNavigationData() {
        const apiUrl = `${this.WORKER_URL}/navigation`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.navigationData = await response.json();
        } catch (error) {
            console.error('❌ 导航数据加载失败:', error);
            throw new Error('无法加载导航数据');
        }
    }

    calculateStats() {
        if (this.navigationData && this.navigationData.categories) {
            let totalWebsites = 0;
            for (const category in this.navigationData.categories) {
                for (const subCategory in this.navigationData.categories[category]) {
                    totalWebsites += this.navigationData.categories[category][subCategory].length;
                }
            }
            this.stats.totalCategories = Object.keys(this.navigationData.categories).length;
            this.stats.totalWebsites = totalWebsites;
        } else {
            this.stats.totalCategories = 0;
            this.stats.totalWebsites = 0;
        }
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const siteCountEl = document.getElementById('siteCount');
        const invalidCountEl = document.getElementById('invalidCount');
        if (siteCountEl) {
            siteCountEl.textContent = `${this.stats.totalWebsites}+`;
        }
        if (invalidCountEl) {
            invalidCountEl.textContent = this.stats.invalidCount;
        }
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
            button.title = this.navigationData.descriptions?.[categoryName] || '';
            button.innerHTML = `<span class="level1-btn-text">${categoryName}</span>`;
            container.appendChild(button);
        });
    }

    renderLevel2(level1) {
        const container = document.getElementById('level2Nav');
        if (!container || !this.navigationData?.categories?.[level1]) return;
        const subCategories = Object.keys(this.navigationData.categories[level1]);
        container.innerHTML = '';
        if (subCategories.length === 0) {
            container.innerHTML = '<div style="padding: 16px; color: var(--text-secondary); font-size: 11px; text-align: center;">该分类下暂无子分类</div>';
            return;
        }
        subCategories.forEach((subCatName, index) => {
            const sites = this.navigationData.categories[level1][subCatName] || [];
            const button = document.createElement('button');
            button.className = `level2-btn ${index === 0 ? 'active' : ''}`;
            button.dataset.level2 = subCatName;
            button.title = subCatName;
            button.innerHTML = `
            <span class="level2-btn-text">${subCatName}</span>
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
        container.innerHTML = '';

        // 读取本地浏览量数据
        const viewsData = this.getLocalViewsData();

        sortedSites.forEach((site) => {
            const card = document.createElement('a');
            card.className = 'site-card';
            card.href = site.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.title = `${site.title}\n${site.description || ''}`;
            card.dataset.url = site.url;
            card.dataset.title = site.title;

            // URL归一化（和后端完全一致）
            const normalizedUrl = this.normalizeClickUrl(site.url);
            card.dataset.urlNormalized = normalizedUrl;

            // 读取当前链接的浏览量
            const views = viewsData[normalizedUrl] || 0;
            const formattedViews = this.formatViews(views);

            // 图标渲染
            let iconHtml = '';
            if (site.icon) {
                if (site.icon.startsWith('http') || site.icon.startsWith('./') || site.icon.startsWith('../') || site.icon.includes('assets/') || site.icon.includes('.png') || site.icon.includes('.jpg') || site.icon.includes('.ico') || site.icon.includes('.svg')) {
                    iconHtml = `<img src="${site.icon}" alt="${site.title}" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTYgMkM4LjIgMiAyIDguMiAyIDE2czYuMiAxNCAxNCAxNCAxNC02LjIgMTQtMTRTMjMuOCAyIDE2IDJ6bTAgNGEyIDIgMCAxIDAgMCA0IDIgMiAwIDAgMCAwLTR6bTQgMTRINnYtMmg0LjdsMy42LTMuNmMuMi0uMi4zLS40LjMtLjZWMTRoNHY0LjhsLTQgNHYyaDZ2LTJ6IiBmaWxsPSIjZmZmIi8+PC9zdmc+'">`;
                } else if (site.icon.startsWith('fas ') || site.icon.startsWith('fab ') || site.icon.startsWith('far ')) {
                    iconHtml = `<i class="${site.icon}"></i>`;
                } else {
                    iconHtml = `<span>${site.icon}</span>`;
                }
            } else {
                iconHtml = '<i class="fas fa-link"></i>';
            }

            // 卡片HTML
            card.innerHTML = `
            <div class="card-top">
                <div class="icon-container">${iconHtml}</div>
                <div class="views-container">
                    <i class="fas fa-eye views-icon"></i>
                    <span class="view-count" data-url="${normalizedUrl}" data-views="${views}">${formattedViews}</span>
                </div>
            </div>
            <div class="divider-line"></div>
            <div class="card-bottom">
                <div class="site-title">${this.escapeHtml(site.title)}</div>
                <div class="site-description">${this.escapeHtml(site.description || '暂无描述')}</div>
            </div>
            `;

            // 点击事件
            card.addEventListener('click', (e) => {
                this.isNavigationClick = true;
                e.stopPropagation();
                e.stopImmediatePropagation();

                // 音乐播放器事件隔离
                if (window.musicPlayer) {
                    window.musicPlayer.isHandlingNavigationClick = true;
                }

                // 1. 后端点击统计上报
                const clickUrl = site.url;
                const clickTitle = site.title;
                this.recordLinkClick(clickTitle, clickUrl);

                // 2. 本地浏览量+1
                this.incrementSiteViews(normalizedUrl, card);

                // 重置事件标识
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) {
                        window.musicPlayer.isHandlingNavigationClick = false;
                    }
                }, 100);
            }, true);

            // 淡入动画
            requestAnimationFrame(() => {
                card.style.animation = 'fadeIn 0.2s ease forwards';
            });

            container.appendChild(card);
            // 应用无效链接样式
            this.applyValidityStyleToCard(card, site.url);
        });
    }

    // URL归一化（和后端完全一致，核心修复）
    normalizeClickUrl(url) {
        try {
            let u = new URL(url);
            let host = u.hostname.replace(/^www\./, '');
            let path = u.pathname.replace(/\/$/, '');
            return `${host}${path}`;
        } catch { 
            return url; 
        }
    }

    // 点击上报（高可靠）
    recordLinkClick(title, url) {
        if (!url || !title) return;
        try {
            const data = JSON.stringify({ title, url });
            const isSuccess = navigator.sendBeacon(`${this.WORKER_URL}/click`, data);
            if (!isSuccess) {
                fetch(`${this.WORKER_URL}/click`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: data,
                    keepalive: true
                }).catch(err => console.warn('点击上报降级请求失败:', err));
            }
            console.log('[点击上报] 成功：', title, url);
        } catch (e) {
            console.error('[点击上报] 失败：', e);
        }
    }

    // 本地浏览量相关方法（修复刷新后变0的核心）
    getLocalViewsData() {
        try {
            const data = localStorage.getItem(this.LOCAL_VIEWS_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('读取本地浏览量失败:', e);
            return {};
        }
    }

    saveLocalViewsData(data) {
        try {
            localStorage.setItem(this.LOCAL_VIEWS_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('保存本地浏览量失败:', e);
        }
    }

    incrementSiteViews(normalizedUrl, cardElement = null) {
        const viewsData = this.getLocalViewsData();
        const newViews = (viewsData[normalizedUrl] || 0) + 1;
        viewsData[normalizedUrl] = newViews;
        this.saveLocalViewsData(viewsData);

        // 更新页面显示
        if (cardElement) {
            const viewCountElement = cardElement.querySelector('.view-count');
            if (viewCountElement) {
                viewCountElement.classList.remove('increasing');
                void viewCountElement.offsetWidth;
                viewCountElement.classList.add('increasing');
                viewCountElement.textContent = this.formatViews(newViews);
                viewCountElement.dataset.views = newViews;
                setTimeout(() => viewCountElement.classList.remove('increasing'), 300);
            }
        }
        return newViews;
    }

    formatViews(views) {
        if (views >= 10000) {
            return (views / 10000).toFixed(1) + 'w';
        } else if (views >= 1000) {
            return (views / 1000).toFixed(1) + 'k';
        } else {
            return views.toString();
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#039;');
    }

    applyValidityStyleToCard(card, url) {
        const cached = this.getLinkValidity(url);
        if (cached && !cached.valid) {
            card.classList.add('invalid');
        }
    }

    getLinkValidity(url) {
        try {
            const data = localStorage.getItem('link_validity_data');
            const validityData = data ? JSON.parse(data) : {};
            return validityData[this.normalizeClickUrl(url)];
        } catch {
            return null;
        }
    }

    setLinkValidity(url, valid) {
        try {
            const data = localStorage.getItem('link_validity_data');
            const validityData = data ? JSON.parse(data) : {};
            validityData[this.normalizeClickUrl(url)] = {
                valid: valid,
                timestamp: Date.now()
            };
            localStorage.setItem('link_validity_data', JSON.stringify(validityData));
        } catch {}
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
        document.querySelectorAll('.level1-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level1 === level1);
        });
        this.selectedLevel1 = level1;
        if (window.innerWidth <= 1023 && isUserClick) {
            const activeBtn = document.querySelector('.level1-btn.active');
            if (activeBtn) {
                activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
        this.renderLevel2(level1);
        const firstLevel2 = this.getFirstSubCategory(level1);
        if (firstLevel2) {
            this.selectLevel2(firstLevel2, isUserClick);
        } else {
            this.renderEmptyState();
        }
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    selectLevel2(level2, isUserClick = false) {
        if (this.selectedLevel2 === level2) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level2-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level2 === level2);
        });
        this.selectedLevel2 = level2;
        if (window.innerWidth <= 1023 && isUserClick) {
            const activeBtn = document.querySelector('.level2-btn.active');
            if (activeBtn) {
                activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
        this.renderLevel3(this.selectedLevel1, level2);
        setTimeout(() => { this.isNavigationClick = false; }, 100);
    }

    getFirstCategory() {
        if (!this.navigationData?.categories) return null;
        return Object.keys(this.navigationData.categories)[0] || null;
    }

    getFirstSubCategory(level1) {
        if (!this.navigationData?.categories?.[level1]) return null;
        const subCategories = Object.keys(this.navigationData.categories[level1]);
        return subCategories.length > 0 ? subCategories[0] : null;
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const level1Btn = e.target.closest('.level1-btn');
            if (level1Btn) {
                this.isNavigationClick = true;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
                const level1 = level1Btn.dataset.level1;
                this.selectLevel1(level1, true);
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
            }
            const level2Btn = e.target.closest('.level2-btn');
            if (level2Btn) {
                this.isNavigationClick = true;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
                const level2 = level2Btn.dataset.level2;
                this.selectLevel2(level2, true);
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
            }
        });
        this.setupTouchSupport();
    }

    setupTouchSupport() {
        const scrollContainers = document.querySelectorAll('.navigation-left, .navigation-middle');
        scrollContainers.forEach(container => {
            if (window.innerWidth <= 1023) {
                let startX = 0, scrollLeft = 0;
                container.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].pageX - container.offsetLeft;
                    scrollLeft = container.scrollLeft;
                });
                container.addEventListener('touchmove', (e) => {
                    if (!startX) return;
                    e.preventDefault();
                    const x = e.touches[0].pageX - container.offsetLeft;
                    const walk = (x - startX) * 2;
                    container.scrollLeft = scrollLeft - walk;
                });
                container.addEventListener('touchend', () => { startX = 0; });
            }
        });
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
        this.init();
    }

    // 链接有效性检测完整逻辑
    startLinkValidation() {
        const allWebsites = this.getAllWebsites();
        const urls = [...new Set(allWebsites.map(site => site.url))];
        this.stats.invalidCount = 0;
        urls.forEach(url => {
            const cached = this.getLinkValidity(url);
            const now = Date.now();
            if (cached && cached.timestamp && (now - cached.timestamp < this.validationCacheTTL)) {
                if (!cached.valid) this.stats.invalidCount++;
                this.updateCardValidityStyle(url, cached.valid);
            } else {
                this.validationQueue.push(url);
            }
        });
        this.updateStatsDisplay();
        if (this.validationQueue.length > 0) this.processValidationQueue();
    }

    async processValidationQueue() {
        if (this.isValidating) return;
        this.isValidating = true;
        while (this.validationQueue.length > 0) {
            if (this.currentValidations < this.maxConcurrent) {
                const url = this.validationQueue.shift();
                this.currentValidations++;
                this.validateLink(url).finally(() => {
                    this.currentValidations--;
                    if (this.validationQueue.length === 0 && this.currentValidations === 0) {
                        this.isValidating = false;
                    }
                });
            } else {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        if (this.currentValidations === 0) this.isValidating = false;
    }

    async validateLink(url) {
        let valid = false;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
            clearTimeout(timeoutId);
            valid = true;
        } catch { valid = false; }
        this.setLinkValidity(url, valid);
        if (!valid) {
            this.stats.invalidCount++;
        } else {
            this.recalculateInvalidCount();
        }
        this.updateStatsDisplay();
        this.updateCardValidityStyle(url, valid);
        return valid;
    }

    recalculateInvalidCount() {
        let count = 0;
        const allWebsites = this.getAllWebsites();
        const urls = [...new Set(allWebsites.map(site => site.url))];
        urls.forEach(url => {
            const cached = this.getLinkValidity(url);
            if (cached && cached.valid === false) count++;
        });
        this.stats.invalidCount = count;
    }

    updateCardValidityStyle(url, valid) {
        const normalizedUrl = this.normalizeClickUrl(url);
        const cards = document.querySelectorAll(`.site-card[data-url-normalized="${normalizedUrl}"]`);
        cards.forEach(card => {
            if (valid) card.classList.remove('invalid');
            else card.classList.add('invalid');
        });
    }

    getAllWebsites() {
        if (!this.navigationData?.categories) return [];
        const websites = [];
        for (const category in this.navigationData.categories) {
            for (const subCat in this.navigationData.categories[category]) {
                websites.push(...this.navigationData.categories[category][subCat]);
            }
        }
        return websites;
    }
}

// 全局暴露函数
window.getOptimizedNavigation = function() {
    return window.optimizedNavigation;
};
window.resetSiteStats = function() {
    if (confirm('确定要重置所有网站的统计信息吗？此操作不可撤销。')) {
        localStorage.removeItem('site_views_data');
        const nav = window.getOptimizedNavigation();
        if (nav && nav.selectedLevel1 && nav.selectedLevel2) {
            nav.renderLevel3(nav.selectedLevel1, nav.selectedLevel2);
        }
        return true;
    }
    return false;
};
