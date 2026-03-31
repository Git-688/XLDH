// Cloudflare Worker 综合系统（统计 + 点击统计 + 动态导航 + 管理 API）
// 绑定 KV 变量名：STATS_KV
// 绑定 D1 变量名：DB

const CONFIG = {
    ONLINE_TTL: 5 * 60 * 1000,
    TIMEZONE_OFFSET: 8 * 60 * 60 * 1000,
};

// ========== 管理 Token（请修改为强密码）==========
const ADMIN_TOKEN = '你的强密码Token'; // 前端登录用
const ALLOW_ORIGIN = 'https://xldh688.eu.cc'; // 你的导航前台域名

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
    return { startTime: parseInt(startTimeMs, 10), uptime: uptimeMs, formatted: formatUptime(uptimeMs) };
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
    } catch { return url; }
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
    if (!existingTitle && title) await kv.put(titleKey, title);
    return count;
}

// ================== 动态导航数据（D1） ==================
async function getNavigationData(db) {
    const categoriesStmt = db.prepare('SELECT * FROM categories ORDER BY display_order ASC');
    const { results: categories } = await categoriesStmt.all();
    const result = { categories: {}, descriptions: {}, categoryIcons: {} };
    for (const cat of categories) {
        const subStmt = db.prepare('SELECT * FROM subcategories WHERE category_id = ? ORDER BY display_order ASC');
        const { results: subcategories } = await subStmt.bind(cat.id).all();
        const subCatObj = {};
        for (const sub of subcategories) {
            const sitesStmt = db.prepare('SELECT * FROM sites WHERE subcategory_id = ? ORDER BY display_order ASC');
            const { results: sites } = await sitesStmt.bind(sub.id).all();
            subCatObj[sub.name] = sites.map(site => ({
                title: site.title, description: site.description || '', url: site.url, icon: site.icon || 'fas fa-link'
            }));
        }
        result.categories[cat.name] = subCatObj;
        result.descriptions[cat.name] = cat.description || '';
        result.categoryIcons[cat.name] = cat.icon || 'fas fa-folder';
    }
    return result;
}

// ================== 核心修复：统一CORS响应（解决OPTIONS预检） ==================
function corsResponse(body = null, status = 200) {
    return new Response(body ? JSON.stringify(body) : null, {
        status,
        headers: {
            'Access-Control-Allow-Origin': ALLOW_ORIGIN,
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Max-Age': '86400',
            'Content-Type': 'application/json',
        },
    });
}
// 处理OPTIONS预检请求（修复Failed to fetch的关键！）
function handleOptions() {
    return corsResponse(null, 204);
}

