// main.js
document.addEventListener('DOMContentLoaded', function() {
  initNavbar();
  initSidebar();
  initContent();
  // ...其他初始化
    initChickenSoup();

    loadUserData();
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    initWoodenFish();
    
    fetchDailyQuote();
    
    const isCollapsed = localStorage.getItem('announcementCollapsed') === 'true';
    

    // 添加滚动事件监听器 - 优化导航栏阴影
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        
        // 当滚动超过10px时添加阴影效果
        if (window.scrollY > 10) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // 页面加载时检查滚动位置
    if (window.scrollY > 10) {
        document.querySelector('.navbar').classList.add('scrolled');
    }
});

function updateDateTime() {
    const now = new Date();
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');
    const weekElement = document.getElementById('currentWeek');
    const greetingElement = document.getElementById('greetingText');
    
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    dateElement.textContent = `${year}年${month}月${date}日`;
    
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    timeElement.textContent = `${hours}:${minutes}:${seconds}`;
    
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    weekElement.textContent = weekDays[now.getDay()];
    
    let greeting = '';
    const hour = now.getHours();
    if (hour >= 5 && hour < 9) {
        greeting = '早上好';
    } else if (hour >= 9 && hour < 12) {
        greeting = '上午好';
    } else if (hour >= 12 && hour < 14) {
        greeting = '中午好';
    } else if (hour >= 14 && hour < 18) {
        greeting = '下午好';
    } else {
        greeting = '晚上好';
    }
    greetingElement.textContent = `${greeting}，朋友！`;
}

function initWoodenFish() {
    const fishes = ['meritFish', 'luckFish', 'wealthFish', 'healthFish'];
    const labels = {
        meritFish: '功德+2',
        luckFish: '好运+2',
        wealthFish: '财富+2',
        healthFish: '健康+2'
    };
    
    const colors = {
        meritFish: '#70c1ff',
        luckFish: '#ff9e9e',
        wealthFish: '#ffd670',
        healthFish: '#8ddf8d'
    };
    
    fishes.forEach(id => {
        const fish = document.getElementById(id);
        fish.addEventListener('click', function() {
            const effect = document.createElement('div');
            effect.className = 'fish-effect';
            effect.textContent = labels[id];
            effect.style.color = colors[id];
            effect.style.left = `${Math.random() * 50 + 25}%`;
            this.appendChild(effect);
            
            setTimeout(() => {
                effect.remove();
            }, 1000);
        });
    });
}





function loadUserData() {
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    
    if (userData.qqNumber) {
        document.getElementById('qqAvatar').src = `https://q1.qlogo.cn/g?b=qq&nk=${userData.qqNumber}&s=100`;
    }
    
    if (userData.nickname) {
        document.getElementById('userNickname').textContent = userData.nickname;
    }
    
    if (userData.signature) {
        document.getElementById('userSignature').textContent = userData.signature;
    }
}

function fetchDailyQuote() {
    const apiSources = [
        'https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=e&c=f&c=g&c=h&c=i&c=j',
        'https://api.xygeng.cn/dailyquote',
        'https://api.btstu.cn/yan/api.php'
    ];
    
    const randomSource = apiSources[Math.floor(Math.random() * apiSources.length)];
    
    fetch(randomSource)
        .then(response => response.json())
        .then(data => {
            const quoteElement = document.querySelector('.quote-text');
            const authorElement = document.querySelector('.quote-author');
            
            let quoteText = data.hitokoto || data.text || data.content || "生活就像海洋，只有意志坚强的人才能到达彼岸。";
            let author = data.from || data.author || data.source || "未知";
            
            quoteElement.textContent = `"${quoteText}"`;
            authorElement.textContent = `— ${author}`;
        })
        .catch(error => {
            console.error('获取每日一言失败:', error);
            const quoteElement = document.querySelector('.quote-text');
            const authorElement = document.querySelector('.quote-author');
            quoteElement.textContent = '"生活就像海洋，只有意志坚强的人才能到达彼岸。"';
            authorElement.textContent = '— 马克思';
        });
}

function initChickenSoup() {
    // 确保毒鸡汤功能初始化
}




// 关于网站↓事件处理
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const closeAboutBtn = document.getElementById('closeAboutBtn');
const confirmAboutBtn = document.getElementById('confirmAboutBtn');

aboutBtn.addEventListener('click', function(e) {
    e.preventDefault();
    aboutModal.style.display = 'flex';
});

closeAboutBtn.addEventListener('click', function() {
    aboutModal.style.display = 'none';
});

confirmAboutBtn.addEventListener('click', function() {
    aboutModal.style.display = 'none';
});

window.addEventListener('click', function(e) {
    if (e.target === aboutModal) {
        aboutModal.style.display = 'none';
    }
});


