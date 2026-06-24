(function() {
    'use strict';

    const API_BASE = (window.APP_CONFIG?.API_BASE) || 'https://api.xjdh688.ccwu.cc';
    const TOKEN_EXPIRE_HOURS = 1;
    const SESSION_REFRESH_BEFORE_MS = 5 * 60 * 1000;

    let token = '';
    let refreshToken = '';
    let csrfToken = '';
    let categories = [], subcategories = [], sites = [];
    let submissionsData = [];
    let feedbackData = [];
    let currentCat = null, currentSub = null;
    let modalAction = null;
    let currentSubmissionId = null;
    let refreshTimer = null;
    let currentAnnouncement = null;
    let currentCaptchaMd5key = null;
    let loginLocked = false;

    let selectedSiteIds = new Set();
    let customSelectInstances = [];
    let customSelects = {};

    function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    function showToast(msg, type = 'success') { const toast = document.getElementById('toast'); if (!toast) return; toast.textContent = msg; toast.className = `toast ${type} show`; clearTimeout(toast._timeout); toast._timeout = setTimeout(() => toast.classList.remove('show'), 2300); }
    function checkUrl(url) { try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; } }
    function autoResizeTextarea(textarea) { if (!textarea) return; textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px'; }
    function getDeviceId() { let deviceId = localStorage.getItem('device_id'); if (!deviceId) { deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15); localStorage.setItem('device_id', deviceId); } return deviceId; }
    function normalizeUrl(url) { if (!url) return ''; try { let normalized = url.toLowerCase().trim(); normalized = normalized.replace(/^https?:\/\//, ''); normalized = normalized.replace(/^www\./, ''); normalized = normalized.replace(/\/$/, ''); return normalized; } catch(e) { return url; } }
    function isUrlExists(url, excludeSiteId = null) { const normalizedNew = normalizeUrl(url); return sites.some(site => { if (excludeSiteId !== null && site.id === excludeSiteId) return false; const normalizedExisting = normalizeUrl(site.url); return normalizedExisting === normalizedNew; }); }

    function updateStats() {
        const totalSitesEl = document.getElementById('statTotalSites');
        const invalidEl = document.getElementById('statInvalid');
        const submissionsEl = document.getElementById('statSubmissions');
        const feedbackEl = document.getElementById('statFeedback');
        if (totalSitesEl) totalSitesEl.textContent = sites.length;
        if (invalidEl) { const invalidCount = sites.filter(s => s.is_valid === 0).length; invalidEl.textContent = invalidCount; }
        if (submissionsEl) submissionsEl.textContent = submissionsData ? submissionsData.length : 0;
        if (feedbackEl) feedbackEl.textContent = feedbackData ? feedbackData.length : 0;
    }

    async function apiFetch(endpoint, opt = {}) {
        const headers = { 'Content-Type': 'application/json', ...opt.headers };
        if (token) headers.Authorization = `Bearer ${token}`;
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
        const res = await fetch(API_BASE + endpoint, { ...opt, headers });
        const newCsrf = res.headers.get('X-CSRF-Token');
        if (newCsrf) csrfToken = newCsrf;
        if (res.status === 401) {
            if (refreshToken) {
                const refreshed = await refreshSessionToken();
                if (refreshed) return apiFetch(endpoint, opt);
            }
            logout();
            throw new Error('Unauthorized');
        }
        if (res.status === 403) { showToast('IP不在白名单或权限不足', 'error'); throw new Error('Forbidden'); }
        if (!res.ok) { const errText = await res.text().catch(() => '请求失败'); throw new Error(errText); }
        return res.json();
    }

    async function refreshSessionToken() {
        if (!refreshToken) return false;
        try {
            const res = await fetch(`${API_BASE}/admin/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
            if (!res.ok) return false;
            const data = await res.json();
            token = data.token;
            refreshToken = data.refreshToken;
            const csrf = data.csrfToken || '';
            csrfToken = csrf;
            sessionStorage.setItem('admin_token', token);
            sessionStorage.setItem('admin_refresh_token', refreshToken);
            sessionStorage.setItem('admin_csrf', csrf);
            sessionStorage.setItem('admin_expires', Date.now() + TOKEN_EXPIRE_HOURS * 3600000 + '');
            startSessionRefresh();
            showToast('会话已续期', 'success');
            return true;
        } catch (e) { console.warn('刷新令牌失败:', e); return false; }
    }

    function getStoredToken() {
        let tk = sessionStorage.getItem('admin_token');
        if (tk) {
            const exp = sessionStorage.getItem('admin_expires');
            if (exp && Date.now() < parseInt(exp, 10)) {
                refreshToken = sessionStorage.getItem('admin_refresh_token') || '';
                csrfToken = sessionStorage.getItem('admin_csrf') || '';
                return tk;
            }
            sessionStorage.removeItem('admin_token');
            sessionStorage.removeItem('admin_refresh_token');
            sessionStorage.removeItem('admin_csrf');
            sessionStorage.removeItem('admin_expires');
        }
        const rem = localStorage.getItem('admin_remember');
        if (rem === 'true') {
            tk = localStorage.getItem('admin_token_saved');
            const savedTime = localStorage.getItem('admin_saved_time');
            if (tk && savedTime && (Date.now() - parseInt(savedTime, 10) < TOKEN_EXPIRE_HOURS * 3600000)) {
                refreshToken = localStorage.getItem('admin_refresh_saved') || '';
                csrfToken = localStorage.getItem('admin_csrf_saved') || '';
                sessionStorage.setItem('admin_token', tk);
                sessionStorage.setItem('admin_refresh_token', refreshToken);
                sessionStorage.setItem('admin_csrf', csrfToken);
                sessionStorage.setItem('admin_expires', Date.now() + TOKEN_EXPIRE_HOURS * 3600000 + '');
                return tk;
            } else {
                localStorage.removeItem('admin_token_saved');
                localStorage.removeItem('admin_refresh_saved');
                localStorage.removeItem('admin_csrf_saved');
                localStorage.removeItem('admin_saved_time');
                localStorage.removeItem('admin_remember');
            }
        }
        return '';
    }

    function saveToken(tk, rtk, csrf, remember) {
        const exp = Date.now() + TOKEN_EXPIRE_HOURS * 3600000;
        sessionStorage.setItem('admin_token', tk);
        sessionStorage.setItem('admin_refresh_token', rtk);
        sessionStorage.setItem('admin_csrf', csrf);
        sessionStorage.setItem('admin_expires', exp + '');
        if (remember) {
            localStorage.setItem('admin_remember', 'true');
            localStorage.setItem('admin_token_saved', tk);
            localStorage.setItem('admin_refresh_saved', rtk);
            localStorage.setItem('admin_csrf_saved', csrf);
            localStorage.setItem('admin_saved_time', Date.now() + '');
        } else {
            localStorage.removeItem('admin_remember');
            localStorage.removeItem('admin_token_saved');
            localStorage.removeItem('admin_refresh_saved');
            localStorage.removeItem('admin_csrf_saved');
            localStorage.removeItem('admin_saved_time');
        }
        token = tk;
        refreshToken = rtk;
        csrfToken = csrf;
        startSessionRefresh();
    }

    function clearToken() {
        token = '';
        refreshToken = '';
        csrfToken = '';
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_refresh_token');
        sessionStorage.removeItem('admin_csrf');
        sessionStorage.removeItem('admin_expires');
        localStorage.removeItem('admin_remember');
        localStorage.removeItem('admin_token_saved');
        localStorage.removeItem('admin_refresh_saved');
        localStorage.removeItem('admin_csrf_saved');
        localStorage.removeItem('admin_saved_time');
        if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
    }

    function startSessionRefresh() {
        if (refreshTimer) clearTimeout(refreshTimer);
        const expires = parseInt(sessionStorage.getItem('admin_expires') || '0', 10);
        const now = Date.now();
        const delay = expires - now - SESSION_REFRESH_BEFORE_MS;
        if (delay > 0 && delay < 3600000) {
            refreshTimer = setTimeout(() => { refreshSessionToken().then(() => startSessionRefresh()); }, delay);
        } else if (delay <= 0 && token) {
            refreshSessionToken().then(() => startSessionRefresh());
        }
    }

    function updateLockMessage(locked) { const el = document.getElementById('loginLockMessage'); if (!el) return; if (locked) { el.textContent = '登录失败过多，请10分钟后重试'; el.style.display = 'block'; } else { el.style.display = 'none'; } }

    async function loadCaptcha() {
        const captchaGroup = document.getElementById('captchaGroup');
        const captchaImg = document.getElementById('captchaImg');
        if (!captchaGroup || !captchaImg) return;
        try {
            const response = await fetch(`${API_BASE}/admin/captcha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId() }
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
        } catch (err) { console.error('加载验证码异常:', err); showToast('验证码服务异常', 'error'); }
    }

    function refreshCaptcha() { loadCaptcha(); }

    async function login() {
        const rawToken = document.getElementById('tokenInput').value.trim();
        if (!rawToken) { showToast('请输入Token', 'error'); return; }
        const captchaCode = document.getElementById('captchaInput')?.value.trim() || '';
        if (!captchaCode) { showToast('请输入验证码', 'error'); return; }
        if (loginLocked) { showToast('登录已锁定，请10分钟后重试', 'error'); return; }
        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.textContent = '登录中…';
        try {
            const loginRes = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId() },
                body: JSON.stringify({ token: rawToken, captchaCode, md5key: currentCaptchaMd5key })
            });
            const loginData = await loginRes.json().catch(() => ({}));
            if (!loginRes.ok) {
                if (loginRes.status === 429) { loginLocked = true; updateLockMessage(true); showToast('登录失败过多，请10分钟后重试', 'error'); }
                throw new Error(loginData.error || '登录失败');
            }
            loginLocked = false;
            updateLockMessage(false);
            const sessionToken = loginData.token;
            const rtk = loginData.refreshToken;
            const csrf = loginData.csrfToken || '';
            const remember = document.getElementById('rememberToken').checked;
            saveToken(sessionToken, rtk, csrf, remember);
            await loadAllData();
            const loginWrapper = document.getElementById('loginWrapper');
            const mainContent = document.getElementById('mainContent');
            if (loginWrapper) loginWrapper.style.display = 'none';
            if (mainContent) mainContent.classList.remove('hidden');
            document.getElementById('tokenInput').value = '';
            document.getElementById('captchaInput').value = '';
            showToast('登录成功' + (remember ? '（已记住密码）' : ''));
        } catch (e) {
            token = '';
            showToast(e.message === 'Unauthorized' ? 'Token无效或验证码错误' : e.message || '登录失败', 'error');
            loadCaptcha();
        } finally { btn.disabled = false; btn.textContent = '登录'; }
    }

    function logout() {
        token = ''; refreshToken = ''; csrfToken = ''; clearToken();
        const loginWrapper = document.getElementById('loginWrapper');
        const mainContent = document.getElementById('mainContent');
        if (loginWrapper) loginWrapper.style.display = 'flex';
        if (mainContent) mainContent.classList.add('hidden');
        const tokenInput = document.getElementById('tokenInput');
        if (tokenInput) tokenInput.value = '';
        const captchaInput = document.getElementById('captchaInput');
        if (captchaInput) captchaInput.value = '';
        const captchaGroup = document.getElementById('captchaGroup');
        if (captchaGroup) captchaGroup.style.display = 'none';
        currentCaptchaMd5key = null;
        loadCaptcha();
        showToast('已退出');
    }

    function fetchSiteInfoHandler() {
        fetchSiteInfo('mUrl', 'mTitle', 'mIcon', 'mDesc');
    }

    async function fetchSiteInfo(urlInputId, titleInputId, iconInputId, descInputId) {
        const urlInput = document.getElementById(urlInputId);
        const titleInput = document.getElementById(titleInputId);
        const iconInput = document.getElementById(iconInputId);
        const descInput = document.getElementById(descInputId);
        if (!urlInput || !titleInput || !iconInput || !descInput) { showToast('输入框元素未找到', 'error'); return; }
        let rawUrl = urlInput.value.trim();
        if (!rawUrl) { showToast('请先输入网址', 'warn'); return; }
        if (!/^https?:\/\//i.test(rawUrl)) rawUrl = 'https://' + rawUrl;
        const btn = document.getElementById('fetchInfoBtn');
        if (btn) { btn.disabled = true; btn.textContent = '获取中...'; }
        try {
            const response = await fetch(`https://api.pearapi.ai/api/website/info/?url=${encodeURIComponent(rawUrl)}`);
            if (!response.ok) throw new Error('请求失败');
            const buffer = await response.arrayBuffer();
            let decoder = new TextDecoder('utf-8');
            let text = decoder.decode(buffer);
            if (text.includes('�')) { decoder = new TextDecoder('gbk'); text = decoder.decode(buffer); }
            const data = JSON.parse(text);
            if (data.code === 200 && data.data) {
                if (data.data.title) titleInput.value = data.data.title;
                if (data.data.icon) iconInput.value = data.data.icon;
                if (data.data.description) descInput.value = data.data.description;
                showToast('获取成功', 'success');
            } else { showToast('未获取到信息，请手动填写', 'warn'); }
        } catch (error) { console.error('获取网站信息失败:', error); showToast('获取失败，请手动填写', 'error'); }
        finally { if (btn) { btn.disabled = false; btn.textContent = '获取信息'; } }
    }

    async function loadAllData() {
        try {
            const [catData, subData, siteData, subDataList, feedbackDataList] = await Promise.all([
                apiFetch('/admin/categories'),
                apiFetch('/admin/subcategories'),
                apiFetch('/admin/sites'),
                apiFetch('/admin/submissions'),
                apiFetch('/admin/dead-link-reports')
            ]);
            categories = catData;
            subcategories = subData;
            sites = siteData;
            submissionsData = subDataList || [];
            feedbackData = feedbackDataList || [];
            renderCatBar();
            if (categories.length > 0) selectCat(categories[0].id);
            updateStats();
        } catch (e) { if (e.message === 'Unauthorized') logout(); else showToast('数据加载失败', 'error'); }
    }

    async function loadAllDataButKeepSelection() {
        try {
            const [catData, subData, siteData, subDataList, feedbackDataList] = await Promise.all([
                apiFetch('/admin/categories'),
                apiFetch('/admin/subcategories'),
                apiFetch('/admin/sites'),
                apiFetch('/admin/submissions'),
                apiFetch('/admin/dead-link-reports')
            ]);
            categories = catData;
            subcategories = subData;
            sites = siteData;
            submissionsData = subDataList || [];
            feedbackData = feedbackDataList || [];
            renderCatBar();
            if (currentCat) { selectCat(currentCat); if (currentSub) selectSub(currentSub); }
            updateStats();
        } catch (e) { if (e.message === 'Unauthorized') logout(); else showToast('数据加载失败', 'error'); }
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
        loadAdminSites(true);
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

    async function loadAdminSites(resetPage = true) {
        const subcategoryId = currentSub || '';
        const listEl = document.getElementById('siteList');
        listEl.innerHTML = '<div class="empty">加载中...</div>';
        try {
            let url = `/admin/sites-list?limit=9999`;
            if (subcategoryId) url += `&subcategory_id=${subcategoryId}`;
            const data = await apiFetch(url);
            const sitesData = data.sites || [];
            if (!sitesData.length) {
                listEl.innerHTML = '<div class="empty">暂无站点</div>';
                return;
            }
            renderSitesWithCheckboxes(sitesData);
            updateSelectedCount();
        } catch (e) { listEl.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    function renderSitesWithCheckboxes(sitesData) {
        const listEl = document.getElementById('siteList');
        listEl.style.display = 'grid';
        listEl.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
        listEl.style.gap = '10px';
        listEl.style.alignItems = 'stretch';

        listEl.innerHTML = sitesData.map(site => {
            const checked = selectedSiteIds.has(site.id) ? 'checked' : '';
            return `
                <div class="site-card-admin" style="
                    background: #fff;
                    border-radius: 8px;
                    padding: 10px 10px 8px;
                    border: 1px solid #eef2f6;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    min-height: 80px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    position: relative;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <input type="checkbox" class="site-checkbox" data-id="${site.id}" ${checked} style="
                            width: 16px;
                            height: 16px;
                            cursor: pointer;
                            flex-shrink: 0;
                            margin-top: 2px;
                            accent-color: #3b82f6;
                        ">
                        <button class="primary sm" data-action="editSite" data-id="${site.id}" style="
                            flex-shrink: 0;
                            padding: 2px 10px;
                            font-size: 10px;
                            border-radius: 6px;
                            background: #3b82f6;
                            color: #fff;
                            border: none;
                            cursor: pointer;
                            transition: background 0.2s;
                        ">编辑</button>
                    </div>
                    <div style="
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 4px 0 2px;
                    ">
                        <span style="
                            font-size: 13px;
                            font-weight: 500;
                            text-align: center;
                            color: #1e293b;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                            line-height: 1.3;
                        ">${escapeHtml(site.title)}</span>
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.site-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const id = parseInt(this.dataset.id);
                if (this.checked) selectedSiteIds.add(id);
                else selectedSiteIds.delete(id);
                updateSelectedCount();
            });
        });

        listEl.querySelectorAll('[data-action="editSite"]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                handleEditSite(parseInt(this.dataset.id));
            });
        });

        listEl.querySelectorAll('.site-card-admin').forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.site-checkbox') || e.target.closest('[data-action="editSite"]')) return;
                const editBtn = this.querySelector('[data-action="editSite"]');
                if (editBtn) editBtn.click();
            });
            card.addEventListener('mouseenter', function() {
                this.style.borderColor = '#3b82f6';
                this.style.boxShadow = '0 2px 8px rgba(59,130,246,0.12)';
            });
            card.addEventListener('mouseleave', function() {
                this.style.borderColor = '#eef2f6';
                this.style.boxShadow = 'none';
            });
        });
    }

    function updateSelectedCount() {
        const count = selectedSiteIds.size;
        document.getElementById('selectedCount').textContent = `已选 ${count} 个`;
        document.getElementById('batchDeleteBtn').disabled = count === 0;
        document.getElementById('batchMoveBtn').disabled = count === 0;
    }

    function toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.site-checkbox');
        if (!checkboxes.length) return;
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
            const id = parseInt(cb.dataset.id);
            if (cb.checked) selectedSiteIds.add(id);
            else selectedSiteIds.delete(id);
        });
        updateSelectedCount();
    }

    function clearSelection() {
        selectedSiteIds.clear();
        document.querySelectorAll('.site-checkbox').forEach(cb => cb.checked = false);
        updateSelectedCount();
    }

    async function batchDeleteSites() {
        if (selectedSiteIds.size === 0) { showToast('请先选择要删除的站点', 'warning'); return; }
        if (!confirm(`确定要删除选中的 ${selectedSiteIds.size} 个站点吗？此操作不可恢复！`)) return;
        const ids = Array.from(selectedSiteIds);
        try {
            const result = await apiFetch('/admin/sites/batch-delete', {
                method: 'POST',
                body: JSON.stringify({ siteIds: ids })
            });
            showToast(result.message || '删除成功', 'success');
            selectedSiteIds.clear();
            await loadAdminSites(true);
            await loadAllDataButKeepSelection();
        } catch (e) { showToast('批量删除失败: ' + e.message, 'error'); }
    }

    let batchMoveCustomSelect = null;

    async function batchMoveSites() {
        if (selectedSiteIds.size === 0) { showToast('请先选择要移动的站点', 'warning'); return; }
        const subcategoriesData = await apiFetch('/admin/subcategories');
        if (!subcategoriesData || !subcategoriesData.length) { showToast('暂无子分类可移动', 'error'); return; }
        const subOptions = subcategoriesData.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

        openModal('批量移动站点',
            `<div style="margin-bottom:12px;">
                <label style="display:block;font-size:12px;margin-bottom:6px;color:#475569;">选择目标子分类：</label>
                <div id="batchMoveTargetWrapper"></div>
            </div>
            <div style="font-size:11px;color:#64748b;">将移动 ${selectedSiteIds.size} 个站点到选中的子分类</div>`,
            async () => {
                const wrapper = document.getElementById('batchMoveTargetWrapper');
                const trigger = wrapper?.querySelector('.custom-select-trigger');
                let targetId = null;
                if (trigger) {
                    const valueSpan = trigger.querySelector('.custom-select-value');
                    if (valueSpan) {
                        const selectedText = valueSpan.textContent;
                        const selectedOption = subcategoriesData.find(s => s.name === selectedText);
                        if (selectedOption) targetId = selectedOption.id;
                    }
                }
                if (!targetId) {
                    const select = document.getElementById('batchMoveTarget');
                    if (select) targetId = parseInt(select.value);
                }
                if (!targetId) { showToast('请选择目标子分类', 'error'); return; }
                const ids = Array.from(selectedSiteIds);
                const result = await apiFetch('/admin/sites/batch-move', {
                    method: 'POST',
                    body: JSON.stringify({ siteIds: ids, targetSubcategoryId: targetId })
                });
                showToast(result.message || '移动成功', 'success');
                selectedSiteIds.clear();
                await loadAdminSites(true);
                await loadAllDataButKeepSelection();
                closeModal();
            },
            false,
            null,
            function() {
                const wrapper = document.getElementById('batchMoveTargetWrapper');
                if (!wrapper) return;
                const select = document.createElement('select');
                select.id = 'batchMoveTarget';
                select.innerHTML = subOptions;
                wrapper.appendChild(select);
                if (batchMoveCustomSelect) {
                    batchMoveCustomSelect.destroy();
                    batchMoveCustomSelect = null;
                }
                batchMoveCustomSelect = new CustomSelect(select);
            },
            function() {
                if (batchMoveCustomSelect) {
                    batchMoveCustomSelect.destroy();
                    batchMoveCustomSelect = null;
                }
            }
        );
    }

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
        if (!title || !content) { showToast('标题和内容不能为空', 'error'); return; }
        if (title.length > 200) { showToast('标题不能超过200个字符', 'error'); return; }
        if (content.length > 10000) { showToast('内容不能超过10000个字符', 'error'); return; }
        const payload = { title, important: important || '', content, date: date || new Date().toISOString().slice(0,10), is_active };
        try {
            if (currentAnnouncement && currentAnnouncement.id) {
                await apiFetch(`/admin/announcements/${currentAnnouncement.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast('公告已更新', 'success');
            } else {
                const res = await apiFetch('/admin/announcements', { method: 'POST', body: JSON.stringify(payload) });
                currentAnnouncement = { id: res.id, ...payload };
                showToast('公告已发布', 'success');
            }
            if (window.announcementModule && window.announcementModule.loadAnnouncement) {
                window.announcementModule.loadAnnouncement();
            }
        } catch (err) { console.error('保存公告失败:', err); showToast('保存失败: ' + (err.message || '网络错误'), 'error'); }
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

    async function getNextSortValue(type, parentId = null) {
        try {
            let maxOrder = 0;
            if (type === 'category') { const max = categories.reduce((max, c) => Math.max(max, c.display_order || 0), 0); maxOrder = max; }
            else if (type === 'subcategory' && parentId) { const subs = subcategories.filter(s => s.category_id === parentId); const max = subs.reduce((max, s) => Math.max(max, s.display_order || 0), 0); maxOrder = max; }
            else if (type === 'site' && parentId) { const sitesList = sites.filter(s => s.subcategory_id === parentId); const max = sitesList.reduce((max, s) => Math.max(max, s.display_order || 0), 0); maxOrder = max; }
            return maxOrder + 1;
        } catch { return 0; }
    }

    function openModal(title, formHtml, submitCb, showDelete = false, deleteCb = null, onShow = null, onClose = null) {
        const modal = document.getElementById('modal');
        document.querySelector('#modal .modal-title').textContent = title;
        document.getElementById('modalForm').innerHTML = formHtml;
        modalAction = submitCb;
        const buttonsContainer = document.querySelector('#modal .modal-buttons');
        let html = '';
        if (showDelete && deleteCb) html += `<div class="modal-buttons-left" style="margin-right:auto;"><button class="danger" id="modalDeleteBtn">删除</button></div>`;
        html += `<button class="secondary" id="modalCancelBtn">取消</button><button class="primary" id="modalSubmit">确认</button>`;
        buttonsContainer.innerHTML = html;
        document.getElementById('modalCancelBtn').addEventListener('click', function() {
            closeModal();
            if (onClose) onClose();
        });
        document.getElementById('modalSubmit').addEventListener('click', handleModalSubmit);
        if (showDelete && deleteCb) {
            document.getElementById('modalDeleteBtn').addEventListener('click', async () => {
                if (confirm('确定删除？此操作不可恢复！')) { try { await deleteCb(); closeModal(); if (onClose) onClose(); } catch (e) { showToast('删除失败', 'error'); } }
            });
        }
        modal.classList.add('show');
        if (onShow) onShow();
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

    function closeModal() { document.getElementById('modal').classList.remove('show'); modalAction = null; }

    function handleModifyCategory(id, currentName) {
        const cat = categories.find(c => c.id === id);
        const currentOrder = cat?.display_order || 0;
        openModal('修改分类',
            `<div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">名称</label><input id="mName" class="form-input" value="${escapeHtml(currentName)}"></div>
             <div class="form-row"><label style="font-size:11px;">排序值（数字越小越靠前）</label><input type="number" id="mOrder" class="form-input" value="${currentOrder}" step="1"></div>`,
            async () => {
                const name = document.getElementById('mName').value.trim();
                const order = parseInt(document.getElementById('mOrder').value) || 0;
                if (!name) { showToast('名称不能为空', 'error'); return; }
                await apiFetch(`/admin/categories/${id}`, { method:'PUT', body: JSON.stringify({ name, display_order: order }) });
                showToast('修改成功'); await loadAllDataButKeepSelection();
            }, true, async () => {
                await apiFetch(`/admin/categories/${id}`, { method:'DELETE' });
                showToast('分类已删除'); await loadAllDataButKeepSelection();
            }
        );
    }

    function handleModifySub(id, currentName) {
        const sub = subcategories.find(s => s.id === id);
        const currentOrder = sub?.display_order || 0;
        openModal('修改子分类',
            `<div class="form-row" style="margin-bottom:12px;"><label style="font-size:11px;">名称</label><input id="mName" class="form-input" value="${escapeHtml(currentName)}"></div>
             <div class="form-row"><label style="font-size:11px;">排序值（数字越小越靠前）</label><input type="number" id="mOrder" class="form-input" value="${currentOrder}" step="1"></div>`,
            async () => {
                const name = document.getElementById('mName').value.trim();
                const order = parseInt(document.getElementById('mOrder').value) || 0;
                if (!name) { showToast('名称不能为空', 'error'); return; }
                await apiFetch(`/admin/subcategories/${id}`, { method:'PUT', body: JSON.stringify({ name, display_order: order }) });
                showToast('修改成功'); await loadAllDataButKeepSelection();
            }, true, async () => {
                await apiFetch(`/admin/subcategories/${id}`, { method:'DELETE' });
                showToast('子分类已删除'); await loadAllDataButKeepSelection();
            }
        );
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
                if (isUrlExists(url, id)) { showToast('该网址已存在，请勿重复添加', 'error'); return; }
                await apiFetch(`/admin/sites/${id}`, { method:'PUT', body: JSON.stringify({
                    title, url, description: document.getElementById('mDesc').value,
                    icon: document.getElementById('mIcon').value, display_order: +document.getElementById('mSort').value
                })});
                showToast('修改成功');
                await loadAdminSites(true);
                await loadAllDataButKeepSelection();
            }, true,
            async () => {
                await apiFetch(`/admin/sites/${id}`, { method:'DELETE' });
                showToast('删除成功');
                await loadAdminSites(true);
                await loadAllDataButKeepSelection();
            }
        );
        setTimeout(() => {
            const descTextarea = document.getElementById('mDesc');
            if (descTextarea) {
                autoResizeTextarea(descTextarea);
                descTextarea.addEventListener('input', function() { autoResizeTextarea(this); });
            }
            const fetchBtn = document.getElementById('fetchInfoBtn');
            if (fetchBtn) {
                fetchBtn.removeEventListener('click', fetchSiteInfoHandler);
                fetchBtn.addEventListener('click', fetchSiteInfoHandler);
            }
        }, 150);
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
                showToast('添加成功');
                await loadAllDataButKeepSelection();
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
                showToast('添加成功');
                await loadAllDataButKeepSelection();
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
                if (isUrlExists(url)) { showToast('该网址已存在，请勿重复添加', 'error'); return; }
                await apiFetch('/admin/sites', { method:'POST', body: JSON.stringify({
                    subcategory_id: currentSub,
                    title,
                    url,
                    description: document.getElementById('mDesc').value,
                    icon: document.getElementById('mIcon').value,
                    display_order: +document.getElementById('mSort').value
                })});
                showToast('添加成功', 'success');
                closeModal();
                await loadAdminSites(true);
                await loadAllDataButKeepSelection();
            }
        );
        setTimeout(() => {
            const descTextarea = document.getElementById('mDesc');
            if (descTextarea) {
                autoResizeTextarea(descTextarea);
                descTextarea.addEventListener('input', function() { autoResizeTextarea(this); });
            }
            const fetchBtn = document.getElementById('fetchInfoBtn');
            if (fetchBtn) {
                fetchBtn.removeEventListener('click', fetchSiteInfoHandler);
                fetchBtn.addEventListener('click', fetchSiteInfoHandler);
            }
        }, 150);
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
            feedbackData = data || [];
            updateStats();
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
                    <div class="link-info">
                        <strong>${escapeHtml(item.title||'无标题')}</strong>
                        <div style="font-size:10px;color:#999">于 ${new Date(item.report_time).toLocaleString()}</div>
                    </div>
                    <div class="link-actions">
                        <button class="sm primary" data-action="replaceLink" data-reportid="${item.id}" data-siteid="${item.site_id||0}" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(item.title||'')}">更换链接</button>
                        <button class="sm danger" data-action="ignoreLink" data-reportid="${item.id}" style="margin-left:5px;">忽略</button>
                    </div>
                </div>
            `).join('');
            if (groups.today.length) html += `<div class="feedback-date-group"><h4 style="font-size:12px;">📅 今天</h4>${renderItems(groups.today)}</div>`;
            if (groups.yesterday.length) html += `<div class="feedback-date-group"><h4 style="font-size:12px;">📅 昨天</h4>${renderItems(groups.yesterday)}</div>`;
            if (groups.older.length) html += `<div class="feedback-date-group"><h4 style="font-size:12px;">📅 更早</h4>${renderItems(groups.older)}</div>`;
            list.innerHTML = html;
            list.querySelectorAll('[data-action="replaceLink"]').forEach(btn => btn.addEventListener('click', replaceLinkHandler));
            list.querySelectorAll('[data-action="ignoreLink"]').forEach(btn => btn.addEventListener('click', ignoreLinkHandler));
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
                if (isUrlExists(newUrl, siteId)) { showToast('新网址已存在，请勿重复添加', 'error'); return; }
                await apiFetch('/admin/replace-link', {
                    method: 'POST',
                    body: JSON.stringify({ reportId, siteId, newUrl, newTitle, newDescription: document.getElementById('mDesc').value, newIcon: document.getElementById('mIcon').value })
                });
                showToast('链接已更新', 'success');
                await loadFeedback();
                await loadAllDataButKeepSelection();
                await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                refreshNavigationStats();
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

    async function ignoreLinkHandler(e) {
        const btn = e.currentTarget;
        const reportId = parseInt(btn.dataset.reportid);
        if (!reportId) { showToast('无效的报告ID', 'error'); return; }
        if (!confirm('确定忽略此反馈吗？忽略后该链接仍为有效状态，且不再显示此反馈。')) return;
        try {
            await apiFetch(`/admin/dead-link-reports/${reportId}`, { method: 'DELETE' });
            showToast('已忽略', 'success');
            await loadFeedback();
        } catch (err) { showToast('忽略失败: ' + (err.message || '网络错误'), 'error'); }
    }

    async function exportFullData() {
        try {
            const response = await fetch(`${API_BASE}/admin/export`, {
                headers: { 'Authorization': `Bearer ${token}`, 'X-CSRF-Token': csrfToken }
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
        } catch (err) { showToast('导出失败', 'error'); }
    }

    async function importData() {
        const fileInput = document.getElementById('importFile');
        const mode = document.getElementById('importMode').value;
        if (mode !== 'merge' && mode !== 'overwrite') { showToast('无效的导入模式', 'error'); return; }
        if (!fileInput.files || !fileInput.files[0]) { showToast('请选择 JSON 文件', 'warn'); return; }
        const file = fileInput.files[0];
        if (file.size > 10 * 1024 * 1024) { showToast('文件不能超过 10MB', 'error'); return; }
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data.categories || !data.subcategories || !data.sites) { showToast('无效的导入文件格式', 'error'); return; }
            const confirmMsg = mode === 'overwrite' ? '覆盖模式将清空现有数据，确定继续吗？' : '合并模式将更新/添加数据，确定继续吗？';
            if (!confirm(confirmMsg)) return;
            const response = await fetch(`${API_BASE}/admin/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-CSRF-Token': csrfToken },
                body: JSON.stringify({ mode, data })
            });
            const result = await response.json();
            if (response.ok) {
                showToast('导入成功', 'success');
                await loadAllDataButKeepSelection();
                await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                refreshNavigationStats();
                closeImportModal();
            } else {
                showToast(result.error || '导入失败', 'error');
            }
        } catch (err) { showToast('导入失败: ' + err.message, 'error'); }
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

    let cachedSubmissions = null;
    let submissionsCacheTime = 0;
    const SUBMISSIONS_CACHE_TTL = 30000;

    async function fetchSubmissions(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && cachedSubmissions && (now - submissionsCacheTime) < SUBMISSIONS_CACHE_TTL) {
            return cachedSubmissions;
        }
        const data = await apiFetch('/admin/submissions');
        cachedSubmissions = data;
        submissionsCacheTime = now;
        return data;
    }

    async function loadSubmissions() {
        const list = document.getElementById('submissionsList');
        list.innerHTML = '<div class="empty">加载中...</div>';
        try {
            const data = await fetchSubmissions(true);
            submissionsData = data || [];
            updateStats();
            if (!data.length) { list.innerHTML = '<div class="empty">暂无待审核网站</div>'; return; }
            list.innerHTML = data.map(item => `
                <div class="link-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <span><strong class="submission-title-truncate" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong></span>
                    <button class="sm primary" data-action="viewSubmission" data-id="${item.id}">查看</button>
                </div>
            `).join('');
            list.querySelectorAll('[data-action="viewSubmission"]').forEach(btn => {
                btn.addEventListener('click', () => openSubmissionDetail(parseInt(btn.dataset.id)));
            });
        } catch (e) { list.innerHTML = '<div class="empty">加载失败</div>'; }
    }

    function cleanupCustomSelects() {
        if (customSelects.cat && typeof customSelects.cat.destroy === 'function') {
            customSelects.cat.destroy();
        }
        if (customSelects.sub && typeof customSelects.sub.destroy === 'function') {
            customSelects.sub.destroy();
        }
        customSelects = {};
        customSelectInstances.forEach(inst => {
            if (inst && typeof inst.destroy === 'function') {
                inst.destroy();
            }
        });
        customSelectInstances = [];
    }

    async function openSubmissionDetail(id) {
        currentSubmissionId = id;
        const detailModal = document.getElementById('submissionDetailModal');
        const contentDiv = document.getElementById('submissionDetailContent');

        cleanupCustomSelects();

        const removeModalListeners = () => {
            const newCloseBtn = detailModal.querySelector('#closeDetailModalBtn');
            if (newCloseBtn) {
                const newClone = newCloseBtn.cloneNode(true);
                newCloseBtn.parentNode.replaceChild(newClone, newCloseBtn);
                newClone.onclick = () => {
                    cleanupCustomSelects();
                    detailModal.classList.remove('show');
                };
            }
            detailModal.onclick = (e) => {
                if (e.target === detailModal) {
                    cleanupCustomSelects();
                    detailModal.classList.remove('show');
                }
            };
        };

        try {
            let data = submissionsData;
            if (!data.length || !data.find(s => s.id === id)) {
                data = await fetchSubmissions(true);
                submissionsData = data;
                updateStats();
            }
            const item = data.find(s => s.id === id);
            if (!item) {
                showToast('未找到该投稿（可能已被删除）', 'error');
                return;
            }
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

            customSelects.cat = new CustomSelect(catSelect, async (value) => {
                subSelect.innerHTML = '<option value="">加载中...</option>';
                if (customSelects.sub) {
                    customSelects.sub.destroy();
                    customSelects.sub = null;
                }
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
            customSelectInstances.push(customSelects.cat);
            customSelects.sub = new CustomSelect(subSelect);
            customSelectInstances.push(customSelects.sub);

            document.getElementById('doApproveBtn').onclick = async () => {
                const catSelectEl = document.getElementById('approveCatSelect');
                const subSelectEl = document.getElementById('approveSubSelect');
                let catId = null, subId = null;
                if (catSelectEl) catId = parseInt(catSelectEl.value);
                if (subSelectEl) subId = parseInt(subSelectEl.value);
                if (!catId || !subId) { showToast('请选择一级分类和二级分类', 'error'); return; }
                const displayOrder = document.getElementById('approveOrder').value || 0;
                const editedTitle = document.getElementById('editTitle').value.trim();
                const editedUrl = document.getElementById('editUrl').value.trim();
                const editedIcon = document.getElementById('editIcon').value.trim();
                const editedDesc = document.getElementById('editDesc').value.trim();
                const editedContact = document.getElementById('editContact').value.trim();
                const sendEmail = document.getElementById('sendEmailCheckbox').checked;
                if (!editedTitle || !editedUrl) { showToast('标题和网址不能为空', 'error'); return; }
                if (!checkUrl(editedUrl)) { showToast('网址格式错误', 'error'); return; }
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
                    cleanupCustomSelects();
                    await loadSubmissions();
                    await loadAllDataButKeepSelection();
                    await apiFetch('/admin/refresh-navigation', { method: 'POST' });
                    refreshNavigationStats();
                } catch (err) { showToast('操作失败', 'error'); }
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
                    cleanupCustomSelects();
                    await loadSubmissions();
                } catch (err) { showToast('操作失败', 'error'); }
            };

            removeModalListeners();
            detailModal.classList.add('show');
        } catch (err) {
            console.error('加载投稿详情失败:', err);
            showToast('加载详情失败: ' + (err.message || '请检查网络'), 'error');
        }
    }

    async function refreshIcons() {
        const btn = document.getElementById('refreshIconsBtn');
        if (!btn) return;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '刷新中...';
        try {
            const response = await fetch(`${API_BASE}/admin/refresh-icons`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'X-CSRF-Token': csrfToken }
            });
            const data = await response.json();
            if (response.ok) {
                showToast(data.message || '图标缓存已刷新，新图标将在下次加载时生效', 'success');
            } else {
                showToast(data.error || '刷新失败', 'error');
            }
        } catch (err) { showToast('刷新失败: ' + err.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = originalText; }
    }

    function refreshNavigationStats() {
        if (window.optimizedNavigation && typeof window.optimizedNavigation.calculateTotalValidSites === 'function') {
            window.optimizedNavigation.calculateTotalValidSites().catch(e => console.warn('更新导航统计失败:', e));
        }
    }

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
            if (this.wrapper && this.wrapper.parentNode) {
                this.wrapper.parentNode.removeChild(this.wrapper);
            }
            this.select.style.display = '';
            this.select = null;
            this.wrapper = null;
            this.trigger = null;
            this.dropdown = null;
            this.options = null;
        }
    }

    function injectGlobalStyles() {
        if (!document.getElementById('admin-global-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-global-styles';
            style.textContent = ``;
            document.head.appendChild(style);
        }
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
                if (tabId === 'manage') loadAdminSites(true);
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
                refreshNavigationStats();
            } catch (err) { showToast('刷新失败', 'error'); }
        });
        document.getElementById('refreshIconsBtn').addEventListener('click', refreshIcons);
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

        document.getElementById('batchSelectAll')?.addEventListener('click', toggleSelectAll);
        document.getElementById('batchClearSelection')?.addEventListener('click', clearSelection);
        document.getElementById('batchDeleteBtn')?.addEventListener('click', batchDeleteSites);
        document.getElementById('batchMoveBtn')?.addEventListener('click', batchMoveSites);
    }

    injectGlobalStyles();

    loginLocked = localStorage.getItem('login_locked') === 'true';
    updateLockMessage(loginLocked);

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

    setupEventDelegation();

    window.addEventListener('beforeunload', () => {});
})();