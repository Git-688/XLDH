/**
 * 网站投稿模块
 * 功能：动态加载分类、自动获取网站信息、链接安全检测
 */
class SubmitModule {
    constructor() {
        this.modal = document.getElementById('submitModal');
        this.form = document.getElementById('submitSiteForm');
        this.urlInput = document.getElementById('submitUrl');
        this.titleInput = document.getElementById('submitTitle');
        this.iconInput = document.getElementById('submitIcon');
        this.categorySelect = document.getElementById('submitCategory');
        this.descInput = document.getElementById('submitDesc');
        this.iconPreview = document.getElementById('submitIconPreview');
        this.fetchInfoBtn = document.getElementById('fetchSiteInfoBtn');
        this.checkUrlBtn = document.getElementById('checkUrlBtn');
        this.submitSaveBtn = document.getElementById('submitSaveBtn');
        this.urlCheckResult = document.getElementById('urlCheckResult');
        
        this.apiBase = window.APP_CONFIG?.API_BASE || 'https://api.xjdh688.ccwu.cc';
        this.urlChecked = false;
        this.urlSafe = false;
        this.isFetching = false;
        this.isChecking = false;
        
        this.init();
    }
    
    init() {
        this.loadCategories();
        this.bindEvents();
    }
    
    async loadCategories() {
        try {
            const res = await fetch(`${this.apiBase}/get-categories`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat.name;
                    opt.textContent = cat.name;
                    this.categorySelect.appendChild(opt);
                });
            }
        } catch (e) {
            console.warn('加载分类列表失败:', e);
        }
    }
    
    bindEvents() {
        // 关闭按钮
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
        
        // 自动获取信息按钮
        this.fetchInfoBtn.addEventListener('click', () => this.fetchSiteInfo());
        
        // 安全检测按钮
        this.checkUrlBtn.addEventListener('click', () => this.checkUrl());
        
        // 网址输入后检测结果失效
        this.urlInput.addEventListener('input', () => {
            if (this.urlChecked) {
                this.urlChecked = false;
                this.urlSafe = false;
                this.urlCheckResult.style.display = 'none';
                this.updateSubmitButton();
            }
        });
        
        // 图标输入后更新预览
        this.iconInput.addEventListener('input', () => this.updateIconPreview());
        
        // 表单提交
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
    
    async fetchSiteInfo() {
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
        this.fetchInfoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 获取中...';
        
        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            const res = await fetch(`${this.apiBase}/fetch-site-info?url=${encodeURIComponent(safeUrl)}`);
            const data = await res.json();
            
            if (data.title) this.titleInput.value = data.title;
            if (data.icon) {
                this.iconInput.value = data.icon;
                this.updateIconPreview();
            }
            if (data.description) this.descInput.value = data.description;
            
            if (data.title) {
                window.toast.show('信息获取成功', 'success');
            } else {
                window.toast.show('未能获取到信息，请手动填写', 'warning');
            }
        } catch (e) {
            window.toast.show('获取信息失败，请检查网络', 'error');
        } finally {
            this.fetchInfoBtn.disabled = false;
            this.fetchInfoBtn.innerHTML = '<i class="fas fa-magic"></i> 获取信息';
        }
    }
    
    async checkUrl() {
        const url = this.urlInput.value.trim();
        if (!url) {
            window.toast.show('请先输入网址', 'warning');
            return;
        }
        if (!this.isValidUrl(url)) {
            window.toast.show('请输入正确的网址（以 http:// 或 https:// 开头）', 'warning');
            return;
        }
        
        this.checkUrlBtn.disabled = true;
        this.checkUrlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 检测中...';
        this.urlCheckResult.style.display = 'block';
        this.urlCheckResult.className = 'url-check-result checking';
        this.urlCheckResult.textContent = '正在检测链接安全性，请稍候...';
        
        try {
            const safeUrl = url.startsWith('http') ? url : `https://${url}`;
            const res = await fetch(`${this.apiBase}/check-url?url=${encodeURIComponent(safeUrl)}`);
            const data = await res.json();
            
            this.urlChecked = true;
            this.urlSafe = data.safe;
            
            if (data.safe) {
                this.urlCheckResult.className = 'url-check-result safe';
                this.urlCheckResult.textContent = data.msg;
            } else {
                this.urlCheckResult.className = 'url-check-result unsafe';
                this.urlCheckResult.textContent = data.msg;
            }
            
            this.updateSubmitButton();
        } catch (e) {
            this.urlCheckResult.className = 'url-check-result checking';
            this.urlCheckResult.textContent = '检测暂时不可用，可以跳过检测直接提交';
            this.urlChecked = true;
            this.urlSafe = true; // 检测失败时允许提交
            this.updateSubmitButton();
        } finally {
            this.checkUrlBtn.disabled = false;
            this.checkUrlBtn.innerHTML = '<i class="fas fa-shield-alt"></i> 安全检测';
        }
    }
    
    updateSubmitButton() {
        const title = this.titleInput.value.trim();
        const url = this.urlInput.value.trim();
        const isFormFilled = title && url && this.isValidUrl(url);
        const isSafetyPassed = !this.urlChecked || this.urlSafe;
        
        this.submitSaveBtn.disabled = !(isFormFilled && isSafetyPassed);
        
        if (isFormFilled && !isSafetyPassed) {
            this.submitSaveBtn.title = '请先通过安全检测';
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
        
        if (this.urlChecked && !this.urlSafe) {
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
                    category: this.categorySelect.value,
                    description: this.descInput.value.trim(),
                    icon: this.iconInput.value.trim()
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
            this.iconPreview.src = '';
            this.iconPreview.style.display = 'none';
        }
    }
    
    resetForm() {
        this.form.reset();
        this.urlChecked = false;
        this.urlSafe = false;
        this.urlCheckResult.style.display = 'none';
        this.urlCheckResult.className = 'url-check-result';
        this.iconPreview.src = '';
        this.iconPreview.style.display = 'none';
        this.submitSaveBtn.disabled = true;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.submitModule = new SubmitModule();
});