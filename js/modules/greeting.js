// 问候区模块 - 优化效果和显示
class GreetingModule {
    constructor() {
        this.initialized = false;
        this.eventBound = false; // 添加事件绑定标记
        this.holidayRefreshTimer = null;
        this.holidayCheckTimer = null;
        this.currentHoliday = null;
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        // 移除已废弃的loadDailyTags调用
        this.loadWoodenFishData();
        this.bindEvents();
        this.startTimers();
        await this.setupHolidayCountdown();
        
        // 添加窗口大小变化监听
        this.handleResize();
        window.addEventListener('resize', this.handleResize.bind(this));
        
        this.initialized = true;
    }

    handleResize() {
        const holidayNameEl = document.getElementById('holidayName');
        
        // 移除可能存在的标题提示，让节日名称自适应显示
        if (holidayNameEl) {
            holidayNameEl.removeAttribute('title');
        }
    }

    // 加载节日倒计时数据
    async loadHolidayData() {
        try {
            const response = await fetch('https://api.pearktrue.cn/api/countdownday/');
            const data = await response.json();
            
            if (data.code === 200 && data.data && data.data.length > 0) {
                return data.data;
            }
            return this.getDefaultHolidays();
        } catch {
            return this.getDefaultHolidays();
        }
    }

    // 获取默认节日数据
    getDefaultHolidays() {
        const today = new Date();
        const year = today.getFullYear();
        
        return [
            `${year}年春节 计算中...`,
            `${year}年端午节 计算中...`,
            `${year}年中秋节 计算中...`,
            `${year}年国庆节 计算中...`
        ];
    }

    // 处理节日数据，找到当前和下一个节日
    processHolidayData(holidayData) {
        if (!holidayData || holidayData.length === 0) {
            return this.getDefaultHoliday();
        }

        const now = new Date();
        let current = null;
        let next = null;
        let foundCurrent = false;

        // 遍历节日数据
        for (const holidayStr of holidayData) {
            const holiday = this.parseSingleHoliday(holidayStr);
            
            if (!holiday) continue;

            // 检查是否是当前节日（进行中）
            if (holiday.status === 'active') {
                current = holiday;
                foundCurrent = true;
                continue;
            }

            // 如果已经找到当前节日，下一个节日就是第一个未来节日
            if (foundCurrent) {
                next = holiday;
                break;
            }

            // 如果还没找到当前节日，第一个未来节日就是下一个
            if (!next && holiday.days > 0) {
                next = holiday;
            }
        }

        // 如果没有当前节日，也没有下一个节日，使用第一个节日
        if (!current && !next && holidayData.length > 0) {
            const firstHoliday = this.parseSingleHoliday(holidayData[0]);
            if (firstHoliday) {
                next = firstHoliday;
            }
        }

        return { current, next };
    }

    // 解析单个节日字符串
    parseSingleHoliday(holidayStr) {
        if (!holidayStr) return null;

        // 支持多种格式：
        // 1. "2025年春节 进行中"
        // 2. "2025年春节 1天"
        // 3. "2025年春节 剩余1天"
        // 4. "春节 进行中"
        const match = holidayStr.match(/^(?:(\d{4})年)?(.+?)\s+(?:剩余)?(\d+天|进行中|\d+小时|\d+分钟)$/);
        
        if (!match) {
            // 尝试其他格式
            const simpleMatch = holidayStr.match(/^(.+?)\s+(.+)$/);
            if (simpleMatch) {
                const [, name, countdown] = simpleMatch;
                return this.createHolidayObject(name, countdown);
            }
            return null;
        }

        const [, year, name, countdown] = match;
        return this.createHolidayObject(name, countdown);
    }

    // 创建节日对象
    createHolidayObject(name, countdown) {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        
        return {
            name: name,
            countdown: countdown,
            displayText: this.formatCountdown(countdown),
            status: countdown === '进行中' ? 'active' : 'upcoming',
            days: this.extractDays(countdown),
            hours: this.extractHours(countdown),
            icon: this.getHolidayIcon(name),
            expiresAt: countdown === '进行中' ? tomorrow.getTime() : null,
            raw: `${name} ${countdown}`
        };
    }

    // 格式化倒计时显示
    formatCountdown(countdown) {
        if (countdown === '进行中') {
            return '进行中';
        }
        
        // 如果是数字+天，简化显示
        const daysMatch = countdown.match(/(\d+)天/);
        if (daysMatch) {
            const days = parseInt(daysMatch[1]);
            if (days <= 3) {
                return `${days}天`;
            }
            return `${days}天`;
        }
        
        // 处理小时和分钟
        const hoursMatch = countdown.match(/(\d+)小时/);
        if (hoursMatch) {
            const hours = parseInt(hoursMatch[1]);
            return `${hours}小时`;
        }
        
        return countdown;
    }

