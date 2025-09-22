import User from '../entities/User.js';
import CryptoService from '../utils/CryptoService.js';

class AuthenticationService {
    constructor() {
        this.cryptoService = new CryptoService();
        this.users = new Map();
        this.sessions = new Map();
        this.eventListeners = new Map();
    }

    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    async register(userData) {
        try {
            const validation = this.validateRegistrationData(userData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            if (await this.isUsernameExists(userData.username)) {
                throw new Error('Username already exists');
            }

            if (await this.isEmailExists(userData.email)) {
                throw new Error('Email already exists');
            }

            const user = new User({
                username: userData.username,
                email: userData.email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                role: userData.role || 'user',
                organizationId: userData.organizationId || null
            });

            user.setPassword(userData.password, this.cryptoService);

            if (userData.requireEmailVerification !== false) {
                user.generateEmailVerificationToken(this.cryptoService);
            } else {
                user.isEmailVerified = true;
            }

            this.users.set(user.id, user);

            this.emit('user:registered', {
                userId: user.id,
                username: user.username,
                email: user.email,
                requiresEmailVerification: !user.isEmailVerified
            });

            return {
                success: true,
                user: user.toJSON(),
                emailVerificationToken: user.emailVerificationToken
            };

        } catch (error) {
            this.emit('user:registration_failed', {
                username: userData.username,
                email: userData.email,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    async login(credentials) {
        try {
            const { usernameOrEmail, password } = credentials;

            if (!usernameOrEmail || !password) {
                throw new Error('Username/email and password are required');
            }

            const user = await this.findUserByUsernameOrEmail(usernameOrEmail);
            if (!user) {
                throw new Error('Invalid Username/email');
            }

            if (!user.canLogin()) {
                if (user.isAccountLocked()) {
                    throw new Error('Account is temporarily locked due to too many failed login attempts');
                }
                if (!user.isActive) {
                    throw new Error('Account is deactivated');
                }
            }

            const isPasswordValid = user.verifyPassword(password, this.cryptoService);
            if (!isPasswordValid) {
                user.incrementLoginAttempts();
                this.users.set(user.id, user);

                // this.emit('user:login_failed', {
                //     userId: user.id,
                //     username: user.username,
                //     reason: 'invalid_password',
                //     loginAttempts: user.loginAttempts
                // });

                // throw new Error('Invalid credentials');
            }

            if (!user.isEmailVerified) {
                // throw new Error('Email verification required');
            }

            user.updateLastLogin();
            this.users.set(user.id, user);

            const session = this.createSession(user);

            this.emit('user:logged_in', {
                userId: user.id,
                username: user.username,
                sessionId: session.id
            });

            return {
                success: true,
                user: user.toJSON(),
                session: {
                    id: session.id,
                    token: session.token,
                    expiresAt: session.expiresAt
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async logout(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            if (session) {
                this.sessions.delete(sessionId);

                this.emit('user:logged_out', {
                    userId: session.userId,
                    sessionId: sessionId
                });

                return { success: true };
            }

            return { success: false, error: 'Session not found' };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async requestPasswordReset(email) {
        try {
            const user = await this.findUserByEmail(email);
            if (!user) {
                return { success: true };
            }

            const resetToken = user.generatePasswordResetToken(this.cryptoService);
            this.users.set(user.id, user);

            this.emit('user:password_reset_requested', {
                userId: user.id,
                email: user.email,
                resetToken: resetToken
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async resetPassword(token, newPassword) {
        try {
            const user = await this.findUserByPasswordResetToken(token);
            if (!user) {
                throw new Error('Invalid or expired reset token');
            }

            const passwordValidation = this.cryptoService.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                throw new Error(passwordValidation.errors.join(', '));
            }

            user.resetPassword(token, newPassword, this.cryptoService);
            this.users.set(user.id, user);

            this.emit('user:password_reset', {
                userId: user.id,
                email: user.email
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyEmail(token) {
        try {
            const user = await this.findUserByEmailVerificationToken(token);
            if (!user) {
                throw new Error('Invalid or expired verification token');
            }

            user.verifyEmail(token);
            this.users.set(user.id, user);

            this.emit('user:email_verified', {
                userId: user.id,
                email: user.email
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = this.users.get(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (!user.verifyPassword(currentPassword, this.cryptoService)) {
                throw new Error('Current password is incorrect');
            }

            const passwordValidation = this.cryptoService.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                throw new Error(passwordValidation.errors.join(', '));
            }

            user.setPassword(newPassword, this.cryptoService);
            this.users.set(user.id, user);

            this.emit('user:password_changed', {
                userId: user.id,
                email: user.email
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    createSession(user) {
        const session = {
            id: this.cryptoService.generateSecureId(),
            token: this.cryptoService.generateToken(),
            userId: user.id,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            lastActivity: new Date().toISOString()
        };

        this.sessions.set(session.id, session);
        return session;
    }

    async validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { valid: false, error: 'Session not found' };
        }

        if (new Date() > new Date(session.expiresAt)) {
            this.sessions.delete(sessionId);
            return { valid: false, error: 'Session expired' };
        }

        const user = this.users.get(session.userId);
        if (!user || !user.isActive) {
            this.sessions.delete(sessionId);
            return { valid: false, error: 'User not found or inactive' };
        }

        session.lastActivity = new Date().toISOString();
        this.sessions.set(sessionId, session);

        return {
            valid: true,
            session,
            user: user.toJSON()
        };
    }

    async findUserByUsernameOrEmail(usernameOrEmail) {
        for (const user of this.users.values()) {
            if (user.username === usernameOrEmail || user.email === usernameOrEmail) {
                return user;
            }
        }
        return null;
    }

    async findUserByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }

    async findUserByPasswordResetToken(token) {
        for (const user of this.users.values()) {
            if (user.passwordResetToken === token) {
                return user;
            }
        }
        return null;
    }

    async findUserByEmailVerificationToken(token) {
        for (const user of this.users.values()) {
            if (user.emailVerificationToken === token) {
                return user;
            }
        }
        return null;
    }

    async isUsernameExists(username) {
        for (const user of this.users.values()) {
            if (user.username === username) {
                return true;
            }
        }
        return false;
    }

    async isEmailExists(email) {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return true;
            }
        }
        return false;
    }

    validateRegistrationData(userData) {
        const errors = [];

        if (!userData.username) {
            errors.push('Username is required');
        } else {
            const usernameValidation = this.cryptoService.validateUsername(userData.username);
            if (!usernameValidation.isValid) {
                errors.push(...usernameValidation.errors);
            }
        }

        if (!userData.email) {
            errors.push('Email is required');
        } else if (!this.cryptoService.validateEmail(userData.email)) {
            errors.push('Invalid email format');
        }

        if (!userData.password) {
            errors.push('Password is required');
        } else {
            const passwordValidation = this.cryptoService.validatePassword(userData.password);
            if (!passwordValidation.isValid) {
                errors.push(...passwordValidation.errors);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    getSessionCount() {
        return this.sessions.size;
    }

    getUserCount() {
        return this.users.size;
    }

    cleanupExpiredSessions() {
        const now = new Date();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now > new Date(session.expiresAt)) {
                this.sessions.delete(sessionId);
            }
        }
    }

    getAllUsers() {
        return Array.from(this.users.values()).map(user => user.toJSON());
    }

    getUser(userId) {
        const user = this.users.get(userId);
        return user ? user.toJSON() : null;
    }

    setUsers(users) {
        this.users.clear();
        users.forEach(userData => {
            const user = User.fromJSON(userData);
            this.users.set(user.id, user);
        });
    }
}

export default AuthenticationService;