// ================== 管理API鉴权 ==================
async function checkAuth(request) {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${ADMIN_TOKEN}`) return corsResponse({ error: 'Unauthorized' }, 401);
    return null;
}

// ================== 分类CRUD ==================
async function handleCategories(request, db, method, reqUrl) {
    const authRes = await checkAuth(request);
    if (authRes) return authRes;
    if (method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
        return corsResponse(results);
    }
    if (method === 'POST') {
        const { name, icon, description, display_order } = await request.json();
        if (!name) return corsResponse({ error: 'Missing name' }, 400);
        await db.prepare('INSERT INTO categories (name,icon,description,display_order) VALUES (?,?,?,?)')
            .bind(name, icon || null, description || null, display_order || 0).run();
        return corsResponse({ success: true });
    }
    if (method === 'PUT') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        const { name, icon, description, display_order } = await request.json();
        await db.prepare('UPDATE categories SET name=COALESCE(?,name),icon=COALESCE(?,icon),description=COALESCE(?,description),display_order=COALESCE(?,display_order) WHERE id=?')
            .bind(name || null, icon || null, description || null, display_order !== undefined ? display_order : null, id).run();
        return corsResponse({ success: true });
    }
    if (method === 'DELETE') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        await db.prepare('DELETE FROM categories WHERE id=?').bind(id).run();
        return corsResponse({ success: true });
    }
    return corsResponse({ error: 'Method Not Allowed' }, 405);
}

// ================== 子分类CRUD ==================
async function handleSubcategories(request, db, method, reqUrl) {
    const authRes = await checkAuth(request);
    if (authRes) return authRes;
    if (method === 'GET') {
        const cid = reqUrl.searchParams.get('category_id');
        const stmt = cid ? db.prepare('SELECT * FROM subcategories WHERE category_id=? ORDER BY display_order ASC').bind(parseInt(cid))
            : db.prepare('SELECT * FROM subcategories ORDER BY category_id,display_order');
        const { results } = await stmt.all();
        return corsResponse(results);
    }
    if (method === 'POST') {
        const { category_id, name, display_order } = await request.json();
        if (!category_id || !name) return corsResponse({ error: 'Missing required fields' }, 400);
        await db.prepare('INSERT INTO subcategories (category_id,name,display_order) VALUES (?,?,?)')
            .bind(category_id, name, display_order || 0).run();
        return corsResponse({ success: true });
    }
    if (method === 'PUT') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        const { name, display_order } = await request.json();
        await db.prepare('UPDATE subcategories SET name=COALESCE(?,name),display_order=COALESCE(?,display_order) WHERE id=?')
            .bind(name || null, display_order !== undefined ? display_order : null, id).run();
        return corsResponse({ success: true });
    }
    if (method === 'DELETE') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        await db.prepare('DELETE FROM subcategories WHERE id=?').bind(id).run();
        return corsResponse({ success: true });
    }
    return corsResponse({ error: 'Method Not Allowed' }, 405);
}

// ================== 网站CRUD（核心修复：修改变量名冲突）==================
async function handleSites(request, db, method, reqUrl) {
    const authRes = await checkAuth(request);
    if (authRes) return authRes;
    if (method === 'GET') {
        const sid = reqUrl.searchParams.get('subcategory_id');
        const stmt = sid ? db.prepare('SELECT * FROM sites WHERE subcategory_id=? ORDER BY display_order ASC').bind(parseInt(sid))
            : db.prepare('SELECT * FROM sites ORDER BY subcategory_id,display_order');
        const { results } = await stmt.all();
        return corsResponse(results);
    }
    if (method === 'POST') {
        const { subcategory_id, title, url: siteUrl, description, icon, display_order } = await request.json();
        if (!subcategory_id || !title || !siteUrl) return corsResponse({ error: 'Missing required fields' }, 400);
        await db.prepare('INSERT INTO sites (subcategory_id,title,url,description,icon,display_order) VALUES (?,?,?,?,?,?)')
            .bind(subcategory_id, title, siteUrl, description || null, icon || null, display_order || 0).run();
        return corsResponse({ success: true });
    }
    if (method === 'PUT') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        const { title, url: siteUrl, description, icon, display_order } = await request.json();
        await db.prepare('UPDATE sites SET title=COALESCE(?,title),url=COALESCE(?,url),description=COALESCE(?,description),icon=COALESCE(?,icon),display_order=COALESCE(?,display_order) WHERE id=?')
            .bind(title || null, siteUrl || null, description || null, icon || null, display_order !== undefined ? display_order : null, id).run();
        return corsResponse({ success: true });
    }
    if (method === 'DELETE') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        await db.prepare('DELETE FROM sites WHERE id=?').bind(id).run();
        return corsResponse({ success: true });
    }
    return corsResponse({ error: 'Method Not Allowed' }, 405);
}

// ================== 主路由 ==================
export default {
    async fetch(request, env) {
        const kv = env.STATS_KV;
        const db = env.DB;
        const { method } = request;
        const reqUrl = new URL(request.url);

        // 优先处理OPTIONS预检（修复跨域核心）
        if (method === 'OPTIONS') return handleOptions();

        // 公开接口
        if (method === 'POST' && reqUrl.pathname === '/visit') {
            await recordVisit(getVisitorId(request), kv);
            return corsResponse({ success: true });
        }
        if (method === 'POST' && reqUrl.pathname === '/heartbeat') {
            await updateOnline(getVisitorId(request), kv);
            return corsResponse({ success: true });
        }
        if (method === 'GET' && reqUrl.pathname === '/stats') return corsResponse(await getStats(kv));
        if (method === 'GET' && reqUrl.pathname === '/uptime') return corsResponse(await getUptime(kv));
        if (method === 'POST' && reqUrl.pathname === '/click') {
            const { url, title } = await request.json();
            return corsResponse({ success: true, count: await recordClick(url, title, kv) });
        }
        if (method === 'GET' && reqUrl.pathname === '/navigation') {
            const res = corsResponse(await getNavigationData(db));
            res.headers.set('Cache-Control', 'public, max-age=300');
            return res;
        }

        // 管理接口
        if (reqUrl.pathname.startsWith('/admin/categories')) return handleCategories(request, db, method, reqUrl);
        if (reqUrl.pathname.startsWith('/admin/subcategories')) return handleSubcategories(request, db, method, reqUrl);
        if (reqUrl.pathname.startsWith('/admin/sites')) return handleSites(request, db, method, reqUrl);

        return corsResponse({ error: 'Not Found' }, 404);
    },
};
