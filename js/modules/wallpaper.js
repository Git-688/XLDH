
class CarouselModule {
    constructor() {
        if (window.Starlink && window.Starlink.carousel) return window.Starlink.carousel;

        this.currentIndex = 1;
        this.slides = [];
        this.clonedSlides = [];
        this.autoplayTimer = null;
        this.track = null;
        this.dotsContainer = null;
        this.infoTitle = null;
        this.isTransitioning = false;
        this.autoPlayInterval = 5000;
        this.preloadCache = new Set();
        this.activePreloads = new Map();
        this.maxConcurrentPreloads = 3;
        this.preloadQueue = [];
        this.idlePreloadQueue = [];
        this.slideWidth = 0;

        // ===== 新增：事件绑定状态 + 生命周期标志 + 定时器引用 =====
        this._eventsBound = false;
        this._destroyed = false;
        this._boundResizeHandler = null;
        this._boundArrowLeftClick = null;
        this._boundArrowRightClick = null;
        this._boundTrackTouchStart = null;
        this._boundTrackTouchEnd = null;
        this._boundContainerMouseEnter = null;
        this._boundContainerMouseLeave = null;
        this._idleTimer = null;
        this._idleRetryTimer = null;

        this.init();

        if (window.Starlink) window.Starlink.carousel = this;
        window.carouselModule = this;
    }

    getResolution() {
        return 1920;
    }

    sanitizeImageUrl(url) {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        if (url.startsWith('//')) {
            return 'https:' + url;
        }
        if (url.startsWith('/')) {
            return 'https://cn.bing.com' + url;
        }
        return url;
    }

    preloadSingleImage(imageUrl) {
        if (!imageUrl) return Promise.resolve(false);
        if (this.preloadCache.has(imageUrl)) return Promise.resolve(true);
        if (this.activePreloads.has(imageUrl)) return this.activePreloads.get(imageUrl);

        const loadPromise = new Promise((resolve) => {
            const img = new Image();
            const timeoutId = setTimeout(() => {
                img.onload = null;
                img.onerror = null;
                resolve(false);
            }, 5000);
            img.onload = () => {
                clearTimeout(timeoutId);
                this.preloadCache.add(imageUrl);
                this.activePreloads.delete(imageUrl);
                resolve(true);
            };
            img.onerror = () => {
                clearTimeout(timeoutId);
                this.activePreloads.delete(imageUrl);
                resolve(false);
            };
            img.src = imageUrl;
        });
        this.activePreloads.set(imageUrl, loadPromise);
        return loadPromise;
    }

    preloadImage(clonedIndex, priority = 'normal') {
        const slide = this.clonedSlides[clonedIndex];
        if (!slide || !slide.url) return Promise.resolve(false);
        const imageUrl = this.sanitizeImageUrl(slide.url);
        if (!imageUrl || this.preloadCache.has(imageUrl)) return Promise.resolve(true);

        const task = () => this.preloadSingleImage(imageUrl);

        return new Promise((resolve) => {
            if (this.activePreloads.size >= this.maxConcurrentPreloads) {
                if (priority === 'high') {
                    this.preloadQueue.unshift({ task, resolve });
                } else {
                    this.preloadQueue.push({ task, resolve });
                }
            } else {
                task().then(result => {
                    resolve(result);
                    if (this.preloadQueue.length > 0) {
                        const next = this.preloadQueue.shift();
                        next.task().then(r => next.resolve(r));
                    }
                });
            }
        });
    }

    preloadNearbySlides(currentIndex, count = 2) {
        const total = this.clonedSlides.length;
        const indices = new Set();
        for (let i = 1; i <= count; i++) {
            indices.add((currentIndex + i) % total);
            indices.add((currentIndex - i + total) % total);
        }
        indices.forEach(idx => {
            this.preloadImage(idx, 'normal');
        });
    }

    preloadAllIdle() {
        if (this._destroyed) return;
        if (this.idlePreloadQueue.length > 0) return;
        const allIndices = Array.from({ length: this.clonedSlides.length }, (_, i) => i);
        const toPreload = allIndices.filter(idx => {
            const slide = this.clonedSlides[idx];
            if (!slide || !slide.url) return false;
            const url = this.sanitizeImageUrl(slide.url);
            return url && !this.preloadCache.has(url) && !this.activePreloads.has(url);
        });
        const total = this.clonedSlides.length;
        toPreload.sort((a, b) => {
            const distA = Math.min(Math.abs(a - this.currentIndex), total - Math.abs(a - this.currentIndex));
            const distB = Math.min(Math.abs(b - this.currentIndex), total - Math.abs(b - this.currentIndex));
            return distA - distB;
        });
        for (const idx of toPreload) {
            this.idlePreloadQueue.push(() => this.preloadImage(idx, 'low'));
        }
        const processIdle = () => {
            // ===== 修复：销毁后终止递归 =====
            if (this._destroyed) return;
            if (this.idlePreloadQueue.length === 0) return;
            if (this.activePreloads.size >= this.maxConcurrentPreloads) {
                this._idleRetryTimer = setTimeout(processIdle, 500);
                return;
            }
            const nextTask = this.idlePreloadQueue.shift();
            if (nextTask) {
                Promise.resolve(nextTask()).finally(() => {
                    if (this._destroyed) return;
                    if (this.idlePreloadQueue.length > 0) {
                        this._idleTimer = setTimeout(processIdle, 100);
                    }
                });
            }
        };
        if (window.requestIdleCallback) {
            this._idleTimer = requestIdleCallback(processIdle, { timeout: 5000 });
        } else {
            this._idleTimer = setTimeout(processIdle, 2000);
        }
    }

