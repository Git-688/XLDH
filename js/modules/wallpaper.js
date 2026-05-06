/**
 * 轮播图模块 - 无缝循环 + 标题与圆点同行
 * @class CarouselModule
 */
class CarouselModule {
    constructor() {
        this.currentIndex = 1;          // 实际从第一张开始（索引1）
        this.slides = [];               // 存放原始图片数据
        this.clonedSlides = [];         // 包含首尾克隆的数组
        this.autoplayTimer = null;
        this.track = null;
        this.dotsContainer = null;
        this.infoTitle = null;
        this.isTransitioning = false;
        this.autoPlayInterval = 5000;
        this.init();
    }

    async init() {
        // 获取7天壁纸
        const days = 7;
        const bingImages = [];
        for (let i = 0; i < days; i++) {
            try {
                const url = `https://bing.biturl.top/?resolution=1920&format=json&index=${i}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        bingImages.push({
                            url: data.url,
                            title: data.copyright ? `必应壁纸 · ${data.copyright}` : `必应壁纸 · ${i === 0 ? '今日' : i + '天前'}`
                        });
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

        // 构建克隆数组： [最后一张, ...原始, 第一张]
        if (this.slides.length > 1) {
            this.clonedSlides = [
                { ...this.slides[this.slides.length - 1], clone: 'last' },
                ...this.slides,
                { ...this.slides[0], clone: 'first' }
            ];
        } else {
            // 只有一张时无需克隆
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
        this.goToSlide(1, false);   // 显示第一张原始图
        this.bindEvents();
        this.startAutoplay();
    }

    renderSlides() {
        if (!this.track) return;
        this.track.innerHTML = '';
        this.clonedSlides.forEach((slide, index) => {
            const div = document.createElement('div');
            div.className = 'carousel-slide';
            div.style.backgroundImage = `url('${slide.url}')`;
            div.setAttribute('data-index', index);
            const img = new Image();
            img.onerror = () => {
                div.style.backgroundImage = 'none';
                div.style.backgroundColor = 'rgba(102,126,234,0.3)';
            };
            img.src = slide.url;
            this.track.appendChild(div);
        });
    }

    renderDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';
        // 只为原始图片生成圆点（索引映射：原始在 clonedSlides 中从1开始到 length-2）
        this.slides.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.className = 'carousel-dot';
            dot.setAttribute('data-index', index); // 原始索引
            dot.addEventListener('click', () => {
                const realIndex = index; // 对应 clonedSlides 中的 realIndex = index + 1
                this.goToSlide(realIndex + 1, true);
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

        // 更新圆点（映射回原始索引）
        let realIndex = clonedIndex;
        if (clonedIndex === 0) realIndex = this.slides.length - 1;          // 克隆的最后一张
        else if (clonedIndex === total - 1) realIndex = 0;                // 克隆的第一张
        else realIndex = clonedIndex - 1;

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

        // 动画结束后，如果处于克隆幻灯片，则瞬间跳转到真实幻灯片
        setTimeout(() => {
            this.isTransitioning = false;
            if (clonedIndex === 0) {
                // 跳转到真实的最后一张（索引 = slides.length）
                this.track.style.transition = 'none';
                this.track.style.transform = `translateX(-${this.slides.length * 100}%)`;
                this.currentIndex = this.slides.length; // clonedSlides 中的索引为 slides.length
            } else if (clonedIndex === total - 1) {
                // 跳转到真实的第一张（索引 = 1）
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
        // 触摸滑动
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