/**
 * 网站投稿模块（支持异步安全检测 + 状态查询）
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
        this.lastSubmissionId = localStorage.getItem('last_submission_id');

        this.init();
    }

    init() { 
        this.bindEvents(); 
        this.createStatusPanel();
        if (this.lastSubmissionId) this.checkSubmissionStatus(this.lastSubmissionId, false);
    }

    createStatusPanel() {
        if (!this.modal) return;
        const body = this.modal.querySelector('.feedback-modal-body');
        if (!body) return;
        if (document.getElementById('submissionStatusPanel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'submissionStatusPanel';
        panel.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: rgba(0,0,0,0.03);
            border-radius: 8px;
            font-size: 12px;
            border-top: 1px solid var(--border-color);
        `;
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span><i class="fas fa-clipboard-list"></i> 投稿状态</span>
                <button id="checkSubmissionStatusBtn" class="submit-cancel-btn" style="padding: 4px 10px; font-size: 11px;">查询最新投稿</button>
            </div>
            <div id="submissionStatusContent" style="color: var(--text-secondary);">
                暂无投稿记录
            </div>
        `;
        body.appendChild(panel);
        
        this.statusContainer = document.getElementById('submissionStatusContent');
        const checkBtn = document.getElementById('checkSubmissionStatusBtn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkLatestSubmission());
        }
    }

    async checkLatestSubmission() {
        if (!this.lastSubmissionId) {
            this.updateStatusDisplay(null, '暂无投稿记录，请先投稿');
            return;
        }
        await this.checkSubmissionStatus(this.lastSubmissionId, true);
    }

    async checkSubmissionStatus(submissionId, showToastOnError = true) {
        if (!submissionId) return;
        try {
            const res = await fetch(`${this.apiBase}/submission-status?id=${submissionId}`);
            if (!res.ok) {
                if (res.status === 404) {
                    this.updateStatusDisplay(null, '投稿记录不存在，可能已被删除');
                } else {
                    this.updateStatusDisplay(null, '查询失败，请稍后重试');
                }
                return;
            }
            const data = await res.json();
            this.updateStatusDisplay(data);
        } catch (err) {
            console.error(err);
            if (showToastOnError) window.toast.show('查询状态失败', 'error');
            this.updateStatusDisplay(null, '网络错误，无法查询');
        }
    }

    updateStatusDisplay(data, errorMsg = null) {
        if (!this.statusContainer) return;
        if (errorMsg) {
            this.statusContainer.innerHTML = `<span style="color: var(--warning-color);">${this.escapeHtml(errorMsg)}</span>`;
            return;
        }
        if (!data) {
            this.statusContainer.innerHTML = '<span>无投稿记录</span>';
            return;
        }
        
        let statusText = '', statusColor = '';
        switch (data.status) {
            case 'pending':
                statusText = '审核中';
                statusColor = '#f59e0b';
                break;
            case 'approved':
                statusText = '已通过 ✓';
                statusColor = '#10b981';
                break;
            case 'rejected':
                statusText = '未通过 ✗';
                statusColor = '#ef4444';
                break;
            default:
                statusText = data.status;
                statusColor = '#64748b';
        }
        
        const submitDate = new Date(data.submitTime).toLocaleString();
        const resultText = data.result || '暂无检测结果';
        
        this.statusContainer.innerHTML = `
            <div style="margin-bottom: 4px;"><strong>${this.escapeHtml(data.title)}</strong></div>
            <div>状态：<span style="color: ${statusColor};">${statusText}</span></div>
            <div>检测结果：${this.escapeHtml(resultText)}</div>
            <div style="font-size: 11px; margin-top: 4px;">提交时间：${submitDate}</div>
            ${data.status === 'approved' ? '<div style="color: #10b981; margin-top: 4px;">✅ 该网站已被收录，感谢您的贡献！</div>' : ''}
            ${data.status === 'rejected' ? '<div style="color: #ef4444; margin-top: 4px;">❌ 该网站未通过安全检测或人工审核</div>' : ''}
        `;
    }

    bindEvents() {
        const closeBtn = this.modal.querySelector('.feedback-modal-close');
        const cancelBtn = this.modal.querySelector('.submit-cancel-btn');
        const closeModal = () => { this.modal.classList.remove('active'); this.resetForm(); };
        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        this.modal.addEventListener('click', e => { if (e.target === this.modal) closeModal(); });

        this.fetchInfoBtn.addEventListener('click', () => this.fetchSiteInfoAndCheck());

        this.urlInput.addEventListener('input', () => {
            this.isSafe = false; this.canSubmit = false; this.alreadySubmitted = false; this.resultLabel = ''; this.riskLevel = '';
            this.urlCheckResult.style.display = 'none'; this.urlCheckResult.className = 'url-check-result'; this.updateSubmitButton();
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
        if (!url || !this.isValidUrl(url)) { window.toast.show('请输入正确的网址', 'warning'); return; }

        if (this.waitingHint) this.waitingHint.style.display = 'inline';
        this.fetchInfoBtn.disabled = true;
        this.fetchInfoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 获取中...';
        this.urlCheckResult.style.display = 'block';
        this.urlCheckResult.className = 'url-check-result checking';
        this.urlCheckResult.textContent = '正在获取网站信息...';

        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            const res = await fetch(`${this.apiBase}/fetch-site-info`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: safeUrl })
            });
            const data = await res.json();

            if (data.title) this.titleInput.value = data.title;
            if (data.icon) { this.iconInput.value = data.icon; this.updateIconPreview(); }
            if (data.description) {
                this.descInput.value = data.description;
                this.autoResizeDesc();
            }

            this.isSafe = data.safe;
            this.canSubmit = data.canSubmit;
            this.alreadySubmitted = data.alreadySubmitted;
            this.resultLabel = data.label || '';
            this.riskLevel = data.riskLevel || '';

            if (data.alreadySubmitted) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该网站已收录，无需重复提交';
            } else if (data.asyncCheck) {
                this.urlCheckResult.className = 'url-check-result safe';
                this.urlCheckResult.textContent = data.label || '信息获取成功，提交后后台将进行安全检测';
            } else if (!data.canSubmit) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该链接存在安全风险，禁止提交';
            } else {
                this.urlCheckResult.className = data.safe ? 'url-check-result safe' : 'url-check-result checking';
                this.urlCheckResult.textContent = data.label || (data.safe ? '安全，可提交' : '可疑，可提交');
            }
            this.updateSubmitButton();
        } catch (e) {
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.textContent = '获取信息失败，可以跳过检测直接提交';
            this.canSubmit = true; this.isSafe = true; this.alreadySubmitted = false; this.updateSubmitButton();
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
        if (!title || !url) { window.toast.show('请填写网站名称和链接', 'warning'); return; }
        if (!this.isValidUrl(url)) { window.toast.show('请输入正确的网址', 'warning'); return; }
        if (this.alreadySubmitted) { window.toast.show('该网站已收录', 'error'); return; }
        if (!this.canSubmit) { window.toast.show('该链接未通过基础检测，无法提交', 'error'); return; }

        this.submitSaveBtn.disabled = true;
        this.submitSaveBtn.textContent = '提交中...';
        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            const res = await fetch(`${this.apiBase}/submit-site`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, url: safeUrl, description: this.descInput.value.trim(), icon: this.iconInput.value.trim(), vt_result: this.resultLabel })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.submissionId) {
                    this.lastSubmissionId = data.submissionId;
                    localStorage.setItem('last_submission_id', data.submissionId);
                    if (this.statusContainer) this.checkSubmissionStatus(data.submissionId, false);
                }
                if (data.asyncCheck) {
                    window.toast.show('投稿已提交！安全检测将在后台进行，通过后自动收录', 'success');
                } else {
                    window.toast.show('感谢投稿！', 'success');
                }
                this.modal.classList.remove('active');
                this.resetForm();
            } else {
                const err = await res.json().catch(()=>({}));
                window.toast.show(err.error || '提交失败', 'error');
            }
        } catch { window.toast.show('网络错误', 'error'); }
        finally { this.submitSaveBtn.disabled = false; this.submitSaveBtn.textContent = '提交投稿'; }
    }

    isValidUrl(url) { 
        try { return ['http:','https:'].includes(new URL(url.startsWith('http')?url:`https://${url}`).protocol); } 
        catch { return false; } 
    }

    updateIconPreview() {
        const iconUrl = this.iconInput.value.trim();
        if (iconUrl && (iconUrl.startsWith('http')||iconUrl.startsWith('https'))) {
            this.iconPreview.src = iconUrl; this.iconPreview.style.display = 'block';
        } else { this.iconPreview.style.display = 'none'; }
    }

    resetForm() {
        this.form.reset();
        this.canSubmit = false; this.isSafe = false; this.alreadySubmitted = false; this.resultLabel = ''; this.riskLevel = '';
        this.urlCheckResult.style.display = 'none'; this.urlCheckResult.className = 'url-check-result';
        this.iconPreview.style.display = 'none';
        this.submitSaveBtn.disabled = true;
        this.descInput.style.height = 'auto';
        if (this.waitingHint) this.waitingHint.style.display = 'none';
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { window.submitModule = new SubmitModule(); });