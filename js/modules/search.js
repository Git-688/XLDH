class NewSearchModule {
    constructor() {
        if (window.newSearchModule) return window.newSearchModule;

        this.engines = [
            { key: 'baidu',   label: '百度',   url: 'https://www.baidu.com/s?wd=', icon: 'fas fa-search' },
            { key: 'google',  label: '谷歌',   url: 'https://www.google.com/search?q=', icon: 'fab fa-google' },
            { key: '360',     label: '360',    url: 'https://www.so.com/s?q=', icon: 'fas fa-shield-alt' },
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
        window.open(eng.url + encodeURIComponent(query), '_blank');
        this.addHistory(query);
        this.hide();
    }

    handleSearch(event) {
        if (event.key === 'Enter') this.submitSearch();
    }

    // ---------- 新增接口调用 ----------
    async fetchBaiduSuggestions(query) {
        const apiBase = window.APP_CONFIG?.API_BASE || 'https://api.xjdh688.ccwu.cc';
        const url = `${apiBase}/search/suggest?q=${encodeURIComponent(query)}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const data = await resp.json();
            return data.code === 200 && Array.isArray(data.data) ? data.data : [];
        } catch { return []; }
    }

    async fetchRelatedSearches(query) {
        const apiBase = window.APP_CONFIG?.API_BASE || 'https://api.xjdh688.ccwu.cc';
        const url = `${apiBase}/search/related?q=${encodeURIComponent(query)}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const data = await resp.json();
            return data.code === 200 && Array.isArray(data.data) ? data.data : [];
        } catch { return []; }
    }

    // ---------- 核心改动：并发获取联想词 + 相关搜索，并合并渲染 ----------
    showSuggestions() {
        const q = this.input.value.trim();
        if (!q) { this.clearSuggestions(); return; }
        clearTimeout(this.suggestTimer);
        this.suggestTimer = setTimeout(async () => {
            // 并发请求两个接口
            const [words, related] = await Promise.all([
                this.fetchBaiduSuggestions(q),
                this.fetchRelatedSearches(q)
            ]);
            this.renderAllSuggestions(words, related);
        }, 300);
    }

    // 统一渲染联想词和相关搜索
    renderAllSuggestions(words, related) {
        if (!this.suggestionsContainer) return;

        // 两条数据都为空时清空并隐藏
        if ((!words || words.length === 0) && (!related || related.length === 0)) {
            this.clearSuggestions();
            return;
        }

        let html = '';

        // 1. 联想词部分
        if (words && words.length > 0) {
            html += words.map(w =>
                `<div class="suggestion-item" data-type="suggest">${this.escapeHtml(w)}</div>`
            ).join('');
        }

        // 2. 相关搜索部分（如果存在）
        if (related && related.length > 0) {
            html += '<div class="suggestion-divider">— 相关搜索 —</div>';
            html += related.map(r =>
                `<div class="suggestion-item related-item" data-type="related">${this.escapeHtml(r)}</div>`
            ).join('');
        }

        this.suggestionsContainer.innerHTML = html;
        this.suggestionsContainer.classList.add('active');

        // 绑定点击事件：点击任意一个词都填入搜索框并搜索
        const items = this.suggestionsContainer.querySelectorAll('.suggestion-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                this.input.value = item.textContent;
                this.clearSuggestions();
                this.submitSearch();
            });
        });
    }

    clearSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.innerHTML = '';
            this.suggestionsContainer.classList.remove('active');
        }
    }

    // 轻量转义（防止 XSS）
    escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ---------- 历史记录管理 ----------
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
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; } catch { return def; }
    }
    saveSetting(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.newSearchModule) new NewSearchModule();
});