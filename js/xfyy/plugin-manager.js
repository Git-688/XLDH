/**
 * 插件管理器 - 支持多个音乐API源（稳定版，支持多备用API）
 * 负责管理不同音乐平台的插件，包括注册、加载和调用
 */

class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    /**
     * 通用API请求封装（支持备用端点）
     */
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

    /**
     * 初始化所有内置插件
     */
    initializePlugins() {
        // ========== 网易云音乐插件（支持多备用API） ==========
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
                    console.error('网易云音乐API请求失败:', error);
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
                    // 补充缺失的 src
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

        // ========== QQ音乐插件 ==========
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '1.0.2',
            description: '支持多备用API端点',
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
                    let songs = [];
                    if (Array.isArray(data)) {
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    }
                    
                    const formatted = songs.map(song => this.formatSong(song, 'qq'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('QQ音乐API请求失败:', error);
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
                    let songs = [];
                    if (Array.isArray(data)) {
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    }
                    
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

        // ========== 酷狗音乐插件 ==========
        this.registerPlugin('kg', {
            name: '酷狗音乐',
            version: '1.0.1',
            description: '基于 injahow 镜像 API',
            getPlaylist: async (playlistId) => {
                const cacheKey = `kg_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=kugou&type=playlist&id=${playlistId}`);
                    if (!response.ok) throw new Error('API 响应错误');
                    const data = await response.json();
                    let songs = [];
                    if (Array.isArray(data)) {
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    }
                    const formatted = songs.map(song => this.formatSong(song, 'kg'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('酷狗音乐API请求失败:', error);
                    return []; // 返回空数组而不是抛出错误
                }
            },
            search: async (keyword) => {
                const cacheKey = `kg_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=kugou&type=search&id=${encodeURIComponent(keyword)}`);
                    if (!response.ok) throw new Error('搜索请求失败');
                    const data = await response.json();
                    let songs = [];
                    if (Array.isArray(data)) {
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    }
                    const formatted = songs.map(song => this.formatSong(song, 'kg'));
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('酷狗搜索失败:', error);
                    return [];
                }
            },
            getDownloadUrl: async (songId) => {
                return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
            }
        });

        // ========== 酷我音乐插件 ==========
        this.registerPlugin('kuwo', {
            name: '酷我音乐',
            version: '1.0.0',
            description: '基于 injahow 镜像 API',
            getPlaylist: async (playlistId) => {
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=kuwo&type=playlist&id=${playlistId}`);
                    if (!response.ok) throw new Error('API 响应错误');
                    const data = await response.json();
                    let songs = [];
                    if (Array.isArray(data)) {
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    }
                    return songs.map(song => this.formatSong(song, 'kuwo'));
                } catch (error) {
                    console.error('酷我音乐API请求失败:', error);
                    return [];
                }
            },
            search: async (keyword) => {
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=kuwo&type=search&id=${encodeURIComponent(keyword)}`);
                    if (!response.ok) throw new Error('搜索请求失败');
                    const data = await response.json();
                    let songs = [];
                    if (Array.isArray(data)) {
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    }
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
            description: '基于抖音热歌榜API',
            getPlaylist: async (playlistId) => {
                try {
                    const response = await fetch('https://api.injahow.cn/meting/?type=playlist&id=2809513713');
                    if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
                    const data = await response.json();
                    return this.formatDouyinResponse(data);
                } catch (error) {
                    console.error('抖音热歌榜API请求失败:', error);
                    return []; // 返回空数组避免崩溃
                }
            },
            search: async (keyword) => {
                return [];
            },
            getDownloadUrl: async (songId) => {
                return songId;
            }
        });

        // ========== 翻译插件 ==========
        this.registerPlugin('translator', {
            name: '歌词翻译器',
            version: '1.0.0',
            description: '歌词翻译功能',
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

    /**
     * 格式化歌曲信息
     */
    formatSong(song, source) {
        const id = song.id || song.songid || song.mid || Utils.generateId();
        const title = song.title || song.name || '未知歌曲';
        const artist = song.author || song.artist || song.singer || '未知歌手';
        const src = song.url || '';
        const cover = song.pic || song.cover || '';
        const lrc = song.lrc || '';
        return {
            id: id,
            title: title,
            artist: artist,
            src: src,
            cover: cover,
            lrc: lrc,
            isOnline: true,
            source: source
        };
    }

    /**
     * 处理抖音热歌榜API响应
     */
    formatDouyinResponse(data) {
        if (!data) return [];
        if (data.code === 200 && data.data && Array.isArray(data.data)) {
            return data.data.map(song => this.formatSong(song, 'migu')).filter(song => song.src);
        }
        if (Array.isArray(data)) {
            return data.map(song => this.formatSong(song, 'migu')).filter(song => song.src);
        }
        return [];
    }

    /**
     * 注册插件
     */
    registerPlugin(id, plugin) {
        this.plugins.set(id, {
            id,
            type: 'builtin',
            ...plugin,
            enabled: true
        });
        console.log(`插件 ${id} 注册成功`);
    }

    /**
     * 获取插件
     */
    getPlugin(id) {
        return this.plugins.get(id);
    }

    /**
     * 获取所有插件
     */
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * 设置当前API
     */
    setCurrentApi(apiId) {
        if (this.plugins.has(apiId)) {
            this.currentApi = apiId;
            return true;
        }
        return false;
    }

    /**
     * 获取当前API
     */
    getCurrentApi() {
        return this.currentApi;
    }

    /**
     * 获取歌单
     */
    async getPlaylist(apiId, playlistId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.getPlaylist) {
            throw new Error(`插件 ${apiId} 不支持获取歌单`);
        }
        if (!plugin.enabled) {
            throw new Error(`插件 ${apiId} 已被禁用`);
        }
        return await plugin.getPlaylist(playlistId);
    }

    /**
     * 搜索歌曲
     */
    async search(apiId, keyword) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.search) {
            throw new Error(`插件 ${apiId} 不支持搜索`);
        }
        if (!plugin.enabled) {
            throw new Error(`插件 ${apiId} 已被禁用`);
        }
        try {
            return await plugin.search(keyword);
        } catch (error) {
            console.warn(`搜索 ${apiId} 失败:`, error);
            return []; // 返回空数组而不是抛出错误
        }
    }

    /**
     * 预加载歌曲资源
     */
    async preloadSong(song) {
        const promises = [];
        if (song.src) {
            promises.push(this.cacheManager.preloadResource(song.src, 'audio'));
        }
        if (song.cover) {
            promises.push(this.cacheManager.preloadResource(song.cover, 'image'));
        }
        try {
            await Promise.all(promises);
            return true;
        } catch (error) {
            console.warn('预加载资源失败:', error);
            return false;
        }
    }

    /**
     * 获取下载URL
     */
    async getDownloadUrl(apiId, songId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.getDownloadUrl) {
            throw new Error(`插件 ${apiId} 不支持下载`);
        }
        if (!plugin.enabled) {
            throw new Error(`插件 ${apiId} 已被禁用`);
        }
        return await plugin.getDownloadUrl(songId);
    }

    /**
     * 翻译文本
     */
    async translateText(text, targetLang = 'zh') {
        const translator = this.getPlugin('translator');
        if (!translator || !translator.translateText) {
            return text;
        }
        return await translator.translateText(text, targetLang);
    }

    /**
     * 批量预加载
     */
    async preloadMultiple(songs, concurrent = 3) {
        const results = [];
        for (let i = 0; i < songs.length; i += concurrent) {
            const batch = songs.slice(i, i + concurrent);
            const batchPromises = batch.map(song => this.preloadSong(song));
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
            if (i + concurrent < songs.length) {
                await this.sleep(100);
            }
        }
        return results;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 启用插件
     */
    enablePlugin(pluginId) {
        const plugin = this.getPlugin(pluginId);
        if (plugin) {
            plugin.enabled = true;
            return true;
        }
        return false;
    }

    /**
     * 禁用插件
     */
    disablePlugin(pluginId) {
        const plugin = this.getPlugin(pluginId);
        if (plugin) {
            plugin.enabled = false;
            return true;
        }
        return false;
    }

    /**
     * 检查插件是否启用
     */
    isPluginEnabled(pluginId) {
        const plugin = this.getPlugin(pluginId);
        return plugin ? plugin.enabled : false;
    }

    /**
     * 获取插件统计
     */
    getPluginStats() {
        const stats = { total: this.plugins.size, enabled: 0, disabled: 0 };
        for (const plugin of this.plugins.values()) {
            plugin.enabled ? stats.enabled++ : stats.disabled++;
        }
        return stats;
    }

    /**
     * 重新加载插件
     */
    async reloadPlugins() {
        console.log('重新加载所有插件...');
        const oldPlugins = new Map(this.plugins);
        this.plugins.clear();
        try {
            this.initializePlugins();
            console.log('插件重新加载成功');
            return true;
        } catch (error) {
            console.error('插件重新加载失败，恢复旧插件:', error);
            this.plugins = oldPlugins;
            return false;
        }
    }

    /**
     * 验证插件兼容性
     */
    validatePluginCompatibility(plugin) {
        const requiredMethods = ['getPlaylist', 'search'];
        const missingMethods = requiredMethods.filter(method => !plugin[method]);
        if (missingMethods.length > 0) {
            throw new Error(`插件缺少必要方法: ${missingMethods.join(', ')}`);
        }
        return true;
    }

    /**
     * 获取插件信息
     */
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