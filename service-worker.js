// 星聚导航 Service Worker - 缓存导航数据与静态资源，增强 API 响应缓存
const CACHE_NAME = 'starlink-v3';
const NAVIGATION_CACHE_NAME = 'starlink-nav-v3';
const API_CACHE_NAME = 'starlink-api-v3';

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
    '/js/api.js',
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

// 需要缓存的导航 API 路径（模糊匹配，缓存优先）
const NAV_API_PATTERNS = [
    '/navigation/structure',
    '/navigation/sites'
];

// 需要缓存的其他只读 API（网络优先，缓存后备，限制 TTL）
const CACHED_API_PATTERNS = [
    '/stats',
    '/uptime',
    '/global-submission-count',
    '/notebook'
];
const API_CACHE_TTL = 5 * 60 * 1000; // 5 分钟

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

// 激活事件：清理旧缓存
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
        })
    );
    self.clients.claim();
});

// 判断请求是否为导航 API
function isNavigationApiRequest(url) {
    return NAV_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// 判断请求是否为可缓存的只读 API
function isCacheableApiRequest(url) {
    if (url.method !== 'GET') return false;
    return CACHED_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// 处理导航 API 请求（缓存优先 + 后台更新）
async function handleNavigationApi(request, event) {
    const cache = await caches.open(NAVIGATION_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // 发起网络请求并更新缓存（不等待）
    const fetchPromise = fetch(request).then(response => {
        if (response && response.status === 200) {
            const cloned = response.clone();
            event.waitUntil(cache.put(request, cloned));
        }
        return response;
    }).catch(err => {
        console.warn('导航 API 网络请求失败:', err);
        return null;
    });
    
    // 如果有缓存，立即返回缓存，后台更新
    if (cachedResponse) {
        event.waitUntil(fetchPromise);
        return cachedResponse;
    }
    // 无缓存则等待网络响应
    return fetchPromise;
}

// 处理其他只读 API（网络优先，缓存后备，带 TTL 校验）
async function handleCacheableApi(request) {
    const cache = await caches.open(API_CACHE_NAME);
    // 尝试网络请求
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            // 缓存响应并记录时间戳
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('sw-cache-timestamp', Date.now());
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
    // 网络失败，尝试从缓存获取
    const cached = await cache.match(request);
    if (cached) {
        const timestamp = cached.headers.get('sw-cache-timestamp');
        if (timestamp && (Date.now() - parseInt(timestamp) < API_CACHE_TTL)) {
            return cached;
        } else {
            // 缓存过期，删除
            cache.delete(request);
        }
    }
    // 无缓存或缓存过期，返回错误响应
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
        // 对于 GET 请求且成功，可选择性缓存（但这里不缓存）
        return response;
    } catch (err) {
        // 网络失败时尝试从缓存获取（仅限 GET）
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
    // 只处理同源请求，避免 CDN 等跨域资源
    if (url.origin !== self.location.origin) return;
    
    // 导航 API 使用缓存优先 + 后台更新
    if (isNavigationApiRequest(url)) {
        event.respondWith(handleNavigationApi(event.request, event));
        return;
    }
    
    // 可缓存的只读 API（统计、笔记等）使用网络优先，缓存后备
    if (isCacheableApiRequest(event.request)) {
        event.respondWith(handleCacheableApi(event.request));
        return;
    }
    
    // 静态资源（CSS/JS/HTML）使用缓存优先
    if (event.request.destination === 'document' || 
        event.request.destination === 'script' || 
        event.request.destination === 'style') {
        event.respondWith(handleStaticResource(event.request));
        return;
    }
    
    // 其他同源请求（如 POST /click, /report-dead-link）使用网络优先
    event.respondWith(handleOtherRequest(event.request));
});