/**
 * 网站投稿模块
 * 功能：自动获取网站信息 + 安全检测 + 重复收录检查
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
        this.checkUrlBtn = document.getElementById('checkUrlBtn'); // 保留但隐藏，不再单独使用
        this.submitSaveBtn = document.getElementById('submitSaveBtn');
        this.urlCheckResult = document.getElementById('urlCheckResult');
        
        this.apiBase = window.APP_CONFIG?.API_BASE || 'https://api.xjdh688.ccwu.cc';
        this.isSafe = false;
        this.canSubmit = false;
        this.alreadySubmitted = false;
        this.resultLabel = '';
        this.riskLevel = '';
        this.isFetching = false;
        
        // 隐藏安全检测按钮（功能合并到获取信息）
        if (this.checkUrlBtn) {
            this.checkUrlBtn.style.display = 'none';
        }
        
        this.init();
    }
    
    init() {
        this.bindEvents();
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
        
        // “获取信息”按钮：同时执行信息获取、安全检测、收录检查
        this.fetchInfoBtn.addEventListener('click', () => this.fetchSiteInfoAndCheck());
        
        this.urlInput.addEventListener('input', () => {
            // 重置检测状态
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
        this.descInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
        
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
    
    async fetchSiteInfoAndCheck() {
        const url = this.urlInput.value.trim();
        if (!url) {
            window.toast.show('请先输入网址', 'warning');
            return;
        }
        if (!this.isValidUrl(url)) {
            window.toast.show('请输入正确的网址（以 http:// 或 https:// 开头）', 'warning');
            return;
        }
        
        this.fetchInfoBtn.disabled = true;
        this.fetchInfoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 检测中...';
        this.urlCheckResult.style.display = 'block';
        this.urlCheckResult.className = 'url-check-result checking';
        this.urlCheckResult.textContent = '正在获取信息并检测安全性，请稍候...';
        
        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            // 调用后端综合接口
            const res = await fetch(`${this.apiBase}/fetch-site-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: safeUrl })
            });
            const data = await res.json();
            
            // 填充网站信息
            if (data.title) this.titleInput.value = data.title;
            if (data.icon) {
                this.iconInput.value = data.icon;
                this.updateIconPreview();
            }
            if (data.description) this.descInput.value = data.description;
            
            // 处理安全检测和收录状态
            this.isSafe = data.safe;
            this.canSubmit = data.canSubmit;
            this.alreadySubmitted = data.alreadySubmitted;
            this.resultLabel = data.label || '';
            this.riskLevel = data.riskLevel || '';
            
            // 显示结果
            if (data.alreadySubmitted) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该网站已收录，无需重复提交';
            } else if (!data.canSubmit) {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.label || '该链接存在安全风险，禁止提交';
            } else {
                if (data.safe) {
                    this.urlCheckResult.className = 'url-check-result safe';
                } else {
                    this.urlCheckResult.className = 'url-check-result checking';
                }
                this.urlCheckResult.textContent = data.label || (data.safe ? '安全，可提交' : '可疑，可提交');
            }
            
            this.updateSubmitButton();
        } catch (e) {
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.textContent = '检测暂时不可用，可以跳过检测直接提交';
            this.canSubmit = true;
            this.isSafe = true;
            this.alreadySubmitted = false;
            this.updateSubmitButton();
        } finally {
            this.fetchInfoBtn.disabled = false;
            this.fetchInfoBtn.innerHTML = '<i class="fas fa-magic"></i> 获取信息';
        }
    }
    
    updateSubmitButton() {
        const title = this.titleInput.value.trim();
        const url = this.urlInput.value.trim();
        const isFormFilled = title && url && this.isValidUrl(url);
        // 必须通过安全检测且未被收录才可提交
        const canSubmit = isFormFilled && this.canSubmit && !this.alreadySubmitted;
        this.submitSaveBtn.disabled = !canSubmit;
        if (!canSubmit && isFormFilled) {
            this.submitSaveBtn.title = this.alreadySubmitted ? '该网站已收录' : '请先通过安全检测';
        } else {
            this.submitSaveBtn.title = '';
        }
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
            window.toast.show('该网站已收录，无法重复提交', 'error');
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
            const res = await fetch(`${this.apiBase}/submit-site`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    url: safeUrl,
                    description: this.descInput.value.trim(),
                    icon: this.iconInput.value.trim(),
                    vt_result: this.resultLabel  // 保存检测结果摘要
                })
            });
            
            if (res.ok) {
                window.toast.show('感谢投稿！管理员审核后将收录', 'success');
                this.modal.classList.remove('active');
                this.resetForm();
            } else {
                const data = await res.json().catch(() => ({}));
                window.toast.show(data.error || '提交失败，请稍后再试', 'error');
            }
        } catch (err) {
            window.toast.show('网络错误，请稍后再试', 'error');
        } finally {
            this.submitSaveBtn.disabled = false;
            this.submitSaveBtn.textContent = '提交投稿';
        }
    }
    
    isValidUrl(url) {
        if (!url) return false;
        try {
            const u = new URL(url.startsWith('http') ? url : `https://${url}`);
            return ['http:', 'https:'].includes(u.protocol);
        } catch { return false; }
    }
    
    updateIconPreview() {
        const iconUrl = this.iconInput.value.trim();
        if (iconUrl && (iconUrl.startsWith('http') || iconUrl.startsWith('https'))) {
            this.iconPreview.src = iconUrl;
            this.iconPreview.style.display = 'block';
        } else {
            this.iconPreview.src = '';
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
        this.iconPreview.src = '';
        this.iconPreview.style.display = 'none';
        this.submitSaveBtn.disabled = true;
        this.descInput.style.height = 'auto';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.submitModule = new SubmitModule();
});