/**
 * API数据管理 - 配置化版本
 * 所有外部 API 地址从 window.APP_CONFIG 读取，提供回退值
 */
class API {
    static CONFIG = {
        API_TIMEOUT: 5000,
        // 从全局配置读取后端 API 地址
        get API_BASE() {
            return window.Utils?.getApiBase() || (window.APP_CONFIG?.API_BASE) || 'https://api.xjdh688.ccwu.cc';
        },
        // 一言 API
        QUOTE_API: 'https://api.kuleu.com/api/yiyan',
        // QQ 头像 API
        QQ_AVATAR_API: 'https://api.kuleu.com/api/qqimg',
        // 必应壁纸
        BING_WALLPAPER_API: 'https://cn.bing.com/HPImageArchive.aspx',
        // 风景壁纸（可选）
        SCENERY_WALLPAPER_API: 'https://api.xingchenfu.xyz/API/cgq4kjsdt.php',
        // 获取网站信息 API（yunzhiapi）
        SITE_INFO_API: 'https://yunzhiapi.cn/API/hqwyxx.php',
        // 网站信息 API Token（可配置）
        get SITE_INFO_TOKEN() {
            return window.APP_CONFIG?.SITE_INFO_TOKEN || 'XIZhAXKnSQcH';
        }
    };

    static async getDailyQuote() {
        try {
            const response = await Utils.safeFetch(this.CONFIG.QUOTE_API, { timeout: this.CONFIG.API_TIMEOUT });
            const text = await response.text();
            return Utils.escapeHtml(text || '每一天都是新的开始，充满无限可能。');
        } catch (error) {
            Utils.handleApiError(error, '获取每日一言失败', false);
            return '每一天都是新的开始，充满无限可能。';
        }
    }

    static async getQQAvatar(qqNumber) {
        if (!qqNumber || !/^[1-9][0-9]{4,10}$/.test(qqNumber)) {
            return null;
        }
        try {
            const response = await Utils.safeFetch(`${this.CONFIG.QQ_AVATAR_API}?qq=${qqNumber}`, { timeout: this.CONFIG.API_TIMEOUT });
            return response.url;
        } catch (error) {
            Utils.handleApiError(error, '获取QQ头像失败', false);
            return null;
        }
    }

    static async getAvatar() {
        try {
            const randomId = Math.floor(Math.random() * 1000);
            const response = await Utils.safeFetch(`https://api.multiavatar.com/${randomId}.png`, { timeout: this.CONFIG.API_TIMEOUT });
            return response.url;
        } catch (error) {
            Utils.handleApiError(error, '获取随机头像失败', false);
            return null;
        }
    }

    // 获取必应每日壁纸
    static async getBingWallpaper() {
        const url = `${this.CONFIG.BING_WALLPAPER_API}?format=js&idx=0&n=1&mkt=zh-CN`;
        try {
            const response = await Utils.safeFetch(url, { timeout: this.CONFIG.API_TIMEOUT });
            const data = await response.json();
            if (!data.images || !data.images.length || !data.images[0].url) {
                throw new Error('API返回数据格式不正确');
            }
            const img = data.images[0];
            const imageUrl = 'https://cn.bing.com' + img.url;
            let title = img.copyright || '必应每日壁纸';
            title = title.replace(/^必应壁纸\s*·\s*/i, '').trim();
            if (!title) title = '星聚导航';
            return {
                url: this.sanitizeUrl(imageUrl),
                title: Utils.escapeHtml(title),
                copyright: Utils.escapeHtml(img.copyright || ''),
                time: img.startdate || new Date().toISOString().split('T')[0],
                success: true
            };
        } catch (error) {
            console.error("获取必应壁纸失败:", error);
            return {
                url: '',
                title: '默认壁纸',
                copyright: '',
                time: new Date().toISOString().split('T')[0],
                success: false
            };
        }
    }

    static async getWallpaper() {
        return await this.getBingWallpaper();
    }

    static async getSceneryWallpaper() {
        try {
            const timestamp = new Date().getTime();
            const url = `${this.CONFIG.SCENERY_WALLPAPER_API}?t=${timestamp}`;
            return {
                url: this.sanitizeUrl(url),
                title: '风景壁纸',
                copyright: '',
                time: new Date().toISOString().split('T')[0],
                success: true
            };
        } catch (error) {
            console.error("获取风景壁纸失败:", error);
            return {
                url: '',
                title: '风景壁纸',
                copyright: '',
                time: new Date().toISOString().split('T')[0],
                success: false
            };
        }
    }

    static sanitizeUrl(url) {
        try {
            const parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return '';
            }
            return url;
        } catch {
            return '';
        }
    }

    // 获取网站信息（投稿时自动获取）
    static async fetchSiteInfo(url) {
        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            const apiUrl = `${this.CONFIG.SITE_INFO_API}?token=${this.CONFIG.SITE_INFO_TOKEN}&url=${encodeURIComponent(safeUrl)}`;
            const response = await Utils.safeFetch(apiUrl, { timeout: this.CONFIG.API_TIMEOUT });
            const data = await response.json();
            if (!data.title && !data.description && !data.icon) {
                throw new Error('无数据');
            }
            return {
                title: data.title || '',
                icon: data.icon || '',
                description: data.description || '',
                success: true
            };
        } catch (error) {
            Utils.handleApiError(error, '获取网站信息失败', false);
            return { success: false, title: '', icon: '', description: '' };
        }
    }
}