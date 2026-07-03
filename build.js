/* build.js - 自动为本地资源添加版本号 */
const fs = require('fs');
const path = require('path');

// 版本号优先级：环境变量 VERSION > package.json version > 时间戳
const VERSION = process.env.VERSION || (() => {
    try {
        const pkg = require('./package.json');
        return pkg.version || Date.now().toString(36);
    } catch {
        return Date.now().toString(36);
    }
})();

const HTML_PATH = path.join(__dirname, 'index.html');
const STATIC_EXTS = ['.js', '.css'];

console.log(`[Build] 版本号: ${VERSION}`);

// 读取 index.html
let html = fs.readFileSync(HTML_PATH, 'utf-8');

// 第一步：替换已有的 __VERSION__ 占位符（如果有）
html = html.replace(/__VERSION__/g, VERSION);

// 第二步：为没有版本号的本地 .js 和 .css 添加版本号
// 匹配 src="xxx.js" 或 href="xxx.css"（不包含外部链接，不包含已有版本号）
html = html.replace(
    /(src|href)=(["'])([^"']*\.(js|css))(["'])/g,
    (match, attr, quote1, url, ext, quote2) => {
        // 跳过外部链接
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
            return match;
        }
        // 如果已经有查询参数，跳过（但如果有 __VERSION__ 已被替换，不再重复）
        if (url.includes('?')) {
            return match;
        }
        // 添加版本号
        return `${attr}=${quote1}${url}?v=${VERSION}${quote2}`;
    }
);

// 第三步：也为 preload 的 as="style" 或 as="script" 添加版本号（但一般 preload 的 URL 是相同的）
// preload 中的 href 也会被上面的正则匹配，但有些 preload 使用 as="style" 或 as="script"，已包含。

fs.writeFileSync(HTML_PATH, html);
console.log(`[Build] 已应用版本号: ${VERSION}`);