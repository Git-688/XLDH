/* partner.js - 合作伙伴模块（加入请求重试机制，解决 503 数据库初始化问题） */
(function() {
    'use strict';

    class PartnerModule {
        constructor() {
            if (window.Starlink && window.Starlink.partner) return window.Starlink.partner;
            this.modal = document.getElementById('partnerModal');
            this.triggerBtn = document.getElementById('partnerTriggerBtn');
            this.closeBtn = document.getElementById('partnerModalClose');
            this.listContainer = document.getElementById('partnerList');
            this.introContainer = document.querySelector('.partner-intro p');
            this.isVisible = false;
            this.partners = [];
            // 安全获取 API 基础 URL
            this.apiBase = (typeof Utils !== 'undefined' && Utils.getApiBase) 
                ? Utils.getApiBase() 
                : (window.APP_CONFIG?.API_BASE || 'https://api.xjdh688.ccwu.cc');
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
            // 首次加载数据，带重试（5 次，间隔 2 秒）
            this.loadData(5, 2000);
        }

        /**
         * 加载合作伙伴数据（支持自动重试）
         * @param {number} retries - 剩余重试次数
         * @param {number} delay - 重试间隔（毫秒）
         */
        async loadData(retries = 3, delay = 2000) {
            try {
                const [partnersRes, settingsRes] = await Promise.all([
                    Utils.safeFetch(`${this.apiBase}/partners`, { timeout: 8000 }),
                    Utils.safeFetch(`${this.apiBase}/partner-settings`, { timeout: 8000 })
                ]);

                // 处理合作伙伴列表
                if (partnersRes.ok) {
                    this.partners = await partnersRes.json();
                } else {
                    // 如果是 503 或 5xx 错误，触发重试
                    if (partnersRes.status >= 500 && retries > 0) {
                        throw new Error(`HTTP ${partnersRes.status}: 服务暂时不可用`);
                    }
                    this.partners = [];
                }

                // 处理合作公告
                if (settingsRes.ok) {
                    const settings = await settingsRes.json();
                    if (settings.intro && this.introContainer) {
                        this.introContainer.textContent = settings.intro;
                    }
                }

                // 如果模态框已打开，刷新列表
                if (this.isVisible) {
                    this.renderList();
                }
            } catch (error) {
                // ===== 重试逻辑：仅对 5xx 错误或网络错误重试 =====
                const isRetryable = error.message && (
                    error.message.includes('503') ||
                    error.message.includes('500') ||
                    error.message.includes('502') ||
                    error.message.includes('504') ||
                    error.message.includes('fetch') ||
                    error.message.includes('timeout')
                );

                if (retries > 0 && isRetryable) {
                    console.warn(`合作伙伴数据加载失败（${error.message}），${retries} 次重试后重试，间隔 ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    // 递归重试，指数退避（逐步增加间隔）
                    return this.loadData(retries - 1, Math.min(delay * 1.5, 5000));
                } else {
                    console.error('加载合作伙伴数据失败:', error);
                    if (this.isVisible) {
                        this.listContainer.innerHTML = `<div class="empty">加载失败，请<a href="javascript:void(0)" onclick="window.partnerModule?.refresh()" style="color:var(--primary-color);text-decoration:underline;">点击重试</a></div>`;
                    }
                }
            }
        }

        renderList() {
            if (!this.listContainer) return;
            if (!this.partners || !this.partners.length) {
                this.listContainer.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-secondary);font-size:14px;">🎉 期待你的加入...</div>';
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
            this.closeOtherModals();
            // 打开前重新加载数据（带重试）
            this.loadData(3, 1500).then(() => {
                this.renderList();
            });
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

        /**
         * 手动刷新数据（外部调用）
         */
        async refresh() {
            await this.loadData(3, 1500);
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

    // ===== 在 DOM 就绪后初始化 =====
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.partner) {
            window.Starlink.partner = new PartnerModule();
        }
        window.partnerModule = window.Starlink.partner;
    });
})();