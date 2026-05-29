/* 公告模态框 - 亚克力效果 + 遮罩层从导航栏下方开始 */
.announcement-modal-simple {
    position: fixed;
    top: 60px;              /* 导航栏高度，从导航栏下方开始 */
    left: 0;
    width: 100%;
    height: calc(100% - 60px); /* 减去导航栏高度 */
    background: rgba(0, 0, 0, 0.3);    /* 半透明遮罩 */
    backdrop-filter: blur(2px);
    z-index: 10000;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--container-padding-xs, 16px)) calc(var(--container-padding-xs, 16px));
    box-sizing: border-box;
}

.announcement-modal-simple.active {
    opacity: 1;
    visibility: visible;
}

.announcement-modal-container {
    width: 100%;
    max-width: 480px;
    background: var(--acrylic-bg, rgba(255,255,255,0.65));
    backdrop-filter: var(--acrylic-blur, blur(24px) saturate(125%));
    -webkit-backdrop-filter: var(--acrylic-blur, blur(24px) saturate(125%));
    border: var(--acrylic-border, 1px solid rgba(255,255,255,0.4));
    border-radius: 8px;
    box-shadow: var(--acrylic-shadow, 0 8px 32px rgba(0,0,0,0.08));
    overflow: hidden;
    transform: scale(0.85);
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.announcement-modal-simple.active .announcement-modal-container {
    transform: scale(1);
    opacity: 1;
}

@media (prefers-color-scheme: dark) {
    .announcement-modal-container {
        background: var(--acrylic-bg, rgba(30,30,30,0.7));
        border-color: var(--acrylic-border, rgba(255,255,255,0.15));
    }
}

.announcement-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.announcement-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--text-primary, #2b2d42);
}

.announcement-close {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    border: none;
    color: var(--text-secondary, #6c757d);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
}

.announcement-close:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-primary, #2b2d42);
}

.announcement-body {
    padding: 16px 20px 12px;
    display: flex;
    flex-direction: column;
    max-height: 350px;
}

/* 重要提醒区域 */
.focus-section {
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    flex-shrink: 0;
}

.section-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary, #2b2d42);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.focus-content {
    color: var(--text-primary, #2b2d42);
    font-size: 0.85rem;
    line-height: 1.5;
    padding-left: 20px;
}

.updates-section {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    margin-bottom: 8px;
}

.updates-section::-webkit-scrollbar {
    display: none;
}

.updates-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.updates-list li {
    position: relative;
    padding: 6px 0 6px 22px;
    color: var(--text-primary, #2b2d42);
    font-size: 0.8rem;
    line-height: 1.5;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.updates-list li:last-child {
    border-bottom: none;
}

.updates-list li::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 12px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--primary-color, #4361ee);
}

.announcement-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px 16px;
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.announcement-date {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--text-secondary, #6c757d);
    font-size: 0.78rem;
}

.announcement-ack-btn {
    background: var(--primary-color, #4361ee);
    border: none;
    color: white;
    font-size: 0.82rem;
    font-weight: 500;
    padding: 5px 18px;
    border-radius: 40px;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 8px rgba(67, 97, 238, 0.2);
}

.announcement-ack-btn:hover {
    background: #3651d4;
    box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
}

@media (max-width: 600px) {
    .announcement-header {
        padding: 14px 18px 6px;
    }
    .announcement-title {
        font-size: 1rem;
    }
    .announcement-body {
        padding: 14px 18px 10px;
    }
    .focus-section {
        padding: 10px;
    }
    .focus-content {
        font-size: 0.8rem;
    }
    .updates-list li {
        font-size: 0.75rem;
        padding: 5px 0 5px 20px;
    }
    .announcement-footer {
        padding: 10px 18px 14px;
    }
    .announcement-date {
        font-size: 0.73rem;
    }
    .announcement-ack-btn {
        padding: 4px 14px;
        font-size: 0.78rem;
    }
}

@media (max-width: 400px) {
    .announcement-modal-container {
        border-radius: 6px;
    }
    .announcement-header {
        padding: 12px 14px 4px;
    }
    .announcement-body {
        padding: 12px 14px 8px;
    }
    .focus-content {
        font-size: 0.78rem;
    }
    .updates-list li {
        font-size: 0.73rem;
    }
}