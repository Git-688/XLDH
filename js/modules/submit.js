/**
 * 网站投稿模块（最终版）
 * 功能：投稿表单、自动获取网站信息、安全检测提示、累计投稿数显示（使用 Worker 返回的 totalSubmits）
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
        this.waitingHint = this.modal.querySelector('.submit-safe-hint');

        this.apiBase = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://api.xjdh688.ccwu.cc';
        this.canSubmit = false;
        this.alreadySubmitted = false;
        this.editingRejectedId = null;
        this.statsBadge = null;      // 累计投稿徽章元素

        this.init();
    }

    init() {
        this.bindEvents();
        if (this.descInput) this.descInput.maxLength = 200;
        // 监听模态框打开，确保徽章存在并刷新计数（使用本地存储）
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    if (this.modal.classList.contains('active')) {
                        this.ensureStatsBadge();
                        this.updateLocalStatsDisplay();
                    }
                }
            });
        });
        observer.observe(this.modal, { attributes: true });
    }

    // 确保标题右侧有累计数徽章
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
            badge.textContent = '已投稿 0 次';
            h3.appendChild(badge);
        }
        this.statsBadge = badge;
    }

    // 更新本地显示的累计投稿数
    updateLocalStatsDisplay() {
        const total = this.getLocalSubmissionCount();
        if (this.statsBadge) {
            this.statsBadge.textContent = `已投稿 ${total} 次`;
        }
    }

    getLocalSubmissionCount() {
        const count = parseInt(localStorage.getItem('submission_total') || '0', 10);
        return isNaN(count) ? 0 : count;
    }

    incrementLocalSubmissionCount() {
        let count = this.getLocalSubmissionCount();
        count++;
        localStorage.setItem('submission_total', count);
        this.updateLocalStatsDisplay();
        return count;
    }

    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }

    bindEvents() {
        const closeBtn = this.modal.querySelector('.feedback-modal-close');
        const cancelBtn = this.modal.querySelector('.submit-cancel-btn');
        const closeModal = () => {
            this.modal.classList.remove('active');
            this.resetForm();
            this.editingRejectedId = null;
        };
        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        this.modal.addEventListener('click', e => {
            if (e.target === this.modal) closeModal();
        });

        this.fetchInfoBtn.addEventListener('click', () => this.fetchSiteInfo());

        this.urlInput.addEventListener('input', () => {
            this.canSubmit = false;
            this.alreadySubmitted = false;
            this.urlCheckResult.style.display = 'none';
            this.urlCheckResult.className = 'url-check-result';
            this.updateSubmitButton();
        });
        this.iconInput.addEventListener('input', () => this.updateIconPreview());
        this.titleInput.addEventListener('input', () => this.updateSubmitButton());
        this.urlInput.addEventListener('input', () => this.updateSubmitButton());
        this.descInput.addEventListener('input', () => {
            this.autoResizeDesc();
            this.updateSubmitButton();
        });

        this.form.addEventListener('submit', e => this.handleSubmit(e));
    }

    autoResizeDesc() {
        this.descInput.style.height = 'auto';
        this.descInput.style.height = this.descInput.scrollHeight + 'px';
    }

    async fetchSiteInfo() {
        const url = this.urlInput.value.trim();
        if (!url || !this.isValidUrl(url)) {
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
            const res = await fetch(`${this.apiBase}/fetch-site-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: safeUrl })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.title) this.titleInput.value = data.title;
            if (data.icon) {
                this.iconInput.value = data.icon;
                this.updateIconPreview();
            }
            if (data.description) {
                this.descInput.value = data.description.slice(0, 200);
                this.autoResizeDesc();
            }

            this.canSubmit = data.canSubmit !== false;
            this.alreadySubmitted = data.alreadySubmitted === true;

            if (data.alreadySubmitted) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该网站已收录或已在审核中，无法提交';
            } else if (!data.canSubmit) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该链接存在安全风险，禁止提交';
            } else {
                this.urlCheckResult.className = data.safe ? 'url-check-result safe' : 'url-check-result checking';
                this.urlCheckResult.textContent = data.label || (data.safe ? '安全，可提交' : '可疑，可提交');
            }
            this.updateSubmitButton();
        } catch (e) {
            console.error('获取信息失败:', e);
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.textContent = '获取信息失败，请手动填写';
            window.toast.show('自动获取网站信息失败，请手动填写标题和图标', 'warning');
            this.canSubmit = true;
            this.alreadySubmitted = false;
            this.updateSubmitButton();
        } finally {
            if (this.waitingHint) this.waitingHint.style.display = 'none';
            this.fetchInfoBtn.disabled = false;
            this.fetchInfoBtn.innerHTML = '<i class="fas fa-magic"></i> 获取信息';
        }
    }

    updateSubmitButton() {
        const title = this.titleInput.value.trim();
        const url = this.urlInput.value.trim();
        const isFormFilled = title && url && this.isValidUrl(url);
        const canSubmit = isFormFilled && this.canSubmit && !this.alreadySubmitted;
        this.submitSaveBtn.disabled = !canSubmit;
    }

    async handleSubmit(e) {
        e.preventDefault();
        const title = this.titleInput.value.trim();
        const url = this.urlInput.value.trim();
        if (!title || !url) {
            window.toast.show('请填写网站名称和链接', 'warning');
            return;
        }
        if (!this.isValidUrl(url)) {
            window.toast.show('请输入正确的网址', 'warning');
            return;
        }
        if (this.alreadySubmitted) {
            window.toast.show('该网站已收录或已在审核中，无法再次提交', 'error');
            return;
        }
        if (!this.canSubmit) {
            window.toast.show('该链接未通过基础检测，无法提交', 'error');
            return;
        }

        this.submitSaveBtn.disabled = true;
        this.submitSaveBtn.textContent = '提交中...';
        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            const deviceId = this.getDeviceId();
            const payload = {
                title,
                url: safeUrl,
                description: this.descInput.value.trim(),
                icon: this.iconInput.value.trim()
            };
            const res = await fetch(`${this.apiBase}/submit-site`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Id': deviceId
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                window.toast.show('投稿已提交！安全检测将在后台进行，通过后自动收录', 'success');
                // 投稿成功，增加本地计数
                this.incrementLocalSubmissionCount();
                this.modal.classList.remove('active');
                this.resetForm();
            } else {
                const err = await res.json().catch(() => ({}));
                window.toast.show(err.error || '提交失败', 'error');
            }
        } catch (err) {
            console.error(err);
            window.toast.show('网络错误，请稍后重试', 'error');
        } finally {
            this.submitSaveBtn.disabled = false;
            this.submitSaveBtn.textContent = '提交投稿';
        }
    }

    isValidUrl(url) {
        try {
            const testUrl = url.startsWith('http') ? url : `https://${url}`;
            return ['http:', 'https:'].includes(new URL(testUrl).protocol);
        } catch {
            return false;
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
        this.canSubmit = false;
        this.alreadySubmitted = false;
        this.urlCheckResult.style.display = 'none';
        this.urlCheckResult.className = 'url-check-result';
        this.iconPreview.style.display = 'none';
        this.submitSaveBtn.disabled = true;
        this.descInput.style.height = 'auto';
        if (this.waitingHint) this.waitingHint.style.display = 'none';
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.submitModule = new SubmitModule();
});