// Cloudflare Worker 最终版（包含6项优化）
// 绑定：STATS_KV，D1：DB，环境变量：ADMIN_TOKEN, API_HEZI_ID, API_HEZI_KEY

const CONFIG = {
    ONLINE_TTL: 20 * 60 * 1000,
    ONLINE_UPDATE_INTERVAL: 15 * 60 * 1000,
    TIMEZONE_OFFSET: 8 * 60 * 60 * 1000,
    RATE_LIMIT_WINDOW_MS: 60 * 1000,
    RATE_LIMIT_PUBLIC_MAX: 120,
    RATE_LIMIT_ADMIN_MAX: 20,
};

const ALLOW_ORIGINS = [
    'https://xldh688.eu.cc',
    'https://www.xldh688.eu.cc',
    'http://localhost:3000',
];

const NODES = [
    { type: 1, name: '国内' },
    { type: 2, name: '香港' },
    { type: 3, name: '美国' }
];

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

// ================== 访问统计（D1） ==================
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
        let online = parseInt(await kv.get('online:count') || '0', 10);
        return {
            total_pv: totalPVResult?.count || 0,
            today_pv: todayPVResult?.count || 0,
            today_uv: todayUVResult?.count || 0,
            total_uv: totalUVResult?.count || 0,
            online: online
        };
    } catch (err) {
        return { total_pv: 0, today_pv: 0, today_uv: 0, total_uv: 0, online: 0 };
    }
}

async function cleanOldLogs(db) {
    try {
        const cutoffDate = new Date(getCurrentTimeMs() - 30 * 24 * 60 * 60 * 1000);
        const cutoffStr = cutoffDate.toISOString().slice(0, 10);
        const result = await db.prepare('DELETE FROM visit_logs WHERE date < ?').bind(cutoffStr).run();
        console.log(`清理了 ${result.meta.changes} 条旧日志`);
        return result.meta.changes;
    } catch (e) {
        return 0;
    }
}

// ================== 在线人数 ==================
async function updateOnline(visitorId, kv) {
    try {
        const now = Date.now();
        const key = `online:${visitorId}`;
        const data = await kv.get(key, 'json');
        if (data && (now - data.lastUpdate) < CONFIG.ONLINE_UPDATE_INTERVAL) return;
        await kv.put(key, JSON.stringify({ lastUpdate: now }), { expirationTtl: CONFIG.ONLINE_TTL / 1000 });
    } catch (e) {}
}

async function updateOnlineCountCache(kv) {
    try {
        const { keys } = await kv.list({ prefix: 'online:' });
        let online = 0;
        const now = Date.now();
        for (const key of keys) {
            const data = await kv.get(key.name, 'json');
            if (data && (now - data.lastUpdate) < CONFIG.ONLINE_TTL) online++;
        }
        await kv.put('online:count', online.toString());
        console.log(`在线人数缓存更新：${online}`);
        return online;
    } catch (e) {
        console.error('更新在线人数缓存失败', e);
        return 0;
    }
}

// ================== 点击统计（D1） ==================
async function recordClick(url, title, db) {
    if (!url) return 0;
    try {
        const site = await db.prepare('SELECT id, views FROM sites WHERE url = ?').bind(url).first();
        if (!site) return 0;
        const newViews = (site.views || 0) + 1;
        await db.prepare('UPDATE sites SET views = ? WHERE id = ?').bind(newViews, site.id).run();
        return newViews;
    } catch (e) {
        console.error('记录点击失败:', e);
        return 0;
    }
}

async function getTopClicks(db, limit = 10) {
    try {
        const { results } = await db.prepare(
            'SELECT id, title, url, views FROM sites ORDER BY views DESC LIMIT ?'
        ).bind(limit).all();
        return results.map(site => ({
            url: site.url,
            title: site.title,
            count: site.views || 0
        }));
    } catch (e) {
        return [];
    }
}

