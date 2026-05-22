/**
 * 轮播图模块 - 基于官方必应 API，支持多日壁纸、预加载和降级
 * 修复：必应API跨域问题（使用JSONP替代fetch）
 * 增强：图片重试加载、响应式分辨率、触摸滑动优化、窗口大小适配
 */
class CarouselModule {
    constructor() {
        this.currentIndex = 1;          // 当前显示在轨道中的克隆索引
        this.slides = [];               // 原始壁纸列表（不包含克隆）
        this.clonedSlides = [];         // 克隆后的列表（首尾各加一份）
        this.track = null;
        this.dotsContainer = null;
        this.infoTitle = null;
        this.arrowLeft = null;
        this.arrowRight = null;
        this.isTransitioning = false;
        this.autoplayTimer = null;
        this.autoPlayInterval = 5000;   // 5秒自动切换
        this.preloadCache = new Set();   // 已预加载的 URL
        this.maxRetries = 2;             // 每张图片最大重试次数
        this.fallbackColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        this.currentResolution = this.getResolutionForWidth(); // 当前屏幕分辨率

        this.init();
    }

    // 获取适合当前屏幕的图片分辨率
    getResolutionForWidth() {
        const width = window.innerWidth;
        if (width <= 768) return 768;
        if (width <= 1280) return 1280;
        return 1920;
    }

    async init() {
        // 获取最近 7 天的必应壁纸
        const days = 7;
        const wallpapers = [];

        for (let i = 0; i < days; i++) {
            try {
                const imgData = await this.fetchBingWallpaper(i);
                if (imgData && imgData.url) {
                    wallpapers.push(imgData);
                } else {
                    console.warn(`第 ${i} 天壁纸获取失败，跳过`);
                }
            } catch (err) {
                console.warn(`获取第 ${i} 天壁纸异常:`, err);
            }
        }

        if (wallpapers.length === 0) {
            console.error('所有必应壁纸获取失败，使用默认渐变');
            this.slides = [{ url: '', title: '星聚导航', isDefault: true }];
        } else {
            this.slides = wallpapers;
        }

        // 构建克隆列表（用于无缝循环）
        if (this.slides.length > 1) {
            this.clonedSlides = [
                { ...this.slides[this.slides.length - 1], clone: 'last' },
                ...this.slides,
                { ...this.slides[0], clone: 'first' }
            ];
        } else {
            this.clonedSlides = [...this.slides];
        }

        // 获取 DOM 元素
        this.track = document.getElementById('carouselTrack');
        this.dotsContainer = document.getElementById('carouselDots');
        this.infoTitle = document.getElementById('wallpaperTitle');
        this.arrowLeft = document.getElementById('carouselArrowLeft');
        this.arrowRight = document.getElementById('carouselArrowRight');

        if (!this.track) {
            console.error('找不到轮播图轨道元素');
            return;
        }

        this.renderSlides();
        this.renderDots();
        this.preloadAdjacentImages(1);
        this.goToSlide(1, false);
        this.bindEvents();
        this.startAutoplay();
    }

    /**
     * 获取必应壁纸（使用JSONP解决跨域问题）
     * @param {number} offset 偏移量，0=今日
     * @returns {Promise<{url: string, title: string}>}
     */
    fetchBingWallpaper(offset = 0) {
        return new Promise((resolve, reject) => {
            const resolution = this.currentResolution;
            const callbackName = `bingWallpaperCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            
            // 必应API支持JSONP，通过callback参数实现
            const apiUrl = `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=${offset}&n=1&mkt=zh-CN&callback=${callbackName}`;
            
            // 创建script标签
            const script = document.createElement('script');
            script.src = apiUrl;
            script.async = true;
            
            // 定义全局回调函数
            window[callbackName] = (data) => {
                try {
                    if (!data.images || !data.images.length) {
                        reject(new Error('返回数据为空'));
                        return;
                    }
                    
                    const img = data.images[0];
                    // 构建完整图片URL并替换为指定分辨率
                    let imgUrl = `https://cn.bing.com${img.urlbase}_${resolution}x1080.jpg`;
                    
                    let title = img.copyright || '必应每日壁纸';
                    title = title.replace(/^必应壁纸\s*·\s*/i, '').trim();
                    if (!title) title = offset === 0 ? '今日壁纸' : `${offset}天前壁纸`;
                    
                    resolve({ url: imgUrl, title });
                } catch (err) {
                    reject(err);
                } finally {
                    // 清理全局函数和script标签
                    delete window[callbackName];
                    document.body.removeChild(script);
                }
            };
            
            // 处理加载失败
            script.onerror = () => {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('API请求失败'));
            };
            
