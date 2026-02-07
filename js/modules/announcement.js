/**
 * 简约公告模块 - 保留顶部标题栏，底部只显示更新日期
 * @class AnnouncementModule
 */
class AnnouncementModule {
    constructor() {
        this.announcements = [];
        this.modalElement = null;
        this.isVisible = false;
        this.isInitialized = false;
        this.clickOutsideHandler = null;
        this.escapeHandler = null;
        this.init();
    }

    /**
     * 初始化公告模块
     */
    init() {
        if (this.isInitialized) return;
        
        this.loadAnnouncements();
        this.createModal();
        this.setupGlobalEvents();
        this.isInitialized = true;
        
        // 确保全局实例可用
        window.announcementModule = this;
    }

    /**
     * 加载公告数据
     */
    loadAnnouncements() {
        const storedAnnouncements = Storage.get('announcements');
        
        if (storedAnnouncements && storedAnnouncements.length > 0) {
            // 检查是否是旧的欢迎消息或系统公告格式，如果是则替换
            if (storedAnnouncements[0].id === 'single_announcement' || 
                storedAnnouncements[0].title === '欢迎使用星链导航' ||
                storedAnnouncements[0].title === '星链导航公告' ||
                storedAnnouncements[0].source === '系统公告') {
                this.announcements = this.getDefaultAnnouncements();
                Storage.set('announcements', this.announcements);
            } else {
                this.announcements = storedAnnouncements;
            }
        } else {
            this.announcements = this.getDefaultAnnouncements();
            Storage.set('announcements', this.announcements);
        }
    }

    /**
     * 获取默认公告数据
     */
    getDefaultAnnouncements() {
        return [
            {
                id: 'current_announcement',
                title: '星链导航公告',
                focus: '星链导航已正式发布，带来全新体验和更多实用功能，优化了性能和使用体验。',
                updates: [
                    '全新界面设计 - 更加现代化和美观的视觉体验',
                    '音乐播放器 - 支持多平台音乐搜索和播放',
                    '个性化设置 - 可自定义主题和布局',
                    '更多实用工具 - 新增多个日常使用的小工具',
                    '性能优化 - 更快的加载速度和响应时间'
                ],
                time: new Date().toLocaleDateString('zh-CN'),
                read: false
            }
        ];
    }

