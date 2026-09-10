/* sw.js - Service Worker（离线缓存） */
const CACHE_VERSION = 'v20260910';
const STATIC_CACHE = `starlink-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `starlink-runtime-${CACHE_VERSION}`;
const API_CACHE = `starlink-api-${CACHE_VERSION}`;

// 使用原有的文件路径
const PRECACHE_URLS = [
    './',
    './index.html',
    './css/style.css?v=20260910',
    './css/modules/navbar.css?v=20260910',
    './css/modules/navigation.css?v=20260910',
    './css/modules/sidebar.css?v=20260910',
    './css/modules/greeting.css?v=20260910',
    './css/modules/stats.css?v=20260910',
    './css/modules/compact-tags.css?v=20260910',
    './css/responsive.css?v=20260910',
    './js/constants.js?v=20260910',
    './js/utils.js?v=20260910',
    './js/error-handler.js?v=20260910',
    './js/toast.js?v=20260910',
    './js/storage.js?v=20260910',
    './js/main.js?v=20260910',
    './js/modules/navigation.js?v=20260910',
    './assets/logo.png',
    './assets/logo.webp'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(PRECACHE_URLS).catch(err => {
                console.warn('预缓存部分失败:', err);
            }))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => !name.endsWith(CACHE_VERSION))
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // 不缓存 API 写操作
    if (url.pathname.startsWith('/admin/') ||
        url.pathname === '/click' ||
        url.pathname === '/visit' ||
        url.pathname === '/heartbeat' ||
        url.pathname === '/csp-report') {
        return;
    }

    // API 请求：网络优先，失败用缓存
    if (url.pathname.startsWith('/navigation/') ||
        url.pathname === '/stats' ||
        url.pathname === '/uptime' ||
        url.pathname === '/total-sites-count' ||
        url.pathname === '/init' ||
        url.pathname === '/batch-icons') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(API_CACHE).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then(cached => cached || new Response(
                    JSON.stringify({ offline: true, error: '离线模式' }),
                    { headers: { 'Content-Type': 'application/json' } }
                )))
        );
        return;
    }

    // 静态资源：缓存优先
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) {
                fetch(request).then(response => {
                    if (response.ok) {
                        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response));
                    }
                }).catch(() => {});
                return cached;
            }
            return fetch(request).then(response => {
                if (response.ok && url.origin === location.origin) {
                    const clone = response.clone();
                    caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});