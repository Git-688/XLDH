// compact-tags.js - 彩虹浅色标签模块（完整列表版）
class CompactTagsModule {
    constructor() {
        // 最终标签列表：保留的原标签 + 新添加标签，按名称拼音排序
        this.tags = [
            { name: '60s快讯', icon: 'fas fa-newspaper', link: 'pages/tools/60s快讯.html' },
            { name: '本草药材', icon: 'fas fa-leaf', link: 'pages/tools/本草药材.html' },
            { name: '壁纸引擎', icon: 'fas fa-desktop', link: 'pages/tools/壁纸引擎.html' },
            { name: '彩票开奖', icon: 'fas fa-ticket-alt', link: 'pages/tools/彩票开奖.html' },
            { name: '查归属地', icon: 'fas fa-map-marker-alt', link: 'pages/tools/查归属地.html' },
            { name: '单词详解', icon: 'fas fa-language', link: 'pages/tools/单词详解.html' },
            { name: '电影搜索', icon: 'fas fa-film', link: 'pages/tools/影视搜索.html' },
            { name: '短剧搜索', icon: 'fas fa-play-circle', link: 'pages/tools/短剧搜索.html' },
            { name: '短视频去水印', icon: 'fas fa-eraser', link: 'pages/tools/短视频去水印.html' },
            { name: '公益宝贝', icon: 'fas fa-heart', link: 'pages/tools/公益宝贝.html' },
            { name: '化学成分', icon: 'fas fa-flask', link: 'pages/tools/化学成分.html' },
            { name: '吉日良辰', icon: 'fas fa-calendar-check', link: 'pages/tools/吉日良辰.html' },
            { name: '今日黄金', icon: 'fas fa-coins', link: 'pages/tools/今日黄金.html' },
            { name: '今日油价', icon: 'fas fa-gas-pump', link: 'pages/tools/今日油价.html' },
            { name: '聚合热搜', icon: 'fas fa-fire', link: 'pages/tools/聚合热搜.html' },
            { name: '历史人物', icon: 'fas fa-landmark', link: 'pages/tools/历史人物.html' },
            { name: '铃声搜索', icon: 'fas fa-music', link: 'pages/tools/铃声搜索.html' },
            { name: '民间传统', icon: 'fas fa-dragon', link: 'pages/tools/民间传统.html' },
            { name: '命理运势', icon: 'fas fa-star-of-life', link: 'pages/tools/命理运势.html' },
            { name: '摸鱼日历', icon: 'fas fa-calendar-alt', link: 'pages/tools/摸鱼日历.html' },
            { name: '女生日历', icon: 'fas fa-female', link: 'pages/tools/女生日历.html' },
            { name: '女友潜台词', icon: 'fas fa-comment-dots', link: 'pages/tools/女友潜词.html' },
            { name: '趣味挑战', icon: 'fas fa-gamepad', link: 'pages/tools/趣味挑战.html' },
            { name: '生活技巧', icon: 'fas fa-lightbulb', link: 'pages/tools/生活技巧.html' },
            { name: '图片工具', icon: 'fas fa-image', link: 'pages/tools/图片工具.html' },
            { name: '网站解析', icon: 'fas fa-globe', link: 'pages/tools/网站解析.html' },
            { name: '文本工具', icon: 'fas fa-file-alt', link: 'pages/tools/文本工具.html' },
            { name: '文字工具', icon: 'fas fa-font', link: 'pages/tools/文字工具.html' },
            { name: '性能排行', icon: 'fas fa-chart-line', link: 'pages/tools/性能排行.html' },
            { name: '游戏攻略', icon: 'fas fa-gamepad', link: 'pages/tools/游戏攻略.html' },
            { name: '游戏语音', icon: 'fas fa-headset', link: 'pages/tools/游戏语音.html' },
            { name: '一言合集', icon: 'fas fa-quote-left', link: 'pages/tools/一言合集.html' },
            { name: '找表情包', icon: 'fas fa-smile', link: 'pages/tools/找表情包.html' },
            { name: '转换格式', icon: 'fas fa-exchange-alt', link: 'pages/tools/转换格式.html' },
            { name: '资源搜索', icon: 'fas fa-search', link: 'pages/tools/资源搜索.html' },
            { name: '子女血型', icon: 'fas fa-heartbeat', link: 'pages/tools/子女血型.html' },
            { name: '助眠声控', icon: 'fas fa-moon', link: 'pages/tools/助眠声控.html' }
        ].sort((a, b) => a.name.localeCompare(b.name, 'zh'));

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
            // 彩虹七色循环
            const colorNum = (index % 7) + 1;
            const colorClass = `tag-color-${colorNum}`;
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

        grid.addEventListener('click', (e) => {
            const tag = e.target.closest('.minimal-tag');
            if (tag) {
                this.handleTagClick(tag);
            }
        });

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
        document.querySelectorAll('.minimal-tag.active').forEach(t => {
            t.classList.remove('active');
        });
        tag.classList.add('active');
        tag.style.transform = 'scale(0.98)';
        setTimeout(() => {
            tag.style.transform = '';
        }, 120);
    }
}

// 初始化模块
document.addEventListener('DOMContentLoaded', () => {
    if (!window.compactTagsModule) {
        window.compactTagsModule = new CompactTagsModule();
    }
});

window.CompactTagsModule = CompactTagsModule;