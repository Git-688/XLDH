/* greeting.js - 精简版（问候语 + 日期时间 + 木鱼 + 节日倒计时） */
class GreetingModule {
    constructor() {
        if (window.Starlink?.greeting) return window.Starlink.greeting;
        this.initialized = false;
        this.eventBound = false;
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

    // ---------- 音频 ----------
    ensureAudioContext() {
        if (this.audioCtx) return this.audioCtx;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioCtx.state !== 'running') {
                this.audioCtx.suspend();
                const resumeCtx = () => {
                    if (this.audioCtx?.state === 'suspended') this.audioCtx.resume();
                    document.removeEventListener('click', resumeCtx);
                    document.removeEventListener('touchstart', resumeCtx);
                };
                document.addEventListener('click', resumeCtx);
                document.addEventListener('touchstart', resumeCtx);
            }
        } catch (e) {}
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

    // ---------- 节日数据 ----------
    async loadHolidayData() {
        try {
            const response = await Utils.safeFetch('https://xiaodi.ykxbl.top/Api/dsr.php?n=30', { timeout: 5000 });
            const data = await response.json();
            if (data?.code === 0 && data.data?.length) {
                return data.data.map(item => ({
                    name: item.title,
                    countdown: `${item.countdown}天`,
                    displayText: item.countdown === 0 ? '今日' : `${item.countdown}天`,
                    status: item.countdown === 0 ? 'active' : 'upcoming',
                    days: item.countdown,
                    icon: this.getHolidayIcon(item.title),
                    is_today: item.is_today || false,
                    date: item.date
                }));
            }
            return this.getDefaultHolidays();
        } catch (error) {
            Utils.handleApiError?.(error, '获取节日数据失败', false);
            return this.getDefaultHolidays();
        }
    }

    getDefaultHolidays() {
        return ['元旦','春节','清明节','端午节','中秋节','国庆节'].map(name => ({
            name, countdown: '计算中...', displayText: '计算中...',
            status: 'unknown', days: null, icon: this.getHolidayIcon(name), is_today: false
        }));
    }

    getHolidayIcon(name) {
        const map = {
            '春节':'🧧','圣诞':'🎄','中秋':'🌕','端午':'🎏','国庆':'🇨🇳','元宵':'🏮',
            '清明':'🌸','元旦':'🎆','劳动':'👷','儿童':'🎈','情人':'❤️','七夕':'❤️',
            '母亲':'👨‍👩‍👧‍👦','父亲':'👨‍👩‍👧‍👦','教师':'👨‍🏫','妇女':'👩','青年':'👦',
            '重阳':'🌼','腊八':'🥣','冬至':'🥟','高考':'📚','纪念日':'🕯️','献血':'🩸',
            '奥林匹克':'🏅','618':'🛒','京东':'🛒'
        };
        return map[name] || '🎉';
    }

    async setupHolidayCountdown() {
        try {
            await this.checkHolidayExpiration();
            const holidays = await this.loadHolidayData();
            const todayStr = new Date().toISOString().slice(0, 10);
            this.todayHolidays = holidays.filter(h => h.is_today || (h.date === todayStr && h.days === 0));
            this.nextHoliday = holidays.filter(h => h.days > 0).sort((a, b) => a.days - b.days)[0] || null;
            this.expanded = false;
            this.updateHolidayDisplay();
            this.cacheHolidayData();
        } catch (error) {
            console.error('设置节日倒计时失败:', error);
            const cached = this.getCachedHolidayData();
            if (cached) { this.todayHolidays = cached.todayHolidays || []; this.nextHoliday = cached.nextHoliday; this.updateHolidayDisplay(); }
        }
    }

