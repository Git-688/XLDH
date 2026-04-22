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

                try {
                    const response = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${playlistId}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    const formatted = data.map(song => this.formatSong(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云歌单请求失败:', error);
                    return [];
                }
            },
            search: async (keyword) => {
                const cacheKey = `netease_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const response = await fetch(`https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(keyword)}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    const formatted = data.map(song => this.formatSong(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云搜索请求失败:', error);
                    return [];
                }
            }
        });

        // QQ音乐插件（完整可播放+自动获取封面版）
this.registerPlugin('qq', {
    name: 'QQ音乐',
    version: '2.1.0',
    description: '云智热歌榜 + Meting解析，支持直接播放+自动获取歌曲封面',

    // 核心：通过songmid同时获取真实播放地址+官方封面
    _getSongInfoBySongmid: async function(songmid) {
        const cacheKey = `qq_song_info_${songmid}`;
        const cached = this.cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `https://api.i-meto.com/meting/api?server=tencent&type=song&id=${songmid}`,
                { signal: AbortSignal.timeout(5000) } // 5秒超时保护
            );
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            // 提取播放地址和封面，优先选择可用值
            const songInfo = {
                playUrl: data[0]?.url || '',
                cover: data[0]?.cover || '', // QQ音乐官方300x300封面
                album: data[0]?.album || '' // 补充准确的专辑名（修正原API字段歧义）
            };
            
            // 播放地址和封面有效期一致，统一缓存1小时
            this.cacheManager.set(cacheKey, songInfo, 60 * 60 * 1000);
            return songInfo;
        } catch (error) {
            console.warn(`歌曲${songmid}信息获取失败:`, error.message);
            // 失败返回空对象，不影响整体列表
            return { playUrl: '', cover: '', album: '' };
        }
    },

    // 获取热歌榜（自动填充播放地址+封面+准确专辑名）
    getPlaylist: async (playlistId, count = 30) => {
        const safeCount = Math.min(Math.max(1, count), 30);
        const cacheKey = `qq_hot_playlist_full_${safeCount}`;
        const cached = this.cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            // 1. 从云智API获取热歌基础列表
            const hotResponse = await fetch(
                `https://yunzhiapi.cn/API/qqrgbd.php?token=XIZhAXKnSQcH&count=${safeCount}`,
                { signal: AbortSignal.timeout(8000) }
            );
            
            if (!hotResponse.ok) throw new Error(`热歌榜HTTP错误: ${hotResponse.status}`);
            const hotResult = await hotResponse.json();
            
            if (hotResult.code !== 1) throw new Error(`热歌榜API错误: ${hotResult.msg}`);

            // 2. 批量获取所有歌曲的完整信息（播放地址+封面+准确专辑名）
            const songsWithFullInfo = await Promise.all(
                hotResult.data.map(async (song) => {
                    const { playUrl, cover, album } = await this._getSongInfoBySongmid(song.songmid);
                    return this.formatSong({
                        // 优先使用Meting返回的准确歌曲名和专辑名
                        title: song.albumname,
                        artist: song.name,
                        album: album || song.albumname, // 兜底使用原API的albumname
                        url: playUrl, // 真实可播放音频地址
                        cover: cover, // 自动获取的官方封面
                        pageUrl: song.link,
                        songmid: song.songmid
                    }, 'qq');
                })
            );

            // 过滤掉播放地址获取失败的无效歌曲
            const validSongs = songsWithFullInfo.filter(song => song.url);
            
            // 完整热歌列表缓存30分钟
            this.cacheManager.set(cacheKey, validSongs, 30 * 60 * 1000);
            return validSongs;
        } catch (error) {
            console.error('QQ音乐热歌榜加载失败:', error);
            return [];
        }
    },

    // 搜索方法兼容（该API不支持搜索，返回热歌）
    search: async (keyword, count = 20) => {
        return await this.getPlaylist(null, count);
    }
});



    // 获取热歌榜（自动填充播放地址+封面+准确专辑名）
    getPlaylist: async (playlistId, count = 30) => {
        const safeCount = Math.min(Math.max(1, count), 30);
        const cacheKey = `qq_hot_playlist_full_${safeCount}`;
        const cached = this.cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            // 1. 从云智API获取热歌基础列表
            const hotResponse = await fetch(
                `https://yunzhiapi.cn/API/qqrgbd.php?token=XIZhAXKnSQcH&count=${safeCount}`,
                { signal: AbortSignal.timeout(8000) }
            );
            
            if (!hotResponse.ok) throw new Error(`热歌榜HTTP错误: ${hotResponse.status}`);
            const hotResult = await hotResponse.json();
            
            if (hotResult.code !== 1) throw new Error(`热歌榜API错误: ${hotResult.msg}`);

            // 2. 批量获取所有歌曲的完整信息（播放地址+封面+准确专辑名）
            const songsWithFullInfo = await Promise.all(
                hotResult.data.map(async (song) => {
                    const { playUrl, cover, album } = await this._getSongInfoBySongmid(song.songmid);
                    return this.formatSong({
                        // 优先使用Meting返回的准确歌曲名和专辑名
                        title: song.albumname,
                        artist: song.name,
                        album: album || song.albumname, // 兜底使用原API的albumname
                        url: playUrl, // 真实可播放音频地址
                        cover: cover, // 自动获取的官方封面
                        pageUrl: song.link,
                        songmid: song.songmid
                    }, 'qq');
                })
            );

            // 过滤掉播放地址获取失败的无效歌曲
            const validSongs = songsWithFullInfo.filter(song => song.url);
            
            // 完整热歌列表缓存30分钟
            this.cacheManager.set(cacheKey, validSongs, 30 * 60 * 1000);
            return validSongs;
        } catch (error) {
            console.error('QQ音乐热歌榜加载失败:', error);
            return [];
        }
    },

    // 搜索方法兼容（该API不支持搜索，返回热歌）
    search: async (keyword, count = 20) => {
        return await this.getPlaylist(null, count);
    }
});


        // 抖音热歌榜插件（原migu）
        this.registerPlugin('migu', {
            name: '抖音热歌榜',
            version: '1.0.0',
            description: '基于抖音热歌榜API',
            getPlaylist: async (playlistId) => {
                try {
                    const response = await fetch('https://api.injahow.cn/meting/?type=playlist&id=2809513713');
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    return this.formatDouyinResponse(data);
                } catch (error) {
                    console.error('抖音热歌榜请求失败:', error);
                    return [];
                }
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
        try {
            if (data.code === 200 && data.data && Array.isArray(data.data)) {
                return data.data.map(song => this.formatDouyinSong(song)).filter(song => song.src);
            }
            if (Array.isArray(data)) {
                return data.map(song => this.formatDouyinSong(song)).filter(song => song.src);
            }
        } catch (error) {
            console.error('解析抖音响应失败:', error);
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
        } catch {
            return false;
        }
    }
}

window.PluginManager = PluginManager;