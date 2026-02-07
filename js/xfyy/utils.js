/**
 * 工具函数模块 - 完整版
 */

class Utils {
    /**
     * 格式化时间（秒 -> 分:秒）
     */
    static formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 格式化时间为详细格式（时:分:秒）
     */
    static formatTimeDetailed(seconds) {
        if (isNaN(seconds)) return '00:00:00';
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * 防抖函数
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * 节流函数
     */
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

    /**
     * 下载文件
     */
    static downloadFile(url, filename) {
        return new Promise((resolve, reject) => {
            try {
                // 创建隐藏的下载链接
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                
                // 添加到DOM并触发点击
                document.body.appendChild(link);
                link.click();
                
                // 清理
                setTimeout(() => {
                    document.body.removeChild(link);
                    resolve(true);
                }, 100);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 生成唯一ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 安全获取嵌套对象属性
     */
    static getSafe(obj, path, defaultValue = null) {
        if (!obj || typeof obj !== 'object') return defaultValue;
        
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result === null || result === undefined) return defaultValue;
            result = result[key];
        }
        
        return result === undefined ? defaultValue : result;
    }

    /**
     * 深拷贝对象
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * 验证URL格式
     */
    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * 文件大小格式化
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 获取文件扩展名
     */
    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    /**
     * 创建Blob URL
     */
    static createBlobUrl(data, type = 'audio/mpeg') {
        const blob = new Blob([data], { type });
        return URL.createObjectURL(blob);
    }

    /**
     * 释放Blob URL
     */
    static revokeBlobUrl(url) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }

    /**
     * 等待指定时间
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 生成随机颜色
     */
    static randomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }

    /**
     * 生成HSL颜色
     */
    static hslColor(h, s, l) {
        return `hsl(${h}, ${s}%, ${l}%)`;
    }

    /**
     * 格式化数字（添加千分位分隔符）
     */
    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 检查是否为移动设备
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * 复制文本到剪贴板 - 优化版
     */
    static async copyToClipboard(text) {
        try {
            // 优先使用现代API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            
            // 备用方案（已弃用但仍有必要）
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            
            // 安全优化：添加属性防止恶意代码执行
            textArea.setAttribute('readonly', '');
            textArea.setAttribute('disabled', '');
            
            document.body.appendChild(textArea);
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            return successful;
        } catch (err) {
            console.warn('复制到剪贴板失败:', err);
            return false;
        }
    }

    /**
     * 限制数值范围
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * 线性插值
     */
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    /**
     * 缓动函数 - easeOutCubic
     */
    static easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * 缓动函数 - easeInOutQuad
     */
    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    /**
     * 生成UUID
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 计算两个颜色之间的渐变
     */
    static interpolateColor(color1, color2, factor) {
        if (typeof color1 === 'string') color1 = this.hexToRgb(color1);
        if (typeof color2 === 'string') color2 = this.hexToRgb(color2);
        
        const result = {
            r: Math.round(this.lerp(color1.r, color2.r, factor)),
            g: Math.round(this.lerp(color1.g, color2.g, factor)),
            b: Math.round(this.lerp(color1.b, color2.b, factor))
        };
        
        return this.rgbToHex(result);
    }

    /**
     * 十六进制颜色转RGB
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    /**
     * RGB转十六进制颜色
     */
    static rgbToHex(rgb) {
        return "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
    }

    /**
     * 计算颜色亮度（0-255）
     */
    static getLuminance(r, g, b) {
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    /**
     * 判断颜色是否为亮色
     */
    static isLightColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        const luminance = this.getLuminance(rgb.r, rgb.g, rgb.b);
        return luminance > 128;
    }

    /**
     * 获取对比色（黑色或白色）
     */
    static getContrastColor(hexColor) {
        return this.isLightColor(hexColor) ? '#000000' : '#ffffff';
    }

    /**
     * 图片预加载
     */
    static preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    /**
     * 音频预加载
     */
    static preloadAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'metadata';
            audio.onloadedmetadata = () => resolve(audio);
            audio.onerror = reject;
            audio.src = url;
        });
    }

    /**
     * 获取设备像素比
     */
    static getDevicePixelRatio() {
        return window.devicePixelRatio || 1;
    }

    /**
     * 检测WebP支持
     */
    static async checkWebPSupport() {
        return new Promise(resolve => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                resolve(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    /**
     * 检测AVIF支持
     */
    static async checkAVIFSupport() {
        return new Promise(resolve => {
            const avif = new Image();
            avif.onload = avif.onerror = () => {
                resolve(avif.height === 2);
            };
            avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
        });
    }

    /**
     * 性能测量
     */
    static measurePerformance(fn, ...args) {
        const start = performance.now();
        const result = fn(...args);
        const end = performance.now();
        
        return {
            result,
            duration: end - start
        };
    }

    /**
     * 创建性能标记
     */
    static createPerformanceMarker(name) {
        if (performance.mark) {
            performance.mark(`${name}-start`);
        }
        
        return {
            end: () => {
                if (performance.mark) {
                    performance.mark(`${name}-end`);
                    performance.measure(name, `${name}-start`, `${name}-end`);
                }
            }
        };
    }

    /**
     * 批量执行异步任务
     */
    static async batchAsyncTasks(tasks, batchSize = 5) {
        const results = [];
        
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch.map(task => task()));
            results.push(...batchResults);
            
            // 添加延迟避免请求过于频繁
            if (i + batchSize < tasks.length) {
                await this.sleep(100);
            }
        }
        
        return results;
    }

    /**
     * 数据序列化
     */
    static serialize(data) {
        try {
            return JSON.stringify(data);
        } catch (error) {
            console.error('数据序列化失败:', error);
            return null;
        }
    }

    /**
     * 数据反序列化
     */
    static deserialize(data) {
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('数据反序列化失败:', error);
            return null;
        }
    }

    /**
     * 生成数据指纹（用于缓存键）
     */
    static generateDataFingerprint(data) {
        const str = this.serialize(data);
        let hash = 0;
        
        if (!str) return '0';
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        return Math.abs(hash).toString(36);
    }
}

// 导出到全局作用域
window.Utils = Utils;