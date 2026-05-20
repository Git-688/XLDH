/**
 * 网站投稿模块（精简版：仅投稿表单，无我的投稿列表）
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
        this.isSafe = false;
        this.canSubmit = false;
        this.alreadySubmitted = false;
        this.resultLabel = '';
        this.riskLevel = '';
        this.editingRejectedId = null;

        this.init();
    }

    init() {
        this.bindEvents();
        if (this.descInput) this.descInput.maxLength = 200;
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

        this.fetchInfoBtn.addEventListener('click', () => this.fetchSiteInfoAndCheck());

        this.urlInput.addEventListener('input', () => {
            this.isSafe = false;
            this.canSubmit = false;
            this.alreadySubmitted = false;
            this.resultLabel = '';
            this.riskLevel = '';
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

    async fetchSiteInfoAndCheck() {
        const url = this.urlInput.value.trim();
        if (!url || !this.isValidUrl(url)) {
            window.toast.show('请输入正确的网址', 'warning');
            return;
        }

        if (this.waitingHint) this.waitingHint.style.display = 'inline';
        this.fetchInfoBtn.disabled = true;
        this.fetchInfoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 检测中...';
        this.urlCheckResult.style.display = 'block';
        this.urlCheckResult.className = 'url-check-result checking';
        this.urlCheckResult.textContent = '正在检测网站安全性和获取信息...';

        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            const res = await fetch(`${this.apiBase}/check-url?url=${encodeURIComponent(safeUrl)}`);
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

            this.isSafe = data.safe;
            this.canSubmit = data.canSubmit;
            this.alreadySubmitted = data.alreadySubmitted;
            this.resultLabel = data.label || '';
            this.riskLevel = data.riskLevel || '';

            if (data.alreadySubmitted) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该网站已收录，无法提交';
            } else if (!data.canSubmit) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该链接存在安全风险，禁止提交';
            } else {
                this.urlCheckResult.className = data.safe ? 'url-check-result safe' : 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || (data.safe ? '安全，可提交' : '存在安全风险，仍可提交');
            }
            this.updateSubmitButton();
        } catch (e) {
            console.error(e);
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.textContent = '检测失败，请手动填写';
            window.toast.show('检测失败，请手动填写信息', 'warning');
            this.canSubmit = true;
            this.isSafe = true;
            this.alreadySubmitted = false;
            this.updateSubmitButton();
        } finally {
            if (this.waitingHint) this.waitingHint.style.display = 'none';
            this.fetchInfoBtn.disabled = false;
            this.fetchInfoBtn.innerHTML = '<i class="fas fa-magic"></i> 检测并获取信息';
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
            window.toast.show('该网站已收录，无法再次提交', 'error');
            return;
        }
        if (!this.canSubmit) {
            window.toast.show('该链接未通过安全检测，无法提交', 'error');
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
                icon: this.iconInput.value.trim(),
                vt_result: this.resultLabel
            };
            if (this.editingRejectedId) {
                payload.submissionId = this.editingRejectedId;
            }
            const res = await fetch(`${this.apiBase}/submit-site`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Id': deviceId
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                window.toast.show('投稿已提交！通常1-2个工作日内审核，请耐心等待。', 'success');
                this.modal.classList.remove('active');
                this.resetForm();
                this.editingRejectedId = null;
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
        this.isSafe = false;
        this.alreadySubmitted = false;
        this.resultLabel = '';
        this.riskLevel = '';
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