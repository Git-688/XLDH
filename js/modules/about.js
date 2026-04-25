/**
 * 关于网站模块 - 包含收款模态框（自适应按钮 + 激活效果）
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
     * 显示收款模态框（自适应按钮 + 激活优化）
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

        // 注入全局样式
        const style = document.createElement('style');
        style.textContent = `
            .donate-modal-content {
                font-size: 10px !important;
            }
            /* 按钮自适应 + 激活效果 */
            .donate-method-btn-left {
                width: 100%;
                aspect-ratio: 1 / 1;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid;
                border-radius: 8px;
                background: rgba(255,255,255,0.7);
                cursor: pointer;
                transition: all 0.2s ease;
                box-sizing: border-box;
                padding: 0;
            }
            .donate-method-btn-left i {
                font-size: clamp(1.2rem, 5vw, 1.8rem);
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
            /* 左右正方形卡片防止溢出 */
            .donate-card-wrapper {
                flex: 1;
                min-width: 0;                 /* 关键：防止溢出 */
                aspect-ratio: 1 / 1;
                background: rgba(255,255,255,0.5);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
            }
        `;
        donateModal.appendChild(style);

        donateModal.innerHTML += `
            <div class="donate-modal-content" style="
                display: flex;
                flex-direction: column;
                width: 100%;
                max-width: 500px;
                background: rgba(255,255,255,0.65);
                backdrop-filter: blur(24px) saturate(180%);
                -webkit-backdrop-filter: blur(24px) saturate(180%);
                border: 1px solid rgba(255,255,255,0.4);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                transform: scale(0.8);
                transition: transform 0.3s ease;
                pointer-events: auto;
            ">
                <!-- 第一行：左右两个完全等大的正方形卡片 -->
                <div style="display: flex; gap: 12px; padding: 16px 16px 0; min-width: 0;">
                    <!-- 左侧正方形卡片 -->
                    <div class="donate-card-wrapper">
                        <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">感谢支持</h3>
                        <p style="font-size: 10px; color: #64748b; margin: 0 0 12px 0;">您的支持是我持续更新的动力</p>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%;">
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

                    <!-- 右侧正方形卡片 -->
                    <div class="donate-card-wrapper" style="position: relative;">
                        <div class="qrcode-content active" data-type="qq" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <img src="${Utils.escapeHtml(this.qrCodes.qq)}" alt="QQ" style="max-width: 80%; max-height: 80%; object-fit: contain;">
                        </div>
                        <div class="qrcode-content" data-type="wechat" style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <img src="${Utils.escapeHtml(this.qrCodes.wechat)}" alt="微信" style="max-width: 80%; max-height: 80%; object-fit: contain;">
                        </div>
                        <div class="qrcode-content" data-type="alipay" style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <img src="${Utils.escapeHtml(this.qrCodes.alipay)}" alt="支付宝" style="max-width: 80%; max-height: 80%; object-fit: contain;">
                        </div>
                        <div class="qrcode-content" data-type="help" style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <div style="font-size: 10px; color: #64748b; line-height: 1.6; text-align: center;">
                                <p style="margin: 0 0 6px 0;">1. 选择左侧支付方式</p>
                                <p style="margin: 0 0 6px 0;">2. 使用对应App扫描</p>
                                <p style="margin: 0 0 6px 0;">3. 输入您想支持的金额</p>
                                <p style="margin: 0;">4. 备注留下您的名字</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 第二行：单个圆角卡片 -->
                <div style="padding: 12px 16px 16px;">
                    <div style="
                        background: rgba(255,255,255,0.5);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border-radius: 12px;
                        padding: 10px 12px;
                    ">
                        <h4 style="
                            font-size: 11px;
                            color: #1e293b;
                            margin: 0 0 8px 0;
                            font-weight: 600;
                            text-align: center;
                        ">支持者名单</h4>
                        <div class="supporters-list-scroll" style="
                            max-height: 70px;
                            overflow-y: auto;
                            display: grid;
                            grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
                            gap: 4px;
                            padding-right: 2px;
                            scrollbar-width: none;
                            -ms-overflow-style: none;
                        ">
                            ${this.supporters.map(name => `<span style="
                                background: rgba(255,255,255,0.7);
                                color: #1e293b;
                                padding: 2px 5px;
                                border-radius: 4px;
                                font-size: 10px;
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

        // 左侧按钮切换右侧内容 + 激活优化
        const buttons = donateModal.querySelectorAll('.donate-method-btn-left');
        const contents = donateModal.querySelectorAll('.qrcode-content');

        // 激活状态的辅助函数
        const setActive = (activeBtn) => {
            buttons.forEach(b => {
                b.classList.remove('active');
                // 恢复默认背景
                b.style.background = 'rgba(255,255,255,0.7)';
                // 恢复边框颜色（从内联样式取）
                const borderColor = b.style.borderColor;
                b.style.borderColor = borderColor;
            });
            activeBtn.classList.add('active');
            // 激活态背景使用自身原色
            const activeColor = activeBtn.style.color || '#6BC5FF';
            activeBtn.style.background = activeColor;
            activeBtn.style.borderColor = 'transparent';
        };

        // 默认激活 QQ
        const defaultBtn = donateModal.querySelector('.donate-method-btn-left[data-type="qq"]');
        if (defaultBtn) {
            setActive(defaultBtn);
        }

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;

                // 激活指示
                setActive(btn);

                // 显示对应内容
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