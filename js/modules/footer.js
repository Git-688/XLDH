/**
 * 统计模块：使用 Cloudflare Worker 记录访问量、在线人数
 * 不依赖 localStorage，Worker 不可用时显示占位符
 */
class StatsModule {
  constructor() {
    this.apiBase = '/api';
    this.heartbeatInterval = null;
    this.init();
  }

  async init() {
    await this.recordVisit();
    this.startHeartbeat();
  }

  async recordVisit() {
    try {
      const response = await fetch(`${this.apiBase}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.updateDisplay(data);
    } catch (error) {
      console.error('统计上报失败:', error);
      this.showErrorState();
    }
  }

  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.recordVisit().catch(err => console.warn('心跳失败:', err));
    }, 30000);
  }

  updateDisplay(stats) {
    const onlineEl = document.getElementById('onlineCount');
    if (onlineEl) onlineEl.textContent = stats.online !== undefined ? stats.online : '0';

    const todayEl = document.getElementById('todayCount');
    if (todayEl) todayEl.textContent = stats.uv !== undefined ? stats.uv : '0';

    const totalEl = document.getElementById('totalCount');
    if (totalEl) totalEl.textContent = stats.pv !== undefined ? stats.pv : '0';
  }

  showErrorState() {
    const onlineEl = document.getElementById('onlineCount');
    if (onlineEl) onlineEl.textContent = '--';
    const todayEl = document.getElementById('todayCount');
    if (todayEl) todayEl.textContent = '--';
    const totalEl = document.getElementById('totalCount');
    if (totalEl) totalEl.textContent = '--';
  }

  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.statsModule = new StatsModule();
  });
} else {
  window.statsModule = new StatsModule();
}