    updateSlideWidth() {
        if (this.track) {
            this.slideWidth = this.track.clientWidth;
        }
    }

    async init() {
        // ===== 每次 init 重置销毁标志（refresh 复用场景） =====
        this._destroyed = false;

        const days = 7;
        const bingImages = [];
        const resolution = this.getResolution();

        for (let i = 0; i < days; i++) {
            try {
                const url = `https://bing.biturl.top/?resolution=${resolution}&format=json&index=${i}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        let imageUrl = this.sanitizeImageUrl(data.url);
                        let title = data.copyright ? data.copyright : '';
                        title = title.replace(/^必应壁纸\s*·\s*/i, '').trim();
                        if (!title) title = i === 0 ? '今日壁纸' : `${i}天前壁纸`;
                        bingImages.push({ url: imageUrl, title: title });
                    }
                }
            } catch (e) {
                // 静默处理获取失败
            }
        }

        if (bingImages.length === 0) {
            bingImages.push({ url: '', title: '星聚导航' });
        }

        this.slides = bingImages;

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

        this.updateSlideWidth();

        this.renderSlides();
        this.renderDots();
        this.preloadImage(1, 'high');
        this.preloadNearbySlides(1, 3);
        this.goToSlide(1, false);
        this.bindEvents();
        this.startAutoplay();

        // ===== 修复：idle 定时器用实例引用，便于销毁时清理 =====
        this._idleTimer = setTimeout(() => this.preloadAllIdle(), 3000);
    }

    renderSlides() {
        if (!this.track) return;
        this.track.innerHTML = '';

        this.clonedSlides.forEach((slide, index) => {
            const div = document.createElement('div');
            div.className = 'carousel-slide';
            if (index === 1 && slide.url) {
                const imageUrl = this.sanitizeImageUrl(slide.url);
                if (imageUrl) {
                    div.style.backgroundImage = `url('${imageUrl}')`;
                }
            } else if (slide.url) {
                div.dataset.bg = this.sanitizeImageUrl(slide.url);
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

    goToSlide(clonedIndex, animate = true) {
        if (this.isTransitioning) return;
        const total = this.clonedSlides.length;
        if (clonedIndex < 0 || clonedIndex >= total) return;

        this.isTransitioning = true;
        this.preloadNearbySlides(clonedIndex, 3);

        this.updateSlideWidth();

        const targetSlide = this.track.children[clonedIndex];
        if (targetSlide && targetSlide.dataset.bg) {
            const bgUrl = targetSlide.dataset.bg;
            const img = new Image();
            img.onload = () => {
                targetSlide.style.backgroundImage = `url('${bgUrl}')`;
                targetSlide.removeAttribute('data-bg');
            };
            img.src = bgUrl;
        }

        let realIndex = clonedIndex;
        if (clonedIndex === 0) realIndex = this.slides.length - 1;
        else if (clonedIndex === total - 1) realIndex = 0;
        else realIndex = clonedIndex - 1;

        const dots = this.dotsContainer ? this.dotsContainer.querySelectorAll('.carousel-dot') : [];
        dots.forEach((dot, i) => dot.classList.toggle('active', i === realIndex));

        const title = this.clonedSlides[clonedIndex].title || '';
        if (this.infoTitle) this.infoTitle.textContent = title;

        const offset = -clonedIndex * this.slideWidth;
        if (this.track) {
            this.track.style.transition = animate ? 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1.2)' : 'none';
            this.track.style.transform = `translateX(${offset}px)`;
        }

        this.currentIndex = clonedIndex;

        setTimeout(() => {
            this.isTransitioning = false;
            if (clonedIndex === 0) {
                const lastRealIndex = this.slides.length;
                const newOffset = -lastRealIndex * this.slideWidth;
                this.track.style.transition = 'none';
                this.track.style.transform = `translateX(${newOffset}px)`;
                this.currentIndex = lastRealIndex;
            } else if (clonedIndex === total - 1) {
                const newOffset = -1 * this.slideWidth;
                this.track.style.transition = 'none';
                this.track.style.transform = `translateX(${newOffset}px)`;
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

    // ===== 修复：事件绑定幂等，防止 refresh 累积监听器 =====
    bindEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;

        // 箭头按钮
        if (this.arrowLeft) {
            this._boundArrowLeftClick = () => {
                this.prev();
                this.resetAutoplay();
            };
            this.arrowLeft.addEventListener('click', this._boundArrowLeftClick);
        }
        if (this.arrowRight) {
            this._boundArrowRightClick = () => {
                this.next();
                this.resetAutoplay();
            };
            this.arrowRight.addEventListener('click', this._boundArrowRightClick);
        }

        // 触摸滑动
        if (this.track) {
            let startX = 0, startY = 0;
            this._boundTrackTouchStart = (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                this.stopAutoplay();
            };
            this._boundTrackTouchEnd = (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = endX - startX;
                const diffY = endY - startY;
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
                    if (diffX > 0) this.prev();
                    else this.next();
                }
                this.startAutoplay();
            };
            this.track.addEventListener('touchstart', this._boundTrackTouchStart);
            this.track.addEventListener('touchend', this._boundTrackTouchEnd);
        }

        // 容器 hover 暂停/恢复
        const container = document.getElementById('wallpaperCarousel');
        if (container) {
            this._carouselContainer = container;
            this._boundContainerMouseEnter = () => this.stopAutoplay();
            this._boundContainerMouseLeave = () => this.startAutoplay();
            container.addEventListener('mouseenter', this._boundContainerMouseEnter);
            container.addEventListener('mouseleave', this._boundContainerMouseLeave);
        }

        // ===== 修复：resize 使用保存的引用，destroy 时可解绑 =====
        this._boundResizeHandler = () => {
            this.updateSlideWidth();
            if (!this.isTransitioning && this.track) {
                const offset = -this.currentIndex * this.slideWidth;
                this.track.style.transition = 'none';
                this.track.style.transform = `translateX(${offset}px)`;
            }
        };
        window.addEventListener('resize', this._boundResizeHandler);
    }

    // ===== 修复：destroy 通过保存的引用正确解绑所有监听器 =====
    unbindEvents() {
        if (!this._eventsBound) return;

        if (this.arrowLeft && this._boundArrowLeftClick) {
            this.arrowLeft.removeEventListener('click', this._boundArrowLeftClick);
        }
        if (this.arrowRight && this._boundArrowRightClick) {
            this.arrowRight.removeEventListener('click', this._boundArrowRightClick);
        }
        if (this.track && this._boundTrackTouchStart) {
            this.track.removeEventListener('touchstart', this._boundTrackTouchStart);
        }
        if (this.track && this._boundTrackTouchEnd) {
            this.track.removeEventListener('touchend', this._boundTrackTouchEnd);
        }
        if (this._carouselContainer && this._boundContainerMouseEnter) {
            this._carouselContainer.removeEventListener('mouseenter', this._boundContainerMouseEnter);
        }
        if (this._carouselContainer && this._boundContainerMouseLeave) {
            this._carouselContainer.removeEventListener('mouseleave', this._boundContainerMouseLeave);
        }
        if (this._boundResizeHandler) {
            window.removeEventListener('resize', this._boundResizeHandler);
        }

        this._boundArrowLeftClick = null;
        this._boundArrowRightClick = null;
        this._boundTrackTouchStart = null;
        this._boundTrackTouchEnd = null;
        this._boundContainerMouseEnter = null;
        this._boundContainerMouseLeave = null;
        this._boundResizeHandler = null;
        this._carouselContainer = null;
        this._eventsBound = false;
    }

    async refresh() {
        this.stopAutoplay();
        this.preloadCache.clear();
        this.activePreloads.clear();
        this.preloadQueue = [];
        this.idlePreloadQueue = [];

        // ===== 修复：清理旧的 idle 定时器 =====
        if (this._idleTimer) {
            try {
                if (window.cancelIdleCallback) window.cancelIdleCallback(this._idleTimer);
            } catch (e) {}
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
        if (this._idleRetryTimer) {
            clearTimeout(this._idleRetryTimer);
            this._idleRetryTimer = null;
        }

        // ===== 修复：refresh 时先解绑旧监听器，再走 init 流程（_eventsBound 会重新绑定） =====
        this.unbindEvents();

        await this.init();
        this.startAutoplay();
    }

    destroy() {
        this._destroyed = true;
        this.stopAutoplay();

        // ===== 修复：清理所有 idle 相关定时器 =====
        if (this._idleTimer) {
            try {
                if (window.cancelIdleCallback) window.cancelIdleCallback(this._idleTimer);
            } catch (e) {}
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
        if (this._idleRetryTimer) {
            clearTimeout(this._idleRetryTimer);
            this._idleRetryTimer = null;
        }

        // ===== 修复：通过保存的引用正确解绑所有事件 =====
        this.unbindEvents();

        if (this.preloadQueue.length) this.preloadQueue = [];
        if (this.idlePreloadQueue.length) this.idlePreloadQueue = [];
        this.activePreloads.clear();
        this.preloadCache.clear();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.carousel) {
        window.Starlink.carousel = new CarouselModule();
    }
    window.carouselModule = window.Starlink.carousel;
});