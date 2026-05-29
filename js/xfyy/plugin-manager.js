/**
 * 插件管理器 - 支持多个音乐API源（网易云已切换至 API Enhanced 可用实例）
 */
class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    initializePlugins() {
        // ========== 网易云音乐插件（已适配可用新Vercel实例｜默认exhigh高品质）==========
        const that = this;

        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '3.0.0',
            description: '基于 NeteaseCloudMusicApi Enhanced',
            // 全新可用域名，废弃旧域名
            baseUrl: 'https://api-enhanced-gxf7rk9bg-g1595126534-2135s-projects.vercel.app',

            // 内部：获取歌曲播放链接（默认 exhigh 高品质）
            _getSongUrl: async function(songId, level = 'exhigh') {
                const cacheKey = `netease_song_url_${songId}_${level}`;
                const cached = that.cacheManager?.get(cacheKey);
                if (cached) return cached;
                try {
                    const url = `${this.baseUrl}/song/url/v1?id=${songId}&level=${level}`;
                    const response = await Utils.safeFetch(url, { timeout: 8000 });
                    const data = await response.json();
                    const playUrl = data.data?.[0]?.url || '';
                    if (playUrl) {
                        that.cacheManager?.set(cacheKey, playUrl, 60 * 60 * 1000);
                    }
                    return playUrl;
                } catch (error) {
                    console.warn(`获取歌曲 ${songId} 播放链接失败:`, error);
                    return '';
                }
            },

            // 内部：获取歌词
            _getLyric: async function(songId) {
                const cacheKey = `netease_lyric_${songId}`;
                const cached = that.cacheManager?.get(cacheKey);
                if (cached) return cached;
                try {
                    const url = `${this.baseUrl}/lyric?id=${songId}`;
                    const response = await Utils.safeFetch(url, { timeout: 5000 });
                    const data = await response.json();
                    const lyric = data.lrc?.lyric || '';
                    that.cacheManager?.set(cacheKey, lyric, 24 * 60 * 60 * 1000);
                    return lyric;
                } catch (error) {
                    console.warn(`获取歌曲 ${songId} 歌词失败:`, error);
                    return '';
                }
            },