// ================== 速率限制（细化） ==================
async function rateLimit(request, db) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const url = new URL(request.url);
    const isAdmin = url.pathname.startsWith('/admin');
    const maxRequests = isAdmin ? CONFIG.RATE_LIMIT_ADMIN_MAX : CONFIG.RATE_LIMIT_PUBLIC_MAX;
    const now = Math.floor(Date.now() / 1000);
    const windowSec = CONFIG.RATE_LIMIT_WINDOW_MS / 1000;

    try {
        let record = await db.prepare(
            'SELECT count, reset_time FROM rate_limit WHERE ip = ?'
        ).bind(ip).first();

        if (!record) {
            await db.prepare(
                'INSERT INTO rate_limit (ip, count, reset_time) VALUES (?, 1, ?)'
            ).bind(ip, now + windowSec).run();
            return { allowed: true };
        }

        if (now > record.reset_time) {
            await db.prepare(
                'UPDATE rate_limit SET count = 1, reset_time = ? WHERE ip = ?'
            ).bind(now + windowSec, ip).run();
            return { allowed: true };
        }

        if (record.count >= maxRequests) {
            const retryAfter = record.reset_time - now;
            return { allowed: false, retryAfter };
        }

        await db.prepare(
            'UPDATE rate_limit SET count = count + 1 WHERE ip = ?'
        ).bind(ip).run();
        return { allowed: true };
    } catch (e) {
        console.error('限流检查失败:', e);
        return { allowed: true };
    }
}

// ================== 死链检测（多节点并发） ==================
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

async function checkNode(url, node, apiId, apiKey) {
    const apiUrl = new URL('https://cn.apihz.cn/api/wangzhan/getcode.php');
    const params = new URLSearchParams({
        id: apiId,
        key: apiKey,
        url: url,
        type: node.type.toString()
    });
    apiUrl.search = params.toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(apiUrl.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);
        const result = await response.json();
        if (result.code === 200) {
            const statusCode = parseInt(result.msg, 10);
            const valid = (statusCode >= 200 && statusCode < 400);
            return { node: node.name, valid, statusCode, error: null };
        } else {
            return { node: node.name, valid: false, statusCode: 0, error: result.msg };
        }
    } catch (error) {
        clearTimeout(timeoutId);
        return { node: node.name, valid: false, statusCode: 0, error: error.message };
    }
}

async function checkLinkValidity(url, kv, env) {
    const normalized = normalizeClickUrl(url);
    const cacheKey = `link_status:${normalized}`;

    const cached = await kv.get(cacheKey, 'json');
    if (cached && (Date.now() - cached.lastCheck) < 7 * 24 * 3600 * 1000) {
        return { valid: cached.valid, statusCode: cached.statusCode, node: cached.node };
    }

    const apiId = env.API_HEZI_ID;
    const apiKey = env.API_HEZI_KEY;
    if (!apiId || !apiKey) {
        console.error('API_HEZI_ID 或 API_HEZI_KEY 未设置');
        return { valid: false, statusCode: 0, node: 'none' };
    }

    const promises = NODES.map(node => checkNode(url, node, apiId, apiKey));
    const results = await Promise.all(promises);
    const successResult = results.find(r => r.valid === true);
    if (successResult) {
        const { node, statusCode } = successResult;
        await kv.put(cacheKey, JSON.stringify({ valid: true, lastCheck: Date.now(), statusCode, node }), { expirationTtl: 7 * 86400 });
        return { valid: true, statusCode, node };
    } else {
        const lastResult = results[results.length - 1];
        const statusCode = lastResult?.statusCode || 0;
        await kv.put(cacheKey, JSON.stringify({ valid: false, lastCheck: Date.now(), statusCode, node: '所有节点均失败' }), { expirationTtl: 7 * 86400 });
        return { valid: false, statusCode, node: '所有节点均失败' };
    }
}

async function checkAllLinks(db, kv, env, reportProgress = false, concurrency = 5) {
    try {
        const { results } = await db.prepare('SELECT DISTINCT url FROM sites').all();
        const urls = results.map(r => r.url);
        const total = urls.length;
        let checked = 0;
        let index = 0;
        const errors = [];

        if (reportProgress) {
            await kv.put('link_check_progress', JSON.stringify({ total, checked: 0 }));
        }

        const runTask = async () => {
            while (index < total) {
                const i = index++;
                const url = urls[i];
                try {
                    await checkLinkValidity(url, kv, env);
                } catch (err) {
                    errors.push({ url, err: err.message });
                } finally {
                    checked++;
                    if (reportProgress) {
                        await kv.put('link_check_progress', JSON.stringify({ total, checked }));
                    }
                }
            }
        };

        const workers = [];
        for (let i = 0; i < Math.min(concurrency, total); i++) {
            workers.push(runTask());
        }
        await Promise.all(workers);

        if (reportProgress) await kv.delete('link_check_progress');
        return { total, checked, errors };
    } catch (err) {
        console.error('批量检测失败', err);
        return { total: 0, checked: 0, errors: [] };
    }
}

