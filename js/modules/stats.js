/**
 * 统计模块：使用 Cloudflare Worker 记录访问量、在线人数
 * 替换原有的 localStorage 统计
 */
class StatsModule {
  constructor() {
    this.apiBase = '/api';           // 与 Worker 路由匹配
    this.heartbeatInterval = null;
    this.init();
  }

  async init() {
    // 页面加载时立即记录访问
    await this.recordVisit();
    // 启动心跳（每30秒更新在线状态）
    this.startHeartbeat();
  }

  /**
   * 记录访问（每次页面加载 + 心跳）
   * 调用 /api/visit 接口，返回最新统计数据
   */
  async recordVisit() {
    try {
      const response = await fetch(`${this.apiBase}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('API 请求失败');
      const data = await response.json();
      this.updateDisplay(data);
    } catch (error) {
      console.error('统计上报失败:', error);
      // 降级：使用本地存储统计（保持基本功能）
      this.fallbackLocalStats();
    }
  }

  /**
   * 心跳保活：每30秒调用一次 recordVisit，更新在线状态
   */
  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      // 静默记录，不阻塞页面
      this.recordVisit().catch(err => console.warn('心跳失败:', err));
    }, 30000);
  }

  /**
   * 更新页面上的统计数字
   * @param {Object} stats - { pv, uv, online }
   */
  updateDisplay(stats) {
    // 在线人数
    const onlineEl = document.getElementById('onlineCount');
    if (onlineEl) onlineEl.textContent = stats.online || 0;

    // 今日访客（UV）
    const todayEl = document.getElementById('todayCount');
    if (todayEl) todayEl.textContent = stats.uv || 0;

    // 总访问量（PV）
    const totalEl = document.getElementById('totalCount');
    if (totalEl) totalEl.textContent = stats.pv || 0;
  }

  /**
   * 降级方案：使用 localStorage 模拟统计（保持原有逻辑）
   */
  fallbackLocalStats() {
    let visitCount = localStorage.getItem('starlink_visitCount');
    visitCount = visitCount ? parseInt(visitCount) + 1 : 1;
    localStorage.setItem('starlink_visitCount', visitCount);
    const totalEl = document.getElementById('totalCount');
    if (totalEl) totalEl.textContent = visitCount;
    // 在线和今日访客降级时显示默认值（可选）
    const onlineEl = document.getElementById('onlineCount');
    if (onlineEl) onlineEl.textContent = '--';
    const todayEl = document.getElementById('todayCount');
    if (todayEl) todayEl.textContent = '--';
  }

  /**
   * 停止心跳（页面关闭时可选）
   */
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