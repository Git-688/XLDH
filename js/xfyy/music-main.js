/* music-main.js */
let musicPlayer = null;
let pendingPlay = false;
let interactionHandler = null;

function tryInitMusicPlayer(retry = 0) {
    if (typeof MusicPlayer === 'undefined') {
        if (retry < 10) {
            setTimeout(() => tryInitMusicPlayer(retry + 1), 300);
        } else {
            console.error('MusicPlayer 类长时间未加载');
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) {
                toast.show('音乐播放器加载失败', 'error');
            }
        }
        return;
    }

    try {
        musicPlayer = new MusicPlayer();
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.musicPlayer) {
            window.Starlink.musicPlayer = musicPlayer;
        }
        window.musicPlayer = window.Starlink.musicPlayer;

        if (typeof Utils !== 'undefined' && typeof Utils.isMobile === 'function' && Utils.isMobile()) {
            document.body.classList.add('mobile-device');
            if (musicPlayer && musicPlayer.waitingForUserGesture) {
                const resumePlayback = () => {
                    if (musicPlayer && musicPlayer.waitingForUserGesture) {
                        musicPlayer.waitingForUserGesture = false;
                        if (musicPlayer.audio && musicPlayer.audio.src && musicPlayer.isPlaying) {
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
        const toast = window.Starlink?.toast || window.toast;
        if (toast && toast.show) {
            toast.show('音乐播放器初始化失败', 'error');
        }
    }
}

function initWhenReady() {
    const playerEl = document.getElementById('musicPlayer');
    if (playerEl) {
        playerEl.style.display = 'none';
    }
    tryInitMusicPlayer();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
    initWhenReady();
}

function setupGlobalErrorHandling() {
    const shouldIgnore = (message) => {
        const m = String(message || '');
        return m === 'Script error.' || m === 'null' || m === 'undefined' || m.trim() === '';
    };
    window.addEventListener('error', (event) => {
        const msg = event.message || (event.error && event.error.message) || '';
        if (shouldIgnore(msg)) return;
        console.error('全局错误:', event.error);
    });
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const msg = reason?.message || String(reason);
        if (shouldIgnore(msg) || reason === null) return;
        console.error('未处理的Promise拒绝:', reason);
    });
}
setupGlobalErrorHandling();

window.toggleMusicPlayer = () => window.Starlink?.navbar?.toggleMusicPlayer?.() || window.app?.components?.navbar?.toggleMusicPlayer?.();
window.showMusicPlayer = () => window.Starlink?.navbar?.showMusicPlayer?.() || window.app?.components?.navbar?.showMusicPlayer?.();
window.hideMusicPlayer = () => window.Starlink?.navbar?.hideMusicPlayer?.() || window.app?.components?.navbar?.hideMusicPlayer?.();
window.cleanupMusicPlayer = () => {
    if (window.Starlink?.musicPlayer) window.Starlink.musicPlayer.cleanup?.();
    else if (window.musicPlayer) window.musicPlayer.cleanup?.();
};
window.addEventListener('beforeunload', () => window.cleanupMusicPlayer());

document.addEventListener('keydown', (e) => {
    const player = window.Starlink?.musicPlayer || window.musicPlayer;
    if (!player) return;
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        player.togglePlay?.();
    }
    if (e.code === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        player.previous?.();
    }
    if (e.code === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        player.next?.();
    }
    if (e.code === 'KeyM' && e.ctrlKey) {
        e.preventDefault();
        player.setVolume?.(player.volume > 0 ? 0 : 0.5);
    }
});

document.addEventListener('visibilitychange', () => {
    const player = window.Starlink?.musicPlayer || window.musicPlayer;
    if (player && document.hidden && player.updateAnimationFrame) {
        cancelAnimationFrame(player.updateAnimationFrame);
        player.updateAnimationFrame = null;
    }
});