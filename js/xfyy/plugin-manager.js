/**
 * 插件管理器 - 支持多个音乐API源
 * 仅保留网易云、QQ音乐、抖音热歌榜、本地音乐
 */

class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
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
            }
        });

        // 抖音热歌榜插件（原migu）
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
        if (!data) return [];
        
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
}

window.PluginManager = PluginManager;