async function recheckInvalidLinks(db, kv, env) {
    try {
        const { keys } = await kv.list({ prefix: 'link_status:' });
        const invalidKeys = [];
        for (const key of keys) {
            const data = await kv.get(key.name, 'json');
            if (data && !data.valid) {
                invalidKeys.push(key.name);
            }
        }
        console.log(`找到 ${invalidKeys.length} 个失效链接，开始重新检测...`);
        let rechecked = 0;
        for (const key of invalidKeys) {
            const normalized = key.substring(12);
            const site = await db.prepare('SELECT url FROM sites WHERE url LIKE ?').bind(`%${normalized}%`).first();
            if (site && site.url) {
                await checkLinkValidity(site.url, kv, env);
                rechecked++;
                await new Promise(r => setTimeout(r, 200));
            }
        }
        console.log(`重新检测完成，共检测 ${rechecked} 个链接`);
        return { total: invalidKeys.length, rechecked };
    } catch (err) {
        console.error('自动重新检测失效链接失败', err);
        return { total: 0, rechecked: 0 };
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
                    lastCheck: data.lastCheck,
                    node: data.node
                });
            }
        }
        return invalid;
    } catch {
        return [];
    }
}

async function getCheckProgress(kv) {
    try {
        const progress = await kv.get('link_check_progress', 'json');
        return progress || { total: 0, checked: 0 };
    } catch {
        return { total: 0, checked: 0 };
    }
}

// ================== 用户反馈死链 ==================
async function reportDeadLink(url, title, request, db) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const reportTime = Date.now();
    try {
        await db.prepare(
            'INSERT INTO dead_link_reports (url, title, reporter_ip, report_time, status) VALUES (?, ?, ?, ?, ?)'
        ).bind(url, title || '', ip, reportTime, 'pending').run();
        return true;
    } catch (e) {
        console.error('记录死链反馈失败:', e);
        return false;
    }
}

async function getDeadLinkReports(db, status = 'pending') {
    try {
        const { results } = await db.prepare(
            'SELECT id, url, title, reporter_ip, report_time, status FROM dead_link_reports WHERE status = ? ORDER BY report_time DESC'
        ).bind(status).all();
        return results;
    } catch (e) {
        console.error('查询死链反馈失败:', e);
        return [];
    }
}

async function updateReportStatus(id, newStatus, db) {
    try {
        await db.prepare('UPDATE dead_link_reports SET status = ? WHERE id = ?').bind(newStatus, id).run();
        return true;
    } catch (e) {
        console.error('更新反馈状态失败:', e);
        return false;
    }
}

// ================== 导航数据缓存 ==================
async function generateNavigationSnapshot(db, kv) {
    try {
        const data = await getNavigationData(db);
        await kv.put('navigation:snapshot', JSON.stringify(data));
        await kv.put('navigation:snapshot_time', Date.now().toString());
        console.log('导航快照已生成');
        return data;
    } catch (e) {
        console.error('生成导航快照失败', e);
        return null;
    }
}