    async checkHolidayExpiration() {
        const cached = this.getCachedHolidayData();
        if (cached) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (cached.timestamp && today > new Date(cached.timestamp)) {
                localStorage.removeItem('holidayDataCache');
            }
        }
    }

    cacheHolidayData() {
        try {
            localStorage.setItem('holidayDataCache', JSON.stringify({
                todayHolidays: this.todayHolidays,
                nextHoliday: this.nextHoliday,
                timestamp: Date.now(),
                expiresAt: Date.now() + 24 * 60 * 60 * 1000
            }));
        } catch (e) {}
    }

    getCachedHolidayData() {
        try {
            const cache = JSON.parse(localStorage.getItem('holidayDataCache'));
            return cache?.expiresAt && Date.now() < cache.expiresAt ? cache : null;
        } catch { return null; }
    }

    updateHolidayDisplay() {
        const primaryContainer = document.getElementById('primaryHolidayContainer');
        const secondaryContainer = document.getElementById('secondaryHolidaysList');
        const expandBtn = document.getElementById('expandHolidayBtn');
        if (!primaryContainer) return;

        let mainHoliday = this.todayHolidays[0] || this.nextHoliday;
        if (!mainHoliday) {
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

        const extraHolidays = this.todayHolidays.slice(1);
        if (extraHolidays.length) {
            if (expandBtn) {
                expandBtn.style.display = 'inline-flex';
                expandBtn.textContent = this.expanded ? '收起' : '展开';
                this.bindExpandButton(expandBtn);
            }
            if (secondaryContainer) {
                secondaryContainer.innerHTML = extraHolidays.map(h => `
                    <div class="secondary-holiday-item"><span class="secondary-name">${Utils.escapeHtml(h.name)}</span></div>
                `).join('');
                secondaryContainer.style.display = this.expanded ? 'flex' : 'none';
            }
        } else {
            if (expandBtn) expandBtn.style.display = 'none';
            if (secondaryContainer) { secondaryContainer.innerHTML = ''; secondaryContainer.style.display = 'none'; }
        }
    }

    toggleHolidayExpand() { this.expanded = !this.expanded; this.updateHolidayDisplay(); }

    bindExpandButton(btn) {
        if (!btn) return;
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleHolidayExpand(); });
    }

    // ---------- 木鱼 ----------
    loadWoodenFishData() {
        const fishData = Storage.get('woodenFish') || { merit: 0, luck: 0, wealth: 0, health: 0, lastUpdate: new Date().toDateString() };
        if (fishData.lastUpdate !== new Date().toDateString()) {
            fishData.lastUpdate = new Date().toDateString();
            Storage.set('woodenFish', fishData);
        }
        this.updateFishCounts(fishData);
    }

    updateFishCounts(fishData) {
        ['merit', 'luck', 'wealth', 'health'].forEach(type => {
            const el = document.getElementById(`${type}Count`);
            if (el) el.textContent = fishData[type] || 0;
        });
    }

    bindEvents() {
        if (this.eventBound) return;
        // 重新绑定木鱼按钮（避免重复监听）
        document.querySelectorAll('.fish-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        document.querySelectorAll('.fish-btn').forEach(btn => {
            btn.addEventListener('click', this.handleFishClick.bind(this), { once: false });
        });

        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                const type = { '1': 'merit', '2': 'luck', '3': 'wealth', '4': 'health' }[e.key];
                if (type) {
                    this.incrementFishCount(type, 1);
                    const btn = document.querySelector(`.fish-btn[data-type="${type}"]`);
                    if (btn) { this.showFishEffect(btn); this.playWoodenFishSound(); }
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
        const type = element.dataset.type;
        const textMap = { merit: '功德+1', luck: '幸运+1', wealth: '财富+1', health: '健康+1' };
        const colorMap = { merit: '#70c1ff', luck: '#ff9e9e', wealth: '#ffd670', health: '#8ddf8d' };
        const effect = document.createElement('div');
        effect.textContent = textMap[type] || '+1';
        effect.className = 'fish-effect';
        const rect = element.getBoundingClientRect();
        effect.style.cssText = `
            position:fixed;color:${colorMap[type] || '#FFFFFF'};font-weight:800;pointer-events:none;
            z-index:1000;animation:floatUp 1.2s ease-out forwards;font-size:16px;
            top:${rect.top + rect.height/2 + (Math.random()-0.5)*10}px;
            left:${rect.left + rect.width/2 + (Math.random()-0.5)*30}px;
            transform:translate(-50%,-50%);
            text-shadow:0 0 8px rgba(255,255,255,0.8),0 0 16px ${colorMap[type]}80;
            opacity:0;white-space:nowrap;
            background:rgba(255,255,255,0.9);padding:4px 8px;border-radius:4px;
            box-shadow:0 2px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(effect);
        effect.offsetHeight;
        effect.style.opacity = '1';
        setTimeout(() => effect.remove(), 1200);
    }

    // ---------- 定时器 ----------
    startTimers() {
        this.updateTime();
        this.updateGreeting();
        setInterval(() => { this.updateTime(); this.updateGreeting(); }, 1000);
        setInterval(() => this.checkAndUpdateHoliday(), 5 * 60 * 1000);
        setInterval(async () => {
            if (new Date().getMinutes() === 0) await this.checkAndUpdateHoliday();
        }, 60 * 1000);
    }

    async checkAndUpdateHoliday() {
        const cached = this.getCachedHolidayData();
        if (!cached || (cached.timestamp && new Date() > new Date(cached.timestamp))) {
            localStorage.removeItem('holidayDataCache');
            await this.setupHolidayCountdown();
            return;
        }
        if (cached.expiresAt - Date.now() < 10 * 60 * 1000) {
            await this.setupHolidayCountdown();
        }
    }

    updateTime() {
        const now = new Date();
        const timeEl = document.getElementById('currentTime');
        const dateEl = document.getElementById('currentDate');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
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
        localStorage.removeItem('holidayDataCache');
        await this.setupHolidayCountdown();
        window.toast?.show('节日数据已刷新', 'success');
    }

    getFishStats() { return Storage.get('woodenFish') || { merit: 0, luck: 0, wealth: 0, health: 0 }; }

    resetFishData() {
        if (!confirm('确定要重置所有木鱼计数吗？')) return;
        const fishData = { merit: 0, luck: 0, wealth: 0, health: 0, lastUpdate: new Date().toDateString() };
        Storage.set('woodenFish', fishData);
        this.updateFishCounts(fishData);
        window.toast?.show('木鱼计数已重置', 'success');
    }

    destroy() {
        if (this.audioCtx) { this.audioCtx.close().catch(() => {}); this.audioCtx = null; }
        this.initialized = false;
        this.eventBound = false;
    }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.greeting) window.Starlink.greeting = new GreetingModule();
    window.greetingModule = window.Starlink.greeting;
    
    const refreshBtn = document.getElementById('refreshHolidayBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => window.Starlink.greeting.refreshHolidayData());
});

window.GreetingModule = GreetingModule;