class StatsModule {
  constructor() {
    // 适配你的域名，相对路径自动匹配xldh688.eu.cc/api/*，无需修改
    this.apiBase = '/api';
    this.heartbeatInterval = null;
    this.isFirstVisit = true;
    this.init();
  }

  async init() {
    // 页面加载完成先记录首次访问（PV+UV+在线状态）
    await this.recordVisit();
    // 启动30秒一次的心跳（仅更新在线状态，不修改PV/UV）
    this.startHeartbeat();
    // 页面关闭时清理定时器，避免内存泄漏
    window.addEventListener('beforeunload', () => this.destroy());
  }

  // 仅页面首次加载调用：记录PV+UV+在线状态
  async recordVisit() {
    try {
      const response = await fetch(`${this.apiBase}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('统计返回数据:', data); // 调试用，上线可删除
      this.updateDisplay(data);
      this.isFirstVisit = false;
    } catch (error) {
      console.error('统计上报失败:', error);
      this.showErrorState();
    }
  }

  // 心跳专用：仅更新在线状态，不修改PV/UV
  async updateOnlineStatus() {
    try {
      const response = await fetch(`${this.apiBase}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.updateDisplay(data);
    } catch (error) {
      console.warn('心跳更新失败:', error);
    }
  }

  // 启动心跳定时器
  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.updateOnlineStatus();
    }, 30000); // 30秒一次，和在线TTL60秒匹配
  }

  // 更新页面统计显示
  updateDisplay(stats) {
    const onlineEl = document.getElementById('onlineCount');
    if (onlineEl) onlineEl.textContent = stats.online ?? '0';

    const todayEl = document.getElementById('todayCount');
    if (todayEl) todayEl.textContent = stats.uv ?? '0';

    const totalEl = document.getElementById('totalCount');
    if (totalEl) totalEl.textContent = stats.pv ?? '0';
  }

  // 异常状态显示
  showErrorState() {
    ['onlineCount', 'todayCount', 'totalCount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '--';
    });
  }

  // 销毁实例，清理定时器
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// 自动初始化，兼容页面不同加载状态
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.statsModule = new StatsModule();
  });
} else {
  window.statsModule = new StatsModule();
}
