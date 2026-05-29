/* sidebar.css - 现代悬浮侧滑栏样式（宽度缩小版） */
:root {
    --sidebar-width: 260px;                /* 桌面端宽度缩小 */
    --sidebar-mobile-width: 70vw;          /* 移动端宽度缩小 */
    --sidebar-max-mobile: 280px;           /* 移动端最大宽度缩小 */
    --sidebar-bg: rgba(255, 255, 255, 0.75);
    --sidebar-bg-dark: rgba(30, 30, 35, 0.85);
    --sidebar-blur: blur(20px);
    --sidebar-border: 1px solid rgba(255, 255, 255, 0.3);
    --sidebar-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    --sidebar-transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}

/* 侧滑栏容器 */
.sidebar {
    position: fixed;
    left: var(--container-padding-xs, 16px);
    bottom: 20px;
    width: var(--sidebar-width);
    background: var(--sidebar-bg);
    backdrop-filter: var(--sidebar-blur);
    -webkit-backdrop-filter: var(--sidebar-blur);
    border-radius: 8px;
    border: var(--sidebar-border);
    box-shadow: var(--sidebar-shadow);
    z-index: 1001;
    transform: translateX(calc(-100% - var(--container-padding-xs, 16px)));
    transition: var(--sidebar-transition);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.sidebar.active {
    transform: translateX(0);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
    .sidebar {
        background: var(--sidebar-bg-dark);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
}

/* 壁纸头部区域 */
.sidebar-wallpaper {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 8px 8px 0 0;
    flex-shrink: 0;
    overflow: hidden;
}

.sidebar-wallpaper-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 100%);
    pointer-events: none;
}

.sidebar-wallpaper-user-info {
    position: absolute;
    left: 14px;
    bottom: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
    z-index: 2;
    max-width: calc(100% - 28px);
    pointer-events: auto;
}

.sidebar-wallpaper-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.4);
    overflow: hidden;
    background: rgba(0,0,0,0.2);
    flex-shrink: 0;
    cursor: pointer;
    transition: transform 0.2s ease;
}
.sidebar-wallpaper-avatar:hover {
    transform: scale(1.02);
}
.sidebar-wallpaper-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.sidebar-wallpaper-user-text {
    flex: 1;
    min-width: 0;
}
.sidebar-wallpaper-nickname {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.sidebar-wallpaper-signature {
    font-size: 10px;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 每日一言卡片 - 圆角8px */
.daily-quote-card {
    margin: 10px 14px;
    padding: 8px 10px;
    background: rgba(255,255,255,0.4);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.3);
}
.daily-quote-card p {
    font-size: 11px;
    line-height: 1.4;
    color: var(--text-primary, #1e293b);
    margin: 0;
    text-align: center;
    font-style: italic;
}

/* 分类容器 - 隐藏滚动条，顶部间距为0 */
.sidebar-categories {
    flex: 1;
    overflow-y: auto;
    padding: 0 10px 8px 10px;
    scrollbar-width: none;
    -ms-overflow-style: none;
}
.sidebar-categories::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
}

/* 分类分组 - 圆角8px */
.category-group {
    margin-bottom: 10px;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(8px);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    overflow: hidden;
    transition: all 0.2s ease;
}

.category-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
}

.category-group-header:hover {
    background: rgba(67, 97, 238, 0.08);
}

.category-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #1e293b);
}

.category-name i {
    width: 18px;
    color: var(--primary-color, #4361ee);
    font-size: 13px;
}

.category-toggle {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-secondary, #6c757d);
    cursor: pointer;
    transition: transform 0.25s ease;
    border-radius: 50%;
}

.category-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
}

.category-group.expanded .category-toggle {
    transform: rotate(180deg);
}

/* 分类项列表 */
.category-items {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
}

.category-group.expanded .category-items {
    max-height: 400px;
    overflow-y: auto;
}

.category-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px 8px 38px;
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-primary, #334155);
    transition: all 0.2s ease;
    text-align: left;
    border-radius: 8px;
    margin: 2px 0;
}

