(function() {
    // ==================== 安全作用域：避免全局泄露 ====================
    const API_BASE = (window.APP_CONFIG?.API_BASE) || 'https://api.xjdh688.ccwu.cc';
    const TOKEN_EXPIRE_HOURS = 1;
    const MAX_FAIL_COUNT = 5;
    const LOCK_DURATION_MS = 10 * 60 * 1000;

    const WEBSITE_INFO_API = 'https://api.pearapi.ai/api/website/info/';

    let token = '';
    let modalAction = null;
    let categories = [], subcategories = [], sites = [];
    let currentCat = null, currentSub = null;
    let failCount = parseInt(sessionStorage.getItem('login_fail_count') || '0', 10);
    let lockUntil = parseInt(sessionStorage.getItem('login_lock_until') || '0', 10);

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
    }

    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 2300);
    }

    function getStoredToken() {
        let tk = sessionStorage.getItem('admin_token');
        if (tk) {
            const expires = sessionStorage.getItem('admin_expires');
            if (expires && Date.now() < parseInt(expires, 10)) {
                return tk;
            }
            sessionStorage.removeItem('admin_token');
            sessionStorage.removeItem('admin_expires');
        }
        const remember = localStorage.getItem('admin_remember');
        if (remember === 'true') {
            tk = localStorage.getItem('admin_token_saved');
            const savedTime = localStorage.getItem('admin_saved_time');
            if (tk && savedTime) {
                const expires = parseInt(savedTime, 10) + (TOKEN_EXPIRE_HOURS * 3600000);
                if (Date.now() < expires) {
                    sessionStorage.setItem('admin_token', tk);
                    sessionStorage.setItem('admin_expires', expires.toString());
                    return tk;
                } else {
                    localStorage.removeItem('admin_token_saved');
                    localStorage.removeItem('admin_saved_time');
                    localStorage.removeItem('admin_remember');
                }
            }
        }
        return '';
    }

    function saveToken(tk, remember) {
        const expires = Date.now() + (TOKEN_EXPIRE_HOURS * 3600000);
        sessionStorage.setItem('admin_token', tk);
        sessionStorage.setItem('admin_expires', expires.toString());
        if (remember) {
            localStorage.setItem('admin_remember', 'true');
            localStorage.setItem('admin_token_saved', tk);
            localStorage.setItem('admin_saved_time', Date.now().toString());
        } else {
            localStorage.removeItem('admin_remember');
            localStorage.removeItem('admin_token_saved');
            localStorage.removeItem('admin_saved_time');
        }
    }

    function clearToken() {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_expires');
        localStorage.removeItem('admin_remember');
        localStorage.removeItem('admin_token_saved');
        localStorage.removeItem('admin_saved_time');
    }

    function updateLockMessage() {
        const msgEl = document.getElementById('loginLockMessage');
        if (!msgEl) return;
        if (Date.now() < lockUntil) {
            const remaining = Math.ceil((lockUntil - Date.now()) / 1000 / 60);
            msgEl.textContent = `登录锁定中，剩余 ${remaining} 分钟`;
        } else {
            msgEl.textContent = '';
        }
    }

    function checkLock() {
        if (Date.now() < lockUntil) {
            updateLockMessage();
            showToast('登录失败过多，锁定10分钟', 'error');
            return false;
        }
        if (failCount >= MAX_FAIL_COUNT) {
            lockUntil = Date.now() + LOCK_DURATION_MS;
            sessionStorage.setItem('login_lock_until', lockUntil);
            sessionStorage.setItem('login_fail_count', failCount);
            updateLockMessage();
            showToast('失败5次，锁定10分钟', 'error');
            return false;
        }
        return true;
    }

    function recordLoginFailure() {
        failCount++;
        sessionStorage.setItem('login_fail_count', failCount);
        if (failCount >= MAX_FAIL_COUNT) {
            lockUntil = Date.now() + LOCK_DURATION_MS;
            sessionStorage.setItem('login_lock_until', lockUntil);
            updateLockMessage();
        }
    }

    function resetLoginFailure() {
        failCount = 0;
        lockUntil = 0;
        sessionStorage.removeItem('login_fail_count');
        sessionStorage.removeItem('login_lock_until');
        document.getElementById('loginLockMessage').textContent = '';
    }

    function openModal(title, html, cb) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalForm').innerHTML = html;
        modalAction = cb;
        const btn = document.getElementById('modalSubmit');
        btn.disabled = false;
        btn.textContent = '确认';
        document.getElementById('modal').classList.add('show');
    }

    function closeModal() {
        document.getElementById('modal').classList.remove('show');
        modalAction = null;
        document.getElementById('modalSubmit').disabled = false;
        document.getElementById('modalSubmit').textContent = '确认';
    }

    function closeLogModal() {
        document.getElementById('logModal').classList.remove('show');
    }

    function addLog(text) {
        const logs = JSON.parse(sessionStorage.getItem('operation_logs') || '[]');
        logs.unshift({ time: new Date().toLocaleString(), text });
        if (logs.length > 50) logs.splice(50);
        sessionStorage.setItem('operation_logs', JSON.stringify(logs));
    }

    function showLogs() {
        const logs = JSON.parse(sessionStorage.getItem('operation_logs') || '[]');
        document.getElementById('logList').innerHTML = logs.length ? logs.map(i => `<div class="log-item"><span>${i.time}</span> ${escapeHtml(i.text)}</div>`).join('') : '<div class="empty">暂无记录</div>';
        document.getElementById('logModal').classList.add('show');
    }

    async function apiFetch(endpoint, opt = {}) {
        const headers = { 'Content-Type': 'application/json', ...opt.headers };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(API_BASE + endpoint, { ...opt, headers });
        if (res.status === 401) {
            logout();
            throw new Error('Unauthorized');
        }
        if (res.status === 403) {
            showToast('IP 不在白名单中', 'error');
            throw new Error('Forbidden');
        }
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
        if (!rawUrl) {
            showToast('请先输入网址', 'warn');
            return;
        }

        if (!/^https?:\/\//i.test(rawUrl)) {
            rawUrl = 'https://' + rawUrl;
        }

        const fetchBtn = document.getElementById('fetchInfoBtn');
        if (fetchBtn) {
            fetchBtn.disabled = true;
            fetchBtn.textContent = '获取中...';
        }

        try {
            const response = await fetch(WEBSITE_INFO_API + '?url=' + encodeURIComponent(rawUrl));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.code === 200 && data.data) {
                const info = data.data;
                if (info.title) titleInput.value = info.title;
                if (info.icon) iconInput.value = info.icon;
                if (info.description) descInput.value = info.description;
                showToast('网站信息获取成功', 'success');
            } else {
                showToast('获取信息失败: ' + (data.msg || '未知错误'), 'error');
            }
        } catch (err) {
            console.error('获取网站信息出错:', err);
            showToast('获取信息失败，请检查网络或网址', 'error');
        } finally {
            if (fetchBtn) {
                fetchBtn.disabled = false;
                fetchBtn.textContent = '获取信息';
            }
        }
    }

    async function login() {
        if (!checkLock()) return;
        const ipt = document.getElementById('tokenInput');
        const btn = document.getElementById('loginBtn');
        const rememberCheck = document.getElementById('rememberToken');
        const val = ipt.value.trim();
        if (!val) { showToast('请输入Token', 'error'); return; }
        btn.disabled = true;
        btn.textContent = '登录中…';
        token = val;
        try {
            await apiFetch('/admin/categories');
            resetLoginFailure();
            const remember = rememberCheck ? rememberCheck.checked : false;
            saveToken(token, remember);
            ipt.style.display = 'none';
            document.getElementById('loginBtn').classList.add('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
            document.querySelector('.remember-checkbox').style.display = 'none';
            await loadAllData();
            addLog('管理员登录');
            showToast('登录成功' + (remember ? '（已记住密码）' : ''));
        } catch (e) {
            token = '';
            recordLoginFailure();
            showToast(e.message === 'Unauthorized' ? 'Token无效' : '登录失败: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '登录';
        }
    }

    function logout() {
        token = '';
        clearToken();
        document.getElementById('loginBtn').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('tokenInput').style.display = 'block';
        document.getElementById('tokenInput').value = '';
        document.querySelector('.remember-checkbox').style.display = 'block';
        addLog('退出登录');
        showToast('已退出');
    }

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
            } catch (e) {
                logout();
            }
        })();
    }

    setInterval(() => {
        const expires = sessionStorage.getItem('admin_expires');
        if (expires && Date.now() > parseInt(expires, 10) - 60000) {
            showToast('登录即将过期，请重新登录', 'warn');
        }
    }, 30000);

    function getFavicon(url){
        try { const u = new URL(url); return `https://api.71xk.com/api/favicon?url=${u.hostname}`; } catch { return 'fas fa-link'; }
    }

    function checkUrl(url){
        try {
            const parsed = new URL(url);
            if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') return false;
            return true;
        } catch { return false; }
    }

    async function loadAllData(){
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
            addLog('数据加载完成');
        } catch (e) {
            if (e.message === 'Unauthorized') logout();
            else showToast('数据加载失败：' + escapeHtml(e.message), 'error');
        }
    }

    async function loadRanking() {
        const rankList = document.getElementById('rankList');
        rankList.innerHTML = '<div class="empty">加载中...</div>';
        try {
            const data = await apiFetch('/admin/topclicks?limit=20');
            if (!data.length) { rankList.innerHTML = '<div class="empty">暂无点击数据</div>'; return; }
            rankList.innerHTML = data.map(item => `
                <div class="link-item">
                    <div class="link-info"><div>${escapeHtml(item.title)}</div><div class="link-url">${escapeHtml(item.url)}</div></div>
                    <span class="badge badge-blue">${item.count}次点击</span>
                </div>
            `).join('');
        } catch { rankList.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    async function loadFeedback() {
        const listEl = document.getElementById('feedbackList');
        listEl.innerHTML = '<div class="empty">加载中...</div>';
        try {
            const data = await apiFetch('/admin/dead-link-reports');
            if (!data.length) { listEl.innerHTML = '<div class="empty">暂无用户反馈</div>'; return; }
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
            if (groups.today.length) html += `<div class="feedback-date-group"><h4>📅 今天</h4>${renderFeedbackItems(groups.today)}</div>`;
            if (groups.yesterday.length) html += `<div class="feedback-date-group"><h4>📅 昨天</h4>${renderFeedbackItems(groups.yesterday)}</div>`;
            if (groups.older.length) html += `<div class="feedback-date-group"><h4>📅 更早</h4>${renderFeedbackItems(groups.older)}</div>`;
            listEl.innerHTML = html;
        } catch { listEl.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    function renderFeedbackItems(items) {
        return items.map(item => `
            <div class="link-item">
                <div class="link-info">
                    <div><strong>${escapeHtml(item.title || '无标题')}</strong></div>
                    <div class="link-url">${escapeHtml(item.url)}</div>
                    <div style="font-size:10px; color:#999;">来自 ${escapeHtml(item.reporter_ip)} 于 ${new Date(item.report_time).toLocaleString()}</div>
                </div>
                <div class="link-actions">
                    <button class="sm primary" onclick="window.adminApp.replaceLink(${item.id}, ${item.site_id || 0}, '${escapeHtml(item.url)}', '${escapeHtml(item.title)}')">更换链接</button>
                    <button class="sm primary" onclick="window.adminApp.markFeedbackDone(${item.id})">标记已处理</button>
                </div>
            </div>
        `).join('');
    }

    const adminObj = {
        markFeedbackDone: async (id) => {
            try {
                await apiFetch(`/admin/report-status/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) });
                showToast('已标记处理（12小时后自动清除）', 'success');
                loadFeedback();
            } catch { showToast('操作失败', 'error'); }
        },
        replaceLink: async (reportId, siteId, oldUrl, oldTitle) => {
            if (!siteId) { showToast('无法找到对应的网站记录', 'error'); return; }
            const site = sites.find(s => s.id === siteId);
            if (!site) { showToast('未找到对应的网站记录', 'error'); return; }
            openModal('更换链接', `
                <div class="form-row"><label>标题</label><input id="newTitle" value="${escapeHtml(site.title)}"></div>
                <div class="form-row"><label>网址</label><input id="newUrl" value="${escapeHtml(site.url)}"></div>
                <div class="form-row"><label>描述</label><input id="newDesc" value="${escapeHtml(site.description || '')}"></div>
                <div class="form-row"><label>图标</label><input id="newIcon" value="${escapeHtml(site.icon || 'fas fa-link')}"></div>
            `, async () => {
                const newTitle = document.getElementById('newTitle').value.trim();
                const newUrl = document.getElementById('newUrl').value.trim();
                const newDesc = document.getElementById('newDesc').value.trim();
                const newIcon = document.getElementById('newIcon').value.trim();
                if (!newTitle || !newUrl) { showToast('标题和网址不能为空', 'error'); return; }
                if (!checkUrl(newUrl)) { showToast('网址格式错误或包含危险协议', 'error'); return; }
                try {
                    await apiFetch('/admin/replace-link', {
                        method: 'POST',
                        body: JSON.stringify({ reportId, siteId, newUrl, newTitle, newDescription: newDesc, newIcon })
                    });
                    showToast('链接已更新，无效标记已清除', 'success');
                    loadFeedback();
                    await loadAllData();
                    await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                } catch (err) { showToast('更换失败：' + err.message, 'error'); }
            });
        }
    };
    window.adminApp = adminObj;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.getElementById(`${tab}Tab`).classList.remove('hidden');
            if (tab === 'rank') loadRanking();
            if (tab === 'feedback') loadFeedback();
        }
    });

    function selectCat(cid){
        currentCat = cid; currentSub = null;
        document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
        const targetCat = document.querySelector(`.cat-item[data-cid="${cid}"]`);
        if (targetCat) targetCat.classList.add('active');
        renderSubList();
        const subs = subcategories.filter(s => s.category_id === cid);
        if (subs.length > 0) selectSub(subs[0].id);
        else document.getElementById('siteList').innerHTML = '<div class="empty">请先添加子分类</div>';
    }

    function selectSub(sid){
        currentSub = sid;
        document.querySelectorAll('.sub-item').forEach(i => i.classList.remove('active'));
        const targetSub = document.querySelector(`.sub-item[data-sid="${sid}"]`);
        if (targetSub) targetSub.classList.add('active');
        renderSiteList();
    }

    function renderCatBar(){
        if (!categories.length){
            document.getElementById('catBar').innerHTML = '<div class="empty" style="width:100%">请先添加一级分类</div>';
            document.getElementById('subList').innerHTML = '<div class="empty">请先添加一级分类</div>';
            document.getElementById('siteList').innerHTML = '<div class="empty">请先添加一级分类</div>';
            return;
        }
        document.getElementById('catBar').innerHTML = categories.map(c => `
            <div class="cat-item ${c.id===currentCat?'active':''}" data-cid="${c.id}">
                <span onclick="window.selectCat(${c.id})">${escapeHtml(c.name)}</span>
                <button class="rename-text-btn" onclick="window.renameCategory(${c.id}, '${escapeHtml(c.name)}')">修改</button>
            </div>
        `).join('');
    }

    function renderSubList(){
        if (!currentCat){ document.getElementById('subList').innerHTML = '<div class="empty">请先选择一级分类</div>'; return; }
        const subs = subcategories.filter(s => s.category_id === currentCat);
        if (!subs.length){ document.getElementById('subList').innerHTML = '<div class="empty">请先添加子分类</div>'; return; }
        document.getElementById('subList').innerHTML = subs.map(s => `
            <div class="sub-item ${s.id===currentSub?'active':''}" data-sid="${s.id}">
                <span onclick="window.selectSub(${s.id})">${escapeHtml(s.name)}</span>
                <button class="rename-text-btn" onclick="window.renameSubcategory(${s.id}, '${escapeHtml(s.name)}')">修改</button>
            </div>
        `).join('');
    }

    function renderSiteList(){
        if (!currentSub){ document.getElementById('siteList').innerHTML = '<div class="empty">请先选择子分类</div>'; return; }
        const list = sites.filter(s => s.subcategory_id === currentSub);
        if (!list.length){ document.getElementById('siteList').innerHTML = '<div class="empty">暂无链接</div>'; return; }
        document.getElementById('siteList').innerHTML = list.map(s => `
            <div class="link-item">
                <div class="link-info"><div>${escapeHtml(s.title)}</div></div>
                <div class="link-actions">
                    <button class="sm primary" onclick="window.openEditSite(${s.id})">编辑</button>
                    <button class="sm danger" onclick="window.delSite(${s.id})">删除</button>
                </div>
            </div>
        `).join('');
    }

    function openAddCat(){
        openModal('新增一级分类', `
            <div class="form-row"><label>名称</label><input id="name"></div>
            <div class="form-row"><label>排序</label><input type="number" id="sort" value="${categories.length}"></div>
        `, async () => {
            const name = document.getElementById('name').value.trim();
            if (!name) { showToast('请填名称', 'error'); return; }
            await apiFetch('/admin/categories', { method:'POST', body: JSON.stringify({ name, display_order: +document.getElementById('sort').value }) });
            addLog(`新增分类：${name}`); showToast('添加成功'); await loadAllData();
        });
    }

    function openAddSub(){
        if (!currentCat) { showToast('请先选择一级分类', 'error'); return; }
        openModal('新增子分类', `
            <div class="form-row"><label>名称</label><input id="name"></div>
            <div class="form-row"><label>排序</label><input type="number" id="sort" value="0"></div>
        `, async () => {
            const name = document.getElementById('name').value.trim();
            if (!name) { showToast('请填名称', 'error'); return; }
            await apiFetch('/admin/subcategories', { method:'POST', body: JSON.stringify({ category_id: currentCat, name, display_order: +document.getElementById('sort').value }) });
            addLog(`新增子分类：${name}`); showToast('添加成功'); await loadAllData();
        });
    }

    function openAddSite(){
        if (!currentSub) { showToast('请先选择子分类', 'error'); return; }
        openModal('新增链接', `
            <div class="form-row"><label>标题</label><input id="title"></div>
            <div class="form-row">
                <label>网址</label>
                <div style="display:flex; gap: 4px; align-items: center;">
                    <input id="url" oninput="document.getElementById('icon').value=window.getFavicon(this.value)" style="flex:1;">
                    <button type="button" id="fetchInfoBtn" class="fetch-info-btn" onclick="window.fetchSiteInfo('url','title','icon','desc')">获取信息</button>
                </div>
            </div>
            <div class="form-row"><label>图标</label><input id="icon" value="fas fa-link"></div>
            <div class="form-row"><label>描述</label><input id="desc"></div>
            <div class="form-row"><label>排序</label><input type="number" id="sort" value="0"></div>
        `, async () => {
            const t = document.getElementById('title').value, u = document.getElementById('url').value;
            if (!t || !u) { showToast('标题/网址必填', 'error'); return; }
            if (!checkUrl(u)) { showToast('网址格式错误或包含危险协议', 'error'); return; }
            await apiFetch('/admin/sites', { method:'POST', body: JSON.stringify({
                subcategory_id: currentSub, title:t, url:u, description: document.getElementById('desc').value,
                icon: document.getElementById('icon').value, display_order: +document.getElementById('sort').value
            })});
            addLog(`新增链接：${t}`); showToast('添加成功'); await loadAllData();
        });
    }

    function openEditSite(id){
        const s = sites.find(x => x.id === id);
        openModal('编辑链接', `
            <div class="form-row"><label>标题</label><input id="title" value="${escapeHtml(s.title)}"></div>
            <div class="form-row">
                <label>网址</label>
                <div style="display:flex; gap: 4px; align-items: center;">
                    <input id="url" value="${escapeHtml(s.url)}" oninput="document.getElementById('icon').value=window.getFavicon(this.value)" style="flex:1;">
                    <button type="button" id="fetchInfoBtn" class="fetch-info-btn" onclick="window.fetchSiteInfo('url','title','icon','desc')">获取信息</button>
                </div>
            </div>
            <div class="form-row"><label>图标</label><input id="icon" value="${escapeHtml(s.icon||'fas fa-link')}"></div>
            <div class="form-row"><label>描述</label><input id="desc" value="${escapeHtml(s.description||'')}"></div>
            <div class="form-row"><label>排序</label><input type="number" id="sort" value="${s.display_order}"></div>
        `, async () => {
            const t = document.getElementById('title').value, u = document.getElementById('url').value;
            if (!t || !u) { showToast('标题/网址必填', 'error'); return; }
            if (!checkUrl(u)) { showToast('网址格式错误或包含危险协议', 'error'); return; }
            await apiFetch(`/admin/sites/${id}`, { method:'PUT', body: JSON.stringify({
                title:t, url:u, description: document.getElementById('desc').value,
                icon: document.getElementById('icon').value, display_order: +document.getElementById('sort').value
            })});
            addLog(`编辑链接：${s.title}`); showToast('修改成功'); await loadAllData();
        });
    }

    async function delSite(id){
        if (!confirm('确定删除该链接？')) return;
        await apiFetch(`/admin/sites/${id}`, { method:'DELETE' });
        addLog(`删除链接：${id}`); showToast('删除成功'); await loadAllData();
    }

    function renameCategory(id, oldName) {
        openModal('修改分类名称', `<div class="form-row"><label>新名称</label><input id="newName" value="${escapeHtml(oldName)}"></div>`, async () => {
            const newName = document.getElementById('newName').value.trim();
            if (!newName) { showToast('名称不能为空', 'error'); return; }
            await apiFetch(`/admin/categories/${id}`, { method:'PUT', body: JSON.stringify({ name: newName }) });
            addLog(`修改分类：${oldName} → ${newName}`); showToast('修改成功'); await loadAllData();
        });
    }

    function renameSubcategory(id, oldName) {
        openModal('修改子分类名称', `<div class="form-row"><label>新名称</label><input id="newName" value="${escapeHtml(oldName)}"></div>`, async () => {
            const newName = document.getElementById('newName').value.trim();
            if (!newName) { showToast('名称不能为空', 'error'); return; }
            await apiFetch(`/admin/subcategories/${id}`, { method:'PUT', body: JSON.stringify({ name: newName }) });
            addLog(`修改子分类：${oldName} → ${newName}`); showToast('修改成功'); await loadAllData();
        });
    }

    function exportData(){
        const blob = new Blob([JSON.stringify({ categories, subcategories, sites, time: new Date().toLocaleString() }, null, 2)], { type:'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `导航备份_${new Date().getTime()}.json`;
        a.click();
        addLog('导出备份'); showToast('导出成功');
    }

    // ============= 事件绑定 =============
    document.getElementById('modalSubmit').onclick = async function(){
        if (!modalAction) return;
        const btn = this;
        btn.disabled = true;
        btn.textContent = '提交中…';
        try { await modalAction(); } catch (e) { showToast('操作失败', 'error'); }
        finally { btn.disabled = false; btn.textContent = '确认'; closeModal(); }
    };

    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('addCategoryBtn').addEventListener('click', openAddCat);
    document.getElementById('addSubBtn').addEventListener('click', openAddSub);
    document.getElementById('addSiteBtn').addEventListener('click', openAddSite);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('logBtn').addEventListener('click', showLogs);
    document.getElementById('sortRankBtn').addEventListener('click', loadRanking);
    document.getElementById('refreshFeedbackBtn').addEventListener('click', loadFeedback);
    document.getElementById('refreshNavBtn').addEventListener('click', async () => {
        if (!token) { showToast('请先登录', 'error'); return; }
        try { await apiFetch('/admin/refresh-navigation', { method:'POST' }); showToast('导航缓存已刷新', 'success'); }
        catch { showToast('刷新失败', 'error'); }
    });
    document.getElementById('tokenInput').addEventListener('keydown', e => e.key === 'Enter' && login());

    // 确保 modal 点击事件正确调用
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    document.getElementById('logModal').addEventListener('click', function(e) {
        if (e.target === this) closeLogModal();
    });

    updateLockMessage();

    // 暴露必要函数到全局
    window.selectCat = selectCat;
    window.selectSub = selectSub;
    window.renameCategory = renameCategory;
    window.renameSubcategory = renameSubcategory;
    window.openEditSite = openEditSite;
    window.delSite = delSite;
    window.getFavicon = getFavicon;
    window.fetchSiteInfo = fetchSiteInfo;
    window.closeModal = closeModal;
    window.closeLogModal = closeLogModal;

})();