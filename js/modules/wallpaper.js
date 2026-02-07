/**
 * 壁纸模块 - 集成必应每日壁纸API
 * @class WallpaperModule
 */
class WallpaperModule {
    constructor() {
        this.currentWallpaper = null;
        this.init();
    }

    /**
     * 初始化壁纸模块
     */
    async init() {
        try {
            await this.loadWallpaper();
        } catch (error) {
            this.handleWallpaperError();
        }
    }

    /**
     * 加载壁纸
     */
    async loadWallpaper() {
        try {
            const wallpaperData = await API.getBingWallpaper();
            
            if (wallpaperData && wallpaperData.url) {
                this.currentWallpaper = wallpaperData;
                await this.applyWallpaper(wallpaperData);
                this.showWallpaperInfo(wallpaperData);
            } else {
                throw new Error('壁纸数据无效');
            }
        } catch (error) {
            this.handleWallpaperError();
        }
    }

    /**
     * 应用壁纸到页面
     */
    async applyWallpaper(wallpaperData) {
        const wallpaperImg = document.getElementById('wallpaper');
        if (!wallpaperImg) return;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                wallpaperImg.src = wallpaperData.url;
                wallpaperImg.style.display = 'block';
                wallpaperImg.alt = wallpaperData.title || '每日壁纸';
                wallpaperImg.classList.add('loaded');
                resolve();
            };
            
            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };
            
            img.src = wallpaperData.url;
        });
    }

    /**
     * 处理壁纸加载失败
     */
    handleWallpaperError() {
        const wallpaperImg = document.getElementById('wallpaper');
        if (wallpaperImg) {
            wallpaperImg.style.display = 'none';
        }
        this.hideWallpaperInfo();
    }

    /**
     * 显示壁纸信息
     */
    showWallpaperInfo(wallpaperData) {
        this.updateWallpaperInfo(wallpaperData);
    }

    /**
     * 隐藏壁纸信息
     */
    hideWallpaperInfo() {
        const wallpaperInfo = document.getElementById('wallpaperInfo');
        if (wallpaperInfo) {
            wallpaperInfo.style.display = 'none';
        }
    }

    /**
     * 更新壁纸信息显示
     */
    updateWallpaperInfo(wallpaperData) {
        const titleElement = document.getElementById('wallpaperTitle');
        const copyrightElement = document.getElementById('wallpaperCopyright');
        
        if (titleElement) {
            titleElement.textContent = wallpaperData.title || '今日壁纸';
        }
        
        if (copyrightElement) {
            copyrightElement.textContent = wallpaperData.copyright || '';
        }
        
        if (copyrightElement && !wallpaperData.copyright) {
            copyrightElement.style.display = 'none';
        } else if (copyrightElement) {
            copyrightElement.style.display = 'block';
        }
        
        const wallpaperInfo = document.getElementById('wallpaperInfo');
        if (wallpaperInfo) {
            wallpaperInfo.style.display = 'block';
        }
    }

    /**
     * 刷新壁纸
     */
    async refreshWallpaper() {
        await this.loadWallpaper();
        
        if (window.app && window.app.showToast) {
            window.app.showToast('壁纸已刷新', 'success');
        }
    }

    /**
     * 获取当前壁纸信息
     */
    getCurrentWallpaper() {
        return this.currentWallpaper;
    }

    /**
     * 销毁模块
     */
    destroy() {
        this.currentWallpaper = null;
    }
}