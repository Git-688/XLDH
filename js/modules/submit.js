/**
 * 网站投稿模块（同步安全检测版）
 * 功能：投稿表单、自动获取网站信息（可选）、同步安全检测、每日剩余次数提示
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

        this.apiBase = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://api.xjdh688.ccwu.cc';
        this.dailyLimit = 6; // 与 Worker 保持一致
        this.statsBadge = null;
        this.submitting = false;

        this.init();
    }

    // 简单的 HTML 转义
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    init() {
        if (!this.modal) {
            console.error('投稿模态框不存在');
            return;
        }
        this.bindEvents();
        if (this.descInput) this.descInput.maxLength = 200;

        // 监听模态框打开，刷新显示
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && this.modal.classList.contains('active')) {
                    this.ensureStatsBadge();
                    this.updateLocalStatsDisplay();
                    this.updateRemainingCount();
                }
            });
        });
        observer.observe(this.modal, { attributes: true });

        // 每天零点重置今日计数
        this.checkAndResetDailyCount();
        setInterval(() => this.checkAndResetDailyCount(), 60000);
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
            badge.textContent = '已投稿 0 次';
            h3.appendChild(badge);
        }
        this.statsBadge = badge;
    }

    updateLocalStatsDisplay() {
        const total = this.getLocalSubmissionCount();
        if (this.statsBadge) {
            this.statsBadge.textContent = `已投稿 ${total} 次`;
        }
    }

    updateRemainingCount() {
        const todayKey = `submit_count_${new Date().toISOString().slice(0, 10)}`;
        let todayCount = parseInt(localStorage.getItem(todayKey) || '0', 10);
        const remaining = Math.max(0, this.dailyLimit - todayCount);
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

    checkAndResetDailyCount() {
        const todayKey = `submit_count_${new Date().toISOString().slice(0, 10)}`;
        const storedDate = localStorage.getItem('submit_date');
        const today = new Date().toISOString().slice(0, 10);
        if (storedDate !== today) {
            localStorage.setItem('submit_date', today);
            localStorage.setItem(todayKey, '0');
            this.updateRemainingCount();
        }
    }

    getLocalSubmissionCount() {
        const count = parseInt(localStorage.getItem('submission_total') || '0', 10);
        return isNaN(count) ? 0 : count;
    }

    incrementLocalSubmissionCount() {
        const todayKey = `submit_count_${new Date().toISOString().slice(0, 10)}`;
        let todayCount = parseInt(localStorage.getItem(todayKey) || '0', 10);
        todayCount++;
        localStorage.setItem(todayKey, todayCount);
        let count = this.getLocalSubmissionCount();
        count++;
        localStorage.setItem('submission_total', count);
        this.updateLocalStatsDisplay();
        this.updateRemainingCount();
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
        } catch (e) {
            console.error('获取信息失败:', e);
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.textContent = '获取信息失败，请手动填写';
            window.toast.show('自动获取网站信息失败，请手动填写标题和图标', 'warning');
            this.updateSubmitButton(true);
        } finally {
            if (this.waitingHint) this.waitingHint.style.display = 'none';
            this.fetchInfoBtn.disabled = false;
            this.fetchInfoBtn.innerHTML = '<i class="fas fa-magic"></i> 获取信息';
        }
    }

    updateSubmitButton(enable = null) {
        // 如果没有显式传入 enable，则根据表单是否填写完整来判断
        if (enable === null) {
            const title = this.titleInput.value.trim();
            const url = this.urlInput.value.trim();
            enable = !!(title && url && this.isValidUrl(url));
        }
        this.submitSaveBtn.disabled = !enable || this.submitting;
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.submitting) return;

        // 前端检查每日剩余次数（后端也会检查，这里仅做友好提示）
        const todayKey = `submit_count_${new Date().toISOString().slice(0, 10)}`;
        let todayCount = parseInt(localStorage.getItem(todayKey) || '0', 10);
        if (todayCount >= this.dailyLimit) {
            window.toast.show(`今日投稿已达上限（${this.dailyLimit}次），请明天再试`, 'warning');
            return;
        }

        let title = this.titleInput.value.trim();
        let url = this.urlInput.value.trim();
        if (!title || !url) {
            window.toast.show('请填写网站名称和链接', 'warning');
            return;
        }
        if (!this.isValidUrl(url)) {
            window.toast.show('请输入正确的网址', 'warning');
            return;
        }

        // 确保 URL 带协议
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
            const res = await fetch(`${this.apiBase}/submit-site`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Id': deviceId
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                window.toast.show('投稿成功！已通过安全检测，等待管理员审核', 'success');
                this.incrementLocalSubmissionCount();
                this.modal.classList.remove('active');
                this.resetForm();
            } else {
                // 处理安全检测不通过或其他错误
                let errorMsg = data.error || '提交失败';
                if (data.details && data.details.label) {
                    errorMsg = data.details.label;
                }
                window.toast.show(errorMsg, 'error');
                // 显示详细错误信息在结果区域
                if (this.urlCheckResult && data.details && data.details.label) {
                    this.urlCheckResult.style.display = 'block';
                    this.urlCheckResult.className = 'url-check-result unsafe';
                    this.urlCheckResult.textContent = data.details.label;
                }
                this.updateSubmitButton(true); // 重新启用按钮（但不清空表单）
            }
        } catch (err) {
            console.error(err);
            window.toast.show('网络错误，请稍后重试', 'error');
            this.updateSubmitButton(true);
        } finally {
            this.submitting = false;
            this.submitSaveBtn.disabled = false;
            this.submitSaveBtn.textContent = '提交投稿';
            if (this.waitingHint) this.waitingHint.style.display = 'none';
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
        this.urlCheckResult.style.display = 'none';
        this.urlCheckResult.className = 'url-check-result';
        this.iconPreview.style.display = 'none';
        this.submitSaveBtn.disabled = true;
        if (this.descInput) this.descInput.style.height = 'auto';
        if (this.waitingHint) this.waitingHint.style.display = 'none';
        this.submitting = false;
    }
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!window.submitModule) {
        window.submitModule = new SubmitModule();
    }
});