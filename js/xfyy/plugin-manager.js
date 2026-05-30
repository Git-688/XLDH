/**
 * 插件管理器 修复rankMap作用域报错
 */
class PluginManager {
    constructor(cacheManager) {
        this.cacheManager = cacheManager || new CacheManager();
        this.plugins = new Map();
        this.currentApi = 'netease';
        this.initializePlugins();
    }

    initializePlugins() {
        const that = this;

        // 把排行榜常量提出来，避免this指向错乱
        const neteaseRankMap = {
            hot: "3778678",
            new: "3779629",
            up: "19723756",
            original: "2884035",
            electronic: "10520166",
            usa: "2809513713",
            korea: "115640620",
            classic: "71385702"
        };

        // ========== 网易云音乐插件 ==========
        this.registerPlugin('netease', {
            name: '网易云音乐',
            rankApiUrl: 'https://yunzhiapi.cn/API/yyjhbd.php',
            searchApiUrl: 'https://yunzhiapi.cn/API/wyyyjs.php',
            token: 'XIZhAXKnSQcH',
            type: 'wy',

            getPlaylist: async (playlistId) => {
                const rid = neteaseRankMap[playlistId] || neteaseRankMap.hot;
                const cacheKey = `wy_rank_${rid}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const res = await fetch(
                        `https://yunzhiapi.cn/API/yyjhbd.php?token=XIZhAXKnSQcH&id=${rid}&type=wy`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);

                    if (!res.ok) return [];
                    const json = await res.json();
                    if (json.code !== 1) return [];

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
                } catch (e) {
                    console.error('网易云榜单加载失败', e);
                    return [];
                }
            },

            search: async (keyword) => {
                if (!keyword.trim()) return [];
                const cacheKey = `wy_search_${keyword}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const res = await fetch(
                        `https://yunzhiapi.cn/API/wyyyjs.php?token=XIZhAXKnSQcH&msg=${encodeURIComponent(keyword)}`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);

                    if (!res.ok) return [];
                    const json = await res.json();
                    if (json.code !== 200 || !json.data?.list) return [];

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
                } catch (e) {
                    console.error('网易云搜索失败', e);
                    return [];
                }
            },

            resolveSong: async function(songId) {
                const cacheKey = `wy_resolve_${songId}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 6000);
                    const res = await fetch(
                        `https://yunzhiapi.cn/API/wyyyjs.php?token=XIZhAXKnSQcH&msg=${songId}&n=1`,
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
                    return { src: '', lrc: '', cover: '' };
                }
            }
        });

        // ========== QQ音乐插件 ==========
        this.registerPlugin('qq', {
            name: 'QQ音乐',
            apiUrl: 'https://yunzhiapi.cn/API/qqrgbd.php',
            token: 'XIZhAXKnSQcH',

            _getSongInfoBySongmid: async function(songmid) {
                const cacheKey = `qq_song_info_${songmid}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;
                try {
                    const res = await fetch(`https://api.i-meto.com/meting/api?server=tencent&type=song&id=${songmid}`);
                    const json = await res.json();
                    const info = {
                        playUrl: json[0]?.url || '',
                        cover: json[0]?.cover || '',
                        album: json[0]?.album || ''
                    };
                    that.cacheManager.set(cacheKey, info, 60 * 60 * 1000);
                    return info;
                } catch (e) {
                    return { playUrl: '', cover: '', album: '' };
                }
            },

            getPlaylist: async (playlistId, count = 30) => {
                const safeCount = Math.min(Math.max(1, count), 50);
                const cacheKey = `qq_hot_list_${safeCount}`;
                const cached = that.cacheManager.get(cacheKey);
                if (cached) return cached;

                try {
                    const res = await fetch(`https://yunzhiapi.cn/API/qqrgbd.php?token=XIZhAXKnSQcH&count=${safeCount}`);
                    const json = await res.json();
                    if (json.code !== 1) return [];

                    const list = await Promise.all(
                        json.data.map(async item => {
                            const info = await this._getSongInfoBySongmid(item.songmid);
                            return {
                                id: item.songmid,
                                title: item.albumname,
                                artist: item.name,
                                album: info.album || item.albumname,
                                src: info.playUrl,
                                cover: info.cover,
                                isOnline: true,
                                source: 'qq'
                            };
                        })
                    );

                    const valid = list.filter(s => s.src);
                    that.cacheManager.set(cacheKey, valid, 30 * 60 * 1000);
                    return valid;
                } catch (e) {
                    return [];
                }
            },

            search: async () => []
        });

        // ========== 汽水音乐插件 ==========
        this.registerPlugin('qishui', {
            name: '汽水音乐',
            baseUrl: 'https://api.suol.cc/v1/music_qs.php',
            mToken: '961D28A9C59C411C49C75FA3E9FAF24C',
            rankKeywordMap: { hot:'热歌榜',new:'新歌榜',up:'飙升榜' },

            _fetchApi: async function(action, params={}) {
                const url = new URL(this.baseUrl);
                url.searchParams.set('action',action);
                url.searchParams.set('m_token',this.mToken);
                Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null)url.searchParams.set(k,v);});
                const controller = new AbortController();
                const timeoutId = setTimeout(()=>controller.abort(),8000);
                try{
                    const res = await fetch(url.toString(),{signal:controller.signal});
                    clearTimeout(timeoutId);
                    return await res.json();
                }catch(e){clearTimeout(timeoutId);throw e;}
            },

            _mapSongItem: function(item) {
                return {
                    id: item.id||item.songid||'',
                    title: item.name||'未知歌曲',
                    artist: item.artists||'未知歌手',
                    cover: item.pic||'',
                    album: item.album||'',
                    src:'',lrc:'',isOnline:true,source:'qishui',_needResolve:true
                };
            },

            getPlaylist: async function(playlistId) {
                const kw = this.rankKeywordMap[playlistId]||'热歌榜';
                const cacheKey = `qishui_rank_${playlistId}`;
                const cached = that.cacheManager?.get(cacheKey);
                if(cached) return cached;
                try{
                    const res = await this._fetchApi('rank',{keyword:kw});
                    if(res.code!==200) return [];
                    const list = Array.isArray(res.data) ? res.data.map(item=>this._mapSongItem(item)) : [];
                    that.cacheManager?.set(cacheKey,list,30*60*1000);
                    return list;
                }catch(e){return [];}
            },

            search: async function(keyword) {
                if(!keyword) return [];
                const cacheKey = `qishui_search_${keyword}`;
                const cached = that.cacheManager?.get(cacheKey);
                if(cached) return cached;
                try{
                    const res = await this._fetchApi('search',{keyword});
                    if(res.code!==200||!res.data?.songs) return [];
                    const list = res.data.songs.map(item=>this._mapSongItem(item));
                    that.cacheManager?.set(cacheKey,list,10*60*1000);
                    return list;
                }catch(e){return [];}
            },

            _getSongUrl: async function(songId) {
                const cacheKey = `qishui_song_${songId}`;
                const cached = that.cacheManager?.get(cacheKey);
                if(cached) return cached;
                try{
                    const res = await this._fetchApi('song',{id:songId});
                    if(res.code===200&&res.data){
                        const d = {url:res.data.url||'',lyric:res.data.lyric_lrc||'',pic:res.data.pic||''};
                        that.cacheManager?.set(cacheKey,d,60*60*1000);
                        return d;
                    }
                }catch(e){}
                return {url:'',lyric:'',pic:''};
            }
        });

        // ========== 本地音乐 ==========
        this.registerPlugin('local', {
            name: '本地音乐',
            getPlaylist: async () => window.getLocalMusicList ? window.getLocalMusicList() : [],
            search: async () => []
        });
    }

    registerPlugin(id, plugin) {
        this.plugins.set(id, { id, type: 'builtin', ...plugin });
    }
    getPlugin(id) { return this.plugins.get(id); }
    getAllPlugins() { return Array.from(this.plugins.values()); }
    setCurrentApi(apiId) { return this.plugins.has(apiId) ? (this.currentApi=apiId,true) : false; }
    getCurrentApi() { return this.currentApi; }

    async getPlaylist(apiId, playlistId) {
        const p = this.getPlugin(apiId);
        if(!p||!p.getPlaylist) return [];
        return await p.getPlaylist(playlistId);
    }
    async search(apiId, keyword) {
        const p = this.getPlugin(apiId);
        if(!p||!p.search) return [];
        return await p.search(keyword);
    }
    async resolveSongSource(apiId, songId) {
        const p = this.getPlugin(apiId);
        if(!p||!p.resolveSong) return {src:'',lrc:'',cover:''};
        return await p.resolveSong(songId);
    }
}

window.PluginManager = PluginManager;
