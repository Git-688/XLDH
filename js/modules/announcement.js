// announcement.js - 简约公告模块（修复按钮无响应问题）
class AnnouncementModule {
    constructor() {
        if (window.Starlink && window.Starlink.announcement) return window.Starlink.announcement;
        this.modalElement = null;
        this.isVisible = false;
        this.currentAnnouncement = null;
        this.escapeHandler = null;
        this.apiBase = Utils.getApiBase();
        this.loadAnnouncement();
        this.setupGlobalEvents();
        if (window.Starlink) window.Starlink.announcement = this;
        window.announcementModule = this;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async fetchActiveAnnouncement() {
        try {
            const response = await fetch(`${this.apiBase}/announcement/active`);
            const data = await response.json();
            if (data && data.id && data.title && data.content) {
                return {
                    id: data.id,
                    title: data.title,
                    content: data.content,
                    time: new Date(data.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
                };
            }
            return null;
        } catch (error) {
            console.error('获取公告失败:', error);
            return null;
        }
    }

    async loadAnnouncement() {
        const ann = await this.fetchActiveAnnouncement();
        this.currentAnnouncement = ann;
        this.createModal();
    }

    createModal() {
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'announcement-modal-simple';
        this.modalElement.id = 'announcementModal';
        
        if (!this.currentAnnouncement) {
            this.modalElement.innerHTML = `
                <div class="announcement-modal-container">
                    <div class="announcement-header">
                        <div class="announcement-title"><i class="fas fa-bell"></i><span>暂无公告</span></div>
                        <button class="announcement-close" id="announcementClose"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="announcement-body">
                        <div class="focus-section"><div class="focus-content">当前没有系统公告，敬请期待。</div></div>
                    </div>
                    <div class="announcement-footer">
                        <button class="announcement-ack-btn" id="announcementAckBtn">知道了</button>
                    </div>
                </div>
            `;
            document.body.appendChild(this.modalElement);
            this.bindModalEvents();
            return;
        }

        // 使用 innerHTML 直接显示富文本内容（后台编辑的HTML结构）
        const title = this.escapeHtml(this.currentAnnouncement.title);
        const contentHtml = this.currentAnnouncement.content || '<div class="focus-content">暂无详细内容</div>';
        const time = this.escapeHtml(this.currentAnnouncement.time);

        this.modalElement.innerHTML = `
            <div class="announcement-modal-container">
                <div class="announcement-header">
                    <div class="announcement-title"><i class="fas fa-bell"></i><span>${title}</span></div>
                    <button class="announcement-close" id="announcementClose"><i class="fas fa-times"></i></button>
                </div>
                <div class="announcement-body">
                    ${contentHtml}
                </div>
                <div class="announcement-footer">
                    <span class="announcement-date"><i class="far fa-calendar-alt"></i> ${time}</span>
                    <button class="announcement-ack-btn" id="announcementAckBtn">知道了</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modalElement);
        this.bindModalEvents();
    }

    bindModalEvents() {
        if (!this.modalElement) return;
        const closeBtn = this.modalElement.querySelector('#announcementClose');
        const ackBtn = this.modalElement.querySelector('#announcementAckBtn');
        const closeHandler = () => this.hide();
        if (closeBtn) closeBtn.addEventListener('click', closeHandler);
        if (ackBtn) ackBtn.addEventListener('click', closeHandler);
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) this.hide();
        });
    }

    setupGlobalEvents() {
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) this.hide();
        };
        document.addEventListener('keydown', this.escapeHandler);
        
        // 修复公告按钮事件：确保每次点击都能打开
        const announcementBtn = document.getElementById('announcementBtn');
        if (announcementBtn && !announcementBtn._bound) {
            announcementBtn._bound = true;
            announcementBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 重新加载最新公告后再显示
                this.loadAnnouncement().then(() => this.showModal());
            });
        }
    }

    showModal() {
        if (!this.modalElement) this.createModal();
        if (this.isVisible) return;
        // 关闭其他模态框
        if (window.Starlink?.sidebar?.isVisible?.()) window.Starlink.sidebar.hide();
        if (window.Starlink?.search?.isOpen) window.Starlink.search.hide();
        const musicPlayer = document.getElementById('musicPlayer');
        if (musicPlayer?.classList.contains('show')) {
            if (window.Starlink?.navbar?.hideMusicPlayer) window.Starlink.navbar.hideMusicPlayer();
        }
        if (window.Starlink?.weather?.isShowing) window.Starlink.weather.hide();
        if (window.aboutModule?.isVisible) window.aboutModule.hide();
        
        this.modalElement.classList.add('active');
        this.isVisible = true;
        if (window.Starlink?.app) window.Starlink.app.registerModal(this);
        else if (window.app) window.app.registerModal(this);
    }

    hide() {
        if (!this.isVisible || !this.modalElement) return;
        this.modalElement.classList.remove('active');
        const onTransitionEnd = () => {
            this.isVisible = false;
            if (window.Starlink?.app) window.Starlink.app.unregisterModal(this);
            else if (window.app) window.app.unregisterModal(this);
            this.modalElement.removeEventListener('transitionend', onTransitionEnd);
        };
        this.modalElement.addEventListener('transitionend', onTransitionEnd, { once: true });
        setTimeout(() => {
            if (this.isVisible) {
                this.isVisible = false;
                if (window.Starlink?.app) window.Starlink.app.unregisterModal(this);
                else if (window.app) window.app.unregisterModal(this);
            }
        }, 400);
    }

    toggleModal() {
        this.isVisible ? this.hide() : this.showModal();
    }
}

// 确保在 DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.announcement) {
            window.Starlink.announcement = new AnnouncementModule();
        }
        window.announcementModule = window.Starlink.announcement;
    });
} else {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.announcement) {
        window.Starlink.announcement = new AnnouncementModule();
    }
    window.announcementModule = window.Starlink.announcement;
}