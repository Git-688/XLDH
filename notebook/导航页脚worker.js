// Cloudflare Worker 完整版（Token 从环境变量读取）
// 绑定 KV 变量名：STATS_KV
// 绑定 D1 变量名：DB
// 环境变量：ADMIN_TOKEN（在 Worker 设置中添加）

const CONFIG = {
    ONLINE_TTL: 20 * 60 * 1000,
    ONLINE_UPDATE_INTERVAL: 15 * 60 * 1000,
    TIMEZONE_OFFSET: 8 * 60 * 60 * 1000,
};

const ALLOW_ORIGIN = 'https://xldh688.eu.cc';

// 注意：ADMIN_TOKEN 不再硬编码，而是从环境变量 env.ADMIN_TOKEN 获取

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

// ================== 运行时间 ==================
async function getUptime(kv) {
    try {
        let startTimeMs = await kv.get('site:start_time', 'text');
        if (!startTimeMs) {
            startTimeMs = getCurrentTimeMs().toString();
            await kv.put('site:start_time', startTimeMs);
        }
        const nowMs = getCurrentTimeMs();
        const uptimeMs = nowMs - parseInt(startTimeMs, 10);
        return { startTime: parseInt(startTimeMs, 10), uptime: uptimeMs, formatted: formatUptime(uptimeMs) };
    } catch (e) {
        return { startTime: Date.now(), uptime: 0, formatted: '刚刚上线' };
    }
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

// ================== 访问统计（D1 日志，30天自动清理） ==================
// 需要在 D1 中创建 visit_logs 表：
// CREATE TABLE IF NOT EXISTS visit_logs (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     visitor_id TEXT NOT NULL,
//     timestamp INTEGER NOT NULL,
//     date TEXT NOT NULL,
//     is_unique INTEGER DEFAULT 1
// );
// CREATE INDEX idx_visit_logs_date ON visit_logs(date);
// CREATE INDEX idx_visit_logs_visitor_date ON visit_logs(visitor_id, date);

async function recordVisit(visitorId, db) {
    try {
        const now = Date.now();
        const date = getTodayString();
        const existing = await db.prepare(
            'SELECT id FROM visit_logs WHERE visitor_id = ? AND date = ? LIMIT 1'
        ).bind(visitorId, date).first();
        const isUnique = existing ? 0 : 1;
        await db.prepare(
            'INSERT INTO visit_logs (visitor_id, timestamp, date, is_unique) VALUES (?, ?, ?, ?)'
        ).bind(visitorId, now, date, isUnique).run();
    } catch (e) {
        console.error('记录访问日志失败:', e);
    }
}

async function getStats(db, kv) {
    try {
        const today = getTodayString();
        const todayPVResult = await db.prepare(
            'SELECT COUNT(*) as count FROM visit_logs WHERE date = ?'
        ).bind(today).first();
        const todayUVResult = await db.prepare(
            'SELECT COUNT(*) as count FROM visit_logs WHERE date = ? AND is_unique = 1'
        ).bind(today).first();
        const totalPVResult = await db.prepare('SELECT COUNT(*) as count FROM visit_logs').first();
        const totalUVResult = await db.prepare('SELECT COUNT(DISTINCT visitor_id) as count FROM visit_logs').first();

        const online = await getOnlineCount(kv);
        return {
            total_pv: totalPVResult?.count || 0,
            today_pv: todayPVResult?.count || 0,
            today_uv: todayUVResult?.count || 0,
            total_uv: totalUVResult?.count || 0,
            online: online
        };
    } catch (err) {
        console.error('getStats 失败:', err);
        return { total_pv: 0, today_pv: 0, today_uv: 0, total_uv: 0, online: 0 };
    }
}

// 清理 30 天前的访问日志
async function cleanOldLogs(db) {
    try {
        const cutoffDate = new Date(getCurrentTimeMs() - 30 * 24 * 60 * 60 * 1000);
        const cutoffStr = cutoffDate.toISOString().slice(0, 10);
        const result = await db.prepare('DELETE FROM visit_logs WHERE date < ?').bind(cutoffStr).run();
        console.log(`清理了 ${result.meta.changes} 条 30 天前的旧日志`);
        return result.meta.changes;
    } catch (e) {
        console.error('清理旧日志失败:', e);
        return 0;
    }
}

// ================== 在线人数（KV） ==================
async function updateOnline(visitorId, kv) {
    try {
        const now = Date.now();
        const key = `online:${visitorId}`;
        const data = await kv.get(key, 'json');
        if (data && (now - data.lastUpdate) < CONFIG.ONLINE_UPDATE_INTERVAL) return;
        await kv.put(key, JSON.stringify({ lastUpdate: now }), { expirationTtl: CONFIG.ONLINE_TTL / 1000 });
    } catch (e) {}
}

async function getOnlineCount(kv) {
    try {
        const { keys } = await kv.list({ prefix: 'online:' });
        let online = 0;
        const now = Date.now();
        for (const key of keys) {
            try {
                const data = await kv.get(key.name, 'json');
                if (data && (now - data.lastUpdate) < CONFIG.ONLINE_TTL) online++;
            } catch (e) {}
        }
        return online;
    } catch (e) {
        return 0;
    }
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
    try {
        const normalized = normalizeClickUrl(url);
        const key = `click:${normalized}`;
        let count = parseInt(await kv.get(key) || '0', 10);
        count++;
        await kv.put(key, count.toString());
        const titleKey = `click_title:${normalized}`;
        const existingTitle = await kv.get(titleKey);
        if (!existingTitle && title) await kv.put(titleKey, title);
        return count;
    } catch (e) {
        return 0;
    }
}

async function getTopClicks(kv, limit = 10) {
    try {
        const { keys } = await kv.list({ prefix: 'click:' });
        const clicks = [];
        for (const key of keys) {
            if (key.name.startsWith('click_title:')) continue;
            const normalized = key.name.substring(6);
            const count = parseInt(await kv.get(key.name) || '0', 10);
            const titleKey = `click_title:${normalized}`;
            const title = await kv.get(titleKey) || normalized;
            clicks.push({ url: normalized, title, count });
        }
        clicks.sort((a, b) => b.count - a.count);
        return clicks.slice(0, limit);
    } catch (e) {
        return [];
    }
}

// ================== 死链检测（KV） ==================
async function checkLinkValidity(url, kv) {
    const normalized = normalizeClickUrl(url);
    const key = `link_status:${normalized}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let valid = false, statusCode = 0;
    try {
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        statusCode = res.status;
        valid = res.ok;
    } catch (err) {
        valid = false;
        statusCode = 0;
    } finally {
        clearTimeout(timeoutId);
    }
    const data = { valid, lastCheck: Date.now(), statusCode };
    await kv.put(key, JSON.stringify(data));
    return data;
}

async function checkAllLinks(db, kv, reportProgress = false) {
    try {
        const { results } = await db.prepare('SELECT DISTINCT url FROM sites').all();
        const urls = results.map(r => r.url);
        let checked = 0;
        if (reportProgress) {
            await kv.put('link_check_progress', JSON.stringify({ total: urls.length, checked: 0 }));
        }
        for (const url of urls) {
            await checkLinkValidity(url, kv);
            checked++;
            if (reportProgress) {
                await kv.put('link_check_progress', JSON.stringify({ total: urls.length, checked }));
            }
            await new Promise(r => setTimeout(r, 200));
        }
        if (reportProgress) await kv.delete('link_check_progress');
        return { total: urls.length, checked };
    } catch (e) {
        return { total: 0, checked: 0 };
    }
}

async function getInvalidLinks(kv, db) {
    try {
        const { keys } = await kv.list({ prefix: 'link_status:' });
        const invalid = [];
        for (const key of keys) {
            const data = await kv.get(key.name, 'json');
            if (data && !data.valid) {
                const normalized = key.name.substring(12);
                const site = await db.prepare('SELECT title, url FROM sites WHERE url LIKE ?').bind(`%${normalized}%`).first();
                invalid.push({
                    url: site?.url || normalized,
                    title: site?.title || normalized,
                    statusCode: data.statusCode,
                    lastCheck: data.lastCheck
                });
            }
        }
        return invalid;
    } catch (e) {
        return [];
    }
}

async function getCheckProgress(kv) {
    try {
        const progress = await kv.get('link_check_progress', 'json');
        return progress || { total: 0, checked: 0 };
    } catch (e) {
        return { total: 0, checked: 0 };
    }
}

// ================== 导航快照（KV 存储） ==================
async function getNavigationData(db, kv) {
    try {
        const { results: categories } = await db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
        const { results: subcategories } = await db.prepare('SELECT * FROM subcategories ORDER BY category_id, display_order ASC').all();
        const { results: sites } = await db.prepare('SELECT * FROM sites ORDER BY subcategory_id, display_order ASC').all();

        // 批量并发读取 KV
        const clickPromises = sites.map(site => {
            const key = `click:${normalizeClickUrl(site.url)}`;
            return kv.get(key).then(v => parseInt(v || '0', 10)).catch(() => 0);
        });
        const statusPromises = sites.map(site => {
            const key = `link_status:${normalizeClickUrl(site.url)}`;
            return kv.get(key, 'json').catch(() => null);
        });
        const [clicks, statuses] = await Promise.all([Promise.all(clickPromises), Promise.all(statusPromises)]);

        const siteMap = new Map();
        for (let i = 0; i < sites.length; i++) {
            const s = sites[i];
            if (!siteMap.has(s.subcategory_id)) siteMap.set(s.subcategory_id, []);
            siteMap.get(s.subcategory_id).push({
                ...s,
                views: clicks[i],
                valid: statuses[i] ? statuses[i].valid : true
            });
        }

        const subMap = new Map();
        for (const sub of subcategories) {
            if (!subMap.has(sub.category_id)) subMap.set(sub.category_id, []);
            subMap.get(sub.category_id).push(sub);
        }

        const result = { categories: {}, descriptions: {}, categoryIcons: {} };
        for (const cat of categories) {
            const subs = subMap.get(cat.id) || [];
            const subCatObj = {};
            for (const sub of subs) {
                subCatObj[sub.name] = siteMap.get(sub.id) || [];
            }
            result.categories[cat.name] = subCatObj;
            result.descriptions[cat.name] = cat.description || '';
            result.categoryIcons[cat.name] = cat.icon || 'fas fa-folder';
        }
        return result;
    } catch (err) {
        console.error('getNavigationData 失败', err);
        return { categories: {}, descriptions: {}, categoryIcons: {} };
    }
}

async function generateNavigationSnapshot(db, kv) {
    try {
        const data = await getNavigationData(db, kv);
        await kv.put('navigation:snapshot', JSON.stringify(data));
        await kv.put('navigation:snapshot_time', Date.now().toString());
        return data;
    } catch (err) {
        console.error('生成快照失败', err);
        return null;
    }
}

// ================== 管理API鉴权（使用环境变量中的 ADMIN_TOKEN） ==================
async function checkAuth(request, env) {
    const auth = request.headers.get('Authorization');
    const adminToken = env.ADMIN_TOKEN;  // 从环境变量读取
    if (!adminToken) {
        console.error('ADMIN_TOKEN 未在环境变量中设置');
        return corsResponse({ error: 'Server configuration error' }, 500);
    }
    if (auth !== `Bearer ${adminToken}`) return corsResponse({ error: 'Unauthorized' }, 401);
    return null;
}

// ================== CORS ==================
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

function handleOptions() {
    return corsResponse(null, 204);
}

// ================== 分类 CRUD ==================
async function handleCategories(request, db, method, reqUrl, env) {
    const authRes = await checkAuth(request, env);
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

async function handleSubcategories(request, db, method, reqUrl, env) {
    const authRes = await checkAuth(request, env);
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

async function handleSites(request, db, method, reqUrl, env) {
    const authRes = await checkAuth(request, env);
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
    async scheduled(event, env, ctx) {
        const kv = env.STATS_KV;
        const db = env.DB;
        // 每小时刷新导航快照
        await generateNavigationSnapshot(db, kv);
        // 每天凌晨 3 点执行清理（需要配合 Cron 表达式 '0 3 * * *'）
        if (event.cron === '0 3 * * *') {
            await cleanOldLogs(db);
        }
    },
    async fetch(request, env, ctx) {
        const kv = env.STATS_KV;
        const db = env.DB;
        const { method } = request;
        const reqUrl = new URL(request.url);

        if (method === 'OPTIONS') return handleOptions();

        // 公开接口
        if (method === 'POST' && reqUrl.pathname === '/visit') {
            await recordVisit(getVisitorId(request), db);
            return corsResponse({ success: true });
        }
        if (method === 'POST' && reqUrl.pathname === '/heartbeat') {
            await updateOnline(getVisitorId(request), kv);
            return corsResponse({ success: true });
        }
        if (method === 'GET' && reqUrl.pathname === '/stats') {
            return corsResponse(await getStats(db, kv));
        }
        if (method === 'GET' && reqUrl.pathname === '/uptime') {
            return corsResponse(await getUptime(kv));
        }
        if (method === 'POST' && reqUrl.pathname === '/click') {
            const { url, title } = await request.json();
            return corsResponse({ success: true, count: await recordClick(url, title, kv) });
        }
        if (method === 'GET' && reqUrl.pathname === '/navigation') {
            let snapshot = await kv.get('navigation:snapshot', 'json');
            if (!snapshot) {
                snapshot = await generateNavigationSnapshot(db, kv);
            }
            const res = corsResponse(snapshot || { categories: {}, descriptions: {}, categoryIcons: {} });
            res.headers.set('Cache-Control', 'public, max-age=60');
            return res;
        }

        // 管理接口（需要鉴权）
        if (reqUrl.pathname === '/admin/topclicks' && method === 'GET') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            const limit = parseInt(reqUrl.searchParams.get('limit') || '10', 10);
            const top = await getTopClicks(kv, limit);
            return corsResponse(top);
        }
        if (reqUrl.pathname === '/admin/check-links' && method === 'POST') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            ctx.waitUntil(checkAllLinks(db, kv, true));
            return corsResponse({ success: true, message: '检测已开始' });
        }
        if (reqUrl.pathname === '/admin/invalid-links' && method === 'GET') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            const invalid = await getInvalidLinks(kv, db);
            return corsResponse(invalid);
        }
        if (reqUrl.pathname === '/admin/check-progress' && method === 'GET') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            const progress = await getCheckProgress(kv);
            return corsResponse(progress);
        }
        if (reqUrl.pathname === '/admin/refresh-navigation' && method === 'POST') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            ctx.waitUntil(generateNavigationSnapshot(db, kv));
            return corsResponse({ success: true, message: '快照刷新中' });
        }
        if (reqUrl.pathname.startsWith('/admin/categories')) {
            return handleCategories(request, db, method, reqUrl, env);
        }
        if (reqUrl.pathname.startsWith('/admin/subcategories')) {
            return handleSubcategories(request, db, method, reqUrl, env);
        }
        if (reqUrl.pathname.startsWith('/admin/sites')) {
            return handleSites(request, db, method, reqUrl, env);
        }

        return corsResponse({ error: 'Not Found' }, 404);
    }
};