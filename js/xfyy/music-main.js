/**
 * 音乐播放器主入口文件 - 适配星聚导航
 * 使用 window.app 统一管理组件，不再直接依赖 window.navbar
 */
let musicPlayer = null;

document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('初始化音乐播放器系统...');

        initMusicPlayerControl();

        // 延迟初始化核心播放器，确保依赖的类已加载
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
        // 为了兼容其他模块的直接引用，仍然暴露到 window
        window.musicPlayer = musicPlayer;

        console.log('悬浮音乐播放器初始化成功');

        setupGlobalErrorHandling();

        if (Utils.isMobile()) {
            document.body.classList.add('mobile-device');
            console.log('移动端设备检测，启用移动端优化');
        }

        // 延迟加载初始歌单
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
    const playerElement = document.getElementById('musicPlayer');
    if (!playerElement) {
        console.error('音乐播放器元素未找到');
        return;
    }
    // 初始隐藏
    playerElement.style.display = 'none';
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

// ========== 全局快捷方法（供外部调用，通过 window.app 组件转发） ==========

window.toggleMusicPlayer = function() {
    if (window.app && window.app.components && window.app.components.navbar) {
        window.app.components.navbar.toggleMusicPlayer();
    } else if (window.app && window.app.toggleMusicPlayer) {
        window.app.toggleMusicPlayer();
    } else {
        // 备用：直接通过全局播放器实例
        const mp = document.getElementById('musicPlayer');
        const mb = document.getElementById('musicBtn');
        if (mp && mb) {
            mp.classList.contains('show') ? hideMusicPlayerInternal() : showMusicPlayerInternal();
        }
    }
};

window.showMusicPlayer = function() {
    if (window.app && window.app.components && window.app.components.navbar) {
        window.app.components.navbar.showMusicPlayer();
    } else {
        showMusicPlayerInternal();
    }
};

window.hideMusicPlayer = function() {
    if (window.app && window.app.components && window.app.components.navbar) {
        window.app.components.navbar.hideMusicPlayer();
    } else {
        hideMusicPlayerInternal();
    }
};

// 内部显示/隐藏方法（当 app.components.navbar 不可用时）
function showMusicPlayerInternal() {
    const mp = document.getElementById('musicPlayer');
    const mb = document.getElementById('musicBtn');
    if (mp && mb && !mp.classList.contains('show')) {
        mp.style.display = 'block';
        mp.classList.add('show');
        mb.classList.add('active');
    }
}

function hideMusicPlayerInternal() {
    const mp = document.getElementById('musicPlayer');
    const mb = document.getElementById('musicBtn');
    if (mp && mp.classList.contains('show')) {
        mp.classList.remove('show');
        mb.classList.remove('active');
        setTimeout(() => {
            mp.style.display = 'none';
        }, 600);
    }
}

// 清理播放器资源
window.cleanupMusicPlayer = function() {
    if (musicPlayer && typeof musicPlayer.cleanup === 'function') {
        musicPlayer.cleanup();
        console.log('音乐播放器资源已清理');
    }
    musicPlayer = null;
    window.musicPlayer = null;
};

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    window.cleanupMusicPlayer();
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (!musicPlayer) return;

    // 空格键播放/暂停（不在输入框内）
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        if (musicPlayer.togglePlay) {
            musicPlayer.togglePlay();
        }
    }

    // Ctrl + 左方向键：上一首
    if (e.code === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        if (musicPlayer.previous) {
            musicPlayer.previous();
        }
    }

    // Ctrl + 右方向键：下一首
    if (e.code === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        if (musicPlayer.next) {
            musicPlayer.next();
        }
    }

    // Ctrl + M：静音/恢复
    if (e.code === 'KeyM' && e.ctrlKey) {
        e.preventDefault();
        if (musicPlayer.setVolume) {
            const currentVolume = musicPlayer.volume;
            musicPlayer.setVolume(currentVolume > 0 ? 0 : 0.5);
        }
    }
});

// 页面隐藏时暂停不必要的动画
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

// 暴露内部方法供外部模块调用
window.initMusicPlayerControl = initMusicPlayerControl;
window.initializeMusicPlayerCore = initializeMusicPlayerCore;

console.log('music-main.js 加载完成');