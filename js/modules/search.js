class NewSearchModule {
    constructor() {
        if (window.newSearchModule) return window.newSearchModule;

        this.engines = [
            { key: 'baidu',   label: '百度',   url: 'https://www.baidu.com/s?wd=', icon: 'fas fa-search' },
            { key: 'google',  label: '谷歌',   url: 'https://www.google.com/search?q=', icon: 'fab fa-google' },
            { key: '360',     label: '360',    url: 'https://www.so.com/s?q=', icon: 'fas fa-shield-alt' },
            // 【修复1】抖音搜索URL改为正确的搜索接口
            { key: 'douyin',  label: '抖音',   url: 'https://www.douyin.com/search/', icon: 'fas fa-music' },
            { key: 'all',     label: '全网',   url: 'https://api.pearktrue.cn/api/universalsearch/', icon: 'fas fa-globe' }
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

    // ========== 事件绑定 ==========
    bindEvents() {
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hide();
            }
        });

        if (this.triggerBtn) {
            this.triggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        document.addEventListener('click', (e) => {
            if (this.dropdown && !this.dropdown.contains(e.target) &&
                e.target !== this.triggerBtn && !this.triggerBtn.contains(e.target)) {
                this.closeDropdown();
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

        // 输入框事件
        if (this.input) {
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submitSearch();
                }
            });
            this.input.addEventListener('input', () => {
                this.showSuggestions();
            });
        }

        // 提交按钮
        const submitBtn = document.querySelector('.search-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitSearch();
            });
        }
    }

    toggle() { this.isOpen ? this.hide() : this.show(); }

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
    }

    hide() {
        if (!this.modal || !this.isOpen) return;
        this.modal.classList.remove('active');
        this.isOpen = false;
        this.clearSuggestions();
        this.closeDropdown();

        if (window.app) window.app.unregisterModal(this);
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

        // 【修复1】抖音搜索URL需要额外参数才能正确搜索
        let searchUrl = eng.url + encodeURIComponent(query);
        if (eng.key === 'douyin') {
            searchUrl += '?type=general'; // 添加类型参数避免跳首页
        }
        window.open(searchUrl, '_blank');
        this.addHistory(query);
        this.hide();
    }

    addHistory(query) {
        this.history = this.history.filter(h => h !== query);
        this.history.unshift(query);
        if (this.history.length > this.maxHistory) this.history = this.history.slice(0, this.maxHistory);
        this.saveSetting('searchHistory2', this.history);
    }

    // ========== 搜索建议 ==========
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

    showSuggestions() {
        const q = this.input.value.trim();
        if (!q) { this.clearSuggestions(); return; }
        clearTimeout(this.suggestTimer);
        // 【修复3】防抖延迟从300ms提高到500ms，减少请求频率
        this.suggestTimer = setTimeout(async () => {
            const words = await this.fetchBaiduSuggestions(q);
            // 防止输入已清空后过期响应仍更新UI
            if (this.input.value.trim() !== q) return;
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

    // 【修复6】清空建议时同时取消未执行的定时器，并检查是否已清空
    clearSuggestions() {
        clearTimeout(this.suggestTimer);
        this.suggestTimer = null;
        if (this.suggestionsContainer) {
            this.suggestionsContainer.innerHTML = '';
            this.suggestionsContainer.classList.remove('active');
        }
    }

    // ========== 历史记录 ==========
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
            item.innerHTML = `<span class="history-text">${this.escapeHtml(query)}</span><i class="fas fa-times delete-history"></i>`;
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

    // ========== 工具方法 ==========
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 已内置try-catch，禁用localStorage时不会报错
    loadSetting(key, def) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; } catch { return def; }
    }
    saveSetting(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.newSearchModule) new NewSearchModule();
});