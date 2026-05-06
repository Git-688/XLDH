/**
 * 插件管理器 - 支持多个音乐API源
 * 仅保留网易云、QQ音乐、抖音热歌榜、本地音乐
 * 修复 QQ 音乐搜索不返回结果的问题（改为返回空数组，并禁用搜索入口）
 */

class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    initializePlugins() {
        // 网易云音乐插件（增加备用 API 与降级）
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '2.1.0',
            description: '基于 injahow 网易云音乐API (带备用)',
            getPlaylist: async (playlistId) => {
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const primaryUrl = `https://api.injahow.cn/meting/?server=netease&type=playlist&id=${playlistId}`;
                const fallbackUrl = `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${playlistId}`;

                const fetchWithTimeout = async (url) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    try {
                        const response = await fetch(url, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const data = await response.json();
                        return data;
                    } catch (error) {
                        clearTimeout(timeoutId);
                        throw error;
                    }
                };

                try {
                    const data = await fetchWithTimeout(primaryUrl);
                    const formatted = Array.isArray(data) ? data.map(song => this.formatSong(song, 'netease')) : [];
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (primaryError) {
                    console.warn('主网易云API失败，尝试备用源:', primaryError);
                    try {
                        const fallbackData = await fetchWithTimeout(fallbackUrl);
                        const formatted = Array.isArray(fallbackData) ? fallbackData.map(song => this.formatSong(song, 'netease')) : [];
                        this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                        return formatted;
                    } catch (fallbackError) {
                        console.error('备用网易云API也失败:', fallbackError);
                        return [];
                    }
                }
            },
            search: async (keyword) => {
                const cacheKey = `netease_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);

                try {
                    const response = await fetch(
                        `https://api.injahow.cn/meting/?server=netease&type=search&id=${encodeURIComponent(keyword)}`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    const formatted = Array.isArray(data) ? data.map(song => this.formatSong(song, 'netease')) : [];
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    clearTimeout(timeoutId);
                    console.error('网易云搜索请求失败:', error);
                    return [];
                }
            }
        });

        // QQ音乐插件（增加热歌榜获取失败时的降级处理）
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '2.3.0',
            description: '云智热歌榜 + Meting解析，支持直接播放+自动获取歌曲封面',

            _getSongInfoBySongmid: async function(songmid) {
                const cacheKey = `qq_song_info_${songmid}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    const response = await fetch(
                        `https://api.i-meto.com/meting/api?server=tencent&type=song&id=${songmid}`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    
                    const songInfo = {
                        playUrl: data[0]?.url || '',
                        cover: data[0]?.cover || '',
                        album: data[0]?.album || ''
                    };
                    
                    this.cacheManager.set(cacheKey, songInfo, 60 * 60 * 1000);
                    return songInfo;
                } catch (error) {
                    console.warn(`歌曲${songmid}信息获取失败:`, error.message);
                    return { playUrl: '', cover: '', album: '' };
                }
            },

            getPlaylist: async (playlistId, count = 30) => {
                const safeCount = Math.min(Math.max(1, count), 30);
                const cacheKey = `qq_hot_playlist_full_${safeCount}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const hotResponse = await fetch(
                        `https://yunzhiapi.cn/API/qqrgbd.php?token=XIZhAXKnSQcH&count=${safeCount}`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);
                    
                    if (!hotResponse.ok) throw new Error(`热歌榜HTTP错误: ${hotResponse.status}`);
                    const hotResult = await hotResponse.json();
                    
                    if (hotResult.code !== 1) throw new Error(`热歌榜API错误: ${hotResult.msg}`);

                    const songsWithFullInfo = await Promise.all(
                        hotResult.data.map(async (song) => {
                            const { playUrl, cover, album } = await this._getSongInfoBySongmid(song.songmid);
                            return this.formatSong({
                                title: song.albumname,
                                artist: song.name,
                                album: album || song.albumname,
                                url: playUrl,
                                cover: cover,
                                pageUrl: song.link,
                                songmid: song.songmid
                            }, 'qq');
                        })
                    );

                    const validSongs = songsWithFullInfo.filter(song => song.url);
                    
                    this.cacheManager.set(cacheKey, validSongs, 30 * 60 * 1000);
                    return validSongs;
                } catch (error) {
                    console.error('QQ音乐热歌榜加载失败:', error);
                    // 尝试返回空，并给出持久化提示
                    if (typeof window !== 'undefined' && !sessionStorage.getItem('qq_fallback_hint')) {
                        sessionStorage.setItem('qq_fallback_hint', '1');
                        // toast 在 plugin 内无法直接调用，由上层处理
                    }
                    return [];
                }
            },

            search: async (keyword, count = 20) => {
                // QQ音乐搜索暂不可用，返回空数组
                return [];
            }
        });

        // 抖音热歌榜插件（原migu）
        this.registerPlugin('migu', {
            name: '抖音热歌榜',
            version: '1.1.0',
            description: '基于抖音热歌榜API (可配置)',
            getPlaylist: async (playlistId) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                try {
                    const response = await fetch('https://api.injahow.cn/meting/?type=playlist&id=2809513713', { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    return this.formatDouyinResponse(data);
                } catch (error) {
                    clearTimeout(timeoutId);
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

    registerPlugin(id, plugin) {
        this.plugins.set(id, {
            id,
            type: 'builtin',
            ...plugin
        });
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
        return await plugin.getPlaylist(playlistId);
    }

    async search(apiId, keyword) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.search) {
            return [];
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
        } catch {
            return false;
        }
    }
}

window.PluginManager = PluginManager;