/**
 * 轮播图模块 - 性能优化版（延迟加载非首屏壁纸）
 * 功能：7天必应壁纸轮播、自动切换、箭头导航、标题显示、预加载相邻图片
 */
class CarouselModule {
    constructor() {
        this.currentIndex = 1;
        this.slides = [];
        this.clonedSlides = [];
        this.autoplayTimer = null;
        this.track = null;
        this.dotsContainer = null;
        this.infoTitle = null;
        this.isTransitioning = false;
        this.autoPlayInterval = 5000;
        this.preloadCache = new Set(); // 已预加载的图片URL集合
        this.init();
    }

    getResolutionForWidth() {
        // 可根据屏幕宽度选择分辨率（保持原逻辑）
        return 1920;
    }

    async init() {
        const days = 7;
        const bingImages = [];
        const resolution = this.getResolutionForWidth();

        // 获取7天必应壁纸
        for (let i = 0; i < days; i++) {
            try {
                const url = `https://bing.biturl.top/?resolution=${resolution}&format=json&index=${i}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        let title = data.copyright ? data.copyright : '';
                        title = title.replace(/^必应壁纸\s*·\s*/i, '').trim();
                        if (!title) title = i === 0 ? '今日壁纸' : `${i}天前壁纸`;
                        bingImages.push({ url: data.url, title: title });
                    }
                }
            } catch (e) {
                console.warn(`获取第${i}天壁纸失败`);
            }
        }

        if (bingImages.length === 0) {
            // 降级：使用默认背景
            bingImages.push({ url: '', title: '星聚导航' });
        }

        this.slides = bingImages;

        // 构建克隆数组用于无缝循环
        if (this.slides.length > 1) {
            this.clonedSlides = [
                { ...this.slides[this.slides.length - 1], clone: 'last' },
                ...this.slides,
                { ...this.slides[0], clone: 'first' }
            ];
        } else {
            this.clonedSlides = [...this.slides];
        }

        this.track = document.getElementById('carouselTrack');
        this.dotsContainer = document.getElementById('carouselDots');
        this.infoTitle = document.getElementById('wallpaperTitle');
        this.arrowLeft = document.getElementById('carouselArrowLeft');
        this.arrowRight = document.getElementById('carouselArrowRight');

        if (!this.track) return;

        this.renderSlides();      // 渲染所有幻灯片（占位/预加载第一张）
        this.renderDots();        // 渲染圆点
        this.preloadImage(1);     // 只预加载当前显示的图片（索引1）
        this.goToSlide(1, false); // 跳转到当前（不带动画）
        this.bindEvents();
        this.startAutoplay();
    }

    /**
     * 预加载指定索引的图片
     * @param {number} clonedIndex 克隆数组索引
     */
    preloadImage(clonedIndex) {
        const slide = this.clonedSlides[clonedIndex];
        if (slide && slide.url && !this.preloadCache.has(slide.url)) {
            const img = new Image();
            img.onload = () => {
                this.preloadCache.add(slide.url);
            };
            img.onerror = () => {
                // 加载失败不影响
            };
            img.src = slide.url;
        }
    }

    renderSlides() {
        if (!this.track) return;
        this.track.innerHTML = '';

        this.clonedSlides.forEach((slide, index) => {
            const div = document.createElement('div');
            div.className = 'carousel-slide';
            // 初始背景为渐变色（兜底）
            div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            div.style.backgroundSize = 'cover';
            div.style.backgroundPosition = 'center';

            // 仅对当前显示的图片（索引1）直接加载背景，其他先不加载（延迟加载）
            if (index === 1 && slide.url) {
                const img = new Image();
                img.onload = () => {
                    div.style.background = `url('${slide.url}') center/cover no-repeat`;
                };
                img.src = slide.url;
            } else if (slide.url) {
                // 存储 data-bg，待后续切换时加载
                div.setAttribute('data-bg', slide.url);
            }

            div.setAttribute('data-index', index);
            this.track.appendChild(div);
        });
    }

    renderDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';
        this.slides.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.className = 'carousel-dot';
            dot.setAttribute('data-index', index);
            dot.addEventListener('click', () => {
                this.goToSlide(index + 1, true);
                this.resetAutoplay();
            });
            this.dotsContainer.appendChild(dot);
        });
    }

    /**
     * 切换到指定克隆索引的幻灯片
     * @param {number} clonedIndex 克隆数组索引
     * @param {boolean} animate 是否带动画
     */
    goToSlide(clonedIndex, animate = true) {
        if (this.isTransitioning) return;
        const total = this.clonedSlides.length;
        if (clonedIndex < 0 || clonedIndex >= total) return;

        this.isTransitioning = true;

        // 预加载相邻两张图片（当前索引前后）
        const prev = (clonedIndex - 1 + total) % total;
        const next = (clonedIndex + 1) % total;
        this.preloadImage(prev);
        this.preloadImage(next);

        // 更新当前幻灯片的背景（若尚未加载）
        const currentSlideDiv = this.track.children[clonedIndex];
        if (currentSlideDiv && currentSlideDiv.getAttribute('data-bg')) {
            const bgUrl = currentSlideDiv.getAttribute('data-bg');
            if (bgUrl) {
                const img = new Image();
                img.onload = () => {
                    currentSlideDiv.style.background = `url('${bgUrl}') center/cover no-repeat`;
                    currentSlideDiv.removeAttribute('data-bg');
                };
                img.src = bgUrl;
            }
        }

        // 计算真实索引（用于圆点激活）
        let realIndex = clonedIndex;
        if (clonedIndex === 0) realIndex = this.slides.length - 1;
        else if (clonedIndex === total - 1) realIndex = 0;
        else realIndex = clonedIndex - 1;

        // 更新圆点激活状态
        const dots = this.dotsContainer ? this.dotsContainer.querySelectorAll('.carousel-dot') : [];
        dots.forEach((dot, i) => dot.classList.toggle('active', i === realIndex));

        // 更新标题
        const title = this.clonedSlides[clonedIndex].title || '';
        if (this.infoTitle) this.infoTitle.textContent = title;

        // 移动轨道
        if (this.track) {
            this.track.style.transition = animate ? 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1.2)' : 'none';
            this.track.style.transform = `translateX(-${clonedIndex * 100}%)`;
        }

        this.currentIndex = clonedIndex;

        // 动画结束后处理无缝循环
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

        // 鼠标悬停暂停自动播放
        const container = document.getElementById('wallpaperCarousel');
        if (container) {
            container.addEventListener('mouseenter', () => this.stopAutoplay());
            container.addEventListener('mouseleave', () => this.startAutoplay());
        }
    }

    async refresh() {
        this.stopAutoplay();
        await this.init();
        this.startAutoplay();
    }
}

// 确保在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!window.carouselModule) {
        window.carouselModule = new CarouselModule();
    }
});