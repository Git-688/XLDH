/**
 * 音乐播放器专用工具函数模块 - 避免与全局 Utils 冲突
 */
class MusicUtils {
    /**
     * 转义 HTML 防止 XSS
     */
    static escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * 格式化浏览次数（用于音乐界面中可能的数字格式化）
     */
    static formatViews(views) {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1).replace('.0', '')}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1).replace('.0', '')}K`;
        return views.toString();
    }

    /**
     * 格式化时间（秒 -> 分:秒）
     */
    static formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 防抖函数
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * 生成唯一ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
}

// 暴露到全局，供音乐播放器模块使用，同时不污染顶层的 Utils 命名
window.MusicUtils = MusicUtils;