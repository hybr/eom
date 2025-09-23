export default class Person {
    constructor({
        id = null,
        username = '',
        name_prefix = '',
        first_name = '',
        middle_name = '',
        last_name = '',
        name_suffix = '',
        date_of_birth = null,
        primary_phone_number = '',
        primary_email_address = '',
        avatar_url = '',
        password_hash = '',
        password_salt = '',
        is_email_verified = false,
        email_verification_token = null,
        email_verification_expires = null,
        password_reset_token = null,
        password_reset_expires = null,
        failed_login_attempts = 0,
        account_locked_until = null,
        last_login_at = null,
        is_active = true,
        role = 'user',
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id || `U_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.username = username;
        this.name_prefix = name_prefix;
        this.first_name = first_name;
        this.middle_name = middle_name;
        this.last_name = last_name;
        this.name_suffix = name_suffix;
        this.date_of_birth = date_of_birth;
        this.primary_phone_number = primary_phone_number;
        this.primary_email_address = primary_email_address;
        this.avatar_url = avatar_url;
        this.password_hash = password_hash;
        this.password_salt = password_salt;
        this.is_email_verified = is_email_verified;
        this.email_verification_token = email_verification_token;
        this.email_verification_expires = email_verification_expires;
        this.password_reset_token = password_reset_token;
        this.password_reset_expires = password_reset_expires;
        this.failed_login_attempts = failed_login_attempts;
        this.account_locked_until = account_locked_until;
        this.last_login_at = last_login_at;
        this.is_active = is_active;
        this.role = role;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
    }

    static schema() {
        return {
            table: 'users',
            columns: {
                id: 'TEXT PRIMARY KEY',
                username: 'TEXT UNIQUE NOT NULL',
                name_prefix: 'TEXT',
                first_name: 'TEXT NOT NULL',
                middle_name: 'TEXT',
                last_name: 'TEXT NOT NULL',
                name_suffix: 'TEXT',
                date_of_birth: 'DATE',
                primary_phone_number: 'TEXT',
                primary_email_address: 'TEXT UNIQUE NOT NULL',
                avatar_url: 'TEXT',
                password_hash: 'TEXT NOT NULL',
                password_salt: 'TEXT NOT NULL',
                is_email_verified: 'BOOLEAN DEFAULT 0',
                email_verification_token: 'TEXT',
                email_verification_expires: 'DATETIME',
                password_reset_token: 'TEXT',
                password_reset_expires: 'DATETIME',
                failed_login_attempts: 'INTEGER DEFAULT 0',
                account_locked_until: 'DATETIME',
                last_login_at: 'DATETIME',
                is_active: 'BOOLEAN DEFAULT 1',
                role: 'TEXT DEFAULT "user"',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
            },
            indexes: [
                'CREATE INDEX idx_user_username ON users(username)',
                'CREATE INDEX idx_user_email ON users(primary_email_address)',
                'CREATE INDEX idx_user_name ON users(last_name, first_name)',
                'CREATE INDEX idx_user_verification_token ON users(email_verification_token)',
                'CREATE INDEX idx_user_reset_token ON users(password_reset_token)',
                'CREATE INDEX idx_user_active ON users(is_active)'
            ]
        };
    }

    validate() {
        const errors = [];

        if (!this.username?.trim()) {
            errors.push('Username is required');
        } else if (!this.isValidUsername(this.username)) {
            errors.push('Username must be 3-30 characters, alphanumeric and underscores only');
        }

        if (!this.first_name?.trim()) {
            errors.push('First name is required');
        }

        if (!this.last_name?.trim()) {
            errors.push('Last name is required');
        }

        if (!this.primary_email_address?.trim()) {
            errors.push('Email address is required');
        } else if (!this.isValidEmail(this.primary_email_address)) {
            errors.push('Invalid email address format');
        }

        if (this.primary_phone_number && !this.isValidPhone(this.primary_phone_number)) {
            errors.push('Invalid phone number format');
        }

        if (this.date_of_birth && !this.isValidDate(this.date_of_birth)) {
            errors.push('Invalid date of birth');
        }

        if (!this.password_hash?.trim() && !this.id) {
            errors.push('Password is required for new users');
        }

        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
        return usernameRegex.test(username);
    }

    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    getFullName() {
        const parts = [
            this.name_prefix,
            this.first_name,
            this.middle_name,
            this.last_name,
            this.name_suffix
        ].filter(part => part?.trim());

        return parts.join(' ');
    }

    getDisplayName() {
        return `${this.first_name} ${this.last_name}`;
    }

    getInitials() {
        const first = this.first_name?.charAt(0) || '';
        const last = this.last_name?.charAt(0) || '';
        return (first + last).toUpperCase();
    }

    getAge() {
        if (!this.date_of_birth) return null;

        const today = new Date();
        const birthDate = new Date(this.date_of_birth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    }

    // Authentication methods
    async setPassword(password) {
        const salt = this.generateSalt();
        const hash = await this.hashPassword(password, salt);
        this.password_hash = hash;
        this.password_salt = salt;
        this.updated_at = new Date().toISOString();
    }

    async verifyPassword(password) {
        if (!this.password_hash || !this.password_salt) {
            return false;
        }
        const hash = await this.hashPassword(password, this.password_salt);
        return hash === this.password_hash;
    }

    async hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    generateSalt() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    generateSecureToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Account security methods
    isAccountLocked() {
        if (!this.account_locked_until) return false;
        return new Date(this.account_locked_until) > new Date();
    }

    canLogin() {
        return this.is_active && !this.isAccountLocked();
    }

    recordFailedLogin() {
        this.failed_login_attempts = (this.failed_login_attempts || 0) + 1;
        if (this.failed_login_attempts >= 5) {
            this.account_locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
        }
        this.updated_at = new Date().toISOString();
    }

    recordSuccessfulLogin() {
        this.failed_login_attempts = 0;
        this.account_locked_until = null;
        this.last_login_at = new Date().toISOString();
        this.updated_at = new Date().toISOString();
    }

    // Email verification
    generateEmailVerificationToken() {
        this.email_verification_token = this.generateSecureToken();
        this.email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
        this.updated_at = new Date().toISOString();
        return this.email_verification_token;
    }

    verifyEmail(token) {
        if (!this.isEmailVerificationTokenValid(token)) {
            throw new Error('Invalid or expired verification token');
        }
        this.is_email_verified = true;
        this.email_verification_token = null;
        this.email_verification_expires = null;
        this.updated_at = new Date().toISOString();
    }

    isEmailVerificationTokenValid(token) {
        if (!this.email_verification_token || !this.email_verification_expires) {
            return false;
        }
        return this.email_verification_token === token &&
               new Date(this.email_verification_expires) > new Date();
    }

    // Password reset
    generatePasswordResetToken() {
        this.password_reset_token = this.generateSecureToken();
        this.password_reset_expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        this.updated_at = new Date().toISOString();
        return this.password_reset_token;
    }

    async resetPassword(token, newPassword) {
        if (!this.isPasswordResetTokenValid(token)) {
            throw new Error('Invalid or expired reset token');
        }
        await this.setPassword(newPassword);
        this.password_reset_token = null;
        this.password_reset_expires = null;
        this.updated_at = new Date().toISOString();
    }

    isPasswordResetTokenValid(token) {
        if (!this.password_reset_token || !this.password_reset_expires) {
            return false;
        }
        return this.password_reset_token === token &&
               new Date(this.password_reset_expires) > new Date();
    }

    toJSON() {
        // Public representation (excludes sensitive fields)
        return {
            id: this.id,
            username: this.username,
            name_prefix: this.name_prefix,
            first_name: this.first_name,
            middle_name: this.middle_name,
            last_name: this.last_name,
            name_suffix: this.name_suffix,
            date_of_birth: this.date_of_birth,
            primary_phone_number: this.primary_phone_number,
            primary_email_address: this.primary_email_address,
            avatar_url: this.avatar_url,
            is_email_verified: this.is_email_verified,
            last_login_at: this.last_login_at,
            is_active: this.is_active,
            role: this.role,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    toJSONWithSecrets() {
        // Complete representation (includes all fields for database operations)
        return {
            id: this.id,
            username: this.username,
            name_prefix: this.name_prefix,
            first_name: this.first_name,
            middle_name: this.middle_name,
            last_name: this.last_name,
            name_suffix: this.name_suffix,
            date_of_birth: this.date_of_birth,
            primary_phone_number: this.primary_phone_number,
            primary_email_address: this.primary_email_address,
            avatar_url: this.avatar_url,
            password_hash: this.password_hash,
            password_salt: this.password_salt,
            is_email_verified: this.is_email_verified,
            email_verification_token: this.email_verification_token,
            email_verification_expires: this.email_verification_expires,
            password_reset_token: this.password_reset_token,
            password_reset_expires: this.password_reset_expires,
            failed_login_attempts: this.failed_login_attempts,
            account_locked_until: this.account_locked_until,
            last_login_at: this.last_login_at,
            is_active: this.is_active,
            role: this.role,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static fromJSON(obj) {
        return new Person(obj);
    }

    update(data) {
        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'created_at' && this.hasOwnProperty(key)) {
                this[key] = data[key];
            }
        });
        this.updated_at = new Date().toISOString();
        return this;
    }

    clone() {
        return Person.fromJSON(this.toJSON());
    }
}