/**
 * 本地存储工具类 - 支持数据过期（TTL）
 */
class Storage {
    static PREFIX = 'starlink_';
    
    // ==================== 基础存储方法 ====================
    
    /**
     * 获取存储值，自动检查过期
     * @param {string} key
     * @param {*} defaultValue
     */
    static get(key, defaultValue = null) {
        try {
            const prefixedKey = this.PREFIX + key;
            const raw = localStorage.getItem(prefixedKey);
            if (raw === null) return defaultValue;
            
            const item = JSON.parse(raw);
            // 如果存储的是带有过期时间的对象
            if (item && typeof item === 'object' && 'expiry' in item) {
                if (Date.now() > item.expiry) {
                    // 过期则删除并返回默认值
                    localStorage.removeItem(prefixedKey);
                    return defaultValue;
                }
                return item.value !== undefined ? item.value : defaultValue;
            }
            // 旧版不带过期的数据直接返回
            return item;
        } catch (error) {
            console.error(`获取存储数据失败 (${key}):`, error);
            return defaultValue;
        }
    }

    /**
     * 设置存储值，可选过期时间（毫秒）
     * @param {string} key
     * @param {*} value
     * @param {number} [ttl] 存活毫秒数，不传则永不过期
     */
    static set(key, value, ttl = null) {
        try {
            const prefixedKey = this.PREFIX + key;
            if (ttl && typeof ttl === 'number' && ttl > 0) {
                const item = {
                    value: value,
                    expiry: Date.now() + ttl
                };
                localStorage.setItem(prefixedKey, JSON.stringify(item));
            } else {
                // 不设置过期时间，直接存储原始值
                localStorage.setItem(prefixedKey, JSON.stringify(value));
            }
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

    /**
     * 清理所有已过期的数据
     */
    static cleanExpired() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.PREFIX)) {
                    const raw = localStorage.getItem(key);
                    try {
                        const item = JSON.parse(raw);
                        if (item && typeof item === 'object' && 'expiry' in item) {
                            if (Date.now() > item.expiry) {
                                localStorage.removeItem(key);
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (error) {
            console.error('清理过期数据失败:', error);
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

    // ==================== 网站统计功能（兼容原有逻辑） ====================
    static getSiteViews(url) {
        if (!url) return 0;
        try {
            const siteViews = this.get('site_views', {});
            const normalizedUrl = this.normalizeUrl(url);
            return siteViews[normalizedUrl] || 0;
        } catch { return 0; }
    }

    static incrementSiteViews(url) {
        if (!url) return 0;
        try {
            const normalizedUrl = this.normalizeUrl(url);
            const siteViews = this.get('site_views', {});
            siteViews[normalizedUrl] = (siteViews[normalizedUrl] || 0) + 1;
            // 站点统计不过期（或设置超长 TTL）
            this.set('site_views', siteViews);
            return siteViews[normalizedUrl];
        } catch { return 0; }
    }

    static getAllSiteStats() { return this.get('site_views', {}); }
    static resetAllSiteStats() { this.set('site_views', {}); }

    static getPopularSites(limit = 10) {
        try {
            const siteViews = this.get('site_views', {});
            return Object.entries(siteViews)
                .sort(([,a], [,b]) => b - a)
                .slice(0, limit)
                .map(([url, views]) => ({ url, views }));
        } catch { return []; }
    }

    static getSiteStatsSummary() {
        try {
            const siteViews = this.get('site_views', {});
            const urls = Object.keys(siteViews);
            return {
                totalSites: urls.length,
                totalViews: Object.values(siteViews).reduce((a,b)=>a+b,0),
                averageViews: urls.length ? Math.round(Object.values(siteViews).reduce((a,b)=>a+b,0)/urls.length) : 0,
                mostViewed: this.getPopularSites(1)[0] || null
            };
        } catch { return { totalSites:0, totalViews:0, averageViews:0, mostViewed:null }; }
    }

    static normalizeUrl(url) {
        if (!url) return '';
        try {
            let n = url.toLowerCase();
            n = n.replace(/^(https?:\/\/)?(www\.)?/, '');
            n = n.replace(/\/$/, '');
            return n;
        } catch { return url; }
    }

    static formatViews(views) {
        if (views >= 1000000) return (views/1000000).toFixed(1).replace('.0','') + 'M';
        if (views >= 1000) return (views/1000).toFixed(1).replace('.0','') + 'K';
        return views.toString();
    }

    // ==================== 链接有效性缓存（带过期） ====================
    static getLinkValidity(url) {
        const normalizedUrl = this.normalizeUrl(url);
        return this.get(`link_validity_${normalizedUrl}`, null);
    }

    static setLinkValidity(url, valid, ttl = 86400000) { // 默认1天
        const normalizedUrl = this.normalizeUrl(url);
        return this.set(`link_validity_${normalizedUrl}`, { valid, timestamp: Date.now() }, ttl);
    }
}