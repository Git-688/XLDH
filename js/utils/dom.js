// DOM操作工具函数 - 简化版本
class DOMUtils {
    // 创建元素
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // 设置属性
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.slice(2).toLowerCase();
                element.addEventListener(eventName, value);
            } else {
                element.setAttribute(key, value);
            }
        }
        
        // 添加子元素
        if (Array.isArray(children)) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        } else if (typeof children === 'string') {
            element.textContent = children;
        }
        
        return element;
    }

    // 查找元素
    static $(selector, context = document) {
        return context.querySelector(selector);
    }

    static $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    // 显示/隐藏元素
    static show(element) {
        if (element) {
            element.style.display = '';
        }
    }

    static hide(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    static toggle(element, force) {
        if (element) {
            if (force !== undefined) {
                element.style.display = force ? '' : 'none';
            } else {
                element.style.display = element.style.display === 'none' ? '' : 'none';
            }
        }
    }

    // 添加/移除类名
    static addClass(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    }

    static removeClass(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    }

    static toggleClass(element, className, force) {
        if (element && className) {
            element.classList.toggle(className, force);
        }
    }

    static hasClass(element, className) {
        return element && element.classList.contains(className);
    }

    // 设置样式
    static setStyle(element, styles) {
        if (element && styles) {
            Object.assign(element.style, styles);
        }
    }

    // 获取计算样式
    static getStyle(element, property) {
        if (!element) return '';
        return window.getComputedStyle(element)[property];
    }

    // 事件委托
    static delegate(selector, event, handler, context = document) {
        context.addEventListener(event, function(e) {
            if (e.target.matches(selector)) {
                handler.call(e.target, e);
            }
        });
    }

    // 插入HTML
    static insertHTML(element, position, html) {
        const positions = {
            'beforebegin': 'beforebegin',
            'afterbegin': 'afterbegin',
            'beforeend': 'beforeend',
            'afterend': 'afterend'
        };

        if (element && positions[position]) {
            element.insertAdjacentHTML(positions[position], html);
        }
    }

    // 移除所有子元素
    static empty(element) {
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    }

    // 检测元素是否在视口中
    static isInViewport(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // 滚动到元素
    static scrollToElement(element, options = {}) {
        if (!element) return;
        
        const defaultOptions = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }

    // 防抖函数
    static debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // 节流函数
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 观察元素变化
    static observe(element, callback, options = {}) {
        const defaultOptions = {
            childList: true,
            subtree: true,
            attributes: true
        };
        
        const observer = new MutationObserver(callback);
        observer.observe(element, { ...defaultOptions, ...options });
        return observer;
    }

    // 复制到剪贴板
    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text);
    }

    // 加载脚本
    static loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            
            script.onload = resolve;
            script.onerror = reject;
            
            document.head.appendChild(script);
        });
    }

    // 加载样式
    static loadStyle(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            
            link.onload = resolve;
            link.onerror = reject;
            
            document.head.appendChild(link);
        });
    }
}

// 全局快捷方式
window.$ = DOMUtils.$;
window.$$ = DOMUtils.$$;