// 问候区模块 - 优化效果和显示（自制木鱼音效，复用 AudioContext）
class GreetingModule {
    constructor() {
        if (window.Starlink && window.Starlink.greeting) return window.Starlink.greeting;
        this.initialized = false;
        this.eventBound = false;
        this.holidayRefreshTimer = null;
        this.holidayCheckTimer = null;
        this.currentHoliday = null;
        this.audioCtx = null;
        this.holidayList = []; // 存储所有节日
        this.init();
        if (window.Starlink) window.Starlink.greeting = this;
        window.greetingModule = this;
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

    ensureAudioContext() {
        if (!this.audioCtx) {
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (this.audioCtx.state !== 'running') {
                    this.audioCtx.suspend();
                    const resumeCtx = () => {
                        if (this.audioCtx && this.audioCtx.state === 'suspended') {
                            this.audioCtx.resume();
                        }
                        document.removeEventListener('click', resumeCtx);
                        document.removeEventListener('touchstart', resumeCtx);
                    };
                    document.addEventListener('click', resumeCtx);
                    document.addEventListener('touchstart', resumeCtx);
                }
            } catch (e) {}
        }
        return this.audioCtx;
    }

    playWoodenFishSound() {
        const ctx = this.ensureAudioContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const gainNode = ctx.createGain();
            gainNode.connect(ctx.destination);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(800, now);
            osc1.frequency.exponentialRampToValueAtTime(400, now + 0.02);
            osc1.connect(gainNode);
            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1200, now);
            osc2.frequency.exponentialRampToValueAtTime(600, now + 0.03);
            osc2.connect(gainNode);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.1);
            osc2.stop(now + 0.1);
        } catch (e) {}
    }

    handleResize() {
        const holidayNameEl = document.getElementById('holidayName');
        if (holidayNameEl) {
            holidayNameEl.removeAttribute('title');
        }
    }

    // 从新 API 加载节日数据
    async loadHolidayData() {
        try {
            const apiUrl = 'https://xiaodi.ykxbl.top/Api/dsr.php?n=20';
            const response = await Utils.safeFetch(apiUrl, { timeout: 5000 });
            const data = await response.json();
            if (data && data.code === 0 && data.data && data.data.length > 0) {
                // 处理 API 返回的数据，转换为内部格式
                return data.data.map(item => {
                    let days = item.countdown;
                    let status = days === 0 ? 'active' : 'upcoming';
                    return {
                        name: item.title,
                        countdown: `${days}天`,
                        displayText: days === 0 ? '进行中' : `${days}天`,
                        status: status,
                        days: days,
                        icon: this.getHolidayIcon(item.title),
                        raw: `${item.title} ${days === 0 ? '进行中' : `剩余${days}天`}`,
                        is_today: item.is_today || false
                    };
                });
            }
            // 如果 API 返回无效数据，使用默认数据
            return this.getDefaultHolidays();
        } catch (error) {
            Utils.handleApiError(error, '获取节日数据失败', false);
            return this.getDefaultHolidays();
        }
    }

    getDefaultHolidays() {
        const today = new Date();
        const year = today.getFullYear();
        return [
            {
                name: '元旦', countdown: '计算中...', displayText: '计算中...', status: 'unknown',
                days: null, icon: '🎉', raw: `${year}年元旦 计算中...`, is_today: false
            },
            {
                name: '春节', countdown: '计算中...', displayText: '计算中...', status: 'unknown',
                days: null, icon: '🧧', raw: `${year}年春节 计算中...`, is_today: false
            },
            {
                name: '清明节', countdown: '计算中...', displayText: '计算中...', status: 'unknown',
                days: null, icon: '🌸', raw: `${year}年清明节 计算中...`, is_today: false
            },
            {
                name: '端午节', countdown: '计算中...', displayText: '计算中...', status: 'unknown',
                days: null, icon: '🎏', raw: `${year}年端午节 计算中...`, is_today: false
            },
            {
                name: '中秋节', countdown: '计算中...', displayText: '计算中...', status: 'unknown',
                days: null, icon: '🌕', raw: `${year}年中秋节 计算中...`, is_today: false
            },
            {
                name: '国庆节', countdown: '计算中...', displayText: '计算中...', status: 'unknown',
                days: null, icon: '🇨🇳', raw: `${year}年国庆节 计算中...`, is_today: false
            }
        ];
    }

    // 处理节日列表，分离主要和次要节日
    processHolidayData(holidayData) {
        if (!holidayData || holidayData.length === 0) {
            return { primary: null, secondary: [] };
        }
        // 获取当前的日期（用于后续可能的排序）
        const now = new Date();
        // 将节日分为进行中、未开始和已结束，并过滤掉已结束的（countdown < 0）
        const upcomingHolidays = holidayData.filter(h => h.days >= 0);
        if (upcomingHolidays.length === 0) {
            return { primary: null, secondary: [] };
        }
        // 按剩余天数升序排序
        upcomingHolidays.sort((a, b) => a.days - b.days);
        // 第一个作为主要节日
        const primary = upcomingHolidays[0];
        // 其余的作为次要节日
        const secondary = upcomingHolidays.slice(1, 6); // 最多显示5个次要节日
        return { primary, secondary };
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
        if (countdown === '进行中') return '进行中';
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
        else if (name.includes('情人') || name.includes('七夕')) return '❤️';
        else if (name.includes('母亲') || name.includes('父亲')) return '👨‍👩‍👧‍👦';
        else if (name.includes('教师')) return '👨‍🏫';
        else if (name.includes('妇女')) return '👩';
        else if (name.includes('青年')) return '👦';
        else if (name.includes('重阳')) return '🌼';
        else if (name.includes('腊八')) return '🥣';
        else if (name.includes('冬至')) return '🥟';
        else if (name.includes('高考')) return '📚';
        else if (name.includes('纪念日')) return '🕯️';
        else if (name.includes('京东') || name.includes('618')) return '🛒';
        else if (name.includes('献血')) return '🩸';
        else if (name.includes('奥林匹克')) return '🏅';
        else return '🎉';
    }

    async setupHolidayCountdown() {
        try {
            await this.checkHolidayExpiration();
            const holidayData = await this.loadHolidayData();
            const { primary, secondary } = this.processHolidayData(holidayData);
            this.holidayList = secondary;
            this.updateHolidayDisplay(primary, secondary);
            this.cacheHolidayData(primary, secondary);
        } catch (error) {
            console.error('设置节日倒计时失败:', error);
            const cachedData = this.getCachedHolidayData();
            if (cachedData) {
                this.updateHolidayDisplay(cachedData.primary, cachedData.secondary);
            }
        }
    }

    async checkHolidayExpiration() {
        const cachedData = this.getCachedHolidayData();
        if (!cachedData || !cachedData.primary) return;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (cachedData.primary.status === 'active') {
            const lastUpdate = new Date(cachedData.timestamp);
            const lastUpdateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
            if (today > lastUpdateDate) {
                localStorage.removeItem('holidayDataCache');
                this.currentHoliday = null;
            }
        }
    }

    cacheHolidayData(primary, secondary) {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            const cache = {
                primary: primary,
                secondary: secondary,
                timestamp: Date.now(),
                expiresAt: primary && primary.status === 'active' ? tomorrow.getTime() : Date.now() + (24 * 60 * 60 * 1000)
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
        this.holidayRefreshTimer = setTimeout(async () => {
            localStorage.removeItem('holidayDataCache');
            await this.setupHolidayCountdown();
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) {
                toast.show('节日数据已更新', 'info');
            } else if (window.app && window.app.showToast) {
                window.app.showToast('节日数据已更新', 'info');
            }
        }, timeUntilMidnight + 1000);
    }

    // 更新节日显示：主要节日 + 次要节日列表
    updateHolidayDisplay(primaryHoliday, secondaryHolidays = []) {
        // 更新主要节日显示
        const holidayNameEl = document.getElementById('holidayName');
        const holidayCountdownEl = document.getElementById('holidayCountdown');
        if (!holidayNameEl || !holidayCountdownEl) return;
        if (!primaryHoliday) {
            holidayNameEl.innerHTML = `<span class="holiday-icon">🎉</span> 下一个节日`;
            holidayCountdownEl.textContent = "计算中...";
            holidayCountdownEl.classList.add('status-unknown');
            holidayNameEl.removeAttribute('title');
            holidayNameEl.classList.remove('active-holiday');
        } else {
            holidayNameEl.innerHTML = `<span class="holiday-icon">${primaryHoliday.icon}</span> ${Utils.escapeHtml(primaryHoliday.name)}`;
            holidayNameEl.removeAttribute('title');
            holidayCountdownEl.textContent = primaryHoliday.displayText;
            this.setHolidayStyle(holidayCountdownEl, primaryHoliday);
            if (primaryHoliday.status === 'active') {
                holidayCountdownEl.classList.add('active-countdown');
            } else {
                holidayCountdownEl.classList.remove('active-countdown');
            }
        }
        // 更新次要节日列表
        this.updateSecondaryHolidays(secondaryHolidays);
    }

    // 渲染次要节日列表
    updateSecondaryHolidays(holidays) {
        const container = document.getElementById('secondaryHolidays');
        if (!container) return;
        if (!holidays || holidays.length === 0) {
            container.innerHTML = '<span class="secondary-empty">暂无更多节日</span>';
            return;
        }
        const html = holidays.map(holiday => {
            let displayText = holiday.displayText;
            let statusClass = '';
            if (holiday.days === 0) {
                displayText = '今日';
                statusClass = 'status-active';
            } else if (holiday.days === 1) {
                statusClass = 'status-1day';
            } else if (holiday.days <= 3) {
                statusClass = 'status-3days';
            } else if (holiday.days <= 7) {
                statusClass = 'status-7days';
            }
            return `
                <div class="secondary-holiday-item">
                    <span class="secondary-name">${Utils.escapeHtml(holiday.name)}</span>
                    <span class="secondary-countdown ${statusClass}">${displayText}</span>
                </div>
            `;
        }).join('');
        container.innerHTML = html;
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
            merit: 0, luck: 0, wealth: 0, health: 0, lastUpdate: new Date().toDateString()
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
                        this.playWoodenFishSound();
                    }
                }
            }
        });
        this.eventBound = true;
    }

    handleFishClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const type = e.currentTarget.dataset.type;
        this.playWoodenFishSound();
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
    }

    showFishEffect(element) {
        const effect = document.createElement('div');
        const type = element.dataset.type;
        const textMap = { merit: '功德+1', luck: '幸运+1', wealth: '财富+1', health: '健康+1' };
        effect.innerHTML = textMap[type] || '+1';
        effect.className = 'fish-effect';
        const rect = element.getBoundingClientRect();
        const btnCenterX = rect.left + rect.width / 2;
        const btnCenterY = rect.top + rect.height / 2;
        const colors = { merit: '#70c1ff', luck: '#ff9e9e', wealth: '#ffd670', health: '#8ddf8d' };
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
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px ${color}80, 0 0 24px ${color}40;
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
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1200);
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
            if (cachedData.primary && cachedData.primary.status === 'active') {
                const lastUpdate = new Date(cachedData.timestamp);
                const lastUpdateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
                if (today > lastUpdateDate) {
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
            timeElement.textContent = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
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
            greetingElement.innerHTML = `<span class="greeting-emoji">${emoji}</span> <span class="greeting-text-content">${Utils.escapeHtml(greeting)}</span>`;
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
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) {
                toast.show('节日数据已刷新', 'success');
            } else if (window.app && window.app.showToast) {
                window.app.showToast('节日数据已刷新', 'success');
            }
        } catch (error) {
            console.error('手动刷新节日数据失败:', error);
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) {
                toast.show('刷新失败，请重试', 'error');
            } else if (window.app && window.app.showToast) {
                window.app.showToast('刷新失败，请重试', 'error');
            }
        }
    }

    getFishStats() {
        return Storage.get('woodenFish') || { merit: 0, luck: 0, wealth: 0, health: 0 };
    }

    resetFishData() {
        if (confirm('确定要重置所有木鱼计数吗？')) {
            const fishData = { merit: 0, luck: 0, wealth: 0, health: 0, lastUpdate: new Date().toDateString() };
            Storage.set('woodenFish', fishData);
            this.updateFishCounts(fishData);
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) {
                toast.show('木鱼计数已重置', 'success');
            } else if (window.app && window.app.showToast) {
                window.app.showToast('木鱼计数已重置', 'success');
            }
        }
    }

    destroy() {
        if (this.holidayRefreshTimer) clearTimeout(this.holidayRefreshTimer);
        if (this.holidayCheckTimer) clearInterval(this.holidayCheckTimer);
        if (this.audioCtx) {
            this.audioCtx.close().catch(() => {});
            this.audioCtx = null;
        }
        this.initialized = false;
        this.eventBound = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.greeting) {
        window.Starlink.greeting = new GreetingModule();
    }
    window.greetingModule = window.Starlink.greeting;
    
    const refreshBtn = document.getElementById('refreshHolidayBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.Starlink.greeting.refreshHolidayData();
        });
    }
});
window.GreetingModule = GreetingModule;