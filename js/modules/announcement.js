/**
 * 简约公告模块 - 清爽现代版（XSS 防护加固，修复 badge 不消失问题）
 * @class AnnouncementModule
 */
class AnnouncementModule {
    constructor() {
        this.announcements = [];
        this.modalElement = null;
        this.isVisible = false;
        this.isInitialized = false;
        this.currentAnnouncement = null;
        this.escapeHandler = null;
        this.init();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    init() {
        if (this.isInitialized) return;
        this.loadAnnouncements();
        this.createModal();
        this.setupGlobalEvents();
        this.updateNavbarBadge();   // 初始化时更新 badge
        this.isInitialized = true;
        window.announcementModule = this;
    }

    loadAnnouncements() {
        const stored = Storage.get('announcements');
        const defaultAnn = this.getDefaultAnnouncements()[0];

        if (!stored || stored.length === 0) {
            this.announcements = this.getDefaultAnnouncements();
            Storage.set('announcements', this.announcements);
        } else {
            const storedFirst = stored[0];
            const needUpdate = this.isAnnouncementDifferent(storedFirst, defaultAnn);
            if (needUpdate) {
                const newAnnouncements = this.getDefaultAnnouncements();
                Storage.set('announcements', newAnnouncements);
                this.announcements = newAnnouncements;
            } else {
                this.announcements = stored;
            }
        }
        // 确保 read 状态与存储一致
        this.currentAnnouncement = this.announcements[0] || {};
    }

    isAnnouncementDifferent(stored, defaultAnn) {
        if (stored.id !== defaultAnn.id) return true;
        if (stored.title !== defaultAnn.title) return true;
        if (stored.focus !== defaultAnn.focus) return true;
        if (JSON.stringify(stored.updates) !== JSON.stringify(defaultAnn.updates)) return true;
        return false;
    }

    getDefaultAnnouncements() {
        return [{
            id: 'static_announcement',
            title: '系统公告',
            focus: '本站为纯前端静态资源导航站，不存储文件、不收集隐私、轻量服务器后台。',
            updates: [
                '全新界面设计-更加现代化和美观的视觉体验',
                '音乐播放器-支持多平台音乐搜索和播放',
                '星聚影视-影视、音乐、漫画、小说',
                '更多实用工具-新增多个日常使用的小工具',
                '清除缓存-可以加载更新内容！！！',
            ],
            time: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
            read: false
        }];
    }

    createModal() {
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'announcement-modal-simple';
        this.modalElement.id = 'announcementModal';

        const ann = this.currentAnnouncement || {};
        const title = this.escapeHtml(ann.title || '公告');
        const focus = this.escapeHtml(ann.focus || '');
        const updates = ann.updates && Array.isArray(ann.updates) ? ann.updates : [];
        const time = this.escapeHtml(ann.time || new Date().toLocaleDateString());

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
                        <div class="section-label">
                            <i class="fas fa-star" style="color: #f59e0b; font-size: 0.9rem;"></i>
                            <span>重要提醒</span>
                        </div>
                        <div class="focus-content">${focus}</div>
                    </div>
                    <div class="updates-section">
                        <div class="section-label">
                            <i class="fas fa-sync-alt" style="color: #10b981; font-size: 0.9rem;"></i>
                            <span>更新内容</span>
                        </div>
                        <ul class="updates-list">
                            ${updates.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
                        </ul>
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

        // 统一关闭处理函数，确保标记已读并更新 badge
        const closeHandler = () => {
            this.markCurrentAsRead();
            this.hide();
        };

        if (closeBtn) closeBtn.addEventListener('click', closeHandler);
        if (ackBtn) ackBtn.addEventListener('click', closeHandler);

        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.markCurrentAsRead();
                this.hide();
            }
        });
    }

    setupGlobalEvents() {
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.markCurrentAsRead();
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    markCurrentAsRead() {
        if (!this.currentAnnouncement || this.currentAnnouncement.read) return;
        // 修改当前公告的 read 状态
        this.currentAnnouncement.read = true;
        const index = this.announcements.findIndex(a => a.id === this.currentAnnouncement.id);
        if (index !== -1) {
            this.announcements[index].read = true;
            // 同步存储
            Storage.set('announcements', this.announcements);
        }
        // 更新导航栏红点
        this.updateNavbarBadge();
    }

    updateNavbarBadge() {
        if (window.app?.components?.navbar && typeof window.app.components.navbar.updateNotificationBadge === 'function') {
            window.app.components.navbar.updateNotificationBadge();
        } else if (window.navbar && typeof window.navbar.updateNotificationBadge === 'function') {
            window.navbar.updateNotificationBadge();
        } else {
            // 降级：直接操作 DOM
            const btn = document.getElementById('announcementBtn');
            if (btn) {
                const unread = this.getUnreadCount();
                let badge = btn.querySelector('.nav-badge');
                if (unread > 0) {
                    if (!badge) {
                        badge = document.createElement('div');
                        badge.className = 'nav-badge';
                        btn.appendChild(badge);
                    }
                    badge.textContent = unread > 9 ? '9+' : unread;
                    badge.classList.add('show');
                    btn.classList.add('has-unread');
                } else {
                    if (badge) {
                        badge.classList.remove('show');
                        setTimeout(() => badge.remove(), 300);
                        btn.classList.remove('has-unread');
                    }
                }
            }
        }
    }

    getUnreadCount() {
        return this.announcements.filter(a => !a.read).length;
    }

    showModal() {
        if (!this.modalElement) this.createModal();
        if (this.isVisible) return;

        this.closeOtherModals();
        this.modalElement.classList.add('active');
        this.isVisible = true;

        if (window.app) window.app.registerModal(this);
        this.updateButtonState(true);
    }

    hide() {
        if (!this.isVisible || !this.modalElement) return;

        this.updateButtonState(false);
        this.modalElement.classList.remove('active');

        setTimeout(() => {
            this.isVisible = false;
            if (window.app) window.app.unregisterModal(this);
        }, 400);
    }

    toggleModal() {
        this.isVisible ? this.hide() : this.showModal();
    }

    closeOtherModals() {
        if (window.sidebar?.isVisible?.()) window.sidebar.hide();
        if (window.searchModule?.isModalOpen?.()) window.searchModule.hide();
        const musicPlayer = document.getElementById('musicPlayer');
        if (musicPlayer?.classList.contains('show') && window.app?.components?.navbar) {
            window.app.components.navbar.hideMusicPlayer();
        }
        if (window.aboutModule?.isVisible) window.aboutModule.hide();
        if (window.app?.modules?.weather?.hide) window.app.modules.weather.hide();
    }

    updateButtonState(active) {
        const btn = document.getElementById('announcementBtn');
        if (btn) btn.classList.toggle('active', active);
    }

    resetAnnouncements() {
        this.announcements = this.getDefaultAnnouncements();
        this.currentAnnouncement = this.announcements[0];
        Storage.set('announcements', this.announcements);
        this.createModal();
        this.updateNavbarBadge();
    }

    getAnnouncements() {
        return this.announcements;
    }

    updateAnnouncements(newAnnouncements) {
        if (!Array.isArray(newAnnouncements) || newAnnouncements.length === 0) return;
        Storage.set('announcements', newAnnouncements);
        this.loadAnnouncements();
        this.createModal();
        if (this.isVisible) this.showModal();
        this.updateNavbarBadge();
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

// 等待 DOM 加载完成后再初始化
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