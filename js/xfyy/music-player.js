/**
 * 主播放器类 - 修复版（确保 scrollToCurrentSong 方法存在）
 */

// ==================== 自定义下拉选择器组件 ====================
class CustomSelect {
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
        this.dropdown.className = 'custom-select-dropdown-global';
        this.populateOptions();
        document.body.appendChild(this.dropdown);
        
        this.bindEvents();
        
        this.selectElement.addEventListener('change', () => {
            this.setValue(this.selectElement.value, false);
        });
        
        this.container.__customSelectInstance = this;
        window.addEventListener('scroll', this.handleScrollResize.bind(this), true);
        window.addEventListener('resize', this.handleScrollResize.bind(this));
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
        const dropdownHeight = this.dropdown.offsetHeight;
        const viewportHeight = window.innerHeight;
        
        let top = rect.bottom + window.scrollY + 4;
        let left = rect.left + window.scrollX;
        
        if (rect.bottom + dropdownHeight + 10 > viewportHeight) {
            top = rect.top + window.scrollY - dropdownHeight - 4;
        }
        
        const dropdownWidth = this.dropdown.offsetWidth;
        if (left + dropdownWidth > window.innerWidth + window.scrollX) {
            left = window.innerWidth + window.scrollX - dropdownWidth - 10;
        }
        if (left < 0) left = 10;
        
        this.dropdown.style.top = top + 'px';
        this.dropdown.style.left = left + 'px';
        this.dropdown.style.width = rect.width + 'px';
    }
    
    handleScrollResize() {
        this.updateDropdownPosition();
    }
    
    openDropdown() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.trigger.classList.add('open');
        this.populateOptions();
        this.updateDropdownPosition();
        this.dropdown.classList.add('open');
        
        const selected = this.dropdown.querySelector('.custom-select-option.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        
        this.handleOutsideClick = (e) => {
            if (!this.container.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        };
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
        }, 0);
    }
    
    closeDropdown() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.trigger.classList.remove('open');
        this.dropdown.classList.remove('open');
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
        if (valueSpan) {
            valueSpan.textContent = this.getSelectedText();
        }
    }
    
    destroy() {
        this.closeDropdown();
        this.container.remove();
        if (this.dropdown && this.dropdown.parentNode) {
            this.dropdown.remove();
        }
        this.selectElement.style.display = '';
        window.removeEventListener('scroll', this.handleScrollResize, true);
        window.removeEventListener('resize', this.handleScrollResize);
    }
}

function initCustomSelects() {
    const selects = document.querySelectorAll('.playlist-selector select, .speed-selector select');
    selects.forEach(select => {
        if (!select.parentNode.querySelector('.custom-select')) {
            new CustomSelect(select);
        }
    });
}