            // 获取歌单（自动填充播放链接和歌词）
            getPlaylist: async (playlistId) => {
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    // 1. 获取歌单详情
                    const playlistUrl = `${this.baseUrl}/playlist/detail?id=${playlistId}`;
                    const response = await Utils.safeFetch(playlistUrl, { timeout: 8000 });
                    const data = await response.json();
                    if (data.code !== 200) throw new Error('歌单获取失败');

                    const tracks = data.playlist?.tracks || [];
                    if (!tracks.length) return [];

                    // 2. 并发获取每首歌的播放链接和歌词（限制并发数5）
                    const concurrency = 5;
                    const enrichedTracks = [];
                    for (let i = 0; i < tracks.length; i += concurrency) {
                        const batch = tracks.slice(i, i + concurrency);
                        const batchPromises = batch.map(async (track) => {
                            const url = await this._getSongUrl(track.id);
                            const lrc = await this._getLyric(track.id);
                            return that.formatSongEnhanced(track, url, lrc);
                        });
                        const batchResults = await Promise.all(batchPromises);
                        enrichedTracks.push(...batchResults);
                    }

                    that.cacheManager.set(cacheKey, enrichedTracks, 30 * 60 * 1000);
                    return enrichedTracks;
                } catch (error) {
                    console.error('网易云歌单加载失败:', error);
                    return [];
                }
            },

            // 搜索歌曲（自动填充播放链接和歌词）
            search: async (keyword) => {
                const cacheKey = `netease_search_${keyword}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const searchUrl = `${this.baseUrl}/search?keywords=${encodeURIComponent(keyword)}&limit=30`;
                    const response = await Utils.safeFetch(searchUrl, { timeout: 6000 });
                    const data = await response.json();
                    if (data.code !== 200) throw new Error('搜索失败');

                    const songs = data.result?.songs || [];
                    if (!songs.length) return [];

                    // 并发获取 URL 和歌词（限制并发数5）
                    const concurrency = 5;
                    const enriched = [];
                    for (let i = 0; i < songs.length; i += concurrency) {
                        const batch = songs.slice(i, i + concurrency);
                        const batchPromises = batch.map(async (song) => {
                            const url = await this._getSongUrl(song.id);
                            const lrc = await this._getLyric(song.id);
                            return that.formatSongEnhanced(song, url, lrc);
                        });
                        const batchResults = await Promise.all(batchPromises);
                        enriched.push(...batchResults);
                    }

                    that.cacheManager.set(cacheKey, enriched, 10 * 60 * 1000);
                    return enriched;
                } catch (error) {
                    console.error('网易云搜索失败:', error);
                    return [];
                }
            }
        });

        // ========== QQ音乐插件（完全保持原样未改动）==========
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '2.3.0',
            description: '云智热歌榜 + Meting解析',
            _getSongInfoBySongmid: async function(songmid) {
                const cacheKey = `qq_song_info_${songmid}`;
                const cached = that.cacheManager.get(cacheKey);
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
                    that.cacheManager.set(cacheKey, songInfo, 60 * 60 * 1000);
                    return songInfo;
                } catch (error) {
                    console.warn(`歌曲${songmid}信息获取失败:`, error.message);
                    return { playUrl: '', cover: '', album: '' };
                }
            },
            getPlaylist: async (playlistId, count = 30) => {
                const safeCount = Math.min(Math.max(1, count), 30);
                const cacheKey = `qq_hot_playlist_full_${safeCount}`;
                const cached = that.cacheManager.get(cacheKey);
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
                            return that.formatSong({
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
                    that.cacheManager.set(cacheKey, validSongs, 30 * 60 * 1000);
                    return validSongs;
                } catch (error) {
                    console.error('QQ音乐热歌榜加载失败:', error);
                    return [];
                }
            },
            search: async (keyword) => { return []; }
        });

        // ========== 汽水音乐插件（完全保持原样未改动）==========
        this.registerPlugin('qishui', {
            name: '汽水音乐',
            version: '1.2.1',
            description: '基于 suol.cc API',
            baseUrl: 'https://api.suol.cc/v1/music_qs.php',
            mToken: '961D28A9C59C411C49C75FA3E9FAF24C',
            rankKeywordMap: { 'hot': '热歌榜', 'new': '新歌榜', 'up': '飙升榜' },
            _fetchApi: async function(action, params = {}) {
                const url = new URL(this.baseUrl);
                url.searchParams.set('action', action);
                url.searchParams.set('m_token', this.mToken);
                Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
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
                const cached = that.cacheManager?.get(cacheKey);
                if (cached) return cached;
                try {
                    const result = await this._fetchApi('rank', { keyword });
                    if (result.code !== 200) throw new Error(result.msg || '请求失败');
                    let songs = [];
                    if (Array.isArray(result.data)) songs = result.data.map(item => this._mapSongItem(item));
                    that.cacheManager?.set(cacheKey, songs, 30 * 60 * 1000);
                    return songs;
                } catch (error) {
                    console.error('汽水音乐排行榜加载失败:', error);
                    return [];
                }
            },
            search: async function(keyword) {
                if (!keyword) return [];
                const cacheKey = `qishui_search_${keyword}`;
                const cached = that.cacheManager?.get(cacheKey);
                if (cached) return cached;
                try {
                    const result = await this._fetchApi('search', { keyword });
                    if (result.code !== 200) return [];
                    let songs = [];
                    if (result.data && Array.isArray(result.data.songs)) songs = result.data.songs.map(item => this._mapSongItem(item));
                    that.cacheManager?.set(cacheKey, songs, 10 * 60 * 1000);
                    return songs;
                } catch (error) {
                    console.error('汽水音乐搜索失败:', error);
                    return [];
                }
            },
            _getSongUrl: async function(songId, level = 'standard') {
                if (!songId) return { url: '', lyric: '', pic: '' };
                const cacheKey = `qishui_song_${songId}_${level}`;
                const cached = that.cacheManager?.get(cacheKey);
                if (cached) return cached;
                try {
                    const result = await this._fetchApi('song', { id: songId, level });
                    if (result.code === 200 && result.data) {
                        const resolved = { url: result.data.url || '', lyric: result.data.lyric_lrc || '', pic: result.data.pic || '' };
                        that.cacheManager?.set(cacheKey, resolved, 60 * 60 * 1000);
                        return resolved;
                    }
                } catch (e) { console.warn(`汽水音乐歌曲${songId}解析失败:`, e.message); }
                return { url: '', lyric: '', pic: '' };
            }
        });

        // ========== 本地音乐插件（完全保持原样未改动）==========
        this.registerPlugin('local', {
            name: '本地音乐',
            version: '1.0.0',
            description: '内置本地音乐列表',
            getPlaylist: async () => window.getLocalMusicList ? window.getLocalMusicList() : [],
            search: async () => []
        });
    }

    // 通用格式化（兼容旧格式）
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

    // 新版网易云专用格式化
    formatSongEnhanced(track, url, lrc) {
        return {
            id: track.id,
            title: track.name || '未知歌曲',
            artist: (track.ar && track.ar.map(a => a.name).join('/')) || (track.artist || '未知歌手'),
            src: url,
            cover: track.al?.picUrl || track.cover || '',
            lrc: lrc,
            isOnline: true,
            source: 'netease'
        };
    }

    registerPlugin(id, plugin) {
        this.plugins.set(id, { id, type: 'builtin', ...plugin });
    }

    getPlugin(id) { return this.plugins.get(id); }
    getAllPlugins() { return Array.from(this.plugins.values()); }
    setCurrentApi(apiId) { if (this.plugins.has(apiId)) { this.currentApi = apiId; return true; } return false; }
    getCurrentApi() { return this.currentApi; }

    async getPlaylist(apiId, playlistId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.getPlaylist) throw new Error(`插件 ${apiId} 不支持获取歌单`);
        return await plugin.getPlaylist(playlistId);
    }

    async search(apiId, keyword) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.search) return [];
        return await plugin.search(keyword);
    }

    async preloadSong(song) {
        const promises = [];
        if (song.src) promises.push(this.cacheManager.preloadResource(song.src, 'audio'));
        if (song.cover) promises.push(this.cacheManager.preloadResource(song.cover, 'image'));
        try {
            await Promise.all(promises);
            return true;
        } catch { return false; }
    }
}

window.PluginManager = PluginManager;
