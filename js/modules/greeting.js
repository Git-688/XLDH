// greeting.js - 问候区模块（包含木鱼、节日、时钟、展开/收起）
class GreetingModule {
    constructor() {
        if (window.Starlink && window.Starlink.greeting) return window.Starlink.greeting;
        this.initialized = false;
        this.eventBound = false;
        this.holidayRefreshTimer = null;
        this.holidayCheckTimer = null;
        this.currentHoliday = null;
        this.audioCtx = null;
        this.todayHolidays = [];
        this.nextHoliday = null;
        this.expanded = false;
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
        if (holidayNameEl) holidayNameEl.removeAttribute('title');
    }

    async loadHolidayData() {
        try {
            const apiUrl = 'https://xiaodi.ykxbl.top/Api/dsr.php?n=30';
            const response = await Utils.safeFetch(apiUrl, { timeout: 5000 });
            const data = await response.json();
            if (data && data.code === 0 && data.data && data.data.length > 0) {
                return data.data.map(item => {
                    let days = item.countdown;
                    let status = days === 0 ? 'active' : 'upcoming';
                    return {
                        name: item.title,
                        countdown: `${days}天`,
                        displayText: days === 0 ? '今日' : `${days}天`,
                        status: status,
                        days: days,
                        icon: this.getHolidayIcon(item.title),
                        raw: `${item.title} ${days === 0 ? '今日' : `剩余${days}天`}`,
                        is_today: item.is_today || false,
                        date: item.date
                    };
                });
            }
            return this.getDefaultHolidays();
        } catch (error) {
            Utils.handleApiError(error, '获取节日数据失败', false);
            return this.getDefaultHolidays();
        }
    }

