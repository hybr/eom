class CryptoService {
    constructor() {
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
    }

    async generateSaltAndHash(password) {
        const salt = this.generateSalt();
        const hash = await this.hashPassword(password, salt);
        return { salt, hash };
    }

    generateSalt() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    async hashPassword(password, salt) {
        const data = this.encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async verifyPassword(password, hash, salt) {
        const computedHash = await this.hashPassword(password, salt);
        return this.constantTimeCompare(computedHash, hash);
    }

    constantTimeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }

    generateToken() {
        const tokenArray = crypto.getRandomValues(new Uint8Array(32));
        return Array.from(tokenArray)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    generateSecureId() {
        const timestamp = Date.now().toString(36);
        const randomBytes = crypto.getRandomValues(new Uint8Array(16));
        const randomString = Array.from(randomBytes)
            .map(byte => byte.toString(36))
            .join('');
        return timestamp + '_' + randomString;
    }

    validatePassword(password) {
        const errors = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (password.length > 128) {
            errors.push('Password must be less than 128 characters');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ];

        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateUsername(username) {
        const errors = [];

        if (username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }

        if (username.length > 30) {
            errors.push('Username must be less than 30 characters');
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            errors.push('Username can only contain letters, numbers, underscores, and hyphens');
        }

        if (/^[0-9]/.test(username)) {
            errors.push('Username cannot start with a number');
        }

        const reservedUsernames = [
            'admin', 'administrator', 'root', 'system', 'api', 'www',
            'mail', 'ftp', 'localhost', 'test', 'guest', 'anonymous'
        ];

        if (reservedUsernames.includes(username.toLowerCase())) {
            errors.push('Username is reserved');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    generateRandomPassword(length = 12) {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        const allChars = lowercase + uppercase + numbers + symbols;
        let password = '';

        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];

        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    async encryptData(data, key) {
        const encodedData = this.encoder.encode(JSON.stringify(data));
        const encodedKey = this.encoder.encode(key);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            encodedKey,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            encodedData
        );

        return {
            data: Array.from(new Uint8Array(encryptedData)),
            iv: Array.from(iv)
        };
    }

    async decryptData(encryptedData, key, iv) {
        const encodedKey = this.encoder.encode(key);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            encodedKey,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(iv) },
            cryptoKey,
            new Uint8Array(encryptedData.data)
        );

        return JSON.parse(this.decoder.decode(decryptedData));
    }
}

export default CryptoService;