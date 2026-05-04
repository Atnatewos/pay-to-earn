// modules/captcha/captcha.service.js
const crypto = require('crypto');

class CaptchaService {
    constructor() {
        // Store active captchas temporarily (in production, use Redis)
        this.activeCaptchas = new Map();
        
        // Cleanup old captchas every 5 minutes
        setInterval(() => this.cleanup(), 300000);
    }

    generateCaptcha(userId, taskNumber) {
        const types = ['math', 'text', 'color', 'emoji', 'pattern'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let captcha;
        switch (type) {
            case 'math':
                captcha = this.generateMathCaptcha();
                break;
            case 'text':
                captcha = this.generateTextCaptcha();
                break;
            case 'color':
                captcha = this.generateColorCaptcha();
                break;
            case 'emoji':
                captcha = this.generateEmojiCaptcha();
                break;
            case 'pattern':
                captcha = this.generatePatternCaptcha();
                break;
        }

        const captchaId = crypto.randomBytes(16).toString('hex');
        const captchaData = {
            id: captchaId,
            userId,
            taskNumber,
            type,
            question: captcha.question,
            answer: captcha.answer.toLowerCase().trim(),
            display: captcha.display,
            options: captcha.options || null,
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000, // 5 minutes
            used: false
        };

        this.activeCaptchas.set(captchaId, captchaData);
        return captchaData;
    }

    generateMathCaptcha() {
        const operations = ['+', '-', '×'];
        const op = operations[Math.floor(Math.random() * operations.length)];
        let a, b, answer;

        switch (op) {
            case '+':
                a = Math.floor(Math.random() * 50) + 1;
                b = Math.floor(Math.random() * 50) + 1;
                answer = a + b;
                break;
            case '-':
                a = Math.floor(Math.random() * 50) + 20;
                b = Math.floor(Math.random() * a);
                answer = a - b;
                break;
            case '×':
                a = Math.floor(Math.random() * 12) + 1;
                b = Math.floor(Math.random() * 12) + 1;
                answer = a * b;
                break;
        }

        return {
            question: `${a} ${op} ${b} = ?`,
            answer: answer.toString(),
            display: 'math',
            type: 'input'
        };
    }

    generateTextCaptcha() {
        const words = ['PLATFORM', 'EARN', 'TASK', 'SOLVE', 'VERIFY', 'ACCESS', 'SECURE', 'PROFIT'];
        const word = words[Math.floor(Math.random() * words.length)];
        
        return {
            question: `Type this word: <strong>${word}</strong>`,
            answer: word.toLowerCase(),
            display: 'text',
            type: 'input'
        };
    }

    generateColorCaptcha() {
        const colors = [
            { name: 'Red', hex: '#EF4444', emoji: '🔴' },
            { name: 'Blue', hex: '#3B82F6', emoji: '🔵' },
            { name: 'Green', hex: '#10B981', emoji: '🟢' },
            { name: 'Yellow', hex: '#F59E0B', emoji: '🟡' },
            { name: 'Purple', hex: '#8B5CF6', emoji: '🟣' },
            { name: 'Orange', hex: '#F97316', emoji: '🟠' }
        ];

        const correct = colors[Math.floor(Math.random() * colors.length)];
        const options = this.shuffleArray([
            correct.name,
            ...this.getRandomItems(colors.filter(c => c.name !== correct.name), 3).map(c => c.name)
        ]);

        return {
            question: `What color is this? <span style="font-size:48px">${correct.emoji}</span>`,
            answer: correct.name.toLowerCase(),
            display: 'color',
            options: options,
            type: 'select'
        };
    }

    generateEmojiCaptcha() {
        const items = [
            { emoji: '🌟', name: 'star' },
            { emoji: '❤️', name: 'heart' },
            { emoji: '🎵', name: 'music' },
            { emoji: '☀️', name: 'sun' },
            { emoji: '🌙', name: 'moon' },
            { emoji: '⚡', name: 'lightning' }
        ];

        const item = items[Math.floor(Math.random() * items.length)];
        const count = Math.floor(Math.random() * 5) + 2;
        
        return {
            question: `How many? ${item.emoji.repeat(count)}`,
            answer: count.toString(),
            display: 'emoji',
            type: 'input'
        };
    }

    generatePatternCaptcha() {
        const words = ['ETHIOPIA', 'PLATFORM', 'CAPTCHA', 'VERIFY', 'SOLUTION'];
        const word = words[Math.floor(Math.random() * words.length)];
        const position = Math.floor(Math.random() * word.length) + 1;
        const letter = word[position - 1];
        
        return {
            question: `What is the letter at position <strong>${position}</strong> in the word: <strong>${word}</strong>?`,
            answer: letter.toLowerCase(),
            display: 'pattern',
            type: 'input'
        };
    }

    validateCaptcha(captchaId, userId, answer) {
        const captcha = this.activeCaptchas.get(captchaId);
        
        if (!captcha) {
            return { valid: false, error: 'Captcha expired or not found' };
        }

        if (captcha.userId !== userId) {
            return { valid: false, error: 'Invalid captcha' };
        }

        if (captcha.used) {
            return { valid: false, error: 'Captcha already used' };
        }

        if (Date.now() > captcha.expiresAt) {
            this.activeCaptchas.delete(captchaId);
            return { valid: false, error: 'Captcha expired' };
        }

        const userAnswer = answer.toLowerCase().trim();
        if (userAnswer !== captcha.answer) {
            return { valid: false, error: 'Incorrect answer' };
        }

        captcha.used = true;
        this.activeCaptchas.set(captchaId, captcha);
        
        return { valid: true, type: captcha.type };
    }

    cleanup() {
        const now = Date.now();
        for (const [id, captcha] of this.activeCaptchas) {
            if (now > captcha.expiresAt || captcha.used) {
                this.activeCaptchas.delete(id);
            }
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getRandomItems(array, count) {
        return this.shuffleArray(array).slice(0, count);
    }
}

module.exports = new CaptchaService();