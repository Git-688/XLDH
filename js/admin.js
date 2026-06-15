// admin.js - 星聚导航后台管理（完整版，修复退出后验证码不显示）
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
    let customSelects = {};

    let currentAnnouncement = null;
    let currentCaptchaMd5key = null;

    // ==================== 工具函数 ====================
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

    function getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }

    // ==================== API 请求封装 ====================
    async function apiFetch(endpoint, opt = {}) {
        const headers = { 'Content-Type': 'application/json', ...opt.headers };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(API_BASE + endpoint, { ...opt, headers });
        if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
        if (res.status === 403) { showToast('IP不在白名单', 'error'); throw new Error('Forbidden'); }
        if (!res.ok) throw new Error(await res.text() || '请求失败');
        return res.json();
    }

    // ==================== 会话管理 ====================
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
        sessionStorage.setItem('admin_token', tk);
        sessionStorage.setItem('admin_expires', exp + '');
        if (remember) {
            localStorage.setItem('admin_remember', 'true');
            localStorage.setItem('admin_token_saved', tk);
            localStorage.setItem('admin_saved_time', Date.now() + '');
        } else {
            localStorage.removeItem('admin_remember');
            localStorage.removeItem('admin_token_saved');
            localStorage.removeItem('admin_saved_time');
        }
        startSessionRefresh();
    }

    function clearToken() {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_expires');
        localStorage.removeItem('admin_remember');
        localStorage.removeItem('admin_token_saved');
        localStorage.removeItem('admin_saved_time');
        if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
    }

    async function refreshSession() {
        if (!token) return false;
        try {
            const res = await fetch(`${API_BASE}/admin/refresh-session`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                token = data.sessionToken;
                saveToken(token, false);
                showToast('会话已续期', 'success');
                return true;
            } else if (res.status === 401) {
                logout();
                return false;
            }
        } catch (e) { console.warn('刷新 session 失败:', e); }
        return false;
    }

    function startSessionRefresh() {
        if (refreshTimer) clearTimeout(refreshTimer);
        const expires = parseInt(sessionStorage.getItem('admin_expires') || '0', 10);
        const now = Date.now();
        const delay = expires - now - SESSION_REFRESH_BEFORE_MS;
        if (delay > 0 && delay < 3600000) {
            refreshTimer = setTimeout(() => { refreshSession().then(() => startSessionRefresh()); }, delay);
        } else if (delay <= 0) {
            refreshSession().then(() => startSessionRefresh());
        }
    }

    // ==================== 登录锁定 ====================
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
            sessionStorage.setItem('login_lock_until', lockUntil + '');
            sessionStorage.setItem('login_fail_count', failCount + '');
            updateLockMessage();
            showToast('失败5次，锁定10分钟', 'error');
            return false;
        }
        return true;
    }

    function recordLoginFailure() {
        failCount++;
        sessionStorage.setItem('login_fail_count', failCount + '');
        if (failCount >= MAX_FAIL_COUNT) {
            lockUntil = Date.now() + LOCK_DURATION_MS;
            sessionStorage.setItem('login_lock_until', lockUntil + '');
            updateLockMessage();
        }
    }

    function resetLoginFailure() {
        failCount = 0; lockUntil = 0;
        sessionStorage.removeItem('login_fail_count');
        sessionStorage.removeItem('login_lock_until');
        const el = document.getElementById('loginLockMessage');
        if (el) el.textContent = '';
    }

    // ==================== 验证码 ====================
    async function loadCaptcha() {
        const captchaGroup = document.getElementById('captchaGroup');
        const captchaImg = document.getElementById('captchaImg');
        if (!captchaGroup || !captchaImg) return;
        try {
            const response = await fetch(`${API_BASE}/admin/captcha`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Device-Id': getDeviceId()
                }
            });
            const data = await response.json();
            if (data.imgurl && data.md5key) {
                captchaImg.src = data.imgurl;
                currentCaptchaMd5key = data.md5key;
                captchaGroup.style.display = 'block';
            } else {
                console.error('获取验证码失败:', data.error);
                showToast('获取验证码失败，请刷新重试', 'error');
            }
        } catch (err) {
            console.error('加载验证码异常:', err);
            showToast('验证码服务异常', 'error');
        }
    }

    function refreshCaptcha() {
        loadCaptcha();
    }

    // ==================== 登录/登出 ====================
    async function login() {
        if (!checkLock()) return;
        const rawToken = document.getElementById('tokenInput').value.trim();
        if (!rawToken) { showToast('请输入Token', 'error'); return; }

        const captchaCode = document.getElementById('captchaInput')?.value.trim() || '';
        if (!captchaCode) {
            showToast('请输入验证码', 'error');
            return;
        }

        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.textContent = '登录中…';
        try {
            const loginRes = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Device-Id': getDeviceId()
                },
                body: JSON.stringify({
                    token: rawToken,
                    captchaCode: captchaCode,
                    md5key: currentCaptchaMd5key
                })
            });
            const loginData = await loginRes.json().catch(() => ({}));
            if (!loginRes.ok) {
                throw new Error(loginData.error || '登录失败');
            }
            const sessionToken = loginData.sessionToken;
            token = sessionToken;
            resetLoginFailure();
            const remember = document.getElementById('rememberToken').checked;
            saveToken(sessionToken, remember);
            await apiFetch('/admin/categories');
            const loginWrapper = document.getElementById('loginWrapper');
            const mainContent = document.getElementById('mainContent');
            if (loginWrapper) loginWrapper.style.display = 'none';
            if (mainContent) mainContent.classList.remove('hidden');
            document.getElementById('tokenInput').value = '';
            document.getElementById('captchaInput').value = '';
            await loadAllData();
            showToast('登录成功' + (remember ? '（已记住密码）' : ''));
        } catch (e) {
            token = '';
            recordLoginFailure();
            showToast(e.message === 'Unauthorized' ? 'Token无效或验证码错误' : e.message || '登录失败', 'error');
            loadCaptcha();
        } finally {
            btn.disabled = false;
            btn.textContent = '登录';
        }
    }

    // 修复退出后验证码不显示
    function logout() {
        token = '';
        clearToken();
        const loginWrapper = document.getElementById('loginWrapper');
        const mainContent = document.getElementById('mainContent');
        if (loginWrapper) loginWrapper.style.display = 'flex';
        if (mainContent) mainContent.classList.add('hidden');
        const tokenInput = document.getElementById('tokenInput');
        if (tokenInput) tokenInput.value = '';
        const captchaInput = document.getElementById('captchaInput');
        if (captchaInput) captchaInput.value = '';
        
        // 重置验证码相关显示并重新加载
        const captchaGroup = document.getElementById('captchaGroup');
        if (captchaGroup) captchaGroup.style.display = 'none';
        currentCaptchaMd5key = null;
        loadCaptcha();  // 重新加载验证码，会在成功时自动显示 captchaGroup
        showToast('已退出');
    }

    // ==================== 数据加载与渲染 ====================
    async function loadAllData() {
        try {
            const [catData, subData, siteData] = await Promise.all([
                apiFetch('/admin/categories'),
                apiFetch('/admin/subcategories'),
                apiFetch('/admin/sites')
            ]);
            categories = catData;
            subcategories = subData;
            sites = siteData;
            renderCatBar();
            if (categories.length > 0) selectCat(categories[0].id);
        } catch (e) {
            if (e.message === 'Unauthorized') logout();
            else showToast('数据加载失败', 'error');
        }
    }

    function selectCat(cid) {
        currentCat = cid;
        currentSub = null;
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
                <div class="link-info"><strong>${escapeHtml(s.title)}</strong></div>
                <div class="link-actions"><button class="primary" data-action="editSite" data-id="${s.id}">编辑</button></div>
            </div>
        `).join('');
    }

    // ==================== 公告管理 ====================
    async function loadAnnouncement() {
        try {
            const data = await apiFetch('/admin/announcements');
            if (data && data.length > 0) {
                currentAnnouncement = data[0];
                document.getElementById('annTitle').value = currentAnnouncement.title || '';
                document.getElementById('annImportant').value = currentAnnouncement.important || '';
                document.getElementById('annContent').value = currentAnnouncement.content || '';
                const date = currentAnnouncement.date ? currentAnnouncement.date : (currentAnnouncement.created_at ? new Date(currentAnnouncement.created_at).toISOString().slice(0,10) : '');
                document.getElementById('annDate').value = date;
                document.getElementById('annActive').checked = currentAnnouncement.is_active === 1;
                const contentTextarea = document.getElementById('annContent');
                if (contentTextarea) autoResizeTextarea(contentTextarea);
            } else {
                currentAnnouncement = null;
                document.getElementById('annTitle').value = '';
                document.getElementById('annImportant').value = '';
                document.getElementById('annContent').value = '';
                document.getElementById('annDate').value = new Date().toISOString().slice(0,10);
                document.getElementById('annActive').checked = true;
            }
        } catch (e) {
            console.error('加载公告失败:', e);
            showToast('加载公告失败: ' + (e.message || '请检查网络'), 'error');
            currentAnnouncement = null;
            document.getElementById('annTitle').value = '';
            document.getElementById('annImportant').value = '';
            document.getElementById('annContent').value = '';
            document.getElementById('annDate').value = new Date().toISOString().slice(0,10);
            document.getElementById('annActive').checked = true;
        }
    }

    async function saveAnnouncement() {
        const title = document.getElementById('annTitle').value.trim();
        const important = document.getElementById('annImportant').value.trim();
        const content = document.getElementById('annContent').value.trim();
        const date = document.getElementById('annDate').value;
        const is_active = document.getElementById('annActive').checked ? 1 : 0;
        if (!title || !content) {
            showToast('标题和内容不能为空', 'error');
            return;
        }
        const payload = {
            title,
            important: important || '',
            content,
            date: date || new Date().toISOString().slice(0,10),
            is_active
        };
        try {
            if (currentAnnouncement && currentAnnouncement.id) {
                await apiFetch(`/admin/announcements/${currentAnnouncement.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                showToast('公告已更新', 'success');
            } else {
                const res = await apiFetch('/admin/announcements', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                currentAnnouncement = { id: res.id, ...payload };
                showToast('公告已发布', 'success');
            }
            if (window.announcementModule && window.announcementModule.loadAnnouncement) {
                window.announcementModule.loadAnnouncement();
            }
        } catch (err) {
            console.error('保存公告失败:', err);
            showToast('保存失败: ' + (err.message || '网络错误'), 'error');
        }
    }

    function clearAnnouncementForm() {
        document.getElementById('annTitle').value = '';
        document.getElementById('annImportant').value = '';
        document.getElementById('annContent').value = '';
        document.getElementById('annDate').value = new Date().toISOString().slice(0,10);
        document.getElementById('annActive').checked = true;
        const contentTextarea = document.getElementById('annContent');
        if (contentTextarea) autoResizeTextarea(contentTextarea);
    }

    // ==================== 排序辅助 ====================
    async function getNextSortValue(type, parentId = null) {
        try {
            let maxOrder = 0;
            if (type === 'category') {
                const max = categories.reduce((max, c) => Math.max(max, c.display_order || 0), 0);
                maxOrder = max;
            } else if (type === 'subcategory' && parentId) {
                const subs = subcategories.filter(s => s.category_id === parentId);
                const max = subs.reduce((max, s) => Math.max(max, s.display_order || 0), 0);
                maxOrder = max;
            } else if (type === 'site' && parentId) {
                const sitesList = sites.filter(s => s.subcategory_id === parentId);
                const max = sitesList.reduce((max, s) => Math.max(max, s.display_order || 0), 0);
                maxOrder = max;
            }
            return maxOrder + 1;
        } catch { return 0; }
    }

    // ==================== 增删改查模态框 ====================
    function openModal(title, formHtml, submitCb, showDelete = false, deleteCb = null) {
        const modal = document.getElementById('modal');
        document.querySelector('#modal .modal-title').textContent = title;
        document.getElementById('modalForm').innerHTML = formHtml;
        modalAction = submitCb;
        const buttonsContainer = document.querySelector('#modal .modal-buttons');
        let html = '';
        if (showDelete && deleteCb) html += `<div class="modal-buttons-left" style="margin-right:auto;"><button class="danger" id="modalDeleteBtn">删除</button></div>`;
        html += `<button class="secondary" id="modalCancelBtn">取消</button><button class="primary" id="modalSubmit">确认</button>`;
        buttonsContainer.innerHTML = html;
        document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
        document.getElementById('modalSubmit').addEventListener('click', handleModalSubmit);
        if (showDelete && deleteCb) {
            document.getElementById('modalDeleteBtn').addEventListener('click', async () => {
                if (confirm('确定删除？此操作不可恢复！')) { try { await deleteCb(); closeModal(); } catch (e) { showToast('删除失败', 'error'); } }
            });
        }
        modal.classList.add('show');
    }

    async function handleModalSubmit() {
        if (!modalAction) return;
        const btn = document.getElementById('modalSubmit');
        btn.disabled = true;
        btn.textContent = '提交中…';
        try { await modalAction(); closeModal(); }
        catch (e) { showToast('操作失败', 'error'); }
        finally { btn.disabled = false; btn.textContent = '确认'; }
    }

    function closeModal() { 
        document.getElementById('modal').classList.remove('show'); 
        modalAction = null; 
    }

    // 分类/子分类/网站 管理
    function handleModifyCategory(id, currentName) {
        const cat = categories.find(c => c.id === id);
        const currentOrder = cat?.display_order || 0;
        openModal('修改分类', `
            <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">名称</label><input id="mName" class="form-input" value="${escapeHtml(currentName)}"></div>
            <div class="form-row"><label style="font-size:11px;">排序值（数字越小越靠前）</label><input type="number" id="mOrder" class="form-input" value="${currentOrder}" step="1"></div>
        `, async () => {
            const name = document.getElementById('mName').value.trim();
            const order = parseInt(document.getElementById('mOrder').value) || 0;
            if (!name) { showToast('名称不能为空', 'error'); return; }
            await apiFetch(`/admin/categories/${id}`, { method:'PUT', body: JSON.stringify({ name, display_order: order }) });
            showToast('修改成功'); await loadAllData();
        }, true, async () => { 
            await apiFetch(`/admin/categories/${id}`, { method:'DELETE' }); 
            showToast('分类已删除'); await loadAllData(); 
        });
    }

    function handleModifySub(id, currentName) {
        const sub = subcategories.find(s => s.id === id);
        const currentOrder = sub?.display_order || 0;
        openModal('修改子分类', `
            <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">名称</label><input id="mName" class="form-input" value="${escapeHtml(currentName)}"></div>
            <div class="form-row"><label style="font-size:11px;">排序值（数字越小越靠前）</label><input type="number" id="mOrder" class="form-input" value="${currentOrder}" step="1"></div>
        `, async () => {
            const name = document.getElementById('mName').value.trim();
            const order = parseInt(document.getElementById('mOrder').value) || 0;
            if (!name) { showToast('名称不能为空', 'error'); return; }
            await apiFetch(`/admin/subcategories/${id}`, { method:'PUT', body: JSON.stringify({ name, display_order: order }) });
            showToast('修改成功'); await loadAllData();
        }, true, async () => { 
            await apiFetch(`/admin/subcategories/${id}`, { method:'DELETE' }); 
            showToast('子分类已删除'); await loadAllData(); 
        });
    }

    async function handleEditSite(id) {
        const site = sites.find(s => s.id === id);
        if (!site) return;
        openModal('编辑链接',
            `<div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">标题</label><input id="mTitle" class="form-input" value="${escapeHtml(site.title)}"></div>
             <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">网址</label><div style="display:flex; gap:4px;"><input id="mUrl" class="form-input" value="${escapeHtml(site.url)}" style="flex:1;"><button type="button" id="fetchInfoBtn" class="fetch-info-btn" style="padding:4px 10px;">获取信息</button></div></div>
             <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">图标</label><input id="mIcon" class="form-input" value="${escapeHtml(site.icon||'fas fa-link')}"></div>
             <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">描述</label><textarea id="mDesc" rows="2" class="form-input">${escapeHtml(site.description||'')}</textarea></div>
             <div class="form-row"><label style="font-size:11px;">排序值</label><input type="number" id="mSort" class="form-input" value="${site.display_order}" step="1"></div>`,
            async () => {
                const title = document.getElementById('mTitle').value.trim();
                const url = document.getElementById('mUrl').value.trim();
                if (!title || !url) { showToast('标题和网址必填', 'error'); return; }
                if (!checkUrl(url)) { showToast('网址格式错误', 'error'); return; }
                await apiFetch(`/admin/sites/${id}`, { method:'PUT', body: JSON.stringify({
                    title, url, description: document.getElementById('mDesc').value,
                    icon: document.getElementById('mIcon').value, display_order: +document.getElementById('mSort').value
                })});
                showToast('修改成功'); await loadAllData();
            }, true,
            async () => { await apiFetch(`/admin/sites/${id}`, { method:'DELETE' }); showToast('删除成功'); await loadAllData(); }
        );
        setTimeout(() => {
            const descTextarea = document.getElementById('mDesc');
            if (descTextarea) {
                autoResizeTextarea(descTextarea);
                descTextarea.addEventListener('input', function() { autoResizeTextarea(this); });
            }
            const fetchBtn = document.getElementById('fetchInfoBtn');
            if (fetchBtn) fetchBtn.addEventListener('click', () => fetchSiteInfo('mUrl','mTitle','mIcon','mDesc'));
        }, 50);
    }

    async function handleAddCategory() {
        const nextOrder = await getNextSortValue('category');
        openModal('新增一级分类',
            `<div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">名称</label><input id="mName" class="form-input"></div>
             <div class="form-row"><label style="font-size:11px;">排序值（数字越小越靠前）</label><input type="number" id="mSort" class="form-input" value="${nextOrder}" step="1"></div>`,
            async () => {
                const name = document.getElementById('mName').value.trim();
                if (!name) { showToast('名称不能为空', 'error'); return; }
                await apiFetch('/admin/categories', { method:'POST', body: JSON.stringify({ name, display_order: +document.getElementById('mSort').value }) });
                showToast('添加成功'); await loadAllData();
            }
        );
    }

    async function handleAddSub() {
        if (!currentCat) { showToast('请先选择一级分类', 'error'); return; }
        const nextOrder = await getNextSortValue('subcategory', currentCat);
        openModal('新增子分类',
            `<div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">名称</label><input id="mName" class="form-input"></div>
             <div class="form-row"><label style="font-size:11px;">排序值（数字越小越靠前）</label><input type="number" id="mSort" class="form-input" value="${nextOrder}" step="1"></div>`,
            async () => {
                const name = document.getElementById('mName').value.trim();
                if (!name) { showToast('名称不能为空', 'error'); return; }
                await apiFetch('/admin/subcategories', { method:'POST', body: JSON.stringify({ category_id: currentCat, name, display_order: +document.getElementById('mSort').value }) });
                showToast('添加成功'); await loadAllData();
            }
        );
    }

    async function handleAddSite() {
        if (!currentSub) { showToast('请先选择子分类', 'error'); return; }
        const nextOrder = await getNextSortValue('site', currentSub);
        openModal('新增链接',
            `<div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">标题</label><input id="mTitle" class="form-input"></div>
             <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">网址</label><div style="display:flex; gap:4px;"><input id="mUrl" class="form-input" style="flex:1;"><button type="button" id="fetchInfoBtn" class="fetch-info-btn" style="padding:4px 10px;">获取信息</button></div></div>
             <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">图标</label><input id="mIcon" class="form-input" value="fas fa-link"></div>
             <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">描述</label><textarea id="mDesc" rows="2" class="form-input"></textarea></div>
             <div class="form-row"><label style="font-size:11px;">排序值（数字越小越靠前）</label><input type="number" id="mSort" class="form-input" value="${nextOrder}" step="1"></div>`,
            async () => {
                const title = document.getElementById('mTitle').value.trim();
                const url = document.getElementById('mUrl').value.trim();
                if (!title || !url) { showToast('标题和网址必填', 'error'); return; }
                if (!checkUrl(url)) { showToast('网址格式错误', 'error'); return; }
                await apiFetch('/admin/sites', { method:'POST', body: JSON.stringify({
                    subcategory_id: currentSub, title, url, description: document.getElementById('mDesc').value,
                    icon: document.getElementById('mIcon').value, display_order: +document.getElementById('mSort').value
                })});
                showToast('添加成功', 'success');
                closeModal();
                const newSite = await apiFetch('/admin/sites?subcategory_id=' + currentSub);
                if (newSite && newSite.length) {
                    const otherSites = sites.filter(s => s.subcategory_id !== currentSub);
                    sites = [...otherSites, ...newSite];
                    renderSiteList();
                } else {
                    await loadAllDataButKeepSelection();
                }
            }
        );
        setTimeout(() => {
            const descTextarea = document.getElementById('mDesc');
            if (descTextarea) {
                autoResizeTextarea(descTextarea);
                descTextarea.addEventListener('input', function() { autoResizeTextarea(this); });
            }
            const fetchBtn = document.getElementById('fetchInfoBtn');
            if (fetchBtn) fetchBtn.addEventListener('click', () => fetchSiteInfo('mUrl','mTitle','mIcon','mDesc'));
        }, 50);
    }

    async function loadAllDataButKeepSelection() {
        try {
            const [catData, subData, siteData] = await Promise.all([
                apiFetch('/admin/categories'),
                apiFetch('/admin/subcategories'),
                apiFetch('/admin/sites')
            ]);
            categories = catData;
            subcategories = subData;
            sites = siteData;
            renderCatBar();
            if (currentCat) {
                selectCat(currentCat);
                if (currentSub) selectSub(currentSub);
            }
        } catch (e) {
            if (e.message === 'Unauthorized') logout();
            else showToast('数据加载失败', 'error');
        }
    }

    // ==================== 辅助功能：排行、反馈等 ====================
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
            if (!data.length) { list.innerHTML = '<div class="empty">暂无反馈</div>'; return; }
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
                    <div class="link-info"><strong>${escapeHtml(item.title||'无标题')}</strong><div style="font-size:10px;color:#999">于 ${new Date(item.report_time).toLocaleString()}</div></div>
                    <div class="link-actions">
                        <button class="sm primary" data-action="replaceLink" data-reportid="${item.id}" data-siteid="${item.site_id||0}" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(item.title||'')}">更换链接</button>
                    </div>
                </div>
            `).join('');
            if (groups.today.length) html += `<div class="feedback-date-group"><h4 style="font-size:12px;">📅 今天</h4>${renderItems(groups.today)}</div>`;
            if (groups.yesterday.length) html += `<div class="feedback-date-group"><h4 style="font-size:12px;">📅 昨天</h4>${renderItems(groups.yesterday)}</div>`;
            if (groups.older.length) html += `<div class="feedback-date-group"><h4 style="font-size:12px;">📅 更早</h4>${renderItems(groups.older)}</div>`;
            list.innerHTML = html;
            list.querySelectorAll('[data-action="replaceLink"]').forEach(btn => btn.addEventListener('click', replaceLinkHandler));
        } catch { list.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    async function replaceLinkHandler(e) {
        const btn = e.currentTarget;
        const reportId = parseInt(btn.dataset.reportid);
        const siteId = parseInt(btn.dataset.siteid);
        if (!siteId) { showToast('未找到网站记录', 'error'); return; }
        const site = sites.find(s => s.id === siteId);
        if (!site) { showToast('未找到网站记录', 'error'); return; }
        openModal('更换链接',
            `<div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">标题</label><input id="mTitle" class="form-input" value="${escapeHtml(site.title)}"></div>
             <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">网址</label><input id="mUrl" class="form-input" value="${escapeHtml(site.url)}"></div>
             <div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">描述</label><textarea id="mDesc" rows="2" class="form-input">${escapeHtml(site.description||'')}</textarea></div>
             <div class="form-row"><label style="font-size:11px;">图标</label><input id="mIcon" class="form-input" value="${escapeHtml(site.icon||'fas fa-link')}"></div>`,
            async () => {
                const newTitle = document.getElementById('mTitle').value.trim();
                const newUrl = document.getElementById('mUrl').value.trim();
                if (!newTitle || !newUrl) { showToast('标题和网址不能为空', 'error'); return; }
                if (!checkUrl(newUrl)) { showToast('网址格式错误', 'error'); return; }
                await apiFetch('/admin/replace-link', {
                    method: 'POST',
                    body: JSON.stringify({ reportId, siteId, newUrl, newTitle, newDescription: document.getElementById('mDesc').value, newIcon: document.getElementById('mIcon').value })
                });
                showToast('链接已更新', 'success');
                await loadFeedback();
                await loadAllData();
                await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                closeModal();
            }
        );
        setTimeout(() => {
            const descTextarea = document.getElementById('mDesc');
            if (descTextarea) {
                autoResizeTextarea(descTextarea);
                descTextarea.addEventListener('input', function() { autoResizeTextarea(this); });
            }
        }, 50);
    }

    async function exportFullData() {
        try {
            const response = await fetch(`${API_BASE}/admin/export`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('导出失败');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `navigation_full_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('导出成功', 'success');
        } catch (err) {
            showToast('导出失败', 'error');
        }
    }

    async function importData() {
        const fileInput = document.getElementById('importFile');
        const mode = document.getElementById('importMode').value;
        if (!fileInput.files || !fileInput.files[0]) {
            showToast('请选择 JSON 文件', 'warn');
            return;
        }
        const file = fileInput.files[0];
        if (file.size > 10 * 1024 * 1024) {
            showToast('文件不能超过 10MB', 'error');
            return;
        }
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data.categories || !data.subcategories || !data.sites) {
                showToast('无效的导入文件格式', 'error');
                return;
            }
            const confirmMsg = mode === 'overwrite' ? '覆盖模式将清空现有数据，确定继续吗？' : '合并模式将更新/添加数据，确定继续吗？';
            if (!confirm(confirmMsg)) return;
            const response = await fetch(`${API_BASE}/admin/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mode, data })
            });
            const result = await response.json();
            if (response.ok) {
                showToast('导入成功', 'success');
                await loadAllData();
                await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                closeImportModal();
            } else {
                showToast(result.error || '导入失败', 'error');
            }
        } catch (err) {
            showToast('导入失败: ' + err.message, 'error');
        }
    }

    function openImportModal() {
        const modal = document.getElementById('importModal');
        modal.classList.add('show');
        document.getElementById('importFile').value = '';
    }

    function closeImportModal() {
        const modal = document.getElementById('importModal');
        modal.classList.remove('show');
    }

    async function loadSubmissions() {
        const list = document.getElementById('submissionsList');
        list.innerHTML = '<div class="empty">加载中...</div>';
        try {
            const data = await apiFetch('/admin/submissions');
            if (!data.length) {
                list.innerHTML = '<div class="empty">暂无待审核网站</div>';
                return;
            }
            list.innerHTML = data.map(item => `
                <div class="link-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <span><strong class="submission-title-truncate" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong></span>
                    <button class="sm primary" data-action="viewSubmission" data-id="${item.id}">查看</button>
                </div>
            `).join('');
            list.querySelectorAll('[data-action="viewSubmission"]').forEach(btn => {
                btn.addEventListener('click', () => openSubmissionDetail(btn.dataset.id));
            });
        } catch (e) { list.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    async function openSubmissionDetail(id) {
        currentSubmissionId = id;
        const detailModal = document.getElementById('submissionDetailModal');
        const contentDiv = document.getElementById('submissionDetailContent');

        const cleanupSelectors = () => {
            if (customSelects.cat) { customSelects.cat.destroy(); delete customSelects.cat; }
            if (customSelects.sub) { customSelects.sub.destroy(); delete customSelects.sub; }
        };
        cleanupSelectors();

        const removeModalListeners = () => {
            const newCloseBtn = detailModal.querySelector('#closeDetailModalBtn');
            if (newCloseBtn) {
                const newClone = newCloseBtn.cloneNode(true);
                newCloseBtn.parentNode.replaceChild(newClone, newCloseBtn);
                newClone.onclick = () => {
                    cleanupSelectors();
                    detailModal.classList.remove('show');
                };
            }
            detailModal.onclick = (e) => {
                if (e.target === detailModal) {
                    cleanupSelectors();
                    detailModal.classList.remove('show');
                }
            };
        };

        try {
            const data = await apiFetch('/admin/submissions');
            const item = data.find(s => s.id == id);
            if (!item) { showToast('未找到该投稿', 'error'); return; }
            const vtColor = (item.vt_result || '').includes('安全') ? '#10b981' : '#ef4444';

            let html = `
                <div class="info-card" style="margin-bottom:16px;">
                    <div class="info-row" style="margin-bottom:8px;"><label style="font-size:11px; width:70px;">标题</label><input type="text" id="editTitle" value="${escapeHtml(item.title)}" style="flex:1; padding:6px; font-size:12px; border-radius:8px; border:1px solid #e2e8f0;"></div>
                    <div class="info-row" style="margin-bottom:8px;"><label style="font-size:11px; width:70px;">网址</label><input type="text" id="editUrl" value="${escapeHtml(item.url)}" style="flex:1; padding:6px; font-size:12px; border-radius:8px; border:1px solid #e2e8f0;"></div>
                    <div class="info-row" style="margin-bottom:8px;"><label style="font-size:11px; width:70px;">图标</label><input type="text" id="editIcon" value="${escapeHtml(item.icon || '')}" style="flex:1; padding:6px; font-size:12px; border-radius:8px; border:1px solid #e2e8f0;"></div>
                    <div class="info-row" style="margin-bottom:8px;"><label style="font-size:11px; width:70px;">描述</label><textarea id="editDesc" rows="2" style="flex:1; padding:6px; font-size:12px; border-radius:8px; border:1px solid #e2e8f0;">${escapeHtml(item.description || '')}</textarea></div>
                    <div class="info-row" style="margin-bottom:8px;"><label style="font-size:11px; width:70px;">提交者</label><input type="email" id="editContact" value="${escapeHtml(item.contact || '')}" style="flex:1; padding:6px; font-size:12px; border-radius:8px; border:1px solid #e2e8f0;"></div>
                    <div class="info-row" style="margin-bottom:8px;"><label style="font-size:11px; width:70px;">提交时间</label><div style="flex:1; font-size:11px;">${new Date(item.submit_time).toLocaleString()}</div></div>
                    <div class="info-row"><label style="font-size:11px; width:70px;">安全检测</label><div style="flex:1; font-size:11px; color:${vtColor}">${escapeHtml(item.vt_result || '未检测')}</div></div>
                </div>
                <div class="action-section" style="display:flex; gap:12px; flex-wrap:wrap;">
                    <div style="flex:1; background:#f8fafc; padding:12px; border-radius:12px;">
                        <h4 style="font-size:12px; margin-bottom:8px;"><i class="fas fa-check-circle"></i> 收录</h4>
                        <div class="inline-select-group" style="display:flex; gap:8px; flex-wrap:wrap;">
                            <div class="custom-select-wrapper" id="approveCatSelectWrapper" style="min-width:120px;"></div>
                            <div class="custom-select-wrapper" id="approveSubSelectWrapper" style="min-width:120px;"></div>
                            <input type="number" id="approveOrder" placeholder="排序" value="0" style="width:80px; padding:6px; font-size:12px; border-radius:8px;" step="1">
                        </div>
                        <div style="margin: 10px 0 0 0;">
                            <label style="display: inline-flex; align-items: center; gap: 6px; font-size:11px;">
                                <input type="checkbox" id="sendEmailCheckbox" checked style="width: auto;">
                                📧 发送邮件通知
                            </label>
                        </div>
                        <button class="btn-approve" id="doApproveBtn" style="margin-top: 8px; background:#10b981; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px;">✓ 收录</button>
                    </div>
                    <div style="flex:1; background:#f8fafc; padding:12px; border-radius:12px;">
                        <h4 style="font-size:12px; margin-bottom:8px;"><i class="fas fa-ban"></i> 拒绝</h4>
                        <div style="margin: 10px 0 0 0;">
                            <label style="display: inline-flex; align-items: center; gap: 6px; font-size:11px;">
                                <input type="checkbox" id="sendEmailCheckboxReject" checked style="width: auto;">
                                📧 发送邮件通知
                            </label>
                        </div>
                        <button class="btn-reject" id="doRejectBtn" style="margin-top: 8px; background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:11px;">✗ 拒绝</button>
                    </div>
                </div>
            `;
            contentDiv.innerHTML = html;

            const descTextarea = document.getElementById('editDesc');
            if (descTextarea) {
                autoResizeTextarea(descTextarea);
                descTextarea.addEventListener('input', function() { autoResizeTextarea(this); });
            }

            const catSelect = document.createElement('select');
            catSelect.id = 'approveCatSelect';
            catSelect.innerHTML = '<option value="">选择一级分类</option>' + categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
            const catWrapper = document.getElementById('approveCatSelectWrapper');
            catWrapper.innerHTML = '';
            catWrapper.appendChild(catSelect);

            const subSelect = document.createElement('select');
            subSelect.id = 'approveSubSelect';
            subSelect.innerHTML = '<option value="">先选择一级分类</option>';
            const subWrapper = document.getElementById('approveSubSelectWrapper');
            subWrapper.innerHTML = '';
            subWrapper.appendChild(subSelect);

            let catCustomSelect = new CustomSelect(catSelect, async (value) => {
                subSelect.innerHTML = '<option value="">加载中...</option>';
                if (customSelects.sub) customSelects.sub.destroy();
                if (value) {
                    try {
                        const subsData = await apiFetch(`/admin/subcategories?category_id=${value}`);
                        subSelect.innerHTML = '<option value="">选择二级分类</option>' + subsData.map(sub => `<option value="${sub.id}">${escapeHtml(sub.name)}</option>`).join('');
                    } catch (e) {
                        subSelect.innerHTML = '<option value="">加载失败</option>';
                        showToast('加载子分类失败', 'error');
                    }
                } else {
                    subSelect.innerHTML = '<option value="">先选择一级分类</option>';
                }
                customSelects.sub = new CustomSelect(subSelect);
            });
            customSelects.cat = catCustomSelect;
            customSelects.sub = new CustomSelect(subSelect);

            document.getElementById('doApproveBtn').onclick = async () => {
                const catSelectEl = document.getElementById('approveCatSelect');
                const subSelectEl = document.getElementById('approveSubSelect');
                const catId = catSelectEl ? catSelectEl.value : '';
                const subId = subSelectEl ? subSelectEl.value : '';
                if (!catId || !subId) {
                    showToast('请选择一级分类和二级分类', 'error');
                    return;
                }
                const displayOrder = document.getElementById('approveOrder').value || 0;
                const editedTitle = document.getElementById('editTitle').value.trim();
                const editedUrl = document.getElementById('editUrl').value.trim();
                const editedIcon = document.getElementById('editIcon').value.trim();
                const editedDesc = document.getElementById('editDesc').value.trim();
                const editedContact = document.getElementById('editContact').value.trim();
                const sendEmail = document.getElementById('sendEmailCheckbox').checked;
                if (!editedTitle || !editedUrl) {
                    showToast('标题和网址不能为空', 'error');
                    return;
                }
                if (!checkUrl(editedUrl)) {
                    showToast('网址格式错误', 'error');
                    return;
                }
                try {
                    await apiFetch(`/admin/submissions/${id}/approve`, {
                        method: 'POST',
                        body: JSON.stringify({
                            subcategory_id: parseInt(subId),
                            display_order: parseInt(displayOrder),
                            title: editedTitle,
                            url: editedUrl,
                            icon: editedIcon,
                            description: editedDesc,
                            contact: editedContact,
                            sendEmail: sendEmail
                        })
                    });
                    showToast('已收录' + (sendEmail ? '，邮件已发送' : ''), 'success');
                    detailModal.classList.remove('show');
                    cleanupSelectors();
                    await loadSubmissions();
                    await loadAllData();
                    await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                } catch (err) {
                    showToast('操作失败', 'error');
                }
            };

            document.getElementById('doRejectBtn').onclick = async () => {
                if (!confirm('确定要拒绝该投稿吗？拒绝后将永久删除，用户不可修改')) return;
                const sendEmail = document.getElementById('sendEmailCheckboxReject').checked;
                try {
                    await apiFetch(`/admin/submissions/${id}`, {
                        method: 'DELETE',
                        body: JSON.stringify({ sendEmail: sendEmail })
                    });
                    showToast('已拒绝' + (sendEmail ? '，邮件已发送' : ''), 'success');
                    detailModal.classList.remove('show');
                    cleanupSelectors();
                    await loadSubmissions();
                } catch (err) { showToast('操作失败', 'error'); }
            };

            removeModalListeners();
            detailModal.classList.add('show');
        } catch (err) { showToast('加载详情失败', 'error'); }
    }

    // ==================== CustomSelect 类 ====================
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
            this.trigger.innerHTML = `<span class="custom-select-value">${this.getSelectedText()}</span><span class="custom-select-arrow"></span>`;
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'custom-select-dropdown';
            this.wrapper.appendChild(this.trigger);
            this.wrapper.appendChild(this.dropdown);
            this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling);
            this.populateOptions();
            this.bindEvents();
            this.select.addEventListener('change', () => this.setValue(this.select.value));
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
                if (!this.wrapper.contains(e.target) && !this.dropdown.contains(e.target)) this.close();
            };
            setTimeout(() => document.addEventListener('click', this.handleOutsideClick), 0);
        }
        close() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.trigger.classList.remove('open');
            this.dropdown.classList.remove('open');
            if (this.handleOutsideClick) document.removeEventListener('click', this.handleOutsideClick);
        }
        positionDropdown() {
            const rect = this.trigger.getBoundingClientRect();
            const dropdownHeight = this.dropdown.offsetHeight;
            const viewportHeight = window.innerHeight;
            let top = rect.bottom + 4;
            if (top + dropdownHeight > viewportHeight - 10) top = rect.top - dropdownHeight - 4;
            this.dropdown.style.position = 'fixed';
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

    function injectGlobalStyles() {
        if (!document.getElementById('admin-global-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-global-styles';
            style.textContent = `
                .submission-title-truncate { display: inline-block; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
                @media (max-width: 768px) { .submission-title-truncate { max-width: 180px; } }
                @media (max-width: 480px) { .submission-title-truncate { max-width: 120px; } }
                .form-input { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; background: #fff; transition: all 0.2s; box-sizing: border-box; }
                .form-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
                textarea.form-input { resize: vertical; font-family: inherit; }
                .inline-select-group { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
                .custom-select-wrapper { position: relative; flex: 1; min-width: 110px; }
                .custom-select-trigger { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #1e293b; cursor: pointer; gap: 6px; }
                .custom-select-trigger:hover { border-color: #3b82f6; }
                .custom-select-trigger.open { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
                .custom-select-value { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px; }
                .custom-select-arrow { width: 12px; height: 12px; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='%2364748b' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-size: contain; transition: transform 0.2s; }
                .custom-select-trigger.open .custom-select-arrow { transform: rotate(180deg); }
                .custom-select-dropdown { position: fixed; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); z-index: 1000; max-height: 180px; overflow-y: auto; opacity: 0; visibility: hidden; transform: translateY(-6px); transition: all 0.15s ease; scrollbar-width: none; }
                .custom-select-dropdown::-webkit-scrollbar { display: none; }
                .custom-select-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
                .custom-select-option { padding: 6px 10px; font-size: 11px; color: #1e293b; cursor: pointer; transition: background 0.1s; }
                .custom-select-option:hover { background: #f1f5f9; }
                .custom-select-option.selected { background: #e0f2fe; color: #0369a1; font-weight: 500; }
                @media (prefers-color-scheme: dark) {
                    .custom-select-trigger { background: #1e293b; border-color: #334155; color: #e2e8f0; }
                    .custom-select-dropdown { background: #1e293b; border-color: #334155; }
                    .custom-select-option { color: #e2e8f0; }
                    .custom-select-option:hover { background: #334155; }
                    .custom-select-option.selected { background: #0f172a; color: #38bdf8; }
                    .form-input { background: #1e293b; border-color: #334155; color: #e2e8f0; }
                }
                @media (max-width: 640px) {
                    .content-layout { flex-direction: row !important; }
                    .action-buttons-row button { font-size: 10px; padding: 5px 6px; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ==================== 事件绑定与初始化 ====================
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
                const tabId = btn.dataset.tab;
                if (!tabId) return;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
                const activePanel = document.getElementById(`${tabId}Tab`);
                if (activePanel) activePanel.classList.remove('hidden');
                if (tabId === 'rank') loadRanking();
                if (tabId === 'feedback') loadFeedback();
                if (tabId === 'submissions') loadSubmissions();
                if (tabId === 'announcement') loadAnnouncement();
            });
        });

        document.getElementById('loginBtn').addEventListener('click', login);
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('addCategoryBtn').addEventListener('click', handleAddCategory);
        document.getElementById('addSubBtn').addEventListener('click', handleAddSub);
        document.getElementById('addSiteBtn').addEventListener('click', handleAddSite);
        document.getElementById('exportBtn').addEventListener('click', exportFullData);
        document.getElementById('importBtn').addEventListener('click', openImportModal);
        document.getElementById('sortRankBtn').addEventListener('click', loadRanking);
        document.getElementById('refreshFeedbackBtn').addEventListener('click', loadFeedback);
        document.getElementById('refreshSubmissionsBtn').addEventListener('click', loadSubmissions);
        document.getElementById('refreshNavBtn').addEventListener('click', async () => {
            try {
                await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                showToast('导航缓存已刷新', 'success');
            } catch (err) { showToast('刷新失败', 'error'); }
        });
        document.getElementById('annPublishBtn').addEventListener('click', saveAnnouncement);
        document.getElementById('annClearBtn').addEventListener('click', clearAnnouncementForm);
        document.getElementById('annCancelBtn').addEventListener('click', () => {
            if (currentAnnouncement) loadAnnouncement();
            else clearAnnouncementForm();
        });
        document.getElementById('tokenInput').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
        document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) closeModal(); });
        const importModal = document.getElementById('importModal');
        if (importModal) {
            document.getElementById('importCancelBtn').addEventListener('click', closeImportModal);
            document.getElementById('importConfirmBtn').addEventListener('click', importData);
            importModal.addEventListener('click', (e) => { if (e.target === importModal) closeImportModal(); });
        }

        const captchaImg = document.getElementById('captchaImg');
        if (captchaImg) captchaImg.addEventListener('click', refreshCaptcha);
    }

    injectGlobalStyles();

    const storedToken = getStoredToken();
    if (storedToken) {
        token = storedToken;
        (async () => {
            try {
                await apiFetch('/admin/categories');
                const loginWrapper = document.getElementById('loginWrapper');
                const mainContent = document.getElementById('mainContent');
                if (loginWrapper) loginWrapper.style.display = 'none';
                if (mainContent) mainContent.classList.remove('hidden');
                await loadAllData();
                await loadAnnouncement();
                startSessionRefresh();
            } catch (e) { logout(); }
        })();
    } else {
        const loginWrapper = document.getElementById('loginWrapper');
        const mainContent = document.getElementById('mainContent');
        if (loginWrapper) loginWrapper.style.display = 'flex';
        if (mainContent) mainContent.classList.add('hidden');
        loadCaptcha();
        setInterval(() => {
            if (document.getElementById('captchaGroup')?.style.display !== 'none' && !token) {
                loadCaptcha();
            }
        }, 4 * 60 * 1000);
    }

    setInterval(() => {
        const exp = sessionStorage.getItem('admin_expires');
        if (exp && Date.now() > parseInt(exp, 10) - 60000) showToast('登录即将过期', 'warn');
    }, 30000);

    updateLockMessage();
    setupEventDelegation();
})();