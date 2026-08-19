/* local-music-data.js */
window.localMusicData = [
    {
        id: '1',
        title: 'All Rise',
        artist: 'Blue',
        src: 'https://tc688.ccwu.cc/file/本地音乐/All_Rise.mp3',
        cover: 'https://tc688.ccwu.cc/file/本地音乐/All_Rise.webp',
        lrc: 'https://tc688.ccwu.cc/file/本地音乐/All_Rise.lrc',
        isOnline: true,
        source: 'local'
    },
    {
        id: '2',
        title: '夜色',
        artist: '艺涛/梁剑东',
        src: 'https://tc688.ccwu.cc/file/本地音乐/夜色.mp3',
        cover: 'https://tc688.ccwu.cc/file/本地音乐/夜色.webp',
        lrc: 'https://tc688.ccwu.cc/file/本地音乐/夜色.lrc',
        isOnline: true,
        source: 'local'
    },
    {
        id: 'local_003',
        title: '少年',
        artist: '梦然',
        src: 'https://music.163.com/song/media/outer/url?id=1413863166.mp3',
        cover: 'https://p1.music.126.net/te0n9_1Vt9E6R3kQzGJQrg==/109951164757132387.jpg',
        lrc: '',
        isOnline: true,
        source: 'local'
    },
    {
        id: 'local_004',
        title: '光年之外',
        artist: 'G.E.M.邓紫',
        src: 'https://music.163.com/song/media/outer/url?id=449818741.mp3',
        cover: 'https://p1.music.126.net/fkqFqMaEt0CzxYS-0NpCog==/18587244069235039.jpg',
        lrc: '',
        isOnline: true,
        source: 'local'
    },
    {
        id: 'local_005',
        title: '稻香',
        artist: '周杰伦',
        src: 'https://music.163.com/song/media/outer/url?id=185809.mp3',
        cover: 'https://p1.music.126.net/ipY_jJJZVeDWVf5N5nSCQA==/109951166115108542.jpg',
        lrc: '',
        isOnline: true,
        source: 'local'
    }
];

window.getLocalMusicList = function() {
    return window.localMusicData;
};