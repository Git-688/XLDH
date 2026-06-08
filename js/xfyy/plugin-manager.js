/**
 * 插件管理器 - 星聚导航音乐播放器专用（使用 Worker 代理解决跨域）
 * 插件列表：netease（网易云）、qq（QQ音乐）、qishui（汽水音乐）、local（本地音乐）
 */
class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    // 通过 Worker 代理请求（返回 JSON 或文本）
    async proxyFetch(originalUrl) {
        const apiBase = Utils.getApiBase();
        const proxyUrl = `${apiBase}/music-proxy?url=${encodeURIComponent(originalUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`代理请求失败: ${response.status}`);
        }
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    }

    initializePlugins() {
        // ========== 网易云音乐插件 ==========
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '1.0.3',
            getPlaylist: async (playlistId) => {
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const originalUrl = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${playlistId}`;
                    const data = await this.proxyFetch(originalUrl);
                    if (!Array.isArray(data)) throw new Error('数据格式错误');
                    const formatted = data.map(song => this.formatSong(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云歌单加载失败:', error);
                    throw new Error('获取歌单失败');
                }
            },
            search: async (keyword) => {
                const cacheKey = `netease_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const originalUrl = `https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(keyword)}`;
                    const data = await this.proxyFetch(originalUrl);
                    if (!Array.isArray(data)) throw new Error('数据格式错误');
                    const formatted = data.map(song => this.formatSong(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云搜索失败:', error);
                    throw new Error('搜索失败，请稍后重试');
                }
            },
            getDownloadUrl: async (songId) => {
                return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
            }
        });

        // ========== QQ音乐插件 ==========
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '1.0.2',
            getPlaylist: async (playlistId) => {
                const cacheKey = `qq_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const originalUrl = `https://api.i-meto.com/meting/api?server=tencent&type=playlist&id=${playlistId}`;
                    const data = await this.proxyFetch(originalUrl);
                    if (!Array.isArray(data)) throw new Error('数据格式错误');
                    const formatted = data.map(song => this.formatSong(song, 'qq'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('QQ音乐歌单加载失败:', error);
                    throw new Error('获取歌单失败');
                }
            },
            search: async (keyword) => {
                const cacheKey = `qq_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const originalUrl = `https://api.i-meto.com/meting/api?server=tencent&type=search&id=${encodeURIComponent(keyword)}`;
                    const data = await this.proxyFetch(originalUrl);
                    if (!Array.isArray(data)) throw new Error('数据格式错误');
                    const formatted = data.map(song => this.formatSong(song, 'qq'));
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('QQ音乐搜索失败:', error);
                    throw new Error('搜索失败');
                }
            },
            getDownloadUrl: async (songId) => {
                return `https://dl.stream.qqmusic.qq.com/${songId}.mp3`;
            }
        });

        // ========== 汽水音乐插件 ==========
        this.registerPlugin('qishui', {
            name: '汽水音乐',
            version: '1.0.1',
            getPlaylist: async (playlistId) => {
                const cacheKey = `qishui_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const token = '961D28A9C59C411C49C75FA3E9FAF24C';
                    let url = '';
                    if (playlistId === 'hot') {
                        url = `https://api.suol.cc/v1/music_qs.php?type=hot&token=${token}`;
                    } else if (playlistId === 'new') {
                        url = `https://api.suol.cc/v1/music_qs.php?type=new&token=${token}`;
                    } else if (playlistId === 'up') {
                        url = `https://api.suol.cc/v1/music_qs.php?type=up&token=${token}`;
                    } else {
                        url = `https://api.suol.cc/v1/music_qs.php?type=hot&token=${token}`;
                    }
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('API 响应错误');
                    const data = await response.json();
                    if (data.code !== 200 || !data.data || !Array.isArray(data.data)) {
                        throw new Error('数据格式错误');
                    }
                    const formatted = data.data.map(song => ({
                        id: song.id,
                        title: song.name,
                        artist: song.artist,
                        src: song.url,
                        cover: song.pic,
                        lrc: song.lrc,
                        isOnline: true,
                        source: 'qishui',
                        _needResolve: true
                    }));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('汽水音乐API请求失败:', error);
                    return [];
                }
            },
            search: async (keyword) => {
                const cacheKey = `qishui_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const token = '961D28A9C59C411C49C75FA3E9FAF24C';
                    const url = `https://api.suol.cc/v1/music_qs.php?type=search&keyword=${encodeURIComponent(keyword)}&token=${token}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.code !== 200 || !data.data || !Array.isArray(data.data)) {
                        throw new Error('搜索数据格式错误');
                    }
                    const formatted = data.data.map(song => ({
                        id: song.id,
                        title: song.name,
                        artist: song.artist,
                        src: song.url,
                        cover: song.pic,
                        lrc: song.lrc,
                        isOnline: true,
                        source: 'qishui',
                        _needResolve: true
                    }));
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('汽水音乐搜索失败:', error);
                    return [];
                }
            },
            _getSongUrl: async (songId, quality = 'standard') => {
                try {
                    const token = '961D28A9C59C411C49C75FA3E9FAF24C';
                    const url = `https://api.suol.cc/v1/music_qs.php?type=url&id=${songId}&quality=${quality}&token=${token}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.code === 200 && data.data && data.data.url) {
                        return {
                            url: data.data.url,
                            lyric: data.data.lrc || '',
                            pic: data.data.pic || ''
                        };
                    }
                    throw new Error('获取播放地址失败');
                } catch (error) {
                    console.error('解析汽水音乐播放地址失败:', error);
                    return { url: '', lyric: '', pic: '' };
                }
            }
        });

        // ========== 本地音乐插件 ==========
        this.registerPlugin('local', {
            name: '本地音乐',
            version: '1.0.1',
            getPlaylist: async () => {
                if (window.localMusicData && Array.isArray(window.localMusicData)) return window.localMusicData;
                if (typeof window.getLocalMusicList === 'function') return window.getLocalMusicList();
                return [];
            },
            search: async () => [],
            getDownloadUrl: async (songId) => songId
        });
    }

    formatSong(song, source) {
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

    registerPlugin(id, plugin) {
        if (this.plugins.has(id)) console.warn(`插件 ${id} 已存在，将被替换`);
        this.plugins.set(id, { id, type: 'builtin', ...plugin, enabled: true });
        console.log(`插件 ${id} 注册成功`);
    }

    getPlugin(id) { return this.plugins.get(id); }
    getAllPlugins() { return Array.from(this.plugins.values()); }
    setCurrentApi(apiId) { if (this.plugins.has(apiId)) { this.currentApi = apiId; return true; } return false; }
    getCurrentApi() { return this.currentApi; }

    async getPlaylist(apiId, playlistId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.getPlaylist) throw new Error(`插件 ${apiId} 不支持获取歌单`);
        if (!plugin.enabled) throw new Error(`插件 ${apiId} 已被禁用`);
        return await plugin.getPlaylist(playlistId);
    }

    async search(apiId, keyword) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.search) throw new Error(`插件 ${apiId} 不支持搜索`);
        if (!plugin.enabled) throw new Error(`插件 ${apiId} 已被禁用`);
        try {
            return await plugin.search(keyword);
        } catch (e) {
            console.warn(`搜索 ${apiId} 失败:`, e);
            return [];
        }
    }

    async preloadSong(song) {
        const promises = [];
        if (song.src) promises.push(this.cacheManager.preloadResource(song.src, 'audio'));
        if (song.cover) promises.push(this.cacheManager.preloadResource(song.cover, 'image'));
        try { await Promise.all(promises); return true; } catch(e) { return false; }
    }

    async getDownloadUrl(apiId, songId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.getDownloadUrl) throw new Error(`插件 ${apiId} 不支持下载`);
        return await plugin.getDownloadUrl(songId);
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

    enablePlugin(pluginId) { const p = this.getPlugin(pluginId); if(p) { p.enabled = true; return true; } return false; }
    disablePlugin(pluginId) { const p = this.getPlugin(pluginId); if(p) { p.enabled = false; return true; } return false; }
    isPluginEnabled(pluginId) { const p = this.getPlugin(pluginId); return p ? p.enabled : false; }
    getPluginStats() {
        const stats = { total: this.plugins.size, enabled: 0, disabled: 0 };
        for(const p of this.plugins.values()) p.enabled ? stats.enabled++ : stats.disabled++;
        return stats;
    }
    async reloadPlugins() {
        const old = new Map(this.plugins);
        this.plugins.clear();
        try { this.initializePlugins(); return true; } catch(e) { this.plugins = old; return false; }
    }
    validatePluginCompatibility(plugin) {
        const required = ['getPlaylist', 'search'];
        const missing = required.filter(m => !plugin[m]);
        if(missing.length) throw new Error(`插件缺少必要方法: ${missing.join(', ')}`);
        return true;
    }
    getPluginInfo(pluginId) {
        const p = this.getPlugin(pluginId);
        if(!p) return null;
        return { id: p.id, name: p.name, version: p.version, description: p.description, enabled: p.enabled, type: p.type };
    }
}

window.PluginManager = PluginManager;