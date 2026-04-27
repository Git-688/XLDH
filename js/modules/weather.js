/**
 * 天气模块 - 重构版（提取样式到 CSS 类，减少内联维护）
 * @class WeatherModule
 */
export default class WeatherModule {
    constructor() {
        this.currentCity = '北京';
        this.weatherData = null;
        this.modalElement = null;
        this.isShowing = false;
        this.refreshInterval = null;
        this.autoRefreshTime = 10 * 60 * 1000;
        this.isLocationRequested = false;
        this.initialized = false;
        this.isLoading = false;
        this.useAutoLocation = false;
        this.escHandler = null;
        this.showModalBound = this.showModal.bind(this);

        // 安全 escapeHtml
        this._escapeHtml = (text) => {
            if (window.Utils && typeof window.Utils.escapeHtml === 'function') {
                return window.Utils.escapeHtml(text);
            }
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        };
    }

    async init() {
        if (this.initialized) return;
        this.injectStyles();
        this.bindGlobalEvents();
        this.startAutoRefresh();
        await this.tryAutoLocation();
        this.initialized = true;
    }

    // ===== 注入样式表 =====
    injectStyles() {
        if (document.getElementById('weather-module-styles')) return;
        const css = `
            .weather-modal-card {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
                z-index: 10000; opacity: 0; transition: opacity 0.2s ease; padding: 20px; box-sizing: border-box; pointer-events: auto;
            }
            .weather-modal-content {
                max-width: 350px; width: 100%; background: #fff; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(20px) scale(0.95);
                opacity: 0; transition: transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s ease;
                max-height: 450px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e8e8e8;
            }
            .weather-header {
                padding: 12px 16px; background: #f8f9fa; border-bottom: 1px solid #e8e8e8;
                display: flex; justify-content: space-between; align-items: center;
            }
            .weather-title { display: flex; align-items: center; gap: 6px; }
            .weather-title span { font-size:14px; font-weight:600; }
            .auto-refresh-label { font-size:10px; color:#999; margin-left:8px; }
            .weather-header-buttons { display: flex; align-items: center; gap: 6px; }
            .weather-header-btn {
                background: none; border: none; color: #666; cursor: pointer; padding: 4px;
                border-radius: 4px; transition: all 0.2s ease; width: 28px; height: 28px;
                display: flex; align-items: center; justify-content: center; font-size: 12px;
            }
            .weather-body {
                overflow-y: auto; overflow-x: hidden; flex: 1;
                scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch;
            }
            .weather-body::-webkit-scrollbar { display: none; }

            .weather-current { padding:16px 16px 12px; border-bottom:1px solid #eee; text-align:center; }
            .weather-city { font-size:12px; color:#666; margin-bottom:6px; display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap; }
            .weather-main { display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:12px; }
            .weather-icon { font-size:36px; color:#4361ee; }
            .weather-temp-info { display:flex; flex-direction:column; align-items:center; }
            .weather-desc { font-size:14px; color:#333; font-weight:500; margin-bottom:4px; }
            .temp-details { display:flex; gap:12px; align-items:center; }
            .temp-item { text-align:center; }
            .temp-label { font-size:11px; color:#999; margin-bottom:2px; }
            .temp-value { font-size:18px; font-weight:600; }
            .temp-day { color:#ff6b6b; }
            .temp-night { color:#4dabf7; }
            .weather-tips {
                margin-top:12px; padding:8px 12px; background:#f8f9fa; border-radius:6px;
                font-size:12px; color:#666; border-left:3px solid #4361ee;
            }

            .weather-details { padding:16px; display:grid; grid-template-columns: repeat(2,1fr); gap:12px; }
            .weather-detail { text-align:center; padding:12px; background:#f8f9fa; border-radius:8px; }
            .detail-icon { font-size:16px; color:#4361ee; margin-bottom:8px; }
            .detail-label { font-size:11px; color:#999; margin-bottom:4px; }
            .detail-value { font-size:14px; color:#333; font-weight:500; }

            .weather-forecast { padding:0 16px 16px; }
            .forecast-title { font-size:12px; color:#666; margin:12px 0 8px; display:flex; align-items:center; gap:6px; }
            .forecast-days { display:grid; grid-template-columns: repeat(3,1fr); gap:8px; }
            .forecast-day { text-align:center; padding:12px 6px; background:#f8f9fa; border-radius:8px; }
            .forecast-day-name { font-size:12px; color:#666; margin-bottom:6px; font-weight:500; }
            .forecast-day-icon { font-size:16px; color:#4361ee; margin-bottom:6px; }
            .forecast-day-weather { font-size:11px; color:#333; margin-bottom:6px; }
            .forecast-day-temp { display:flex; justify-content:center; gap:4px; font-size:12px; }

            .weather-footer { padding:12px 16px; border-top:1px solid #eee; text-align:center; }
            .weather-footer-text { font-size:11px; color:#999; display:flex; align-items:center; justify-content:center; gap:6px; }

            .error-state, .loading-state { padding:40px 20px; text-align:center; }
            .loading-spinner {
                display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3;
                border-top: 2px solid #4361ee; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom:10px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .retry-btn {
                padding: 6px 16px; font-size: 12px; background: #4361ee; color: white; border: none;
                border-radius: 4px; cursor: pointer; transition: background-color 0.2s ease;
            }
            .location-btn {
                padding: 6px 16px; font-size: 12px; background: #52c41a; color: white; border: none;
                border-radius: 4px; cursor: pointer; transition: background-color 0.2s ease;
            }

            /* 城市提示弹窗专用 */
            .city-prompt-modal {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); display: flex; align-items: center;
                justify-content: center; z-index: 10001; opacity: 0;
                transition: opacity 0.2s ease; padding: 20px; box-sizing: border-box;
            }
            .city-prompt-content {
                background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 20px; width: 300px; max-width: 100%;
                transform: translateY(20px); transition: transform 0.3s ease, opacity 0.3s ease;
                opacity: 0;
            }
        `;
        const style = document.createElement('style');
        style.id = 'weather-module-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ===== 其余代码与原 weather.js 逻辑一致，但创建元素时使用 class 而非内联样式 =====
    async tryAutoLocation() {
        const savedCity = this.getSavedCity();
        if (savedCity) {
            this.currentCity = savedCity;
            return;
        }
        if (!navigator.geolocation) {
            if (window.toast) window.toast.show('浏览器不支持地理定位，已使用默认城市', 'warning');
            return;
        }
        try {
            this.useAutoLocation = true;
            await this.getCurrentPosition();
        } catch (error) {
            this.useAutoLocation = false;
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (this.isLocationRequested) {
                reject(new Error('位置请求已在进行中'));
                return;
            }
            this.isLocationRequested = true;
            const timeoutId = setTimeout(() => {
                this.isLocationRequested = false;
                reject(new Error('获取位置超时'));
            }, 5000);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    clearTimeout(timeoutId);
                    this.isLocationRequested = false;
                    const { latitude, longitude } = position.coords;
                    try {
                        const city = await this.reverseGeocode(latitude, longitude);
                        if (city) {
                            this.setCity(city);
                            if (window.toast) window.toast.show(`已定位到: ${city}`, 'success');
                        }
                        resolve(city);
                    } catch (error) { reject(error); }
                },
                (error) => {
                    clearTimeout(timeoutId);
                    this.isLocationRequested = false;
                    const messages = { 1:'用户拒绝了位置请求', 2:'无法获取位置信息', 3:'获取位置超时' };
                    const msg = messages[error.code] || '位置获取失败';
                    if (window.toast) window.toast.show(msg, 'warning');
                    reject(new Error(msg));
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
            );
        });
    }

    async reverseGeocode(latitude, longitude) {
        const url = `https://api.pearktrue.cn/api/map/?lat=${latitude}&lng=${longitude}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
        const data = await response.json();
        if (data.code === 200 && data.data) {
            const address = data.data.address || '';
            if (address) {
                const city = this.extractCityFromAddress(address);
                if (city) return city;
                throw new Error('无法解析城市信息');
            }
            throw new Error('地址信息为空');
        }
        throw new Error(data.msg || '逆地理编码失败');
    }

    extractCityFromAddress(address) {
        if (!address) return null;
        const cityMatch = address.match(/([\u4e00-\u9fa5]+市)/);
        if (cityMatch) return cityMatch[1];
        const countyMatch = address.match(/([\u4e00-\u9fa5]+县)/);
        return countyMatch ? countyMatch[1] : address;
    }

    bindGlobalEvents() {
        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) weatherBtn.addEventListener('click', this.showModalBound);
    }

    saveCity(city) {
        try {
            localStorage.setItem('weather_city', city);
            localStorage.setItem('weather_use_auto_location', this.useAutoLocation ? 'true' : 'false');
        } catch (e) {}
    }

    getSavedCity() {
        const city = localStorage.getItem('weather_city');
        const useAuto = localStorage.getItem('weather_use_auto_location') === 'true';
        this.useAutoLocation = useAuto;
        return city;
    }

    async loadWeatherData() {
        this.weatherData = await this.fetchWeatherData(this.currentCity);
        return true;
    }

    async fetchWeatherData(city) {
        const url = `https://www.cunyuapi.top/weather?city=${encodeURIComponent(city)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
        const data = await response.json();
        return this.parseWeatherData(data);
    }

    parseWeatherData(data) {
        if (!data || !data.city_info || !data.forecasts || !data.forecasts[0]) {
            throw new Error('天气数据格式错误');
        }
        const cityInfo = data.city_info;
        const today = data.forecasts[0];

        const getWeatherIcon = (condition) => {
            const iconMap = {
                '晴':'fas fa-sun','多云':'fas fa-cloud-sun','阴':'fas fa-cloud','雾':'fas fa-smog',
                '雨':'fas fa-cloud-rain','小雨':'fas fa-cloud-rain','中雨':'fas fa-cloud-showers-heavy',
                '大雨':'fas fa-cloud-showers-heavy','暴雨':'fas fa-poo-storm','雪':'fas fa-snowflake',
                '小雪':'fas fa-snowflake','中雪':'fas fa-snowflake','大雪':'fas fa-snowman',
                '雷阵雨':'fas fa-bolt','阵雨':'fas fa-cloud-showers-heavy','毛毛雨':'fas fa-cloud-rain'
            };
            for (const [key, icon] of Object.entries(iconMap)) {
                if (condition.includes(key)) return icon;
            }
            return 'fas fa-cloud-sun';
        };

        const formatUpdateTime = (timeStr) => {
            if (!timeStr) return '刚刚';
            try {
                return new Date(timeStr).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', hour12:false });
            } catch { return '刚刚'; }
        };

        const getWeatherTips = (weather) => {
            const tips = [];
            const dayTemp = parseInt(today.temperature.day) || 0;
            const nightTemp = parseInt(today.temperature.night) || 0;
            if (weather.includes('雨')) tips.push('今日有雨，请携带雨具');
            if (weather.includes('雪')) tips.push('路面可能结冰，请注意交通安全');
            if (weather.includes('雾')) tips.push('能见度较低，请注意行车安全');
            if (weather.includes('晴')) tips.push('天气晴朗，适宜户外活动');
            if (weather.includes('阴')||weather.includes('多云')) tips.push('天气适宜，注意适当增减衣物');
            if (dayTemp > 30) tips.push('天气炎热，注意防暑降温');
            if (dayTemp < 5) tips.push('天气寒冷，注意保暖');
            if (dayTemp - nightTemp > 10) tips.push('昼夜温差较大，请注意增减衣物');
            return tips.length > 0 ? tips.join('；') : '天气信息更新，请注意查看详情';
        };

        const generateForecasts = (forecasts) => {
            const result = [];
            const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
            for (let i = 0; i < Math.min(3, forecasts.length); i++) {
                const forecast = forecasts[i];
                const date = new Date(forecast.date);
                const dayName = i === 0 ? '今天' : i === 1 ? '明天' : weekdays[date.getDay()];
                result.push({
                    day: dayName,
                    weather: forecast.weather.day,
                    icon: getWeatherIcon(forecast.weather.day),
                    dayTemp: forecast.temperature.day + '°C',
                    nightTemp: forecast.temperature.night + '°C',
                    wind: forecast.wind.day.direction + '风 ' + forecast.wind.day.power + '级'
                });
            }
            return result;
        };

        const forecasts = generateForecasts(data.forecasts);

        return {
            city: cityInfo.city.replace('市',''),
            dayTemperature: today.temperature.day + '°C',
            nightTemperature: today.temperature.night + '°C',
            weather: today.weather.day,
            weatherIcon: getWeatherIcon(today.weather.day),
            humidity: '--',
            wind: today.wind.day.direction + '风 ' + today.wind.day.power + '级',
            visibility: '--',
            airQuality: '--',
            airColor: '#1890ff',
            updateTime: formatUpdateTime(cityInfo.reporttime),
            warning: null, warningColor: null, warningTime: null,
            tips: getWeatherTips(today.weather.day),
            forecasts: forecasts
        };
    }

    showModal() {
        if (this.isLoading) return;
        this.closeOtherModals();
        this.createModal();
        this.modalElement.style.display = 'flex';
        this.isShowing = true;
        requestAnimationFrame(() => {
            this.modalElement.style.opacity = '1';
            const content = this.modalElement.querySelector('.weather-modal-content');
            if (content) {
                content.style.transform = 'translateY(0) scale(1)';
                content.style.opacity = '1';
            }
        });
        if (window.app) window.app.registerModal(this);
        this.isLoading = true;
        this.loadWeatherData().then(() => {
            this.updateModalContent();
            if (window.toast) window.toast.show('天气数据加载成功', 'success');
        }).catch(() => {
            this.updateModalContent();
            if (window.toast) window.toast.show('天气数据加载失败，请稍后重试', 'error');
        }).finally(() => { this.isLoading = false; });
    }

    createModal() {
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'weather-modal-card';
        this.modalElement.innerHTML = `
            <div class="weather-modal-content">
                <div class="weather-header">
                    <div class="weather-title">
                        <span>天气小贴士</span>
                        ${this.useAutoLocation ? '<span style="font-size:10px;padding:2px 6px;background:#e6f7ff;color:#1890ff;border-radius:10px;">定位</span>' : ''}
                        <span class="auto-refresh-label"><i class="fas fa-sync-alt" style="font-size:9px;margin-right:3px;"></i>10分钟刷新</span>
                    </div>
                    <div class="weather-header-buttons">
                        <button class="weather-header-btn" id="changeCityBtn" title="切换城市"><i class="fas fa-exchange-alt"></i></button>
                        <button class="weather-header-btn" id="weatherLocationBtn" title="重新定位"><i class="fas fa-location-crosshairs"></i></button>
                        <button class="weather-header-btn" id="weatherCloseBtn"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="weather-body" id="weatherBody">
                    <div class="loading-state"><div class="loading-spinner"></div><p style="font-size:12px;color:#666;margin-top:10px;">正在加载天气数据...</p></div>
                </div>
            </div>
        `;
        document.body.appendChild(this.modalElement);
        this.bindEvents();
    }

    renderModalContent() {
        if (!this.weatherData) {
            return `
                <div class="error-state">
                    <div style="font-size:24px;color:#ff4d4f;margin-bottom:10px;"><i class="fas fa-exclamation-triangle"></i></div>
                    <p style="font-size:12px;color:#666;margin-bottom:8px;">天气数据加载失败</p>
                    <p style="font-size:11px;color:#999;margin-bottom:12px;">请检查网络连接或稍后重试</p>
                    <div style="display:flex;gap:8px;justify-content:center;">
                        <button class="retry-btn" id="weatherRetryBtn"><i class="fas fa-redo" style="margin-right:6px;"></i>重新加载</button>
                        <button class="location-btn" id="weatherManualLocationBtn"><i class="fas fa-location-crosshairs" style="margin-right:6px;"></i>重新定位</button>
                    </div>
                </div>
            `;
        }
        const w = this.weatherData;
        const e = this._escapeHtml;

        return `
            <div class="weather-current">
                <div class="weather-city"><i class="fas fa-location-dot" style="font-size:11px;"></i> ${e(w.city)} <span style="font-size:11px;color:#999;margin-left:4px;">${e(w.updateTime)}更新</span></div>
                <div class="weather-main">
                    <div class="weather-icon"><i class="${w.weatherIcon}"></i></div>
                    <div class="weather-temp-info">
                        <div class="weather-desc">${e(w.weather)}</div>
                        <div class="temp-details">
                            <div class="temp-item"><div class="temp-label">白天</div><div class="temp-value temp-day">${e(w.dayTemperature)}</div></div>
                            <div style="color:#ccc;font-size:12px;">/</div>
                            <div class="temp-item"><div class="temp-label">夜间</div><div class="temp-value temp-night">${e(w.nightTemperature)}</div></div>
                        </div>
                    </div>
                </div>
                ${w.tips ? `<div class="weather-tips"><i class="fas fa-lightbulb" style="font-size:11px;margin-right:6px;color:#4361ee;"></i>${e(w.tips)}</div>` : ''}
            </div>
            <div class="weather-details">
                <div class="weather-detail"><div class="detail-icon"><i class="fas fa-wind"></i></div><div class="detail-label">风向风力</div><div class="detail-value">${e(w.wind)}</div></div>
                <div class="weather-detail"><div class="detail-icon"><i class="fas fa-temperature-high"></i></div><div class="detail-label">体感温度</div><div class="detail-value">${e(w.dayTemperature)}</div></div>
            </div>
            <div class="weather-forecast">
                <div class="forecast-title"><i class="fas fa-calendar-alt" style="font-size:11px;color:#4361ee;"></i>未来几天预报</div>
                <div class="forecast-days">
                    ${w.forecasts.map(day => `
                        <div class="forecast-day">
                            <div class="forecast-day-name">${e(day.day)}</div>
                            <div class="forecast-day-icon"><i class="${day.icon}"></i></div>
                            <div class="forecast-day-weather">${e(day.weather)}</div>
                            <div class="forecast-day-temp"><span style="color:#ff6b6b;">${e(day.dayTemp)}</span><span style="color:#ccc;">/</span><span style="color:#4dabf7;">${e(day.nightTemp)}</span></div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="weather-footer"><div class="weather-footer-text"><i class="fas fa-circle-info" style="font-size:10px;"></i>点击“切换城市”可手动设置，点击“定位”图标可重新获取位置</div></div>
        `;
    }

    bindEvents() {
        if (!this.modalElement) return;
        this.modalElement.querySelector('#weatherCloseBtn')?.addEventListener('click', (e) => { e.stopPropagation(); this.hide(); });
        this.modalElement.querySelector('#changeCityBtn')?.addEventListener('click', (e) => { e.stopPropagation(); this.showCityPrompt(); });
        this.modalElement.querySelector('#weatherLocationBtn')?.addEventListener('click', async (e) => { e.stopPropagation(); await this.handleLocationRefresh(); });
        this.modalElement.addEventListener('click', (e) => { if (e.target === this.modalElement) this.hide(); });
        this.escHandler = (e) => { if (e.key === 'Escape' && this.isShowing) this.hide(); };
        document.addEventListener('keydown', this.escHandler);
    }

    showCityPrompt() {
        // 简化为 class 方式，不再全内联
        const modal = document.createElement('div');
        modal.className = 'city-prompt-modal';
        modal.innerHTML = `
            <div class="city-prompt-content" style="transform:translateY(20px);opacity:0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;"><i class="fas fa-exchange-alt" style="color:#4361ee;"></i><h3 style="margin:0;font-size:16px;font-weight:600;">切换城市</h3></div>
                <div style="margin-bottom:16px;"><label style="display:block;margin-bottom:6px;font-size:12px;">请输入城市名称</label><input id="cityInput" value="${this._escapeHtml(this.currentCity)}" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"></div>
                <div style="margin-bottom:16px;"><p style="font-size:12px;">热门城市：</p><div style="display:flex;gap:6px;flex-wrap:wrap;">${['北京市','上海市','广州市','深圳市','杭州市','南京市','成都市','武汉市'].map(c=>`<button class="quick-city-btn" data-city="${c}" style="padding:6px 10px;background:#f8f9fa;border:1px solid #e8e8e8;border-radius:4px;font-size:12px;cursor:pointer;">${c}</button>`).join('')}</div></div>
                <div style="display:flex;gap:10px;justify-content:flex-end;"><button id="cancelCityBtn" style="padding:8px 16px;background:#f8f9fa;border:1px solid #ddd;border-radius:6px;cursor:pointer;">取消</button><button id="confirmCityBtn" style="padding:8px 20px;background:#4361ee;color:white;border:none;border-radius:6px;cursor:pointer;">确认切换</button></div>
            </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => { modal.style.opacity = '1'; const c = modal.querySelector('.city-prompt-content'); if(c){c.style.opacity='1';c.style.transform='translateY(0)';} });
        modal.querySelector('#confirmCityBtn').onclick = async () => {
            const newCity = modal.querySelector('#cityInput').value.trim();
            if (!newCity) return alert('请输入城市名称');
            this.useAutoLocation = false;
            this.setCity(newCity);
            try {
                await this.loadWeatherData(); this.updateModalContent(); this.hideCityPrompt(modal);
                if (window.toast) window.toast.show(`已切换到: ${newCity}`, 'success');
            } catch (e) { if (window.toast) window.toast.show('切换失败', 'error'); }
        };
        modal.querySelector('#cancelCityBtn').onclick = () => this.hideCityPrompt(modal);
        modal.querySelectorAll('.quick-city-btn').forEach(b => b.onclick = () => modal.querySelector('#cityInput').value = b.dataset.city);
    }

    hideCityPrompt(modal) {
        modal.style.opacity = '0';
        const c = modal.querySelector('.city-prompt-content');
        if (c) { c.style.opacity = '0'; c.style.transform = 'translateY(20px)'; }
        setTimeout(() => modal.remove(), 300);
    }

    async handleLocationRefresh() {
        try {
            if (window.toast) window.toast.show('正在获取位置...', 'info');
            await this.getCurrentPosition();
            await this.loadWeatherData();
            this.updateModalContent();
            if (window.toast) window.toast.show('位置已更新', 'success');
        } catch { if (window.toast) window.toast.show('定位失败', 'error'); }
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadWeatherData();
                if (this.isShowing && this.modalElement) this.updateModalContent();
            } catch {}
        }, this.autoRefreshTime);
    }

    updateModalContent() {
        const body = this.modalElement?.querySelector('#weatherBody');
        if (body) {
            body.innerHTML = this.renderModalContent();
            body.querySelector('#weatherRetryBtn')?.addEventListener('click', async () => { await this.loadWeatherData(); this.updateModalContent(); });
            body.querySelector('#weatherManualLocationBtn')?.addEventListener('click', async () => await this.handleLocationRefresh());
        }
    }

    closeOtherModals() {
        if (window.sidebar?.isVisible?.()) window.sidebar.hide();
        if (window.newSearchModule?.isOpen) window.newSearchModule.hide();
        if (window.app?.components?.navbar) window.app.components.navbar.hideMusicPlayer();
    }

    hide() {
        if (!this.isShowing || !this.modalElement) return;
        this.modalElement.style.opacity = '0';
        const c = this.modalElement.querySelector('.weather-modal-content');
        if (c) { c.style.transform = 'translateY(20px) scale(0.95)'; c.style.opacity = '0'; }
        setTimeout(() => { this.modalElement.style.display = 'none'; this.isShowing = false; if (window.app) window.app.unregisterModal(this); }, 200);
    }

    setCity(city) { this.currentCity = city; this.saveCity(city); this.weatherData = null; }
    getWeatherData() { return this.weatherData; }
    getCurrentCity() { return this.currentCity; }
}