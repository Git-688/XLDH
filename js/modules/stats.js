/**
 * 统计模块：对接 Cloudflare Worker 实现 PV/UV/在线人数统计
 * 修复原有逻辑问题，适配静态托管平台（GitHub Pages/Vercel等）
 */
class StatsModule {
  /**
   * 构造函数
   * @param {Object} options 配置项
   * @param {string} options.workerBase Worker 完整接口地址，必填！示例：https://your-stats.xxx.workers.dev/api
   */
  constructor(options = {}) {
    // 核心配置：必须替换为你的 Worker 完整地址！！！
    this.workerBase = options.workerBase || 'https://your-worker-domain.workers.dev/api';
    this.heartbeatInterval = null;
    // 用户唯一标识（UV统计用）
    this.userUUID = this.getOrCreateUUID();
    // 防止重复初始化
    this.isInited = false;
    // 页面状态标记
    this.isPageActive = true;

    this.init();
  }

  // 生成/获取用户唯一UUID，存在localStorage永久保存
  getOrCreateUUID() {
    let uuid = localStorage.getItem('stats_user_uuid');
    if (!uuid) {
      // 简易UUID生成，兼容所有浏览器
      uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('stats_user_uuid', uuid);
    }
    return uuid;
  }

  async init() {
    if (this.isInited) return;
    this.isInited = true;

    // 页面加载时：仅1次上报PV+UV
    await this.recordVisit();
    // 启动心跳（仅更新在线状态，不统计PV）
    this.startHeartbeat();
    // 监听页面生命周期，优化在线人数准确性
    this.bindPageLifecycle();
  }

  /**
   * 页面加载时调用：统计PV+UV，返回全量统计数据
   */
  async recordVisit() {
    try {
      const response = await fetch(`${this.workerBase}/visit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        // 携带用户唯一标识，用于UV去重和在线状态管理
        body: JSON.stringify({
          uuid: this.userUUID,
          page: window.location.pathname,
          referrer: document.referrer,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) throw new Error(`API错误: ${response.status}`);
      const data = await response.json();
      // 更新页面统计显示
      this.updateDisplay(data);
      return data;
    } catch (error) {
      console.error('访问统计上报失败:', error);
      // 降级方案：本地存储统计
      this.fallbackLocalStats();
    }
  }

  /**
   * 心跳上报：仅更新在线状态，不统计PV
   */
  async heartbeat() {
    // 页面非活跃时不上报，节省资源
    if (!this.isPageActive) return;

    try {
      const response = await fetch(`${this.workerBase}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: this.userUUID
        })
      });

      if (!response.ok) throw new Error(`心跳错误: ${response.status}`);
      const data = await response.json();
      // 仅更新在线人数，其他数据不变
      const onlineEl = document.getElementById('onlineCount');
      if (onlineEl) onlineEl.textContent = data.online || 0;
      return data;
    } catch (error) {
      console.warn('心跳上报失败:', error);
    }
  }

  /**
   * 启动心跳保活：每30秒上报一次，更新在线状态
   */
  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    // 30秒一次心跳，后端设置2分钟超时（4次心跳未上报则下线）
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, 30000);
  }

  /**
   * 绑定页面生命周期事件
   */
  bindPageLifecycle() {
    // 页面可见性变化：隐藏时停止心跳，显示时恢复
    document.addEventListener('visibilitychange', () => {
      this.isPageActive = document.visibilityState === 'visible';
      if (this.isPageActive) {
        this.heartbeat(); // 页面恢复时立即上报一次
      }
    });

    // 页面即将卸载时，通知后端下线
    window.addEventListener('beforeunload', async () => {
      this.destroy();
      // 尽力而为上报下线事件，不阻塞页面关闭
      try {
        await fetch(`${this.workerBase}/offline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid: this.userUUID }),
          keepalive: true // 页面关闭后仍能完成请求
        });
      } catch (e) {
        // 忽略错误，不影响页面关闭
      }
    });
  }

  /**
   * 更新页面上的统计数字
   * @param {Object} stats - { pv: 总访问量, uv: 今日访客, online: 在线人数 }
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
   * 降级方案：API不可用时，使用localStorage本地统计
   */
  fallbackLocalStats() {
    // 总访问量统计
    let totalPv = localStorage.getItem('stats_total_pv');
    totalPv = totalPv ? parseInt(totalPv) + 1 : 1;
    localStorage.setItem('stats_total_pv', totalPv);

    // 今日UV（本地仅能统计当前用户，无法统计全局）
    const today = new Date().toLocaleDateString();
    const lastVisitDate = localStorage.getItem('stats_last_visit_date');
    let todayUv = localStorage.getItem('stats_today_uv');
    if (lastVisitDate !== today) {
      todayUv = 1;
      localStorage.setItem('stats_last_visit_date', today);
      localStorage.setItem('stats_today_uv', todayUv);
    }

    // 更新显示
    const totalEl = document.getElementById('totalCount');
    if (totalEl) totalEl.textContent = totalPv;
    const todayEl = document.getElementById('todayCount');
    if (todayEl) todayEl.textContent = todayUv;
    const onlineEl = document.getElementById('onlineCount');
    if (onlineEl) onlineEl.textContent = '--';
  }

  /**
   * 销毁实例，清理定时器
   */
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isInited = false;
  }
}

// 自动初始化，防止重复实例化
if (!window.statsModule) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // 这里必须替换为你的Worker完整地址！！！
      window.statsModule = new StatsModule({
        workerBase: 'https://your-worker-domain.workers.dev/api'
      });
    });
  } else {
    window.statsModule = new StatsModule({
      workerBase: 'https://your-worker-domain.workers.dev/api'
    });
  }
}
