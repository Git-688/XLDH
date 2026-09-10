const fs = require('fs');

const files = ['index.html', 'admin.html', 'sw.js'];
let oldVer = null;

// 检测当前版本号
for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf-8').match(/\?v=(\d+)/);
    if (m) { oldVer = m[1]; break; }
}

// 生成今天日期作为新版本号
const d = new Date();
const newVer = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

if (!oldVer || oldVer === newVer) {
    console.log(`版本号 ${newVer}，无需更新`);
    process.exit(0);
}

console.log(`替换版本号: ${oldVer} → ${newVer}`);

// 替换所有文件中的版本号
for (const f of files) {
    if (!fs.existsSync(f)) continue;
    let content = fs.readFileSync(f, 'utf-8');
    content = content.replace(new RegExp(`\\?v=${oldVer}`, 'g'), `?v=${newVer}`);
    content = content.replace(/window\.ASSET_VERSION\s*=\s*['"]\d+['"]/g, `window.ASSET_VERSION = '${newVer}'`);
    content = content.replace(/const CACHE_VERSION\s*=\s*['"]v?\d+['"];/, `const CACHE_VERSION = 'v${newVer}';`);
    fs.writeFileSync(f, content);
    console.log(`✅ ${f}`);
}