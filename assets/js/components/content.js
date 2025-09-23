// content.js - 完整代码
function initContent() {
    const tabs = document.querySelectorAll('.tab');
    const cards = document.querySelectorAll('.category-card');
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            cards.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            if (cards[index]) {
                cards[index].classList.add('active');
            }
        });
    });
    
    const backToTop = document.getElementById('backToTop');
    backToTop.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
// 在content.js中找到查找功能相关代码，替换为以下优化版本

// 查找面板相关元素
const findPanel = document.getElementById('findPanel');
const closeFindPanel = document.getElementById('closeFindPanel');
const findInput = document.getElementById('findInput');
const findPrev = document.getElementById('findPrev');
const findNext = document.getElementById('findNext');
const findStatus = document.getElementById('findStatus');

// 查找状态变量
let currentFindIndex = -1;
let findResults = [];
let debounceTimer;

// 防抖函数 - 优化输入响应
function debounce(func, delay) {
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

// 页内查找按钮
const dropdownFindInPage = document.getElementById('dropdownFindInPage');
dropdownFindInPage.addEventListener('click', function() {
    findPanel.style.display = 'block';
    findInput.focus();
    // 如果有选中文本，自动填充到查找框
    const selectedText = window.getSelection().toString();
    if (selectedText && selectedText.length > 1) {
        findInput.value = selectedText;
        performFind(selectedText);
    }
});

// 关闭查找面板
closeFindPanel.addEventListener('click', function() {
    findPanel.style.display = 'none';
    clearFind();
});

// 优化输入处理 - 添加防抖
findInput.addEventListener('input', debounce(function() {
    performFind(this.value);
}, 300));

// 添加快捷键支持
findInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
            findPrev.click();
        } else {
            findNext.click();
        }
    }
});

// 上一个/下一个按钮事件
findPrev.addEventListener('click', function() {
    if (findResults.length > 0) {
        currentFindIndex = (currentFindIndex - 1 + findResults.length) % findResults.length;
        highlightFindResult();
    }
});

findNext.addEventListener('click', function() {
    if (findResults.length > 0) {
        currentFindIndex = (currentFindIndex + 1) % findResults.length;
        highlightFindResult();
    }
});

// 执行查找
function performFind(searchTerm) {
    clearFind();
    
    if (!searchTerm.trim()) {
        findStatus.textContent = "0/0";
        return;
    }
    
    // 在页面中查找文本
    const textNodes = getTextNodes(document.body);
    findResults = [];
    
    textNodes.forEach(node => {
        const nodeText = node.nodeValue;
        let startIndex = 0;
        let index;
        
        // 使用正则表达式进行不区分大小写的查找
        const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
        let match;
        
        while ((match = regex.exec(nodeText)) !== null) {
            findResults.push({
                node: node,
                startIndex: match.index,
                endIndex: match.index + searchTerm.length,
                originalText: match[0] // 保存原始文本用于高亮显示
            });
            
            // 避免无限循环
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
        }
    });
    
    updateFindStatus();
    
    if (findResults.length > 0) {
        currentFindIndex = 0;
        highlightFindResult();
    } else if (searchTerm) {
        findStatus.textContent = "未找到";
        findStatus.style.color = "#e74c3c";
    }
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 获取所有文本节点
function getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // 跳过不可见元素和脚本/样式标签
                if (node.parentElement.tagName === 'SCRIPT' || 
                    node.parentElement.tagName === 'STYLE' ||
                    node.parentElement.style.display === 'none' ||
                    node.parentElement.hidden) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // 只接受非空文本节点
                return node.nodeValue.trim() !== '' ? 
                    NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        },
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    return textNodes;
}

