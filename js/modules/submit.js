/**
 * 网站投稿模块（同步安全检测版 + 全局投稿总数缓存 + 实时更新）
 */
class SubmitModule {
    constructor() {
        this.modal = document.getElementById('submitModal');
        this.form = document.getElementById('submitSiteForm');
        this.urlInput = document.getElementById('submitUrl');
        this.titleInput = document.getElementById('submitTitle');
        this.iconInput = document.getElementById('submitIcon');
        this.descInput = document.getElementById('submitDesc');
        this.iconPreview = document.getElementById('submitIconPreview');
        this.fetchInfoBtn = document.getElementById('fetchSiteInfoBtn');
        this.submitSaveBtn = document.getElementById('submitSaveBtn');
        this.urlCheckResult = document.getElementById('urlCheckResult');
        this.waitingHint = this.modal ? this.modal.querySelector('.submit-safe-hint') : null;

        this.apiBase = Utils.getApiBase();
        this.dailyLimit = 6;
        this.statsBadge = null;
        this.submitting = false;

        // 缓存全局总数
        this.cachedTotalCount = null;
        this.cachedTotalCountTime = 0;
        this.cacheTTL = 60000; // 60秒

        // 今日已投稿次数（从后端获取）
        this.todayCount = 0;

        this.init();
    }

    escapeHtml(str) {
        return Utils.escapeHtml(str);
    }

