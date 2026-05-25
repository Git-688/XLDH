(function() {
    const API_BASE = (window.APP_CONFIG?.API_BASE) || 'https://api.xjdh688.ccwu.cc';
    const TOKEN_EXPIRE_HOURS = 1;
    const MAX_FAIL_COUNT = 5;
    const LOCK_DURATION_MS = 10 * 60 * 1000;
    const SESSION_REFRESH_BEFORE_MS = 5 * 60 * 1000;

    let token = '';
    let categories = [], subcategories = [], sites = [];
    let currentCat = null, currentSub = null;
    let failCount = parseInt(sessionStorage.getItem('login_fail_count') || '0', 10);
    let lockUntil = parseInt(sessionStorage.getItem('login_lock_until') || '0', 10);
    let modalAction = null;
    let currentSubmissionId = null;
    let refreshTimer = null;

    // 注入全局样式（包含自定义选择器样式）
    function injectGlobalStyles() {
        if (!document.getElementById('admin-global-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-global-styles';
            style.textContent = `
                .submission-title-truncate {
                    display: inline-block;
                    max-width: 300px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    vertical-align: middle;
                }
                @media (max-width: 768px) {
                    .submission-title-truncate { max-width: 180px; }
                }
                @media (max-width: 480px) {
                    .submission-title-truncate { max-width: 120px; }
                }
                /* 通用表单控件 */
                .form-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 13px;
                    background: #fff;
                    transition: all 0.2s;
                    box-sizing: border-box;
                }
                .form-input:focus {
                    border-color: #3b82f6;
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
                }
                textarea.form-input {
                    resize: vertical;
                    font-family: inherit;
                }
                .inline-select-group {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    margin-bottom: 12px;
                }
                
                /* ========== 自定义下拉选择器 ========== */
                .custom-select-wrapper {
                    position: relative;
                    flex: 1;
                    min-width: 120px;
                }
                .custom-select-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #1e293b;
                    cursor: pointer;
                    transition: all 0.2s;
                    gap: 8px;
                }
                .custom-select-trigger:hover {
                    border-color: #3b82f6;
                }
                .custom-select-trigger.open {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
                }
                .custom-select-value {
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .custom-select-arrow {
                    width: 16px;
                    height: 16px;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='%2364748b' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
                    background-size: contain;
                    transition: transform 0.2s;
                }
                .custom-select-trigger.open .custom-select-arrow {
                    transform: rotate(180deg);
                }
                .custom-select-dropdown {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    right: 0;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    z-index: 1000;
                    max-height: 200px;
                    overflow-y: auto;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-8px);
                    transition: all 0.2s ease;
                    scrollbar-width: none;
                }
                .custom-select-dropdown::-webkit-scrollbar {
                    display: none;
                }
                .custom-select-dropdown.open {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }
                .custom-select-option {
                    padding: 8px 12px;
                    font-size: 13px;
                    color: #1e293b;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .custom-select-option:hover {
                    background: #f1f5f9;
                }
                .custom-select-option.selected {
                    background: #e0f2fe;
                    color: #0369a1;
                    font-weight: 500;
                }
                /* 暗色模式适配 */
                @media (prefers-color-scheme: dark) {
                    .custom-select-trigger {
                        background: #1e293b;
                        border-color: #334155;
                        color: #e2e8f0;
                    }
                    .custom-select-dropdown {
                        background: #1e293b;
                        border-color: #334155;
                    }
                    .custom-select-option {
                        color: #e2e8f0;
                    }
                    .custom-select-option:hover {
                        background: #334155;
                    }
                    .custom-select-option.selected {
                        background: #0f172a;
                        color: #38bdf8;
                    }
                    .form-input {
                        background: #1e293b;
                        border-color: #334155;
                        color: #e2e8f0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 自定义下拉选择器类
    class CustomSelect {
        constructor(selectElement, onChange) {
            this.select = selectElement;
            this.onChange = onChange;
            this.wrapper = null;
            this.trigger = null;
            this.dropdown = null;
            this.options = [];
            this.value = this.select.value;
            this.isOpen = false;
            this.init();
        }

        init() {
            this.select.style.display = 'none';
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'custom-select-wrapper';
            
            this.trigger = document.createElement('div');
            this.trigger.className = 'custom-select-trigger';
            this.trigger.innerHTML = `
                <span class="custom-select-value">${this.getSelectedText()}</span>
                <span class="custom-select-arrow"></span>
            `;
            
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'custom-select-dropdown';
            
            this.wrapper.appendChild(this.trigger);
            this.wrapper.appendChild(this.dropdown);
            this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling);
            
            this.populateOptions();
            this.bindEvents();
            
            // 监听原生 select 变化（用于外部更新）
            this.select.addEventListener('change', () => {
                this.setValue(this.select.value);
            });
        }

        getSelectedText() {
            const option = this.select.options[this.select.selectedIndex];
            return option ? option.textContent : '';
        }

        populateOptions() {
            this.dropdown.innerHTML = '';
            this.options = [];
            for (let i = 0; i < this.select.options.length; i++) {
                const option = this.select.options[i];
                const div = document.createElement('div');
                div.className = 'custom-select-option';
                if (i === this.select.selectedIndex) div.classList.add('selected');
                div.textContent = option.textContent;
                div.dataset.value = option.value;
                div.dataset.index = i;
                div.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectOption(i);
                    this.close();
                });
                this.dropdown.appendChild(div);
                this.options.push(div);
            }
        }

        selectOption(index) {
            if (index === this.select.selectedIndex) return;
            this.select.selectedIndex = index;
            this.value = this.select.value;
            const valueSpan = this.trigger.querySelector('.custom-select-value');
            if (valueSpan) valueSpan.textContent = this.select.options[index].textContent;
            this.options.forEach((opt, i) => opt.classList.toggle('selected', i === index));
            if (this.onChange) this.onChange(this.value);
            // 触发原生 change 事件以便其他监听器
            const changeEvent = new Event('change', { bubbles: true });
            this.select.dispatchEvent(changeEvent);
        }

        setValue(value) {
            for (let i = 0; i < this.select.options.length; i++) {
                if (this.select.options[i].value == value) {
                    this.selectOption(i);
                    break;
                }
            }
        }

        open() {
            if (this.isOpen) return;
            this.isOpen = true;
            this.trigger.classList.add('open');
            this.dropdown.classList.add('open');
            this.positionDropdown();
            this.handleOutsideClick = (e) => {
                if (!this.wrapper.contains(e.target)) this.close();
            };
            setTimeout(() => document.addEventListener('click', this.handleOutsideClick), 0);
        }

        close() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.trigger.classList.remove('open');
            this.dropdown.classList.remove('open');
            if (this.handleOutsideClick) {
                document.removeEventListener('click', this.handleOutsideClick);
            }
        }

        positionDropdown() {
            const rect = this.trigger.getBoundingClientRect();
            const dropdownHeight = this.dropdown.offsetHeight;
            const viewportHeight = window.innerHeight;
            let top = rect.bottom + 4;
            if (top + dropdownHeight > viewportHeight - 10) {
                top = rect.top - dropdownHeight - 4;
            }
            this.dropdown.style.top = `${top}px`;
            this.dropdown.style.left = `${rect.left}px`;
            this.dropdown.style.width = `${rect.width}px`;
        }

        bindEvents() {
            this.trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isOpen ? this.close() : this.open();
            });
            window.addEventListener('resize', () => { if (this.isOpen) this.positionDropdown(); });
            window.addEventListener('scroll', () => { if (this.isOpen) this.positionDropdown(); }, true);
        }

        refresh() {
            this.populateOptions();
            const valueSpan = this.trigger.querySelector('.custom-select-value');
            if (valueSpan) valueSpan.textContent = this.getSelectedText();
        }

        destroy() {
            this.close();
            this.wrapper.remove();
            this.select.style.display = '';
        }
    }

    // 全局存储自定义选择器实例
    let customSelects = {};

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `toast ${type} show`;
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.remove('show'), 2300);
    }

    function checkUrl(url) {
        try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
    }

    function autoResizeTextarea(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    function getStoredToken() { /* 略，与原 admin.js 相同 */ }
    function saveToken(tk, remember) { /* 略 */ }
    function clearToken() { /* 略 */ }
    async function refreshSession() { /* 略 */ }
    function startSessionRefresh() { /* 略 */ }
    function updateLockMessage() { /* 略 */ }
    function checkLock() { /* 略 */ }
    function recordLoginFailure() { /* 略 */ }
    function resetLoginFailure() { /* 略 */ }

    function openModal(title, formHtml, submitCb, showDelete = false, deleteCb = null) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalForm').innerHTML = formHtml;
        modalAction = submitCb;
        const buttonsContainer = document.getElementById('modalButtons');
        let html = '';
        if (showDelete && deleteCb) html += `<div class="modal-buttons-left"><button class="danger" id="modalDeleteBtn">删除</button></div>`;
        html += `<button class="secondary" id="modalCancelBtn">取消</button>
                 <button class="primary" id="modalSubmit">确认</button>`;
        buttonsContainer.innerHTML = html;
        document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
        document.getElementById('modalSubmit').addEventListener('click', handleModalSubmit);
        if (showDelete && deleteCb) {
            document.getElementById('modalDeleteBtn').addEventListener('click', async () => {
                if (confirm('确定删除？此操作不可恢复！')) { try { await deleteCb(); closeModal(); } catch (e) { showToast('删除失败', 'error'); } }
            });
        }
        document.getElementById('modal').classList.add('show');
    }

    async function handleModalSubmit() {
        if (!modalAction) return;
        const btn = document.getElementById('modalSubmit');
        btn.disabled = true;
        btn.textContent = '提交中…';
        try { await modalAction(); }
        catch (e) { showToast('操作失败', 'error'); }
        finally { btn.disabled = false; btn.textContent = '确认'; }
    }

    function closeModal() { document.getElementById('modal').classList.remove('show'); modalAction = null; }
    function closeLogModal() { document.getElementById('logModal').classList.remove('show'); }

    function addLog(text) {
        const logs = JSON.parse(sessionStorage.getItem('operation_logs') || '[]');
        logs.unshift({ time: new Date().toLocaleString(), text });
        if (logs.length > 50) logs.splice(50);
        sessionStorage.setItem('operation_logs', JSON.stringify(logs));
    }

    function showLogs() {
        const logs = JSON.parse(sessionStorage.getItem('operation_logs') || '[]');
        document.getElementById('logList').innerHTML = logs.length
            ? logs.map(l => `<div class="log-item"><span>${escapeHtml(l.time)}</span> ${escapeHtml(l.text)}</div>`).join('')
            : '<div class="empty">暂无记录</div>';
        document.getElementById('logModal').classList.add('show');
    }

    async function apiFetch(endpoint, opt = {}) {
        const headers = { 'Content-Type': 'application/json', ...opt.headers };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(API_BASE + endpoint, { ...opt, headers });
        if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
        if (res.status === 403) { showToast('IP不在白名单', 'error'); throw new Error('Forbidden'); }
        if (!res.ok) throw new Error(await res.text() || '请求失败');
        return res.json();
    }

    async function fetchSiteInfo(urlInputId, titleInputId, iconInputId, descInputId) {
        const urlInput = document.getElementById(urlInputId);
        const titleInput = document.getElementById(titleInputId);
        const iconInput = document.getElementById(iconInputId);
        const descInput = document.getElementById(descInputId);
        if (!urlInput || !titleInput || !iconInput || !descInput) return;
        let rawUrl = urlInput.value.trim();
        if (!rawUrl) { showToast('请先输入网址', 'warn'); return; }
        if (!/^https?:\/\//i.test(rawUrl)) rawUrl = 'https://' + rawUrl;
        const btn = document.getElementById('fetchInfoBtn');
        if (btn) { btn.disabled = true; btn.textContent = '获取中...'; }
        try {
            const resp = await fetch(`https://api.pearapi.ai/api/website/info/?url=${encodeURIComponent(rawUrl)}`);
            if (!resp.ok) throw new Error('失败');
            const data = await resp.json();
            if (data.code === 200 && data.data) {
                if (data.data.title) titleInput.value = data.data.title;
                if (data.data.icon) iconInput.value = data.data.icon;
                if (data.data.description) descInput.value = data.data.description;
                showToast('获取成功', 'success');
            } else showToast('无信息', 'warn');
        } catch { showToast('获取失败', 'error'); }
        finally { if (btn) { btn.disabled = false; btn.textContent = '获取信息'; } }
    }

    async function login() { /* 略，与原 admin.js 相同 */ }
    function logout() { /* 略 */ }
    async function loadAllData() { /* 略 */ }
    function selectCat(cid) { /* 略 */ }
    function selectSub(sid) { /* 略 */ }
    function renderCatBar() { /* 略 */ }
    function renderSubList() { /* 略 */ }
    function renderSiteList() { /* 略 */ }

    // ========== 投稿详情模态框（支持编辑标题、图标、描述）==========
    async function openSubmissionDetail(id) {
        currentSubmissionId = id;
        const detailModal = document.getElementById('submissionDetailModal');
        const contentDiv = document.getElementById('submissionDetailContent');
        
        const removeModalListeners = () => {
            const newCloseBtn = detailModal.querySelector('#closeDetailModalBtn');
            if (newCloseBtn) {
                const newClone = newCloseBtn.cloneNode(true);
                newCloseBtn.parentNode.replaceChild(newClone, newCloseBtn);
                newClone.onclick = () => detailModal.classList.remove('show');
            }
            detailModal.onclick = (e) => {
                if (e.target === detailModal) detailModal.classList.remove('show');
            };
        };
        
        try {
            const data = await apiFetch('/admin/submissions');
            const item = data.find(s => s.id == id);
            if (!item) { showToast('未找到该投稿', 'error'); return; }
            const vtColor = (item.vt_result || '').includes('安全') ? '#10b981' : '#ef4444';
            const iconPreview = item.icon && (item.icon.startsWith('http') || item.icon.startsWith('https'))
                ? `<img src="${escapeHtml(item.icon)}" style="width:20px;height:20px;vertical-align:middle;border-radius:4px;">`
                : `<i class="${escapeHtml(item.icon || 'fas fa-link')}"></i>`;
            
            // 可编辑字段：标题、描述、图标使用 input/textarea
            let html = `
                <div class="info-card">
                    <div class="info-row"><div class="info-label">标题</div><div class="info-value"><input type="text" id="editTitle" value="${escapeHtml(item.title)}" class="form-input" style="width:100%;" /></div></div>
                    <div class="info-row"><div class="info-label">网址</div><div class="info-value"><a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.url)}</a></div></div>
                    <div class="info-row"><div class="info-label">图标</div><div class="info-value"><input type="text" id="editIcon" value="${escapeHtml(item.icon || '')}" class="form-input" style="width:100%;" placeholder="请输入图标URL或FontAwesome类名" /></div></div>
                    <div class="info-row"><div class="info-label">描述</div><div class="info-value"><textarea id="editDesc" rows="2" class="form-input" style="width:100%; resize: vertical;">${escapeHtml(item.description || '')}</textarea></div></div>
                    <div class="info-row"><div class="info-label">提交者</div><div class="info-value">${escapeHtml(item.submitter_ip)}</div></div>
                    <div class="info-row"><div class="info-label">提交时间</div><div class="info-value">${new Date(item.submit_time).toLocaleString()}</div></div>
                    <div class="info-row"><div class="info-label">安全检测</div><div class="info-value"><span style="color:${vtColor}">${escapeHtml(item.vt_result || '未检测')}</span></div></div>
                </div>
                <div class="action-card" style="margin-top:8px;">
                    <button class="primary" id="saveEditBtn">💾 保存修改</button>
                </div>
            `;
            html += `
                <div class="action-section">
                    <div class="action-card"><h4><i class="fas fa-check-circle"></i> 通过收录</h4>
                        <div class="inline-select-group">
                            <div class="custom-select-wrapper" id="approveCatSelectWrapper"></div>
                            <div class="custom-select-wrapper" id="approveSubSelectWrapper"></div>
                            <input type="number" id="approveOrder" placeholder="排序" value="0" class="form-input" style="width:80px;">
                        </div>
                        <button class="btn-approve" id="doApproveBtn">✓ 通过并收录</button>
                    </div>
                    <div class="action-card"><h4><i class="fas fa-ban"></i> 拒绝投稿</h4>
                        <button class="btn-reject" id="doRejectBtn">✗ 拒绝（删除投稿）</button>
                    </div>
                </div>
            `;
            contentDiv.innerHTML = html;
            
            // 初始化文本域自动调整高度
            const descTextarea = document.getElementById('editDesc');
            if (descTextarea) {
                autoResizeTextarea(descTextarea);
                descTextarea.addEventListener('input', function() { autoResizeTextarea(this); });
            }
            
            // 保存修改按钮
            const saveBtn = document.getElementById('saveEditBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', async () => {
                    const newTitle = document.getElementById('editTitle').value.trim();
                    if (!newTitle) { showToast('标题不能为空', 'error'); return; }
                    await editSubmission(item.id, newTitle, document.getElementById('editDesc').value.trim(), document.getElementById('editIcon').value.trim());
                    // 刷新详情显示
                    openSubmissionDetail(id);
                    showToast('修改已保存', 'success');
                });
            }
            
            // 构建自定义选择器（分类和子分类）
            // 一级分类下拉
            const catSelect = document.createElement('select');
            catSelect.id = 'approveCatSelect';
            catSelect.innerHTML = '<option value="">选择一级分类</option>' + categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
            const catWrapper = document.getElementById('approveCatSelectWrapper');
            catWrapper.innerHTML = '';
            catWrapper.appendChild(catSelect);
            let catCustomSelect = new CustomSelect(catSelect, async (value) => {
                // 清空子分类下拉
                const subSelect = document.getElementById('approveSubSelect');
                if (subSelect) {
                    const subWrapper = document.getElementById('approveSubSelectWrapper');
                    subWrapper.innerHTML = '';
                    const newSubSelect = document.createElement('select');
                    newSubSelect.id = 'approveSubSelect';
                    newSubSelect.innerHTML = '<option value="">先选择一级分类</option>';
                    subWrapper.appendChild(newSubSelect);
                    if (customSelects.sub) customSelects.sub.destroy();
                    customSelects.sub = new CustomSelect(newSubSelect);
                }
                if (value) {
                    try {
                        const subsData = await apiFetch(`/admin/subcategories?category_id=${value}`);
                        const subSelectEl = document.getElementById('approveSubSelect');
                        if (subSelectEl) {
                            subSelectEl.innerHTML = '<option value="">选择二级分类</option>' + subsData.map(sub => `<option value="${sub.id}">${escapeHtml(sub.name)}</option>`).join('');
                            if (customSelects.sub) customSelects.sub.refresh();
                        }
                    } catch (e) { showToast('加载子分类失败', 'error'); }
                }
            });
            customSelects.cat = catCustomSelect;
            
            // 子分类下拉（初始为空）
            const subWrapper = document.getElementById('approveSubSelectWrapper');
            const subSelect = document.createElement('select');
            subSelect.id = 'approveSubSelect';
            subSelect.innerHTML = '<option value="">先选择一级分类</option>';
            subWrapper.innerHTML = '';
            subWrapper.appendChild(subSelect);
            let subCustomSelect = new CustomSelect(subSelect);
            customSelects.sub = subCustomSelect;
            
            // 通过收录按钮
            document.getElementById('doApproveBtn').onclick = async () => {
                const catId = catSelect.value;
                const subId = subSelect.value;
                if (!catId || !subId) { showToast('请选择一级分类和二级分类', 'error'); return; }
                const displayOrder = document.getElementById('approveOrder').value || 0;
                try {
                    await apiFetch(`/admin/submissions/${id}/approve`, { method: 'POST', body: JSON.stringify({ subcategory_id: parseInt(subId), display_order: parseInt(displayOrder) }) });
                    showToast('已通过并收录', 'success');
                    detailModal.classList.remove('show');
                    await loadSubmissions();
                    await loadAllData();
                    await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                } catch (err) { showToast('操作失败', 'error'); }
            };
            
            // 拒绝按钮
            document.getElementById('doRejectBtn').onclick = async () => {
                if (!confirm('确定要拒绝该投稿吗？拒绝后将永久删除，用户不可修改')) return;
                try {
                    await apiFetch(`/admin/submissions/${id}`, { method: 'DELETE' });
                    showToast('已拒绝并删除', 'success');
                    detailModal.classList.remove('show');
                    await loadSubmissions();
                } catch (err) { showToast('操作失败', 'error'); }
            };
            
            removeModalListeners();
            detailModal.classList.add('show');
        } catch (err) { showToast('加载详情失败', 'error'); }
    }

    async function editSubmission(id, newTitle, newDesc, newIcon) {
        try {
            await apiFetch(`/admin/submissions/${id}`, { method: 'PUT', body: JSON.stringify({ title: newTitle, description: newDesc, icon: newIcon }) });
            return true;
        } catch (err) { showToast('更新失败', 'error'); return false; }
    }

    function handleModifyCategory(id, currentName) { /* 略 */ }
    function handleModifySub(id, currentName) { /* 略 */ }
    async function handleEditSite(id) { /* 略 */ }
    function handleAddCategory() { /* 略 */ }
    function handleAddSub() { /* 略 */ }
    function handleAddSite() { /* 略 */ }
    async function loadRanking() { /* 略 */ }
    async function loadFeedback() { /* 略 */ }
    async function markDoneHandler(e) { /* 略 */ }
    async function replaceLinkHandler(e) { /* 略 */ }
    function exportData() { /* 略 */ }
    async function refreshNavigation() { /* 略 */ }
    async function loadSubmissions() {
        const list = document.getElementById('submissionsList');
        list.innerHTML = '<div class="empty">加载中...</div>';
        try {
            const data = await apiFetch('/admin/submissions');
            if (!data.length) { list.innerHTML = '<div class="empty">暂无待审核网站</div>'; return; }
            list.innerHTML = data.map(item => `
                <div class="link-item" style="display:flex;justify-content:space-between;align-items:center;">
                    <span><strong class="submission-title-truncate" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong></span>
                    <button class="sm primary" data-action="viewSubmission" data-id="${item.id}">查看</button>
                </div>
            `).join('');
            list.querySelectorAll('[data-action="viewSubmission"]').forEach(btn => {
                btn.addEventListener('click', () => openSubmissionDetail(btn.dataset.id));
            });
        } catch (e) { list.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    function setupEventDelegation() {
        // ... 与原 admin.js 相同，注意绑定打开投稿详情的事件
        document.getElementById('catBar').addEventListener('click', e => { /* ... */ });
        document.getElementById('subList').addEventListener('click', e => { /* ... */ });
        document.getElementById('siteList').addEventListener('click', e => { /* ... */ });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                document.getElementById(`${tab}Tab`).classList.remove('hidden');
                if (tab === 'rank') loadRanking();
                if (tab === 'feedback') loadFeedback();
                if (tab === 'submissions') loadSubmissions();
            });
        });
        document.getElementById('loginBtn').addEventListener('click', login);
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('addCategoryBtn').addEventListener('click', handleAddCategory);
        document.getElementById('addSubBtn').addEventListener('click', handleAddSub);
        document.getElementById('addSiteBtn').addEventListener('click', handleAddSite);
        document.getElementById('exportBtn').addEventListener('click', exportData);
        document.getElementById('logBtn').addEventListener('click', showLogs);
        document.getElementById('sortRankBtn').addEventListener('click', loadRanking);
        document.getElementById('refreshFeedbackBtn').addEventListener('click', loadFeedback);
        document.getElementById('refreshSubmissionsBtn').addEventListener('click', loadSubmissions);
        document.getElementById('refreshNavBtn').addEventListener('click', refreshNavigation);
        document.getElementById('closeLogBtn').addEventListener('click', closeLogModal);
        document.getElementById('tokenInput').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
        document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) closeModal(); });
        document.getElementById('logModal').addEventListener('click', e => { if (e.target === document.getElementById('logModal')) closeLogModal(); });
        
        const detailModal = document.getElementById('submissionDetailModal');
        if (detailModal) {
            const closeBtn = detailModal.querySelector('#closeDetailModalBtn');
            if (closeBtn) closeBtn.onclick = () => detailModal.classList.remove('show');
            detailModal.onclick = (e) => { if (e.target === detailModal) detailModal.classList.remove('show'); };
        }
    }

    injectGlobalStyles();
    const storedToken = getStoredToken();
    if (storedToken) {
        token = storedToken;
        (async () => {
            try {
                await apiFetch('/admin/categories');
                document.getElementById('tokenInput').style.display = 'none';
                document.getElementById('loginBtn').classList.add('hidden');
                document.getElementById('logoutBtn').classList.remove('hidden');
                document.getElementById('mainContent').classList.remove('hidden');
                document.querySelector('.remember-checkbox').style.display = 'none';
                await loadAllData();
                startSessionRefresh();
            } catch (e) { logout(); }
        })();
    }

    setInterval(() => {
        const exp = sessionStorage.getItem('admin_expires');
        if (exp && Date.now() > parseInt(exp, 10) - 60000) showToast('登录即将过期', 'warn');
    }, 30000);

    updateLockMessage();
    setupEventDelegation();
})();