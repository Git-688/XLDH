/**
 * 插件管理器 - 支持多个音乐API源
 * 网易云音乐已更换为 TinyAPI 接口（完整修复版）
 */

// 辅助函数：将 TinyAPI 返回的歌曲格式化为标准格式
function formatSongFromTinyApi(song, source) {
    const songId = song.id;
    const playUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
    return {
        id: songId,
        title: song.name || '未知歌曲',
        artist: song.singer || '未知歌手',
        src: playUrl,
        cover: song.cover || '',
        lrc: '',
        isOnline: true,
        source: source,
        duration: song.duration || '0:00'
    };
}

// 通用格式化（用于其他插件）
function formatSong(song, source) {
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

class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    initializePlugins() {
        // 网易云音乐插件（使用 TinyAPI）
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '3.0.0',
            description: '基于 TinyAPI 网易云音乐接口',
            
            rankIdMap: {
                '3778678': 19723756,  // 热歌榜 -> 飙升榜
                '3779629': 3779629,   // 新歌榜
                '2884035': 2884035,   // 原创榜
                '19723756': 19723756  // 飙升榜
            },

            // 获取排行榜歌曲（代替原来的歌单）
            getPlaylist: async function(playlistId) {
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const rankId = this.rankIdMap[playlistId] || 19723756;
                const apiUrl = `https://api.tinyaii.top/v1/netease/toplist?id=${rankId}`;

                const fetchWithTimeout = async (url) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    try {
                        const response = await fetch(url, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const data = await response.json();
                        if (data.code !== 200) throw new Error(data.message || 'API返回错误');
                        return data;
                    } catch (error) {
                        clearTimeout(timeoutId);
                        throw error;
                    }
                };

                try {
                    const data = await fetchWithTimeout(apiUrl);
                    const songs = data.data?.songs || [];
                    const formatted = songs.map(song => formatSongFromTinyApi(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云排行榜加载失败:', error);
                    return [];
                }
            },

            // 搜索歌曲
            search: async function(keyword) {
                const cacheKey = `netease_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;

                const apiUrl = `https://api.tinyaii.top/v1/netease/search?keyword=${encodeURIComponent(keyword)}&limit=30`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                try {
                    const response = await fetch(apiUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    if (data.code !== 200) throw new Error(data.message || '搜索失败');
                    const songs = data.data?.songs || [];
                    const formatted = songs.map(song => formatSongFromTinyApi(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    clearTimeout(timeoutId);
                    console.error('网易云搜索失败:', error);
                    return [];
                }
            }
        });

        // QQ音乐插件
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
            getPlaylist: async function(playlistId, count = 30) {
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
                            return formatSong({
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
            search: async function(keyword) { return []; }
        });

        // 汽水音乐插件
        this.registerPlugin('qishui', {
            name: '汽水音乐',
            version: '1.2.1',
            description: '基于 suol.cc API，支持搜索和排行榜切换',
            baseUrl: 'https://api.suol.cc/v1/music_qs.php',
            mToken: '961D28A9C59C411C49C75FA3E9FAF24C',
            rankKeywordMap: { 'hot': '热歌榜', 'new': '新歌榜', 'up': '飙升榜' },
            _fetchApi: async function(action, params = {}) {
                const url = new URL(this.baseUrl);
                url.searchParams.set('action', action);
                url.searchParams.set('m_token', this.mToken);
                Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
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
            _mapSongItem: function(item) {
                return {
                    id: item.id || item.songid || '',
                    title: item.name || '未知歌曲',
                    artist: item.artists || '未知歌手',
                    cover: item.pic || '',
                    album: item.album || '',
                    duration: item.duration || 0,
                    src: '',
                    lrc: '',
                    isOnline: true,
                    source: 'qishui',
                    _needResolve: true,
                };
            },
            getPlaylist: async function(playlistId) {
                const keyword = this.rankKeywordMap[playlistId] || '热歌榜';
                const cacheKey = `qishui_rank_${playlistId}`;
                const cached = this.cacheManager?.get(cacheKey);
                if (cached) return cached;
                try {
                    const result = await this._fetchApi('rank', { keyword });
                    if (result.code !== 200) throw new Error(result.msg || '请求失败');
                    let songs = [];
                    if (Array.isArray(result.data)) {
                        songs = result.data.map(item => this._mapSongItem(item));
                    }
                    this.cacheManager?.set(cacheKey, songs, 30 * 60 * 1000);
                    return songs;
                } catch (error) {
                    console.error('汽水音乐排行榜加载失败:', error);
                    return [];
                }
            },
            search: async function(keyword) {
                if (!keyword) return [];
                const cacheKey = `qishui_search_${keyword}`;
                const cached = this.cacheManager?.get(cacheKey);
                if (cached) return cached;
                try {
                    const result = await this._fetchApi('search', { keyword });
                    if (result.code !== 200) return [];
                    let songs = [];
                    if (result.data && Array.isArray(result.data.songs)) {
                        songs = result.data.songs.map(item => this._mapSongItem(item));
                    }
                    this.cacheManager?.set(cacheKey, songs, 10 * 60 * 1000);
                    return songs;
                } catch (error) {
                    console.error('汽水音乐搜索失败:', error);
                    return [];
                }
            },
            _getSongUrl: async function(songId, level = 'standard') {
                if (!songId) return { url: '', lyric: '', pic: '' };
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
                        };
                        this.cacheManager?.set(cacheKey, resolved, 60 * 60 * 1000);
                        return resolved;
                    }
                } catch (e) { console.warn(`汽水音乐歌曲${songId}解析失败:`, e.message); }
                return { url: '', lyric: '', pic: '' };
            }
        });

        // 本地音乐插件
        this.registerPlugin('local', {
            name: '本地音乐',
            version: '1.0.0',
            description: '内置本地音乐列表',
            getPlaylist: async function(playlistId) {
                return window.getLocalMusicList ? window.getLocalMusicList() : [];
            },
            search: async function(keyword) { return []; }
        });
    }

    registerPlugin(id, plugin) {
        // 将 cacheManager 注入到插件对象中，以便插件方法内部可以使用 this.cacheManager
        plugin.cacheManager = this.cacheManager;
        this.plugins.set(id, { id, type: 'builtin', ...plugin });
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
        // 确保调用时 this 指向插件对象
        return await plugin.getPlaylist.call(plugin, playlistId);
    }

    async search(apiId, keyword) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.search) {
            return [];
        }
        return await plugin.search.call(plugin, keyword);
    }

    async preloadSong(song) {
        const promises = [];
        if (song.src) promises.push(this.cacheManager.preloadResource(song.src, 'audio'));
        if (song.cover) promises.push(this.cacheManager.preloadResource(song.cover, 'image'));
        try {
            await Promise.all(promises);
            return true;
        } catch {
            return false;
        }
    }
}

window.PluginManager = PluginManager;