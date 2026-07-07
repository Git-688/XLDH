<div align="center">
  <img src="./assets/logo.png" alt="星聚导航 Logo" width="100">
  <h1>⭐️ 星聚导航</h1>
  <p>基于免费公开的（Git开源项目、接口、轻量数据库）基础上所建设的一款极简的现代个人导航</p>

  ![GitHub Repo stars](https://img.shields.io/github/stars/Git-688/XLDH?style=social)
  ![GitHub forks](https://img.shields.io/github/forks/Git-688/XLDH?style=social)
  ![Website](https://img.shields.io/website?url=https%3A%2F%2Fxjdh688.ccwu.cc&label=网站状态)
  ![License](https://img.shields.io/github/license/Git-688/XLDH)
  [![群](https://img.shields.io/badge/%E4%BC%81%E9%B9%85%E7%BE%A4-187780263-6BC5FF)](https://qun.qq.com/universal-share/share?ac=1&authKey=%2BP3qVBuKJpn3kIn5jBnlVFWx7S3Z%2Be0sD4KKmK4KTqqqQYjD8uQoNyhFMYRx3EXO&busi_data=eyJncm91cENvZGUiOiIxODc3ODAyNjMiLCJ0b2tlbiI6IlBkYzZ3TGlCK0ZLTWdyWEZLNExwOVZodHVycFRhT1A0L2swWUgxNDZrZ0c1WTFXL29jcVhJWk9uMWcwbnVPK3MiLCJ1aW4iOiIxNTk1MTI2NTM0In0%3D&data=b2ypnWVy3QPJUZq7msse4tlsICKy2GqgCLKOnfNwgdSHGsUxqHTfLoQmkwpQ2q61yXoOfKJsGRJ9DnG5cad8dA&svctype=4&tempid=h5_group_info)
</div>

---

## ✨ 特性

- 🧭 **三级导航**：分类 > 子分类 > 网站卡片，清晰直达
- 🔍 **多引擎搜索**：百度、谷歌、360、抖音，支持搜索建议
- 🖼️ **每日必应壁纸** + 风景轮播
- 🎵 **内置音乐播放器**：支持搜索与排行榜切换，增加音乐播放器插件
- ☁️ **天气卡片**：自动定位（GPS）、未来7天预报、手动选择城市
- 🧾 **常用标签**：60s快讯、图片工具、热搜等 40+ 快捷入口，彩虹浅色样式
- 🎣 **趣味木鱼**：功德/幸运/财富/健康，敲击有特效和音效
- 🔔 **公告系统**：单公告模式，支持重要内容高亮，未读标记
- 📝 **星聚笔记**：云存储的便签（API 驱动）
- 💬 **Waline 评论系统**：支持 LaTeX
- 🌓 **深色模式**：适配深色主题，跟随系统或手动切换
- 📱 **响应式设计**：适配桌面、平板、手机
- 🔒 **安全检测**：网站投稿时自动执行 Google Safe Browsing + VirusTotal 双重检测
- ⚡ **性能优化**：三级缓存（边缘缓存 + KV + 内存），静态资源 CDN 化，图片懒加载
- 🛡️ **后台验证码**：星空动态星星云验证码，防止暴力破解


## 🌐 在线体验

✅️星聚导航：`https://xjdh688.ccwu.cc`  
✅️星聚图床：`https://tc688.ccwu.cc`   
✅️星聚影视：`https://ys688.ccwu.cc`  

## 🚀 快速部署

1. **Fork 本仓库** 并克隆到本地
2. 部署前端到 **Cloudflare Pages**（直接连接仓库自动部署）
3. 配置后端 **Cloudflare Workers**：
   - 创建 D1 数据库和 KV 命名空间
   - 在 Workers 设置中绑定 `DB`（D1）和 `STATS_KV`（KV）
   - 设置环境变量：`ADMIN_TOKEN`、`ALLOWED_ORIGINS` 等
4. 将 `admin.html` 作为管理后台访问并开始添加导航内容
5. 修改 `worker.js` 中的 `CACHE_TTL` 和域名配置以适应你的需求

## 🧩 环境变量

| 变量名 | 说明 |
|--------|------|
| `ADMIN_TOKEN` | 后台管理 Token |
| `ADMIN_IP_WHITELIST` | IP 白名单（可选，逗号分隔） |
| `ALLOWED_ORIGINS` | 允许的前端域名（逗号分隔） |
| `APIHZ_ID` | APIHz 用户 ID（笔记/搜索代理） |
| `APIHZ_KEY` | APIHz 密钥 |
| `VT_API_KEY` | VirusTotal API 密钥 |
| `SAFE_BROWSING_KEY` | Google Safe Browsing API 密钥 |

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

```
javascript window.APP_CONFIG={API_BASE:'https://api.xjdh688.ccwu.cc'};
```


内容安全策略 (CSP)

已为 index.html 和 admin.html 分别配置严格的CSP，限制脚本、样式、连接来源。若添加新第三方资源，请同步更新 meta 标签。

## 🖼️ 效果展示

<!-- 使用 inline-block + white-space:nowrap 实现可靠的横向滚动，卡片永不换行 -->
<div style="overflow-x: auto; overflow-y: hidden; white-space: nowrap; padding: 10px 0; width: 100%; -webkit-overflow-scrolling: touch;">
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/网站主页.webp" alt="网站主页" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">网站主页</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/分类导航.webp" alt="分类导航" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">分类导航</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/网站页脚.webp" alt="网站页脚" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">网站页脚</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/侧滑栏.webp" alt="侧滑栏" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">侧滑栏</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/内部音乐.webp" alt="内部音乐" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">内部音乐</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/外部音乐.webp" alt="外部音乐" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">外部音乐</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/排行榜.webp" alt="排行榜" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">排行榜</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/评论系统.webp" alt="评论系统" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">评论系统</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/天气预报.webp" alt="天气预报" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">天气预报</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/网站投稿.webp" alt="网站投稿" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">网站投稿</div>
  </div>
  <div style="display: inline-block; text-align: center; width: 150px; margin-right: 12px; vertical-align: top;">
    <img src="https://tc688.ccwu.cc/file/星聚导航/zstp/关于网站.webp" alt="关于网站" width="150" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block;">
    <div style="font-weight: bold; font-size: 14px; color: #333; margin-top: 6px; white-space: nowrap;">关于网站</div>
  </div>
</div>

<div align="center">
  <p>📸 截图仅示意，实际效果请访问 <a href="shturl.cc/30XQNKS3hf9de">在线体验</a></p>
</div>


## 💰 赞赏项目

如果觉得这个项目对你有帮助，欢迎请我喝咖啡 ☕️

> 采取**自愿**原则, 收到的赞赏将用于提高开发者积极性和开发环境。

<div align="center">
  <table>
    <tr>
      <td align="center">
        <strong>QQ 支付</strong><br>
        <img src="./assets/images/qq.png" width="150" alt="QQ收款码">
      </td>
      <td align="center">
        <strong>微信支付</strong><br>
        <img src="./assets/images/wx.png" width="150" alt="微信收款码">
      </td>
      <td align="center">
        <strong>支付宝</strong><br>
        <img src="./assets/images/zfb.png" width="150" alt="支付宝收款码">
      </td>
    </tr>
  </table>
  <p>⭐️ 感谢您的支持！ ⭐️</p>
</div>

## 📈 Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=Git-688/XLDH&type=Date)](https://star-history.com/#Git-688/XLDH&Date)


📄 许可证

本项目基于 [MIT](license) License 开源，© 2025-PRESENT Viki。

---

星聚导航 — 启跃星门，航图绘星河