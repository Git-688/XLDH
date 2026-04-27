/**
 * 音乐播放器主入口文件 - 适配星链导航
 * 负责音乐播放器的初始化和全局控制
 */

let musicPlayer = null;

document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('初始化音乐播放器系统...');

        initMusicPlayerControl();

        setTimeout(() => {
            initializeMusicPlayerCore();
        }, 1500);

    } catch (error) {
        console.error('音乐播放器初始化失败:', error);
        window.toast.show('音乐播放器初始化失败: ' + error.message, 'error');
    }
});

function initializeMusicPlayerCore() {
    try {
        if (typeof MusicPlayer === 'undefined') {
            throw new Error('MusicPlayer 类未定义，请确保 music-player.js 已加载');
        }

        musicPlayer = new MusicPlayer();
        window.musicPlayer = musicPlayer;

        console.log('悬浮音乐播放器初始化成功');

        setupGlobalErrorHandling();

        if (Utils.isMobile()) {
            document.body.classList.add('mobile-device');
            console.log('移动端设备检测，启用移动端优化');
        }

        setTimeout(() => {
            if (musicPlayer.loadApiPlaylist) {
                musicPlayer.loadApiPlaylist(musicPlayer.currentApi);
            }
        }, 2000);

    } catch (error) {
        console.error('音乐播放器核心初始化失败:', error);
        window.toast.show('音乐播放器核心初始化失败: ' + error.message, 'error');
    }
}

function initMusicPlayerControl() {
    const musicPlayer = document.getElementById('musicPlayer');
    if (!musicPlayer) {
        console.error('音乐播放器元素未找到');
        return;
    }
    musicPlayer.style.display = 'none';
    console.log('音乐播放器控制初始化完成');
}

function setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('全局错误:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('未处理的Promise拒绝:', event.reason);
    });
}

window.toggleMusicPlayer = function() {
    if (window.app && window.app.components.navbar) {
        window.app.components.navbar.toggleMusicPlayer();
    }
};

window.showMusicPlayer = function() {
    if (window.app && window.app.components.navbar) {
        window.app.components.navbar.showMusicPlayer();
    }
};

window.hideMusicPlayer = function() {
    if (window.app && window.app.components.navbar) {
        window.app.components.navbar.hideMusicPlayer();
    }
};

window.cleanupMusicPlayer = function() {
    if (musicPlayer && typeof musicPlayer.cleanup === 'function') {
        musicPlayer.cleanup();
        console.log('音乐播放器资源已清理');
    }
};

window.addEventListener('beforeunload', () => {
    window.cleanupMusicPlayer();
});

document.addEventListener('keydown', (e) => {
    if (!musicPlayer) return;

    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        if (musicPlayer.togglePlay) {
            musicPlayer.togglePlay();
        }
    }

    if (e.code === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        if (musicPlayer.previous) {
            musicPlayer.previous();
        }
    }

    if (e.code === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        if (musicPlayer.next) {
            musicPlayer.next();
        }
    }

    if (e.code === 'KeyM' && e.ctrlKey) {
        e.preventDefault();
        if (musicPlayer.setVolume) {
            const currentVolume = musicPlayer.volume;
            musicPlayer.setVolume(currentVolume > 0 ? 0 : 0.5);
        }
    }
});

document.addEventListener('visibilitychange', () => {
    if (musicPlayer && document.hidden) {
        if (musicPlayer.pauseBackgroundAnimation) {
            musicPlayer.pauseBackgroundAnimation();
        }
        if (musicPlayer.updateAnimationFrame) {
            cancelAnimationFrame(musicPlayer.updateAnimationFrame);
            musicPlayer.updateAnimationFrame = null;
        }
    } else if (musicPlayer) {
        if (musicPlayer.resumeBackgroundAnimation) {
            musicPlayer.resumeBackgroundAnimation();
        }
    }
});

window.initMusicPlayerControl = initMusicPlayerControl;
window.initializeMusicPlayerCore = initializeMusicPlayerCore;

console.log('music-main.js 加载完成');