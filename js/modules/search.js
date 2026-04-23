/**
 * 搜索模块 - 完整修复版
 * 1. 移除内联 transform 干扰
 * 2. 加入详细错误提示
 * 3. 保留自动初始化确保 searchModule 存在
 */
class SearchModule {
    constructor() {
        if (window.searchModule && window.searchModule instanceof SearchModule) {
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
        window.searchModule = this;
    }

    init() {
        this.createTooltip();
        this.bindGlobalEvents();
    }

    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'engine-tooltip';
        document.body.appendChild(this.tooltip);
    }

    bindGlobalEvents() {
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                this.isModalOpen() ? this.hide() : this.showModal();
            }
            if (event.key === 'Escape' && this.isModalOpen()) this.hide();
        });

        document.addEventListener('click', (event) => {
            const modal = document.getElementById('searchModal');
            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn && searchBtn.contains(event.target)) return;
            if (modal && modal.classList.contains('active') && !modal.contains(event.target)) {
                this.hide();
            }
        });

        window.addEventListener('resize', () => {
            if (this.isModalOpen()) this.positionModal();
        });
    }

    positionModal() {
        const modal = document.getElementById('searchModal');
        if (!modal) return;
        modal.style.top = '60px';
        if (window.innerWidth > 768) {
            modal.style.right = '20px';
            modal.style.left = 'auto';
        } else {
            modal.style.left = '50%';
            modal.style.right = 'auto';
        }
    }

    showModal() {
        try {
            const modal = document.getElementById('searchModal');
            if (!modal) {
                throw new Error('搜索模态框未在页面中找到');
            }

            // 关闭其他浮层
            if (window.sidebar?.isVisible()) window.sidebar.hide();
            if (window.app?.components?.navbar) window.app.components.navbar.hideMusicPlayer();

            this.positionModal();
            modal.style.display = 'block';
            requestAnimationFrame(() => {
                modal.classList.add('active');
            });

            this.renderEngines();
            this.focusSearchInput();
            this.isOpen = true;

            if (window.app) window.app.registerModal(this);
        } catch (error) {
            console.error('打开搜索模态框失败:', error);
            if (window.toast) window.toast.show('搜索打开失败: ' + error.message, 'error');
        }
    }

    hide() {
        const modal = document.getElementById('searchModal');
        if (!modal) return;

        modal.classList.remove('active');
        const onEnd = () => {
            modal.style.display = 'none';
            modal.removeEventListener('transitionend', onEnd);
        };
        modal.addEventListener('transitionend', onEnd, { once: true });
        setTimeout(() => {
            if (!modal.classList.contains('active') && modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        }, 300);

        this.clearSearchInput();
        this.hideSuggestions();
        this.hidePanels();
        this.hideTooltip();
        this.isOpen = false;

        if (window.app) window.app.unregisterModal(this);
    }

    isModalOpen() {
        return this.isOpen;
    }

    renderEngines() {
        const container = document.getElementById('engineSelector');
        if (!container) return;
        container.innerHTML = '';
        Object.entries(this.searchEngines).forEach(([key, engine]) => {
            const btn = document.createElement('button');
            btn.className = `engine-btn ${key === this.currentEngine ? 'active' : ''}`;
            btn.dataset.engine = key;
            btn.dataset.name = engine.name;
            btn.innerHTML = engine.iconType === 'url' 
                ? `<img src="${engine.icon}" alt="${engine.name}" loading="lazy">` 
                : `<i class="${engine.icon}"></i>`;
            this.setupTooltipEvents(btn, engine.name);
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectEngine(key);
            });
            container.appendChild(btn);
        });
        this.updateScrollIndicators();
    }

    setupTooltipEvents(element, name) {
        element.addEventListener('mouseenter', (e) => {
            if (!this.isMobile()) this.showTooltip(element, name, e.clientX, e.clientY);
        });
        element.addEventListener('mouseleave', () => { if (!this.isMobile()) this.hideTooltip(); });
        element.addEventListener('mousemove', (e) => {
            if (!this.isMobile()) this.updateTooltipPosition(e.clientX, e.clientY);
        });
        let timer;
        element.addEventListener('touchstart', (e) => {
            if (this.isMobile()) {
                e.preventDefault();
                this.showTooltip(element, name, e.touches[0].clientX, e.touches[0].clientY);
                timer = setTimeout(() => this.hideTooltip(), 2000);
            }
        });
        element.addEventListener('touchend', () => { if (this.isMobile()) clearTimeout(timer); });
    }

    isMobile() {
        return window.matchMedia?.('(hover: none)').matches;
    }

    showTooltip(element, name, clientX, clientY) {
        clearTimeout(this.tooltipTimeout);
        this.tooltip.textContent = name;
        this.tooltip.classList.add('visible');
        const rect = element.getBoundingClientRect();
        const tipRect = this.tooltip.getBoundingClientRect();
        const vh = window.innerHeight;

        let top, cls = '';
        if (rect.top > tipRect.height + 8) {
            top = rect.top - 6;
        } else if (vh - rect.bottom > tipRect.height + 8) {
            top = rect.bottom + 6;
            cls = 'below';
        } else {
            top = rect.top + rect.height/2 - tipRect.height/2;
            cls = 'right';
        }

        let left = rect.left + rect.width/2;
        left = Math.max(tipRect.width/2 + 4, Math.min(left, window.innerWidth - tipRect.width/2 - 4));
        if (cls === 'right') {
            left = rect.right + 6;
            if (left + tipRect.width > window.innerWidth - 6) left = rect.left - tipRect.width - 6;
        }

        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
        this.tooltip.classList.toggle('below', cls === 'below');
        this.tooltip.classList.toggle('right', cls === 'right');
        this.tooltipTimeout = setTimeout(() => this.hideTooltip(), 2000);
    }

    hideTooltip() {
        clearTimeout(this.tooltipTimeout);
        this.tooltip?.classList.remove('visible', 'below', 'right');
    }

    updateTooltipPosition(clientX, clientY) {
        if (!this.tooltip?.classList.contains('visible') || this.isMobile()) return;
        const rect = this.tooltip.getBoundingClientRect();
        let left = clientX, top = clientY - 30;
        left = Math.max(rect.width/2 + 4, Math.min(left, window.innerWidth - rect.width/2 - 4));
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
    }

    selectEngine(key) {
        this.currentEngine = key;
        localStorage.setItem('currentEngine', key);
        this.renderEngines();
        this.focusSearchInput();
    }

    addCustomEngine() {
        const name = document.getElementById('customName')?.value.trim();
        const url = document.getElementById('customUrl')?.value.trim();
        const icon = document.getElementById('customIcon')?.value.trim();
        if (!name || !url || !url.includes('%s')) {
            window.toast.show('请完整填写，URL 需含 %s', 'warning');
            return;
        }
        const key = 'custom_' + Date.now();
        this.searchEngines[key] = { name, url, icon: icon || 'fas fa-search', iconType: icon?.startsWith('http') ? 'url' : 'fontawesome' };
        localStorage.setItem('searchEngines', JSON.stringify(this.searchEngines));
        this.renderEngines();
        ['customName','customUrl','customIcon'].forEach(id => document.getElementById(id).value = '');
        this.togglePanel('settings');
        window.toast.show('自定义引擎添加成功', 'success');
    }

    saveHistory(query) {
        if (!query) return;
        this.searchHistory = [query, ...this.searchHistory.filter(h => h !== query)].slice(0, 15);
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }

    renderHistory() {
        const panel = document.getElementById('historyPanel');
        if (!panel) return;
        panel.innerHTML = this.searchHistory.length
            ? this.searchHistory.map(h => `
                <div class="history-item" onclick="window.searchModule.searchFromHistory('${h.replace(/'/g,"\\'")}')">
                    <span>${h}</span>
                    <i class="fas fa-times delete-history" onclick="window.searchModule.deleteHistory('${h.replace(/'/g,"\\'")}', event)"></i>
                </div>`).join('')
            : '<div style="text-align:center;color:var(--text-secondary);font-size:0.75rem;padding:0.5rem;">暂无搜索历史</div>';
    }

    searchFromHistory(q) { document.getElementById('searchInput').value = q; this.togglePanel('history'); this.focusSearchInput(); }
    deleteHistory(q, e) { e.stopPropagation(); this.searchHistory = this.searchHistory.filter(h => h !== q); localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory)); this.renderHistory(); }

    showSuggestions(value) {
        const sug = document.getElementById('suggestions');
        if (!sug) return;
        if (!value) { sug.classList.remove('active'); return; }
        const items = this.searchHistory.filter(h => h.includes(value)).slice(0, 4);
        if (!items.length) { sug.classList.remove('active'); return; }
        sug.innerHTML = items.map(s => `<div class="suggestion-item" onclick="window.searchModule.selectSuggestion('${s.replace(/'/g,"\\'")}')">${s}</div>`).join('');
        sug.classList.add('active');
    }

    selectSuggestion(v) { document.getElementById('searchInput').value = v; this.hideSuggestions(); }
    hideSuggestions() { document.getElementById('suggestions')?.classList.remove('active'); }

    togglePanel(type) {
        const hist = document.getElementById('historyPanel'), sett = document.getElementById('settingsPanel');
        if (type === 'history') {
            hist?.classList.toggle('active'); sett?.classList.remove('active'); this.renderHistory();
        } else {
            sett?.classList.toggle('active'); hist?.classList.remove('active');
        }
    }

    hidePanels() {
        document.getElementById('historyPanel')?.classList.remove('active');
        document.getElementById('settingsPanel')?.classList.remove('active');
    }

    handleSearch(e) {
        if (e.key !== 'Enter') return;
        const query = document.getElementById('searchInput')?.value.trim();
        if (!query) return;
        const url = this.searchEngines[this.currentEngine].url.replace('%s', encodeURIComponent(query));
        window.open(url, '_blank');
        this.saveHistory(query);
        this.hide();
    }

    search(query, engine) {
        if (engine) this.currentEngine = engine;
        if (query) {
            window.open(this.searchEngines[this.currentEngine].url.replace('%s', encodeURIComponent(query)), '_blank');
            this.saveHistory(query);
        }
    }

    focusSearchInput() {
        const input = document.getElementById('searchInput');
        input?.focus(); input?.select();
    }

    clearSearchInput() { const i = document.getElementById('searchInput'); if (i) i.value = ''; }

    updateScrollIndicators() {
        const container = document.getElementById('engineSelector');
        if (!container) return;
        const check = () => {
            const sl = container.scrollLeft, sw = container.scrollWidth, cw = container.clientWidth;
            container.classList.toggle('scroll-start', sl === 0);
            container.classList.toggle('scroll-end', sl + cw >= sw - 1);
        };
        container.addEventListener('scroll', check);
        check();
    }

    destroy() {
        this.hide();
        this.hideTooltip();
        this.tooltip?.remove();
        this.isOpen = false;
    }
}

// 全局快捷函数
function closeSearchModal() { window.searchModule?.hide(); }
function handleSearch(event) { window.searchModule?.handleSearch(event); }
function showSuggestions(value) { window.searchModule?.showSuggestions(value); }
function togglePanel(type) { window.searchModule?.togglePanel(type); }
function addCustomEngine() { window.searchModule?.addCustomEngine(); }

// 自动创建实例（若 App 未接管）
if (!window.searchModule) new SearchModule();