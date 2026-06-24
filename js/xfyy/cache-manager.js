/* cache-manager.js */
class CacheManager {
    constructor() {
        this.prefix = 'music_player_';
        this.defaultTTL = 24 * 60 * 60 * 1000;
        this.maxSize = 4 * 1024 * 1024;
        this.cacheStats = this.loadStats();
        this.activeCache = new Set();
        this.accessOrder = [];
    }

    loadStats() {
        try {
            return JSON.parse(localStorage.getItem(this.prefix + 'cache_stats')) || { hits: 0, misses: 0, size: 0 };
        } catch { return { hits: 0, misses: 0, size: 0 }; }
    }

    saveStats() {
        try { localStorage.setItem(this.prefix + 'cache_stats', JSON.stringify(this.cacheStats)); } catch(e) {}
    }

    estimateTotalSize() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                const item = localStorage.getItem(key);
                total += item ? item.length * 2 : 0;
            }
        }
        return total;
    }

    generateKey(type, id) { return `${this.prefix}${type}_${id}`; }

    set(key, data, ttl = this.defaultTTL) {
        try {
            const storageKey = this.generateKey('data', key);
            const cacheItem = { data, timestamp: Date.now(), ttl };
            const serialized = JSON.stringify(cacheItem);
            const itemSize = serialized.length * 2;
            let totalSize = this.estimateTotalSize();
            if (totalSize + itemSize > this.maxSize) {
                this.cleanup(true);
                totalSize = this.estimateTotalSize();
                if (totalSize + itemSize > this.maxSize) {
                    this.evictLRU(5);
                }
            }
            localStorage.setItem(storageKey, serialized);
            this.activeCache.add(storageKey);
            this.updateAccessOrder(storageKey);
            this.cacheStats.size += itemSize;
            this.saveStats();
            return true;
        } catch (error) {
            console.warn('缓存设置失败:', error);
            return false;
        }
    }

    get(key) {
        try {
            const storageKey = this.generateKey('data', key);
            const cached = localStorage.getItem(storageKey);
            if (!cached) {
                this.cacheStats.misses++;
                this.saveStats();
                return null;
            }
            const cacheItem = JSON.parse(cached);
            if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
                this.remove(key);
                this.cacheStats.misses++;
                this.saveStats();
                return null;
            }
            this.updateAccessOrder(storageKey);
            this.activeCache.add(storageKey);
            this.cacheStats.hits++;
            this.saveStats();
            return cacheItem.data;
        } catch (error) {
            console.warn('缓存获取失败:', error);
            this.cacheStats.misses++;
            this.saveStats();
            return null;
        }
    }

    updateAccessOrder(storageKey) {
        const idx = this.accessOrder.indexOf(storageKey);
        if (idx !== -1) this.accessOrder.splice(idx, 1);
        this.accessOrder.push(storageKey);
    }

    evictLRU(count = 5) {
        const toRemove = this.accessOrder.splice(0, Math.min(count, this.accessOrder.length));
        for (const key of toRemove) {
            localStorage.removeItem(key);
            this.activeCache.delete(key);
            const item = localStorage.getItem(key);
            if (item) this.cacheStats.size -= item.length * 2;
        }
        this.saveStats();
    }

    remove(key) {
        try {
            const storageKey = this.generateKey('data', key);
            const cached = localStorage.getItem(storageKey);
            if (cached) this.cacheStats.size -= cached.length * 2;
            localStorage.removeItem(storageKey);
            this.activeCache.delete(storageKey);
            const idx = this.accessOrder.indexOf(storageKey);
            if (idx !== -1) this.accessOrder.splice(idx, 1);
            this.saveStats();
            return true;
        } catch { return false; }
    }

    cleanup(force = false) {
        const now = Date.now();
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix + 'data_')) {
                try {
                    const cached = localStorage.getItem(key);
                    const cacheItem = JSON.parse(cached);
                    if (now - cacheItem.timestamp > cacheItem.ttl) {
                        toRemove.push(key);
                        this.cacheStats.size -= cached.length * 2;
                    }
                } catch { toRemove.push(key); }
            }
        }
        toRemove.forEach(key => {
            localStorage.removeItem(key);
            this.activeCache.delete(key);
            const idx = this.accessOrder.indexOf(key);
            if (idx !== -1) this.accessOrder.splice(idx, 1);
        });
        if (toRemove.length) this.saveStats();
        return toRemove.length;
    }

    clear() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) keys.push(key);
        }
        keys.forEach(k => localStorage.removeItem(k));
        this.activeCache.clear();
        this.accessOrder = [];
        this.cacheStats = { hits: 0, misses: 0, size: 0 };
        this.saveStats();
        return true;
    }

    getStats() {
        return { ...this.cacheStats, hitRate: this.cacheStats.hits / (this.cacheStats.hits+this.cacheStats.misses) || 0, activeCacheCount: this.activeCache.size };
    }

    preloadResource(url, type = 'audio') {
        return new Promise((resolve, reject) => {
            if (type === 'audio') {
                const audio = new Audio();
                audio.preload = 'metadata';
                audio.onloadedmetadata = () => resolve(url);
                audio.onerror = reject;
                audio.src = url;
            } else if (type === 'image') {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = reject;
                img.src = url;
            }
        });
    }
}

window.CacheManager = CacheManager;