    // 提取天数
    extractDays(countdown) {
        if (countdown === '进行中') return 0;
        
        const daysMatch = countdown.match(/(\d+)天/);
        if (daysMatch) {
            return parseInt(daysMatch[1]);
        }
        
        return null;
    }

    // 提取小时数
    extractHours(countdown) {
        const hoursMatch = countdown.match(/(\d+)小时/);
        if (hoursMatch) {
            return parseInt(hoursMatch[1]);
        }
        
        return null;
    }

    // 获取默认节日对象
    getDefaultHoliday() {
        return {
            current: null,
            next: {
                name: '下一个节日',
                countdown: '计算中...',
                displayText: '计算中...',
                status: 'unknown',
                days: null,
                icon: '🎉',
                raw: '下一个节日 计算中...'
            }
        };
    }

    // 获取节日图标
    getHolidayIcon(name) {
        if (name.includes('春节')) return '🧧';
        else if (name.includes('圣诞')) return '🎄';
        else if (name.includes('中秋')) return '🌕';
        else if (name.includes('端午')) return '🎏';
        else if (name.includes('国庆')) return '🇨🇳';
        else if (name.includes('元宵')) return '🏮';
        else if (name.includes('清明')) return '🌸';
        else if (name.includes('元旦')) return '🎆';
        else if (name.includes('劳动')) return '👷';
        else if (name.includes('儿童')) return '🎈';
        else if (name.includes('情人')) return '❤️';
        else if (name.includes('母亲') || name.includes('父亲')) return '👨‍👩‍👧‍👦';
        else if (name.includes('教师')) return '👨‍🏫';
        else if (name.includes('妇女')) return '👩';
        else if (name.includes('青年')) return '👦';
        else if (name.includes('重阳')) return '🌼';
        else return '🎉';
    }

    // 设置节日倒计时 - 修改为实时刷新
    async setupHolidayCountdown() {
        try {
            // 检查是否有节日正在进行且已过期
            await this.checkHolidayExpiration();
            
            // 获取节日数据
            const holidayData = await this.loadHolidayData();
            const holidays = this.processHolidayData(holidayData);
            
            // 决定显示哪个节日
            let displayHoliday = null;
            
            if (holidays.current) {
                // 有当前进行中的节日
                this.currentHoliday = holidays.current;
                displayHoliday = holidays.current;
                
                // 设置节日结束时的刷新
                this.scheduleHolidayRefresh(holidays.current);
            } else if (holidays.next) {
                // 没有当前节日，显示下一个节日
                displayHoliday = holidays.next;
                this.currentHoliday = null;
            }
            
            // 更新显示
            this.updateHolidayDisplay(displayHoliday);
            
            // 缓存数据
            this.cacheHolidayData(holidays);
            
        } catch (error) {
            console.error('设置节日倒计时失败:', error);
            
            // 尝试使用缓存数据
            const cachedData = this.getCachedHolidayData();
            if (cachedData) {
                const displayHoliday = cachedData.current || cachedData.next;
                this.updateHolidayDisplay(displayHoliday);
            }
        }
    }

    // 检查节日是否过期
    async checkHolidayExpiration() {
        const cachedData = this.getCachedHolidayData();
        
        if (!cachedData || !cachedData.current) return;
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 如果当前节日已经过期（过了当天），清除缓存
        if (cachedData.current.status === 'active') {
            const lastUpdate = new Date(cachedData.timestamp);
            const lastUpdateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
            
            if (today > lastUpdateDate) {
                console.log('检测到节日已过，清除缓存');
                localStorage.removeItem('holidayDataCache');
                this.currentHoliday = null;
            }
        }
    }