async function getNavigationData(db) {
    try {
        const { results: categories } = await db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
        const { results: subcategories } = await db.prepare('SELECT * FROM subcategories ORDER BY category_id, display_order ASC').all();
        const { results: sites } = await db.prepare('SELECT * FROM sites ORDER BY subcategory_id, display_order ASC').all();

        const siteMap = new Map();
        for (const site of sites) {
            if (!siteMap.has(site.subcategory_id)) siteMap.set(site.subcategory_id, []);
            siteMap.get(site.subcategory_id).push({
                ...site,
                views: site.views || 0,
                valid: true
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
    } catch (e) {
        console.error('获取导航数据失败', e);
        return { categories: {}, descriptions: {}, categoryIcons: {} };
    }
}

// ================== 定期清理KV过期键 ==================
async function cleanExpiredKVKeys(kv) {
    try {
        const prefixes = ['link_status:', 'online:'];
        let totalDeleted = 0;
        for (const prefix of prefixes) {
            const { keys } = await kv.list({ prefix });
            for (const key of keys) {
                if (prefix === 'online:') {
                    const data = await kv.get(key.name, 'json');
                    if (data && (Date.now() - data.lastUpdate) > CONFIG.ONLINE_TTL) {
                        await kv.delete(key.name);
                        totalDeleted++;
                    }
                } else if (prefix === 'link_status:') {
                    const data = await kv.get(key.name, 'json');
                    if (data && (Date.now() - data.lastCheck) > 30 * 24 * 3600 * 1000) {
                        await kv.delete(key.name);
                        totalDeleted++;
                    }
                }
            }
        }
        console.log(`清理KV过期键完成，共删除 ${totalDeleted} 个`);
        return totalDeleted;
    } catch (e) {
        console.error('清理KV过期键失败', e);
        return 0;
    }
}

// ================== CORS（动态白名单） ==================
function corsResponse(body = null, status = 200, request = null) {
    let origin = '*';
    if (request) {
        const reqOrigin = request.headers.get('Origin');
        if (reqOrigin && ALLOW_ORIGINS.includes(reqOrigin)) {
            origin = reqOrigin;
        }
    }
    return new Response(body ? JSON.stringify(body) : null, {
        status,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Max-Age': '86400',
            'Content-Type': 'application/json',
        },
    });
}
function handleOptions(request) {
    let origin = '*';
    const reqOrigin = request.headers.get('Origin');
    if (reqOrigin && ALLOW_ORIGINS.includes(reqOrigin)) {
        origin = reqOrigin;
    }
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}

// ================== 管理鉴权 ==================
async function checkAuth(request, env) {
    const auth = request.headers.get('Authorization');
    const adminToken = env.ADMIN_TOKEN;
    if (!adminToken) {
        console.error('ADMIN_TOKEN 未设置');
        return corsResponse({ error: 'Server config error' }, 500, request);
    }
    if (auth !== `Bearer ${adminToken}`) return corsResponse({ error: 'Unauthorized' }, 401, request);
    return null;
}

// ================== CRUD 函数 ==================
async function handleCategories(request, db, method, reqUrl, env) {
    const authRes = await checkAuth(request, env);
    if (authRes) return authRes;
    if (method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
        return corsResponse(results, 200, request);
    }
    if (method === 'POST') {
        const { name, icon, description, display_order } = await request.json();
        if (!name) return corsResponse({ error: 'Missing name' }, 400, request);
        await db.prepare('INSERT INTO categories (name,icon,description,display_order) VALUES (?,?,?,?)')
            .bind(name, icon || null, description || null, display_order || 0).run();
        return corsResponse({ success: true }, 200, request);
    }
    if (method === 'PUT') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        const { name, icon, description, display_order } = await request.json();
        await db.prepare('UPDATE categories SET name=COALESCE(?,name),icon=COALESCE(?,icon),description=COALESCE(?,description),display_order=COALESCE(?,display_order) WHERE id=?')
            .bind(name || null, icon || null, description || null, display_order !== undefined ? display_order : null, id).run();
        return corsResponse({ success: true }, 200, request);
    }
    if (method === 'DELETE') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        await db.prepare('DELETE FROM categories WHERE id=?').bind(id).run();
        return corsResponse({ success: true }, 200, request);
    }
    return corsResponse({ error: 'Method Not Allowed' }, 405, request);
}

