/**
 * 关于网站模块 - 包含收款模态框（左右等宽布局）
 * @class AboutModule
 */
class AboutModule {
    constructor() {
        this.modalElement = null;
        this.isShowing = false;
        this.isInitialized = false;
        this.version = 'v1.6.8';
        this.updateDate = '2025-12-08';
        this.developer = '神木Ai';
        this.wallpaperUrl = './assets/images/wallpaper-about.jpg';
        this.logoUrl = './assets/logo.png';
        this.supporters = [
            '凪💭', 'Aurora叙', '하늘별', '屿风眠', '月见·凛', '星落6秒', '雾栖鹤', 'Luna禾',
            '云隙光', '달빛', '晚舟载梦行', '橘色风', '诗藏雾里', '风渡Aurora', '安☆', '星野の信',
            '山茶吻风', '云禾向晚', '夏·星眠', '雾漫屿', '凪の彼方', '月叙温柔', '光', '橘光映雪',
            '星河赴', '屿安岁静', '风禾叙', '晚叙·雪', '严一', '星落指尖', '雾里寻星', '하늘길',
            '月见山青', '云间藏月', '梦渡星河', '星眠序', '风吻麦', '雾屿栖鹤', '凪风·夏', '晚舟归港'
        ];
        
        this.qrCodes = {
            qq: './assets/images/qq.png',
            wechat: './assets/images/wx.png',
            alipay: './assets/images/zfb.png'
        };
    }

    init() {
        if (this.isInitialized) return Promise.resolve();
        this.isInitialized = true;
        this.createModal();
        this.bindGlobalEvents();
        return Promise.resolve();
    }

    createModal() {
        if (this.modalElement) this.modalElement.remove();

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'about-modal';
        this.modalElement.innerHTML = this.renderModal();
        this.modalElement.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: transparent; display: none; align-items: center;
            justify-content: center; z-index: 10000; opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(this.modalElement);
        this.bindModalEvents();
    }

