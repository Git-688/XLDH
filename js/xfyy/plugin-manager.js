/**
 * 插件管理器 - 支持多个音乐API源
 * 负责管理不同音乐平台的插件，包括注册、加载和调用
 */

class PluginManager {
    constructor(cacheManager) {
        // 初始化缓存管理器和插件集合
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease'; // 默认使用网易云音乐
        this.initializePlugins();
    }

    /**
     * 初始化所有内置插件
     */
    initializePlugins() {
        // ==================== 网易云音乐插件（新 API - injahow.cn/meting） ====================
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '2.2.4',
            description: '基于 injahow.cn/meting API，稳定可靠',

            getPlaylist: async (playlistId) => {
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const url = `https://api.injahow.cn/meting/?server=netease&type=playlist&id=${playlistId}`;
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();

                    if (!Array.isArray(data)) {
                        throw new Error('返回数据格式错误');
                    }

                    const formatted = data.map(song => this.formatSong(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云音乐API请求失败:', error);
                    throw new Error('获取歌单失败: ' + error.message);
                }
            },

            search: async (keyword) => {
                const cacheKey = `netease_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const url = `https://api.injahow.cn/meting/?server=netease&type=search&id=${encodeURIComponent(keyword)}`;
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();

                    if (!Array.isArray(data)) {
                        throw new Error('搜索返回数据格式错误');
                    }

                    const formatted = data.map(song => this.formatSong(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云搜索失败:', error);
                    throw new Error('搜索失败: ' + error.message);
                }
            },

            getDownloadUrl: async (songId) => {
                return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
            }
        });

        // ==================== QQ音乐插件 ====================
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '1.0.0',
            description: '基于QQ音乐API',
            getPlaylist: async (playlistId) => {
                const cacheKey = `qq_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const response = await fetch(`https://api.i-meto.com/meting/api?server=tencent&type=playlist&id=${playlistId}`);
                    const data = await response.json();
                    const formatted = data.map(song => this.formatSong(song, 'qq'));
                    
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

        // ==================== 酷狗音乐插件 ====================
        this.registerPlugin('kg', {
            name: '酷狗音乐',
            version: '1.0.0',
            description: '基于酷狗音乐API',
            getPlaylist: async (playlistId) => {
                const cacheKey = `kg_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?type=playlist&id=${playlistId}&server=kugou`);
                    const data = await response.json();
                    
                    if (data.data && data.data.tracks) {
                        const formatted = data.data.tracks.map(song => ({
                            id: song.hash || song.id,
                            title: song.songname || song.name,
                            artist: song.singername || song.artist,
                            src: song.url || `https://api.injahow.cn/meting/?type=playlist&id=${song.hash || song.id}`,
                            cover: song.img || song.cover,
                            lrc: song.lrc || `https://api.injahow.cn/meting/?type=playlist&id=${song.hash || song.id}`,
                            isOnline: true,
                            source: 'kg'
                        }));
                        
                        this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                        return formatted;
                    }
                    return [];
                } catch (error) {
                    console.error('酷狗音乐API请求失败:', error);
                    throw new Error('获取歌单失败');
                }
            },
            search: async (keyword) => {
                const cacheKey = `kg_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const response = await fetch(`https://musicfreeapi.vercel.app/kugou/search?keyword=${encodeURIComponent(keyword)}`);
                    const data = await response.json();
                    
                    if (data.data && Array.isArray(data.data)) {
                        const formatted = data.data.map(song => ({
                            id: song.hash || song.id,
                            title: song.songname || song.name,
                            artist: song.singername || song.artist,
                            src: song.url || `https://musicfreeapi.vercel.app/kugou/url?id=${song.hash || song.id}`,
                            cover: song.img || song.cover,
                            lrc: song.lrc || `https://musicfreeapi.vercel.app/kugou/lrc?id=${song.hash || song.id}`,
                            isOnline: true,
                            source: 'kg'
                        }));
                        
                        this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                        return formatted;
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

        // ==================== 酷我音乐插件 ====================
        this.registerPlugin('kuwo', {
            name: '酷我音乐',
            version: '1.0.0',
            description: '基于酷我音乐API',
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
                    console.error('酷我音乐搜索失败:', error);
                    throw new Error('搜索失败');
                }
            },
            getDownloadUrl: async (songId) => {
                return `https://antiserver.kuwo.cn/anti.s?format=mp3&rid=${songId}&type=convert_url&response=url`;
            }
        });

        // ==================== 抖音热歌榜插件 ====================
        this.registerPlugin('migu', {
            name: '抖音热歌榜',
            version: '1.0.0',
            description: '基于抖音热歌榜API',
            getPlaylist: async (playlistId) => {
                try {
                    console.log('开始获取抖音热歌榜数据...');
                    const response = await fetch('https://api.injahow.cn/meting/?type=playlist&id=2809513713');
                    
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('抖音热歌榜API响应:', data);
                    
                    return this.formatDouyinResponse(data);
                } catch (error) {
                    console.error('抖音热歌榜API请求失败:', error);
                    throw new Error('获取抖音热歌榜失败: ' + error.message);
                }
            },
            search: async (keyword) => {
                console.log('抖音热歌榜不支持搜索功能');
                return [];
            },
            getDownloadUrl: async (songId) => {
                return songId;
            }
        });

        // ==================== 翻译插件 ====================
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
                    } else {
                        throw new Error('翻译API返回错误');
                    }
                } catch (error) {
                    console.warn('翻译失败:', error);
                    return text;
                }
            }
        });
    }

    /**
     * 格式化歌曲信息 - 通用方法
     */
    formatSong(song, source) {
        return {
            id: song.id || Utils.generateId(),
            title: song.title || song.name || '未知歌曲',
            artist: song.author || song.artist || '未知歌手',
            src: song.url,
            cover: song.pic,
            lrc: song.lrc,
            isOnline: true,
            source: source
        };
    }

    /**
     * 处理抖音热歌榜API响应格式
     */
    formatDouyinResponse(data) {
        console.log('处理抖音热歌榜响应数据:', data);
        
        if (!data) {
            console.warn('抖音热歌榜API返回空数据');
            return [];
        }
        
        if (data.code === 200 && data.data && Array.isArray(data.data)) {
            return data.data.map(song => this.formatDouyinSong(song)).filter(song => song.src);
        }
        
        if (Array.isArray(data)) {
            return data.map(song => this.formatDouyinSong(song)).filter(song => song.src);
        }
        
        console.warn('抖音热歌榜API返回格式未知:', data);
        return [];
    }

    /**
     * 抖音热歌榜专用格式化方法
     */
    formatDouyinSong(songData) {
        console.log('抖音热歌原始数据:', songData);
        
        const formattedSong = {
            id: songData.id || songData.hash || Utils.generateId(),
            title: songData.title || songData.name || songData.songname || '未知歌曲',
            artist: songData.author || songData.artist || songData.singer || '未知歌手',
            src: songData.url || songData.play_url || songData.audio_url,
            cover: songData.pic || songData.cover || songData.album_cover,
            lrc: songData.lrc || songData.lyric,
            isOnline: true,
            source: 'migu'
        };
        
        console.log('格式化后的抖音热歌:', formattedSong);
        return formattedSong;
    }

    /**
     * 注册插件
     */
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
        
        return await plugin.search(keyword);
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
            console.warn('翻译插件未找到，返回原始文本');
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
            
            // 添加延迟避免请求过于频繁
            if (i + concurrent < songs.length) {
                await Utils.sleep(100);
            }
        }
        
        return results;
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
     * 获取插件状态信息
     */
    getPluginStats() {
        const stats = {
            total: this.plugins.size,
            enabled: 0,
            disabled: 0
        };
        
        for (const plugin of this.plugins.values()) {
            if (plugin.enabled) {
                stats.enabled++;
            } else {
                stats.disabled++;
            }
        }
        
        return stats;
    }

    /**
     * 重新加载所有插件
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

// 导出到全局作用域
window.PluginManager = PluginManager;