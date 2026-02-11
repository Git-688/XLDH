/**
 * 歌词解析器 - 精简版，仅支持 LRC，移除翻译、偏移、搜索、导出
 */

class LyricParser {
    constructor() {
        this.lyrics = [];
        this.currentIndex = -1;
    }

    /**
     * 解析LRC歌词
     */
    parseLrc(lrcText) {
        this.lyrics = [];
        const lines = lrcText.split('\n');
        
        lines.forEach(line => {
            const timeTags = line.match(/\[(\d+):(\d+)\.(\d+)\]/g) || line.match(/\[(\d+):(\d+):(\d+)\]/g);
            if (!timeTags) return;

            const text = line.replace(/\[\d+:\d+\.\d+\]/g, '').trim();
            if (!text) return;

            timeTags.forEach(timeTag => {
                let minutes, seconds, milliseconds;
                
                if (timeTag.includes('.')) {
                    const parts = timeTag.match(/\[(\d+):(\d+)\.(\d+)\]/);
                    if (!parts) return;
                    minutes = parseInt(parts[1]);
                    seconds = parseInt(parts[2]);
                    milliseconds = parseInt(parts[3]);
                    if (milliseconds < 100) {
                        milliseconds *= 10;
                    }
                } else {
                    const parts = timeTag.match(/\[(\d+):(\d+):(\d+)\]/);
                    if (!parts) return;
                    minutes = parseInt(parts[1]);
                    seconds = parseInt(parts[2]);
                    milliseconds = parseInt(parts[3]) * 10;
                }

                const time = minutes * 60 + seconds + milliseconds / 1000;
                
                this.lyrics.push({
                    time: time,
                    text: text
                });
            });
        });

        this.lyrics.sort((a, b) => a.time - b.time);
        
        this.lyrics = this.lyrics.filter((lyric, index, array) => {
            return index === 0 || lyric.time !== array[index - 1].time;
        });

        return this.lyrics;
    }

    /**
     * 根据时间获取当前歌词索引
     */
    getCurrentIndex(currentTime) {
        if (this.lyrics.length === 0) return -1;
        
        if (currentTime < this.lyrics[0].time) return -1;
        if (currentTime >= this.lyrics[this.lyrics.length - 1].time) {
            return this.lyrics.length - 1;
        }
        
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
        
        if (start < 0) start = 0;
        if (start + lineCount > this.lyrics.length) {
            start = Math.max(0, this.lyrics.length - lineCount);
        }
        
        const displayLyrics = [];
        for (let i = start; i < Math.min(this.lyrics.length, start + lineCount); i++) {
            displayLyrics.push({
                text: this.lyrics[i].text,
                active: i === currentIndex,
                time: this.lyrics[i].time
            });
        }

        while (displayLyrics.length < lineCount) {
            displayLyrics.push({ text: '', active: false });
        }

        return displayLyrics;
    }

    /**
     * 清空歌词
     */
    clear() {
        this.lyrics = [];
        this.currentIndex = -1;
    }

    /**
     * 获取歌词统计信息
     */
    getStats() {
        return {
            totalLines: this.lyrics.length,
            duration: this.lyrics.length > 0 ? this.lyrics[this.lyrics.length - 1].time : 0,
            hasLyrics: this.lyrics.length > 0
        };
    }
}

window.LyricParser = LyricParser;