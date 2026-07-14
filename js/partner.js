/* partner.js - 合作伙伴模块 */
(function() {
    'use strict';

    // 合作伙伴数据（可改为从接口获取）
    const DEFAULT_PARTNERS = [
        { name: '星聚图床', icon: 'https://tc688.ccwu.cc/logo.png', url: 'https://tc688.ccwu.cc' },
        { name: '星聚影视', icon: 'https://ys688.ccwu.cc/favicon.ico', url: 'https://ys688.ccwu.cc' },
        { name: '神木Ai', icon: '', url: 'https://smai.cc' },
        { name: '极光工具', icon: '', url: 'https://jiguang.cc' },
        { name: '星聚导航', icon: '/assets/logo.png', url: 'https://xjdh688.ccwu.cc' }
    ];

    class PartnerModule {
        constructor() {
            if (window.Starlink && window.Starlink.partner) return window.Starlink.partner;
            this.modal = document.getElementById('partnerModal');
            this.triggerBtn = document.getElementById('partnerTriggerBtn');
            this.closeBtn = document.getElementById('partnerModalClose');
            this.listContainer = document.getElementById('partnerList');
            this.isVisible = false;
            this.partners = [];
            this.init();
            if (window.Starlink) window.Starlink.partner = this;
            window.partnerModule = this;
        }

        init() {
            if (!this.modal || !this.triggerBtn || !this.closeBtn || !this.listContainer) {
                console.warn('合作伙伴模块 DOM 元素缺失');
                return;
            }
            this.bindEvents();
            this.loadPartners();
        }

        loadPartners() {
            // 从 localStorage 读取或使用默认
            try {
                const cached = localStorage.getItem('partner_list');
                if (cached) {
                    const data = JSON.parse(cached);
                    if (Array.isArray(data) && data.length) {
                        this.partners = data;
                        return;
                    }
                }
            } catch (e) {}
            this.partners = DEFAULT_PARTNERS;
            // 缓存到本地
            try {
                localStorage.setItem('partner_list', JSON.stringify(this.partners));
            } catch (e) {}
        }

        renderList() {
            if (!this.listContainer) return;
            if (!this.partners || !this.partners.length) {
                this.listContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">暂无合作伙伴</div>';
                return;
            }
            const html = this.partners.map(p => {
                const iconHtml = p.icon ?
                    `<img src="${Utils.escapeHtml(p.icon)}" alt="${Utils.escapeHtml(p.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas fa-link\\'></i>';">` :
                    '<i class="fas fa-link"></i>';
                return `
                    <div class="partner-item">
                        <div class="partner-icon">${iconHtml}</div>
                        <span class="partner-name">${Utils.escapeHtml(p.name)}</span>
                        <a href="${Utils.escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer" class="partner-link-btn">访问 →</a>
                    </div>
                `;
            }).join('');
            this.listContainer.innerHTML = html;
        }

        open() {
            if (this.isVisible) return;
            // 关闭其他模态框
            this.closeOtherModals();
            this.renderList();
            this.modal.classList.add('active');
            this.isVisible = true;
            document.body.style.overflow = 'hidden';
            if (window.Starlink?.app) window.Starlink.app.registerModal(this);
            else if (window.app) window.app.registerModal(this);
        }

        close() {
            if (!this.isVisible || !this.modal) return;
            this.modal.classList.remove('active');
            const onTransitionEnd = () => {
                document.body.style.overflow = '';
                this.isVisible = false;
                if (window.Starlink?.app) window.Starlink.app.unregisterModal(this);
                else if (window.app) window.app.unregisterModal(this);
                this.modal.removeEventListener('transitionend', onTransitionEnd);
            };
            this.modal.addEventListener('transitionend', onTransitionEnd, { once: true });
            setTimeout(onTransitionEnd, 400);
        }

        closeOtherModals() {
            if (window.Starlink?.sidebar?.isVisible?.()) window.Starlink.sidebar.hide();
            if (window.Starlink?.search?.isModalOpen?.()) window.Starlink.search.hide();
            if (window.Starlink?.navbar?.hideMusicPlayer) window.Starlink.navbar.hideMusicPlayer();
            if (window.Starlink?.weather?.isShowing) window.Starlink.weather.hide();
            if (window.Starlink?.about?.isVisible) window.Starlink.about.hide();
            if (window.Starlink?.app?.hideNotebookModal) window.Starlink.app.hideNotebookModal();
            if (window.Starlink?.comment?.isVisible) window.Starlink.comment.close();
            if (window.Starlink?.submit?.isVisible) window.Starlink.submit.hide();
            const submitModal = document.getElementById('submitModal');
            if (submitModal?.classList.contains('active')) submitModal.classList.remove('active');
            const commentModal = document.getElementById('commentModal');
            if (commentModal?.classList.contains('active')) commentModal.classList.remove('active');
        }

        bindEvents() {
            this.triggerBtn.addEventListener('click', () => this.open());
            this.closeBtn.addEventListener('click', () => this.close());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible) this.close();
            });
        }

        destroy() {
            this.close();
            this.modal = null;
            this.triggerBtn = null;
            this.closeBtn = null;
            this.listContainer = null;
        }
    }

    // 自动初始化
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.partner) {
            window.Starlink.partner = new PartnerModule();
        }
        window.partnerModule = window.Starlink.partner;
    });
})();