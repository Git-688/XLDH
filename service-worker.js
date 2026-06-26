/* service-worker.js - 精细化缓存策略（差异化 TTL，三种缓存策略） */
const CACHE_NAME = 'starlink-v8';
const NAVIGATION_CACHE_NAME = 'starlink-nav-v8';
const API_CACHE_NAME = 'starlink-api-v8';
const FONT_CACHE_NAME = 'starlink-fonts-v8';

const STATIC_URLS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/modules/navbar.css',
    '/css/modules/sidebar.css',
    '/css/modules/announcement.css',
    '/css/modules/search.css',
    '/css/modules/weather.css',
    '/css/modules/about.css',
    '/css/modules/navigation.css',
    '/css/modules/wallpaper.css',
    '/css/modules/greeting.css',
    '/css/modules/stats.css',
    '/css/modules/compact-tags.css',
    '/css/responsive.css',
    '/css/xfyy1/music-player.css',
    '/js/main.js',
    '/js/utils.js',
    '/js/toast.js',
    '/js/error-handler.js',
    '/js/storage.js',
    '/js/components/navbar.js',
    '/js/components/sidebar.js',
    '/js/modules/announcement.js',
    '/js/modules/search.js',
    '/js/modules/weather.js',
    '/js/modules/about.js',
    '/js/modules/navigation.js',
    '/js/modules/wallpaper.js',
    '/js/modules/greeting.js',
    '/js/modules/stats.js',
    '/js/modules/compact-tags.js',
    '/js/xfyy/cache-manager.js',
    '/js/xfyy/lyric-parser.js',
    '/js/xfyy/plugin-manager.js',
    '/js/xfyy/music-player.js',
    '/js/xfyy/music-main.js',
    '/js/modules/comment.js',
    '/js/modules/submit.js',
    '/data/local-music-data.js'
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
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_URLS);
        }).catch(err => console.error('静态资源缓存失败:', err))
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
            // 通知所有客户端新版本已激活
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
    // 可以处理其他消息，如强制刷新缓存
    if (event.data && event.data.type === 'INVALIDATE_NAV_CACHE') {
        caches.delete(NAVIGATION_CACHE_NAME).then(() => {
            console.log('导航缓存已清除');
            // 可选：回复客户端
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({ success: true });
            }
        });
    }
});

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

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin && !isFontRequest(url)) return;

    if (isFontRequest(url)) {
        event.respondWith(handleFontRequest(event.request));
        return;
    }

    if (event.request.destination === 'document' ||
        event.request.destination === 'script' ||
        event.request.destination === 'style') {
        event.respondWith(handleStaticResource(event.request));
        return;
    }

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

async function handleStaticResource(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    return fetch(request).then(response => {
        if (response && response.status === 200 && request.method === 'GET') {
            const cloned = response.clone();
            cache.put(request, cloned);
        }
        return response;
    });
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