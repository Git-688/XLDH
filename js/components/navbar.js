/**
 * 导航栏组件 - 完全修复版
 * 负责导航栏的交互功能，包括搜索、音乐播放器控制、公告和侧边栏切换
 * @class Navbar
 */
class Navbar {
    constructor() {
        this.searchEngines = [
            // 国内主流引擎
            { name: '百度', value: 'baidu', url: 'https://www.baidu.com/s?wd=' },
            { name: 'Bing', value: 'bing', url: 'https://cn.bing.com/search?q=' },
            { name: '知乎', value: 'zhihu', url: 'https://www.zhihu.com/search?type=content&q=' },
            { name: '哔哩哔哩', value: 'bilibili', url: 'https://search.bilibili.com/all?keyword=' },
            { name: '微博', value: 'weibo', url: 'https://s.weibo.com/weibo?q=' },
            { name: '淘宝', value: 'taobao', url: 'https://s.taobao.com/search?q=' },
            { name: '京东', value: 'jd', url: 'https://search.jd.com/Search?keyword=' },
            { name: '抖音', value: 'douyin', url: 'https://www.douyin.com/search/' },
            { name: '今日头条', value: 'toutiao', url: 'https://so.toutiao.com/search?keyword=' },
            { name: '搜狗搜索', value: 'sogou', url: 'https://www.sogou.com/web?query=' },
            
            // 添加的常用国际引擎
            { name: 'Google', value: 'google', url: 'https://www.google.com/search?q=' },
            { name: 'GitHub', value: 'github', url: 'https://github.com/search?q=' },
            { name: 'Wikipedia', value: 'wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' },
            { name: 'Stack Overflow', value: 'stackoverflow', url: 'https://stackoverflow.com/search?q=' },
            { name: 'YouTube', value: 'youtube', url: 'https://www.youtube.com/results?search_query=' },
            { name: 'DuckDuckGo', value: 'duckduckgo', url: 'https://duckduckgo.com/?q=' }
        ];
        
        this.currentEngine = this.searchEngines[0];
        this.announcements = [];
        this.searchModuleReady = false;
        this.init();
    }

    /**
     * 初始化导航栏
     */
    init() {
        try {
            this.bindEvents();
            this.loadAnnouncements();
            this.updateNotificationBadge();
            
            // 初始检查滚动状态
            setTimeout(() => {
                this.handleScroll();
            }, 100);
            
            // 检查搜索模块是否可用
            setTimeout(() => {
                this.checkSearchModule();
            }, 1000);
        } catch (error) {
            console.error('导航栏初始化失败:', error);
        }
    }

    /**
     * 检查搜索模块是否可用
     */
    checkSearchModule() {
        if (window.searchModule && typeof window.searchModule.showModal === 'function') {
            this.searchModuleReady = true;
            console.log('搜索模块已就绪');
        } else if (typeof SearchModule !== 'undefined') {
            // 如果 SearchModule 类存在但未实例化
            try {
                window.searchModule = new SearchModule();
                this.searchModuleReady = true;
                console.log('搜索模块已动态初始化');
            } catch (error) {
                console.error('动态初始化搜索模块失败:', error);
            }
        }
    }

