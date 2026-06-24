class Navbar {
    constructor() {
        if (window.Starlink && window.Starlink.navbar) return window.Starlink.navbar;
        this.announcements = [];
        this.init();
        if (window.Starlink) window.Starlink.navbar = this;
        window.navbar = this;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    init() {
        try {
            this.bindEvents();
            setTimeout(() => this.handleScroll(), 100);
        } catch (e) {}
    }

    bindEvents() {
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const searchModule = window.Starlink?.search;
                if (searchModule && typeof searchModule.toggle === 'function') {
                    this.handleFeatureToggle('search', () => searchModule.toggle());
                } else if (window.newSearchModule && typeof window.newSearchModule.toggle === 'function') {
                    this.handleFeatureToggle('search', () => window.newSearchModule.toggle());
                }
            });
        }

        const musicBtn = document.getElementById('musicBtn');
        if (musicBtn) {
            musicBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleFeatureToggle('music', () => this.toggleMusicPlayer());
            });
        }

        const annBtn = document.getElementById('announcementBtn');
        if (annBtn) {
            annBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const announcementModule = window.Starlink?.announcement;
                if (announcementModule && typeof announcementModule.toggleModal === 'function') {
                    this.handleFeatureToggle('announcement', () => announcementModule.toggleModal());
                } else if (window.announcementModule && typeof window.announcementModule.toggleModal === 'function') {
                    this.handleFeatureToggle('announcement', () => window.announcementModule.toggleModal());
                }
            });
        }

        const weatherBtn = document.getElementById('weatherBtn');
        if (weatherBtn) {
            weatherBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['weather']).then(() => {
                    const weatherModule = window.Starlink?.weather;
                    if (weatherModule && typeof weatherModule.showModal === 'function') {
                        weatherModule.showModal();
                    } else if (window.app?.modules?.weather?.showModal) {
                        window.app.modules.weather.showModal();
                    }
                });
            });
        }

        const submitBtn = document.getElementById('floatingSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAllModalsExcept(['submit']).then(() => {
                    const submitModule = window.Starlink?.submit;
                    if (submitModule && typeof submitModule.show === 'function') {
                        submitModule.show();
                    } else {
                        document.getElementById('submitModal')?.classList.add('active');
                    }
                });
            });
        }

        document.addEventListener('click', (e) => {
            const mp = document.getElementById('musicPlayer');
            const mb = document.getElementById('musicBtn');
            if (mp && mp.classList.contains('show') && !mp.contains(e.target) && !mb.contains(e.target)) {
                this.hideMusicPlayer();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModalsExcept([]);
        });

        window.addEventListener('scroll', this.handleScroll.bind(this));

        const btt = document.getElementById('backToTop');
        if (btt) btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    async closeAllModalsExcept(keep = []) {
        const closePromises = [];
        const activeModals = window.Starlink?.app?.activeModals || [];
        for (const modal of activeModals) {
            let shouldClose = true;
            if (keep.includes('music') && modal === window.Starlink?.musicPlayer) shouldClose = false;
            if (keep.includes('search') && modal === window.Starlink?.search) shouldClose = false;
            if (keep.includes('announcement') && modal === window.Starlink?.announcement) shouldClose = false;
            if (keep.includes('sidebar') && modal === window.Starlink?.sidebar) shouldClose = false;
            if (keep.includes('weather') && modal === window.Starlink?.weather) shouldClose = false;
            if (keep.includes('about') && modal === window.Starlink?.about) shouldClose = false;
            if (keep.includes('notebook') && modal === window.Starlink?.app?.notebookModalHideRef) shouldClose = false;
            if (keep.includes('submit') && modal === window.Starlink?.submit) shouldClose = false;
            if (shouldClose && modal && typeof modal.hide === 'function') {
                const promise = new Promise((resolve) => {
                    modal.hide();
                    const interval = setInterval(() => {
                        if (!modal.isVisible) { clearInterval(interval); resolve(); }
                    }, 50);
                    setTimeout(() => { clearInterval(interval); resolve(); }, 500);
                });
                closePromises.push(promise);
            }
        }
        if (!keep.includes('music')) {
            const musicPlayer = document.getElementById('musicPlayer');
            if (musicPlayer && musicPlayer.classList.contains('show') && this.hideMusicPlayer) {
                this.hideMusicPlayer();
            }
        }
        if (!keep.includes('search') && window.Starlink?.search?.isOpen && window.Starlink.search.hide) {
            window.Starlink.search.hide();
        } else if (!keep.includes('search') && window.newSearchModule?.isOpen && window.newSearchModule.hide) {
            window.newSearchModule.hide();
        }
        if (!keep.includes('sidebar') && window.Starlink?.sidebar?.isVisible?.()) {
            window.Starlink.sidebar.hide();
        } else if (!keep.includes('sidebar') && window.sidebar?.isVisible?.()) {
            window.sidebar.hide();
        }
        if (!keep.includes('announcement') && window.Starlink?.announcement?.isVisible && window.Starlink.announcement.hide) {
            window.Starlink.announcement.hide();
        } else if (!keep.includes('announcement') && window.announcementModule?.isVisible && window.announcementModule.hide) {
            window.announcementModule.hide();
        }
        if (!keep.includes('weather') && window.Starlink?.weather?.isShowing && window.Starlink.weather.hide) {
            window.Starlink.weather.hide();
        } else if (!keep.includes('weather') && window.app?.modules?.weather?.isShowing && window.app.modules.weather.hide) {
            window.app.modules.weather.hide();
        }
        if (!keep.includes('about') && window.Starlink?.about?.isShowing && window.Starlink.about.hide) {
            window.Starlink.about.hide();
        } else if (!keep.includes('about') && window.aboutModule?.isShowing && window.aboutModule.hide) {
            window.aboutModule.hide();
        }
        if (!keep.includes('notebook') && window.Starlink?.app?.hideNotebookModal) {
            window.Starlink.app.hideNotebookModal();
        }
        if (!keep.includes('submit') && window.Starlink?.submit?.isVisible && window.Starlink.submit.hide) {
            window.Starlink.submit.hide();
        } else if (!keep.includes('submit') && window.submitModule?.isVisible && window.submitModule.hide) {
            window.submitModule.hide();
        }
        return Promise.all(closePromises);
    }

    async handleFeatureToggle(featureKey, toggleFn) {
        await this.closeAllModalsExcept([featureKey]);
        toggleFn();
    }

    toggleMusicPlayer() {
        const mp = document.getElementById('musicPlayer');
        const mb = document.getElementById('musicBtn');
        if (!mp || !mb || mp.classList.contains('animating')) return;
        mp.classList.contains('show') ? this.hideMusicPlayer() : this.showMusicPlayer();
    }

    showMusicPlayer() {
        const mp = document.getElementById('musicPlayer');
        const mb = document.getElementById('musicBtn');
        if (!mp || !mb) return;
        mp.classList.add('animating');
        mb.classList.add('loading');
        mp.style.display = 'block';
        mp.style.zIndex = '10000';
        setTimeout(() => {
            mp.classList.add('show');
            mb.classList.add('active');
            mb.classList.remove('loading');
            setTimeout(() => mp.classList.remove('animating'), 600);
        }, 10);
    }

    hideMusicPlayer() {
        const mp = document.getElementById('musicPlayer');
        const mb = document.getElementById('musicBtn');
        if (!mp || !mb) return;
        mp.classList.add('animating', 'hiding');
        mb.classList.remove('active');
        mp.classList.remove('show');
        setTimeout(() => {
            mp.style.display = 'none';
            mp.classList.remove('animating', 'hiding');
        }, 600);
    }

    handleScroll() {
        const navbar = document.getElementById('navbar');
        const btt = document.getElementById('backToTop');
        if (window.scrollY > 100) navbar?.classList.add('scrolled');
        else navbar?.classList.remove('scrolled');
        if (btt) btt.classList.toggle('visible', window.scrollY > 300);
    }

    destroy() {
        window.removeEventListener('scroll', this.handleScroll);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.Starlink) window.Starlink = {};
        if (!window.Starlink.navbar) window.Starlink.navbar = new Navbar();
    });
} else {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.navbar) window.Starlink.navbar = new Navbar();
}