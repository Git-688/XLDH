/**
 * 主播放器类 - 精简版（修复下拉菜单被遮挡问题 + 资源懒加载优化）
 */

// ==================== 自定义下拉选择器组件（挂载到 body） ====================
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
        this.trigger = document.createElement('div');
        this.trigger.className = 'custom-select-trigger';
        this.trigger.innerHTML = `<span class="custom-select-value">${this.getSelectedText()}</span><span class="arrow"></span>`;
        this.container.appendChild(this.trigger);
        this.selectElement.parentNode.insertBefore(this.container, this.selectElement.nextSibling);
        
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'custom-select-dropdown-global';
        this.dropdown.style.zIndex = '100000'; // 提高 z-index 确保不被遮挡
        this.populateOptions();
        document.body.appendChild(this.dropdown);
        
        this.bindEvents();
        this.selectElement.addEventListener('change', () => this.setValue(this.selectElement.value, false));
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
            const div = document.createElement('div');
            div.className = 'custom-select-option' + (i === this.selectElement.selectedIndex ? ' selected' : '');
            div.textContent = option.textContent;
            div.dataset.value = option.value;
            div.dataset.index = i;
            div.addEventListener('click', (e) => { e.stopPropagation(); this.selectOption(i); this.closeDropdown(); });
            this.dropdown.appendChild(div);
            this.options.push(div);
        }
    }
    
    selectOption(index) {
        if (index === this.selectElement.selectedIndex) return;
        this.selectElement.selectedIndex = index;
        this.value = this.selectElement.value;
        this.trigger.querySelector('.custom-select-value').textContent = this.selectElement.options[index].textContent;
        this.options.forEach((opt, i) => opt.classList.toggle('selected', i === index));
        this.selectElement.dispatchEvent(new Event('change', { bubbles: true }));
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
        if (rect.bottom + dropdownHeight + 10 > viewportHeight) top = rect.top + window.scrollY - dropdownHeight - 4;
        const dropdownWidth = this.dropdown.offsetWidth;
        if (left + dropdownWidth > window.innerWidth + window.scrollX) left = window.innerWidth + window.scrollX - dropdownWidth - 10;
        if (left < 0) left = 10;
        this.dropdown.style.top = top + 'px';
        this.dropdown.style.left = left + 'px';
        this.dropdown.style.width = rect.width + 'px';
    }
    
    handleScrollResize() { this.updateDropdownPosition(); }
    
    openDropdown() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.trigger.classList.add('open');
        this.populateOptions();
        this.updateDropdownPosition();
        this.dropdown.classList.add('open');
        const selected = this.dropdown.querySelector('.custom-select-option.selected');
        if (selected) selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        this.handleOutsideClick = (e) => { if (!this.container.contains(e.target) && !this.dropdown.contains(e.target)) this.closeDropdown(); };
        setTimeout(() => document.addEventListener('click', this.handleOutsideClick), 0);
    }
    
    closeDropdown() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.trigger.classList.remove('open');
        this.dropdown.classList.remove('open');
        document.removeEventListener('click', this.handleOutsideClick);
    }
    
    bindEvents() {
        this.trigger.addEventListener('click', (e) => { e.stopPropagation(); this.isOpen ? this.closeDropdown() : this.openDropdown(); });
    }
    
    refreshOptions() {
        this.populateOptions();
        this.trigger.querySelector('.custom-select-value').textContent = this.getSelectedText();
    }
    
    destroy() {
        this.closeDropdown();
        this.container.remove();
        if (this.dropdown?.parentNode) this.dropdown.remove();
        this.selectElement.style.display = '';
        window.removeEventListener('scroll', this.handleScrollResize, true);
        window.removeEventListener('resize', this.handleScrollResize);
    }
}

