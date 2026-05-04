/**
 * 优化分类导航系统（基于后端 Worker + D1）
 * 优化：直接使用 API 获取数据，增加本地缓存容错，后台静默更新
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
        this.skeletonCount = 6;

        // 用于缓存最近一次成功加载的数据
        this.cacheKey = 'nav_data_cache';
        
        // 后台更新定时器 ID
        this.updateTimer = null;
        // 后台更新间隔（毫秒）
        this.UPDATE_INTERVAL = 5 * 60 * 1000;
        // 是否允许静默更新 toast 提示
        this.quietUpdate = true;
    }

    async init() {
        if (this.isInitialized) return;
        
        this.showSkeleton();
        
        try {
            await this.loadNavigationData();
            this.calculateStats();
            this.renderNavigation();
            
            const firstCategory = this.getFirstCategory();
            if (firstCategory) {
                this.selectLevel1(firstCategory, false);
            }
            
            this.isInitialized = true;
            this.startBackgroundUpdates();          // 启动后台更新
        } catch (error) {
            console.error('导航初始化失败:', error);
            const cached = this.loadCache();
            if (cached) {
                this.navigationData = cached;
                this.calculateStats();
                this.renderNavigation();
                const firstCategory = this.getFirstCategory();
                if (firstCategory) {
                    this.selectLevel1(firstCategory, false);
                }
                window.toast.show('网络异常，已加载本地缓存数据', 'warning');
                this.isInitialized = true;
                this.startBackgroundUpdates();      // 即使使用缓存，也尝试后台更新
            } else {
                this.showError();
            }
        }
    }

    // 启动后台静默更新
    startBackgroundUpdates() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        
        // 定时更新
        this.updateTimer = setInterval(() => {
            this.fetchLatestFromAPI(true);
        }, this.UPDATE_INTERVAL);

        // 页面可见性变化时更新
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.fetchLatestFromAPI(true);
            }
        });
    }

    showSkeleton() {
        const container = document.getElementById('level3Content');
        if (!container) return;
        container.innerHTML = this.generateSkeletonHTML();
    }

    generateSkeletonHTML() {
        let html = '';
        for (let i = 0; i < this.skeletonCount; i++) {
            html += `<div class="site-card skeleton-card">
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
            </div>`;
        }
        return html;
    }

    // 直接通过 API 获取导航数据，带有缓存
    async loadNavigationData(retryCount = 0) {
        try {
            const data = await this.loadFromAPI(retryCount);
            this.navigationData = data;
            this.saveCache(data); // 缓存成功加载的数据
            console.log('✅ 导航数据从 API 加载成功');
        } catch (error) {
            // 如果 API 失败，尝试从缓存加载
            const cached = this.loadCache();
            if (cached) {
                console.warn('⚠️ 使用本地缓存的导航数据');
                this.navigationData = cached;
                window.toast.show('数据更新失败，展示近期缓存', 'warning');
            } else {
                throw error; // 无缓存则抛出错误
            }
        }
    }

    // 从 Worker API 获取最新数据
    async loadFromAPI(retryCount = 0) {
        const apiUrl = `https://api.xjdh688.ccwu.cc/navigation?_=${Date.now()}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            if (retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.loadFromAPI(retryCount + 1);
            }
            throw new Error('无法加载导航数据，请检查网络');
        }
    }

    // 缓存管理
    saveCache(data) {
        try {
            sessionStorage.setItem(this.cacheKey, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }

    loadCache() {
        try {
            const raw = sessionStorage.getItem(this.cacheKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp < 86400000) {
                return parsed.data;
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    // 后台静默更新，参数 silent 控制是否静默（不弹出 toast）
    async fetchLatestFromAPI(silent = false) {
        try {
            const apiUrl = `https://api.xjdh688.ccwu.cc/navigation?_=${Date.now()}`;
            const response = await fetch(apiUrl);
            if (!response.ok) return;

            const latest = await response.json();
            if (!latest || !latest.categories) return;

            // 检查数据是否真正变化（比较 JSON 字符串）
            const oldDataStr = JSON.stringify(this.navigationData?.categories || {});
            const newDataStr = JSON.stringify(latest.categories || {});
            if (oldDataStr === newDataStr) {
                if (!silent) console.log('🔄 导航数据无变化，跳过更新');
                return;
            }

            // 数据有变化，更新并重新渲染
            this.navigationData = latest;
            this.saveCache(latest);
            this.calculateStats();
            
            // 仅在非静默模式下显示提示
            if (!silent && this.quietUpdate) {
                window.toast.show('导航数据已自动更新', 'info');
            }
            
            // 如果用户没有选中任何分类，或者当前分类仍然存在，则重绘
            if (!this.selectedLevel1 || 
                (this.selectedLevel1 && latest.categories.hasOwnProperty(this.selectedLevel1))) {
                this.renderAll();
            }
            console.log('🔄 后台静默更新完成');
        } catch (e) {
            console.warn('后台更新失败:', e.message);
        }
    }

    renderAll() {
        this.renderNavigation();
        if (this.selectedLevel1) {
            this.selectLevel1(this.selectedLevel1, false);
        } else if (this.getFirstCategory()) {
            this.selectLevel1(this.getFirstCategory(), false);
        }
    }

    calculateStats() {
        if (this.navigationData && this.navigationData.categories) {
            let totalWebsites = 0;
            let invalidCount = 0;
            for (const category in this.navigationData.categories) {
                for (const subCategory in this.navigationData.categories[category]) {
                    const sites = this.navigationData.categories[category][subCategory];
                    totalWebsites += sites.length;
                    invalidCount += sites.filter(site => site.valid === false).length;
                }
            }
            this.stats.totalCategories = Object.keys(this.navigationData.categories).length;
            this.stats.totalWebsites = totalWebsites;
            this.stats.invalidCount = invalidCount;
        } else {
            this.stats.totalCategories = 0;
            this.stats.totalWebsites = 0;
            this.stats.invalidCount = 0;
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
            button.innerHTML = `<span class="level2-btn-text">${subCatName}</span>
                ${sites.length > 0 ? `<span class="level2-btn-count">${sites.length}</span>` : ''}`;
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
        const fragment = document.createDocumentFragment();
        sites.forEach((site) => {
            const card = document.createElement('a');
            card.className = 'site-card' + (site.valid === false ? ' invalid' : '');
            card.href = site.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.title = `${site.title}\n${site.description || ''}`;
            card.dataset.url = site.url;
            card.dataset.title = site.title;
            
            // 使用 Utils 工具函数
            const views = site.views || 0;
            const formattedViews = Utils.formatViews(views);
            
            let iconHtml = '';
            if (site.icon) {
                if (site.icon.startsWith('http') || site.icon.startsWith('./') || site.icon.includes('assets/') || site.icon.includes('.png') || site.icon.includes('.jpg') || site.icon.includes('.ico') || site.icon.includes('.svg')) {
                    iconHtml = `<img src="${site.icon}" alt="${Utils.escapeHtml(site.title)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\'fas fa-link\'></i>'">`;
                } else if (site.icon.startsWith('fas ') || site.icon.startsWith('fab ')) {
                    iconHtml = `<i class="${site.icon}"></i>`;
                } else {
                    iconHtml = `<span>${Utils.escapeHtml(site.icon)}</span>`;
                }
            } else {
                iconHtml = '<i class="fas fa-link"></i>';
            }
            
            card.innerHTML = `
                <div class="card-top">
                    <div class="icon-container">${iconHtml}</div>
                    <div class="card-top-right">
                        <button class="report-dead-link-btn" data-url="${site.url}" data-title="${Utils.escapeHtml(site.title)}" title="报告死链">
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
                    <div class="site-title">${Utils.escapeHtml(site.title)}</div>
                    <div class="site-description">${Utils.escapeHtml(site.description || '暂无描述')}</div>
                </div>
            `;
            
            // 点击事件
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('report-dead-link-btn') || e.target.closest('.report-dead-link-btn')) return;
                this.isNavigationClick = true;
                if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = true;
                
                fetch('https://api.xjdh688.ccwu.cc/click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: site.url, title: site.title })
                }).catch(err => console.warn('点击上报失败:', err));
                
                const viewCountEl = card.querySelector('.view-count');
                if (viewCountEl) {
                    let currentViews = parseInt(viewCountEl.dataset.views) || 0;
                    currentViews++;
                    viewCountEl.dataset.views = currentViews;
                    viewCountEl.textContent = Utils.formatViews(currentViews);
                    viewCountEl.classList.add('increasing');
                    setTimeout(() => viewCountEl.classList.remove('increasing'), 300);
                }
                
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) window.musicPlayer.isHandlingNavigationClick = false;
                }, 100);
            }, true);
            
            // 死链报告按钮
            const reportBtn = card.querySelector('.report-dead-link-btn');
            if (reportBtn) {
                reportBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const url = reportBtn.dataset.url;
                    const title = reportBtn.dataset.title;
                    try {
                        const res = await fetch('https://api.xjdh688.ccwu.cc/report-dead-link', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url, title })
                        });
                        if (res.ok) {
                            window.toast.show('已收到反馈，我们将尽快核实处理', 'success');
                        } else {
                            window.toast.show('反馈失败，请稍后再试', 'error');
                        }
                    } catch (err) {
                        window.toast.show('网络错误', 'error');
                    }
                });
            }
            
            fragment.appendChild(card);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
        
        // 添加淡入动画
        const cards = container.querySelectorAll('.site-card');
        cards.forEach((card, index) => {
            requestAnimationFrame(() => {
                card.style.animation = `fadeIn 0.2s ease ${index * 0.02}s forwards`;
            });
        });
    }

    renderEmptyState() {
        const container = document.getElementById('level3Content');
        if (!container) return;
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-compass"></i></div>
                <h3 class="empty-title">选择一个分类开始探索</h3>
                <p class="empty-subtitle">点击左侧分类查看详细内容</p>
            </div>`;
    }

    selectLevel1(level1, isUserClick = false) {
        if (this.selectedLevel1 === level1) return;
        this.isNavigationClick = true;
        document.querySelectorAll('.level1-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level1 === level1);
        });
        this.selectedLevel1 = level1;
        this.renderLevel2(level1);
        this.showSkeleton();
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
        this.showSkeleton();
        setTimeout(() => {
            this.renderLevel3(this.selectedLevel1, level2);
        }, 50);
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
    }

    showError() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h3 class="empty-title">导航数据加载失败</h3>
                    <p class="empty-subtitle">请检查网络或稍后重试</p>
                </div>`;
        }
    }

    refresh() {
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.showSkeleton();
        this.init();
    }

    // 清除定时器（可在组件销毁时调用，防内存泄漏）
    destroy() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
}

window.getOptimizedNavigation = function() {
    return window.optimizedNavigation;
};