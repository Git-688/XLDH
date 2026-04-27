/**
 * 音乐播放器主入口文件（模块版）
 * 使用时：const player = await initMusicPlayer()
 */
export default async function initMusicPlayer() {
    if (window.musicPlayer) return window.musicPlayer;

    // 动态导入播放器核心（确保只加载一次）
    const { default: MusicPlayer } = await import('./music-player.js');
    const player = new MusicPlayer();
    window.musicPlayer = player;
    return player;
}