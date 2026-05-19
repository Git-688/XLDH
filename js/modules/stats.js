// 统计接口域名（从配置读取）
const WORKER_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://api.xjdh688.ccwu.cc';

// 获取或生成本地设备唯一ID（持久化）
function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

let heartbeatInterval = null;

function formatUptime(ms) {
    if (ms < 0) return "刚刚上线";
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    let parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}时`);
    if (minutes > 0) parts.push(`${minutes}分`);
    if (parts.length === 0) parts.push("0分");
    return parts.join(" ");
}

function updateUptimeDisplay(startTimeMs) {
    if (!startTimeMs) return;
    const nowMs = Date.now() + 8 * 3600 * 1000;
    const uptimeMs = nowMs - startTimeMs;
    const formatted = formatUptime(uptimeMs);
    $('#uptime').text(formatted);
}

async function fetchUptimeStart() {
    try {
        const res = await fetch(`${WORKER_URL}/uptime`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        let startTimeMs = data.startTime;
        updateUptimeDisplay(startTimeMs);
        setInterval(() => updateUptimeDisplay(startTimeMs), 1000);
    } catch (e) {
        console.error('获取运行时间失败:', e);
        $('#uptime').text('获取失败');
    }
}

async function postToWorker(endpoint, extraData = {}) {
    try {
        await fetch(`${WORKER_URL}${endpoint}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Device-Id': getDeviceId()
            },
            body: JSON.stringify(extraData)
        });
    } catch (e) {
        console.error('请求失败:', e);
    }
}

async function refreshStats() {
    try {
        const res = await fetch(`${WORKER_URL}/stats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        $('#onlineCount').text(data.online);
        $('#todayCount').text(data.today_uv);
        // 修改：显示历史总浏览量 (total_pv)
        $('#totalCount').text(data.total_pv);
    } catch (e) {
        console.error('获取统计失败:', e);
    }
}

function handleVisibilityChange() {
    if (document.hidden) {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    } else {
        if (!heartbeatInterval) {
            postToWorker('/heartbeat');
            heartbeatInterval = setInterval(() => postToWorker('/heartbeat'), 900000);
        }
    }
}

$(document).ready(function() {
    postToWorker('/visit');
    postToWorker('/heartbeat');
    heartbeatInterval = setInterval(() => postToWorker('/heartbeat'), 900000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    refreshStats();
    fetchUptimeStart();
    setInterval(refreshStats, 60000);
});