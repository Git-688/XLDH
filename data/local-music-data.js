/**
 * 本地音乐数据文件
 * 在此文件中管理本地音乐列表，方便添加和删除
 */

// 本地音乐数据
window.localMusicData = [
    {
        id: 'local_001',
        title: '起风了',
        artist: '买辣椒也用券',
        src: 'https://music.163.com/song/media/outer/url?id=1330348068.mp3',
        cover: 'https://p1.music.126.net/diGAyEmpymX8G7JcnElncQ==/109951163699673355.jpg',
        lrc: '',
        isOnline: true,
        source: 'local'
    },
    {
        id: 'local_002',
        title: '星辰大海',
        artist: '黄霄雲',
        src: 'https://music.163.com/song/media/outer/url?id=1811924206.mp3',
        cover: 'https://p1.music.126.net/6O0ZcO2KD3U-y7_6RfUO3Q==/109951165588832637.jpg',
        lrc: '',
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
        artist: 'G.E.M.邓紫棋',
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

/**
 * 获取本地音乐列表
 */
window.getLocalMusicList = function() {
    return window.localMusicData;
};