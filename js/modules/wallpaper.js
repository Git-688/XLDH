/**
 * 轮播图模块 - 使用稳定的第三方代理（bing.biturl.top）
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
        this.init();
    }

    getResolutionForWidth() {
        return 1920;
    }

    async init() {
        const days = 7;
        const bingImages = [];
        const resolution = this.getResolutionForWidth();

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
                const img = new Image();
                img.onload = () => {
                    div.style.backgroundImage = `url('${slide.url}')`;
                    div.style.background = `url('${slide.url}') center/cover no-repeat`;
                };
                img.onerror = () => console.warn(`图片加载失败: ${slide.url}`);
                img.src = slide.url;
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