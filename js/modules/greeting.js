// 问候区模块 - 优化节日倒计时显示（适配 Timor Tech API）
class GreetingModule {
    constructor() {
        if (window.Starlink && window.Starlink.greeting) return window.Starlink.greeting;
        this.initialized = false;
        this.eventBound = false;
        this.holidayRefreshTimer = null;
        this.holidayCheckTimer = null;
        this.currentHoliday = null;
        this.audioCtx = null;
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
                        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
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
        const el = document.getElementById('holidayName');
        if (el) el.removeAttribute('title');
    }

    // ==================== 节日 API（Timor Tech）适配实际返回格式 ====================
    async loadHolidayData() {
        try {
            const response = await Utils.safeFetch('https://timor.tech/api/holiday/next', { timeout: 8000 });
            const data = await response.json();
            // 检查返回结构：{ code: 0, holiday: { name, rest, date, ... } }
            if (data && data.code === 0 && data.holiday) {
                const holiday = data.holiday;
                const name = holiday.name;
                const days = holiday.rest; // 剩余天数
                if (days !== undefined && days !== null) {
                    // 格式化为 "节日名 还有X天"
                    return [`${name} 还有${days}天`];
                }
            }
            return this.getDefaultHolidays();
        } catch (error) {
            Utils.handleApiError(error, '获取节日数据失败', false);
            return this.getDefaultHolidays();
        }
    }

    getDefaultHolidays() {
        const year = new Date().getFullYear();
        return [
            `${year}年春节 计算中...`,
            `${year}年端午节 计算中...`,
            `${year}年中秋节 计算中...`,
            `${year}年国庆节 计算中...`
        ];
    }

