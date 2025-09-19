import AuthenticationService from '../../src/services/AuthenticationService.js';

describe('AuthenticationService', () => {
    let authService;

    beforeEach(() => {
        authService = new AuthenticationService();
    });

    describe('User Registration', () => {
        test('should register user with valid data', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                firstName: 'Test',
                lastName: 'User'
            };

            const result = await authService.register(userData);

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user.username).toBe('testuser');
            expect(result.user.email).toBe('test@example.com');
            expect(result.emailVerificationToken).toBeDefined();
        });

        test('should reject registration with invalid email', async () => {
            const userData = {
                username: 'testuser',
                email: 'invalid-email',
                password: 'TestPassword123!',
                firstName: 'Test',
                lastName: 'User'
            };

            const result = await authService.register(userData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid email format');
        });

        test('should reject registration with weak password', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'weak',
                firstName: 'Test',
                lastName: 'User'
            };

            const result = await authService.register(userData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Password must be at least 8 characters long');
        });

        test('should reject registration with invalid username', async () => {
            const userData = {
                username: 'ab', // Too short
                email: 'test@example.com',
                password: 'TestPassword123!',
                firstName: 'Test',
                lastName: 'User'
            };

            const result = await authService.register(userData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Username must be at least 3 characters long');
        });

        test('should reject registration with duplicate username', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                firstName: 'Test',
                lastName: 'User'
            };

            await authService.register(userData);

            const duplicateResult = await authService.register({
                ...userData,
                email: 'different@example.com'
            });

            expect(duplicateResult.success).toBe(false);
            expect(duplicateResult.error).toContain('Username already exists');
        });

        test('should reject registration with duplicate email', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                firstName: 'Test',
                lastName: 'User'
            };

            await authService.register(userData);

            const duplicateResult = await authService.register({
                ...userData,
                username: 'differentuser'
            });

            expect(duplicateResult.success).toBe(false);
            expect(duplicateResult.error).toContain('Email already exists');
        });

        test('should emit registration event', async () => {
            const eventSpy = jest.fn();
            authService.addEventListener('user:registered', eventSpy);

            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                firstName: 'Test',
                lastName: 'User'
            };

            await authService.register(userData);

            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                username: 'testuser',
                email: 'test@example.com',
                requiresEmailVerification: true
            }));
        });
    });

    describe('User Login', () => {
        beforeEach(async () => {
            // Register a test user
            await authService.register({
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                firstName: 'Test',
                lastName: 'User',
                requireEmailVerification: false
            });
        });

        test('should login with valid username and password', async () => {
            const credentials = {
                usernameOrEmail: 'testuser',
                password: 'TestPassword123!'
            };

            const result = await authService.login(credentials);

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.session).toBeDefined();
            expect(result.session.token).toBeDefined();
            expect(result.session.expiresAt).toBeDefined();
        });

        test('should login with valid email and password', async () => {
            const credentials = {
                usernameOrEmail: 'test@example.com',
                password: 'TestPassword123!'
            };

            const result = await authService.login(credentials);

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
        });

        test('should reject login with invalid password', async () => {
            const credentials = {
                usernameOrEmail: 'testuser',
                password: 'WrongPassword'
            };

            const result = await authService.login(credentials);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');
        });

        test('should reject login with non-existent user', async () => {
            const credentials = {
                usernameOrEmail: 'nonexistent',
                password: 'TestPassword123!'
            };

            const result = await authService.login(credentials);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');
        });

        test('should lock account after multiple failed attempts', async () => {
            const credentials = {
                usernameOrEmail: 'testuser',
                password: 'WrongPassword'
            };

            // Attempt login 5 times with wrong password
            for (let i = 0; i < 5; i++) {
                await authService.login(credentials);
            }

            const result = await authService.login({
                usernameOrEmail: 'testuser',
                password: 'TestPassword123!' // Correct password
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Account is temporarily locked');
        });

        test('should emit login event', async () => {
            const eventSpy = jest.fn();
            authService.addEventListener('user:logged_in', eventSpy);

            const credentials = {
                usernameOrEmail: 'testuser',
                password: 'TestPassword123!'
            };

            await authService.login(credentials);

            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                username: 'testuser'
            }));
        });

        test('should require email verification for unverified users', async () => {
            // Register user with email verification required
            await authService.register({
                username: 'unverified',
                email: 'unverified@example.com',
                password: 'TestPassword123!',
                requireEmailVerification: true
            });

            const credentials = {
                usernameOrEmail: 'unverified',
                password: 'TestPassword123!'
            };

            const result = await authService.login(credentials);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Email verification required');
        });
    });

    describe('Session Management', () => {
        let sessionId;

        beforeEach(async () => {
            await authService.register({
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                requireEmailVerification: false
            });

            const loginResult = await authService.login({
                usernameOrEmail: 'testuser',
                password: 'TestPassword123!'
            });

            sessionId = loginResult.session.id;
        });

        test('should validate active session', async () => {
            const result = await authService.validateSession(sessionId);

            expect(result.valid).toBe(true);
            expect(result.session).toBeDefined();
            expect(result.user).toBeDefined();
        });

        test('should reject invalid session', async () => {
            const result = await authService.validateSession('invalid-session-id');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Session not found');
        });

        test('should logout and invalidate session', async () => {
            const logoutResult = await authService.logout(sessionId);
            expect(logoutResult.success).toBe(true);

            const validationResult = await authService.validateSession(sessionId);
            expect(validationResult.valid).toBe(false);
        });

        test('should reject expired session', async () => {
            // Manually expire the session
            const session = authService.sessions.get(sessionId);
            session.expiresAt = new Date(Date.now() - 1000).toISOString();

            const result = await authService.validateSession(sessionId);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Session expired');
        });
    });

    describe('Password Reset', () => {
        beforeEach(async () => {
            await authService.register({
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                requireEmailVerification: false
            });
        });

        test('should request password reset for existing user', async () => {
            const eventSpy = jest.fn();
            authService.addEventListener('user:password_reset_requested', eventSpy);

            const result = await authService.requestPasswordReset('test@example.com');

            expect(result.success).toBe(true);
            expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
                email: 'test@example.com',
                resetToken: expect.any(String)
            }));
        });

        test('should return success for non-existent user without revealing existence', async () => {
            const result = await authService.requestPasswordReset('nonexistent@example.com');
            expect(result.success).toBe(true);
        });

        test('should reset password with valid token', async () => {
            // First request reset
            await authService.requestPasswordReset('test@example.com');
            const user = await authService.findUserByEmail('test@example.com');
            const resetToken = user.passwordResetToken;

            const resetResult = await authService.resetPassword(resetToken, 'NewPassword123!');

            expect(resetResult.success).toBe(true);

            // Verify old password doesn't work
            const oldLoginResult = await authService.login({
                usernameOrEmail: 'test@example.com',
                password: 'TestPassword123!'
            });
            expect(oldLoginResult.success).toBe(false);

            // Verify new password works
            const newLoginResult = await authService.login({
                usernameOrEmail: 'test@example.com',
                password: 'NewPassword123!'
            });
            expect(newLoginResult.success).toBe(true);
        });

        test('should reject password reset with invalid token', async () => {
            const result = await authService.resetPassword('invalid-token', 'NewPassword123!');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid or expired reset token');
        });
    });

    describe('Email Verification', () => {
        test('should verify email with valid token', async () => {
            const registerResult = await authService.register({
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                requireEmailVerification: true
            });

            const verificationToken = registerResult.emailVerificationToken;
            const result = await authService.verifyEmail(verificationToken);

            expect(result.success).toBe(true);

            // User should now be able to login
            const loginResult = await authService.login({
                usernameOrEmail: 'testuser',
                password: 'TestPassword123!'
            });
            expect(loginResult.success).toBe(true);
        });

        test('should reject verification with invalid token', async () => {
            const result = await authService.verifyEmail('invalid-token');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid or expired verification token');
        });
    });

    describe('Change Password', () => {
        let userId;

        beforeEach(async () => {
            const registerResult = await authService.register({
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123!',
                requireEmailVerification: false
            });
            userId = registerResult.user.id;
        });

        test('should change password with correct current password', async () => {
            const result = await authService.changePassword(
                userId,
                'TestPassword123!',
                'NewPassword123!'
            );

            expect(result.success).toBe(true);

            // Verify new password works
            const loginResult = await authService.login({
                usernameOrEmail: 'testuser',
                password: 'NewPassword123!'
            });
            expect(loginResult.success).toBe(true);
        });

        test('should reject change password with incorrect current password', async () => {
            const result = await authService.changePassword(
                userId,
                'WrongPassword',
                'NewPassword123!'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Current password is incorrect');
        });

        test('should reject weak new password', async () => {
            const result = await authService.changePassword(
                userId,
                'TestPassword123!',
                'weak'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Password must be at least 8 characters long');
        });
    });

    describe('Event System', () => {
        test('should add and remove event listeners', () => {
            const callback = jest.fn();

            authService.addEventListener('test:event', callback);
            authService.emit('test:event', { data: 'test' });

            expect(callback).toHaveBeenCalledWith({ data: 'test' });

            authService.removeEventListener('test:event', callback);
            authService.emit('test:event', { data: 'test2' });

            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should handle errors in event listeners gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Event listener error');
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            authService.addEventListener('test:event', errorCallback);
            authService.emit('test:event', { data: 'test' });

            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('Utility Methods', () => {
        test('should return user count', () => {
            expect(authService.getUserCount()).toBe(0);
        });

        test('should return session count', () => {
            expect(authService.getSessionCount()).toBe(0);
        });

        test('should cleanup expired sessions', () => {
            // Create a mock expired session
            const expiredSession = {
                id: 'expired-session',
                expiresAt: new Date(Date.now() - 1000).toISOString()
            };
            authService.sessions.set('expired-session', expiredSession);

            expect(authService.getSessionCount()).toBe(1);
            authService.cleanupExpiredSessions();
            expect(authService.getSessionCount()).toBe(0);
        });

        test('should get all users', async () => {
            await authService.register({
                username: 'user1',
                email: 'user1@example.com',
                password: 'TestPassword123!'
            });

            await authService.register({
                username: 'user2',
                email: 'user2@example.com',
                password: 'TestPassword123!'
            });

            const users = authService.getAllUsers();
            expect(users).toHaveLength(2);
            expect(users[0].username).toBe('user1');
            expect(users[1].username).toBe('user2');
        });
    });
});