    /**
     * 创建简约模态框 - 保留顶部标题栏，底部只显示更新日期
     */
    createModal() {
        if (this.modalElement) {
            this.removeEventListeners();
            this.modalElement.remove();
            this.modalElement = null;
        }

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'announcement-modal-v2';
        this.modalElement.id = 'announcementModal';

        const currentAnnouncement = this.getCurrentAnnouncement();
        
        this.modalElement.innerHTML = `
            <div class="announcement-modal-container">
                <!-- 顶部标题栏 - 保留 -->
                <div class="announcement-header">
                    <div class="announcement-title">
                        <i class="fas fa-bullhorn"></i>
                        ${this.escapeHtml(currentAnnouncement.title || '星链导航公告')}
                    </div>
                    <button class="announcement-close" id="announcementClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="announcement-body">
                    <!-- 重点内容 -->
                    <div class="announcement-focus">
                        <div class="focus-title">
                            <i class="fas fa-star"></i>
                            重要提醒
                        </div>
                        <div class="focus-content">
                            ${this.escapeHtml(currentAnnouncement.focus || '暂无重要提醒内容')}
                        </div>
                    </div>

                    <!-- 更新内容 -->
                    <div class="update-section">
                        <div class="update-title">
                            <i class="fas fa-sync-alt"></i>
                            更新内容
                        </div>
                        <ul class="update-list">
                            ${currentAnnouncement.updates ? 
                                currentAnnouncement.updates.map(update => 
                                    `<li class="update-item">${this.escapeHtml(update)}</li>`
                                ).join('') : 
                                '<li class="update-item">暂无更新内容</li>'
                            }
                        </ul>
                    </div>
                </div>

                <!-- 底部只显示更新日期 -->
                <div class="announcement-footer">
                    <div class="announcement-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            更新日期：${this.escapeHtml(currentAnnouncement.time)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);
        this.bindModalEvents();
    }

    /**
     * HTML转义函数，防止XSS
     */
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        if (!this.modalElement) return;

        const closeBtn = this.modalElement.querySelector('#announcementClose');
        const currentAnnouncement = this.getCurrentAnnouncement();

        if (closeBtn) {
            closeBtn.onclick = () => this.hide();
        }

        // 点击模态框外部关闭
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.hide();
            }
        });

        // 自动标记为已读
        this.markAsRead(currentAnnouncement);
    }

    /**
     * 设置全局事件
     */
    setupGlobalEvents() {
        this.removeGlobalEventListeners();
    }

    /**
     * 移除事件监听器
     */
    removeEventListeners() {
        this.removeGlobalEventListeners();
        
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
        }
        
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }

    /**
     * 移除全局事件监听器
     */
    removeGlobalEventListeners() {
        // 事件现在由navbar统一管理
    }

    /**
     * 切换公告显示/隐藏
     */
    toggleModal() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.showModal();
        }
    }

    /**
     * 显示公告模态框 - 添加平滑显示效果
     */
    showModal() {
        if (!this.modalElement) {
            this.createModal();
        }

        if (this.isVisible) return;

        // 关闭侧边栏和其他模态框
        this.closeOtherModals();

        this.modalElement.classList.add('active');
        this.isVisible = true;

        // 添加平滑显示效果
        const container = this.modalElement.querySelector('.announcement-modal-container');
        if (container) {
            // 初始状态
            container.style.opacity = '0';
            container.style.transform = 'scale(0.95) translateY(10px)';
            
            // 延迟执行动画，确保DOM已更新
            setTimeout(() => {
                container.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                container.style.opacity = '1';
                container.style.transform = 'scale(1) translateY(0)';
            }, 50);
        }

        // 添加事件监听器
        this.addExternalEventListeners();

        if (window.app) {
            window.app.registerModal(this);
        }

        this.updateButtonState(true);
    }

    /**
     * 添加外部事件监听器
     */
    addExternalEventListeners() {
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        };

        document.addEventListener('keydown', this.escapeHandler, true);
    }

    /**
     * 关闭其他模态框
     */
    closeOtherModals() {
        // 关闭侧边栏
        if (window.sidebar && window.sidebar.isVisible()) {
            window.sidebar.hide();
        }
        
        if (window.searchModule && window.searchModule.isModalOpen()) {
            window.searchModule.hide();
        }
        
        const musicPlayer = document.getElementById('musicPlayer');
        if (musicPlayer && musicPlayer.classList.contains('show')) {
            if (window.app && window.app.components && window.app.components.navbar) {
                window.app.components.navbar.hideMusicPlayer();
            }
        }
    }

    /**
     * 更新按钮状态
     */
    updateButtonState(isActive) {
        const announcementBtn = document.getElementById('announcementBtn');
        if (announcementBtn) {
            if (isActive) {
                announcementBtn.classList.add('active');
            } else {
                announcementBtn.classList.remove('active');
            }
        }
    }

    /**
     * 获取当前公告
     */
    getCurrentAnnouncement() {
        return this.announcements[0] || {};
    }

    /**
     * 标记公告为已读 - 自动执行
     */
    markAsRead(announcement) {
        if (announcement && !announcement.read) {
            announcement.read = true;
            Storage.set('announcements', this.announcements);
            this.updateNavbarBadge();
        }
    }

    /**
     * 更新导航栏的通知徽章
     */
    updateNavbarBadge() {
        if (window.app && window.app.components && window.app.components.navbar) {
            window.app.components.navbar.updateNotificationBadge();
        }
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        }
    }

    /**
     * 隐藏公告模态框 - 添加平滑隐藏效果
     */
    hide() {
        if (!this.isVisible || !this.modalElement) {
            return;
        }

        // 添加平滑隐藏效果
        const container = this.modalElement.querySelector('.announcement-modal-container');
        if (container) {
            container.style.transition = 'all 0.25s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
            container.style.opacity = '0';
            container.style.transform = 'scale(0.95) translateY(10px)';
        }

        this.removeEventListeners();

        setTimeout(() => {
            this.modalElement.classList.remove('active');
            this.isVisible = false;
            
            // 重置样式
            if (container) {
                container.style.transition = '';
                container.style.opacity = '';
                container.style.transform = '';
            }
            
            this.updateButtonState(false);
            
            if (window.app) {
                window.app.unregisterModal(this);
            }
        }, 250);
    }

    /**
     * 获取未读公告数量
     */
    getUnreadCount() {
        return this.announcements.filter(ann => !ann.read).length;
    }

    /**
     * 标记所有公告为已读
     */
    markAllAsRead() {
        this.announcements.forEach(ann => ann.read = true);
        Storage.set('announcements', this.announcements);
        this.updateNavbarBadge();
    }

    /**
     * 获取公告列表
     */
    getAnnouncements() {
        return this.announcements;
    }

    /**
     * 更新公告内容
     */
    updateAnnouncement(newContent) {
        if (this.announcements.length > 0) {
            Object.assign(this.announcements[0], newContent);
            Storage.set('announcements', this.announcements);
            
            this.createModal();
        }
    }

    /**
     * 强制重置公告数据
     */
    resetAnnouncements() {
        this.announcements = this.getDefaultAnnouncements();
        Storage.set('announcements', this.announcements);
        this.createModal();
    }

    /**
     * 销毁模块
     */
    destroy() {
        this.hide();
        this.removeEventListeners();
        this.removeGlobalEventListeners();
        
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
        
        this.modalElement = null;
        this.isVisible = false;
        this.isInitialized = false;
    }
}

// 初始化公告模块
window.announcementModule = new AnnouncementModule();