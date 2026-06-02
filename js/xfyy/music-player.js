/**
 * 主播放器类 - 完整优化版（包含互斥自定义下拉菜单）
 */

// ==================== 自定义下拉选择器组件（增强互斥版） ====================
class CustomSelect {
    // 静态属性：记录当前打开的实例
    static currentOpenInstance = null;

    constructor(selectElement) {
        this.selectElement = selectElement;
        this.container = null;
        this.trigger = null;
        this.dropdown = null;
        this.options = [];
        this.isOpen = false;
        this.value = selectElement.value;
        this.init();
    }

    init() {
        this.selectElement.style.display = 'none';
        this.container = document.createElement('div');
        this.container.className = 'custom-select';
        this.container.setAttribute('data-select-id', this.selectElement.id || '');

        this.trigger = document.createElement('div');
        this.trigger.className = 'custom-select-trigger';
        this.trigger.innerHTML = `
            <span class="custom-select-value">${this.getSelectedText()}</span>
            <span class="arrow"></span>
        `;
        this.container.appendChild(this.trigger);
        this.selectElement.parentNode.insertBefore(this.container, this.selectElement.nextSibling);

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'custom-select-dropdown';
        this.populateOptions();
        this.container.appendChild(this.dropdown);

        this.bindEvents();
        this.selectElement.addEventListener('change', () => {
            this.setValue(this.selectElement.value, false);
        });
    }

    getSelectedText() {
        const option = this.selectElement.options[this.selectElement.selectedIndex];
        return option ? option.textContent : '';
    }

    populateOptions() {
        this.dropdown.innerHTML = '';
        this.options = [];

        for (let i = 0; i < this.selectElement.options.length; i++) {
            const option = this.selectElement.options[i];
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-select-option';
            if (i === this.selectElement.selectedIndex) {
                optionDiv.classList.add('selected');
            }
            optionDiv.textContent = option.textContent;
            optionDiv.setAttribute('data-value', option.value);
            optionDiv.setAttribute('data-index', i);

            optionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectOption(i);
                this.closeDropdown();
            });

            this.dropdown.appendChild(optionDiv);
            this.options.push(optionDiv);
        }
    }

    selectOption(index) {
        if (index === this.selectElement.selectedIndex) return;

        this.selectElement.selectedIndex = index;
        this.value = this.selectElement.value;

        const valueSpan = this.trigger.querySelector('.custom-select-value');
        if (valueSpan) {
            valueSpan.textContent = this.selectElement.options[index].textContent;
        }

        this.options.forEach((opt, i) => {
            opt.classList.toggle('selected', i === index);
        });

        const changeEvent = new Event('change', { bubbles: true });
        this.selectElement.dispatchEvent(changeEvent);
    }

    setValue(value, triggerChange = true) {
        for (let i = 0; i < this.selectElement.options.length; i++) {
            if (this.selectElement.options[i].value === value) {
                this.selectOption(i);
                break;
            }
        }
    }

    updateDropdownPosition() {
        if (!this.isOpen) return;
        const rect = this.trigger.getBoundingClientRect();
        this.dropdown.style.position = 'fixed';
        this.dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
        this.dropdown.style.left = `${rect.left + window.scrollX}px`;
        this.dropdown.style.width = `${rect.width}px`;
        this.dropdown.style.maxHeight = '200px';
        this.dropdown.style.overflowY = 'auto';
    }

    openDropdown() {
        if (this.isOpen) return;
        // 互斥：关闭其他已打开的下拉菜单
        if (CustomSelect.currentOpenInstance && CustomSelect.currentOpenInstance !== this) {
            CustomSelect.currentOpenInstance.closeDropdown();
        }
        this.isOpen = true;
        this.trigger.classList.add('open');
        this.updateDropdownPosition();
        this.dropdown.classList.add('open');
        CustomSelect.currentOpenInstance = this;

        // 监听滚动和窗口大小变化，实时更新位置
        this.scrollListener = () => this.updateDropdownPosition();
        this.resizeListener = () => this.updateDropdownPosition();
        window.addEventListener('scroll', this.scrollListener, true);
        window.addEventListener('resize', this.resizeListener);

        // 点击外部关闭
        this.handleOutsideClick = (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        };
        setTimeout(() => document.addEventListener('click', this.handleOutsideClick), 0);
    }

    closeDropdown() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.trigger.classList.remove('open');
        this.dropdown.classList.remove('open');
        if (CustomSelect.currentOpenInstance === this) {
            CustomSelect.currentOpenInstance = null;
        }
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener, true);
            window.removeEventListener('resize', this.resizeListener);
        }
        document.removeEventListener('click', this.handleOutsideClick);
    }

    bindEvents() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isOpen ? this.closeDropdown() : this.openDropdown();
        });
    }

    refreshOptions() {
        this.populateOptions();
        const valueSpan = this.trigger.querySelector('.custom-select-value');
        if (valueSpan) valueSpan.textContent = this.getSelectedText();
    }

    destroy() {
        this.closeDropdown();
        this.container.remove();
        this.selectElement.style.display = '';
    }
}

// 初始化所有自定义选择器（排行榜和倍速）
function initCustomSelects() {
    const playlistSelects = document.querySelectorAll('.playlist-selector select');
    playlistSelects.forEach(select => {
        if (!select.parentNode.querySelector('.custom-select')) {
            new CustomSelect(select);
        }
    });
    const speedSelect = document.querySelector('#speed-select');
    if (speedSelect && !speedSelect.parentNode.querySelector('.custom-select')) {
        new CustomSelect(speedSelect);
    }
}

