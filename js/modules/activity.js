/**
 * 活动按钮简化版 - 仅作为链接到羊毛福利页面
 * @class ActivityLink
 */
class ActivityLink {
    constructor() {
        this.button = null;
    }

    /**
     * 初始化模块
     */
    init() {
        try {
            console.log('活动按钮链接模块初始化...');
            
            // 获取活动按钮元素
            this.button = document.getElementById('activityBtn');
            
            if (!this.button) {
                console.error('活动按钮元素未找到');
                return;
            }

            // 确保按钮是链接
            if (this.button.tagName !== 'A') {
                console.warn('活动按钮不是链接，正在修复...');
                // 创建一个新的链接元素
                const link = document.createElement('a');
                link.href = './pages/tools/羊毛福利.html';
                link.className = this.button.className;
                link.id = this.button.id;
                link.setAttribute('aria-label', '羊毛福利');
                link.innerHTML = '<i class="fas fa-gift"></i>';
                
                // 替换原按钮
                this.button.parentNode.replaceChild(link, this.button);
                this.button = link;
            }

            console.log('活动按钮链接模块初始化完成');

        } catch (error) {
            console.error('活动按钮链接模块初始化失败:', error);
        }
    }
}

// 初始化模块
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.activityLink) {
            window.activityLink = new ActivityLink();
            window.activityLink.init();
        }
    });
}