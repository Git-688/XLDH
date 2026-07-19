/* constants.js - 精简版（实际使用的常量） */
const APP_CONSTANTS = {
    // ===== API 相关 =====
    API: {
        BASE_TIMEOUT: 15000,
        RETRY_COUNT: 2,
        RETRY_DELAY: 500,
    },

    // ===== 导航模块 =====
    NAVIGATION: {
        BATCH_SIZE: 8,
        BATCH_DELAY: 200,
        PAGE_SIZE: 30,
        SKELETON_COUNT: 6,
        UPDATE_INTERVAL: 5 * 60 * 1000,
        AUTO_REFRESH_INTERVAL: 5 * 60 * 1000,
        STRUCTURE_CACHE_TTL: 600000,
        SITES_CACHE_TTL: 86400,
        COUNTS_CACHE_TTL: 60000,
    },

    // ===== 会话相关 =====
    SESSION: {
        TTL: 3600,
        REFRESH_TOKEN_TTL: 7200,
        ONLINE_TTL: 20 * 60 * 1000,
        LOGIN_LOCK_DURATION: 600,
        MAX_LOGIN_ATTEMPTS: 5,
        CSRF_PROTECTION_ENABLED: true,
        TOKEN_EXPIRE_HOURS: 1,
        SESSION_REFRESH_BEFORE_MS: 5 * 60 * 1000,
    },

    // ===== 缓存相关 =====
    CACHE: {
        NAVIGATION: 7200,
        STATS: 300,
        UPTIME: 60,
        NOTEBOOK: 3600,
        SITE_INFO: 3600,
        ICON_MEMORY_TTL: 24 * 60 * 60 * 1000,
        VISIT_QUEUE_TTL: 3600,
        VISIT_QUEUE_BATCH_SIZE: 100,
        SECURITY_TASK_TTL: 3600,
    },

    // ===== 速率限制 =====
    RATE_LIMIT: {
        ENABLED: true,
        DEFAULT_WINDOW_MS: 60 * 1000,
        DEFAULT_MAX_REQUESTS: 200,
        ADMIN_WINDOW_MS: 60 * 1000,
        ADMIN_MAX_REQUESTS: 100,
        SUBMIT_WINDOW_MS: 60 * 1000,
        SUBMIT_MAX_REQUESTS: 30,
        HEARTBEAT_WINDOW_MS: 60 * 1000,
        HEARTBEAT_MAX_REQUESTS: 300,
        LOGIN_WINDOW_MS: 60 * 1000,
        LOGIN_MAX_REQUESTS: 5,
        WHITELIST_IPS: [],
    },

    // ===== 天气模块 =====
    WEATHER: {
        AUTO_REFRESH_INTERVAL: 10 * 60 * 1000,
        GPS_TIMEOUT: 10000,
        FORECAST_DAYS: 6,
    },

    // ===== 音乐播放器 =====
    MUSIC: {
        PROGRESS_UPDATE_INTERVAL: 100,
        LYRIC_SCROLL_DURATION: 8000,
        VOLUME_STEP: 0.05,
        PRELOAD_CONCURRENT: 3,
        SEARCH_DEBOUNCE: 500,
        PLAYLIST_CACHE_TTL: 30 * 60 * 1000,
        SEARCH_CACHE_TTL: 10 * 60 * 1000,
        MAX_HISTORY: 20,
    },

    // ===== 安全检测 =====
    SECURITY: {
        VT_TIMEOUT: 10000,
        SAFE_BROWSING_TIMEOUT: 10000,
        SIGHTENGINE_TIMEOUT: 10000,
        COMBINED_CACHE_TTL: 1800,
        VIOLATION_BAN_THRESHOLD: 20,
        VIOLATION_BAN_DURATION: 3600,
        DEAD_LINK_THRESHOLD: 3,
    },

    // ===== 访客统计 =====
    STATS: {
        VISIT_LOG_RETENTION_DAYS: 7,
        STATS_MEMORY_TTL: 30000,
        ONLINE_COUNT_CACHE_TTL: 5000,
        GLOBAL_SUBMIT_COUNT_TTL: 60000,
        VIEWS_QUEUE_BATCH_SIZE: 100,
    },

    // ===== 投稿模块 =====
    SUBMIT: {
        DRAFT_EXPIRY_HOURS: 24,
        POLLING_INTERVAL: 2000,
        MAX_DESCRIPTION_LENGTH: 200,
        TOTAL_COUNT_CACHE_TTL: 60000,
    },

    // ===== 管理后台 =====
    ADMIN: {
        SUBMISSIONS_CACHE_TTL: 30000,
        SITES_LIST_LIMIT: 200,
        BATCH_MAX_SIZE: 100,
        IMPORT_MAX_SIZE: 10 * 1024 * 1024,
    },

    // ===== 通知 =====
    NOTIFICATION: {
        DEFAULT_DURATION: 3000,
        MAX_TOASTS: 5,
    },

    // ===== UI =====
    UI: {
        SIDEBAR_WIDTH: 260,
        SIDEBAR_MOBILE_WIDTH: '70vw',
        SIDEBAR_MAX_MOBILE: 280,
        MUSIC_PLAYER_WIDTH: 420,
        WALLPAPER_HEIGHT_RATIO: 0.26,
        CAROUSEL_AUTOPLAY_INTERVAL: 5000,
    },

    // ===== 邮件 =====
    EMAIL: {
        SMTP_PORT: 465,
        SMTP_SECURE: 'ssl',
    },

    // ===== 图片代理 =====
    IMAGE: {
        PROXY_QUALITY: 80,
        PROXY_CACHE_TTL: 86400,
        ICON_SOURCES: [
            (d) => `https://icon.horse/icon/${d}?size=512&format=webp`,
            (d) => `https://icon.horse/icon/${d}?size=256&format=webp`,
            (d) => `https://icon.horse/icon/${d}?size=128`,
            (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=256`,
            (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`,
            (d) => `https://favicon.yandex.net/favicon/${d}`,
            (d) => `https://${d}/favicon.ico`,
        ],
        ALLOWED_DOMAINS: [
            'favicon.yandex.net',
            'icon.horse',
            'www.google.com',
            'p1.music.126.net',
            'p2.music.126.net',
            'p3.music.126.net',
            'p4.music.126.net',
            'cdn.jsdelivr.net',
            'unpkg.com',
            'api.kuleu.com',
            'bing.biturl.top',
        ],
    },

    // ===== 音乐代理 =====
    MUSIC_PROXY: {
        ALLOWED_DOMAINS: [
            'music.163.com',
            'api.i-meto.com',
            'dl.stream.qqmusic.qq.com',
            'antiserver.kuwo.cn',
            'api.injahow.cn',
            'cdn.music.qq.com',
            'music.126.net',
            'p1.music.126.net',
            'p2.music.126.net',
            'p3.music.126.net',
            'p4.music.126.net',
            'y.gtimg.cn',
            'thirdparty.gtimg.com',
        ],
    },
};

// 导出
if (typeof window !== 'undefined') {
    window.APP_CONSTANTS = APP_CONSTANTS;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONSTANTS;
}