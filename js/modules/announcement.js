/* announcement.js - 精简版（公告展示 + 未读标记 + 模态控制） */
class AnnouncementModule {
    constructor() {
        if (window.Starlink?.announcement) return window.Starlink.announcement;
        
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
            if (data?.id && data.title && data.content) {
                const lastSeenId = localStorage.getItem('announcement_last_seen_id');
                this.setUnreadFlag(!lastSeenId || data.id !== parseInt(lastSeenId));
                return {
                    id: data.id,
                    title: data.title,
                    important: data.important || '',
                    content: data.content,
                    date: data.date || new Date(data.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
                };
            }
            this.setUnreadFlag(false);
            return null;
        } catch (error) {
            console.error('获取公告失败:', error);
            return null;
        }
    }

    setUnreadFlag(hasUnread) {
        const btn = document.getElementById('announcementBtn');
        if (!btn) return;
        if (hasUnread) {
            btn.classList.add('has-unread');
            let badge = btn.querySelector('.nav-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                btn.appendChild(badge);
            }
            badge.textContent = '新';
            badge.style.display = 'inline-flex';
        } else {
            btn.classList.remove('has-unread');
            const badge = btn.querySelector('.nav-badge');
            if (badge) badge.style.display = 'none';
        }
    }

    markAsRead() {
        if (this.currentAnnouncement?.id) {
            localStorage.setItem('announcement_last_seen_id', this.currentAnnouncement.id);
            localStorage.setItem('announcement_last_seen_time', Date.now());
            this.setUnreadFlag(false);
        }
    }

    async loadAnnouncement() {
        this.currentAnnouncement = await this.fetchActiveAnnouncement();
        this.createModal();
    }

    createModal() {
        if (this.modalElement) { this.modalElement.remove(); this.modalElement = null; }
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'announcement-modal-simple';
        this.modalElement.id = 'announcementModal';

        if (!this.currentAnnouncement?.title) {
            this.modalElement.innerHTML = `
                <div class="announcement-modal-container">
                    <div class="announcement-header">
                        <div class="announcement-title"><i class="fas fa-bell" style="color:#4361ee;font-size:1.2rem;"></i><span>暂无公告</span></div>
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

        const { title, important, content, date } = this.currentAnnouncement;
        this.modalElement.innerHTML = `
            <div class="announcement-modal-container">
                <div class="announcement-header">
                    <div class="announcement-title"><i class="fas fa-bell" style="color:#4361ee;font-size:1.2rem;"></i><span>${this.escapeHtml(title)}</span></div>
                    <button class="announcement-close" id="announcementClose"><i class="fas fa-times"></i></button>
                </div>
                <div class="announcement-body">
                    <div class="focus-section"><div class="focus-content">${important ? this.escapeHtml(important) : '暂无重要提示'}</div></div>
                    <div class="updates-section">
                        <div class="updates-title"><i class="fas fa-sync-alt" style="color:#10b981;"></i> 更新内容：</div>
                        <ul class="updates-list"><li>${this.escapeHtml(content).replace(/\n/g, '<br>')}</li></ul>
                    </div>
                </div>
                <div class="announcement-footer">
                    <span class="announcement-date"><i class="far fa-calendar-alt"></i> ${this.escapeHtml(date)}</span>
                    <button class="announcement-ack-btn" id="announcementAckBtn">知道了</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modalElement);
        this.bindModalEvents();
    }

    bindModalEvents() {
        if (!this.modalElement) return;
        const closeHandler = () => this.hide();
        this.modalElement.querySelector('#announcementClose')?.addEventListener('click', closeHandler);
        this.modalElement.querySelector('#announcementAckBtn')?.addEventListener('click', closeHandler);
        this.modalElement.addEventListener('click', (e) => { if (e.target === this.modalElement) this.hide(); });
    }

    setupGlobalEvents() {
        this.escapeHandler = (e) => { if (e.key === 'Escape' && this.isVisible) this.hide(); };
        document.addEventListener('keydown', this.escapeHandler);

        const btn = document.getElementById('announcementBtn');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleModal(); });
        }
    }

    showModal() {
        if (!this.modalElement) this.createModal();
        if (this.isVisible) return;
        this.closeOtherModals();
        this.modalElement.classList.add('active');
        this.isVisible = true;
        this.markAsRead();
        window.Starlink?.app?.registerModal(this);
        this.updateButtonState(true);
    }

    hide() {
        if (!this.isVisible || !this.modalElement) return;
        this.modalElement.classList.remove('active');
        this.updateButtonState(false);
        const onTransitionEnd = () => {
            this.isVisible = false;
            window.Starlink?.app?.unregisterModal(this);
            this.modalElement.removeEventListener('transitionend', onTransitionEnd);
        };
        this.modalElement.addEventListener('transitionend', onTransitionEnd, { once: true });
        setTimeout(() => {
            if (this.isVisible) {
                this.isVisible = false;
                window.Starlink?.app?.unregisterModal(this);
            }
        }, 400);
    }

    toggleModal() { this.isVisible ? this.hide() : this.showModal(); }

    closeOtherModals() {
        window.Starlink?.sidebar?.hide?.();
        window.sidebar?.hide?.();
        window.Starlink?.search?.hide?.();
        window.newSearchModule?.hide?.();
        window.Starlink?.navbar?.hideMusicPlayer?.();
        window.app?.components?.navbar?.hideMusicPlayer?.();
        window.Starlink?.weather?.hide?.();
        window.app?.modules?.weather?.hide?.();
        window.Starlink?.about?.hide?.();
        window.aboutModule?.hide?.();
        window.Starlink?.app?.hideNotebookModal?.();
        window.hideNotebookModal?.();
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
        if (this.escapeHandler) document.removeEventListener('keydown', this.escapeHandler);
        this.modalElement?.remove();
        this.modalElement = null;
    }
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.announcement) window.Starlink.announcement = new AnnouncementModule();
        window.announcementModule = window.Starlink.announcement;
    });
} else {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.announcement) window.Starlink.announcement = new AnnouncementModule();
    window.announcementModule = window.Starlink.announcement;
}