/**
 * 优化分类导航系统（完全基于后端 Worker + D1）
 * 已集成网站图标本地缓存（localStorage base64）+ 7天有效期
 * 修复异步错误处理
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
        
        // 图标缓存配置
        this.ICON_CACHE_KEY = 'xldh_icon_cache';
        this.ICON_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天有效期
        
        // 图标缓存 Map：key 为图标 URL，value 为 { base64, timestamp }
        this.iconCache = new Map();
        this.loadIconCacheFromStorage();
    }

    // 从 localStorage 加载已缓存的图标，并清理过期项
    loadIconCacheFromStorage() {
        try {
            const cached = localStorage.getItem(this.ICON_CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                const now = Date.now();
                let validCount = 0;
                let expiredCount = 0;
                
                Object.entries(data).forEach(([url, item]) => {
                    // 兼容旧格式（直接存 base64 字符串）
                    if (typeof item === 'string') {
                        expiredCount++;
                        return;
                    }
                    // 新格式：{ base64, timestamp }
                    if (item.timestamp && (now - item.timestamp) < this.ICON_CACHE_EXPIRY) {
                        this.iconCache.set(url, item);
                        validCount++;
                    } else {
                        expiredCount++;
                    }
                });
                
                console.log(`✅ 已加载 ${validCount} 个有效图标缓存，${expiredCount} 个已过期`);
                
                // 如果有过期项被清理，更新 localStorage
                if (expiredCount > 0) {
                    this.saveCacheToStorage();
                }
            }
        } catch (e) {
            console.warn('加载图标缓存失败，将忽略缓存:', e);
            // 清除可能损坏的缓存
            try {
                localStorage.removeItem(this.ICON_CACHE_KEY);
            } catch (e2) {}
        }
    }

    // 将缓存保存到 localStorage
    saveCacheToStorage() {
        try {
            const obj = Object.fromEntries(this.iconCache);
            localStorage.setItem(this.ICON_CACHE_KEY, JSON.stringify(obj));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                this.clearOldCache();
                try {
                    const obj = Object.fromEntries(this.iconCache);
                    localStorage.setItem(this.ICON_CACHE_KEY, JSON.stringify(obj));
                } catch (e2) {
                    console.warn('图标缓存保存失败，已忽略');
                }
            }
        }
    }

    // 保存单个图标到缓存
    saveIconToCache(url, base64) {
        try {
            this.iconCache.set(url, {
                base64: base64,
                timestamp: Date.now()
            });
            this.saveCacheToStorage();
        } catch (e) {
            console.warn('保存图标缓存失败:', e);
        }
    }

    // 清理最旧的 30% 缓存（当存储空间不足时）
    clearOldCache() {
        const entries = Array.from(this.iconCache.entries());
        if (entries.length === 0) return;
        
        // 按时间戳排序，最旧的在前
        entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
        
        const removeCount = Math.ceil(entries.length * 0.3);
        for (let i = 0; i < removeCount; i++) {
            this.iconCache.delete(entries[i][0]);
        }
        console.log(`🗑️ 已清理 ${removeCount} 个最旧的图标缓存`);
    }

    // 手动清除所有图标缓存（可在控制台调用）
    clearAllIconCache() {
        this.iconCache.clear();
        try {
            localStorage.removeItem(this.ICON_CACHE_KEY);
        } catch (e) {}
        console.log('🗑️ 已清除所有图标缓存');
        if (window.toast) {
            window.toast.show('图标缓存已清除，刷新后将重新获取', 'success');
        }
    }

    // 将图片 URL 转为 base64（带缓存和有效期检查）
    async getIconBase64(url) {
        // 如果已经是 base64 或本地路径，直接返回
        if (!url || url.startsWith('data:') || url.startsWith('./') || url.startsWith('../') || url.includes('assets/')) {
            return url;
        }
        
        // 检查内存缓存
        if (this.iconCache.has(url)) {
            const cached = this.iconCache.get(url);
            // 兼容旧格式
            if (typeof cached === 'string') {
                this.iconCache.delete(url);
            } else {
                const now = Date.now();
                if ((now - cached.timestamp) < this.ICON_CACHE_EXPIRY) {
                    return cached.base64;
                } else {
                    // 已过期，删除缓存
                    this.iconCache.delete(url);
                    this.saveCacheToStorage();
                }
            }
        }
        
        try {
            // 使用 fetch 获取图片
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            const response = await fetch(url, { 
                mode: 'cors',
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            
            // 限制图片大小，超过 100KB 就不缓存，直接返回 URL
            if (blob.size > 100 * 1024) {
                console.warn('图标过大，不缓存:', url);
                return url;
            }
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result;
                    this.saveIconToCache(url, base64);
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn('图标转 base64 失败，将使用原始 URL:', url, e.message);
            return url; // 降级使用原始 URL
        }
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
            
            // 暴露清除缓存方法到全局，方便调试
            window.clearIconCache = () => this.clearAllIconCache();
            
        } catch (error) {
            console.error('优化分类导航初始化失败:', error);
            this.showError();
        }
    }

    async loadNavigationData(retryCount = 0) {
        const apiUrl = `https://api.xldh688.eu.cc/navigation?_=${Date.now()}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.navigationData = await response.json();
            console.log('✅ 导航数据从 Cloudflare Worker 加载成功');
        } catch (error) {
            console.error('❌ 加载失败，重试次数:', retryCount);
            if (retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.loadNavigationData(retryCount + 1);
            }
            throw new Error('无法加载导航数据，请检查网络或稍后重试');
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
        
        // 先显示占位卡片（快速渲染骨架）
        sortedSites.forEach((site) => {
            const card = this.createCardElement(site, true);
            container.appendChild(card);
        });
        
        // 异步加载图标，不阻塞渲染
        sortedSites.forEach((site, index) => {
            const card = container.children[index];
            this.updateCardIcon(card, site).catch(err => {
                console.warn('更新图标失败，保留默认图标:', site.title, err);
            });
        });
        
        this.showStatsSummary();
    }

    // 创建卡片元素（placeholder 模式）
    createCardElement(site, isPlaceholder = false) {
        const card = document.createElement('a');
        card.className = 'site-card';
        card.href = site.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.title = `${site.title}\n${site.description || ''}`;
        
        card.dataset.url = site.url;
        card.dataset.title = site.title;
        const normalizedUrl = this.normalizeUrl(site.url);
        card.dataset.urlNormalized = normalizedUrl;
        
        const views = site.views || 0;
        const formattedViews = this.formatViews(views);
        const isValid = site.valid !== false;
        
        if (!isValid) {
            card.classList.add('invalid');
        }
        
        // 占位图标（先显示默认图标）
        const iconHtml = isPlaceholder ? '<i class="fas fa-link"></i>' : '';
        
        card.innerHTML = `
            <div class="card-top">
                <div class="icon-container">${iconHtml}</div>
                <div class="card-top-right">
                    <button class="report-dead-link-btn" data-url="${site.url}" data-title="${this.escapeHtml(site.title)}" title="报告死链">
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
            </div>
        `;
        
        this.bindCardEvents(card, site);
        
        return card;
    }

    // 更新卡片的图标（异步获取 base64）
    async updateCardIcon(card, site) {
        const iconContainer = card.querySelector('.icon-container');
        if (!iconContainer) return;
        
        let iconUrl = site.icon;
        if (!iconUrl) {
            iconContainer.innerHTML = '<i class="fas fa-link"></i>';
            return;
        }
        
        // 如果是 FontAwesome 图标，直接显示
        if (iconUrl.startsWith('fas ') || iconUrl.startsWith('fab ') || iconUrl.startsWith('far ')) {
            iconContainer.innerHTML = `<i class="${iconUrl}"></i>`;
            return;
        }
        
        // 如果是自定义字符图标
        if (!iconUrl.startsWith('http') && !iconUrl.startsWith('./') && !iconUrl.includes('assets/')) {
            iconContainer.innerHTML = `<span>${iconUrl}</span>`;
            return;
        }
        
        try {
            const base64 = await this.getIconBase64(iconUrl);
            if (base64) {
                iconContainer.innerHTML = `<img src="${base64}" alt="${this.escapeHtml(site.title)}" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\'fas fa-link\'></i>';">`;
            } else {
                throw new Error('base64 为空');
            }
        } catch (e) {
            // 失败则回退到原始 URL 方式，让浏览器自己去加载
            console.warn('图标转换失败，使用原始 URL:', iconUrl);
            iconContainer.innerHTML = `<img src="${iconUrl}" alt="${this.escapeHtml(site.title)}" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\'fas fa-link\'></i>';">`;
        }
    }

    bindCardEvents(card, site) {
        // 绑定点击统计（点击卡片时，排除按钮区域）
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('report-dead-link-btn') || e.target.closest('.report-dead-link-btn')) {
                return;
            }
            this.isNavigationClick = true;
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            if (window.musicPlayer) {
                window.musicPlayer.isHandlingNavigationClick = true;
            }
            
            fetch('https://api.xldh688.eu.cc/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: site.url, title: site.title })
            }).catch(err => console.warn('点击上报失败:', err));
            
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
                if (window.musicPlayer) {
                    window.musicPlayer.isHandlingNavigationClick = false;
                }
            }, 100);
        }, true);
        
        // 绑定报告死链按钮事件
        const reportBtn = card.querySelector('.report-dead-link-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = reportBtn.dataset.url;
                const title = reportBtn.dataset.title;
                try {
                    const res = await fetch('https://api.xldh688.eu.cc/report-dead-link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, title })
                    });
                    if (res.ok) {
                        window.toast.show('已收到反馈，我们将尽快核实处理，感谢您！', 'success');
                    } else {
                        window.toast.show('反馈失败，请稍后再试', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    window.toast.show('网络错误', 'error');
                }
            });
        }
        
        requestAnimationFrame(() => {
            card.style.animation = 'fadeIn 0.2s ease forwards';
        });
    }

    normalizeUrl(url) {
        if (!url) return '';
        try {
            let normalized = url.toLowerCase();
            normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
            normalized = normalized.replace(/\/$/, '');
            return normalized;
        } catch {
            return url;
        }
    }

    formatViews(views) {
        if (views >= 1000000) {
            return `${(views / 1000000).toFixed(1).replace('.0', '')}M`;
        } else if (views >= 1000) {
            return `${(views / 1000).toFixed(1).replace('.0', '')}K`;
        } else {
            return views.toString();
        }
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

    showStatsSummary() {
        // 可留空
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

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.getOptimizedNavigation = function() {
    return window.optimizedNavigation;
};

window.getSiteStatsSummary = function() {
    return { totalSites: 0, totalViews: 0 };
};

window.getPopularSites = function(limit = 5) {
    return [];
};

window.resetSiteStats = function() {
    return false;
};