.category-item:hover {
    background: rgba(67, 97, 238, 0.12);
    color: var(--primary-color, #4361ee);
    padding-left: 42px;
}

.category-item i {
    width: 16px;
    font-size: 12px;
    color: currentColor;
}

/* 底部按钮栏 - 上下间距相等 */
.sidebar-footer {
    padding: 10px 14px;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: space-around;
    gap: 10px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    flex-shrink: 0;
}

.footer-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 0;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 18px;
}

.footer-btn i {
    font-size: 18px;
}

.footer-btn:hover {
    background: rgba(67, 97, 238, 0.1);
    transform: translateY(-2px);
}

/* 各按钮独立颜色 */
.footer-btn[data-action="notebook"] { color: #8b5cf6; }
.footer-btn[data-action="notebook"]:hover { background: rgba(139, 92, 246, 0.15); color: #7c3aed; }

.footer-btn[data-action="gift"] { color: #f97316; }
.footer-btn[data-action="gift"]:hover { background: rgba(249, 115, 22, 0.15); color: #ea580c; }

.footer-btn[data-action="about"] { color: #ec4899; }
.footer-btn[data-action="about"]:hover { background: rgba(236, 72, 153, 0.15); color: #db2777; }

.footer-btn[data-action="qq"] { color: #3b82f6; }
.footer-btn[data-action="qq"]:hover { background: rgba(59, 130, 246, 0.15); color: #2563eb; }

/* 响应式：左右边距与主页一致 */
@media (min-width: 576px) {
    .sidebar {
        left: var(--container-padding-sm, 20px);
        transform: translateX(calc(-100% - var(--container-padding-sm, 20px)));
    }
}
@media (min-width: 768px) {
    .sidebar {
        left: var(--container-padding-md, 24px);
        transform: translateX(calc(-100% - var(--container-padding-md, 24px)));
    }
}
@media (min-width: 992px) {
    .sidebar {
        left: var(--container-padding-lg, 28px);
        transform: translateX(calc(-100% - var(--container-padding-lg, 28px)));
    }
}
@media (min-width: 1200px) {
    .sidebar {
        left: var(--container-padding-xl, 32px);
        transform: translateX(calc(-100% - var(--container-padding-xl, 32px)));
    }
}

/* 移动端宽度调整 */
@media (max-width: 768px) {
    .sidebar {
        width: var(--sidebar-mobile-width);
        max-width: var(--sidebar-max-mobile);
        left: var(--container-padding-xs, 16px);
        transform: translateX(calc(-100% - var(--container-padding-xs, 16px)));
    }
    .sidebar-wallpaper-avatar {
        width: 38px;
        height: 38px;
    }
    .sidebar-wallpaper-nickname {
        font-size: 13px;
    }
    .category-name {
        font-size: 12px;
    }
    .category-item {
        padding: 7px 10px 7px 34px;
        font-size: 11px;
    }
    .footer-btn i {
        font-size: 16px;
    }
    .footer-btn {
        padding: 5px 0;
    }
}

/* 小屏手机 */
@media (max-width: 480px) {
    .sidebar-wallpaper-user-info {
        left: 10px;
        bottom: 10px;
        gap: 6px;
    }
    .sidebar-wallpaper-avatar {
        width: 32px;
        height: 32px;
    }
    .daily-quote-card {
        margin: 6px 10px;
        padding: 6px 8px;
    }
    .daily-quote-card p {
        font-size: 10px;
    }
    .category-group-header {
        padding: 8px 10px;
    }
    .category-name {
        gap: 6px;
    }
    .category-item {
        padding: 6px 8px 6px 30px;
    }
}

/* 横屏小高度适配 */
@media (max-height: 500px) and (orientation: landscape) {
    .sidebar {
        top: 60px !important;
        bottom: 10px;
    }
    .sidebar-wallpaper {
        aspect-ratio: 21/9;
    }
    .daily-quote-card {
        display: none;
    }
}

/* 减少动画 */
@media (prefers-reduced-motion: reduce) {
    .sidebar,
    .category-group-header,
    .category-item,
    .footer-btn,
    .category-toggle,
    .category-items {
        transition: none;
        animation: none;
    }
}