async function handleSubcategories(request, db, method, reqUrl, env) {
    const authRes = await checkAuth(request, env);
    if (authRes) return authRes;
    if (method === 'GET') {
        const cid = reqUrl.searchParams.get('category_id');
        const stmt = cid ? db.prepare('SELECT * FROM subcategories WHERE category_id=? ORDER BY display_order ASC').bind(parseInt(cid))
            : db.prepare('SELECT * FROM subcategories ORDER BY category_id,display_order');
        const { results } = await stmt.all();
        return corsResponse(results, 200, request);
    }
    if (method === 'POST') {
        const { category_id, name, display_order } = await request.json();
        if (!category_id || !name) return corsResponse({ error: 'Missing required fields' }, 400, request);
        await db.prepare('INSERT INTO subcategories (category_id,name,display_order) VALUES (?,?,?)')
            .bind(category_id, name, display_order || 0).run();
        return corsResponse({ success: true }, 200, request);
    }
    if (method === 'PUT') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        const { name, display_order } = await request.json();
        await db.prepare('UPDATE subcategories SET name=COALESCE(?,name),display_order=COALESCE(?,display_order) WHERE id=?')
            .bind(name || null, display_order !== undefined ? display_order : null, id).run();
        return corsResponse({ success: true }, 200, request);
    }
    if (method === 'DELETE') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        await db.prepare('DELETE FROM subcategories WHERE id=?').bind(id).run();
        return corsResponse({ success: true }, 200, request);
    }
    return corsResponse({ error: 'Method Not Allowed' }, 405, request);
}

async function handleSites(request, db, method, reqUrl, env) {
    const authRes = await checkAuth(request, env);
    if (authRes) return authRes;
    if (method === 'GET') {
        const sid = reqUrl.searchParams.get('subcategory_id');
        const stmt = sid ? db.prepare('SELECT * FROM sites WHERE subcategory_id=? ORDER BY display_order ASC').bind(parseInt(sid))
            : db.prepare('SELECT * FROM sites ORDER BY subcategory_id,display_order');
        const { results } = await stmt.all();
        return corsResponse(results, 200, request);
    }
    if (method === 'POST') {
        const { subcategory_id, title, url: siteUrl, description, icon, display_order } = await request.json();
        if (!subcategory_id || !title || !siteUrl) return corsResponse({ error: 'Missing required fields' }, 400, request);
        await db.prepare('INSERT INTO sites (subcategory_id,title,url,description,icon,display_order) VALUES (?,?,?,?,?,?)')
            .bind(subcategory_id, title, siteUrl, description || null, icon || null, display_order || 0).run();
        return corsResponse({ success: true }, 200, request);
    }
    if (method === 'PUT') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        const { title, url: siteUrl, description, icon, display_order } = await request.json();
        await db.prepare('UPDATE sites SET title=COALESCE(?,title),url=COALESCE(?,url),description=COALESCE(?,description),icon=COALESCE(?,icon),display_order=COALESCE(?,display_order) WHERE id=?')
            .bind(title || null, siteUrl || null, description || null, icon || null, display_order !== undefined ? display_order : null, id).run();
        return corsResponse({ success: true }, 200, request);
    }
    if (method === 'DELETE') {
        const id = parseInt(reqUrl.pathname.split('/').pop());
        await db.prepare('DELETE FROM sites WHERE id=?').bind(id).run();
        return corsResponse({ success: true }, 200, request);
    }
    return corsResponse({ error: 'Method Not Allowed' }, 405, request);
}

