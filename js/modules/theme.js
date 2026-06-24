/* theme.js */
class ThemeModule {
    constructor() {
        if (window.Starlink && window.Starlink.theme) return window.Starlink.theme;
        
        this.THEME_KEY = 'starlink_theme';
        this.DARK_CLASS = 'dark-mode';
        this.availableThemes = ['light', 'dark', 'auto'];
        this.currentTheme = null;
        this.themeToggleBtn = null;
        this.isInitialized = false;
        this.systemThemeQuery = null;
        this.systemThemeHandler = null;
        
        if (window.Starlink) window.Starlink.theme = this;
        window.themeModule = this;
    }

    init() {
        if (this.isInitialized) return;
        this.themeToggleBtn = document.getElementById('themeToggleBtn');
        if (!this.themeToggleBtn) {
            console.warn('未找到主题切换按钮 #themeToggleBtn');
            return;
        }
        this.loadThemePreference();
        this.bindEvents();
        this.isInitialized = true;
        console.log('主题模块初始化完成，当前主题:', this.currentTheme);
    }

    loadThemePreference() {
        const savedTheme = localStorage.getItem(this.THEME_KEY);
        if (savedTheme && this.availableThemes.includes(savedTheme)) {
            this.currentTheme = savedTheme;
        } else {
            this.currentTheme = 'auto';
        }
        this.applyTheme();
    }

    applyTheme() {
        const htmlElement = document.documentElement;
        
        htmlElement.style.transition = 'background-color 0.3s ease, color 0.2s ease';
        
        let shouldBeDark = false;
        if (this.currentTheme === 'dark') {
            shouldBeDark = true;
        } else if (this.currentTheme === 'light') {
            shouldBeDark = false;
        } else if (this.currentTheme === 'auto') {
            shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        
        if (shouldBeDark) {
            htmlElement.classList.add(this.DARK_CLASS);
        } else {
            htmlElement.classList.remove(this.DARK_CLASS);
        }
        
        this.updateButtonIcon(shouldBeDark);
        localStorage.setItem(this.THEME_KEY, this.currentTheme);
        
        setTimeout(() => {
            htmlElement.style.transition = '';
        }, 300);
    }

    updateButtonIcon(isDark) {
        if (!this.themeToggleBtn) return;
        const icon = this.themeToggleBtn.querySelector('i');
        if (icon) {
            if (isDark) {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        }
        this.themeToggleBtn.setAttribute('aria-label', isDark ? '切换到亮色模式' : '切换到深色模式');
    }

    toggleTheme() {
        if (this.currentTheme === 'light') {
            this.currentTheme = 'dark';
        } else if (this.currentTheme === 'dark') {
            this.currentTheme = 'auto';
        } else if (this.currentTheme === 'auto') {
            this.currentTheme = 'light';
        }
        this.applyTheme();
        const toast = window.Starlink?.toast || window.toast;
        if (toast && toast.show) {
            const themeName = this.currentTheme === 'auto' ? '跟随系统' : (this.currentTheme === 'dark' ? '深色模式' : '亮色模式');
            toast.show(`已切换至 ${themeName}`, 'info');
        }
    }

    bindEvents() {
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        if (window.matchMedia) {
            this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.systemThemeHandler = (e) => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme();
                }
            };
            this.systemThemeQuery.addEventListener('change', this.systemThemeHandler);
        }
    }

    destroy() {
        if (this.systemThemeQuery && this.systemThemeHandler) {
            this.systemThemeQuery.removeEventListener('change', this.systemThemeHandler);
        }
        if (this.themeToggleBtn) {
            this.themeToggleBtn.removeEventListener('click', this.toggleTheme);
        }
        this.isInitialized = false;
    }
}

if (!window.Starlink) window.Starlink = {};
if (!window.Starlink.theme) {
    window.Starlink.theme = new ThemeModule();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.Starlink.theme.init());
    } else {
        window.Starlink.theme.init();
    }
}
window.themeModule = window.Starlink.theme;