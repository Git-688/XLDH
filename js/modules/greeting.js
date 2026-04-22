// 问候区模块 - 优化效果和显示（优化10：Howler.js 音效版）
class GreetingModule {
    constructor() {
        this.initialized = false;
        this.eventBound = false;
        this.holidayRefreshTimer = null;
        this.holidayCheckTimer = null;
        this.currentHoliday = null;
        
        // ===== 方案E：Howler.js 音效 =====
        this.sounds = {};
        this.soundsReady = false;
        this.initSounds();
        
        this.init();
    }

    // ===== 初始化 Howler 音效 =====
    initSounds() {
        // 使用免费在线木鱼音效（可替换为自己的音频文件）
        // 来源：https://freesound.org/ 搜索 "wooden fish"
        const soundUrls = {
            merit: 'https://cdn.freesound.org/previews/256/256529_3263906-lq.mp3',   // 功德 - 低沉
            luck: 'https://cdn.freesound.org/previews/256/256530_3263906-lq.mp3',     // 幸运 - 清脆
            wealth: 'https://cdn.freesound.org/previews/256/256531_3263906-lq.mp3',   // 财富 - 明亮
            health: 'https://cdn.freesound.org/previews/256/256532_3263906-lq.mp3'    // 健康 - 柔和
        };
        
        // 备用方案：如果上述链接失效，使用本地文件（需自行放置）
        // const soundUrls = {
        //     merit: './assets/audio/merit.mp3',
        //     luck: './assets/audio/luck.mp3',
        //     wealth: './assets/audio/wealth.mp3',
        //     health: './assets/audio/health.mp3'
        // };
        
        try {
            this.sounds.merit = new Howl({
                src: [soundUrls.merit],
                volume: 0.4,
                preload: true,
                onload: () => console.log('功德音效加载完成'),
                onloaderror: (id, err) => console.warn('功德音效加载失败:', err)
            });
            
            this.sounds.luck = new Howl({
                src: [soundUrls.luck],
                volume: 0.4,
                preload: true
            });
            
            this.sounds.wealth = new Howl({
                src: [soundUrls.wealth],
                volume: 0.4,
                preload: true
            });
            
            this.sounds.health = new Howl({
                src: [soundUrls.health],
                volume: 0.4,
                preload: true
            });
            
            this.soundsReady = true;
        } catch (error) {
            console.error('Howler.js 初始化失败:', error);
            this.soundsReady = false;
        }
    }

    // ===== 播放木鱼音效（Howler 版本） =====
    playWoodenFishSound(type = 'merit') {
        if (!this.soundsReady) return;
        
        const sound = this.sounds[type];
        if (sound) {
            // 如果已经在播放，重新播放（允许多次点击叠加）
            sound.play();
        }
    }

    async init() {
        if (this.initialized) return;
        
        this.loadWoodenFishData();
        this.bindEvents();
        this.startTimers();
        await this.setupHolidayCountdown();
        
        this.handleResize();
        window.addEventListener('resize', this.handleResize.bind(this));
        
        this.initialized = true;
    }

    handleResize() {
        const holidayNameEl = document.getElementById('holidayName');
        if (holidayNameEl) {
            holidayNameEl.removeAttribute('title');
        }
    }

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

    processHolidayData(holidayData) {
        if (!holidayData || holidayData.length === 0) {
            return this.getDefaultHoliday();
        }

        const now = new Date();
        let current = null;
        let next = null;
        let foundCurrent = false;

        for (const holidayStr of holidayData) {
            const holiday = this.parseSingleHoliday(holidayStr);
            
            if (!holiday) continue;

            if (holiday.status === 'active') {
                current = holiday;
                foundCurrent = true;
                continue;
            }

            if (foundCurrent) {
                next = holiday;
                break;
            }

            if (!next && holiday.days > 0) {
                next = holiday;
            }
        }

        if (!current && !next && holidayData.length > 0) {
            const firstHoliday = this.parseSingleHoliday(holidayData[0]);
            if (firstHoliday) {
                next = firstHoliday;
            }
        }

        return { current, next };
    }

