class CompactSidebar {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        if (!this.sidebar) return;

        this.dragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.sidebarWidth = 280;

        this.init();
    }

    async init() {
        this.adjustSidebarHeight();
        this.initGesture();
    }

    /* ===== 自动计算上下留白 ===== */
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

    /* ===== 显示 ===== */
    show() {
        this.sidebar.classList.add('active');
        this.sidebar.style.transform = 'translateX(16px)';
    }

    /* ===== 隐藏 ===== */
    hide() {
        this.sidebar.classList.remove('active');
        this.sidebar.style.transform = 'translateX(-110%)';
    }

    isVisible() {
        return this.sidebar.classList.contains('active');
    }

    /* ===== iOS 手势核心 ===== */
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
                sidebar.style.transform = `translateX(${delta - this.sidebarWidth}px)`;
            } 
            /* 拖回关闭 */
            else {
                delta = Math.min(0, delta);
                delta = Math.max(-this.sidebarWidth, delta);

                sidebar.style.transform = `translateX(${delta + 16}px)`;
            }
        };

        const onEnd = () => {
            if (!this.dragging) return;
            this.dragging = false;

            sidebar.style.transition = 'transform 0.4s cubic-bezier(0.22,1,0.36,1)';

            const delta = this.currentX - this.startX;

            if (!this.isVisible()) {
                delta > threshold ? this.show() : this.hide();
            } else {
                delta < -threshold ? this.hide() : this.show();
            }
        };

        document.addEventListener('touchstart', onStart);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('touchend', onEnd);

        document.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    }
}

/* 初始化 */
window.addEventListener('DOMContentLoaded', () => {
    window.sidebar = new CompactSidebar();
});