// 高亮查找结果
function highlightFindResult() {
    if (findResults.length === 0) return;
    
    const result = findResults[currentFindIndex];
    
    // 创建高亮标记
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'find-highlight';
    highlightSpan.textContent = result.originalText;
    highlightSpan.style.backgroundColor = '#ffeb3b';
    highlightSpan.style.color = '#000';
    highlightSpan.style.padding = '1px 2px';
    highlightSpan.style.borderRadius = '2px';
    
    // 创建范围并替换文本
    const range = document.createRange();
    range.setStart(result.node, result.startIndex);
    range.setEnd(result.node, result.endIndex);
    range.deleteContents();
    range.insertNode(highlightSpan);
    
    // 滚动到可见区域
    highlightSpan.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
    });
    
    // 更新状态
    updateFindStatus();
}

// 更新查找状态显示
function updateFindStatus() {
    if (findResults.length > 0) {
        findStatus.textContent = `${currentFindIndex + 1}/${findResults.length}`;
        findStatus.style.color = "#6c5ce7";
    } else {
        findStatus.textContent = "0/0";
        findStatus.style.color = "#666";
    }
}

// 清除查找结果和高亮
function clearFind() {
    // 移除所有高亮标记
    document.querySelectorAll('.find-highlight').forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize(); // 合并相邻的文本节点
    });
    
    currentFindIndex = -1;
    findResults = [];
    updateFindStatus();
}

// 点击面板外部关闭
window.addEventListener('click', function(e) {
    if (e.target === findPanel) {
        findPanel.style.display = 'none';
        clearFind();
    }
});

