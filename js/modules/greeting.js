// 问候区模块 - 优化效果和显示（音效反馈版）
class GreetingModule {
    constructor() {
        this.initialized = false;
        this.eventBound = false;
        this.holidayRefreshTimer = null;
        this.holidayCheckTimer = null;
        this.currentHoliday = null;
        
        // 音频上下文
        this.audioCtx = null;
        this.audioInitialized = false;
        this.isAudioEnabled = false;
        
        this.init();
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

    initAudio() {
        if (this.audioCtx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.audioCtx = new AudioContext();
            this.audioInitialized = true;
            console.log('音频上下文初始化成功');
        } catch (error) {
            console.error('初始化音频上下文失败:', error);
        }
    }

    async resumeAudio() {
        if (!this.audioCtx) this.initAudio();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            try {
                await this.audioCtx.resume();
                this.isAudioEnabled = true;
            } catch (error) {
                console.warn('恢复音频上下文失败:', error);
            }
        } else if (this.audioCtx && this.audioCtx.state === 'running') {
            this.isAudioEnabled = true;
        }
    }

    playWoodenFishSound(type = 'merit') {
        if (!this.audioCtx || this.audioCtx.state !== 'running') return;
        try {
            const now = this.audioCtx.currentTime;
            const freqMap = { merit: 440, luck: 523.25, wealth: 659.25, health: 783.99 };
            const baseFreq = freqMap[type] || 440;
            
            const osc1 = this.audioCtx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.value = baseFreq;
            const osc2 = this.audioCtx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.value = baseFreq * 2;
            
            const gainNode = this.audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            const gainNode2 = this.audioCtx.createGain();
            gainNode2.gain.setValueAtTime(0.15, now);
            gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            
            osc1.connect(gainNode);
            osc2.connect(gainNode2);
            gainNode.connect(this.audioCtx.destination);
            gainNode2.connect(this.audioCtx.destination);
            
            osc1.start(now); osc1.stop(now + 0.08);
            osc2.start(now); osc2.stop(now + 0.06);
            
            osc1.onended = () => { osc1.disconnect(); gainNode.disconnect(); };
            osc2.onended = () => { osc2.disconnect(); gainNode2.disconnect(); };
        } catch (error) {
            console.error('播放音效失败:', error);
        }
    }

    handleResize() {
        const holidayNameEl = document.getElementById('holidayName');
        if (holidayNameEl) holidayNameEl.removeAttribute('title');
    }

    async loadHolidayData() {
        try {
            const response = await fetch('https://api.pearktrue.cn/api/countdownday/');
            const data = await response.json();
            return (data.code === 200 && data.data?.length) ? data.data : this.getDefaultHolidays();
        } catch {
            return this.getDefaultHolidays();
        }
    }

    getDefaultHolidays() {
        const year = new Date().getFullYear();
        return [`${year}年春节 计算中...`, `${year}年端午节 计算中...`, `${year}年中秋节 计算中...`, `${year}年国庆节 计算中...`];
    }

    processHolidayData(holidayData) {
        if (!holidayData?.length) return this.getDefaultHoliday();
        const now = new Date();
        let current = null, next = null, foundCurrent = false;
        for (const holidayStr of holidayData) {
            const holiday = this.parseSingleHoliday(holidayStr);
            if (!holiday) continue;
            if (holiday.status === 'active') { current = holiday; foundCurrent = true; continue; }
            if (foundCurrent) { next = holiday; break; }
            if (!next && holiday.days > 0) next = holiday;
        }
        if (!current && !next && holidayData.length) next = this.parseSingleHoliday(holidayData[0]);
        return { current, next };
    }

    parseSingleHoliday(holidayStr) {
        if (!holidayStr) return null;
        const match = holidayStr.match(/^(?:(\d{4})年)?(.+?)\s+(?:剩余)?(\d+天|进行中|\d+小时|\d+分钟)$/);
        if (!match) {
            const simpleMatch = holidayStr.match(/^(.+?)\s+(.+)$/);
            return simpleMatch ? this.createHolidayObject(simpleMatch[1], simpleMatch[2]) : null;
        }
        return this.createHolidayObject(match[2], match[3]);
    }

    createHolidayObject(name, countdown) {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        return {
            name, countdown,
            displayText: this.formatCountdown(countdown),
            status: countdown === '进行中' ? 'active' : 'upcoming',
            days: this.extractDays(countdown),
            hours: this.extractHours(countdown),
            icon: this.getHolidayIcon(name),
            expiresAt: countdown === '进行中' ? tomorrow.getTime() : null,
            raw: `${name} ${countdown}`
        };
    }