/**
 * 主播放器类
 */
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-element');
        this.cacheManager = new CacheManager();
        this.lyricParser = new LyricParser();
        this.pluginManager = new PluginManager(this.cacheManager);
        
        this.initializeProperties();
        this.initializeElements();
        this.bindEvents();
        this.initializePlayer();
    }

    /**
     * 初始化属性
     */
    initializeProperties() {
        // 播放状态
        this.isPlaying = this.loadPlayState();
        this.isLoading = false;
        
        // 播放列表
        this.currentPlaylist = [];
        this.currentIndex = 0;
        this.currentApi = 'netease';
        
        // 播放设置
        this.volume = this.loadVolume();
        this.playMode = this.loadPlayMode();
        this.playbackSpeed = this.loadPlaybackSpeed();
        this.autoPlayNext = true;
        
        // 歌词
        this.currentLyricIndex = -1;
        this.isHorizontalScroll = this.loadLyricsMode();
        this.showTranslation = true;
        
        // 进度控制
        this.isDraggingProgress = false;
        
        // 搜索状态
        this.searchResults = new Map();
        this.isSearchMode = new Map();
        
        // 音量控制
        this.isVolumeSliderVisible = false;
        
        // 颜色提取
        this.dominantColor = null;
        this.secondaryColor = null;
        this.colorExtractor = new ColorExtractor();
        
        // 背景动画
        this.backgroundAnimation = null;
        this.isBackgroundAnimated = false;
        
        // 初始化API搜索模式状态
        const apis = ['netease', 'qq', 'kg', 'kuwo', 'migu'];
        apis.forEach(api => {
            this.isSearchMode.set(api, false);
        });
    }

    /**
     * 初始化DOM元素引用
     */
    initializeElements() {
        this.elements = {
            // 基本信息
            coverImg: document.getElementById('cover-img'),
            songTitle: document.getElementById('song-title'),
            songArtist: document.getElementById('song-artist'),
            
            // 控制按钮
            playBtn: document.getElementById('play-btn'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            modeBtn: document.getElementById('mode-btn'),
            volumeBtn: document.getElementById('volume-btn'),
            volumeSlider: document.getElementById('volume-slider'),
            volumeSliderContainer: document.getElementById('volume-slider-container'),
            downloadBtn: document.getElementById('download-btn'),
            searchToggleBtn: document.getElementById('search-toggle-btn'),
            
            // 进度相关
            progressBar: document.getElementById('progress-bar'),
            progress: document.getElementById('progress'),
            progressHandle: document.getElementById('progress-handle'),
            currentTime: document.getElementById('current-time'),
            duration: document.getElementById('duration'),
            speedSelect: document.getElementById('speed-select'),
            
            // 歌词
            lyricsContainer: document.getElementById('lyrics-container'),
            lyricsSection: document.querySelector('.lyrics-section'),
            
            // 播放器容器
            player: document.querySelector('.music-player'),
            
            // 通知
            notification: document.getElementById('notification')
        };

        // 初始化API相关的元素
        this.initializeApiElements();
    }

    /**
     * 初始化API相关的元素
     */
    initializeApiElements() {
        const apis = ['netease', 'qq', 'kg', 'kuwo', 'migu'];
        this.apiElements = {};
        
        apis.forEach(api => {
            this.apiElements[api] = {
                playlistContainer: document.getElementById(`${api}-playlist-container`),
                searchContainer: document.getElementById(`${api}-search-container`),
                playlistSelect: document.getElementById(`${api}-playlist-select`),
                searchInput: document.getElementById(`${api}-search-input`),
                searchResults: document.getElementById(`${api}-search-results`),
                contentContainer: document.querySelector(`#${api}-content .content-container`)
            };
        });
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 播放控制事件
        this.elements.playBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevBtn.addEventListener('click', () => this.previous());
        this.elements.nextBtn.addEventListener('click', () => this.next());
        
        // 播放模式
        this.elements.modeBtn.addEventListener('click', () => this.togglePlayMode());
        
        // 音量控制
        this.elements.volumeBtn.addEventListener('click', () => this.toggleVolumeSlider());
        this.elements.volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.setVolume(volume);
            this.saveVolume(volume);
        });
        
        // 播放速度控制
        this.elements.speedSelect.addEventListener('change', (e) => {
            const speed = parseFloat(e.target.value);
            this.setPlaybackSpeed(speed);
            this.savePlaybackSpeed(speed);
        });
        
        // 下载按钮
        this.elements.downloadBtn.addEventListener('click', () => this.downloadCurrentSong());
        
        // 搜索切换按钮
        this.elements.searchToggleBtn.addEventListener('click', () => {
            this.toggleSearchMode(this.currentApi);
        });
        
        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const api = e.target.getAttribute('data-tab');
                this.switchApiTab(api);
            });
        });
        
        // 进度条事件
        this.bindProgressEvents();
        
        // 音频事件
        this.bindAudioEvents();
        
        // API相关事件
        this.bindApiEvents();
        
        // 歌词容器点击事件
        this.elements.lyricsContainer.addEventListener('click', () => this.toggleLyricsScrollMode());
        
        // 点击其他地方隐藏音量条
        document.addEventListener('click', (e) => {
            if (this.isVolumeSliderVisible && 
                !this.elements.volumeBtn.contains(e.target) && 
                !this.elements.volumeSliderContainer.contains(e.target)) {
                this.hideVolumeSlider();
            }
        });

        // 窗口失去焦点时暂停背景动画以节省性能
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseBackgroundAnimation();
            } else {
                this.resumeBackgroundAnimation();
            }
        });
        
        // 关闭按钮事件
        const closeBtn = document.getElementById('player-close-btn');
        const navMusicBtn = document.getElementById('nav-music-btn');
        const musicPlayerElement = document.querySelector('.music-player');
        
        if (closeBtn && navMusicBtn && musicPlayerElement) {
            closeBtn.addEventListener('click', () => {
                musicPlayerElement.classList.remove('show');
                navMusicBtn.style.background = 'rgba(74, 144, 226, 0.1)';
                navMusicBtn.style.borderColor = 'rgba(74, 144, 226, 0.3)';
            });
        }
    }

    /**
     * 绑定API相关事件
     */
    bindApiEvents() {
        const apis = ['netease', 'qq', 'kg', 'kuwo', 'migu'];
        
        apis.forEach(api => {
            const elements = this.apiElements[api];
            if (!elements) return;
            
            // 歌单选择器变化
            if (elements.playlistSelect) {
                elements.playlistSelect.addEventListener('change', () => {
                    this.loadApiPlaylist(api);
                });
            }
            
            // 搜索输入框回车
            if (elements.searchInput) {
                elements.searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.searchApi(api);
                });
                
                // 搜索输入框实时搜索（防抖）
                elements.searchInput.addEventListener('input', Utils.debounce(() => {
                    if (elements.searchInput.value.trim().length > 2) {
                        this.searchApi(api);
                    }
                }, 500));
            }
        });
    }

    /**
     * 切换API标签页
     */
    async switchApiTab(apiId) {
        // 更新标签页状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${apiId}"]`);
        const tabContent = document.getElementById(`${apiId}-content`);
        
        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');
        
        this.currentApi = apiId;
        
        // 更新搜索切换按钮状态
        this.updateSearchToggleButton();
        
        // 加载该API的歌单
        await this.loadApiPlaylist(apiId);
    }

    /**
     * 加载API歌单
     */
    async loadApiPlaylist(apiId) {
        const elements = this.apiElements[apiId];
        if (!elements) return;
        
        // 抖音热歌榜直接显示歌单
        if (apiId === 'migu') {
            if (elements.playlistContainer) {
                elements.playlistContainer.innerHTML = '<div class="loading">加载抖音热歌榜中...</div>';
            }
            
            // 隐藏搜索容器，显示歌单容器
            if (elements.playlistContainer) elements.playlistContainer.style.display = 'block';
            if (elements.searchContainer) elements.searchContainer.style.display = 'none';
            
            try {
                const playlist = await this.pluginManager.getPlaylist(apiId, 'hot');
                this.renderPlaylist(apiId, playlist);
                this.showNotification(`成功加载 ${playlist.length} 首抖音热歌`, 'info');
            } catch (error) {
                console.error(`加载 ${apiId} 歌单失败:`, error);
                if (elements.playlistContainer) {
                    elements.playlistContainer.innerHTML = `
                        <div class="error-message">
                            <p>加载失败: ${error.message}</p>
                            <button class="retry-btn" onclick="musicPlayer.loadApiPlaylist('${apiId}')">重试</button>
                        </div>
                    `;
                }
            }
            return;
        }
        
        const playlistId = elements.playlistSelect ? elements.playlistSelect.value : '3778678';
        
        if (elements.playlistContainer) {
            elements.playlistContainer.innerHTML = '<div class="loading">加载中...</div>';
        }
        
        try {
            const playlist = await this.pluginManager.getPlaylist(apiId, playlistId);
            this.renderPlaylist(apiId, playlist);
            this.showNotification(`成功加载 ${playlist.length} 首歌曲`, 'info');
        } catch (error) {
            console.error(`加载 ${apiId} 歌单失败:`, error);
            if (elements.playlistContainer) {
                elements.playlistContainer.innerHTML = `
                    <div class="error-message">
                        <p>加载失败: ${error.message}</p>
                        <button class="retry-btn" onclick="musicPlayer.loadApiPlaylist('${apiId}')">重试</button>
                    </div>
                `;
            }
        }
    }

    /**
     * 搜索API
     */
    async searchApi(apiId) {
        // 抖音热歌榜不支持搜索
        if (apiId === 'migu') {
            this.showNotification('抖音热歌榜不支持搜索功能', 'info');
            return;
        }
        
        const elements = this.apiElements[apiId];
        if (!elements || !elements.searchInput) return;
        
        const keyword = elements.searchInput.value.trim();
        if (!keyword) {
            if (elements.searchResults) {
                elements.searchResults.innerHTML = '<div class="loading">请输入搜索关键词</div>';
            }
            return;
        }
        
        console.log(`开始搜索: ${apiId}, 关键词: ${keyword}`);
        
        if (elements.searchResults) {
            elements.searchResults.innerHTML = '<div class="loading">搜索中...</div>';
        }
        
        try {
            const results = await this.pluginManager.search(apiId, keyword);
            console.log(`搜索完成, 结果数量: ${results.length}`, results);
            
            this.searchResults.set(apiId, results);
            
            if (results.length === 0) {
                this.renderSearchResults(apiId, results);
                this.showNotification(`未找到与"${keyword}"相关的歌曲`, 'info');
            } else {
                this.renderSearchResults(apiId, results);
                this.showNotification(`找到 ${results.length} 个结果`, 'info');
            }
        } catch (error) {
            console.error(`搜索失败:`, error);
            
            if (elements.searchResults) {
                elements.searchResults.innerHTML = `
                    <div class="error-message">
                        <p>搜索失败: ${error.message}</p>
                        <button class="retry-btn" onclick="musicPlayer.searchApi('${apiId}')">重试</button>
                    </div>
                `;
            }
            
            this.showNotification('搜索失败，请查看控制台', 'error');
        }
    }

    /**
     * 渲染播放列表
     */
    renderPlaylist(apiId, playlist) {
        const elements = this.apiElements[apiId];
        if (!elements || !elements.playlistContainer) return;
        
        const container = elements.playlistContainer;
        container.innerHTML = '';
        
        if (playlist.length === 0) {
            container.innerHTML = '<div class="loading">歌单为空</div>';
            return;
        }
        
        playlist.forEach((song, index) => {
            const songItem = this.createSongItem(song, index, playlist);
            container.appendChild(songItem);
        });
        
        this.currentPlaylist = playlist;
        
        // 滚动到当前播放的歌曲
        this.scrollToCurrentSong(apiId);
    }

    /**
     * 创建歌曲项
     */
    createSongItem(song, index, playlist) {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        if (index === this.currentIndex && playlist === this.currentPlaylist) {
            songItem.classList.add('active');
        }
        songItem.innerHTML = `
            <div class="song-item-info">
                <div class="song-item-title">${song.title || '未知歌曲'}</div>
                <div class="song-item-artist">${song.artist || '未知歌手'}</div>
            </div>
        `;
        
        songItem.addEventListener('click', () => {
            this.loadSong(index, playlist);
            this.play();
        });
        
        return songItem;
    }

    /**
     * 滚动到当前播放的歌曲
     */
    scrollToCurrentSong(apiId) {
        const elements = this.apiElements[apiId];
        if (!elements || !elements.playlistContainer) return;
        
        const activeItem = elements.playlistContainer.querySelector('.song-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    /**
     * 渲染搜索结果
     */
    renderSearchResults(apiId, results) {
        const elements = this.apiElements[apiId];
        if (!elements || !elements.searchResults) return;
        
        const container = elements.searchResults;
        container.innerHTML = '';
        
        if (results.length === 0) {
            container.innerHTML = '<div class="loading">未找到相关结果</div>';
            return;
        }
        
        results.forEach((song, index) => {
            const songItem = this.createSearchSongItem(song, index, results);
            container.appendChild(songItem);
        });
    }

    /**
     * 创建搜索结果的歌曲项（包含下载按钮）
     */
    createSearchSongItem(song, index, results) {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.innerHTML = `
            <div class="song-item-info">
                <div class="song-item-title">${song.title || '未知歌曲'}</div>
                <div class="song-item-artist">${song.artist || '未知歌手'}</div>
            </div>
            <button class="search-download-btn" title="下载">
                <svg viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
            </button>
        `;
        
        // 播放点击事件
        songItem.querySelector('.song-item-info').addEventListener('click', () => {
            this.loadSong(index, results);
            this.play();
        });
        
        // 下载按钮事件
        const downloadBtn = songItem.querySelector('.search-download-btn');
        downloadBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.downloadSong(song);
        });
        
        return songItem;
    }

    /**
     * 加载歌曲
     */
    async loadSong(index, playlist = null) {
        const currentPlaylist = playlist || this.currentPlaylist;
        
        if (index < 0 || index >= currentPlaylist.length) return;
        
        this.currentIndex = index;
        const song = currentPlaylist[index];
        
        // 显示加载状态
        this.isLoading = true;
        this.elements.playBtn.disabled = true;
        
        try {
            // 预加载下一首
            if (index < currentPlaylist.length - 1) {
                this.pluginManager.preloadSong(currentPlaylist[index + 1]);
            }
            
            // 更新音频源
            this.audio.src = song.src;
            
            // 更新界面信息
            await this.updateSongInfo(song);
            
            // 加载歌词
            await this.loadLyrics(song);
            
            // 等待音频元数据加载
            await new Promise((resolve) => {
                const checkDuration = () => {
                    if (this.audio.duration && !isNaN(this.audio.duration)) {
                        resolve();
                    } else {
                        setTimeout(checkDuration, 100);
                    }
                };
                checkDuration();
            });
            
            // 滚动到当前播放的歌曲
            this.scrollToCurrentSong(this.currentApi);
            
        } catch (error) {
            console.error('加载歌曲失败:', error);
            this.showNotification('加载歌曲失败', 'error');
        } finally {
            this.isLoading = false;
            this.elements.playBtn.disabled = false;
        }
    }

    /**
     * 更新歌曲信息
     */
    async updateSongInfo(song) {
        if (this.elements.songTitle) {
            this.elements.songTitle.textContent = song.title || '未知歌曲';
            this.checkTextOverflow(this.elements.songTitle);
        }
        if (this.elements.songArtist) {
            this.elements.songArtist.textContent = song.artist || '未知歌手';
            this.checkTextOverflow(this.elements.songArtist);
        }
        
        // 更新封面
        if (this.elements.coverImg && song.cover) {
            this.elements.coverImg.src = song.cover;
            this.elements.coverImg.style.display = 'block';
            const placeholder = document.querySelector('.cover-placeholder');
            if (placeholder) placeholder.style.display = 'none';
            
            // 提取专辑图片主色调
            await this.extractAlbumColor(song.cover);
        }
    }

    /**
     * 检查文本是否溢出并添加滚动动画
     */
    checkTextOverflow(element) {
        const container = element.parentElement;
        if (container.scrollWidth > container.clientWidth) {
            element.classList.add('scrolling');
        } else {
            element.classList.remove('scrolling');
        }
    }

    /**
     * 提取专辑图片主色调
     */
    async extractAlbumColor(imageUrl) {
        try {
            const colors = await this.colorExtractor.getDominantColors(imageUrl, 2);
            this.dominantColor = colors[0];
            this.secondaryColor = colors[1] || colors[0];
            
            this.applyDynamicBackground();
        } catch (error) {
            console.warn('提取专辑颜色失败:', error);
            this.dominantColor = null;
            this.secondaryColor = null;
            this.resetDynamicBackground();
        }
    }

    /**
     * 应用动态背景 - 优化版
     */
    applyDynamicBackground() {
        if (!this.dominantColor) return;
        
        // 停止之前的动画
        this.stopBackgroundAnimation();
        
        const primaryColor = Utils.rgbToHex(this.dominantColor);
        const secondaryColor = Utils.rgbToHex(this.secondaryColor);
        
        // 创建动态渐变背景
        this.startBackgroundAnimation(primaryColor, secondaryColor);
        
        // 应用播放器背景
        this.elements.player.classList.add('dynamic-bg');
        
        // 应用歌词背景
        this.elements.lyricsSection.classList.add('dynamic-bg');
        
        // 根据背景颜色调整文本颜色
        this.adjustTextColors();
    }

    /**
     * 开始背景动画
     */
    startBackgroundAnimation(color1, color2) {
        const player = this.elements.player;
        const lyricsSection = this.elements.lyricsSection;
        
        // 创建CSS变量
        player.style.setProperty('--primary-color', color1);
        player.style.setProperty('--secondary-color', color2);
        
        // 添加动画类
        player.classList.add('animated-bg');
        lyricsSection.classList.add('animated-bg');
        
        this.isBackgroundAnimated = true;
    }

    /**
     * 停止背景动画
     */
    stopBackgroundAnimation() {
        const player = this.elements.player;
        const lyricsSection = this.elements.lyricsSection;
        
        player.classList.remove('animated-bg');
        lyricsSection.classList.remove('animated-bg');
        
        this.isBackgroundAnimated = false;
    }

    /**
     * 暂停背景动画
     */
    pauseBackgroundAnimation() {
        if (this.isBackgroundAnimated) {
            const player = this.elements.player;
            const lyricsSection = this.elements.lyricsSection;
            
            player.style.animationPlayState = 'paused';
            lyricsSection.style.animationPlayState = 'paused';
        }
    }

    /**
     * 恢复背景动画
     */
    resumeBackgroundAnimation() {
        if (this.isBackgroundAnimated) {
            const player = this.elements.player;
            const lyricsSection = this.elements.lyricsSection;
            
            player.style.animationPlayState = 'running';
            lyricsSection.style.animationPlayState = 'running';
        }
    }

    /**
     * 根据背景颜色调整文本颜色
     */
    adjustTextColors() {
        if (!this.dominantColor) return;
        
        const isLight = Utils.isLightColor(Utils.rgbToHex(this.dominantColor));
        const textColor = isLight ? '#2c3e50' : '#ecf0f1';
        const secondaryColor = isLight ? '#7f8c8d' : '#bdc3c7';
        
        // 应用文本颜色
        document.documentElement.style.setProperty('--dynamic-text-color', textColor);
        document.documentElement.style.setProperty('--dynamic-secondary-color', secondaryColor);
    }

    /**
     * 重置动态背景
     */
    resetDynamicBackground() {
        this.stopBackgroundAnimation();
        this.elements.player.classList.remove('dynamic-bg');
        this.elements.player.style.background = '';
        this.elements.lyricsSection.classList.remove('dynamic-bg');
        this.elements.lyricsSection.style.background = '';
        
        // 重置文本颜色
        document.documentElement.style.removeProperty('--dynamic-text-color');
        document.documentElement.style.removeProperty('--dynamic-secondary-color');
    }

    /**
     * 加载歌词
     */
    async loadLyrics(song) {
        this.lyricParser.clear();
        
        if (!song.lrc) {
            this.updateLyricsDisplay([], this.isHorizontalScroll);
            return;
        }
        
        try {
            const response = await fetch(song.lrc);
            const lyricsText = await response.text();
            const lyrics = this.lyricParser.parseLrc(lyricsText);
            
            // 检查是否有翻译歌词（通常翻译歌词以[tr:]开头）
            const translationLines = lyricsText.split('\n').filter(line => 
                line.includes('[tr:') || line.includes('[翻译]')
            );
            
            if (translationLines.length > 0) {
                // 处理翻译歌词
                const translationLyrics = translationLines.map(line => {
                    const translationMatch = line.match(/\[tr:(.*?)\]/) || 
                                           line.match(/\[翻译:(.*?)\]/);
                    if (translationMatch) {
                        return {
                            text: translationMatch[1],
                            time: this.extractTimeFromLine(line)
                        };
                    }
                    return null;
                }).filter(Boolean);
                
                this.lyricParser.mergeWithTranslation(translationLyrics);
            }
            // 检查是否为英文歌词，如果是则尝试自动翻译
            else if (this.showTranslation && this.isEnglishLyrics(lyrics)) {
                await this.translateLyrics(lyrics);
            }
            
            // 更新显示
            if (this.isHorizontalScroll) {
                const allLyrics = lyrics.map((lyric, index) => ({
                    ...lyric,
                    active: index === this.currentLyricIndex
                }));
                this.updateLyricsDisplay(allLyrics, true);
            } else {
                const displayLyrics = this.lyricParser.getDisplayLyrics(0, 3);
                this.updateLyricsDisplay(displayLyrics, false);
            }
            
        } catch (error) {
            console.error('加载歌词失败:', error);
            this.updateLyricsDisplay([], this.isHorizontalScroll);
        }
    }

    /**
     * 从歌词行中提取时间戳
     */
    extractTimeFromLine(line) {
        const timeMatch = line.match(/\[(\d+):(\d+)\.(\d+)\]/);
        if (timeMatch) {
            const minutes = parseInt(timeMatch[1]);
            const seconds = parseInt(timeMatch[2]);
            const milliseconds = parseInt(timeMatch[3]);
            return minutes * 60 + seconds + milliseconds / 1000;
        }
        return 0;
    }

    /**
     * 检查是否为英文歌词
     */
    isEnglishLyrics(lyrics) {
        if (lyrics.length === 0) return false;
        
        // 检查前几行歌词是否包含英文字符
        const sampleText = lyrics.slice(0, 5).map(lyric => lyric.text).join(' ');
        const englishRegex = /[a-zA-Z]/;
        return englishRegex.test(sampleText);
    }

    /**
     * 翻译歌词
     */
    async translateLyrics(lyrics) {
        try {
            for (const lyric of lyrics) {
                if (lyric.text && lyric.text.trim()) {
                    const translation = await this.pluginManager.translateText(lyric.text);
                    lyric.translation = translation;
                }
            }
        } catch (error) {
            console.warn('歌词翻译失败:', error);
        }
    }

    /**
     * 更新歌词显示 - 优化版动效
     */
    updateLyricsDisplay(lyrics, isHorizontal = false) {
        if (!this.elements.lyricsContainer) return;
        
        this.elements.lyricsContainer.innerHTML = '';
        
        if (isHorizontal) {
            this.elements.lyricsContainer.classList.add('horizontal-scroll');
            if (lyrics.length === 0) {
                const emptyLine = document.createElement('div');
                emptyLine.className = 'lyrics-line';
                emptyLine.textContent = '暂无歌词';
                this.elements.lyricsContainer.appendChild(emptyLine);
                return;
            }
            
            lyrics.forEach((lyric, index) => {
                const line = document.createElement('div');
                line.className = 'lyrics-line';
                if (lyric.active) {
                    line.classList.add('active');
                    line.classList.add('pulse-animation');
                }
                
                // 确保翻译显示在原文下方
                if (lyric.translation) {
                    line.innerHTML = `
                        <div class="lyrics-original">${lyric.text}</div>
                        <div class="lyrics-translation">${lyric.translation}</div>
                    `;
                } else {
                    line.innerHTML = `<div class="lyrics-original">${lyric.text}</div>`;
                }
                
                this.elements.lyricsContainer.appendChild(line);
            });
            
            const activeLine = this.elements.lyricsContainer.querySelector('.lyrics-line.active');
            if (activeLine) {
                activeLine.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center'
                });
            }
        } else {
            this.elements.lyricsContainer.classList.remove('horizontal-scroll');
            const lineCount = 3;
            
            for (let i = 0; i < lineCount; i++) {
                const line = document.createElement('div');
                line.className = 'lyrics-line';
                if (lyrics[i]) {
                    // 确保翻译显示在原文下方
                    if (lyrics[i].translation) {
                        line.innerHTML = `
                            <div class="lyrics-original">${lyrics[i].text}</div>
                            <div class="lyrics-translation">${lyrics[i].translation}</div>
                        `;
                    } else {
                        line.innerHTML = `<div class="lyrics-original">${lyrics[i].text}</div>`;
                    }
                    if (lyrics[i].active) {
                        line.classList.add('active');
                        line.classList.add('glow-animation');
                        line.classList.add('new-line');
                        setTimeout(() => line.classList.remove('new-line'), 500);
                    }
                }
                this.elements.lyricsContainer.appendChild(line);
            }
        }
    }

    /**
     * 播放/暂停切换
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * 播放
     */
    play() {
        if (!this.audio.src && this.currentPlaylist.length > 0) {
            this.loadSong(0, this.currentPlaylist);
        }
        
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.savePlayState(true);
            document.querySelector('.album-cover').classList.add('playing');
            
            // 恢复背景动画
            this.resumeBackgroundAnimation();
        }).catch(error => {
            console.error('播放失败:', error);
            this.showNotification('播放失败', 'error');
        });
    }

    /**
     * 暂停
     */
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.savePlayState(false);
        document.querySelector('.album-cover').classList.remove('playing');
        
        // 暂停背景动画以节省性能
        this.pauseBackgroundAnimation();
    }

    /**
     * 更新播放按钮状态
     */
    updatePlayButton() {
        const playIcon = this.elements.playBtn.querySelector('.play-icon');
        const pauseIcon = this.elements.playBtn.querySelector('.pause-icon');
        
        if (this.isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            this.elements.playBtn.classList.add('playing');
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            this.elements.playBtn.classList.remove('playing');
        }
    }

    /**
     * 上一首
     */
    previous() {
        let newIndex;
        
        if (this.playMode === 1) {
            newIndex = Math.floor(Math.random() * this.currentPlaylist.length);
        } else {
            newIndex = this.currentIndex - 1;
            if (newIndex < 0) {
                newIndex = this.currentPlaylist.length - 1;
            }
        }
        this.loadSong(newIndex, this.currentPlaylist);
        if (this.isPlaying) {
            this.play();
        }
    }

    /**
     * 下一首
     */
    next() {
        let newIndex;
        
        if (this.playMode === 1) {
            newIndex = Math.floor(Math.random() * this.currentPlaylist.length);
        } else {
            newIndex = this.currentIndex + 1;
            if (newIndex >= this.currentPlaylist.length) {
                newIndex = 0;
            }
        }
        this.loadSong(newIndex, this.currentPlaylist);
        if (this.isPlaying && this.autoPlayNext) {
            this.play();
        }
    }

    /**
     * 切换播放模式
     */
    togglePlayMode() {
        this.playMode = (this.playMode + 1) % 3;
        this.savePlayMode(this.playMode);
        this.updateModeIcon();
        this.showNotification(`播放模式: ${this.getPlayModeText()}`, 'info');
    }

    /**
     * 获取播放模式文本
     */
    getPlayModeText() {
        switch(this.playMode) {
            case 0: return '顺序播放';
            case 1: return '随机播放';
            case 2: return '单曲循环';
            default: return '顺序播放';
        }
    }

    /**
     * 更新播放模式图标
     */
    updateModeIcon() {
        const modeIcon = this.elements.modeBtn.querySelector('.mode-icon');
        if (!modeIcon) return;
        
        modeIcon.innerHTML = '';
        
        let path;
        switch(this.playMode) {
            case 0:
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z');
                modeIcon.appendChild(path);
                this.elements.modeBtn.title = '顺序播放';
                break;
            case 1:
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z');
                modeIcon.appendChild(path);
                this.elements.modeBtn.title = '随机播放';
                break;
            case 2:
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z');
                modeIcon.appendChild(path);
                this.elements.modeBtn.title = '单曲循环';
                break;
        }
    }

    /**
     * 切换搜索模式
     */
    toggleSearchMode(apiId) {
        // 抖音热歌榜不支持搜索
        if (apiId === 'migu') {
            this.showNotification('抖音热歌榜不支持搜索功能', 'info');
            return;
        }
        
        const elements = this.apiElements[apiId];
        if (!elements) return;
        
        const isSearch = this.isSearchMode.get(apiId) || false;
        this.isSearchMode.set(apiId, !isSearch);
        
        if (!isSearch) {
            if (elements.playlistContainer) elements.playlistContainer.style.display = 'none';
            if (elements.searchContainer) elements.searchContainer.style.display = 'block';
            // 自动聚焦搜索框
            if (elements.searchInput) elements.searchInput.focus();
        } else {
            if (elements.playlistContainer) elements.playlistContainer.style.display = 'block';
            if (elements.searchContainer) elements.searchContainer.style.display = 'none';
        }
        
        this.updateSearchToggleButton();
    }

    /**
     * 更新搜索切换按钮状态
     */
    updateSearchToggleButton() {
        const isSearch = this.isSearchMode.get(this.currentApi) || false;
        const searchIcon = this.elements.searchToggleBtn.querySelector('.search-icon');
        const backIcon = this.elements.searchToggleBtn.querySelector('.back-icon');
        
        if (isSearch) {
            searchIcon.style.display = 'none';
            backIcon.style.display = 'block';
            this.elements.searchToggleBtn.title = '返回歌单';
            this.elements.searchToggleBtn.classList.add('search-active');
        } else {
            searchIcon.style.display = 'block';
            backIcon.style.display = 'none';
            this.elements.searchToggleBtn.title = '搜索';
            this.elements.searchToggleBtn.classList.remove('search-active');
        }
    }

    /**
     * 切换歌词滚动模式
     */
    toggleLyricsScrollMode() {
        this.isHorizontalScroll = !this.isHorizontalScroll;
        this.saveLyricsMode(this.isHorizontalScroll);
        
        const currentTime = this.audio.currentTime;
        if (this.isHorizontalScroll) {
            const allLyrics = this.lyricParser.lyrics.map((lyric, index) => ({
                ...lyric,
                active: index === this.lyricParser.getCurrentIndex(currentTime)
            }));
            this.updateLyricsDisplay(allLyrics, true);
        } else {
            const displayLyrics = this.lyricParser.getDisplayLyrics(currentTime, 3);
            this.updateLyricsDisplay(displayLyrics, false);
        }
        
        this.showNotification(`歌词模式: ${this.isHorizontalScroll ? '横向滚动' : '垂直滚动'}`, 'info');
    }

    /**
     * 下载当前歌曲
     */
    async downloadCurrentSong() {
        if (!this.currentPlaylist[this.currentIndex]) {
            this.showNotification('没有可下载的歌曲', 'warning');
            return;
        }
        
        const song = this.currentPlaylist[this.currentIndex];
        await this.downloadSong(song);
    }

    /**
     * 下载指定歌曲
     */
    async downloadSong(song) {
        try {
            this.showNotification(`开始下载: ${song.title}`, 'info');
            
            const progressElement = this.createDownloadProgress();
            
            const response = await fetch(song.src);
            const contentLength = response.headers.get('content-length');
            const total = parseInt(contentLength, 10);
            let loaded = 0;
            
            const reader = response.body.getReader();
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                chunks.push(value);
                loaded += value.length;
                
                if (total) {
                    const progress = (loaded / total) * 100;
                    this.updateDownloadProgress(progressElement, progress);
                }
            }
            
            const blob = new Blob(chunks);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${song.title || '歌曲'} - ${song.artist || '未知歌手'}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            progressElement.remove();
            this.showNotification(`下载完成: ${song.title}`, 'info');
            
        } catch (error) {
            console.error('下载失败:', error);
            this.showNotification(`下载失败: ${song.title}`, 'error');
        }
    }

    /**
     * 创建下载进度显示
     */
    createDownloadProgress() {
        const progressElement = document.createElement('div');
        progressElement.className = 'download-progress';
        progressElement.innerHTML = `
            <div>下载中...</div>
            <div class="download-progress-bar">
                <div class="download-progress-fill" style="width: 0%"></div>
            </div>
        `;
        document.body.appendChild(progressElement);
        return progressElement;
    }

    /**
     * 更新下载进度
     */
    updateDownloadProgress(progressElement, progress) {
        const fill = progressElement.querySelector('.download-progress-fill');
        fill.style.width = `${progress}%`;
    }

    /**
     * 处理播放结束
     */
    handleEnded() {
        if (this.playMode === 2) {
            this.audio.currentTime = 0;
            this.play();
        } else if (this.autoPlayNext) {
            this.next();
        } else {
            this.pause();
        }
    }

    /**
     * 更新进度条
     */
    updateProgress() {
        if (this.isDraggingProgress) return;
        
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (duration && !isNaN(duration)) {
            const progressPercent = (currentTime / duration) * 100;
            this.elements.progress.style.width = `${progressPercent}%`;
            this.elements.progressHandle.style.left = `${progressPercent}%`;
            this.elements.currentTime.textContent = Utils.formatTime(currentTime);
            
            // 更新歌词
            const currentLyric = this.lyricParser.getCurrentLyric(currentTime);
            if (currentLyric && currentLyric.index !== this.currentLyricIndex) {
                this.currentLyricIndex = currentLyric.index;
                
                if (this.isHorizontalScroll) {
                    const allLyrics = this.lyricParser.lyrics.map((lyric, index) => ({
                        ...lyric,
                        active: index === currentLyric.index
                    }));
                    this.updateLyricsDisplay(allLyrics, true);
                } else {
                    const displayLyrics = this.lyricParser.getDisplayLyrics(currentTime, 3);
                    this.updateLyricsDisplay(displayLyrics, false);
                }
            }
        }
    }

    /**
     * 更新时长显示
     */
    updateDuration() {
        const duration = this.audio.duration;
        if (duration && !isNaN(duration) && duration > 0) {
            this.elements.duration.textContent = Utils.formatTime(duration);
        } else {
            this.elements.duration.textContent = '--:--';
        }
    }

    /**
     * 设置音量
     */
    setVolume(volume) {
        this.volume = volume;
        this.audio.volume = volume;
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.value = volume * 100;
        }
    }

    /**
     * 设置播放速度
     */
    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
        this.audio.playbackRate = speed;
        if (this.elements.speedSelect) {
            this.elements.speedSelect.value = speed.toString();
        }
    }

    /**
     * 显示音量条
     */
    showVolumeSlider() {
        this.elements.volumeSliderContainer.style.display = 'block';
        this.isVolumeSliderVisible = true;
    }

    /**
     * 隐藏音量条
     */
    hideVolumeSlider() {
        this.elements.volumeSliderContainer.style.display = 'none';
        this.isVolumeSliderVisible = false;
    }

    /**
     * 切换音量条显示
     */
    toggleVolumeSlider() {
        if (this.isVolumeSliderVisible) {
            this.hideVolumeSlider();
        } else {
            this.showVolumeSlider();
        }
    }

    // 进度条相关方法
    bindProgressEvents() {
        this.elements.progressBar.addEventListener('mousedown', (e) => this.startSeek(e));
        document.addEventListener('mousemove', (e) => this.dragSeek(e));
        document.addEventListener('mouseup', () => this.endSeek());
        
        this.elements.progressBar.addEventListener('touchstart', (e) => this.startSeek(e));
        document.addEventListener('touchmove', (e) => this.dragSeek(e));
        document.addEventListener('touchend', () => this.endSeek());
        
        this.elements.progressBar.addEventListener('click', (e) => {
            if (!this.isDraggingProgress) {
                const seekTime = this.getSeekTime(e);
                this.audio.currentTime = seekTime;
            }
        });
    }

    bindAudioEvents() {
        this.audio.addEventListener('loadedmetadata', () => {
            this.updateDuration();
            setTimeout(() => this.updateDuration(), 100);
        });
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleEnded());
        this.audio.addEventListener('canplay', () => {
            this.elements.playBtn.disabled = false;
            this.isLoading = false;
            this.updateDuration();
        });
        
        this.audio.addEventListener('waiting', () => {
            this.isLoading = true;
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('音频加载错误:', e);
            this.isLoading = false;
            this.showNotification('音频加载失败，尝试下一首', 'error');
            if (this.autoPlayNext) {
                setTimeout(() => this.next(), 1000);
            }
        });
    }

    startSeek(e) {
        e.preventDefault();
        this.isDraggingProgress = true;
        this.updateSeek(e);
    }

    dragSeek(e) {
        if (!this.isDraggingProgress) return;
        e.preventDefault();
        this.updateSeek(e);
    }

    endSeek() {
        if (!this.isDraggingProgress) return;
        this.isDraggingProgress = false;
        
        if (this.audio.duration) {
            const progressPercent = parseFloat(this.elements.progress.style.width) / 100;
            this.audio.currentTime = progressPercent * this.audio.duration;
        }
    }

    getSeekTime(e) {
        const progressBar = this.elements.progressBar;
        const rect = progressBar.getBoundingClientRect();
        let clientX;
        
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }
        
        const clickPosition = clientX - rect.left;
        const progressBarWidth = progressBar.clientWidth;
        let seekPercent = clickPosition / progressBarWidth;
        
        seekPercent = Math.max(0, Math.min(1, seekPercent));
        return seekPercent * (this.audio.duration || 0);
    }

    updateSeek(e) {
        const seekTime = this.getSeekTime(e);
        const duration = this.audio.duration;
        
        if (duration) {
            const progressPercent = (seekTime / duration) * 100;
            this.elements.progress.style.width = `${progressPercent}%`;
            this.elements.progressHandle.style.left = `${progressPercent}%`;
            this.elements.currentTime.textContent = Utils.formatTime(seekTime);
        }
    }

    /**
     * 初始化播放器
     */
    initializePlayer() {
        this.setVolume(this.volume);
        this.setPlaybackSpeed(this.playbackSpeed);
        this.updateModeIcon();
        this.updatePlayButton();
        
        // 应用歌词模式
        if (this.isHorizontalScroll) {
            this.elements.lyricsContainer.classList.add('horizontal-scroll');
        }
        
        // 初始化所有自定义选择器（排行榜和倍速）
        initCustomSelects();
        
        // 加载初始歌单
        this.loadApiPlaylist(this.currentApi);
        
        // 启动缓存清理
        setInterval(() => this.cacheManager.cleanup(), 60 * 60 * 1000);
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        const notification = this.elements.notification;
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 3000);
    }

    /**
     * 获取API名称
     */
    getApiName(apiId) {
        const apiNames = {
            'netease': '网易云音乐',
            'qq': 'QQ音乐',
            'kg': '酷狗音乐',
            'kuwo': '酷我音乐',
            'migu': '抖音热歌榜'
        };
        return apiNames[apiId] || apiId;
    }

    // 状态持久化方法
    saveVolume(volume) {
        localStorage.setItem('musicPlayer_volume', volume.toString());
    }

    loadVolume() {
        const savedVolume = localStorage.getItem('musicPlayer_volume');
        return savedVolume ? parseFloat(savedVolume) : 0.5;
    }

    savePlaybackSpeed(speed) {
        localStorage.setItem('musicPlayer_playbackSpeed', speed.toString());
    }

    loadPlaybackSpeed() {
        const saved = localStorage.getItem('musicPlayer_playbackSpeed');
        return saved ? parseFloat(saved) : 1.0;
    }

    savePlayMode(mode) {
        localStorage.setItem('musicPlayer_playMode', mode.toString());
    }

    loadPlayMode() {
        const saved = localStorage.getItem('musicPlayer_playMode');
        return saved ? parseInt(saved) : 0;
    }

    savePlayState(isPlaying) {
        localStorage.setItem('musicPlayer_playState', isPlaying.toString());
    }

    loadPlayState() {
        const saved = localStorage.getItem('musicPlayer_playState');
        return saved ? saved === 'true' : false;
    }

    saveLyricsMode(isHorizontal) {
        localStorage.setItem('musicPlayer_lyricsMode', isHorizontal.toString());
    }

    loadLyricsMode() {
        const saved = localStorage.getItem('musicPlayer_lyricsMode');
        return saved ? saved === 'true' : false;
    }
}

