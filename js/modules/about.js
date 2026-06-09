// about.js - 星聚导航关于模块（完整版，微信按钮改为 GitHub）
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
        },
        getApiBase: function() {
            return (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://api.xjdh688.ccwu.cc';
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
        this.injectGithubButtonStyle();
    }

    // 注入 GitHub 按钮样式
    injectGithubButtonStyle() {
        if (document.getElementById('github-btn-style')) return;
        const style = document.createElement('style');
        style.id = 'github-btn-style';
        style.textContent = `
            .about-social-btn.github-btn {
                background: #24292e;
            }
            .about-social-btn.github-btn:hover {
                background: #1a1e24;
            }
        `;
        document.head.appendChild(style);
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
                        <!-- 左边卡片：三行独立信息 -->
                        <div class="about-header-left">
                            <div class="info-card">开发者：${Utils.escapeHtml(this.developer)}</div>
                            <div class="info-card">网站版本：${Utils.escapeHtml(this.version)}</div>
                            <div class="info-card">更新日期：${Utils.escapeHtml(this.updateDate)}</div>
                        </div>
                        <!-- 右边卡片：Logo + 标题 + 副标题 -->
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
                            <button class="about-social-btn github-btn tooltip" id="aboutGithubBtn">
                                <i class="fab fa-github"></i>
                                <span class="tooltip-text">GitHub仓库</span>
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
        const githubBtn = document.getElementById('aboutGithubBtn');
        if (githubBtn) {
            githubBtn.addEventListener('click', () => {
                window.open('https://github.com/Git-688/XLDH', '_blank');
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

    // 爱发电模态框（优化亮色/深色模式激活按钮背景）
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

        // 深色模式检测（系统或手动类）
        const isDarkMode = () => {
            return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
                   document.documentElement.classList.contains('dark-mode');
        };

        // 动态获取深色模式颜色变量
        const getDarkColors = () => {
            if (isDarkMode()) {
                return {
                    bgCard: '#2d2d2d',
                    borderColor: '#404040',
                    textPrimary: '#f0f0f0',
                    textSecondary: '#c0c0c0',
                    hoverBg: '#3a3a3a'
                };
            }
            return {
                bgCard: '#ffffff',
                borderColor: '#e0e0e0',
                textPrimary: '#1e293b',
                textSecondary: '#64748b',
                hoverBg: '#f8f9fa'
            };
        };

        const colors = getDarkColors();

        const style = document.createElement('style');
        style.textContent = `
            .donate-modal-content {
                font-size: 10px !important;
            }
            .donate-card-wrapper {
                aspect-ratio: 1 / 1 !important;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: ${colors.bgCard};
                border: 1px solid ${colors.borderColor};
                border-radius: 8px;
                padding: 0 !important;
                margin: 0;
                box-sizing: border-box;
                overflow: hidden;
            }
            .left-buttons-grid {
                width: 100%;
                height: 100%;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                padding: 12px;
                box-sizing: border-box;
            }
            .donate-method-btn-left {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid;
                border-radius: 8px;
                background: ${colors.bgCard};
                cursor: pointer;
                transition: all 0.2s ease;
                box-sizing: border-box;
                aspect-ratio: 1 / 1;
            }
            .donate-method-btn-left i {
                font-size: clamp(1.2rem, 5vw, 1.8rem);
                transition: transform 0.2s;
            }
            /* 亮色模式默认激活样式 */
            .donate-method-btn-left.active {
                background: rgba(0, 0, 0, 0.08) !important;
                border-color: transparent !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                transform: scale(1.05);
            }
            .donate-method-btn-left.active i {
                transform: scale(1.1);
            }
            /* 深色模式下激活样式 */
            @media (prefers-color-scheme: dark) {
                .donate-method-btn-left.active {
                    background: rgba(255, 255, 255, 0.15) !important;
                }
            }
            .dark-mode .donate-method-btn-left.active {
                background: rgba(255, 255, 255, 0.15) !important;
            }
            .qrcode-content {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .qrcode-content img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }
            .help-content-container {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 12px;
                box-sizing: border-box;
            }
            .help-inner {
                width: 100%;
            }
            .help-inner .help-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 12px;
                color: ${colors.textPrimary};
            }
            .help-inner .help-steps {
                font-size: 12px;
                color: ${colors.textSecondary};
                line-height: 1.6;
            }
            .help-inner .help-steps p {
                margin: 0 0 8px 0;
            }
            .supporters-wrapper {
                background: ${colors.bgCard};
                border: 1px solid ${colors.borderColor};
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
                color: ${colors.textPrimary};
                margin: 0;
            }
            .supporters-thanks {
                font-size: 11px;
                color: ${colors.textSecondary};
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
                background: ${colors.bgCard};
                color: ${colors.textPrimary};
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 10px;
                text-align: center;
                white-space: nowrap;
                border: 1px solid ${colors.borderColor};
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                transition: all 0.2s;
            }
            @media (max-width: 480px) {
                .supporters-list-scroll {
                    max-height: 90px;
                    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                }
                .left-buttons-grid {
                    gap: 8px;
                    padding: 8px;
                }
                .help-inner .help-title {
                    font-size: 13px;
                }
                .help-inner .help-steps {
                    font-size: 10px;
                }
                .help-inner .help-steps p {
                    margin-bottom: 6px;
                }
            }
            /* 深色模式下额外适配 */
            @media (prefers-color-scheme: dark) {
                .donate-card-wrapper {
                    background: #2d2d2d;
                    border-color: #404040;
                }
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
                .help-inner .help-title {
                    color: #f0f0f0;
                }
                .help-inner .help-steps {
                    color: #ccc;
                }
                .donate-method-btn-left {
                    background: #2d2d2d;
                }
            }
            .dark-mode .donate-card-wrapper {
                background: #2d2d2d;
                border-color: #404040;
            }
            .dark-mode .supporters-wrapper {
                background: #2d2d2d;
                border-color: #404040;
            }
            .dark-mode .supporter-name {
                background: #2d2d2d;
                border-color: #404040;
                color: #e0e0e0;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }
            .dark-mode .supporters-title {
                color: #f0f0f0;
            }
            .dark-mode .supporters-thanks {
                color: #aaa;
            }
            .dark-mode .help-inner .help-title {
                color: #f0f0f0;
            }
            .dark-mode .help-inner .help-steps {
                color: #ccc;
            }
            .dark-mode .donate-method-btn-left {
                background: #2d2d2d;
            }
        `;
        donateModal.appendChild(style);

        donateModal.innerHTML += `
            <div class="donate-modal-content" style="
                display: flex;
                flex-direction: column;
                width: 100%;
                max-width: 500px;
                background: ${colors.bgCard};
                border: 1px solid ${colors.borderColor};
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                transform: scale(0.8);
                transition: transform 0.3s ease;
                pointer-events: auto;
            ">
                <div style="display: flex; gap: 16px; padding: 16px; min-width: 0;">
                    <!-- 左边大卡片：正方形，四个按钮 -->
                    <div class="donate-card-wrapper" style="flex: 1;">
                        <div class="left-buttons-grid">
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
                    <!-- 右边大卡片：正方形，展示二维码/说明 -->
                    <div class="donate-card-wrapper" style="flex: 1; position: relative;">
                        <div class="qrcode-content active" data-type="qq">
                            <img src="${Utils.escapeHtml(this.qrCodes.qq)}" alt="QQ">
                        </div>
                        <div class="qrcode-content" data-type="wechat" style="display: none;">
                            <img src="${Utils.escapeHtml(this.qrCodes.wechat)}" alt="微信">
                        </div>
                        <div class="qrcode-content" data-type="alipay" style="display: none;">
                            <img src="${Utils.escapeHtml(this.qrCodes.alipay)}" alt="支付宝">
                        </div>
                        <div class="qrcode-content" data-type="help" style="display: none;">
                            <div class="help-content-container">
                                <div class="help-inner">
                                    <div class="help-title">📖 使用说明</div>
                                    <div class="help-steps">
                                        <p>1. 选择左侧支付方式</p>
                                        <p>2. 使用对应App扫描</p>
                                        <p>3. 输入您想支持的金额</p>
                                        <p>4. 备注留下您的名字</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="supporters-wrapper" style="margin: 0 16px 16px 16px;">
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
                background: ${colors.bgCard};
                border: 1px solid ${colors.borderColor};
                border-radius: 50%;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: ${colors.textSecondary};
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
                b.style.background = '';
            });
            activeBtn.classList.add('active');
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

// 自动初始化
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