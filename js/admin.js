// admin.js - 星聚导航后台管理（单公告编辑版）
(function() {
    const API_BASE = (window.APP_CONFIG?.API_BASE) || 'https://api.xjdh688.ccwu.cc';
    const TOKEN_EXPIRE_HOURS = 1;
    let token = '', categories = [], subcategories = [], sites = [];
    let currentCat = null, currentSub = null;
    let failCount = parseInt(sessionStorage.getItem('login_fail_count') || '0', 10);
    let lockUntil = parseInt(sessionStorage.getItem('login_lock_until') || '0', 10);
    let modalAction = null, refreshTimer = null, customSelects = {};

    function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    function showToast(msg, type='success') { const toast = document.getElementById('toast'); if(!toast) return; toast.textContent = msg; toast.className = `toast ${type} show`; clearTimeout(toast._timeout); toast._timeout = setTimeout(() => toast.classList.remove('show'), 2300); }
    function checkUrl(url) { try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; } }
    function autoResizeTextarea(t) { if(t){ t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; } }

    function getStoredToken() {
        let tk = sessionStorage.getItem('admin_token');
        if(tk) { const exp = sessionStorage.getItem('admin_expires'); if(exp && Date.now() < parseInt(exp,10)) return tk; sessionStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_expires'); }
        const rem = localStorage.getItem('admin_remember');
        if(rem === 'true') {
            tk = localStorage.getItem('admin_token_saved');
            const savedTime = localStorage.getItem('admin_saved_time');
            if(tk && savedTime && (Date.now() - parseInt(savedTime,10) < TOKEN_EXPIRE_HOURS*3600000)) {
                sessionStorage.setItem('admin_token', tk);
                sessionStorage.setItem('admin_expires', Date.now() + TOKEN_EXPIRE_HOURS*3600000 + '');
                return tk;
            } else { localStorage.removeItem('admin_token_saved'); localStorage.removeItem('admin_saved_time'); localStorage.removeItem('admin_remember'); }
        }
        return '';
    }
    function saveToken(tk, remember) {
        const exp = Date.now() + TOKEN_EXPIRE_HOURS*3600000;
        sessionStorage.setItem('admin_token', tk); sessionStorage.setItem('admin_expires', exp+'');
        if(remember) { localStorage.setItem('admin_remember','true'); localStorage.setItem('admin_token_saved', tk); localStorage.setItem('admin_saved_time', Date.now()+''); }
        else { localStorage.removeItem('admin_remember'); localStorage.removeItem('admin_token_saved'); localStorage.removeItem('admin_saved_time'); }
        startSessionRefresh();
    }
    function clearToken() { sessionStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_expires'); localStorage.removeItem('admin_remember'); localStorage.removeItem('admin_token_saved'); localStorage.removeItem('admin_saved_time'); if(refreshTimer) clearTimeout(refreshTimer); refreshTimer=null; }
    async function refreshSession() {
        if(!token) return false;
        try {
            const res = await fetch(`${API_BASE}/admin/refresh-session`, { method:'POST', headers:{'Authorization':`Bearer ${token}`} });
            if(res.ok) { const data = await res.json(); token = data.sessionToken; saveToken(token,false); showToast('会话已续期','success'); return true; }
            else if(res.status===401) { logout(); return false; }
        } catch(e) {}
        return false;
    }
    function startSessionRefresh() { if(refreshTimer) clearTimeout(refreshTimer); const expires = parseInt(sessionStorage.getItem('admin_expires')||'0',10); const now = Date.now(); const delay = expires - now - 5*60*1000; if(delay>0 && delay<3600000) refreshTimer = setTimeout(()=>{ refreshSession().then(()=>startSessionRefresh()); }, delay); else if(delay<=0) refreshSession().then(()=>startSessionRefresh()); }
    function updateLockMessage() { const el = document.getElementById('loginLockMessage'); if(!el) return; if(Date.now() < lockUntil) el.textContent = `登录锁定中，剩余 ${Math.ceil((lockUntil-Date.now())/60000)} 分钟`; else el.textContent = ''; }
    function checkLock() { if(Date.now() < lockUntil) { updateLockMessage(); showToast('登录失败过多，锁定10分钟','error'); return false; } if(failCount >= 5) { lockUntil = Date.now() + 10*60*1000; sessionStorage.setItem('login_lock_until', lockUntil+''); sessionStorage.setItem('login_fail_count', failCount+''); updateLockMessage(); showToast('失败5次，锁定10分钟','error'); return false; } return true; }
    function recordLoginFailure() { failCount++; sessionStorage.setItem('login_fail_count', failCount+''); if(failCount>=5) { lockUntil = Date.now()+10*60*1000; sessionStorage.setItem('login_lock_until', lockUntil+''); updateLockMessage(); } }
    function resetLoginFailure() { failCount=0; lockUntil=0; sessionStorage.removeItem('login_fail_count'); sessionStorage.removeItem('login_lock_until'); const el = document.getElementById('loginLockMessage'); if(el) el.textContent = ''; }
    function openModal(title, formHtml, submitCb, showDelete=false, deleteCb=null) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalForm').innerHTML = formHtml;
        modalAction = submitCb;
        const btns = document.getElementById('modalButtons');
        let html = '';
        if(showDelete && deleteCb) html += `<div class="modal-buttons-left"><button class="danger" id="modalDeleteBtn">删除</button></div>`;
        html += `<button class="secondary" id="modalCancelBtn">取消</button><button class="primary" id="modalSubmit">确认</button>`;
        btns.innerHTML = html;
        document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
        document.getElementById('modalSubmit').addEventListener('click', handleModalSubmit);
        if(showDelete && deleteCb) document.getElementById('modalDeleteBtn').addEventListener('click', async ()=>{ if(confirm('确定删除？')){ try{ await deleteCb(); closeModal(); } catch(e){ showToast('删除失败','error'); } } });
        document.getElementById('modal').classList.add('show');
    }
    async function handleModalSubmit() { if(!modalAction) return; const btn = document.getElementById('modalSubmit'); btn.disabled=true; btn.textContent='提交中…'; try{ await modalAction(); } catch(e){ showToast('操作失败','error'); } finally{ btn.disabled=false; btn.textContent='确认'; } }
    function closeModal() { document.getElementById('modal').classList.remove('show'); modalAction=null; }
    async function apiFetch(endpoint, opt={}) {
        const headers = {'Content-Type':'application/json', ...opt.headers};
        if(token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(API_BASE+endpoint, {...opt, headers});
        if(res.status===401) { logout(); throw new Error('Unauthorized'); }
        if(res.status===403) { showToast('IP不在白名单','error'); throw new Error('Forbidden'); }
        if(!res.ok) throw new Error(await res.text() || '请求失败');
        return res.json();
    }
    async function fetchSiteInfo(urlId, titleId, iconId, descId) {
        const urlInput = document.getElementById(urlId);
        if(!urlInput) return;
        let rawUrl = urlInput.value.trim();
        if(!rawUrl) { showToast('请先输入网址','warn'); return; }
        if(!/^https?:\/\//i.test(rawUrl)) rawUrl = 'https://'+rawUrl;
        const btn = document.getElementById('fetchInfoBtn');
        if(btn) { btn.disabled=true; btn.textContent='获取中...'; }
        try {
            const resp = await fetch(`https://api.pearapi.ai/api/website/info/?url=${encodeURIComponent(rawUrl)}`);
            if(!resp.ok) throw new Error();
            const data = await resp.json();
            if(data.code===200 && data.data) {
                if(data.data.title) document.getElementById(titleId).value = data.data.title;
                if(data.data.icon) document.getElementById(iconId).value = data.data.icon;
                if(data.data.description) document.getElementById(descId).value = data.data.description;
                showToast('获取成功','success');
            } else showToast('无信息','warn');
        } catch { showToast('获取失败','error'); }
        finally { if(btn) { btn.disabled=false; btn.textContent='获取信息'; } }
    }

    async function login() {
        if(!checkLock()) return;
        const rawToken = document.getElementById('tokenInput').value.trim();
        if(!rawToken) { showToast('请输入Token','error'); return; }
        const btn = document.getElementById('loginBtn');
        btn.disabled=true; btn.textContent='登录中…';
        try {
            const loginRes = await fetch(`${API_BASE}/admin/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token:rawToken}) });
            if(!loginRes.ok) throw new Error((await loginRes.json().catch(()=>({}))).error || '登录失败');
            const loginData = await loginRes.json();
            token = loginData.sessionToken;
            resetLoginFailure();
            const remember = document.getElementById('rememberToken').checked;
            saveToken(token, remember);
            await apiFetch('/admin/categories');
            document.getElementById('loginWrapper').style.display = 'none';
            document.getElementById('mainContent').classList.remove('hidden');
            document.getElementById('tokenInput').value = '';
            await loadAllData();
            showToast('登录成功'+(remember?'（已记住密码）':''));
        } catch(e) { token=''; recordLoginFailure(); showToast(e.message==='Unauthorized'?'Token无效':e.message||'登录失败','error'); }
        finally { btn.disabled=false; btn.textContent='登录'; }
    }
    function logout() {
        token = ''; clearToken();
        document.getElementById('loginWrapper').style.display = 'flex';
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('tokenInput').value = '';
        showToast('已退出');
    }

    async function loadAllData() {
        try {
            const [catData, subData, siteData] = await Promise.all([ apiFetch('/admin/categories'), apiFetch('/admin/subcategories'), apiFetch('/admin/sites') ]);
            categories = catData; subcategories = subData; sites = siteData;
            renderCatBar();
            if(categories.length>0) selectCat(categories[0].id);
        } catch(e) { if(e.message==='Unauthorized') logout(); else showToast('数据加载失败','error'); }
    }
    function selectCat(cid) { currentCat=cid; currentSub=null; document.querySelectorAll('.cat-item').forEach(el=>el.classList.remove('active')); const target = document.querySelector(`.cat-item[data-cid="${cid}"]`); if(target) target.classList.add('active'); renderSubList(); const subs = subcategories.filter(s=>s.category_id===cid); if(subs.length>0) selectSub(subs[0].id); else document.getElementById('siteList').innerHTML='<div class="empty">请先添加子分类</div>'; }
    function selectSub(sid) { currentSub=sid; document.querySelectorAll('.sub-item').forEach(el=>el.classList.remove('active')); const target = document.querySelector(`.sub-item[data-sid="${sid}"]`); if(target) target.classList.add('active'); renderSiteList(); }
    function renderCatBar() { if(!categories.length){ document.getElementById('catBar').innerHTML='<div class="empty">暂无分类</div>'; return; } document.getElementById('catBar').innerHTML = categories.map(c=>`<div class="cat-item ${c.id===currentCat?'active':''}" data-cid="${c.id}"><span>${escapeHtml(c.name)}</span><button class="rename-text-btn" data-action="modifyCat" data-id="${c.id}" data-name="${escapeHtml(c.name)}">修改</button></div>`).join(''); }
    function renderSubList() { if(!currentCat){ document.getElementById('subList').innerHTML='<div class="empty">选择分类</div>'; return; } const subs = subcategories.filter(s=>s.category_id===currentCat); if(!subs.length){ document.getElementById('subList').innerHTML='<div class="empty">暂无子分类</div>'; return; } document.getElementById('subList').innerHTML = subs.map(s=>`<div class="sub-item ${s.id===currentSub?'active':''}" data-sid="${s.id}"><span>${escapeHtml(s.name)}</span><button class="rename-text-btn" data-action="modifySub" data-id="${s.id}" data-name="${escapeHtml(s.name)}">修改</button></div>`).join(''); }
    function renderSiteList() { if(!currentSub){ document.getElementById('siteList').innerHTML='<div class="empty">选择子分类</div>'; return; } const list = sites.filter(s=>s.subcategory_id===currentSub); if(!list.length){ document.getElementById('siteList').innerHTML='<div class="empty">暂无链接</div>'; return; } document.getElementById('siteList').innerHTML = list.map(s=>`<div class="link-item"><div class="link-info"><div><strong>${escapeHtml(s.title)}</strong></div></div><div class="link-actions"><button class="primary" data-action="editSite" data-id="${s.id}">编辑</button></div></div>`).join(''); }

    async function getNextSortValue(type, parentId=null) { try{ let max=0; if(type==='category') max = categories.reduce((m,c)=>Math.max(m,c.display_order||0),0); else if(type==='subcategory'&&parentId) max = subcategories.filter(s=>s.category_id===parentId).reduce((m,s)=>Math.max(m,s.display_order||0),0); else if(type==='site'&&parentId) max = sites.filter(s=>s.subcategory_id===parentId).reduce((m,s)=>Math.max(m,s.display_order||0),0); return max+1; } catch{ return 0; } }

    // ========== 公告单条编辑 ==========
    let currentAnnouncement = null;
    async function loadAnnouncementForEdit() {
        try {
            const data = await apiFetch('/admin/announcements');
            if(data && data.length>0) {
                currentAnnouncement = data[0];
                document.getElementById('annTitle').value = currentAnnouncement.title || '';
                // 解析content为重要内容和更新列表
                let focus = '', updates = [];
                const content = currentAnnouncement.content || '';
                const focusMatch = content.match(/<div class="focus-content">([\s\S]*?)<\/div>/);
                if(focusMatch) focus = focusMatch[1];
                const updatesMatch = content.match(/<div class="updates-list">([\s\S]*?)<\/div>/);
                if(updatesMatch) {
                    const lis = updatesMatch[1].match(/<li>(.*?)<\/li>/g);
                    if(lis) updates = lis.map(li => li.replace(/<\/?li>/g, '').trim());
                }
                document.getElementById('annFocus').value = focus;
                const updatesContainer = document.getElementById('updatesContainer');
                updatesContainer.innerHTML = '';
                if(updates.length===0) updates.push('');
                updates.forEach(u => {
                    const div = document.createElement('div'); div.className = 'update-item';
                    div.innerHTML = `<input type="text" class="update-input" value="${escapeHtml(u)}" placeholder="更新项"> <button type="button" class="remove-update-btn sm danger" style="padding:4px 8px;">×</button>`;
                    updatesContainer.appendChild(div);
                });
                document.getElementById('annActive').checked = currentAnnouncement.is_active === 1;
                const publishTime = currentAnnouncement.created_at ? new Date(currentAnnouncement.created_at).toLocaleString() : '';
                document.getElementById('annPublishTime').value = publishTime;
            } else {
                clearAnnouncementForm();
                document.getElementById('annPublishTime').value = '';
            }
        } catch(e) { showToast('加载公告失败','error'); }
    }
    function clearAnnouncementForm() {
        document.getElementById('annTitle').value = '';
        document.getElementById('annFocus').value = '';
        const container = document.getElementById('updatesContainer');
        container.innerHTML = '<div class="update-item"><input type="text" class="update-input" placeholder="更新项 1"><button type="button" class="remove-update-btn sm danger" style="padding:4px 8px;">×</button></div>';
        document.getElementById('annActive').checked = true;
    }
    function collectUpdates() {
        const inputs = document.querySelectorAll('#updatesContainer .update-input');
        const updates = [];
        inputs.forEach(inp => { if(inp.value.trim()) updates.push(inp.value.trim()); });
        return updates;
    }
    async function publishAnnouncement() {
        const title = document.getElementById('annTitle').value.trim();
        const focus = document.getElementById('annFocus').value.trim();
        const updates = collectUpdates();
        if(!title) { showToast('请填写公告标题','error'); return; }
        let contentHtml = '';
        if(focus) contentHtml += `<div class="focus-content">${escapeHtml(focus)}</div>`;
        if(updates.length) contentHtml += `<div class="updates-list">${updates.map(u=>`<li>${escapeHtml(u)}</li>`).join('')}</div>`;
        if(!contentHtml) contentHtml = '<div class="focus-content">暂无详细内容</div>';
        const is_active = document.getElementById('annActive').checked ? 1 : 0;
        try {
            if(currentAnnouncement && currentAnnouncement.id) {
                await apiFetch(`/admin/announcements/${currentAnnouncement.id}`, { method:'PUT', body:JSON.stringify({ title, content:contentHtml, is_active }) });
                showToast('公告已更新','success');
            } else {
                await apiFetch('/admin/announcements', { method:'POST', body:JSON.stringify({ title, content:contentHtml, is_active }) });
                showToast('公告已发布','success');
            }
            await loadAnnouncementForEdit();
        } catch(e) { showToast('操作失败','error'); }
    }
    function cancelAnnouncement() { loadAnnouncementForEdit(); }

    // ========== 分类/子分类/网站 CRUD ==========
    function handleModifyCategory(id, name) { const cat = categories.find(c=>c.id===id); const order = cat?.display_order||0; openModal('修改分类', `<div class="form-group"><label>名称</label><input id="mName" value="${escapeHtml(name)}" class="form-input"></div><div class="form-group"><label>排序值</label><input type="number" id="mOrder" value="${order}" step="1"></div>`, async ()=>{ const n = document.getElementById('mName').value.trim(); const o = parseInt(document.getElementById('mOrder').value)||0; if(!n){ showToast('名称不能为空','error'); return; } await apiFetch(`/admin/categories/${id}`,{method:'PUT',body:JSON.stringify({name:n, display_order:o})}); showToast('修改成功'); await loadAllData(); }, true, async ()=>{ await apiFetch(`/admin/categories/${id}`,{method:'DELETE'}); showToast('删除成功'); await loadAllData(); }); }
    function handleModifySub(id, name) { const sub = subcategories.find(s=>s.id===id); const order = sub?.display_order||0; openModal('修改子分类', `<div class="form-group"><label>名称</label><input id="mName" value="${escapeHtml(name)}"></div><div class="form-group"><label>排序值</label><input type="number" id="mOrder" value="${order}" step="1"></div>`, async ()=>{ const n = document.getElementById('mName').value.trim(); const o = parseInt(document.getElementById('mOrder').value)||0; if(!n){ showToast('名称不能为空','error'); return; } await apiFetch(`/admin/subcategories/${id}`,{method:'PUT',body:JSON.stringify({name:n, display_order:o})}); showToast('修改成功'); await loadAllData(); }, true, async ()=>{ await apiFetch(`/admin/subcategories/${id}`,{method:'DELETE'}); showToast('删除成功'); await loadAllData(); }); }
    async function handleEditSite(id) { const site = sites.find(s=>s.id===id); if(!site) return; openModal('编辑链接', `<div class="form-group"><label>标题</label><input id="mTitle" value="${escapeHtml(site.title)}"></div><div class="form-group"><label>网址</label><div style="display:flex;gap:4px;"><input id="mUrl" value="${escapeHtml(site.url)}" style="flex:1;"><button type="button" id="fetchInfoBtn" class="fetch-info-btn">获取信息</button></div></div><div class="form-group"><label>图标</label><input id="mIcon" value="${escapeHtml(site.icon||'fas fa-link')}"></div><div class="form-group"><label>描述</label><textarea id="mDesc" rows="2">${escapeHtml(site.description||'')}</textarea></div><div class="form-group"><label>排序值</label><input type="number" id="mSort" value="${site.display_order}" step="1"></div>`, async ()=>{ const title = document.getElementById('mTitle').value.trim(); const url = document.getElementById('mUrl').value.trim(); if(!title||!url){ showToast('标题和网址必填','error'); return; } if(!checkUrl(url)){ showToast('网址格式错误','error'); return; } await apiFetch(`/admin/sites/${id}`,{method:'PUT',body:JSON.stringify({title, url, description:document.getElementById('mDesc').value, icon:document.getElementById('mIcon').value, display_order:+document.getElementById('mSort').value})}); showToast('修改成功'); await loadAllData(); }, true, async ()=>{ await apiFetch(`/admin/sites/${id}`,{method:'DELETE'}); showToast('删除成功'); await loadAllData(); }); setTimeout(()=>{ const btn = document.getElementById('fetchInfoBtn'); if(btn) btn.addEventListener('click',()=>fetchSiteInfo('mUrl','mTitle','mIcon','mDesc')); const ta = document.getElementById('mDesc'); if(ta){ autoResizeTextarea(ta); ta.addEventListener('input',function(){autoResizeTextarea(this);}); } },50); }
    async function handleAddCategory() { const next = await getNextSortValue('category'); openModal('新增一级分类', `<div class="form-group"><label>名称</label><input id="mName"></div><div class="form-group"><label>排序值</label><input type="number" id="mSort" value="${next}" step="1"></div>`, async ()=>{ const name = document.getElementById('mName').value.trim(); if(!name){ showToast('名称不能为空','error'); return; } await apiFetch('/admin/categories',{method:'POST',body:JSON.stringify({name, display_order:+document.getElementById('mSort').value})}); showToast('添加成功'); await loadAllData(); }); }
    async function handleAddSub() { if(!currentCat){ showToast('请先选择一级分类','error'); return; } const next = await getNextSortValue('subcategory', currentCat); openModal('新增子分类', `<div class="form-group"><label>名称</label><input id="mName"></div><div class="form-group"><label>排序值</label><input type="number" id="mSort" value="${next}" step="1"></div>`, async ()=>{ const name = document.getElementById('mName').value.trim(); if(!name){ showToast('名称不能为空','error'); return; } await apiFetch('/admin/subcategories',{method:'POST',body:JSON.stringify({category_id:currentCat, name, display_order:+document.getElementById('mSort').value})}); showToast('添加成功'); await loadAllData(); }); }
    async function handleAddSite() { if(!currentSub){ showToast('请先选择子分类','error'); return; } const next = await getNextSortValue('site', currentSub); openModal('新增链接', `<div class="form-group"><label>标题</label><input id="mTitle"></div><div class="form-group"><label>网址</label><div style="display:flex;gap:4px;"><input id="mUrl" style="flex:1;"><button type="button" id="fetchInfoBtn" class="fetch-info-btn">获取信息</button></div></div><div class="form-group"><label>图标</label><input id="mIcon" value="fas fa-link"></div><div class="form-group"><label>描述</label><textarea id="mDesc" rows="2"></textarea></div><div class="form-group"><label>排序值</label><input type="number" id="mSort" value="${next}" step="1"></div>`, async ()=>{ const title = document.getElementById('mTitle').value.trim(); const url = document.getElementById('mUrl').value.trim(); if(!title||!url){ showToast('标题和网址必填','error'); return; } if(!checkUrl(url)){ showToast('网址格式错误','error'); return; } await apiFetch('/admin/sites',{method:'POST',body:JSON.stringify({subcategory_id:currentSub, title, url, description:document.getElementById('mDesc').value, icon:document.getElementById('mIcon').value, display_order:+document.getElementById('mSort').value})}); showToast('添加成功'); await loadAllData(); }); setTimeout(()=>{ const btn = document.getElementById('fetchInfoBtn'); if(btn) btn.addEventListener('click',()=>fetchSiteInfo('mUrl','mTitle','mIcon','mDesc')); const ta = document.getElementById('mDesc'); if(ta){ autoResizeTextarea(ta); ta.addEventListener('input',function(){autoResizeTextarea(this);}); } },50); }

    async function loadRanking() { const list = document.getElementById('rankList'); list.innerHTML='<div class="empty">加载中...</div>'; try{ const data = await apiFetch('/admin/topclicks?limit=20'); if(!data.length) list.innerHTML='<div class="empty">暂无数据</div>'; else list.innerHTML = data.map(item=>`<div class="link-item"><div class="link-info"><strong>${escapeHtml(item.title)}</strong></div><span class="badge">${item.count}次</span></div>`).join(''); } catch{ list.innerHTML='<div class="empty">加载失败</div>'; } }
    async function loadFeedback() { const list = document.getElementById('feedbackList'); list.innerHTML='<div class="empty">加载中...</div>'; try{ const data = await apiFetch('/admin/dead-link-reports'); if(!data.length) list.innerHTML='<div class="empty">暂无反馈</div>'; else list.innerHTML = data.map(item=>`<div class="link-item"><div class="link-info"><strong>${escapeHtml(item.title||'无标题')}</strong><div style="font-size:10px;color:#999">来自 ${escapeHtml(item.reporter_ip)} 于 ${new Date(item.report_time).toLocaleString()}</div></div><div class="link-actions"><button class="sm primary" data-action="replaceLink" data-reportid="${item.id}" data-siteid="${item.site_id||0}" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(item.title||'')}">更换链接</button></div></div>`).join(''); document.querySelectorAll('[data-action="replaceLink"]').forEach(btn=>btn.addEventListener('click', replaceLinkHandler)); } catch{ list.innerHTML='<div class="empty">加载失败</div>'; } }
    async function replaceLinkHandler(e) { const btn = e.currentTarget; const reportId = parseInt(btn.dataset.reportid); const siteId = parseInt(btn.dataset.siteid); if(!siteId){ showToast('未找到网站记录','error'); return; } const site = sites.find(s=>s.id===siteId); if(!site){ showToast('未找到网站记录','error'); return; } openModal('更换链接', `<div class="form-group"><label>标题</label><input id="mTitle" value="${escapeHtml(site.title)}"></div><div class="form-group"><label>网址</label><input id="mUrl" value="${escapeHtml(site.url)}"></div><div class="form-group"><label>描述</label><textarea id="mDesc" rows="2">${escapeHtml(site.description||'')}</textarea></div><div class="form-group"><label>图标</label><input id="mIcon" value="${escapeHtml(site.icon||'fas fa-link')}"></div>`, async ()=>{ const newTitle = document.getElementById('mTitle').value.trim(); const newUrl = document.getElementById('mUrl').value.trim(); if(!newTitle||!newUrl){ showToast('标题和网址不能为空','error'); return; } if(!checkUrl(newUrl)){ showToast('网址格式错误','error'); return; } await apiFetch('/admin/replace-link',{ method:'POST', body:JSON.stringify({reportId, siteId, newUrl, newTitle, newDescription:document.getElementById('mDesc').value, newIcon:document.getElementById('mIcon').value}) }); showToast('链接已更新','success'); await loadFeedback(); await loadAllData(); await apiFetch('/admin/refresh-navigation',{method:'POST'}); closeModal(); }); }
    async function exportFullData() { try{ const res = await fetch(`${API_BASE}/admin/export`,{headers:{'Authorization':`Bearer ${token}`}}); if(!res.ok) throw new Error(); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`navigation_full_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); showToast('导出成功','success'); } catch{ showToast('导出失败','error'); } }
    async function importData() { const file = document.getElementById('importFile').files[0]; const mode = document.getElementById('importMode').value; if(!file){ showToast('请选择JSON文件','warn'); return; } if(file.size>10*1024*1024){ showToast('文件不能超过10MB','error'); return; } try{ const text = await file.text(); const data = JSON.parse(text); if(!data.categories || !data.subcategories || !data.sites) throw new Error(); if(!confirm(mode==='overwrite'?'覆盖模式将清空现有数据，确定继续吗？':'合并模式将更新/添加数据，确定继续吗？')) return; const res = await fetch(`${API_BASE}/admin/import`,{ method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify({mode,data}) }); const result = await res.json(); if(res.ok){ showToast('导入成功','success'); await loadAllData(); await apiFetch('/admin/refresh-navigation',{method:'POST'}); closeImportModal(); } else showToast(result.error||'导入失败','error'); } catch{ showToast('导入失败','error'); } }
    function openImportModal() { const modal = document.getElementById('importModal'); modal.classList.add('show'); document.getElementById('importFile').value=''; }
    function closeImportModal() { document.getElementById('importModal').classList.remove('show'); }
    async function loadSubmissions() { const list = document.getElementById('submissionsList'); list.innerHTML='<div class="empty">加载中...</div>'; try{ const data = await apiFetch('/admin/submissions'); if(!data.length) list.innerHTML='<div class="empty">暂无待审核网站</div>'; else list.innerHTML = data.map(item=>`<div class="link-item"><span><strong class="submission-title-truncate" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong></span><button class="sm primary" data-action="viewSubmission" data-id="${item.id}">查看</button></div>`).join(''); document.querySelectorAll('[data-action="viewSubmission"]').forEach(btn=>btn.addEventListener('click',()=>openSubmissionDetail(btn.dataset.id))); } catch{ list.innerHTML='<div class="empty">加载失败</div>'; } }
    async function openSubmissionDetail(id) { const detailModal = document.getElementById('submissionDetailModal'); const contentDiv = document.getElementById('submissionDetailContent'); const cleanup = ()=>{ if(customSelects.cat){ customSelects.cat.destroy(); delete customSelects.cat; } if(customSelects.sub){ customSelects.sub.destroy(); delete customSelects.sub; } }; cleanup(); try{ const data = await apiFetch('/admin/submissions'); const item = data.find(s=>s.id==id); if(!item) throw new Error(); const vtColor = (item.vt_result||'').includes('安全')?'#10b981':'#ef4444'; let html = `<div class="info-card">`; html += `<div><label>标题</label><input id="editTitle" value="${escapeHtml(item.title)}" class="form-input"></div>`; html += `<div><label>网址</label><input id="editUrl" value="${escapeHtml(item.url)}" class="form-input"></div>`; html += `<div><label>图标</label><input id="editIcon" value="${escapeHtml(item.icon||'')}" class="form-input"></div>`; html += `<div><label>描述</label><textarea id="editDesc" rows="2" class="form-input">${escapeHtml(item.description||'')}</textarea></div>`; html += `<div><label>提交者邮箱</label><input id="editContact" value="${escapeHtml(item.contact||'')}" class="form-input"></div>`; html += `<div><label>提交时间</label><div>${new Date(item.submit_time).toLocaleString()}</div></div>`; html += `<div><label>安全检测</label><div style="color:${vtColor}">${escapeHtml(item.vt_result||'未检测')}</div></div></div>`; html += `<div style="display:flex; gap:12px; margin-top:16px;"><div style="flex:1;"><h4>通过收录</h4><div id="approveCatSelectWrapper"></div><div id="approveSubSelectWrapper"></div><input type="number" id="approveOrder" placeholder="排序" value="0" step="1"><div><label><input type="checkbox" id="sendEmailCheckbox" checked> 发送邮件通知</label></div><button id="doApproveBtn" class="primary">通过并收录</button></div><div style="flex:1;"><h4>拒绝投稿</h4><div><label><input type="checkbox" id="sendEmailCheckboxReject" checked> 发送邮件通知</label></div><button id="doRejectBtn" class="danger">拒绝并删除</button></div></div>`; contentDiv.innerHTML = html; const catSelect = document.createElement('select'); catSelect.id='approveCatSelect'; catSelect.innerHTML='<option value="">选择一级分类</option>'+categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join(''); document.getElementById('approveCatSelectWrapper').appendChild(catSelect); const subSelect = document.createElement('select'); subSelect.id='approveSubSelect'; subSelect.innerHTML='<option value="">先选择一级分类</option>'; document.getElementById('approveSubSelectWrapper').appendChild(subSelect); let catCs = new CustomSelect(catSelect, async (val)=>{ subSelect.innerHTML='<option value="">加载中...</option>'; if(customSelects.sub) customSelects.sub.destroy(); if(val){ const subsData = await apiFetch(`/admin/subcategories?category_id=${val}`); subSelect.innerHTML='<option value="">选择二级分类</option>'+subsData.map(sub=>`<option value="${sub.id}">${escapeHtml(sub.name)}</option>`).join(''); } else subSelect.innerHTML='<option value="">先选择一级分类</option>'; customSelects.sub = new CustomSelect(subSelect); }); customSelects.cat = catCs; customSelects.sub = new CustomSelect(subSelect); document.getElementById('doApproveBtn').onclick = async()=>{ const catId = document.getElementById('approveCatSelect').value; const subId = document.getElementById('approveSubSelect').value; if(!catId||!subId){ showToast('请选择分类','error'); return; } const order = document.getElementById('approveOrder').value||0; const title = document.getElementById('editTitle').value.trim(); const url = document.getElementById('editUrl').value.trim(); const icon = document.getElementById('editIcon').value.trim(); const desc = document.getElementById('editDesc').value.trim(); const contact = document.getElementById('editContact').value.trim(); const sendEmail = document.getElementById('sendEmailCheckbox').checked; if(!title||!url){ showToast('标题和网址不能为空','error'); return; } if(!checkUrl(url)){ showToast('网址格式错误','error'); return; } await apiFetch(`/admin/submissions/${id}/approve`,{ method:'POST', body:JSON.stringify({subcategory_id:parseInt(subId), display_order:parseInt(order), title, url, icon, description:desc, contact, sendEmail}) }); showToast('已通过并收录','success'); detailModal.classList.remove('show'); cleanup(); await loadSubmissions(); await loadAllData(); await apiFetch('/admin/refresh-navigation',{method:'POST'}); }; document.getElementById('doRejectBtn').onclick = async()=>{ if(!confirm('确定拒绝？')) return; const sendEmail = document.getElementById('sendEmailCheckboxReject').checked; await apiFetch(`/admin/submissions/${id}`,{ method:'DELETE', body:JSON.stringify({sendEmail}) }); showToast('已拒绝','success'); detailModal.classList.remove('show'); cleanup(); await loadSubmissions(); }; const closeBtn = detailModal.querySelector('#closeDetailModalBtn'); if(closeBtn) closeBtn.onclick = ()=>{ cleanup(); detailModal.classList.remove('show'); }; detailModal.onclick = e=>{ if(e.target===detailModal){ cleanup(); detailModal.classList.remove('show'); } }; detailModal.classList.add('show'); } catch(e){ showToast('加载详情失败','error'); } }

    // 事件绑定
    function setupEventDelegation() {
        document.getElementById('catBar')?.addEventListener('click', e => { const btn = e.target.closest('[data-action]'); if(btn && btn.dataset.action==='modifyCat'){ handleModifyCategory(parseInt(btn.dataset.id), btn.dataset.name); return; } const item = e.target.closest('.cat-item'); if(item) selectCat(parseInt(item.dataset.cid)); });
        document.getElementById('subList')?.addEventListener('click', e => { const btn = e.target.closest('[data-action]'); if(btn && btn.dataset.action==='modifySub'){ handleModifySub(parseInt(btn.dataset.id), btn.dataset.name); return; } const item = e.target.closest('.sub-item'); if(item) selectSub(parseInt(item.dataset.sid)); });
        document.getElementById('siteList')?.addEventListener('click', e => { const btn = e.target.closest('[data-action]'); if(btn && btn.dataset.action==='editSite') handleEditSite(parseInt(btn.dataset.id)); });
        document.querySelectorAll('.tab-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active')); document.querySelectorAll('.tab-panel').forEach(p=>p.classList.add('hidden')); btn.classList.add('active'); const tab = btn.dataset.tab; document.getElementById(`${tab}Tab`).classList.remove('hidden'); if(tab==='rank') loadRanking(); if(tab==='feedback') loadFeedback(); if(tab==='submissions') loadSubmissions(); if(tab==='announcement') loadAnnouncementForEdit(); }); });
        document.getElementById('loginBtn')?.addEventListener('click', login);
        document.getElementById('logoutBtn')?.addEventListener('click', logout);
        document.getElementById('addCategoryBtn')?.addEventListener('click', handleAddCategory);
        document.getElementById('addSubBtn')?.addEventListener('click', handleAddSub);
        document.getElementById('addSiteBtn')?.addEventListener('click', handleAddSite);
        document.getElementById('exportBtn')?.addEventListener('click', exportFullData);
        document.getElementById('importBtn')?.addEventListener('click', openImportModal);
        document.getElementById('sortRankBtn')?.addEventListener('click', loadRanking);
        document.getElementById('refreshFeedbackBtn')?.addEventListener('click', loadFeedback);
        document.getElementById('refreshSubmissionsBtn')?.addEventListener('click', loadSubmissions);
        document.getElementById('refreshNavBtn')?.addEventListener('click', async ()=>{ await apiFetch('/admin/refresh-navigation',{method:'POST'}); showToast('导航缓存已刷新','success'); });
        document.getElementById('tokenInput')?.addEventListener('keydown', e=>{ if(e.key==='Enter') login(); });
        document.getElementById('modal')?.addEventListener('click', e=>{ if(e.target===document.getElementById('modal')) closeModal(); });
        // 公告编辑事件
        document.getElementById('addUpdateBtn')?.addEventListener('click', ()=>{ const container = document.getElementById('updatesContainer'); const div = document.createElement('div'); div.className = 'update-item'; div.innerHTML = '<input type="text" class="update-input" placeholder="更新项"> <button type="button" class="remove-update-btn sm danger" style="padding:4px 8px;">×</button>'; container.appendChild(div); div.querySelector('.remove-update-btn')?.addEventListener('click', ()=>div.remove()); });
        document.getElementById('annClearBtn')?.addEventListener('click', clearAnnouncementForm);
        document.getElementById('annCancelBtn')?.addEventListener('click', cancelAnnouncement);
        document.getElementById('annPublishBtn')?.addEventListener('click', publishAnnouncement);
        document.getElementById('importCancelBtn')?.addEventListener('click', closeImportModal);
        document.getElementById('importConfirmBtn')?.addEventListener('click', importData);
        document.getElementById('importModal')?.addEventListener('click', e=>{ if(e.target===document.getElementById('importModal')) closeImportModal(); });
        // 动态删除更新项
        document.addEventListener('click', e=>{ if(e.target.classList.contains('remove-update-btn')) e.target.closest('.update-item')?.remove(); });
    }

    class CustomSelect { constructor(selectElement, onChange){ this.select=selectElement; this.onChange=onChange; this.wrapper=null; this.trigger=null; this.dropdown=null; this.options=[]; this.value=this.select.value; this.isOpen=false; this.init(); } init(){ this.select.style.display='none'; this.wrapper=document.createElement('div'); this.wrapper.className='custom-select-wrapper'; this.trigger=document.createElement('div'); this.trigger.className='custom-select-trigger'; this.trigger.innerHTML=`<span class="custom-select-value">${this.getSelectedText()}</span><span class="custom-select-arrow"></span>`; this.dropdown=document.createElement('div'); this.dropdown.className='custom-select-dropdown'; this.wrapper.appendChild(this.trigger); this.wrapper.appendChild(this.dropdown); this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling); this.populateOptions(); this.bindEvents(); this.select.addEventListener('change',()=>this.setValue(this.select.value)); } getSelectedText(){ const opt = this.select.options[this.select.selectedIndex]; return opt?opt.textContent:''; } populateOptions(){ this.dropdown.innerHTML=''; this.options=[]; for(let i=0;i<this.select.options.length;i++){ const opt = this.select.options[i]; const div = document.createElement('div'); div.className='custom-select-option'; if(i===this.select.selectedIndex) div.classList.add('selected'); div.textContent=opt.textContent; div.dataset.value=opt.value; div.dataset.index=i; div.addEventListener('click',(e)=>{ e.stopPropagation(); this.selectOption(i); this.close(); }); this.dropdown.appendChild(div); this.options.push(div); } } selectOption(index){ if(index===this.select.selectedIndex) return; this.select.selectedIndex=index; this.value=this.select.value; const span = this.trigger.querySelector('.custom-select-value'); if(span) span.textContent=this.select.options[index].textContent; this.options.forEach((opt,i)=>opt.classList.toggle('selected',i===index)); if(this.onChange) this.onChange(this.value); this.select.dispatchEvent(new Event('change',{bubbles:true})); } setValue(value){ for(let i=0;i<this.select.options.length;i++) if(this.select.options[i].value==value){ this.selectOption(i); break; } } open(){ if(this.isOpen) return; this.isOpen=true; this.trigger.classList.add('open'); this.dropdown.classList.add('open'); this.positionDropdown(); this.handleOutsideClick=(e)=>{ if(!this.wrapper.contains(e.target) && !this.dropdown.contains(e.target)) this.close(); }; setTimeout(()=>document.addEventListener('click',this.handleOutsideClick),0); } close(){ if(!this.isOpen) return; this.isOpen=false; this.trigger.classList.remove('open'); this.dropdown.classList.remove('open'); if(this.handleOutsideClick) document.removeEventListener('click',this.handleOutsideClick); } positionDropdown(){ const rect=this.trigger.getBoundingClientRect(); const dh=this.dropdown.offsetHeight; const vh=window.innerHeight; let top=rect.bottom+4; if(top+dh>vh-10) top=rect.top-dh-4; this.dropdown.style.position='fixed'; this.dropdown.style.top=`${top}px`; this.dropdown.style.left=`${rect.left}px`; this.dropdown.style.width=`${rect.width}px`; } bindEvents(){ this.trigger.addEventListener('click',(e)=>{ e.stopPropagation(); this.isOpen?this.close():this.open(); }); window.addEventListener('resize',()=>{ if(this.isOpen) this.positionDropdown(); }); window.addEventListener('scroll',()=>{ if(this.isOpen) this.positionDropdown(); },true); } refresh(){ this.populateOptions(); const span=this.trigger.querySelector('.custom-select-value'); if(span) span.textContent=this.getSelectedText(); } destroy(){ this.close(); this.wrapper.remove(); this.select.style.display=''; } }

    function injectGlobalStyles() { if(!document.getElementById('admin-global-styles')){ const style = document.createElement('style'); style.id='admin-global-styles'; style.textContent = ` .submission-title-truncate{display:inline-block;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} @media(max-width:768px){ .submission-title-truncate{max-width:180px;} } .form-input{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;} .form-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.1);} .custom-select-wrapper{position:relative;flex:1;min-width:110px;} .custom-select-trigger{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;cursor:pointer;gap:6px;} .custom-select-trigger.open{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,0.1);} .custom-select-arrow{width:12px;height:12px;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='%2364748b' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");background-size:contain;transition:transform 0.2s;} .custom-select-trigger.open .custom-select-arrow{transform:rotate(180deg);} .custom-select-dropdown{position:fixed;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08);z-index:1000;max-height:180px;overflow-y:auto;opacity:0;visibility:hidden;transform:translateY(-6px);transition:all 0.15s;} .custom-select-dropdown.open{opacity:1;visibility:visible;transform:translateY(0);} .custom-select-option{padding:6px 10px;font-size:11px;cursor:pointer;} .custom-select-option:hover{background:#f1f5f9;} .custom-select-option.selected{background:#e0f2fe;color:#0369a1;} @media(prefers-color-scheme:dark){ .custom-select-trigger{background:#1e293b;border-color:#334155;color:#e2e8f0;} .custom-select-dropdown{background:#1e293b;border-color:#334155;} .custom-select-option{color:#e2e8f0;} .custom-select-option:hover{background:#334155;} .custom-select-option.selected{background:#0f172a;color:#38bdf8;} .form-input{background:#1e293b;border-color:#334155;color:#e2e8f0;} } .update-item{display:flex;gap:8px;margin-bottom:8px;align-items:center;} .update-item input{flex:1;} .remove-update-btn{padding:4px 8px;font-size:11px;} .add-update-btn{background:#10b981;color:white;border:none;padding:6px 12px;border-radius:8px;margin-top:8px;} .form-group{margin-bottom:16px;} .toggle-switch{display:flex;align-items:center;gap:10px;} .toggle-switch input{width:auto;margin:0;} `; document.head.appendChild(style); } }

    injectGlobalStyles();
    const storedToken = getStoredToken();
    if(storedToken){
        token = storedToken;
        (async()=>{ try{ await apiFetch('/admin/categories'); document.getElementById('loginWrapper').style.display='none'; document.getElementById('mainContent').classList.remove('hidden'); await loadAllData(); startSessionRefresh(); } catch(e){ logout(); } })();
    } else { document.getElementById('loginWrapper').style.display='flex'; document.getElementById('mainContent').classList.add('hidden'); }

    setInterval(()=>{ const exp = sessionStorage.getItem('admin_expires'); if(exp && Date.now() > parseInt(exp,10)-60000) showToast('登录即将过期','warn'); },30000);
    updateLockMessage();
    setupEventDelegation();
})();