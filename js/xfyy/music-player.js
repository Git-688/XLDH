/* music-player.js - 移除导入/导出歌单功能（保留播放列表持久化 + 本地音乐缓存 + 移除汽水音乐） */
let currentOpenCustomSelect = null;
let customSelectInstances = new Map();

class CustomSelect {
    constructor(selectElement) {
        this.selectElement = selectElement;
        this.container = null;
        this.trigger = null;
        this.dropdown = null;
        this.options = [];
        this.isOpen = false;
        this.value = selectElement.value;
        this.isSpeedControl = false;
        this.boundHandleOutsideClick = null;
        this.boundScrollListener = null;
        this.boundResizeListener = null;
        this.init();
        const id = selectElement.id || selectElement.name || Math.random().toString(36);
        customSelectInstances.set(id, this);
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

        this.isSpeedControl = this.container.closest('.speed-control') !== null;

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'custom-select-dropdown';
        this.populateOptions();

        if (this.isSpeedControl) {
            document.body.appendChild(this.dropdown);
        } else {
            this.container.appendChild(this.dropdown);
        }

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
        if (this.isSpeedControl) {
            this.dropdown.style.position = 'fixed';
            this.dropdown.style.top = `${rect.bottom + 4}px`;
            this.dropdown.style.left = `${rect.left}px`;
            this.dropdown.style.width = `${rect.width}px`;
        } else {
            this.dropdown.style.position = 'absolute';
            this.dropdown.style.top = `${this.trigger.offsetHeight + 4}px`;
            this.dropdown.style.left = '0';
            this.dropdown.style.width = `${this.trigger.offsetWidth}px`;
        }
        this.dropdown.style.maxHeight = '200px';
        this.dropdown.style.overflowY = 'auto';
    }

    openDropdown() {
        if (this.isOpen) return;
        if (currentOpenCustomSelect && currentOpenCustomSelect !== this) {
            currentOpenCustomSelect.closeDropdown();
        }
        this.isOpen = true;
        this.trigger.classList.add('open');
        this.updateDropdownPosition();
        setTimeout(() => this.updateDropdownPosition(), 30);
        this.dropdown.classList.add('open');
        currentOpenCustomSelect = this;

        this.boundScrollListener = () => this.updateDropdownPosition();
        this.boundResizeListener = () => this.updateDropdownPosition();
        window.addEventListener('scroll', this.boundScrollListener, true);
        window.addEventListener('resize', this.boundResizeListener);

        this.boundHandleOutsideClick = (e) => {
            if (!this.container.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        };
        setTimeout(() => document.addEventListener('click', this.boundHandleOutsideClick), 0);
    }

    closeDropdown() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.trigger.classList.remove('open');
        this.dropdown.classList.remove('open');
        if (this.boundScrollListener) window.removeEventListener('scroll', this.boundScrollListener, true);
        if (this.boundResizeListener) window.removeEventListener('resize', this.boundResizeListener);
        if (this.boundHandleOutsideClick) document.removeEventListener('click', this.boundHandleOutsideClick);
        if (currentOpenCustomSelect === this) {
            currentOpenCustomSelect = null;
        }
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
        if (this.container && this.container.parentNode) this.container.remove();
        if (this.dropdown && this.dropdown.parentNode) this.dropdown.remove();
        this.selectElement.style.display = '';
        const id = this.selectElement.id || this.selectElement.name || '';
        if (id) customSelectInstances.delete(id);
        this.selectElement = null;
        this.container = null;
        this.trigger = null;
        this.dropdown = null;
        this.options = null;
    }
}

function initCustomSelects() {
    const selects = document.querySelectorAll('.playlist-selector select, .speed-selector select');
    selects.forEach(select => {
        const existing = select.parentNode.querySelector('.custom-select');
        if (!existing) {
            new CustomSelect(select);
        }
    });
}

