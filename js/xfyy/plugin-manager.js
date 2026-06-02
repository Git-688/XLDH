/**
 * 插件管理器 - 支持多个音乐API源（修复播放地址获取失败 + 使用歌曲对应封面）
 * 修改：网易云搜索改用巡回寺 API，榜单解析保持不变
 */
class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    initializePlugins() {
        const self = this;

        // 网易云音乐插件（保留原榜单 API，搜索/解析改用巡回寺）
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '2.2.4',
            description: '榜单沿用 tinyaii，搜索/解析使用巡回寺 API',

            // 获取歌曲播放地址和歌词（巡回寺 API，支持高音质）
            _getSongUrlAndLyric: async function(songId, retryCount = 0) {
                const cacheKey = `netease_song_${songId}`;
                const cached = self.cacheManager.get(cacheKey);
                if (cached) return cached;

                const newApiBase = 'https://api.xunhuisi.store/API/NetEaseMusic/Song.php';
                const quality = 'high'; // standard, high, lossless
                const url = `${newApiBase}?id=${songId}&type=json&quality=${quality}`;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);
                    const response = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();

                    let songInfo = null;
                    if (data.code === 200) {
                        if (Array.isArray(data.data) && data.data.length > 0) {
                            songInfo = data.data[0];
                        } else if (data.data && typeof data.data === 'object') {
                            songInfo = data.data;
                        }
                    }

                    if (songInfo && songInfo.url) {
                        const result = {
                            url: songInfo.url,
                            lrc: songInfo.lrc || '',
                            cover: songInfo.pic || songInfo.cover || ''
                        };
                        self.cacheManager.set(cacheKey, result, 60 * 60 * 1000);
                        return result;
                    }
                    throw new Error('未获取到播放地址');
                } catch (error) {
                    console.warn(`获取歌曲 ${songId} 播放地址失败:`, error.message);
                    if (retryCount < 2) {
                        await new Promise(r => setTimeout(r, 1000));
                        return this._getSongUrlAndLyric(songId, retryCount + 1);
                    }
                    return { url: '', lrc: '', cover: '' };
                }
            },

            // 获取榜单列表或榜单歌曲（原 API，保持不变）
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
                    // 并发获取每首歌的播放地址和歌词（限制并发数）
                    const batchSize = 5;
                    const formattedSongs = [];
                    for (let i = 0; i < songs.length; i += batchSize) {
                        const batch = songs.slice(i, i + batchSize);
                        const batchResults = await Promise.all(batch.map(async (song) => {
                            const songInfo = await this._getSongUrlAndLyric(song.id);
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
                        }));
                        formattedSongs.push(...batchResults);
                    }
                    // 过滤掉无法获取播放地址的歌曲
                    const validSongs = formattedSongs.filter(song => song.src);
                    self.cacheManager.set(cacheKey, validSongs, 30 * 60 * 1000);
                    return validSongs;
                } catch (error) {
                    console.error('获取网易云榜单歌曲失败:', error);
                    return [];
                }
            },

            // 搜索功能 - 使用巡回寺 API（返回列表，支持最多30条）
            search: async function(keyword) {
                const cacheKey = `netease_search_${keyword}`;
                const cached = self.cacheManager.get(cacheKey);
                if (cached) return cached;

                const newApiBase = 'https://api.xunhuisi.store/API/NetEaseMusic/Song.php';
                const listSize = 30;
                const url = `${newApiBase}?name=${encodeURIComponent(keyword)}&list=${listSize}&type=json`;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const response = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();

                    let songs = [];
                    if (data.code === 200 && Array.isArray(data.data)) {
                        songs = data.data.map(item => ({
                            id: item.id,
                            title: item.name || '未知歌曲',
                            artist: item.artist || '未知歌手',
                            src: item.url || '',
                            cover: item.pic || item.cover || '',
                            lrc: item.lrc || '',
                            isOnline: true,
                            source: 'netease'
                        }));
                    }

                    const validSongs = songs.filter(song => song.src);
                    self.cacheManager.set(cacheKey, validSongs, 10 * 60 * 1000);
                    return validSongs;
                } catch (error) {
                    console.error('网易云搜索请求失败:', error);
                    return [];
                }
            }
        });

        // QQ音乐插件（保持不变，添加封面支持）
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

                    const songsWithFullInfo = await Promise.all(
                        hotResult.data.map(async (song) => {
                            const { playUrl, cover, album } = await this._getSongInfoBySongmid(song.songmid);
                            return self.formatSong({
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
            cover: song.pic || song.cover || '',
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
        if (song.cover && song.cover !== '/assets/logo.png') {
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