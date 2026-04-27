/**
 * 天气模块 - 简化卡片式设计
 * 负责天气预报功能和自动定位
 * 修复：统一使用 window.Utils.escapeHtml 并添加本地兜底
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

        // 本地安全兜底，确保 escapeHtml 始终可用
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
        
        console.log('天气模块开始初始化...');
        this.bindGlobalEvents();
        this.startAutoRefresh();
        await this.tryAutoLocation();
        this.initialized = true;
        console.log('天气模块初始化完成');
    }

    async tryAutoLocation() {
        const savedCity = this.getSavedCity();
        if (savedCity) {
            console.log('使用保存的城市:', savedCity);
            this.currentCity = savedCity;
            return;
        }
        
        if (!navigator.geolocation) {
            console.log('浏览器不支持地理定位功能');
            if (window.toast) {
                window.toast.show('浏览器不支持地理定位，已使用默认城市', 'warning');
            }
            return;
        }
        
        try {
            this.useAutoLocation = true;
            await this.getCurrentPosition();
        } catch (error) {
            console.log('自动定位失败，使用默认城市:', error.message);
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
            
            console.log('正在获取地理位置...');
            
            const timeoutId = setTimeout(() => {
                this.isLocationRequested = false;
                reject(new Error('获取位置超时'));
            }, 5000);
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    clearTimeout(timeoutId);
                    this.isLocationRequested = false;
                    
                    const { latitude, longitude } = position.coords;
                    console.log('获取到位置:', latitude, longitude);
                    
                    try {
                        const city = await this.reverseGeocode(latitude, longitude);
                        if (city) {
                            this.setCity(city);
                            if (window.toast) {
                                window.toast.show(`已定位到: ${city}`, 'success');
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
                    
                    if (window.toast) {
                        window.toast.show(errorMessage, 'warning');
                    }
                    
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 300000
                }
            );
        });
    }

    async reverseGeocode(latitude, longitude) {
        return new Promise((resolve, reject) => {
            const url = `https://api.pearktrue.cn/api/map/?lat=${latitude}&lng=${longitude}`;
            
            console.log('正在逆地理编码...', url);
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('逆地理编码结果:', data);
                    
                    if (data.code === 200 && data.data) {
                        const address = data.data.address || '';
                        
                        if (address) {
                            const city = this.extractCityFromAddress(address);
                            if (city) {
                                resolve(city);
                            } else {
                                console.warn('无法从地址中提取城市名:', address);
                                reject(new Error('无法解析城市信息'));
                            }
                        } else {
                            reject(new Error('地址信息为空'));
                        }
                    } else {
                        reject(new Error(data.msg || '逆地理编码失败'));
                    }
                })
                .catch(error => {
                    console.error('逆地理编码请求失败:', error);
                    reject(error);
                });
        });
    }

    extractCityFromAddress(address) {
        if (!address) return null;
        
        console.log('提取城市名，原始地址:', address);
        
        const cityRegex = /([\u4e00-\u9fa5]+市)/;
        const match = address.match(cityRegex);
        
        if (match && match[1]) {
            const city = match[1];
            console.log('提取到城市名:', city);
            return city;
        }
        
        const countyRegex = /([\u4e00-\u9fa5]+县)/;
        const countyMatch = address.match(countyRegex);
        
        if (countyMatch && countyMatch[1]) {
            const county = countyMatch[1];
            console.log('提取到县名:', county);
            return county;
        }
        
        console.log('未匹配到标准行政区划，返回完整地址');
        return address;
    }

    bindGlobalEvents() {
        console.log('绑定天气按钮事件...');
        
        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) {
            console.log('找到天气按钮');
            weatherBtn.addEventListener('click', this.showModalBound);
        } else {
            console.warn('未找到天气按钮，按钮ID: weatherBtn');
        }
    }

    saveCity(city) {
        try {
            localStorage.setItem('weather_city', city);
            localStorage.setItem('weather_use_auto_location', this.useAutoLocation ? 'true' : 'false');
            console.log('城市已保存到本地存储:', city);
        } catch (error) {
            console.error('保存城市失败:', error);
        }
    }

    getSavedCity() {
        try {
            const city = localStorage.getItem('weather_city');
            const useAuto = localStorage.getItem('weather_use_auto_location') === 'true';
            this.useAutoLocation = useAuto;
            return city;
        } catch (error) {
            console.error('获取保存城市失败:', error);
            return null;
        }
    }

    async loadWeatherData() {
        try {
            this.weatherData = await this.fetchWeatherData(this.currentCity);
            return true;
        } catch (error) {
            console.error('加载天气数据失败:', error);
            this.weatherData = null;
            throw error;
        }
    }

    async fetchWeatherData(city) {
        return new Promise((resolve, reject) => {
            console.log('正在请求天气数据，城市:', city);
            
            const url = `https://www.cunyuapi.top/weather?city=${encodeURIComponent(city)}`;
            console.log('天气API URL:', url);
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('天气API响应数据:', data);
                    const parsedData = this.parseWeatherData(data);
                    resolve(parsedData);
                })
                .catch(error => {
                    console.error('获取天气数据失败:', error);
                    reject(new Error('获取天气数据失败，请检查网络连接'));
                });
        });
    }

    parseWeatherData(data) {
        if (!data || !data.city_info || !data.forecasts || !data.forecasts[0]) {
            throw new Error('天气数据格式错误');
        }
        
        const cityInfo = data.city_info;
        const today = data.forecasts[0];
        
        const getWeatherIcon = (condition) => {
            if (!condition) return 'fas fa-cloud-sun';
            
            const iconMap = {
                '晴': 'fas fa-sun',
                '多云': 'fas fa-cloud-sun',
                '阴': 'fas fa-cloud',
                '雾': 'fas fa-smog',
                '雨': 'fas fa-cloud-rain',
                '小雨': 'fas fa-cloud-rain',
                '中雨': 'fas fa-cloud-showers-heavy',
                '大雨': 'fas fa-cloud-showers-heavy',
                '暴雨': 'fas fa-poo-storm',
                '雪': 'fas fa-snowflake',
                '小雪': 'fas fa-snowflake',
                '中雪': 'fas fa-snowflake',
                '大雪': 'fas fa-snowman',
                '雷阵雨': 'fas fa-bolt',
                '阵雨': 'fas fa-cloud-showers-heavy',
                '毛毛雨': 'fas fa-cloud-rain'
            };
            
            for (const [key, icon] of Object.entries(iconMap)) {
                if (condition.includes(key)) {
                    return icon;
                }
            }
            
            return 'fas fa-cloud-sun';
        };

        const formatUpdateTime = (timeStr) => {
            if (!timeStr) return '刚刚';
            try {
                const time = new Date(timeStr);
                return time.toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                });
            } catch (error) {
                return '刚刚';
            }
        };

        const getWeatherTips = (weather) => {
            const tips = [];
            const dayTemp = parseInt(today.temperature.day) || 0;
            const nightTemp = parseInt(today.temperature.night) || 0;

            if (weather.includes('雨')) tips.push('今日有雨，请携带雨具');
            if (weather.includes('雪')) tips.push('路面可能结冰，请注意交通安全');
            if (weather.includes('雾')) tips.push('能见度较低，请注意行车安全');
            if (weather.includes('晴')) tips.push('天气晴朗，适宜户外活动');
            if (weather.includes('阴') || weather.includes('多云')) tips.push('天气适宜，注意适当增减衣物');
            if (dayTemp > 30) tips.push('天气炎热，注意防暑降温');
            if (dayTemp < 5) tips.push('天气寒冷，注意保暖');
            if (dayTemp - nightTemp > 10) tips.push('昼夜温差较大，请注意增减衣物');

            return tips.length > 0 ? tips.join('；') : '天气信息更新，请注意查看详情';
        };

        const generateForecasts = (forecasts) => {
            const result = [];
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            
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
            city: cityInfo.city.replace('市', ''),
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
            warning: null,
            warningColor: null,
            warningTime: null,
            tips: getWeatherTips(today.weather.day),
            forecasts: forecasts
        };
    }

    showModal() {
        console.log('显示天气模态框');
        
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

        if (window.app) {
            window.app.registerModal(this);
        }

        this.isLoading = true;
        
        try {
            this.loadWeatherData().then(() => {
                this.updateModalContent();
                if (window.toast) {
                    window.toast.show('天气数据加载成功', 'success');
                }
            }).catch(error => {
                console.error('加载天气数据失败:', error);
                this.updateModalContent();
                if (window.toast) {
                    window.toast.show('天气数据加载失败，请稍后重试', 'error');
                }
            }).finally(() => {
                this.isLoading = false;
            });
        } catch (error) {
            console.error('加载天气数据失败:', error);
            this.updateModalContent();
            if (window.toast) {
                window.toast.show('天气数据加载失败，请稍后重试', 'error');
            }
            this.isLoading = false;
        }
    }

    createModal() {
        console.log('创建天气模态框');
        
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
            this.modalElement = null;
        }

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'weather-modal-card';
        
        Object.assign(this.modalElement.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10000',
            opacity: '0',
            transition: 'opacity 0.2s ease',
            padding: '20px',
            boxSizing: 'border-box',
            pointerEvents: 'auto'
        });

        this.modalElement.innerHTML = `
            <div class="weather-modal-content" style="
                max-width: 350px;
                width: 100%;
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transform: translateY(20px) scale(0.95);
                opacity: 0;
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                            opacity 0.3s ease;
                max-height: 450px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid #e8e8e8;
            ">
                <div class="weather-header" style="
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e8e8e8;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div class="weather-title-container">
                        <div class="weather-title" style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size:14px; font-weight:600;">天气小贴士</span>
                            ${this.useAutoLocation ? 
                                '<span style="font-size:10px; padding:2px 6px; background:#e6f7ff; color:#1890ff; border-radius:10px;">定位</span>' : 
                                ''
                            }
                            <span class="auto-refresh-label" style="font-size:10px; color:#999; margin-left:8px;">
                                <i class="fas fa-sync-alt" style="font-size:9px; margin-right:3px;"></i>
                                10分钟刷新
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button class="change-city-btn" id="changeCityBtn" style="
                            background: none;
                            border: none;
                            color: #666;
                            cursor: pointer;
                            padding: 4px;
                            border-radius: 4px;
                            transition: all 0.2s ease;
                            width: 28px;
                            height: 28px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                        " title="切换城市">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <button class="location-btn" id="weatherLocationBtn" style="
                            background: none;
                            border: none;
                            color: #666;
                            cursor: pointer;
                            padding: 4px;
                            border-radius: 4px;
                            transition: all 0.2s ease;
                            width: 28px;
                            height: 28px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                        " title="重新定位">
                            <i class="fas fa-location-crosshairs"></i>
                        </button>
                        <button class="weather-close-btn" id="weatherCloseBtn" style="
                            background: none;
                            border: none;
                            color: #666;
                            cursor: pointer;
                            padding: 4px;
                            border-radius: 4px;
                            transition: all 0.2s ease;
                            width: 28px;
                            height: 28px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 14px;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="weather-body" id="weatherBody" style="
                    overflow-y: auto; 
                    overflow-x: hidden; 
                    flex: 1;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                ">
                    <div class="loading-state" style="padding:40px 20px; text-align:center;">
                        <div class="loading-spinner" style="
                            display: inline-block;
                            width: 20px;
                            height: 20px;
                            border: 2px solid #f3f3f3;
                            border-top: 2px solid #4361ee;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin-bottom: 10px;
                        "></div>
                        <p style="font-size:12px; color:#666; margin-top:10px;">正在加载天气数据...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);
        
        this.addScrollbarStyles();
        
        this.bindEvents();
    }

    addScrollbarStyles() {
        if (document.getElementById('weather-scrollbar-style')) return;
        const style = document.createElement('style');
        style.id = 'weather-scrollbar-style';
        style.textContent = `
            .weather-body::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
                background: transparent;
            }
            .weather-body::-webkit-scrollbar-track {
                display: none;
                background: transparent;
            }
            .weather-body::-webkit-scrollbar-thumb {
                display: none;
                background: transparent;
            }
            .weather-body::-webkit-scrollbar-thumb:hover {
                display: none;
                background: transparent;
            }
            .weather-body {
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
            }
            .city-prompt-content::-webkit-scrollbar {
                display: none;
            }
            .city-prompt-content {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .weather-body {
                -webkit-overflow-scrolling: touch;
            }
        `;
        document.head.appendChild(style);
    }

    renderModalContent() {
        if (!this.weatherData) {
            return `
                <div class="error-state" style="padding:40px 20px; text-align:center;">
                    <div class="error-icon" style="font-size:24px; color:#ff4d4f; margin-bottom:10px;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <p style="font-size:12px; color:#666; margin-bottom:8px;">天气数据加载失败</p>
                    <p style="font-size:11px; color:#999; margin-bottom:12px;">请检查网络连接或稍后重试</p>
                    <div style="display:flex; gap:8px; justify-content:center;">
                        <button class="retry-btn" id="weatherRetryBtn" style="
                            padding: 6px 16px;
                            font-size: 12px;
                            background: #4361ee;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            transition: background-color 0.2s ease;
                        ">
                            <i class="fas fa-redo" style="margin-right:6px;"></i>
                            重新加载
                        </button>
                        <button class="location-btn" id="weatherManualLocationBtn" style="
                            padding: 6px 16px;
                            font-size: 12px;
                            background: #52c41a;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            transition: background-color 0.2s ease;
                        ">
                            <i class="fas fa-location-crosshairs" style="margin-right:6px;"></i>
                            重新定位
                        </button>
                    </div>
                </div>
            `;
        }

        const { weatherData } = this;
        const e = this._escapeHtml; // 使用本地兜底函数
        
        return `
            <div class="weather-current" style="padding:16px 16px 12px; border-bottom:1px solid #eee; text-align:center;">
                <div class="weather-city" style="font-size:12px; color:#666; margin-bottom:6px; display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap;">
                    <i class="fas fa-location-dot" style="font-size:11px;"></i>
                    ${e(weatherData.city)}
                    <span class="weather-update-time" style="font-size:11px; color:#999; margin-left:4px;">${e(weatherData.updateTime)}更新</span>
                </div>
                <div class="weather-main" style="display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:12px;">
                    <div class="weather-icon" style="font-size:36px; color:#4361ee;">
                        <i class="${weatherData.weatherIcon}"></i>
                    </div>
                    <div class="weather-temp-info" style="display:flex; flex-direction:column; align-items:center;">
                        <div class="weather-desc" style="font-size:14px; color:#333; font-weight:500; margin-bottom:4px;">
                            ${e(weatherData.weather)}
                        </div>
                        <div class="temp-details" style="display:flex; gap:12px; align-items:center;">
                            <div class="temp-item" style="text-align:center;">
                                <div class="temp-label" style="font-size:11px; color:#999; margin-bottom:2px;">白天</div>
                                <div class="temp-value" style="font-size:18px; color:#ff6b6b; font-weight:600;">
                                    ${e(weatherData.dayTemperature)}
                                </div>
                            </div>
                            <div style="color:#ccc; font-size:12px;">/</div>
                            <div class="temp-item" style="text-align:center;">
                                <div class="temp-label" style="font-size:11px; color:#999; margin-bottom:2px;">夜间</div>
                                <div class="temp-value" style="font-size:18px; color:#4dabf7; font-weight:600;">
                                    ${e(weatherData.nightTemperature)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ${weatherData.tips ? `
                <div class="weather-tips" style="margin-top:12px; padding:8px 12px; background:#f8f9fa; border-radius:6px; font-size:12px; color:#666; border-left:3px solid #4361ee;">
                    <i class="fas fa-lightbulb" style="font-size:11px; margin-right:6px; color:#4361ee;"></i>
                    ${e(weatherData.tips)}
                </div>
                ` : ''}
            </div>

            <div class="weather-details" style="padding:16px; display:grid; grid-template-columns: repeat(2, 1fr); gap:12px;">
                <div class="weather-detail" style="text-align:center; padding:12px; background:#f8f9fa; border-radius:8px;">
                    <div class="detail-icon" style="font-size:16px; color:#4361ee; margin-bottom:8px;">
                        <i class="fas fa-wind"></i>
                    </div>
                    <div class="detail-label" style="font-size:11px; color:#999; margin-bottom:4px;">风向风力</div>
                    <div class="detail-value" style="font-size:14px; color:#333; font-weight:500;">${e(weatherData.wind)}</div>
                </div>
                <div class="weather-detail" style="text-align:center; padding:12px; background:#f8f9fa; border-radius:8px;">
                    <div class="detail-icon" style="font-size:16px; color:#4361ee; margin-bottom:8px;">
                        <i class="fas fa-temperature-high"></i>
                    </div>
                    <div class="detail-label" style="font-size:11px; color:#999; margin-bottom:4px;">体感温度</div>
                    <div class="detail-value" style="font-size:14px; color:#333; font-weight:500;">${e(weatherData.dayTemperature)}</div>
                </div>
            </div>
            
            <div class="weather-forecast" style="padding:0 16px 16px;">
                <div class="forecast-title" style="font-size:12px; color:#666; margin:12px 0 8px; display:flex; align-items:center; gap:6px;">
                    <i class="fas fa-calendar-alt" style="font-size:11px; color:#4361ee;"></i>
                    未来几天预报
                </div>
                <div class="forecast-days" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
                    ${weatherData.forecasts.map(day => `
                        <div class="forecast-day" style="text-align:center; padding:12px 6px; background:#f8f9fa; border-radius:8px;">
                            <div class="forecast-day-name" style="font-size:12px; color:#666; margin-bottom:6px; font-weight:500;">${e(day.day)}</div>
                            <div class="forecast-day-icon" style="font-size:16px; color:#4361ee; margin-bottom:6px;">
                                <i class="${day.icon}"></i>
                            </div>
                            <div class="forecast-day-weather" style="font-size:11px; color:#333; margin-bottom:6px;">${e(day.weather)}</div>
                            <div class="forecast-day-temp" style="display:flex; justify-content:center; gap:4px; font-size:12px;">
                                <span style="color:#ff6b6b;">${e(day.dayTemp)}</span>
                                <span style="color:#ccc;">/</span>
                                <span style="color:#4dabf7;">${e(day.nightTemp)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="weather-footer" style="padding:12px 16px; border-top:1px solid #eee; text-align:center;">
                <div style="font-size:11px; color:#999; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <i class="fas fa-circle-info" style="font-size:10px;"></i>
                    点击"切换城市"可手动设置，点击"定位"图标可重新获取位置
                </div>
            </div>
        `;
    }

    bindEvents() {
        if (!this.modalElement) return;

        const closeBtn = this.modalElement.querySelector('#weatherCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.hide(); });

        const changeCityBtn = this.modalElement.querySelector('#changeCityBtn');
        if (changeCityBtn) changeCityBtn.addEventListener('click', (e) => { e.stopPropagation(); this.showCityPrompt(); });

        const locationBtn = this.modalElement.querySelector('#weatherLocationBtn');
        if (locationBtn) locationBtn.addEventListener('click', async (e) => { e.stopPropagation(); await this.handleLocationRefresh(); });

        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) this.hide();
        });

        const escHandler = (e) => { if (e.key === 'Escape' && this.isShowing) this.hide(); };
        document.addEventListener('keydown', escHandler);
        this.escHandler = escHandler;
    }

    showCityPrompt() {
        const modal = document.createElement('div');
        modal.className = 'city-prompt-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 10001; opacity: 0;
            transition: opacity 0.2s ease; padding: 20px; box-sizing: border-box;
        `;

        const e = this._escapeHtml;
        const cities = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '南京市', '成都市', '武汉市'];

        modal.innerHTML = `
            <div class="city-prompt-content" style="
                background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 20px; width: 300px; max-width: 100%;
                transform: translateY(20px); transition: transform 0.3s ease, opacity 0.3s ease;
                opacity: 0;
            ">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                    <i class="fas fa-exchange-alt" style="color: #4361ee;"></i>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">切换城市</h3>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 12px; color: #666;">请输入城市名称</label>
                    <input type="text" id="cityInput" value="${e(this.currentCity)}" placeholder="例如：北京、上海、广州..."
                           style="width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px;
                                  font-size: 14px; box-sizing: border-box;">
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #999;">提示：请输入完整的城市名，如"北京市"、"上海市"</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">热门城市：</p>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        ${cities.map(city => `
                            <button type="button" class="quick-city-btn" data-city="${e(city)}"
                                    style="padding: 6px 10px; background: #f8f9fa; border: 1px solid #e8e8e8;
                                           border-radius: 4px; font-size: 12px; color: #666; cursor: pointer;
                                           transition: all 0.2s ease;">
                                ${e(city)}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" id="cancelCityBtn"
                            style="padding: 8px 16px; background: #f8f9fa; border: 1px solid #ddd;
                                   border-radius: 6px; font-size: 13px; color: #666; cursor: pointer;
                                   transition: all 0.2s ease;">取消</button>
                    <button type="button" id="confirmCityBtn"
                            style="padding: 8px 20px; background: #4361ee; border: none; border-radius: 6px;
                                   font-size: 13px; color: white; cursor: pointer; font-weight: 500;
                                   transition: all 0.2s ease;">确认切换</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.city-prompt-content');
            if (content) { content.style.opacity = '1'; content.style.transform = 'translateY(0)'; }
        });

        const cancelBtn = modal.querySelector('#cancelCityBtn');
        const confirmBtn = modal.querySelector('#confirmCityBtn');
        const cityInput = modal.querySelector('#cityInput');
        const quickCityBtns = modal.querySelectorAll('.quick-city-btn');

        quickCityBtns.forEach(btn => btn.addEventListener('click', () => { cityInput.value = btn.dataset.city; }));

        confirmBtn.addEventListener('click', async () => {
            const newCity = cityInput.value.trim();
            if (!newCity) { alert('请输入城市名称'); return; }
            this.useAutoLocation = false;
            this.setCity(newCity);
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 切换中...';
            confirmBtn.disabled = true;
            try {
                await this.loadWeatherData();
                this.updateModalContent();
                this.hideCityPrompt(modal);
                if (window.toast) window.toast.show(`已切换到: ${newCity}`, 'success');
            } catch (error) {
                console.error('切换城市失败:', error);
                confirmBtn.innerHTML = '确认切换';
                confirmBtn.disabled = false;
                if (window.toast) window.toast.show(`切换失败: ${error.message || '请检查城市名称是否正确'}`, 'error');
            }
        });

        const hidePrompt = () => {
            modal.style.opacity = '0';
            const content = modal.querySelector('.city-prompt-content');
            if (content) { content.style.opacity = '0'; content.style.transform = 'translateY(20px)'; }
            setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 300);
        };
        cancelBtn.addEventListener('click', hidePrompt);
        const escHandler = e => { if (e.key === 'Escape') { hidePrompt(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);
        modal.addEventListener('click', e => { if (e.target === modal) { hidePrompt(); document.removeEventListener('keydown', escHandler); } });
        cityInput.focus();
        cityInput.select();
    }

    hideCityPrompt(modal) {
        if (!modal) return;
        modal.style.opacity = '0';
        const content = modal.querySelector('.city-prompt-content');
        if (content) { content.style.opacity = '0'; content.style.transform = 'translateY(20px)'; }
        setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 300);
    }

    async handleLocationRefresh() {
        try {
            if (window.toast) window.toast.show('正在获取您的位置...', 'info');
            const locationBtn = this.modalElement.querySelector('#weatherLocationBtn');
            if (locationBtn) { locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; locationBtn.disabled = true; }
            await this.getCurrentPosition();
            await this.loadWeatherData();
            this.updateModalContent();
            if (window.toast) window.toast.show('位置已更新', 'success');
        } catch (error) {
            console.error('定位刷新失败:', error);
            if (window.toast) window.toast.show('定位失败，请检查权限设置', 'error');
        } finally {
            const locationBtn = this.modalElement.querySelector('#weatherLocationBtn');
            if (locationBtn) { locationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i>'; locationBtn.disabled = false; }
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(async () => {
            console.log('自动刷新天气数据...');
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
            const retryBtn = body.querySelector('#weatherRetryBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    retryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
                    retryBtn.disabled = true;
                    try { await this.loadWeatherData(); this.updateModalContent(); }
                    catch (error) { retryBtn.innerHTML = '<i class="fas fa-redo"></i> 重新加载'; retryBtn.disabled = false; }
                });
            }
            const manualLocationBtn = body.querySelector('#weatherManualLocationBtn');
            if (manualLocationBtn) {
                manualLocationBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    manualLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 定位中...';
                    manualLocationBtn.disabled = true;
                    try { await this.handleLocationRefresh(); }
                    catch (error) { manualLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> 重新定位'; manualLocationBtn.disabled = false; }
                });
            }
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
        const content = this.modalElement.querySelector('.weather-modal-content');
        if (content) { content.style.transform = 'translateY(20px) scale(0.95)'; content.style.opacity = '0'; }
        setTimeout(() => {
            this.modalElement.style.display = 'none';
            this.isShowing = false;
            if (this.escHandler) { document.removeEventListener('keydown', this.escHandler); this.escHandler = null; }
            if (window.app) window.app.unregisterModal(this);
        }, 200);
    }

    async refreshWeather() {
        try { await this.loadWeatherData(); return true; }
        catch (error) { console.error('刷新天气失败:', error); return false; }
    }

    setCity(city) {
        this.currentCity = city;
        this.saveCity(city);
        this.weatherData = null;
    }

    getWeatherData() { return this.weatherData; }
    getCurrentCity() { return this.currentCity; }

    destroy() {
        this.hide();
        if (this.refreshInterval) { clearInterval(this.refreshInterval); this.refreshInterval = null; }
        if (this.modalElement?.parentNode) this.modalElement.parentNode.removeChild(this.modalElement);
        this.modalElement = null;
        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) weatherBtn.removeEventListener('click', this.showModalBound);
        this.initialized = false;
    }
}