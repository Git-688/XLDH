/* weather.js - 精简版（修复 todayWindDir 未定义） */
class WeatherModule {
    static CONFIG = { get API_BASE() { return Utils.getApiBase(); } };

    constructor() {
        if (window.Starlink?.weather) return window.Starlink.weather;
        
        this.currentCity = '北京';
        this.weatherData = null;
        this.modalElement = null;
        this.isShowing = false;
        this.refreshInterval = null;
        this.autoRefreshTime = 10 * 60 * 1000;
        this.initialized = false;
        this.isLoading = false;
        this.useAutoLocation = true;
        this.manualCity = null;
        this.manualProvince = null;
        this.escHandler = null;
        this.gpsAttempted = false;
        
        if (window.Starlink) window.Starlink.weather = this;
        window.weatherModule = this;
    }

    _escapeHtml(text) { return Utils.escapeHtml ? Utils.escapeHtml(text) : String(text).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
    _isDay() { const h = new Date().getHours(); return h >= 6 && h < 18; }

    _getMeteoconIconName(condition, isDay = true) {
        const map = [
            { match:'冰雹', icon:'hail' },
            { match:'雷阵雨', icon:'thunderstorms-extreme-rain' },
            { match:'暴雨', icon:'extreme-rain' },
            { match:'大雨', icon:'overcast-rain' },
            { match:'中雨', icon:'overcast-drizzle' },
            { match:'小雨', icon:'rain' },
            { match:'阵雨', icon:'partly-cloudy-day-rain' },
            { match:'大雪', icon:'extreme-snow' },
            { match:'中雪', icon:'overcast-snow' },
            { match:'小雪', icon:'partly-cloudy-day-snow' },
            { match:'雪', icon:'snow' },
            { match:'雾', icon:'fog' },
            { match:'沙尘暴', icon:'wind' },
            { match:'扬沙', icon:'wind' },
            { match:'多云', icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night' },
            { match:'阴', icon:'cloudy' },
            { match:'晴', icon: isDay ? 'clear-day' : 'clear-night' }
        ];
        const found = map.find(entry => condition.includes(entry.match));
        return found ? found.icon : (isDay ? 'clear-day' : 'clear-night');
    }

    _getMeteoconIconUrl(condition, isDay = true) {
        return `https://unpkg.com/@meteocons/svg/fill/${this._getMeteoconIconName(condition, isDay)}.svg`;
    }

    async init() {
        if (this.initialized) return;
        this.bindGlobalEvents();
        this.startAutoRefresh();
        await this.loadSavedCity();
        if (this.useAutoLocation) await this.tryGpsLocation();
        else if (this.manualCity) await this.loadWeatherDataByCity(this.manualCity);
        else await this.tryGpsLocation();
        this.initialized = true;
    }

    bindGlobalEvents() {
        const btn = document.getElementById('weatherBtn');
        if (btn && !btn._weatherBound) {
            btn._weatherBound = true;
            btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.showModal(); });
        }
    }

    loadSavedCity() {
        try {
            const useAuto = localStorage.getItem('weather_use_auto_location') === 'true';
            const manual = localStorage.getItem('weather_manual_city');
            if (!useAuto && manual) {
                this.currentCity = manual;
                this.manualCity = manual;
                this.manualProvince = localStorage.getItem('weather_manual_province') || null;
                this.useAutoLocation = false;
                return;
            }
            this.useAutoLocation = true;
            this.currentCity = localStorage.getItem('weather_city') || '北京';
        } catch (e) { console.error('加载城市设置失败:', e); }
    }

    saveCity(city, isManual = false, province = null) {
        try {
            if (isManual) {
                localStorage.setItem('weather_manual_city', city);
                if (province) localStorage.setItem('weather_manual_province', province);
                else localStorage.removeItem('weather_manual_province');
                this.manualCity = city;
                this.manualProvince = province;
                this.useAutoLocation = false;
                localStorage.removeItem('weather_city');
                localStorage.setItem('weather_use_auto_location', 'false');
            } else {
                localStorage.setItem('weather_city', city);
                localStorage.setItem('weather_use_auto_location', 'true');
                this.useAutoLocation = true;
                localStorage.removeItem('weather_manual_city');
                localStorage.removeItem('weather_manual_province');
            }
            this.currentCity = city;
        } catch (e) { console.error('保存城市失败:', e); }
    }

