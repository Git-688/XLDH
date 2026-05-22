(function() {
    const API_BASE = (window.APP_CONFIG?.API_BASE) || 'https://api.xjdh688.ccwu.cc';
    const TOKEN_EXPIRE_HOURS = 1;
    const MAX_FAIL_COUNT = 5;
    const LOCK_DURATION_MS = 10 * 60 * 1000;

    let token = '';
    let categories = [], subcategories = [], sites = [];
    let currentCat = null, currentSub = null;
    let failCount = parseInt(sessionStorage.getItem('login_fail_count') || '0', 10);
    let lockUntil = parseInt(sessionStorage.getItem('login_lock_until') || '0', 10);
    let modalAction = null;
    let currentSubmissionId = null;

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

    function getStoredToken() {
        let tk = sessionStorage.getItem('admin_token');
        if (tk) {
            const exp = sessionStorage.getItem('admin_expires');
            if (exp && Date.now() < parseInt(exp, 10)) return tk;
            sessionStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_expires');
        }
        const rem = localStorage.getItem('admin_remember');
        if (rem === 'true') {
            tk = localStorage.getItem('admin_token_saved');
            const savedTime = localStorage.getItem('admin_saved_time');
            if (tk && savedTime && (Date.now() - parseInt(savedTime, 10) < TOKEN_EXPIRE_HOURS * 3600000)) {
                sessionStorage.setItem('admin_token', tk);
                sessionStorage.setItem('admin_expires', Date.now() + TOKEN_EXPIRE_HOURS * 3600000 + '');
                return tk;
            } else {
                localStorage.removeItem('admin_token_saved'); localStorage.removeItem('admin_saved_time'); localStorage.removeItem('admin_remember');
            }
        }
        return '';
    }

    function saveToken(tk, remember) {
        const exp = Date.now() + TOKEN_EXPIRE_HOURS * 3600000;
        sessionStorage.setItem('admin_token', tk); sessionStorage.setItem('admin_expires', exp + '');
        if (remember) {
            localStorage.setItem('admin_remember', 'true'); localStorage.setItem('admin_token_saved', tk); localStorage.setItem('admin_saved_time', Date.now() + '');
        } else {
            localStorage.removeItem('admin_remember'); localStorage.removeItem('admin_token_saved'); localStorage.removeItem('admin_saved_time');
        }
    }

    function clearToken() {
        sessionStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_expires');
        localStorage.removeItem('admin_remember'); localStorage.removeItem('admin_token_saved'); localStorage.removeItem('admin_saved_time');
    }

    function updateLockMessage() {
        const el = document.getElementById('loginLockMessage');
        if (!el) return;
        if (Date.now() < lockUntil) el.textContent = `登录锁定中，剩余 ${Math.ceil((lockUntil - Date.now()) / 60000)} 分钟`;
        else el.textContent = '';
    }

    function checkLock() {
        if (Date.now() < lockUntil) { updateLockMessage(); showToast('登录失败过多，锁定10分钟', 'error'); return false; }
        if (failCount >= MAX_FAIL_COUNT) {
            lockUntil = Date.now() + LOCK_DURATION_MS;
            sessionStorage.setItem('login_lock_until', lockUntil + ''); sessionStorage.setItem('login_fail_count', failCount + '');
            updateLockMessage(); showToast('失败5次，锁定10分钟', 'error'); return false;
        }
        return true;
    }

    function recordLoginFailure() {
        failCount++; sessionStorage.setItem('login_fail_count', failCount + '');
        if (failCount >= MAX_FAIL_COUNT) {
            lockUntil = Date.now() + LOCK_DURATION_MS; sessionStorage.setItem('login_lock_until', lockUntil + ''); updateLockMessage();
        }
    }

    function resetLoginFailure() {
        failCount = 0; lockUntil = 0;
        sessionStorage.removeItem('login_fail_count'); sessionStorage.removeItem('login_lock_until');
        document.getElementById('loginLockMessage').textContent = '';
    }

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
        btn.disabled = true; btn.textContent = '提交中…';
        try { await modalAction(); } catch (e) { showToast('操作失败', 'error'); }
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

    async function login() {
        if (!checkLock()) return;
        const val = document.getElementById('tokenInput').value.trim();
        if (!val) { showToast('请输入Token', 'error'); return; }
        const btn = document.getElementById('loginBtn');
        btn.disabled = true; btn.textContent = '登录中…';
        token = val;
        try {
            await apiFetch('/admin/categories');
            resetLoginFailure();
            const remember = document.getElementById('rememberToken').checked;
            saveToken(val, remember);
            document.getElementById('tokenInput').style.display = 'none';
            document.getElementById('loginBtn').classList.add('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
            document.querySelector('.remember-checkbox').style.display = 'none';
            await loadAllData();
            addLog('管理员登录');
            showToast('登录成功' + (remember ? '（已记住密码）' : ''));
        } catch (e) {
            token = ''; recordLoginFailure();
            showToast(e.message === 'Unauthorized' ? 'Token无效' : '登录失败', 'error');
        } finally { btn.disabled = false; btn.textContent = '登录'; }
    }

    function logout() {
        token = ''; clearToken();
        document.getElementById('loginBtn').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('tokenInput').style.display = 'block';
        document.getElementById('tokenInput').value = '';
        document.querySelector('.remember-checkbox').style.display = 'block';
        addLog('退出登录'); showToast('已退出');
    }

    async function loadAllData() {
        try {
            const [catData, subData, siteData] = await Promise.all([
                apiFetch('/admin/categories'), apiFetch('/admin/subcategories'), apiFetch('/admin/sites')
            ]);
            categories = catData; subcategories = subData; sites = siteData;
            renderCatBar();
            if (categories.length > 0) selectCat(categories[0].id);
            addLog('数据加载完成');
        } catch (e) {
            if (e.message === 'Unauthorized') logout();
            else showToast('数据加载失败', 'error');
        }
    }

    function selectCat(cid) {
        currentCat = cid; currentSub = null;
        document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`.cat-item[data-cid="${cid}"]`);
        if (target) target.classList.add('active');
        renderSubList();
        const subs = subcategories.filter(s => s.category_id === cid);
        if (subs.length > 0) selectSub(subs[0].id);
        else document.getElementById('siteList').innerHTML = '<div class="empty">请先添加子分类</div>';
    }

    function selectSub(sid) {
        currentSub = sid;
        document.querySelectorAll('.sub-item').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`.sub-item[data-sid="${sid}"]`);
        if (target) target.classList.add('active');
        renderSiteList();
    }

    function renderCatBar() {
        if (!categories.length) { document.getElementById('catBar').innerHTML = '<div class="empty">暂无分类</div>'; return; }
        document.getElementById('catBar').innerHTML = categories.map(c => `
            <div class="cat-item ${c.id===currentCat?'active':''}" data-cid="${c.id}">
                <span>${escapeHtml(c.name)}</span>
                <button class="rename-text-btn" data-action="modifyCat" data-id="${c.id}" data-name="${escapeHtml(c.name)}">修改</button>
            </div>
        `).join('');
    }

    function renderSubList() {
        if (!currentCat) { document.getElementById('subList').innerHTML = '<div class="empty">选择分类</div>'; return; }
        const subs = subcategories.filter(s => s.category_id === currentCat);
        if (!subs.length) { document.getElementById('subList').innerHTML = '<div class="empty">暂无子分类</div>'; return; }
        document.getElementById('subList').innerHTML = subs.map(s => `
            <div class="sub-item ${s.id===currentSub?'active':''}" data-sid="${s.id}">
                <span>${escapeHtml(s.name)}</span>
                <button class="rename-text-btn" data-action="modifySub" data-id="${s.id}" data-name="${escapeHtml(s.name)}">修改</button>
            </div>
        `).join('');
    }

    function renderSiteList() {
        if (!currentSub) { document.getElementById('siteList').innerHTML = '<div class="empty">选择子分类</div>'; return; }
        const list = sites.filter(s => s.subcategory_id === currentSub);
        if (!list.length) { document.getElementById('siteList').innerHTML = '<div class="empty">暂无链接</div>'; return; }
        document.getElementById('siteList').innerHTML = list.map(s => `
            <div class="link-item">
                <div class="link-info"><div><strong>${escapeHtml(s.title)}</strong></div></div>
                <div class="link-actions"><button class="primary" data-action="editSite" data-id="${s.id}">编辑</button></div>
            </div>
        `).join('');
    }

    // ========== 投稿详情模态框（移除拒绝原因输入框） ==========
    async function openSubmissionDetail(id) {
        currentSubmissionId = id;
        const detailModal = document.getElementById('submissionDetailModal');
        const contentDiv = document.getElementById('submissionDetailContent');
        
        try {
            const data = await apiFetch('/admin/submissions');
            const item = data.find(s => s.id == id);
            if (!item) { showToast('未找到该投稿', 'error'); return; }
            
            let statusClass = '', statusText = '';
            if (item.status === 'approved') { statusClass = 'status-approved'; statusText = '已通过'; }
            else if (item.status === 'rejected') { statusClass = 'status-rejected'; statusText = '已拒绝'; }
            else { statusClass = 'status-pending'; statusText = '待审核'; }
            
            const vtColor = (item.vt_result || '').includes('安全') ? '#10b981' : '#ef4444';
            const iconPreview = item.icon && (item.icon.startsWith('http') || item.icon.startsWith('https'))
                ? `<img src="${escapeHtml(item.icon)}" style="width:20px;height:20px;vertical-align:middle;border-radius:4px;">`
                : `<i class="${escapeHtml(item.icon || 'fas fa-link')}"></i>`;
            
            let html = `
                <div class="info-card">
                    <div class="info-row">
                        <div class="info-label">标题</div>
                        <div class="info-value">${escapeHtml(item.title)} ${iconPreview}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">网址</div>
                        <div class="info-value"><a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.url)}</a></div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">图标</div>
                        <div class="info-value">${escapeHtml(item.icon || '无')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">描述</div>
                        <div class="info-value">${escapeHtml(item.description || '无')}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">提交者</div>
                        <div class="info-value">${escapeHtml(item.submitter_ip)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">提交时间</div>
                        <div class="info-value">${new Date(item.submit_time).toLocaleString()}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">安全检测</div>
                        <div class="info-value">
                            <span style="color:${vtColor}">${escapeHtml(item.vt_result || '未检测')}</span>
                        </div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">状态</div>
                        <div class="info-value"><span class="status-badge ${statusClass}">${statusText}</span></div>
                    </div>
                </div>
            `;
            
            // 如果投稿为待审核，增加编辑卡片
            if (item.status === 'pending') {
                html += `
                    <div class="action-card" id="editSubmissionCard">
                        <h4><i class="fas fa-edit"></i> 编辑投稿内容</h4>
                        <div class="form-row">
                            <label>标题 <span style="color:red;">*</span></label>
                            <input type="text" id="editTitle" value="${escapeHtml(item.title)}" style="width:100%;">
                        </div>
                        <div class="form-row">
                            <label>描述</label>
                            <textarea id="editDesc" rows="2" style="width:100%;">${escapeHtml(item.description || '')}</textarea>
                        </div>
                        <div class="form-row">
                            <label>图标URL</label>
                            <input type="text" id="editIcon" value="${escapeHtml(item.icon || '')}" style="width:100%;">
                        </div>
                        <button class="primary" id="saveEditBtn" style="margin-top:8px;">保存修改</button>
                    </div>
                `;
            }
            
            // 操作卡片（通过收录 + 拒绝，拒绝不再需要填写原因）
            html += `
                <div class="action-section">
                    <div class="action-card">
                        <h4><i class="fas fa-check-circle"></i> 通过收录</h4>
                        <div class="inline-select-group">
                            <select id="approveCatSelect">
                                <option value="">选择一级分类</option>
                                ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                            </select>
                            <select id="approveSubSelect" disabled>
                                <option value="">先选择一级分类</option>
                            </select>
                            <input type="number" id="approveOrder" placeholder="排序" value="0" style="width:80px;">
                        </div>
                        <button class="btn-approve" id="doApproveBtn">✓ 通过并收录</button>
                    </div>
                    <div class="action-card">
                        <h4><i class="fas fa-ban"></i> 拒绝投稿</h4>
                        <button class="btn-reject" id="doRejectBtn">✗ 拒绝</button>
                    </div>
                </div>
            `;
            
            contentDiv.innerHTML = html;
            
            // 编辑保存事件
            if (item.status === 'pending') {
                const saveBtn = document.getElementById('saveEditBtn');
                if (saveBtn) {
                    saveBtn.addEventListener('click', async () => {
                        const newTitle = document.getElementById('editTitle').value.trim();
                        if (!newTitle) {
                            showToast('标题不能为空', 'error');
                            return;
                        }
                        const newDesc = document.getElementById('editDesc').value.trim();
                        const newIcon = document.getElementById('editIcon').value.trim();
                        await editSubmission(item.id, newTitle, newDesc, newIcon);
                        openSubmissionDetail(id);
                    });
                }
            }
            
            // 分类联动
            const catSelect = document.getElementById('approveCatSelect');
            const subSelect = document.getElementById('approveSubSelect');
            catSelect.addEventListener('change', async (e) => {
                const catId = e.target.value;
                if (!catId) {
                    subSelect.innerHTML = '<option value="">先选择一级分类</option>';
                    subSelect.disabled = true;
                    return;
                }
                subSelect.disabled = false;
                subSelect.innerHTML = '<option value="">加载中...</option>';
                try {
                    const subs = await apiFetch(`/admin/subcategories?category_id=${catId}`);
                    subSelect.innerHTML = '<option value="">选择二级分类</option>' + 
                        subs.map(sub => `<option value="${sub.id}">${escapeHtml(sub.name)}</option>`).join('');
                } catch {
                    subSelect.innerHTML = '<option value="">加载失败</option>';
                }
            });
            
            // 通过按钮
            document.getElementById('doApproveBtn').onclick = async () => {
                const subId = subSelect.value;
                const displayOrder = document.getElementById('approveOrder').value || 0;
                if (!subId) { showToast('请选择二级分类', 'error'); return; }
                try {
                    await apiFetch(`/admin/submissions/${id}/approve`, {
                        method: 'POST',
                        body: JSON.stringify({ subcategory_id: parseInt(subId), display_order: parseInt(displayOrder) })
                    });
                    showToast('已通过并收录', 'success');
                    detailModal.classList.remove('show');
                    await loadSubmissions();
                    await loadAllData();
                    await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                } catch (err) {
                    showToast('操作失败', 'error');
                }
            };
            
            // 拒绝按钮（不再需要输入原因）
            document.getElementById('doRejectBtn').onclick = async () => {
                if (!confirm('确定要拒绝该投稿吗？')) return;
                try {
                    await apiFetch(`/admin/submissions/${id}/reject`, {
                        method: 'POST',
                        body: JSON.stringify({ reason: '' }) // 传递空字符串或 null，Worker 中可忽略
                    });
                    showToast('已拒绝', 'success');
                    detailModal.classList.remove('show');
                    await loadSubmissions();
                } catch (err) {
                    showToast('操作失败', 'error');
                }
            };
            
            detailModal.classList.add('show');
        } catch (err) {
            showToast('加载详情失败', 'error');
        }
    }

    // 编辑投稿函数（供编辑卡片使用）
    async function editSubmission(id, newTitle, newDesc, newIcon) {
        try {
            await apiFetch(`/admin/submissions/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ title: newTitle, description: newDesc, icon: newIcon })
            });
            showToast('投稿已更新', 'success');
            await loadSubmissions();
            return true;
        } catch (err) {
            showToast('更新失败', 'error');
            return false;
        }
    }

    // 关闭详情模态框
    document.getElementById('closeDetailModalBtn')?.addEventListener('click', () => {
        document.getElementById('submissionDetailModal').classList.remove('show');
    });
    document.getElementById('submissionDetailModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('submissionDetailModal')) {
            e.target.classList.remove('show');
        }
    });

    // ========== 管理操作 ==========
    function handleModifyCategory(id, currentName) {
        openModal('修改分类',
            `<div class="form-row"><label>名称</label><input id="mName" value="${escapeHtml(currentName)}"></div>`,
            async () => {
                const name = document.getElementById('mName').value.trim();
                if (!name) { showToast('名称不能为空', 'error'); return; }
                await apiFetch(`/admin/categories/${id}`, { method:'PUT', body: JSON.stringify({ name }) });
                addLog(`修改分类：${currentName} → ${name}`); showToast('修改成功'); await loadAllData();
            },
            true,
            async () => { await apiFetch(`/admin/categories/${id}`, { method:'DELETE' }); addLog(`删除分类 ${id}`); showToast('分类已删除'); await loadAllData(); }
        );
    }

    function handleModifySub(id, currentName) {
        openModal('修改子分类',
            `<div class="form-row"><label>名称</label><input id="mName" value="${escapeHtml(currentName)}"></div>`,
            async () => {
                const name = document.getElementById('mName').value.trim();
                if (!name) { showToast('名称不能为空', 'error'); return; }
                await apiFetch(`/admin/subcategories/${id}`, { method:'PUT', body: JSON.stringify({ name }) });
                addLog(`修改子分类：${currentName} → ${name}`); showToast('修改成功'); await loadAllData();
            },
            true,
            async () => { await apiFetch(`/admin/subcategories/${id}`, { method:'DELETE' }); addLog(`删除子分类 ${id}`); showToast('子分类已删除'); await loadAllData(); }
        );
    }

    async function handleEditSite(id) {
        const site = sites.find(s => s.id === id);
        if (!site) return;
        openModal('编辑链接',
            `<div class="form-row"><label>标题</label><input id="mTitle" value="${escapeHtml(site.title)}"></div>
             <div class="form-row"><label>网址</label><div style="display:flex;gap:4px;align-items:center"><input id="mUrl" value="${escapeHtml(site.url)}"><button type="button" id="fetchInfoBtn" class="fetch-info-btn">获取信息</button></div></div>
             <div class="form-row"><label>图标</label><input id="mIcon" value="${escapeHtml(site.icon||'fas fa-link')}"></div>
             <div class="form-row"><label>描述</label><input id="mDesc" value="${escapeHtml(site.description||'')}"></div>
             <div class="form-row"><label>排序</label><input type="number" id="mSort" value="${site.display_order}"></div>`,
            async () => {
                const title = document.getElementById('mTitle').value.trim();
                const url = document.getElementById('mUrl').value.trim();
                if (!title || !url) { showToast('标题和网址必填', 'error'); return; }
                if (!checkUrl(url)) { showToast('网址格式错误，仅支持 http/https', 'error'); return; }
                await apiFetch(`/admin/sites/${id}`, { method:'PUT', body: JSON.stringify({
                    title, url, description: document.getElementById('mDesc').value,
                    icon: document.getElementById('mIcon').value, display_order: +document.getElementById('mSort').value
                })});
                addLog(`编辑链接：${site.title}`); showToast('修改成功'); await loadAllData();
            },
            true,
            async () => { await apiFetch(`/admin/sites/${id}`, { method:'DELETE' }); addLog(`删除链接 ${id}`); showToast('删除成功'); await loadAllData(); }
        );
        setTimeout(() => {
            const fetchBtn = document.getElementById('fetchInfoBtn');
            if (fetchBtn) fetchBtn.addEventListener('click', () => fetchSiteInfo('mUrl','mTitle','mIcon','mDesc'));
        }, 50);
    }

    function handleAddCategory() {
        openModal('新增一级分类',
            `<div class="form-row"><label>名称</label><input id="mName"></div>
             <div class="form-row"><label>排序</label><input type="number" id="mSort" value="${categories.length}"></div>`,
            async () => {
                const name = document.getElementById('mName').value.trim();
                if (!name) { showToast('名称不能为空', 'error'); return; }
                await apiFetch('/admin/categories', { method:'POST', body: JSON.stringify({ name, display_order: +document.getElementById('mSort').value }) });
                addLog(`新增分类：${name}`); showToast('添加成功'); await loadAllData();
            }
        );
    }

    function handleAddSub() {
        if (!currentCat) { showToast('请先选择一级分类', 'error'); return; }
        openModal('新增子分类',
            `<div class="form-row"><label>名称</label><input id="mName"></div>
             <div class="form-row"><label>排序</label><input type="number" id="mSort" value="0"></div>`,
            async () => {
                const name = document.getElementById('mName').value.trim();
                if (!name) { showToast('名称不能为空', 'error'); return; }
                await apiFetch('/admin/subcategories', { method:'POST', body: JSON.stringify({ category_id: currentCat, name, display_order: +document.getElementById('mSort').value }) });
                addLog(`新增子分类：${name}`); showToast('添加成功'); await loadAllData();
            }
        );
    }

    function handleAddSite() {
        if (!currentSub) { showToast('请先选择子分类', 'error'); return; }
        openModal('新增链接',
            `<div class="form-row"><label>标题</label><input id="mTitle"></div>
             <div class="form-row"><label>网址</label><div style="display:flex;gap:4px;align-items:center"><input id="mUrl"><button type="button" id="fetchInfoBtn" class="fetch-info-btn">获取信息</button></div></div>
             <div class="form-row"><label>图标</label><input id="mIcon" value="fas fa-link"></div>
             <div class="form-row"><label>描述</label><input id="mDesc"></div>
             <div class="form-row"><label>排序</label><input type="number" id="mSort" value="0"></div>`,
            async () => {
                const title = document.getElementById('mTitle').value.trim();
                const url = document.getElementById('mUrl').value.trim();
                if (!title || !url) { showToast('标题和网址必填', 'error'); return; }
                if (!checkUrl(url)) { showToast('网址格式错误，仅支持 http/https', 'error'); return; }
                await apiFetch('/admin/sites', { method:'POST', body: JSON.stringify({
                    subcategory_id: currentSub, title, url, description: document.getElementById('mDesc').value,
                    icon: document.getElementById('mIcon').value, display_order: +document.getElementById('mSort').value
                })});
                addLog(`新增链接：${title}`); showToast('添加成功'); await loadAllData();
            }
        );
        setTimeout(() => {
            const fetchBtn = document.getElementById('fetchInfoBtn');
            if (fetchBtn) fetchBtn.addEventListener('click', () => fetchSiteInfo('mUrl','mTitle','mIcon','mDesc'));
        }, 50);
    }

    async function loadRanking() {
        const list = document.getElementById('rankList');
        list.innerHTML = '<div class="empty">加载中...</div>';
        try {
            const data = await apiFetch('/admin/topclicks?limit=20');
            if (!data.length) { list.innerHTML = '<div class="empty">暂无数据</div>'; return; }
            list.innerHTML = data.map(item => `
                <div class="link-item">
                    <div class="link-info"><strong>${escapeHtml(item.title)}</strong></div>
                    <span class="badge badge-blue">${item.count}次</span>
                </div>
            `).join('');
        } catch { list.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    async function loadFeedback() {
        const list = document.getElementById('feedbackList');
        list.innerHTML = '<div class="empty">加载中...</div>';
        try {
            const data = await apiFetch('/admin/dead-link-reports');
            if (!data.length) {
                list.innerHTML = '<div class="empty">暂无反馈</div>';
                return;
            }
            const today = new Date(); today.setHours(0,0,0,0);
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
            const groups = { today:[], yesterday:[], older:[] };
            data.forEach(item => {
                const d = new Date(item.report_time); d.setHours(0,0,0,0);
                if (d.getTime()===today.getTime()) groups.today.push(item);
                else if (d.getTime()===yesterday.getTime()) groups.yesterday.push(item);
                else groups.older.push(item);
            });
            let html = '';
            const renderItems = (items) => items.map(item => `
                <div class="link-item">
                    <div class="link-info"><strong>${escapeHtml(item.title||'无标题')}</strong><div class="link-url" style="display:none;">${escapeHtml(item.url)}</div><div style="font-size:10px;color:#999">来自 ${escapeHtml(item.reporter_ip)} 于 ${new Date(item.report_time).toLocaleString()}</div></div>
                    <div class="link-actions">
                        <button class="sm primary" data-action="replaceLink" data-reportid="${item.id}" data-siteid="${item.site_id||0}" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(item.title||'')}">更换链接</button>
                        <button class="sm primary" data-action="markDone" data-reportid="${item.id}">标记已处理</button>
                    </div>
                </div>
            `).join('');
            if (groups.today.length) html += `<div class="feedback-date-group"><h4>📅 今天</h4>${renderItems(groups.today)}</div>`;
            if (groups.yesterday.length) html += `<div class="feedback-date-group"><h4>📅 昨天</h4>${renderItems(groups.yesterday)}</div>`;
            if (groups.older.length) html += `<div class="feedback-date-group"><h4>📅 更早</h4>${renderItems(groups.older)}</div>`;
            list.innerHTML = html;

            list.querySelectorAll('[data-action="markDone"]').forEach(btn => {
                btn.removeEventListener('click', markDoneHandler);
                btn.addEventListener('click', markDoneHandler);
            });
            list.querySelectorAll('[data-action="replaceLink"]').forEach(btn => {
                btn.removeEventListener('click', replaceLinkHandler);
                btn.addEventListener('click', replaceLinkHandler);
            });
        } catch { list.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    async function markDoneHandler(e) {
        const btn = e.currentTarget;
        const reportId = parseInt(btn.dataset.reportid);
        try {
            await apiFetch(`/admin/report-status/${reportId}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) });
            showToast('已标记处理', 'success');
            await loadFeedback();
        } catch {
            showToast('操作失败', 'error');
        }
    }

    async function replaceLinkHandler(e) {
        const btn = e.currentTarget;
        const reportId = parseInt(btn.dataset.reportid);
        const siteId = parseInt(btn.dataset.siteid);
        if (!siteId) {
            showToast('未找到网站记录', 'error');
            return;
        }
        const site = sites.find(s => s.id === siteId);
        if (!site) {
            showToast('未找到网站记录', 'error');
            return;
        }
        openModal('更换链接',
            `<div class="form-row"><label>标题</label><input id="mTitle" value="${escapeHtml(site.title)}"></div>
             <div class="form-row"><label>网址</label><input id="mUrl" value="${escapeHtml(site.url)}"></div>
             <div class="form-row"><label>描述</label><input id="mDesc" value="${escapeHtml(site.description||'')}"></div>
             <div class="form-row"><label>图标</label><input id="mIcon" value="${escapeHtml(site.icon||'fas fa-link')}"></div>`,
            async () => {
                const newTitle = document.getElementById('mTitle').value.trim();
                const newUrl = document.getElementById('mUrl').value.trim();
                if (!newTitle || !newUrl) {
                    showToast('标题和网址不能为空', 'error');
                    return;
                }
                if (!checkUrl(newUrl)) {
                    showToast('网址格式错误，仅支持 http/https', 'error');
                    return;
                }
                await apiFetch('/admin/replace-link', {
                    method: 'POST',
                    body: JSON.stringify({
                        reportId,
                        siteId,
                        newUrl,
                        newTitle,
                        newDescription: document.getElementById('mDesc').value,
                        newIcon: document.getElementById('mIcon').value
                    })
                });
                showToast('链接已更新', 'success');
                await loadFeedback();
                await loadAllData();
                await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                closeModal();
            }
        );
    }

    function exportData() {
        const blob = new Blob([JSON.stringify({ categories, subcategories, sites, time: new Date().toLocaleString() }, null, 2)], { type:'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `导航备份_${Date.now()}.json`;
        a.click();
        addLog('导出备份'); showToast('导出成功');
    }

    async function refreshNavigation() {
        try { await apiFetch('/admin/refresh-navigation', { method:'POST' }); showToast('缓存已刷新', 'success'); }
        catch { showToast('刷新失败', 'error'); }
    }

    async function loadSubmissions() {
        const list = document.getElementById('submissionsList');
        list.innerHTML = '<div class="empty">加载中...</div>';
        try {
            const data = await apiFetch('/admin/submissions');
            if (!data.length) { list.innerHTML = '<div class="empty">暂无待审核网站</div>'; return; }
            list.innerHTML = data.map(item => `
                <div class="link-item" style="display:flex;justify-content:space-between;align-items:center;">
                    <span><strong>${escapeHtml(item.title)}</strong></span>
                    <button class="sm primary" data-action="viewSubmission" data-id="${item.id}">查看</button>
                </div>
            `).join('');
            list.querySelectorAll('[data-action="viewSubmission"]').forEach(btn => {
                btn.addEventListener('click', () => openSubmissionDetail(btn.dataset.id));
            });
        } catch (e) { list.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    function setupEventDelegation() {
        document.getElementById('catBar').addEventListener('click', e => {
            const btn = e.target.closest('[data-action]');
            if (btn && btn.dataset.action === 'modifyCat') {
                handleModifyCategory(parseInt(btn.dataset.id), btn.dataset.name);
                return;
            }
            const item = e.target.closest('.cat-item');
            if (item) selectCat(parseInt(item.dataset.cid));
        });

        document.getElementById('subList').addEventListener('click', e => {
            const btn = e.target.closest('[data-action]');
            if (btn && btn.dataset.action === 'modifySub') {
                handleModifySub(parseInt(btn.dataset.id), btn.dataset.name);
                return;
            }
            const item = e.target.closest('.sub-item');
            if (item) selectSub(parseInt(item.dataset.sid));
        });

        document.getElementById('siteList').addEventListener('click', e => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            if (btn.dataset.action === 'editSite') handleEditSite(parseInt(btn.dataset.id));
        });

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
    }

    // 初始化
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