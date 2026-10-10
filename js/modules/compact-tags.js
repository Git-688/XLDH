/* compact-tags.js */
class CompactTagsModule {
    constructor() {
        if (window.Starlink && window.Starlink.compactTags) return window.Starlink.compactTags;
        
        this.tags = [
            { name: '本草药材', icon: 'fa-solid fa-leaf', link: 'pages/tools/本草药材.html' },
            { name: '壁纸引擎', icon: 'fa-solid fa-display', link: 'pages/tools/壁纸引擎.html' },
            { name: '彩票开奖', icon: 'fa-solid fa-ticket-simple', link: 'pages/tools/彩票开奖.html' },
            { name: '查询工具', icon: 'fa-solid fa-magnifying-glass', link: 'pages/tools/查询工具.html' },
            { name: '单词详解', icon: 'fa-solid fa-language', link: 'pages/tools/单词详解.html' },
            { name: '短视去印', icon: 'fa-solid fa-eraser', link: 'pages/tools/短视频去水印.html' },
            { name: '化学成分', icon: 'fa-solid fa-flask', link: 'pages/tools/化学成分.html' },
            { name: '吉日良辰', icon: 'fa-solid fa-calendar-check', link: 'pages/tools/吉日良辰.html' },
            { name: '今日黄金', icon: 'fa-solid fa-coins', link: 'pages/tools/今日黄金.html' },
            { name: '今日油价', icon: 'fa-solid fa-gas-pump', link: 'pages/tools/今日油价.html' },
            { name: '聚合热搜', icon: 'fa-solid fa-fire', link: 'pages/tools/聚合热搜.html' },
            { name: '历史人物', icon: 'fa-solid fa-landmark', link: 'pages/tools/历史人物.html' },
            { name: '铃声搜索', icon: 'fa-solid fa-music', link: 'pages/tools/铃声搜索.html' },
            { name: '民间传统', icon: 'fa-solid fa-dragon', link: 'pages/tools/民间传统.html' },
            { name: '命理运势', icon: 'fa-solid fa-star-of-life', link: 'pages/tools/命理运势.html' },
            { name: '趣味挑战', icon: 'fa-solid fa-gamepad', link: 'pages/tools/趣味挑战.html' },
            { name: '生活技巧', icon: 'fa-solid fa-lightbulb', link: 'pages/tools/生活技巧.html' },
            { name: '图片工具', icon: 'fa-solid fa-image', link: 'pages/tools/图片工具.html' },
            { name: '网站解析', icon: 'fa-solid fa-globe', link: 'pages/tools/网站解析.html' },
            { name: '文本工具', icon: 'fa-solid fa-file-lines', link: 'pages/tools/文本工具.html' },
            { name: '文字工具', icon: 'fa-solid fa-font', link: 'pages/tools/文字工具.html' },
            { name: '性能排行', icon: 'fa-solid fa-chart-line', link: 'pages/tools/性能排行.html' },
            { name: '游戏攻略', icon: 'fa-solid fa-gamepad', link: 'pages/tools/游戏攻略.html' },
            { name: '一言合集', icon: 'fa-solid fa-quote-left', link: 'pages/tools/一言合集.html' },
            { name: '找表情包', icon: 'fa-solid fa-face-smile', link: 'pages/tools/找表情包.html' },
            { name: '转换格式', icon: 'fa-solid fa-right-left', link: 'pages/tools/转换格式.html' },
            { name: '助眠声控', icon: 'fa-solid fa-moon', link: 'pages/tools/助眠声控.html' }
        ].sort((a, b) => a.name.localeCompare(b.name, 'zh'));

        this.init();
        
        if (window.Starlink) window.Starlink.compactTags = this;
        window.compactTagsModule = this;
    }

    init() {
        this.renderTags();
        this.bindEvents();
    }

    renderTags() {
        const grid = document.getElementById('tagsGrid');
        if (!grid) return;
        grid.innerHTML = this.tags.map((tag, index) => {
            const colorNum = (index % 7) + 1;
            const colorClass = `tag-color-${colorNum}`;
            const safeName = Utils.escapeHtml(tag.name);
            return `
                <a href="${tag.link}" 
                   class="minimal-tag ${colorClass}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   data-index="${index}"
                   data-name="${safeName}"
                   title="${safeName}">
                    <i class="tag-icon ${tag.icon}"></i>
                    <div class="tag-label">${safeName}</div>
                </a>
            `;
        }).join('');
    }

    bindEvents() {
        const grid = document.getElementById('tagsGrid');
        if (!grid) return;
        grid.addEventListener('click', (e) => {
            const tag = e.target.closest('.minimal-tag');
            if (tag) this.handleTagClick(tag);
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
        document.querySelectorAll('.minimal-tag.active').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        tag.style.transform = 'scale(0.98)';
        setTimeout(() => { tag.style.transform = ''; }, 120);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.compactTags) {
        window.Starlink.compactTags = new CompactTagsModule();
    }
    window.compactTagsModule = window.Starlink.compactTags;
});
window.CompactTagsModule = CompactTagsModule;