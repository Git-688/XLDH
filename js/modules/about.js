/**
 * 关于网站模块 - 包含收款模态框（模态框尺寸已调大）
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

    // 内嵌 escapeHtml
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            padding: 20px;
        `;
        document.body.appendChild(this.modalElement);
        this.bindModalEvents();
    }

    renderModal() {
        return `
            <div class="about-modal-content">
                <div class="about-header">
                    <div class="about-header-bg" style="background-image: url('${this.escapeHtml(this.wallpaperUrl)}')"></div>
                    <div class="about-header-overlay"></div>
                    <div class="about-header-content">
                        <div class="about-header-left">
                            <div class="about-info-grid">
                                <div class="about-info-item"><span class="info-label">开发者：</span><span class="info-value">${this.escapeHtml(this.developer)}</span></div>
                                <div class="about-info-item"><span class="info-label">网站版本：</span><span class="info-value">${this.escapeHtml(this.version)}</span></div>
                                <div class="about-info-item"><span class="info-label">更新日期：</span><span class="info-value">${this.escapeHtml(this.updateDate)}</span></div>
                            </div>
                        </div>
                        <div class="about-header-right">
                            <div class="about-brand">
                                <div class="about-logo"><img src="${this.escapeHtml(this.logoUrl)}" alt="星链导航Logo" class="about-logo-img" loading="lazy"></div>
                                <div class="about-title-group"><div class="about-title">星链导航</div><div class="about-subtitle">您的个人导航中心</div></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="about-main-content">
                    <div class="about-cards">
                        <div class="about-card"><div class="card-icon intro-icon"><i class="fas fa-info-circle"></i></div><div class="card-content"><h3>简介</h3><p>星链导航是一个现代化的个人导航网站，致力于收集整理网络上的优质资源和个人开发的小工具，为用户提供便捷的上网导航体验。</p></div></div>
                        <div class="about-card"><div class="card-icon disclaimer-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="card-content"><h3>免责声明</h3><p>本站所有资源均来自互联网收集整理，仅供个人学习交流使用，不得用于商业用途。如有侵犯您的权益，请联系我们删除。</p></div></div>
                    </div>
                </div>
                <div class="about-footer">
                    <div class="about-action-buttons">
                        <div class="about-social-buttons">
                            <button class="about-social-btn qq-btn tooltip" id="aboutQQBtn"><i class="fab fa-qq"></i><span class="tooltip-text">QQ联系</span></button>
                            <button class="about-social-btn wechat-btn tooltip" id="aboutWechatBtn"><i class="fab fa-weixin"></i><span class="tooltip-text">微信联系</span></button>
                            <button class="about-social-btn donate-btn tooltip" id="aboutDonateBtn"><i class="fas fa-heart"></i><span class="tooltip-text">爱发电支持</span></button>
                            <button class="about-social-btn space-btn tooltip" id="aboutPrivateSpaceBtn"><i class="fas fa-user-secret"></i><span class="tooltip-text">私密空间</span></button>
                            <button class="about-social-btn diary-btn tooltip" id="aboutDiaryBtn"><i class="fas fa-book"></i><span class="tooltip-text">神木日记</span></button>
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
            const bgElement = this.modalElement.querySelector('.about-header-bg');
            if (bgElement) {
                bgElement.style.backgroundImage = 'none';
                bgElement.style.backgroundColor = 'var(--primary-color)';
            }
        };
        wallpaperImg.src = this.wallpaperUrl;
        const logoImg = new Image();
        logoImg.onerror = () => console.warn('Logo图片加载失败:', this.logoUrl);
        logoImg.src = this.logoUrl;
    }

    bindButtonEvents() {
        const qqBtn = document.getElementById('aboutQQBtn');
        if (qqBtn) qqBtn.addEventListener('click', () => window.open('https://qm.qq.com/example', '_blank'));

        const wechatBtn = document.getElementById('aboutWechatBtn');
        if (wechatBtn) {
            wechatBtn.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<span>微信号: example</span>';
                setTimeout(() => btn.innerHTML = originalHTML, 3000);
            });
        }

        const donateBtn = document.getElementById('aboutDonateBtn');
        if (donateBtn) {
            donateBtn.addEventListener('click', () => {
                this.hide();
                setTimeout(() => this.showDonateModal(), 300);
            });
        }

        const privateSpaceBtn = document.getElementById('aboutPrivateSpaceBtn');
        if (privateSpaceBtn) {
            privateSpaceBtn.addEventListener('click', () => {
                this.hide();
                setTimeout(() => window.location.href = './pages/others/smkj.html', 300);
            });
        }

        const diaryBtn = document.getElementById('aboutDiaryBtn');
        if (diaryBtn) {
            diaryBtn.addEventListener('click', () => {
                this.hide();
                setTimeout(() => window.open('https://www.apihz.cn/user/', '_blank'), 300);
            });
        }

        const closeBtn = document.getElementById('aboutCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
    }

    showDonateModal() {
        const donateModal = document.createElement('div');
        donateModal.className = 'donate-modal';
        donateModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.3s ease;
            padding: 20px;
        `;

        donateModal.innerHTML = `
            <div class="donate-modal-content" style="
                max-width: 540px;
                width: 100%;
                background: var(--bg-primary);
                border-radius: 20px;
                padding: 28px 24px;
                box-shadow: 0 25px 45px -12px rgba(0,0,0,0.25);
                transform: scale(0.96);
                transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1);
            ">
                <div class="donate-header" style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color); position: relative;">
                    <div class="donate-title-group" style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
                        <h3 class="donate-title" style="font-size: 1.6rem; font-weight: 700; margin: 0;">感谢支持</h3>
                        <div class="donate-heart" style="color: #FF7B7B; font-size: 1.6rem; animation: pulse 2s infinite;"><i class="fas fa-heart"></i></div>
                    </div>
                    <p class="donate-subtitle" style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">您的支持是我持续更新的动力</p>
                    <button class="donate-close-btn-top" id="donateCloseBtnTop" style="
                        position: absolute;
                        top: 0;
                        right: 0;
                        width: 32px;
                        height: 32px;
                        border: none;
                        background: var(--bg-secondary);
                        color: var(--text-secondary);
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                    "><i class="fas fa-times"></i></button>
                </div>
                <div class="donate-main" style="display: flex; gap: 28px; margin-bottom: 28px; min-height: 260px; flex-wrap: wrap; justify-content: center;">
                    <div class="donate-methods" style="display: flex; flex-direction: column; gap: 12px; min-width: 70px;">
                        <button class="donate-method-btn active" data-type="qq" title="QQ支付" style="width: 56px; height: 56px; border-radius: 14px; font-size: 24px; background: var(--bg-secondary); border: 2px solid var(--border-color); cursor: pointer; transition: all 0.2s;"><i class="fab fa-qq"></i></button>
                        <button class="donate-method-btn" data-type="wechat" title="微信支付" style="width: 56px; height: 56px; border-radius: 14px; font-size: 24px; background: var(--bg-secondary); border: 2px solid var(--border-color); cursor: pointer;"><i class="fab fa-weixin"></i></button>
                        <button class="donate-method-btn" data-type="alipay" title="支付宝" style="width: 56px; height: 56px; border-radius: 14px; font-size: 24px; background: var(--bg-secondary); border: 2px solid var(--border-color); cursor: pointer;"><i class="fab fa-alipay"></i></button>
                        <button class="donate-method-btn help-btn" data-type="help" title="使用帮助" style="width: 56px; height: 56px; border-radius: 14px; font-size: 24px; background: var(--bg-secondary); border: 2px solid var(--border-color); cursor: pointer;"><i class="fas fa-question"></i></button>
                    </div>
                    <div class="donate-qrcode-container" style="flex: 1; min-width: 220px; position: relative;">
                        <div class="donate-qrcode active" data-type="qq" style="display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); padding: 16px;">
                            <div class="qrcode-image-container" style="text-align: center;">
                                <img src="${this.escapeHtml(this.qrCodes.qq)}" alt="QQ收款码" class="qrcode-image" style="max-width: 100%; max-height: 240px; object-fit: contain;" onerror="this.style.display='none'; this.parentNode.querySelector('.qrcode-placeholder').style.display='flex';">
                                <div class="qrcode-placeholder" style="display: none; flex-direction: column; align-items: center; gap: 12px;">
                                    <i class="fab fa-qq" style="font-size: 48px;"></i>
                                    <span>QQ收款码</span>
                                    <small>请使用QQ扫描二维码</small>
                                </div>
                            </div>
                        </div>
                        <div class="donate-qrcode" data-type="wechat" style="display: none; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); padding: 16px;">
                            <div class="qrcode-image-container">
                                <img src="${this.escapeHtml(this.qrCodes.wechat)}" alt="微信收款码" class="qrcode-image" style="max-width: 100%; max-height: 240px; object-fit: contain;" onerror="this.style.display='none'; this.parentNode.querySelector('.qrcode-placeholder').style.display='flex';">
                                <div class="qrcode-placeholder" style="display: none; flex-direction: column; align-items: center; gap: 12px;"><i class="fab fa-weixin" style="font-size: 48px;"></i><span>微信收款码</span><small>请使用微信扫描二维码</small></div>
                            </div>
                        </div>
                        <div class="donate-qrcode" data-type="alipay" style="display: none; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); padding: 16px;">
                            <div class="qrcode-image-container">
                                <img src="${this.escapeHtml(this.qrCodes.alipay)}" alt="支付宝收款码" class="qrcode-image" style="max-width: 100%; max-height: 240px; object-fit: contain;" onerror="this.style.display='none'; this.parentNode.querySelector('.qrcode-placeholder').style.display='flex';">
                                <div class="qrcode-placeholder" style="display: none; flex-direction: column; align-items: center; gap: 12px;"><i class="fab fa-alipay" style="font-size: 48px;"></i><span>支付宝收款码</span><small>请使用支付宝扫描二维码</small></div>
                            </div>
                        </div>
                        <div class="donate-qrcode" data-type="help" style="display: none; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: 16px; padding: 20px;">
                            <div class="help-content" style="max-width: 280px;">
                                <h4 style="margin-bottom: 12px;">使用说明</h4>
                                <ul style="margin-bottom: 16px; padding-left: 20px;">
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
                <div class="supporters-section" style="position: relative; margin-top: 20px;">
                    <h4 class="supporters-title" style="position: absolute; top: -12px; left: 16px; background: var(--bg-primary); padding: 0 8px; font-size: 14px; font-weight: 600;">支持者名单</h4>
                    <div class="supporters-card" style="border: 1px solid var(--border-color); border-radius: 16px; padding: 20px 16px; max-height: 140px; overflow-y: auto;">
                        <div class="supporters-list" style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${this.supporters.map(name => `<span class="supporter-name" style="background: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">${this.escapeHtml(name)}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(donateModal);
        setTimeout(() => donateModal.style.opacity = '1', 10);
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
                const targetQr = donateModal.querySelector(`.donate-qrcode[data-type="${type}"]`);
                if (targetQr) targetQr.classList.add('active');
            });
        });
        const closeBtnTop = donateModal.querySelector('#donateCloseBtnTop');
        if (closeBtnTop) {
            const hideDonateModal = () => {
                donateModal.style.opacity = '0';
                setTimeout(() => donateModal.remove(), 300);
            };
            closeBtnTop.addEventListener('click', hideDonateModal);
            donateModal.addEventListener('click', (e) => { if (e.target === donateModal) hideDonateModal(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideDonateModal(); });
        }
    }

    handleKeydown(e) {
        if (e.key === 'Escape' && this.isShowing) this.hide();
    }

    bindGlobalEvents() {
        const aboutBtn = document.getElementById('aboutBtn');
        if (aboutBtn) aboutBtn.addEventListener('click', () => this.show());
    }

    show() {
        if (!this.modalElement) this.createModal();
        if (this.isShowing) return;
        if (window.sidebar && window.sidebar.isVisible()) window.sidebar.hide();
        this.isShowing = true;
        this.modalElement.style.display = 'flex';
        setTimeout(() => {
            this.modalElement.style.opacity = '1';
            const content = this.modalElement.querySelector('.about-modal-content');
            if (content) content.style.transform = 'scale(1)';
        }, 10);
        if (window.app) window.app.registerModal(this);
    }

    hide() {
        if (!this.isShowing || !this.modalElement) return;
        this.modalElement.style.opacity = '0';
        const content = this.modalElement.querySelector('.about-modal-content');
        if (content) content.style.transform = 'scale(0.8)';
        setTimeout(() => {
            this.modalElement.style.display = 'none';
            this.isShowing = false;
            if (window.app) window.app.unregisterModal(this);
        }, 300);
    }

    destroy() {
        this.hide();
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
        if (this.modalElement?.parentNode) this.modalElement.remove();
        this.modalElement = null;
        this.isShowing = false;
        this.isInitialized = false;
    }

    getStatus() {
        return { initialized: this.isInitialized, modalOpen: this.isShowing, modalElement: !!this.modalElement, version: this.version };
    }

    setWallpaper(url) { this.wallpaperUrl = url; this.refresh(); }
    setLogo(url) { this.logoUrl = url; this.refresh(); }
    setQrCodes(codes) { this.qrCodes = { ...this.qrCodes, ...codes }; }
    refresh() {
        if (this.modalElement) {
            const contentElement = this.modalElement.querySelector('.about-modal-content');
            if (contentElement) {
                contentElement.outerHTML = this.renderModal();
                this.bindButtonEvents();
                this.bindModalEvents();
            }
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.aboutModule = new AboutModule();
        window.aboutModule.init().catch(console.error);
    });
} else {
    window.aboutModule = new AboutModule();
    window.aboutModule.init().catch(console.error);
}

if (typeof module !== 'undefined' && module.exports) module.exports = AboutModule;