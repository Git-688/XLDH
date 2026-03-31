// 统计接口域名（你的 Worker 路由）
const WORKER_URL = 'https://api.xldh688.eu.cc';

// ========== 一次性清除旧的 localStorage 统计键 ==========
(function clearOldLocalStorageStats() {
    // 需要清除的旧键列表（Storage 类使用 starlink_ 前缀）
    const oldKeys = [
        'starlink_site_views',      // 旧网站浏览量统计
        'starlink_visit_count',     // 旧访问次数
        'starlink_first_visit_time',
        'starlink_last_visit_time',
        'starlink_accumulated_uptime',  // 旧运行时间累计
        'starlink_last_uptime_update',
        // 如果有其他旧的统计键，可以继续添加
    ];
    let anyRemoved = false;
    for (const key of oldKeys) {
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            anyRemoved = true;
        }
    }
    // 也可以直接清除所有以 starlink_ 开头且与统计相关的键（保留用户配置等）
    // 但为了安全，只删除明确列出的键
    if (anyRemoved) {
        console.log('[统计] 已清除旧的 localStorage 统计数据，现在完全依赖 Cloudflare Worker');
    }
})();
// ====================================================

// 全局存储运行时间起始时间戳（毫秒，UTC+8）
let startTimeMs = null;

// 格式化运行时间（毫秒 -> 字符串）
function formatUptime(ms) {
    if (ms < 0) return "刚刚上线";
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    let parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}时`);
    if (minutes > 0) parts.push(`${minutes}分`);
    if (secs > 0) parts.push(`${secs}秒`);
    return parts.join(" ") || "0秒";
}

// 更新运行时间显示（每秒调用）
function updateUptimeDisplay() {
    if (!startTimeMs) return;
    // 计算当前 UTC+8 时间（与 Worker 保持一致）
    const nowMs = Date.now() + 8 * 3600 * 1000;
    const uptimeMs = nowMs - startTimeMs;
    const formatted = formatUptime(uptimeMs);
    $('#uptime').text(formatted);
}

// 从服务器获取运行时间起始点
async function fetchUptimeStart() {
    try {
        const res = await fetch(`${WORKER_URL}/uptime`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        startTimeMs = data.startTime;
        updateUptimeDisplay();
        // 每秒更新一次显示
        setInterval(updateUptimeDisplay, 1000);
    } catch (e) {
        console.error('获取运行时间失败:', e);
        $('#uptime').text('获取失败');
    }
}

// 记录访问 / 心跳
async function postToWorker(endpoint) {
    try {
        await fetch(`${WORKER_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('请求失败:', e);
    }
}

// 刷新页面数字（在线、今日、统计）
async function refreshStats() {
    try {
        const res = await fetch(`${WORKER_URL}/stats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        $('#onlineCount').text(data.online);
        $('#todayCount').text(data.today_uv);
        $('#totalCount').text(data.total_pv);
    } catch (e) {
        console.error('获取统计失败:', e);
    }
}

// 初始化统计模块
$(document).ready(function() {
    postToWorker('/visit');
    postToWorker('/heartbeat');
    refreshStats();
    fetchUptimeStart();   // 获取运行时间起始点

    // 30秒心跳
    setInterval(() => {
        postToWorker('/heartbeat');
    }, 30000);

    // 1分钟刷新一次统计数据
    setInterval(refreshStats, 60000);
});