    getDefaultHolidays() {
        return [
            { name: '元旦', countdown: '计算中...', displayText: '计算中...', status: 'unknown', days: null, icon: '🎉', is_today: false },
            { name: '春节', countdown: '计算中...', displayText: '计算中...', status: 'unknown', days: null, icon: '🧧', is_today: false },
            { name: '清明节', countdown: '计算中...', displayText: '计算中...', status: 'unknown', days: null, icon: '🌸', is_today: false },
            { name: '端午节', countdown: '计算中...', displayText: '计算中...', status: 'unknown', days: null, icon: '🎏', is_today: false },
            { name: '中秋节', countdown: '计算中...', displayText: '计算中...', status: 'unknown', days: null, icon: '🌕', is_today: false },
            { name: '国庆节', countdown: '计算中...', displayText: '计算中...', status: 'unknown', days: null, icon: '🇨🇳', is_today: false }
        ];
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
            const holidays = await this.loadHolidayData();
            const todayStr = new Date().toISOString().slice(0, 10);
            const todayHolidays = holidays.filter(h => h.is_today === true || (h.date === todayStr && h.days === 0));
            let nextHoliday = null;
            if (todayHolidays.length === 0) {
                const futureHolidays = holidays.filter(h => h.days > 0).sort((a, b) => a.days - b.days);
                nextHoliday = futureHolidays.length > 0 ? futureHolidays[0] : null;
            }
            this.todayHolidays = todayHolidays;
            this.nextHoliday = nextHoliday;
            this.expanded = false;
            this.updateHolidayDisplay();
            this.cacheHolidayData();
        } catch (error) {
            console.error('设置节日倒计时失败:', error);
            const cached = this.getCachedHolidayData();
            if (cached) {
                this.todayHolidays = cached.todayHolidays || [];
                this.nextHoliday = cached.nextHoliday;
                this.updateHolidayDisplay();
            }
        }
    }

    async checkHolidayExpiration() {
        const cached = this.getCachedHolidayData();
        if (!cached) return;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (cached.timestamp && today > new Date(cached.timestamp)) {
            localStorage.removeItem('holidayDataCache');
        }
    }

    cacheHolidayData() {
        try {
            const cache = {
                todayHolidays: this.todayHolidays,
                nextHoliday: this.nextHoliday,
                timestamp: Date.now(),
                expiresAt: Date.now() + 24 * 60 * 60 * 1000
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

    updateHolidayDisplay() {
        const primaryContainer = document.getElementById('primaryHolidayContainer');
        const secondaryContainer = document.getElementById('secondaryHolidaysList');
        const expandBtn = document.getElementById('expandHolidayBtn');
        if (!primaryContainer) return;

        let mainHoliday = null;
        let extraHolidays = [];

        if (this.todayHolidays.length > 0) {
            mainHoliday = this.todayHolidays[0];
            extraHolidays = this.todayHolidays.slice(1);
        } else if (this.nextHoliday) {
            mainHoliday = this.nextHoliday;
            extraHolidays = [];
        } else {
            primaryContainer.innerHTML = `<span class="holiday-icon">🎉</span> 暂无节日信息`;
            if (secondaryContainer) secondaryContainer.innerHTML = '';
            if (expandBtn) expandBtn.style.display = 'none';
            return;
        }

        const daysText = mainHoliday.days === 0 ? '今日' : (mainHoliday.days !== null ? `${mainHoliday.days}天` : '计算中...');
        primaryContainer.innerHTML = `
            <span class="holiday-icon">${mainHoliday.icon}</span>
            <span class="holiday-name">${Utils.escapeHtml(mainHoliday.name)}</span>
            <span class="holiday-countdown ${mainHoliday.days === 0 ? 'active-countdown' : ''}">${daysText}</span>
        `;

        if (extraHolidays.length > 0) {
            if (expandBtn) {
                expandBtn.style.display = 'inline-flex';
                expandBtn.textContent = this.expanded ? '收起' : '展开';
                this.bindExpandButton(expandBtn);
            }
            if (secondaryContainer) {
                if (this.expanded) {
                    secondaryContainer.innerHTML = extraHolidays.map(h => `
                        <div class="secondary-holiday-item">
                            <span class="secondary-name">${Utils.escapeHtml(h.name)}</span>
                        </div>
                    `).join('');
                    secondaryContainer.style.display = 'flex';
                } else {
                    secondaryContainer.style.display = 'none';
                }
            }
        } else {
            if (expandBtn) expandBtn.style.display = 'none';
            if (secondaryContainer) {
                secondaryContainer.innerHTML = '';
                secondaryContainer.style.display = 'none';
            }
        }
    }

    toggleHolidayExpand() {
        this.expanded = !this.expanded;
        this.updateHolidayDisplay();
    }

    bindExpandButton(btn) {
        if (!btn) return;
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleHolidayExpand();
        });
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
            if (element) element.textContent = fishData[type] || 0;
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

        const expandBtn = document.getElementById('expandHolidayBtn');
        if (expandBtn) this.bindExpandButton(expandBtn);

        this.eventBound = true;
    }

    handleFishClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const type = e.currentTarget.dataset.type;
        this.playWoodenFishSound();
        this.incrementFishCount(type, 1);
        this.showFishEffect(e.currentTarget);
        if (navigator.vibrate) navigator.vibrate(20);
    }

    incrementFishCount(type, amount = 1) {
        const fishData = Storage.get('woodenFish') || { merit: 0, luck: 0, wealth: 0, health: 0 };
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
        setTimeout(() => { if (effect.parentNode) effect.parentNode.removeChild(effect); }, 1200);
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
            if (now.getMinutes() === 0) await this.checkAndUpdateHoliday();
        }, 60 * 1000);
    }

    async checkAndUpdateHoliday() {
        try {
            const cached = this.getCachedHolidayData();
            if (!cached) {
                await this.setupHolidayCountdown();
                return;
            }
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (cached.timestamp && today > new Date(cached.timestamp)) {
                localStorage.removeItem('holidayDataCache');
                await this.setupHolidayCountdown();
                return;
            }
            if (cached.expiresAt - Date.now() < 10 * 60 * 1000) {
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
        if (timeElement) timeElement.textContent = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (dateElement) dateElement.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    }

    updateGreeting() {
        const hour = new Date().getHours();
        let greeting = '', emoji = '';
        if (hour >= 5 && hour < 9) { greeting = '早上好，朋友！'; emoji = '🍞'; }
        else if (hour >= 9 && hour < 12) { greeting = '上午好，朋友！'; emoji = '☀️'; }
        else if (hour >= 12 && hour < 14) { greeting = '中午好，朋友！'; emoji = '🍱'; }
        else if (hour >= 14 && hour < 18) { greeting = '下午好，朋友！'; emoji = '🌤️'; }
        else if (hour >= 18 && hour < 22) { greeting = '晚上好，朋友！'; emoji = '🍻'; }
        else { greeting = '夜深啦，朋友早点休息！'; emoji = '🌌'; }
        const greetingElement = document.getElementById('greeting');
        if (greetingElement) greetingElement.innerHTML = `<span class="greeting-emoji">${emoji}</span> <span class="greeting-text-content">${Utils.escapeHtml(greeting)}</span>`;
    }

    async refreshHolidayData() {
        try {
            localStorage.removeItem('holidayDataCache');
            await this.setupHolidayCountdown();
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show('节日数据已刷新', 'success');
        } catch (error) {
            console.error('手动刷新节日数据失败:', error);
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show('刷新失败，请重试', 'error');
        }
    }

    getFishStats() { return Storage.get('woodenFish') || { merit: 0, luck: 0, wealth: 0, health: 0 }; }

    resetFishData() {
        if (confirm('确定要重置所有木鱼计数吗？')) {
            const fishData = { merit: 0, luck: 0, wealth: 0, health: 0, lastUpdate: new Date().toDateString() };
            Storage.set('woodenFish', fishData);
            this.updateFishCounts(fishData);
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show('木鱼计数已重置', 'success');
        }
    }

    destroy() {
        if (this.holidayRefreshTimer) clearTimeout(this.holidayRefreshTimer);
        if (this.holidayCheckTimer) clearInterval(this.holidayCheckTimer);
        if (this.audioCtx) { this.audioCtx.close().catch(() => {}); this.audioCtx = null; }
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