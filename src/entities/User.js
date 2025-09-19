class User {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.username = data.username || '';
        this.email = data.email || '';
        this.firstName = data.firstName || '';
        this.lastName = data.lastName || '';
        this.role = data.role || 'user';
        this.organizationId = data.organizationId || null;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.isEmailVerified = data.isEmailVerified !== undefined ? data.isEmailVerified : false;
        this.passwordHash = data.passwordHash || null;
        this.salt = data.salt || null;
        this.passwordResetToken = data.passwordResetToken || null;
        this.passwordResetExpires = data.passwordResetExpires || null;
        this.emailVerificationToken = data.emailVerificationToken || null;
        this.emailVerificationExpires = data.emailVerificationExpires || null;
        this.loginAttempts = data.loginAttempts || 0;
        this.accountLockedUntil = data.accountLockedUntil || null;
        this.twoFactorEnabled = data.twoFactorEnabled !== undefined ? data.twoFactorEnabled : false;
        this.twoFactorSecret = data.twoFactorSecret || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.lastLoginAt = data.lastLoginAt || null;
        this.permissions = data.permissions || [];
    }

    generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getFullName() {
        return `${this.firstName} ${this.lastName}`.trim();
    }

    hasPermission(permission) {
        return this.permissions.includes(permission) || this.role === 'admin';
    }

    addPermission(permission) {
        if (!this.hasPermission(permission)) {
            this.permissions.push(permission);
            this.updatedAt = new Date().toISOString();
        }
    }

    removePermission(permission) {
        const index = this.permissions.indexOf(permission);
        if (index > -1) {
            this.permissions.splice(index, 1);
            this.updatedAt = new Date().toISOString();
        }
    }

    updateLastLogin() {
        this.lastLoginAt = new Date().toISOString();
    }

    deactivate() {
        this.isActive = false;
        this.updatedAt = new Date().toISOString();
    }

    activate() {
        this.isActive = true;
        this.updatedAt = new Date().toISOString();
    }

    setPassword(password, cryptoService) {
        if (!cryptoService) {
            throw new Error('CryptoService is required for password operations');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        const saltAndHash = cryptoService.generateSaltAndHash(password);
        this.salt = saltAndHash.salt;
        this.passwordHash = saltAndHash.hash;
        this.updatedAt = new Date().toISOString();
    }

    verifyPassword(password, cryptoService) {
        if (!cryptoService || !this.passwordHash || !this.salt) {
            return false;
        }
        return cryptoService.verifyPassword(password, this.passwordHash, this.salt);
    }

    generatePasswordResetToken(cryptoService) {
        if (!cryptoService) {
            throw new Error('CryptoService is required for token generation');
        }

        this.passwordResetToken = cryptoService.generateToken();
        this.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
        this.updatedAt = new Date().toISOString();
        return this.passwordResetToken;
    }

    resetPassword(token, newPassword, cryptoService) {
        if (!this.passwordResetToken || !this.passwordResetExpires) {
            throw new Error('No password reset token found');
        }

        if (new Date() > new Date(this.passwordResetExpires)) {
            throw new Error('Password reset token has expired');
        }

        if (this.passwordResetToken !== token) {
            throw new Error('Invalid password reset token');
        }

        this.setPassword(newPassword, cryptoService);
        this.passwordResetToken = null;
        this.passwordResetExpires = null;
        this.loginAttempts = 0;
        this.accountLockedUntil = null;
        this.updatedAt = new Date().toISOString();
    }

    generateEmailVerificationToken(cryptoService) {
        if (!cryptoService) {
            throw new Error('CryptoService is required for token generation');
        }

        this.emailVerificationToken = cryptoService.generateToken();
        this.emailVerificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        this.updatedAt = new Date().toISOString();
        return this.emailVerificationToken;
    }

    verifyEmail(token) {
        if (!this.emailVerificationToken || !this.emailVerificationExpires) {
            throw new Error('No email verification token found');
        }

        if (new Date() > new Date(this.emailVerificationExpires)) {
            throw new Error('Email verification token has expired');
        }

        if (this.emailVerificationToken !== token) {
            throw new Error('Invalid email verification token');
        }

        this.isEmailVerified = true;
        this.emailVerificationToken = null;
        this.emailVerificationExpires = null;
        this.updatedAt = new Date().toISOString();
    }

    incrementLoginAttempts() {
        this.loginAttempts = (this.loginAttempts || 0) + 1;

        // Lock account after 5 failed attempts for 30 minutes
        if (this.loginAttempts >= 5) {
            this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }

        this.updatedAt = new Date().toISOString();
    }

    resetLoginAttempts() {
        this.loginAttempts = 0;
        this.accountLockedUntil = null;
        this.updatedAt = new Date().toISOString();
    }

    isAccountLocked() {
        if (!this.accountLockedUntil) return false;

        if (new Date() > new Date(this.accountLockedUntil)) {
            this.resetLoginAttempts();
            return false;
        }

        return true;
    }

    canLogin() {
        return this.isActive && !this.isAccountLocked();
    }

    updateLastLogin() {
        this.lastLoginAt = new Date().toISOString();
        this.resetLoginAttempts();
        this.updatedAt = new Date().toISOString();
    }

    update(data) {
        const allowedFields = ['username', 'email', 'firstName', 'lastName', 'role', 'organizationId'];
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                this[field] = data[field];
            }
        });
        this.updatedAt = new Date().toISOString();
    }

    toJSON(includeSecrets = false) {
        const data = {
            id: this.id,
            username: this.username,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            role: this.role,
            organizationId: this.organizationId,
            isActive: this.isActive,
            isEmailVerified: this.isEmailVerified,
            loginAttempts: this.loginAttempts,
            accountLockedUntil: this.accountLockedUntil,
            twoFactorEnabled: this.twoFactorEnabled,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastLoginAt: this.lastLoginAt,
            permissions: [...this.permissions]
        };

        if (includeSecrets) {
            data.passwordHash = this.passwordHash;
            data.salt = this.salt;
            data.passwordResetToken = this.passwordResetToken;
            data.passwordResetExpires = this.passwordResetExpires;
            data.emailVerificationToken = this.emailVerificationToken;
            data.emailVerificationExpires = this.emailVerificationExpires;
            data.twoFactorSecret = this.twoFactorSecret;
        }

        return data;
    }

    static fromJSON(data) {
        return new User(data);
    }
}

export default User;