    // 缓存节日数据 - 修改为实时刷新策略
    cacheHolidayData(holidays) {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            
            const cache = {
                current: holidays.current,
                next: holidays.next,
                timestamp: Date.now(),
                // 如果有当前节日，在节日结束后过期
                expiresAt: holidays.current ? 
                    tomorrow.getTime() : // 当前节日：明天0点过期
                    Date.now() + (24 * 60 * 60 * 1000) // 其他：24小时后过期
            };
            
            localStorage.setItem('holidayDataCache', JSON.stringify(cache));
            
        } catch (error) {
            console.error('缓存节日数据失败:', error);
        }
    }

    // 获取缓存的节日数据
    getCachedHolidayData() {
        try {
            const cacheStr = localStorage.getItem('holidayDataCache');
            if (!cacheStr) return null;
            
            const cache = JSON.parse(cacheStr);
            
            // 检查是否过期
            if (Date.now() > cache.expiresAt) {
                localStorage.removeItem('holidayDataCache');
                return null;
            }
            
            return cache;
        } catch (error) {
            return null;
        }
    }

    // 安排节日刷新 - 节日结束后立即刷新
    scheduleHolidayRefresh(holiday) {
        if (!holiday || holiday.status !== 'active') return;
        
        // 清除现有的定时器
        if (this.holidayRefreshTimer) {
            clearTimeout(this.holidayRefreshTimer);
        }
        
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        
        console.log(`安排节日刷新在 ${Math.round(timeUntilMidnight / 1000 / 60)} 分钟后`);
        
        // 在午夜刷新
        this.holidayRefreshTimer = setTimeout(async () => {
            console.log('节日结束，自动刷新数据');
            
            // 清除缓存
            localStorage.removeItem('holidayDataCache');
            
            // 重新获取数据
            await this.setupHolidayCountdown();
            
            // 显示提示
            if (window.app && window.app.showToast) {
                window.app.showToast('节日数据已更新', 'info');
            }
        }, timeUntilMidnight + 1000); // 多加1秒确保过了午夜
    }

    // 更新节日显示 - 自适应显示节日名称
    updateHolidayDisplay(holidayInfo) {
        const holidayNameEl = document.getElementById('holidayName');
        const holidayCountdownEl = document.getElementById('holidayCountdown');
        
        if (!holidayNameEl || !holidayCountdownEl) return;
        
        if (!holidayInfo) {
            holidayNameEl.innerHTML = `<span class="holiday-icon">🎉</span> 下一个节日`;
            holidayCountdownEl.textContent = "计算中...";
            holidayCountdownEl.classList.add('status-unknown');
            holidayNameEl.removeAttribute('title');
            holidayNameEl.classList.remove('active-holiday');
            return;
        }
        
        // 完全显示节日名称，自适应显示
        holidayNameEl.innerHTML = `<span class="holiday-icon">${holidayInfo.icon}</span> ${holidayInfo.name}`;
        holidayNameEl.removeAttribute('title'); // 移除标题，让名称自适应显示
        
        // 显示倒计时
        holidayCountdownEl.textContent = holidayInfo.displayText;
        
        // 根据状态设置样式（使用CSS类）
        this.setHolidayStyle(holidayCountdownEl, holidayInfo);
        
        // 如果是进行中的节日，添加特殊标记
        if (holidayInfo.status === 'active') {
            holidayCountdownEl.classList.add('active-countdown');
        } else {
            holidayCountdownEl.classList.remove('active-countdown');
        }
    }

    // 设置节日样式 - 修改为使用类名控制样式
    setHolidayStyle(element, holidayInfo) {
        // 清除所有状态类
        element.classList.remove('active-countdown', 'status-3days', 'status-7days', 'status-more', 'status-unknown');
        
        // 根据状态添加类名
        if (holidayInfo.status === 'active') {
            element.classList.add('active-countdown');
        } else if (holidayInfo.days !== null && holidayInfo.days <= 3) {
            element.classList.add('status-3days');
        } else if (holidayInfo.days !== null && holidayInfo.days <= 7) {
            element.classList.add('status-7days');
        } else if (holidayInfo.days !== null && holidayInfo.days > 7) {
            element.classList.add('status-more');
        } else {
            element.classList.add('status-unknown');
        }
        
        // 移除内联样式，让CSS类控制样式
        element.style.background = '';
        element.style.color = '';
        element.style.border = '';
    }

    loadWoodenFishData() {
        const fishData = Storage.get('woodenFish') || {
            merit: 0,
            luck: 0,
            wealth: 0,
            health: 0,
            lastUpdate: new Date().toDateString()
        };

        const today = new Date().toDateString();
        if (fishData.lastUpdate !== today) {
            fishData.lastUpdate = today;
            Storage.set('woodenFish', fishData);
        }

        this.updateFishCounts(fishData);
    }

    updateFishCounts(fishData) {
        const counts = {
            merit: document.getElementById('meritCount'),
            luck: document.getElementById('luckCount'),
            wealth: document.getElementById('wealthCount'),
            health: document.getElementById('healthCount')
        };

        for (const [type, element] of Object.entries(counts)) {
            if (element) {
                element.textContent = fishData[type] || 0;
            }
        }
    }

    bindEvents() {
        // 防止重复绑定事件
        if (this.eventBound) return;
        
        // 移除可能存在的旧事件监听器（使用更精确的选择器）
        document.querySelectorAll('.fish-btn').forEach(btn => {
            // 克隆按钮并替换，彻底移除所有事件监听器
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        
        // 添加新的事件监听器
        document.querySelectorAll('.fish-btn').forEach(btn => {
            btn.addEventListener('click', this.handleFishClick.bind(this), { once: false });
        });

        // 添加键盘快捷键支持
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                const type = e.key === '1' ? 'merit' : 
                            e.key === '2' ? 'luck' : 
                            e.key === '3' ? 'wealth' : 
                            e.key === '4' ? 'health' : null;
                
                if (type) {
                    this.incrementFishCount(type, 1);
                    
                    // 找到对应的按钮显示效果
                    const btn = document.querySelector(`.fish-btn[data-type="${type}"]`);
                    if (btn) {
                        this.showFishEffect(btn);
                    }
                }
            }
        });
        
        this.eventBound = true;
    }

    // 处理木鱼点击事件
    handleFishClick(e) {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡
        
        const type = e.currentTarget.dataset.type;
        this.incrementFishCount(type, 1);
        
        // 添加点击效果
        this.showFishEffect(e.currentTarget);
    }

    incrementFishCount(type, amount = 1) {
        const fishData = Storage.get('woodenFish') || {
            merit: 0, luck: 0, wealth: 0, health: 0
        };
        
        // 每次只增加1次 - 修复：确保只增加1次
        fishData[type] = (fishData[type] || 0) + amount;
        Storage.set('woodenFish', fishData);
        
        this.updateFishCounts(fishData);
        
        // 震动反馈（如果支持）
        if (navigator.vibrate) {
            navigator.vibrate(30); // 缩短震动时间
        }
        
        console.log(`${type} 计数增加 ${amount}，当前值: ${fishData[type]}`);
    }

    showFishEffect(element) {
        // 创建+1效果元素
        const effect = document.createElement('div');
        
        // 根据按钮类型设置不同的文字
        const type = element.dataset.type;
        const textMap = {
            merit: '功德+1',
            luck: '幸运+1',
            wealth: '财富+1',
            health: '健康+1'
        };
        effect.innerHTML = textMap[type] || '+1';
        effect.className = 'fish-effect';
        
        // 获取按钮位置和大小
        const rect = element.getBoundingClientRect();
        const btnCenterX = rect.left + rect.width / 2;
        const btnCenterY = rect.top + rect.height / 2;
        
        // 根据按钮类型设置颜色
        const colors = {
            merit: '#70c1ff',
            luck: '#ff9e9e',
            wealth: '#ffd670',
            health: '#8ddf8d'
        };
        const color = colors[type] || '#FFFFFF';
        
        // 随机偏移位置，避免效果重叠
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 10;
        
        // 设置样式，让效果显示在按钮外面
        effect.style.cssText = `
            position: fixed;
            color: ${color};
            font-weight: 800;
            pointer-events: none;
            z-index: 1000;
            animation: floatUp 1.2s ease-out forwards;
            font-size: 16px;
            top: ${btnCenterY + offsetY}px;
            left: ${btnCenterX + offsetX}px;
            transform: translate(-50%, -50%);
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.8),
                         0 0 16px ${color}80,
                         0 0 24px ${color}40;
            opacity: 0;
            white-space: nowrap;
            background: rgba(255, 255, 255, 0.9);
            padding: 4px 8px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `;
        
        document.body.appendChild(effect);
        
        // 强制重绘，确保动画开始
        effect.offsetHeight;
        
        // 开始动画
        effect.style.opacity = '1';
        
        // 添加日志
        console.log(`${type} 效果显示`);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1200);
    }

    getFishColor(type) {
        const colors = {
            merit: '#FF9800',
            luck: '#29B6F6',
            wealth: '#66BB6A',
            health: '#EC407A'
        };
        return colors[type] || '#FFFFFF';
    }

    startTimers() {
        this.updateTime();
        this.updateGreeting();
        
        // 每秒更新时间
        setInterval(() => {
            this.updateTime();
            this.updateGreeting();
        }, 1000);
        
        // 每5分钟检查一次节日状态
        setInterval(async () => {
            await this.checkAndUpdateHoliday();
        }, 5 * 60 * 1000);
        
        // 每整点检查一次
        setInterval(async () => {
            const now = new Date();
            if (now.getMinutes() === 0) {
                await this.checkAndUpdateHoliday();
            }
        }, 60 * 1000);
    }

    // 检查并更新节日
    async checkAndUpdateHoliday() {
        try {
            const cachedData = this.getCachedHolidayData();
            
            if (!cachedData) {
                await this.setupHolidayCountdown();
                return;
            }
            
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            // 如果当前节日是进行中，检查是否已过午夜
            if (cachedData.current && cachedData.current.status === 'active') {
                const lastUpdate = new Date(cachedData.timestamp);
                const lastUpdateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
                
                if (today > lastUpdateDate) {
                    console.log('检测到节日已过，重新获取数据');
                    localStorage.removeItem('holidayDataCache');
                    await this.setupHolidayCountdown();
                    return;
                }
            }
            
            // 如果缓存即将过期（10分钟内），重新获取
            if (cachedData.expiresAt - Date.now() < 10 * 60 * 1000) {
                await this.setupHolidayCountdown();
            }
            
        } catch (error) {
            console.error('检查节日状态失败:', error);
        }
    }

    updateTime() {
        const now = new Date();
        const timeElement = document.getElementById('currentTime');
        const dateElement = document.getElementById('currentDate');
        
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
            });
        }
    }

    updateGreeting() {
        const hour = new Date().getHours();
        let greeting = '';
        let emoji = '';
        
        // 固定10个字（不含标点符号）的问候语
        if (hour >= 5 && hour < 9) {
            greeting = '早上好，朋友！'; // 10个字
            emoji = '🍞';
        } else if (hour >= 9 && hour < 12) {
            greeting = '上午好，朋友！'; // 10个字
            emoji = '☀️';
        } else if (hour >= 12 && hour < 14) {
            greeting = '中午好，朋友！'; // 10个字
            emoji = '🍱';
        } else if (hour >= 14 && hour < 18) {
            greeting = '下午好，朋友！'; // 10个字
            emoji = '🌤️';
        } else if (hour >= 18 && hour < 22) {
            greeting = '晚上好，朋友！'; // 10个字
            emoji = '🍻';
        } else {
            greeting = '夜深啦，朋友早点休息！'; // 10个字
            emoji = '🌌';
        }
        
        const greetingElement = document.getElementById('greeting');
        if (greetingElement) {
            // 使用新的HTML结构，将emoji和文本分开
            greetingElement.innerHTML = `<span class="greeting-emoji">${emoji}</span> <span class="greeting-text-content">${greeting}</span>`;
        }
    }

    // 添加手动刷新方法
    async refreshHolidayData() {
        try {
            // 清除缓存
            localStorage.removeItem('holidayDataCache');
            
            // 显示加载状态
            const holidayCountdownEl = document.getElementById('holidayCountdown');
            if (holidayCountdownEl) {
                holidayCountdownEl.textContent = "刷新中...";
                holidayCountdownEl.classList.add('status-unknown');
                holidayCountdownEl.classList.remove('active-countdown', 'status-3days', 'status-7days', 'status-more');
            }
            
            // 重新获取数据
            await this.setupHolidayCountdown();
            
            if (window.app && window.app.showToast) {
                window.app.showToast('节日数据已刷新', 'success');
            }
        } catch (error) {
            console.error('手动刷新节日数据失败:', error);
            
            if (window.app && window.app.showToast) {
                window.app.showToast('刷新失败，请重试', 'error');
            }
        }
    }

    // 获取木鱼统计数据
    getFishStats() {
        return Storage.get('woodenFish') || {
            merit: 0, luck: 0, wealth: 0, health: 0
        };
    }

    // 重置木鱼数据
    resetFishData() {
        if (confirm('确定要重置所有木鱼计数吗？')) {
            const fishData = {
                merit: 0, luck: 0, wealth: 0, health: 0,
                lastUpdate: new Date().toDateString()
            };
            Storage.set('woodenFish', fishData);
            this.updateFishCounts(fishData);
            
            if (window.app && window.app.showToast) {
                window.app.showToast('木鱼计数已重置', 'success');
            }
        }
    }
}

// 初始化模块
document.addEventListener('DOMContentLoaded', () => {
    window.greetingModule = new GreetingModule();
    
    // 添加手动刷新按钮（可选）
    const refreshBtn = document.getElementById('refreshHolidayBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.greetingModule.refreshHolidayData();
        });
    }
});

// 导出到全局
window.GreetingModule = GreetingModule;