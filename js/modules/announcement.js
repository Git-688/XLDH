// announcement.js - 简约公告模块（从后端 API 获取动态公告，支持未读徽章）
// 修复：模态框正确显示、增加更新徽章、用户阅读后清除徽章

class AnnouncementModule {
    constructor() {
        if (window.Starlink && window.Starlink.announcement) return window.Starlink.announcement;
        this.modalElement = null;
        this.isVisible = false;
        this.currentAnnouncement = null;
        this.escapeHandler = null;
        this.apiBase = Utils.getApiBase();
        // 标记是否已检查过更新（用于页面加载时显示徽章）
        this.initialCheckDone = false;
        this.init();
        if (window.Starlink) window.Starlink.announcement = this;
        window.announcementModule = this;
    }

    // 初始化：加载公告并设置事件
    async init() {
        await this.loadAnnouncement();
        this.setupGlobalEvents();
        // 首次检查并显示徽章
        await this.checkAndShowBadge();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 获取当前启用的公告（只有一个）
    async fetchActiveAnnouncement() {
        try {
            const response = await fetch(`${this.apiBase}/announcement/active`);
            if (!response.ok) return null;
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
        // 每次加载公告后也检查徽章（但徽章显示依据是否已读）
        await this.checkAndShowBadge();
    }

    // 创建模态框 DOM（始终使用最新公告内容）
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
            // 用户点击关闭或“知道了”，标记当前公告为已读
            this.markAsRead();
            this.hide();
        };
        if (closeBtn) closeBtn.addEventListener('click', closeHandler);
        if (ackBtn) ackBtn.addEventListener('click', closeHandler);
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.markAsRead();
                this.hide();
            }
        });
    }

    // 标记当前公告为已读（存储到 localStorage）
    markAsRead() {
        if (this.currentAnnouncement && this.currentAnnouncement.id) {
            localStorage.setItem('last_read_announcement_id', this.currentAnnouncement.id);
            // 同时记录阅读时间戳，用于徽章判断
            localStorage.setItem('last_read_announcement_time', Date.now());
            // 移除徽章
            this.removeBadge();
        }
    }

    // 检查是否有未读公告，并显示/隐藏徽章
    async checkAndShowBadge() {
        // 确保公告已加载
        if (!this.currentAnnouncement) {
            // 如果没有公告，移除任何徽章
            this.removeBadge();
            return;
        }
        const lastReadId = localStorage.getItem('last_read_announcement_id');
        const isUnread = (!lastReadId || lastReadId != this.currentAnnouncement.id);
        if (isUnread) {
            this.showBadge();
        } else {
            this.removeBadge();
        }
    }

    // 在公告按钮上显示红点或数字徽章
    showBadge() {
        const btn = document.getElementById('announcementBtn');
        if (!btn) return;
        // 避免重复添加
        let badge = btn.querySelector('.announcement-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'announcement-badge';
            badge.textContent = '●'; // 红点，也可以用数字
            badge.style.cssText = 'position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; border-radius: 50%; width: 10px; height: 10px; font-size: 8px; display: flex; align-items: center; justify-content: center; line-height: 1;';
            btn.style.position = 'relative';
            btn.appendChild(badge);
        }
    }

    removeBadge() {
        const btn = document.getElementById('announcementBtn');
        if (!btn) return;
        const badge = btn.querySelector('.announcement-badge');
        if (badge) badge.remove();
    }

    setupGlobalEvents() {
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.markAsRead();
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
        
        // 绑定公告按钮事件（确保只绑定一次）
        const announcementBtn = document.getElementById('announcementBtn');
        if (announcementBtn && !announcementBtn._announcementBound) {
            announcementBtn._announcementBound = true;
            announcementBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleModal();
            });
        }

        // 可选：定时检查公告是否有更新（例如每5分钟）
        setInterval(async () => {
            const newAnn = await this.fetchActiveAnnouncement();
            if (newAnn && (!this.currentAnnouncement || newAnn.id !== this.currentAnnouncement.id)) {
                // 公告内容有变化，重新加载
                await this.loadAnnouncement();
                // 如果模态框当前是打开的，刷新内容
                if (this.isVisible) {
                    this.showModal(); // 重新渲染
                }
                // 更新徽章
                await this.checkAndShowBadge();
            }
        }, 300000); // 5分钟
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
        // 每次打开模态框时重新检查徽章（虽然打开后就会标记已读，但为了避免打开前徽章消失问题）
        this.checkAndShowBadge();
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
        await this.checkAndShowBadge();
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
    });
} else {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.announcement) {
        window.Starlink.announcement = new AnnouncementModule();
    }
    window.announcementModule = window.Starlink.announcement;
}