/**
 * 插件管理器 - 支持多个音乐API源（修复网易云歌单/搜索 src 缺失）
 */
class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    initializePlugins() {
        // ========== 网易云音乐插件 ==========
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '1.0.1',
            description: '基于 meting API，自动补全播放链接',
            getPlaylist: async (playlistId) => {
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const response = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${playlistId}`);
                    if (!response.ok) throw new Error('API 响应错误');
                    const data = await response.json();
                    if (!Array.isArray(data)) throw new Error('数据格式错误');
                    
                    const formatted = data.map(song => {
                        const songObj = this.formatSong(song, 'netease');
                        // 补全缺失的 src（网易官方外链）
                        if (!songObj.src && songObj.id) {
                            songObj.src = `https://music.163.com/song/media/outer/url?id=${songObj.id}.mp3`;
                        }
                        return songObj;
                    });
                    
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

                try {
                    const response = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(keyword)}`);
                    if (!response.ok) throw new Error('搜索请求失败');
                    const data = await response.json();
                    if (!Array.isArray(data)) throw new Error('搜索数据格式错误');
                    
                    const formatted = data.map(song => {
                        const songObj = this.formatSong(song, 'netease');
                        if (!songObj.src && songObj.id) {
                            songObj.src = `https://music.163.com/song/media/outer/url?id=${songObj.id}.mp3`;
                        }
                        return songObj;
                    });
                    
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
            version: '1.0.0',
            description: '基于 meting API',
            getPlaylist: async (playlistId) => {
                const cacheKey = `qq_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const response = await fetch(`https://api.i-meto.com/meting/api?server=tencent&type=playlist&id=${playlistId}`);
                    const data = await response.json();
                    const formatted = data.map(song => {
                        const songObj = this.formatSong(song, 'qq');
                        if (!songObj.src && songObj.id) {
                            songObj.src = `https://dl.stream.qqmusic.qq.com/${songObj.id}.mp3`;
                        }
                        return songObj;
                    });
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

                try {
                    const response = await fetch(`https://api.i-meto.com/meting/api?server=tencent&type=search&id=${encodeURIComponent(keyword)}`);
                    const data = await response.json();
                    const formatted = data.map(song => {
                        const songObj = this.formatSong(song, 'qq');
                        if (!songObj.src && songObj.id) {
                            songObj.src = `https://dl.stream.qqmusic.qq.com/${songObj.id}.mp3`;
                        }
                        return songObj;
                    });
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
            version: '1.0.0',
            description: '基于酷狗音乐API',
            getPlaylist: async (playlistId) => {
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?type=playlist&id=${playlistId}&server=kugou`);
                    const data = await response.json();
                    if (data.data && data.data.tracks) {
                        return data.data.tracks.map(song => this.formatSong(song, 'kg'));
                    }
                    return [];
                } catch (error) {
                    console.error('酷狗音乐API请求失败:', error);
                    throw new Error('获取歌单失败');
                }
            },
            search: async (keyword) => {
                try {
                    const response = await fetch(`https://musicfreeapi.vercel.app/kugou/search?keyword=${encodeURIComponent(keyword)}`);
                    const data = await response.json();
                    if (data.data && Array.isArray(data.data)) {
                        return data.data.map(song => this.formatSong(song, 'kg'));
                    }
                    return [];
                } catch (error) {
                    console.error('酷狗搜索失败:', error);
                    throw new Error('搜索失败');
                }
            },
            getDownloadUrl: async (songId) => {
                return `https://musicfreeapi.vercel.app/kugou/url?id=${songId}`;
            }
        });

        // ========== 酷我音乐插件 ==========
        this.registerPlugin('kuwo', {
            name: '酷我音乐',
            version: '1.0.0',
            description: '基于 meting API',
            getPlaylist: async (playlistId) => {
                try {
                    const response = await fetch(`https://api.i-meto.com/meting/api?server=kuwo&type=playlist&id=${playlistId}`);
                    const data = await response.json();
                    return data.map(song => this.formatSong(song, 'kuwo'));
                } catch (error) {
                    console.error('酷我音乐API请求失败:', error);
                    throw new Error('获取歌单失败');
                }
            },
            search: async (keyword) => {
                try {
                    const response = await fetch(`https://api.i-meto.com/meting/api?server=kuwo&type=search&id=${encodeURIComponent(keyword)}`);
                    const data = await response.json();
                    return data.map(song => this.formatSong(song, 'kuwo'));
                } catch (error) {
                    console.error('酷我搜索失败:', error);
                    throw new Error('搜索失败');
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
            description: '基于 injahow 热歌榜API',
            getPlaylist: async (playlistId) => {
                try {
                    const response = await fetch('https://api.injahow.cn/meting/?type=playlist&id=2809513713');
                    if (!response.ok) throw new Error('HTTP错误');
                    const data = await response.json();
                    return this.formatDouyinResponse(data);
                } catch (error) {
                    console.error('抖音热歌榜API请求失败:', error);
                    throw new Error('获取抖音热歌榜失败');
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
                    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
                    const data = await response.json();
                    if (data.responseStatus === 200 && data.responseData) {
                        const translation = data.responseData.translatedText;
                        this.cacheManager.set(cacheKey, translation, 24 * 60 * 60 * 1000);
                        return translation;
                    }
                    throw new Error('翻译API返回错误');
                } catch (error) {
                    console.warn('翻译失败:', error);
                    return text;
                }
            }
        });
    }

    formatSong(song, source) {
        return {
            id: song.id || song.songid || song.hash || Utils.generateId(),
            title: song.title || song.name || song.songname || '未知歌曲',
            artist: song.author || song.artist || song.singer || '未知歌手',
            src: song.url || '',
            cover: song.pic || song.cover || '',
            lrc: song.lrc || '',
            isOnline: true,
            source: source
        };
    }

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

    registerPlugin(id, plugin) {
        if (this.plugins.has(id)) {
            console.warn(`插件 ${id} 已存在，将被替换`);
        }
        this.plugins.set(id, {
            id,
            type: 'builtin',
            ...plugin,
            enabled: true
        });
        console.log(`插件 ${id} 注册成功`);
    }

    getPlugin(id) {
        return this.plugins.get(id);
    }

    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    setCurrentApi(apiId) {
        if (this.plugins.has(apiId)) {
            this.currentApi = apiId;
            return true;
        }
        return false;
    }

    getCurrentApi() {
        return this.currentApi;
    }

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

    async search(apiId, keyword) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.search) {
            throw new Error(`插件 ${apiId} 不支持搜索`);
        }
        if (!plugin.enabled) {
            throw new Error(`插件 ${apiId} 已被禁用`);
        }
        return await plugin.search(keyword);
    }

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

    async translateText(text, targetLang = 'zh') {
        const translator = this.getPlugin('translator');
        if (!translator || !translator.translateText) {
            console.warn('翻译插件未找到，返回原始文本');
            return text;
        }
        return await translator.translateText(text, targetLang);
    }

    async preloadMultiple(songs, concurrent = 3) {
        const results = [];
        for (let i = 0; i < songs.length; i += concurrent) {
            const batch = songs.slice(i, i + concurrent);
            const batchPromises = batch.map(song => this.preloadSong(song));
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
            if (i + concurrent < songs.length) {
                await Utils.sleep(100);
            }
        }
        return results;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    enablePlugin(pluginId) {
        const plugin = this.getPlugin(pluginId);
        if (plugin) {
            plugin.enabled = true;
            return true;
        }
        return false;
    }

    disablePlugin(pluginId) {
        const plugin = this.getPlugin(pluginId);
        if (plugin) {
            plugin.enabled = false;
            return true;
        }
        return false;
    }

    isPluginEnabled(pluginId) {
        const plugin = this.getPlugin(pluginId);
        return plugin ? plugin.enabled : false;
    }

    getPluginStats() {
        const stats = { total: this.plugins.size, enabled: 0, disabled: 0 };
        for (const plugin of this.plugins.values()) {
            if (plugin.enabled) stats.enabled++;
            else stats.disabled++;
        }
        return stats;
    }

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

    validatePluginCompatibility(plugin) {
        const requiredMethods = ['getPlaylist', 'search'];
        const missingMethods = requiredMethods.filter(method => !plugin[method]);
        if (missingMethods.length > 0) {
            throw new Error(`插件缺少必要方法: ${missingMethods.join(', ')}`);
        }
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