// 颜色提取器类 - 优化版
class ColorExtractor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    async getDominantColors(imageUrl, colorCount = 2) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                this.canvas.width = 100; // 缩小尺寸以提高性能
                this.canvas.height = 100;
                this.ctx.drawImage(img, 0, 0, 100, 100);
                
                const imageData = this.ctx.getImageData(0, 0, 100, 100);
                const pixels = imageData.data;
                
                // 使用更智能的颜色提取算法
                const colors = this.extractProminentColors(pixels, colorCount);
                resolve(colors);
            };
            
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    extractProminentColors(pixels, colorCount) {
        const colorBuckets = {};
        const prominentColors = [];
        
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // 跳过太暗或太亮的颜色
            if (r < 30 && g < 30 && b < 30) continue; // 太暗
            if (r > 230 && g > 230 && b > 230) continue; // 太亮
            
            // 使用量化来减少颜色数量
            const quantizedR = Math.floor(r / 10) * 10;
            const quantizedG = Math.floor(g / 10) * 10;
            const quantizedB = Math.floor(b / 10) * 10;
            
            const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
            colorBuckets[colorKey] = (colorBuckets[colorKey] || 0) + 1;
        }
        
        // 按出现频率排序
        const sortedColors = Object.entries(colorBuckets)
            .sort((a, b) => b[1] - a[1])
            .slice(0, colorCount);
        
        // 转换为RGB对象
        sortedColors.forEach(([colorKey]) => {
            const [r, g, b] = colorKey.split(',').map(Number);
            prominentColors.push({ r, g, b });
        });
        
        return prominentColors;
    }

    async getDominantColor(imageUrl) {
        const colors = await this.getDominantColors(imageUrl, 1);
        return colors[0] || { r: 0, g: 0, b: 0 };
    }
}

// 导出到全局作用域
window.MusicPlayer = MusicPlayer;
window.ColorExtractor = ColorExtractor;