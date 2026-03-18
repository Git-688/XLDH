/**
 * 主播放器类 - 精简版
 */
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-element');
        this.cacheManager = new CacheManager();
        this.lyricParser = new LyricParser();
        this.pluginManager = new PluginManager(this.cacheManager);
        
        this.updateAnimationFrame = null;
        this.lastTimeUpdate = 0;
        
        this.initializeProperties();
        this.initializeElements();
        this.bindEvents();
        this.initializePlayer();
        
        this.isHandlingNavigationClick = false;
        this.hasInitialized = false;
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
        apis.forEach(api => {
            this.isSearchMode.set(api, false);
        });
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
            const volume = e.target.value / 100;
            this.setVolume(volume);
            this.saveVolume(volume);
        });
        
        this.elements.speedSelect.addEventListener('change', (e) => {
            const speed = parseFloat(e.target.value);
            this.setPlaybackSpeed(speed);
            this.savePlaybackSpeed(speed);
        });
        
        this.elements.downloadBtn.addEventListener('click', () => this.downloadCurrentSong());
        
        this.elements.searchToggleBtn.addEventListener('click', () => {
            this.toggleSearchMode(this.currentApi);
        });
        
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
        
        document.addEventListener('click', (e) => {
            const isNavigationClick = e.target.closest('.site-card') || 
                                     e.target.closest('.navigation-section') ||
                                     e.target.closest('.navigation-body') ||
                                     e.target.closest('.level1-btn') ||
                                     e.target.closest('.level2-btn');
            
            if (isNavigationClick) {
                this.isHandlingNavigationClick = true;
                setTimeout(() => {
                    this.isHandlingNavigationClick = false;
                }, 100);
            }
        }, true);
    }

    bindApiEvents() {
        const apis = ['netease', 'qq', 'migu', 'local'];
        
        apis.forEach(api => {
            const elements = this.apiElements[api];
            if (!elements) return;
            
            if (api === 'local' || api === 'migu') return;
            
            if (elements.playlistSelect) {
                elements.playlistSelect.addEventListener('change', () => {
                    this.loadApiPlaylist(api);
                });
            }
            
            if (elements.searchInput) {
                elements.searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.searchApi(api);
                });
                
                elements.searchInput.addEventListener('input', Utils.debounce(() => {
                    if (elements.searchInput.value.trim().length > 2) {
                        this.searchApi(api);
                    }
                }, 500));
            }
        });
    }

    async switchApiTab(apiId) {
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
        
        this.updateSearchToggleButton();
        
        await this.loadApiPlaylist(apiId);
    }

    async loadApiPlaylist(apiId) {
        const elements = this.apiElements[apiId];
        if (!elements) return;
        
        if (apiId === 'local') {
            if (elements.playlistContainer) {
                elements.playlistContainer.innerHTML = '<div class="loading">加载本地歌曲中...</div>';
            }
            if (elements.playlistContainer) elements.playlistContainer.style.display = 'block';
            if (elements.searchContainer) elements.searchContainer.style.display = 'none';
            
            try {
                const playlist = await this.pluginManager.getPlaylist(apiId, 'local');
                this.renderPlaylist(apiId, playlist);
                if (playlist.length > 0 && !this.hasNotifiedLocal) {
                    window.toast.show(`已加载 ${playlist.length} 首本地歌曲`, 'info');
                    this.hasNotifiedLocal = true;
                }
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
        
        if (apiId === 'migu') {
            if (elements.playlistContainer) {
                elements.playlistContainer.innerHTML = '<div class="loading">加载抖音热歌榜中...</div>';
            }
            if (elements.playlistContainer) elements.playlistContainer.style.display = 'block';
            if (elements.searchContainer) elements.searchContainer.style.display = 'none';
            
            try {
                const playlist = await this.pluginManager.getPlaylist(apiId, 'hot');
                this.renderPlaylist(apiId, playlist);
                if (playlist.length > 0 && !this.hasNotifiedMigu) {
                    window.toast.show(`已加载 ${playlist.length} 首抖音热歌`, 'info');
                    this.hasNotifiedMigu = true;
                }
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
            
            const cacheKey = `notified_${apiId}_${playlistId}`;
            if (playlist.length > 0 && !localStorage.getItem(cacheKey)) {
                window.toast.show(`已加载 ${playlist.length} 首歌曲`, 'info');
                localStorage.setItem(cacheKey, 'true');
            }
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

    async searchApi(apiId) {
        if (apiId === 'migu' || apiId === 'local') {
            const cacheKey = `searched_${apiId}`;
            if (!localStorage.getItem(cacheKey)) {
                window.toast.show('该功能不支持搜索', 'info');
                localStorage.setItem(cacheKey, 'true');
            }
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
            
            if (results.length === 0) {
                this.renderSearchResults(apiId, results);
                window.toast.show(`未找到与"${keyword}"相关的歌曲`, 'info');
            } else {
                this.renderSearchResults(apiId, results);
                if (results.length > 5) {
                    window.toast.show(`找到 ${results.length} 个结果`, 'info');
                }
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
            window.toast.show('搜索失败，请查看控制台', 'error');
        }
    }

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
        
        this.scrollToCurrentSong(apiId);
    }

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
        
        songItem.querySelector('.song-item-info').addEventListener('click', () => {
            this.loadSong(index, results);
            this.play();
        });
        
        const downloadBtn = songItem.querySelector('.search-download-btn');
        downloadBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.downloadSong(song);
        });
        
        return songItem;
    }

    async loadSong(index, playlist = null) {
        if (this.isHandlingNavigationClick) {
            console.log('导航点击被忽略，不加载歌曲');
            return;
        }
        
        const currentPlaylist = playlist || this.currentPlaylist;
        
        if (index < 0 || index >= currentPlaylist.length) return;
        
        this.currentIndex = index;
        const song = currentPlaylist[index];
        
        this.isLoading = true;
        this.elements.playBtn.disabled = true;
        
        try {
            if (index < currentPlaylist.length - 1) {
                this.pluginManager.preloadSong(currentPlaylist[index + 1]);
            }
            
            this.audio.src = song.src;
            
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
            
            this.scrollToCurrentSong(this.currentApi);
            
        } catch (error) {
            console.error('加载歌曲失败:', error);
            if (!this.isHandlingNavigationClick) {
                window.toast.show('加载歌曲失败', 'error');
            }
        } finally {
            this.isLoading = false;
            this.elements.playBtn.disabled = false;
        }
    }

    async updateSongInfo(song) {
        if (this.elements.songTitle) {
            this.elements.songTitle.textContent = song.title || '未知歌曲';
            this.checkTextOverflow(this.elements.songTitle);
        }
        if (this.elements.songArtist) {
            this.elements.songArtist.textContent = song.artist || '未知歌手';
            this.checkTextOverflow(this.elements.songArtist);
        }
        
        if (this.elements.coverImg && song.cover) {
            this.elements.coverImg.src = song.cover;
            this.elements.coverImg.style.display = 'block';
            const placeholder = document.querySelector('.cover-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        }
    }

    checkTextOverflow(element) {
        const container = element.parentElement;
        if (container.scrollWidth > container.clientWidth) {
            element.classList.add('scrolling');
        } else {
            element.classList.remove('scrolling');
        }
    }

    async loadLyrics(song) {
        this.lyricParser.clear();
        
        if (!song.lrc) {
            this.updateLyricsDisplay([]);
            return;
        }
        
        try {
            const response = await fetch(song.lrc);
            const lyricsText = await response.text();
            this.lyricParser.parseLrc(lyricsText);
            
            const displayLyrics = this.lyricParser.getDisplayLyrics(0, 3);
            this.updateLyricsDisplay(displayLyrics);
            
        } catch (error) {
            console.error('加载歌词失败:', error);
            this.updateLyricsDisplay([]);
        }
    }

    updateLyricsDisplay(lyrics) {
        if (!this.elements.lyricsContainer) return;
        
        this.elements.lyricsContainer.innerHTML = '';
        this.elements.lyricsContainer.classList.remove('horizontal-scroll');
        
        const lineCount = 3;
        
        for (let i = 0; i < lineCount; i++) {
            const line = document.createElement('div');
            line.className = 'lyrics-line';
            if (lyrics[i]) {
                line.textContent = lyrics[i].text;
                if (lyrics[i].active) {
                    line.classList.add('active');
                }
            }
            this.elements.lyricsContainer.appendChild(line);
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (this.isHandlingNavigationClick) {
            console.log('导航点击被忽略，不播放歌曲');
            return;
        }
        
        if (!this.audio.src && this.currentPlaylist.length > 0) {
            this.loadSong(0, this.currentPlaylist);
        }
        
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.savePlayState(true);
            document.querySelector('.album-cover').classList.add('playing');
        }).catch(error => {
            console.error('播放失败:', error);
            if (!this.isHandlingNavigationClick) {
                window.toast.show('播放失败', 'error');
            }
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.savePlayState(false);
        document.querySelector('.album-cover').classList.remove('playing');
        
        if (this.updateAnimationFrame) {
            cancelAnimationFrame(this.updateAnimationFrame);
            this.updateAnimationFrame = null;
        }
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

    next() {
        if (this.isHandlingNavigationClick) {
            console.log('导航点击被忽略，不跳转下一首');
            return;
        }
        
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

    togglePlayMode() {
        this.playMode = (this.playMode + 1) % 3;
        this.savePlayMode(this.playMode);
        this.updateModeIcon();
        
        const modeText = this.getPlayModeText();
        const lastMode = localStorage.getItem('lastPlayMode');
        
        if (lastMode !== modeText) {
            window.toast.show(`播放模式: ${modeText}`, 'info');
            localStorage.setItem('lastPlayMode', modeText);
        }
    }

    getPlayModeText() {
        switch(this.playMode) {
            case 0: return '顺序播放';
            case 1: return '随机播放';
            case 2: return '单曲循环';
            default: return '顺序播放';
        }
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

    toggleSearchMode(apiId) {
        if (apiId === 'migu' || apiId === 'local') {
            window.toast.show('该功能不支持搜索', 'info');
            return;
        }
        
        const elements = this.apiElements[apiId];
        if (!elements) return;
        
        const isSearch = this.isSearchMode.get(apiId) || false;
        this.isSearchMode.set(apiId, !isSearch);
        
        if (!isSearch) {
            if (elements.playlistContainer) elements.playlistContainer.style.display = 'none';
            if (elements.searchContainer) elements.searchContainer.style.display = 'block';
            if (elements.searchInput) elements.searchInput.focus();
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
            this.elements.searchToggleBtn.title = '返回歌单';
            this.elements.searchToggleBtn.classList.add('search-active');
        } else {
            searchIcon.style.display = 'block';
            backIcon.style.display = 'none';
            this.elements.searchToggleBtn.title = '搜索';
            this.elements.searchToggleBtn.classList.remove('search-active');
        }
    }

    async downloadCurrentSong() {
        if (!this.currentPlaylist[this.currentIndex]) {
            window.toast.show('没有可下载的歌曲', 'warning');
            return;
        }
        
        const song = this.currentPlaylist[this.currentIndex];
        await this.downloadSong(song);
    }

    async downloadSong(song) {
        try {
            window.toast.show(`开始下载: ${song.title}`, 'info');
            
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
            window.toast.show(`下载完成: ${song.title}`, 'info');
            
        } catch (error) {
            console.error('下载失败:', error);
            window.toast.show(`下载失败: ${song.title}`, 'error');
        }
    }

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

    updateDownloadProgress(progressElement, progress) {
        const fill = progressElement.querySelector('.download-progress-fill');
        fill.style.width = `${progress}%`;
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
            
            if (duration && !isNaN(duration)) {
                const progressPercent = (currentTime / duration) * 100;
                this.elements.progress.style.width = `${progressPercent}%`;
                this.elements.progressHandle.style.left = `${progressPercent}%`;
                
                if (!this.lastTimeUpdate || Date.now() - this.lastTimeUpdate > 500) {
                    this.elements.currentTime.textContent = Utils.formatTime(currentTime);
                    this.lastTimeUpdate = Date.now();
                }
                
                const currentLyric = this.lyricParser.getCurrentLyric(currentTime);
                if (currentLyric && currentLyric.index !== this.currentLyricIndex) {
                    this.currentLyricIndex = currentLyric.index;
                    
                    const displayLyrics = this.lyricParser.getDisplayLyrics(currentTime, 3);
                    this.updateLyricsDisplay(displayLyrics);
                }
            }
            
            this.updateAnimationFrame = null;
        });
    }

    updateDuration() {
        const duration = this.audio.duration;
        if (duration && !isNaN(duration) && duration > 0) {
            this.elements.duration.textContent = Utils.formatTime(duration);
        } else {
            this.elements.duration.textContent = '--:--';
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
        if (this.elements.speedSelect) {
            this.elements.speedSelect.value = speed.toString();
        }
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
        if (this.isVolumeSliderVisible) {
            this.hideVolumeSlider();
        } else {
            this.showVolumeSlider();
        }
    }

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
        
        this.audio.addEventListener('timeupdate', () => {
            if (!this.updateAnimationFrame) {
                this.updateProgress();
            }
        });
        
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
            
            if (!this.hasInitialized) {
                console.log('初始化未完成，忽略音频错误');
                return;
            }
            
            if (this.isHandlingNavigationClick) {
                console.log('导航点击引起的音频错误被忽略');
                return;
            }
            
            this.isLoading = false;
            
            if (!this.isHandlingNavigationClick) {
                window.toast.show('音频加载失败，尝试下一首', 'error');
                if (this.autoPlayNext) {
                    setTimeout(() => this.next(), 1000);
                }
            }
            
            if (this.updateAnimationFrame) {
                cancelAnimationFrame(this.updateAnimationFrame);
                this.updateAnimationFrame = null;
            }
        });
        
        this.audio.addEventListener('pause', () => {
            if (this.updateAnimationFrame) {
                cancelAnimationFrame(this.updateAnimationFrame);
                this.updateAnimationFrame = null;
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

    initializePlayer() {
        // 强制重置音频元素，防止浏览器恢复旧状态
        this.audio.src = '';
        this.audio.load();

        this.setVolume(this.volume);
        this.setPlaybackSpeed(this.playbackSpeed);
        this.updateModeIcon();
        this.updatePlayButton();
        
        this.loadApiPlaylist(this.currentApi);
        
        setInterval(() => this.cacheManager.cleanup(), 30 * 60 * 1000);
        
        this.hasInitialized = true;
    }

    getApiName(apiId) {
        const apiNames = {
            'netease': '网易云音乐',
            'qq': 'QQ音乐',
            'migu': '抖音热歌榜',
            'local': '本地音乐'
        };
        return apiNames[apiId] || apiId;
    }

    cleanup() {
        if (this.updateAnimationFrame) {
            cancelAnimationFrame(this.updateAnimationFrame);
            this.updateAnimationFrame = null;
        }
        
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            this.audio.load();
        }
        
        if (this.cacheManager) {
            this.cacheManager.cleanup();
        }
        
        // 重置首次通知标记
        this.hasNotifiedLocal = false;
        this.hasNotifiedMigu = false;
        
        if (window.musicPlayer === this) {
            window.musicPlayer = null;
        }
        
        console.log('音乐播放器资源已清理');
    }

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
}

window.MusicPlayer = MusicPlayer;