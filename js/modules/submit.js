/**
 * 网站投稿模块（异步安全检测 + 轮询状态）
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
        this.cachedTotalCount = null;
        this.cachedTotalCountTime = 0;
        this.cacheTTL = 60000;
        this.todayCount = 0;

        this.securityPassed = false;
        this.lastSecurityDetail = null;
        this.currentTaskId = null;
        this.pollingTimer = null;

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
                    this.resetSecurityCheck();
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

    updateGlobalTotalCountIncrement() {
        if (this.cachedTotalCount !== null) {
            this.cachedTotalCount++;
            this.cachedTotalCountTime = Date.now();
            this.statsBadge.textContent = `总投稿 ${this.cachedTotalCount} 次`;
        } else {
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
            if (remaining <= 0) remainingSpan.style.color = '#ef4444';
            else remainingSpan.style.color = '';
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
            this.stopPolling();
            this.resetForm();
        };
        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) closeModal();
        });

        this.fetchInfoBtn.addEventListener('click', () => this.fetchSiteInfo());

        this.urlInput.addEventListener('input', () => {
            this.resetSecurityCheck();
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

    resetSecurityCheck() {
        this.stopPolling();
        this.securityPassed = false;
        this.lastSecurityDetail = null;
        this.currentTaskId = null;
        this.urlCheckResult.style.display = 'none';
        this.urlCheckResult.className = 'url-check-result';
        this.urlCheckResult.textContent = '';
        if (this.waitingHint) this.waitingHint.style.display = 'none';
    }

    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
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

    async fetchSiteInfo() {
        const url = this.urlInput.value.trim();
        if (!url || !Utils.isValidUrl(url)) {
            window.toast.show('请输入正确的网址', 'warning');
            return;
        }

        if (this.waitingHint) this.waitingHint.style.display = 'inline';
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

            if (data.title) this.titleInput.value = data.title;
            if (data.icon) {
                this.iconInput.value = data.icon;
                this.updateIconPreview();
            }
            if (data.description) {
                this.descInput.value = data.description.slice(0, 200);
                this.autoResizeDesc();
            }

            if (data.taskId) {
                this.currentTaskId = data.taskId;
                this.startPolling();
            } else {
                // 兼容旧接口（直接返回检测结果）
                this.lastSecurityDetail = data;
                this.displaySecurityReport(data);
                if (data.alreadySubmitted) {
                    this.securityPassed = false;
                } else if (data.canSubmit === false) {
                    this.securityPassed = false;
                } else {
                    this.securityPassed = true;
                }
                this.updateSubmitButton();
            }
        } catch (error) {
            Utils.handleApiError(error, '获取网站信息失败', true);
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.innerHTML = '获取信息失败，请手动填写并重试检测';
            this.securityPassed = false;
            this.updateSubmitButton();
        } finally {
            if (this.waitingHint) this.waitingHint.style.display = 'none';
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
                    } else {
                        this.securityPassed = false;
                    }
                    this.updateSubmitButton();
                } else if (status.status === 'failed') {
                    this.stopPolling();
                    this.urlCheckResult.className = 'url-check-result unsafe';
                    this.urlCheckResult.innerHTML = '安全检测失败，请稍后重试';
                    this.securityPassed = false;
                    this.updateSubmitButton();
                } else {
                    // pending, 更新提示
                    this.urlCheckResult.innerHTML = '安全检测进行中，请稍候...';
                }
            } catch (err) {
                console.warn('轮询安全检测状态失败:', err);
            }
        }, 2000);
    }

    updateSubmitButton() {
        const title = this.titleInput.value.trim();
        const url = this.urlInput.value.trim();
        const urlValid = Utils.isValidUrl(url);
        const remaining = this.dailyLimit - this.todayCount;
        const enable = !!(title && urlValid && this.securityPassed && remaining > 0);
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

        if (!this.securityPassed) {
            window.toast.show('请先点击“获取信息”完成安全检测，且检测通过后才能提交', 'warning');
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
        this.submitSaveBtn.textContent = '提交中...';
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
                this.todayCount++;
                this.updateRemainingCount();
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
                    this.displaySecurityReport(data.details);
                    this.securityPassed = false;
                    this.updateSubmitButton();
                }
            }
        } catch (error) {
            Utils.handleApiError(error, '提交失败，请重试', true);
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
        this.resetSecurityCheck();
        this.iconPreview.style.display = 'none';
        this.submitSaveBtn.disabled = true;
        if (this.descInput) this.descInput.style.height = 'auto';
        this.submitting = false;
        this.securityPassed = false;
        this.lastSecurityDetail = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.submitModule) {
        window.submitModule = new SubmitModule();
    }
});