    parseSingleHoliday(holidayStr) {
        if (!holidayStr) return null;

        const match = holidayStr.match(/^(?:(\d{4})年)?(.+?)\s+(?:剩余)?(\d+天|进行中|\d+小时|\d+分钟)$/);
        
        if (!match) {
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

    formatCountdown(countdown) {
        if (countdown === '进行中') {
            return '进行中';
        }
        
        const daysMatch = countdown.match(/(\d+)天/);
        if (daysMatch) {
            const days = parseInt(daysMatch[1]);
            return `${days}天`;
        }
        
        const hoursMatch = countdown.match(/(\d+)小时/);
        if (hoursMatch) {
            const hours = parseInt(hoursMatch[1]);
            return `${hours}小时`;
        }
        
        return countdown;
    }

    extractDays(countdown) {
        if (countdown === '进行中') return 0;
        
        const daysMatch = countdown.match(/(\d+)天/);
        if (daysMatch) {
            return parseInt(daysMatch[1]);
        }
        
        return null;
    }

    extractHours(countdown) {
        const hoursMatch = countdown.match(/(\d+)小时/);
        if (hoursMatch) {
            return parseInt(hoursMatch[1]);
        }
        
        return null;
    }

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

    async setupHolidayCountdown() {
        try {
            await this.checkHolidayExpiration();
            
            const holidayData = await this.loadHolidayData();
            const holidays = this.processHolidayData(holidayData);
            
            let displayHoliday = null;
            
            if (holidays.current) {
                this.currentHoliday = holidays.current;
                displayHoliday = holidays.current;
                this.scheduleHolidayRefresh(holidays.current);
            } else if (holidays.next) {
                displayHoliday = holidays.next;
                this.currentHoliday = null;
            }
            
            this.updateHolidayDisplay(displayHoliday);
            this.cacheHolidayData(holidays);
            
        } catch (error) {
            console.error('设置节日倒计时失败:', error);
            
            const cachedData = this.getCachedHolidayData();
            if (cachedData) {
                const displayHoliday = cachedData.current || cachedData.next;
                this.updateHolidayDisplay(displayHoliday);
            }
        }
    }

    async checkHolidayExpiration() {
        const cachedData = this.getCachedHolidayData();
        
        if (!cachedData || !cachedData.current) return;
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
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

    cacheHolidayData(holidays) {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            
            const cache = {
                current: holidays.current,
                next: holidays.next,
                timestamp: Date.now(),
                expiresAt: holidays.current ? 
                    tomorrow.getTime() : 
                    Date.now() + (24 * 60 * 60 * 1000)
            };
            
            localStorage.setItem('holidayDataCache', JSON.stringify(cache));
            
        } catch (error) {
            console.error('缓存节日数据失败:', error);
        }
    }

    getCachedHolidayData() {
        try {
            const cacheStr = localStorage.getItem('holidayDataCache');
            if (!cacheStr) return null;
            
            const cache = JSON.parse(cacheStr);
            
            if (Date.now() > cache.expiresAt) {
                localStorage.removeItem('holidayDataCache');
                return null;
            }
            
            return cache;
        } catch (error) {
            return null;
        }
    }

    scheduleHolidayRefresh(holiday) {
        if (!holiday || holiday.status !== 'active') return;
        
        if (this.holidayRefreshTimer) {
            clearTimeout(this.holidayRefreshTimer);
        }
        
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        
        console.log(`安排节日刷新在 ${Math.round(timeUntilMidnight / 1000 / 60)} 分钟后`);
        
        this.holidayRefreshTimer = setTimeout(async () => {
            console.log('节日结束，自动刷新数据');
            localStorage.removeItem('holidayDataCache');
            await this.setupHolidayCountdown();
            
            if (window.app && window.app.showToast) {
                window.app.showToast('节日数据已更新', 'info');
            }
        }, timeUntilMidnight + 1000);
    }

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
        
        holidayNameEl.innerHTML = `<span class="holiday-icon">${holidayInfo.icon}</span> ${holidayInfo.name}`;
        holidayNameEl.removeAttribute('title');
        holidayCountdownEl.textContent = holidayInfo.displayText;
        
        this.setHolidayStyle(holidayCountdownEl, holidayInfo);
        
        if (holidayInfo.status === 'active') {
            holidayCountdownEl.classList.add('active-countdown');
        } else {
            holidayCountdownEl.classList.remove('active-countdown');
        }
    }

    setHolidayStyle(element, holidayInfo) {
        element.classList.remove('active-countdown', 'status-3days', 'status-7days', 'status-more', 'status-unknown');
        
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
        if (this.eventBound) return;
        
        document.querySelectorAll('.fish-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        
        document.querySelectorAll('.fish-btn').forEach(btn => {
            btn.addEventListener('click', this.handleFishClick.bind(this), { once: false });
        });

        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                const type = e.key === '1' ? 'merit' : 
                            e.key === '2' ? 'luck' : 
                            e.key === '3' ? 'wealth' : 
                            e.key === '4' ? 'health' : null;
                
                if (type) {
                    this.incrementFishCount(type, 1);
                    const btn = document.querySelector(`.fish-btn[data-type="${type}"]`);
                    if (btn) {
                        this.showFishEffect(btn);
                        // ===== 方案E：快捷键也触发 Howler 音效 =====
                        this.playWoodenFishSound(type);
                    }
                }
            }
        });
        
