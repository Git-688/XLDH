// 时间处理工具函数 - 简化版本
class TimeUtils {
    // 格式化时间
    static format(date, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const tokens = {
            'YYYY': date.getFullYear(),
            'MM': String(date.getMonth() + 1).padStart(2, '0'),
            'DD': String(date.getDate()).padStart(2, '0'),
            'HH': String(date.getHours()).padStart(2, '0'),
            'mm': String(date.getMinutes()).padStart(2, '0'),
            'ss': String(date.getSeconds()).padStart(2, '0')
        };
        
        return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => tokens[match]);
    }

    // 相对时间
    static relativeTime(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        const week = 7 * day;
        const month = 30 * day;
        const year = 365 * day;
        
        if (diff < minute) {
            return '刚刚';
        } else if (diff < hour) {
            return `${Math.floor(diff / minute)}分钟前`;
        } else if (diff < day) {
            return `${Math.floor(diff / hour)}小时前`;
        } else if (diff < week) {
            return `${Math.floor(diff / day)}天前`;
        } else if (diff < month) {
            return `${Math.floor(diff / week)}周前`;
        } else if (diff < year) {
            return `${Math.floor(diff / month)}月前`;
        } else {
            return `${Math.floor(diff / year)}年前`;
        }
    }

    // 获取友好时间显示
    static friendlyTime(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (targetDay.getTime() === today.getTime()) {
            return `今天 ${this.format(date, 'HH:mm')}`;
        } else if (targetDay.getTime() === yesterday.getTime()) {
            return `昨天 ${this.format(date, 'HH:mm')}`;
        } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
            const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
            return `周${weekdays[date.getDay()]} ${this.format(date, 'HH:mm')}`;
        } else {
            return this.format(date, 'YYYY-MM-DD HH:mm');
        }
    }

    // 倒计时
    static countdown(targetDate, callback) {
        if (!(targetDate instanceof Date)) {
            targetDate = new Date(targetDate);
        }
        
        const update = () => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;
            
            if (distance < 0) {
                callback({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    expired: true
                });
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            callback({
                days,
                hours,
                minutes,
                seconds,
                expired: false
            });
        };
        
        update();
        return setInterval(update, 1000);
    }

    // 获取当前时间戳
    static timestamp() {
        return Date.now();
    }

    // 获取当前ISO字符串
    static isoString() {
        return new Date().toISOString();
    }

    // 时间加法
    static add(date, amount, unit = 'days') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const result = new Date(date);
        const units = {
            years: 'FullYear',
            months: 'Month',
            days: 'Date',
            hours: 'Hours',
            minutes: 'Minutes',
            seconds: 'Seconds'
        };
        
        const method = units[unit];
        if (method) {
            result[`set${method}`](result[`get${method}`]() + amount);
        }
        
        return result;
    }

    // 时间减法
    static subtract(date, amount, unit = 'days') {
        return this.add(date, -amount, unit);
    }

    // 时间差
    static difference(date1, date2, unit = 'milliseconds') {
        if (!(date1 instanceof Date)) {
            date1 = new Date(date1);
        }
        if (!(date2 instanceof Date)) {
            date2 = new Date(date2);
        }
        
        const diff = date2.getTime() - date1.getTime();
        const units = {
            milliseconds: 1,
            seconds: 1000,
            minutes: 1000 * 60,
            hours: 1000 * 60 * 60,
            days: 1000 * 60 * 60 * 24
        };
        
        return Math.floor(diff / (units[unit] || 1));
    }

    // 是否是同一天
    static isSameDay(date1, date2) {
        if (!(date1 instanceof Date)) {
            date1 = new Date(date1);
        }
        if (!(date2 instanceof Date)) {
            date2 = new Date(date2);
        }
        
        return (
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
        );
    }

    // 获取星期几
    static getWeekday(date, type = 'short') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const weekdays = {
            short: ['日', '一', '二', '三', '四', '五', '六'],
            long: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
        };
        
        return weekdays[type][date.getDay()];
    }

    // 获取月份
    static getMonth(date, type = 'short') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const months = {
            short: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            long: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
        };
        
        return months[type][date.getMonth()];
    }

    // 获取时间段的开始和结束
    static getPeriod(date, period = 'day') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const start = new Date(date);
        const end = new Date(date);
        
        switch (period) {
            case 'day':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const day = start.getDay();
                const diff = start.getDate() - day + (day === 0 ? -6 : 1);
                start.setDate(diff);
                start.setHours(0, 0, 0, 0);
                end.setDate(diff + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'month':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(end.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'year':
                start.setMonth(0, 1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(11, 31);
                end.setHours(23, 59, 59, 999);
                break;
        }
        
        return { start, end };
    }

    // 验证日期
    static isValidDate(date) {
        return date instanceof Date && !isNaN(date.getTime());
    }

    // 解析日期字符串
    static parseDate(str) {
        const result = new Date(str);
        return this.isValidDate(result) ? result : null;
    }
}