    formatCountdown(c) { return c === '进行中' ? '进行中' : c; }
    extractDays(c) { if (c === '进行中') return 0; const m = c.match(/(\d+)天/); return m ? parseInt(m[1]) : null; }
    extractHours(c) { const m = c.match(/(\d+)小时/); return m ? parseInt(m[1]) : null; }
    getDefaultHoliday() { return { current: null, next: { name: '下一个节日', countdown: '计算中...', displayText: '计算中...', status: 'unknown', days: null, icon: '🎉' } }; }

    getHolidayIcon(name) {
        if (name.includes('春节')) return '🧧'; if (name.includes('圣诞')) return '🎄';
        if (name.includes('中秋')) return '🌕'; if (name.includes('端午')) return '🎏';
        if (name.includes('国庆')) return '🇨🇳'; if (name.includes('元宵')) return '🏮';
        if (name.includes('清明')) return '🌸'; if (name.includes('元旦')) return '🎆';
        return '🎉';
    }

    async setupHolidayCountdown() {
        try {
            await this.checkHolidayExpiration();
            const holidayData = await this.loadHolidayData();
            const holidays = this.processHolidayData(holidayData);
            let display = holidays.current || holidays.next;
            this.updateHolidayDisplay(display);
            this.cacheHolidayData(holidays);
            if (holidays.current) this.scheduleHolidayRefresh(holidays.current);
        } catch (error) {
            console.error('设置节日倒计时失败:', error);
            const cached = this.getCachedHolidayData();
            if (cached) this.updateHolidayDisplay(cached.current || cached.next);
        }
    }

    async checkHolidayExpiration() {
        const cached = this.getCachedHolidayData();
        if (!cached?.current?.status === 'active') return;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastUpdate = new Date(cached.timestamp);
        const lastUpdateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
        if (today > lastUpdateDate) {
            localStorage.removeItem('holidayDataCache');
            this.currentHoliday = null;
        }
    }

    cacheHolidayData(holidays) {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const cache = {
            current: holidays.current, next: holidays.next, timestamp: Date.now(),
            expiresAt: holidays.current ? tomorrow.getTime() : Date.now() + 24*60*60*1000
        };
        localStorage.setItem('holidayDataCache', JSON.stringify(cache));
    }

