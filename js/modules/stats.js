// stats.js - 与 Cloudflare Worker 统计系统对接

// Worker 的地址（替换为你的 Worker 域名）
const WORKER_URL = 'https://api.xldh688.eu.cc'; // 例如 'https://stats-worker.abc.workers.dev'

/**
 * 发送 POST 请求到 Worker
 */
async function postToWorker(endpoint, data = {}) {
  try {
    const response = await fetch(`${WORKER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error(`统计请求失败 (${endpoint}):`, error);
    return null;
  }
}

/**
 * 获取统计数据并更新页面
 */
async function fetchStats() {
  try {
    const response = await fetch(`${WORKER_URL}/stats`);
    const stats = await response.json();
    // 更新页面元素
    const onlineEl = document.getElementById('onlineCount');
    const todayEl = document.getElementById('todayCount');
    const totalEl = document.getElementById('totalCount');
    if (onlineEl) onlineEl.textContent = stats.online;
    if (todayEl) todayEl.textContent = stats.today_uv; // 注意：今日 UV 是我们展示的“今日”
    if (totalEl) totalEl.textContent = stats.total_pv; // 总 PV 作为“统计”
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
}

/**
 * 记录访问（PV/UV）
 */
async function recordVisit() {
  await postToWorker('/visit');
}

/**
 * 发送心跳
 */
async function sendHeartbeat() {
  await postToWorker('/heartbeat');
}

/**
 * 初始化统计：页面加载时记录访问，并开始心跳循环
 */
function initStats() {
  // 记录本次访问
  recordVisit();

  // 立即获取一次统计数据
  fetchStats();

  // 每 30 秒发送一次心跳（维持在线状态）
  setInterval(() => {
    sendHeartbeat();
  }, 30000); // 30 秒

  // 每 2 分钟更新一次统计数据（保持页面显示最新）
  setInterval(() => {
    fetchStats();
  }, 120000);
}

// 页面加载完成后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStats);
} else {
  initStats();
}