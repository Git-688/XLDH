// Cloudflare Worker 统计系统 + 运行时间记录
// 绑定 KV 命名空间变量名：STATS_KV

const CONFIG = {
  ONLINE_TTL: 5 * 60 * 1000, // 5分钟超时
  TIMEZONE_OFFSET: 8 * 60 * 60 * 1000, // UTC+8 偏移量（毫秒）
};

// 获取当前 UTC+8 时间的毫秒数
function getCurrentTimeMs() {
  return Date.now() + CONFIG.TIMEZONE_OFFSET;
}

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

// 获取网站运行时间
async function getUptime(kv) {
  let startTimeMs = await kv.get('site:start_time', 'text');
  if (!startTimeMs) {
    // 首次访问，设置当前时间
    startTimeMs = getCurrentTimeMs().toString();
    await kv.put('site:start_time', startTimeMs);
  }
  const nowMs = getCurrentTimeMs();
  const uptimeMs = nowMs - parseInt(startTimeMs, 10);
  return {
    startTime: parseInt(startTimeMs, 10),
    uptime: uptimeMs,
    formatted: formatUptime(uptimeMs)
  };
}

// 访客唯一ID
function getVisitorId(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || '';
  let hash = 0;
  for (let i = 0; i < ip.length + ua.length; i++) {
    hash = (hash << 5) - hash + (i < ip.length ? ip.charCodeAt(i) : ua.charCodeAt(i - ip.length));
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// UTC+8 日期
function getTodayString() {
  const utc8 = new Date(getCurrentTimeMs());
  return utc8.toISOString().slice(0, 10);
}

// 每日重置
async function resetIfNeeded(kv) {
  const today = getTodayString();
  const last = await kv.get('stats:last_reset_date');
  if (last !== today) {
    await kv.put('stats:today_pv', '0');
    await kv.put('stats:today_uv', '0');
    await kv.put('stats:last_reset_date', today);
  }
}

// 记录访问 PV/UV
async function recordVisit(visitorId, kv) {
  await resetIfNeeded(kv);

  let totalPV = parseInt(await kv.get('stats:total_pv') || '0', 10);
  await kv.put('stats:total_pv', String(++totalPV));

  let todayPV = parseInt(await kv.get('stats:today_pv') || '0', 10);
  await kv.put('stats:today_pv', String(++todayPV));

  const uvKey = `uv:${getTodayString()}`;
  let uvSet = JSON.parse(await kv.get(uvKey) || '[]');
  if (!uvSet.includes(visitorId)) {
    uvSet.push(visitorId);
    await kv.put(uvKey, JSON.stringify(uvSet), { expirationTtl: 86400 });

    let todayUV = parseInt(await kv.get('stats:today_uv') || '0', 10);
    await kv.put('stats:today_uv', String(++todayUV));
  }
}

// 更新在线状态
async function updateOnline(visitorId, kv) {
  const key = `online:${visitorId}`;
  await kv.put(key, Date.now().toString(), { expirationTtl: 300 });
}

// 真实在线人数计算
async function getOnlineCount(kv) {
  try {
    const { keys } = await kv.list({ prefix: 'online:' });
    let online = 0;
    const now = Date.now();
    for (const key of keys) {
      const ts = await kv.get(key.name);
      if (ts && now - parseInt(ts) < CONFIG.ONLINE_TTL) {
        online++;
      }
    }
    return online;
  } catch (e) {
    return 0;
  }
}

// 获取统计数据
async function getStats(kv) {
  await resetIfNeeded(kv);
  return {
    total_pv: parseInt(await kv.get('stats:total_pv') || '0', 10),
    today_pv: parseInt(await kv.get('stats:today_pv') || '0', 10),
    today_uv: parseInt(await kv.get('stats:today_uv') || '0', 10),
    online: await getOnlineCount(kv),
  };
}

// CORS 响应
function corsResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': 'https://xldh688.eu.cc',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json',
    },
  });
}

function handleOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://xldh688.eu.cc',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export default {
  async fetch(request, env) {
    const kv = env.STATS_KV;
    const { method } = request;
    const { pathname } = new URL(request.url);

    if (method === 'OPTIONS') return handleOptions();

    // 记录访问
    if (method === 'POST' && pathname === '/visit') {
      const vid = getVisitorId(request);
      await recordVisit(vid, kv);
      return corsResponse({ success: true });
    }

    // 心跳
    if (method === 'POST' && pathname === '/heartbeat') {
      const vid = getVisitorId(request);
      await updateOnline(vid, kv);
      return corsResponse({ success: true });
    }

    // 获取统计
    if (method === 'GET' && pathname === '/stats') {
      const data = await getStats(kv);
      return corsResponse(data);
    }

    // 获取运行时间（新接口）
    if (method === 'GET' && pathname === '/uptime') {
      const data = await getUptime(kv);
      return corsResponse(data);
    }

    return new Response('Not Found', { status: 404 });
  },
};