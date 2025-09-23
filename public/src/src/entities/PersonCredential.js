export default class PersonCredential {
    constructor({
        id = null,
        person_id = null,
        email = '',
        password_hash = '',
        password_salt = '',
        is_verified = false,
        verification_token = null,
        verification_token_expires = null,
        reset_token = null,
        reset_token_expires = null,
        failed_login_attempts = 0,
        locked_until = null,
        last_login_at = null,
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id || `PC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.person_id = person_id;
        this.email = email;
        this.password_hash = password_hash;
        this.password_salt = password_salt;
        this.is_verified = is_verified;
        this.verification_token = verification_token;
        this.verification_token_expires = verification_token_expires;
        this.reset_token = reset_token;
        this.reset_token_expires = reset_token_expires;
        this.failed_login_attempts = failed_login_attempts;
        this.locked_until = locked_until;
        this.last_login_at = last_login_at;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
    }

    static schema() {
        return {
            table: 'person_credentials',
            columns: {
                id: 'TEXT PRIMARY KEY',
                person_id: 'TEXT NOT NULL',
                email: 'TEXT UNIQUE NOT NULL',
                password_hash: 'TEXT NOT NULL',
                password_salt: 'TEXT NOT NULL',
                is_verified: 'BOOLEAN DEFAULT 0',
                verification_token: 'TEXT',
                verification_token_expires: 'DATETIME',
                reset_token: 'TEXT',
                reset_token_expires: 'DATETIME',
                failed_login_attempts: 'INTEGER DEFAULT 0',
                locked_until: 'DATETIME',
                last_login_at: 'DATETIME',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
            },
            indexes: [
                'CREATE INDEX idx_person_credentials_person_id ON person_credentials(person_id)',
                'CREATE INDEX idx_person_credentials_email ON person_credentials(email)',
                'CREATE INDEX idx_person_credentials_verification_token ON person_credentials(verification_token)',
                'CREATE INDEX idx_person_credentials_reset_token ON person_credentials(reset_token)'
            ],
            foreignKeys: [
                'FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE'
            ]
        };
    }

    validate() {
        const errors = [];

        if (!this.person_id?.trim()) {
            errors.push('Person ID is required');
        }

        if (!this.email?.trim()) {
            errors.push('Email is required');
        } else if (!this.isValidEmail(this.email)) {
            errors.push('Invalid email format');
        }

        if (!this.password_hash?.trim()) {
            errors.push('Password hash is required');
        }

        if (!this.password_salt?.trim()) {
            errors.push('Password salt is required');
        }

        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isAccountLocked() {
        if (!this.locked_until) return false;
        return new Date(this.locked_until) > new Date();
    }

    isVerificationTokenValid(token) {
        if (!this.verification_token || !this.verification_token_expires) {
            return false;
        }

        return this.verification_token === token &&
               new Date(this.verification_token_expires) > new Date();
    }

    isResetTokenValid(token) {
        if (!this.reset_token || !this.reset_token_expires) {
            return false;
        }

        return this.reset_token === token &&
               new Date(this.reset_token_expires) > new Date();
    }

    generateVerificationToken() {
        this.verification_token = this.generateSecureToken();
        this.verification_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
        this.updated_at = new Date().toISOString();
        return this.verification_token;
    }

    generateResetToken() {
        this.reset_token = this.generateSecureToken();
        this.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        this.updated_at = new Date().toISOString();
        return this.reset_token;
    }

    generateSecureToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    recordFailedLogin() {
        this.failed_login_attempts = (this.failed_login_attempts || 0) + 1;

        // Lock account after 5 failed attempts for 30 minutes
        if (this.failed_login_attempts >= 5) {
            this.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }

        this.updated_at = new Date().toISOString();
    }

    recordSuccessfulLogin() {
        this.failed_login_attempts = 0;
        this.locked_until = null;
        this.last_login_at = new Date().toISOString();
        this.updated_at = new Date().toISOString();
    }

    markAsVerified() {
        this.is_verified = true;
        this.verification_token = null;
        this.verification_token_expires = null;
        this.updated_at = new Date().toISOString();
    }

    clearResetToken() {
        this.reset_token = null;
        this.reset_token_expires = null;
        this.updated_at = new Date().toISOString();
    }

    toJSON() {
        // Exclude sensitive fields from JSON output
        return {
            id: this.id,
            person_id: this.person_id,
            email: this.email,
            is_verified: this.is_verified,
            failed_login_attempts: this.failed_login_attempts,
            locked_until: this.locked_until,
            last_login_at: this.last_login_at,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    toJSONWithSecrets() {
        // Include all fields for database operations
        return {
            id: this.id,
            person_id: this.person_id,
            email: this.email,
            password_hash: this.password_hash,
            password_salt: this.password_salt,
            is_verified: this.is_verified,
            verification_token: this.verification_token,
            verification_token_expires: this.verification_token_expires,
            reset_token: this.reset_token,
            reset_token_expires: this.reset_token_expires,
            failed_login_attempts: this.failed_login_attempts,
            locked_until: this.locked_until,
            last_login_at: this.last_login_at,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static fromJSON(obj) {
        return new PersonCredential(obj);
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
}