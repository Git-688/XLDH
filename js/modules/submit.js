/* submit.js - 完整修改版（符合4点需求 + 修复获取信息时清空字段） */
class SubmitModule {
    constructor() {
        if (window.Starlink && window.Starlink.submit) return window.Starlink.submit;
        
        this.modal = document.getElementById('submitModal');
        this.form = document.getElementById('submitSiteForm');
        this.urlInput = document.getElementById('submitUrl');
        this.titleInput = document.getElementById('submitTitle');
        this.iconInput = document.getElementById('submitIcon');
        this.descInput = document.getElementById('submitDesc');
        this.contactInput = document.getElementById('submitContact');
        this.iconPreview = document.getElementById('submitIconPreview');
        this.fetchInfoBtn = document.getElementById('fetchSiteInfoBtn');
        this.submitSaveBtn = document.getElementById('submitSaveBtn');
        this.urlCheckResult = document.getElementById('urlCheckResult');

        this.apiBase = Utils.getApiBase();
        this.statsBadge = null;
        this.submitting = false;
        this.cachedTotalCount = null;
        this.cachedTotalCountTime = 0;
        this.cacheTTL = 60000;

        this.securityPassed = false;
        this.lastSecurityDetail = null;
        this.currentTaskId = null;
        this.pollingTimer = null;
        this.isVisible = false;

        // 标志：是否已成功获取过信息（用于避免重复自动获取）
        this.hasFetchedInfo = false;

        this.DRAFT_KEY = 'submit_draft';
        this.CONTACT_KEY = 'submit_contact'; // 独立保存联系方式
        this.draftSaveTimer = null;
        this.isRestoringDraft = false;

        this.init();
        
        if (window.Starlink) window.Starlink.submit = this;
        window.submitModule = this;
    }

    escapeHtml(str) {
        return Utils.escapeHtml(str);
    }

    getDeviceId() {
        if (typeof Utils.getDeviceId === 'function') {
            return Utils.getDeviceId();
        }
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }

    saveDraft() {
        const draft = {
            url: this.urlInput?.value || '',
            title: this.titleInput?.value || '',
            icon: this.iconInput?.value || '',
            description: this.descInput?.value || '',
            contact: this.contactInput?.value || '',
            timestamp: Date.now()
        };
        try {
            localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
        } catch (e) {}
    }

    loadDraft() {
        try {
            const raw = localStorage.getItem(this.DRAFT_KEY);
            if (!raw) return false;
            const draft = JSON.parse(raw);
            if (Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(this.DRAFT_KEY);
                return false;
            }
            this.isRestoringDraft = true;
            if (draft.url && this.urlInput) this.urlInput.value = draft.url;
            if (draft.title && this.titleInput) this.titleInput.value = draft.title;
            if (draft.icon && this.iconInput) {
                this.iconInput.value = draft.icon;
                this.updateIconPreview();
            }
            if (draft.description && this.descInput) {
                this.descInput.value = draft.description;
                this.autoResizeDesc();
            }
            if (draft.contact && this.contactInput) this.contactInput.value = draft.contact;
            // 单独保存的联系方式也同步
            if (draft.contact) localStorage.setItem(this.CONTACT_KEY, draft.contact);
            this.isRestoringDraft = false;
            // 只有在未获取过信息时才自动获取
            if (draft.url && this.isVisible && !this.hasFetchedInfo) {
                setTimeout(() => this.fetchSiteInfo(), 500);
            }
            this.updateSubmitButton();
            return true;
        } catch (e) {
            return false;
        }
    }

    clearDraft() {
        try {
            localStorage.removeItem(this.DRAFT_KEY);
            localStorage.removeItem(this.CONTACT_KEY);
        } catch (e) {}
    }

    scheduleDraftSave() {
        if (this.isRestoringDraft) return;
        clearTimeout(this.draftSaveTimer);
        this.draftSaveTimer = setTimeout(() => {
            this.saveDraft();
        }, 500);
    }

