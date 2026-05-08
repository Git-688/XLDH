class NewSearchModule {
    constructor() {
        if (window.newSearchModule) return window.newSearchModule;
        this.engines = [
            { key: 'baidu', label: '百度', url: 'https://www.baidu.com/s?wd=', icon: 'fas fa-search' },
            { key: 'google', label: '谷歌', url: 'https://www.google.com/search?q=', icon: 'fab fa-google' },
            { key: '360', label: '360', url: 'https://www.so.com/s?q=', icon: 'fas fa-shield-alt' },
            { key: 'douyin', label: '抖音', url: 'https://www.douyin.com/search/', icon: 'fas fa-music' }
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
        this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.hide(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) this.hide(); });
        if (this.triggerBtn) {
            this.triggerBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleDropdown(); });
        }
        if (this.dropdown) {
            this.dropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.engine-dropdown-item');
                if (item) { this.setEngine(item.dataset.key); this.closeDropdown(); }
            });
        }
        const submitBtn = this.modal.querySelector('.search-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => { e.preventDefault(); this.submitSearch(); });
        }
        if (this.input) {
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); this.submitSearch(); }
            });
            this.input.addEventListener('input', () => this.showSuggestions());
        }
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => {
                this.history = [];
                this.saveSetting('searchHistory2', this.history);
                this.renderHistory();
            });
        }
        document.addEventListener('click', (e) => {
            if (this.dropdown && !this.dropdown.contains(e.target) &&
                e.target !== this.triggerBtn && !this.triggerBtn.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    toggle() { this.isOpen ? this.hide() : this.show(); }
    show() { /* ... 原完整方法 ... */ }
    hide() { /* ... 原完整方法 ... */ }
    // 其他辅助方法（submitSearch、showSuggestions 等）与之前修改的完整版本一致
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.newSearchModule) new NewSearchModule();
});