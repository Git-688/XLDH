/**
 * 新版搜索模块 - 优化紧凑版本
 * 支持水平滚动引擎选择器和智能搜索建议
 * @class SearchModule
 */
class SearchModule {
    constructor() {
        // 防止重复初始化
        if (window.searchModule && window.searchModule instanceof SearchModule) {
            console.warn('搜索模块已存在，返回现有实例');
            return window.searchModule;
        }
        
        this.defaultEngines = {
            baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=%s', icon: 'fas fa-search', iconType: 'fontawesome' },
            bing: { name: 'Bing', url: 'https://cn.bing.com/search?q=%s', icon: 'fab fa-microsoft', iconType: 'fontawesome' },
            google: { name: 'Google', url: 'https://www.google.com/search?q=%s', icon: 'fab fa-google', iconType: 'fontawesome' },
            zhihu: { name: '知乎', url: 'https://www.zhihu.com/search?q=%s', icon: 'fas fa-question-circle', iconType: 'fontawesome' },
            bilibili: { name: '哔哩哔哩', url: 'https://search.bilibili.com/all?keyword=%s', icon: 'fas fa-tv', iconType: 'fontawesome' },
            weibo: { name: '微博', url: 'https://s.weibo.com/weibo?q=%s', icon: 'fab fa-weibo', iconType: 'fontawesome' },
            taobao: { name: '淘宝', url: 'https://s.taobao.com/search?q=%s', icon: 'fas fa-shopping-cart', iconType: 'fontawesome' },
            jd: { name: '京东', url: 'https://search.jd.com/Search?keyword=%s', icon: 'fas fa-store', iconType: 'fontawesome' },
            douyin: { name: '抖音', url: 'https://www.douyin.com/search/%s', icon: 'fas fa-music', iconType: 'fontawesome' },
            toutiao: { name: '今日头条', url: 'https://so.toutiao.com/search?keyword=%s', icon: 'far fa-newspaper', iconType: 'fontawesome' },
            sogou: { name: '搜狗搜索', url: 'https://www.sogou.com/web?query=%s', icon: 'fas fa-search-plus', iconType: 'fontawesome' },
            github: { name: 'GitHub', url: 'https://github.com/search?q=%s', icon: 'fab fa-github', iconType: 'fontawesome' },
            wikipedia: { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search=%s', icon: 'fab fa-wikipedia-w', iconType: 'fontawesome' },
            stackoverflow: { name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=%s', icon: 'fab fa-stack-overflow', iconType: 'fontawesome' },
            youtube: { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s', icon: 'fab fa-youtube', iconType: 'fontawesome' },
            duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', icon: 'fas fa-duck', iconType: 'fontawesome' }
        };

        this.searchEngines = JSON.parse(localStorage.getItem('searchEngines') || JSON.stringify(this.defaultEngines));
        this.currentEngine = localStorage.getItem('currentEngine') || 'baidu';
        this.searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        this.tooltip = null;
        this.tooltipTimeout = null;
        this.isOpen = false;
        
        this.init();
        
        // 设置全局实例
        window.searchModule = this;
    }

    /**
     * 初始化搜索模块
     */
    init() {
        this.createTooltip();
        this.bindGlobalEvents();
        console.log('搜索模块初始化完成');
    }

    /**
     * 创建提示工具
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'engine-tooltip';
        this.tooltip.id = 'engineTooltip';
        document.body.appendChild(this.tooltip);
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                this.isModalOpen() ? this.hide() : this.showModal();
            }
            if (event.key === 'Escape' && this.isModalOpen()) {
                this.hide();
            }
        });

        document.addEventListener('click', (event) => {
            const modal = document.getElementById('searchModal');
            const searchBtn = document.getElementById('searchBtn');
            
            if (searchBtn && searchBtn.contains(event.target)) {
                return;
            }
            
            if (modal && modal.classList.contains('active') && 
                !modal.contains(event.target)) {
                this.hide();
            }
        });

        window.addEventListener('resize', () => {
            if (this.isModalOpen()) {
                this.positionModal();
            }
        });
    }

    /**
     * 定位模态框
     */
    positionModal() {
        const modal = document.getElementById('searchModal');
        const searchBtn = document.getElementById('searchBtn');
        
        if (!modal || !searchBtn) return;
        
        if (window.innerWidth > 768) {
            modal.style.top = '60px';
            modal.style.right = '20px';
            modal.style.left = 'auto';
            modal.style.transform = 'translateY(-10px) scale(0.95)';
        } else {
            modal.style.top = '60px';
            modal.style.left = '50%';
            modal.style.right = 'auto';
            modal.style.transform = 'translateX(-50%) scale(0.9)';
        }
    }

    /**
     * 显示搜索模态框
     */
    showModal() {
        const modal = document.getElementById('searchModal');
        if (!modal) {
            console.error('搜索模态框元素未找到');
            return;
        }

        // 关闭侧边栏和音乐播放器
        if (window.sidebar && window.sidebar.isVisible()) {
            window.sidebar.hide();
        }
        
        // 关闭音乐播放器
        if (window.app && window.app.components && window.app.components.navbar) {
            window.app.components.navbar.hideMusicPlayer();
        }

        this.positionModal();
        
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('active');
            
            if (window.innerWidth > 768) {
                modal.style.transform = 'translateY(0) scale(1)';
            } else {
                modal.style.transform = 'translateX(-50%) scale(1)';
            }
        }, 10);
        
        this.renderEngines();
        this.focusSearchInput();
        this.isOpen = true;

        if (window.app) {
            window.app.registerModal(this);
        }
        
        console.log('搜索模态框已打开');
    }

    /**
     * 隐藏搜索模态框
     */
    hide() {
        const modal = document.getElementById('searchModal');
        if (modal) {
            modal.classList.remove('active');
            
            if (window.innerWidth > 768) {
                modal.style.transform = 'translateY(-10px) scale(0.95)';
            } else {
                modal.style.transform = 'translateX(-50%) scale(0.9)';
            }
            
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        }
        
        this.clearSearchInput();
        this.hideSuggestions();
        this.hidePanels();
        this.hideTooltip();
        this.isOpen = false;

        if (window.app) {
            window.app.unregisterModal(this);
        }
        
        console.log('搜索模态框已关闭');
    }

    /**
     * 检查模态框是否打开
     */
    isModalOpen() {
        return this.isOpen;
    }

    /**
     * 渲染搜索引擎图标
     */
    renderEngines() {
        const container = document.getElementById('engineSelector');
        if (!container) return;

        container.innerHTML = '';
        Object.entries(this.searchEngines).forEach(([key, engine]) => {
            const btn = document.createElement('button');
            btn.className = `engine-btn ${key === this.currentEngine ? 'active' : ''}`;
            btn.dataset.engine = key;
            btn.dataset.name = engine.name;
            
            if (engine.iconType === 'url') {
                btn.innerHTML = `<img src="${engine.icon}" alt="${engine.name}" loading="lazy">`;
            } else {
                btn.innerHTML = `<i class="${engine.icon}"></i>`;
            }
            
            this.setupTooltipEvents(btn, engine.name);
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectEngine(key);
            });
            
            container.appendChild(btn);
        });

