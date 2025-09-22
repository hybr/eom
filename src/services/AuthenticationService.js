import User from '../entities/User.js';
import CryptoService from '../utils/CryptoService.js';
import UserRepository from '../database/UserRepository.js';
import SessionRepository from '../database/SessionRepository.js';

class AuthenticationService {
    constructor() {
        this.cryptoService = new CryptoService();
        this.userRepository = new UserRepository();
        this.sessionRepository = new SessionRepository();
        this.eventListeners = new Map();

        // Add dummy user for testing (async)
        this.addDummyUser().catch(error => {
            console.error('Failed to initialize dummy user:', error);
        });
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

            if (await this.userRepository.isUsernameExists(userData.username)) {
                throw new Error('Username already exists');
            }

            if (await this.userRepository.isEmailExists(userData.email)) {
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

            await user.setPassword(userData.password, this.cryptoService);

            if (userData.requireEmailVerification !== false) {
                user.generateEmailVerificationToken(this.cryptoService);
            } else {
                user.isEmailVerified = true;
            }

            await this.userRepository.create(user);

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

            const user = await this.userRepository.findByUsernameOrEmail(usernameOrEmail);
            if (!user) {
                throw new Error('Invalid credentials');
            }

            if (!user.canLogin()) {
                if (user.isAccountLocked()) {
                    throw new Error('Account is temporarily locked due to too many failed login attempts');
                }
                if (!user.isActive) {
                    throw new Error('Account is deactivated');
                }
            }

            const isPasswordValid = await user.verifyPassword(password, this.cryptoService);
            if (!isPasswordValid) {
                user.incrementLoginAttempts();
                await this.userRepository.update(user.id, user);

                this.emit('user:login_failed', {
                    userId: user.id,
                    username: user.username,
                    reason: 'invalid_password',
                    loginAttempts: user.loginAttempts
                });

                throw new Error('Invalid credentials');
            }

            if (!user.isEmailVerified) {
                throw new Error('Email verification required');
            }

            user.updateLastLogin();
            await this.userRepository.update(user.id, user);

            const session = await this.createSession(user);

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
            const session = await this.sessionRepository.findById(sessionId);
            if (session) {
                await this.sessionRepository.delete(sessionId);

                this.emit('user:logged_out', {
                    userId: session.user_id,
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
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                return { success: true };
            }

            const resetToken = user.generatePasswordResetToken(this.cryptoService);
            await this.userRepository.update(user.id, user);

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
            const user = await this.userRepository.findByPasswordResetToken(token);
            if (!user) {
                throw new Error('Invalid or expired reset token');
            }

            const passwordValidation = this.cryptoService.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                throw new Error(passwordValidation.errors.join(', '));
            }

            await user.resetPassword(token, newPassword, this.cryptoService);
            await this.userRepository.update(user.id, user);

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
            const user = await this.userRepository.findByEmailVerificationToken(token);
            if (!user) {
                throw new Error('Invalid or expired verification token');
            }

            user.verifyEmail(token);
            await this.userRepository.update(user.id, user);

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
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (!(await user.verifyPassword(currentPassword, this.cryptoService))) {
                throw new Error('Current password is incorrect');
            }

            const passwordValidation = this.cryptoService.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                throw new Error(passwordValidation.errors.join(', '));
            }

            await user.setPassword(newPassword, this.cryptoService);
            await this.userRepository.update(user.id, user);

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

    async createSession(user) {
        const session = {
            id: this.cryptoService.generateSecureId(),
            token: this.cryptoService.generateToken(),
            user_id: user.id,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            last_activity: new Date().toISOString()
        };

        await this.sessionRepository.create(session);
        return {
            id: session.id,
            token: session.token,
            userId: session.user_id,
            createdAt: session.created_at,
            expiresAt: session.expires_at,
            lastActivity: session.last_activity
        };
    }

    async validateSession(sessionId) {
        const session = await this.sessionRepository.findById(sessionId);
        if (!session) {
            return { valid: false, error: 'Session not found' };
        }

        if (new Date() > new Date(session.expires_at)) {
            await this.sessionRepository.delete(sessionId);
            return { valid: false, error: 'Session expired' };
        }

        const user = await this.userRepository.findById(session.user_id);
        if (!user || !user.isActive) {
            await this.sessionRepository.delete(sessionId);
            return { valid: false, error: 'User not found or inactive' };
        }

        await this.sessionRepository.update(sessionId, {
            last_activity: new Date().toISOString()
        });

        return {
            valid: true,
            session: {
                id: session.id,
                token: session.token,
                userId: session.user_id,
                createdAt: session.created_at,
                expiresAt: session.expires_at,
                lastActivity: session.last_activity
            },
            user: user.toJSON()
        };
    }

    async findUserByUsernameOrEmail(usernameOrEmail) {
        return await this.userRepository.findByUsernameOrEmail(usernameOrEmail);
    }

    async findUserByEmail(email) {
        return await this.userRepository.findByEmail(email);
    }

    async findUserByPasswordResetToken(token) {
        return await this.userRepository.findByPasswordResetToken(token);
    }

    async findUserByEmailVerificationToken(token) {
        return await this.userRepository.findByEmailVerificationToken(token);
    }

    async isUsernameExists(username) {
        return await this.userRepository.isUsernameExists(username);
    }

    async isEmailExists(email) {
        return await this.userRepository.isEmailExists(email);
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

    async getSessionCount() {
        return await this.sessionRepository.count();
    }

    async getUserCount() {
        return await this.userRepository.count();
    }

    async cleanupExpiredSessions() {
        return await this.sessionRepository.cleanupExpired();
    }

    async getAllUsers() {
        const users = await this.userRepository.findAll();
        return users.map(user => user.toJSON());
    }

    async getUser(userId) {
        const user = await this.userRepository.findById(userId);
        return user ? user.toJSON() : null;
    }

    async setUsers(users) {
        // This method is deprecated when using database storage
        // Users should be managed through individual CRUD operations
        throw new Error('setUsers is not supported with database storage. Use individual create/update operations instead.');
    }

    async addDummyUser() {
        try {
            // Check if admin user already exists
            const existingUser = await this.userRepository.findByUsername('admin');
            if (existingUser) {
                return; // Admin user already exists
            }

            const dummyUser = new User({
                username: 'admin',
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin',
                isEmailVerified: true
            });

            await dummyUser.setPassword('Admin123!', this.cryptoService);
            await this.userRepository.create(dummyUser);
        } catch (error) {
            console.error('Failed to create dummy user:', error.message);
        }
    }
}

export default AuthenticationService;