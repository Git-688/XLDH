/* service-worker.js - 按需缓存策略（首次访问时缓存，而非预缓存全部） */
const CACHE_NAME = 'starlink-v8';
const NAVIGATION_CACHE_NAME = 'starlink-nav-v8';
const API_CACHE_NAME = 'starlink-api-v8';
const FONT_CACHE_NAME = 'starlink-fonts-v8';

// 只缓存核心离线页面，其他资源按需缓存
const CORE_URLS = [
    '/',
    '/index.html',
    '/offline.html'  // 如果有离线页面的话
];

const FONT_URL_PATTERNS = [
    'cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free',
    'cdn.jsdelivr.net/npm/katex',
    'fonts.googleapis.com'
];

const CACHE_CONFIG = {
    nav: {
        patterns: ['/navigation/structure'],
        strategy: 'stale-while-revalidate',
        ttl: 3600 * 1000,
        cacheName: NAVIGATION_CACHE_NAME
    },
    sites: {
        patterns: ['/navigation/sites', '/navigation/batch-sites'],
        strategy: 'network-first',
        ttl: 5 * 60 * 1000,
        cacheName: API_CACHE_NAME
    },
    stats: {
        patterns: ['/stats', '/uptime', '/global-submission-count', '/subcategory/counts'],
        strategy: 'network-first',
        ttl: 30 * 1000,
        cacheName: API_CACHE_NAME
    },
    weather: {
        patterns: ['/weather/proxy'],
        strategy: 'network-first',
        ttl: 5 * 60 * 1000,
        cacheName: API_CACHE_NAME
    },
    announcement: {
        patterns: ['/announcement/active'],
        strategy: 'network-first',
        ttl: 60 * 60 * 1000,
        cacheName: API_CACHE_NAME
    },
    notebook: {
        patterns: ['/notebook'],
        strategy: 'cache-first',
        ttl: 10 * 60 * 1000,
        cacheName: API_CACHE_NAME
    },
    icon: {
        patterns: ['/icon'],
        strategy: 'cache-first',
        ttl: 7 * 24 * 60 * 60 * 1000,
        cacheName: API_CACHE_NAME
    }
};

function getCacheConfig(url) {
    const path = url.pathname;
    for (const key in CACHE_CONFIG) {
        const config = CACHE_CONFIG[key];
        if (config.patterns.some(p => path.includes(p))) {
            return config;
        }
    }
    return null;
}

self.addEventListener('install', event => {
    // ===== 按需缓存：只缓存核心离线页面 =====
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(CORE_URLS);
        }).catch(err => console.error('核心资源缓存失败:', err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME && key !== NAVIGATION_CACHE_NAME &&
                    key !== API_CACHE_NAME && key !== FONT_CACHE_NAME) {
                    console.log('删除旧缓存:', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => {
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        version: CACHE_NAME,
                        timestamp: Date.now()
                    });
                });
            });
        })
    );
    self.clients.claim();
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'INVALIDATE_NAV_CACHE') {
        caches.delete(NAVIGATION_CACHE_NAME).then(() => {
            console.log('导航缓存已清除');
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({ success: true });
            }
        });
    }
});

// ===== 策略实现 =====
async function handleStaleWhileRevalidate(request, config) {
    const cache = await caches.open(config.cacheName);
    const cachedResponse = await cache.match(request);
    const fetchPromise = fetch(request).then(async response => {
        if (response && response.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('sw-cache-timestamp', Date.now());
            headers.set('sw-cache-ttl', config.ttl);
            const cached = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            cache.put(request, cached);
        }
        return response;
    }).catch(() => null);

    if (cachedResponse) {
        const timestamp = cachedResponse.headers.get('sw-cache-timestamp');
        const ttl = cachedResponse.headers.get('sw-cache-ttl') || config.ttl;
        if (timestamp && (Date.now() - parseInt(timestamp) < parseInt(ttl))) {
            event.waitUntil(fetchPromise);
            return cachedResponse;
        }
        event.waitUntil(fetchPromise);
        return cachedResponse;
    }
    return fetchPromise || new Response('', { status: 504 });
}