class MusicPlayer {
    constructor() {
        if (window.Starlink && window.Starlink.musicPlayer) return window.Starlink.musicPlayer;
        
        this.audio = document.getElementById('audio-element');
        this.cacheManager = new CacheManager();
        this.lyricParser = new LyricParser();
        this.pluginManager = new PluginManager(this.cacheManager);
        
        this.initializeProperties();
        this.initializeElements();
        this.bindEvents();
        this.initializePlayer();

        this.userGestureResolved = false;
        this.userGesturePromise = null;
        
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.musicPlayer) {
            window.Starlink.musicPlayer = this;
        }
        window.musicPlayer = window.Starlink.musicPlayer;
    }

    waitForUserGesture() {
        if (this.userGestureResolved) return Promise.resolve();
        if (this.userGesturePromise) return this.userGesturePromise;
        this.userGesturePromise = new Promise((resolve) => {
            const handler = () => {
                this.userGestureResolved = true;
                document.removeEventListener('click', handler);
                document.removeEventListener('touchstart', handler);
                document.removeEventListener('keydown', handler);
                resolve();
            };
            document.addEventListener('click', handler);
            document.addEventListener('touchstart', handler);
            document.addEventListener('keydown', handler);
        });
        return this.userGesturePromise;
    }

    initializeProperties() {
        this.isPlaying = this.loadPlayState();
        this.isLoading = false;
        this.currentPlaylist = [];
        this.currentIndex = 0;
        this.currentApi = 'netease';
        this.volume = this.loadVolume();
        this.playMode = this.loadPlayMode();
        this.playbackSpeed = this.loadPlaybackSpeed();
        this.autoPlayNext = true;
        this.lyricsData = [];
        this.currentLyricIndex = -1;
        this.isDraggingProgress = false;
        this.isSearchMode = new Map();
        this.isVolumeSliderVisible = false;
        this.hasNotifiedLocal = false;
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 3;
        this.maxErrorShown = false;
        
        this.dragPercent = 0;
        this.clickPending = false;
        this.dragRAF = null;
        this.updateAnimationFrame = null;
        this.lastTimeUpdate = 0;
        
        // 移除 migu（汽水音乐）
        const apis = ['netease', 'qq', 'kg', 'kuwo', 'local'];
        apis.forEach(api => this.isSearchMode.set(api, false));

        this.restorePlaylistState();
    }

    savePlaylistState() {
        try {
            const state = {
                playlist: this.currentPlaylist,
                index: this.currentIndex,
                api: this.currentApi,
                timestamp: Date.now()
            };
            localStorage.setItem('music_player_playlist_state', JSON.stringify(state));
        } catch (e) {}
    }

    restorePlaylistState() {
        try {
            const raw = localStorage.getItem('music_player_playlist_state');
            if (!raw) return;
            const state = JSON.parse(raw);
            if (!state.playlist || !state.playlist.length) return;
            if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('music_player_playlist_state');
                return;
            }
            this.currentPlaylist = state.playlist;
            this.currentIndex = state.index || 0;
            // 如果存储的 api 是 migu，则重置为 netease
            if (state.api === 'migu') {
                this.currentApi = 'netease';
            } else {
                this.currentApi = state.api || 'netease';
            }
            if (this.currentIndex >= this.currentPlaylist.length) {
                this.currentIndex = 0;
            }
        } catch (e) {}
    }

    clearPlaylistState() {
        try {
            localStorage.removeItem('music_player_playlist_state');
        } catch (e) {}
    }

    savePlaybackProgress() {
        try {
            const song = this.currentPlaylist[this.currentIndex];
            if (!song) return;
            const data = {
                songId: song.id,
                currentTime: this.audio.currentTime || 0,
                isPlaying: this.isPlaying,
                timestamp: Date.now()
            };
            localStorage.setItem('music_player_progress', JSON.stringify(data));
        } catch (e) {}
    }

    restorePlaybackProgress() {
        try {
            const progress = localStorage.getItem('music_player_progress');
            if (progress) {
                const data = JSON.parse(progress);
                if (data.songId && data.currentTime) {
                    const checkAndRestore = () => {
                        if (this.currentPlaylist && this.currentPlaylist.length) {
                            const song = this.currentPlaylist[this.currentIndex];
                            if (song && song.id === data.songId) {
                                this.audio.currentTime = data.currentTime;
                                if (data.isPlaying) {
                                    this.play();
                                }
                            }
                        } else {
                            setTimeout(checkAndRestore, 300);
                        }
                    };
                    setTimeout(checkAndRestore, 500);
                }
            }
        } catch (e) {}
    }

    initializeElements() {
        this.elements = {
            coverImg: document.getElementById('cover-img'),
            songTitle: document.getElementById('song-title'),
            songArtist: document.getElementById('song-artist'),
            playBtn: document.getElementById('play-btn'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            modeBtn: document.getElementById('mode-btn'),
            volumeBtn: document.getElementById('volume-btn'),
            volumeSlider: document.getElementById('volume-slider'),
            volumeSliderContainer: document.getElementById('volume-slider-container'),
            downloadBtn: document.getElementById('download-btn'),
            searchToggleBtn: document.getElementById('search-toggle-btn'),
            progressBar: document.getElementById('progress-bar'),
            progress: document.getElementById('progress'),
            progressHandle: document.getElementById('progress-handle'),
            currentTime: document.getElementById('current-time'),
            duration: document.getElementById('duration'),
            speedSelect: document.getElementById('speed-select'),
            lyricsContainer: document.getElementById('lyrics-container'),
            lyricsSection: document.querySelector('.lyrics-section'),
            player: document.querySelector('.music-player'),
            notification: document.getElementById('notification')
        };
        if (this.elements.lyricsContainer) {
            this.elements.lyricsContainer.innerHTML = '';
            this.lyricsLineEl = document.createElement('div');
            this.lyricsLineEl.className = 'lyrics-single-line';
            this.lyricsLineEl.textContent = '暂无歌词';
            this.elements.lyricsContainer.appendChild(this.lyricsLineEl);
        }
        this.initializeApiElements();
    }

    initializeApiElements() {
        // 移除 migu
        const apis = ['netease', 'qq', 'kg', 'kuwo', 'local'];
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

    saveVolume(v) { Storage.setItem('musicPlayer.volume', v); }
    loadVolume() { return Storage.getItem('musicPlayer.volume', 0.5); }
    savePlaybackSpeed(s) { Storage.setItem('musicPlayer.playbackSpeed', s); }
    loadPlaybackSpeed() { return Storage.getItem('musicPlayer.playbackSpeed', 1.0); }
    savePlayMode(m) { Storage.setItem('musicPlayer.playMode', m); }
    loadPlayMode() { return Storage.getItem('musicPlayer.playMode', 0); }
    savePlayState(s) { Storage.setItem('musicPlayer.playState', s); }
    loadPlayState() { return Storage.getItem('musicPlayer.playState', false); }

    bindEvents() {
        this.elements.playBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevBtn.addEventListener('click', () => this.previous());
        this.elements.nextBtn.addEventListener('click', () => this.next());
        this.elements.modeBtn.addEventListener('click', () => this.togglePlayMode());
        this.elements.volumeBtn.addEventListener('click', () => this.toggleVolumeSlider());
        this.elements.volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
            this.saveVolume(e.target.value / 100);
        });
        this.elements.volumeSlider.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const value = parseInt(e.target.value, 10);
            if (!isNaN(value)) {
                this.setVolume(value / 100);
                this.saveVolume(value / 100);
            }
        });
        this.elements.speedSelect.addEventListener('change', (e) => {
            this.setPlaybackSpeed(parseFloat(e.target.value));
            this.savePlaybackSpeed(parseFloat(e.target.value));
        });
        this.elements.downloadBtn.addEventListener('click', () => this.downloadCurrentSong());
        this.elements.searchToggleBtn.addEventListener('click', () => this.toggleSearchMode(this.currentApi));
        
        // 绑定 tab 切换事件，调用 switchApiTab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const api = e.target.getAttribute('data-tab');
                if (api) {
                    this.switchApiTab(api);
                }
            });
        });
        
        this.bindProgressEvents();
        this.bindAudioEvents();
        this.bindApiEvents();
        document.addEventListener('click', (e) => {
            if (this.isVolumeSliderVisible && !this.elements.volumeBtn.contains(e.target) && !this.elements.volumeSliderContainer.contains(e.target)) {
                this.hideVolumeSlider();
            }
        });
    }

    // 切换 API 标签（增加存在性检查）
    switchApiTab(api) {
        // 如果 api 不在 apiElements 中（例如残留的 migu 标签），则忽略
        if (!this.apiElements[api]) {
            console.warn(`[MusicPlayer] 未知的 API: ${api}，已忽略切换`);
            return;
        }
        if (this.currentApi === api) return;
        this.currentApi = api;
        // 更新标签高亮
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === api);
        });
        // 重置各 API 的搜索状态（只保留当前 API 的搜索模式可启用）
        this.isSearchMode.forEach((val, key) => {
            if (key !== api) this.isSearchMode.set(key, false);
        });
        // 更新搜索按钮图标
        this.updateSearchToggleButton();
        // 隐藏所有搜索容器，显示播放列表
        Object.values(this.apiElements).forEach(el => {
            if (el.searchContainer) el.searchContainer.style.display = 'none';
            if (el.playlistContainer) el.playlistContainer.style.display = 'block';
        });
        // 加载对应歌单
        this.loadApiPlaylist(api);
    }

    bindApiEvents() {
        // 移除 migu
        const apis = ['netease', 'qq', 'kg', 'kuwo', 'local'];
        apis.forEach(api => {
            const el = this.apiElements[api];
            if (!el) return;
            if (api !== 'local' && el.playlistSelect) {
                el.playlistSelect.addEventListener('change', () => this.loadApiPlaylist(api));
            }
            if (api !== 'local' && el.searchInput) {
                el.searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.searchApi(api); });
                el.searchInput.addEventListener('input', Utils.debounce(() => {
                    if (el.searchInput.value.trim().length > 2) this.searchApi(api);
                }, 300));
            }
        });
    }

    async loadLyrics(song) {
        this.lyricsData = [];
        this.currentLyricIndex = -1;
        if (this.lyricsLineEl) {
            this.lyricsLineEl.textContent = '加载歌词中...';
            this.lyricsLineEl.classList.remove('overflow');
            this.lyricsLineEl.style.transform = '';
        }
        if (!song.lrc) {
            if (this.lyricsLineEl) this.lyricsLineEl.textContent = '暂无歌词';
            return;
        }
        try {
            const apiBase = Utils.getApiBase();
            const proxyUrl = `${apiBase}/music-proxy?url=${encodeURIComponent(song.lrc)}`;
            const response = await fetch(proxyUrl);
            const lyricsText = await response.text();
            this.lyricParser.parseLrc(lyricsText);
            this.lyricsData = this.lyricParser.lyrics;
            if (this.lyricsData.length === 0) {
                if (this.lyricsLineEl) this.lyricsLineEl.textContent = '暂无歌词';
            } else {
                if (this.lyricsData[0]) {
                    this.lyricsLineEl.textContent = this.lyricsData[0].text;
                }
            }
        } catch (error) {
            console.error('加载歌词失败:', error);
            if (this.lyricsLineEl) this.lyricsLineEl.textContent = '歌词加载失败';
        }
    }

    updateLyricDisplayByTime(currentTime) {
        if (!this.lyricsData || this.lyricsData.length === 0) return;
        let activeIndex = -1;
        for (let i = 0; i < this.lyricsData.length; i++) {
            if (currentTime >= this.lyricsData[i].time) activeIndex = i;
            else break;
        }
        if (activeIndex === -1) {
            if (this.lyricsData.length > 0 && this.lyricsLineEl.textContent !== this.lyricsData[0].text) {
                this.lyricsLineEl.textContent = this.lyricsData[0].text;
            }
            return;
        }
        if (activeIndex === this.currentLyricIndex) return;
        this.currentLyricIndex = activeIndex;
        if (this.lyricsLineEl) {
            const lyricText = this.lyricsData[activeIndex].text || '';
            this.lyricsLineEl.textContent = lyricText;
            const container = this.elements.lyricsContainer;
            if (container && this.lyricsLineEl.scrollWidth > container.clientWidth) {
                if (!this.lyricsLineEl.classList.contains('overflow')) {
                    this.lyricsLineEl.classList.add('overflow');
                    this.startSmoothScroll();
                }
            } else {
                this.lyricsLineEl.classList.remove('overflow');
                this.stopSmoothScroll();
            }
        }
    }

    startSmoothScroll() {
        if (this.scrollAnimationId) cancelAnimationFrame(this.scrollAnimationId);
        const el = this.lyricsLineEl;
        const container = this.elements.lyricsContainer;
        if (!el || !container) return;
        const maxScroll = el.scrollWidth - container.clientWidth;
        if (maxScroll <= 0) return;
        let startTime = null;
        const duration = 8000;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min(1, (timestamp - startTime) / duration);
            const scrollX = maxScroll * progress;
            container.scrollTo({ left: scrollX, behavior: 'auto' });
            if (progress < 1) this.scrollAnimationId = requestAnimationFrame(animate);
            else this.scrollAnimationId = null;
        };
        this.scrollAnimationId = requestAnimationFrame(animate);
    }

    stopSmoothScroll() {
        if (this.scrollAnimationId) {
            cancelAnimationFrame(this.scrollAnimationId);
            this.scrollAnimationId = null;
        }
        if (this.elements.lyricsContainer) this.elements.lyricsContainer.scrollLeft = 0;
    }

    togglePlay() {
        if (!this.userGestureResolved) {
            this.waitForUserGesture().then(() => this.togglePlay());
            return;
        }
        if (!this.audio.src && this.currentPlaylist.length) {
            this.loadSong(0, this.currentPlaylist).then(() => { if (!this.isPlaying) this.play(); });
            return;
        }
        this.isPlaying ? this.pause() : this.play();
    }

    async play() {
        if (!this.userGestureResolved) await this.waitForUserGesture();
        if ((!this.audio.src || this.audio.src === '') && this.currentPlaylist.length) {
            await this.loadSong(this.currentIndex, this.currentPlaylist);
        }
        try {
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
            this.savePlayState(true);
            document.querySelector('.album-cover')?.classList.add('playing');
            this.updateActiveSongInList();
            if (!this.updateAnimationFrame) this.updateProgress();
        } catch (error) {
            console.error('播放失败:', error);
            this.isPlaying = false;
            this.updatePlayButton();
            if (error.name === 'NotAllowedError') {
                this.userGestureResolved = false;
                this.userGesturePromise = null;
                const toast = window.Starlink?.toast || window.toast;
                if (toast && toast.show) toast.show('请在页面任意位置点击后再次播放', 'info');
            } else {
                this.handlePlaybackError(error);
            }
        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.savePlayState(false);
        document.querySelector('.album-cover')?.classList.remove('playing');
        if (this.updateAnimationFrame) cancelAnimationFrame(this.updateAnimationFrame);
        this.clearAllActiveIndicators();
        this.stopSmoothScroll();
    }

    previous() {
        let newIndex = this.playMode === 1 ? Math.floor(Math.random() * this.currentPlaylist.length) : this.currentIndex - 1;
        if (newIndex < 0) newIndex = this.currentPlaylist.length - 1;
        this.loadSong(newIndex, this.currentPlaylist);
        if (this.isPlaying) this.play();
        this.savePlaylistState();
    }

    next() {
        if (this.maxErrorShown) return;
        let newIndex = this.playMode === 1 ? Math.floor(Math.random() * this.currentPlaylist.length) : this.currentIndex + 1;
        if (newIndex >= this.currentPlaylist.length) newIndex = 0;
        this.loadSong(newIndex, this.currentPlaylist);
        if (this.isPlaying && this.autoPlayNext) this.play();
        this.savePlaylistState();
    }

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

    togglePlayMode() {
        this.playMode = (this.playMode + 1) % 3;
        this.savePlayMode(this.playMode);
        this.updateModeIcon();
        const toast = window.Starlink?.toast || window.toast;
        if (toast && toast.show) toast.show(`播放模式: ${this.getPlayModeText()}`, 'info');
    }

    getPlayModeText() { return ['顺序播放', '随机播放', '单曲循环'][this.playMode]; }

    updateModeIcon() {
        const modeIcon = this.elements.modeBtn.querySelector('.mode-icon');
        if (!modeIcon) return;
        modeIcon.innerHTML = '';
        let path;
        if (this.playMode === 0) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z');
            modeIcon.appendChild(path);
            this.elements.modeBtn.title = '顺序播放';
        } else if (this.playMode === 1) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z');
            modeIcon.appendChild(path);
            this.elements.modeBtn.title = '随机播放';
        } else {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z');
            modeIcon.appendChild(path);
            this.elements.modeBtn.title = '单曲循环';
        }
    }

    toggleSearchMode(apiId) {
        // 仅 local 不支持搜索（migu 已移除）
        if (apiId === 'local') {
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show('该功能不支持搜索', 'info');
            return;
        }
        const el = this.apiElements[apiId];
        if (!el) return;
        const isSearch = this.isSearchMode.get(apiId);
        this.isSearchMode.set(apiId, !isSearch);
        if (!isSearch) {
            if (el.playlistContainer) el.playlistContainer.style.display = 'none';
            if (el.searchContainer) el.searchContainer.style.display = 'block';
            el.searchInput?.focus();
        } else {
            if (el.playlistContainer) el.playlistContainer.style.display = 'block';
            if (el.searchContainer) el.searchContainer.style.display = 'none';
        }
        this.updateSearchToggleButton();
    }

    updateSearchToggleButton() {
        const isSearch = this.isSearchMode.get(this.currentApi);
        const searchIcon = this.elements.searchToggleBtn.querySelector('.search-icon');
        const backIcon = this.elements.searchToggleBtn.querySelector('.back-icon');
        if (isSearch) {
            searchIcon.style.display = 'none';
            backIcon.style.display = 'block';
            this.elements.searchToggleBtn.title = '返回歌单';
        } else {
            searchIcon.style.display = 'block';
            backIcon.style.display = 'none';
            this.elements.searchToggleBtn.title = '搜索';
        }
    }

    async loadApiPlaylist(apiId) {
        const el = this.apiElements[apiId];
        if (!el) return;
        if (el.playlistContainer) {
            el.playlistContainer.innerHTML = '<div class="loading">加载中...</div>';
            el.playlistContainer.style.display = 'block';
        }
        if (el.searchContainer) el.searchContainer.style.display = 'none';
        try {
            let playlist;

            // 本地音乐缓存逻辑
            if (apiId === 'local') {
                const cacheKey = 'local_music_cache';
                const cached = localStorage.getItem(cacheKey);
                const now = Date.now();
                if (cached) {
                    try {
                        const data = JSON.parse(cached);
                        // 缓存有效期 24 小时
                        if (now - data.timestamp < 24 * 60 * 60 * 1000) {
                            playlist = data.songs;
                            if (playlist && playlist.length && !this.hasNotifiedLocal) {
                                const toast = window.Starlink?.toast || window.toast;
                                if (toast && toast.show) toast.show(`已从缓存加载 ${playlist.length} 首本地歌曲`, 'info');
                                this.hasNotifiedLocal = true;
                            }
                        } else {
                            localStorage.removeItem(cacheKey);
                        }
                    } catch (e) {
                        localStorage.removeItem(cacheKey);
                    }
                }
                // 如果缓存不存在或已过期，从插件获取
                if (!playlist) {
                    playlist = await this.pluginManager.getPlaylist(apiId, 'local');
                    if (playlist && playlist.length) {
                        // 存入缓存
                        const cacheData = {
                            songs: playlist,
                            timestamp: now
                        };
                        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                        if (!this.hasNotifiedLocal) {
                            const toast = window.Starlink?.toast || window.toast;
                            if (toast && toast.show) toast.show(`已加载 ${playlist.length} 首本地歌曲并缓存`, 'info');
                            this.hasNotifiedLocal = true;
                        }
                    }
                }
            } else {
                const playlistId = el.playlistSelect?.value || '3778678';
                playlist = await this.pluginManager.getPlaylist(apiId, playlistId);
                if (playlist.length && !sessionStorage.getItem(`notified_${apiId}_${playlistId}`)) {
                    const toast = window.Starlink?.toast || window.toast;
                    if (toast && toast.show) toast.show(`已加载 ${playlist.length} 首歌曲`, 'info');
                    sessionStorage.setItem(`notified_${apiId}_${playlistId}`, 'true');
                }
            }

            this.renderPlaylist(apiId, playlist || []);
            this.savePlaylistState();
        } catch (error) {
            Utils.handleApiError(error, `加载 ${apiId} 歌单失败`, true);
            if (el.playlistContainer) {
                el.playlistContainer.innerHTML = `<div class="error-message"><p>加载失败: ${Utils.escapeHtml(error.message)}</p><button class="retry-btn" onclick="window.Starlink?.musicPlayer?.loadApiPlaylist('${apiId}')">重试</button></div>`;
            }
        }
    }

    // 清除本地音乐缓存
    clearLocalMusicCache() {
        try {
            localStorage.removeItem('local_music_cache');
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show('本地音乐缓存已清除', 'success');
            return true;
        } catch (e) {
            return false;
        }
    }

    async searchApi(apiId) {
        // local 不支持搜索（migu 已移除）
        if (apiId === 'local') {
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show('该功能不支持搜索', 'info');
            return;
        }
        const el = this.apiElements[apiId];
        if (!el || !el.searchInput) return;
        const keyword = el.searchInput.value.trim();
        if (!keyword) {
            if (el.searchResults) el.searchResults.innerHTML = '<div class="loading">请输入搜索关键词</div>';
            return;
        }
        if (el.searchResults) el.searchResults.innerHTML = '<div class="loading">搜索中...</div>';
        try {
            const results = await this.pluginManager.search(apiId, keyword);
            const processedResults = results.map(song => {
                if (!song.id && song.url) {
                    const idMatch = song.url.match(/id=(\d+)/);
                    if (idMatch) song.id = idMatch[1];
                }
                if (!song.src && song.id && apiId === 'netease') {
                    song.src = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
                }
                return song;
            });
            this.renderSearchResults(apiId, processedResults);
            if (!processedResults.length) {
                const toast = window.Starlink?.toast || window.toast;
                if (toast && toast.show) toast.show(`未找到与"${Utils.escapeHtml(keyword)}"相关的歌曲`, 'info');
            }
        } catch (error) {
            Utils.handleApiError(error, '搜索失败', true);
            if (el.searchResults) el.searchResults.innerHTML = `<div class="error-message"><p>搜索失败: ${Utils.escapeHtml(error.message)}</p></div>`;
        }
    }

    generatePlaylistSkeleton() {
        let html = '';
        for (let i = 0; i < 8; i++) {
            html += `
                <div class="skeleton-song-item">
                    <div class="skeleton-song-cover skeleton"></div>
                    <div class="skeleton-song-info">
                        <div class="skeleton-song-title skeleton"></div>
                        <div class="skeleton-song-artist skeleton"></div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    renderPlaylist(apiId, playlist) {
        const el = this.apiElements[apiId];
        if (!el || !el.playlistContainer) return;
        const container = el.playlistContainer;
        
        container.innerHTML = this.generatePlaylistSkeleton();
        
        if (!playlist.length) {
            setTimeout(() => {
                container.innerHTML = '<div class="loading">歌单为空</div>';
            }, 50);
            return;
        }
        setTimeout(() => {
            this.currentPlaylist = playlist;
            this.currentIndex = 0;
            const fragment = document.createDocumentFragment();
            playlist.forEach((song, idx) => fragment.appendChild(this.createSongItem(song, idx, playlist)));
            container.innerHTML = '';
            container.appendChild(fragment);
            this.updateActiveSongInList();
            this.savePlaylistState();
        }, 50);
    }

    renderSearchResults(apiId, results) {
        const el = this.apiElements[apiId];
        if (!el || !el.searchResults) return;
        const container = el.searchResults;
        
        container.innerHTML = this.generatePlaylistSkeleton();
        
        if (!results.length) { 
            setTimeout(() => {
                container.innerHTML = '<div class="loading">未找到相关结果</div>';
            }, 50);
            return; 
        }
        setTimeout(() => {
            const fragment = document.createDocumentFragment();
            results.forEach((song, idx) => fragment.appendChild(this.createSearchSongItem(song, idx, results)));
            container.innerHTML = '';
            container.appendChild(fragment);
            this.updateActiveSongInSearch(apiId);
        }, 50);
    }

    createSongItem(song, index, playlist) {
        const div = document.createElement('div');
        div.className = 'song-item';
        if (this.currentPlaylist === playlist && index === this.currentIndex && this.isPlaying) div.classList.add('active');
        div.innerHTML = `<div class="song-item-info"><div class="song-item-title">${Utils.escapeHtml(song.title)}</div><div class="song-item-artist">${Utils.escapeHtml(song.artist)}</div></div>`;
        div.addEventListener('click', () => { this.loadSong(index, playlist); this.play(); });
        return div;
    }

    createSearchSongItem(song, index, results) {
        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `<div class="song-item-info"><div class="song-item-title">${Utils.escapeHtml(song.title)}</div><div class="song-item-artist">${Utils.escapeHtml(song.artist)}</div></div><button class="search-download-btn" title="下载"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></button>`;
        div.querySelector('.song-item-info').addEventListener('click', () => { this.loadSong(index, results); this.play(); });
        div.querySelector('.search-download-btn').addEventListener('click', async (e) => { e.stopPropagation(); await this.downloadSong(song); });
        return div;
    }

    updateActiveSongInList() {
        this.clearAllActiveIndicators();
        if (!this.currentApi || !this.isPlaying) return;
        const el = this.apiElements[this.currentApi];
        if (!el || !el.playlistContainer) return;
        const items = el.playlistContainer.querySelectorAll('.song-item');
        if (this.currentPlaylist && this.currentIndex >= 0 && this.currentIndex < items.length) {
            items[this.currentIndex].classList.add('active');
        }
        this.updateActiveSongInSearch(this.currentApi);
    }

    updateActiveSongInSearch(apiId) {
        const el = this.apiElements[apiId];
        if (!el || !el.searchResults) return;
        const items = el.searchResults.querySelectorAll('.song-item');
        items.forEach(item => item.classList.remove('active'));
        if (this.isPlaying && this.currentPlaylist && this.currentIndex >= 0) {
            const currentSong = this.currentPlaylist[this.currentIndex];
            if (!currentSong) return;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const titleEl = item.querySelector('.song-item-title');
                const artistEl = item.querySelector('.song-item-artist');
                if (titleEl && artistEl && titleEl.textContent === currentSong.title && artistEl.textContent === currentSong.artist) {
                    item.classList.add('active');
                    break;
                }
            }
        }
    }

    clearAllActiveIndicators() {
        // 移除 migu
        ['netease', 'qq', 'kg', 'kuwo', 'local'].forEach(api => {
            const el = this.apiElements[api];
            if (el?.playlistContainer) el.playlistContainer.querySelectorAll('.song-item').forEach(item => item.classList.remove('active'));
            if (el?.searchResults) el.searchResults.querySelectorAll('.song-item').forEach(item => item.classList.remove('active'));
        });
    }

    async loadSong(index, playlist = null) {
        const pl = playlist || this.currentPlaylist;
        if (index < 0 || index >= pl.length) return;
        this.currentIndex = index;
        this.currentPlaylist = pl;
        let song = pl[index];
        this.isLoading = true;
        this.elements.playBtn.disabled = true;
        if (this.updateAnimationFrame) {
            cancelAnimationFrame(this.updateAnimationFrame);
            this.updateAnimationFrame = null;
        }
        try {
            this.audio.src = song.src;
            this.audio.load();
            this.elements.progress.style.width = '0%';
            this.elements.progressHandle.style.left = '0%';
            this.elements.currentTime.textContent = '00:00';
            this.audio.currentTime = 0;
            if (this.lyricsData && this.lyricsData.length) {
                this.currentLyricIndex = -1;
                this.updateLyricDisplayByTime(0);
            } else {
                if (this.lyricsLineEl) this.lyricsLineEl.textContent = '加载歌词中...';
            }
            await this.updateSongInfo(song);
            await this.loadLyrics(song);
            await new Promise(resolve => {
                const onCanPlay = () => { this.audio.removeEventListener('canplay', onCanPlay); resolve(); };
                this.audio.addEventListener('canplay', onCanPlay);
                setTimeout(() => { this.audio.removeEventListener('canplay', onCanPlay); resolve(); }, 3000);
            });
            this.consecutiveErrors = 0;
            this.maxErrorShown = false;
            if (this.isPlaying && !this.updateAnimationFrame) this.updateProgress();
            this.savePlaylistState();
        } catch (error) {
            console.error('加载歌曲失败:', error);
            this.handlePlaybackError(error);
        } finally {
            this.isLoading = false;
            this.elements.playBtn.disabled = false;
        }
    }

    handlePlaybackError(error) {
        this.consecutiveErrors++;
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            if (!this.maxErrorShown) {
                const toast = window.Starlink?.toast || window.toast;
                if (toast && toast.show) toast.show('连续多首资源失效，已停止自动播放', 'error');
                this.maxErrorShown = true;
            }
            this.autoPlayNext = false;
            return;
        }
        if (this.autoPlayNext && this.currentPlaylist.length > 1) setTimeout(() => this.next(), 1000);
    }

    async updateSongInfo(song) {
        if (this.elements.songTitle) this.elements.songTitle.textContent = song.title;
        if (this.elements.songArtist) this.elements.songArtist.textContent = song.artist;
        let coverUrl = song.cover && (song.cover.startsWith('http://') || song.cover.startsWith('https://')) ? song.cover : '/assets/logo.png';
        if (coverUrl === '/assets/logo.png' && song.pic && (song.pic.startsWith('http://') || song.pic.startsWith('https://'))) {
            coverUrl = song.pic;
        }
        const coverImg = this.elements.coverImg;
        if (coverImg) {
            coverImg.src = coverUrl;
            coverImg.style.display = 'block';
            const placeholder = document.querySelector('.cover-placeholder');
            if (placeholder) placeholder.style.display = 'none';
            coverImg.onerror = () => { coverImg.src = '/assets/logo.png'; };
        }
    }

    async downloadCurrentSong() {
        if (!this.currentPlaylist[this.currentIndex]) {
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show('没有可下载的歌曲', 'warning');
            return;
        }
        await this.downloadSong(this.currentPlaylist[this.currentIndex]);
    }

    async downloadSong(song) {
        let progress = null;
        let totalBytes = 0;
        let loadedBytes = 0;
        let indeterminate = false;

        try {
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show(`正在获取下载地址: ${song.title}`, 'info');
            
            let downloadUrl = null;
            if (song.id && (song.source === 'netease' || this.currentApi === 'netease')) {
                downloadUrl = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
            } else if (song.src && song.src.startsWith('http')) {
                downloadUrl = song.src;
            }
            
            if (!downloadUrl || !downloadUrl.startsWith('http')) {
                throw new Error('无法获取有效的下载地址');
            }
            
            if (toast && toast.show) toast.show(`开始下载: ${song.title}`, 'info');
            progress = this.createDownloadProgress();
            
            const apiBase = Utils.getApiBase();
            const proxyDownloadUrl = `${apiBase}/music-proxy?url=${encodeURIComponent(downloadUrl)}`;
            
            const response = await fetch(proxyDownloadUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const contentLength = response.headers.get('content-length');
            totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
            
            if (totalBytes === 0) {
                indeterminate = true;
                this.setIndeterminateProgress(progress);
            }
            
            const reader = response.body.getReader();
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                loadedBytes += value.length;
                if (totalBytes > 0 && !indeterminate) {
                    const percent = (loadedBytes / totalBytes) * 100;
                    this.updateDownloadProgress(progress, percent);
                }
            }
            
            const blob = new Blob(chunks);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${song.title}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            progress.remove();
            if (toast && toast.show) toast.show(`下载完成: ${song.title}`, 'success');
            
        } catch (err) {
            console.error('下载失败:', err);
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show(`下载失败: ${song.title}，请稍后重试`, 'error');
            if (progress) progress.remove();
        }
    }

    createDownloadProgress() {
        const div = document.createElement('div');
        div.className = 'download-progress';
        div.innerHTML = `
            <div class="download-progress-header">下载中...</div>
            <div class="download-progress-bar-container">
                <div class="download-progress-bar">
                    <div class="download-progress-fill" style="width:0%"></div>
                </div>
                <div class="download-progress-spinner" style="display:none;">
                    <i class="fas fa-spinner fa-pulse"></i>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        return div;
    }

    updateDownloadProgress(el, percent) {
        const fill = el.querySelector('.download-progress-fill');
        if (fill) {
            fill.style.width = `${Math.min(percent, 100)}%`;
            if (percent > 5) {
                const header = el.querySelector('.download-progress-header');
                if (header) header.textContent = `下载中 ${Math.floor(percent)}%`;
            }
        }
    }

    setIndeterminateProgress(el) {
        const bar = el.querySelector('.download-progress-bar');
        const spinner = el.querySelector('.download-progress-spinner');
        if (bar) bar.style.display = 'none';
        if (spinner) {
            spinner.style.display = 'block';
            const header = el.querySelector('.download-progress-header');
            if (header) header.textContent = '下载中 (大小未知)...';
        }
    }

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

    updateProgress() {
        if (this.isDraggingProgress || this.updateAnimationFrame) return;
        this.updateAnimationFrame = requestAnimationFrame(() => {
            const currentTime = this.audio.currentTime;
            const duration = this.audio.duration;
            if (duration && !isNaN(duration) && duration > 0) {
                const percent = (currentTime / duration) * 100;
                this.elements.progress.style.width = `${percent}%`;
                this.elements.progressHandle.style.left = `${percent}%`;
                const now = Date.now();
                if (!this.lastTimeUpdate || now - this.lastTimeUpdate > 500) {
                    this.elements.currentTime.textContent = Utils.formatTime(currentTime);
                    this.lastTimeUpdate = now;
                }
                this.updateLyricDisplayByTime(currentTime);
            } else {
                this.elements.currentTime.textContent = '00:00';
                this.elements.duration.textContent = '00:00';
            }
            this.updateAnimationFrame = null;
            if (this.isPlaying && !this.audio.paused) {
                this.updateProgress();
            }
        });
    }

    updateDuration() {
        const dur = this.audio.duration;
        if (dur && !isNaN(dur)) {
            this.elements.duration.textContent = Utils.formatTime(dur);
        } else {
            this.elements.duration.textContent = '--:--';
        }
    }

    setVolume(vol) { this.volume = vol; this.audio.volume = vol; if (this.elements.volumeSlider) this.elements.volumeSlider.value = vol * 100; }
    setPlaybackSpeed(speed) { this.playbackSpeed = speed; this.audio.playbackRate = speed; if (this.elements.speedSelect) this.elements.speedSelect.value = speed; }
    showVolumeSlider() { this.elements.volumeSliderContainer.style.display = 'block'; this.isVolumeSliderVisible = true; }
    hideVolumeSlider() { this.elements.volumeSliderContainer.style.display = 'none'; this.isVolumeSliderVisible = false; }
    toggleVolumeSlider() { this.isVolumeSliderVisible ? this.hideVolumeSlider() : this.showVolumeSlider(); }

    bindProgressEvents() {
        const progressBar = this.elements.progressBar;
        progressBar.style.touchAction = 'none';

        const handleStart = (e) => {
            e.preventDefault();
            if (!this.audio.duration || isNaN(this.audio.duration) || this.audio.duration === Infinity) return;
            this.isDraggingProgress = true;
            this.elements.progress.style.transition = 'none';
            this.updateSeek(e);
            if (e.type === 'touchstart') document.body.style.overflow = 'hidden';
        };

        const handleMove = (e) => {
            if (!this.isDraggingProgress) return;
            e.preventDefault();
            if (this.dragRAF) cancelAnimationFrame(this.dragRAF);
            this.dragRAF = requestAnimationFrame(() => {
                this.updateSeek(e);
                this.dragRAF = null;
            });
        };

        const handleEnd = () => {
            if (!this.isDraggingProgress) return;
            this.isDraggingProgress = false;
            this.elements.progress.style.transition = '';
            const duration = this.audio.duration;
            if (duration && !isNaN(duration) && duration > 0) {
                const seekTime = (this.dragPercent / 100) * duration;
                this.audio.currentTime = seekTime;
                this.elements.progress.style.width = `${this.dragPercent}%`;
                this.elements.progressHandle.style.left = `${this.dragPercent}%`;
                this.elements.currentTime.textContent = Utils.formatTime(seekTime);
            }
            document.body.style.overflow = '';
            if (this.dragRAF) cancelAnimationFrame(this.dragRAF);
            this.dragRAF = null;
            this.clickPending = true;
            setTimeout(() => { this.clickPending = false; }, 100);
        };

        progressBar.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);

        progressBar.addEventListener('touchstart', handleStart);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        progressBar.addEventListener('click', (e) => {
            if (this.clickPending) {
                this.clickPending = false;
                return;
            }
            if (!this.isDraggingProgress && this.audio.duration && !isNaN(this.audio.duration) && this.audio.duration > 0) {
                const seekTime = this.getSeekTime(e);
                this.audio.currentTime = seekTime;
                const percent = (seekTime / this.audio.duration) * 100;
                this.elements.progress.style.width = `${percent}%`;
                this.elements.progressHandle.style.left = `${percent}%`;
                this.elements.currentTime.textContent = Utils.formatTime(seekTime);
            }
        });
    }

    getSeekTime(e) {
        const rect = this.elements.progressBar.getBoundingClientRect();
        let clientX = 0;
        if (e.type === 'mousedown' || e.type === 'mousemove' || e.type === 'click') {
            clientX = e.clientX;
        } else if (e.type === 'touchstart' || e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }
        let percent = (clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        const duration = this.audio.duration;
        if (!duration || isNaN(duration) || duration <= 0) return 0;
        return percent * duration;
    }

    updateSeek(e) {
        const duration = this.audio.duration;
        if (!duration || isNaN(duration) || duration <= 0) return;
        const seekTime = this.getSeekTime(e);
        if (!isNaN(seekTime) && seekTime >= 0 && seekTime <= duration) {
            this.dragPercent = (seekTime / duration) * 100;
            this.elements.progress.style.width = `${this.dragPercent}%`;
            this.elements.progressHandle.style.left = `${this.dragPercent}%`;
            this.elements.currentTime.textContent = Utils.formatTime(seekTime);
        }
    }

    bindAudioEvents() {
        this.audio.addEventListener('loadedmetadata', () => { this.updateDuration(); setTimeout(() => this.updateDuration(), 100); });
        this.audio.addEventListener('timeupdate', () => { if (!this.updateAnimationFrame) this.updateProgress(); });
        this.audio.addEventListener('ended', () => this.handleEnded());
        this.audio.addEventListener('canplay', () => {
            this.elements.playBtn.disabled = false;
            this.isLoading = false;
            this.updateDuration();
            if (this.isPlaying) this.play();
        });
        this.audio.addEventListener('waiting', () => { this.isLoading = true; });
        this.audio.addEventListener('error', (e) => {
            console.error('音频加载错误:', e);
            this.isLoading = false;
            this.handlePlaybackError(new Error('Audio load error'));
            if (this.updateAnimationFrame) cancelAnimationFrame(this.updateAnimationFrame);
            this.updateAnimationFrame = null;
        });
        this.audio.addEventListener('pause', () => { if (this.updateAnimationFrame) cancelAnimationFrame(this.updateAnimationFrame); this.updateAnimationFrame = null; });
        this.audio.addEventListener('play', () => { if (!this.updateAnimationFrame) this.updateProgress(); });
    }

    initializePlayer() {
        this.audio.src = '';
        this.audio.load();
        this.setVolume(this.volume);
        this.setPlaybackSpeed(this.playbackSpeed);
        this.updateModeIcon();
        this.updatePlayButton();
        const defaultLogo = '/assets/logo.png';
        if (this.elements.coverImg) {
            this.elements.coverImg.src = defaultLogo;
            const placeholder = document.querySelector('.cover-placeholder');
            if (placeholder) placeholder.style.display = 'none';
            this.elements.coverImg.onerror = () => { this.elements.coverImg.src = defaultLogo; };
        }
        this.loadApiPlaylist(this.currentApi);
        
        const initCustomSelectsWithRetry = () => {
            if (document.querySelector('.music-player.show')) {
                if (typeof initCustomSelects === 'function') {
                    initCustomSelects();
                }
            } else {
                setTimeout(initCustomSelectsWithRetry, 300);
            }
        };
        setTimeout(initCustomSelectsWithRetry, 500);
        
        setInterval(() => this.cacheManager.cleanup(), 30 * 60 * 1000);
        this.hasInitialized = true;

        this.restorePlaybackProgress();

        if (this.isPlaying) {
            this.isPlaying = false;
            this.savePlayState(false);
            this.userGestureResolved = false;
            this.updatePlayButton();
            const toast = window.Starlink?.toast || window.toast;
            if (toast && toast.show) toast.show('点击播放按钮开始音乐', 'info');
        }
    }

    getApiName(apiId) {
        // 移除 migu 映射
        const names = { netease: '网易云音乐', qq: 'QQ音乐', kg: '酷狗音乐', kuwo: '酷我音乐', local: '本地音乐' };
        return names[apiId] || apiId;
    }

    resetUIState() {
        this.isSearchMode.forEach((val, api) => { if (val) this.toggleSearchMode(api); });
        if (this.isVolumeSliderVisible) this.hideVolumeSlider();
    }

    cleanup() {
        if (this.updateAnimationFrame) cancelAnimationFrame(this.updateAnimationFrame);
        if (this.dragRAF) cancelAnimationFrame(this.dragRAF);
        if (this.scrollAnimationId) cancelAnimationFrame(this.scrollAnimationId);
        
        if (this.boundResizeListener) {
            window.removeEventListener('resize', this.boundResizeListener);
        }
        if (this.boundScrollListener) {
            window.removeEventListener('scroll', this.boundScrollListener, true);
        }
        if (this.boundHandleOutsideClick) {
            document.removeEventListener('click', this.boundHandleOutsideClick);
        }
        
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            this.audio.load();
            const newAudio = this.audio.cloneNode();
            this.audio.parentNode?.replaceChild(newAudio, this.audio);
            this.audio = newAudio;
        }
        
        if (this.cacheManager) this.cacheManager.cleanup();
        this.hasNotifiedLocal = false;
        
        if (typeof customSelectInstances !== 'undefined' && customSelectInstances) {
            customSelectInstances.forEach((instance, id) => {
                if (instance && typeof instance.destroy === 'function') {
                    instance.destroy();
                }
            });
            customSelectInstances.clear();
        }
        
        this.clearPlaylistState();
        try {
            localStorage.removeItem('music_player_progress');
        } catch (e) {}
        
        if (window.Starlink?.musicPlayer === this) window.Starlink.musicPlayer = null;
        if (window.musicPlayer === this) window.musicPlayer = null;
    }
}

window.MusicPlayer = MusicPlayer;