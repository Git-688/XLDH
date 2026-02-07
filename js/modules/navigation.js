/**
 * 优化分类导航系统
 * 文件位置：./js/modules/navigation.js
 */
class OptimizedNavigation {
    constructor() {
        this.navigationData = null;
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        this.isInitialized = false;
        
        // 统计数据 - 初始化为0，后续从数据计算
        this.stats = {
            totalCategories: 0,
            totalWebsites: 0
        };
        
        // 添加标志：是否正在处理导航点击
        this.isNavigationClick = false;
        
        // 网站统计缓存
        this.siteStatsCache = new Map();
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // 加载导航数据
            await this.loadNavigationData();
            
            // 计算统计数据（从navigationData动态获取）
            this.calculateStats();
            
            // 渲染整个导航系统
            this.renderNavigation();
            
            // 绑定事件
            this.bindEvents();
            
            // 默认选择第一个分类
            const firstCategory = this.getFirstCategory();
            if (firstCategory) {
                this.selectLevel1(firstCategory);
            }
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('优化分类导航初始化失败:', error);
            this.showError();
        }
    }

    async loadNavigationData() {
        try {
            if (typeof NavigationData !== 'undefined') {
                this.navigationData = NavigationData;
            } else {
                // 尝试从JSON文件加载
                const response = await fetch('./data/navigation.json');
                if (!response.ok) throw new Error('导航数据加载失败');
                this.navigationData = await response.json();
            }
        } catch (error) {
            console.error('加载导航数据失败:', error);
            throw error;
        }
    }

    calculateStats() {
        // 从navigationData动态获取统计数据
        if (this.navigationData && this.navigationData.getStats) {
            const stats = this.navigationData.getStats();
            this.stats.totalCategories = stats.totalCategories;
            this.stats.totalWebsites = stats.totalWebsites;
        } else {
            // 备用固定值
            this.stats.totalCategories = 8;
            this.stats.totalWebsites = 163;
        }
        
        // 更新统计显示
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const categoryCountEl = document.getElementById('categoryCount');
        const siteCountEl = document.getElementById('siteCount');
        
        if (categoryCountEl) {
            categoryCountEl.textContent = this.stats.totalCategories;
        }
        
        if (siteCountEl) {
            siteCountEl.textContent = `${this.stats.totalWebsites}+`;
        }
    }

    renderNavigation() {
        // 渲染一级分类
        this.renderLevel1();
        
        // 渲染三级分类的初始空状态
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
            
            button.innerHTML = `
                <span class="level1-btn-text">${categoryName}</span>
            `;
            
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
        
        // 按优先级排序
        const sortedSites = [...sites].sort((a, b) => {
            return (b.priority || 0) - (a.priority || 0);
        });
        
        container.innerHTML = '';
        
        sortedSites.forEach((site, index) => {
            const card = document.createElement('a');
            card.className = 'site-card';
            card.href = site.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.title = `${site.title}\n${site.description || ''}`;
            
            // 存储原始数据，供点击时使用
            card.dataset.url = site.url;
            card.dataset.title = site.title;
            
            // 获取浏览次数
            const views = Storage.getSiteViews(site.url);
            const formattedViews = Storage.formatViews(views);
            
            // 处理图标 - 优化显示，填满容器
            let iconHtml = '';
            if (site.icon) {
                if (site.icon.startsWith('http') || site.icon.startsWith('./') || site.icon.startsWith('../') || site.icon.includes('assets/') || site.icon.includes('.png') || site.icon.includes('.jpg') || site.icon.includes('.ico') || site.icon.includes('.svg')) {
                    // 使用图片，确保填满容器
                    iconHtml = `<img src="${site.icon}" alt="${site.title}" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTYgMkM4LjIgMiAyIDguMiAyIDE2czYuMiAxNCAxNCAxNCAxNC02LjIgMTQtMTRTMjMuOCAyIDE2IDJ6bTAgNGEyIDIgMCAxIDAgMCA0IDIgMiAwIDAgMCAwLTR6bTQgMTRINnYtMmg0LjdsMy42LTMuNmMuMi0uMi4zLS40LjMtLjZWMTRoNHY0LjhsLTQgNHYyaDZ2LTJ6IiBmaWxsPSIjZmZmIi8+PC9zdmc+'">`;
                } else if (site.icon.startsWith('fas ') || site.icon.startsWith('fab ') || site.icon.startsWith('far ')) {
                    // 使用Font Awesome图标
                    iconHtml = `<i class="${site.icon}"></i>`;
                } else {
                    // 使用文本emoji
                    iconHtml = `<span>${site.icon}</span>`;
                }
            } else {
                // 默认图标
                iconHtml = '<i class="fas fa-link"></i>';
            }
            
            card.innerHTML = `
                <div class="card-top">
                    <div class="icon-container">
                        ${iconHtml}
                    </div>
                    <div class="views-container">
                        <i class="fas fa-eye views-icon"></i>
                        <span class="view-count" data-views="${views}">${formattedViews}</span>
                    </div>
                </div>
                
                <div class="divider-line"></div>
                
                <div class="card-bottom">
                    <div class="site-title">${this.escapeHtml(site.title)}</div>
                    <div class="site-description">${this.escapeHtml(site.description || '暂无描述')}</div>
                </div>
            `;
            
            // 关键修复：添加事件监听，处理点击和统计
            card.addEventListener('click', (e) => {
                // 标记为导航点击
                this.isNavigationClick = true;
                
                // 阻止事件冒泡到可能存在的音乐播放器监听器
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // 设置全局标志，让音乐播放器知道这是导航点击
                if (window.musicPlayer) {
                    window.musicPlayer.isHandlingNavigationClick = true;
                }
                
                // 增加浏览次数统计
                this.incrementSiteViews(site.url, card);
                
                // 短时间后重置标志
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) {
                        window.musicPlayer.isHandlingNavigationClick = false;
                    }
                }, 100);
            }, true); // 使用捕获阶段，确保最先执行
            
            // 使用requestAnimationFrame确保动画生效
            requestAnimationFrame(() => {
                card.style.animation = 'fadeIn 0.2s ease forwards';
            });
            
            container.appendChild(card);
        });
        
        // 显示统计摘要
        this.showStatsSummary();
    }

    renderEmptyState() {
        const container = document.getElementById('level3Content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-compass"></i>
                </div>
                <h3 class="empty-title">选择一个分类开始探索</h3>
                <p class="empty-subtitle">点击左侧分类查看详细内容</p>
            </div>
        `;
    }

    // ==================== 新增：网站统计方法 ====================
    
    /**
     * 增加网站浏览次数
     * @param {string} url - 网站URL
     * @param {HTMLElement} cardElement - 卡片元素（可选）
     */
    incrementSiteViews(url, cardElement = null) {
        if (!url) return;
        
        // 增加统计
        const newViews = Storage.incrementSiteViews(url);
        const formattedViews = Storage.formatViews(newViews);
        
        // 更新缓存
        this.siteStatsCache.set(url, newViews);
        
        // 如果提供了卡片元素，更新显示
        if (cardElement) {
            const viewCountElement = cardElement.querySelector('.view-count');
            if (viewCountElement) {
                // 添加增加动画
                viewCountElement.classList.remove('increasing');
                void viewCountElement.offsetWidth; // 触发重排
                viewCountElement.classList.add('increasing');
                
                // 更新数值
                viewCountElement.textContent = formattedViews;
                viewCountElement.dataset.views = newViews;
                
                // 移除动画类
                setTimeout(() => {
                    viewCountElement.classList.remove('increasing');
                }, 300);
            }
        }
        
        // 触发统计更新事件
        this.dispatchStatsUpdateEvent(url, newViews);
        
        return newViews;
    }

    /**
     * 获取热门网站
     * @param {number} limit - 返回数量
     * @returns {Array} 热门网站列表
     */
    getPopularSites(limit = 5) {
        return Storage.getPopularSites(limit);
    }

    /**
     * 显示统计摘要
     */
    showStatsSummary() {
        const statsSummary = Storage.getSiteStatsSummary();
        
        // 如果有需要，可以更新页面上的统计信息
        const totalViewsElement = document.getElementById('totalSiteViews');
        if (totalViewsElement) {
            totalViewsElement.textContent = Storage.formatViews(statsSummary.totalViews);
        }
    }

    /**
     * 触发统计更新事件
     * @param {string} url - 网站URL
     * @param {number} newViews - 新浏览次数
     */
    dispatchStatsUpdateEvent(url, newViews) {
        const event = new CustomEvent('siteViewsUpdated', {
            detail: {
                url: url,
                views: newViews,
                formattedViews: Storage.formatViews(newViews)
            }
        });
        document.dispatchEvent(event);
    }

    selectLevel1(level1) {
        if (this.selectedLevel1 === level1) return;
        
        // 标记为导航点击
        this.isNavigationClick = true;
        
        // 更新按钮状态
        document.querySelectorAll('.level1-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level1 === level1);
        });
        
        this.selectedLevel1 = level1;
        
        // 滚动到可见区域（移动端）
        if (window.innerWidth <= 1023) {
            const activeBtn = document.querySelector('.level1-btn.active');
            if (activeBtn) {
                activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
        
        // 渲染二级分类
        this.renderLevel2(level1);
        
        // 默认选择第一个二级分类
        const firstLevel2 = this.getFirstSubCategory(level1);
        if (firstLevel2) {
            this.selectLevel2(firstLevel2);
        } else {
            // 如果没有二级分类，显示空状态
            this.renderEmptyState();
        }
        
        // 短时间后重置标志
        setTimeout(() => {
            this.isNavigationClick = false;
        }, 100);
    }

    selectLevel2(level2) {
        if (this.selectedLevel2 === level2) return;
        
        // 标记为导航点击
        this.isNavigationClick = true;
        
        // 更新按钮状态
        document.querySelectorAll('.level2-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level2 === level2);
        });
        
        this.selectedLevel2 = level2;
        
        // 滚动到可见区域（移动端）
        if (window.innerWidth <= 1023) {
            const activeBtn = document.querySelector('.level2-btn.active');
            if (activeBtn) {
                activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
        
        // 渲染三级分类网站
        this.renderLevel3(this.selectedLevel1, level2);
        
        // 短时间后重置标志
        setTimeout(() => {
            this.isNavigationClick = false;
        }, 100);
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
        // 一级分类按钮点击事件
        document.addEventListener('click', (e) => {
            const level1Btn = e.target.closest('.level1-btn');
            if (level1Btn) {
                // 标记为导航点击
                this.isNavigationClick = true;
                if (window.musicPlayer) {
                    window.musicPlayer.isHandlingNavigationClick = true;
                }
                
                const level1 = level1Btn.dataset.level1;
                this.selectLevel1(level1);
                
                // 短时间后重置标志
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) {
                        window.musicPlayer.isHandlingNavigationClick = false;
                    }
                }, 100);
            }
            
            // 二级分类按钮点击事件
            const level2Btn = e.target.closest('.level2-btn');
            if (level2Btn) {
                // 标记为导航点击
                this.isNavigationClick = true;
                if (window.musicPlayer) {
                    window.musicPlayer.isHandlingNavigationClick = true;
                }
                
                const level2 = level2Btn.dataset.level2;
                this.selectLevel2(level2);
                
                // 短时间后重置标志
                setTimeout(() => {
                    this.isNavigationClick = false;
                    if (window.musicPlayer) {
                        window.musicPlayer.isHandlingNavigationClick = false;
                    }
                }, 100);
            }
        });
        
        // 触摸滑动支持（移动端）
        this.setupTouchSupport();
        
        // 移除高度调整功能
    }

    setupTouchSupport() {
        const scrollContainers = document.querySelectorAll('.navigation-left, .navigation-middle');
        
        scrollContainers.forEach(container => {
            if (window.innerWidth <= 1023) {
                let startX = 0;
                let scrollLeft = 0;
                
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
                
                container.addEventListener('touchend', () => {
                    startX = 0;
                });
            }
        });
    }

    showError() {
        const container = document.getElementById('level3Content');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 class="empty-title">数据加载失败</h3>
                    <p class="empty-subtitle">请刷新页面或稍后重试</p>
                </div>
            `;
        }
    }

    // 工具方法
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    refresh() {
        this.selectedLevel1 = null;
        this.selectedLevel2 = null;
        
        // 重新初始化
        this.init();
    }
}

// 全局访问函数
window.getOptimizedNavigation = function() {
    return window.optimizedNavigation;
};

window.getSiteStatsSummary = function() {
    return Storage.getSiteStatsSummary();
};

window.getPopularSites = function(limit = 5) {
    return Storage.getPopularSites(limit);
};

window.resetSiteStats = function() {
    if (confirm('确定要重置所有网站的统计信息吗？此操作不可撤销。')) {
        Storage.resetAllSiteStats();
        
        // 重新渲染当前页面
        const nav = window.getOptimizedNavigation();
        if (nav && nav.selectedLevel1 && nav.selectedLevel2) {
            nav.renderLevel3(nav.selectedLevel1, nav.selectedLevel2);
        }
        
        return true;
    }
    return false;
};