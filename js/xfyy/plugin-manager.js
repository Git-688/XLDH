/**
 * 插件管理器 - 支持多个音乐API源（稳定版，使用 api.injahow.cn 镜像）
 */

class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    initializePlugins() {
        // 网易云音乐插件（稳定镜像）
        this.registerPlugin('netease', {
            name: '网易云音乐',
            version: '1.0.2',
            getPlaylist: async (playlistId) => {
                const cacheKey = `netease_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=netease&type=playlist&id=${playlistId}`);
                    if (!response.ok) throw new Error();
                    const data = await response.json();
                    if (!Array.isArray(data)) throw new Error();
                    const formatted = data.map(song => this.formatSong(song, 'netease'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云音乐API请求失败:', error);
                    throw new Error('获取歌单失败');
                }
            },
            search: async (keyword) => {
                const cacheKey = `netease_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const url = `https://api.injahow.cn/meting/?server=netease&type=search&id=${encodeURIComponent(keyword)}`;
                    const response = await fetch(url);
                    if (!response.ok) throw new Error();
                    const data = await response.json();
                    let songs = Array.isArray(data) ? data : (data?.result?.songs || []);
                    const formatted = songs.map(song => this.formatSong(song, 'netease'));
                    for (const song of formatted) {
                        if (!song.src && song.id) {
                            song.src = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
                        }
                    }
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('网易云搜索失败:', error);
                    throw new Error('搜索失败');
                }
            },
            getDownloadUrl: async (songId) => `https://music.163.com/song/media/outer/url?id=${songId}.mp3`
        });

        // QQ音乐插件
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            version: '1.0.1',
            getPlaylist: async (playlistId) => {
                const cacheKey = `qq_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=tencent&type=playlist&id=${playlistId}`);
                    const data = await response.json();
                    if (!Array.isArray(data)) throw new Error();
                    const formatted = data.map(song => this.formatSong(song, 'qq'));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('QQ音乐API请求失败:', error);
                    throw new Error('获取歌单失败');
                }
            },
            search: async (keyword) => {
                const cacheKey = `qq_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const response = await fetch(`https://api.injahow.cn/meting/?server=tencent&type=search&id=${encodeURIComponent(keyword)}`);
                    const data = await response.json();
                    if (!Array.isArray(data)) throw new Error();
                    const formatted = data.map(song => this.formatSong(song, 'qq'));
                    for (const song of formatted) {
                        if (!song.src && song.id) song.src = `https://dl.stream.qqmusic.qq.com/${song.id}.mp3`;
                    }
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('QQ音乐搜索失败:', error);
                    throw new Error('搜索失败');
                }
            },
            getDownloadUrl: async (songId) => `https://dl.stream.qqmusic.qq.com/${songId}.mp3`
        });

        // 汽水音乐插件（保留原有）
        this.registerPlugin('qishui', {
            name: '汽水音乐',
            version: '1.0.1',
            getPlaylist: async (playlistId) => {
                const cacheKey = `qishui_playlist_${playlistId}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const token = '961D28A9C59C411C49C75FA3E9FAF24C';
                    let url = '';
                    if (playlistId === 'hot') url = `https://api.suol.cc/v1/music_qs.php?type=hot&token=${token}`;
                    else if (playlistId === 'new') url = `https://api.suol.cc/v1/music_qs.php?type=new&token=${token}`;
                    else if (playlistId === 'up') url = `https://api.suol.cc/v1/music_qs.php?type=up&token=${token}`;
                    else url = `https://api.suol.cc/v1/music_qs.php?type=hot&token=${token}`;
                    const response = await fetch(url);
                    if (!response.ok) throw new Error();
                    const data = await response.json();
                    if (data.code !== 200 || !data.data || !Array.isArray(data.data)) throw new Error();
                    const formatted = data.data.map(song => ({
                        id: song.id,
                        title: song.name,
                        artist: song.artist,
                        src: song.url,
                        cover: song.pic,
                        lrc: song.lrc,
                        isOnline: true,
                        source: 'qishui',
                        _needResolve: true
                    }));
                    this.cacheManager.set(cacheKey, formatted, 30 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('汽水音乐API请求失败:', error);
                    return [];
                }
            },
            search: async (keyword) => {
                const cacheKey = `qishui_search_${keyword}`;
                const cached = this.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const token = '961D28A9C59C411C49C75FA3E9FAF24C';
                    const url = `https://api.suol.cc/v1/music_qs.php?type=search&keyword=${encodeURIComponent(keyword)}&token=${token}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.code !== 200 || !data.data || !Array.isArray(data.data)) throw new Error();
                    const formatted = data.data.map(song => ({
                        id: song.id,
                        title: song.name,
                        artist: song.artist,
                        src: song.url,
                        cover: song.pic,
                        lrc: song.lrc,
                        isOnline: true,
                        source: 'qishui',
                        _needResolve: true
                    }));
                    this.cacheManager.set(cacheKey, formatted, 10 * 60 * 1000);
                    return formatted;
                } catch (error) {
                    console.error('汽水音乐搜索失败:', error);
                    return [];
                }
            },
            _getSongUrl: async (songId, quality = 'standard') => {
                try {
                    const token = '961D28A9C59C411C49C75FA3E9FAF24C';
                    const url = `https://api.suol.cc/v1/music_qs.php?type=url&id=${songId}&quality=${quality}&token=${token}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.code === 200 && data.data && data.data.url) {
                        return { url: data.data.url, lyric: data.data.lrc || '', pic: data.data.pic || '' };
                    }
                    throw new Error();
                } catch (error) {
                    console.error('解析汽水音乐播放地址失败:', error);
                    return { url: '', lyric: '', pic: '' };
                }
            }
        });

        // 本地音乐插件
        this.registerPlugin('local', {
            name: '本地音乐',
            version: '1.0.1',
            getPlaylist: async () => {
                if (window.localMusicData && Array.isArray(window.localMusicData)) return window.localMusicData;
                if (typeof window.getLocalMusicList === 'function') return window.getLocalMusicList();
                return [];
            },
            search: async () => [],
            getDownloadUrl: async (songId) => songId
        });
    }

    formatSong(song, source) {
        const id = song.id || song.songid || song.mid;
        const title = song.title || song.name || '未知歌曲';
        const artist = song.author || song.artist || song.singer || '未知歌手';
        const src = song.url || '';
        const cover = song.pic || song.cover || '';
        const lrc = song.lrc || '';
        return { id, title, artist, src, cover, lrc, isOnline: true, source };
    }

    registerPlugin(id, plugin) {
        this.plugins.set(id, { id, type: 'builtin', ...plugin, enabled: true });
        console.log(`插件 ${id} 注册成功`);
    }

    getPlugin(id) { return this.plugins.get(id); }
    getAllPlugins() { return Array.from(this.plugins.values()); }
    setCurrentApi(apiId) { if (this.plugins.has(apiId)) { this.currentApi = apiId; return true; } return false; }
    getCurrentApi() { return this.currentApi; }

    async getPlaylist(apiId, playlistId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.getPlaylist) throw new Error(`插件 ${apiId} 不支持获取歌单`);
        if (!plugin.enabled) throw new Error(`插件 ${apiId} 已被禁用`);
        return await plugin.getPlaylist(playlistId);
    }

    async search(apiId, keyword) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.search) throw new Error(`插件 ${apiId} 不支持搜索`);
        if (!plugin.enabled) throw new Error(`插件 ${apiId} 已被禁用`);
        return await plugin.search(keyword);
    }

    async preloadSong(song) {
        const promises = [];
        if (song.src) promises.push(this.cacheManager.preloadResource(song.src, 'audio'));
        if (song.cover) promises.push(this.cacheManager.preloadResource(song.cover, 'image'));
        try { await Promise.all(promises); return true; } catch (e) { return false; }
    }

    async getDownloadUrl(apiId, songId) {
        const plugin = this.getPlugin(apiId);
        if (!plugin || !plugin.getDownloadUrl) throw new Error(`插件 ${apiId} 不支持下载`);
        return await plugin.getDownloadUrl(songId);
    }
}

window.PluginManager = PluginManager;