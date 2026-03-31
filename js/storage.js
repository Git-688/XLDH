/**
 * 本地存储工具类 - 移除旧运行时间逻辑
 */
class Storage {
    static PREFIX = 'starlink_';
    
    // ==================== 基础存储方法 ====================
    
    static get(key, defaultValue = null) {
        try {
            const prefixedKey = this.PREFIX + key;
            const item = localStorage.getItem(prefixedKey);
            return item === null ? defaultValue : JSON.parse(item);
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
                if (key && key.startsWith(this.PREFIX)) {
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
            if (key && key.startsWith(this.PREFIX)) {
                keys.push(key.substring(this.PREFIX.length));
            }
        }
        return keys;
    }

    // ==================== 网站统计功能 ====================
    
    static getSiteViews(url) {
        if (!url) return 0;
        try {
            const siteViews = this.get('site_views', {});
            const normalizedUrl = this.normalizeUrl(url);
            return siteViews[normalizedUrl] || 0;
        } catch {
            return 0;
        }
    }

    static incrementSiteViews(url) {
        if (!url) return 0;
        try {
            const normalizedUrl = this.normalizeUrl(url);
            const siteViews = this.get('site_views', {});
            siteViews[normalizedUrl] = (siteViews[normalizedUrl] || 0) + 1;
            this.set('site_views', siteViews);
            return siteViews[normalizedUrl];
        } catch {
            return 0;
        }
    }

    static getAllSiteStats() {
        return this.get('site_views', {});
    }

    static resetAllSiteStats() {
        this.set('site_views', {});
    }

    static getPopularSites(limit = 10) {
        try {
            const siteViews = this.get('site_views', {});
            return Object.entries(siteViews)
                .sort(([, a], [, b]) => b - a)
                .slice(0, limit)
                .map(([url, views]) => ({ url, views }));
        } catch {
            return [];
        }
    }

    static getSiteStatsSummary() {
        try {
            const siteViews = this.get('site_views', {});
            const urls = Object.keys(siteViews);
            return {
                totalSites: urls.length,
                totalViews: Object.values(siteViews).reduce((sum, views) => sum + views, 0),
                averageViews: urls.length > 0 ? 
                    Math.round(Object.values(siteViews).reduce((sum, views) => sum + views, 0) / urls.length) : 0,
                mostViewed: this.getPopularSites(1)[0] || null
            };
        } catch {
            return { totalSites: 0, totalViews: 0, averageViews: 0, mostViewed: null };
        }
    }

    static normalizeUrl(url) {
        if (!url) return '';
        try {
            let normalized = url.toLowerCase();
            normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
            normalized = normalized.replace(/\/$/, '');
            return normalized;
        } catch {
            return url;
        }
    }

    static formatViews(views) {
        if (views >= 1000000) {
            return `${(views / 1000000).toFixed(1).replace('.0', '')}M`;
        } else if (views >= 1000) {
            return `${(views / 1000).toFixed(1).replace('.0', '')}K`;
        } else {
            return views.toString();
        }
    }

    // ==================== 链接有效性缓存 ====================
    
    static getLinkValidity(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const cacheKey = `link_validity_${normalizedUrl}`;
        return this.get(cacheKey, null);
    }

    static setLinkValidity(url, valid) {
        const normalizedUrl = this.normalizeUrl(url);
        const cacheKey = `link_validity_${normalizedUrl}`;
        return this.set(cacheKey, { valid, timestamp: Date.now() });
    }
}