// ================== 主路由 ==================
export default {
    async scheduled(event, env, ctx) {
        const kv = env.STATS_KV;
        const db = env.DB;

        if (event.cron === '*/5 * * * *') {
            await generateNavigationSnapshot(db, kv);
        }
        if (event.cron === '*/10 * * * *') {
            await updateOnlineCountCache(kv);
        }
        if (event.cron === '0 4 * * *') {
            await recheckInvalidLinks(db, kv, env);
        }
        if (event.cron === '0 3 * * *') {
            await cleanOldLogs(db);
        }
        if (event.cron === '0 2 * * 0') {
            await cleanExpiredKVKeys(kv);
        }
    },

    async fetch(request, env, ctx) {
        const kv = env.STATS_KV;
        const db = env.DB;
        const { method } = request;
        const reqUrl = new URL(request.url);

        if (method === 'OPTIONS') return handleOptions(request);

        const limit = await rateLimit(request, db);
        if (!limit.allowed) {
            return new Response(JSON.stringify({ error: 'Too Many Requests', retryAfter: limit.retryAfter }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': limit.retryAfter,
                    'Access-Control-Allow-Origin': (() => {
                        const origin = request.headers.get('Origin');
                        return origin && ALLOW_ORIGINS.includes(origin) ? origin : '*';
                    })(),
                },
            });
        }

        // 公开接口
        if (method === 'POST' && reqUrl.pathname === '/visit') {
            await recordVisit(getVisitorId(request), db);
            return corsResponse({ success: true }, 200, request);
        }
        if (method === 'POST' && reqUrl.pathname === '/heartbeat') {
            await updateOnline(getVisitorId(request), kv);
            return corsResponse({ success: true }, 200, request);
        }
        if (method === 'GET' && reqUrl.pathname === '/stats') {
            let stats = await getStats(db, kv);
            if (stats.online === 0) {
                const realOnline = await updateOnlineCountCache(kv);
                if (realOnline > 0) stats = await getStats(db, kv);
            }
            const res = corsResponse(stats, 200, request);
            res.headers.set('Cache-Control', 'public, max-age=60');
            return res;
        }
        if (method === 'GET' && reqUrl.pathname === '/uptime') {
            return corsResponse(await getUptime(kv), 200, request);
        }
        if (method === 'POST' && reqUrl.pathname === '/click') {
            const { url, title } = await request.json();
            const newCount = await recordClick(url, title, db);
            return corsResponse({ success: true, count: newCount }, 200, request);
        }
        if (method === 'GET' && reqUrl.pathname === '/navigation') {
            let snapshot = await kv.get('navigation:snapshot', 'json');
            if (!snapshot) {
                snapshot = await generateNavigationSnapshot(db, kv);
            }
            const res = corsResponse(snapshot || { categories: {}, descriptions: {}, categoryIcons: {} }, 200, request);
            res.headers.set('Cache-Control', 'public, max-age=300');
            return res;
        }
        if (method === 'POST' && reqUrl.pathname === '/report-dead-link') {
            const { url, title } = await request.json();
            if (!url) return corsResponse({ error: 'Missing url' }, 400, request);
            const success = await reportDeadLink(url, title, request, db);
            return corsResponse({ success }, 200, request);
        }

        // 管理接口
        if (reqUrl.pathname === '/admin/topclicks' && method === 'GET') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            const limitNum = parseInt(reqUrl.searchParams.get('limit') || '10', 10);
            return corsResponse(await getTopClicks(db, limitNum), 200, request);
        }
        if (reqUrl.pathname === '/admin/check-links' && method === 'POST') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            ctx.waitUntil(checkAllLinks(db, kv, env, true, 5));
            return corsResponse({ success: true, message: '检测已开始' }, 200, request);
        }
        if (reqUrl.pathname === '/admin/invalid-links' && method === 'GET') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            return corsResponse(await getInvalidLinks(kv, db), 200, request);
        }
        if (reqUrl.pathname === '/admin/check-progress' && method === 'GET') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            return corsResponse(await getCheckProgress(kv), 200, request);
        }
        if (reqUrl.pathname === '/admin/refresh-navigation' && method === 'POST') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            ctx.waitUntil(generateNavigationSnapshot(db, kv));
            return corsResponse({ success: true, message: '快照刷新中' }, 200, request);
        }
        if (reqUrl.pathname === '/admin/dead-link-reports' && method === 'GET') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            const reports = await getDeadLinkReports(db, 'pending');
            return corsResponse(reports, 200, request);
        }
        if (reqUrl.pathname.startsWith('/admin/report-status/') && method === 'PUT') {
            const authRes = await checkAuth(request, env);
            if (authRes) return authRes;
            const id = parseInt(reqUrl.pathname.split('/').pop());
            const { status } = await request.json();
            await updateReportStatus(id, status, db);
            return corsResponse({ success: true }, 200, request);
        }

        if (reqUrl.pathname.startsWith('/admin/categories')) return handleCategories(request, db, method, reqUrl, env);
        if (reqUrl.pathname.startsWith('/admin/subcategories')) return handleSubcategories(request, db, method, reqUrl, env);
        if (reqUrl.pathname.startsWith('/admin/sites')) return handleSites(request, db, method, reqUrl, env);

        return corsResponse({ error: 'Not Found' }, 404, request);
    }
};