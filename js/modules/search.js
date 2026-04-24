/**
 * 全新搜索模块 - 简洁版
 * 支持：百度、谷歌、360、抖音、全网引擎
 * 百度搜索下拉联想词 API
 * 本地历史记录
 */
class NewSearchModule {
    constructor() {
        if (window.newSearchModule) return window.newSearchModule;

        // 引擎配置：key, label, url, iconClass
        this.engines = [
            { key: 'baidu',   label: '百度',   url: 'https://www.baidu.com/s?wd=', icon: 'fas fa-search' },
            { key: 'google',  label: '谷歌',   url: 'https://www.google.com/search?q=', icon: 'fab fa-google' },
            { key: '360',     label: '360',    url: 'https://www.so.com/s?q=', icon: 'fas fa-shield-alt' },
            { key: 'douyin',  label: '抖音',   url: 'https://www.douyin.com/search/', icon: 'fas fa-music' },
            { key: 'all',     label: '全网',   url: 'https://www.baidu.com/s?wd=', icon: 'fas fa-globe' } // 全网默认调用百度
        ];

        this.currentEngine = this.loadSetting('currentEngine2', 'baidu');
        this.history = this.loadSetting('searchHistory2', []);
        this.maxHistory = 20;

        this.modal = document.getElementById('searchModal');
        this.input = document.getElementById('searchInput');
        this.enginesContainer = document.getElementById('searchEngines');
        this.suggestionsContainer = document.getElementById('suggestions');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistory');

        this.isOpen = false;
        this.suggestTimer = null;

        this.init();
        window.newSearchModule = this;
    }

    /** 初始化：渲染引擎和历史 */
    init() {
        if (!this.modal) return;
        this.renderEngines();
        this.renderHistory();
        this.bindEvents();
    }

