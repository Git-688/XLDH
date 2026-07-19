/* lyric-parser.js - 精简版（歌词解析器） */
class LyricParser {
    constructor() {
        this.lyrics = [];
        this.currentIndex = -1;
    }

    // 解析 LRC 格式歌词
    parseLrc(lrcText) {
        this.lyrics = [];
        if (!lrcText) return this.lyrics;

        const lines = lrcText.split('\n');
        const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;

        for (const line of lines) {
            // 提取所有时间标签
            const timeTags = line.match(/\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]/g);
            if (!timeTags) continue;

            const text = line.replace(/\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]/g, '').trim();
            if (!text) continue;

            // 解析每个时间标签
            for (const tag of timeTags) {
                const match = tag.match(/\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/);
                if (!match) continue;

                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0')) / 1000 : 0;
                const time = minutes * 60 + seconds + milliseconds;

                this.lyrics.push({ time, text });
            }
        }

        // 按时间排序并去重
        this.lyrics.sort((a, b) => a.time - b.time);
        this.lyrics = this.lyrics.filter((lyric, index, arr) => 
            index === 0 || lyric.time !== arr[index - 1].time
        );

        return this.lyrics;
    }

    // 二分查找当前歌词索引
    getCurrentIndex(currentTime) {
        const len = this.lyrics.length;
        if (!len) return -1;
        if (currentTime < this.lyrics[0].time) return -1;
        if (currentTime >= this.lyrics[len - 1].time) return len - 1;

        let left = 0, right = len - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (currentTime >= this.lyrics[mid].time && 
                (mid === len - 1 || currentTime < this.lyrics[mid + 1].time)) {
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

    // 获取当前歌词及上下文
    getCurrentLyric(currentTime) {
        const idx = this.getCurrentIndex(currentTime);
        if (idx === -1) return null;

        return {
            current: this.lyrics[idx],
            next: idx + 1 < this.lyrics.length ? this.lyrics[idx + 1] : null,
            previous: idx > 0 ? this.lyrics[idx - 1] : null,
            index: idx
        };
    }

    // 获取展示歌词（当前行居中）
    getDisplayLyrics(currentTime, lineCount = 3) {
        const idx = this.getCurrentIndex(currentTime);
        const half = Math.floor(lineCount / 2);

        if (idx === -1) {
            return Array.from({ length: lineCount }, (_, i) => ({
                text: i === half ? '暂无歌词' : '',
                active: i === half
            }));
        }

        let start = Math.max(0, idx - half);
        if (start + lineCount > this.lyrics.length) {
            start = Math.max(0, this.lyrics.length - lineCount);
        }

        const result = [];
        const end = Math.min(this.lyrics.length, start + lineCount);
        for (let i = start; i < end; i++) {
            result.push({
                text: this.lyrics[i].text,
                active: i === idx,
                time: this.lyrics[i].time
            });
        }

        // 补齐空行
        while (result.length < lineCount) {
            result.push({ text: '', active: false });
        }

        return result;
    }

    clear() {
        this.lyrics = [];
        this.currentIndex = -1;
    }

    getStats() {
        return {
            totalLines: this.lyrics.length,
            duration: this.lyrics.length ? this.lyrics[this.lyrics.length - 1].time : 0,
            hasLyrics: !!this.lyrics.length
        };
    }
}

window.LyricParser = LyricParser;