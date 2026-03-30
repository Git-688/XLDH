// 你的统计接口
const WORKER_URL = 'https://api.xldh688.eu.cc';

async function post(endpoint) {
  try {
    await fetch(`${WORKER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    // 静默失败，不影响页面
  }
}

async function loadStats() {
  try {
    const response = await fetch(`${WORKER_URL}/stats`);
    const data = await response.json();
    
    // 使用原生 DOM 方法更新页面
    const onlineEl = document.getElementById('onlineCount');
    const todayEl = document.getElementById('todayCount');
    const totalEl = document.getElementById('totalCount');
    
    if (onlineEl) onlineEl.textContent = data.online;
    if (todayEl) todayEl.textContent = data.today_uv;
    if (totalEl) totalEl.textContent = data.total_pv;
  } catch (e) {
    console.error('加载统计失败:', e);
  }
}

function init() {
  post('/visit');          // 记录访问
  loadStats();             // 加载数据
  setInterval(() => post('/heartbeat'), 30000);  // 30秒心跳
  setInterval(loadStats, 120000);                // 2分钟刷新
}

// 页面加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}