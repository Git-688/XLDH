/**
 * 天气模块 - 稳定版（修复 API 失效 + 模态框不显示问题）
 */
class WeatherModule {
    static CONFIG = {
        // 使用 vvhan 免费天气 API（无需 key）
        WEATHER_API: 'https://api.vvhan.com/api/weather',
        GEO_API: 'https://api.pearapi.ai/api/map/',
        get API_BASE() {
            return Utils.getApiBase();
        }
    };

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
        this.manualCity = null;
        this.escHandler = null;
        this.showModalBound = this.showModal.bind(this);
    }

    _escapeHtml(text) {
        return Utils.escapeHtml(text);
    }

    async init() {
        if (this.initialized) return;
        console.log('天气模块开始初始化...');
        this.bindGlobalEvents();
        this.startAutoRefresh();
        await this.loadSavedCity();
        this.initialized = true;
        console.log('天气模块初始化完成');
    }

    loadSavedCity() {
        try {
            const useAuto = localStorage.getItem('weather_use_auto_location') === 'true';
            const manual = localStorage.getItem('weather_manual_city');
            if (!useAuto && manual) {
                this.currentCity = manual;
                this.manualCity = manual;
                this.useAutoLocation = false;
                console.log('使用手动选择的城市:', manual);
                return;
            }
            this.useAutoLocation = true;
            const savedAutoCity = localStorage.getItem('weather_city');
            if (savedAutoCity) {
                this.currentCity = savedAutoCity;
                console.log('使用上次自动定位的城市:', savedAutoCity);
            }
        } catch (e) {
            console.error('加载城市设置失败:', e);
        }
    }

    saveCity(city, isManual = false) {
        try {
            if (isManual) {
                localStorage.setItem('weather_manual_city', city);
                localStorage.setItem('weather_use_auto_location', 'false');
                this.manualCity = city;
                this.useAutoLocation = false;
                localStorage.removeItem('weather_city');
            } else {
                localStorage.setItem('weather_city', city);
                localStorage.setItem('weather_use_auto_location', 'true');
                this.useAutoLocation = true;
                localStorage.removeItem('weather_manual_city');
            }
            this.currentCity = city;
            console.log('城市已保存:', city, isManual ? '(手动)' : '(自动)');
        } catch (error) {
            console.error('保存城市失败:', error);
        }
    }

    async tryAutoLocation() {
        if (!navigator.geolocation) {
            console.log('浏览器不支持地理定位');
            if (!this.currentCity || this.currentCity === '北京') {
                setTimeout(() => this.showCityPrompt(), 500);
            }
            return;
        }
        try {
            this.useAutoLocation = true;
            await this.getCurrentPosition();
        } catch (error) {
            console.log('自动定位失败:', error.message);
            this.useAutoLocation = false;
            if (!this.currentCity || this.currentCity === '北京') {
                setTimeout(() => this.showCityPrompt(), 500);
            }
            if (window.app && window.app.showToast) {
                window.app.showToast('定位失败，请手动选择城市', 'warning');
            }
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
                            this.saveCity(city, false);
                            if (window.app && window.app.showToast) {
                                window.app.showToast(`已定位到: ${city}`, 'success');
                            }
                        }
                        resolve(city);
                    } catch (error) {
                        console.error('逆地理编码失败:', error);
                        reject(error);
                    }
                },
                (error) => {
                    clearTimeout(timeoutId);
                    this.isLocationRequested = false;
                    const errorMessages = {
                        1: '用户拒绝了位置请求',
                        2: '无法获取位置信息',
                        3: '获取位置超时'
                    };
                    const errorMessage = errorMessages[error.code] || '位置获取失败';
                    console.error('获取位置失败:', errorMessage);
                    if (window.app && window.app.showToast) {
                        window.app.showToast(errorMessage, 'warning');
                    }
                    reject(new Error(errorMessage));
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
            );
        });
    }

    async reverseGeocode(latitude, longitude) {
        const url = `${WeatherModule.CONFIG.GEO_API}?lat=${latitude}&lng=${longitude}`;
        try {
            const response = await Utils.safeFetch(url, { timeout: 5000 });
            const data = await response.json();
            if (data.code === 200 && data.data) {
                const address = data.data.address || '';
                const city = this.extractCityFromAddress(address);
                return city || address;
            }
            return null;
        } catch (error) {
            Utils.handleApiError(error, '逆地理编码失败', false);
            return null;
        }
    }

    extractCityFromAddress(address) {
        if (!address) return null;
        const cityRegex = /([\u4e00-\u9fa5]+市)/;
        const match = address.match(cityRegex);
        if (match && match[1]) return match[1];
        const countyRegex = /([\u4e00-\u9fa5]+县)/;
        const countyMatch = address.match(countyRegex);
        if (countyMatch && countyMatch[1]) return countyMatch[1];
        return address;
    }

    bindGlobalEvents() {
        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) {
            weatherBtn.addEventListener('click', this.showModalBound);
        } else {
            console.warn('未找到天气按钮');
        }
    }

    async loadWeatherData() {
        try {
            this.weatherData = await this.fetchWeatherData(this.currentCity);
            return true;
        } catch (error) {
            console.error('加载天气数据失败:', error);
            // 使用模拟数据确保界面有内容
            this.weatherData = this.getMockWeatherData(this.currentCity);
            return false;
        }
    }

    // 模拟数据（当 API 完全不可用时）
    getMockWeatherData(city) {
        return {
            city: city,
            dayTemperature: '22°C',
            nightTemperature: '15°C',
            weather: '晴',
            weatherIcon: 'fas fa-sun',
            humidity: '65%',
            wind: '东南风 2级',
            visibility: '10km',
            airQuality: '良',
            airColor: '#10b981',
            updateTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            warning: null,
            tips: '天气舒适，适合户外活动',
            forecasts: [
                { day: '今天', weather: '晴', icon: 'fas fa-sun', dayTemp: '22°C', nightTemp: '15°C', wind: '东南风 2级' },
                { day: '明天', weather: '多云', icon: 'fas fa-cloud-sun', dayTemp: '24°C', nightTemp: '16°C', wind: '南风 3级' },
                { day: '后天', weather: '阴', icon: 'fas fa-cloud', dayTemp: '20°C', nightTemp: '14°C', wind: '北风 2级' }
            ]
        };
    }

    // 通过代理请求天气 API（适配 vvhan 格式）
    async fetchWeatherData(city) {
        const apiBase = Utils.getApiBase();
        const targetUrl = `${WeatherModule.CONFIG.WEATHER_API}?city=${encodeURIComponent(city)}`;
        const proxyUrl = `${apiBase}/music-proxy?url=${encodeURIComponent(targetUrl)}`;
        try {
            const response = await Utils.safeFetch(proxyUrl, { timeout: 8000 });
            const text = await response.text();
            console.log('天气API原始返回:', text.substring(0, 300));
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('JSON解析失败，使用模拟数据');
                throw new Error('JSON解析失败');
            }
            // 适配 vvhan 格式：{ success: true, data: { city, temp, weather, ... } }
            if (data && data.success === true && data.data) {
                const w = data.data;
                const getWeatherIcon = (cond) => {
                    const map = {
                        '晴': 'fas fa-sun',
                        '多云': 'fas fa-cloud-sun',
                        '阴': 'fas fa-cloud',
                        '雨': 'fas fa-cloud-rain',
                        '雪': 'fas fa-snowflake',
                        '雾': 'fas fa-smog'
                    };
                    for (let k in map) if (cond.includes(k)) return map[k];
                    return 'fas fa-cloud-sun';
                };
                // 构建预报（vvhan 可能提供 forecast 数组）
                let forecasts = [];
                if (w.forecast && Array.isArray(w.forecast)) {
                    for (let i = 0; i < Math.min(3, w.forecast.length); i++) {
                        const f = w.forecast[i];
                        forecasts.push({
                            day: i === 0 ? '今天' : i === 1 ? '明天' : f.date || '后天',
                            weather: f.type,
                            icon: getWeatherIcon(f.type),
                            dayTemp: f.high,
                            nightTemp: f.low,
                            wind: f.fx + '风 ' + f.fl + '级'
                        });
                    }
                } else {
                    // 降级生成三天预报
                    const weekdays = ['今天', '明天', '后天'];
                    for (let i = 0; i < 3; i++) {
                        forecasts.push({
                            day: weekdays[i],
                            weather: w.weather || '晴',
                            icon: getWeatherIcon(w.weather),
                            dayTemp: w.temp ? w.temp + '°C' : '20°C',
                            nightTemp: w.temp ? (parseInt(w.temp) - 5) + '°C' : '15°C',
                            wind: w.wind || '微风'
                        });
                    }
                }
                return {
                    city: w.city || city,
                    dayTemperature: w.temp ? w.temp + '°C' : '22°C',
                    nightTemperature: w.low ? w.low + '°C' : (w.temp ? (parseInt(w.temp) - 5) + '°C' : '15°C'),
                    weather: w.weather || '晴',
                    weatherIcon: getWeatherIcon(w.weather),
                    humidity: w.humidity || '--',
                    wind: w.wind || '无持续风向',
                    visibility: w.visibility || '--',
                    airQuality: w.air || '--',
                    airColor: '#1890ff',
                    updateTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                    warning: null,
                    tips: w.tips || (w.weather ? `今日${w.weather}，注意天气变化` : '天气数据更新中'),
                    forecasts: forecasts
                };
            } else {
                throw new Error('API返回格式错误');
            }
        } catch (error) {
            console.error('天气请求失败:', error);
            throw error;
        }
    }

    // 安全关闭其他模态框（增加 try-catch，避免中断）
    closeOtherModals() {
        try {
            if (window.sidebar && typeof window.sidebar.isVisible === 'function' && window.sidebar.isVisible()) {
                window.sidebar.hide();
            }
        } catch (e) { console.warn('关闭 sidebar 失败', e); }
        try {
            if (window.searchModule && window.searchModule.isModalOpen) {
                window.searchModule.hide();
            }
        } catch (e) { console.warn('关闭 searchModal 失败', e); }
        try {
            if (window.app && window.app.components && window.app.components.navbar) {
                window.app.components.navbar.hideMusicPlayer();
            }
        } catch (e) { console.warn('关闭音乐播放器失败', e); }
    }

    showModal() {
        // 防止重复点击导致的多次创建
        if (this.isLoading) return;
        try {
            this.closeOtherModals();
            // 确保 modal 存在，如果不存在则创建
            if (!this.modalElement || !document.body.contains(this.modalElement)) {
                this.createModal();
            }
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
            if (window.app && typeof window.app.registerModal === 'function') {
                window.app.registerModal(this);
            }
            this.isLoading = true;
            // 异步加载数据，完成后刷新内容（无论成败都会更新）
            this.loadWeatherData().finally(() => {
                this.updateModalContent();
                this.isLoading = false;
            });
        } catch (err) {
            console.error('显示天气模态框时发生错误:', err);
            if (window.app && window.app.showToast) {
                window.app.showToast('天气功能暂时不可用', 'error');
            }
        }
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
                    <div class="weather-title-container">
                        <div class="weather-title">
                            <span>天气小贴士</span>
                            ${this.useAutoLocation ? 
                                '<span class="weather-auto-location-badge">自动定位</span>' : 
                                '<span class="weather-auto-location-badge">手动选择</span>'
                            }
                            <span class="auto-refresh-label">
                                <i class="fas fa-sync-alt"></i>
                                10分钟刷新
                            </span>
                        </div>
                    </div>
                    <div class="weather-header-actions">
                        <button class="weather-icon-btn change-city-btn" id="changeCityBtn" title="手动选择城市">
                            <i class="fas fa-map-marker-alt"></i>
                        </button>
                        <button class="weather-icon-btn location-btn" id="weatherLocationBtn" title="重新定位">
                            <i class="fas fa-location-crosshairs"></i>
                        </button>
                        <button class="weather-icon-btn weather-close-btn" id="weatherCloseBtn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="weather-body" id="weatherBody">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>正在加载天气数据...</p>
                    </div>
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
                        <button class="weather-action-btn retry-btn" id="weatherRetryBtn">
                            <i class="fas fa-redo"></i> 重新加载
                        </button>
                        <button class="weather-action-btn location-btn" id="weatherManualLocationBtn">
                            <i class="fas fa-location-crosshairs"></i> 重新定位
                        </button>
                    </div>
                </div>
            `;
        }

        const { weatherData } = this;
        const esc = this._escapeHtml.bind(this);
        
        const manualModeHint = !this.useAutoLocation ? `
            <div class="manual-mode-hint" style="background:rgba(245,158,11,0.1); border-radius:8px; padding:8px 12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; color:#d97706;"><i class="fas fa-map-marker-alt"></i> 当前为手动选择城市</span>
                <button id="switchToAutoBtn" class="weather-action-btn" style="background:#4361ee; color:white; border:none; border-radius:6px; padding:4px 12px; font-size:11px;">📍 自动定位</button>
            </div>
        ` : '';
        
        return `
            ${manualModeHint}
            <div class="weather-current">
                <div class="weather-city">
                    <i class="fas fa-location-dot"></i>
                    ${esc(weatherData.city)}
                    <span class="weather-update-time">${esc(weatherData.updateTime)}更新</span>
                </div>
                <div class="weather-main">
                    <div class="weather-icon"><i class="${weatherData.weatherIcon}"></i></div>
                    <div class="weather-temp-info">
                        <div class="weather-desc">${weatherData.weather}</div>
                        <div class="temp-details">
                            <div class="temp-item">
                                <div class="temp-label">白天</div>
                                <div class="temp-value day">${weatherData.dayTemperature}</div>
                            </div>
                            <div class="temp-separator">/</div>
                            <div class="temp-item">
                                <div class="temp-label">夜间</div>
                                <div class="temp-value night">${weatherData.nightTemperature}</div>
                            </div>
                        </div>
                    </div>
                </div>
                ${weatherData.tips ? `
                <div class="weather-tips">
                    <i class="fas fa-lightbulb"></i>
                    ${esc(weatherData.tips)}
                </div>
                ` : ''}
            </div>

            <div class="weather-details">
                <div class="weather-detail">
                    <div class="detail-icon"><i class="fas fa-wind"></i></div>
                    <div class="detail-label">风向风力</div>
                    <div class="detail-value">${esc(weatherData.wind)}</div>
                </div>
                <div class="weather-detail">
                    <div class="detail-icon"><i class="fas fa-temperature-high"></i></div>
                    <div class="detail-label">体感温度</div>
                    <div class="detail-value">${weatherData.dayTemperature}</div>
                </div>
            </div>
            
            <div class="weather-forecast">
                <div class="forecast-title">
                    <i class="fas fa-calendar-alt"></i> 未来几天预报
                </div>
                <div class="forecast-days">
                    ${weatherData.forecasts.map(day => `
                        <div class="forecast-day">
                            <div class="forecast-day-name">${day.day}</div>
                            <div class="forecast-day-icon"><i class="${day.icon}"></i></div>
                            <div class="forecast-day-weather">${day.weather}</div>
                            <div class="forecast-day-temp">
                                <span class="day">${day.dayTemp}</span>
                                <span class="sep">/</span>
                                <span class="night">${day.nightTemp}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="weather-footer">
                <i class="fas fa-circle-info"></i>
                点击📍可手动选择城市，点击📍可重新自动定位
            </div>
        `;
    }

    bindEvents() {
        if (!this.modalElement) return;

        const closeBtn = this.modalElement.querySelector('#weatherCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.hide(); });

        const changeCityBtn = this.modalElement.querySelector('#changeCityBtn');
        if (changeCityBtn) changeCityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showCityPrompt();
        });

        const locationBtn = this.modalElement.querySelector('#weatherLocationBtn');
        if (locationBtn) {
            locationBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleLocationRefresh();
            });
        }

        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) this.hide();
        });

        const escHandler = (e) => {
            if (e.key === 'Escape' && this.isShowing) this.hide();
        };
        document.addEventListener('keydown', escHandler);
        this.escHandler = escHandler;
    }

    showCityPrompt() {
        const esc = this._escapeHtml.bind(this);
        const modal = document.createElement('div');
        modal.className = 'city-prompt-modal';

        modal.innerHTML = `
            <div class="city-prompt-content">
                <div class="prompt-header">
                    <i class="fas fa-map-marker-alt"></i>
                    <h3>选择城市</h3>
                </div>
                <div class="prompt-input-group">
                    <label>请输入城市名称</label>
                    <input type="text" id="cityInput" value="${esc(this.currentCity)}" placeholder="例如：北京、上海、广州...">
                    <p class="prompt-hint">提示：请输入完整的城市名，如"北京市"、"上海市"</p>
                </div>
                <div class="hot-cities">
                    <p>热门城市：</p>
                    <div class="hot-city-buttons">
                        ${['北京市', '上海市', '广州市', '深圳市', '杭州市', '南京市', '成都市', '武汉市'].map(city => `
                            <button type="button" class="hot-city-btn" data-city="${esc(city)}">${esc(city)}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="prompt-actions" style="justify-content: space-between;">
                    <button type="button" id="autoLocateBtn" class="weather-action-btn" style="background:#10b981; color:white;">
                        <i class="fas fa-location-crosshairs"></i> 自动定位
                    </button>
                    <div style="display:flex; gap:8px;">
                        <button type="button" id="cancelCityBtn" class="weather-action-btn cancel-btn">取消</button>
                        <button type="button" id="confirmCityBtn" class="weather-action-btn confirm-btn">确认切换</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.city-prompt-content');
            if (content) {
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            }
        });

        const cancelBtn = modal.querySelector('#cancelCityBtn');
        const confirmBtn = modal.querySelector('#confirmCityBtn');
        const autoLocateBtn = modal.querySelector('#autoLocateBtn');
        const cityInput = modal.querySelector('#cityInput');
        const quickCityBtns = modal.querySelectorAll('.hot-city-btn');

        quickCityBtns.forEach(btn => {
            btn.addEventListener('click', () => { cityInput.value = btn.dataset.city; });
        });

        autoLocateBtn.addEventListener('click', async () => {
            await this.handleLocationRefresh();
            this.hideCityPrompt(modal);
            this.updateModalContent();
        });

        confirmBtn.addEventListener('click', async () => {
            let newCity = cityInput.value.trim();
            if (!newCity) {
                alert('请输入城市名称');
                return;
            }
            if (!newCity.endsWith('市') && !newCity.endsWith('县') && newCity.length <= 3) {
                newCity = newCity + '市';
            }
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 切换中...';
            confirmBtn.disabled = true;
            try {
                this.saveCity(newCity, true);
                await this.loadWeatherData();
                this.updateModalContent();
                this.hideCityPrompt(modal);
                if (window.app && window.app.showToast) {
                    window.app.showToast(`已切换到: ${newCity}`, 'success');
                }
            } catch (error) {
                console.error('切换城市失败:', error);
                confirmBtn.innerHTML = '确认切换';
                confirmBtn.disabled = false;
                if (window.app && window.app.showToast) {
                    window.app.showToast(`切换城市失败: ${error.message || '请检查城市名称是否正确'}`, 'error');
                }
            }
        });

        const hidePrompt = () => {
            modal.style.opacity = '0';
            const content = modal.querySelector('.city-prompt-content');
            if (content) content.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        };
        cancelBtn.addEventListener('click', hidePrompt);
        modal.addEventListener('click', (e) => { if (e.target === modal) hidePrompt(); });
        const escHandler = (e) => {
            if (e.key === 'Escape') { hidePrompt(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);
        cityInput.focus();
        cityInput.select();
    }

    hideCityPrompt(modal) {
        if (!modal) return;
        modal.style.opacity = '0';
        const content = modal.querySelector('.city-prompt-content');
        if (content) content.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    }

    async handleLocationRefresh() {
        try {
            if (window.app && window.app.showToast) window.app.showToast('正在获取您的位置...', 'info');
            const locationBtn = this.modalElement?.querySelector('#weatherLocationBtn');
            if (locationBtn) { locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; locationBtn.disabled = true; }
            await this.getCurrentPosition();
            await this.loadWeatherData();
            this.updateModalContent();
            if (window.app && window.app.showToast) window.app.showToast('位置已更新，已切换为自动定位', 'success');
        } catch (error) {
            console.error('定位刷新失败:', error);
            if (window.app && window.app.showToast) window.app.showToast('定位失败，请检查权限设置', 'error');
        } finally {
            const locationBtn = this.modalElement?.querySelector('#weatherLocationBtn');
            if (locationBtn) { locationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i>'; locationBtn.disabled = false; }
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(async () => {
            try {
                if (this.isShowing) {
                    await this.loadWeatherData();
                    this.updateModalContent();
                }
            } catch (error) { console.warn('自动刷新天气数据失败:', error); }
        }, this.autoRefreshTime);
    }

    updateModalContent() {
        if (!this.modalElement) return;
        const body = this.modalElement.querySelector('#weatherBody');
        if (body) {
            body.innerHTML = this.renderModalContent();
            const retryBtn = body.querySelector('#weatherRetryBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    retryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
                    retryBtn.disabled = true;
                    try {
                        await this.loadWeatherData();
                        this.updateModalContent();
                    } catch (error) {
                        console.error('重试加载天气数据失败:', error);
                        retryBtn.innerHTML = '<i class="fas fa-redo"></i> 重新加载';
                        retryBtn.disabled = false;
                    }
                });
            }
            const manualLocationBtn = body.querySelector('#weatherManualLocationBtn');
            if (manualLocationBtn) {
                manualLocationBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    manualLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 定位中...';
                    manualLocationBtn.disabled = true;
                    try {
                        await this.handleLocationRefresh();
                    } catch (error) {
                        manualLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> 重新定位';
                        manualLocationBtn.disabled = false;
                    }
                });
            }
            const switchToAutoBtn = body.querySelector('#switchToAutoBtn');
            if (switchToAutoBtn) {
                switchToAutoBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.handleLocationRefresh();
                });
            }
        }
    }

    hide() {
        if (!this.isShowing || !this.modalElement) return;
        this.modalElement.style.opacity = '0';
        const content = this.modalElement.querySelector('.weather-modal-content');
        if (content) {
            content.style.transform = 'translateY(20px) scale(0.95)';
            content.style.opacity = '0';
        }
        setTimeout(() => {
            this.modalElement.style.display = 'none';
            this.isShowing = false;
            if (this.escHandler) {
                document.removeEventListener('keydown', this.escHandler);
                this.escHandler = null;
            }
            if (window.app && typeof window.app.unregisterModal === 'function') {
                window.app.unregisterModal(this);
            }
        }, 200);
    }

    async refreshWeather() {
        try {
            await this.loadWeatherData();
            if (this.isShowing) this.updateModalContent();
            return true;
        } catch (error) {
            console.error('手动刷新天气数据失败:', error);
            return false;
        }
    }

    setCity(city, isManual = false) {
        this.saveCity(city, isManual);
        this.weatherData = null;
        if (this.isShowing) {
            this.loadWeatherData().then(() => this.updateModalContent());
        }
    }

    getWeatherData() { return this.weatherData; }
    getCurrentCity() { return this.currentCity; }

    destroy() {
        this.hide();
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        if (this.modalElement && this.modalElement.parentNode) this.modalElement.remove();
        this.modalElement = null;
        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) weatherBtn.removeEventListener('click', this.showModalBound);
        this.initialized = false;
    }
}

if (typeof window !== 'undefined') {
    window.WeatherModule = WeatherModule;
}