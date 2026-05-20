/**
 * API数据管理
 * 修改：必应壁纸直接使用官方接口，无备用源
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

    // 获取必应每日壁纸（直接使用官方接口）
    static async getBingWallpaper() {
        const officialUrl = 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.API_TIMEOUT);
            
            const response = await fetch(officialUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.images || !data.images.length || !data.images[0].url) {
                throw new Error('API返回数据格式不正确');
            }
            
            const img = data.images[0];
            const imageUrl = 'https://cn.bing.com' + img.url;
            let title = img.copyright || '必应每日壁纸';
            // 去除“必应壁纸 · ”前缀（如果有）
            title = title.replace(/^必应壁纸\s*·\s*/i, '').trim();
            if (!title) title = '星聚导航';
            
            return {
                url: this.sanitizeUrl(imageUrl),
                title: this.escapeHtml(title),
                copyright: this.escapeHtml(img.copyright || ''),
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

    // 获取壁纸（兼容原有接口）
    static async getWallpaper() {
        return await this.getBingWallpaper();
    }

    // 获取风景壁纸（保持原有，或可删除；如需官方风景API请自行替换）
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