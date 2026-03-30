// 你的统计接口
const WORKER_URL = 'https://api.xldh688.eu.cc';

async function post(endpoint) {
  try {
    await fetch(`${WORKER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {}
}

async function loadStats() {
  try {
    const r = await fetch(`${WORKER_URL}/stats`);
    const d = await r.json();
    $('#onlineCount').text(d.online);
    $('#todayCount').text(d.today_uv);
    $('#totalCount').text(d.total_pv);
  } catch (e) {}
}

function init() {
  post('/visit');    // 记录访问
  loadStats();       // 加载数据
  setInterval(() => post('/heartbeat'), 30000); // 30秒心跳
  setInterval(loadStats, 120000); // 2分钟刷新
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
