document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const primaryTabs = document.querySelectorAll('.primary-tab');
    const secondaryTabsContainer = document.getElementById('secondary-tabs-container');
    const contentGrid = document.getElementById('content-grid');
    
    // 初始化导航
    initNavigation();
    
    function initNavigation() {
        // 添加一级分类点击事件
        primaryTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const categoryId = this.dataset.category;
                
                // 更新一级分类激活状态
                primaryTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // 显示对应的二级分类
                showSecondaryTabs(categoryId);
            });
        });
        
        // 默认显示推荐分类
        showSecondaryTabs('recommend');
    }
    
    function showSecondaryTabs(categoryId) {
        // 查找对应的分类数据
        const category = navigationData.categories.find(cat => cat.id === categoryId);
        if (!category) return;
        
        // 生成二级分类HTML
        let secondaryHTML = `<div class="secondary-tabs">`;
        category.subcategories.forEach((subcat, index) => {
            secondaryHTML += `
                <div class="secondary-tab ${index === 0 ? 'active' : ''}" 
                     data-category="${categoryId}" 
                     data-subcategory="${subcat.id}">
                    ${subcat.name}
                </div>
            `;
        });
        secondaryHTML += `</div>`;
        
        // 更新二级分类区域
        secondaryTabsContainer.innerHTML = secondaryHTML;
        
        // 添加二级分类点击事件
        const secondaryTabs = secondaryTabsContainer.querySelectorAll('.secondary-tab');
        secondaryTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const categoryId = this.dataset.category;
                const subcategoryId = this.dataset.subcategory;
                
                // 更新二级分类激活状态
                secondaryTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // 显示对应内容
                showContent(categoryId, subcategoryId);
            });
        });
        
        // 默认显示第一个二级分类的内容
        if (category.subcategories.length > 0) {
            showContent(categoryId, category.subcategories[0].id);
        }
    }
    
    function showContent(categoryId, subcategoryId) {
        // 查找对应的分类和子分类数据
        const category = navigationData.categories.find(cat => cat.id === categoryId);
        if (!category) return;
        
        const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
        if (!subcategory) return;
        
        // 生成内容HTML
        let contentHTML = '';
        if (subcategory.sites && subcategory.sites.length > 0) {
            subcategory.sites.forEach(site => {
                contentHTML += `
                    <div class="site-card fade-in">
                        <div class="site-icon">${site.icon}</div>
                        <div class="site-info">
                            <h3>${site.name}</h3>
                            <p>${site.description}</p>
                        </div>
                    </div>
                `;
            });
        } else {
            contentHTML = `
                <div class="no-content">
                    <i class="fas fa-inbox"></i>
                    <p>暂无内容，敬请期待</p>
                </div>
            `;
        }
        
        // 更新内容区域
        contentGrid.innerHTML = contentHTML;
    }
    
    
        // 第三级分类按钮跳转↓↓↓
 function showContent(categoryId, subcategoryId) {
    // 查找对应的分类和子分类数据
    const category = navigationData.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
    if (!subcategory) return;
    
    // 生成内容HTML
    let contentHTML = '';
    if (subcategory.sites && subcategory.sites.length > 0) {
        subcategory.sites.forEach(site => {
            // 处理图标显示
            let iconHTML = '';
            if (typeof site.icon === 'object' && site.icon.type && site.icon.value) {
                if (site.icon.type === 'image') {
                    iconHTML = `<img src="${site.icon.value}" alt="${site.name}" class="site-icon-image">`;
                } else {
                    iconHTML = `<span class="site-icon-text">${site.icon.value}</span>`;
                }
            } else {
                // 向后兼容：如果icon是字符串，当作文本图标处理
                iconHTML = `<span class="site-icon-text">${site.icon || '🌐'}</span>`;
            }
            
            contentHTML += `
                <div class="site-card fade-in" data-url="${site.url}">
                    <div class="site-icon">${iconHTML}</div>
                    <div class="site-info">
                        <h3>${site.name}</h3>
                        <p>${site.description}</p>
                    </div>
                </div>
            `;
        });
    } else {
        contentHTML = `
            <div class="no-content">
                <i class="fas fa-inbox"></i>
                <p>暂无内容，敬请期待</p>
            </div>
        `;
    }
    
    // 更新内容区域
    contentGrid.innerHTML = contentHTML;
    
    // 为每个网站卡片添加点击事件
    const siteCards = contentGrid.querySelectorAll('.site-card');
    siteCards.forEach(card => {
        card.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            if (url && url !== '#') {
                window.open(url, '_blank');
            }
        });
    });
}






    
    
    
    
});