        this.eventBound = true;
    }

    // ===== 处理木鱼点击事件，使用 Howler 音效 =====
    handleFishClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const type = e.currentTarget.dataset.type;
        
        // 播放音效（Howler 会自动处理音频上下文）
        this.playWoodenFishSound(type);
        
        this.incrementFishCount(type, 1);
        this.showFishEffect(e.currentTarget);
        
        if (navigator.vibrate) {
            navigator.vibrate(20);
        }
    }

    incrementFishCount(type, amount = 1) {
        const fishData = Storage.get('woodenFish') || {
            merit: 0, luck: 0, wealth: 0, health: 0
        };
        
        fishData[type] = (fishData[type] || 0) + amount;
        Storage.set('woodenFish', fishData);
        
        this.updateFishCounts(fishData);
        
        console.log(`${type} 计数增加 ${amount}，当前值: ${fishData[type]}`);
    }

    showFishEffect(element) {
        const effect = document.createElement('div');
        
        const type = element.dataset.type;
        const textMap = {
            merit: '功德+1',
            luck: '幸运+1',
            wealth: '财富+1',
            health: '健康+1'
        };
        effect.innerHTML = textMap[type] || '+1';
        effect.className = 'fish-effect';
        
        const rect = element.getBoundingClientRect();
        const btnCenterX = rect.left + rect.width / 2;
        const btnCenterY = rect.top + rect.height / 2;
        
        const colors = {
            merit: '#70c1ff',
            luck: '#ff9e9e',
            wealth: '#ffd670',
            health: '#8ddf8d'
        };
        const color = colors[type] || '#FFFFFF';
        
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 10;
        
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
        
        effect.offsetHeight;
        effect.style.opacity = '1';
        
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
        
        setInterval(() => {
            this.updateTime();
            this.updateGreeting();
        }, 1000);
        
        setInterval(async () => {
            await this.checkAndUpdateHoliday();
        }, 5 * 60 * 1000);
        
        setInterval(async () => {
            const now = new Date();
            if (now.getMinutes() === 0) {
                await this.checkAndUpdateHoliday();
            }
        }, 60 * 1000);
    }

    async checkAndUpdateHoliday() {
        try {
            const cachedData = this.getCachedHolidayData();
            
            if (!cachedData) {
                await this.setupHolidayCountdown();
                return;
            }
            
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
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
        
        if (hour >= 5 && hour < 9) {
            greeting = '早上好，朋友！';
            emoji = '🍞';
        } else if (hour >= 9 && hour < 12) {
            greeting = '上午好，朋友！';
            emoji = '☀️';
        } else if (hour >= 12 && hour < 14) {
            greeting = '中午好，朋友！';
            emoji = '🍱';
        } else if (hour >= 14 && hour < 18) {
            greeting = '下午好，朋友！';
            emoji = '🌤️';
        } else if (hour >= 18 && hour < 22) {
            greeting = '晚上好，朋友！';
            emoji = '🍻';
        } else {
            greeting = '夜深啦，朋友早点休息！';
            emoji = '🌌';
        }
        
        const greetingElement = document.getElementById('greeting');
        if (greetingElement) {
            greetingElement.innerHTML = `<span class="greeting-emoji">${emoji}</span> <span class="greeting-text-content">${greeting}</span>`;
        }
    }

    async refreshHolidayData() {
        try {
            localStorage.removeItem('holidayDataCache');
            
            const holidayCountdownEl = document.getElementById('holidayCountdown');
            if (holidayCountdownEl) {
                holidayCountdownEl.textContent = "刷新中...";
                holidayCountdownEl.classList.add('status-unknown');
                holidayCountdownEl.classList.remove('active-countdown', 'status-3days', 'status-7days', 'status-more');
            }
            
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

    getFishStats() {
        return Storage.get('woodenFish') || {
            merit: 0, luck: 0, wealth: 0, health: 0
        };
    }

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

    // ===== 销毁时卸载 Howler 音效 =====
    destroy() {
        if (this.holidayRefreshTimer) {
            clearTimeout(this.holidayRefreshTimer);
        }
        if (this.holidayCheckTimer) {
            clearInterval(this.holidayCheckTimer);
        }
        
        // 卸载所有 Howl 实例
        if (this.sounds) {
            Object.values(this.sounds).forEach(sound => {
                if (sound && typeof sound.unload === 'function') {
                    sound.unload();
                }
            });
            this.sounds = {};
        }
        this.soundsReady = false;
        
        this.initialized = false;
        this.eventBound = false;
    }
}

// 初始化模块
document.addEventListener('DOMContentLoaded', () => {
    window.greetingModule = new GreetingModule();
    
    const refreshBtn = document.getElementById('refreshHolidayBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.greetingModule.refreshHolidayData();
        });
    }
});

// 导出到全局
window.GreetingModule = GreetingModule;