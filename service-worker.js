// 星聚导航 Service Worker - 缓存导航数据与静态资源，增强 API 响应缓存
// 版本 v8（优化导航结构缓存策略：Stale-While-Revalidate + 版本比对）

const CACHE_NAME = 'starlink-v8';
const NAVIGATION_CACHE_NAME = 'starlink-nav-v8';
const API_CACHE_NAME = 'starlink-api-v8';
const FONT_CACHE_NAME = 'starlink-fonts-v8';

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

// 字体文件 URL 模式
const FONT_URL_PATTERNS = [
    'cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free',
    'cdn.jsdelivr.net/npm/katex',
    'fonts.googleapis.com'
];

// 导航 API 路径（使用 Stale-While-Revalidate 策略）
const NAV_API_PATTERNS = ['/navigation/structure'];

// 可缓存的 API（普通缓存）
const CACHED_API_PATTERNS = [
    '/navigation/sites',
    '/stats',
    '/uptime',
    '/global-submission-count',
    '/notebook'
];

const API_TTL_MAP = {
    '/navigation/sites': 5 * 60 * 1000,
    'default': 60 * 60 * 1000
};

function getApiTtl(urlPath) {
    return API_TTL_MAP[urlPath] || API_TTL_MAP.default;
}

function isFontRequest(url) {
    return FONT_URL_PATTERNS.some(pattern => url.href.includes(pattern));
}

// 安装事件
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

// 激活事件
self.addEventListener('activate', event => {
    console.log('Service Worker 激活中...');
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
});

// 判断是否为导航 API
function isNavigationApiRequest(url) {
    return NAV_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// 判断是否为可缓存 API
function isCacheableApiRequest(request) {
    if (request.method !== 'GET') return false;
    const url = new URL(request.url);
    return CACHED_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// ===== 第三步核心改动：导航 API 使用 Stale-While-Revalidate =====
async function handleNavigationApi(request, event) {
    const cache = await caches.open(NAVIGATION_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // 获取当前缓存的版本号（如果有）
    let cachedVersion = null;
    if (cachedResponse) {
        cachedVersion = cachedResponse.headers.get('X-Nav-Version');
    }

    // 发起网络请求，更新缓存（不阻塞响应）
    const fetchPromise = fetch(request).then(async response => {
        if (response && response.status === 200) {
            const cloned = response.clone();
            // 从响应头或响应体中提取版本号（这里使用响应头的 ETag 或自定义头）
            // 如果后端没有返回版本头，我们可以使用响应体内容的哈希
            const headers = new Headers(cloned.headers);
            // 生成简单版本号：使用响应内容的长度 + 最后修改时间（如果有）
            // 或者直接从响应头获取 ETag
            const etag = headers.get('ETag') || headers.get('Last-Modified') || Date.now().toString();
            headers.set('X-Nav-Version', etag);
            headers.set('X-SW-Cache-Version', CACHE_NAME);
            
            const cachedResponseWithHeaders = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            
            // 如果版本发生变化，通知所有客户端刷新
            if (cachedVersion && cachedVersion !== etag) {
                console.log('导航结构已更新，通知客户端刷新');
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'NAV_UPDATED',
                            timestamp: Date.now()
                        });
                    });
                });
            }
            
            event.waitUntil(cache.put(request, cachedResponseWithHeaders));
            return response;
        }
        return response;
    }).catch(err => {
        console.warn('导航 API 网络请求失败:', err);
        return null;
    });

    // ===== Stale-While-Revalidate 核心逻辑 =====
    // 如果有缓存，立即返回缓存（无论是否过期），同时后台更新
    if (cachedResponse) {
        // 后台更新
        event.waitUntil(fetchPromise);
        return cachedResponse;
    }
    
    // 没有缓存，等待网络请求完成
    return fetchPromise;
}

// 处理可缓存 API（网络优先，缓存后备，带 TTL）
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

// 处理字体请求（缓存优先，带跨域）
async function handleFontRequest(request) {
    const cache = await caches.open(FONT_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cloned = response.clone();
            const headers = new Headers(cloned.headers);
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            const cachedResponseWithHeaders = new Response(cloned.body, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
            });
            cache.put(request, cachedResponseWithHeaders);
        }
        return response;
    } catch (err) {
        console.warn('字体加载失败，返回缓存的版本（如果有）:', err);
        return cachedResponse || new Response('', { status: 404 });
    }
}

// 处理静态资源（缓存优先）
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

// 其他请求
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

// Fetch 事件
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin && !isFontRequest(url)) return;
    
    // 字体请求
    if (isFontRequest(url)) {
        event.respondWith(handleFontRequest(event.request));
        return;
    }
    
    // 导航 API（Stale-While-Revalidate）
    if (isNavigationApiRequest(url)) {
        event.respondWith(handleNavigationApi(event.request, event));
        return;
    }
    
    // 可缓存 API
    if (isCacheableApiRequest(event.request)) {
        event.respondWith(handleCacheableApi(event.request));
        return;
    }
    
    // 静态资源
    if (event.request.destination === 'document' || 
        event.request.destination === 'script' || 
        event.request.destination === 'style') {
        event.respondWith(handleStaticResource(event.request));
        return;
    }
    
    event.respondWith(handleOtherRequest(event.request));
});