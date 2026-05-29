/**
 * 歌词解析器 - 修复毫秒精度问题
 */
class LyricParser {
    constructor() {
        this.lyrics = [];
        this.currentIndex = -1;
    }

    parseLrc(lrcText) {
        this.lyrics = [];
        if (!lrcText) return this.lyrics;
        const lines = lrcText.split('\n');
        
        for (const line of lines) {
            const timeTags = line.match(/\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]/g);
            if (!timeTags) continue;
            const text = line.replace(/\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]/g, '').trim();
            if (!text) continue;

            for (const tag of timeTags) {
                const match = tag.match(/\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/);
                if (!match) continue;
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                // 修复: 将毫秒字符串转为浮点数（0.xxx秒）
                let milliseconds = 0;
                if (match[3]) {
                    // 确保三位数字，然后除以1000得到秒的小数部分
                    const msStr = match[3].padEnd(3, '0');
                    milliseconds = parseInt(msStr) / 1000;
                }
                const time = minutes * 60 + seconds + milliseconds;
                this.lyrics.push({ time, text });
            }
        }

        this.lyrics.sort((a, b) => a.time - b.time);
        // 去重
        this.lyrics = this.lyrics.filter((lyric, index, arr) => index === 0 || lyric.time !== arr[index-1].time);
        return this.lyrics;
    }

    getCurrentIndex(currentTime) {
        if (!this.lyrics.length) return -1;
        if (currentTime < this.lyrics[0].time) return -1;
        if (currentTime >= this.lyrics[this.lyrics.length-1].time) return this.lyrics.length-1;
        let left = 0, right = this.lyrics.length-1;
        while (left <= right) {
            const mid = Math.floor((left+right)/2);
            if (currentTime >= this.lyrics[mid].time && (mid === this.lyrics.length-1 || currentTime < this.lyrics[mid+1].time)) return mid;
            if (currentTime < this.lyrics[mid].time) right = mid-1;
            else left = mid+1;
        }
        return -1;
    }

    getCurrentLyric(currentTime) {
        const idx = this.getCurrentIndex(currentTime);
        if (idx === -1) return null;
        return {
            current: this.lyrics[idx],
            next: idx+1 < this.lyrics.length ? this.lyrics[idx+1] : null,
            previous: idx-1 >= 0 ? this.lyrics[idx-1] : null,
            index: idx
        };
    }

    getDisplayLyrics(currentTime, lineCount = 3) {
        const idx = this.getCurrentIndex(currentTime);
        if (idx === -1) {
            return Array(lineCount).fill('').map((_, i) => ({ text: i === Math.floor(lineCount/2) ? '暂无歌词' : '', active: i === Math.floor(lineCount/2) }));
        }
        const half = Math.floor(lineCount/2);
        let start = Math.max(0, idx - half);
        if (start + lineCount > this.lyrics.length) start = Math.max(0, this.lyrics.length - lineCount);
        const result = [];
        for (let i = start; i < Math.min(this.lyrics.length, start+lineCount); i++) {
            result.push({ text: this.lyrics[i].text, active: i === idx, time: this.lyrics[i].time });
        }
        while (result.length < lineCount) result.push({ text: '', active: false });
        return result;
    }

    clear() { this.lyrics = []; this.currentIndex = -1; }
    getStats() { return { totalLines: this.lyrics.length, duration: this.lyrics.length ? this.lyrics[this.lyrics.length-1].time : 0, hasLyrics: !!this.lyrics.length }; }
}

window.LyricParser = LyricParser;