            document.body.appendChild(script);
        });
    }

    // 渲染所有幻灯片（带图片重试加载）
    renderSlides() {
        if (!this.track) return;
        this.track.innerHTML = '';
        
        this.clonedSlides.forEach((slide, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'carousel-slide';
            slideDiv.style.background = this.fallbackColor;
            slideDiv.style.backgroundSize = 'cover';
            slideDiv.style.backgroundPosition = 'center';
            slideDiv.setAttribute('data-index', index);
            
            if (slide.url && !slide.isDefault) {
                this.loadImageWithRetry(slide.url, slideDiv, 0);
            }
            
            this.track.appendChild(slideDiv);
        });
    }

    // 带重试机制的图片加载
    loadImageWithRetry(url, slideDiv, retryCount) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.referrerPolicy = 'no-referrer';
        
        img.onload = () => {
            slideDiv.style.backgroundImage = `url('${url}')`;
            this.preloadCache.add(url);
        };
        
        img.onerror = () => {
            if (retryCount < this.maxRetries) {
                console.warn(`壁纸加载失败，重试 ${retryCount + 1}/${this.maxRetries}: ${url}`);
                setTimeout(() => {
                    this.loadImageWithRetry(url, slideDiv, retryCount + 1);
                }, 1000 * (retryCount + 1)); // 指数退避
            } else {
                console.error(`壁纸最终加载失败: ${url}`);
            }
        };
        
        img.src = url;
    }

    // 渲染圆点指示器
    renderDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';
        this.slides.forEach((_, idx) => {
            const dot = document.createElement('span');
            dot.className = 'carousel-dot';
            dot.setAttribute('data-index', idx);
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                this.goToSlide(idx + 1, true);
                this.resetAutoplay();
            });
            this.dotsContainer.appendChild(dot);
        });
    }

    // 预加载相邻图片（当前克隆索引的前一张和后一张）
    preloadAdjacentImages(currentCloneIndex) {
        const total = this.clonedSlides.length;
        const prevClone = (currentCloneIndex - 1 + total) % total;
        const nextClone = (currentCloneIndex + 1) % total;
        const indices = [prevClone, nextClone];
        
        indices.forEach(idx => {
            const slide = this.clonedSlides[idx];
            if (slide.url && !this.preloadCache.has(slide.url) && !slide.isDefault) {
                const img = new Image();
                img.onload = () => this.preloadCache.add(slide.url);
                img.onerror = () => {};
                img.src = slide.url;
            }
        });
    }

    // 切换到指定克隆索引
    goToSlide(clonedIndex, animate = true) {
        if (this.isTransitioning) return;
        const total = this.clonedSlides.length;
        if (clonedIndex < 0 || clonedIndex >= total) return;
        
        this.isTransitioning = true;
        
        // 计算真实的原始索引
        let realIndex = clonedIndex;
        if (clonedIndex === 0) realIndex = this.slides.length - 1;
        else if (clonedIndex === total - 1) realIndex = 0;
        else realIndex = clonedIndex - 1;
        
        // 更新圆点高亮
        const dots = this.dotsContainer ? this.dotsContainer.querySelectorAll('.carousel-dot') : [];
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === realIndex);
        });
        
        // 更新标题
        const title = this.clonedSlides[clonedIndex].title || '';
        if (this.infoTitle) this.infoTitle.textContent = title;
        
        // 执行滑动
        if (this.track) {
            this.track.style.transition = animate ? 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none';
            this.track.style.transform = `translateX(-${clonedIndex * 100}%)`;
        }
        
        this.currentIndex = clonedIndex;
        this.preloadAdjacentImages(clonedIndex);
        
        // 无缝循环处理
        setTimeout(() => {
            this.isTransitioning = false;
            if (clonedIndex === 0) {
                this.track.style.transition = 'none';
                this.track.style.transform = `translateX(-${this.slides.length * 100}%)`;
                this.currentIndex = this.slides.length;
            } else if (clonedIndex === total - 1) {
                this.track.style.transition = 'none';
                this.track.style.transform = `translateX(-100%)`;
                this.currentIndex = 1;
            }
        }, animate ? 500 : 0);
    }

    next() {
        const total = this.clonedSlides.length;
        const nextIndex = (this.currentIndex + 1) % total;
        this.goToSlide(nextIndex, true);
    }

    prev() {
        const total = this.clonedSlides.length;
        const prevIndex = (this.currentIndex - 1 + total) % total;
        this.goToSlide(prevIndex, true);
    }

    startAutoplay() {
        this.stopAutoplay();
        this.autoplayTimer = setInterval(() => this.next(), this.autoPlayInterval);
    }

    stopAutoplay() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    }

    resetAutoplay() {
        this.stopAutoplay();
        this.startAutoplay();
    }

    bindEvents() {
        if (this.arrowLeft) {
            this.arrowLeft.addEventListener('click', () => {
                this.prev();
                this.resetAutoplay();
            });
        }
        if (this.arrowRight) {
            this.arrowRight.addEventListener('click', () => {
                this.next();
                this.resetAutoplay();
            });
        }
        
        // 优化触摸滑动支持（增加touchmove防止误触）
        if (this.track) {
            let startX = 0, startY = 0, isDragging = false;
            
            this.track.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isDragging = true;
                this.stopAutoplay();
            }, { passive: true });
            
            this.track.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const diffX = e.touches[0].clientX - startX;
                const diffY = e.touches[0].clientY - startY;
                
                // 垂直滑动超过一定距离，判定为页面滚动，取消轮播滑动
                if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 30) {
                    isDragging = false;
                }
            }, { passive: true });
            
            this.track.addEventListener('touchend', (e) => {
                if (!isDragging) return;
                isDragging = false;
                
                const endX = e.changedTouches[0].clientX;
                const diffX = endX - startX;
                
                if (Math.abs(diffX) > 40) {
                    if (diffX > 0) this.prev();
                    else this.next();
                }
                this.startAutoplay();
            });
        }
        
        // 鼠标悬停时停止自动播放
        const container = document.getElementById('wallpaperCarousel');
        if (container) {
            container.addEventListener('mouseenter', () => this.stopAutoplay());
            container.addEventListener('mouseleave', () => this.startAutoplay());
        }
        
        // 页面可见性变化时控制自动播放
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoplay();
            } else {
                this.startAutoplay();
            }
        });
        
        // 窗口大小变化时重新加载合适分辨率的壁纸
        window.addEventListener('resize', this.debounce(() => {
            const newResolution = this.getResolutionForWidth();
            if (newResolution !== this.currentResolution) {
                this.currentResolution = newResolution;
                this.preloadCache.clear(); // 清空缓存，重新加载高分辨率图片
                this.refresh();
            }
        }, 300));
    }

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 手动刷新
    async refresh() {
        this.stopAutoplay();
        await this.init();
        this.startAutoplay();
    }
}

// 页面加载完成后自动初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!window.carouselModule) {
        window.carouselModule = new CarouselModule();
    }
});
