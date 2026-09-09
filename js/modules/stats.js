/* stats.js - 访客实时在线统计增强（页面离开信号 + 停留时长） 
   修改：改用 querySelectorAll 支持多实例更新（电脑端和移动端同时更新） */

const WORKER_URL = (typeof Utils !== 'undefined' && Utils.getApiBase) ? Utils.getApiBase() : (window.APP_CONFIG?.API_BASE || 'https://api.xjdh688.ccwu.cc');

const SESSION_KEY = 'visitor_session_id';
let pageEnterTime = Date.now();

function getVisitorSession() {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
        sid = 'vs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
}

function formatUptime(ms) {
    if (ms < 0) return "刚刚上线";
    const days = Math.floor(ms / (24 * 3600 * 1000));
    if (days > 0) return `${days}天`;
    return "不足1天";
}

function updateUptimeDisplay(startTimeMs) {
    if (!startTimeMs) return;
    const uptimeMs = Date.now() - startTimeMs;
    const formatted = formatUptime(uptimeMs);
    // 使用 querySelectorAll 更新所有 uptime 元素
    const uptimeEls = document.querySelectorAll('#uptime');
    uptimeEls.forEach(el => {
        if (el) el.textContent = formatted;
    });
}

async function fetchUptimeStart() {
    try {
        const res = await fetch(`${WORKER_URL}/uptime`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        updateUptimeDisplay(data.startTime);
        setInterval(() => updateUptimeDisplay(data.startTime), 1000);
    } catch (e) {
        const uptimeEls = document.querySelectorAll('#uptime');
        uptimeEls.forEach(el => {
            if (el) el.textContent = '获取失败';
        });
    }
}

async function postToWorker(endpoint, extraData = {}) {
    const visitorId = getVisitorSession();
    try {
        await fetch(`${WORKER_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Device-Id': visitorId
            },
            body: JSON.stringify({ visitorId, ...extraData })
        });
    } catch (e) {}
}

// ===== 增强：发送离线信号（含停留时长） =====
function sendOfflineSignal() {
    const visitorId = getVisitorSession();
    const duration = Math.floor((Date.now() - pageEnterTime) / 1000); // 秒
    const data = { visitorId, duration };
    if (navigator.sendBeacon) {
        navigator.sendBeacon(`${WORKER_URL}/offline`, JSON.stringify(data));
    } else {
        fetch(`${WORKER_URL}/offline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true
        }).catch(() => {});
    }
}

async function refreshStats() {
    try {
        const res = await fetch(`${WORKER_URL}/stats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // 使用 querySelectorAll 更新所有统计卡片
        const onlineEls = document.querySelectorAll('#onlineCount');
        onlineEls.forEach(el => { if (el) el.textContent = data.online; });
        
        const todayEls = document.querySelectorAll('#todayCount');
        todayEls.forEach(el => { if (el) el.textContent = data.today_uv; });
        
        const totalEls = document.querySelectorAll('#totalCount');
        totalEls.forEach(el => { if (el) el.textContent = data.total_pv; });
        
        const siteCountEls = document.querySelectorAll('#siteCount');
        if (siteCountEls.length && data.total_sites !== undefined) {
            siteCountEls.forEach(el => { if (el) el.textContent = data.total_sites; });
        }
    } catch (e) {}
}

let heartbeatInterval = null;

function handleVisibilityChange() {
    if (document.hidden) {
        // 页面隐藏（切换标签或最小化）时，发送离线信号
        sendOfflineSignal();
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    } else {
        // 页面重新可见时，重置进入时间并重新开始心跳
        pageEnterTime = Date.now();
        if (!heartbeatInterval) {
            postToWorker('/heartbeat');
            heartbeatInterval = setInterval(() => postToWorker('/heartbeat'), 30000);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    pageEnterTime = Date.now();
    postToWorker('/visit');
    postToWorker('/heartbeat');
    heartbeatInterval = setInterval(() => postToWorker('/heartbeat'), 30000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ===== 增加 pagehide 事件（页面关闭时发送离线信号） =====
    window.addEventListener('pagehide', function() {
        sendOfflineSignal();
        if (heartbeatInterval) clearInterval(heartbeatInterval);
    });

    // 兼容 beforeunload（备用）
    window.addEventListener('beforeunload', function() {
        sendOfflineSignal();
        if (heartbeatInterval) clearInterval(heartbeatInterval);
    });

    refreshStats();
    fetchUptimeStart();
    setInterval(refreshStats, 60000);
});