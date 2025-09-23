function initNavbar() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const findPanel = document.getElementById('findPanel');
    
    // 汉堡菜单交互
    hamburger.addEventListener('click', function() {
        this.classList.toggle('active');
        sidebar.classList.toggle('active');
    });
    
    // 点击页面其他地方关闭侧边栏
    document.addEventListener('click', function(e) {
        // 排除查找面板
        if (findPanel.contains(e.target)) return;
        
        // 点击任意位置关闭侧边栏 - 排除侧边栏内部点击
        if (!hamburger.contains(e.target) && !sidebar.contains(e.target)) {
            hamburger.classList.remove('active');
            sidebar.classList.remove('active');
        }
    });
    
    
        // 关于网站模态框交互
        const aboutModalOverlay = document.getElementById('aboutModalOverlay');
        const aboutWebsiteBtn = document.getElementById('aboutWebsiteBtn');
        const closeAboutModal = document.getElementById('closeAboutModal');
        
        // 点击关于网站按钮打开模态框
        if (aboutWebsiteBtn) {
            aboutWebsiteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                aboutModalOverlay.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        }
        
        // 点击关闭按钮关闭模态框
        if (closeAboutModal) {
            closeAboutModal.addEventListener('click', () => {
                aboutModalOverlay.style.display = 'none';
                document.body.style.overflow = '';
            });
        }
        
        // 点击模态框外部关闭
        aboutModalOverlay.addEventListener('click', (e) => {
            if (e.target === aboutModalOverlay) {
                aboutModalOverlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
        
        // 按ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && aboutModalOverlay.style.display === 'flex') {
                aboutModalOverlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        });


// 在navbar.js文件中更新收款弹窗功能
const sponsorBtn = document.getElementById('sponsorBtn');
const donationModal = document.getElementById('donationModal');
const donationClose = document.getElementById('donationClose');
const donationConfirm = document.getElementById('donationConfirm');
const donationTabs = document.querySelectorAll('.donation-tab');
const qrcodeContainers = document.querySelectorAll('.qrcode-container');

if (sponsorBtn) {
    sponsorBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // 显示弹窗
        donationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            donationModal.classList.add('show');
        }, 10);
    });
}

// 关闭弹窗
if (donationClose) {
    donationClose.addEventListener('click', function() {
        closeDonationModal();
    });
}


// 支付方式标签切换
donationTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        
        // 更新激活的标签
        donationTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // 显示对应的二维码
        qrcodeContainers.forEach(container => {
            container.classList.remove('active');
            if (container.id === `${tabId}Qr`) {
                container.classList.add('active');
            }
        });
    });
});

// 点击模态框外部关闭
donationModal.addEventListener('click', function(e) {
    if (e.target === donationModal) {
        closeDonationModal();
    }
});

// 按ESC键关闭模态框
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && donationModal.style.display === 'flex') {
        closeDonationModal();
    }
});

// 关闭弹窗函数
function closeDonationModal() {
    donationModal.classList.remove('show');
    setTimeout(() => {
        donationModal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}


    
}

// 暴露到全局
window.initNavbar = initNavbar;