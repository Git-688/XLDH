function initSidebar() {
    // 加载保存的分类状态
    loadCategoryStates();
    
    const categoryHeaders = document.querySelectorAll('.category-header');
    
    categoryHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.stopPropagation();
            const wasActive = this.classList.contains('active');
            
            // 添加点击反馈
            this.style.transform = 'translateY(1px)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // 关闭其他分类
            categoryHeaders.forEach(h => {
                if (h !== this) {
                    h.classList.remove('active');
                    saveCategoryState(h, false);
                }
            });
            
            // 切换当前分类
            const nowActive = !wasActive;
            this.classList.toggle('active', nowActive);
            saveCategoryState(this, nowActive);
            
            // 触发自定义事件，用于其他组件监听
            document.dispatchEvent(new CustomEvent('sidebarCategoryToggle', {
                detail: {
                    category: this.closest('.category-fold').dataset.category,
                    isOpen: nowActive
                }
            }));
        });
        
        // 添加鼠标悬停效果
        header.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.background = 'rgba(107, 92, 231, 0.08)';
            }
        });
        
        header.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.background = '';
            }
        });
    });
    
    // 其他代码保持不变...
    const qqAvatar = document.getElementById('qqAvatar');
    const qqModal = document.getElementById('qqModal');
    const saveBtn = document.getElementById('saveQQInfo');
    const cancelBtn = document.getElementById('cancelQQInfo');
    
    qqAvatar.addEventListener('click', function() {
        const userData = JSON.parse(localStorage.getItem('userData')) || {};
        document.getElementById('qqNumber').value = userData.qqNumber || '';
        document.getElementById('nickname').value = userData.nickname || '';
        document.getElementById('signature').value = userData.signature || '';
        qqModal.style.display = 'flex';
    });
    
    saveBtn.addEventListener('click', function() {
        const qqNumber = document.getElementById('qqNumber').value;
        const nickname = document.getElementById('nickname').value;
        const signature = document.getElementById('signature').value;
        
        const currentUserData = JSON.parse(localStorage.getItem('userData')) || {};
        const userData = {
            qqNumber: qqNumber || currentUserData.qqNumber || '',
            nickname: nickname || currentUserData.nickname || '游客',
            signature: signature || currentUserData.signature || '点击头像设置信息'
        };
        
        if (userData.qqNumber) {
            document.getElementById('qqAvatar').src = `https://q1.qlogo.cn/g?b=qq&nk=${userData.qqNumber}&s=100`;
        }
        
        document.getElementById('userNickname').textContent = userData.nickname;
        document.getElementById('userSignature').textContent = userData.signature;
        localStorage.setItem('userData', JSON.stringify(userData));
        qqModal.style.display = 'none';
    });
    
    cancelBtn.addEventListener('click', function() {
        qqModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === qqModal) {
            qqModal.style.display = 'none';
        }
    });
}

// 保存分类状态到localStorage
function saveCategoryState(header, isOpen) {
    const category = header.closest('.category-fold');
    const categoryId = category.dataset.category || category.querySelector('h3').textContent;
    localStorage.setItem(`sidebarCategory_${categoryId}`, isOpen);
}

// 从localStorage加载分类状态
function loadCategoryStates() {
    document.querySelectorAll('.category-fold').forEach(category => {
        const header = category.querySelector('.category-header');
        const categoryId = category.dataset.category || header.querySelector('h3').textContent;
        const isOpen = localStorage.getItem(`sidebarCategory_${categoryId}`) === 'true';
        
        if (isOpen) {
            header.classList.add('active');
        }
    });
}

// 暴露到全局
window.initSidebar = initSidebar;