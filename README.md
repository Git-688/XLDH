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
- 💬 **Twikoo 评论系统**：净网支持 LaTeX
- 📱 **响应式设计**：适配桌面、平板、手机

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
.
├── index.html               # 首页主入口
├── admin.html               # 后台管理（独立页面，带独立 CSP）
├── 404.html                 # 自定义错误页
├── assets/                  # 图片、图标、本地壁纸
├── css/
│   ├── style.css            # 全局基础样式
│   └── modules/             # 各功能模块样式（navbar、sidebar、search 等）
├── js/
│   ├── main.js              # App 主控
│   ├── storage.js           # 本地存储工具
│   ├── api.js               # 外部 API 封装
│   ├── toast.js             # 全局 Toast 管理器
│   ├── components/          # 核心组件（navbar、sidebar）
│   ├── modules/             # 业务模块（navigation、greeting、weather 等）
│   └── xfyy/                # 音乐播放器子系统
├── data/
│   └── local-music-data.js  # 本地音乐示例数据
├── pages/                   # 子页面（工具集、资源库等）
└── README.md
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

📄 许可证

本项目基于 MIT License 开源。

---

星聚导航 — 启跃星门，航图绘星河
