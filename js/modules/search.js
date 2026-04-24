class NewSearchModule {
    constructor() {
        if (window.newSearchModule) return window.newSearchModule;
        // 引擎列表
        this.engines = [
            { key: 'baidu',   label: '百度',   url: 'https://www.baidu.com/s?wd=', icon: 'fas fa-search' },
            { key: 'google',  label: '谷歌',   url: 'https://www.google.com/search?q=', icon: 'fab fa-google' },
            { key: '360',     label: '360',    url: 'https://www.so.com/s?q=', icon: 'fas fa-shield-alt' },
            { key: 'douyin',  label: '抖音',   url: 'https://www.douyin.com/search/', icon: 'fas fa-music' },
            { key: 'all',     label: '全网',   url: 'https://www.baidu.com/s?wd=', icon: 'fas fa-globe' }
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
        // 遮罩关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.hide();
        });

        // 引擎触发按钮：切换下拉
        if (this.triggerBtn) {
            this.triggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // 点击页面其他位置关闭下拉
        document.addEventListener('click', (e) => {
            if (this.dropdown && !this.dropdown.contains(e.target) && e.target !== this.triggerBtn && !this.triggerBtn.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // 引擎下拉列表点击事件（委托）
        if (this.dropdown) {
            this.dropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.engine-dropdown-item');
                if (item) {
                    const key = item.dataset.key;
                    this.setEngine(key);
                    this.closeDropdown();
                }
            });
        }

        // 清除历史
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => {
                this.history = [];
                this.saveSetting('searchHistory2', this.history);
                this.renderHistory();
            });
        }
    }

    /** 打开/关闭模态框 */
    toggle() {
        this.isOpen ? this.hide() : this.show();
    }

    show() {
        if (!this.modal || this.isOpen) return;
        // 关闭其他浮层
        if (window.sidebar?.isVisible()) window.sidebar.hide();
        if (window.app?.components?.navbar?.hideMusicPlayer) window.app.components.navbar.hideMusicPlayer();
        this.modal.style.display = 'block';
        requestAnimationFrame(() => this.modal.classList.add('active'));
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
        const onEnd = () => {
            this.modal.style.display = 'none';
            this.modal.removeEventListener('transitionend', onEnd);
        };
        this.modal.addEventListener('transitionend', onEnd, { once: true });
        setTimeout(() => {
            if (!this.modal.classList.contains('active') && this.modal.style.display !== 'none') {
                this.modal.style.display = 'none';
            }
        }, 300);
        this.clearSuggestions();
        this.closeDropdown();
        this.isOpen = false;
        if (window.app) window.app.unregisterModal(this);
    }

    /** 引擎下拉 */
    renderDropdown() {
        if (!this.dropdown) return;
        this.dropdown.innerHTML = '';
        this.engines.forEach(eng => {
            const item = document.createElement('div');
            item.className = 'engine-dropdown-item';
            item.dataset.key = eng.key;
            item.innerHTML = `<i class="${eng.icon}"></i> ${eng.label}`;
            if (eng.key === this.currentEngine) item.classList.add('active');
            this.dropdown.appendChild(item);
        });
    }

    toggleDropdown() {
        if (!this.dropdown) return;
        if (this.dropdown.style.display === 'block') return this.closeDropdown();
        this.openDropdown();
    }

    openDropdown() {
        if (!this.dropdown) return;
        this.dropdown.style.display = 'block';
        requestAnimationFrame(() => this.dropdown.classList.add('active'));
    }

    closeDropdown() {
        if (!this.dropdown) return;
        this.dropdown.classList.remove('active');
        setTimeout(() => {
            if (this.dropdown && !this.dropdown.classList.contains('active')) {
                this.dropdown.style.display = 'none';
            }
        }, 200);
    }

    setEngine(key) {
        if (this.currentEngine === key) return;
        this.currentEngine = key;
        this.saveSetting('currentEngine2', key);
        this.updateTriggerIcon();
        this.renderDropdown();
    }

    updateTriggerIcon() {
        const eng = this.engines.find(e => e.key === this.currentEngine);
        if (this.engineIcon && eng) {
            this.engineIcon.className = eng.icon;
        }
    }

    /** 搜索 */
    submitSearch() {
        const query = this.input.value.trim();
        if (!query) {
            window.toast.show('请输入搜索内容', 'warning');
            return;
        }
        const eng = this.engines.find(e => e.key === this.currentEngine) || this.engines[0];
        const url = eng.url + encodeURIComponent(query);
        window.open(url, '_blank');
        this.addHistory(query);
        this.hide();
    }

    handleSearch(event) {
        if (event.key === 'Enter') this.submitSearch();
    }

    /** 百度联想词 */
    async fetchBaiduSuggestions(query) {
        const apiUrl = 'https://cn.apihz.cn/api/wangzhan/soubaiduxl.php';
        const params = new URLSearchParams({ id: '10014221', key: '4a7768de1cf2e0f41fc0a4005240c837', words: query });
        try {
            const resp = await fetch(`${apiUrl}?${params.toString()}`);
            if (!resp.ok) return [];
            const data = await resp.json();
            return data.code === 200 && Array.isArray(data.datas) ? data.datas : [];
        } catch (e) {
            console.error('联想词失败:', e);
            return [];
        }
    }

    showSuggestions() {
        const q = this.input.value.trim();
        if (!q) { this.clearSuggestions(); return; }
        clearTimeout(this.suggestTimer);
        this.suggestTimer = setTimeout(async () => {
            const words = await this.fetchBaiduSuggestions(q);
            this.renderSuggestions(words);
        }, 300);
    }

    renderSuggestions(words) {
        if (!this.suggestionsContainer) return;
        if (!words || words.length === 0) {
            this.suggestionsContainer.innerHTML = '';
            this.suggestionsContainer.classList.remove('active');
            return;
        }
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
    }

    /** 历史记录 */
    addHistory(query) {
        this.history = [query, ...this.history.filter(h => h !== query)].slice(0, this.maxHistory);
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
        try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : def; } catch { return def; }
    }

    saveSetting(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.newSearchModule) new NewSearchModule();
});