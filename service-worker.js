// 星聚导航 Service Worker - 缓存导航数据与静态资源，增强 API 响应缓存
// 版本 v6（移除后台版本检查，优化缓存策略）
const CACHE_NAME = 'starlink-v6';
const NAVIGATION_CACHE_NAME = 'starlink-nav-v6';
const API_CACHE_NAME = 'starlink-api-v6';

// 需要缓存的静态资源列表
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

// 需要缓存的导航 API 路径（缓存优先，用于结构）
const NAV_API_PATTERNS = [
    '/navigation/structure'
];

// 网络优先、缓存后备的 API 列表（支持 TTL 校验）
const CACHED_API_PATTERNS = [
    '/navigation/sites',          // 站点列表，TTL 5分钟
    '/stats',                     // 统计数据，TTL 1小时
    '/uptime',                    // 运行时间，TTL 1小时
    '/global-submission-count',   // 投稿总数，TTL 1小时
    '/notebook'                   // 笔记，TTL 1小时
];

// 针对不同 API 的单独 TTL（毫秒）
const API_TTL_MAP = {
    '/navigation/sites': 5 * 60 * 1000,   // 5分钟
    'default': 60 * 60 * 1000             // 默认1小时
};

function getApiTtl(urlPath) {
    return API_TTL_MAP[urlPath] || API_TTL_MAP.default;
}

// 安装事件：缓存静态资源
self.addEventListener('install', event => {
    console.log('Service Worker 安装中...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_URLS);
        }).catch(err => {
            console.error('静态资源缓存失败:', err);
        })
    );
    self.skipWaiting();
});

// 激活事件：清理旧缓存，并通知客户端更新
self.addEventListener('activate', event => {
    console.log('Service Worker 激活中...');
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME && key !== NAVIGATION_CACHE_NAME && key !== API_CACHE_NAME) {
                    console.log('删除旧缓存:', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => {
            // 通知所有客户端有新版本可用
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

// 监听来自客户端的消息
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 判断请求是否为导航 API（缓存优先）
function isNavigationApiRequest(url) {
    return NAV_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// 判断请求是否为可缓存的只读 API（网络优先，缓存后备）
function isCacheableApiRequest(request) {
    if (request.method !== 'GET') return false;
    const url = new URL(request.url);
    return CACHED_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// 处理导航 API 请求（缓存优先 + 后台更新）
async function handleNavigationApi(request, event) {
    const cache = await caches.open(NAVIGATION_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(response => {
        if (response && response.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('X-SW-Cache-Version', CACHE_NAME);
            const cachedResponseWithHeaders = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            event.waitUntil(cache.put(request, cachedResponseWithHeaders));
        }
        return response;
    }).catch(err => {
        console.warn('导航 API 网络请求失败:', err);
        return null;
    });
    
    if (cachedResponse) {
        event.waitUntil(fetchPromise);
        return cachedResponse;
    }
    return fetchPromise;
}

// 处理其他只读 API（网络优先，缓存后备，带 TTL 校验）
async function handleCacheableApi(request) {
    const url = new URL(request.url);
    const apiPath = url.pathname;
    const ttl = getApiTtl(apiPath);
    const cache = await caches.open(API_CACHE_NAME);
    
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('sw-cache-timestamp', Date.now());
            headers.set('sw-cache-ttl', ttl);
            const cachedResponse = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            cache.put(request, cachedResponse);
            return response;
        }
    } catch (err) {
        console.warn('网络请求失败，尝试从缓存获取:', err);
    }
    
    const cached = await cache.match(request);
    if (cached) {
        const timestamp = cached.headers.get('sw-cache-timestamp');
        const cacheTtl = cached.headers.get('sw-cache-ttl') || ttl;
        if (timestamp && (Date.now() - parseInt(timestamp) < parseInt(cacheTtl))) {
            return cached;
        } else {
            cache.delete(request);
        }
    }
    return new Response(JSON.stringify({ error: '离线状态下无法获取数据' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
    });
}

// 处理静态资源请求（缓存优先，无缓存则网络）
async function handleStaticResource(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    return fetch(request).then(response => {
        if (response && response.status === 200 && request.method === 'GET') {
            const cloned = response.clone();
            cache.put(request, cloned);
        }
        return response;
    });
}

// 其他请求（POST、非缓存API）使用网络优先，不缓存
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

// Fetch 事件：根据请求类型选择策略
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // 仅处理本站请求
    if (url.origin !== self.location.origin) return;
    
    if (isNavigationApiRequest(url)) {
        event.respondWith(handleNavigationApi(event.request, event));
        return;
    }
    
    if (isCacheableApiRequest(event.request)) {
        event.respondWith(handleCacheableApi(event.request));
        return;
    }
    
    // 对静态资源（文档、脚本、样式、字体）使用缓存优先
    if (event.request.destination === 'document' || 
        event.request.destination === 'script' || 
        event.request.destination === 'style' ||
        event.request.destination === 'font') {
        event.respondWith(handleStaticResource(event.request));
        return;
    }
    
    event.respondWith(handleOtherRequest(event.request));
});