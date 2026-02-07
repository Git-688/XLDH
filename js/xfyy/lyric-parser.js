/**
 * 歌词解析器
 */

class LyricParser {
    constructor() {
        this.lyrics = [];
        this.currentIndex = -1;
        this.offset = 0; // 时间偏移量（毫秒）
        this.originalTimes = []; // 存储原始时间用于恢复
    }

    /**
     * 解析LRC歌词
     */
    parseLrc(lrcText) {
        this.lyrics = [];
        this.originalTimes = [];
        const lines = lrcText.split('\n');
        
        lines.forEach(line => {
            // 匹配时间标签 [mm:ss.xx] 或 [mm:ss:xx]
            const timeTags = line.match(/\[(\d+):(\d+)\.(\d+)\]/g) || line.match(/\[(\d+):(\d+):(\d+)\]/g);
            if (!timeTags) return;

            const text = line.replace(/\[\d+:\d+\.\d+\]/g, '').trim();
            if (!text) return;

            timeTags.forEach(timeTag => {
                let minutes, seconds, milliseconds;
                
                // 处理 [mm:ss.xx] 格式
                if (timeTag.includes('.')) {
                    const parts = timeTag.match(/\[(\d+):(\d+)\.(\d+)\]/);
                    if (!parts) return;
                    minutes = parseInt(parts[1]);
                    seconds = parseInt(parts[2]);
                    milliseconds = parseInt(parts[3]);
                    // 两位数毫秒转三位数
                    if (milliseconds < 100) {
                        milliseconds *= 10;
                    }
                } 
                // 处理 [mm:ss:xx] 格式
                else {
                    const parts = timeTag.match(/\[(\d+):(\d+):(\d+)\]/);
                    if (!parts) return;
                    minutes = parseInt(parts[1]);
                    seconds = parseInt(parts[2]);
                    milliseconds = parseInt(parts[3]) * 10; // 转毫秒
                }

                const time = minutes * 60 + seconds + milliseconds / 1000;
                
                this.lyrics.push({
                    time: time,
                    text: text,
                    originalTime: time
                });
                this.originalTimes.push(time);
            });
        });

        // 按时间排序
        this.lyrics.sort((a, b) => a.time - b.time);
        this.originalTimes.sort((a, b) => a - b);
        
        // 去重（相同时间的歌词）
        this.lyrics = this.lyrics.filter((lyric, index, array) => {
            return index === 0 || lyric.time !== array[index - 1].time;
        });

        return this.lyrics;
    }

