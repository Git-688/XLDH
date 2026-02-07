// compact-tags.js - 纯图标标签模块（简化版）
class CompactTagsModule {
    constructor() {
        // 添加了铃声搜索和游戏语音，总共21个按钮
        this.tags = [
            { name: '影视搜索', icon: 'fas fa-film', link: 'pages/tools/影视搜索.html', colorClass: 'tag-color-1' },
            { name: '短剧搜索', icon: 'fas fa-play-circle', link: 'pages/tools/短剧搜索.html', colorClass: 'tag-color-2' },
            { name: '一言合集', icon: 'fas fa-quote-left', link: 'pages/tools/一言合集.html', colorClass: 'tag-color-3' },
            { name: '黄历日历', icon: 'fas fa-calendar-alt', link: 'pages/tools/黄历日历.html', colorClass: 'tag-color-4' },
            { name: '60s快讯', icon: 'fas fa-newspaper', link: 'pages/tools/60s快讯.html', colorClass: 'tag-color-5' },
            { name: '聚合热搜', icon: 'fas fa-fire', link: 'pages/tools/聚合热搜.html', colorClass: 'tag-color-6' },
            { name: '简约语录', icon: 'fas fa-quote-right', link: 'pages/tools/简约语录.html', colorClass: 'tag-color-7' },
            { name: '找表情包', icon: 'fas fa-smile', link: 'pages/tools/找表情包.html', colorClass: 'tag-color-8' },
            { name: '趣味挑战', icon: 'fas fa-gamepad', link: 'pages/tools/趣味挑战.html', colorClass: 'tag-color-9' },
            { name: '诗词雅集', icon: 'fas fa-pen-fancy', link: 'pages/tools/诗词雅集.html', colorClass: 'tag-color-10' },
            { name: '答案之书', icon: 'fas fa-book', link: 'pages/tools/答案之书.html', colorClass: 'tag-color-11' },
            { name: '每日一阅', icon: 'fas fa-book-reader', link: 'pages/tools/每日一阅.html', colorClass: 'tag-color-12' },
            { name: '图片生成', icon: 'fas fa-images', link: 'pages/tools/图片生成.html', colorClass: 'tag-color-13' },
            { name: '学习工具', icon: 'fas fa-graduation-cap', link: 'pages/tools/学习工具.html', colorClass: 'tag-color-14' },
            { name: '简单查询', icon: 'fas fa-search-plus', link: 'pages/tools/简单查询.html', colorClass: 'tag-color-15' },
            { name: '动态壁纸', icon: 'fas fa-desktop', link: 'pages/tools/动态壁纸.html', colorClass: 'tag-color-16' },
            { name: '分析工具', icon: 'fas fa-chart-bar', link: 'pages/tools/分析工具.html', colorClass: 'tag-color-17' },
            { name: '助眠声控', icon: 'fas fa-moon', link: 'pages/tools/助眠声控.html', colorClass: 'tag-color-18' },
            { name: '每日段子', icon: 'fas fa-laugh', link: 'pages/tools/每日段子.html', colorClass: 'tag-color-19' },
            // 新增的两个标签
            { name: '铃声搜索', icon: 'fas fa-music', link: 'pages/tools/铃声搜索.html', colorClass: 'tag-color-20' },
            { name: '游戏语音', icon: 'fas fa-headset', link: 'pages/tools/游戏语音.html', colorClass: 'tag-color-1' }
        ];
        
        this.init();
    }

    init() {
        this.renderTags();
        this.bindEvents();
    }

    renderTags() {
        const grid = document.getElementById('tagsGrid');
        if (!grid) return;

        grid.innerHTML = this.tags.map((tag, index) => {
            const colorClass = tag.colorClass || `tag-color-${(index % 20) + 1}`;
            
            return `
                <a href="${tag.link}" 
                   class="minimal-tag ${colorClass}" 
                   data-index="${index}"
                   data-name="${tag.name}"
                   title="${tag.name}">
                    <i class="tag-icon ${tag.icon}"></i>
                    <div class="tag-label">${tag.name}</div>
                </a>
            `;
        }).join('');
    }

    bindEvents() {
        const grid = document.getElementById('tagsGrid');
        if (!grid) return;

        // 点击标签
        grid.addEventListener('click', (e) => {
            const tag = e.target.closest('.minimal-tag');
            if (tag) {
                this.handleTagClick(tag);
            }
        });

        // 键盘导航
        grid.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const tag = e.target.closest('.minimal-tag');
                if (tag) {
                    e.preventDefault();
                    tag.click();
                }
            }
        });
    }

    handleTagClick(tag) {
        // 移除所有活跃状态
        document.querySelectorAll('.minimal-tag.active').forEach(t => {
            t.classList.remove('active');
        });
        
        // 添加当前活跃状态
        tag.classList.add('active');
        
        // 添加点击反馈
        tag.style.transform = 'scale(0.9)';
        setTimeout(() => {
            tag.style.transform = '';
        }, 100);
    }

    refresh() {
        this.renderTags();
    }
}

// 初始化模块
document.addEventListener('DOMContentLoaded', () => {
    if (!window.compactTagsModule) {
        window.compactTagsModule = new CompactTagsModule();
    }
});

// 导出到全局
window.CompactTagsModule = CompactTagsModule;