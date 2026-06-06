// 星聚导航 Service Worker - 缓存导航数据与静态资源，增强 API 响应缓存
const CACHE_NAME = 'starlink-v4';  // 版本号升级
const NAVIGATION_CACHE_NAME = 'starlink-nav-v4';
const API_CACHE_NAME = 'starlink-api-v4';

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
const API_CACHE_TTL = 60 * 60 * 1000; // 1 小时

// 版本更新检测：每隔一段时间检查新版本
let versionCheckInterval = null;
const VERSION_CHECK_INTERVAL = 60 * 60 * 1000; // 1小时

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

// 判断请求是否为导航 API
function isNavigationApiRequest(url) {
    return NAV_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// 判断请求是否为可缓存的只读 API
function isCacheableApiRequest(request) {
    if (request.method !== 'GET') return false;
    const url = new URL(request.url);
    return CACHED_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// 处理导航 API 请求（缓存优先 + 后台更新，增加版本头）
async function handleNavigationApi(request, event) {
    const cache = await caches.open(NAVIGATION_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // 发起网络请求并更新缓存（不等待）
    const fetchPromise = fetch(request).then(response => {
        if (response && response.status === 200) {
            // 添加自定义版本头，便于调试
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
    const cache = await caches.open(API_CACHE_NAME);
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
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
    const cached = await cache.match(request);
    if (cached) {
        const timestamp = cached.headers.get('sw-cache-timestamp');
        if (timestamp && (Date.now() - parseInt(timestamp) < API_CACHE_TTL)) {
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
    if (url.origin !== self.location.origin) return;
    
    if (isNavigationApiRequest(url)) {
        event.respondWith(handleNavigationApi(event.request, event));
        return;
    }
    
    if (isCacheableApiRequest(event.request)) {
        event.respondWith(handleCacheableApi(event.request));
        return;
    }
    
    if (event.request.destination === 'document' || 
        event.request.destination === 'script' || 
        event.request.destination === 'style') {
        event.respondWith(handleStaticResource(event.request));
        return;
    }
    
    event.respondWith(handleOtherRequest(event.request));
});

// 后台版本检查（可选，用于主动通知）
self.addEventListener('activate', () => {
    if (versionCheckInterval) clearInterval(versionCheckInterval);
    versionCheckInterval = setInterval(() => {
        // 请求一个带有版本号的资源，如果失败则提示用户刷新
        fetch('/?sw-version-check=' + Date.now(), { cache: 'no-store' }).catch(() => {
            // 如果网络请求失败，不处理
        });
    }, VERSION_CHECK_INTERVAL);
});