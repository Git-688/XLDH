/**
 * 网站投稿模块（支持异步安全检测 + 我的投稿列表无限制 + 拒绝后修改一次）
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
        this.editingRejectedId = null;   // 正在编辑的被拒绝投稿ID

        this.init();
    }

    init() {
        this.bindEvents();
        this.createMySubmissionsPanel();
    }

    // ==================== 我的投稿列表（无限制，独立滚动） ====================
    createMySubmissionsPanel() {
        if (!this.modal) return;
        const body = this.modal.querySelector('.feedback-modal-body');
        if (!body) return;
        if (document.getElementById('mySubmissionsPanel')) return;

        // 模态框主体不滚动
        body.style.overflowY = 'hidden';
        body.style.paddingBottom = '0';

        const panel = document.createElement('div');
        panel.id = 'mySubmissionsPanel';
        panel.style.cssText = `
            margin-top: 20px;
            padding: 12px;
            background: rgba(0,0,0,0.03);
            border-radius: 8px;
            font-size: 12px;
            border-top: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
        `;
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-shrink: 0;">
                <span><i class="fas fa-history"></i> 我的投稿 (<span id="submissionTotalCount">0</span>)</span>
                <button id="refreshSubmissionsBtn" class="submit-cancel-btn" style="padding: 4px 10px; font-size: 11px;">刷新</button>
            </div>
            <div id="submissionsList" style="max-height: 280px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; touch-action: pan-y; overscroll-behavior: contain;">
                <div style="text-align: center; color: var(--text-secondary); padding: 20px;">暂无投稿记录</div>
            </div>
        `;
        // 隐藏滚动条
        const style = document.createElement('style');
        style.textContent = `#submissionsList::-webkit-scrollbar { display: none; }`;
        panel.appendChild(style);
        body.appendChild(panel);

        this.submissionsListContainer = document.getElementById('submissionsList');
        this.submissionTotalSpan = document.getElementById('submissionTotalCount');
        const refreshBtn = document.getElementById('refreshSubmissionsBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadMySubmissions());

        // 防止滚动穿透：模态框打开时锁定 body 滚动
        const modalElem = this.modal;
        const disableBodyScroll = () => { document.body.style.overflow = 'hidden'; };
        const enableBodyScroll = () => { document.body.style.overflow = ''; };
        const observerForModal = new MutationObserver(() => {
            if (modalElem.classList.contains('active')) {
                disableBodyScroll();
                this.loadMySubmissions();
            } else {
                enableBodyScroll();
            }
        });
        observerForModal.observe(modalElem, { attributes: true });
    }

    async loadMySubmissions() {
        if (!this.submissionsListContainer) return;
        this.submissionsListContainer.innerHTML = '<div style="text-align: center; padding: 20px;">加载中...</div>';
        try {
            const res = await fetch(`${this.apiBase}/my-submissions`, {
                headers: { 'X-Device-Id': this.getDeviceId() }
            });
            if (!res.ok) throw new Error('加载失败');
            const data = await res.json();
            if (this.submissionTotalSpan) {
                this.submissionTotalSpan.textContent = data.totalCount || 0;
            }
            this.renderSubmissionList(data.list || []);
        } catch (err) {
            console.error(err);
            this.submissionsListContainer.innerHTML = '<div style="text-align: center; color: var(--error-color); padding: 20px;">加载失败，请重试</div>';
        }
    }

    renderSubmissionList(list) {
        if (!list.length) {
            this.submissionsListContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">暂无投稿记录<br><span style="font-size: 11px;">如果您之前投过稿，清除浏览器缓存后无法找回，但新投稿会正常显示。</span></div>';
            return;
        }
        const html = list.map(item => {
            const submitDate = new Date(item.submit_time).toLocaleString();
            const safeTitle = this.escapeHtml(item.title);
            const safeResult = this.escapeHtml(item.vt_result || '暂无');

            let statusHtml = '';
            let actionHtml = '';
            if (item.status === 'approved') {
                let categoryPath = '';
                if (item.category_name && item.subcategory_name) {
                    categoryPath = `${this.escapeHtml(item.category_name)} → ${this.escapeHtml(item.subcategory_name)}`;
                } else {
                    categoryPath = '已收录';
                }
                statusHtml = `<span style="color: #10b981;">✅ 已收录到 ${categoryPath}</span>`;
                // 已通过不可修改，不显示操作按钮
            } else if (item.status === 'rejected') {
                const reason = this.escapeHtml(item.reject_reason || '未提供原因');
                statusHtml = `<span style="color: #ef4444;">❌ 拒绝原因：${reason}</span>`;
                // 如果 modify_count < 1，显示“修改”按钮
                if (item.modify_count < 1) {
                    actionHtml = `<button class="edit-rejected-btn" data-id="${item.id}" data-title="${safeTitle}" data-url="${this.escapeHtml(item.url)}" data-desc="${this.escapeHtml(item.description || '')}" data-icon="${this.escapeHtml(item.icon || '')}" style="margin-left: 10px; padding: 2px 8px; font-size: 11px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">修改</button>`;
                } else {
                    statusHtml += `<span style="margin-left: 8px; font-size: 11px; color: #999;">(已修改过，不可再次修改)</span>`;
                }
            } else {
                statusHtml = `<span style="color: #f59e0b;">⏳ 待审核</span>`;
            }

            return `
                <div style="padding: 10px; border-bottom: 1px solid var(--border-color);" data-id="${item.id}">
                    <div><strong>${safeTitle}</strong> ${actionHtml}</div>
                    <div>状态：${statusHtml}</div>
                    <div>安全检测：${safeResult}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${submitDate}</div>
                </div>
            `;
        }).join('');
        this.submissionsListContainer.innerHTML = html;

        // 绑定修改按钮事件
        document.querySelectorAll('.edit-rejected-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const title = btn.dataset.title;
                const url = btn.dataset.url;
                const desc = btn.dataset.desc;
                const icon = btn.dataset.icon;
                this.fillFormForEdit(id, title, url, desc, icon);
            });
        });
    }

    fillFormForEdit(id, title, url, desc, icon) {
        this.editingRejectedId = id;
        this.titleInput.value = title;
        this.urlInput.value = url;
        this.descInput.value = desc;
        if (icon && icon !== '') {
            this.iconInput.value = icon;
            this.updateIconPreview();
        }
        // 可选：滚动到表单并高亮
        this.titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.toast.show('请修改网站信息后重新提交（仅可修改一次）', 'info');
        // 确保提交按钮可用（用户必须手动点击“获取信息”或直接提交）
        this.canSubmit = true;
        this.alreadySubmitted = false;
        this.updateSubmitButton();
    }

    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }

    // ==================== 原有投稿功能（修正提交时携带设备ID和处理修改） ====================
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
            const data = await res.json();

            if (data.title) this.titleInput.value = data.title;
            if (data.icon) {
                this.iconInput.value = data.icon;
                this.updateIconPreview();
            }
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
                this.urlCheckResult.textContent = data.label || '该网站已收录，无法提交';
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
            console.error(e);
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.textContent = '获取信息失败，请手动填写';
            window.toast.show('自动获取网站信息失败，请手动填写标题和图标', 'warning');
            this.canSubmit = true;
            this.isSafe = true;
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
            window.toast.show('该网站已收录，无法再次提交', 'error');
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
                icon: this.iconInput.value.trim(),
                vt_result: this.resultLabel
            };
            // 如果是修改被拒绝的投稿，带上 submissionId
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
                const data = await res.json();
                if (data.asyncCheck) {
                    window.toast.show(this.editingRejectedId ? '修改已提交！安全检测将在后台进行，通过后自动收录' : '投稿已提交！安全检测将在后台进行，通过后自动收录', 'success');
                } else {
                    window.toast.show('感谢投稿！', 'success');
                }
                this.modal.classList.remove('active');
                this.resetForm();
                this.editingRejectedId = null;
                setTimeout(() => this.loadMySubmissions(), 500);
            } else {
                const err = await res.json().catch(() => ({}));
                window.toast.show(err.error || '提交失败', 'error');
            }
        } catch (err) {
            console.error(err);
            window.toast.show('网络错误', 'error');
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