        this.updateScrollIndicators();
    }

    /**
     * 设置提示事件
     */
    setupTooltipEvents(element, name) {
        element.addEventListener('mouseenter', (e) => {
            if (!this.isMobile()) {
                this.showTooltip(element, name, e.clientX, e.clientY);
            }
        });
        
        element.addEventListener('mouseleave', () => {
            if (!this.isMobile()) {
                this.hideTooltip();
            }
        });
        
        element.addEventListener('mousemove', (e) => {
            if (!this.isMobile()) {
                this.updateTooltipPosition(e.clientX, e.clientY);
            }
        });

        let touchTimer;
        element.addEventListener('touchstart', (e) => {
            if (this.isMobile()) {
                e.preventDefault();
                this.showTooltip(element, name, e.touches[0].clientX, e.touches[0].clientY);
                
                touchTimer = setTimeout(() => {
                    this.hideTooltip();
                }, 2000);
            }
        });
        
        element.addEventListener('touchend', () => {
            if (this.isMobile()) {
                clearTimeout(touchTimer);
            }
        });
    }

    /**
     * 检测是否为移动端
     */
    isMobile() {
        return window.matchMedia && window.matchMedia('(hover: none)').matches;
    }

    /**
     * 显示提示（防遮挡优化）
     */
    showTooltip(element, name, clientX, clientY) {
        clearTimeout(this.tooltipTimeout);
        
        this.tooltip.textContent = name;
        this.tooltip.classList.add('visible');
        
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let top, positionClass = '';
        const spaceAbove = rect.top;
        const spaceBelow = viewportHeight - rect.bottom;
        
        if (spaceAbove > tooltipRect.height + 8) {
            top = rect.top - 6;
        } else if (spaceBelow > tooltipRect.height + 8) {
            top = rect.bottom + 6;
            positionClass = 'below';
        } else {
            top = rect.top + rect.height / 2 - tooltipRect.height / 2;
            positionClass = 'right';
        }
        
        let left = rect.left + rect.width / 2;
        const minLeft = tooltipRect.width / 2 + 4;
        const maxLeft = window.innerWidth - tooltipRect.width / 2 - 4;
        
        if (left < minLeft) {
            left = minLeft;
        } else if (left > maxLeft) {
            left = maxLeft;
        }
        
        if (positionClass === 'right') {
            left = rect.right + 6;
            if (left + tooltipRect.width > window.innerWidth - 6) {
                left = rect.left - tooltipRect.width - 6;
            }
        }
        
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
        this.tooltip.classList.toggle('below', positionClass === 'below');
        this.tooltip.classList.toggle('right', positionClass === 'right');
        
        this.tooltipTimeout = setTimeout(() => this.hideTooltip(), 2000);
    }

    /**
     * 隐藏提示
     */
    hideTooltip() {
        clearTimeout(this.tooltipTimeout);
        if (this.tooltip) {
            this.tooltip.classList.remove('visible');
            this.tooltip.classList.remove('below');
            this.tooltip.classList.remove('right');
        }
    }

    /**
     * 更新提示位置
     */
    updateTooltipPosition(clientX, clientY) {
        if (this.tooltip.classList.contains('visible') && !this.isMobile()) {
            const tooltipRect = this.tooltip.getBoundingClientRect();
            let left = clientX;
            let top = clientY - 30;
            
            const minLeft = tooltipRect.width / 2 + 4;
            const maxLeft = window.innerWidth - tooltipRect.width / 2 - 4;
            
            if (left < minLeft) {
                left = minLeft;
            } else if (left > maxLeft) {
                left = maxLeft;
            }
            
            this.tooltip.style.left = left + 'px';
            this.tooltip.style.top = top + 'px';
        }
    }

    /**
     * 选择搜索引擎
     */
    selectEngine(key) {
        this.currentEngine = key;
        localStorage.setItem('currentEngine', key);
        this.renderEngines();
        this.focusSearchInput();
    }

    /**
     * 添加自定义搜索引擎
     */
    addCustomEngine() {
        const name = document.getElementById('customName')?.value.trim();
        const url = document.getElementById('customUrl')?.value.trim();
        const iconInput = document.getElementById('customIcon')?.value.trim();
        
        if (!name || !url || !url.includes('%s')) {
            this.showToast('请填写完整信息，URL必须包含%s占位符', 'warning');
            return;
        }
        
        let icon, iconType;
        if (iconInput.startsWith('http')) {
            icon = iconInput;
            iconType = 'url';
        } else {
            icon = iconInput || 'fas fa-search';
            iconType = 'fontawesome';
        }
        
        const key = 'custom_' + Date.now();
        this.searchEngines[key] = { name, url, icon, iconType };
        localStorage.setItem('searchEngines', JSON.stringify(this.searchEngines));
        this.renderEngines();
        
        const customName = document.getElementById('customName');
        const customUrl = document.getElementById('customUrl');
        const customIcon = document.getElementById('customIcon');
        
        if (customName) customName.value = '';
        if (customUrl) customUrl.value = '';
        if (customIcon) customIcon.value = '';
        
        this.togglePanel('settings');
        this.hideTooltip();
        this.showToast('自定义搜索引擎添加成功', 'success');
    }

    /**
     * 保存搜索历史
     */
    saveHistory(query) {
        if (!query) return;
        this.searchHistory = this.searchHistory.filter(h => h !== query);
        this.searchHistory.unshift(query);
        this.searchHistory = this.searchHistory.slice(0, 15);
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }

    /**
     * 渲染搜索历史
     */
    renderHistory() {
        const panel = document.getElementById('historyPanel');
        if (!panel) return;

        if (this.searchHistory.length === 0) {
            panel.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 0.75rem; padding: 0.5rem;">暂无搜索历史</div>';
            return;
        }
        
        panel.innerHTML = this.searchHistory.map(h => `
            <div class="history-item" onclick="window.searchModule.searchFromHistory('${h.replace(/'/g, "\\'")}')">
                <span>${h}</span>
                <i class="fas fa-times delete-history" onclick="window.searchModule.deleteHistory('${h.replace(/'/g, "\\'")}', event)"></i>
            </div>
        `).join('');
    }

    /**
     * 从历史记录搜索
     */
    searchFromHistory(query) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = query;
        }
        this.togglePanel('history');
        this.focusSearchInput();
        this.hideTooltip();
    }

    /**
     * 删除历史记录
     */
    deleteHistory(query, event) {
        if (event) event.stopPropagation();
        this.searchHistory = this.searchHistory.filter(h => h !== query);
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        this.renderHistory();
    }

    /**
     * 显示搜索建议
     */
    showSuggestions(value) {
        const suggestions = document.getElementById('suggestions');
        if (!suggestions) return;

        if (!value) {
            suggestions.classList.remove('active');
            return;
        }
        
        const suggests = this.searchHistory.filter(h => h.includes(value)).slice(0, 4);
        if (suggests.length === 0) {
            suggestions.classList.remove('active');
            return;
        }
        
        suggestions.innerHTML = suggests.map(s => `
            <div class="suggestion-item" onclick="window.searchModule.selectSuggestion('${s.replace(/'/g, "\\'")}')">${s}</div>
        `).join('');
        suggestions.classList.add('active');
        this.hideTooltip();
    }

    /**
     * 选择搜索建议
     */
    selectSuggestion(value) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = value;
        }
        this.hideSuggestions();
    }

    /**
     * 隐藏搜索建议
     */
    hideSuggestions() {
        const suggestions = document.getElementById('suggestions');
        if (suggestions) {
            suggestions.classList.remove('active');
        }
    }

    /**
     * 切换面板显示
     */
    togglePanel(type) {
        const historyPanel = document.getElementById('historyPanel');
        const settingsPanel = document.getElementById('settingsPanel');
        
        if (type === 'history') {
            historyPanel?.classList.toggle('active');
            settingsPanel?.classList.remove('active');
            this.renderHistory();
        } else {
            settingsPanel?.classList.toggle('active');
            historyPanel?.classList.remove('active');
        }
        this.hideTooltip();
    }

    /**
     * 隐藏所有面板
     */
    hidePanels() {
        const historyPanel = document.getElementById('historyPanel');
        const settingsPanel = document.getElementById('settingsPanel');
        
        historyPanel?.classList.remove('active');
        settingsPanel?.classList.remove('active');
    }

    /**
     * 处理搜索
     */
    handleSearch(event) {
        if (event.key === 'Enter') {
            const searchInput = document.getElementById('searchInput');
            const query = searchInput?.value.trim();
            
            if (query) {
                this.hideTooltip();
                const url = this.searchEngines[this.currentEngine].url.replace('%s', encodeURIComponent(query));
                window.open(url, '_blank');
                this.saveHistory(query);
                this.hide();
            }
        }
    }

    /**
     * 执行搜索
     */
    search(query, engine = null) {
        if (engine) {
            const selectedEngine = Object.keys(this.searchEngines).find(key => key === engine);
            if (selectedEngine) {
                this.currentEngine = selectedEngine;
            }
        }

        if (query) {
            const url = this.searchEngines[this.currentEngine].url.replace('%s', encodeURIComponent(query));
            window.open(url, '_blank');
            this.saveHistory(query);
        }
    }

    /**
     * 聚焦搜索输入框
     */
    focusSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * 清空搜索输入框
     */
    clearSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    /**
     * 更新滚动指示器
     */
    updateScrollIndicators() {
        const container = document.getElementById('engineSelector');
        if (!container) return;

        const updateIndicators = () => {
            const scrollLeft = container.scrollLeft;
            const scrollWidth = container.scrollWidth;
            const clientWidth = container.clientWidth;
            
            container.classList.toggle('scroll-start', scrollLeft === 0);
            container.classList.toggle('scroll-end', scrollLeft + clientWidth >= scrollWidth - 1);
        };

        container.addEventListener('scroll', updateIndicators);
        updateIndicators();
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        }
    }

    /**
     * 销毁模块
     */
    destroy() {
        this.hide();
        this.hideTooltip();
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
        this.isOpen = false;
    }
}

function closeSearchModal() {
    if (window.searchModule) {
        window.searchModule.hide();
    }
}

function handleSearch(event) {
    if (window.searchModule) {
        window.searchModule.handleSearch(event);
    }
}

function showSuggestions(value) {
    if (window.searchModule) {
        window.searchModule.showSuggestions(value);
    }
}

function togglePanel(type) {
    if (window.searchModule) {
        window.searchModule.togglePanel(type);
    }
}

function addCustomEngine() {
    if (window.searchModule) {
        window.searchModule.addCustomEngine();
    }
}

// 确保只初始化一次
if (!window.searchModule || !(window.searchModule instanceof SearchModule)) {
    window.searchModule = new SearchModule();
}