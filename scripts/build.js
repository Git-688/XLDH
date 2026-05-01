/**
 * 构建脚本：压缩 HTML、CSS、JS，输出到 ./dist
 * 作用：去除注释、空格，减小文件体积，加快用户访问速度
 */

const fs = require('fs');
const path = require('path');
const { minify: minifyHTML } = require('html-minifier');
const CleanCSS = require('clean-css');
const { minify: terserMinify } = require('terser');

// 源目录 - 你的项目所有文件所在的根目录
const SRC_DIR = './';
// 输出目录 - 会被部署到 Cloudflare Pages
const DIST_DIR = './dist';

/**
 * 递归遍历源目录，压缩文件并复制到目标目录
 * @param {string} src 源目录
 * @param {string} dest 目标目录
 */
async function processDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // 跳过隐藏文件、node_modules、dist、.git 等
    if (entry.name.startsWith('.') || 
        entry.name === 'node_modules' || 
        entry.name === 'dist' ||
        entry.name === 'scripts') {
      continue;
    }

    if (entry.isDirectory()) {
      await processDirectory(srcPath, destPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      let content = fs.readFileSync(srcPath, 'utf8');
      let processed = content;

      try {
        if (ext === '.html') {
          processed = minifyHTML(content, {
            removeComments: true,
            collapseWhitespace: true,
            minifyJS: true,
            minifyCSS: true,
          });
        } else if (ext === '.css') {
          const result = new CleanCSS({ level: 2 }).minify(content);
          processed = result.styles;
        } else if (ext === '.js') {
          const result = await terserMinify(content, {
            compress: true,
            mangle: false,
          });
          processed = result.code;
        }
      } catch (e) {
        console.warn(`⚠️ 跳过压缩 ${srcPath}: ${e.message}`);
      }

      fs.writeFileSync(destPath, processed, 'utf8');
      console.log(`✅ 处理: ${srcPath} → ${destPath}`);
    }
  }
}

// 执行构建
(async () => {
  // 清空旧的 dist 目录
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  console.log('🚀 开始构建...');
  await processDirectory(SRC_DIR, DIST_DIR);
  console.log('🎉 构建完成！压缩后的文件在 ./dist 目录');
})();
