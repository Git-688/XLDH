<div align="center">
  <img src="./assets/logo.png" alt="星聚导航 Logo" width="100">
  <h1>⭐️ 星聚导航</h1>
  <p>极简高效的现代个人导航页，一站直达主流工具与资源</p>

  ![GitHub Repo stars](https://img.shields.io/github/stars/Git-688/XLDH?style=social)
  ![GitHub forks](https://img.shields.io/github/forks/Git-688/XLDH?style=social)
  ![Website](https://img.shields.io/website?url=https%3A%2F%2Fxjdh688.ccwu.cc&label=网站状态)
  ![License](https://img.shields.io/github/license/Git-688/XLDH)
</div>

---

## ✨ 特性

- 🧭 **三级导航**：分类 > 子分类 > 网站卡片，清晰直达
- 🔍 **多引擎搜索**：百度、谷歌、360、抖音、全网聚合
- 🖼️ **每日必应壁纸** + 风景轮播
- 🎵 **内置音乐播放器**：网易云、QQ、抖音热歌榜、本地音乐
- ☁️ **天气卡片**：自动定位、未来预报
- 🧾 **常用标签**：60s快讯、图片工具、热搜等 40+ 快捷入口
- 🎣 **趣味木鱼**：功德/幸运/财富/健康，敲击有特效和音效
- 📝 **星聚笔记**：云存储的便签（API 驱动）
- 💬 **Waline 评论系统**：净网支持 LaTeX
- 📱 **响应式设计**：适配桌面、平板、手机

## 🌐 在线体验

主站：`https://xjdh688.ccwu.cc`  
后台管理：`https://xjdh688.ccwu.cc/admin.html`（暂不开放）  
图床：`https://tc688.ccwu.cc`（Cloudflare Images + Hugging Face）  
影视：`https://ys688.ccwu.cc`（MoonTVPlus）


## 🚀 快速部署

1. **Fork 本仓库** 并克隆到本地
2. 部署前端到 **Cloudflare Pages**（直接连接仓库自动部署）
3. 配置后端 **Cloudflare Workers**：
   - 创建 D1 数据库和 KV 命名空间
   - 在 Workers 设置中绑定 `DB`（D1）和 `STATS_KV`（KV）
   - 设置环境变量：`ADMIN_TOKEN`、`ALLOWED_ORIGINS` 等
4. 将 `admin.html` 作为管理后台访问并开始添加导航内容
5. 修改 `worker.js` 中的 `CACHE_TTL` 和域名配置以适应你的需求

## 📁 目录结构
```
XLDH/
├── index.html                 # 主站首页入口
├── admin.html                 # 后台管理（独立的 CSP 保护)
├── package.json               # 依赖与脚本（构建工具等)
├── README.md                  # 项目说明文档
│
├── assets/                    # 静态资源（图片、logo、本地壁纸）
│   ├── logo.png
│   ├── images/
│   └── wallpapers/
│
├── css/
│   ├── style.css              # 全局基础样式
│   ├── responsive.css
│   └── modules/               # 各功能模块样式
│       ├── navbar.css
│       ├── sidebar.css
│       ├── search.css
│       ├── navigation.css
│       ├── wallpaper.css
│       ├── greeting.css
│       ├── stats.css
│       ├── comment.css
│       ├── compact-tags.css
│       ├── weather.css
│       ├── announcement.css
│       └── about.css
│
├── js/
│   ├── main.js                # App 主控制器（统一管理组件与模块）
│   ├── storage.js             # localStorage 封装
│   ├── api.js                 # 对外部 API 的封装（壁纸、一言等）
│   ├── toast.js               # Toast 提示管理器
│   │
│   ├── components/            # 核心 UI 组件
│   │   ├── navbar.js          # 导航栏（App 管理，不挂全局）
│   │   └── sidebar.js         # 侧边栏
│   │
│   ├── modules/               # 业务模块
│   │   ├── announcement.js    # 公告模块
│   │   ├── search.js          # 搜索模块
│   │   ├── weather.js         # 天气模块
│   │   ├── about.js           # 关于模块
│   │   ├── navigation.js      # 分类导航（数据来自 Workers）
│   │   ├── wallpaper.js       # 壁纸轮播
│   │   ├── greeting.js        # 问候语与木鱼
│   │   ├── stats.js           # 页脚访问统计
│   │   ├── comment.js       # 评论系统
│   │   └── compact-tags.js    # 常用工具标签
│   │
│   └── xfyy/                  # 音乐播放器子系统
│       ├── utils.js
│       ├── cache-manager.js
│       ├── lyric-parser.js
│       ├── plugin-manager.js
│       ├── music-player.js
│       └── music-main.js
│
├── data/
│   └── local-music-data.js    # 本地音乐列表（示例）
│
├── pages/                     # 扩展子页面（工具集、资源库等）
    └── tools/                 # 各种小工具页面
```
## 🔧 配置与管理

管理后台

· 访问 /admin.html，使用预设 Token 登录
· 支持分类、子分类、链接的增删改查
· 可查看点击排行、死链反馈并处理
· 备份导出为 JSON，操作日志留存

环境变量

项目通过 window.APP_CONFIG 注入配置，例如 API 域名。可在 index.html 的 <script> 中设置：

```javascript window.APP_CONFIG={API_BASE:'https://api.xjdh688.ccwu.cc'};
```

内容安全策略 (CSP)

已为 index.html 和 admin.html 分别配置严格的CSP，限制脚本、样式、连接来源。若添加新第三方资源，请同步更新 meta 标签。

## 🤝 贡献与支持

欢迎提 Issue、PR，或通过邮箱 1595126534@qq.com 联系作者。
如果你有新的实用网站想要收录，请在 [投稿页面](https://f.wps.cn/g/TI3Gxbe1/) 填写，或直接提交到仓库。

📄 许可证

本项目基于 MIT License 开源。

---

星聚导航 — 启跃星门，航图绘星河
