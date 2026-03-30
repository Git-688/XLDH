// 你的统计接口
const WORKER_URL = 'https://api.xldh688.eu.cc';

async function post(endpoint) {
  try {
    await fetch(`${WORKER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('请求失败', e);
  }
}

async function loadStats() {
  try {
    const r = await fetch(`${WORKER_URL}/stats`);
    const d = await r.json();

    // 原生JS获取元素，不再依赖jQuery
    const onlineEl = document.getElementById('onlineCount');
    const todayEl = document.getElementById('todayCount');
    const totalEl = document.getElementById('totalCount');

    if (onlineEl) onlineEl.innerText = d.online;
    if (todayEl) todayEl.innerText = d.today_uv;
    if (totalEl) totalEl.innerText = d.total_pv;
  } catch (e) {}
}

function init() {
  post('/visit');     // 记录访问
  post('/heartbeat'); // 立即发心跳 → 在线人数马上变成1
  loadStats();        // 立即加载数字

  // 30秒心跳
  setInterval(() => post('/heartbeat'), 30000);
  // 1分钟刷新显示
  setInterval(loadStats, 60000);
}

// 页面加载后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