    renderModal() {
        return `
            <div class="about-modal-content">
                <div class="about-header">
                    <div class="about-header-bg" style="background-image: url('${Utils.escapeHtml(this.wallpaperUrl)}')"></div>
                    <div class="about-header-overlay"></div>
                    <div class="about-header-content">
                        <div class="about-header-left">
                            <div class="about-info-grid">
                                <div class="about-info-item">
                                    <span class="info-label">开发者：</span>
                                    <span class="info-value">${Utils.escapeHtml(this.developer)}</span>
                                </div>
                                <div class="about-info-item">
                                    <span class="info-label">网站版本：</span>
                                    <span class="info-value">${Utils.escapeHtml(this.version)}</span>
                                </div>
                                <div class="about-info-item">
                                    <span class="info-label">更新日期：</span>
                                    <span class="info-value">${Utils.escapeHtml(this.updateDate)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="about-header-right">
                            <div class="about-brand">
                                <div class="about-logo" style="border-radius:8px; overflow:hidden;">
                                    <img src="${Utils.escapeHtml(this.logoUrl)}" alt="星聚导航Logo" class="about-logo-img" style="border-radius:8px; width:100%; height:100%; object-fit:cover;">
                                </div>
                                <div class="about-title-group">
                                    <div class="about-title">星聚导航</div>
                                    <div class="about-subtitle">您的个人导航中心</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="about-main-content">
                    <div class="about-cards">
                        <div class="about-card">
                            <div class="card-icon intro-icon"><i class="fas fa-info-circle"></i></div>
                            <div class="card-content">
                                <h3>简介</h3>
                                <p>星聚导航是一个现代化的个人导航网站，致力于收集整理网络上的优质资源和个人开发的小工具，为用户提供便捷的上网导航体验。</p>
                            </div>
                        </div>
                        <div class="about-card">
                            <div class="card-icon disclaimer-icon"><i class="fas fa-exclamation-triangle"></i></div>
                            <div class="card-content">
                                <h3>免责声明</h3>
                                <p>本站所有资源均来自互联网收集整理，仅供个人学习交流使用，不得用于商业用途。如有侵犯您的权益，请联系我们删除。</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="about-footer">
                    <div class="about-action-buttons">
                        <div class="about-social-buttons">
                            <button class="about-social-btn qq-btn tooltip" id="aboutQQBtn"><i class="fab fa-qq"></i><span class="tooltip-text">QQ联系</span></button>
                            <button class="about-social-btn wechat-btn tooltip" id="aboutWechatBtn"><i class="fab fa-weixin"></i><span class="tooltip-text">微信联系</span></button>
                            <button class="about-social-btn donate-btn tooltip" id="aboutDonateBtn"><i class="fas fa-heart"></i><span class="tooltip-text">爱发电支持</span></button>
                            <button class="about-social-btn space-btn tooltip" id="aboutPrivateSpaceBtn"><i class="fas fa-user-secret"></i><span class="tooltip-text">私密空间</span></button>
                        </div>
                        <button class="about-close-btn" id="aboutCloseBtn">关闭</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindModalEvents() {
        if (!this.modalElement) return;
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) this.hide();
        });
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        this.bindButtonEvents();
        this.preloadImages();
    }

    preloadImages() {
        const wallpaperImg = new Image();
        wallpaperImg.onerror = () => {
            const bg = this.modalElement?.querySelector('.about-header-bg');
            if (bg) { bg.style.backgroundImage = 'none'; bg.style.backgroundColor = 'var(--primary-color)'; }
        };
        wallpaperImg.src = this.wallpaperUrl;
        new Image().src = this.logoUrl;
    }

    bindButtonEvents() {
        document.getElementById('aboutQQBtn')?.addEventListener('click', () => window.open('https://qm.qq.com/example', '_blank'));
        document.getElementById('aboutWechatBtn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const orig = btn.innerHTML;
            btn.innerHTML = '<span>微信号: example</span>';
            setTimeout(() => btn.innerHTML = orig, 3000);
        });
        document.getElementById('aboutDonateBtn')?.addEventListener('click', () => { this.hide(); setTimeout(() => this.showDonateModal(), 300); });
        document.getElementById('aboutPrivateSpaceBtn')?.addEventListener('click', () => { this.hide(); setTimeout(() => window.location.href = './pages/others/smkj.html', 300); });
        document.getElementById('aboutCloseBtn')?.addEventListener('click', () => this.hide());
    }

    showDonateModal() {
        const donateModal = document.createElement('div');
        donateModal.className = 'donate-modal';
        donateModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: transparent; display: flex; align-items: center;
            justify-content: center; z-index: 10001; opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // 左右等宽布局：左列标题+副标题+按钮网格，右列二维码
        donateModal.innerHTML = `
            <div class="donate-modal-content">
                <!-- 中部主体：左右等分 -->
                <div class="donate-main">
                    <!-- 左侧面板 -->
                    <div class="donate-left-panel">
                        <div class="donate-left-title">
                            <div class="donate-title-group">
                                <h3 class="donate-title">感谢支持</h3>
                                <div class="donate-heart"><i class="fas fa-heart"></i></div>
                            </div>
                            <p class="donate-subtitle">您的支持是我持续更新的动力</p>
                        </div>
                        <div class="donate-methods">
                            <button class="donate-method-btn active" data-type="qq" title="QQ支付"><i class="fab fa-qq"></i></button>
                            <button class="donate-method-btn" data-type="wechat" title="微信支付"><i class="fab fa-weixin"></i></button>
                            <button class="donate-method-btn" data-type="alipay" title="支付宝"><i class="fab fa-alipay"></i></button>
                            <button class="donate-method-btn help-btn" data-type="help" title="使用帮助"><i class="fas fa-question"></i></button>
                        </div>
                    </div>
                    <!-- 右侧面板：二维码 -->
                    <div class="donate-right-panel">
                        <div class="donate-qrcode-wrapper">
                            <div class="donate-qrcode active" data-type="qq">
                                <div class="qrcode-image-container">
                                    <img src="${Utils.escapeHtml(this.qrCodes.qq)}" alt="QQ收款码" class="qrcode-image" onerror="this.style.display='none'; this.parentNode.querySelector('.qrcode-placeholder').style.display='flex';">
                                    <div class="qrcode-placeholder"><i class="fab fa-qq"></i><span>QQ收款码</span><small>请使用QQ扫描二维码</small></div>
                                </div>
                            </div>
                            <div class="donate-qrcode" data-type="wechat">
                                <div class="qrcode-image-container">
                                    <img src="${Utils.escapeHtml(this.qrCodes.wechat)}" alt="微信收款码" class="qrcode-image" onerror="this.style.display='none'; this.parentNode.querySelector('.qrcode-placeholder').style.display='flex';">
                                    <div class="qrcode-placeholder"><i class="fab fa-weixin"></i><span>微信收款码</span><small>请使用微信扫描二维码</small></div>
                                </div>
                            </div>
                            <div class="donate-qrcode" data-type="alipay">
                                <div class="qrcode-image-container">
                                    <img src="${Utils.escapeHtml(this.qrCodes.alipay)}" alt="支付宝收款码" class="qrcode-image" onerror="this.style.display='none'; this.parentNode.querySelector('.qrcode-placeholder').style.display='flex';">
                                    <div class="qrcode-placeholder"><i class="fab fa-alipay"></i><span>支付宝收款码</span><small>请使用支付宝扫描二维码</small></div>
                                </div>
                            </div>
                            <div class="donate-qrcode" data-type="help">
                                <div class="help-content">
                                    <h4>使用说明</h4>
                                    <ul>
                                        <li>选择您要使用的支付方式</li>
                                        <li>使用对应App扫描二维码</li>
                                        <li>输入您想支持的金额</li>
                                        <li>在备注中留下您的名字</li>
                                    </ul>
                                    <p>感谢您的支持！</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 支持者名单（全宽） -->
                <div class="supporters-section">
                    <h4 class="supporters-title">支持者名单</h4>
                    <div class="supporters-card">
                        <div class="supporters-list">
                            ${this.supporters.map(name => `<span class="supporter-name">${Utils.escapeHtml(name)}</span>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- 底部关闭按钮（全宽居中） -->
                <div class="donate-footer-close">
                    <button class="donate-close-btn-bottom" id="donateCloseBtnBottom">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(donateModal);
        setTimeout(() => {
            donateModal.style.opacity = '1';
            donateModal.querySelector('.donate-modal-content').style.transform = 'scale(1)';
        }, 10);

        this.bindDonateModalEvents(donateModal);
    }

    bindDonateModalEvents(donateModal) {
        const methodButtons = donateModal.querySelectorAll('.donate-method-btn');
        const qrcodes = donateModal.querySelectorAll('.donate-qrcode');
        methodButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                methodButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                qrcodes.forEach(qr => qr.classList.remove('active'));
                const target = donateModal.querySelector(`.donate-qrcode[data-type="${type}"]`);
                if (target) target.classList.add('active');
            });
        });

        const closeBtn = donateModal.querySelector('#donateCloseBtnBottom');
        const hideModal = () => {
            donateModal.style.opacity = '0';
            donateModal.querySelector('.donate-modal-content').style.transform = 'scale(0.8)';
            setTimeout(() => donateModal.remove(), 300);
        };
        if (closeBtn) closeBtn.addEventListener('click', hideModal);
        donateModal.addEventListener('click', (e) => { if (e.target === donateModal) hideModal(); });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { hideModal(); document.removeEventListener('keydown', escHandler); }
        });
    }

    handleKeydown(e) { if (e.key === 'Escape' && this.isShowing) this.hide(); }

    bindGlobalEvents() {
        document.getElementById('aboutBtn')?.addEventListener('click', () => this.show());
    }

    show() {
        if (!this.modalElement) this.createModal();
        if (this.isShowing) return;
        if (window.sidebar?.isVisible()) window.sidebar.hide();
        this.isShowing = true;
        this.modalElement.style.display = 'flex';
        this.modalElement.offsetHeight;
        setTimeout(() => {
            this.modalElement.style.opacity = '1';
            this.modalElement.querySelector('.about-modal-content').style.transform = 'scale(1)';
        }, 10);
        window.app?.registerModal(this);
    }

    hide() {
        if (!this.isShowing || !this.modalElement) return;
        this.modalElement.style.opacity = '0';
        this.modalElement.querySelector('.about-modal-content').style.transform = 'scale(0.8)';
        setTimeout(() => {
            this.modalElement.style.display = 'none';
            this.isShowing = false;
            window.app?.unregisterModal(this);
        }, 300);
    }

    destroy() {
        this.hide();
        document.removeEventListener('keydown', this.handleKeydown);
        this.modalElement?.remove();
        this.modalElement = null;
        this.isInitialized = false;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.aboutModule = new AboutModule(); window.aboutModule.init(); });
} else {
    window.aboutModule = new AboutModule();
    window.aboutModule.init();
}
if (typeof module !== 'undefined' && module.exports) module.exports = AboutModule;