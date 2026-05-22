/**
 * 搜索模块 - 修复版（CSP 兼容，XSS 防护）
 * 默认直接实例化，无需等待 DOMContentLoaded
 */
class NewSearchModule {
    constructor() {
        if (window.newSearchModule) return window.newSearchModule;
        this.engines = [
            { key: 'baidu',   label: '百度',   url: 'https://www.baidu.com/s?wd=', icon: 'fas fa-search' },
            { key: 'google',  label: '谷歌',   url: 'https://www.google.com/search?q=', icon: 'fab fa-google' },
            { key: '360',     label: '360',    url: 'https://www.so.com/s?q=', icon: 'fas fa-shield-alt' },
            { key: 'douyin',  label: '抖音',   url: 'https://www.douyin.com/search/', icon: 'fas fa-music' }
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

        if (this.modal) {
            this.renderDropdown();
            this.renderHistory();
            this.updateTriggerIcon();
            this.bindEvents();

            if (this.input) {
                this.input.addEventListener('input', () => this.showSuggestions());
                this.input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') this.submitSearch();
                });
            }

            const searchSubmit = this.modal.querySelector('.search-submit-btn');
            if (searchSubmit) searchSubmit.addEventListener('click', () => this.submitSearch());

            window.newSearchModule = this;
        }
    }

    loadSetting(key, def) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; } catch { return def; }
    }
    saveSetting(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderDropdown() {
        if (!this.dropdown) return;
        this.dropdown.innerHTML = this.engines.map(eng =>
            `<div class="engine-dropdown-item${eng.key === this.currentEngine ? ' active' : ''}" data-key="${eng.key}">
                <i class="${eng.icon}"></i> ${this.escapeHtml(eng.label)}
            </div>`
        ).join('');
    }

    renderHistory() {
        if (!this.historyList) return;
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<div class="history-empty">暂无搜索记录</div>';
            return;
        }
        this.historyList.innerHTML = this.history.map(q =>
            `<div class="history-item">
                <span class="history-text">${this.escapeHtml(q)}</span>
                <i class="fas fa-times delete-history"></i>
            </div>`
        ).join('');

        this.historyList.querySelectorAll('.history-text').forEach(el => {
            el.addEventListener('click', () => {
                this.input.value = el.textContent;
                this.submitSearch();
            });
        });
        this.historyList.querySelectorAll('.delete-history').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = el.parentNode.querySelector('.history-text').textContent;
                this.removeHistory(text);
            });
        });
    }

    removeHistory(query) {
        this.history = this.history.filter(q => q !== query);
        this.saveSetting('searchHistory2', this.history);
        this.renderHistory();
    }

    updateTriggerIcon() {
        const eng = this.engines.find(e => e.key === this.currentEngine);
        if (this.engineIcon && eng) this.engineIcon.className = eng.icon;
    }

    bindEvents() {
        this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.hide(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) this.hide(); });
        if (this.triggerBtn) this.triggerBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleDropdown(); });
        if (this.dropdown) {
            this.dropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.engine-dropdown-item');
                if (item) { this.setEngine(item.dataset.key); this.closeDropdown(); }
            });
        }
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => {
                this.history = [];
                this.saveSetting('searchHistory2', []);
                this.renderHistory();
            });
        }
        document.addEventListener('click', (e) => {
            if (this.dropdown && this.dropdown.classList.contains('active') && e.target !== this.triggerBtn) this.closeDropdown();
        });
    }

    toggle() { this.isOpen ? this.hide() : this.show(); }

    show() {
        if (!this.modal || this.isOpen) return;
        if (window.sidebar?.isVisible()) window.sidebar.hide();
        this.modal.classList.add('active');
        this.isOpen = true;
        this.input.value = '';
        this.input.focus();
        this.renderHistory();
        this.clearSuggestions();
        this.closeDropdown();
    }

    hide() {
        if (!this.modal || !this.isOpen) return;
        this.modal.classList.remove('active');
        this.isOpen = false;
        this.clearSuggestions();
        this.closeDropdown();
    }

    setEngine(key) {
        this.currentEngine = key;
        this.saveSetting('currentEngine2', key);
        this.updateTriggerIcon();
        this.renderDropdown();
    }

    toggleDropdown() { this.dropdown.classList.contains('active') ? this.closeDropdown() : this.openDropdown(); }
    openDropdown() { this.dropdown.classList.add('active'); }
    closeDropdown() { this.dropdown.classList.remove('active'); }

    submitSearch() {
        const query = this.input.value.trim();
        if (!query) return;
        const eng = this.engines.find(e => e.key === this.currentEngine);
        window.open(eng.url + encodeURIComponent(query), '_blank');
        this.history = [query, ...this.history.filter(q => q !== query)].slice(0, this.maxHistory);
        this.saveSetting('searchHistory2', this.history);
        this.hide();
    }

    async fetchSuggestions(type, query) {
        const apiBase = window.APP_CONFIG?.API_BASE || 'https://api.xjdh688.ccwu.cc';
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const resp = await fetch(`${apiBase}/search/${type}?q=${encodeURIComponent(query)}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!resp.ok) return [];
            const data = await resp.json();
            return data.code === 200 && Array.isArray(data.data) ? data.data : [];
        } catch { return []; }
    }

    showSuggestions() {
        const q = this.input.value.trim();
        if (!q) { this.clearSuggestions(); return; }
        clearTimeout(this.suggestTimer);
        this.suggestTimer = setTimeout(async () => {
            const [words, related] = await Promise.all([
                this.fetchSuggestions('suggest', q),
                this.fetchSuggestions('related', q)
            ]);
            this.renderAllSuggestions(words, related);
        }, 300);
    }

    renderAllSuggestions(words, related) {
        if (!this.suggestionsContainer) return;
        let html = '';
        if (words && words.length > 0) {
            html += words.map(w => `<div class="suggestion-item">${this.escapeHtml(w)}</div>`).join('');
        }
        if (related && related.length > 0) {
            html += '<div style="text-align:center;color:var(--text-secondary);font-size:11px;padding:10px 0 6px;letter-spacing:1px;opacity:0.8;">— 相关搜索 —</div>';
            html += related.map(r => `<div class="suggestion-item related-item">${this.escapeHtml(r)}</div>`).join('');
        }
        this.suggestionsContainer.innerHTML = html;
        this.suggestionsContainer.classList.add('active');
        this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
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
}

// 直接创建实例
if (document.readyState !== 'loading') {
    new NewSearchModule();
} else {
    document.addEventListener('DOMContentLoaded', () => new NewSearchModule());
}