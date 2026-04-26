/**
 * 轮播图模块 - 使用必应历史壁纸
 * @class CarouselModule
 */
class CarouselModule {
    constructor() {
        this.currentIndex = 0;
        this.slides = [];          // 存放图片数据 { url, title, copyright }
        this.autoplayTimer = null;
        this.track = null;
        this.dotsContainer = null;
        this.infoTitle = null;
        this.infoCopyright = null;
        this.isTransitioning = false;  // 动画进行中，防止高速点击
        this.autoPlayInterval = 5000;  // 自动播放间隔
        this.init();
    }

    async init() {
        // 获取7天的必应壁纸（今天 + 6天前）
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
                            title: data.copyright || `必应壁纸 · ${i === 0 ? '今日' : i + '天前'}`,
                            copyright: data.copyright || ''
                        });
                    }
                }
            } catch (e) {
                console.warn(`获取第${i}天壁纸失败`);
            }
        }

        // 如果获取失败，提供默认壁纸
        if (bingImages.length === 0) {
            bingImages.push({
                url: '',
                title: '星聚导航',
                copyright: '欢迎使用星聚导航'
            });
        }

        this.slides = bingImages;
        this.track = document.getElementById('carouselTrack');
        this.dotsContainer = document.getElementById('carouselDots');
        this.infoTitle = document.getElementById('wallpaperTitle');
        this.infoCopyright = document.getElementById('wallpaperCopyright');
        this.arrowLeft = document.getElementById('carouselArrowLeft');
        this.arrowRight = document.getElementById('carouselArrowRight');

        if (!this.track) return;

        this.renderSlides();
        this.renderDots();
        this.goToSlide(0, false);
        this.bindEvents();
        this.startAutoplay();
    }

    renderSlides() {
        if (!this.track) return;
        this.track.innerHTML = '';
        this.slides.forEach((slide, index) => {
            const div = document.createElement('div');
            div.className = 'carousel-slide';
            div.style.backgroundImage = `url('${slide.url}')`;
            div.setAttribute('data-index', index);
            // 处理图片加载失败（使用CSS渐变背景兜底）
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
        this.slides.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.className = 'carousel-dot';
            dot.setAttribute('data-index', index);
            dot.addEventListener('click', () => {
                this.goToSlide(index, true);
                this.resetAutoplay();
            });
            this.dotsContainer.appendChild(dot);
        });
    }

    goToSlide(index, animate = true) {
        if (index < 0 || index >= this.slides.length || this.isTransitioning) return;
        this.isTransitioning = true;

        // 更新激活指示器
        const dots = this.dotsContainer.querySelectorAll('.carousel-dot');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

        // 更新信息
        const slide = this.slides[index];
        if (this.infoTitle) this.infoTitle.textContent = slide.title;
        if (this.infoCopyright) {
            this.infoCopyright.textContent = slide.copyright || '';
            this.infoCopyright.style.display = slide.copyright ? 'block' : 'none';
        }

        // 移动轨道
        if (this.track) {
            this.track.style.transition = animate ? 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1.2)' : 'none';
            this.track.style.transform = `translateX(-${index * 100}%)`;
        }

        this.currentIndex = index;

        // 动画结束后解锁
        setTimeout(() => {
            this.isTransitioning = false;
        }, animate ? 500 : 0);
    }

    next() {
        const nextIndex = (this.currentIndex + 1) % this.slides.length;
        this.goToSlide(nextIndex, true);
    }

    prev() {
        const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
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
        // 触摸滑动支持
        if (this.track) {
            let startX = 0;
            let startY = 0;
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
                // 水平滑动距离大于垂直且超过阈值
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
                    if (diffX > 0) {
                        this.prev();
                    } else {
                        this.next();
                    }
                }
                this.startAutoplay();
            });
        }
        // 鼠标悬停时暂停自动播放
        const container = document.getElementById('wallpaperCarousel');
        if (container) {
            container.addEventListener('mouseenter', () => this.stopAutoplay());
            container.addEventListener('mouseleave', () => this.startAutoplay());
        }
    }

    /**
     * 手动刷新轮播图数据（可调用）
     */
    async refresh() {
        this.stopAutoplay();
        await this.init();
        this.startAutoplay();
    }
}

// 初始化轮播图
document.addEventListener('DOMContentLoaded', () => {
    if (!window.carouselModule) {
        window.carouselModule = new CarouselModule();
    }
});