/**
 * 插件管理器 - 支持多个音乐API源
 * 保留网易云、QQ音乐、汽水音乐、本地音乐
 */
class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    initializePlugins() {
        // 网易云音乐插件（保持不变）
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

        // QQ音乐插件（保持不变）
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '2.3.0',
            description: '云智热歌榜 + Meting解析',

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
                    return [];
                }
            },

            search: async (keyword, count = 20) => {
                return [];
            }
        });

        // ================== 汽水音乐插件（完整适配 API 响应格式） ==================
        this.registerPlugin('qishui', {
            name: '汽水音乐',
            version: '1.1.0',
            description: '基于 suol.cc API，支持搜索和多个排行榜',
            baseUrl: 'https://api.suol.cc/v1/music_qs.php',
            mToken: '961D28A9C59C411C49C75FA3E9FAF24C',

            // 排行榜列表
            playlists: [
                { id: 'hot', name: '热歌榜' },
                { id: 'new', name: '新歌榜' },
                { id: 'up',  name: '飙升榜' }
            ],

            _fetchApi: async function(action, params = {}) {
                const url = new URL(this.baseUrl);
                url.searchParams.set('action', action);
                url.searchParams.set('m_token', this.mToken);
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== undefined && v !== null && v !== '') {
                        url.searchParams.set(k, v);
                    }
                });
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                try {
                    const response = await fetch(url.toString(), { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return await response.json();
                } catch (error) {
                    clearTimeout(timeoutId);
                    throw error;
                }
            },

            // 获取排行榜歌曲列表
            getPlaylist: async function(playlistId) {
                const id = playlistId || 'hot';
                const cacheKey = `qishui_playlist_${id}`;
                const cached = this.cacheManager?.get(cacheKey);
                if (cached) return cached;

                try {
                    const result = await this._fetchApi('rank', { keyword: id });
                    if (result.code !== 200) throw new Error(result.msg || '请求失败');

                    let songs = [];

                    // 兼容两种返回格式：data.list 数组 或 data 本身就是数组
                    if (result.data) {
                        if (Array.isArray(result.data.list)) {
                            songs = result.data.list.map(item => this._mapSongItem(item));
                        } else if (Array.isArray(result.data)) {
                            songs = result.data.map(item => this._mapSongItem(item));
                        }
                    }

                    this.cacheManager?.set(cacheKey, songs, 30 * 60 * 1000);
                    return songs;
                } catch (error) {
                    console.error('汽水音乐排行榜加载失败:', error);
                    return [];
                }
            },

            // 搜索
            search: async function(keyword) {
                if (!keyword) return [];
                const cacheKey = `qishui_search_${keyword}`;
                const cached = this.cacheManager?.get(cacheKey);
                if (cached) return cached;

                try {
                    const result = await this._fetchApi('search', { keyword });
                    if (result.code !== 200) return [];

                    let songs = [];
                    if (result.data) {
                        if (Array.isArray(result.data.list)) {
                            songs = result.data.list.map(item => this._mapSongItem(item));
                        } else if (Array.isArray(result.data)) {
                            songs = result.data.map(item => this._mapSongItem(item));
                        }
                    }

                    this.cacheManager?.set(cacheKey, songs, 10 * 60 * 1000);
                    return songs;
                } catch (error) {
                    console.error('汽水音乐搜索失败:', error);
                    return [];
                }
            },

            // 将 API 返回的歌曲对象映射为统一格式
            _mapSongItem: function(item) {
                return {
                    id: item.id || '',
                    title: item.name || '未知歌曲',
                    artist: item.artists || '未知歌手',
                    cover: item.pic || '',
                    album: item.album || '',
                    duration: item.duration || 0,
                    src: '',                    // 播放时动态解析
                    lrc: '',
                    isOnline: true,
                    source: 'qishui',
                    _needResolve: true,
                };
            },

            // 获取歌曲播放链接
            _getSongUrl: async function(songId, level = 'standard') {
                const cacheKey = `qishui_song_${songId}_${level}`;
                const cached = this.cacheManager?.get(cacheKey);
                if (cached) return cached;

                try {
                    const result = await this._fetchApi('song', { id: songId, level });
                    if (result.code === 200 && result.data) {
                        const resolved = {
                            url: result.data.url || '',
                            lyric: result.data.lyric_lrc || '',
                            pic: result.data.pic || '',
                            quality: result.data.quality || '',
                        };
                        this.cacheManager?.set(cacheKey, resolved, 60 * 60 * 1000);
                        return resolved;
                    }
                } catch (e) {
                    console.warn(`汽水音乐歌曲${songId}解析失败:`, e.message);
                }
                return { url: '', lyric: '', pic: '' };
            }
        });
        
        // 本地音乐插件（保持不变）
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