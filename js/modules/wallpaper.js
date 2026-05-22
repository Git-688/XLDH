/**
 * 轮播图模块 - 基于官方必应 API，支持多日壁纸、预加载和降级
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

        this.init();
    }

    // 获取适合当前屏幕的图片分辨率（1920 足够，节省流量）
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
                    // 如果某一天获取失败，跳过（不中断）
                    console.warn(`第 ${i} 天壁纸获取失败，使用占位`);
                }
            } catch (err) {
                console.warn(`获取第 ${i} 天壁纸异常:`, err);
            }
        }

        if (wallpapers.length === 0) {
            // 完全失败时使用内置默认图片（项目 logo 或其他）
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
        this.preloadAdjacentImages(1);      // 预加载相邻图片
        this.goToSlide(1, false);           // 显示第一张原始壁纸（索引1）
        this.bindEvents();
        this.startAutoplay();
    }

    /**
     * 获取必应壁纸（idx=0 为今日，1 为昨日，依此类推）
     * @param {number} offset 偏移量，0=今日
     * @returns {Promise<{url: string, title: string}>}
     */
    async fetchBingWallpaper(offset = 0) {
        const resolution = this.getResolutionForWidth();
        // 官方 API 无需代理，但注意跨域问题（图片资源允许跨域）
        const apiUrl = `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=${offset}&n=1&mkt=zh-CN`;
        
        const response = await fetch(apiUrl, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (!data.images || !data.images.length) {
            throw new Error('返回数据为空');
        }
        
        const img = data.images[0];
        // 必应返回的 url 是相对路径，需要拼接完整域名，并替换分辨率
        let imgUrl = 'https://cn.bing.com' + img.url;
        // 替换为指定分辨率（默认为 1920x1080）
        imgUrl = imgUrl.replace(/&pid=.*/, '');  // 去除可能的多余参数
        // 可尝试添加分辨率参数，但多数图片本身已是高分辨率
        
        let title = img.copyright || '必应每日壁纸';
        // 去除 "必应壁纸 · " 前缀
        title = title.replace(/^必应壁纸\s*·\s*/i, '').trim();
        if (!title) title = offset === 0 ? '今日壁纸' : `${offset}天前壁纸`;
        
        return { url: imgUrl, title };
    }

    // 渲染所有幻灯片（DOM 操作）
    renderSlides() {
        if (!this.track) return;
        this.track.innerHTML = '';
        
        this.clonedSlides.forEach((slide, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'carousel-slide';
            // 先设置渐变背景，等图片加载成功后再替换
            slideDiv.style.background = this.fallbackColor;
            slideDiv.style.backgroundSize = 'cover';
            slideDiv.style.backgroundPosition = 'center';
            slideDiv.setAttribute('data-index', index);
            
            // 如果有图片 URL 且不是默认占位，则尝试加载图片
            if (slide.url && !slide.isDefault) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';   // 解决跨域问题（可选）
                img.referrerPolicy = 'no-referrer'; // 避免防盗链
                
                img.onload = () => {
                    // 图片加载成功，替换背景
                    slideDiv.style.backgroundImage = `url('${slide.url}')`;
                    slideDiv.style.backgroundSize = 'cover';
                    slideDiv.style.backgroundPosition = 'center';
                };
                img.onerror = () => {
                    console.warn(`壁纸加载失败: ${slide.url}`);
                    // 保留渐变背景
                };
                img.src = slide.url;
            }
            
            this.track.appendChild(slideDiv);
        });
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
        
        // 计算真实的原始索引（用于高亮圆点）
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
            this.track.style.transition = animate ? 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1.2)' : 'none';
            this.track.style.transform = `translateX(-${clonedIndex * 100}%)`;
        }
        
        this.currentIndex = clonedIndex;
        this.preloadAdjacentImages(clonedIndex);
        
        // 无缝循环处理：当滑动到克隆的第一张或最后一张时，瞬间跳回真实边界
        setTimeout(() => {
            this.isTransitioning = false;
            if (clonedIndex === 0) {
                // 从克隆的最后一张跳到真实最后一张
                this.track.style.transition = 'none';
                this.track.style.transform = `translateX(-${this.slides.length * 100}%)`;
                this.currentIndex = this.slides.length;
            } else if (clonedIndex === total - 1) {
                // 从克隆的第一张跳到真实第一张
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
        
        // 触摸滑动支持（移动端）
        if (this.track) {
            let startX = 0, startY = 0;
            this.track.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                this.stopAutoplay();
            });
            this.track.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = endX - startX;
                const diffY = endY - startY;
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
                    if (diffX > 0) this.prev();
                    else this.next();
                }
                this.startAutoplay();
            });
        }
        
        // 鼠标悬停时停止自动播放，离开后恢复
        const container = document.getElementById('wallpaperCarousel');
        if (container) {
            container.addEventListener('mouseenter', () => this.stopAutoplay());
            container.addEventListener('mouseleave', () => this.startAutoplay());
        }
        
        // 页面可见性变化时恢复自动播放
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.autoplayTimer === null) {
                this.startAutoplay();
            } else if (document.hidden && this.autoplayTimer) {
                this.stopAutoplay();
            }
        });
    }

    // 手动刷新（例如重新获取壁纸）
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