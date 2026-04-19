/**
 * 简约公告模块 - 清爽现代版（独立 escapeHtml）
 * @class AnnouncementModule
 */
class AnnouncementModule {
    constructor() {
        this.announcements = [];
        this.modalElement = null;
        this.isVisible = false;
        this.isInitialized = false;
        this.currentAnnouncement = null;
        this.resizeHandler = null;
        this.escapeHandler = null;
        this.init();
    }

    // 内嵌 escapeHtml 方法
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
            focus: '欢迎使用星聚导航！本站为纯前端静态资源导航站，不存储文件、不收集隐私、无服务器后台。',
            updates: [
                '全新界面设计-更加现代化和美观的视觉体验',
                '音乐播放器-支持多平台音乐搜索和播放',
                '个性化设置-可自定义书签',
                '更多实用工具-新增多个日常使用的小工具',
                '性能优化-更快的加载速度和响应时间',
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
        const focus = this.escapeHtml(ann.focus || '暂无重要提醒');
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
        this.currentAnnouncement.read = true;
        const index = this.announcements.findIndex(a => a.id === this.currentAnnouncement.id);
        if (index !== -1) {
            this.announcements[index].read = true;
            Storage.set('announcements', this.announcements);
        }
        this.updateNavbarBadge();
    }

    updateNavbarBadge() {
        if (window.app?.components?.navbar) {
            window.app.components.navbar.updateNotificationBadge();
        }
    }

    getUnreadCount() {
        return this.announcements.filter(a => !a.read).length;
    }

    adjustMaskPosition() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) {
            this.modalElement.style.top = '0';
            this.modalElement.style.height = '100%';
            return;
        }

        const navbarHeight = navbar.offsetHeight;
        if (navbarHeight > 0) {
            this.modalElement.style.top = navbarHeight + 'px';
            this.modalElement.style.height = `calc(100vh - ${navbarHeight}px)`;
        } else {
            this.modalElement.style.top = '0';
            this.modalElement.style.height = '100%';
        }
    }

    onResize = () => {
        if (this.isVisible) {
            this.adjustMaskPosition();
        }
    };

    showModal() {
        if (!this.modalElement) this.createModal();
        if (this.isVisible) return;

        this.closeOtherModals();
        this.adjustMaskPosition();
        this.modalElement.classList.add('active');
        this.isVisible = true;

        if (!this.resizeHandler) {
            this.resizeHandler = this.onResize.bind(this);
            window.addEventListener('resize', this.resizeHandler);
        }

        if (window.app) window.app.registerModal(this);
        this.updateButtonState(true);
    }

    hide() {
        if (!this.isVisible || !this.modalElement) return;

        this.updateButtonState(false);
        this.modalElement.classList.remove('active');

        setTimeout(() => {
            this.isVisible = false;
            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
                this.resizeHandler = null;
            }
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
        if (window.navbar) window.navbar.updateNotificationBadge();
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

window.announcementModule = new AnnouncementModule();