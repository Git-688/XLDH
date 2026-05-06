/**
 * 天气模块 - 简化卡片式设计
 * 负责天气预报功能和自动定位
 * @class WeatherModule
 */
class WeatherModule {
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
            if (window.app && window.app.showToast) {
                window.app.showToast('浏览器不支持地理定位，已使用默认城市', 'warning');
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
            const url = `https://api.pearapi.ai/api/map/?lat=${latitude}&lng=${longitude}`;
            
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
            
            if (weather.includes('雨')) {
                tips.push('今日有雨，请携带雨具');
            }
            if (weather.includes('雪')) {
                tips.push('路面可能结冰，请注意交通安全');
            }
            if (weather.includes('雾')) {
                tips.push('能见度较低，请注意行车安全');
            }
            if (weather.includes('晴')) {
                tips.push('天气晴朗，适宜户外活动');
            }
            if (weather.includes('阴') || weather.includes('多云')) {
                tips.push('天气适宜，注意适当增减衣物');
            }
            
            const dayTemp = parseInt(today.temperature.day) || 0;
            const nightTemp = parseInt(today.temperature.night) || 0;
            
            if (dayTemp > 30) {
                tips.push('天气炎热，注意防暑降温');
            } else if (dayTemp < 5) {
                tips.push('天气寒冷，注意保暖');
            }
            
            if (dayTemp - nightTemp > 10) {
                tips.push('昼夜温差较大，请注意增减衣物');
            }
            
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
        
        if (this.isLoading) {
            return;
        }
        
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
                if (window.app && window.app.showToast) {
                    window.app.showToast('天气数据加载成功', 'success');
                }
            }).catch(error => {
                console.error('加载天气数据失败:', error);
                this.updateModalContent();
                if (window.app && window.app.showToast) {
                    window.app.showToast('天气数据加载失败，请稍后重试', 'error');
                }
            }).finally(() => {
                this.isLoading = false;
            });
        } catch (error) {
            console.error('加载天气数据失败:', error);
            this.updateModalContent();
            if (window.app && window.app.showToast) {
                window.app.showToast('天气数据加载失败，请稍后重试', 'error');
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
        
        // 改用 CSS 类名控制样式
        this.modalElement.innerHTML = `
            <div class="weather-modal-content">
                <div class="weather-header">
                    <div class="weather-title-container">
                        <div class="weather-title">
                            <span>天气小贴士</span>
                            ${this.useAutoLocation ? 
                                '<span class="weather-auto-location-badge">定位</span>' : 
                                ''
                            }
                            <span class="auto-refresh-label">
                                <i class="fas fa-sync-alt"></i>
                                10分钟刷新
                            </span>
                        </div>
                    </div>
                    <div class="weather-header-actions">
                        <button class="weather-icon-btn change-city-btn" id="changeCityBtn" title="切换城市">
                            <i class="fas fa-exchange-alt"></i>
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
        
        return `
            <div class="weather-current">
                <div class="weather-city">
                    <i class="fas fa-location-dot"></i>
                    ${Utils.escapeHtml(weatherData.city)}
                    <span class="weather-update-time">${Utils.escapeHtml(weatherData.updateTime)}更新</span>
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
                    ${Utils.escapeHtml(weatherData.tips)}
                </div>
                ` : ''}
            </div>

            <div class="weather-details">
                <div class="weather-detail">
                    <div class="detail-icon"><i class="fas fa-wind"></i></div>
                    <div class="detail-label">风向风力</div>
                    <div class="detail-value">${Utils.escapeHtml(weatherData.wind)}</div>
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
                点击"切换城市"可手动设置，点击"定位"图标可重新获取位置
            </div>
        `;
    }

    bindEvents() {
        if (!this.modalElement) return;

        const closeBtn = this.modalElement.querySelector('#weatherCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hide();
            });
        }

        const changeCityBtn = this.modalElement.querySelector('#changeCityBtn');
        if (changeCityBtn) {
            changeCityBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCityPrompt();
            });
        }

        const locationBtn = this.modalElement.querySelector('#weatherLocationBtn');
        if (locationBtn) {
            locationBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleLocationRefresh();
            });
        }

        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.hide();
            }
        });

        const escHandler = (e) => {
            if (e.key === 'Escape' && this.isShowing) {
                this.hide();
            }
        };
        document.addEventListener('keydown', escHandler);
        this.escHandler = escHandler;
    }

    showCityPrompt() {
        const modal = document.createElement('div');
        modal.className = 'city-prompt-modal';

        modal.innerHTML = `
            <div class="city-prompt-content">
                <div class="prompt-header">
                    <i class="fas fa-exchange-alt"></i>
                    <h3>切换城市</h3>
                </div>
                
                <div class="prompt-input-group">
                    <label>请输入城市名称</label>
                    <input type="text" id="cityInput" value="${Utils.escapeHtml(this.currentCity)}" placeholder="例如：北京、上海、广州...">
                    <p class="prompt-hint">提示：请输入完整的城市名，如"北京市"、"上海市"</p>
                </div>
                
                <div class="hot-cities">
                    <p>热门城市：</p>
                    <div class="hot-city-buttons">
                        ${['北京市', '上海市', '广州市', '深圳市', '杭州市', '南京市', '成都市', '武汉市'].map(city => `
                            <button type="button" class="hot-city-btn" data-city="${Utils.escapeHtml(city)}">${Utils.escapeHtml(city)}</button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="prompt-actions">
                    <button type="button" id="cancelCityBtn" class="weather-action-btn cancel-btn">取消</button>
                    <button type="button" id="confirmCityBtn" class="weather-action-btn confirm-btn">确认切换</button>
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
        const cityInput = modal.querySelector('#cityInput');
        const quickCityBtns = modal.querySelectorAll('.hot-city-btn');

        quickCityBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                cityInput.value = btn.dataset.city;
            });
        });

        confirmBtn.addEventListener('click', async () => {
            const newCity = cityInput.value.trim();
            if (!newCity) {
                alert('请输入城市名称');
                return;
            }

            this.useAutoLocation = false;
            this.setCity(newCity);
            
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 切换中...';
            confirmBtn.disabled = true;
            
            try {
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
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'translateY(20px)';
            }
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        };

        cancelBtn.addEventListener('click', hidePrompt);
        
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                hidePrompt();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hidePrompt();
                document.removeEventListener('keydown', escHandler);
            }
        });

        cityInput.focus();
        cityInput.select();
    }

    hideCityPrompt(modal) {
        if (!modal) return;
        
        modal.style.opacity = '0';
        const content = modal.querySelector('.city-prompt-content');
        if (content) {
            content.style.opacity = '0';
            content.style.transform = 'translateY(20px)';
        }
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    async handleLocationRefresh() {
        try {
            if (window.app && window.app.showToast) {
                window.app.showToast('正在获取您的位置...', 'info');
            }
            
            const locationBtn = this.modalElement.querySelector('#weatherLocationBtn');
            if (locationBtn) {
                locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                locationBtn.disabled = true;
            }
            
            await this.getCurrentPosition();
            await this.loadWeatherData();
            this.updateModalContent();
            
            if (window.app && window.app.showToast) {
                window.app.showToast('位置已更新', 'success');
            }
        } catch (error) {
            console.error('定位刷新失败:', error);
            if (window.app && window.app.showToast) {
                window.app.showToast('定位失败，请检查权限设置', 'error');
            }
        } finally {
            const locationBtn = this.modalElement.querySelector('#weatherLocationBtn');
            if (locationBtn) {
                locationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
                locationBtn.disabled = false;
            }
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(async () => {
            console.log('自动刷新天气数据...');
            try {
                await this.loadWeatherData();
                
                if (this.isShowing && this.modalElement) {
                    this.updateModalContent();
                }
            } catch (error) {
                console.warn('自动刷新天气数据失败:', error);
            }
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
        }
    }

    closeOtherModals() {
        if (window.sidebar && window.sidebar.isVisible) {
            window.sidebar.hide();
        }
        
        if (window.searchModule && window.searchModule.isModalOpen) {
            window.searchModule.hide();
        }
        
        if (window.app && window.app.components && window.app.components.navbar) {
            window.app.components.navbar.hideMusicPlayer();
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
            
            if (window.app) {
                window.app.unregisterModal(this);
            }
        }, 200);
    }

    async refreshWeather() {
        try {
            await this.loadWeatherData();
            return true;
        } catch (error) {
            console.error('手动刷新天气数据失败:', error);
            return false;
        }
    }

    setCity(city) {
        this.currentCity = city;
        this.saveCity(city);
        this.weatherData = null;
    }

    getWeatherData() {
        return this.weatherData;
    }

    getCurrentCity() {
        return this.currentCity;
    }

    destroy() {
        this.hide();
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
        this.modalElement = null;
        
        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) {
            weatherBtn.removeEventListener('click', this.showModalBound);
        }
        
        this.initialized = false;
    }
}

if (typeof window !== 'undefined') {
    window.WeatherModule = WeatherModule;
}