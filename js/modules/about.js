/**
 * 关于网站模块 - 包含收款模态框
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

    /**
     * 初始化关于网站模块
     */
    init() {
        if (this.isInitialized) {
            return Promise.resolve();
        }
        
        this.isInitialized = true;
        this.createModal();
        this.bindGlobalEvents();
        
        return Promise.resolve();
    }

    /**
     * 创建模态框DOM结构
     */
    createModal() {
        if (this.modalElement) {
            this.modalElement.remove();
        }

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

    /**
     * 渲染模态框内容
     */
    renderModal() {
        return `
            <div class="about-modal-content">
                <!-- 顶部区域 - 带壁纸背景 -->
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
                                <div class="about-logo" style="border-radius: 8px; overflow: hidden;">
                                    <img src="${Utils.escapeHtml(this.logoUrl)}" alt="星聚导航Logo" class="about-logo-img" style="border-radius: 8px; width: 100%; height: 100%; object-fit: cover;">
                                </div>
                                <div class="about-title-group">
                                    <div class="about-title">星聚导航</div>
                                    <div class="about-subtitle">您的个人导航中心</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 中部内容区域 - 不滚动 -->
                <div class="about-main-content">
                    <div class="about-cards">
                        <div class="about-card">
                            <div class="card-icon intro-icon">
                                <i class="fas fa-info-circle"></i>
                            </div>
                            <div class="card-content">
                                <h3>简介</h3>
                                <p>星聚导航是一个现代化的个人导航网站，致力于收集整理网络上的优质资源和个人开发的小工具，为用户提供便捷的上网导航体验。</p>
                            </div>
                        </div>
                        <div class="about-card">
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
                
                <!-- 底部按钮区域 - 白色背景 -->
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
                        <button class="about-close-btn" id="aboutCloseBtn">
                             关闭
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        if (!this.modalElement) return;

        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.hide();
            }
        });

        document.addEventListener('keydown', this.handleKeydown.bind(this));
        this.bindButtonEvents();
        this.preloadImages();
    }

    /**
     * 预加载图片
     */
    preloadImages() {
        const wallpaperImg = new Image();
        wallpaperImg.onload = () => {};
        wallpaperImg.onerror = () => {
            const bgElement = this.modalElement.querySelector('.about-header-bg');
            if (bgElement) {
                bgElement.style.backgroundImage = 'none';
                bgElement.style.backgroundColor = 'var(--primary-color)';
            }
        };
        wallpaperImg.src = this.wallpaperUrl;
        
        const logoImg = new Image();
        logoImg.onload = () => {};
        logoImg.onerror = () => {
            console.warn('Logo图片加载失败:', this.logoUrl);
        };
        logoImg.src = this.logoUrl;
    }

    /**
     * 绑定按钮事件
     */
    bindButtonEvents() {
        const qqBtn = document.getElementById('aboutQQBtn');
        if (qqBtn) {
            qqBtn.addEventListener('click', () => {
                window.open('https://qm.qq.com/example', '_blank');
            });
        }

        const wechatBtn = document.getElementById('aboutWechatBtn');
        if (wechatBtn) {
            wechatBtn.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<span>微信号: example</span>';
                
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 3000);
            });
        }

        const donateBtn = document.getElementById('aboutDonateBtn');
        if (donateBtn) {
            donateBtn.addEventListener('click', () => {
                this.hide();
                setTimeout(() => {
                    this.showDonateModal();
                }, 300);
            });
        }

        const privateSpaceBtn = document.getElementById('aboutPrivateSpaceBtn');
        if (privateSpaceBtn) {
            privateSpaceBtn.addEventListener('click', () => {
                this.hide();
                setTimeout(() => {
                    window.location.href = './pages/others/smkj.html';
                }, 300);
            });
        }

        // 神木日记按钮已移除

        const closeBtn = document.getElementById('aboutCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }
    }

    /**
     * 显示收款模态框 - 修改布局和样式
     */
    showDonateModal() {
        const donateModal = document.createElement('div');
        donateModal.className = 'donate-modal';
        donateModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.3s ease;
            padding: 20px;
        `;

        donateModal.innerHTML = `
            <div class="donate-modal-content">
                <!-- 顶部标题区域 - 爱心在标题右边，右上角X关闭按钮 -->
                <div class="donate-header">
                    <div class="donate-title-group">
                        <h3 class="donate-title">感谢支持</h3>
                        <div class="donate-heart">
                            <i class="fas fa-heart"></i>
                        </div>
                    </div>
                    <p class="donate-subtitle">您的支持是我持续更新的动力</p>
                    <button class="donate-close-btn-top" id="donateCloseBtnTop">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- 主要内容区域 -->
                <div class="donate-main">
                    <!-- 左侧支付方式选择 -->
                    <div class="donate-methods">
                        <button class="donate-method-btn active" data-type="qq" title="QQ支付">
                            <i class="fab fa-qq"></i>
                        </button>
                        <button class="donate-method-btn" data-type="wechat" title="微信支付">
                            <i class="fab fa-weixin"></i>
                        </button>
                        <button class="donate-method-btn" data-type="alipay" title="支付宝">
                            <i class="fab fa-alipay"></i>
                        </button>
                        <button class="donate-method-btn help-btn" data-type="help" title="使用帮助">
                            <i class="fas fa-question"></i>
                        </button>
                    </div>
                    
                    <!-- 右侧二维码显示 -->
                    <div class="donate-qrcode-container">
                        <div class="donate-qrcode active" data-type="qq">
                            <div class="qrcode-image-container">
                                <img src="${Utils.escapeHtml(this.qrCodes.qq)}" alt="QQ收款码" class="qrcode-image" onerror="this.style.display='none'; this.parentNode.querySelector('.qrcode-placeholder').style.display='flex';">
                                <div class="qrcode-placeholder">
                                    <i class="fab fa-qq"></i>
                                    <span>QQ收款码</span>
                                    <small>请使用QQ扫描二维码</small>
                                </div>
                            </div>
                        </div>
                        <div class="donate-qrcode" data-type="wechat">
                            <div class="qrcode-image-container">
                                <img src="${Utils.escapeHtml(this.qrCodes.wechat)}" alt="微信收款码" class="qrcode-image" onerror="this.style.display='none'; this.parentNode.querySelector('.qrcode-placeholder').style.display='flex';">
                                <div class="qrcode-placeholder">
                                    <i class="fab fa-weixin"></i>
                                    <span>微信收款码</span>
                                    <small>请使用微信扫描二维码</small>
                                </div>
                            </div>
                        </div>
                        <div class="donate-qrcode" data-type="alipay">
                            <div class="qrcode-image-container">
                                <img src="${Utils.escapeHtml(this.qrCodes.alipay)}" alt="支付宝收款码" class="qrcode-image" onerror="this.style.display='none'; this.parentNode.querySelector('.qrcode-placeholder').style.display='flex';">
                                <div class="qrcode-placeholder">
                                    <i class="fab fa-alipay"></i>
                                    <span>支付宝收款码</span>
                                    <small>请使用支付宝扫描二维码</small>
                                </div>
                            </div>
                        </div>
                        <!-- 问号按钮内容 -->
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

                <!-- 支持者名单区域 -->
                <div class="supporters-section">
                    <h4 class="supporters-title">支持者名单</h4>
                    <div class="supporters-card">
                        <div class="supporters-list">
                            ${this.supporters.map(name => `<span class="supporter-name">${Utils.escapeHtml(name)}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(donateModal);

        setTimeout(() => {
            donateModal.style.opacity = '1';
            const content = donateModal.querySelector('.donate-modal-content');
            content.style.transform = 'scale(1)';
        }, 10);

        this.bindDonateModalEvents(donateModal);
    }

    /**
     * 绑定收款模态框事件
     */
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
                if (targetQr) {
                    targetQr.classList.add('active');
                }
            });
        });

        const closeBtnTop = donateModal.querySelector('#donateCloseBtnTop');
        if (closeBtnTop) {
            const hideDonateModal = () => {
                donateModal.style.opacity = '0';
                const content = donateModal.querySelector('.donate-modal-content');
                content.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    if (donateModal.parentNode) {
                        donateModal.parentNode.removeChild(donateModal);
                    }
                }, 300);
            };

            closeBtnTop.addEventListener('click', hideDonateModal);
            donateModal.addEventListener('click', (e) => {
                if (e.target === donateModal) {
                    hideDonateModal();
                }
            });

            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    hideDonateModal();
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
        }
    }

    /**
     * 处理键盘事件
     */
    handleKeydown(e) {
        if (e.key === 'Escape' && this.isShowing) {
            this.hide();
        }
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        const aboutBtn = document.getElementById('aboutBtn');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => {
                this.show();
            });
        }
    }

    /**
     * 显示关于网站模态框
     */
    show() {
        if (!this.modalElement) {
            this.createModal();
        }

        if (this.isShowing) return;

        if (window.sidebar && window.sidebar.isVisible()) {
            window.sidebar.hide();
        }

        this.isShowing = true;
        this.modalElement.style.display = 'flex';
        
        this.modalElement.offsetHeight;
        
        setTimeout(() => {
            this.modalElement.style.opacity = '1';
            const content = this.modalElement.querySelector('.about-modal-content');
            content.style.transform = 'scale(1)';
        }, 10);

        if (window.app) {
            window.app.registerModal(this);
        }
    }

    /**
     * 隐藏关于网站模态框
     */
    hide() {
        if (!this.isShowing || !this.modalElement) return;

        this.modalElement.style.opacity = '0';
        const content = this.modalElement.querySelector('.about-modal-content');
        content.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            this.modalElement.style.display = 'none';
            this.isShowing = false;
            
            if (window.app) {
                window.app.unregisterModal(this);
            }
        }, 300);
    }

    /**
     * 销毁模块
     */
    destroy() {
        this.hide();
        
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
        
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
        
        this.modalElement = null;
        this.isShowing = false;
        this.isInitialized = false;
    }

    /**
     * 获取模块状态
     */
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

    /**
     * 设置壁纸URL
     */
    setWallpaper(url) {
        this.wallpaperUrl = url;
        this.refresh();
    }

    /**
     * 设置logo图片URL
     */
    setLogo(url) {
        this.logoUrl = url;
        this.refresh();
    }

    /**
     * 设置收款码图片路径
     */
    setQrCodes(codes) {
        this.qrCodes = {...this.qrCodes, ...codes};
    }

    /**
     * 刷新模态框内容
     */
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
        window.aboutModule.init().then(() => {
        }).catch(error => {
        });
    });
} else {
    window.aboutModule = new AboutModule();
    window.aboutModule.init().then(() => {
    }).catch(error => {
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AboutModule;
}