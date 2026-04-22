/**
 * 侧边栏组件（iOS 手势增强完整版）
 */
class CompactSidebar {
    constructor() {
        if (!document.getElementById('sidebar')) return;

        this.sidebar = document.getElementById('sidebar');

        /* ===== 手势参数 ===== */
        this.dragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.sidebarWidth = 280;

        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        this.adjustSidebarHeight();
        this.initGesture();

        this.bindBasicEvents();

        this.isInitialized = true;
    }

    /* =====================
       自动计算上下留白
    ===================== */
    adjustSidebarHeight() {
        const update = () => {
            const nav = document.querySelector('.navbar');
            const footer = document.querySelector('.bottom-bar, .tabbar');

            const navHeight = nav?.offsetHeight || 60;
            const footerHeight = footer?.offsetHeight || 0;

            const gap = 16;

            this.sidebar.style.setProperty('--sidebar-top', `${navHeight + gap}px`);
            this.sidebar.style.setProperty('--sidebar-bottom', `${footerHeight + gap}px`);
        };

        update();
        window.addEventListener('resize', update);
    }

    /* =====================
       显示 / 隐藏
    ===================== */
    show() {
        this.sidebar.classList.add('active');
        this.sidebar.style.transform = 'translateX(16px)';
        document.body.classList.add('sidebar-open');
    }

    hide() {
        this.sidebar.classList.remove('active');
        this.sidebar.style.transform = 'translateX(-110%)';
        document.body.classList.remove('sidebar-open');
    }

    toggle() {
        this.isVisible() ? this.hide() : this.show();
    }

    isVisible() {
        return this.sidebar.classList.contains('active');
    }

    /* =====================
       基础点击关闭逻辑
    ===================== */
    bindBasicEvents() {
        document.addEventListener('click', (e) => {
            if (!this.isVisible()) return;

            if (!this.sidebar.contains(e.target)) {
                this.hide();
            }
        });
    }

    /* =====================
       iOS 手势（完整版）
    ===================== */
    initGesture() {
        const sidebar = this.sidebar;
        const threshold = 80;

        const onStart = (e) => {
            const t = e.touches ? e.touches[0] : e;

            this.dragging = true;
            this.startX = t.clientX;
            this.currentX = t.clientX;

            sidebar.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!this.dragging) return;

            const t = e.touches ? e.touches[0] : e;
            this.currentX = t.clientX;

            let delta = this.currentX - this.startX;

            /* 从左边拖出 */
            if (!this.isVisible()) {
                if (this.startX > 30) return;

                delta = Math.max(0, Math.min(delta, this.sidebarWidth));

                /* 阻尼效果 */
                const resistance = delta * 0.9;

                sidebar.style.transform =
                    `translateX(${resistance - this.sidebarWidth}px)`;
            }

            /* 拖回关闭 */
            else {
                delta = Math.min(0, delta);
                delta = Math.max(-this.sidebarWidth, delta);

                const resistance = delta * 0.9;

                sidebar.style.transform =
                    `translateX(${resistance + 16}px)`;
            }
        };

        const onEnd = () => {
            if (!this.dragging) return;
            this.dragging = false;

            sidebar.style.transition =
                'transform 0.45s cubic-bezier(0.22,1,0.36,1)';

            const delta = this.currentX - this.startX;

            /* 打开判断 */
            if (!this.isVisible()) {
                delta > threshold ? this.show() : this.hide();
            }
            /* 关闭判断 */
            else {
                delta < -threshold ? this.hide() : this.show();
            }
        };

        document.addEventListener('touchstart', onStart, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: true });
        document.addEventListener('touchend', onEnd);

        document.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    }
}

/* 初始化 */
window.addEventListener('DOMContentLoaded', () => {
    window.sidebar = new CompactSidebar();
    window.sidebar.init();
});