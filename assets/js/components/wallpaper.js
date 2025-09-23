const wallpaperSources = {
    bing: {
        name: "必应壁纸",
        url: "https://bing.biturl.top/?resolution=1920&format=json",
        parse: (data) => {
            return {
                url: data.url,
                title: data.copyright || "必应每日壁纸"
            };
        }
    },
    scenery: {
        name: "风景壁纸",
        parse: () => {
            const timestamp = new Date().getTime();
            return {
                url: `https://api.xingchenfu.xyz/API/cgq4kjsdt.php?t=${timestamp}`,
                title: "风景壁纸"
            };
        }
    }
};

class WallpaperManager {
    constructor() {
        this.currentSource = localStorage.getItem('currentWallpaperSource') || 'bing';
        
        this.wallpaperSection = document.getElementById('wallpaperSection');
        this.wallpaperTitle = document.getElementById('wallpaperTitle');
        this.sourceButtons = document.querySelectorAll('.source-btn');
        this.loadingIndicator = document.querySelector('.loading-indicator');
        this.errorRetry = document.querySelector('.error-retry');
        this.retryButton = document.getElementById('retryButton');
        this.wallpaperBackground = document.querySelector('.wallpaper-background');
        
        this.sourceButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.changeSource(button.dataset.source);
            });
        });
        
        this.retryButton.addEventListener('click', () => this.loadWallpaper());
        
        this.initSourceButtons();
        this.loadWallpaper();
    }
    
    initSourceButtons() {
        this.sourceButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.source === this.currentSource) {
                button.classList.add('active');
            }
        });
    }
    
    changeSource(sourceKey) {
        this.currentSource = sourceKey;
        localStorage.setItem('currentWallpaperSource', sourceKey);
        this.initSourceButtons();
        this.loadWallpaper();
    }
    
    getSource() {
        return wallpaperSources[this.currentSource] || wallpaperSources.bing;
    }
    
    async loadWallpaper() {
        this.showLoading();
        this.hideError();
        
        try {
            const source = this.getSource();
            const wallpaper = await this.fetchWallpaper(source);
            this.showWallpaper(wallpaper);
        } catch (error) {
            console.error("壁纸加载失败:", error);
            this.showError();
            this.setDefaultWallpaper();
        } finally {
            this.hideLoading();
        }
    }
    
    async fetchWallpaper(source) {
        try {
            const cacheKey = `wallpaper-${this.currentSource}`;
            const cachedData = localStorage.getItem(cacheKey);
            const cacheDate = localStorage.getItem(`${cacheKey}-date`);
            const today = new Date().toDateString();
            
            // 如果缓存存在且是今天的，则使用缓存
            if (cachedData && cacheDate === today) {
                return JSON.parse(cachedData);
            }
            
            // 对于不需要API请求的源
            if (!source.url) {
                const wallpaper = source.parse();
                this.cacheWallpaper(wallpaper);
                return wallpaper;
            }
            
            // 添加时间戳防止缓存
            const timestamp = new Date().getTime();
            const apiUrl = source.url + (source.url.includes('?') ? '&' : '?') + `t=${timestamp}`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API响应错误: ${response.status}`);
            }
            
            const data = await response.json();
            const wallpaper = source.parse(data);
            
            this.cacheWallpaper(wallpaper);
            
            return wallpaper;
            
        } catch (error) {
            console.error("获取壁纸时出错:", error);
            return {
                url: "assets/images/404bj.gif",
                title: "星链导航",
                isDefault: true
            };
        }
    }
    
    cacheWallpaper(wallpaper) {
        const cacheKey = `wallpaper-${this.currentSource}`;
        localStorage.setItem(cacheKey, JSON.stringify(wallpaper));
        localStorage.setItem(`${cacheKey}-date`, new Date().toDateString());
    }
    
    showWallpaper(wallpaper) {
        if (wallpaper.url && !wallpaper.isDefault) {
            let imageUrl = wallpaper.url;
            
            // 处理URL格式
            if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
            } else if (!imageUrl.startsWith('http')) {
                imageUrl = 'https://' + imageUrl;
            }
            
            this.wallpaperBackground.style.backgroundImage = `url('${imageUrl}')`;
        } else {
            this.setDefaultWallpaper();
        }
        
        this.wallpaperTitle.textContent = wallpaper.title || "星链导航";
    }
    
    setDefaultWallpaper() {
        this.wallpaperBackground.style.backgroundImage = `url('assets/images/404bj.gif')`;
        this.wallpaperTitle.textContent = "星链导航";
    }
    
    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'block';
        }
    }
    
    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }
    
    showError() {
        if (this.errorRetry) {
            this.errorRetry.style.display = 'block';
        }
    }
    
    hideError() {
        if (this.errorRetry) {
            this.errorRetry.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.wallpaperManager = new WallpaperManager();
});