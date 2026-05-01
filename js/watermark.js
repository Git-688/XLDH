(function() {
    // 水印文本，可自定义为网站名称或域名
    const watermarkText = '星聚导航 xjdh688.ccwu.cc';

    // 创建离屏 canvas 绘制水印
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    // 设置文字样式：半透明，倾斜，使得水印不易被去除
    ctx.font = '16px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 旋转画布，让水印倾斜排列
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-25 * Math.PI / 180);
    ctx.fillText(watermarkText, 0, 0);

    // 生成背景图并应用到全屏 div
    const watermarkDiv = document.createElement('div');
    watermarkDiv.style.position = 'fixed';
    watermarkDiv.style.top = '0';
    watermarkDiv.style.left = '0';
    watermarkDiv.style.width = '100%';
    watermarkDiv.style.height = '100%';
    watermarkDiv.style.background = `url(${canvas.toDataURL()}) repeat`;
    watermarkDiv.style.pointerEvents = 'none';   // 使水印不阻挡任何点击
    watermarkDiv.style.zIndex = '999999';        // 置于最顶层但不可交互
    watermarkDiv.style.opacity = '0.5';          // 整体半透明
    document.body.appendChild(watermarkDiv);
})();