/* music-main.js - 精简版（音乐播放器入口 + 与统一错误处理器协同） */
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
    // ===== 修复：仅在播放器未打开时才强制隐藏，避免覆盖用户已打开的状态 =====
    if (playerEl && !playerEl.classList.contains('show')) {
        playerEl.style.display = 'none';
    }
    tryInitMusicPlayer();
}

// DOM 就绪初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
    initWhenReady();
}

// ---------- 全局错误处理（与统一错误处理器协同） ----------
// ===== 修复：若统一错误处理器已注册，则跳过全局监听，避免重复记录与上报 =====
(function setupMusicGlobalErrorHandlers() {
    // 如果 utils.js 的 setupGlobalErrorHandler 已经通过 main.js 注册过，
    // window.errorHandler 会存在，此时不再重复挂载监听器。
    if (window._errorHandlerSetup || window.errorHandler) {
        return;
    }

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
        // ===== 修复：reason === null 已被 shouldIgnore(String(null) === 'null') 覆盖，无需重复判断 =====
        const msg = reason?.message || String(reason);
        if (shouldIgnore(msg)) return;
        console.error('未处理的Promise拒绝:', reason);
    });
})();

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