async function handleNetworkFirst(request, config) {
    const cache = await caches.open(config.cacheName);
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('sw-cache-timestamp', Date.now());
            headers.set('sw-cache-ttl', config.ttl);
            const cached = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            cache.put(request, cached);
        }
        return response;
    } catch (err) {
        const cached = await cache.match(request);
        if (cached) {
            const timestamp = cached.headers.get('sw-cache-timestamp');
            const ttl = cached.headers.get('sw-cache-ttl') || config.ttl;
            if (timestamp && (Date.now() - parseInt(timestamp) < parseInt(ttl))) {
                return cached;
            }
            return cached;
        }
        return new Response(JSON.stringify({ error: '离线状态下无法获取数据' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleCacheFirst(request, config) {
    const cache = await caches.open(config.cacheName);
    const cached = await cache.match(request);
    if (cached) {
        const timestamp = cached.headers.get('sw-cache-timestamp');
        const ttl = cached.headers.get('sw-cache-ttl') || config.ttl;
        if (timestamp && (Date.now() - parseInt(timestamp) < parseInt(ttl))) {
            return cached;
        }
    }
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('sw-cache-timestamp', Date.now());
            headers.set('sw-cache-ttl', config.ttl);
            const cached = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            cache.put(request, cached);
        }
        return response;
    } catch (err) {
        const stale = await cache.match(request);
        if (stale) return stale;
        return new Response('', { status: 504 });
    }
}

// ===== HTML 文档：network-first =====
async function handleDocumentRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('sw-cache-timestamp', Date.now());
            headers.set('sw-cache-ttl', 3600 * 1000);
            const cached = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            cache.put(request, cached);
            return response;
        }
        throw new Error('Network response not ok');
    } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response(
            '<!DOCTYPE html><html><head><title>离线</title><meta charset="UTF-8"></head><body style="font-family:sans-serif;padding:20px;text-align:center;background:#f5f5f5;"><h1>📡 网络未连接</h1><p>请检查网络后刷新页面</p></body></html>',
            {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
        );
    }
}

// ===== 按需缓存：静态资源（脚本/样式）使用 cache-first =====
async function handleStaticResource(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
        // 检查是否过期（1小时）
        const timestamp = cached.headers.get('sw-cache-timestamp');
        const ttl = cached.headers.get('sw-cache-ttl') || 3600 * 1000;
        if (timestamp && (Date.now() - parseInt(timestamp) < parseInt(ttl))) {
            return cached;
        }
        // 过期了，删除并重新获取
        await cache.delete(request);
    }
    try {
        const response = await fetch(request);
        if (response && response.status === 200 && request.method === 'GET') {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('sw-cache-timestamp', Date.now());
            headers.set('sw-cache-ttl', 3600 * 1000);
            const cached = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            cache.put(request, cached);
        }
        return response;
    } catch (err) {
        return cached || new Response('', { status: 504 });
    }
}

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 跨域字体请求特殊处理
    if (url.origin !== self.location.origin && isFontRequest(url)) {
        event.respondWith(handleFontRequest(event.request));
        return;
    }

    // HTML 文档使用 network-first
    if (event.request.destination === 'document') {
        event.respondWith(handleDocumentRequest(event.request));
        return;
    }

    // 静态资源（脚本/样式）使用 cache-first（按需缓存）
    if (event.request.destination === 'script' || event.request.destination === 'style') {
        event.respondWith(handleStaticResource(event.request));
        return;
    }

    // API 请求根据配置选择策略
    const config = getCacheConfig(url);
    if (config) {
        switch (config.strategy) {
            case 'stale-while-revalidate':
                event.respondWith(handleStaleWhileRevalidate(event.request, config));
                break;
            case 'network-first':
                event.respondWith(handleNetworkFirst(event.request, config));
                break;
            case 'cache-first':
                event.respondWith(handleCacheFirst(event.request, config));
                break;
            default:
                event.respondWith(fetch(event.request));
        }
        return;
    }

    // 其他请求
    event.respondWith(handleOtherRequest(event.request));
});

function isFontRequest(url) {
    return FONT_URL_PATTERNS.some(pattern => url.href.includes(pattern));
}

async function handleFontRequest(request) {
    const cache = await caches.open(FONT_CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            const cached = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            cache.put(request, cached);
        }
        return response;
    } catch (err) {
        return cached || new Response('', { status: 404 });
    }
}

async function handleOtherRequest(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (err) {
        if (request.method === 'GET') {
            const cached = await caches.match(request);
            if (cached) return cached;
        }
        throw err;
    }
}