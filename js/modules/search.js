class NewSearchModule {
    constructor() {
        if (window.newSearchModule) return window.newSearchModule;
        // 新增：内存兜底存储，兼容浏览器禁用localStorage场景
        this.memoryStorage = {};
        this.engines = [
            { key: 'baidu',   label: '百度',   url: 'https://www.baidu.com/s?wd=', icon: 'fas fa-search' },
            { key: 'google',  label: '谷歌',   url: 'https://www.google.com/search?q=', icon: 'fab fa-google' },
            { key: '360',     label: '360',    url: 'https://www.so.com/s?q=', icon: 'fas fa-shield-alt' },
            // 修复：抖音搜索正确传参地址，解决跳转无结果问题
            { key: 'douyin',  label: '抖音',   url: 'https://www.douyin.com/search/?keyword=', icon: 'fas fa-music' },
            // 修复：全网搜索更换为可直接跳转的聚合搜索地址，解决原API跳转JSON页面问题
            { key: 'all',     label: '全网',   url: 'https://www.bing.com/search?q=', icon: 'fas fa-globe' }
        ];
        this.currentEngine = this.loadSetting('currentEngine2', 'baidu');
        this.history = this.loadSetting('searchHistory2', []);
        this.maxHistory = 20;
        this.modal = document.getElementById('searchModal');
        this.input = document.getElementById('searchInput');
        this.triggerBtn = document.getElementById('engineTriggerBtn');
        this.engineIcon = document.getElementById('engineIcon');
        this.dropdown = document.getElementById('engineDropdown');
        this.suggestionsContainer = document.getElementById('suggestions');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistory');
        this.isOpen = false;
        this.suggestTimer = null;
        this.init();
        window.newSearchModule = this;
    }

    init() {
        if (!this.modal) return;
        this.renderDropdown();
        this.renderHistory();
        this.updateTriggerIcon();
        this.bindEvents();
    }

    bindEvents() {
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.hide();
        });

        if (this.triggerBtn) {
            this.triggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        document.addEventListener('click', (e) => {
            // 原有引擎下拉框关闭逻辑
            if (this.dropdown && !this.dropdown.contains(e.target) &&
                e.target !== this.triggerBtn && !this.triggerBtn.contains(e.target)) {
                this.closeDropdown();
            }
            // 新增：点击非联想词区域关闭联想弹窗，解决弹窗常驻问题
            if (this.suggestionsContainer && !this.suggestionsContainer.contains(e.target) &&
                e.target !== this.input && !this.input.contains(e.target)) {
                this.clearSuggestions();
            }
        });

        if (this.dropdown) {
            this.dropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.engine-dropdown-item');
                if (item) {
                    this.setEngine(item.dataset.key);
                    this.closeDropdown();
                }
            });
        }

        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => {
                this.history = [];
                this.saveSetting('searchHistory2', this.history);
                this.renderHistory();
            });
        }

        // ========== 新增：搜索输入框核心事件绑定，修复回车不提交、无联想词核心问题 ==========
        if (this.input) {
            // 回车触发搜索提交
            this.input.addEventListener('keydown', (e) => this.handleSearch(e));
            // 输入内容触发联想词
            this.input.addEventListener('input', () => this.showSuggestions());
            // 输入框聚焦重新显示联想词
            this.input.addEventListener('focus', () => this.showSuggestions());
            // 失焦延迟关闭联想词，避免点击联想项时先失焦导致点击失效
            this.input.addEventListener('blur', () => setTimeout(() => this.clearSuggestions(), 200));
        }
    }

    toggle() {
        this.isOpen ? this.hide() : this.show();
    }

    show() {
        if (!this.modal || this.isOpen) return;
        if (window.sidebar?.isVisible()) window.sidebar.hide();
        if (window.app?.components?.navbar?.hideMusicPlayer) window.app.components.navbar.hideMusicPlayer();
        this.modal.classList.add('active');
        this.isOpen = true;
        this.input.value = '';
        this.input.focus();
        this.renderHistory();
        this.clearSuggestions();
        this.closeDropdown();
        if (window.app) window.app.registerModal(this);
        // 新增：锁定页面背景滚动，解决滚动穿透问题
        document.body.style.overflow = 'hidden';
    }

    hide() {
        if (!this.modal || !this.isOpen) return;
        this.modal.classList.remove('active');
        this.isOpen = false;
        this.clearSuggestions();
        this.closeDropdown();
        if (window.app) window.app.unregisterModal(this);
        // 新增：解除页面背景滚动锁定
        document.body.style.overflow = '';
    }

    renderDropdown() {
        if (!this.dropdown) return;
        this.dropdown.innerHTML = '';
        this.engines.forEach(eng => {
            const el = document.createElement('div');
            el.className = 'engine-dropdown-item' + (eng.key === this.currentEngine ? ' active' : '');
            el.dataset.key = eng.key;
            el.innerHTML = `<i class="${eng.icon}"></i> ${eng.label}`;
            this.dropdown.appendChild(el);
        });
    }

    toggleDropdown() {
        if (!this.dropdown) return;
        this.dropdown.classList.contains('active') ? this.closeDropdown() : this.openDropdown();
    }

    openDropdown() { if (this.dropdown) this.dropdown.classList.add('active'); }
    closeDropdown() { if (this.dropdown) this.dropdown.classList.remove('active'); }

    setEngine(key) {
        if (this.currentEngine === key) return;
        this.currentEngine = key;
        this.saveSetting('currentEngine2', key);
        this.updateTriggerIcon();
        this.renderDropdown();
    }

    updateTriggerIcon() {
        const eng = this.engines.find(e => e.key === this.currentEngine);
        if (this.engineIcon && eng) this.engineIcon.className = eng.icon;
    }

    submitSearch() {
        const query = this.input.value.trim();
        if (!query) { window.toast.show('请输入搜索内容', 'warning'); return; }
        const eng = this.engines.find(e => e.key === this.currentEngine) || this.engines[0];
        window.open(eng.url + encodeURIComponent(query), '_blank');
        this.addHistory(query);
        this.hide();
    }

    handleSearch(event) {
        if (event.key === 'Enter') this.submitSearch();
    }

    // 使用 Worker 代理的联想词接口
    async fetchBaiduSuggestions(query) {
        const apiBase = window.APP_CONFIG?.API_BASE || 'https://api.xjdh688.ccwu.cc';
        const url = `${apiBase}/search/suggest?q=${encodeURIComponent(query)}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const data = await resp.json();
            return data.code === 200 && Array.isArray(data.data) ? data.data : [];
        } catch {
            return [];
        }
    }

    // 新增：相关搜索内容（备用）
    async fetchRelatedSearches(query) {
        const apiBase = window.APP_CONFIG?.API_BASE || 'https://api.xjdh688.ccwu.cc';
        const url = `${apiBase}/search/related?q=${encodeURIComponent(query)}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const data = await resp.json();
            return data.code === 200 && Array.isArray(data.data) ? data.data : [];
        } catch {
            return [];
        }
    }

    showSuggestions() {
        const q = this.input.value.trim();
        if (!q) { this.clearSuggestions(); return; }
        clearTimeout(this.suggestTimer);
        // 优化：防抖时长从300ms调整为500ms，降低接口请求频率，避免触发限流
        this.suggestTimer = setTimeout(async () => {
            const words = await this.fetchBaiduSuggestions(q);
            this.renderSuggestions(words);
        }, 500);
    }

    renderSuggestions(words) {
        if (!this.suggestionsContainer) return;
        if (!words || words.length === 0) { this.clearSuggestions(); return; }
        this.suggestionsContainer.innerHTML = '';
        words.forEach(w => {
            const el = document.createElement('div');
            el.className = 'suggestion-item';
            el.textContent = w;
            el.addEventListener('click', () => {
                this.input.value = w;
                this.clearSuggestions();
                this.submitSearch();
            });
            this.suggestionsContainer.appendChild(el);
        });
        this.suggestionsContainer.classList.add('active');
    }

    clearSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.innerHTML = '';
            this.suggestionsContainer.classList.remove('active');
        }
        clearTimeout(this.suggestTimer);
    }

    addHistory(query) {
        this.history = this.history.filter(h => h !== query);
        this.history.unshift(query);
        if (this.history.length > this.maxHistory) this.history = this.history.slice(0, this.maxHistory);
        this.saveSetting('searchHistory2', this.history);
    }

    renderHistory() {
        if (!this.historyList) return;
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<div class="history-empty">暂无搜索记录</div>';
            return;
        }
        this.historyList.innerHTML = '';
        this.history.forEach(query => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `<span class="history-text">${query}</span><i class="fas fa-times delete-history"></i>`;
            item.querySelector('.history-text').addEventListener('click', () => {
                this.input.value = query;
                this.submitSearch();
            });
            item.querySelector('.delete-history').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeHistory(query);
            });
            this.historyList.appendChild(item);
        });
    }

    removeHistory(query) {
        this.history = this.history.filter(h => h !== query);
        this.saveSetting('searchHistory2', this.history);
        this.renderHistory();
    }

    loadSetting(key, def) {
        try { 
            const raw = localStorage.getItem(key); 
            return raw ? JSON.parse(raw) : def; 
        } catch { 
            // 修复：禁用localStorage时，从内存兜底存储读取数据
            return this.memoryStorage[key] || def; 
        }
    }

    saveSetting(key, value) {
        try { 
            localStorage.setItem(key, JSON.stringify(value)); 
        } catch {
            // 修复：禁用localStorage时，写入内存兜底存储
            this.memoryStorage[key] = value;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.newSearchModule) new NewSearchModule();
});
