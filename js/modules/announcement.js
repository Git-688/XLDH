// announcement.js - 简约公告模块（从后端 API 获取动态公告，保留原有样式）
class AnnouncementModule {
    constructor() {
        if (window.Starlink && window.Starlink.announcement) return window.Starlink.announcement;
        this.modalElement = null;
        this.isVisible = false;
        this.isInitialized = false;
        this.currentAnnouncement = null;
        this.escapeHandler = null;
        this.apiBase = Utils.getApiBase();
        this.init();
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
                        <div class="announcement-title">
                            <i class="fas fa-bell" style="color: #4361ee; font-size: 1.2rem;"></i>
                            <span>暂无公告</span>
                        </div>
                        <button class="announcement-close" id="announcementClose" aria-label="关闭">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="announcement-body">
                        <div class="focus-section">
                            <div class="focus-content">当前没有系统公告，敬请期待。</div>
                        </div>
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

        const title = this.escapeHtml(this.currentAnnouncement.title);
        const content = this.escapeHtml(this.currentAnnouncement.content).replace(/\n/g, '<br>');
        const time = this.escapeHtml(this.currentAnnouncement.time);

        this.modalElement.innerHTML = `
            <div class="announcement-modal-container">
                <div class="announcement-header">
                    <div class="announcement-title">
                        <i class="fas fa-bell" style="color: #4361ee; font-size: 1.2rem;"></i>
                        <span>${title}</span>
                    </div>
                    <button class="announcement-close" id="announcementClose" aria-label="关闭">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="announcement-body">
                    <div class="focus-section">
                        <div class="focus-content">${content}</div>
                    </div>
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
        const closeHandler = () => {
            this.hide();
        };
        if (closeBtn) closeBtn.addEventListener('click', closeHandler);
        if (ackBtn) ackBtn.addEventListener('click', closeHandler);
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.hide();
            }
        });
    }

    setupGlobalEvents() {
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    showModal() {
        if (!this.modalElement) this.createModal();
        if (this.isVisible) return;
        this.closeOtherModals();
        this.modalElement.classList.add('active');
        this.isVisible = true;
        if (window.Starlink?.app) window.Starlink.app.registerModal(this);
        else if (window.app) window.app.registerModal(this);
        this.updateButtonState(true);
    }

    hide() {
        if (!this.isVisible || !this.modalElement) return;
        this.modalElement.classList.remove('active');
        this.updateButtonState(false);
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

    closeOtherModals() {
        if (window.Starlink?.sidebar?.isVisible?.()) window.Starlink.sidebar.hide();
        else if (window.sidebar?.isVisible?.()) window.sidebar.hide();
        if (window.Starlink?.search?.isModalOpen?.()) window.Starlink.search.hide();
        else if (window.searchModule?.isModalOpen?.()) window.searchModule.hide();
        const musicPlayer = document.getElementById('musicPlayer');
        if (musicPlayer?.classList.contains('show')) {
            if (window.Starlink?.navbar?.hideMusicPlayer) window.Starlink.navbar.hideMusicPlayer();
            else if (window.app?.components?.navbar) window.app.components.navbar.hideMusicPlayer();
        }
        if (window.Starlink?.weather?.isShowing) window.Starlink.weather.hide();
        else if (window.app?.modules?.weather?.hide) window.app.modules.weather.hide();
        if (window.Starlink?.about?.isVisible) window.Starlink.about.hide();
        else if (window.aboutModule?.isVisible) window.aboutModule.hide();
        if (window.Starlink?.app?.hideNotebookModal) window.Starlink.app.hideNotebookModal();
        else if (window.hideNotebookModal) window.hideNotebookModal();
        const submitModal = document.getElementById('submitModal');
        if (submitModal?.classList.contains('active')) submitModal.classList.remove('active');
    }

    updateButtonState(active) {
        const btn = document.getElementById('announcementBtn');
        if (btn) btn.classList.toggle('active', active);
    }

    async refresh() {
        await this.loadAnnouncement();
        if (this.isVisible) this.showModal();
    }

    destroy() {
        this.hide();
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
        if (this.modalElement?.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
        this.modalElement = null;
        this.isInitialized = false;
    }
}

// 初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.announcement) {
            window.Starlink.announcement = new AnnouncementModule();
        }
        window.announcementModule = window.Starlink.announcement;
        window.announcementModule.loadAnnouncement();
    });
} else {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.announcement) {
        window.Starlink.announcement = new AnnouncementModule();
    }
    window.announcementModule = window.Starlink.announcement;
    window.announcementModule.loadAnnouncement();
}