    getCachedHolidayData() {
        try {
            const cache = JSON.parse(localStorage.getItem('holidayDataCache'));
            return Date.now() > cache.expiresAt ? null : cache;
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
            window.app?.showToast?.('节日数据已更新', 'info');
        }, delay + 1000);
    }

    updateHolidayDisplay(holiday) {
        const nameEl = document.getElementById('holidayName');
        const countdownEl = document.getElementById('holidayCountdown');
        if (!nameEl || !countdownEl) return;
        if (!holiday) {
            nameEl.innerHTML = '<span class="holiday-icon">🎉</span> 下一个节日';
            countdownEl.textContent = '计算中...';
            return;
        }
        nameEl.innerHTML = `<span class="holiday-icon">${holiday.icon}</span> ${holiday.name}`;
        countdownEl.textContent = holiday.displayText;
        this.setHolidayStyle(countdownEl, holiday);
    }

    setHolidayStyle(el, h) {
        el.classList.remove('active-countdown', 'status-3days', 'status-7days', 'status-more', 'status-unknown');
        if (h.status === 'active') el.classList.add('active-countdown');
        else if (h.days !== null && h.days <= 3) el.classList.add('status-3days');
        else if (h.days !== null && h.days <= 7) el.classList.add('status-7days');
        else if (h.days !== null && h.days > 7) el.classList.add('status-more');
        else el.classList.add('status-unknown');
    }

    loadWoodenFishData() {
        const fishData = Storage.get('woodenFish') || { merit:0, luck:0, wealth:0, health:0, lastUpdate: new Date().toDateString() };
        const today = new Date().toDateString();
        if (fishData.lastUpdate !== today) { fishData.lastUpdate = today; Storage.set('woodenFish', fishData); }
        this.updateFishCounts(fishData);
    }

    updateFishCounts(data) {
        ['merit','luck','wealth','health'].forEach(t => {
            const el = document.getElementById(t+'Count');
            if (el) el.textContent = data[t] || 0;
        });
    }

    bindEvents() {
        if (this.eventBound) return;
        document.querySelectorAll('.fish-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
        document.querySelectorAll('.fish-btn').forEach(btn => {
            btn.addEventListener('click', this.handleFishClick.bind(this));
        });
        document.addEventListener('keydown', e => {
            if (e.altKey) {
                const type = e.key === '1' ? 'merit' : e.key === '2' ? 'luck' : e.key === '3' ? 'wealth' : e.key === '4' ? 'health' : null;
                if (type) {
                    this.incrementFishCount(type, 1);
                    const btn = document.querySelector(`.fish-btn[data-type="${type}"]`);
                    if (btn) { this.showFishEffect(btn); this.playWoodenFishSound(type); }
                }
            }
        });
        this.eventBound = true;
    }

    handleFishClick(e) {
        e.preventDefault(); e.stopPropagation();
        const type = e.currentTarget.dataset.type;
        if (!this.audioCtx) this.initAudio();
        this.resumeAudio().then(() => this.playWoodenFishSound(type));
        this.incrementFishCount(type, 1);
        this.showFishEffect(e.currentTarget);
        navigator.vibrate?.(20);
    }

    incrementFishCount(type, amount = 1) {
        const fishData = Storage.get('woodenFish') || { merit:0, luck:0, wealth:0, health:0 };
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
        const colors = { merit: '#70c1ff', luck: '#ff9e9e', wealth: '#ffd670', health: '#8ddf8d' };
        effect.style.cssText = `position:fixed;color:${colors[type]};font-weight:800;pointer-events:none;z-index:1000;animation:floatUp 1.2s ease-out forwards;font-size:16px;top:${rect.top+rect.height/2}px;left:${rect.left+rect.width/2}px;transform:translate(-50%,-50%);text-shadow:0 0 8px rgba(255,255,255,0.8);opacity:0;white-space:nowrap;background:rgba(255,255,255,0.9);padding:4px 8px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.2);`;
        document.body.appendChild(effect);
        effect.offsetHeight;
        effect.style.opacity = '1';
        setTimeout(() => effect.remove(), 1200);
    }

    startTimers() {
        this.updateTime(); this.updateGreeting();
        setInterval(() => { this.updateTime(); this.updateGreeting(); }, 1000);
        setInterval(() => this.checkAndUpdateHoliday(), 5 * 60 * 1000);
    }

    async checkAndUpdateHoliday() {
        const cached = this.getCachedHolidayData();
        if (!cached) { await this.setupHolidayCountdown(); return; }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (cached.current?.status === 'active') {
            const lastUpdate = new Date(cached.timestamp);
            if (today > new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate())) {
                localStorage.removeItem('holidayDataCache');
                await this.setupHolidayCountdown();
                return;
            }
        }
        if (cached.expiresAt - Date.now() < 10 * 60 * 1000) await this.setupHolidayCountdown();
    }

    updateTime() {
        const now = new Date();
        const timeEl = document.getElementById('currentTime');
        const dateEl = document.getElementById('currentDate');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
    }

    updateGreeting() {
        const hour = new Date().getHours();
        let greeting = '', emoji = '';
        if (hour >= 5 && hour < 9) { greeting = '早上好，朋友！'; emoji = '🍞'; }
        else if (hour < 12) { greeting = '上午好，朋友！'; emoji = '☀️'; }
        else if (hour < 14) { greeting = '中午好，朋友！'; emoji = '🍱'; }
        else if (hour < 18) { greeting = '下午好，朋友！'; emoji = '🌤️'; }
        else if (hour < 22) { greeting = '晚上好，朋友！'; emoji = '🍻'; }
        else { greeting = '夜深啦，朋友早点休息！'; emoji = '🌌'; }
        const el = document.getElementById('greeting');
        if (el) el.innerHTML = `<span class="greeting-emoji">${emoji}</span> <span class="greeting-text-content">${greeting}</span>`;
    }

    async refreshHolidayData() {
        localStorage.removeItem('holidayDataCache');
        await this.setupHolidayCountdown();
        window.app?.showToast?.('节日数据已刷新', 'success');
    }

    destroy() {
        if (this.holidayRefreshTimer) clearTimeout(this.holidayRefreshTimer);
        if (this.audioCtx) { this.audioCtx.close(); this.audioCtx = null; }
        this.initialized = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.greetingModule = new GreetingModule();
    document.getElementById('refreshHolidayBtn')?.addEventListener('click', () => window.greetingModule.refreshHolidayData());
});
window.GreetingModule = GreetingModule;