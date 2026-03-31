// stats.js - 适配 jQuery 版本
const WORKER_URL = 'https://api.xldh688.eu.cc';

// 发送 POST 请求到 Worker
async function postToWorker(endpoint) {
  try {
    await fetch(`${WORKER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error(`统计请求失败 (${endpoint}):`, e);
  }
}

// 刷新统计数据到页面（jQuery 写法）
async function refreshStats() {
  try {
    const res = await fetch(`${WORKER_URL}/stats`);
    const data = await res.json();
    
    // jQuery 更新页面元素
    $('#onlineCount').text(data.online);
    $('#todayCount').text(data.today_uv);
    $('#totalCount').text(data.total_pv);
  } catch (e) {
    console.error('获取统计数据失败:', e);
  }
}

// 初始化统计（jQuery DOM 加载完成后执行）
$(document).ready(function() {
  // 记录本次访问
  postToWorker('/visit');
  // 立即发送心跳（让在线人数立刻+1）
  postToWorker('/heartbeat');
  // 立即刷新统计
  refreshStats();

  // 每30秒发送一次心跳（维持在线状态）
  setInterval(() => postToWorker('/heartbeat'), 30000);
  // 每2分钟刷新一次统计数据
  setInterval(refreshStats, 120000);
});