function initCustomSelects() {
    document.querySelectorAll('.playlist-selector select, .speed-selector select').forEach(select => {
        if (!select.parentNode.querySelector('.custom-select')) new CustomSelect(select);
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
                    if (dataSrc) { img.src = dataSrc; img.removeAttribute('data-src'); }
                    this.coverObserver.unobserve(img);
                }
            });
        }, { rootMargin: '100px', threshold: 0.01 });
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
        ['netease', 'qq', 'migu', 'local'].forEach(api => this.isSearchMode.set(api, false));
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
                searchResults: document.getElementById(`${api}-search-results`)
            };
        });
    }

    bindEvents() {
        this.elements.playBtn.addEventListener('click', () => this.togglePlay());
        this.elements.prevBtn.addEventListener('click', () => this.previous());
        this.elements.nextBtn.addEventListener('click', () => this.next());
        this.elements.modeBtn.addEventListener('click', () => this.togglePlayMode());
        this.elements.volumeBtn.addEventListener('click', () => this.toggleVolumeSlider());
        this.elements.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        this.elements.speedSelect.addEventListener('change', (e) => this.setPlaybackSpeed(parseFloat(e.target.value)));
        this.elements.downloadBtn.addEventListener('click', () => this.downloadCurrentSong());
        this.elements.searchToggleBtn.addEventListener('click', () => this.toggleSearchMode(this.currentApi));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', (e) => this.switchApiTab(e.target.dataset.tab)));
        this.bindProgressEvents();
        this.bindAudioEvents();
        this.bindApiEvents();
        document.addEventListener('click', (e) => {
            if (this.isVolumeSliderVisible && !this.elements.volumeBtn.contains(e.target) && !this.elements.volumeSliderContainer.contains(e.target))
                this.hideVolumeSlider();
        });
    }

    bindApiEvents() {
        ['netease', 'qq', 'migu', 'local'].forEach(api => {
            const el = this.apiElements[api];
            if (!el || api === 'local' || api === 'migu') return;
            if (el.playlistSelect) el.playlistSelect.addEventListener('change', () => this.loadApiPlaylist(api));
            if (el.searchInput) {
                el.searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.searchApi(api); });
                el.searchInput.addEventListener('input', Utils.debounce(() => { if (el.searchInput.value.trim().length > 2) this.searchApi(api); }, 500));
            }
        });
    }

    async switchApiTab(apiId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${apiId}"]`).classList.add('active');
        document.getElementById(`${apiId}-content`).classList.add('active');
        this.currentApi = apiId;
        this.updateSearchToggleButton();
        await this.loadApiPlaylist(apiId);
    }

    async loadApiPlaylist(apiId) {
        const el = this.apiElements[apiId];
        if (!el) return;
        if (el.playlistContainer) { el.playlistContainer.innerHTML = '<div class="loading">加载中...</div>'; el.playlistContainer.style.display = 'block'; }
        if (el.searchContainer) el.searchContainer.style.display = 'none';
        try {
            let playlist;
            if (apiId === 'local') playlist = await this.pluginManager.getPlaylist(apiId, 'local');
            else if (apiId === 'migu') playlist = await this.pluginManager.getPlaylist(apiId, 'hot');
            else playlist = await this.pluginManager.getPlaylist(apiId, el.playlistSelect?.value || '3778678');
            this.renderPlaylist(apiId, playlist);
        } catch (error) {
            if (el.playlistContainer) el.playlistContainer.innerHTML = `<div class="error-message"><p>加载失败: ${error.message}</p><button class="retry-btn" onclick="musicPlayer.loadApiPlaylist('${apiId}')">重试</button></div>`;
        }
        if (el.playlistSelect?.parentNode) {
            const cs = el.playlistSelect.parentNode.querySelector('.custom-select');
            if (cs?.__customSelectInstance) cs.__customSelectInstance.refreshOptions();
        }
    }

    async searchApi(apiId) {
        if (apiId === 'migu' || apiId === 'local') return;
        const el = this.apiElements[apiId];
        if (!el?.searchInput) return;
        const keyword = el.searchInput.value.trim();
        if (!keyword) { if (el.searchResults) el.searchResults.innerHTML = '<div class="loading">请输入搜索关键词</div>'; return; }
        if (el.searchResults) el.searchResults.innerHTML = '<div class="loading">搜索中...</div>';
        try {
            const results = await this.pluginManager.search(apiId, keyword);
            this.renderSearchResults(apiId, results);
        } catch (error) {
            if (el.searchResults) el.searchResults.innerHTML = `<div class="error-message"><p>搜索失败: ${error.message}</p><button class="retry-btn" onclick="musicPlayer.searchApi('${apiId}')">重试</button></div>`;
        }
    }

    renderPlaylist(apiId, playlist) {
        const el = this.apiElements[apiId];
        if (!el?.playlistContainer) return;
        const container = el.playlistContainer;
        container.innerHTML = '';
        if (!playlist.length) { container.innerHTML = '<div class="loading">歌单为空</div>'; return; }
        this.currentPlaylist = playlist;
        const fragment = document.createDocumentFragment();
        playlist.forEach((song, idx) => fragment.appendChild(this.createSongItem(song, idx, playlist)));
        container.appendChild(fragment);
        for (let i = 0; i < Math.min(5, playlist.length); i++) {
            const cover = playlist[i].cover;
            if (cover) new Image().src = cover;
        }
        container.querySelectorAll('.song-item').forEach((item, idx) => {
            if (idx >= 5) { const img = item.querySelector('img[data-src]'); if (img) this.coverObserver.observe(img); }
        });
        this.scrollToCurrentSong(apiId);
    }

    createSongItem(song, index, playlist) {
        const div = document.createElement('div');
        div.className = 'song-item' + (index === this.currentIndex && playlist === this.currentPlaylist ? ' active' : '');
        const coverHtml = song.cover ? `<img class="song-cover" data-src="${this.escapeHtml(song.cover)}" alt="" loading="lazy" style="display:none;">` : '';
        div.innerHTML = `${coverHtml}<div class="song-item-info"><div class="song-item-title">${this.escapeHtml(song.title||'未知歌曲')}</div><div class="song-item-artist">${this.escapeHtml(song.artist||'未知歌手')}</div></div>`;
        if (index < 5 && song.cover) { const img = div.querySelector('.song-cover'); img.src = song.cover; img.removeAttribute('data-src'); }
        div.addEventListener('click', () => { this.loadSong(index, playlist); this.play(); });
        return div;
    }

    renderSearchResults(apiId, results) {
        const el = this.apiElements[apiId];
        if (!el?.searchResults) return;
        el.searchResults.innerHTML = '';
        if (!results.length) { el.searchResults.innerHTML = '<div class="loading">未找到相关结果</div>'; return; }
        const fragment = document.createDocumentFragment();
        results.forEach((song, idx) => fragment.appendChild(this.createSearchSongItem(song, idx, results)));
        el.searchResults.appendChild(fragment);
    }

    createSearchSongItem(song, index, results) {
        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `<div class="song-item-info"><div class="song-item-title">${this.escapeHtml(song.title||'未知歌曲')}</div><div class="song-item-artist">${this.escapeHtml(song.artist||'未知歌手')}</div></div><button class="search-download-btn" title="下载"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></button>`;
        div.querySelector('.song-item-info').addEventListener('click', () => { this.loadSong(index, results); this.play(); });
        div.querySelector('.search-download-btn').addEventListener('click', async (e) => { e.stopPropagation(); await this.downloadSong(song); });
        return div;
    }

    async loadSong(index, playlist = null) {
        if (this.isHandlingNavigationClick) return;
        const pl = playlist || this.currentPlaylist;
        if (index < 0 || index >= pl.length) return;
        this.currentIndex = index;
        const song = pl[index];
        this.isLoading = true;
        this.elements.playBtn.disabled = true;
        try {
            this.audio.src = song.src;
            this.audio.load();
            await this.updateSongInfo(song);
            await this.loadLyrics(song);
            await new Promise(resolve => { const check = () => this.audio.duration && !isNaN(this.audio.duration) ? resolve() : setTimeout(check, 100); check(); });
            this.scrollToCurrentSong(this.currentApi);
        } catch (error) {
            console.error('加载歌曲失败:', error);
        } finally {
            this.isLoading = false;
            this.elements.playBtn.disabled = false;
        }
    }

    async updateSongInfo(song) {
        if (this.elements.songTitle) { this.elements.songTitle.textContent = song.title || '未知歌曲'; this.checkTextOverflow(this.elements.songTitle); }
        if (this.elements.songArtist) { this.elements.songArtist.textContent = song.artist || '未知歌手'; this.checkTextOverflow(this.elements.songArtist); }
        const coverUrl = song.cover || '/assets/logo.png';
        if (this.elements.coverImg) {
            this.elements.coverImg.src = coverUrl;
            this.elements.coverImg.style.display = 'block';
            document.querySelector('.cover-placeholder').style.display = 'none';
            this.elements.coverImg.onerror = () => { this.elements.coverImg.src = '/assets/logo.png'; };
        }
    }

    checkTextOverflow(el) { el.classList.toggle('scrolling', el.parentElement.scrollWidth > el.parentElement.clientWidth); }

    async loadLyrics(song) {
        this.lyricParser.clear();
        if (!song.lrc) { this.updateLyricsDisplay([]); return; }
        try {
            const res = await fetch(song.lrc);
            this.lyricParser.parseLrc(await res.text());
            this.updateLyricsDisplay(this.lyricParser.getDisplayLyrics(0, 3));
        } catch { this.updateLyricsDisplay([]); }
    }

    updateLyricsDisplay(lyrics) {
        if (!this.elements.lyricsContainer) return;
        this.elements.lyricsContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const line = document.createElement('div');
            line.className = 'lyrics-line' + (lyrics[i]?.active ? ' active' : '');
            line.textContent = lyrics[i]?.text || '';
            this.elements.lyricsContainer.appendChild(line);
        }
    }

    togglePlay() { this.isPlaying ? this.pause() : this.play(); }
    play() {
        if (!this.audio.src && this.currentPlaylist.length) this.loadSong(0);
        this.audio.play().then(() => { this.isPlaying = true; this.updatePlayButton(); document.querySelector('.album-cover').classList.add('playing'); })
            .catch(err => console.error('播放失败:', err));
    }
    pause() { this.audio.pause(); this.isPlaying = false; this.updatePlayButton(); document.querySelector('.album-cover').classList.remove('playing'); if (this.updateAnimationFrame) cancelAnimationFrame(this.updateAnimationFrame); }
    updatePlayButton() {
        const play = this.elements.playBtn.querySelector('.play-icon');
        const pause = this.elements.playBtn.querySelector('.pause-icon');
        play.style.display = this.isPlaying ? 'none' : 'block';
        pause.style.display = this.isPlaying ? 'block' : 'none';
    }

    previous() {
        let idx = this.playMode === 1 ? Math.floor(Math.random() * this.currentPlaylist.length) : this.currentIndex - 1;
        if (idx < 0) idx = this.currentPlaylist.length - 1;
        this.loadSong(idx); if (this.isPlaying) this.play();
    }
    next() {
        let idx = this.playMode === 1 ? Math.floor(Math.random() * this.currentPlaylist.length) : this.currentIndex + 1;
        if (idx >= this.currentPlaylist.length) idx = 0;
        this.loadSong(idx); if (this.isPlaying && this.autoPlayNext) this.play();
    }

    togglePlayMode() { this.playMode = (this.playMode + 1) % 3; this.updateModeIcon(); }
    updateModeIcon() { /* 省略具体实现，保持原样 */ }
    toggleSearchMode(apiId) {
        if (apiId === 'migu' || apiId === 'local') return;
        const el = this.apiElements[apiId];
        if (!el) return;
        const isSearch = this.isSearchMode.get(apiId);
        this.isSearchMode.set(apiId, !isSearch);
        el.playlistContainer.style.display = !isSearch ? 'none' : 'block';
        el.searchContainer.style.display = !isSearch ? 'block' : 'none';
        if (!isSearch) el.searchInput?.focus();
        this.updateSearchToggleButton();
    }
    updateSearchToggleButton() {
        const isSearch = this.isSearchMode.get(this.currentApi);
        this.elements.searchToggleBtn.querySelector('.search-icon').style.display = isSearch ? 'none' : 'block';
        this.elements.searchToggleBtn.querySelector('.back-icon').style.display = isSearch ? 'block' : 'none';
    }

    async downloadCurrentSong() { if (this.currentPlaylist[this.currentIndex]) await this.downloadSong(this.currentPlaylist[this.currentIndex]); }
    async downloadSong(song) { /* 省略下载实现，保持原样 */ }

    handleEnded() { if (this.playMode === 2) { this.audio.currentTime = 0; this.play(); } else if (this.autoPlayNext) this.next(); else this.pause(); }

    updateProgress() { /* 省略进度更新实现 */ }
    updateDuration() { const d = this.audio.duration; this.elements.duration.textContent = d && !isNaN(d) ? Utils.formatTime(d) : '--:--'; }
    setVolume(v) { this.volume = v; this.audio.volume = v; this.elements.volumeSlider.value = v * 100; this.saveVolume(v); }
    setPlaybackSpeed(s) { this.playbackSpeed = s; this.audio.playbackRate = s; this.savePlaybackSpeed(s); }
    showVolumeSlider() { this.elements.volumeSliderContainer.style.display = 'block'; this.isVolumeSliderVisible = true; }
    hideVolumeSlider() { this.elements.volumeSliderContainer.style.display = 'none'; this.isVolumeSliderVisible = false; }
    toggleVolumeSlider() { this.isVolumeSliderVisible ? this.hideVolumeSlider() : this.showVolumeSlider(); }

    bindProgressEvents() { /* 省略 */ }
    bindAudioEvents() {
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => { if (!this.updateAnimationFrame) this.updateProgress(); });
        this.audio.addEventListener('ended', () => this.handleEnded());
        this.audio.addEventListener('canplay', () => { this.elements.playBtn.disabled = false; this.isLoading = false; });
        this.audio.addEventListener('error', () => { if (!this.hasInitialized) return; this.isLoading = false; if (this.autoPlayNext) setTimeout(() => this.next(), 1000); });
    }

    initializePlayer() {
        this.audio.src = ''; this.audio.load();
        this.setVolume(this.volume); this.setPlaybackSpeed(this.playbackSpeed); this.updateModeIcon(); this.updatePlayButton();
        this.elements.coverImg.src = '/assets/logo.png';
        this.loadApiPlaylist(this.currentApi);
        setInterval(() => this.cacheManager.cleanup(), 30 * 60 * 1000);
        setTimeout(() => initCustomSelects(), 100);
        this.hasInitialized = true;
    }

    cleanup() {
        if (this.updateAnimationFrame) cancelAnimationFrame(this.updateAnimationFrame);
        this.audio.pause(); this.audio.src = ''; this.audio.load();
        this.cacheManager.cleanup();
        if (this.coverObserver) this.coverObserver.disconnect();
        this.hasNotifiedLocal = this.hasNotifiedMigu = false;
    }

    saveVolume(v) { localStorage.setItem('musicPlayer_volume', v.toString()); }
    loadVolume() { return parseFloat(localStorage.getItem('musicPlayer_volume') || '0.5'); }
    savePlaybackSpeed(s) { localStorage.setItem('musicPlayer_playbackSpeed', s.toString()); }
    loadPlaybackSpeed() { return parseFloat(localStorage.getItem('musicPlayer_playbackSpeed') || '1.0'); }
    savePlayMode(m) { localStorage.setItem('musicPlayer_playMode', m.toString()); }
    loadPlayMode() { return parseInt(localStorage.getItem('musicPlayer_playMode') || '0'); }
    savePlayState(s) { localStorage.setItem('musicPlayer_playState', s.toString()); }
    loadPlayState() { return localStorage.getItem('musicPlayer_playState') === 'true'; }
    escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
}

window.MusicPlayer = MusicPlayer;