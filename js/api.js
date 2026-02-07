/**
 * API数据管理
 * 简化版本，移除所有备用方案
 */
class API {
    static CONFIG = {
        API_TIMEOUT: 5000
    };

    static async getDailyQuote() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.API_TIMEOUT);
            
            const response = await fetch('https://api.kuleu.com/api/yiyan', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                return '每一天都是新的开始，充满无限可能。';
            }
            
            // 直接获取纯文本响应
            const text = await response.text();
            
            return this.escapeHtml(text || '每一天都是新的开始，充满无限可能。');
        } catch {
            return '每一天都是新的开始，充满无限可能。';
        }
    }

    static async getQQAvatar(qqNumber) {
        if (!qqNumber || !/^[1-9][0-9]{4,10}$/.test(qqNumber)) {
            return null;
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.API_TIMEOUT);
            
            const response = await fetch(`https://api.kuleu.com/api/qqimg?qq=${qqNumber}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            return response.ok ? response.url : null;
        } catch {
            return null;
        }
    }

    static async getAvatar() {
        try {
            const randomId = Math.floor(Math.random() * 1000);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.API_TIMEOUT);
            
            const response = await fetch(`https://api.multiavatar.com/${randomId}.png`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            return response.ok ? response.url : null;
        } catch {
            return null;
        }
    }

    // 获取必应每日壁纸（使用bing.biturl.top API）
    static async getBingWallpaper() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.API_TIMEOUT);
            
            // 使用 bing.biturl.top API
            const response = await fetch('https://bing.biturl.top/?resolution=1920&format=json', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('API 请求失败');
            }
            
            const data = await response.json();
            
            if (!data.url) {
                throw new Error('API返回数据格式不正确');
            }
            
            return {
                url: this.sanitizeUrl(data.url),
                title: this.escapeHtml(data.copyright || '必应每日壁纸'),
                copyright: this.escapeHtml(data.copyright || ''),
                time: new Date().toISOString().split('T')[0],
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

    // 获取壁纸（兼容原有接口）
    static async getWallpaper() {
        return await this.getBingWallpaper();
    }

    // 获取风景壁纸（从第二个wallpaper.js中移入）
    static async getSceneryWallpaper() {
        try {
            const timestamp = new Date().getTime();
            const url = `https://api.xingchenfu.xyz/API/cgq4kjsdt.php?t=${timestamp}`;
            
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

    // 工具方法
    static escapeHtml(text) {
        if (typeof text !== 'string') {
            text = String(text);
        }
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
}