    init() {
        if (!this.modal) {
            console.error('投稿模态框不存在');
            return;
        }
        this.bindEvents();
        if (this.descInput) this.descInput.maxLength = 200;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && this.modal.classList.contains('active')) {
                    this.ensureStatsBadge();
                    this.loadGlobalTotalCount();
                    this.loadTodayCount();
                }
            });
        });
        observer.observe(this.modal, { attributes: true });
    }

    ensureStatsBadge() {
        const header = this.modal.querySelector('.feedback-modal-header');
        if (!header) return;
        const h3 = header.querySelector('h3');
        if (!h3) return;
        let badge = header.querySelector('.submission-stats-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'submission-stats-badge';
            badge.style.cssText = 'margin-left: 12px; font-size: 12px; background: rgba(0,0,0,0.1); padding: 2px 8px; border-radius: 20px; font-weight: normal;';
            badge.textContent = '加载中...';
            h3.appendChild(badge);
        }
        this.statsBadge = badge;
    }

    async loadGlobalTotalCount() {
        if (!this.statsBadge) return;

        const now = Date.now();
        if (this.cachedTotalCount !== null && (now - this.cachedTotalCountTime) < this.cacheTTL) {
            this.statsBadge.textContent = `总投稿 ${this.cachedTotalCount} 次`;
            return;
        }

        try {
            const response = await Utils.safeFetch(`${this.apiBase}/global-submission-count`, { timeout: 5000 });
            const data = await response.json();
            const total = data.total || 0;
            this.cachedTotalCount = total;
            this.cachedTotalCountTime = now;
            this.statsBadge.textContent = `总投稿 ${total} 次`;
        } catch (error) {
            Utils.handleApiError(error, '获取投稿总数失败', false);
            this.statsBadge.textContent = '总投稿 ? 次';
        }
    }

    // 手动更新全局总数（投稿成功后调用）
    updateGlobalTotalCountIncrement() {
        if (this.cachedTotalCount !== null) {
            this.cachedTotalCount++;
            this.cachedTotalCountTime = Date.now();
            this.statsBadge.textContent = `总投稿 ${this.cachedTotalCount} 次`;
        } else {
            // 如果缓存为空，则重新获取
            this.loadGlobalTotalCount();
        }
    }

    async loadTodayCount() {
        try {
            const deviceId = this.getDeviceId();
            const response = await Utils.safeFetch(`${this.apiBase}/user/today-submission-count`, {
                headers: { 'X-Device-Id': deviceId }
            });
            const data = await response.json();
            this.todayCount = data.count || 0;
            this.updateRemainingCount();
        } catch (error) {
            Utils.handleApiError(error, '获取今日投稿次数失败', false);
            this.todayCount = 0;
            this.updateRemainingCount();
        }
    }

    updateRemainingCount() {
        const remaining = Math.max(0, this.dailyLimit - this.todayCount);
        const remainingSpan = document.querySelector('.submit-remaining-count');
        if (remainingSpan) {
            remainingSpan.textContent = `今日剩余 ${remaining} 次`;
            if (remaining <= 0) {
                remainingSpan.style.color = '#ef4444';
            } else {
                remainingSpan.style.color = '';
            }
        }
    }

    getDeviceId() {
        return Utils.getDeviceId();
    }

    bindEvents() {
        const closeBtn = this.modal.querySelector('.feedback-modal-close');
        const cancelBtn = this.modal.querySelector('.submit-cancel-btn');
        const closeModal = () => {
            this.modal.classList.remove('active');
            this.resetForm();
        };
        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) closeModal();
        });

        this.fetchInfoBtn.addEventListener('click', () => this.fetchSiteInfo());

        this.urlInput.addEventListener('input', () => {
            this.urlCheckResult.style.display = 'none';
            this.updateSubmitButton();
        });
        this.iconInput.addEventListener('input', () => this.updateIconPreview());
        this.titleInput.addEventListener('input', () => this.updateSubmitButton());
        this.descInput.addEventListener('input', () => {
            this.autoResizeDesc();
            this.updateSubmitButton();
        });

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    autoResizeDesc() {
        if (!this.descInput) return;
        this.descInput.style.height = 'auto';
        this.descInput.style.height = this.descInput.scrollHeight + 'px';
    }

    async fetchSiteInfo() {
        const url = this.urlInput.value.trim();
        if (!url || !Utils.isValidUrl(url)) {
            window.toast.show('请输入正确的网址', 'warning');
            return;
        }

        if (this.waitingHint) this.waitingHint.style.display = 'inline';
        this.fetchInfoBtn.disabled = true;
        this.fetchInfoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 获取中...';
        this.urlCheckResult.style.display = 'block';
        this.urlCheckResult.className = 'url-check-result checking';
        this.urlCheckResult.textContent = '正在获取网站信息...';

        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            const response = await Utils.safeFetch(`${this.apiBase}/fetch-site-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: safeUrl })
            });
            const data = await response.json();

            if (data.title) this.titleInput.value = data.title;
            if (data.icon) {
                this.iconInput.value = data.icon;
                this.updateIconPreview();
            }
            if (data.description) {
                this.descInput.value = data.description.slice(0, 200);
                this.autoResizeDesc();
            }

            if (data.alreadySubmitted) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该网站已收录或已在审核中，无法提交';
                this.updateSubmitButton(false);
            } else if (data.canSubmit === false) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该链接存在安全风险，禁止提交';
                this.updateSubmitButton(false);
            } else {
                this.urlCheckResult.className = 'url-check-result safe';
                this.urlCheckResult.textContent = data.label || '信息获取成功，可提交';
                this.updateSubmitButton(true);
            }
        } catch (error) {
            Utils.handleApiError(error, '获取网站信息失败', true);
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.textContent = '获取信息失败，请手动填写';
            this.updateSubmitButton(true);
        } finally {
            if (this.waitingHint) this.waitingHint.style.display = 'none';
            this.fetchInfoBtn.disabled = false;
            this.fetchInfoBtn.innerHTML = '<i class="fas fa-magic"></i> 获取信息';
        }
    }

    updateSubmitButton(enable = null) {
        if (enable === null) {
            const title = this.titleInput.value.trim();
            const url = this.urlInput.value.trim();
            enable = !!(title && url && Utils.isValidUrl(url));
        }
        const remaining = this.dailyLimit - this.todayCount;
        if (remaining <= 0) enable = false;
        this.submitSaveBtn.disabled = !enable || this.submitting;
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.submitting) return;

        const remaining = this.dailyLimit - this.todayCount;
        if (remaining <= 0) {
            window.toast.show(`今日投稿已达上限（${this.dailyLimit}次），请明天再试`, 'warning');
            return;
        }

        let title = this.titleInput.value.trim();
        let url = this.urlInput.value.trim();
        if (!title || !url) {
            window.toast.show('请填写网站名称和链接', 'warning');
            return;
        }
        if (!Utils.isValidUrl(url)) {
            window.toast.show('请输入正确的网址', 'warning');
            return;
        }

        const safeUrl = url.startsWith('http') ? url : `https://${url}`;
        const deviceId = this.getDeviceId();
        const payload = {
            title: title,
            url: safeUrl,
            description: this.descInput.value.trim(),
            icon: this.iconInput.value.trim()
        };

        this.submitting = true;
        this.submitSaveBtn.disabled = true;
        this.submitSaveBtn.textContent = '安全检测中...';
        if (this.waitingHint) this.waitingHint.style.display = 'inline';

        try {
            const response = await Utils.safeFetch(`${this.apiBase}/submit-site`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Id': deviceId
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok) {
                window.toast.show('投稿成功！已通过安全检测，等待管理员审核', 'success');
                // 更新本地今日计数
                this.todayCount++;
                this.updateRemainingCount();
                // 更新全局总数（缓存+显示）—— 即使模态框保持打开，也会立即刷新
                this.updateGlobalTotalCountIncrement();
                this.modal.classList.remove('active');
                this.resetForm();
            } else {
                let errorMsg = data.error || '提交失败';
                if (data.details && data.details.label) {
                    errorMsg = data.details.label;
                }
                window.toast.show(errorMsg, 'error');
                if (this.urlCheckResult && data.details && data.details.label) {
                    this.urlCheckResult.style.display = 'block';
                    this.urlCheckResult.className = 'url-check-result unsafe';
                    this.urlCheckResult.textContent = data.details.label;
                }
                this.updateSubmitButton(true);
            }
        } catch (error) {
            Utils.handleApiError(error, '提交失败，请重试', true);
            this.updateSubmitButton(true);
        } finally {
            this.submitting = false;
            this.submitSaveBtn.disabled = false;
            this.submitSaveBtn.textContent = '提交投稿';
            if (this.waitingHint) this.waitingHint.style.display = 'none';
        }
    }

    updateIconPreview() {
        const iconUrl = this.iconInput.value.trim();
        if (iconUrl && (iconUrl.startsWith('http') || iconUrl.startsWith('https'))) {
            this.iconPreview.src = iconUrl;
            this.iconPreview.style.display = 'block';
        } else {
            this.iconPreview.style.display = 'none';
        }
    }

    resetForm() {
        this.form.reset();
        this.urlCheckResult.style.display = 'none';
        this.urlCheckResult.className = 'url-check-result';
        this.iconPreview.style.display = 'none';
        this.submitSaveBtn.disabled = true;
        if (this.descInput) this.descInput.style.height = 'auto';
        if (this.waitingHint) this.waitingHint.style.display = 'none';
        this.submitting = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.submitModule) {
        window.submitModule = new SubmitModule();
    }
});