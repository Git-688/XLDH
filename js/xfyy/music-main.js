/**
 * 音乐播放器主入口文件 - 适配星聚导航
 * 已彻底过滤 Script error / null 噪音
 */
let musicPlayer = null;

function tryInitMusicPlayer(retry = 0) {
    if (typeof MusicPlayer === 'undefined') {
        if (retry < 10) {
            setTimeout(() => tryInitMusicPlayer(retry + 1), 300);
        } else {
            console.error('MusicPlayer 类长时间未加载');
            window.toast?.show('音乐播放器加载失败', 'error');
        }
        return;
    }

    try {
        musicPlayer = new MusicPlayer();
        window.musicPlayer = musicPlayer;
        console.log('悬浮音乐播放器初始化成功');

        // 安全调用 Utils.isMobile()
        if (typeof Utils !== 'undefined' && typeof Utils.isMobile === 'function' && Utils.isMobile()) {
            document.body.classList.add('mobile-device');
        }

        setTimeout(() => {
            musicPlayer?.loadApiPlaylist?.(musicPlayer.currentApi);
        }, 500);
    } catch (error) {
        console.error('音乐播放器核心初始化失败:', error);
        window.toast?.show('音乐播放器初始化失败', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('初始化音乐播放器系统...');
    initMusicPlayerControl();
    tryInitMusicPlayer();
});

function initMusicPlayerControl() {
    const el = document.getElementById('musicPlayer');
    if (!el) {
        console.error('音乐播放器元素未找到');
        return;
    }
    el.style.display = 'none';
}

// ========== 静默所有噪音错误 ==========
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

setupGlobalErrorHandling();   // 立即执行，尽早接管

window.toggleMusicPlayer = () => window.app?.components?.navbar?.toggleMusicPlayer();
window.showMusicPlayer = () => window.app?.components?.navbar?.showMusicPlayer();
window.hideMusicPlayer = () => window.app?.components?.navbar?.hideMusicPlayer();

window.cleanupMusicPlayer = () => {
    musicPlayer?.cleanup?.();
    console.log('音乐播放器资源已清理');
};

window.addEventListener('beforeunload', () => window.cleanupMusicPlayer());

document.addEventListener('keydown', (e) => {
    if (!musicPlayer) return;
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        musicPlayer.togglePlay?.();
    }
    if (e.code === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        musicPlayer.previous?.();
    }
    if (e.code === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        musicPlayer.next?.();
    }
    if (e.code === 'KeyM' && e.ctrlKey) {
        e.preventDefault();
        musicPlayer.setVolume?.(musicPlayer.volume > 0 ? 0 : 0.5);
    }
});

document.addEventListener('visibilitychange', () => {
    if (musicPlayer && document.hidden && musicPlayer.updateAnimationFrame) {
        cancelAnimationFrame(musicPlayer.updateAnimationFrame);
        musicPlayer.updateAnimationFrame = null;
    }
});

console.log('music-main.js 加载完成');