// ==================== 主播放器类 ====================
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-element');
        this.cacheManager = new CacheManager();
        this.lyricParser = new LyricParser();
        this.pluginManager = new PluginManager(this.cacheManager);
        
        this.updateAnimationFrame = null;
        this.lastTimeUpdate = 0;
        
        this.coverObserver = null;
        this.initCoverObserver();
        
        this.initializeProperties();
        this.initializeElements();
        this.bindEvents();
        this.initializePlayer();
        
        this.isHandlingNavigationClick = false;
        this.hasInitialized = false;
    }

    initCoverObserver() {
        this.coverObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const dataSrc = img.dataset.src;
                    if (dataSrc) {
                        img.src = dataSrc;
                        img.removeAttribute('data-src');
                    }
                    this.coverObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.01
        });
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
        
        this.currentLyricIndex = -1;
        this.isDraggingProgress = false;
        
        this.isSearchMode = new Map();
        this.isVolumeSliderVisible = false;
        
        this.hasNotifiedLocal = false;
        this.hasNotifiedMigu = false;
        
        const apis = ['netease', 'qq', 'migu', 'local'];
        apis.forEach(api => this.isSearchMode.set(api, false));
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
            
            player: document.querySelector('.music-player')
        };

        this.initializeApiElements();
    }

    initializeApiElements() {
        const apis = ['netease', 'qq', 'migu', 'local'];
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
        this.elements.speedSelect.addEventListener('change', (e) => {
            const speed = parseFloat(e.target.value);
            this.setPlaybackSpeed(speed);
            this.savePlaybackSpeed(speed);
        });
        this.elements.downloadBtn.addEventListener('click', () => this.downloadCurrentSong());
        this.elements.searchToggleBtn.addEventListener('click', () => this.toggleSearchMode(this.currentApi));
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const api = e.target.getAttribute('data-tab');
                this.switchApiTab(api);
            });
        });
        
        this.bindProgressEvents();
        this.bindAudioEvents();
        this.bindApiEvents();
        
        document.addEventListener('click', (e) => {
            if (this.isVolumeSliderVisible && 
                !this.elements.volumeBtn.contains(e.target) && 
                !this.elements.volumeSliderContainer.contains(e.target)) {
                this.hideVolumeSlider();
            }
        });
    }

    bindApiEvents() {
        const apis = ['netease', 'qq'];
        
        apis.forEach(api => {
            const elements = this.apiElements[api];
            if (!elements) return;
            
            if (elements.playlistSelect) {
                elements.playlistSelect.addEventListener('change', () => this.loadApiPlaylist(api));
            }
            if (elements.searchInput) {
                elements.searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.searchApi(api);
                });
            }
        });
    }

    async switchApiTab(apiId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${apiId}"]`);
        const tabContent = document.getElementById(`${apiId}-content`);
        
        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');
        
        this.currentApi = apiId;
        this.updateSearchToggleButton();
        await this.loadApiPlaylist(apiId);
    }

    async loadApiPlaylist(apiId) {
        const elements = this.apiElements[apiId];
        if (!elements) return;
        
        if (elements.playlistContainer) {
            elements.playlistContainer.innerHTML = '<div class="loading">加载中...</div>';
            elements.playlistContainer.style.display = 'block';
        }
        if (elements.searchContainer) elements.searchContainer.style.display = 'none';
        
        try {
            let playlist;
            if (apiId === 'local') {
                playlist = await this.pluginManager.getPlaylist(apiId, 'local');
                if (playlist.length > 0 && !this.hasNotifiedLocal) {
                    window.toast.show(`已加载 ${playlist.length} 首本地歌曲`, 'info');
                    this.hasNotifiedLocal = true;
                }
            } else if (apiId === 'migu') {
                playlist = await this.pluginManager.getPlaylist(apiId, 'hot');
                if (playlist.length > 0 && !this.hasNotifiedMigu) {
                    window.toast.show(`已加载 ${playlist.length} 首抖音热歌`, 'info');
                    this.hasNotifiedMigu = true;
                }
            } else {
                const playlistId = elements.playlistSelect ? elements.playlistSelect.value : '3778678';
                playlist = await this.pluginManager.getPlaylist(apiId, playlistId);
            }
            
            this.renderPlaylist(apiId, playlist);
        } catch (error) {
            console.error(`加载 ${apiId} 歌单失败:`, error);
            if (elements.playlistContainer) {
                elements.playlistContainer.innerHTML = `<div class="error-message">加载失败: ${error.message}</div>`;
            }
        }
    }

    async searchApi(apiId) {
        const elements = this.apiElements[apiId];
        if (!elements || !elements.searchInput) return;
        
        const keyword = elements.searchInput.value.trim();
        if (!keyword) return;
        
        if (elements.searchResults) elements.searchResults.innerHTML = '<div class="loading">搜索中...</div>';
        
        try {
            const results = await this.pluginManager.search(apiId, keyword);
            this.renderSearchResults(apiId, results);
        } catch (error) {
            console.error(`搜索失败:`, error);
        }
    }

    renderPlaylist(apiId, playlist) {
        const elements = this.apiElements[apiId];
        if (!elements || !elements.playlistContainer) return;
        
        const container = elements.playlistContainer;
        container.innerHTML = '';
        
        if (!playlist || playlist.length === 0) {
            container.innerHTML = '<div class="loading">歌单为空</div>';
            return;
        }
        
        this.currentPlaylist = playlist;
        
        playlist.forEach((song, index) => {
            const songItem = this.createSongItem(song, index, playlist);
            container.appendChild(songItem);
        });
        
        // 预加载前5首封面
        const preloadCount = Math.min(5, playlist.length);
        for (let i = 0; i < preloadCount; i++) {
            const song = playlist[i];
            if (song.cover) {
                const img = new Image();
                img.src = song.cover;
            }
        }
        
        // 观察后续歌曲封面
        const songItems = container.querySelectorAll('.song-item');
        songItems.forEach((item, index) => {
            if (index >= 5) {
                const coverImg = item.querySelector('img[data-src]');
                if (coverImg) this.coverObserver.observe(coverImg);
            }
        });
        
        // ===== 关键修复：调用 scrollToCurrentSong =====
        this.scrollToCurrentSong(apiId);
    }

    createSongItem(song, index, playlist) {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        if (index === this.currentIndex && playlist === this.currentPlaylist) {
            songItem.classList.add('active');
        }
        
        const coverUrl = song.cover || '';
        const coverHtml = coverUrl 
            ? `<img class="song-cover" data-src="${this.escapeHtml(coverUrl)}" alt="" loading="lazy" style="display:none;">` 
            : '';
        
        songItem.innerHTML = `
            ${coverHtml}
            <div class="song-item-info">
                <div class="song-item-title">${this.escapeHtml(song.title || '未知歌曲')}</div>
                <div class="song-item-artist">${this.escapeHtml(song.artist || '未知歌手')}</div>
            </div>
        `;
        
        if (index < 5 && coverUrl) {
            const img = songItem.querySelector('.song-cover');
            if (img) {
                img.src = coverUrl;
                img.removeAttribute('data-src');
            }
        }
        
        songItem.addEventListener('click', () => {
            this.loadSong(index, playlist);
            this.play();
        });
        
        return songItem;
    }

    // ===== 关键方法：scrollToCurrentSong =====
    scrollToCurrentSong(apiId) {
        const elements = this.apiElements[apiId];
        if (!elements || !elements.playlistContainer) return;
        
        const activeItem = elements.playlistContainer.querySelector('.song-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    renderSearchResults(apiId, results) {
        const elements = this.apiElements[apiId];
        if (!elements || !elements.searchResults) return;
        
        const container = elements.searchResults;
        container.innerHTML = '';
        
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="loading">未找到相关结果</div>';
            return;
        }
        
        results.forEach((song) => {
            container.appendChild(this.createSearchSongItem(song));
        });
    }

    createSearchSongItem(song) {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.innerHTML = `
            <div class="song-item-info">
                <div class="song-item-title">${this.escapeHtml(song.title || '未知歌曲')}</div>
                <div class="song-item-artist">${this.escapeHtml(song.artist || '未知歌手')}</div>
            </div>
        `;
        
        songItem.addEventListener('click', () => {
            this.currentPlaylist = [song];
            this.loadSong(0, this.currentPlaylist);
            this.play();
        });
        
        return songItem;
    }

    async loadSong(index, playlist = null) {
        const currentPlaylist = playlist || this.currentPlaylist;
        if (index < 0 || index >= currentPlaylist.length) return;
        
        this.currentIndex = index;
        const song = currentPlaylist[index];
        
        this.isLoading = true;
        this.elements.playBtn.disabled = true;
        
        try {
            this.audio.src = song.src;
            this.audio.load();
            
            await this.updateSongInfo(song);
            await this.loadLyrics(song);
            
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
            
            // 更新激活状态
            document.querySelectorAll('.song-item').forEach((item, i) => {
                item.classList.toggle('active', i === index);
            });
            
            this.scrollToCurrentSong(this.currentApi);
            
        } catch (error) {
            console.error('加载歌曲失败:', error);
        } finally {
            this.isLoading = false;
            this.elements.playBtn.disabled = false;
        }
    }

    async updateSongInfo(song) {
        if (this.elements.songTitle) {
            this.elements.songTitle.textContent = song.title || '未知歌曲';
        }
        if (this.elements.songArtist) {
            this.elements.songArtist.textContent = song.artist || '未知歌手';
        }
        
        const coverUrl = song.cover || '/assets/logo.png';
        if (this.elements.coverImg) {
            this.elements.coverImg.src = coverUrl;
            this.elements.coverImg.style.display = 'block';
        }
    }

    async loadLyrics(song) {
        this.lyricParser.clear();
        if (!song.lrc) return;
        
        try {
            const response = await fetch(song.lrc);
            const lyricsText = await response.text();
            this.lyricParser.parseLrc(lyricsText);
        } catch (error) {
            console.error('加载歌词失败:', error);
        }
    }

    togglePlay() {
        this.isPlaying ? this.pause() : this.play();
    }

    play() {
        if (!this.audio.src && this.currentPlaylist.length > 0) {
            this.loadSong(0, this.currentPlaylist);
        }
        
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.savePlayState(true);
        }).catch(error => {
            console.error('播放失败:', error);
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.savePlayState(false);
    }

    updatePlayButton() {
        const playIcon = this.elements.playBtn.querySelector('.play-icon');
        const pauseIcon = this.elements.playBtn.querySelector('.pause-icon');
        
        if (this.isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    previous() {
        let newIndex = this.currentIndex - 1;
        if (newIndex < 0) newIndex = this.currentPlaylist.length - 1;
        this.loadSong(newIndex, this.currentPlaylist);
        if (this.isPlaying) this.play();
    }

    next() {
        let newIndex = this.currentIndex + 1;
        if (newIndex >= this.currentPlaylist.length) newIndex = 0;
        this.loadSong(newIndex, this.currentPlaylist);
        if (this.isPlaying) this.play();
    }

    togglePlayMode() {
        this.playMode = (this.playMode + 1) % 3;
        this.savePlayMode(this.playMode);
        this.updateModeIcon();
    }

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
                break;
            case 1:
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z');
                modeIcon.appendChild(path);
                break;
            case 2:
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z');
                modeIcon.appendChild(path);
                break;
        }
    }

    toggleSearchMode(apiId) {
        const elements = this.apiElements[apiId];
        if (!elements) return;
        
        const isSearch = this.isSearchMode.get(apiId) || false;
        this.isSearchMode.set(apiId, !isSearch);
        
        if (!isSearch) {
            if (elements.playlistContainer) elements.playlistContainer.style.display = 'none';
            if (elements.searchContainer) elements.searchContainer.style.display = 'block';
        } else {
            if (elements.playlistContainer) elements.playlistContainer.style.display = 'block';
            if (elements.searchContainer) elements.searchContainer.style.display = 'none';
        }
        
        this.updateSearchToggleButton();
    }

    updateSearchToggleButton() {
        const isSearch = this.isSearchMode.get(this.currentApi) || false;
        const searchIcon = this.elements.searchToggleBtn.querySelector('.search-icon');
        const backIcon = this.elements.searchToggleBtn.querySelector('.back-icon');
        
        if (isSearch) {
            searchIcon.style.display = 'none';
            backIcon.style.display = 'block';
        } else {
            searchIcon.style.display = 'block';
            backIcon.style.display = 'none';
        }
    }

    async downloadCurrentSong() {
        const song = this.currentPlaylist[this.currentIndex];
        if (!song) return;
        await this.downloadSong(song);
    }

    async downloadSong(song) {
        try {
            const response = await fetch(song.src);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${song.title || '歌曲'} - ${song.artist || '未知歌手'}.mp3`;
            a.click();
            URL.revokeObjectURL(url);
            window.toast.show(`下载完成: ${song.title}`, 'success');
        } catch (error) {
            window.toast.show('下载失败', 'error');
        }
    }

    updateProgress() {
        if (this.isDraggingProgress) return;
        
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (duration && !isNaN(duration)) {
            const progressPercent = (currentTime / duration) * 100;
            this.elements.progress.style.width = `${progressPercent}%`;
            this.elements.progressHandle.style.left = `${progressPercent}%`;
            this.elements.currentTime.textContent = Utils.formatTime(currentTime);
        }
    }

    updateDuration() {
        const duration = this.audio.duration;
        if (duration && !isNaN(duration)) {
            this.elements.duration.textContent = Utils.formatTime(duration);
        }
    }

    setVolume(volume) {
        this.volume = volume;
        this.audio.volume = volume;
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.value = volume * 100;
        }
    }

    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
        this.audio.playbackRate = speed;
    }

    showVolumeSlider() {
        this.elements.volumeSliderContainer.style.display = 'block';
        this.isVolumeSliderVisible = true;
    }

    hideVolumeSlider() {
        this.elements.volumeSliderContainer.style.display = 'none';
        this.isVolumeSliderVisible = false;
    }

    toggleVolumeSlider() {
        this.isVolumeSliderVisible ? this.hideVolumeSlider() : this.showVolumeSlider();
    }

    bindProgressEvents() {
        this.elements.progressBar.addEventListener('click', (e) => {
            const seekTime = this.getSeekTime(e);
            this.audio.currentTime = seekTime;
        });
        
        let isDragging = false;
        
        this.elements.progressBar.addEventListener('mousedown', () => { isDragging = true; this.isDraggingProgress = true; });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const seekTime = this.getSeekTime(e);
            this.audio.currentTime = seekTime;
        });
        document.addEventListener('mouseup', () => { isDragging = false; this.isDraggingProgress = false; });
    }

    getSeekTime(e) {
        const progressBar = this.elements.progressBar;
        const rect = progressBar.getBoundingClientRect();
        const clickPosition = e.clientX - rect.left;
        const seekPercent = Math.max(0, Math.min(1, clickPosition / rect.width));
        return seekPercent * (this.audio.duration || 0);
    }

    bindAudioEvents() {
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
    }

    initializePlayer() {
        this.audio.src = '';
        this.audio.load();
        this.setVolume(this.volume);
        this.setPlaybackSpeed(this.playbackSpeed);
        this.updateModeIcon();
        this.updatePlayButton();
        this.loadApiPlaylist(this.currentApi);
        
        setTimeout(() => initCustomSelects(), 100);
        this.hasInitialized = true;
    }

    saveVolume(volume) {
        localStorage.setItem('musicPlayer_volume', volume.toString());
    }

    loadVolume() {
        return parseFloat(localStorage.getItem('musicPlayer_volume')) || 0.5;
    }

    savePlaybackSpeed(speed) {
        localStorage.setItem('musicPlayer_playbackSpeed', speed.toString());
    }

    loadPlaybackSpeed() {
        return parseFloat(localStorage.getItem('musicPlayer_playbackSpeed')) || 1.0;
    }

    savePlayMode(mode) {
        localStorage.setItem('musicPlayer_playMode', mode.toString());
    }

    loadPlayMode() {
        return parseInt(localStorage.getItem('musicPlayer_playMode')) || 0;
    }

    savePlayState(isPlaying) {
        localStorage.setItem('musicPlayer_playState', isPlaying.toString());
    }

    loadPlayState() {
        return localStorage.getItem('musicPlayer_playState') === 'true';
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.MusicPlayer = MusicPlayer;