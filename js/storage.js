/**
 * 本地存储工具类 - 简化版本
 */
class Storage {
    static PREFIX = 'starlink_';
    
    static get(key, defaultValue = null) {
        try {
            const prefixedKey = this.PREFIX + key;
            const item = localStorage.getItem(prefixedKey);
            
            if (item === null) {
                return defaultValue;
            }
            
            return JSON.parse(item);
        } catch (error) {
            console.error(`获取存储数据失败 (${key}):`, error);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            const prefixedKey = this.PREFIX + key;
            localStorage.setItem(prefixedKey, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`设置存储数据失败 (${key}):`, error);
            return false;
        }
    }

    static remove(key) {
        try {
            const prefixedKey = this.PREFIX + key;
            localStorage.removeItem(prefixedKey);
            return true;
        } catch (error) {
            console.error(`删除存储数据失败 (${key}):`, error);
            return false;
        }
    }

    static clear() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('清除存储失败:', error);
            return false;
        }
    }

    static getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.PREFIX)) {
                keys.push(key.substring(this.PREFIX.length));
            }
        }
        return keys;
    }

    // ==================== 新增：网站统计功能 ====================
    
    /**
     * 获取网站浏览次数
     * @param {string} url - 网站URL
     * @returns {number} 浏览次数
     */
    static getSiteViews(url) {
        if (!url) return 0;
        
        const siteViews = this.get('site_views', {});
        const normalizedUrl = this.normalizeUrl(url);
        
        return siteViews[normalizedUrl] || 0;
    }

    /**
     * 增加网站浏览次数
     * @param {string} url - 网站URL
     */
    static incrementSiteViews(url) {
        if (!url) return 0;
        
        const normalizedUrl = this.normalizeUrl(url);
        const siteViews = this.get('site_views', {});
        
        siteViews[normalizedUrl] = (siteViews[normalizedUrl] || 0) + 1;
        
        this.set('site_views', siteViews);
        
        return siteViews[normalizedUrl];
    }

    /**
     * 获取所有网站统计数据
     * @returns {Object} 所有网站的统计信息
     */
    static getAllSiteStats() {
        return this.get('site_views', {});
    }

    /**
     * 重置所有网站统计
     */
    static resetAllSiteStats() {
        this.set('site_views', {});
    }

    /**
     * 获取热门网站（按浏览量排序）
     * @param {number} limit - 返回数量限制
     * @returns {Array} 热门网站列表
     */
    static getPopularSites(limit = 10) {
        const siteViews = this.get('site_views', {});
        
        return Object.entries(siteViews)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([url, views]) => ({ url, views }));
    }

    /**
     * 获取网站统计摘要
     * @returns {Object} 统计摘要
     */
    static getSiteStatsSummary() {
        const siteViews = this.get('site_views', {});
        const urls = Object.keys(siteViews);
        
        return {
            totalSites: urls.length,
            totalViews: Object.values(siteViews).reduce((sum, views) => sum + views, 0),
            averageViews: urls.length > 0 ? 
                Math.round(Object.values(siteViews).reduce((sum, views) => sum + views, 0) / urls.length) : 0,
            mostViewed: this.getPopularSites(1)[0] || null
        };
    }

    /**
     * 标准化URL（去除协议、www等）
     * @param {string} url - 原始URL
     * @returns {string} 标准化后的URL
     */
    static normalizeUrl(url) {
        if (!url) return '';
        
        try {
            // 转换为小写
            let normalized = url.toLowerCase();
            
            // 去除协议和www
            normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
            
            // 去除尾部斜杠
            normalized = normalized.replace(/\/$/, '');
            
            return normalized;
        } catch (error) {
            console.error('标准化URL失败:', error);
            return url;
        }
    }

    /**
     * 格式化浏览次数显示
     * @param {number} views - 浏览次数
     * @returns {string} 格式化后的次数
     */
    static formatViews(views) {
        if (views >= 1000000) {
            return `${(views / 1000000).toFixed(1).replace('.0', '')}M`;
        } else if (views >= 1000) {
            return `${(views / 1000).toFixed(1).replace('.0', '')}K`;
        } else {
            return views.toString();
        }
    }

    // ==================== 新增：运行时间管理 ====================
    
    /**
     * 获取累计运行时间
     * @returns {number} 累计运行时间（毫秒）
     */
    static getAccumulatedUptime() {
        return this.get('accumulated_uptime', 0);
    }

    /**
     * 设置累计运行时间
     * @param {number} uptime - 运行时间（毫秒）
     */
    static setAccumulatedUptime(uptime) {
        return this.set('accumulated_uptime', uptime);
    }

    /**
     * 获取最后更新时间
     * @returns {number} 最后更新时间戳
     */
    static getLastUptimeUpdate() {
        return this.get('last_uptime_update', Date.now());
    }

    /**
     * 设置最后更新时间
     * @param {number} timestamp - 时间戳
     */
    static setLastUptimeUpdate(timestamp) {
        return this.set('last_uptime_update', timestamp);
    }

    /**
     * 获取格式化运行时间
     * @returns {string} 格式化后的运行时间
     */
    static getFormattedUptime() {
        const uptime = this.getAccumulatedUptime();
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
        
        if (days > 0) {
            return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
        } else if (hours > 0) {
            return `${hours}时 ${minutes}分 ${seconds}秒`;
        } else if (minutes > 0) {
            return `${minutes}分 ${seconds}秒`;
        } else {
            return `${seconds}秒`;
        }
    }

    /**
     * 重置运行时间统计
     */
    static resetUptimeStats() {
        this.setAccumulatedUptime(0);
        this.setLastUptimeUpdate(Date.now());
        return true;
    }

    /**
     * 更新运行时间（在页面关闭或隐藏时调用）
     */
    static updateUptimeOnExit() {
        try {
            const lastUpdate = this.getLastUptimeUpdate();
            const now = Date.now();
            const timeDiff = now - lastUpdate;
            
            if (timeDiff > 0) {
                const currentUptime = this.getAccumulatedUptime();
                this.setAccumulatedUptime(currentUptime + timeDiff);
                this.setLastUptimeUpdate(now);
            }
            
            return true;
        } catch (error) {
            console.error('更新运行时间失败:', error);
            return false;
        }
    }
}