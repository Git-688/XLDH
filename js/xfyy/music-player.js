/**
 * 主播放器类 - 完整优化版（精确进度条，下载进度，稳定API）
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
        this.isHorizontalScroll = this.loadLyricsMode();
        this.showTranslation = true;
        this.isDraggingProgress = false;
        this.searchResults = new Map();
        this.isSearchMode = new Map();
        this.isVolumeSliderVisible = false;
        this.dominantColor = null;
        this.secondaryColor = null;
        this.colorExtractor = new ColorExtractor();
        this.backgroundAnimation = null;
        this.isBackgroundAnimated = false;
        
        // 进度条拖拽专用
        this.dragPercent = 0;
        this.clickPending = false;
        this.dragRAF = null;
        this.updateAnimationFrame = null;
        this.lastTimeUpdate = 0;
        
        const apis = ['netease', 'qq', 'kg', 'kuwo', 'migu'];
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
            player: document.querySelector('.music-player'),
            notification: document.getElementById('notification')
        };
        this.initializeApiElements();
    }

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
        this.elements.lyricsContainer.addEventListener('click', () => this.toggleLyricsScrollMode());
        document.addEventListener('click', (e) => {
            if (this.isVolumeSliderVisible && 
                !this.elements.volumeBtn.contains(e.target) && 
                !this.elements.volumeSliderContainer.contains(e.target)) {
                this.hideVolumeSlider();
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.pauseBackgroundAnimation();
            else this.resumeBackgroundAnimation();
        });
    }

    bindApiEvents() {
        const apis = ['netease', 'qq', 'kg', 'kuwo', 'migu'];
        apis.forEach(api => {
            const elements = this.apiElements[api];
            if (!elements) return;
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
        if (apiId === 'migu') {
            if (elements.playlistContainer) {
                elements.playlistContainer.innerHTML = '<div class="loading">加载抖音热歌榜中...</div>';
            }
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

    async searchApi(apiId) {
        if (apiId === 'migu') {
            this.showNotification('抖音热歌榜不支持搜索功能', 'info');
            return;
        }
        const elements = this.apiElements[apiId];
        if (!elements || !elements.searchInput) return;
        const keyword = elements.searchInput.value.trim();
        if (!keyword) {
            if (elements.searchResults) elements.searchResults.innerHTML = '<div class="loading">请输入搜索关键词</div>';
            return;
        }
        if (elements.searchResults) elements.searchResults.innerHTML = '<div class="loading">搜索中...</div>';
        try {
            const results = await this.pluginManager.search(apiId, keyword);
            const processedResults = results.map(song => {
                if (!song.src && song.id) {
                    if (apiId === 'netease') {
                        song.src = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
                    } else if (apiId === 'qq') {
                        song.src = `https://dl.stream.qqmusic.qq.com/${song.id}.mp3`;
                    }
                }
                return song;
            });
            this.searchResults.set(apiId, processedResults);
            this.renderSearchResults(apiId, processedResults);
            if (processedResults.length === 0) {
                this.showNotification(`未找到与"${keyword}"相关的歌曲`, 'info');
            } else {
                this.showNotification(`找到 ${processedResults.length} 个结果`, 'info');
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
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
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
        const currentPlaylist = playlist || this.currentPlaylist;
        if (index < 0 || index >= currentPlaylist.length) return;
        this.currentIndex = index;
        const song = currentPlaylist[index];
        this.isLoading = true;
        this.elements.playBtn.disabled = true;
        if (this.updateAnimationFrame) {
            cancelAnimationFrame(this.updateAnimationFrame);
            this.updateAnimationFrame = null;
        }
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
            this.showNotification('加载歌曲失败', 'error');
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
            await this.extractAlbumColor(song.cover);
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

    applyDynamicBackground() {
        if (!this.dominantColor) return;
        this.stopBackgroundAnimation();
        const primaryColor = Utils.rgbToHex(this.dominantColor);
        const secondaryColor = Utils.rgbToHex(this.secondaryColor);
        this.startBackgroundAnimation(primaryColor, secondaryColor);
        this.elements.player.classList.add('dynamic-bg');
        this.elements.lyricsSection.classList.add('dynamic-bg');
        this.adjustTextColors();
    }

    startBackgroundAnimation(color1, color2) {
        const player = this.elements.player;
        const lyricsSection = this.elements.lyricsSection;
        player.style.setProperty('--primary-color', color1);
        player.style.setProperty('--secondary-color', color2);
        player.classList.add('animated-bg');
        lyricsSection.classList.add('animated-bg');
        this.isBackgroundAnimated = true;
    }

    stopBackgroundAnimation() {
        const player = this.elements.player;
        const lyricsSection = this.elements.lyricsSection;
        player.classList.remove('animated-bg');
        lyricsSection.classList.remove('animated-bg');
        this.isBackgroundAnimated = false;
    }

    pauseBackgroundAnimation() {
        if (this.isBackgroundAnimated) {
            this.elements.player.style.animationPlayState = 'paused';
            this.elements.lyricsSection.style.animationPlayState = 'paused';
        }
    }

    resumeBackgroundAnimation() {
        if (this.isBackgroundAnimated) {
            this.elements.player.style.animationPlayState = 'running';
            this.elements.lyricsSection.style.animationPlayState = 'running';
        }
    }

    adjustTextColors() {
        if (!this.dominantColor) return;
        const isLight = Utils.isLightColor(Utils.rgbToHex(this.dominantColor));
        const textColor = isLight ? '#2c3e50' : '#ecf0f1';
        const secondaryColor = isLight ? '#7f8c8d' : '#bdc3c7';
        document.documentElement.style.setProperty('--dynamic-text-color', textColor);
        document.documentElement.style.setProperty('--dynamic-secondary-color', secondaryColor);
    }

    resetDynamicBackground() {
        this.stopBackgroundAnimation();
        this.elements.player.classList.remove('dynamic-bg');
        this.elements.player.style.background = '';
        this.elements.lyricsSection.classList.remove('dynamic-bg');
        this.elements.lyricsSection.style.background = '';
        document.documentElement.style.removeProperty('--dynamic-text-color');
        document.documentElement.style.removeProperty('--dynamic-secondary-color');
    }

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
            const translationLines = lyricsText.split('\n').filter(line => 
                line.includes('[tr:') || line.includes('[翻译]')
            );
            if (translationLines.length > 0) {
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
            } else if (this.showTranslation && this.isEnglishLyrics(lyrics)) {
                await this.translateLyrics(lyrics);
            }
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

    isEnglishLyrics(lyrics) {
        if (lyrics.length === 0) return false;
        const sampleText = lyrics.slice(0, 5).map(lyric => lyric.text).join(' ');
        const englishRegex = /[a-zA-Z]/;
        return englishRegex.test(sampleText);
    }

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
                activeLine.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }
        } else {
            this.elements.lyricsContainer.classList.remove('horizontal-scroll');
            const lineCount = 3;
            for (let i = 0; i < lineCount; i++) {
                const line = document.createElement('div');
                line.className = 'lyrics-line';
                if (lyrics[i]) {
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

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.audio.src && this.currentPlaylist.length > 0) {
            this.loadSong(0, this.currentPlaylist);
        }
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.savePlayState(true);
            document.querySelector('.album-cover').classList.add('playing');
            this.resumeBackgroundAnimation();
        }).catch(error => {
            console.error('播放失败:', error);
            this.showNotification('播放失败', 'error');
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.savePlayState(false);
        document.querySelector('.album-cover').classList.remove('playing');
        this.pauseBackgroundAnimation();
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
            if (newIndex < 0) newIndex = this.currentPlaylist.length - 1;
        }
        this.loadSong(newIndex, this.currentPlaylist);
        if (this.isPlaying) this.play();
    }

    next() {
        let newIndex;
        if (this.playMode === 1) {
            newIndex = Math.floor(Math.random() * this.currentPlaylist.length);
        } else {
            newIndex = this.currentIndex + 1;
            if (newIndex >= this.currentPlaylist.length) newIndex = 0;
        }
        this.loadSong(newIndex, this.currentPlaylist);
        if (this.isPlaying && this.autoPlayNext) this.play();
    }

    togglePlayMode() {
        this.playMode = (this.playMode + 1) % 3;
        this.savePlayMode(this.playMode);
        this.updateModeIcon();
        this.showNotification(`播放模式: ${this.getPlayModeText()}`, 'info');
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

    async downloadCurrentSong() {
        if (!this.currentPlaylist[this.currentIndex]) {
            this.showNotification('没有可下载的歌曲', 'warning');
            return;
        }
        await this.downloadSong(this.currentPlaylist[this.currentIndex]);
    }

    async downloadSong(song) {
        let progress = null;
        try {
            this.showNotification(`开始下载: ${song.title}`, 'info');
            progress = this.createDownloadProgress();
            const response = await fetch(song.src);
            if (!response.ok) throw new Error('网络响应错误');
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
                    const percent = (loaded / total) * 100;
                    this.updateDownloadProgress(progress, percent);
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
            progress.remove();
            this.showNotification(`下载完成: ${song.title}`, 'info');
        } catch (error) {
            console.error('下载失败:', error);
            this.showNotification(`下载失败: ${song.title}`, 'error');
            if (progress) progress.remove();
        }
    }

    createDownloadProgress() {
        const div = document.createElement('div');
        div.className = 'download-progress';
        div.innerHTML = `
            <div>下载中...</div>
            <div class="download-progress-bar">
                <div class="download-progress-fill" style="width: 0%"></div>
            </div>
        `;
        document.body.appendChild(div);
        return div;
    }

    updateDownloadProgress(progressElement, percent) {
        const fill = progressElement.querySelector('.download-progress-fill');
        if (fill) fill.style.width = `${Math.min(percent, 100)}%`;
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
                this.elements.progress.style.transform = `scaleX(${percent / 100})`;
                this.elements.progressHandle.style.left = `${percent}%`;
                const now = Date.now();
                if (!this.lastTimeUpdate || now - this.lastTimeUpdate > 500) {
                    this.elements.currentTime.textContent = Utils.formatTime(currentTime);
                    this.lastTimeUpdate = now;
                }
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
        if (this.elements.volumeSlider) this.elements.volumeSlider.value = volume * 100;
    }

    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
        this.audio.playbackRate = speed;
        if (this.elements.speedSelect) this.elements.speedSelect.value = speed.toString();
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
        if (this.isVolumeSliderVisible) this.hideVolumeSlider();
        else this.showVolumeSlider();
    }

    // 进度条事件（精确拖拽/点击）
    bindProgressEvents() {
        const progressBar = this.elements.progressBar;
        progressBar.style.touchAction = 'none';
        
        progressBar.addEventListener('mousedown', (e) => this.startSeek(e));
        document.addEventListener('mousemove', (e) => this.dragSeek(e));
        document.addEventListener('mouseup', () => this.endSeek());
        
        progressBar.addEventListener('touchstart', (e) => this.startSeek(e));
        document.addEventListener('touchmove', (e) => this.dragSeek(e), { passive: false });
        document.addEventListener('touchend', () => this.endSeek());
        
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
                this.elements.progress.style.transform = `scaleX(${percent / 100})`;
                this.elements.progressHandle.style.left = `${percent}%`;
                this.elements.currentTime.textContent = Utils.formatTime(seekTime);
            }
        });
    }

    startSeek(e) {
        e.preventDefault();
        this.isDraggingProgress = true;
        this.elements.progress.classList.add('no-transition');
        this.updateSeek(e);
        if (e.type === 'touchstart') document.body.style.overflow = 'hidden';
    }

    dragSeek(e) {
        if (!this.isDraggingProgress) return;
        e.preventDefault();
        if (this.dragRAF) cancelAnimationFrame(this.dragRAF);
        this.dragRAF = requestAnimationFrame(() => {
            this.updateSeek(e);
            this.dragRAF = null;
        });
    }

    endSeek() {
        if (!this.isDraggingProgress) return;
        this.isDraggingProgress = false;
        this.elements.progress.classList.remove('no-transition');
        const duration = this.audio.duration;
        if (duration && !isNaN(duration) && duration > 0) {
            const seekTime = (this.dragPercent / 100) * duration;
            this.audio.currentTime = seekTime;
            this.elements.progress.style.width = `${this.dragPercent}%`;
            this.elements.progress.style.transform = `scaleX(${this.dragPercent / 100})`;
            this.elements.progressHandle.style.left = `${this.dragPercent}%`;
            this.elements.currentTime.textContent = Utils.formatTime(seekTime);
        }
        document.body.style.overflow = '';
        if (this.dragRAF) cancelAnimationFrame(this.dragRAF);
        this.dragRAF = null;
        this.clickPending = true;
        setTimeout(() => { this.clickPending = false; }, 100);
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
            this.elements.progress.style.transform = `scaleX(${this.dragPercent / 100})`;
            this.elements.progressHandle.style.left = `${this.dragPercent}%`;
            this.elements.currentTime.textContent = Utils.formatTime(seekTime);
        }
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
        this.audio.addEventListener('waiting', () => { this.isLoading = true; });
        this.audio.addEventListener('error', (e) => {
            console.error('音频加载错误:', e);
            this.isLoading = false;
            this.showNotification('音频加载失败，尝试下一首', 'error');
            if (this.autoPlayNext) setTimeout(() => this.next(), 1000);
        });
    }

    initializePlayer() {
        this.setVolume(this.volume);
        this.setPlaybackSpeed(this.playbackSpeed);
        this.updateModeIcon();
        this.updatePlayButton();
        if (this.isHorizontalScroll) {
            this.elements.lyricsContainer.classList.add('horizontal-scroll');
        }
        this.loadApiPlaylist(this.currentApi);
        setInterval(() => this.cacheManager.cleanup(), 60 * 60 * 1000);
    }

    showNotification(message, type = 'info') {
        const notification = this.elements.notification;
        if (!notification) return;
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.style.display = 'none', 300);
        }, 3000);
    }

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

    saveVolume(volume) { localStorage.setItem('musicPlayer_volume', volume.toString()); }
    loadVolume() { const saved = localStorage.getItem('musicPlayer_volume'); return saved ? parseFloat(saved) : 0.5; }
    savePlaybackSpeed(speed) { localStorage.setItem('musicPlayer_playbackSpeed', speed.toString()); }
    loadPlaybackSpeed() { const saved = localStorage.getItem('musicPlayer_playbackSpeed'); return saved ? parseFloat(saved) : 1.0; }
    savePlayMode(mode) { localStorage.setItem('musicPlayer_playMode', mode.toString()); }
    loadPlayMode() { const saved = localStorage.getItem('musicPlayer_playMode'); return saved ? parseInt(saved) : 0; }
    savePlayState(isPlaying) { localStorage.setItem('musicPlayer_playState', isPlaying.toString()); }
    loadPlayState() { const saved = localStorage.getItem('musicPlayer_playState'); return saved ? saved === 'true' : false; }
    saveLyricsMode(isHorizontal) { localStorage.setItem('musicPlayer_lyricsMode', isHorizontal.toString()); }
    loadLyricsMode() { const saved = localStorage.getItem('musicPlayer_lyricsMode'); return saved ? saved === 'true' : false; }
}

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
                this.canvas.width = 100;
                this.canvas.height = 100;
                this.ctx.drawImage(img, 0, 0, 100, 100);
                const imageData = this.ctx.getImageData(0, 0, 100, 100);
                const pixels = imageData.data;
                const colorBuckets = {};
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    if (r < 30 && g < 30 && b < 30) continue;
                    if (r > 230 && g > 230 && b > 230) continue;
                    const quantizedR = Math.floor(r / 10) * 10;
                    const quantizedG = Math.floor(g / 10) * 10;
                    const quantizedB = Math.floor(b / 10) * 10;
                    const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
                    colorBuckets[colorKey] = (colorBuckets[colorKey] || 0) + 1;
                }
                const sortedColors = Object.entries(colorBuckets)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, colorCount);
                const prominentColors = sortedColors.map(([colorKey]) => {
                    const [r, g, b] = colorKey.split(',').map(Number);
                    return { r, g, b };
                });
                resolve(prominentColors);
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }
}

window.MusicPlayer = MusicPlayer;
window.ColorExtractor = ColorExtractor;