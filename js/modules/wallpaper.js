/* wallpaper.js - 修复壁纸偏移问题，增强预加载和响应式 */
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
        this._lastWidth = 0;
        this._lastResolution = 0;
        this.resizeTimeout = null;
        this.init();
        
        if (window.Starlink) window.Starlink.carousel = this;
        window.carouselModule = this;
    }

    getResolutionForWidth() {
        const width = window.innerWidth;
        if (width >= 1920) return 1920;
        if (width >= 1280) return 1280;
        if (width >= 768) return 768;
        return 480;
    }

    sanitizeImageUrl(url) {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                const parsed = new URL(url);
                return parsed.toString();
            } catch (e) {
                return url;
            }
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
            if (this.idlePreloadQueue.length === 0) return;
            if (this.activePreloads.size >= this.maxConcurrentPreloads) {
                setTimeout(processIdle, 500);
                return;
            }
            const nextTask = this.idlePreloadQueue.shift();
            if (nextTask) {
                Promise.resolve(nextTask()).finally(() => {
                    if (this.idlePreloadQueue.length > 0) {
                        setTimeout(processIdle, 100);
                    }
                });
            }
        };
        if (window.requestIdleCallback) {
            requestIdleCallback(processIdle, { timeout: 5000 });
        } else {
            setTimeout(processIdle, 2000);
        }
    }

    handleResize() {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        const newWidth = window.innerWidth;
        const newResolution = this.getResolutionForWidth();
        if (Math.abs(newWidth - this._lastWidth) < 100 && this._lastWidth > 0) {
            return;
        }
        this._lastWidth = newWidth;
        this._lastResolution = newResolution;
        this.resizeTimeout = setTimeout(() => {
            this.refresh();
        }, 1000);
    }

    async init() {
        const days = 7;
        const bingImages = [];
        const resolution = this.getResolutionForWidth();
        this._lastWidth = window.innerWidth;
        this._lastResolution = resolution;

        for (let i = 0; i < days; i++) {
            try {
                const url = `https://bing.biturl.top/?resolution=${resolution}&format=json&index=${i}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        let imageUrl = this.sanitizeImageUrl(data.url);
                        if (!imageUrl.startsWith('http')) {
                            imageUrl = 'https://' + imageUrl;
                        }
                        let title = data.copyright ? data.copyright : '';
                        title = title.replace(/^必应壁纸\s*·\s*/i, '').trim();
                        if (!title) title = i === 0 ? '今日壁纸' : `${i}天前壁纸`;
                        bingImages.push({ url: imageUrl, title: title });
                    }
                }
            } catch (e) {
                console.warn(`获取第${i}天壁纸失败`);
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

        this.renderSlides();
        this.renderDots();
        this.preloadImage(1, 'high');
        this.preloadNearbySlides(1, 3);
        this.goToSlide(1, false);
        this.bindEvents();
        this.startAutoplay();

        setTimeout(() => this.preloadAllIdle(), 3000);

        window.addEventListener('resize', this.handleResize.bind(this));
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
                    div.style.opacity = '1';
                }
            } else if (slide.url) {
                div.dataset.bg = this.sanitizeImageUrl(slide.url);
                div.style.opacity = '0';
                div.style.transition = 'opacity 0.5s ease';
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

        const targetSlide = this.track.children[clonedIndex];
        if (targetSlide && targetSlide.dataset.bg) {
            const bgUrl = targetSlide.dataset.bg;
            const img = new Image();
            img.onload = () => {
                targetSlide.style.backgroundImage = `url('${bgUrl}')`;
                targetSlide.style.opacity = '1';
                targetSlide.removeAttribute('data-bg');
            };
            img.onerror = () => {
                targetSlide.style.backgroundImage = `url('${bgUrl}')`;
                targetSlide.style.opacity = '1';
                targetSlide.removeAttribute('data-bg');
            };
            img.src = bgUrl;
            targetSlide.style.opacity = '0';
            targetSlide.style.transition = 'opacity 0.5s ease';
        }

        let realIndex = clonedIndex;
        if (clonedIndex === 0) realIndex = this.slides.length - 1;
        else if (clonedIndex === total - 1) realIndex = 0;
        else realIndex = clonedIndex - 1;

        const dots = this.dotsContainer ? this.dotsContainer.querySelectorAll('.carousel-dot') : [];
        dots.forEach((dot, i) => dot.classList.toggle('active', i === realIndex));

        const title = this.clonedSlides[clonedIndex].title || '';
        if (this.infoTitle) this.infoTitle.textContent = title;

        if (this.track) {
            this.track.style.transition = animate ? 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1.2)' : 'none';
            this.track.style.transform = `translateX(-${clonedIndex * 100}%)`;
        }

        this.currentIndex = clonedIndex;

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

        const container = document.getElementById('wallpaperCarousel');
        if (container) {
            container.addEventListener('mouseenter', () => this.stopAutoplay());
            container.addEventListener('mouseleave', () => this.startAutoplay());
        }
    }

    async refresh() {
        this.stopAutoplay();
        this.preloadCache.clear();
        this.activePreloads.clear();
        this.preloadQueue = [];
        this.idlePreloadQueue = [];
        await this.init();
        this.startAutoplay();
    }

    destroy() {
        this.stopAutoplay();
        window.removeEventListener('resize', this.handleResize);
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
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