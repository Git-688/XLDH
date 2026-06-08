// about.js - 星聚导航关于模块（完整修改版，左边卡片改为三个独立卡片）
// 确保 Utils 存在
if (typeof Utils === 'undefined') {
    window.Utils = {
        escapeHtml: function(str) {
            if (!str) return '';
            return String(str).replace(/[&<>"']/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                if (m === '"') return '&quot;';
                return '&#39;';
            });
        }
    };
}

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
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
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
                        <!-- 左边大卡片：三行独立卡片，无内边距 -->
                        <div class="about-header-left">
                            <div class="info-card">开发者：${Utils.escapeHtml(this.developer)}</div>
                            <div class="info-card">网站版本：${Utils.escapeHtml(this.version)}</div>
                            <div class="info-card">更新日期：${Utils.escapeHtml(this.updateDate)}</div>
                        </div>
                        <!-- 右边大卡片：Logo + 标题 + 副标题 -->
                        <div class="about-header-right logo-card">
                            <div class="about-brand-logo">
                                <img class="about-logo-img" src="${Utils.escapeHtml(this.logoUrl)}" alt="星聚导航Logo">
                            </div>
                            <div class="about-brand-title">星聚导航</div>
                            <div class="about-brand-subtitle">启跃星门，航图绘星河</div>
                        </div>
                    </div>
                </div>
                <div class="about-main-content">
                    <div class="about-cards">
                        <div class="about-card white-bg">
                            <div class="card-icon intro-icon">
                                <i class="fas fa-info-circle"></i>
                            </div>
                            <div class="card-content">
                                <h3>简介</h3>
                                <p>星聚导航是一个现代化的个人导航网站，致力于收集整理网络上的优质资源和个人开发的小工具，为用户提供便捷的上网导航体验。</p>
                            </div>
                        </div>
                        <div class="about-card white-bg">
                            <div class="card-icon disclaimer-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
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
                            <button class="about-social-btn qq-btn tooltip" id="aboutQQBtn">
                                <i class="fab fa-qq"></i>
                                <span class="tooltip-text">QQ联系</span>
                            </button>
                            <button class="about-social-btn wechat-btn tooltip" id="aboutWechatBtn">
                                <i class="fab fa-weixin"></i>
                                <span class="tooltip-text">微信联系</span>
                            </button>
                            <button class="about-social-btn donate-btn tooltip" id="aboutDonateBtn">
                                <i class="fas fa-heart"></i>
                                <span class="tooltip-text">爱发电支持</span>
                            </button>
                            <button class="about-social-btn space-btn tooltip" id="aboutPrivateSpaceBtn">
                                <i class="fas fa-user-secret"></i>
                                <span class="tooltip-text">私密空间</span>
                            </button>
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
        wallpaperImg.onload = () => {};
        wallpaperImg.onerror = () => {
            const bgElement = this.modalElement.querySelector('.about-header-bg');
            if (bgElement) {
                bgElement.style.backgroundImage = 'none';
                bgElement.style.backgroundColor = 'var(--primary-color, #4361ee)';
            }
        };
        wallpaperImg.src = this.wallpaperUrl;
        const logoImg = new Image();
        logoImg.onload = () => {};
        logoImg.onerror = () => { console.warn('Logo图片加载失败:', this.logoUrl); };
        logoImg.src = this.logoUrl;
    }

    bindButtonEvents() {
        const qqBtn = document.getElementById('aboutQQBtn');
        if (qqBtn) {
            qqBtn.addEventListener('click', () => {
                window.open('https://yunzhiapi.cn/API/QQtzmp.php?token=XIZhAXKnSQcH&qq=1595126534', '_blank');
            });
        }
        const wechatBtn = document.getElementById('aboutWechatBtn');
        if (wechatBtn) {
            wechatBtn.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<span>微信号: example</span>';
                setTimeout(() => { btn.innerHTML = originalHTML; }, 3000);
            });
        }
        const donateBtn = document.getElementById('aboutDonateBtn');
        if (donateBtn) {
            donateBtn.addEventListener('click', () => {
                this.hide();
                setTimeout(() => { this.showDonateModal(); }, 300);
            });
        }
        const privateSpaceBtn = document.getElementById('aboutPrivateSpaceBtn');
        if (privateSpaceBtn) {
            privateSpaceBtn.addEventListener('click', () => {
                this.hide();
                setTimeout(() => { window.location.href = './pages/others/smkj.html'; }, 300);
            });
        }
        const closeBtn = document.getElementById('aboutCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => { this.hide(); });
        }
    }

    // 爱发电模态框 - 使用说明字体已加大
    showDonateModal() {
        const donateModal = document.createElement('div');
        donateModal.className = 'donate-modal';
        donateModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            opacity: 0;
            transition: opacity 0.3s ease;
            padding: 16px;
            box-sizing: border-box;
            pointer-events: auto;
        `;

        const style = document.createElement('style');
        style.textContent = `
            .donate-modal-content {
                font-size: 10px !important;
            }
            .donate-method-btn-left {
                width: 100%;
                max-width: 48px;
                aspect-ratio: 1 / 1;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid;
                border-radius: 8px;
                background: #ffffff;
                cursor: pointer;
                transition: all 0.2s ease;
                box-sizing: border-box;
                padding: 0;
            }
            .donate-method-btn-left i {
                font-size: clamp(1rem, 4vw, 1.3rem);
                transition: transform 0.2s;
            }
            .donate-method-btn-left.active {
                color: #fff !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transform: scale(1.08);
                border-color: transparent !important;
            }
            .donate-method-btn-left.active i {
                transform: scale(1.1);
            }
            .donate-card-wrapper:first-child {
                background: #ffffff;
                border: 1px solid #e0e0e0;
                padding: 12px;
                border-radius: 8px;
            }
            .donate-card-wrapper:last-child {
                background: #ffffff;
                border: 1px solid #e0e0e0;
                padding: 12px;
                border-radius: 8px;
            }
            .qrcode-content img {
                display: block;
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                margin: 0 auto;
            }
            .supporters-wrapper {
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 12px;
                margin-top: 12px;
            }
            .supporters-header {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                flex-wrap: wrap;
                margin-bottom: 12px;
                gap: 8px;
            }
            .supporters-title {
                font-size: 13px;
                font-weight: 600;
                color: #1e293b;
                margin: 0;
            }
            .supporters-thanks {
                font-size: 11px;
                color: #64748b;
                font-style: italic;
            }
            .supporters-list-scroll {
                max-height: 110px;
                overflow-y: auto;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
                gap: 6px;
                padding-right: 4px;
                scrollbar-width: thin;
            }
            .supporter-name {
                background: #ffffff;
                color: #1e293b;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 10px;
                text-align: center;
                white-space: nowrap;
                border: 1px solid #e9ecef;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                transition: all 0.2s;
            }
            @media (max-width: 480px) {
                .supporters-list-scroll {
                    max-height: 90px;
                    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                }
                .donate-card-wrapper:first-child,
                .donate-card-wrapper:last-child {
                    padding: 8px;
                }
                .donate-method-btn-left {
                    max-width: 40px;
                }
                .supporters-wrapper {
                    padding: 8px;
                }
            }
            @media (prefers-color-scheme: dark) {
                .donate-card-wrapper:first-child,
                .donate-card-wrapper:last-child,
                .supporters-wrapper {
                    background: #2d2d2d;
                    border-color: #404040;
                }
                .supporter-name {
                    background: #2d2d2d;
                    border-color: #404040;
                    color: #e0e0e0;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
                }
                .supporters-title {
                    color: #f0f0f0;
                }
                .supporters-thanks {
                    color: #aaa;
                }
            }
        `;
        donateModal.appendChild(style);

        donateModal.innerHTML += `
            <div class="donate-modal-content" style="
                display: flex;
                flex-direction: column;
                width: 100%;
                max-width: 500px;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                transform: scale(0.8);
                transition: transform 0.3s ease;
                pointer-events: auto;
            ">
                <div style="display: flex; gap: 16px; padding: 16px 16px 0; min-width: 0;">
                    <div class="donate-card-wrapper" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;">
                            <button class="donate-method-btn-left" data-type="qq" style="color: #6BC5FF; border-color: #6BC5FF;">
                                <i class="fab fa-qq"></i>
                            </button>
                            <button class="donate-method-btn-left" data-type="wechat" style="color: #7ED321; border-color: #7ED321;">
                                <i class="fab fa-weixin"></i>
                            </button>
                            <button class="donate-method-btn-left" data-type="alipay" style="color: #1677FF; border-color: #1677FF;">
                                <i class="fab fa-alipay"></i>
                            </button>
                            <button class="donate-method-btn-left" data-type="help" style="color: #FFD166; border-color: #FFD166;">
                                <i class="fas fa-question-circle"></i>
                            </button>
                        </div>
                    </div>
                    <div class="donate-card-wrapper" style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center;">
                        <div class="qrcode-content active" data-type="qq" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <img src="${Utils.escapeHtml(this.qrCodes.qq)}" alt="QQ" style="max-width: 85%; max-height: 85%; object-fit: contain;">
                        </div>
                        <div class="qrcode-content" data-type="wechat" style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <img src="${Utils.escapeHtml(this.qrCodes.wechat)}" alt="微信" style="max-width: 85%; max-height: 85%; object-fit: contain;">
                        </div>
                        <div class="qrcode-content" data-type="alipay" style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <img src="${Utils.escapeHtml(this.qrCodes.alipay)}" alt="支付宝" style="max-width: 85%; max-height: 85%; object-fit: contain;">
                        </div>
                        <div class="qrcode-content" data-type="help" style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <div style="width:100%; text-align: center;">
                                <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary, #1e293b);">📖 使用说明</div>
                                <div style="font-size: 11px; color: var(--text-secondary, #64748b); line-height: 1.6;">
                                    <p style="margin: 0 0 6px 0;">1. 选择左侧支付方式</p>
                                    <p style="margin: 0 0 6px 0;">2. 使用对应App扫描</p>
                                    <p style="margin: 0 0 6px 0;">3. 输入您想支持的金额</p>
                                    <p style="margin: 0;">4. 备注留下您的名字</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="supporters-wrapper" style="margin: 16px;">
                    <div class="supporters-header">
                        <div class="supporters-title">🎖️ 支持者名单</div>
                        <div class="supporters-thanks">✨ 感谢您的每一份支持 ✨</div>
                    </div>
                    <div class="supporters-list-scroll">
                        ${this.supporters.map(name => `<span class="supporter-name">${Utils.escapeHtml(name)}</span>`).join('')}
                    </div>
                </div>
            </div>
            <button class="donate-close-btn-bottom" style="
                margin-top: 12px;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #64748b;
                font-size: 16px;
                transition: all 0.2s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 1;
            "><i class="fas fa-times"></i></button>
        `;

        document.body.appendChild(donateModal);
        setTimeout(() => {
            donateModal.style.opacity = '1';
            const content = donateModal.querySelector('.donate-modal-content');
            content.style.transform = 'scale(1)';
        }, 10);
        this.bindNewDonateEvents(donateModal);
    }

    bindNewDonateEvents(donateModal) {
        const closeBtn = donateModal.querySelector('.donate-close-btn-bottom');
        const hideDonateModal = () => {
            donateModal.style.opacity = '0';
            const content = donateModal.querySelector('.donate-modal-content');
            content.style.transform = 'scale(0.8)';
            setTimeout(() => {
                if (donateModal.parentNode) donateModal.parentNode.removeChild(donateModal);
            }, 300);
        };
        closeBtn.addEventListener('click', hideDonateModal);
        donateModal.addEventListener('click', (e) => { if (e.target === donateModal) hideDonateModal(); });
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                hideDonateModal();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        const buttons = donateModal.querySelectorAll('.donate-method-btn-left');
        const contents = donateModal.querySelectorAll('.qrcode-content');
        const setActive = (activeBtn) => {
            buttons.forEach(b => {
                b.classList.remove('active');
                b.style.background = '#ffffff';
            });
            activeBtn.classList.add('active');
            const activeColor = activeBtn.style.color || '#6BC5FF';
            activeBtn.style.background = activeColor;
            activeBtn.style.borderColor = 'transparent';
        };
        const defaultBtn = donateModal.querySelector('.donate-method-btn-left[data-type="qq"]');
        if (defaultBtn) setActive(defaultBtn);
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                setActive(btn);
                contents.forEach(content => {
                    if (content.dataset.type === type) {
                        content.style.display = 'flex';
                        content.classList.add('active');
                    } else {
                        content.style.display = 'none';
                        content.classList.remove('active');
                    }
                });
            });
        });
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
        this.modalElement.offsetHeight;
        setTimeout(() => {
            this.modalElement.style.opacity = '1';
            const content = this.modalElement.querySelector('.about-modal-content');
            content.style.transform = 'scale(1)';
        }, 10);
        if (window.app) window.app.registerModal(this);
    }

    hide() {
        if (!this.isShowing || !this.modalElement) return;
        this.modalElement.style.opacity = '0';
        const content = this.modalElement.querySelector('.about-modal-content');
        content.style.transform = 'scale(0.8)';
        setTimeout(() => {
            this.modalElement.style.display = 'none';
            this.isShowing = false;
            if (window.app) window.app.unregisterModal(this);
        }, 300);
    }

    destroy() {
        this.hide();
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
        if (this.modalElement && this.modalElement.parentNode) this.modalElement.parentNode.removeChild(this.modalElement);
        this.modalElement = null;
        this.isShowing = false;
        this.isInitialized = false;
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            modalOpen: this.isShowing,
            modalElement: !!this.modalElement,
            version: this.version,
            updateDate: this.updateDate,
            developer: this.developer,
            wallpaperUrl: this.wallpaperUrl,
            logoUrl: this.logoUrl,
            qrCodes: this.qrCodes
        };
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
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.about) {
            window.Starlink.about = new AboutModule();
        }
        window.aboutModule = window.Starlink.about;
        window.aboutModule.init();
    });
} else {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.about) {
        window.Starlink.about = new AboutModule();
    }
    window.aboutModule = window.Starlink.about;
    window.aboutModule.init();
}