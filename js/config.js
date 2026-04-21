/**
 * 全局配置 - 环境变量管理
 * 所有 API 地址、常量统一管理
 */
window.APP_CONFIG = {
    // API 基础地址（Cloudflare Worker）
    API_BASE: 'https://api.xldh688.eu.cc',
    
    // 网站投稿表单地址
    SUBMIT_FORM_URL: 'https://f.wps.cn/g/TI3Gxbe1/',
    
    // QQ群链接
    QQ_GROUP_URL: 'https://qm.qq.com/q/HxcjhEclyM',
    
    // 管理员 Token 存储键
    ADMIN_TOKEN_KEY: 'admin_token',
    ADMIN_EXPIRES_KEY: 'admin_expires',
    
    // 其他常量
    HEARTBEAT_INTERVAL: 15 * 60 * 1000, // 15分钟
    STATS_REFRESH_INTERVAL: 60 * 1000,   // 1分钟
    
    // 版本信息
    VERSION: '1.6.8',
    UPDATE_DATE: '2025-12-08'
};

// 冻结对象防止意外修改
Object.freeze(window.APP_CONFIG);