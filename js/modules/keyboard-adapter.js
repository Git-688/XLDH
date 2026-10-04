/* keyboard-adapter.js - 移动端键盘遮挡修复 + 浏览器底部工具栏高度计算 */
(function() {
    'use strict';

    class KeyboardAdapter {
        constructor() {
            this.initialized = false;
            this.activeInput = null;
            this.scrollTimeout = null;
            this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            this.init();
        }

        init() {
            if (!this.isMobile || this.initialized) return;
            this.initialized = true;

            // 监听所有输入框的 focus 事件（事件委托）
            document.addEventListener('focusin', (e) => {
                const target = e.target;
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                    this.activeInput = target;
                    this.handleFocus(target);
                }
            });

            document.addEventListener('focusout', () => {
                this.activeInput = null;
                if (this.scrollTimeout) {
                    clearTimeout(this.scrollTimeout);
                    this.scrollTimeout = null;
                }
            });

            // 使用 visualViewport API 监听视口变化
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', () => {
                    if (this.activeInput) {
                        this.scrollToInput(this.activeInput);
                    }
                });
                window.visualViewport.addEventListener('scroll', () => {
                    if (this.activeInput) {
                        this.scrollToInput(this.activeInput);
                    }
                });
            }

            // 监听窗口大小变化（备用）
            window.addEventListener('resize', () => {
                if (this.activeInput && window.innerHeight < 600) {
                    this.scrollToInput(this.activeInput);
                }
            });
        }

        handleFocus(input) {
            // 延迟执行，等待键盘弹出
            setTimeout(() => {
                this.scrollToInput(input);
            }, 300);
        }

        scrollToInput(input) {
            if (!input) return;
            if (this.scrollTimeout) {
                cancelAnimationFrame(this.scrollTimeout);
                this.scrollTimeout = null;
            }

            this.scrollTimeout = requestAnimationFrame(() => {
                try {
                    const rect = input.getBoundingClientRect();
                    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                    const keyboardHeight = viewportHeight - (window.visualViewport ? window.visualViewport.height : window.innerHeight);
                    
                    // 如果键盘已弹出，滚动到输入框可见位置
                    if (keyboardHeight > 100) {
                        const targetY = rect.top + window.scrollY - 80; // 留出 80px 顶部间距
                        window.scrollTo({
                            top: targetY,
                            behavior: 'smooth'
                        });
                    }
                } catch (e) {
                    // 降级：简单滚动到元素
                    try {
                        input.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    } catch (_) {}
                }
                this.scrollTimeout = null;
            });
        }

        // 手动触发滚动（供外部调用）
        scrollToActiveInput() {
            if (this.activeInput) {
                this.scrollToInput(this.activeInput);
            }
        }
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.Starlink) window.Starlink = {};
            if (!window.Starlink.keyboardAdapter) {
                window.Starlink.keyboardAdapter = new KeyboardAdapter();
            }
        });
    } else {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.keyboardAdapter) {
            window.Starlink.keyboardAdapter = new KeyboardAdapter();
        }
    }

})();

/* ============================================================
   ⭐ 浏览器底部工具栏高度监听（星聚笔记 / 访问排行榜 共用）
   ------------------------------------------------------------
   原理：
     layoutHeight   = 布局视口高度（包含被工具栏/键盘遮挡的部分）
     visualHeight   = 视觉视口高度（用户实际可见区域）
     vvOffsetTop    = 视觉视口相对布局视口的顶部偏移
     底部遮挡高度   = layoutHeight - visualHeight - vvOffsetTop

   逻辑：
     - 任一目标模态框（#notebookModal / #rankModal）打开即计算；
     - 全部关闭后归零；
     - 无 visualViewport API 时自动退化为纯 CSS（100dvh + safe-area），
       不影响正常显示。
   ============================================================ */
(function() {
    'use strict';

    if (!window.visualViewport) return;

    const vv = window.visualViewport;
    const root = document.documentElement;
    let rafId = null;
    let lastInset = -1;

    // 需要联动计算底部遮挡高度的模态框 ID 列表
    const TARGET_MODAL_IDS = ['notebookModal', 'rankModal'];
    const targetModals = TARGET_MODAL_IDS
        .map(id => document.getElementById(id))
        .filter(Boolean);

    if (targetModals.length === 0) return;

    const computeBottomInset = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = null;

            const layoutHeight = Math.max(
                window.innerHeight || 0,
                root.clientHeight || 0
            );
            const visualHeight = vv.height || 0;
            const vvOffsetTop = vv.offsetTop || 0;

            // 底部被工具栏 / 键盘遮挡的高度
            let bottomInset = layoutHeight - visualHeight - vvOffsetTop;
            if (!isFinite(bottomInset) || bottomInset < 0) bottomInset = 0;

            // 抖动过滤：变化小于 1px 不触发写入
            if (Math.abs(bottomInset - lastInset) < 1) return;
            lastInset = bottomInset;

            root.style.setProperty('--browser-bottom-inset', bottomInset + 'px');
        });
    };

    const resetBottomInset = () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        lastInset = -1;
        root.style.setProperty('--browser-bottom-inset', '0px');
    };

    // 是否有任一目标模态框处于打开状态
    const isAnyTargetOpen = () => targetModals.some(m => m.classList.contains('active'));

    const syncInset = () => {
        if (isAnyTargetOpen()) {
            computeBottomInset();
        } else {
            resetBottomInset();
        }
    };

    // 为每个目标模态框挂上 class 变化的观察器
    targetModals.forEach(modal => {
        const observer = new MutationObserver(syncInset);
        observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });

    // 若初始化时已有目标模态框打开（如快速点击）
    if (isAnyTargetOpen()) {
        computeBottomInset();
    }

    // 事件监听
    vv.addEventListener('resize', computeBottomInset);
    vv.addEventListener('scroll', computeBottomInset, { passive: true });
    window.addEventListener('orientationchange', () => {
        // 旋转屏幕后工具栏高度通常会短暂变化，延后计算更准确
        setTimeout(syncInset, 300);
    });
})();