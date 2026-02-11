/**
 * 音乐播放器主入口文件 - 适配星链导航
 * 负责音乐播放器的初始化和全局控制
 */

// 全局音乐播放器实例
let musicPlayer = null;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('初始化音乐播放器系统...');
        
        // 初始化音乐播放器控制
        initMusicPlayerControl();
        
        // 延迟初始化播放器核心功能
        setTimeout(() => {
            initializeMusicPlayerCore();
        }, 1500);
        
    } catch (error) {
        console.error('音乐播放器初始化失败:', error);
        showErrorNotification('音乐播放器初始化失败: ' + error.message);
    }
});

/**
 * 初始化音乐播放器核心功能
 */
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
        showErrorNotification('音乐播放器核心初始化失败: ' + error.message);
    }
}

/**
 * 初始化音乐播放器显示/隐藏控制
 */
function initMusicPlayerControl() {
    const musicPlayer = document.getElementById('musicPlayer');
    if (!musicPlayer) {
        console.error('音乐播放器元素未找到');
        return;
    }
    musicPlayer.style.display = 'none';
    console.log('音乐播放器控制初始化完成');
}

/**
 * 设置全局错误处理
 */
function setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('全局错误:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('未处理的Promise拒绝:', event.reason);
    });
}

/**
 * 显示错误通知
 */
function showErrorNotification(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #e74c3c;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        text-align: center;
        max-width: 90%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    errorDiv.innerHTML = `
        <h3 style="margin-bottom: 10px;">播放器初始化失败</h3>
        <p style="margin-bottom: 15px; font-size: 14px;">${error}</p>
        <button onclick="location.reload()" style="
            background: white;
            color: #e74c3c;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        ">重新加载</button>
    `;
    document.body.appendChild(errorDiv);
}

/**
 * 切换音乐播放器显示/隐藏（全局函数）
 */
window.toggleMusicPlayer = function() {
    if (window.app && window.app.components.navbar) {
        window.app.components.navbar.toggleMusicPlayer();
    }
};

/**
 * 显示音乐播放器
 */
window.showMusicPlayer = function() {
    if (window.app && window.app.components.navbar) {
        window.app.components.navbar.showMusicPlayer();
    }
};

/**
 * 隐藏音乐播放器
 */
window.hideMusicPlayer = function() {
    if (window.app && window.app.components.navbar) {
        window.app.components.navbar.hideMusicPlayer();
    }
};

/**
 * 清理音乐播放器资源
 */
window.cleanupMusicPlayer = function() {
    if (musicPlayer && typeof musicPlayer.cleanup === 'function') {
        musicPlayer.cleanup();
        console.log('音乐播放器资源已清理');
    }
};

window.addEventListener('beforeunload', () => {
    window.cleanupMusicPlayer();
});

// 全局键盘快捷键
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
    
    // M键静音（简化：直接切换0/之前音量，不再依赖lastVolume，因为未定义）
    if (e.code === 'KeyM' && e.ctrlKey) {
        e.preventDefault();
        if (musicPlayer.setVolume) {
            const currentVolume = musicPlayer.volume;
            musicPlayer.setVolume(currentVolume > 0 ? 0 : 0.5); // 固定恢复50%
        }
    }
});

// 页面可见性变化处理
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