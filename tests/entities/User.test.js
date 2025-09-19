import User from '../../src/entities/User.js';
import CryptoService from '../../src/utils/CryptoService.js';

describe('User Entity', () => {
    let user;
    let cryptoService;

    beforeEach(() => {
        cryptoService = new CryptoService();
        user = new User({
            username: 'testuser',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User'
        });
    });

    describe('User Creation', () => {
        test('should create user with default values', () => {
            const newUser = new User();
            expect(newUser.id).toBeDefined();
            expect(newUser.username).toBe('');
            expect(newUser.email).toBe('');
            expect(newUser.isActive).toBe(true);
            expect(newUser.isEmailVerified).toBe(false);
            expect(newUser.role).toBe('user');
            expect(newUser.permissions).toEqual([]);
            expect(newUser.loginAttempts).toBe(0);
            expect(newUser.twoFactorEnabled).toBe(false);
        });

        test('should create user with provided data', () => {
            expect(user.username).toBe('testuser');
            expect(user.email).toBe('test@example.com');
            expect(user.firstName).toBe('Test');
            expect(user.lastName).toBe('User');
            expect(user.id).toBeDefined();
            expect(user.createdAt).toBeDefined();
            expect(user.updatedAt).toBeDefined();
        });

        test('should generate unique IDs', () => {
            const user1 = new User();
            const user2 = new User();
            expect(user1.id).not.toBe(user2.id);
        });
    });

    describe('Full Name', () => {
        test('should return full name when both first and last names are provided', () => {
            expect(user.getFullName()).toBe('Test User');
        });

        test('should return trimmed name when only first name is provided', () => {
            user.lastName = '';
            expect(user.getFullName()).toBe('Test');
        });

        test('should return trimmed name when only last name is provided', () => {
            user.firstName = '';
            expect(user.getFullName()).toBe('User');
        });

        test('should return empty string when no names are provided', () => {
            user.firstName = '';
            user.lastName = '';
            expect(user.getFullName()).toBe('');
        });
    });

    describe('Password Management', () => {
        test('should set password with valid password', async () => {
            const password = 'TestPassword123!';
            user.setPassword(password, cryptoService);

            expect(user.passwordHash).toBeDefined();
            expect(user.salt).toBeDefined();
            expect(user.passwordHash).not.toBe(password);
        });

        test('should throw error for short password', () => {
            expect(() => {
                user.setPassword('short', cryptoService);
            }).toThrow('Password must be at least 8 characters long');
        });

        test('should throw error when crypto service not provided', () => {
            expect(() => {
                user.setPassword('TestPassword123!', null);
            }).toThrow('CryptoService is required for password operations');
        });

        test('should verify correct password', async () => {
            const password = 'TestPassword123!';
            user.setPassword(password, cryptoService);

            const isValid = user.verifyPassword(password, cryptoService);
            expect(isValid).toBe(true);
        });

        test('should reject incorrect password', async () => {
            const password = 'TestPassword123!';
            user.setPassword(password, cryptoService);

            const isValid = user.verifyPassword('WrongPassword', cryptoService);
            expect(isValid).toBe(false);
        });

        test('should return false when no password hash exists', () => {
            const isValid = user.verifyPassword('password', cryptoService);
            expect(isValid).toBe(false);
        });
    });

    describe('Password Reset', () => {
        test('should generate password reset token', () => {
            const token = user.generatePasswordResetToken(cryptoService);

            expect(token).toBeDefined();
            expect(user.passwordResetToken).toBe(token);
            expect(user.passwordResetExpires).toBeDefined();
            expect(new Date(user.passwordResetExpires)).toBeInstanceOf(Date);
        });

        test('should reset password with valid token', () => {
            const oldPassword = 'OldPassword123!';
            const newPassword = 'NewPassword123!';

            user.setPassword(oldPassword, cryptoService);
            const token = user.generatePasswordResetToken(cryptoService);

            user.resetPassword(token, newPassword, cryptoService);

            expect(user.verifyPassword(newPassword, cryptoService)).toBe(true);
            expect(user.verifyPassword(oldPassword, cryptoService)).toBe(false);
            expect(user.passwordResetToken).toBeNull();
            expect(user.passwordResetExpires).toBeNull();
            expect(user.loginAttempts).toBe(0);
            expect(user.accountLockedUntil).toBeNull();
        });

        test('should throw error for invalid reset token', () => {
            user.generatePasswordResetToken(cryptoService);

            expect(() => {
                user.resetPassword('invalid-token', 'NewPassword123!', cryptoService);
            }).toThrow('Invalid password reset token');
        });

        test('should throw error for expired reset token', () => {
            const token = user.generatePasswordResetToken(cryptoService);
            user.passwordResetExpires = new Date(Date.now() - 1000).toISOString(); // Expired

            expect(() => {
                user.resetPassword(token, 'NewPassword123!', cryptoService);
            }).toThrow('Password reset token has expired');
        });

        test('should throw error when no reset token exists', () => {
            expect(() => {
                user.resetPassword('any-token', 'NewPassword123!', cryptoService);
            }).toThrow('No password reset token found');
        });
    });

    describe('Email Verification', () => {
        test('should generate email verification token', () => {
            const token = user.generateEmailVerificationToken(cryptoService);

            expect(token).toBeDefined();
            expect(user.emailVerificationToken).toBe(token);
            expect(user.emailVerificationExpires).toBeDefined();
            expect(new Date(user.emailVerificationExpires)).toBeInstanceOf(Date);
        });

        test('should verify email with valid token', () => {
            const token = user.generateEmailVerificationToken(cryptoService);

            user.verifyEmail(token);

            expect(user.isEmailVerified).toBe(true);
            expect(user.emailVerificationToken).toBeNull();
            expect(user.emailVerificationExpires).toBeNull();
        });

        test('should throw error for invalid verification token', () => {
            user.generateEmailVerificationToken(cryptoService);

            expect(() => {
                user.verifyEmail('invalid-token');
            }).toThrow('Invalid email verification token');
        });

        test('should throw error for expired verification token', () => {
            const token = user.generateEmailVerificationToken(cryptoService);
            user.emailVerificationExpires = new Date(Date.now() - 1000).toISOString(); // Expired

            expect(() => {
                user.verifyEmail(token);
            }).toThrow('Email verification token has expired');
        });
    });

    describe('Login Attempts and Account Locking', () => {
        test('should increment login attempts', () => {
            expect(user.loginAttempts).toBe(0);

            user.incrementLoginAttempts();
            expect(user.loginAttempts).toBe(1);

            user.incrementLoginAttempts();
            expect(user.loginAttempts).toBe(2);
        });

        test('should lock account after 5 failed attempts', () => {
            for (let i = 0; i < 5; i++) {
                user.incrementLoginAttempts();
            }

            expect(user.loginAttempts).toBe(5);
            expect(user.accountLockedUntil).toBeDefined();
            expect(user.isAccountLocked()).toBe(true);
        });

        test('should reset login attempts', () => {
            user.loginAttempts = 3;
            user.accountLockedUntil = new Date().toISOString();

            user.resetLoginAttempts();

            expect(user.loginAttempts).toBe(0);
            expect(user.accountLockedUntil).toBeNull();
        });

        test('should unlock account after lock period expires', () => {
            user.accountLockedUntil = new Date(Date.now() - 1000).toISOString(); // Expired lock

            expect(user.isAccountLocked()).toBe(false);
            expect(user.loginAttempts).toBe(0); // Should be reset
        });

        test('should check if user can login', () => {
            expect(user.canLogin()).toBe(true);

            user.isActive = false;
            expect(user.canLogin()).toBe(false);

            user.isActive = true;
            user.accountLockedUntil = new Date(Date.now() + 60000).toISOString(); // Locked for 1 minute
            expect(user.canLogin()).toBe(false);
        });
    });

    describe('Permissions', () => {
        test('should check if user has permission', () => {
            expect(user.hasPermission('read')).toBe(false);

            user.addPermission('read');
            expect(user.hasPermission('read')).toBe(true);
        });

        test('should add permission', () => {
            user.addPermission('write');
            expect(user.permissions).toContain('write');
        });

        test('should not add duplicate permission', () => {
            user.addPermission('read');
            user.addPermission('read');
            expect(user.permissions.filter(p => p === 'read')).toHaveLength(1);
        });

        test('should remove permission', () => {
            user.addPermission('delete');
            expect(user.permissions).toContain('delete');

            user.removePermission('delete');
            expect(user.permissions).not.toContain('delete');
        });

        test('admin role should have all permissions', () => {
            user.role = 'admin';
            expect(user.hasPermission('any-permission')).toBe(true);
        });
    });

    describe('User Management', () => {
        test('should activate user', () => {
            user.isActive = false;
            user.activate();
            expect(user.isActive).toBe(true);
        });

        test('should deactivate user', () => {
            user.deactivate();
            expect(user.isActive).toBe(false);
        });

        test('should update last login', () => {
            const originalLastLogin = user.lastLoginAt;
            user.updateLastLogin();

            expect(user.lastLoginAt).not.toBe(originalLastLogin);
            expect(user.lastLoginAt).toBeDefined();
            expect(user.loginAttempts).toBe(0);
        });

        test('should update user data', () => {
            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
                email: 'updated@example.com',
                role: 'admin'
            };

            user.update(updateData);

            expect(user.firstName).toBe('Updated');
            expect(user.lastName).toBe('Name');
            expect(user.email).toBe('updated@example.com');
            expect(user.role).toBe('admin');
        });

        test('should not update restricted fields', () => {
            const originalId = user.id;
            const originalCreatedAt = user.createdAt;

            user.update({
                id: 'new-id',
                createdAt: '2020-01-01',
                passwordHash: 'should-not-update'
            });

            expect(user.id).toBe(originalId);
            expect(user.createdAt).toBe(originalCreatedAt);
            expect(user.passwordHash).toBeNull();
        });
    });

    describe('JSON Serialization', () => {
        test('should serialize to JSON without secrets', () => {
            user.setPassword('TestPassword123!', cryptoService);
            user.generatePasswordResetToken(cryptoService);

            const json = user.toJSON();

            expect(json.id).toBe(user.id);
            expect(json.username).toBe(user.username);
            expect(json.email).toBe(user.email);
            expect(json.passwordHash).toBeUndefined();
            expect(json.salt).toBeUndefined();
            expect(json.passwordResetToken).toBeUndefined();
        });

        test('should serialize to JSON with secrets when requested', () => {
            user.setPassword('TestPassword123!', cryptoService);
            user.generatePasswordResetToken(cryptoService);

            const json = user.toJSON(true);

            expect(json.passwordHash).toBeDefined();
            expect(json.salt).toBeDefined();
            expect(json.passwordResetToken).toBeDefined();
        });

        test('should create user from JSON', () => {
            const userData = {
                id: 'test-id',
                username: 'jsonuser',
                email: 'json@example.com',
                firstName: 'JSON',
                lastName: 'User',
                isActive: true
            };

            const newUser = User.fromJSON(userData);

            expect(newUser.id).toBe('test-id');
            expect(newUser.username).toBe('jsonuser');
            expect(newUser.email).toBe('json@example.com');
            expect(newUser.firstName).toBe('JSON');
            expect(newUser.lastName).toBe('User');
            expect(newUser.isActive).toBe(true);
        });
    });
});