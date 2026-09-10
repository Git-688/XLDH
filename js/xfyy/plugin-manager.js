
class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        // ===== 新增：重试配置 =====
        this.FETCH_MAX_RETRIES = 2;
        this.FETCH_RETRY_BASE_MS = 500;
        this.initializePlugins();
    }

    // ---------- 代理请求 ----------
    async proxyFetch(originalUrl) {
        const apiBase = Utils.getApiBase();
        const proxyUrl = `${apiBase}/music-proxy?url=${encodeURIComponent(originalUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`代理请求失败: ${response.status}`);
        const contentType = response.headers.get('content-type') || '';
        return contentType.includes('application/json') ? await response.json() : await response.text();
    }

    // ---------- 公共请求方法（含重试 + 空数组不缓存） ----------
    async _fetchFromMeting(server, type, id) {
        const cacheKey = `${server}_${type}_${id}`;
        const cached = this.cacheManager.get(cacheKey);
        if (cached && this._isCacheValid(cached)) return cached;

        const originalUrl = `https://api.i-meto.com/meting/api?server=${server}&type=${type}&id=${encodeURIComponent(id)}`;
        const ttl = type === 'search' ? 10 * 60 * 1000 : 30 * 60 * 1000;

        let lastError = null;
        // ===== 新增：最多尝试 FETCH_MAX_RETRIES + 1 次 =====
        for (let attempt = 0; attempt <= this.FETCH_MAX_RETRIES; attempt++) {
            try {
                const data = await this.proxyFetch(originalUrl);

                // ===== 修复：数据格式校验（非数组视为失败） =====
                if (!Array.isArray(data)) {
                    throw new Error('上游返回数据格式错误（非数组）');
                }
                // ===== 修复：空数组视为失败，触发重试，且不缓存 =====
                if (data.length === 0) {
                    throw new Error('上游返回空数组（可能被限流或暂时无数据）');
                }

                const formatted = data.map(song => this._formatSong(song, server));
                // ===== 只有非空结果才写入缓存 =====
                this.cacheManager.set(cacheKey, formatted, ttl);
                return formatted;
            } catch (error) {
                lastError = error;
                // 最后一次尝试失败，直接跳出
                if (attempt >= this.FETCH_MAX_RETRIES) break;
                // 指数退避
                const delay = this.FETCH_RETRY_BASE_MS * Math.pow(2, attempt);
                console.warn(`[PluginManager] ${server}/${type} 第 ${attempt + 1} 次失败: ${error.message}，${delay}ms 后重试`);
                await this.sleep(delay);
            }
        }

        console.error(`[PluginManager] ${server}/${type} 最终失败:`, lastError?.message || '未知错误');
        // 关键改动：失败时返回空数组（兼容调用方），但绝不写缓存
        return [];
    }

    _isCacheValid(cached) {
        return cached && Array.isArray(cached) && cached.length > 0;
    }

    _formatSong(song, source) {
        return {
            id: song.id,
            title: song.title,
            artist: song.author,
            src: song.url,
            cover: song.pic,
            lrc: song.lrc,
            isOnline: true,
            source: source
        };
    }

    // ---------- 插件初始化 ----------
    initializePlugins() {
        this._registerPlugin('netease', {
            name: '网易云音乐',
            version: '1.0.3',
            getPlaylist: (id) => this._fetchFromMeting('netease', 'playlist', id),
            search: (keyword) => this._fetchFromMeting('netease', 'search', keyword),
            getDownloadUrl: (songId) => `https://music.163.com/song/media/outer/url?id=${songId}.mp3`
        });

        this._registerPlugin('qq', {
            name: 'QQ音乐',
            version: '1.0.2',
            getPlaylist: (id) => this._fetchFromMeting('tencent', 'playlist', id),
            search: (keyword) => this._fetchFromMeting('tencent', 'search', keyword),
            getDownloadUrl: (songId) => `https://dl.stream.qqmusic.qq.com/${songId}.mp3`
        });

        this._registerPlugin('local', {
            name: '本地音乐',
            version: '1.0.1',
            getPlaylist: async () => {
                if (window.localMusicData && Array.isArray(window.localMusicData)) return window.localMusicData;
                if (typeof window.getLocalMusicList === 'function') return window.getLocalMusicList();
                return [];
            },
            search: async () => [],
            getDownloadUrl: (songId) => songId
        });
    }

    _registerPlugin(id, plugin) {
        this.plugins.set(id, { id, type: 'builtin', ...plugin, enabled: true });
    }

    // ---------- 公共 API ----------
    getPlugin(id) { return this.plugins.get(id); }
    setCurrentApi(apiId) { if (this.plugins.has(apiId)) { this.currentApi = apiId; return true; } return false; }
    getCurrentApi() { return this.currentApi; }

    async getPlaylist(apiId, playlistId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin?.getPlaylist) throw new Error(`插件 ${apiId} 不支持获取歌单`);
        if (!plugin.enabled) throw new Error(`插件 ${apiId} 已被禁用`);
        return await plugin.getPlaylist(playlistId);
    }

    async search(apiId, keyword) {
        const plugin = this.getPlugin(apiId);
        if (!plugin?.search) throw new Error(`插件 ${apiId} 不支持搜索`);
        if (!plugin.enabled) throw new Error(`插件 ${apiId} 已被禁用`);
        try {
            return await plugin.search(keyword);
        } catch (e) {
            // ===== 修复：明确标注为失败（调用方拿到空数组时可据此日志排查） =====
            console.warn(`[PluginManager] 搜索 ${apiId} 失败:`, e?.message || e);
            return [];
        }
    }

    async getDownloadUrl(apiId, songId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin?.getDownloadUrl) throw new Error(`插件 ${apiId} 不支持下载`);
        return await plugin.getDownloadUrl(songId);
    }

    // ---------- 预加载 ----------
    async preloadSong(song) {
        const promises = [];
        if (song.src) promises.push(this.cacheManager.preloadResource(song.src, 'audio'));
        if (song.cover) promises.push(this.cacheManager.preloadResource(song.cover, 'image'));
        try { await Promise.all(promises); return true; } catch(e) { return false; }
    }

    async preloadMultiple(songs, concurrent = 3) {
        const results = [];
        for (let i = 0; i < songs.length; i += concurrent) {
            const batch = songs.slice(i, i + concurrent);
            const batchResults = await Promise.allSettled(batch.map(s => this.preloadSong(s)));
            results.push(...batchResults);
            if (i + concurrent < songs.length) await this.sleep(100);
        }
        return results;
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ---------- 插件管理（精简） ----------
    enablePlugin(pluginId) { const p = this.getPlugin(pluginId); if(p) { p.enabled = true; return true; } return false; }
    disablePlugin(pluginId) { const p = this.getPlugin(pluginId); if(p) { p.enabled = false; return true; } return false; }
    isPluginEnabled(pluginId) { const p = this.getPlugin(pluginId); return p ? p.enabled : false; }

    // ===== 修复：两阶段提交，失败时不会污染现有插件表 =====
    async reloadPlugins() {
        // 阶段 1：在临时 Map 中构建新插件表
        const savedPlugins = this.plugins;
        const newPlugins = new Map();
        this.plugins = newPlugins;
        try {
            this.initializePlugins();
            // 阶段 2：构建成功，替换旧的（旧 Map 交由 GC）
            this.plugins = newPlugins;
            return true;
        } catch (e) {
            // 阶段 2 失败：回滚到旧 Map，新 Map 直接丢弃
            this.plugins = savedPlugins;
            console.error('[PluginManager] reloadPlugins 失败，已回滚:', e?.message || e);
            return false;
        }
    }

    getPluginInfo(pluginId) {
        const p = this.getPlugin(pluginId);
        if(!p) return null;
        return { id: p.id, name: p.name, version: p.version, description: p.description, enabled: p.enabled, type: p.type };
    }
}

window.PluginManager = PluginManager;