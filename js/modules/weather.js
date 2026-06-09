/**
 * 天气模块 - 基于 APiHz 地点天气 API（支持省份+城市查询）
 * 数据源：
 *   1. 主要：https://cn.apihz.cn/api/tianqi/tqyb.php (支持省份+城市，用于手动选择及自动定位)
 *   2. 备用：https://cn.apihz.cn/api/tianqi/tqybip.php (IP 天气，仅当主 API 失效时使用)
 * 定位：通过 IP 归属地 API (https://cn.apihz.cn/api/ip/chaapi.php) 获取省份和城市
 */
class WeatherModule {
    static CONFIG = {
        // 主要天气 API（支持省份+城市）
        WEATHER_API_PLACE: 'https://cn.apihz.cn/api/tianqi/tqyb.php',
        // 备用 IP 天气 API
        WEATHER_API_IP: 'https://cn.apihz.cn/api/tianqi/tqybip.php',
        // IP 归属地 API（用于自动定位）
        IP_LOCATION_API: 'https://cn.apihz.cn/api/ip/chaapi.php',
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
        this.useAutoLocation = true;
        this.manualCity = null;
        this.manualProvince = null;   // 手动选择时可能用到的省份
        this.escHandler = null;
        this.showModalBound = this.showModal.bind(this);
        // APiHz API 凭证
        this.apiId = '10014221';
        this.apiKey = '4a7768de1cf2e0f41fc0a4005240c837';
    }

