// 统计接口域名（从配置读取）
const WORKER_URL = window.APP_CONFIG?.API_BASE || 'https://api.xldh688.eu.cc';

export default class FooterModule {
    constructor() {
        this.heartbeatInterval = null;
    }

    // 格式化运行时间（毫秒 -> 字符串）
    formatUptime(ms) {
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

    // 更新运行时间显示
    updateUptimeDisplay(startTimeMs) {
        if (!startTimeMs) return;
        const nowMs = Date.now() + 8 * 3600 * 1000;
        const uptimeMs = nowMs - startTimeMs;
        const formatted = this.formatUptime(uptimeMs);
        $('#uptime').text(formatted);
    }

    // 从服务器获取运行时间起始点
    async fetchUptimeStart() {
        try {
            const res = await fetch(`${WORKER_URL}/uptime`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            let startTimeMs = data.startTime;
            this.updateUptimeDisplay(startTimeMs);
            setInterval(() => this.updateUptimeDisplay(startTimeMs), 1000);
        } catch (e) {
            console.error('获取运行时间失败:', e);
            $('#uptime').text('获取失败');
        }
    }

    // 记录访问 / 心跳
    async postToWorker(endpoint) {
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
    async refreshStats() {
        try {
            const res = await fetch(`${WORKER_URL}/stats`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            $('#onlineCount').text(data.online);
            $('#todayCount').text(data.today_uv);
            $('#totalCount').text(data.total_uv);
        } catch (e) {
            console.error('获取统计失败:', e);
        }
    }

    // 页面可见性变化时控制心跳
    handleVisibilityChange() {
        if (document.hidden) {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
        } else {
            if (!this.heartbeatInterval) {
                this.postToWorker('/heartbeat');
                this.heartbeatInterval = setInterval(() => this.postToWorker('/heartbeat'), 900000); // 15分钟
            }
        }
    }

    // 初始化统计模块（由 main.js 调用）
    init() {
        // 发送访问记录
        this.postToWorker('/visit');
        // 发送首次心跳
        this.postToWorker('/heartbeat');
        // 启动心跳定时器（15分钟间隔）
        this.heartbeatInterval = setInterval(() => this.postToWorker('/heartbeat'), 900000);
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

        // 刷新统计数据
        this.refreshStats();
        this.fetchUptimeStart();

        // 1分钟刷新一次统计数据
        setInterval(() => this.refreshStats(), 60000);
    }
}