// rjxz.js - 软件数据
const appData = [
    {
        id: 1,
        icon: "https://picsum.photos/200/200?random=1",
        name: "笔记大师",
        desc: "轻量高效的跨平台笔记工具，支持Markdown编辑",
        url: "#download-1",
        tag: "办公"
    },
    {
        id: 2,
        icon: "https://picsum.photos/200/200?random=2",
        name: "文件快传",
        desc: "无需网络的本地文件传输工具，速度达10MB/s",
        url: "#download-2",
        tag: "工具"
    },
    {
        id: 3,
        icon: "https://picsum.photos/200/200?random=3",
        name: "屏幕录制",
        desc: "无水印高清录屏，支持自定义区域和音频录入",
        url: "#download-3",
        tag: "玩机"
    },
    {
        id: 4,
        icon: "https://picsum.photos/200/200?random=4",
        name: "天气预报",
        desc: "精准预报15天天气，支持空气质量和灾害预警",
        url: "#download-4",
        tag: "生活"
    },
    {
        id: 5,
        icon: "https://picsum.photos/200/200?random=5",
        name: "PDF转换器",
        desc: "免费转换PDF与Word/Excel/图片，无文件大小限制",
        url: "#download-5",
        tag: "办公"
    },
    {
        id: 6,
        icon: "https://picsum.photos/200/200?random=6",
        name: "音乐播放器",
        desc: "本地音乐管理+在线听歌，支持歌词同步和音质调节",
        url: "#download-6",
        tag: "音乐"
    },
    {
        id: 7,
        icon: "https://picsum.photos/200/200?random=7",
        name: "AI绘画助手",
        desc: "输入文字生成高清图片，支持多种艺术风格",
        url: "#download-7",
        tag: "Ai"
    },
    {
        id: 8,
        icon: "https://picsum.photos/200/200?random=8",
        name: "影视大全",
        desc: "聚合全网影视资源，支持高清播放和离线缓存",
        url: "#download-8",
        tag: "影视"
    },
    {
        id: 9,
        icon: "https://picsum.photos/200/200?random=9",
        name: "电子书阅读器",
        desc: "支持多种格式，护眼模式+自定义字体",
        url: "#download-9",
        tag: "阅读"
    },
    {
        id: 10,
        icon: "https://picsum.photos/200/200?random=10",
        name: "漫画神器",
        desc: "海量漫画资源，支持离线下载和横屏阅读",
        url: "#download-10",
        tag: "漫画"
    },
    {
        id: 11,
        icon: "https://picsum.photos/200/200?random=11",
        name: "英语学习",
        desc: "单词背诵+听力训练，覆盖四六级/考研词汇",
        url: "#download-11",
        tag: "学习"
    },
    {
        id: 12,
        icon: "https://picsum.photos/200/200?random=12",
        name: "系统清理",
        desc: "深度清理垃圾文件，优化手机运行速度",
        url: "#download-12",
        tag: "系统"
    },
    {
        id: 13,
        icon: "https://picsum.photos/200/200?random=13",
        name: "热门游戏合集",
        desc: "聚合多款休闲小游戏，无需单独下载",
        url: "#download-13",
        tag: "娱乐"
    },
    {
        id: 14,
        icon: "https://picsum.photos/200/200?random=14",
        name: "星级浏览器",
        desc: "高速内核+广告拦截，支持书签同步",
        url: "#download-14",
        tag: "星标"
    },
    {
        id: 15,
        icon: "https://picsum.photos/200/200?random=15",
        name: "社交圈",
        desc: "发现附近有趣的人，即时聊天分享生活",
        url: "#download-15",
        tag: "社交"
    },
    {
        id: 16,
        icon: "https://picsum.photos/200/200?random=16",
        name: "光影大师",
        desc: "专业级摄影编辑工具，内置上百种滤镜",
        url: "#download-16",
        tag: "摄影"
    },
    {
        id: 17,
        icon: "https://picsum.photos/200/200?random=17",
        name: "健康助手",
        desc: "记录运动数据、睡眠质量，提供个性化健康建议",
        url: "#download-17",
        tag: "健康"
    },
    {
        id: 18,
        icon: "https://picsum.photos/200/200?random=18",
        name: "短视频社交",
        desc: "创作有趣短视频，与朋友分享精彩瞬间",
        url: "#download-18",
        tag: "社交"
    },
    {
        id: 19,
        icon: "https://picsum.photos/200/200?random=19",
        name: "专业相机",
        desc: "支持RAW格式，手动调节曝光、白平衡",
        url: "#download-19",
        tag: "摄影"
    },
    {
        id: 20,
        icon: "https://picsum.photos/200/200?random=20",
        name: "健身计划",
        desc: "定制个性化健身方案，跟踪训练进度",
        url: "#download-20",
        tag: "健康"
    }
];

// 标签数据
const allTags = [
    "星标", "系统", "玩机", "工具", "Ai", 
    "影视", "音乐", "阅读", "漫画", "学习", 
    "办公", "娱乐", "生活", "社交", "摄影", "健康"
];

// 标签颜色
const tagColorMap = {
    "星标": "bg-yellow-500",
    "系统": "bg-red-500",
    "玩机": "bg-purple-500",
    "工具": "bg-gray-700",
    "Ai": "bg-blue-500",
    "影视": "bg-indigo-500",
    "音乐": "bg-pink-500",
    "阅读": "bg-teal-500",
    "漫画": "bg-green-500",
    "学习": "bg-orange-500",
    "办公": "bg-cyan-500",
    "娱乐": "bg-purple-400",
    "生活": "bg-amber-500",
    "社交": "bg-sky-500",      // 新增：社交分类使用天蓝色
    "摄影": "bg-rose-500",     // 新增：摄影分类使用玫瑰红
    "健康": "bg-emerald-500"   // 新增：健康分类使用翠绿色
};