// 按ESC键关闭查找面板
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && findPanel.style.display === 'block') {
        findPanel.style.display = 'none';
        clearFind();
    }
    
    // 添加Ctrl+F快捷键打开查找面板
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        findPanel.style.display = 'block';
        findInput.focus();
        findInput.select();
    }
});




    
    // 搜索引擎面板
    const searchEngine = document.getElementById('searchEngine');
    const engineIcon = document.getElementById('currentEngineIcon').querySelector('img');
    
    const engineImages = {
        'baidu': 'assets/images/search-engines/bd.png',
        'google': 'assets/images/search-engines/gg.png',
        'bing': 'assets/images/search-engines/by.png',
        'duckduckgo': 'assets/images/search-engines/duckduckgo.png'
    };
    
    function updateEngineIcon() {
        const engine = searchEngine.value;
        engineIcon.src = engineImages[engine];
        localStorage.setItem('searchEngine', engine);
    }
    
    const savedEngine = localStorage.getItem('searchEngine') || 'baidu';
    searchEngine.value = savedEngine;
    updateEngineIcon();
    
    const engineSelector = document.getElementById('searchEngineSelector');
    const engineModal = document.getElementById('engineModal');
    
    engineSelector.addEventListener('click', function(e) {
        e.stopPropagation();
        engineModal.style.display = 'flex';
        
        const options = document.querySelectorAll('.engine-option');
        options.forEach(option => {
            if (option.dataset.value === searchEngine.value) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    });
    
    const closeEngineModal = document.getElementById('closeEngineModal');
    closeEngineModal.addEventListener('click', function() {
        engineModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === engineModal) {
            engineModal.style.display = 'none';
        }
    });
    
    const engineOptions = document.querySelectorAll('.engine-option');
    engineOptions.forEach(option => {
        option.addEventListener('click', function() {
            const value = this.dataset.value;
            document.getElementById('searchEngine').value = value;
            updateEngineIcon();
            
            engineOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            engineModal.style.display = 'none';
        });
    });
    
    const webSearchBtn = document.getElementById('webSearchBtn');
    webSearchBtn.addEventListener('click', function() {
        const searchTerm = document.getElementById('searchInput').value;
        const engine = document.getElementById('searchEngine').value;
        
        if (!searchTerm) return;
        
        let searchUrl = '';
        switch (engine) {
            case 'baidu':
                searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(searchTerm)}`;
                break;
            case 'google':
                searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
                break;
            case 'bing':
                searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(searchTerm)}`;
                break;
            case 'duckduckgo':
                searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchTerm)}`;
                break;
        }
        
        window.open(searchUrl, '_blank');
    });
    
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('webSearchBtn').click();
        }
    });
    
    const backToTopBtn = document.getElementById('backToTop');
    backToTopBtn.style.display = 'none';
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            backToTopBtn.style.display = 'flex';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });
    
    
    
    // 60秒读懂世界功能
    const news60sBtn = document.getElementById('news60sBtn');
    const news60sModal = document.getElementById('news60sModal');
    const closeNews60s = document.getElementById('closeNews60s');
    const closeNews60sBtn = document.getElementById('closeNews60sBtn');
    const retryNews60s = document.getElementById('retryNews60s');
    const apiSource = document.getElementById('apiSource');
    const news60sContent = document.getElementById('news60sContent');
    const news60sLoading = document.querySelector('#news60sModal .loading-indicator');
    const news60sError = document.querySelector('#news60sModal .error-retry');
    
    // 定义图片API源
    const apiSources = {
        1: 'https://api.zxki.cn/api/mt60s',
        2: 'https://zj.v.api.aa1.cn/api/60s-v2/?cc=奈斯猫',
        3: 'https://api.52vmy.cn/api/wl/60s'
    };
    
    // 显示模态框
    news60sBtn.addEventListener('click', function() {
        news60sModal.style.display = 'flex';
        loadNews60s();
    });
    
    // 关闭模态框
    function closeNewsModal() {
        news60sModal.style.display = 'none';
    }
    
    closeNews60sBtn.addEventListener('click', closeNewsModal);
    
    // 切换API源
    apiSource.addEventListener('change', loadNews60s);
    
    // 重试加载
    retryNews60s.addEventListener('click', loadNews60s);
    
    // 加载60秒读懂世界数据
    function loadNews60s() {
        // 隐藏错误和内容，显示加载
        news60sError.style.display = 'none';
        news60sContent.innerHTML = '';
        news60sLoading.style.display = 'flex';
        
        const sourceId = apiSource.value;
        const apiUrl = apiSources[sourceId];
        
        // 创建图片容器
        const imageContainer = document.createElement('div');
        imageContainer.id = 'news60sImage';
        imageContainer.style.display = 'none';
        
        // 添加时间戳防止缓存
        const timestamp = new Date().getTime();
        
        // 创建图片元素
        const img = document.createElement('img');
        img.alt = '60秒读懂世界';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        // 设置图片源
        img.src = `${apiUrl}?t=${timestamp}`;
        
        // 图片加载成功
        img.onload = function() {
            news60sLoading.style.display = 'none';
            imageContainer.style.display = 'block';
        };
        
        // 图片加载失败
        img.onerror = function() {
            // 尝试使用JSON API格式
            fetch(`${apiUrl}?t=${timestamp}`)
                .then(response => response.json())
                .then(data => {
                    // 尝试从常见API响应结构中提取图片URL
                    let imageUrl = data.imgUrl || data.image || data.url;
                    if (imageUrl) {
                        img.src = imageUrl;
                        news60sLoading.style.display = 'none';
                        imageContainer.style.display = 'block';
                    } else {
                        throw new Error('API返回无效的图片URL');
                    }
                })
                .catch(error => {
                    console.error('加载新闻图片失败:', error);
                    news60sLoading.style.display = 'none';
                    news60sError.style.display = 'block';
                });
        };
        
        imageContainer.appendChild(img);
        news60sContent.appendChild(imageContainer);
        news60sContent.style.display = 'block';
    }
    
    
    
    
    
    // 谜题功能部分
    const riddleBtn = document.getElementById('riddleBtn');
    const riddleModal = document.getElementById('riddleModal');
    const closeRiddle = document.getElementById('closeRiddle');
    const closeRiddleBtn = document.getElementById('closeRiddleBtn');
    const retryRiddle = document.getElementById('retryRiddle');
    const riddleApiSource = document.getElementById('riddleApiSource');
    const riddleQuestion = document.getElementById('riddleQuestion');
    const riddleAnswer = document.getElementById('riddleAnswer');
    const showAnswerBtn = document.getElementById('showAnswerBtn');
    const nextRiddleBtn = document.getElementById('nextRiddleBtn');
    const riddleLoading = document.querySelector('#riddleModal .loading-indicator');
    const riddleError = document.querySelector('#riddleModal .error-retry');
    const riddleContent = document.getElementById('riddleContent');
    const riddleErrorText = riddleError.querySelector('p');
    
    // 定义谜题API源
    const riddleApis = {
        1: 'https://api.xingchenfu.xyz/API/naowan.php',
        2: 'https://api.andeer.top/API/caimi.php',
        3: 'https://api.andeer.top/API/txt_guess_riddles.php'
    };
    
    // 显示谜题模态框
    riddleBtn.addEventListener('click', function() {
        riddleModal.style.display = 'flex';
        loadRiddle();
    });
    
    // 关闭谜题模态框
    function closeRiddleModal() {
        riddleModal.style.display = 'none';
        riddleAnswer.style.display = 'none';
        showAnswerBtn.textContent = '查看谜底';
    }
   
    closeRiddleBtn.addEventListener('click', closeRiddleModal);
    
    // 重试按钮
    retryRiddle.addEventListener('click', loadRiddle);
    
    // 显示谜底
    showAnswerBtn.addEventListener('click', function() {
        if (riddleAnswer.style.display === 'none') {
            riddleAnswer.style.display = 'block';
            this.textContent = '隐藏谜底';
        } else {
            riddleAnswer.style.display = 'none';
            this.textContent = '查看谜底';
        }
    });
    
    // 下一题按钮
    nextRiddleBtn.addEventListener('click', loadRiddle);
    
    // 加载谜题
    async function loadRiddle() {
        // 重置状态
        riddleError.style.display = 'none';
        riddleContent.style.display = 'none';
        riddleLoading.style.display = 'flex';
        riddleAnswer.style.display = 'none';
        showAnswerBtn.textContent = '查看谜底';
        
        if (riddleErrorText) {
            riddleErrorText.textContent = '数据加载失败';
        }

        try {
            const sourceId = riddleApiSource.value;
            const apiUrl = riddleApis[sourceId];
            
            // 添加时间戳防止缓存
            const timestamp = new Date().getTime();
            const url = `${apiUrl}?t=${timestamp}`;
            
            const response = await fetch(url, {
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`API响应错误: ${response.status} ${response.statusText}`);
            }
            
            // 根据API源选择解析方式
            if (sourceId === '1') {
                const data = await response.json();
                
                if (data.code === 1 && data.data && data.data.quest && data.data.result) {
                    riddleQuestion.textContent = data.data.quest;
                    riddleAnswer.textContent = `谜底: ${data.data.result}`;
                    
                    riddleLoading.style.display = 'none';
                    riddleContent.style.display = 'block';
                } else {
                    throw new Error(data.message || "API返回无效数据");
                }
            } else if (sourceId === '2') {
                const data = await response.json();
                
                if (data.success && data.data && data.data.question && data.data.answer) {
                    riddleQuestion.textContent = data.data.question;
                    riddleAnswer.textContent = `谜底: ${data.data.answer}`;
                    
                    riddleLoading.style.display = 'none';
                    riddleContent.style.display = 'block';
                } else {
                    throw new Error(data.msg || "API返回无效数据");
                }
            } else if (sourceId === '3') {
                const data = await response.json();
                
                if (data.success && data.data && data.data.谜题 && data.data.谜底) {
                    riddleQuestion.textContent = data.data.谜题;
                    riddleAnswer.textContent = `谜底: ${data.data.谜底}`;
                    
                    if (data.data.类别 && data.data.提示) {
                        riddleQuestion.textContent = `${data.data.类别}: ${data.data.谜题} (${data.data.提示})`;
                    }
                    
                    riddleLoading.style.display = 'none';
                    riddleContent.style.display = 'block';
                } else {
                    throw new Error(data.msg || "API返回无效数据");
                }
            }
        } catch (error) {
            console.error('加载谜题失败:', error);
            
            if (riddleErrorText) {
                riddleErrorText.textContent = `数据加载失败: ${error.message}`;
            }
            
            riddleLoading.style.display = 'none';
            riddleError.style.display = 'block';
        }
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(e) {
        if (e.target === riddleModal) {
            closeRiddleModal();
        }
    });
    
    
    


// 语录库功能（精简版）
const quoteLibBtn = document.getElementById('quoteLibBtn');
const quoteLibModal = document.getElementById('quoteLibModal');
const closeQuoteBtn = document.getElementById('closeQuoteBtn');
const retryQuoteBtn = document.getElementById('retryQuote');
const refreshQuoteBtn = document.getElementById('refreshQuoteBtn');
const quoteApiSource = document.getElementById('quoteApiSource');
const quoteText = document.getElementById('quoteText');
const quoteLoading = document.querySelector('#quoteLibModal .loading-indicator');
const quoteError = document.querySelector('#quoteLibModal .error-retry');
const quoteContent = document.getElementById('quoteContent');

// 定义精简的语录API源 - 第二个API改为直接调用伤感语录
const quoteApis = {
    1: 'http://api.xingchenfu.xyz/API/juhe.php?msg=社会语录', // 毒鸡汤API
    2: 'http://api.xingchenfu.xyz/API/juhe.php?msg=伤感语录', // 直接调用伤感语录API
    3: 'https://api.kuleu.com/api/aiqinggongyu' // 爱情公寓
};

// 更新选择器选项文本
function updateQuoteSelectorOptions() {
    // 获取选择器元素
    const selector = document.getElementById('quoteApiSource');
    
    // 更新选项文本
    const options = selector.querySelectorAll('option');
    options[0].textContent = '社会语录'; // 第一个选项
    options[1].textContent = '伤感语录'; // 第二个选项改为伤感语录
    options[2].textContent = '爱情公寓'; // 第三个选项
}

// 显示语录库模态框
quoteLibBtn.addEventListener('click', function() {
    quoteLibModal.style.display = 'flex';
    updateQuoteSelectorOptions(); // 更新选择器选项文本
    loadQuote();
});

// 关闭语录库模态框
closeQuoteBtn.addEventListener('click', function() {
    quoteLibModal.style.display = 'none';
});

// 重试加载语录
retryQuoteBtn.addEventListener('click', loadQuote);

// 刷新语录
refreshQuoteBtn.addEventListener('click', loadQuote);

// 切换API源
quoteApiSource.addEventListener('change', loadQuote);

// 加载语录 - 精简版本
async function loadQuote() {
    showQuoteLoading();
    hideQuoteError();
    
    try {
        const sourceId = quoteApiSource.value;
        const apiUrl = quoteApis[sourceId];
        
        if (!apiUrl) {
            throw new Error('无效的API源');
        }
        
        // 添加随机参数防止缓存
        const timestamp = Date.now();
        const randomParam = Math.random().toString(36).substring(7);
        
        // 构建URL - 对于前两个API，直接使用原始URL
        let fullUrl = apiUrl;
        if (sourceId === '3') { // 只有第三个API需要添加额外参数
            if (apiUrl.includes('?')) {
                fullUrl += `&t=${timestamp}&r=${randomParam}`;
            } else {
                fullUrl += `?t=${timestamp}&r=${randomParam}`;
            }
        }
        
        console.log(`加载语录: ${fullUrl}`);
        
        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        let response;
        let data;
        
        // 处理前两个API（毒鸡汤和伤感语录）
        if (sourceId === '1' || sourceId === '2') {
            // 对于这两个API，直接获取文本内容
            response = await fetch(fullUrl, {
                signal: controller.signal,
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API响应错误: ${response.status} ${response.statusText}`);
            }
            
            // 直接返回文本内容
            data = await response.text();
        } else {
            // 其他API保持原有处理方式
            response = await fetch(fullUrl, {
                signal: controller.signal,
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API响应错误: ${response.status} ${response.statusText}`);
            }
            
            data = await response.json();
        }
        
        let quote = "";
        
        // 根据API源解析数据
        switch(sourceId) {
            case '1': // 毒鸡汤API
            case '2': // 伤感语录API
                quote = data; // 直接使用返回的文本
                break;
                
            case '3': // 爱情语录API
                if (data.code === 200 && data.data) {
                    quote = data.data;
                } else if (data.msg) {
                    quote = data.msg;
                } else {
                    quote = "语录加载失败";
                }
                break;
                
            default:
                quote = "未知语录源";
        }
        
        // 清理多余的换行和空格
        quote = quote.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // 如果语录过长，添加分段
        if (quote.length > 100) {
            quote = quote.replace(/([,.!?;:])\s+/g, '$1\n\n');
        }
        
        quoteText.textContent = quote;
        quoteContent.style.display = 'block';
        
        console.log('语录加载成功:', quote);
        
    } catch (error) {
        console.error('加载语录失败:', error);
        
        // 显示错误信息
        const errorDetails = `语录加载失败: ${getUserFriendlyError(error)}`;
        quoteText.textContent = errorDetails;
        showQuoteError();
    } finally {
        hideQuoteLoading();
    }
}

function showQuoteLoading() {
    quoteLoading.style.display = 'block';
    quoteContent.style.display = 'none';
    quoteText.textContent = "加载中...";
}

function hideQuoteLoading() {
    quoteLoading.style.display = 'none';
}

function showQuoteError() {
    quoteError.style.display = 'block';
}

function hideQuoteError() {
    quoteError.style.display = 'none';
}

function getUserFriendlyError(error) {
    if (error.name === 'AbortError') {
        return "请求超时，请检查网络连接";
    }
    
    if (error.message.includes('Failed to fetch')) {
        return "网络请求失败，请检查网络连接或API是否可用";
    }
    
    if (error.message.includes('Unexpected token')) {
        return "API返回格式不正确";
    }
    
    return `错误: ${error.message}`;
}

// 点击模态框外部关闭
window.addEventListener('click', function(e) {
    if (e.target === quoteLibModal) {
        quoteLibModal.style.display = 'none';
    }
});

// 初始加载一次语录
loadQuote();
    
    
    
    // 毒鸡汤功能
    const chickenSoupBtn = document.getElementById('chickenSoupBtn');
    const chickenSoupModal = document.getElementById('chickenSoupModal');
    const closeChickenSoup = document.getElementById('closeChickenSoup');
    const closeChickenSoupBtn = document.getElementById('closeChickenSoupBtn');
    const retryChickenSoup = document.getElementById('retryChickenSoup');
    const refreshChickenSoupBtn = document.getElementById('refreshChickenSoupBtn');
    const chickenSoupApiSource = document.getElementById('chickenSoupApiSource');
    const chickenSoupText = document.getElementById('chickenSoupText');
    const chickenSoupLoading = document.querySelector('#chickenSoupModal .loading-indicator');
    const chickenSoupError = document.querySelector('#chickenSoupModal .error-retry');
    const chickenSoupContent = document.getElementById('chickenSoupContent');

    // 定义毒鸡汤API源（已修复第二个API的JSON格式问题）
    const chickenSoupApis = {
        1: 'https://api.btstu.cn/yan/api.php?charset=utf-8&encode=json',
        2: 'https://jkapi.com/api/dujitang' // 添加format=json参数
    };

    // 显示模态框
    chickenSoupBtn.addEventListener('click', function() {
        chickenSoupModal.style.display = 'flex';
        loadChickenSoup();
    });

    // 关闭模态框
    function closeChickenSoupModal() {
        chickenSoupModal.style.display = 'none';
    }

    closeChickenSoupBtn.addEventListener('click', closeChickenSoupModal);

    // 重试加载
    retryChickenSoup.addEventListener('click', loadChickenSoup);

    // 刷新毒鸡汤
    refreshChickenSoupBtn.addEventListener('click', loadChickenSoup);

    // 切换API源
    chickenSoupApiSource.addEventListener('change', loadChickenSoup);

    // 加载毒鸡汤（添加超时功能）
    async function loadChickenSoup() {
        showChickenSoupLoading();
        hideChickenSoupError();
        chickenSoupContent.style.display = 'none';

        try {
            const sourceId = chickenSoupApiSource.value || '1'; // 默认使用第一个API
            const apiUrl = chickenSoupApis[sourceId];
            
            if (!apiUrl) {
                throw new Error('无效的API源');
            }
            
            // 添加随机参数防止缓存
            const timestamp = Date.now();
            const randomParam = Math.random().toString(36).substring(7);
            const fullUrl = `${apiUrl}&t=${timestamp}&r=${randomParam}`;
            
            // 设置8秒超时
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('请求超时，请重试')), 8000)
            );
            
            const fetchPromise = fetch(fullUrl);
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
                throw new Error(`API错误: ${response.status}`);
            }
            
            const data = await response.json();
            let soupText = "";
            
            // 根据API源解析数据
            switch(sourceId) {
                case '1':
                    soupText = data.text || "毒鸡汤加载失败";
                    break;
                case '2':
                    soupText = data?.data?.[0] || "毒鸡汤加载失败";
                    break;
                default:
                    soupText = "未知API源";
            }
            
            chickenSoupText.textContent = soupText;
            chickenSoupContent.style.display = 'block';
            
        } catch (error) {
            console.error('加载失败:', error);
            chickenSoupText.textContent = `错误: ${error.message || '未知错误'}`;
            showChickenSoupError();
        } finally {
            hideChickenSoupLoading();
        }
    }

    function showChickenSoupLoading() {
        chickenSoupLoading.style.display = 'block';
        chickenSoupContent.style.display = 'none';
        chickenSoupError.style.display = 'none';
    }

    function hideChickenSoupLoading() {
        chickenSoupLoading.style.display = 'none';
    }

    function showChickenSoupError() {
        chickenSoupError.style.display = 'block';
    }

    function hideChickenSoupError() {
        chickenSoupError.style.display = 'none';
    }

    // 点击模态框外部关闭
    window.addEventListener('click', function(e) {
        if (e.target === chickenSoupModal) {
            closeChickenSoupModal();
        }
    });
    
    
    
// content.js - 公告功能部分（最终版）
const announcementBtn = document.getElementById('announcementBtn');
const announcementModal = document.getElementById('announcementModal');
const closeAnnouncement = document.getElementById('closeAnnouncement');
const confirmAnnouncement = document.getElementById('confirmAnnouncement');

if (announcementBtn) {
    announcementBtn.addEventListener('click', function() {
        announcementModal.style.display = 'flex';
        loadAnnouncement();
    });
}

if (closeAnnouncement) {
    closeAnnouncement.addEventListener('click', function() {
        announcementModal.style.display = 'none';
    });
}

// 点击模态框外部关闭
window.addEventListener('click', function(e) {
    if (e.target === announcementModal) {
        announcementModal.style.display = 'none';
    }
});

// 加载公告内容
function loadAnnouncement() {
    const contentDiv = document.getElementById('announcementContent');
    const dateSpan = document.getElementById('announcementDate');
    
    // 设置右下角日期
    const now = new Date();
    dateSpan.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    
    // 公告数据
    const announcements = [
        {
            icon: "fas fa-fire",
            title: "热门推荐",
            content: "探索我们最新的功能和改进",
            items: [
                "新增60秒读懂世界功能",
                "语录库新增名人名言分类",
                "毒鸡汤功能已上线",
                "新增猜谜题互动功能"
            ]
        },
        {
            icon: "fas fa-sync-alt",
            title: "最近更新",
            content: "我们不断改进以提供更好的体验",
            items: [
                "优化导航栏滚动效果",
                "改进壁纸加载机制",
                "修复移动端适配问题",
                "提升页面加载速度"
            ]
        },
        {
            icon: "fas fa-globe-asia",
            title: "网站收录",
            content: "欢迎提交优质网站加入导航",
            links: [
                {
                    icon: "fas fa-paper-plane",
                    text: "提交申请",
                    subtext: "添加您的网站",
                    url: "#"
                },
                {
                    icon: "fas fa-check-circle",
                    text: "收录标准",
                    subtext: "查看要求",
                    url: "#"
                }
            ]
        },
        {
            icon: "fas fa-comment-alt",
            title: "用户反馈",
            content: "我们重视每一位用户的反馈",
            links: [
                {
                    icon: "fas fa-envelope",
                    text: "邮箱反馈",
                    subtext: "feedback@starlink.com",
                    url: "mailto:feedback@starlink.com"
                },
                {
                    icon: "fab fa-qq",
                    text: "加入QQ群",
                    subtext: "123456789",
                    url: "https://qun.qq.com/qq.html"
                }
            ]
        }
    ];
    
    let html = '';
    
    // 生成卡片内容
    announcements.forEach(item => {
        html += `
        <div class="announcement-card">
            <div class="card-header">
                <div class="card-icon">
                    <i class="${item.icon}"></i>
                </div>
                <div class="card-title">${item.title}</div>
            </div>
            
            <div class="card-content">
                <p>${item.content}</p>`;
        
        if (item.items) {
            html += `<ul class="card-list">`;
            item.items.forEach(listItem => {
                html += `<li>${listItem}</li>`;
            });
            html += `</ul>`;
        }
        
        if (item.links) {
            html += `<div class="link-grid">`;
            item.links.forEach(link => {
                html += `
                <a href="${link.url}" class="link-item">
                    <div class="link-icon">
                        <i class="${link.icon}"></i>
                    </div>
                    <div>
                        <div class="link-text">${link.text}</div>
                        <div class="link-subtext">${link.subtext}</div>
                    </div>
                </a>`;
            });
            html += `</div>`;
        }
        
        html += `</div></div>`;
    });
    
    contentDiv.innerHTML = html;
    
    // 添加按钮动画效果
    confirmAnnouncement.addEventListener('click', function() {
        // 添加动画效果
        this.classList.add('confirmed');
        
        // 延迟关闭弹窗
        setTimeout(() => {
            announcementModal.style.display = 'none';
            // 重置按钮状态
            setTimeout(() => {
                this.classList.remove('confirmed');
            }, 300);
        }, 1000);
    });
}



    // 添加侧边栏Q群按钮事件
    const sidebarQQGroupBtn = document.getElementById('sidebarQQGroupBtn');
    if (sidebarQQGroupBtn) {
        sidebarQQGroupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // QQ群官方加入链接
            const qqGroupLink = "https://qun.qq.com/universal-share/share?ac=1&authKey=pY1tWXGX13KYp4l14R05WckQ9JWJ%2F7g57sUA%2FjTWOGHWlLDccV43ejumP9skMKxi&busi_data=eyJncm91cENvZGUiOiIxODc3ODAyNjMiLCJ0b2tlbiI6IjlrTVJFcDhGWGlFSHJTNU5sWHBMMW1IL2ExbUpBaGZUdlE4U3U0NVhEb013YmNlUkVNNTVxcmxVeEU0MXk0eG0iLCJ1aW4iOiIxNTk1MTI2NTM0In0%3D&data=zj3zfc5lWkBOn0T_MKrQ-mGwpdrkH4awZe2bCiJg6k-T4o62oFsplUROBLGcLokfYQyBJHGhMospxbzWj8Ne0A&svctype=4&tempid=h5_group_info";
            window.open(qqGroupLink, '_blank', 'noopener,noreferrer');
        });
    }








}