/* music-main.js - 精简版（音乐播放器入口） */
let musicPlayer = null;

function tryInitMusicPlayer(retry = 0) {
    if (typeof MusicPlayer !== 'undefined') {
        try {
            musicPlayer = new MusicPlayer();
            if (!window.Starlink) window.Starlink = {};
            if (!window.Starlink.musicPlayer) {
                window.Starlink.musicPlayer = musicPlayer;
            }
            window.musicPlayer = window.Starlink.musicPlayer;

            // 移动端自动播放处理
            if (typeof Utils?.isMobile === 'function' && Utils.isMobile()) {
                document.body.classList.add('mobile-device');
                if (musicPlayer?.waitingForUserGesture) {
                    const resumePlayback = () => {
                        if (musicPlayer?.waitingForUserGesture) {
                            musicPlayer.waitingForUserGesture = false;
                            if (musicPlayer.audio?.src && musicPlayer.isPlaying) {
                                musicPlayer.play().catch(e => console.warn('自动播放失败:', e));
                            }
                        }
                        document.removeEventListener('click', resumePlayback);
                        document.removeEventListener('touchstart', resumePlayback);
                        document.removeEventListener('keydown', resumePlayback);
                    };
                    document.addEventListener('click', resumePlayback);
                    document.addEventListener('touchstart', resumePlayback);
                    document.addEventListener('keydown', resumePlayback);
                }
            }

            setTimeout(() => {
                musicPlayer?.loadApiPlaylist?.(musicPlayer.currentApi);
            }, 500);
        } catch (error) {
            console.error('音乐播放器核心初始化失败:', error);
            window.toast?.show('音乐播放器初始化失败', 'error');
        }
        return;
    }

    if (retry < 10) {
        setTimeout(() => tryInitMusicPlayer(retry + 1), 300);
    } else {
        console.error('MusicPlayer 类长时间未加载');
        window.toast?.show('音乐播放器加载失败', 'error');
    }
}

function initWhenReady() {
    const playerEl = document.getElementById('musicPlayer');
    if (playerEl) playerEl.style.display = 'none';
    tryInitMusicPlayer();
}

// DOM 就绪初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
    initWhenReady();
}

// ---------- 全局错误处理 ----------
const shouldIgnore = (message) => {
    const m = String(message || '');
    return m === 'Script error.' || m === 'null' || m === 'undefined' || m.trim() === '';
};

window.addEventListener('error', (event) => {
    const msg = event.message || event.error?.message || '';
    if (shouldIgnore(msg)) return;
    console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason);
    if (shouldIgnore(msg) || reason === null) return;
    console.error('未处理的Promise拒绝:', reason);
});

// ---------- 全局 API ----------
window.toggleMusicPlayer = () => window.Starlink?.navbar?.toggleMusicPlayer?.() || window.app?.components?.navbar?.toggleMusicPlayer?.();
window.showMusicPlayer = () => window.Starlink?.navbar?.showMusicPlayer?.() || window.app?.components?.navbar?.showMusicPlayer?.();
window.hideMusicPlayer = () => window.Starlink?.navbar?.hideMusicPlayer?.() || window.app?.components?.navbar?.hideMusicPlayer?.();
window.cleanupMusicPlayer = () => {
    if (window.Starlink?.musicPlayer) window.Starlink.musicPlayer.cleanup?.();
    else if (window.musicPlayer) window.musicPlayer.cleanup?.();
};

window.addEventListener('beforeunload', () => window.cleanupMusicPlayer());

// ---------- 键盘快捷键 ----------
document.addEventListener('keydown', (e) => {
    const player = window.Starlink?.musicPlayer || window.musicPlayer;
    if (!player) return;

    // 空格：播放/暂停
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        player.togglePlay?.();
    }
    // Ctrl+左箭头：上一首
    if (e.code === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        player.previous?.();
    }
    // Ctrl+右箭头：下一首
    if (e.code === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        player.next?.();
    }
    // Ctrl+M：静音切换
    if (e.code === 'KeyM' && e.ctrlKey) {
        e.preventDefault();
        player.setVolume?.(player.volume > 0 ? 0 : 0.5);
    }
});

// ---------- 可见性变化优化 ----------
document.addEventListener('visibilitychange', () => {
    const player = window.Starlink?.musicPlayer || window.musicPlayer;
    if (player && document.hidden && player.updateAnimationFrame) {
        cancelAnimationFrame(player.updateAnimationFrame);
        player.updateAnimationFrame = null;
    }
});