    _escapeHtml(text) {
        if (typeof Utils !== 'undefined' && Utils.escapeHtml) {
            return Utils.escapeHtml(text);
        }
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            return '&#39;';
        });
    }

    async init() {
        if (this.initialized) return;
        console.log('天气模块开始初始化...');
        this.bindGlobalEvents();
        this.startAutoRefresh();
        await this.loadSavedCity();
        if (this.useAutoLocation) {
            await this.tryAutoLocation();
        } else {
            await this.loadWeatherData();
        }
        this.initialized = true;
        console.log('天气模块初始化完成');
    }

    loadSavedCity() {
        try {
            const useAuto = localStorage.getItem('weather_use_auto_location') === 'true';
            const manual = localStorage.getItem('weather_manual_city');
            const manualProv = localStorage.getItem('weather_manual_province');
            if (!useAuto && manual) {
                this.currentCity = manual;
                this.manualCity = manual;
                this.manualProvince = manualProv || null;
                this.useAutoLocation = false;
                console.log('使用手动选择的城市:', manual, '省份:', manualProv);
                return;
            }
            this.useAutoLocation = true;
            const savedAutoCity = localStorage.getItem('weather_city');
            if (savedAutoCity) {
                this.currentCity = savedAutoCity;
                console.log('使用上次定位的城市:', savedAutoCity);
            } else {
                this.currentCity = '北京';
            }
        } catch (e) {
            console.error('加载城市设置失败:', e);
        }
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
            } else {
                localStorage.setItem('weather_city', city);
                localStorage.setItem('weather_use_auto_location', 'true');
                this.useAutoLocation = true;
                localStorage.removeItem('weather_manual_city');
                localStorage.removeItem('weather_manual_province');
            }
            this.currentCity = city;
            console.log('城市已保存:', city, isManual ? '(手动)' : '(自动)', province ? `省份:${province}` : '');
        } catch (error) {
            console.error('保存城市失败:', error);
        }
    }

    /**
     * 通过 IP 获取精准归属地（省份+城市）
     * 使用 chaapi.php 接口
     */
    async fetchIpLocation() {
        const url = `${WeatherModule.CONFIG.IP_LOCATION_API}?id=${this.apiId}&key=${this.apiKey}&td=0`;
        try {
            const response = await Utils.safeFetch(url, { timeout: 5000 });
            const data = await response.json();
            if (data.code === 200 && data.sheng && data.shi) {
                let province = data.sheng.replace(/省$/, '').replace(/市$/, '');
                let city = data.shi.replace(/市$/, '').replace(/县$/, '').replace(/区$/, '');
                return { city, province, full: data.msg };
            }
            throw new Error(data.msg || 'IP 归属地查询失败');
        } catch (error) {
            console.warn('IP 归属地查询失败:', error);
            throw error;
        }
    }

    async tryAutoLocation() {
        try {
            this.useAutoLocation = true;
            await this.loadWeatherDataByIp();
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

    /**
     * 自动定位天气：先通过 IP 获取省份+城市，再调用主 API 查询天气
     * 若主 API 失败，则降级到备用 IP 天气 API
     */
    async loadWeatherDataByIp() {
        try {
            // 1. 获取省份和城市
            let location = null;
            try {
                location = await this.fetchIpLocation();
            } catch (e) {
                console.warn('归属地查询失败，将使用默认城市或备用 API');
            }

            if (location && location.city && location.province) {
                // 2. 使用主 API 查询该地点天气
                try {
                    this.weatherData = await this.fetchWeatherDataByPlace(location.province, location.city);
                    this.weatherData.city = location.city;
                    this.saveCity(location.city, false);
                    return true;
                } catch (mainError) {
                    console.warn('主 API 查询失败，降级到备用 IP 天气 API', mainError);
                    // 降级：使用备用 IP 天气 API
                    this.weatherData = await this.fetchWeatherDataByIpFallback();
                    if (this.weatherData && this.weatherData.city) {
                        this.saveCity(this.weatherData.city, false);
                    }
                    return true;
                }
            } else {
                // 没有获取到位置，直接使用备用 IP 天气 API
                this.weatherData = await this.fetchWeatherDataByIpFallback();
                if (this.weatherData && this.weatherData.city) {
                    this.saveCity(this.weatherData.city, false);
                }
                return true;
            }
        } catch (error) {
            console.error('自动定位加载天气失败:', error);
            this.weatherData = null;
            throw error;
        }
    }

    /**
     * 通过省份+城市查询天气（主 API）
     * @param {string} province 省份名称（不带"省"字，如"四川"）
     * @param {string} place 地点名称（市级，不带"市"字，如"绵阳"）
     */
    async fetchWeatherDataByPlace(province, place) {
        const url = `${WeatherModule.CONFIG.WEATHER_API_PLACE}?id=${this.apiId}&key=${this.apiKey}&sheng=${encodeURIComponent(province)}&place=${encodeURIComponent(place)}&day=7&hourtype=0&suntimetype=0`;
        try {
            const response = await Utils.safeFetch(url, { timeout: 10000 });
            const data = await response.json();
            if (data.code !== 200) {
                throw new Error(data.msg || '获取天气数据失败');
            }
            // 新 API 返回格式与 IP 天气 API 基本一致，可使用相同的解析函数
            return this.parseWeatherData(data);
        } catch (error) {
            Utils.handleApiError(error, '获取天气数据失败');
            throw error;
        }
    }

    /**
     * 通过城市名查询天气（手动选择场景）
     * 由于用户只输入城市名，需要尝试补全省份。简化：先尝试只传 place，若不成功再尝试内置映射。
     */
    async loadWeatherDataByCity(city) {
        try {
            // 尝试直接使用城市名作为 place，不传省份
            let weather = await this.fetchWeatherDataByPlaceOnly(city);
            this.weatherData = weather;
            if (this.weatherData && this.weatherData.city) {
                this.currentCity = this.weatherData.city;
                // 保存时标记为手动，省份留空
                this.saveCity(city, true, null);
            }
            return true;
        } catch (error) {
            console.error('通过城市名加载天气数据失败:', error);
            // 可选：尝试通过内置城市-省份映射再试一次
            const province = this.guessProvinceByCity(city);
            if (province) {
                try {
                    this.weatherData = await this.fetchWeatherDataByPlace(province, city);
                    this.weatherData.city = city;
                    this.saveCity(city, true, province);
                    return true;
                } catch (e) {
                    console.error('使用映射省份后仍然失败:', e);
                }
            }
            this.weatherData = null;
            throw error;
        }
    }

    /**
     * 只传 place（城市名）调用主 API
     */
    async fetchWeatherDataByPlaceOnly(place) {
        const url = `${WeatherModule.CONFIG.WEATHER_API_PLACE}?id=${this.apiId}&key=${this.apiKey}&place=${encodeURIComponent(place)}&day=7&hourtype=0&suntimetype=0`;
        try {
            const response = await Utils.safeFetch(url, { timeout: 10000 });
            const data = await response.json();
            if (data.code !== 200) {
                throw new Error(data.msg || '获取天气数据失败');
            }
            return this.parseWeatherData(data);
        } catch (error) {
            Utils.handleApiError(error, '获取天气数据失败');
            throw error;
        }
    }

    /**
     * 简单的城市到省份映射（用于手动查询补全）
     * 可根据需要扩充
     */
    guessProvinceByCity(city) {
        const map = {
            '北京': '北京', '上海': '上海', '天津': '天津', '重庆': '重庆',
            '广州': '广东', '深圳': '广东', '珠海': '广东', '佛山': '广东', '东莞': '广东',
            '杭州': '浙江', '宁波': '浙江', '温州': '浙江', '绍兴': '浙江',
            '南京': '江苏', '苏州': '江苏', '无锡': '江苏', '常州': '江苏', '徐州': '江苏',
            '成都': '四川', '绵阳': '四川', '宜宾': '四川', '德阳': '四川',
            '武汉': '湖北', '宜昌': '湖北', '襄阳': '湖北',
            '西安': '陕西', '咸阳': '陕西', '宝鸡': '陕西',
            '郑州': '河南', '洛阳': '河南', '开封': '河南',
            '长沙': '湖南', '株洲': '湖南', '湘潭': '湖南',
            '济南': '山东', '青岛': '山东', '烟台': '山东', '威海': '山东',
            '合肥': '安徽', '芜湖': '安徽', '蚌埠': '安徽',
            '福州': '福建', '厦门': '福建', '泉州': '福建',
            '南昌': '江西', '九江': '江西', '赣州': '江西',
            '南宁': '广西', '桂林': '广西', '柳州': '广西',
            '昆明': '云南', '丽江': '云南', '大理': '云南',
            '贵阳': '贵州', '遵义': '贵州',
            '兰州': '甘肃', '酒泉': '甘肃',
            '乌鲁木齐': '新疆', '克拉玛依': '新疆',
            '呼和浩特': '内蒙古', '包头': '内蒙古',
            '哈尔滨': '黑龙江', '大庆': '黑龙江',
            '长春': '吉林', '吉林': '吉林',
            '沈阳': '辽宁', '大连': '辽宁',
            '石家庄': '河北', '唐山': '河北',
            '太原': '山西', '大同': '山西',
            '西宁': '青海',
            '银川': '宁夏',
            '拉萨': '西藏',
            '海口': '海南', '三亚': '海南'
        };
        return map[city] || null;
    }

    /**
     * 备用 API：IP 天气（不依赖城市名）
     */
    async fetchWeatherDataByIpFallback() {
        const url = `${WeatherModule.CONFIG.WEATHER_API_IP}?id=${this.apiId}&key=${this.apiKey}&day=7&hourtype=0&suntimetype=0`;
        try {
            const response = await Utils.safeFetch(url, { timeout: 8000 });
            const data = await response.json();
            if (data.code !== 200) {
                throw new Error(data.msg || '获取天气数据失败');
            }
            return this.parseWeatherData(data);
        } catch (error) {
            Utils.handleApiError(error, '获取天气数据失败');
            throw error;
        }
    }

    async loadWeatherData() {
        try {
            if (this.useAutoLocation) {
                await this.loadWeatherDataByIp();
            } else if (this.manualCity) {
                await this.loadWeatherDataByCity(this.manualCity);
            } else {
                await this.loadWeatherDataByIp();
            }
            return true;
        } catch (error) {
            console.error('加载天气数据失败:', error);
            this.weatherData = null;
            throw error;
        }
    }

    /**
     * 解析天气数据（兼容主 API 和备用 API 返回格式）
     */
    parseWeatherData(data) {
        if (!data || data.code !== 200) {
            throw new Error(data?.msg || '天气数据格式错误');
        }

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
                '毛毛雨': 'fas fa-cloud-rain',
                '扬沙': 'fas fa-wind',
                '沙尘暴': 'fas fa-wind'
            };
            for (const [key, icon] of Object.entries(iconMap)) {
                if (condition.includes(key)) return icon;
            }
            return 'fas fa-cloud-sun';
        };

        // 提取城市名
        let cityName = '未知';
        if (data.place) {
            const placeParts = data.place.split(',');
            cityName = placeParts[1] ? placeParts[1].trim() : placeParts[0].trim();
        } else {
            cityName = data.name || data.shi || data.sheng || '未知';
        }
        if (cityName.endsWith('市')) cityName = cityName.slice(0, -1);
        if (cityName.endsWith('县')) cityName = cityName.slice(0, -1);
        if (cityName.endsWith('区')) cityName = cityName.slice(0, -1);

        const todayWeather = data.weather1 || '未知';
        const todayTempDay = data.wd1 || '';
        const todayTempNight = data.wd2 || '';
        const todayWindDir = data.winddirection1 || '';
        const todayWindScale = data.windleve1 || '';

        const nowInfo = data.nowinfo || {};
        const currentTemp = nowInfo.temperature;
        const currentHumidity = nowInfo.humidity;

        // 未来几天预报
        const dayKeys = ['weatherday2', 'weatherday3', 'weatherday4', 'weatherday5', 'weatherday6', 'weatherday7'];
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const forecasts = [];
        const today = new Date();
        for (let i = 0; i < Math.min(dayKeys.length, 6); i++) {
            const dayData = data[dayKeys[i]];
            if (!dayData) continue;
            const forecastDate = new Date(today);
            forecastDate.setDate(today.getDate() + (i + 1));
            const dayName = i === 0 ? '明天' : weekdays[forecastDate.getDay()];
            forecasts.push({
                day: dayName,
                weather: dayData.weather1 || '未知',
                icon: getWeatherIcon(dayData.weather1),
                dayTemp: dayData.wd1 ? dayData.wd1 + '°C' : '--',
                nightTemp: dayData.wd2 ? dayData.wd2 + '°C' : '--',
                wind: (dayData.winddirection1 || '') + (dayData.windleve1 ? ' ' + dayData.windleve1 : '')
            });
        }

        const tips = this.generateWeatherTips(todayWeather, todayTempDay);

        return {
            city: cityName,
            dayTemperature: todayTempDay ? todayTempDay + '°C' : '--',
            nightTemperature: todayTempNight ? todayTempNight + '°C' : '--',
            weather: todayWeather,
            weatherIcon: getWeatherIcon(todayWeather),
            currentTemp: currentTemp !== undefined ? currentTemp + '°C' : todayTempDay ? todayTempDay + '°C' : '--',
            humidity: currentHumidity !== undefined ? currentHumidity + '%' : '--',
            wind: (todayWindDir ? todayWindDir + ' ' : '') + todayWindScale,
            visibility: nowInfo.visibility || '--',
            airQuality: nowInfo.air || '--',
            updateTime: data.uptime ? data.uptime : (nowInfo.uptime || '刚刚'),
            tips: tips,
            forecasts: forecasts
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
        return tips.length > 0 ? tips.join('；') : '天气信息更新，请注意查看详情';
    }

    // ========== UI 渲染与交互（保持不变） ==========
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
            if (content) {
                content.style.transform = 'translateY(0) scale(1)';
                content.style.opacity = '1';
            }
        });
        if (window.app) window.app.registerModal(this);
        this.isLoading = true;
        this.loadWeatherData().then(() => {
            this.updateModalContent();
        }).catch(error => {
            console.error('加载天气数据失败:', error);
            this.updateModalContent();
            if (window.app && window.app.showToast) {
                window.app.showToast('天气数据加载失败，请稍后重试', 'error');
            }
        }).finally(() => {
            this.isLoading = false;
        });
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
                                <div class="temp-label">当前</div>
                                <div class="temp-value day">${weatherData.currentTemp || weatherData.dayTemperature}</div>
                            </div>
                            <div class="temp-separator">/</div>
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
                    <div class="detail-icon"><i class="fas fa-tint"></i></div>
                    <div class="detail-label">湿度</div>
                    <div class="detail-value">${esc(weatherData.humidity)}</div>
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
        `;
    }

    bindEvents() {
        if (!this.modalElement) return;

        const closeBtn = this.modalElement.querySelector('#weatherCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.hide(); });

        const changeCityBtn = this.modalElement.querySelector('#changeCityBtn');
        if (changeCityBtn) {
            changeCityBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('手动选择城市按钮被点击');
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
            if (e.target === this.modalElement) this.hide();
        });

        const escHandler = (e) => {
            if (e.key === 'Escape' && this.isShowing) this.hide();
        };
        document.addEventListener('keydown', escHandler);
        this.escHandler = escHandler;
    }

    showCityPrompt() {
        console.log('showCityPrompt 被调用');
        try {
            const esc = this._escapeHtml.bind(this);
            const modal = document.createElement('div');
            modal.className = 'city-prompt-modal';
            modal.classList.add('active');
            modal.style.display = 'flex';
            modal.style.opacity = '1';

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

            const content = modal.querySelector('.city-prompt-content');
            if (content) {
                content.style.transform = 'scale(1)';
                content.style.opacity = '1';
            }

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
                // 移除末尾的市、县、区
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
                modal.classList.remove('active');
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
        } catch (err) {
            console.error('showCityPrompt 出错:', err);
        }
    }

    hideCityPrompt(modal) {
        if (!modal) return;
        modal.classList.remove('active');
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
            this.useAutoLocation = true;
            await this.loadWeatherDataByIp();
            this.updateModalContent();
            if (window.app && window.app.showToast) window.app.showToast('位置已更新，已切换为自动定位', 'success');
        } catch (error) {
            console.error('定位刷新失败:', error);
            if (window.app && window.app.showToast) window.app.showToast('定位失败，请检查网络', 'error');
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

    closeOtherModals() {
        if (window.sidebar && window.sidebar.isVisible) window.sidebar.hide();
        if (window.searchModule && window.searchModule.isModalOpen) window.searchModule.hide();
        if (window.app?.components?.navbar?.hideMusicPlayer) {
            window.app.components.navbar.hideMusicPlayer();
        }
    }

    hide() {
        if (!this.isShowing || !this.modalElement) return;
        this.modalElement.classList.remove('active');
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
            if (window.app) window.app.unregisterModal(this);
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