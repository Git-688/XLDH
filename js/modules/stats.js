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

// 运行时间格式化：仅显示天数
function formatUptime(ms) {
    if (ms < 0) return "刚刚上线";
    const days = Math.floor(ms / (24 * 3600 * 1000));
    if (days > 0) {
        return `${days}天`;
    } else {
        return "不足1天";
    }
}

function updateUptimeDisplay(startTimeMs) {
    if (!startTimeMs) return;
    const nowMs = Date.now();
    const uptimeMs = nowMs - startTimeMs;
    const formatted = formatUptime(uptimeMs);
    const uptimeEl = document.getElementById('uptime');
    if (uptimeEl) uptimeEl.textContent = formatted;
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
        const uptimeEl = document.getElementById('uptime');
        if (uptimeEl) uptimeEl.textContent = '获取失败';
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

// 发送离线信号（页面关闭时）
function sendOfflineSignal() {
    const deviceId = getDeviceId();
    if (navigator.sendBeacon) {
        navigator.sendBeacon(`${WORKER_URL}/offline`, JSON.stringify({ deviceId }));
    } else {
        fetch(`${WORKER_URL}/offline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId }),
            keepalive: true
        }).catch(() => {});
    }
}

async function refreshStats() {
    try {
        const res = await fetch(`${WORKER_URL}/stats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const onlineEl = document.getElementById('onlineCount');
        const todayEl = document.getElementById('todayCount');
        const totalEl = document.getElementById('totalCount');
        if (onlineEl) onlineEl.textContent = data.online;
        if (todayEl) todayEl.textContent = data.today_uv;
        if (totalEl) totalEl.textContent = data.total_pv;
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
            heartbeatInterval = setInterval(() => postToWorker('/heartbeat'), 30000);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    postToWorker('/visit');
    postToWorker('/heartbeat');
    heartbeatInterval = setInterval(() => postToWorker('/heartbeat'), 30000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    window.addEventListener('beforeunload', function() {
        sendOfflineSignal();
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
    });
    
    refreshStats();
    fetchUptimeStart();
    setInterval(refreshStats, 60000);
});