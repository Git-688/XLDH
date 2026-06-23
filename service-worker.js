const CACHE_NAME = 'starlink-v8';
const NAVIGATION_CACHE_NAME = 'starlink-nav-v8';
const API_CACHE_NAME = 'starlink-api-v8';
const FONT_CACHE_NAME = 'starlink-fonts-v8';

const STATIC_URLS = [
    '/', '/index.html', '/admin.html',
    '/css/style.css', '/css/modules/navbar.css', '/css/modules/sidebar.css',
    '/css/modules/announcement.css', '/css/modules/search.css', '/css/modules/weather.css',
    '/css/modules/about.css', '/css/modules/navigation.css', '/css/modules/wallpaper.css',
    '/css/modules/greeting.css', '/css/modules/stats.css', '/css/modules/compact-tags.css',
    '/css/responsive.css', '/css/xfyy1/music-player.css',
    '/js/main.js', '/js/utils.js', '/js/toast.js', '/js/error-handler.js', '/js/storage.js',
    '/js/components/navbar.js', '/js/components/sidebar.js',
    '/js/modules/announcement.js', '/js/modules/search.js', '/js/modules/weather.js',
    '/js/modules/about.js', '/js/modules/navigation.js', '/js/modules/wallpaper.js',
    '/js/modules/greeting.js', '/js/modules/stats.js', '/js/modules/compact-tags.js',
    '/js/xfyy/cache-manager.js', '/js/xfyy/lyric-parser.js', '/js/xfyy/plugin-manager.js',
    '/js/xfyy/music-player.js', '/js/xfyy/music-main.js',
    '/js/modules/comment.js', '/js/modules/submit.js',
    '/data/local-music-data.js'
];

const FONT_URL_PATTERNS = ['cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free', 'cdn.jsdelivr.net/npm/katex', 'fonts.googleapis.com'];
const NAV_API_PATTERNS = ['/navigation/structure'];
const CACHED_API_PATTERNS = ['/navigation/sites', '/stats', '/uptime', '/global-submission-count', '/notebook'];
const API_TTL_MAP = { '/navigation/sites': 5 * 60 * 1000, 'default': 60 * 60 * 1000 };

function getApiTtl(urlPath) { return API_TTL_MAP[urlPath] || API_TTL_MAP.default; }
function isFontRequest(url) { return FONT_URL_PATTERNS.some(pattern => url.href.includes(pattern)); }
function isNavigationApiRequest(url) { return NAV_API_PATTERNS.some(pattern => url.pathname.includes(pattern)); }
function isCacheableApiRequest(request) {
    if (request.method !== 'GET') return false;
    const url = new URL(request.url);
    return CACHED_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_URLS)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME && key !== NAVIGATION_CACHE_NAME && key !== API_CACHE_NAME && key !== FONT_CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        }).then(() => {
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME, timestamp: Date.now() });
                });
            });
        })
    );
    self.clients.claim();
});

self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function handleNavigationApi(request, event) {
    const cache = await caches.open(NAVIGATION_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    let cachedVersion = cachedResponse?.headers.get('X-Nav-Version') || null;

    const fetchPromise = fetch(request).then(async response => {
        if (response?.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            const etag = headers.get('ETag') || headers.get('Last-Modified') || Date.now().toString();
            headers.set('X-Nav-Version', etag);
            headers.set('X-SW-Cache-Version', CACHE_NAME);
            const cachedResponseWithHeaders = new Response(cloned.body, {
                status: cloned.status, statusText: cloned.statusText, headers
            });
            if (cachedVersion && cachedVersion !== etag) {
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'NAV_UPDATED', timestamp: Date.now() });
                    });
                });
            }
            event.waitUntil(cache.put(request, cachedResponseWithHeaders));
            return response;
        }
        return response;
    }).catch(() => null);

    if (cachedResponse) {
        event.waitUntil(fetchPromise);
        return cachedResponse;
    }
    return fetchPromise;
}

async function handleCacheableApi(request) {
    const url = new URL(request.url);
    const ttl = getApiTtl(url.pathname);
    const cache = await caches.open(API_CACHE_NAME);
    try {
        const response = await fetch(request);
        if (response?.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('sw-cache-timestamp', Date.now());
            headers.set('sw-cache-ttl', ttl);
            cache.put(request, new Response(cloned.body, { status: cloned.status, statusText: cloned.statusText, headers }));
            return response;
        }
    } catch {}
    const cached = await cache.match(request);
    if (cached) {
        const timestamp = cached.headers.get('sw-cache-timestamp');
        const cacheTtl = cached.headers.get('sw-cache-ttl') || ttl;
        if (timestamp && (Date.now() - parseInt(timestamp) < parseInt(cacheTtl))) return cached;
        cache.delete(request);
    }
    return new Response(JSON.stringify({ error: '离线状态下无法获取数据' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
}

async function handleFontRequest(request) {
    const cache = await caches.open(FONT_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    try {
        const response = await fetch(request);
        if (response?.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            cache.put(request, new Response(cloned.body, { status: cloned.status, statusText: cloned.statusText, headers }));
        }
        return response;
    } catch { return cachedResponse || new Response('', { status: 404 }); }
}

async function handleStaticResource(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    const response = await fetch(request);
    if (response?.status === 200 && request.method === 'GET') {
        const cloned = response.clone();
        cache.put(request, cloned);
    }
    return response;
}

async function handleOtherRequest(request) {
    try { return await fetch(request); }
    catch { return await caches.match(request) || new Response('', { status: 404 }); }
}

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin && !isFontRequest(url)) return;

    if (isFontRequest(url)) { event.respondWith(handleFontRequest(event.request)); return; }
    if (isNavigationApiRequest(url)) { event.respondWith(handleNavigationApi(event.request, event)); return; }
    if (isCacheableApiRequest(event.request)) { event.respondWith(handleCacheableApi(event.request)); return; }
    if (event.request.destination === 'document' || event.request.destination === 'script' || event.request.destination === 'style') {
        event.respondWith(handleStaticResource(event.request));
        return;
    }
    event.respondWith(handleOtherRequest(event.request));
});