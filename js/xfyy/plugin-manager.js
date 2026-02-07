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
        // 网易云音乐插件
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '1.0.0',
            description: '基于网易云音乐API',
            getPlaylist: async (playlistId) => {
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const response = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${playlistId}`);
                const data = await response.json();
                const formatted = data.map(song => this.formatSong(song, 'netease'));
                
                this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                return formatted;
            },
            search: async (keyword) => {
                const cacheKey = `netease_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const response = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(keyword)}`);
                const data = await response.json();
                const formatted = data.map(song => this.formatSong(song, 'netease'));
                
                this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                return formatted;
            },
            getDownloadUrl: async (songId) => {
                return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
            }
        });

        // QQ音乐插件
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '1.0.0',
            description: '基于QQ音乐API',
            getPlaylist: async (playlistId) => {
                const cacheKey = `qq_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const response = await fetch(`https://api.i-meto.com/meting/api?server=tencent&type=playlist&id=${playlistId}`);
                const data = await response.json();
                const formatted = data.map(song => this.formatSong(song, 'qq'));
                
                this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                return formatted;
            },
            search: async (keyword) => {
                const cacheKey = `qq_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const response = await fetch(`https://api.i-meto.com/meting/api?server=tencent&type=search&id=${encodeURIComponent(keyword)}`);
                const data = await response.json();
                const formatted = data.map(song => this.formatSong(song, 'qq'));
                
                this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                return formatted;
            },
            getDownloadUrl: async (songId) => {
                return `https://dl.stream.qqmusic.qq.com/${songId}.mp3`;
            }
        });

        // 酷狗音乐插件
        this.registerPlugin('kg', {
            name: '酷狗音乐',
            version: '1.0.0',
            description: '基于酷狗音乐新API',
            getPlaylist: async (playlistId) => {
                const cacheKey = `kg_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const response = await fetch('https://api.niniandmiaomiao.love/api/xb/api/kg_hot.php');
                const data = await response.json();
                const formatted = this.formatKugouHotResponse(data);
                
                if (formatted.length > 0) {
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                }
                return formatted;
            },
            search: async (keyword) => {
                const cacheKey = `kg_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

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
            },
            getDownloadUrl: async (songId) => {
                return `https://musicfreeapi.vercel.app/kugou/url?id=${songId}`;
            }
        });

        // 酷我音乐插件
        this.registerPlugin('kuwo', {
            name: '酷我音乐',
            version: '1.0.0',
            description: '基于酷我音乐API',
            getPlaylist: async (playlistId) => {
                const response = await fetch(`https://api.i-meto.com/meting/api?server=kuwo&type=playlist&id=${playlistId}`);
                const data = await response.json();
                return data.map(song => this.formatSong(song, 'kuwo'));
            },
            search: async (keyword) => {
                const response = await fetch(`https://api.i-meto.com/meting/api?server=kuwo&type=search&id=${encodeURIComponent(keyword)}`);
                const data = await response.json();
                return data.map(song => this.formatSong(song, 'kuwo'));
            },
            getDownloadUrl: async (songId) => {
                return `https://antiserver.kuwo.cn/anti.s?format=mp3&rid=${songId}&type=convert_url&response=url`;
            }
        });

        // 抖音热歌榜插件
        this.registerPlugin('migu', {
            name: '抖音热歌榜',
            version: '1.0.0',
            description: '基于抖音热歌榜API',
            getPlaylist: async (playlistId) => {
                const response = await fetch('https://api.injahow.cn/meting/?type=playlist&id=2809513713');
                const data = await response.json();
                return this.formatDouyinResponse(data);
            },
            search: async (keyword) => {
                return [];
            },
            getDownloadUrl: async (songId) => {
                return songId;
            }
        });
        
        // 本地音乐插件
        this.registerPlugin('local', {
            name: '本地音乐',
            version: '1.0.0',
            description: '内置本地音乐列表',
            getPlaylist: async (playlistId) => {
                return window.getLocalMusicList ? window.getLocalMusicList() : [];
            },
            search: async (keyword) => {
                return [];
            },
            getDownloadUrl: async (songId) => {
                return songId;
            }
        });

        // 翻译插件
        this.registerPlugin('translator', {
            name: '歌词翻译器',
            version: '1.0.0',
            description: '歌词翻译功能',
            translateText: async (text, targetLang = 'zh') => {
                const cacheKey = `translation_${targetLang}_${btoa(text)}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const response = await fetch(
                    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
                );
                
                const data = await response.json();
                
                if (data.responseStatus === 200 && data.responseData) {
                    const translation = data.responseData.translatedText;
                    this.cacheManager.set(cacheKey, translation, 24 * 60 * 60 * 1000);
                    return translation;
                } else {
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
     * 处理酷狗热歌榜API响应格式
     */
    formatKugouHotResponse(data) {
        if (!data) {
            return [];
        }
        
        if (data.status === 1 && data.errcode === 0 && data.data && data.data.list) {
            return this.formatKugouHotList(data.data.list);
        }
        
        return [];
    }

    /**
     * 格式化酷狗热歌榜列表
     */
    formatKugouHotList(hotList) {
        if (!Array.isArray(hotList)) {
            return [];
        }
        
        const allSongs = [];
        
        for (const listItem of hotList) {
            if (listItem.keywords && Array.isArray(listItem.keywords)) {
                for (const keywordItem of listItem.keywords) {
                    const song = this.formatKugouHotSong(keywordItem);
                    if (song) {
                        allSongs.push(song);
                    }
                }
            }
        }
        
        return allSongs;
    }

    /**
     * 格式化单个酷狗热歌榜歌曲
     */
    formatKugouHotSong(keywordItem) {
        if (!keywordItem || !keywordItem.keyword) {
            return null;
        }
        
        const keyword = keywordItem.keyword;
        let title = keyword;
        let artist = '未知歌手';
        
        const lastSpaceIndex = keyword.lastIndexOf(' ');
        if (lastSpaceIndex > 0) {
            title = keyword.substring(0, lastSpaceIndex).trim();
            artist = keyword.substring(lastSpaceIndex + 1).trim();
        }
        
        const songId = keywordItem.mixsongid || keywordItem.extra?.mixsongid;
        
        if (!songId) {
            return null;
        }
        
        return {
            id: songId,
            title: title,
            artist: artist,
            src: `https://musicfreeapi.vercel.app/kugou/url?id=${songId}`,
            cover: '',
            lrc: `https://musicfreeapi.vercel.app/kugou/lrc?id=${songId}`,
            isOnline: true,
            source: 'kg',
            reason: keywordItem.reason || '',
            originalData: keywordItem
        };
    }

    /**
     * 处理抖音热歌榜API响应格式
     */
    formatDouyinResponse(data) {
        if (!data) {
            return [];
        }
        
        if (data.code === 200 && data.data && Array.isArray(data.data)) {
            return data.data.map(song => this.formatDouyinSong(song)).filter(song => song.src);
        }
        
        if (Array.isArray(data)) {
            return data.map(song => this.formatDouyinSong(song)).filter(song => song.src);
        }
        
        return [];
    }

    /**
     * 抖音热歌榜专用格式化方法
     */
    formatDouyinSong(songData) {
        return {
            id: songData.id || songData.hash || Utils.generateId(),
            title: songData.title || songData.name || songData.songname || '未知歌曲',
            artist: songData.author || songData.artist || songData.singer || '未知歌手',
            src: songData.url || songData.play_url || songData.audio_url,
            cover: songData.pic || songData.cover || songData.album_cover,
            lrc: songData.lrc || songData.lyric,
            isOnline: true,
            source: 'migu'
        };
    }

    /**
     * 注册插件
     */
    registerPlugin(id, plugin) {
        this.plugins.set(id, {
            id,
            type: 'builtin',
            ...plugin
        });
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
                await Utils.sleep(100);
            }
        }
        
        return results;
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
            type: plugin.type
        };
    }
}

// 导出到全局作用域
window.PluginManager = PluginManager;