// 统计接口域名
const WORKER_URL = 'https://api.xldh688.eu.cc';

// 全局存储运行时间起始时间戳（毫秒，UTC+8）
let startTimeMs = null;

// 格式化运行时间（毫秒 -> 字符串）
function formatUptime(ms) {
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

// 更新运行时间显示（每秒调用）
function updateUptimeDisplay() {
  if (!startTimeMs) return;
  // 计算当前 UTC+8 时间（与 Worker 保持一致）
  const nowMs = Date.now() + 8 * 3600 * 1000;
  const uptimeMs = nowMs - startTimeMs;
  const formatted = formatUptime(uptimeMs);
  $('#uptime').text(formatted);
}

// 从服务器获取运行时间起始点
async function fetchUptimeStart() {
  try {
    const res = await fetch(`${WORKER_URL}/uptime`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    startTimeMs = data.startTime;
    updateUptimeDisplay();
    // 每秒更新一次显示
    setInterval(updateUptimeDisplay, 1000);
  } catch (e) {
    console.error('获取运行时间失败:', e);
    $('#uptime').text('获取失败');
  }
}

// 记录访问 / 心跳
async function postToWorker(endpoint) {
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
async function refreshStats() {
  try {
    const res = await fetch(`${WORKER_URL}/stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    $('#onlineCount').text(data.online);
    $('#todayCount').text(data.today_uv);
    $('#totalCount').text(data.total_pv);
  } catch (e) {
    console.error('获取统计失败:', e);
  }
}

// 初始化统计模块
$(document).ready(function() {
  postToWorker('/visit');
  postToWorker('/heartbeat');
  refreshStats();
  fetchUptimeStart();   // 获取运行时间起始点

  // 30秒心跳
  setInterval(() => {
    postToWorker('/heartbeat');
  }, 30000);

  // 1分钟刷新一次统计数据
  setInterval(refreshStats, 60000);
});