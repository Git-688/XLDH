/**
 * 插件管理器 - 支持多个音乐API源（稳定版，使用 api.injahow.cn 镜像 + 备用）
 * 整合独立播放器的健壮实现，修复网易云搜索、下载等功能
 */

class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    // 通用请求封装（支持备用端点）
    async _fetchWithFallback(urls, options = {}) {
        for (const url of urls) {
            try {
                const response = await fetch(url, options);
                if (response.ok) {
                    const data = await response.json();
                    return data;
                }
            } catch (e) {
                console.warn(`API请求失败: ${url}`, e);
            }
        }
        throw new Error('所有API端点均请求失败');
    }

    initializePlugins() {
        // ========== 网易云音乐插件（独立播放器稳定版） ==========
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '1.0.3',
            description: '支持多备用API端点',
            getPlaylist: async (playlistId) => {
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const apiUrls = [
                    `https://api.injahow.cn/meting/?server=netease&type=playlist&id=${playlistId}`,
                    `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${playlistId}`
                ];

                try {
                    const data = await this._fetchWithFallback(apiUrls);
                    let songs = [];
                    if (Array.isArray(data)) {
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    } else if (data && data.result && Array.isArray(data.result)) {
                        songs = data.result;
                    }
                    if (!songs.length) throw new Error('歌单为空');
                    const formatted = songs.map(song => this.formatSong(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云音乐歌单请求失败:', error);
                    throw new Error('获取歌单失败');
                }
            },
            search: async (keyword) => {
                const cacheKey = `netease_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const apiUrls = [
                    `https://api.injahow.cn/meting/?server=netease&type=search&id=${encodeURIComponent(keyword)}`,
                    `https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(keyword)}`
                ];

                try {
                    const data = await this._fetchWithFallback(apiUrls);
                    let songs = [];
                    if (Array.isArray(data)) {
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    } else if (data && data.result && Array.isArray(data.result.songs)) {
                        songs = data.result.songs;
                    } else if (data && data.songs && Array.isArray(data.songs)) {
                        songs = data.songs;
                    }
                    if (!songs.length) return [];
                    const formatted = songs.map(song => this.formatSong(song, 'netease'));
                    // 补充缺失的 src（网易官方外链）
                    for (const song of formatted) {
                        if (!song.src && song.id) {
                            song.src = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
                        }
                    }
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

        // ========== QQ音乐插件（同样使用稳定镜像） ==========
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '1.0.2',
            getPlaylist: async (playlistId) => {
                const cacheKey = `qq_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const apiUrls = [
                    `https://api.injahow.cn/meting/?server=tencent&type=playlist&id=${playlistId}`,
                    `https://api.i-meto.com/meting/api?server=tencent&type=playlist&id=${playlistId}`
                ];
                try {
                    const data = await this._fetchWithFallback(apiUrls);
                    let songs = Array.isArray(data) ? data : (data?.data || []);
                    const formatted = songs.map(song => this.formatSong(song, 'qq'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('QQ音乐歌单请求失败:', error);
                    throw new Error('获取歌单失败');
                }
            },
            search: async (keyword) => {
                const cacheKey = `qq_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const apiUrls = [
                    `https://api.injahow.cn/meting/?server=tencent&type=search&id=${encodeURIComponent(keyword)}`,
                    `https://api.i-meto.com/meting/api?server=tencent&type=search&id=${encodeURIComponent(keyword)}`
                ];
                try {
                    const data = await this._fetchWithFallback(apiUrls);
                    let songs = Array.isArray(data) ? data : (data?.data || []);
                    const formatted = songs.map(song => this.formatSong(song, 'qq'));
                    for (const song of formatted) {
                        if (!song.src && song.id) {
                            song.src = `https://dl.stream.qqmusic.qq.com/${song.id}.mp3`;
                        }
                    }
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

        // ========== 酷狗音乐插件（使用 injahow 镜像） ==========
        this.registerPlugin('kg', {
            name: '酷狗音乐',
            version: '1.0.1',
            getPlaylist: async (playlistId) => {
                const cacheKey = `kg_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=kugou&type=playlist&id=${playlistId}`);
                    if (!response.ok) throw new Error();
                    const data = await response.json();
                    let songs = Array.isArray(data) ? data : (data?.data || []);
                    const formatted = songs.map(song => this.formatSong(song, 'kg'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('酷狗音乐API请求失败:', error);
                    return [];
                }
            },
            search: async (keyword) => {
                const cacheKey = `kg_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=kugou&type=search&id=${encodeURIComponent(keyword)}`);
                    const data = await response.json();
                    let songs = Array.isArray(data) ? data : (data?.data || []);
                    const formatted = songs.map(song => this.formatSong(song, 'kg'));
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('酷狗搜索失败:', error);
                    return [];
                }
            },
            getDownloadUrl: async (songId) => {
                return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`; // 降级
            }
        });

        // ========== 酷我音乐插件 ==========
        this.registerPlugin('kuwo', {
            name: '酷我音乐',
            version: '1.0.0',
            getPlaylist: async (playlistId) => {
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=kuwo&type=playlist&id=${playlistId}`);
                    const data = await response.json();
                    let songs = Array.isArray(data) ? data : (data?.data || []);
                    return songs.map(song => this.formatSong(song, 'kuwo'));
                } catch (error) {
                    console.error('酷我音乐API请求失败:', error);
                    return [];
                }
            },
            search: async (keyword) => {
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=kuwo&type=search&id=${encodeURIComponent(keyword)}`);
                    const data = await response.json();
                    let songs = Array.isArray(data) ? data : (data?.data || []);
                    return songs.map(song => this.formatSong(song, 'kuwo'));
                } catch (error) {
                    console.error('酷我搜索失败:', error);
                    return [];
                }
            },
            getDownloadUrl: async (songId) => {
                return `https://antiserver.kuwo.cn/anti.s?format=mp3&rid=${songId}&type=convert_url&response=url`;
            }
        });

        // ========== 抖音热歌榜插件 ==========
        this.registerPlugin('migu', {
            name: '抖音热歌榜',
            version: '1.0.0',
            getPlaylist: async () => {
                try {
                    const response = await fetch('https://api.injahow.cn/meting/?type=playlist&id=2809513713');
                    if (!response.ok) throw new Error();
                    const data = await response.json();
                    return this.formatDouyinResponse(data);
                } catch (error) {
                    console.error('抖音热歌榜API请求失败:', error);
                    return [];
                }
            },
            search: async () => [],
            getDownloadUrl: async (songId) => songId
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

        // ========== 翻译插件（可选） ==========
        this.registerPlugin('translator', {
            name: '歌词翻译器',
            version: '1.0.0',
            translateText: async (text, targetLang = 'zh') => {
                const cacheKey = `translation_${targetLang}_${btoa(text)}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const response = await fetch(
                        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
                    );
                    const data = await response.json();
                    if (data.responseStatus === 200 && data.responseData) {
                        const translation = data.responseData.translatedText;
                        this.cacheManager.set(cacheKey, translation, 24 * 60 * 60 * 1000);
                        return translation;
                    }
                    return text;
                } catch (error) {
                    console.warn('翻译失败:', error);
                    return text;
                }
            }
        });
    }

    formatSong(song, source) {
        const id = song.id || song.songid || song.mid || Utils.generateId();
        const title = song.title || song.name || '未知歌曲';
        const artist = song.author || song.artist || song.singer || '未知歌手';
        const src = song.url || '';
        const cover = song.pic || song.cover || '';
        const lrc = song.lrc || '';
        return { id, title, artist, src, cover, lrc, isOnline: true, source };
    }

    formatDouyinResponse(data) {
        if (!data) return [];
        if (data.code === 200 && data.data && Array.isArray(data.data)) {
            return data.data.map(song => this.formatSong(song, 'migu')).filter(s => s.src);
        }
        if (Array.isArray(data)) {
            return data.map(song => this.formatSong(song, 'migu')).filter(s => s.src);
        }
        return [];
    }

    registerPlugin(id, plugin) {
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
        } catch (error) {
            console.warn(`搜索 ${apiId} 失败:`, error);
            return [];
        }
    }

    async preloadSong(song) {
        const promises = [];
        if (song.src) promises.push(this.cacheManager.preloadResource(song.src, 'audio'));
        if (song.cover) promises.push(this.cacheManager.preloadResource(song.cover, 'image'));
        try {
            await Promise.all(promises);
            return true;
        } catch (e) { return false; }
    }

    async getDownloadUrl(apiId, songId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.getDownloadUrl) throw new Error(`插件 ${apiId} 不支持下载`);
        return await plugin.getDownloadUrl(songId);
    }

    async translateText(text, targetLang = 'zh') {
        const translator = this.getPlugin('translator');
        if (!translator || !translator.translateText) return text;
        return await translator.translateText(text, targetLang);
    }

    async preloadMultiple(songs, concurrent = 3) {
        const results = [];
        for (let i = 0; i < songs.length; i += concurrent) {
            const batch = songs.slice(i, i + concurrent);
            const batchPromises = batch.map(song => this.preloadSong(song));
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
            if (i + concurrent < songs.length) await this.sleep(100);
        }
        return results;
    }

    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    enablePlugin(pluginId) {
        const plugin = this.getPlugin(pluginId);
        if (plugin) { plugin.enabled = true; return true; }
        return false;
    }
    disablePlugin(pluginId) {
        const plugin = this.getPlugin(pluginId);
        if (plugin) { plugin.enabled = false; return true; }
        return false;
    }
    isPluginEnabled(pluginId) { const plugin = this.getPlugin(pluginId); return plugin ? plugin.enabled : false; }
    getPluginStats() {
        const stats = { total: this.plugins.size, enabled: 0, disabled: 0 };
        for (const plugin of this.plugins.values()) plugin.enabled ? stats.enabled++ : stats.disabled++;
        return stats;
    }
    async reloadPlugins() {
        console.log('重新加载所有插件...');
        const oldPlugins = new Map(this.plugins);
        this.plugins.clear();
        try {
            this.initializePlugins();
            return true;
        } catch (error) {
            this.plugins = oldPlugins;
            return false;
        }
    }
    validatePluginCompatibility(plugin) {
        const required = ['getPlaylist', 'search'];
        const missing = required.filter(m => !plugin[m]);
        if (missing.length) throw new Error(`插件缺少必要方法: ${missing.join(', ')}`);
        return true;
    }
    getPluginInfo(pluginId) {
        const plugin = this.getPlugin(pluginId);
        if (!plugin) return null;
        return {
            id: plugin.id,
            name: plugin.name,
            version: plugin.version,
            description: plugin.description,
            enabled: plugin.enabled,
            type: plugin.type
        };
    }
}

window.PluginManager = PluginManager;