    async tryGpsLocation() {
        if (this.gpsAttempted) return;
        this.gpsAttempted = true;
        try {
            const position = await this.getCurrentPosition();
            await this.loadWeatherDataByLonLat(position.coords.longitude, position.coords.latitude);
        } catch (error) {
            console.error('GPS 定位失败:', error.message);
            this.useAutoLocation = false;
            window.toast?.show('无法自动定位，请手动选择城市', 'warning');
            if (!this.manualCity) setTimeout(() => this.showCityPrompt(), 500);
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject(new Error('浏览器不支持地理定位'));
            else navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
    }

    async loadWeatherDataByLonLat(lon, lat) {
        try {
            const url = `${Utils.getApiBase()}/weather/proxy?lon=${lon}&lat=${lat}`;
            const response = await Utils.safeFetch(url, { timeout: 10000 });
            const data = await response.json();
            if (data.code !== 200) throw new Error(data.msg || '获取天气数据失败');
            this.weatherData = this.parseWeatherData(data);
            if (this.weatherData.city) { this.currentCity = this.weatherData.city; this.saveCity(this.currentCity, false); }
            return true;
        } catch (error) {
            console.error('经纬度天气查询失败:', error);
            this.weatherData = null;
            throw error;
        }
    }

    async loadWeatherDataByCity(city) {
        try {
            const url = `${Utils.getApiBase()}/weather/proxy?city=${encodeURIComponent(city)}`;
            const response = await Utils.safeFetch(url, { timeout: 10000 });
            const data = await response.json();
            if (data.code !== 200) throw new Error(data.msg || '获取天气数据失败');
            this.weatherData = this.parseWeatherData(data);
            this.weatherData.city = city;
            this.currentCity = city;
            this.saveCity(city, true, null);
            return true;
        } catch (error) {
            console.error('城市天气查询失败:', error);
            this.weatherData = null;
            throw error;
        }
    }

    async loadWeatherData() {
        if (this.useAutoLocation) await this.tryGpsLocation();
        else if (this.manualCity) await this.loadWeatherDataByCity(this.manualCity);
        else await this.tryGpsLocation();
        return true;
    }

    // ===== 修复：定义所有需要的变量 =====
    parseWeatherData(data) {
        if (!data || data.code !== 200) throw new Error(data?.msg || '天气数据格式错误');
        const isDay = this._isDay();
        let cityName = (data.name || data.shi || data.sheng || '未知').replace(/[市县区]$/, '');
        const todayWeather = data.weather1 || '未知';
        const todayTempDay = data.wd1 || '';
        const todayTempNight = data.wd2 || '';
        const todayWindDir = data.winddirection1 || '';   // 修复：定义 todayWindDir
        const todayWindScale = data.windleve1 || '';      // 修复：定义 todayWindScale

        const nowInfo = data.nowinfo || {};
        const currentTemp = nowInfo.temperature;
        const currentHumidity = nowInfo.humidity;
        const feelsLike = nowInfo.feelst;
        const pressure = nowInfo.pressure;
        const precipitation = nowInfo.precipitation;
        const windSpeed = nowInfo.windSpeed;
        const windDir = nowInfo.windDirection;
        const windScale = nowInfo.windScale;
        const alarms = data.alarm && Array.isArray(data.alarm) ? data.alarm : [];

        let sunTimes = null;
        if (data.suntimes?.length) {
            const todayStr = new Date().toISOString().slice(0, 10);
            sunTimes = data.suntimes.find(item => item.date === todayStr) || data.suntimes[0];
        }

        const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
        const forecasts = [];
        const today = new Date();
        for (let i = 0; i < 6; i++) {
            const dayData = data[`weatherday${i+2}`];
            if (!dayData) break;
            const forecastDate = new Date(today);
            forecastDate.setDate(today.getDate() + i + 1);
            const dayName = i === 0 ? '明天' : weekdays[forecastDate.getDay()];
            const weather = dayData.weather1 || '未知';
            forecasts.push({
                day: dayName,
                weather,
                iconUrl: this._getMeteoconIconUrl(weather, true),
                dayTemp: dayData.wd1 ? dayData.wd1 + '°C' : '--',
                nightTemp: dayData.wd2 ? dayData.wd2 + '°C' : '--',
                wind: (dayData.winddirection1 || '') + (dayData.windleve1 ? ' ' + dayData.windleve1 : '')
            });
        }

        const tips = this.generateWeatherTips(todayWeather, todayTempDay);

        return {
            city: cityName,
            province: data.sheng || '',
            country: data.guo || '',
            dayTemperature: todayTempDay ? todayTempDay + '°C' : '--',
            nightTemperature: todayTempNight ? todayTempNight + '°C' : '--',
            weather: todayWeather,
            weatherIconUrl: this._getMeteoconIconUrl(todayWeather, isDay),
            currentTemp: currentTemp !== undefined ? currentTemp + '°C' : (todayTempDay ? todayTempDay + '°C' : '--'),
            humidity: currentHumidity !== undefined ? currentHumidity + '%' : '--',
            wind: (todayWindDir ? todayWindDir + ' ' : '') + todayWindScale,
            visibility: nowInfo.visibility || '--',
            updateTime: data.uptime || nowInfo.uptime || '刚刚',
            tips,
            forecasts,
            feelsLike: feelsLike !== undefined ? feelsLike + '°C' : '--',
            pressure: pressure !== undefined ? pressure + ' hPa' : '--',
            precipitation: precipitation !== undefined ? precipitation + ' mm' : '--',
            windSpeed: windSpeed !== undefined ? windSpeed + ' km/h' : '--',
            windDir: windDir || '--',
            windScale: windScale || '--',
            alarms,
            sunTimes
        };
    }

    generateWeatherTips(weather, temp) {
        const tips = [];
        if (weather.includes('雨')) tips.push('今日有雨，请携带雨具');
        if (weather.includes('雪')) tips.push('路面可能结冰，请注意交通安全');
        if (weather.includes('雾')) tips.push('能见度较低，请注意行车安全');
        if (weather.includes('晴')) tips.push('天气晴朗，适宜户外活动');
        if (weather.includes('阴') || weather.includes('多云')) tips.push('天气适宜，注意适当增减衣物');
        const tempNum = parseInt(temp);
        if (!isNaN(tempNum)) {
            if (tempNum > 30) tips.push('天气炎热，注意防暑降温');
            else if (tempNum < 5) tips.push('天气寒冷，注意保暖');
        }
        return tips.length ? tips.join('；') : '天气信息更新，请注意查看详情';
    }

    showModal() {
        if (this.isLoading) return;
        this.closeOtherModals();
        this.createModal();
        this.modalElement.classList.add('active');
        this.modalElement.style.display = 'flex';
        this.isShowing = true;
        requestAnimationFrame(() => {
            this.modalElement.style.opacity = '1';
            const content = this.modalElement.querySelector('.weather-modal-content');
            if (content) { content.style.transform = 'translateY(0) scale(1)'; content.style.opacity = '1'; }
        });
        window.Starlink?.app?.registerModal(this);
        this.isLoading = true;
        this.loadWeatherData().then(() => this.updateModalContent()).catch(error => {
            console.error('加载天气数据失败:', error);
            this.updateModalContent();
            window.toast?.show('天气数据加载失败，请稍后重试', 'error');
        }).finally(() => { this.isLoading = false; });
    }

    createModal() {
        if (this.modalElement?.parentNode) this.modalElement.remove();
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'weather-modal-card';
        this.modalElement.innerHTML = `
            <div class="weather-modal-content">
                <div class="weather-header">
                    <div class="weather-title-container">
                        <div class="weather-title">
                            <i class="fas fa-cloud-sun" style="color:#3764f4;margin-right:8px;"></i>
                            <span>天气小贴士</span>
                        </div>
                    </div>
                    <div class="weather-header-actions">
                        <button class="weather-icon-btn change-city-btn" id="changeCityBtn" title="手动选择城市"><i class="fas fa-map-marker-alt"></i></button>
                        <button class="weather-icon-btn location-btn" id="weatherLocationBtn" title="重新定位(GPS)"><i class="fas fa-location-crosshairs"></i></button>
                        <button class="weather-icon-btn weather-close-btn" id="weatherCloseBtn"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="weather-body" id="weatherBody">
                    <div class="loading-state"><div class="loading-spinner"></div><p>正在加载天气数据...</p></div>
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
                    <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <p>天气数据加载失败</p>
                    <p class="error-sub-text">请检查网络连接或稍后重试</p>
                    <div class="error-actions">
                        <button class="weather-action-btn retry-btn" id="weatherRetryBtn"><i class="fas fa-redo"></i> 重新加载</button>
                        <button class="weather-action-btn location-btn" id="weatherManualLocationBtn"><i class="fas fa-location-crosshairs"></i> 重新定位</button>
                    </div>
                </div>
            `;
        }

        const d = this.weatherData;
        const esc = this._escapeHtml.bind(this);
        const manualHint = !this.useAutoLocation ? `
            <div class="manual-mode-hint" style="background:rgba(245,158,11,0.1);border-radius:8px;padding:6px 10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:12px;color:#d97706;"><i class="fas fa-map-marker-alt"></i> 当前为手动选择城市</span>
                <button id="switchToAutoBtn" class="weather-action-btn" style="background:#4361ee;color:white;border:none;border-radius:6px;padding:4px 12px;font-size:11px;">📍 GPS定位</button>
            </div>
        ` : '';

        let alarmsHtml = '';
        if (d.alarms?.length) {
            const firstAlarmTime = d.alarms[0].effective || '';
            alarmsHtml = `<div class="weather-alarms">
                <div class="alarms-title-wrapper">
                    <div class="alarms-title"><i class="fas fa-exclamation-triangle"></i> 天气预警</div>
                    ${firstAlarmTime ? `<span class="alarms-time-header">${esc(firstAlarmTime)}</span>` : ''}
                </div>
                ${d.alarms.map(alarm => `
                    <div class="alarm-item">
                        <span class="alarm-level">${esc(alarm.signallevel || '预警')}</span>
                        <span class="alarm-title">${esc(alarm.title || '')}</span>
                    </div>
                `).join('')}
            </div>`;
        }

        const precip = d.precipitation || '0';
        const precipDisplay = precip === '0' || precip === '0 mm' || precip === '0mm' ? '无降水' : precip;
        const sun = d.sunTimes || {};
        const dayLenDisplay = sun.day_length ? `${sun.day_length}${sun.day_percentage !== undefined ? ` (${sun.day_percentage}%)` : ''}` : '--';

        return `
            ${manualHint}
            ${alarmsHtml}
            <div class="weather-current">
                <div class="weather-location">
                    <i class="fas fa-location-dot"></i>
                    ${esc(d.city)}${d.province ? `, ${esc(d.province)}` : ''}
                    <span class="weather-update-time">${esc(d.updateTime)}更新</span>
                </div>
                <div class="weather-card-container">
                    <div class="weather-card-left"><img src="${d.weatherIconUrl}" alt="${esc(d.weather)}" class="weather-icon-big" loading="lazy"></div>
                    <div class="weather-card-right">
                        <div class="weather-condition">${esc(d.weather)}</div>
                        <div class="weather-temps">
                            <div class="temp-item"><span class="temp-label">当前</span><span class="temp-value current">${d.currentTemp}</span></div>
                            <span class="temp-divider">/</span>
                            <div class="temp-item"><span class="temp-label icon-label">☀️</span><span class="temp-value day">${d.dayTemperature}</span></div>
                            <span class="temp-divider">/</span>
                            <div class="temp-item"><span class="temp-label icon-label">🌙</span><span class="temp-value night">${d.nightTemperature}</span></div>
                        </div>
                    </div>
                </div>
                ${d.tips ? `<div class="weather-tips"><i class="fas fa-lightbulb"></i> ${esc(d.tips)}</div>` : ''}
            </div>
            <div class="weather-extra-row">
                <div class="extra-item"><span class="extra-label">体感温度</span><span class="extra-value">${d.feelsLike}</span></div>
                <div class="extra-item"><span class="extra-label">气压</span><span class="extra-value">${d.pressure}</span></div>
                <div class="extra-item"><span class="extra-label">降水量</span><span class="extra-value">${precipDisplay}</span></div>
                <div class="extra-item"><span class="extra-label">风速</span><span class="extra-value">${d.windSpeed}</span></div>
                <div class="extra-item"><span class="extra-label">风向</span><span class="extra-value">${d.windDir}</span></div>
                <div class="extra-item"><span class="extra-label">风力</span><span class="extra-value">${d.windScale}</span></div>
                <div class="extra-item"><span class="extra-label">湿度</span><span class="extra-value">${d.humidity}</span></div>
            </div>
            <div class="weather-sun-row">
                <div class="sun-item"><span class="sun-label">🌅 日出</span><span class="sun-value">${esc(sun.sunrise || '--')}</span></div>
                <div class="sun-item"><span class="sun-label">🌇 日落</span><span class="sun-value">${esc(sun.sunset || '--')}</span></div>
                <div class="sun-item"><span class="sun-label">☀️ 昼长</span><span class="sun-value">${esc(dayLenDisplay)}</span></div>
                <div class="sun-item"><span class="sun-label">🌤 天亮</span><span class="sun-value">${esc(sun.civil_twilight_begin || '--')}</span></div>
                <div class="sun-item"><span class="sun-label">🌙 天黑</span><span class="sun-value">${esc(sun.civil_twilight_end || '--')}</span></div>
            </div>
            <div class="weather-forecast">
                <div class="forecast-title"><i class="fas fa-calendar-alt"></i> 未来几天预报</div>
                <div class="forecast-days">
                    ${d.forecasts.map(day => `
                        <div class="forecast-day">
                            <div class="forecast-day-name">${day.day}</div>
                            <div class="forecast-day-icon"><img src="${day.iconUrl}" alt="${esc(day.weather)}" class="forecast-icon-svg" loading="lazy"></div>
                            <div class="forecast-day-weather">${day.weather}</div>
                            <div class="forecast-day-temp"><span class="day">${day.dayTemp}</span><span class="sep">/</span><span class="night">${day.nightTemp}</span></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    bindEvents() {
        if (!this.modalElement) return;
        const closeBtn = this.modalElement.querySelector('#weatherCloseBtn');
        closeBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.hide(); });
        const changeBtn = this.modalElement.querySelector('#changeCityBtn');
        changeBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.showCityPrompt(); });
        const locationBtn = this.modalElement.querySelector('#weatherLocationBtn');
        locationBtn?.addEventListener('click', async (e) => { e.stopPropagation(); await this.handleGpsRefresh(); });
        this.modalElement.addEventListener('click', (e) => { if (e.target === this.modalElement) this.hide(); });
        const escHandler = (e) => { if (e.key === 'Escape' && this.isShowing) this.hide(); };
        document.addEventListener('keydown', escHandler);
        this.escHandler = escHandler;
    }

    showCityPrompt() {
        const modal = document.createElement('div');
        modal.className = 'city-prompt-modal active';
        modal.style.cssText = 'display:flex;opacity:1;';
        modal.innerHTML = `
            <div class="city-prompt-content">
                <div class="prompt-header"><i class="fas fa-map-marker-alt"></i><h3>选择城市</h3></div>
                <div class="prompt-input-group">
                    <label>请输入城市名称</label>
                    <input type="text" id="cityInput" value="${this._escapeHtml(this.currentCity)}" placeholder="例如：北京、上海、广州...">
                    <p class="prompt-hint">提示：请输入完整的城市名，如"北京市"、"上海市"</p>
                </div>
                <div class="hot-cities">
                    <p>热门城市：</p>
                    <div class="hot-city-buttons">
                        ${['北京市','上海市','广州市','深圳市','杭州市','南京市','成都市','武汉市'].map(city => `
                            <button type="button" class="hot-city-btn" data-city="${this._escapeHtml(city)}">${this._escapeHtml(city)}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="prompt-actions" style="justify-content:space-between;">
                    <button type="button" id="autoLocateBtn" class="weather-action-btn" style="background:#10b981;color:white;"><i class="fas fa-location-crosshairs"></i> GPS定位</button>
                    <div style="display:flex;gap:8px;">
                        <button type="button" id="cancelCityBtn" class="weather-action-btn cancel-btn">取消</button>
                        <button type="button" id="confirmCityBtn" class="weather-action-btn confirm-btn">确认切换</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const content = modal.querySelector('.city-prompt-content');
        if (content) { content.style.transform = 'scale(1)'; content.style.opacity = '1'; }

        const cancelBtn = modal.querySelector('#cancelCityBtn');
        const confirmBtn = modal.querySelector('#confirmCityBtn');
        const autoLocateBtn = modal.querySelector('#autoLocateBtn');
        const cityInput = modal.querySelector('#cityInput');
        modal.querySelectorAll('.hot-city-btn').forEach(btn => {
            btn.addEventListener('click', () => { cityInput.value = btn.dataset.city; });
        });

        autoLocateBtn.addEventListener('click', async () => {
            await this.handleGpsRefresh();
            this.hideCityPrompt(modal);
            this.updateModalContent();
        });

        confirmBtn.addEventListener('click', async () => {
            let newCity = cityInput.value.trim();
            if (!newCity) { alert('请输入城市名称'); return; }
            newCity = newCity.replace(/[市县区]$/, '');
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 切换中...';
            confirmBtn.disabled = true;
            try {
                this.useAutoLocation = false;
                this.manualCity = newCity;
                this.currentCity = newCity;
                await this.loadWeatherDataByCity(newCity);
                this.updateModalContent();
                this.hideCityPrompt(modal);
                window.toast?.show(`已切换到: ${newCity}`, 'success');
            } catch (error) {
                console.error('切换城市失败:', error);
                confirmBtn.innerHTML = '确认切换';
                confirmBtn.disabled = false;
                window.toast?.show(`切换城市失败: ${error.message || '请检查城市名称是否正确'}`, 'error');
            }
        });

        const hidePrompt = () => { modal.classList.remove('active'); modal.style.opacity = '0'; setTimeout(() => modal.remove(), 300); };
        cancelBtn.addEventListener('click', hidePrompt);
        modal.addEventListener('click', (e) => { if (e.target === modal) hidePrompt(); });
        const escHandler = (e) => { if (e.key === 'Escape') { hidePrompt(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);
        cityInput.focus();
        cityInput.select();
    }

    hideCityPrompt(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    }

    async handleGpsRefresh() {
        this.gpsAttempted = false;
        try {
            window.toast?.show('正在获取您的位置...', 'info');
            const locationBtn = this.modalElement?.querySelector('#weatherLocationBtn');
            if (locationBtn) { locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; locationBtn.disabled = true; }
            await this.tryGpsLocation();
            this.updateModalContent();
            window.toast?.show('位置已更新', 'success');
        } catch (error) {
            console.error('GPS 刷新失败:', error);
            window.toast?.show('定位失败，请手动选择城市', 'error');
        } finally {
            const locationBtn = this.modalElement?.querySelector('#weatherLocationBtn');
            if (locationBtn) { locationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i>'; locationBtn.disabled = false; }
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadWeatherData();
                if (this.isShowing && this.modalElement) this.updateModalContent();
            } catch (error) { console.warn('自动刷新天气数据失败:', error); }
        }, this.autoRefreshTime);
    }

    updateModalContent() {
        if (!this.modalElement) return;
        const body = this.modalElement.querySelector('#weatherBody');
        if (body) {
            body.innerHTML = this.renderModalContent();
            body.querySelector('#weatherRetryBtn')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.target;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
                btn.disabled = true;
                try { await this.loadWeatherData(); this.updateModalContent(); }
                catch (error) { console.error('重试加载天气数据失败:', error); btn.innerHTML = '<i class="fas fa-redo"></i> 重新加载'; btn.disabled = false; }
            });
            body.querySelector('#weatherManualLocationBtn')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.target;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 定位中...';
                btn.disabled = true;
                try { await this.handleGpsRefresh(); }
                catch (error) { console.error('定位失败:', error); btn.innerHTML = '<i class="fas fa-location-crosshairs"></i> 重新定位'; btn.disabled = false; }
            });
            body.querySelector('#switchToAutoBtn')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleGpsRefresh();
            });
        }
    }

    closeOtherModals() {
        window.Starlink?.sidebar?.hide?.();
        window.sidebar?.hide?.();
        window.Starlink?.search?.hide?.();
        window.newSearchModule?.hide?.();
        window.Starlink?.navbar?.hideMusicPlayer?.();
        window.app?.components?.navbar?.hideMusicPlayer?.();
    }

    hide() {
        if (!this.isShowing || !this.modalElement) return;
        this.modalElement.classList.remove('active');
        this.modalElement.style.opacity = '0';
        const content = this.modalElement.querySelector('.weather-modal-content');
        if (content) { content.style.transform = 'translateY(20px) scale(0.95)'; content.style.opacity = '0'; }
        setTimeout(() => {
            this.modalElement.style.display = 'none';
            this.isShowing = false;
            if (this.escHandler) { document.removeEventListener('keydown', this.escHandler); this.escHandler = null; }
            window.Starlink?.app?.unregisterModal(this);
        }, 200);
    }

    async refreshWeather() {
        try { await this.loadWeatherData(); return true; }
        catch (error) { console.error('手动刷新天气数据失败:', error); return false; }
    }

    setCity(city, isManual = false, province = null) {
        if (isManual) {
            this.useAutoLocation = false;
            this.manualCity = city;
            this.manualProvince = province;
            this.currentCity = city;
            this.saveCity(city, true, province);
        } else {
            this.useAutoLocation = true;
            this.saveCity(city, false);
        }
        this.weatherData = null;
        if (this.isShowing) this.loadWeatherData().then(() => this.updateModalContent());
    }

    getWeatherData() { return this.weatherData; }
    getCurrentCity() { return this.currentCity; }

    destroy() {
        this.hide();
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.modalElement?.remove();
        this.modalElement = null;
        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) weatherBtn.removeEventListener('click', this.showModal);
        this.initialized = false;
    }
}

window.WeatherModule = WeatherModule;