/* stats.js - 精简版（访问统计 + 在线人数 + 运行时间） */
(function() {
    'use strict';

    const WORKER_URL = (window.APP_CONFIG?.API_BASE) || 'https://api.xjdh688.ccwu.cc';
    let heartbeatInterval = null;

    // ---------- 运行时间 ----------
    function formatUptime(ms) {
        if (ms < 0) return '刚刚上线';
        const days = Math.floor(ms / (24 * 3600 * 1000));
        return days > 0 ? `${days}天` : '不足1天';
    }

    function updateUptimeDisplay(startTimeMs) {
        if (!startTimeMs) return;
        const uptimeEl = document.getElementById('uptime');
        if (uptimeEl) {
            uptimeEl.textContent = formatUptime(Date.now() - startTimeMs);
        }
    }

    async function fetchUptimeStart() {
        try {
            const res = await fetch(`${WORKER_URL}/uptime`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            updateUptimeDisplay(data.startTime);
            setInterval(() => updateUptimeDisplay(data.startTime), 1000);
        } catch (e) {
            console.error('获取运行时间失败:', e);
            const uptimeEl = document.getElementById('uptime');
            if (uptimeEl) uptimeEl.textContent = '获取失败';
        }
    }

    // ---------- 统计刷新 ----------
    async function refreshStats() {
        try {
            const res = await fetch(`${WORKER_URL}/stats`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const onlineEl = document.getElementById('onlineCount');
            const todayEl = document.getElementById('todayCount');
            const totalEl = document.getElementById('totalCount');
            if (onlineEl) onlineEl.textContent = data.online ?? 0;
            if (todayEl) todayEl.textContent = data.today_uv ?? 0;
            if (totalEl) totalEl.textContent = data.total_pv ?? 0;
        } catch (e) {
            console.error('获取统计失败:', e);
        }
    }

    // ---------- 访问记录 ----------
    function getDeviceId() {
        return Utils.getDeviceId ? Utils.getDeviceId() : (() => {
            let id = localStorage.getItem('device_id');
            if (!id) { id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15); localStorage.setItem('device_id', id); }
            return id;
        })();
    }

    async function postToWorker(endpoint, extraData = {}) {
        try {
            await fetch(`${WORKER_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId() },
                body: JSON.stringify(extraData)
            });
        } catch (e) { /* 静默处理 */ }
    }

    // ---------- 可见性管理 ----------
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

    // ---------- 初始化 ----------
    document.addEventListener('DOMContentLoaded', function() {
        // 访问记录
        postToWorker('/visit');
        postToWorker('/heartbeat');
        heartbeatInterval = setInterval(() => postToWorker('/heartbeat'), 30000);
        
        // 可见性变化
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 页面关闭时发送离线信号
        window.addEventListener('beforeunload', function() {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            // 使用 sendBeacon 发送离线信号
            if (navigator.sendBeacon) {
                navigator.sendBeacon(`${WORKER_URL}/offline`, JSON.stringify({ deviceId: getDeviceId() }));
            }
        });

        // 初始加载统计
        refreshStats();
        fetchUptimeStart();
        setInterval(refreshStats, 60000);
    });
})();