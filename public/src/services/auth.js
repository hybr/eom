import Person from '../entities/Person.js';
import PersonCredential from '../entities/PersonCredential.js';

export default class AuthService {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.listeners = {};
        this.db = null;
    }

    setDatabase(db) {
        this.db = db;
    }

    // Event handling
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // Authentication methods
    async signUp({ username, firstName, lastName, email, password, organizationName = null }) {
        try {
            // Validate input
            if (!username?.trim() || !firstName?.trim() || !lastName?.trim() || !email?.trim() || !password?.trim()) {
                throw new Error('All fields are required');
            }

            if (!this.isValidUsername(username)) {
                throw new Error('Username must be 3-30 characters, alphanumeric and underscores only');
            }

            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }

            if (!this.isValidPassword(password)) {
                throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers');
            }

            // Check if username already exists
            const existingUserByUsername = await this.db.findMany('users', { username });
            if (existingUserByUsername.length > 0) {
                throw new Error('Username already exists');
            }

            // Check if email already exists
            const existingUserByEmail = await this.db.findMany('users', { primary_email_address: email });
            if (existingUserByEmail.length > 0) {
                throw new Error('Email already exists');
            }

            // Create user
            const user = new Person({
                username,
                first_name: firstName,
                last_name: lastName,
                primary_email_address: email,
                is_email_verified: false // In real app, would require email verification
            });

            // Set password
            await user.setPassword(password);

            // Generate verification token
            user.generateEmailVerificationToken();

            await this.db.create('users', user.toJSONWithSecrets());

            // If organization name provided, create organization
            if (organizationName?.trim()) {
                await this.createUserOrganization(user.id, organizationName);
            }

            // In a real app, would send verification email here
            // For demo purposes, auto-verify
            user.is_email_verified = true;
            user.email_verification_token = null;
            user.email_verification_expires = null;
            await this.db.update('users', user.id, user.toJSONWithSecrets());

            return {
                success: true,
                message: 'Account created successfully',
                userId: user.id
            };

        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async signIn({ usernameOrEmail, password }) {
        try {
            if (!usernameOrEmail?.trim() || !password?.trim()) {
                throw new Error('Username/email and password are required');
            }

            // Find user by username or email
            let users = [];
            if (this.isValidEmail(usernameOrEmail)) {
                users = await this.db.findMany('users', { primary_email_address: usernameOrEmail });
            } else {
                users = await this.db.findMany('users', { username: usernameOrEmail });
            }

            if (users.length === 0) {
                throw new Error('Invalid username/email or password');
            }

            const user = Person.fromJSON(users[0]);

            // Check if account can login
            if (!user.canLogin()) {
                if (user.isAccountLocked()) {
                    throw new Error('Account is temporarily locked due to too many failed login attempts');
                }
                if (!user.is_active) {
                    throw new Error('Account is deactivated');
                }
            }

            // Verify password
            const isValidPassword = await user.verifyPassword(password);
            if (!isValidPassword) {
                user.recordFailedLogin();
                await this.db.update('users', user.id, user.toJSONWithSecrets());
                throw new Error('Invalid username/email or password');
            }

            // Check if email is verified
            if (!user.is_email_verified) {
                throw new Error('Please verify your email address before signing in');
            }

            // Record successful login
            user.recordSuccessfulLogin();
            await this.db.update('users', user.id, user.toJSONWithSecrets());

            // Generate JWT token (simplified for demo)
            const token = this.generateToken({
                userId: user.id,
                username: user.username,
                email: user.primary_email_address
            });

            // Set current user
            this.currentUser = user;
            this.token = token;

            // Store in localStorage
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(user.toJSON()));

            // Emit authenticated event
            this.emit('authenticated', this.currentUser);

            return {
                success: true,
                user: this.currentUser.toJSON(),
                token: token
            };

        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async signOut() {
        this.currentUser = null;
        this.token = null;

        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');

        this.emit('logout');

        return { success: true };
    }

    async getCurrentUser() {
        // Try to restore from localStorage
        if (!this.currentUser) {
            const storedUser = localStorage.getItem('currentUser');
            const storedToken = localStorage.getItem('authToken');

            if (storedUser && storedToken) {
                try {
                    this.currentUser = Person.fromJSON(JSON.parse(storedUser));
                    this.token = storedToken;

                    // Validate token (simplified)
                    if (!this.isValidToken(storedToken)) {
                        await this.signOut();
                        return null;
                    }

                } catch (error) {
                    console.error('Error restoring user session:', error);
                    await this.signOut();
                    return null;
                }
            }
        }

        return this.currentUser;
    }

    async forgotPassword(email) {
        try {
            if (!email?.trim()) {
                throw new Error('Email is required');
            }

            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }

            const users = await this.db.findMany('users', { primary_email_address: email });
            if (users.length === 0) {
                // Don't reveal if email exists for security
                return {
                    success: true,
                    message: 'If an account exists with this email, you will receive password reset instructions'
                };
            }

            const user = Person.fromJSON(users[0]);
            const resetToken = user.generatePasswordResetToken();

            await this.db.update('users', user.id, user.toJSONWithSecrets());

            // In real app, would send email with reset link
            console.log(`Password reset token for ${email}: ${resetToken}`);

            return {
                success: true,
                message: 'If an account exists with this email, you will receive password reset instructions',
                resetToken // Only for demo purposes
            };

        } catch (error) {
            console.error('Forgot password error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async resetPassword(token, newPassword) {
        try {
            if (!token?.trim() || !newPassword?.trim()) {
                throw new Error('Token and new password are required');
            }

            if (!this.isValidPassword(newPassword)) {
                throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers');
            }

            // Find user with valid reset token
            const users = await this.db.findMany('users', { password_reset_token: token });
            if (users.length === 0) {
                throw new Error('Invalid or expired reset token');
            }

            const user = Person.fromJSON(users[0]);

            if (!user.isPasswordResetTokenValid(token)) {
                throw new Error('Invalid or expired reset token');
            }

            // Update password
            await user.resetPassword(token, newPassword);
            await this.db.update('users', user.id, user.toJSONWithSecrets());

            return {
                success: true,
                message: 'Password reset successfully'
            };

        } catch (error) {
            console.error('Reset password error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }

            if (!currentPassword?.trim() || !newPassword?.trim()) {
                throw new Error('Current password and new password are required');
            }

            if (!this.isValidPassword(newPassword)) {
                throw new Error('New password must be at least 8 characters long and contain uppercase, lowercase, and numbers');
            }

            // Verify current password
            const isValidCurrentPassword = await this.currentUser.verifyPassword(currentPassword);
            if (!isValidCurrentPassword) {
                throw new Error('Current password is incorrect');
            }

            // Update password
            await this.currentUser.setPassword(newPassword);
            await this.db.update('users', this.currentUser.id, this.currentUser.toJSONWithSecrets());

            return {
                success: true,
                message: 'Password changed successfully'
            };

        } catch (error) {
            console.error('Change password error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Utility methods
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
        return usernameRegex.test(username);
    }

    isValidPassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }


    generateToken(payload) {
        // Simplified JWT-like token for demo
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const encodedPayload = btoa(JSON.stringify({
            ...payload,
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }));

        return `${header}.${encodedPayload}.demo-signature`;
    }

    isValidToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;

            const payload = JSON.parse(atob(parts[1]));
            return payload.exp > Date.now();
        } catch {
            return false;
        }
    }

    async createUserOrganization(userId, organizationName) {
        const { default: Organization } = await import('../entities/Organization.js');
        const { default: OrganizationMember } = await import('../entities/OrganizationMember.js');

        // Create organization
        const organization = new Organization({
            name: organizationName,
            created_by: userId
        });

        const orgId = await this.db.createOrganization(organization);

        // Add user as creator/admin
        const member = new OrganizationMember({
            organization_id: orgId,
            person_id: userId, // Note: Still using person_id for compatibility with existing schema
            roles: [OrganizationMember.ROLES.CREATOR, OrganizationMember.ROLES.ADMIN],
            status: OrganizationMember.STATUS.ACTIVE
        });

        await this.db.createOrganizationMember(member);

        return orgId;
    }
}