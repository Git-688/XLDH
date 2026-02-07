// 页脚模块
class FooterModule {
    constructor() {
        this.startTime = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        console.log('页脚模块初始化...');
        
        try {
            await this.updateVisitCount();
            this.initialized = true;
            console.log('页脚模块初始化完成 - 只处理访问次数');
        } catch (error) {
            console.error('页脚模块初始化失败:', error);
            this.setupDefaultStats();
        }
    }

    // 只更新访问次数，不处理运行时间
    async updateVisitCount() {
        try {
            let visitCount = 0;
            
            // 兼容性处理
            if (typeof Storage !== 'undefined' && Storage.get) {
                visitCount = Storage.get('visitCount') || 0;
            } else {
                const storedVisit = localStorage.getItem('starlink_visitCount');
                visitCount = storedVisit ? parseInt(storedVisit) : 0;
            }
            
            visitCount++;
            
            // 保存更新后的数据
            if (typeof Storage !== 'undefined' && Storage.set) {
                Storage.set('visitCount', visitCount);
            } else {
                localStorage.setItem('starlink_visitCount', visitCount.toString());
            }
            
            const visitCountElement = document.getElementById('visitCount');
            if (visitCountElement) {
                visitCountElement.textContent = visitCount;
            }
            
        } catch (error) {
            console.error('更新访问次数失败:', error);
            this.setupDefaultStats();
        }
    }

    setupDefaultStats() {
        console.log('使用默认统计数据');
        const visitCountElement = document.getElementById('visitCount');
        if (visitCountElement) {
            visitCountElement.textContent = '1';
        }
    }

    // 获取访问次数
    getVisitCount() {
        try {
            if (typeof Storage !== 'undefined' && Storage.get) {
                return Storage.get('visitCount') || 0;
            } else {
                const stored = localStorage.getItem('starlink_visitCount');
                return stored ? parseInt(stored) : 0;
            }
        } catch {
            return 0;
        }
    }

    // 重置统计
    resetStats() {
        if (confirm('确定要重置统计信息吗？')) {
            const newStartTime = Date.now();
            
            try {
                if (typeof Storage !== 'undefined' && Storage.set) {
                    Storage.set('visitCount', 0);
                    Storage.set('startTime', newStartTime);
                } else {
                    localStorage.setItem('starlink_visitCount', '0');
                    localStorage.setItem('starlink_startTime', newStartTime.toString());
                }
                
                this.startTime = newStartTime;
                this.updateVisitCount();
                
                if (window.app && window.app.showToast) {
                    window.app.showToast('统计信息已重置', 'success');
                }
            } catch (error) {
                console.error('重置统计信息失败:', error);
            }
        }
    }
}

// 初始化模块
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.footerModule) {
            window.footerModule = new FooterModule();
        }
    });
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.FooterModule = FooterModule;
}