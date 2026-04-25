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
        // ===== 修改：移除内联 padding，让 about.css 的响应式 padding 生效 =====
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

        const closeBtn = document.getElementById('aboutCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }
    }

    /**
     * 显示收款模态框（新布局）
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
            background: transparent;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.3s ease;
            padding: 16px;
            box-sizing: border-box;
            pointer-events: auto;
        `;

        donateModal.innerHTML = `
            <div class="donate-modal-content" style="
                display: flex;
                flex-direction: column;
                width: 100%;
                max-width: 500px;
                background: rgba(255,255,255,0.65);
                backdrop-filter: blur(24px) saturate(180%);
                -webkit-backdrop-filter: blur(24px) saturate(180%);
                border: 1px solid rgba(255,255,255,0.4);
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                transform: scale(0.8);
                transition: transform 0.3s ease;
                pointer-events: auto;
            ">
                <!-- 第一行：左右两个卡片 -->
                <div style="display: flex; gap: 12px; padding: 16px 16px 0;">
                    <!-- 左侧卡片 -->
                    <div style="
                        flex: 1;
                        background: rgba(255,255,255,0.5);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border-radius: 8px;
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                    ">
                        <h3 style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0;">感谢支持</h3>
                        <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">您的支持是我持续更新的动力</p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; max-width: 200px;">
                            <button class="donate-method-btn-left" data-type="qq" style="
                                padding: 10px;
                                background: rgba(255,255,255,0.7);
                                border: 2px solid #6BC5FF;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 14px;
                                color: #6BC5FF;
                                transition: all 0.2s;
                            ">QQ</button>
                            <button class="donate-method-btn-left" data-type="wechat" style="
                                padding: 10px;
                                background: rgba(255,255,255,0.7);
                                border: 2px solid #7ED321;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 14px;
                                color: #7ED321;
                                transition: all 0.2s;
                            ">微信</button>
                            <button class="donate-method-btn-left" data-type="alipay" style="
                                padding: 10px;
                                background: rgba(255,255,255,0.7);
                                border: 2px solid #1677FF;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 14px;
                                color: #1677FF;
                                transition: all 0.2s;
                            ">支付宝</button>
                            <button class="donate-method-btn-left" data-type="help" style="
                                padding: 10px;
                                background: rgba(255,255,255,0.7);
                                border: 2px solid #FFD166;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 14px;
                                color: #FFD166;
                                transition: all 0.2s;
                            ">使用说明</button>
                        </div>
                    </div>

                    <!-- 右侧卡片 -->
                    <div class="donate-qrcode-card" style="
                        flex: 1;
                        background: rgba(255,255,255,0.5);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border-radius: 8px;
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 200px;
                    ">
                        <div class="qrcode-content active" data-type="qq" style="text-align: center;">
                            <img src="${Utils.escapeHtml(this.qrCodes.qq)}" alt="QQ收款码" style="max-width: 120px; max-height: 120px; margin-bottom: 8px;">
                            <div style="font-size: 11px; color: #6BC5FF;">QQ支付</div>
                        </div>
                        <div class="qrcode-content" data-type="wechat" style="text-align: center; display: none;">
                            <img src="${Utils.escapeHtml(this.qrCodes.wechat)}" alt="微信收款码" style="max-width: 120px; max-height: 120px; margin-bottom: 8px;">
                            <div style="font-size: 11px; color: #7ED321;">微信支付</div>
                        </div>
                        <div class="qrcode-content" data-type="alipay" style="text-align: center; display: none;">
                            <img src="${Utils.escapeHtml(this.qrCodes.alipay)}" alt="支付宝收款码" style="max-width: 120px; max-height: 120px; margin-bottom: 8px;">
                            <div style="font-size: 11px; color: #1677FF;">支付宝</div>
                        </div>
                        <div class="qrcode-content" data-type="help" style="text-align: center; display: none;">
                            <div style="font-size: 12px; color: #64748b; padding: 0 8px;">
                                <p style="margin: 0 0 8px 0;">选择支付方式后扫描二维码</p>
                                <p style="margin: 0 0 8px 0;">输入您想支持的金额</p>
                                <p style="margin: 0;">请在备注中留下名字</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 第二行：单个卡片 -->
                <div style="padding: 12px 16px 16px;">
                    <div style="
                        background: rgba(255,255,255,0.5);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border-radius: 8px;
                        padding: 12px;
                    ">
                        <h4 style="
                            font-size: 13px;
                            color: #1e293b;
                            margin: 0 0 8px 0;
                            font-weight: 600;
                            text-align: center;
                        ">支持者名单</h4>
                        <div class="supporters-list-scroll" style="
                            max-height: 80px;
                            overflow-y: auto;
                            display: grid;
                            grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
                            gap: 4px;
                            padding-right: 2px;
                            scrollbar-width: none;
                            -ms-overflow-style: none;
                        ">
                            ${this.supporters.map(name => `<span style="
                                background: rgba(255,255,255,0.7);
                                color: #1e293b;
                                padding: 2px 6px;
                                border-radius: 4px;
                                font-size: 11px;
                                text-align: center;
                                white-space: nowrap;
                            ">${Utils.escapeHtml(name)}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <!-- 关闭按钮在模态框外部底部 -->
            <button class="donate-close-btn-bottom" style="
                margin-top: 12px;
                background: rgba(255,255,255,0.7);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.5);
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

        // 显示动画
        setTimeout(() => {
            donateModal.style.opacity = '1';
            const content = donateModal.querySelector('.donate-modal-content');
            content.style.transform = 'scale(1)';
        }, 10);

        // 绑定事件
        this.bindNewDonateEvents(donateModal);
    }

    /**
     * 绑定新捐款模态框事件
     */
    bindNewDonateEvents(donateModal) {
        // 关闭按钮事件
        const closeBtn = donateModal.querySelector('.donate-close-btn-bottom');
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

        closeBtn.addEventListener('click', hideDonateModal);

        // 点击背景关闭
        donateModal.addEventListener('click', (e) => {
            if (e.target === donateModal) {
                hideDonateModal();
            }
        });

        // ESC 关闭
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                hideDonateModal();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);

        // 左侧按钮切换右侧内容
        const buttons = donateModal.querySelectorAll('.donate-method-btn-left');
        const contents = donateModal.querySelectorAll('.qrcode-content');
        
        // 默认激活 QQ
        const defaultType = 'qq';
        buttons.forEach(btn => {
            if (btn.dataset.type === defaultType) {
                btn.style.background = btn.style.color;
                btn.style.color = '#fff';
                btn.style.fontWeight = 'bold';
            }
        });

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;

                // 更新按钮样式
                buttons.forEach(b => {
                    b.style.background = 'rgba(255,255,255,0.7)';
                    b.style.color = '';
                    b.style.fontWeight = 'normal';
                });
                btn.style.background = btn.style.color;
                btn.style.color = '#fff';
                btn.style.fontWeight = 'bold';

                // 显示对应内容
                contents.forEach(content => {
                    content.style.display = 'none';
                    if (content.dataset.type === type) {
                        content.style.display = 'block';
                    }
                });
            });
        });

        // 支持者列表隐藏滚动条（已通过内联样式设置）
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