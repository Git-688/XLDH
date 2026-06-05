/**
 * 轮播图模块 - 性能优化版（支持 WebP、响应式图片、懒加载）
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
        this.preloadCache = new Set();
        this.activePreloads = new Map();
        this.maxConcurrentPreloads = 2;
        this.preloadQueue = [];
        this.init();
    }

    getOptimalResolution() {
        const width = window.innerWidth;
        if (width < 768) return 800;
        if (width < 1200) return 1200;
        return 1920;
    }

    sanitizeImageUrl(url) {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('//')) return 'https:' + url;
        if (url.startsWith('/')) return 'https://cn.bing.com' + url;
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

    preloadImage(clonedIndex) {
        const slide = this.clonedSlides[clonedIndex];
        if (!slide || !slide.url) return;
        const imageUrl = this.sanitizeImageUrl(slide.url);
        if (!imageUrl || this.preloadCache.has(imageUrl)) return;

        if (this.activePreloads.size >= this.maxConcurrentPreloads) {
            this.preloadQueue.push(() => this.preloadSingleImage(imageUrl));
            return;
        }
        this.preloadSingleImage(imageUrl).then(() => {
            if (this.preloadQueue.length > 0) {
                const next = this.preloadQueue.shift();
                next();
            }
        });
    }

    async init() {
        const days = 7;
        const bingImages = [];
        const resolution = this.getOptimalResolution();

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
                        // 生成不同分辨率版本（用于 srcset）
                        const baseUrl = imageUrl.split('&')[0]; // 去除原有分辨率参数
                        const srcset = `${baseUrl}&w=400 400w, ${baseUrl}&w=800 800w, ${baseUrl}&w=1200 1200w, ${baseUrl}&w=1920 1920w`;
                        bingImages.push({ url: imageUrl, srcset: srcset, title: title });
                    }
                }
            } catch (e) {
                console.warn(`获取第${i}天壁纸失败`);
            }
        }

        if (bingImages.length === 0) {
            bingImages.push({ url: '', srcset: '', title: '星聚导航' });
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
        this.preloadImage(1);
        this.goToSlide(1, false);
        this.bindEvents();
        this.startAutoplay();
    }

    renderSlides() {
        if (!this.track) return;
        this.track.innerHTML = '';

        this.clonedSlides.forEach((slide, index) => {
            const div = document.createElement('div');
            div.className = 'carousel-slide';
            div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            div.style.backgroundSize = 'cover';
            div.style.backgroundPosition = 'center';

            if (slide.url) {
                const imageUrl = this.sanitizeImageUrl(slide.url);
                if (index === 1) {
                    const img = new Image();
                    img.onload = () => {
                        div.style.background = `url('${imageUrl}') center/cover no-repeat`;
                    };
                    img.src = imageUrl;
                } else {
                    div.setAttribute('data-bg', imageUrl);
                }
                // 存储 srcset 信息（用于以后可能的高清显示）
                if (slide.srcset) div.setAttribute('data-srcset', slide.srcset);
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

        const prev = (clonedIndex - 1 + total) % total;
        const next = (clonedIndex + 1) % total;
        this.preloadImage(prev);
        this.preloadImage(next);

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
        await this.init();
        this.startAutoplay();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.carouselModule) {
        window.carouselModule = new CarouselModule();
    }
});