    /**
     * 绑定事件监听器 - 完全修复版
     */
    bindEvents() {
        try {
            // 搜索按钮 - 完全修复
            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn) {
                // 移除现有事件监听器，避免重复绑定
                searchBtn.replaceWith(searchBtn.cloneNode(true));
                const newSearchBtn = document.getElementById('searchBtn');
                
                newSearchBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleSearchButtonClick();
                });
            }

            // 音乐按钮
            const musicBtn = document.getElementById('musicBtn');
            if (musicBtn) {
                musicBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.closeSearchModal();
                    this.toggleMusicPlayer();
                });
            }

            // 公告按钮 - 完全修复
            const announcementBtn = document.getElementById('announcementBtn');
            if (announcementBtn) {
                // 移除现有事件监听器，避免重复绑定
                announcementBtn.replaceWith(announcementBtn.cloneNode(true));
                const newAnnouncementBtn = document.getElementById('announcementBtn');
                
                newAnnouncementBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeSearchModal();
                    
                    if (window.announcementModule) {
                        window.announcementModule.toggleModal();
                    }
                });
            }

            // 菜单按钮 - 完全修复
            const menuBtn = document.getElementById('menuBtn');
            if (menuBtn) {
                // 移除现有事件监听器，避免重复绑定
                menuBtn.replaceWith(menuBtn.cloneNode(true));
                const newMenuBtn = document.getElementById('menuBtn');
                
                newMenuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeSearchModal();
                    
                    if (window.sidebar && typeof window.sidebar.toggle === 'function') {
                        window.sidebar.toggle();
                    } else {
                        // 如果侧边栏未初始化，尝试初始化
                        if (typeof CompactSidebar !== 'undefined') {
                            window.sidebar = new CompactSidebar();
                            window.sidebar.init().then(() => {
                                window.sidebar.toggle();
                            }).catch(error => {
                                console.error('侧边栏初始化失败:', error);
                            });
                        }
                    }
                });
            }

            // 天气按钮
            const weatherBtn = document.getElementById('weatherBtn');
            if (weatherBtn) {
                weatherBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.closeSearchModal();
                    if (window.app && window.app.modules.weather) {
                        window.app.modules.weather.showModal();
                    }
                });
            }

            // 文档点击事件
            document.addEventListener('click', this.handleDocumentClick.bind(this));

            // 键盘事件
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeAllModals();
                }
            });

            // 滚动事件
            window.addEventListener('scroll', this.handleScroll.bind(this));

            // 返回顶部按钮
            const backToTop = document.getElementById('backToTop');
            if (backToTop) {
                backToTop.addEventListener('click', () => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }

            // 注意：移除了活动按钮的事件绑定，因为它现在是链接

        } catch (error) {
            console.error('导航栏事件绑定失败:', error);
        }
    }

    /**
     * 处理搜索按钮点击
     */
    handleSearchButtonClick() {
        try {
            // 关闭其他模态框
            this.closeAllModalsExceptSearch();
            
            // 确保搜索模块可用
            if (window.searchModule && typeof window.searchModule.showModal === 'function') {
                if (window.searchModule.isModalOpen()) {
                    window.searchModule.hide();
                } else {
                    window.searchModule.showModal();
                }
            } else if (typeof SearchModule !== 'undefined') {
                // 如果 SearchModule 类存在但未实例化
                console.log('搜索模块未实例化，正在初始化...');
                window.searchModule = new SearchModule();
                window.searchModule.showModal();
            } else {
                // 搜索模块完全不可用
                console.error('搜索模块未加载');
                this.showToast('搜索功能暂时不可用，请刷新页面', 'error');
                
                // 尝试重新加载搜索模块
                setTimeout(() => {
                    this.loadSearchModule();
                }, 100);
            }
        } catch (error) {
            console.error('处理搜索按钮点击失败:', error);
            this.showToast('搜索功能出错', 'error');
        }
    }

    /**
     * 加载搜索模块
     */
    loadSearchModule() {
        if (typeof SearchModule !== 'undefined') {
            try {
                window.searchModule = new SearchModule();
                this.showToast('搜索模块已加载', 'success');
                setTimeout(() => {
                    window.searchModule.showModal();
                }, 300);
            } catch (error) {
                console.error('加载搜索模块失败:', error);
                this.showToast('搜索功能暂时不可用', 'warning');
            }
        } else {
            this.showToast('搜索模块未找到，请刷新页面', 'error');
        }
    }

    /**
     * 切换搜索模态框
     */
    toggleSearchModal() {
        try {
            if (window.searchModule) {
                if (window.searchModule.isModalOpen()) {
                    window.searchModule.hide();
                } else {
                    window.searchModule.showModal();
                }
            }
        } catch (error) {
            console.error('切换搜索模态框失败:', error);
        }
    }

    /**
     * 关闭搜索模态框
     */
    closeSearchModal() {
        try {
            if (window.searchModule && window.searchModule.isModalOpen()) {
                window.searchModule.hide();
            }
        } catch (error) {
            console.error('关闭搜索模态框失败:', error);
        }
    }

    /**
     * 关闭除搜索外的所有模态框
     */
    closeAllModalsExceptSearch() {
        try {
            // 隐藏音乐播放器
            const musicPlayer = document.getElementById('musicPlayer');
            const musicBtn = document.getElementById('musicBtn');
            
            if (musicPlayer && musicPlayer.classList.contains('show')) {
                musicPlayer.classList.add('animating', 'hiding');
                musicBtn.classList.remove('active');
                musicPlayer.classList.remove('show');
                
                setTimeout(() => {
                    musicPlayer.style.display = 'none';
                    musicPlayer.classList.remove('animating', 'hiding');
                }, 600);
            }
            
            // 关闭侧边栏
            if (window.sidebar && window.sidebar.isVisible()) {
                window.sidebar.hide();
            }
            
            // 关闭公告模态框
            if (window.announcementModule && window.announcementModule.isModalOpen()) {
                window.announcementModule.hide();
            }
            
            // 关闭天气模态框
            if (window.app && window.app.modules.weather && window.app.modules.weather.isModalOpen) {
                window.app.modules.weather.hide();
            }
            
            // 关闭关于模态框
            if (window.aboutModule && window.aboutModule.isVisible) {
                window.aboutModule.hide();
            }
        } catch (error) {
            console.error('关闭其他模态框失败:', error);
        }
    }

    /**
     * 切换音乐播放器
     */
    toggleMusicPlayer() {
        try {
            const musicPlayer = document.getElementById('musicPlayer');
            const musicBtn = document.getElementById('musicBtn');
            
            if (!musicPlayer || !musicBtn) return;
            
            if (musicPlayer.classList.contains('animating')) return;
            
            if (musicPlayer.classList.contains('show')) {
                this.hideMusicPlayer();
            } else {
                this.showMusicPlayer();
            }
        } catch (error) {
            console.error('切换音乐播放器失败:', error);
        }
    }

    /**
     * 显示音乐播放器 - 减慢速度
     */
    showMusicPlayer() {
        try {
            const musicPlayer = document.getElementById('musicPlayer');
            const musicBtn = document.getElementById('musicBtn');
            
            if (!musicPlayer || !musicBtn) return;
            
            // 关闭侧边栏和搜索模态框
            if (window.sidebar && window.sidebar.isVisible()) {
                window.sidebar.hide();
            }
            
            // 关闭搜索模态框
            if (window.searchModule && window.searchModule.isModalOpen()) {
                window.searchModule.hide();
            }
            
            musicPlayer.classList.add('animating');
            musicBtn.classList.add('loading');
            
            musicPlayer.style.display = 'block';
            musicPlayer.style.zIndex = '10000';
            
            setTimeout(() => {
                musicPlayer.classList.add('show');
                musicBtn.classList.add('active');
                musicBtn.classList.remove('loading');
                
                setTimeout(() => {
                    musicPlayer.classList.remove('animating');
                }, 600); // 调整为600ms
            }, 10);
        } catch (error) {
            console.error('显示音乐播放器失败:', error);
        }
    }

    /**
     * 隐藏音乐播放器 - 减慢速度
     */
    hideMusicPlayer() {
        try {
            const musicPlayer = document.getElementById('musicPlayer');
            const musicBtn = document.getElementById('musicBtn');
            
            if (!musicPlayer || !musicBtn) return;
            
            musicPlayer.classList.add('animating', 'hiding');
            musicBtn.classList.remove('active');
            
            musicPlayer.classList.remove('show');
            
            setTimeout(() => {
                musicPlayer.style.display = 'none';
                musicPlayer.classList.remove('animating', 'hiding');
            }, 600); // 调整为600ms
        } catch (error) {
            console.error('隐藏音乐播放器失败:', error);
        }
    }

    /**
     * 处理文档点击事件
     */
    handleDocumentClick(e) {
        try {
            const musicPlayer = document.getElementById('musicPlayer');
            const musicBtn = document.getElementById('musicBtn');
            
            if (musicPlayer && 
                musicPlayer.classList.contains('show') && 
                !musicPlayer.contains(e.target) && 
                !musicBtn.contains(e.target)) {
                this.hideMusicPlayer();
            }
        } catch (error) {
            console.error('处理文档点击事件失败:', error);
        }
    }

    /**
     * 处理滚动事件 - 只修改返回顶部按钮
     */
    handleScroll() {
        try {
            const navbar = document.getElementById('navbar');
            const backToTop = document.getElementById('backToTop');
            
            // 导航栏滚动效果（保持不变）
            if (navbar && window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else if (navbar) {
                navbar.classList.remove('scrolled');
            }
            
            // 只控制返回顶部按钮的显示/隐藏
            if (backToTop) {
                if (window.scrollY > 300) {
                    // 滚动超过300px时显示按钮
                    backToTop.classList.add('visible');
                } else {
                    // 滚动到顶部附近时隐藏按钮
                    backToTop.classList.remove('visible');
                }
            }
        } catch (error) {
            console.error('处理滚动事件失败:', error);
        }
    }

    /**
     * 关闭所有模态框
     */
    closeAllModals() {
        try {
            this.hideMusicPlayer();
            this.closeSearchModal();
            
            if (window.announcementModule) {
                window.announcementModule.hide();
            }
            
            // 关闭天气模态框
            if (window.app && window.app.modules.weather && window.app.modules.weather.hide) {
                window.app.modules.weather.hide();
            }
            
            // 关闭关于模态框
            if (window.aboutModule && window.aboutModule.hide) {
                window.aboutModule.hide();
            }
            
        } catch (error) {
            console.error('关闭所有模态框失败:', error);
        }
    }

    /**
     * 加载公告数据
     */
    loadAnnouncements() {
        try {
            this.announcements = Storage.get('announcements') || [
                {
                    id: 'single_announcement',
                    title: '星链导航公告',
                    subtitle: '重要通知',
                    focus: '星链导航已正式发布，带来全新体验和更多实用功能，优化了性能和使用体验。',
                    updates: [
                        '全新界面设计 - 更加现代化和美观的视觉体验',
                        '音乐播放器 - 支持多平台音乐搜索和播放',
                        '个性化设置 - 可自定义主题和布局',
                        '更多实用工具 - 新增多个日常使用的小工具',
                        '性能优化 - 更快的加载速度和响应时间'
                    ],
                    time: new Date().toLocaleString('zh-CN'),
                    source: '系统公告',
                    read: false
                }
            ];
        } catch (error) {
            console.error('加载公告数据失败:', error);
        }
    }

    /**
     * 更新通知徽章
     */
    updateNotificationBadge() {
        try {
            const announcementBtn = document.getElementById('announcementBtn');
            if (!announcementBtn) return;
            
            const existingBadge = announcementBtn.querySelector('.nav-badge');
            const unreadCount = this.getUnreadAnnouncementCount();
            
            if (unreadCount > 0) {
                if (!existingBadge) {
                    const badge = document.createElement('div');
                    badge.className = 'nav-badge';
                    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    announcementBtn.appendChild(badge);
                    
                    setTimeout(() => {
                        badge.classList.add('show');
                    }, 100);
                } else {
                    existingBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                }
                
                // 添加未读状态样式
                announcementBtn.classList.add('has-unread');
            } else if (existingBadge) {
                existingBadge.classList.remove('show');
                setTimeout(() => {
                    if (existingBadge.parentNode) {
                        existingBadge.parentNode.removeChild(existingBadge);
                    }
                }, 300);
                
                // 移除未读状态样式
                announcementBtn.classList.remove('has-unread');
            }
        } catch (error) {
            console.error('更新通知徽章失败:', error);
        }
    }

    /**
     * 获取未读公告数量
     */
    getUnreadAnnouncementCount() {
        try {
            if (window.app && window.app.modules.announcement) {
                return window.app.modules.announcement.getUnreadCount();
            }
            
            const announcements = Storage.get('announcements') || [];
            return announcements.filter(ann => !ann.read).length;
        } catch (error) {
            console.error('获取未读公告数量失败:', error);
            return 0;
        }
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        try {
            const toastContainer = document.getElementById('toastContainer') || (() => {
                const container = document.createElement('div');
                container.id = 'toastContainer';
                container.className = 'toast-container';
                document.body.appendChild(container);
                return container;
            })();

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-content">
                    <i class="fas fa-${this.getToastIcon(type)}"></i>
                    <span>${message}</span>
                </div>
            `;

            toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('show');
            }, 100);

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        } catch (error) {
            console.error('显示提示消息失败:', error);
        }
    }

    /**
     * 获取Toast图标
     */
    getToastIcon(type) {
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * 销毁组件
     */
    destroy() {
        try {
            document.removeEventListener('click', this.handleDocumentClick);
            window.removeEventListener('scroll', this.handleScroll);
            window.removeEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeAllModals();
                }
            });
        } catch (error) {
            console.error('销毁导航栏失败:', error);
        }
    }
}

// 初始化导航栏
window.navbar = new Navbar();

// 全局访问函数
window.getNavbar = function() {
    return window.navbar;
};