    /** 绑定全局事件 */
    bindEvents() {
        // 点击遮罩关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.hide();
        });

        // 清除历史按钮
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => {
                this.history = [];
                this.saveSetting('searchHistory2', this.history);
                this.renderHistory();
            });
        }

        // 引擎切换（事件委托）
        if (this.enginesContainer) {
            this.enginesContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.engine-btn');
                if (!btn) return;
                const engine = btn.dataset.engine;
                if (engine) {
                    this.setEngine(engine);
                }
            });
        }
    }

    /** 渲染引擎按钮 */
    renderEngines() {
        if (!this.enginesContainer) return;
        this.enginesContainer.innerHTML = '';
        this.engines.forEach(eng => {
            const btn = document.createElement('button');
            btn.className = 'engine-btn' + (eng.key === this.currentEngine ? ' active' : '');
            btn.dataset.engine = eng.key;
            btn.innerHTML = `<i class="${eng.icon}"></i> ${eng.label}`;
            this.enginesContainer.appendChild(btn);
        });
    }

    /** 切换引擎 */
    setEngine(key) {
        if (this.currentEngine === key) return;
        this.currentEngine = key;
        this.saveSetting('currentEngine2', key);
        this.renderEngines();
    }

    /** 读取本地存储 */
    loadSetting(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /** 保存到本地存储 */
    saveSetting(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('保存设置失败:', e);
        }
    }

    /** 构造搜索 URL */
    getSearchUrl(query) {
        const engine = this.engines.find(e => e.key === this.currentEngine) || this.engines[0];
        return engine.url + encodeURIComponent(query);
    }

    /** 打开搜索框 */
    show() {
        if (!this.modal || this.isOpen) return;

        // 关闭其他浮层
        if (window.sidebar?.isVisible()) window.sidebar.hide();
        if (window.app?.components?.navbar?.hideMusicPlayer) window.app.components.navbar.hideMusicPlayer();

        this.modal.style.display = 'block';
        requestAnimationFrame(() => {
            this.modal.classList.add('active');
        });

        this.isOpen = true;
        this.input.value = '';
        this.input.focus();
        this.renderHistory();
        this.clearSuggestions();

        if (window.app) window.app.registerModal(this);
    }

    /** 关闭搜索框 */
    hide() {
        if (!this.modal || !this.isOpen) return;

        this.modal.classList.remove('active');
        const onEnd = () => {
            this.modal.style.display = 'none';
            this.modal.removeEventListener('transitionend', onEnd);
        };
        this.modal.addEventListener('transitionend', onEnd, { once: true });

        // 兜底隐藏
        setTimeout(() => {
            if (!this.modal.classList.contains('active') && this.modal.style.display !== 'none') {
                this.modal.style.display = 'none';
            }
        }, 300);

        this.clearSuggestions();
        this.isOpen = false;

        if (window.app) window.app.unregisterModal(this);
    }

    /** 提交搜索 */
    submitSearch() {
        const query = this.input.value.trim();
        if (!query) {
            window.toast.show('请输入搜索内容', 'warning');
            return;
        }
        const url = this.getSearchUrl(query);
        window.open(url, '_blank');
        this.addHistory(query);
        this.hide();
    }

    /** 处理键盘回车搜索 */
    handleSearch(event) {
        if (event.key === 'Enter') {
            this.submitSearch();
        }
    }

    /** 请求百度联想词 API */
    async fetchBaiduSuggestions(query) {
        const apiUrl = 'https://cn.apihz.cn/api/wangzhan/soubaiduxl.php';
        const params = new URLSearchParams({
            id: '10014221',
            key: '4a7768de1cf2e0f41fc0a4005240c837',
            words: query
        });
        try {
            const response = await fetch(`${apiUrl}?${params.toString()}`);
            if (!response.ok) throw new Error('网络错误');
            const data = await response.json();
            if (data.code === 200 && Array.isArray(data.datas)) {
                return data.datas;
            }
            return [];
        } catch (error) {
            console.error('百度联想词请求失败:', error);
            return [];
        }
    }

    /** 输入时触发联想（防抖） */
    showSuggestions() {
        const query = this.input.value.trim();
        if (!query) {
            this.clearSuggestions();
            return;
        }
        clearTimeout(this.suggestTimer);
        this.suggestTimer = setTimeout(async () => {
            const words = await this.fetchBaiduSuggestions(query);
            this.renderSuggestions(words);
        }, 300);
    }

    /** 渲染联想下拉 */
    renderSuggestions(words) {
        if (!this.suggestionsContainer) return;
        if (!words || words.length === 0) {
            this.suggestionsContainer.innerHTML = '';
            this.suggestionsContainer.classList.remove('active');
            return;
        }
        this.suggestionsContainer.innerHTML = '';
        words.forEach(word => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = word;
            item.addEventListener('click', () => {
                this.input.value = word;
                this.clearSuggestions();
                this.submitSearch();
            });
            this.suggestionsContainer.appendChild(item);
        });
        this.suggestionsContainer.classList.add('active');
    }

    /** 清除联想词 */
    clearSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.innerHTML = '';
            this.suggestionsContainer.classList.remove('active');
        }
    }

    /** 添加历史记录 */
    addHistory(query) {
        this.history = this.history.filter(h => h !== query);
        this.history.unshift(query);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
        this.saveSetting('searchHistory2', this.history);
    }

    /** 渲染历史记录 */
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
            item.innerHTML = `
                <span class="history-text">${query}</span>
                <i class="fas fa-times delete-history"></i>
            `;
            // 点击搜索
            item.querySelector('.history-text').addEventListener('click', () => {
                this.input.value = query;
                this.submitSearch();
            });
            // 删除按钮
            item.querySelector('.delete-history').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeHistory(query);
            });
            this.historyList.appendChild(item);
        });
    }

    /** 删除单条历史 */
    removeHistory(query) {
        this.history = this.history.filter(h => h !== query);
        this.saveSetting('searchHistory2', this.history);
        this.renderHistory();
    }
}

// 自动创建实例（确保 newSearchModule 始终存在）
document.addEventListener('DOMContentLoaded', () => {
    if (!window.newSearchModule) {
        new NewSearchModule();
    }
});