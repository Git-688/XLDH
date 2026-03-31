// Cloudflare Worker 综合系统：统计 + 运行时间 + 点击统计 + 动态导航（D1）
// 绑定 KV 变量名：STATS_KV
// 绑定 D1 变量名：DB

const CONFIG = {
    ONLINE_TTL: 5 * 60 * 1000, // 5分钟超时
    TIMEZONE_OFFSET: 8 * 60 * 60 * 1000, // UTC+8
};

// ================== 通用工具 ==================
function getCurrentTimeMs() {
    return Date.now() + CONFIG.TIMEZONE_OFFSET;
}

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

function getTodayString() {
    const utc8 = new Date(getCurrentTimeMs());
    return utc8.toISOString().slice(0, 10);
}

// ================== 运行时间（KV） ==================
async function getUptime(kv) {
    let startTimeMs = await kv.get('site:start_time', 'text');
    if (!startTimeMs) {
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

// ================== PV/UV/在线（KV） ==================
async function resetIfNeeded(kv) {
    const today = getTodayString();
    const last = await kv.get('stats:last_reset_date');
    if (last !== today) {
        await kv.put('stats:today_pv', '0');
        await kv.put('stats:today_uv', '0');
        await kv.put('stats:last_reset_date', today);
    }
}

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

async function updateOnline(visitorId, kv) {
    await kv.put(`online:${visitorId}`, Date.now().toString(), { expirationTtl: 300 });
}

async function getOnlineCount(kv) {
    try {
        const { keys } = await kv.list({ prefix: 'online:' });
        let online = 0;
        const now = Date.now();
        for (const key of keys) {
            const ts = await kv.get(key.name);
            if (ts && now - parseInt(ts) < CONFIG.ONLINE_TTL) online++;
        }
        return online;
    } catch { return 0; }
}

async function getStats(kv) {
    await resetIfNeeded(kv);
    return {
        total_pv: parseInt(await kv.get('stats:total_pv') || '0', 10),
        today_pv: parseInt(await kv.get('stats:today_pv') || '0', 10),
        today_uv: parseInt(await kv.get('stats:today_uv') || '0', 10),
        online: await getOnlineCount(kv),
    };
}

// ================== 点击统计（KV） ==================
function normalizeClickUrl(url) {
    try {
        let u = new URL(url);
        let host = u.hostname.replace(/^www\./, '');
        let path = u.pathname.replace(/\/$/, '');
        return `${host}${path}`;
    } catch {
        return url;
    }
}

async function recordClick(url, title, kv) {
    if (!url) return;
    const normalized = normalizeClickUrl(url);
    const key = `click:${normalized}`;
    let count = parseInt(await kv.get(key) || '0', 10);
    count++;
    await kv.put(key, count.toString());
    const titleKey = `click_title:${normalized}`;
    const existingTitle = await kv.get(titleKey);
    if (!existingTitle && title) {
        await kv.put(titleKey, title);
    }
    return count;
}

// ================== 动态导航数据（D1） ==================
async function getNavigationData(db) {
    // 获取所有一级分类
    const categoriesStmt = db.prepare('SELECT * FROM categories ORDER BY display_order ASC');
    const { results: categories } = await categoriesStmt.all();

    const result = {
        categories: {},
        descriptions: {},
        categoryIcons: {}
    };

    for (const cat of categories) {
        // 获取该一级分类下的所有二级分类
        const subStmt = db.prepare('SELECT * FROM subcategories WHERE category_id = ? ORDER BY display_order ASC');
        const { results: subcategories } = await subStmt.bind(cat.id).all();

        const subCatObj = {};
        for (const sub of subcategories) {
            // 获取该二级分类下的所有网站
            const sitesStmt = db.prepare('SELECT * FROM sites WHERE subcategory_id = ? ORDER BY display_order ASC');
            const { results: sites } = await sitesStmt.bind(sub.id).all();

            subCatObj[sub.name] = sites.map(site => ({
                title: site.title,
                description: site.description || '',
                url: site.url,
                icon: site.icon || 'fas fa-link'
            }));
        }
        result.categories[cat.name] = subCatObj;
        result.descriptions[cat.name] = cat.description || '';
        result.categoryIcons[cat.name] = cat.icon || 'fas fa-folder';
    }
    return result;
}

// ================== CORS 响应 ==================
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

// ================== 主路由 ==================
export default {
    async fetch(request, env) {
        const kv = env.STATS_KV;
        const db = env.DB;
        const { method } = request;
        const { pathname } = new URL(request.url);

        if (method === 'OPTIONS') return handleOptions();

        // 统计相关（KV）
        if (method === 'POST' && pathname === '/visit') {
            const vid = getVisitorId(request);
            await recordVisit(vid, kv);
            return corsResponse({ success: true });
        }
        if (method === 'POST' && pathname === '/heartbeat') {
            const vid = getVisitorId(request);
            await updateOnline(vid, kv);
            return corsResponse({ success: true });
        }
        if (method === 'GET' && pathname === '/stats') {
            const data = await getStats(kv);
            return corsResponse(data);
        }
        if (method === 'GET' && pathname === '/uptime') {
            const data = await getUptime(kv);
            return corsResponse(data);
        }
        if (method === 'POST' && pathname === '/click') {
            try {
                const body = await request.json();
                const { url, title } = body;
                if (!url) return corsResponse({ error: 'Missing url' }, 400);
                const count = await recordClick(url, title || '', kv);
                return corsResponse({ success: true, count });
            } catch (e) {
                return corsResponse({ error: 'Internal error' }, 500);
            }
        }

        // 导航数据（D1） 添加 Cache-Control 头，缓存 5 分钟
        if (method === 'GET' && pathname === '/navigation') {
            const data = await getNavigationData(db);
            const response = corsResponse(data);
            // 设置缓存：公共缓存，最大存活时间 300 秒（5 分钟）
            // 可根据需要调整 max-age 值，例如 3600 为 1 小时
            response.headers.set('Cache-Control', 'public, max-age=300');
            return response;
        }

        return new Response('Not Found', { status: 404 });
    },
};