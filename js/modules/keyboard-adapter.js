/* keyboard-adapter.js - 移动端键盘遮挡修复 */
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