/* storage.js - 精简版（localStorage 封装 + 站点统计） */
class Storage {
    static PREFIX = 'starlink_';

    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.PREFIX + key);
            return item === null ? defaultValue : JSON.parse(item);
        } catch {
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(this.PREFIX + key);
            return true;
        } catch {
            return false;
        }
    }

    static getItem(key, defaultValue = null) {
        return this.get(key, defaultValue);
    }

    static setItem(key, value) {
        return this.set(key, value);
    }

    static clear() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.PREFIX)) keysToRemove.push(key);
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return true;
        } catch {
            return false;
        }
    }

    static getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.PREFIX)) keys.push(key.substring(this.PREFIX.length));
        }
        return keys;
    }

    // ---------- 站点统计 ----------
    static normalizeUrl(url) {
        if (!url) return '';
        try {
            return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
        } catch {
            return url;
        }
    }

    static getSiteViews(url) {
        if (!url) return 0;
        try {
            const siteViews = this.get('site_views', {});
            return siteViews[this.normalizeUrl(url)] || 0;
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
            const totalViews = Object.values(siteViews).reduce((sum, v) => sum + v, 0);
            return {
                totalSites: urls.length,
                totalViews,
                averageViews: urls.length ? Math.round(totalViews / urls.length) : 0,
                mostViewed: this.getPopularSites(1)[0] || null
            };
        } catch {
            return { totalSites: 0, totalViews: 0, averageViews: 0, mostViewed: null };
        }
    }

    // ---------- 链接有效性（已废弃，保留兼容） ----------
    static getLinkValidity(url) {
        const cacheKey = `link_validity_${this.normalizeUrl(url)}`;
        return this.get(cacheKey, null);
    }

    static setLinkValidity(url, valid) {
        const cacheKey = `link_validity_${this.normalizeUrl(url)}`;
        return this.set(cacheKey, { valid, timestamp: Date.now() });
    }
}

window.Storage = Storage;