    init() {
        if (!this.modal) {
            console.error('投稿模态框不存在');
            return;
        }
        this.bindEvents();
        if (this.descInput) this.descInput.maxLength = 200;

        // 尝试恢复独立的联系方式
        const savedContact = localStorage.getItem(this.CONTACT_KEY);
        if (savedContact && this.contactInput) {
            this.contactInput.value = savedContact;
        }

        this.loadDraft();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && this.modal.classList.contains('active')) {
                    this.isVisible = true;
                    this.ensureStatsBadge();
                    this.loadGlobalTotalCount();
                    if (!this.loadDraft()) {
                        this.resetSecurityCheck();
                        // 如果有独立的联系方式，恢复
                        const savedContact = localStorage.getItem(this.CONTACT_KEY);
                        if (savedContact && this.contactInput) {
                            this.contactInput.value = savedContact;
                        }
                    }
                    this.updateSubmitButton();
                } else if (mutation.attributeName === 'class' && !this.modal.classList.contains('active')) {
                    this.isVisible = false;
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
            if (window.errorHandler) {
                window.errorHandler.report(error, 'submit.loadGlobalTotalCount');
            }
            Utils.handleApiError(error, '获取投稿总数失败', false);
            this.statsBadge.textContent = '总投稿 ? 次';
        }
    }

    updateGlobalTotalCountIncrement() {
        if (this.cachedTotalCount !== null) {
            this.cachedTotalCount++;
            this.cachedTotalCountTime = Date.now();
            this.statsBadge.textContent = `总投稿 ${this.cachedTotalCount} 次`;
        } else {
            this.loadGlobalTotalCount();
        }
    }

    bindEvents() {
        const closeBtn = this.modal.querySelector('.feedback-modal-close');
        const cancelBtn = this.modal.querySelector('.submit-cancel-btn');
        const closeModal = () => {
            this.saveDraft();
            this.hide();
        };
        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.saveDraft();
                closeModal();
            }
        });

        this.fetchInfoBtn.addEventListener('click', () => this.fetchSiteInfo());

        this.urlInput.addEventListener('input', () => {
            this.resetSecurityCheck();
            this.hasFetchedInfo = false; // 修改URL后标记为未获取
            this.updateSubmitButton();
            this.scheduleDraftSave();
        });
        this.iconInput.addEventListener('input', () => {
            this.updateIconPreview();
            this.scheduleDraftSave();
        });
        this.titleInput.addEventListener('input', () => {
            this.updateSubmitButton();
            this.scheduleDraftSave();
        });
        this.descInput.addEventListener('input', () => {
            this.autoResizeDesc();
            this.updateSubmitButton();
            this.scheduleDraftSave();
        });
        this.contactInput?.addEventListener('input', () => {
            this.updateSubmitButton();
            this.scheduleDraftSave();
            // 单独保存联系方式
            localStorage.setItem(this.CONTACT_KEY, this.contactInput.value);
        });

        window.addEventListener('beforeunload', () => {
            if (this.isVisible || this.hasFormData()) {
                this.saveDraft();
            }
        });

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    hasFormData() {
        const fields = [this.urlInput, this.titleInput, this.iconInput, this.descInput, this.contactInput];
        return fields.some(el => el && el.value && el.value.trim() !== '');
    }

    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    }

    resetSecurityCheck() {
        this.stopPolling();
        this.securityPassed = false;
        this.lastSecurityDetail = null;
        this.currentTaskId = null;
        if (this.urlCheckResult) {
            this.urlCheckResult.style.display = 'none';
            this.urlCheckResult.className = 'url-check-result';
            this.urlCheckResult.textContent = '';
        }
    }

    autoResizeDesc() {
        if (!this.descInput) return;
        this.descInput.style.height = 'auto';
        this.descInput.style.height = this.descInput.scrollHeight + 'px';
    }

    displaySecurityReport(data) {
        let html = '';
        if (data.alreadySubmitted) {
            html = `<div class="security-report unsafe">⚠️ ${this.escapeHtml(data.label || '该网站已收录或已在审核中，无法提交')}</div>`;
            this.urlCheckResult.innerHTML = html;
            this.urlCheckResult.style.display = 'block';
            this.urlCheckResult.className = 'url-check-result unsafe';
            return;
        }
        if (data.canSubmit === false) {
            html = `<div class="security-report unsafe">❌ 安全检测不通过<br>${this.escapeHtml(data.label || '该链接存在安全风险，禁止提交')}</div>`;
            if (data.details && data.details.riskLevel) {
                html += `<div class="security-detail">风险等级：<span class="risk-high">高风险</span></div>`;
            }
            this.urlCheckResult.innerHTML = html;
            this.urlCheckResult.style.display = 'block';
            this.urlCheckResult.className = 'url-check-result unsafe';
            return;
        }
        let detailHtml = '';
        if (data.label) detailHtml += `<div class="security-summary">🔒 ${this.escapeHtml(data.label)}</div>`;
        if (data.riskLevel) {
            const riskText = data.riskLevel === 'low' ? '低风险' : (data.riskLevel === 'medium' ? '中风险' : '未知');
            detailHtml += `<div class="security-detail">风险等级：<span class="risk-${data.riskLevel}">${riskText}</span></div>`;
        }
        if (data.details) {
            if (data.details.vt && data.details.vt.stats) {
                detailHtml += `<div class="security-detail">VirusTotal: 恶意 ${data.details.vt.stats.malicious || 0} / 可疑 ${data.details.vt.stats.suspicious || 0}</div>`;
            }
            if (data.details.safebrowsing && data.details.safebrowsing.available) {
                detailHtml += `<div class="security-detail">Google SafeBrowsing: 已检测</div>`;
            }
        }
        html = `<div class="security-report safe">✅ 安全检测通过</div>${detailHtml}<div class="security-hint">可安全提交</div>`;
        this.urlCheckResult.innerHTML = html;
        this.urlCheckResult.style.display = 'block';
        this.urlCheckResult.className = 'url-check-result safe';
    }

    // ===== 修改：获取信息时不清空已有字段，只填充空字段 =====
    async fetchSiteInfo() {
        const url = this.urlInput.value.trim();
        if (!url || !Utils.isValidUrl(url)) {
            window.toast.show('请输入正确的网址', 'warning');
            return;
        }

        // 重置安全检测状态，但不清除已有字段
        this.resetSecurityCheck();
        this.hasFetchedInfo = false;
        this.fetchInfoBtn.disabled = true;
        this.fetchInfoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 获取信息...';
        this.urlCheckResult.style.display = 'block';
        this.urlCheckResult.className = 'url-check-result checking';
        this.urlCheckResult.innerHTML = '正在获取网站信息，安全检测后台进行中...';
        
        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            const response = await Utils.safeFetch(`${this.apiBase}/fetch-site-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: safeUrl })
            });
            const data = await response.json();
            
            // ===== 修改：只在字段为空时填充 =====
            if (data.title && !this.titleInput.value.trim()) {
                this.titleInput.value = data.title;
            }
            if (data.icon && !this.iconInput.value.trim()) {
                this.iconInput.value = data.icon;
                this.updateIconPreview();
            }
            if (data.description && !this.descInput.value.trim()) {
                this.descInput.value = data.description.slice(0, 200);
                this.autoResizeDesc();
            }
            
            if (data.taskId) {
                this.currentTaskId = data.taskId;
                this.startPolling();
            } else {
                this.lastSecurityDetail = data;
                this.displaySecurityReport(data);
                if (data.alreadySubmitted) {
                    this.securityPassed = false;
                } else if (data.canSubmit === false) {
                    this.securityPassed = false;
                } else {
                    this.securityPassed = true;
                    this.hasFetchedInfo = true; // 标记已获取成功
                }
                this.updateSubmitButton();
            }
            this.scheduleDraftSave();
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.report(error, 'submit.fetchSiteInfo');
            }
            Utils.handleApiError(error, '获取网站信息失败', true);
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.innerHTML = '获取信息失败，请手动填写并重试检测';
            this.securityPassed = false;
            this.hasFetchedInfo = false;
            this.updateSubmitButton();
        } finally {
            this.fetchInfoBtn.disabled = false;
            this.fetchInfoBtn.innerHTML = '<i class="fas fa-magic"></i> 获取信息';
        }
    }

    startPolling() {
        if (this.pollingTimer) clearInterval(this.pollingTimer);
        this.pollingTimer = setInterval(async () => {
            if (!this.currentTaskId) return;
            try {
                const res = await Utils.safeFetch(`${this.apiBase}/security-status?taskId=${this.currentTaskId}`);
                const status = await res.json();
                if (status.status === 'completed') {
                    this.stopPolling();
                    this.lastSecurityDetail = status.result;
                    this.displaySecurityReport(status.result);
                    if (status.result.canSubmit !== false) {
                        this.securityPassed = true;
                        this.hasFetchedInfo = true; // 标记已获取
                    } else {
                        this.securityPassed = false;
                        this.hasFetchedInfo = false;
                    }
                    this.updateSubmitButton();
                } else if (status.status === 'failed') {
                    this.stopPolling();
                    this.urlCheckResult.className = 'url-check-result unsafe';
                    this.urlCheckResult.innerHTML = '安全检测失败，请稍后重试';
                    this.securityPassed = false;
                    this.hasFetchedInfo = false;
                    this.updateSubmitButton();
                } else {
                    // 仍在进行中
                    this.urlCheckResult.innerHTML = '安全检测进行中，请稍候...';
                }
            } catch (err) {
                if (window.errorHandler) {
                    window.errorHandler.report(err, 'submit.startPolling');
                }
                // 网络错误时停止轮询并提示
                this.stopPolling();
                this.urlCheckResult.className = 'url-check-result checking';
                this.urlCheckResult.innerHTML = '网络错误，请重试';
                this.securityPassed = false;
                this.hasFetchedInfo = false;
                this.updateSubmitButton();
            }
        }, 2000);
    }

    updateSubmitButton() {
        const title = this.titleInput.value.trim();
        const url = this.urlInput.value.trim();
        const contact = this.contactInput ? this.contactInput.value.trim() : '';
        const urlValid = Utils.isValidUrl(url);
        const contactValid = contact && contact.includes('@');
        const enable = !!(title && urlValid && this.securityPassed && contactValid);
        this.submitSaveBtn.disabled = !enable || this.submitting;
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.submitting) return;
        if (!this.securityPassed) {
            window.toast.show('请先点击"获取信息"完成安全检测，且检测通过后才能提交', 'warning');
            return;
        }
        let title = this.titleInput.value.trim();
        let url = this.urlInput.value.trim();
        let contact = this.contactInput ? this.contactInput.value.trim() : '';
        if (!title || !url) {
            window.toast.show('请填写网站名称和链接', 'warning');
            return;
        }
        if (!Utils.isValidUrl(url)) {
            window.toast.show('请输入正确的网址', 'warning');
            return;
        }
        if (!contact || !contact.includes('@')) {
            window.toast.show('请填写有效的邮箱地址，用于接收审核结果通知', 'warning');
            return;
        }
        const safeUrl = url.startsWith('http') ? url : `https://${url}`;
        const deviceId = this.getDeviceId();
        const payload = {
            title: title,
            url: safeUrl,
            description: this.descInput.value.trim(),
            icon: this.iconInput.value.trim(),
            contact: contact
        };
        this.submitting = true;
        this.submitSaveBtn.disabled = true;
        this.submitSaveBtn.textContent = '提交中...';
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
                this.updateGlobalTotalCountIncrement();
                this.clearDraft();
                this.hide();
                this.resetForm();
            } else {
                let errorMsg = data.error || '提交失败';
                if (data.details && data.details.label) {
                    errorMsg = data.details.label;
                }
                window.toast.show(errorMsg, 'error');
                if (this.urlCheckResult && data.details && data.details.label) {
                    this.displaySecurityReport(data.details);
                    this.securityPassed = false;
                    this.hasFetchedInfo = false;
                    this.updateSubmitButton();
                }
            }
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.report(error, 'submit.handleSubmit');
            }
            Utils.handleApiError(error, '提交失败，请重试', true);
        } finally {
            this.submitting = false;
            this.submitSaveBtn.disabled = false;
            this.submitSaveBtn.textContent = '提交投稿';
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
        this.resetSecurityCheck();
        this.iconPreview.style.display = 'none';
        this.submitSaveBtn.disabled = true;
        if (this.descInput) this.descInput.style.height = 'auto';
        this.submitting = false;
        this.securityPassed = false;
        this.lastSecurityDetail = null;
        this.hasFetchedInfo = false; // 重置标志
        // 不清除联系方式，让草稿或独立存储保留
    }

    show() {
        if (!this.modal) return;
        if (window.Starlink?.sidebar && window.Starlink.sidebar.isVisible?.()) {
            window.Starlink.sidebar.hide();
        } else if (window.sidebar && window.sidebar.isVisible?.()) {
            window.sidebar.hide();
        }
        this.modal.classList.add('active');
        this.isVisible = true;
        // 加载草稿，但不会自动获取（由 hasFetchedInfo 控制）
        this.loadDraft();
        this.updateSubmitButton();
        if (window.Starlink?.app) window.Starlink.app.registerModal(this);
        else if (window.app) window.app.registerModal(this);
    }

    hide() {
        if (!this.modal || !this.isVisible) return;
        this.saveDraft();
        this.modal.classList.remove('active');
        const onTransitionEnd = () => {
            this.isVisible = false;
            if (window.Starlink?.app) window.Starlink.app.unregisterModal(this);
            else if (window.app) window.app.unregisterModal(this);
            this.modal.removeEventListener('transitionend', onTransitionEnd);
            // 不重置表单，保留数据
        };
        this.modal.addEventListener('transitionend', onTransitionEnd, { once: true });
        setTimeout(onTransitionEnd, 400);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Starlink) window.Starlink = {};
    if (!window.Starlink.submit) {
        window.Starlink.submit = new SubmitModule();
    }
    window.submitModule = window.Starlink.submit;
});