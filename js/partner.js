/* partner.js - 精简版（合作伙伴模块） */
(function() {
    'use strict';

    class PartnerModule {
        constructor() {
            if (window.Starlink?.partner) return window.Starlink.partner;
            
            this.modal = document.getElementById('partnerModal');
            this.triggerBtn = document.getElementById('partnerTriggerBtn');
            this.closeBtn = document.getElementById('partnerModalClose');
            this.listContainer = document.getElementById('partnerList');
            this.introContainer = document.querySelector('.partner-intro p');
            this.isVisible = false;
            this.partners = [];
            this.apiBase = Utils.getApiBase();
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
            this.loadData();
        }

        async loadData() {
            try {
                const [partnersRes, settingsRes] = await Promise.all([
                    Utils.safeFetch(`${this.apiBase}/partners`, { timeout: 8000 }),
                    Utils.safeFetch(`${this.apiBase}/partner-settings`, { timeout: 8000 })
                ]);

                if (partnersRes?.ok) this.partners = await partnersRes.json();
                else this.partners = [];

                if (settingsRes?.ok) {
                    const settings = await settingsRes.json();
                    if (settings.intro && this.introContainer) {
                        this.introContainer.textContent = settings.intro;
                    }
                }

                if (this.isVisible) this.renderList();
            } catch (error) {
                console.warn('加载合作伙伴数据失败:', error);
                if (this.isVisible) {
                    this.listContainer.innerHTML = '<div class="empty">加载失败，请刷新重试</div>';
                }
            }
        }

        renderList() {
            if (!this.listContainer) return;
            
            if (!this.partners?.length) {
                this.listContainer.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-secondary);font-size:14px;">🎉 期待你的加入...</div>';
                return;
            }

            this.listContainer.innerHTML = this.partners.map(p => {
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
        }

        open() {
            if (this.isVisible) return;
            this.closeOtherModals();
            this.renderList();
            this.modal.classList.add('active');
            this.isVisible = true;
            document.body.style.overflow = 'hidden';
            window.Starlink?.app?.registerModal(this);
        }

        close() {
            if (!this.isVisible || !this.modal) return;
            this.modal.classList.remove('active');
            const onTransitionEnd = () => {
                document.body.style.overflow = '';
                this.isVisible = false;
                window.Starlink?.app?.unregisterModal(this);
                this.modal.removeEventListener('transitionend', onTransitionEnd);
            };
            this.modal.addEventListener('transitionend', onTransitionEnd, { once: true });
            setTimeout(onTransitionEnd, 400);
        }

        closeOtherModals() {
            window.Starlink?.sidebar?.hide?.();
            window.Starlink?.search?.hide?.();
            window.Starlink?.navbar?.hideMusicPlayer?.();
            window.Starlink?.weather?.hide?.();
            window.Starlink?.about?.hide?.();
            window.Starlink?.app?.hideNotebookModal?.();
            window.Starlink?.comment?.close?.();
            window.Starlink?.submit?.hide?.();
            
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

        async refresh() {
            await this.loadData();
            if (this.isVisible) this.renderList();
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
        if (!window.Starlink.partner) window.Starlink.partner = new PartnerModule();
        window.partnerModule = window.Starlink.partner;
    });
})();