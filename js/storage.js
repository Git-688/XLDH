
class Storage {
    static PREFIX = 'starlink_';

    /**
     * 读取并反序列化存储值
     * @param {string} key 键名（无需带 PREFIX）
     * @param {*} defaultValue 不存在或解析失败时返回的默认值
     * @returns {*}
     */
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.PREFIX + key);
            return item === null ? defaultValue : JSON.parse(item);
        } catch (error) {
            console.error(`获取存储数据失败 (${key}):`, error);
            return defaultValue;
        }
    }

    /**
     * 序列化并写入存储值
     * @param {string} key 键名（无需带 PREFIX）
     * @param {*} value 任意可 JSON 序列化的值
     * @returns {boolean} 是否写入成功
     */
    static set(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`设置存储数据失败 (${key}):`, error);
            return false;
        }
    }

    /**
     * 删除指定的存储项
     * @param {string} key 键名（无需带 PREFIX）
     * @returns {boolean} 是否删除成功
     */
    static remove(key) {
        try {
            localStorage.removeItem(this.PREFIX + key);
            return true;
        } catch (error) {
            console.error(`删除存储数据失败 (${key}):`, error);
            return false;
        }
    }

    /**
     * 清空所有带 starlink_ 前缀的存储项
     * @returns {boolean} 是否清理成功
     */
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
     * 判断指定键是否存在（不进行反序列化）
     * @param {string} key 键名（无需带 PREFIX）
     * @returns {boolean}
     */
    static has(key) {
        try {
            return localStorage.getItem(this.PREFIX + key) !== null;
        } catch {
            return false;
        }
    }

    /**
     * 按子前缀批量移除存储项
     * 例如：Storage.removeByPrefix('nav_data_') 会清除所有 starlink_nav_data_* 项
     * @param {string} prefix 子前缀（相对于 starlink_ 之后的部分）
     * @returns {number} 实际移除的键数量
     */
    static removeByPrefix(prefix) {
        try {
            const fullPrefix = this.PREFIX + prefix;
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(fullPrefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return keysToRemove.length;
        } catch (error) {
            console.error(`按前缀清除存储失败 (${prefix}):`, error);
            return 0;
        }
    }

    /**
     * 获取所有带 starlink_ 前缀的键名（去掉 PREFIX 之后的部分）
     * @returns {string[]}
     */
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

    // ===== 兼容原生 localStorage 风格的别名 =====
    static getItem(key, defaultValue = null) {
        return this.get(key, defaultValue);
    }

    static setItem(key, value) {
        return this.set(key, value);
    }

    // ===== 站点访问统计 =====
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

    // ===== 链接有效性缓存 =====
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

window.Storage = Storage;