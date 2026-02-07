/**
 * 缓存管理器
 */

class CacheManager {
    constructor() {
        this.prefix = 'music_player_';
        this.defaultTTL = 24 * 60 * 60 * 1000; // 24小时
        this.cacheStats = this.loadStats();
        this.activeCache = new Set(); // 记录正在使用的缓存键
    }

    /**
     * 加载缓存统计信息
     */
    loadStats() {
        try {
            return JSON.parse(localStorage.getItem(this.prefix + 'cache_stats')) || {
                hits: 0,
                misses: 0,
                size: 0
            };
        } catch {
            return { hits: 0, misses: 0, size: 0 };
        }
    }

    /**
     * 保存缓存统计信息
     */
    saveStats() {
        try {
            localStorage.setItem(this.prefix + 'cache_stats', JSON.stringify(this.cacheStats));
        } catch (error) {
            console.warn('保存缓存统计失败:', error);
        }
    }

    /**
     * 生成缓存键
     */
    generateKey(type, id) {
        return `${this.prefix}${type}_${id}`;
    }

    /**
     * 设置缓存并标记为活跃
     */
    set(key, data, ttl = this.defaultTTL) {
        try {
            const cacheItem = {
                data: data,
                timestamp: Date.now(),
                ttl: ttl
            };
            
            const storageKey = this.generateKey('data', key);
            const serialized = JSON.stringify(cacheItem);
            
            localStorage.setItem(storageKey, serialized);
            this.activeCache.add(storageKey); // 标记为活跃缓存
            
            // 更新统计
            this.cacheStats.size += serialized.length;
            this.saveStats();
            
            return true;
        } catch (error) {
            console.warn('缓存设置失败:', error);
            return false;
        }
    }

    /**
     * 获取缓存并标记为活跃
     */
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
            
            // 检查是否过期
            if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
                this.remove(key);
                this.cacheStats.misses++;
                this.saveStats();
                return null;
            }

            this.activeCache.add(storageKey); // 标记为活跃
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

    /**
     * 删除缓存
     */
    remove(key) {
        try {
            const storageKey = this.generateKey('data', key);
            const cached = localStorage.getItem(storageKey);
            
            if (cached) {
                this.cacheStats.size -= cached.length;
            }
            
            localStorage.removeItem(storageKey);
            this.activeCache.delete(storageKey); // 从活跃缓存中移除
            this.saveStats();
            return true;
        } catch (error) {
            console.warn('缓存删除失败:', error);
            return false;
        }
    }

    /**
     * 清理过期缓存（优先清理非活跃缓存）
     */
    cleanup() {
        try {
            const keysToRemove = [];
            let totalSize = 0;

            // 首先清理过期且非活跃的缓存
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix + 'data_')) {
                    try {
                        const cached = localStorage.getItem(key);
                        const cacheItem = JSON.parse(cached);
                        
                        const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;
                        const isActive = this.activeCache.has(key);
                        
                        if (isExpired && !isActive) {
                            keysToRemove.push(key);
                            totalSize += cached.length;
                        }
                    } catch {
                        keysToRemove.push(key);
                    }
                }
            }

            // 如果还有空间问题，清理过期的活跃缓存
            if (keysToRemove.length === 0) {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix + 'data_')) {
                        try {
                            const cached = localStorage.getItem(key);
                            const cacheItem = JSON.parse(cached);
                            
                            if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
                                keysToRemove.push(key);
                                totalSize += cached.length;
                                this.activeCache.delete(key);
                            }
                        } catch {
                            keysToRemove.push(key);
                        }
                    }
                }
            }

            // 删除过期缓存
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            // 更新统计
            this.cacheStats.size -= totalSize;
            this.saveStats();

            return keysToRemove.length;
        } catch (error) {
            console.warn('缓存清理失败:', error);
            return 0;
        }
    }

    /**
     * 清空所有缓存
     */
    clear() {
        try {
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            this.activeCache.clear();
            this.cacheStats = { hits: 0, misses: 0, size: 0 };
            this.saveStats();
            
            return true;
        } catch (error) {
            console.warn('缓存清空失败:', error);
            return false;
        }
    }

    /**
     * 获取缓存统计
     */
    getStats() {
        return {
            ...this.cacheStats,
            hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
            activeCacheCount: this.activeCache.size
        };
    }

    /**
     * 预加载资源
     */
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

    /**
     * 标记缓存为非活跃
     */
    markInactive(key) {
        const storageKey = this.generateKey('data', key);
        this.activeCache.delete(storageKey);
    }
}

// 导出到全局作用域
window.CacheManager = CacheManager;