    /**
     * 解析KSC歌词（卡拉OK格式）- 修复版
     */
    parseKsc(kscText) {
        this.lyrics = [];
        this.originalTimes = [];
        const lines = kscText.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            // 匹配KSC基本格式: [时间戳]歌词
            const basicMatch = line.match(/^\[(\d+)\]\s*(.+)$/);
            if (basicMatch) {
                const timeMs = parseInt(basicMatch[1]);
                const text = basicMatch[2].trim();
                
                if (!isNaN(timeMs) && text) {
                    const timeSeconds = timeMs / 1000;
                    
                    this.lyrics.push({
                        time: timeSeconds,
                        text: text,
                        originalTime: timeSeconds
                    });
                    this.originalTimes.push(timeSeconds);
                }
                return;
            }
            
            // 匹配KSC增强格式: [开始时间,结束时间]歌词
            const enhancedMatch = line.match(/^\[(\d+),(\d+)\]\s*(.+)$/);
            if (enhancedMatch) {
                const startTimeMs = parseInt(enhancedMatch[1]);
                const endTimeMs = parseInt(enhancedMatch[2]);
                const text = enhancedMatch[3].trim();
                
                if (!isNaN(startTimeMs) && text) {
                    const startTimeSeconds = startTimeMs / 1000;
                    
                    this.lyrics.push({
                        time: startTimeSeconds,
                        text: text,
                        originalTime: startTimeSeconds,
                        duration: (endTimeMs - startTimeMs) / 1000,
                        endTime: endTimeMs / 1000
                    });
                    this.originalTimes.push(startTimeSeconds);
                }
            }
        });

        // 按时间排序
        this.lyrics.sort((a, b) => a.time - b.time);
        this.originalTimes.sort((a, b) => a - b);
        
        return this.lyrics;
    }

    /**
     * 设置时间偏移
     */
    setOffset(offsetMs) {
        const offsetSeconds = offsetMs / 1000; // 转秒
        
        // 应用偏移到所有歌词
        this.lyrics.forEach((lyric, index) => {
            if (this.originalTimes[index] !== undefined) {
                lyric.time = this.originalTimes[index] + offsetSeconds;
            }
        });
        
        this.offset = offsetSeconds;
    }

    /**
     * 重置时间偏移
     */
    resetOffset() {
        this.lyrics.forEach((lyric, index) => {
            if (this.originalTimes[index] !== undefined) {
                lyric.time = this.originalTimes[index];
            }
        });
        this.offset = 0;
    }

    /**
     * 根据时间获取当前歌词索引
     */
    getCurrentIndex(currentTime) {
        if (this.lyrics.length === 0) return -1;
        
        // 如果当前时间小于第一句歌词时间，返回-1
        if (currentTime < this.lyrics[0].time) return -1;
        
        // 如果当前时间大于最后一句歌词时间，返回最后一句
        if (currentTime >= this.lyrics[this.lyrics.length - 1].time) {
            return this.lyrics.length - 1;
        }
        
        // 二分查找提高效率
        let left = 0;
        let right = this.lyrics.length - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            
            if (currentTime >= this.lyrics[mid].time && 
                (mid === this.lyrics.length - 1 || currentTime < this.lyrics[mid + 1].time)) {
                return mid;
            }
            
            if (currentTime < this.lyrics[mid].time) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        
        return -1;
    }

    /**
     * 获取当前歌词
     */
    getCurrentLyric(currentTime) {
        const index = this.getCurrentIndex(currentTime);
        if (index === -1) return null;
        
        return {
            current: this.lyrics[index],
            next: index < this.lyrics.length - 1 ? this.lyrics[index + 1] : null,
            previous: index > 0 ? this.lyrics[index - 1] : null,
            index: index
        };
    }

    /**
     * 获取歌词显示数组（用于滚动显示）
     */
    getDisplayLyrics(currentTime, lineCount = 3) {
        const currentIndex = this.getCurrentIndex(currentTime);
        if (currentIndex === -1) {
            return Array(lineCount).fill('').map((_, i) => ({
                text: i === Math.floor(lineCount / 2) ? '暂无歌词' : '',
                active: i === Math.floor(lineCount / 2)
            }));
        }

        const half = Math.floor(lineCount / 2);
        let start = currentIndex - half;
        
        // 确保起始位置合理
        if (start < 0) start = 0;
        if (start + lineCount > this.lyrics.length) {
            start = Math.max(0, this.lyrics.length - lineCount);
        }
        
        const displayLyrics = [];
        for (let i = start; i < Math.min(this.lyrics.length, start + lineCount); i++) {
            displayLyrics.push({
                text: this.lyrics[i].text,
                active: i === currentIndex,
                time: this.lyrics[i].time,
                translation: this.lyrics[i].translation
            });
        }

        // 填充不足的行
        while (displayLyrics.length < lineCount) {
            displayLyrics.push({ text: '', active: false });
        }

        return displayLyrics;
    }

    /**
     * 搜索歌词文本
     */
    searchText(keyword) {
        return this.lyrics.filter(lyric => 
            lyric.text.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * 导出为LRC格式
     */
    exportLrc() {
        return this.lyrics.map(lyric => {
            const minutes = Math.floor(lyric.time / 60);
            const seconds = Math.floor(lyric.time % 60);
            const milliseconds = Math.floor((lyric.time % 1) * 100);
            return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}]${lyric.text}`;
        }).join('\n');
    }

    /**
     * 清空歌词
     */
    clear() {
        this.lyrics = [];
        this.originalTimes = [];
        this.currentIndex = -1;
        this.offset = 0;
    }

    /**
     * 获取歌词统计信息
     */
    getStats() {
        return {
            totalLines: this.lyrics.length,
            duration: this.lyrics.length > 0 ? this.lyrics[this.lyrics.length - 1].time : 0,
            hasLyrics: this.lyrics.length > 0,
            offset: this.offset
        };
    }

    /**
     * 歌词翻译处理
     */
    parseTranslation(lrcText) {
        const lines = lrcText.split('\n');
        const translations = [];
        
        lines.forEach(line => {
            // 匹配翻译行 [tr:翻译文本]
            const translationMatch = line.match(/\[tr:(.*?)\]/);
            if (translationMatch) {
                // 尝试获取对应的时间
                const timeMatch = line.match(/\[(\d+):(\d+)\.(\d+)\]/);
                let time = 0;
                
                if (timeMatch) {
                    const minutes = parseInt(timeMatch[1]);
                    const seconds = parseInt(timeMatch[2]);
                    const milliseconds = parseInt(timeMatch[3]);
                    time = minutes * 60 + seconds + (milliseconds < 100 ? milliseconds * 10 : milliseconds) / 1000;
                }
                
                translations.push({
                    text: translationMatch[1],
                    time: time,
                    isTranslation: true
                });
            }
        });
        
        return translations;
    }

    /**
     * 合并歌词和翻译
     */
    mergeWithTranslation(translationLyrics) {
        if (!translationLyrics || translationLyrics.length === 0) {
            return this.lyrics;
        }
        
        // 按时间戳精确匹配
        translationLyrics.forEach(translation => {
            if (!translation || !translation.text || translation.time === undefined) return;
            
            // 寻找时间最接近的歌词（差值在0.5秒内）
            for (let i = 0; i < this.lyrics.length; i++) {
                if (Math.abs(this.lyrics[i].time - translation.time) < 0.5) {
                    this.lyrics[i].translation = translation.text;
                    break;
                }
            }
        });
        
        return this.lyrics;
    }
}

// 导出到全局作用域
window.LyricParser = LyricParser;