    processHolidayData(holidayData) {
        if (!holidayData || holidayData.length === 0) return this.getDefaultHoliday();
        let current = null, next = null, foundCurrent = false;
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
            if (!next && holiday.days > 0) next = holiday;
        }
        if (!current && !next && holidayData.length > 0) {
            const first = this.parseSingleHoliday(holidayData[0]);
            if (first) next = first;
        }
        return { current, next };
    }

    parseSingleHoliday(holidayStr) {
        if (!holidayStr) return null;
        // 匹配格式：节日名 还有X天
        const match = holidayStr.match(/^(.+?)\s+还有(\d+)天$/);
        if (match) {
            const name = match[1];
            const days = parseInt(match[2]);
            return this.createHolidayObject(name, days, false);
        }
        const activeMatch = holidayStr.match(/^(.+?)\s+进行中$/);
        if (activeMatch) {
            return this.createHolidayObject(activeMatch[1], 0, true);
        }
        // 兼容旧格式
        const legacyMatch = holidayStr.match(/^(?:(\d{4})年)?(.+?)\s+(?:剩余)?(\d+天|进行中|\d+小时|\d+分钟)$/);
        if (legacyMatch) {
            const name = legacyMatch[2];
            const countdown = legacyMatch[3];
            if (countdown === '进行中') return this.createHolidayObject(name, 0, true);
            const daysMatch = countdown.match(/(\d+)天/);
            if (daysMatch) return this.createHolidayObject(name, parseInt(daysMatch[1]), false);
        }
        return null;
    }

    createHolidayObject(name, days, isActive) {
        return {
            name: name,
            days: days,
            displayText: isActive ? '进行中' : `还有${days}天`,
            status: isActive ? 'active' : 'upcoming',
            icon: this.getHolidayIcon(name),
        };
    }

    getHolidayIcon(name) {
        const icons = {
            '春节': '🧧', '圣诞': '🎄', '中秋': '🌕', '端午': '🎏', '国庆': '🇨🇳',
            '元宵': '🏮', '清明': '🌸', '元旦': '🎆', '劳动': '👷', '儿童': '🎈',
            '情人': '❤️', '母亲': '👨‍👩‍👧‍👦', '父亲': '👨‍👩‍👧‍👦', '教师': '👨‍🏫', '妇女': '👩',
            '青年': '👦', '重阳': '🌼'
        };
        for (const [key, icon] of Object.entries(icons)) {
            if (name.includes(key)) return icon;
        }
        return '🎉';
    }

    getDefaultHoliday() {
        return {
            current: null,
            next: { name: '下一个节日', days: null, displayText: '计算中...', status: 'unknown', icon: '🎉' }
        };
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
            const cached = this.getCachedHolidayData();
            if (cached) this.updateHolidayDisplay(cached.current || cached.next);
        }
    }

    async checkHolidayExpiration() {
        const cached = this.getCachedHolidayData();
        if (!cached || !cached.current) return;
        const today = new Date();
        today.setHours(0,0,0,0);
        if (cached.current.status === 'active') {
            const lastUpdate = new Date(cached.timestamp);
            lastUpdate.setHours(0,0,0,0);
            if (today > lastUpdate) {
                localStorage.removeItem('holidayDataCache');
                this.currentHoliday = null;
            }
        }
    }

    cacheHolidayData(holidays) {
        try {
            const expiresAt = holidays.current ? new Date(new Date().setHours(24,0,0,0)).getTime() : Date.now() + 86400000;
            const cache = { current: holidays.current, next: holidays.next, timestamp: Date.now(), expiresAt };
            localStorage.setItem('holidayDataCache', JSON.stringify(cache));
        } catch (error) {}
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
        } catch { return null; }
    }

    scheduleHolidayRefresh(holiday) {
        if (!holiday || holiday.status !== 'active') return;
        if (this.holidayRefreshTimer) clearTimeout(this.holidayRefreshTimer);
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const delay = tomorrow.getTime() - now.getTime();
        this.holidayRefreshTimer = setTimeout(async () => {
            localStorage.removeItem('holidayDataCache');
            await this.setupHolidayCountdown();
            const toast = window.Starlink?.toast || window.toast;
            if (toast?.show) toast.show('节日数据已更新', 'info');
        }, delay + 1000);
    }

    updateHolidayDisplay(holidayInfo) {
        const nameEl = document.getElementById('holidayName');
        const countdownEl = document.getElementById('holidayCountdown');
        if (!nameEl || !countdownEl) return;
        if (!holidayInfo) {
            nameEl.innerHTML = '<span class="holiday-icon">🎉</span> 下一个节日';
            countdownEl.textContent = '计算中...';
            countdownEl.classList.add('status-unknown');
            return;
        }
        nameEl.innerHTML = `<span class="holiday-icon">${holidayInfo.icon}</span> ${Utils.escapeHtml(holidayInfo.name)}`;
        countdownEl.textContent = holidayInfo.displayText;
        this.setHolidayStyle(countdownEl, holidayInfo);
        if (holidayInfo.status === 'active') countdownEl.classList.add('active-countdown');
        else countdownEl.classList.remove('active-countdown');
    }

    setHolidayStyle(element, holidayInfo) {
        element.classList.remove('active-countdown', 'status-3days', 'status-7days', 'status-more', 'status-unknown');
        if (holidayInfo.status === 'active') element.classList.add('active-countdown');
        else if (holidayInfo.days !== null && holidayInfo.days <= 3) element.classList.add('status-3days');
        else if (holidayInfo.days !== null && holidayInfo.days <= 7) element.classList.add('status-7days');
        else if (holidayInfo.days !== null && holidayInfo.days > 7) element.classList.add('status-more');
        else element.classList.add('status-unknown');
    }

    loadWoodenFishData() {
        let fishData = Storage.get('woodenFish') || { merit:0, luck:0, wealth:0, health:0, lastUpdate: new Date().toDateString() };
        if (fishData.lastUpdate !== new Date().toDateString()) {
            fishData.lastUpdate = new Date().toDateString();
            Storage.set('woodenFish', fishData);
        }
        this.updateFishCounts(fishData);
    }

    updateFishCounts(fishData) {
        const ids = { merit:'meritCount', luck:'luckCount', wealth:'wealthCount', health:'healthCount' };
        for (const [type, id] of Object.entries(ids)) {
            const el = document.getElementById(id);
            if (el) el.textContent = fishData[type] || 0;
        }
    }

    bindEvents() {
        if (this.eventBound) return;
        document.querySelectorAll('.fish-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', this.handleFishClick.bind(this));
        });
        document.addEventListener('keydown', (e) => {
            if (!e.altKey) return;
            const typeMap = { '1':'merit', '2':'luck', '3':'wealth', '4':'health' };
            const type = typeMap[e.key];
            if (type) {
                this.incrementFishCount(type, 1);
                const btn = document.querySelector(`.fish-btn[data-type="${type}"]`);
                if (btn) {
                    this.showFishEffect(btn);
                    this.playWoodenFishSound();
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
        if (navigator.vibrate) navigator.vibrate(20);
    }

    incrementFishCount(type, amount = 1) {
        const fishData = Storage.get('woodenFish') || { merit:0, luck:0, wealth:0, health:0 };
        fishData[type] = (fishData[type] || 0) + amount;
        Storage.set('woodenFish', fishData);
        this.updateFishCounts(fishData);
    }

    showFishEffect(element) {
        const type = element.dataset.type;
        const texts = { merit:'功德+1', luck:'幸运+1', wealth:'财富+1', health:'健康+1' };
        const colors = { merit:'#70c1ff', luck:'#ff9e9e', wealth:'#ffd670', health:'#8ddf8d' };
        const rect = element.getBoundingClientRect();
        const effect = document.createElement('div');
        effect.innerHTML = texts[type] || '+1';
        effect.className = 'fish-effect';
        effect.style.cssText = `
            position: fixed; left: ${rect.left + rect.width/2}px; top: ${rect.top + rect.height/2}px;
            transform: translate(-50%, -50%); color: ${colors[type] || '#fff'}; font-weight: 800;
            pointer-events: none; z-index: 1000; animation: floatUp 1.2s ease-out forwards;
            font-size: 16px; white-space: nowrap; background: rgba(255,255,255,0.9);
            padding: 4px 8px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            opacity: 0;
        `;
        document.body.appendChild(effect);
        requestAnimationFrame(() => effect.style.opacity = '1');
        setTimeout(() => effect.remove(), 1200);
    }

    startTimers() {
        this.updateTime();
        this.updateGreeting();
        setInterval(() => {
            this.updateTime();
            this.updateGreeting();
        }, 1000);
        setInterval(() => this.checkAndUpdateHoliday(), 5 * 60 * 1000);
        setInterval(() => {
            if (new Date().getMinutes() === 0) this.checkAndUpdateHoliday();
        }, 60 * 1000);
    }

    async checkAndUpdateHoliday() {
        const cached = this.getCachedHolidayData();
        if (!cached) return this.setupHolidayCountdown();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (cached.current && cached.current.status === 'active') {
            const lastUpdate = new Date(cached.timestamp);
            lastUpdate.setHours(0,0,0,0);
            if (today > lastUpdate) {
                localStorage.removeItem('holidayDataCache');
                return this.setupHolidayCountdown();
            }
        }
        if (cached.expiresAt - Date.now() < 600000) await this.setupHolidayCountdown();
    }

    updateTime() {
        const now = new Date();
        const timeEl = document.getElementById('currentTime');
        const dateEl = document.getElementById('currentDate');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
    }

    updateGreeting() {
        const hour = new Date().getHours();
        let greeting, emoji;
        if (hour >= 5 && hour < 9) { greeting = '早上好，朋友！'; emoji = '🍞'; }
        else if (hour >= 9 && hour < 12) { greeting = '上午好，朋友！'; emoji = '☀️'; }
        else if (hour >= 12 && hour < 14) { greeting = '中午好，朋友！'; emoji = '🍱'; }
        else if (hour >= 14 && hour < 18) { greeting = '下午好，朋友！'; emoji = '🌤️'; }
        else if (hour >= 18 && hour < 22) { greeting = '晚上好，朋友！'; emoji = '🍻'; }
        else { greeting = '夜深啦，朋友早点休息！'; emoji = '🌌'; }
        const el = document.getElementById('greeting');
        if (el) el.innerHTML = `<span class="greeting-emoji">${emoji}</span> <span class="greeting-text-content">${Utils.escapeHtml(greeting)}</span>`;
    }

    async refreshHolidayData() {
        try {
            localStorage.removeItem('holidayDataCache');
            const el = document.getElementById('holidayCountdown');
            if (el) { el.textContent = '刷新中...'; el.classList.add('status-unknown'); }
            await this.setupHolidayCountdown();
            const toast = window.Starlink?.toast || window.toast;
            if (toast?.show) toast.show('节日数据已刷新', 'success');
        } catch (error) {
            const toast = window.Starlink?.toast || window.toast;
            if (toast?.show) toast.show('刷新失败，请重试', 'error');
        }
    }

    getFishStats() { return Storage.get('woodenFish') || { merit:0, luck:0, wealth:0, health:0 }; }

    resetFishData() {
        if (confirm('确定要重置所有木鱼计数吗？')) {
            Storage.set('woodenFish', { merit:0, luck:0, wealth:0, health:0, lastUpdate: new Date().toDateString() });
            this.updateFishCounts(Storage.get('woodenFish'));
            const toast = window.Starlink?.toast || window.toast;
            if (toast?.show) toast.show('木鱼计数已重置', 'success');
        }
    }

    destroy() {
        if (this.holidayRefreshTimer) clearTimeout(this.holidayRefreshTimer);
        if (this.holidayCheckTimer) clearInterval(this.holidayCheckTimer);
        if (this.audioCtx) this.audioCtx.close().catch(()=>{});
        this.initialized = false;
        this.eventBound = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.greeting) window.Starlink.greeting = new GreetingModule();
    window.greetingModule = window.Starlink.greeting;
    const refreshBtn = document.getElementById('refreshHolidayBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => window.Starlink.greeting.refreshHolidayData());
});
window.GreetingModule = GreetingModule;