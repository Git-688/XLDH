// 星聚导航 Service Worker - 缓存导航数据与静态资源
const CACHE_NAME = 'starlink-v2';
const NAVIGATION_CACHE_NAME = 'starlink-nav-v2';

// 需要缓存的静态资源列表（可选，可增加 CSS/JS 等）
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

// 需要缓存的导航 API 路径（模糊匹配）
const NAV_API_PATTERNS = [
    '/navigation/structure',
    '/navigation/sites'
];

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
                if (key !== CACHE_NAME && key !== NAVIGATION_CACHE_NAME) {
                    console.log('删除旧缓存:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// 判断请求是否为导航 API（需要单独处理）
function isNavigationApiRequest(url) {
    return NAV_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
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
        event.waitUntil(fetchPromise); // 后台更新
        return cachedResponse;
    }
    // 无缓存则等待网络响应
    return fetchPromise;
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

// 其他请求（如其他 API）使用网络优先
async function handleOtherRequest(request) {
    try {
        const response = await fetch(request);
        // 对于安全检测等 POST 请求不缓存
        if (request.method === 'GET' && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // 网络失败时尝试从缓存获取
        const cached = await caches.match(request);
        if (cached) return cached;
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
    
    // 静态资源（CSS/JS/HTML）使用缓存优先
    if (event.request.destination === 'document' || 
        event.request.destination === 'script' || 
        event.request.destination === 'style') {
        event.respondWith(handleStaticResource(event.request));
        return;
    }
    
    // 其他同源请求使用网络优先（如 /click, /report-dead-link 等）
    event.respondWith(handleOtherRequest(event.request));
});