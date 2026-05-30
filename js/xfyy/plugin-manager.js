/**
 * 插件管理器 - 网易云榜单+搜索全适配yunzhiapi
 */
class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    initializePlugins() {
        // ========== 网易云音乐插件 完整版（榜单+新搜索）==========
        const that = this;
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '3.2.0',
            description: 'yunzhiapi 网易云榜单+专属搜索接口',
            // 榜单接口
            rankApiUrl: 'https://yunzhiapi.cn/API/yyjhbd.php',
            // 搜索接口
            searchApiUrl: 'https://yunzhiapi.cn/API/wyyyjs.php',
            token: 'XIZhAXKnSQcH',
            type: 'wy',
            // 排行榜ID映射
            rankMap: {
                hot: "3778678",
                new: "3779629",
                up: "19723756",
                original: "2884035",
                electronic: "10520166",
                usa: "2809513713",
                korea: "115640620",
                classic: "71385702"
            },

            // 榜单获取
            getPlaylist: async (playlistId) => {
                const rid = this.rankMap[playlistId] || this.rankMap.hot;
                const cacheKey = `wy_rank_${rid}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const res = await fetch(
                        `${this.rankApiUrl}?token=${this.token}&id=${rid}&type=${this.type}`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);

                    if (!res.ok) throw new Error('接口请求异常');
                    const json = await res.json();
                    if (json.code !== 1) throw new Error(json.msg || '获取榜单失败');

                    const list = json.data.map(item => ({
                        id: item.songId,
                        title: item.songName,
                        artist: item.artistName,
                        album: item.albumName,
                        src: '',
                        lrc: '',
                        cover: item.pic,
                        isOnline: true,
                        source: 'netease',
                        _needResolve: true
                    }));

                    that.cacheManager.set(cacheKey, list, 30 * 60 * 1000);
                    return list;
                } catch (error) {
                    console.error('网易云歌单加载失败:', error);
                    return [];
                }
            },

            // 新搜索接口 完整版
            search: async (keyword) => {
                if (!keyword.trim()) return [];
                const cacheKey = `wy_search_${keyword}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const res = await fetch(
                        `${this.searchApiUrl}?token=${this.token}&msg=${encodeURIComponent(keyword)}`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);

                    if (!res.ok) throw new Error('搜索接口请求失败');
                    const json = await res.json();
                    if (json.code !== 200 || !json.data?.list) return [];

                    // 格式化统一歌曲结构
                    const list = json.data.list.map(item => ({
                        id: item.id,
                        title: item.title,
                        artist: item.artist,
                        album: item.album,
                        src: '',
                        lrc: '',
                        cover: '',
                        isOnline: true,
                        source: 'netease',
                        _needResolve: true
                    }));

                    that.cacheManager.set(cacheKey, list, 10 * 60 * 1000);
                    return list;
                } catch (error) {
                    console.error('网易云搜索失败:', error);
                    return [];
                }
            },

            // 按需解析播放地址+歌词
            resolveSong: async function(songId) {
                const cacheKey = `wy_resolve_${songId}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 6000);
                    // 取第n=序号资源
                    const res = await fetch(
                        `${this.searchApiUrl}?token=${this.token}&msg=${songId}&n=1`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);

                    if (!res.ok) throw new Error('解析失败');
                    const json = await res.json();
                    if (json.code !== 200 || !json.data?.list?.[0]) throw new Error('无资源');

                    const info = {
                        src: json.data.list[0].audio_url || '',
                        lrc: json.data.list[0].lyrics || '',
                        cover: json.data.list[0].cover_image || ''
                    };
                    that.cacheManager.set(cacheKey, info, 60 * 60 * 1000);
                    return info;
                } catch (e) {
                    console.warn('网易云歌曲解析失败:', e.message);
                    return { src: '', lrc: '', cover: '' };
                }
            }
        });

        // ========== QQ音乐插件（保持不变）==========
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '3.0.0',
            description: 'QQ音乐官方热歌榜',
            apiUrl: 'https://yunzhiapi.cn/API/qqrgbd.php',
            token: 'XIZhAXKnSQcH',

            _getSongInfoBySongmid: async function(songmid) {
                const cacheKey = `qq_song_info_${songmid}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    const res = await fetch(
                        `https://api.i-meto.com/meting/api?server=tencent&type=song&id=${songmid}`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);
                    if (!res.ok) throw new Error('请求异常');
                    const json = await res.json();
                    const info = {
                        playUrl: json[0]?.url || '',
                        cover: json[0]?.cover || '',
                        album: json[0]?.album || ''
                    };
                    that.cacheManager.set(cacheKey, info, 60 * 60 * 1000);
                    return info;
                } catch (e) {
                    console.warn('QQ歌曲解析失败:', e.message);
                    return { playUrl: '', cover: '', album: '' };
                }
            },

            getPlaylist: async (playlistId, count = 30) => {
                const safeCount = Math.min(Math.max(1, count), 50);
                const cacheKey = `qq_hot_list_${safeCount}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const res = await fetch(
                        `${this.apiUrl}?token=${this.token}&count=${safeCount}`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);

                    if (!res.ok) throw new Error('榜单请求失败');
                    const json = await res.json();
                    if (json.code !== 1) throw new Error(json.msg || '获取榜单失败');

                    const list = await Promise.all(
                        json.data.map(async item => {
                            const { playUrl, cover, album } = await this._getSongInfoBySongmid(item.songmid);
                            return {
                                id: item.songmid,
                                title: item.albumname,
                                artist: item.name,
                                album: album || item.albumname,
                                src: playUrl,
                                cover: cover,
                                isOnline: true,
                                source: 'qq'
                            };
                        })
                    );

                    const valid = list.filter(s => s.src);
                    that.cacheManager.set(cacheKey, valid, 30 * 60 * 1000);
                    return valid;
                } catch (err) {
                    console.error('QQ热歌榜加载失败:', err);
                    return [];
                }
            },

            search: async (keyword) => { return []; }
        });

        // ========== 汽水音乐插件（保持不变）==========
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

        // ========== 本地音乐插件（保持不变）==========
        this.registerPlugin('local', {
            name: '本地音乐',
            version: '1.0.0',
            description: '内置本地音乐列表',
            getPlaylist: async () => window.getLocalMusicList ? window.getLocalMusicList() : [],
            search: async () => []
        });
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
    },

    // 统一解析歌曲播放地址、歌词、封面
    async resolveSongSource(apiId, songId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.resolveSong) return { src: '', lrc: '', cover: '' };
        return await plugin.resolveSong(songId);
    }
}

window.PluginManager = PluginManager;
