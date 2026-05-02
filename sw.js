// Service Worker for 星聚导航 - 缓存静态资源和导航 API
const CACHE_NAME = 'xjdh-v1';
const NAVIGATION_PATH = '/navigation';

// 预缓存核心静态资源（根据你的实际文件列表调整）
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/modules/navbar.css',
  '/css/modules/sidebar.css',
  '/css/modules/navigation.css',
  '/css/modules/wallpaper.css',
  '/css/modules/greeting.css',
  '/css/modules/stats.css',
  '/css/modules/compact-tags.css',
  '/css/modules/search.css',
  '/css/modules/weather.css',
  '/css/modules/announcement.css',
  '/css/modules/about.css',
  '/css/responsive.css',
  '/css/xfyy1/music-player.css',
  '/js/main.js',
  '/js/api.js',
  '/js/navigation.js',
  '/js/stats.js',
  '/js/modules/wallpaper.js',
  '/js/modules/greeting.js',
  '/js/modules/compact-tags.js',
  '/js/modules/search.js',
  '/js/modules/weather.js',
  '/js/modules/announcement.js',
  '/js/modules/about.js',
  '/js/xfyy/utils.js',
  '/js/xfyy/cache-manager.js',
  '/js/xfyy/music-player.js',
  '/js/xfyy/plugin-manager.js',
  '/js/xfyy/music-main.js',
  '/data/navigation-snapshot.json',
  '/assets/logo.png',
  // 可根据需要添加其他字体、图标等
];

// 安装事件：预缓存静态文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 正在预缓存静态资源');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.error('[SW] 预缓存失败:', err);
        // 不阻塞安装
      });
    }).then(() => self.skipWaiting())
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：缓存策略
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 导航 API 使用 Network First，失败时使用缓存，同时更新缓存
  if (url.pathname === NAVIGATION_PATH) {
    event.respondWith(networkFirstWithCacheUpdate(event.request));
    return;
  }

  // 静态资源优先使用缓存，网络不可用时回退
  event.respondWith(cacheFirstWithNetworkFallback(event.request));
});

// 网络优先，失败时回退缓存，并更新缓存
async function networkFirstWithCacheUpdate(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    // 更新缓存（不阻塞响应）
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response(JSON.stringify({ error: 'network error' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 缓存优先，失败时网络请求
async function cacheFirstWithNetworkFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 如果请求的是 HTML 页面，返回离线缓存页（可以是简单的提示）
    if (request.headers.get('Accept')?.includes('text/html')) {
      return cache.match('/index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}