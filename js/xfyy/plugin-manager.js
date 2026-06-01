// plugin-manager.js - 完整版（网易云音乐搜索 API 已更换为 tinyaii）
/**
 * 插件管理器 - 支持多个音乐API源（并发控制，解决 Failed to fetch）
 * 保留网易云、QQ音乐、汽水音乐、本地音乐
 */
class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    /**
     * 并发控制函数：同时最多执行 limit 个 Promise
     */
    async runWithConcurrency(tasks, limit = 5) {
        const results = [];
        const executing = [];
        for (const task of tasks) {
            const p = Promise.resolve().then(() => task());
            results.push(p);
            if (limit <= tasks.length) {
                const e = p.then(() => executing.splice(executing.indexOf(e), 1));
                executing.push(e);
                if (executing.length >= limit) {
                    await Promise.race(executing);
                }
            }
        }
        return Promise.all(results);
    }

    initializePlugins() {
        const self = this; // 保存外部 this 引用

        // 网易云音乐插件（使用新排行榜API，增加并发控制，并更换搜索 API）
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '2.2.4',
            description: '基于 tinyaii 榜单API + 搜索API + Meting 解析播放地址（并发控制）',

            // 通过歌曲ID获取播放地址和歌词（复用原Meting API，带超时和重试）
            _getSongUrlAndLyric: async function(songId, retries = 2) {
                const cacheKey = `netease_song_${songId}`;
                const cached = self.cacheManager.get(cacheKey);
                if (cached) return cached;

                const fetchWithTimeout = async (url, options, timeout = 8000) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeout);
                    try {
                        const response = await fetch(url, { ...options, signal: controller.signal });
                        clearTimeout(timeoutId);
                        return response;
                    } catch (err) {
                        clearTimeout(timeoutId);
                        throw err;
                    }
                };

                for (let attempt = 0; attempt <= retries; attempt++) {
                    try {
                        const response = await fetchWithTimeout(
                            `https://api.injahow.cn/meting/?server=netease&type=song&id=${songId}`,
                            {},
                            8000
                        );
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const data = await response.json();
                        const song = Array.isArray(data) ? data[0] : data;
                        const result = {
                            url: song?.url || '',
                            lrc: song?.lrc || '',
                            cover: song?.pic || ''
                        };
                        if (result.url) {
                            self.cacheManager.set(cacheKey, result, 60 * 60 * 1000);
                        }
                        return result;
                    } catch (error) {
                        if (attempt === retries) {
                            console.warn(`获取歌曲 ${songId} 播放地址失败:`, error.message);
                            return { url: '', lrc: '', cover: '' };
                        }
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
                return { url: '', lrc: '', cover: '' };
            },

            // 获取榜单列表或榜单歌曲（新API）
            getPlaylist: async function(playlistId) {
                const API_KEY = 'sk_18b4ef591fe11fde974d772e9663640a';
                const API_BASE = 'https://api.tinyaii.top/v1/netease/toplist';

                // 如果没有传入 playlistId，返回榜单列表（用于前端下拉选择）
                if (!playlistId) {
                    const cacheKey = 'netease_toplist_list';
                    const cached = self.cacheManager.get(cacheKey);
                    if (cached) return cached;

                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 8000);
                        const response = await fetch(API_BASE, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const result = await response.json();
                        if (result.code !== 200) throw new Error(result.message || '获取榜单列表失败');
                        const lists = result.data.lists.map(item => ({
                            id: String(item.id),
                            name: item.name,
                            update: item.update
                        }));
                        self.cacheManager.set(cacheKey, lists, 30 * 60 * 1000);
                        return lists;
                    } catch (error) {
                        console.error('获取网易云榜单列表失败:', error);
                        return [];
                    }
                }

                // 有 playlistId：获取该榜单的歌曲列表
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = self.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const url = `${API_BASE}?id=${playlistId}`;
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    if (result.code !== 200) throw new Error(result.message || '获取榜单歌曲失败');

                    const songs = result.data.songs || [];
                    // 使用并发控制获取每首歌的播放地址和歌词（最多同时5个请求）
                    const songTasks = songs.map((song) => {
                        return async () => {
                            const songInfo = await this._getSongUrlAndLyric(song.id);
                            if (songInfo.url) {
                                return {
                                    id: song.id,
                                    title: song.name || '未知歌曲',
                                    artist: song.singer || '未知歌手',
                                    src: songInfo.url,
                                    cover: songInfo.cover || song.cover,
                                    lrc: songInfo.lrc,
                                    isOnline: true,
                                    source: 'netease'
                                };
                            }
                            return null;
                        };
                    });
                    const formattedSongs = await self.runWithConcurrency(songTasks, 5);
                    // 过滤掉 null（无法获取播放地址的歌曲）
                    const validSongs = formattedSongs.filter(song => song !== null);
                    self.cacheManager.set(cacheKey, validSongs, 30 * 60 * 1000);
                    return validSongs;
                } catch (error) {
                    console.error('获取网易云榜单歌曲失败:', error);
                    return [];
                }
            },

            // ***** 替换为新的 tinyaii 搜索 API *****
            search: async function(keyword) {
                const API_KEY = 'sk_18b4ef591fe11fde974d772e9663640a';
                const SEARCH_API = 'https://api.tinyaii.top/v1/netease/search';
                const cacheKey = `netease_search_${keyword}`;
                const cached = self.cacheManager.get(cacheKey);
                if (cached) return cached;

                // 参数：limit 默认 20，最大 100；offset 默认 0
                const limit = 30;  // 可调整
                const offset = 0;
                const url = `${SEARCH_API}?keyword=${encodeURIComponent(keyword)}&limit=${limit}&offset=${offset}`;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    if (result.code !== 200) throw new Error(result.message || '搜索失败');

                    const songs = result.data.songs || [];
                    // 将搜索到的歌曲转换为前端期望的格式（不包含播放地址和歌词，延迟加载）
                    const formatted = songs.map(song => ({
                        id: song.id,
                        title: song.name,
                        artist: song.singer,
                        cover: song.cover,
                        src: '',          // 播放地址稍后通过 _getSongUrlAndLyric 获取
                        lrc: '',          // 歌词稍后获取
                        isOnline: true,
                        source: 'netease'
                    }));
                    // 缓存搜索结果（10分钟）
                    self.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云搜索请求失败:', error);
                    return [];
                }
            }
        });

        // QQ音乐插件（保持不变，但优化并发）
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '2.3.0',
            description: '云智热歌榜 + Meting解析',

            _getSongInfoBySongmid: async function(songmid) {
                const cacheKey = `qq_song_info_${songmid}`;
                const cached = self.cacheManager.get(cacheKey);
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
                    
                    self.cacheManager.set(cacheKey, songInfo, 60 * 60 * 1000);
                    return songInfo;
                } catch (error) {
                    console.warn(`歌曲${songmid}信息获取失败:`, error.message);
                    return { playUrl: '', cover: '', album: '' };
                }
            },

            getPlaylist: async function(playlistId, count = 30) {
                const safeCount = Math.min(Math.max(1, count), 30);
                const cacheKey = `qq_hot_playlist_full_${safeCount}`;
                const cached = self.cacheManager.get(cacheKey);
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

                    // 使用并发控制获取每首歌的信息
                    const songTasks = hotResult.data.map((song) => {
                        return async () => {
                            const { playUrl, cover, album } = await this._getSongInfoBySongmid(song.songmid);
                            if (playUrl) {
                                return self.formatSong({
                                    title: song.albumname,
                                    artist: song.name,
                                    album: album || song.albumname,
                                    url: playUrl,
                                    cover: cover,
                                    pageUrl: song.link,
                                    songmid: song.songmid
                                }, 'qq');
                            }
                            return null;
                        };
                    });
                    const songsWithFullInfo = await self.runWithConcurrency(songTasks, 5);
                    const validSongs = songsWithFullInfo.filter(song => song !== null);
                    
                    self.cacheManager.set(cacheKey, validSongs, 30 * 60 * 1000);
                    return validSongs;
                } catch (error) {
                    console.error('QQ音乐热歌榜加载失败:', error);
                    return [];
                }
            },

            search: async function(keyword, count = 20) {
                return [];
            }
        });

        // 汽水音乐插件（保持不变）
        this.registerPlugin('qishui', {
            name: '汽水音乐',
            version: '1.2.1',
            description: '基于 suol.cc API，支持搜索和排行榜切换',
            baseUrl: 'https://api.suol.cc/v1/music_qs.php',
            mToken: '961D28A9C59C411C49C75FA3E9FAF24C',

            rankKeywordMap: {
                'hot': '热歌榜',
                'new': '新歌榜',
                'up':  '飙升榜'
            },

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
                const cached = self.cacheManager?.get(cacheKey);
                if (cached) return cached;

                try {
                    const result = await this._fetchApi('rank', { keyword });
                    if (result.code !== 200) throw new Error(result.msg || '请求失败');

                    let songs = [];
                    if (Array.isArray(result.data)) {
                        songs = result.data.map(item => this._mapSongItem(item));
                    }

                    self.cacheManager?.set(cacheKey, songs, 30 * 60 * 1000);
                    return songs;
                } catch (error) {
                    console.error('汽水音乐排行榜加载失败:', error);
                    return [];
                }
            },

            search: async function(keyword) {
                if (!keyword) return [];
                const cacheKey = `qishui_search_${keyword}`;
                const cached = self.cacheManager?.get(cacheKey);
                if (cached) return cached;

                try {
                    const result = await this._fetchApi('search', { keyword });
                    if (result.code !== 200) return [];

                    let songs = [];
                    if (result.data && Array.isArray(result.data.songs)) {
                        songs = result.data.songs.map(item => this._mapSongItem(item));
                    }

                    self.cacheManager?.set(cacheKey, songs, 10 * 60 * 1000);
                    return songs;
                } catch (error) {
                    console.error('汽水音乐搜索失败:', error);
                    return [];
                }
            },

            _getSongUrl: async function(songId, level = 'standard') {
                if (!songId) return { url: '', lyric: '', pic: '' };

                const cacheKey = `qishui_song_${songId}_${level}`;
                const cached = self.cacheManager?.get(cacheKey);
                if (cached) return cached;

                try {
                    const result = await this._fetchApi('song', { id: songId, level });
                    if (result.code === 200 && result.data) {
                        const resolved = {
                            url: result.data.url || '',
                            lyric: result.data.lyric_lrc || '',
                            pic: result.data.pic || '',
                        };
                        self.cacheManager?.set(cacheKey, resolved, 60 * 60 * 1000);
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

    /**
     * 并发控制：同时最多执行 limit 个 Promise
     */
    async runWithConcurrency(tasks, limit = 5) {
        const results = [];
        const executing = [];
        for (const task of tasks) {
            const p = Promise.resolve().then(() => task());
            results.push(p);
            if (limit <= tasks.length) {
                const e = p.then(() => executing.splice(executing.indexOf(e), 1));
                executing.push(e);
                if (executing.length >= limit) {
                    await Promise.race(executing);
                }
            }
        }
        return Promise.all(results);
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