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
    async signUp({ firstName, lastName, email, password, organizationName = null }) {
        try {
            // Validate input
            if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password?.trim()) {
                throw new Error('All fields are required');
            }

            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }

            if (!this.isValidPassword(password)) {
                throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers');
            }

            // Check if user already exists
            const existingPerson = await this.db.findPersonByEmail(email);
            if (existingPerson) {
                throw new Error('User already exists with this email');
            }

            // Create person
            const person = new Person({
                first_name: firstName,
                last_name: lastName,
                primary_email_address: email
            });

            const personId = await this.db.createPerson(person);

            // Create credentials
            const { hash, salt } = await this.hashPassword(password);
            const credential = new PersonCredential({
                person_id: personId,
                email: email,
                password_hash: hash,
                password_salt: salt,
                is_verified: false // In real app, would require email verification
            });

            // Generate verification token
            credential.generateVerificationToken();

            await this.db.create('person_credentials', credential.toJSONWithSecrets());

            // If organization name provided, create organization
            if (organizationName?.trim()) {
                await this.createUserOrganization(personId, organizationName);
            }

            // In a real app, would send verification email here
            // For demo purposes, auto-verify
            credential.markAsVerified();
            await this.db.update('person_credentials', credential.id, credential.toJSONWithSecrets());

            return {
                success: true,
                message: 'Account created successfully',
                userId: personId
            };

        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async signIn({ email, password }) {
        try {
            if (!email?.trim() || !password?.trim()) {
                throw new Error('Email and password are required');
            }

            // Find credentials
            const credentials = await this.db.findMany('person_credentials', { email });
            if (credentials.length === 0) {
                throw new Error('Invalid email or password');
            }

            const credential = PersonCredential.fromJSON(credentials[0]);

            // Check if account is locked
            if (credential.isAccountLocked()) {
                throw new Error('Account is temporarily locked due to too many failed login attempts');
            }

            // Verify password
            const isValidPassword = await this.verifyPassword(password, credential.password_hash, credential.password_salt);
            if (!isValidPassword) {
                credential.recordFailedLogin();
                await this.db.update('person_credentials', credential.id, credential.toJSONWithSecrets());
                throw new Error('Invalid email or password');
            }

            // Check if email is verified
            if (!credential.is_verified) {
                throw new Error('Please verify your email address before signing in');
            }

            // Get person details
            const person = await this.db.findById('persons', credential.person_id);
            if (!person) {
                throw new Error('User account not found');
            }

            // Record successful login
            credential.recordSuccessfulLogin();
            await this.db.update('person_credentials', credential.id, credential.toJSONWithSecrets());

            // Generate JWT token (simplified for demo)
            const token = this.generateToken({
                userId: person.id,
                email: person.primary_email_address
            });

            // Set current user
            this.currentUser = Person.fromJSON(person);
            this.token = token;

            // Store in localStorage
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(person));

            // Emit authenticated event
            this.emit('authenticated', this.currentUser);

            return {
                success: true,
                user: this.currentUser,
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

            const credentials = await this.db.findMany('person_credentials', { email });
            if (credentials.length === 0) {
                // Don't reveal if email exists for security
                return {
                    success: true,
                    message: 'If an account exists with this email, you will receive password reset instructions'
                };
            }

            const credential = PersonCredential.fromJSON(credentials[0]);
            const resetToken = credential.generateResetToken();

            await this.db.update('person_credentials', credential.id, credential.toJSONWithSecrets());

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

            // Find credential with valid reset token
            const credentials = await this.db.findMany('person_credentials', { reset_token: token });
            if (credentials.length === 0) {
                throw new Error('Invalid or expired reset token');
            }

            const credential = PersonCredential.fromJSON(credentials[0]);

            if (!credential.isResetTokenValid(token)) {
                throw new Error('Invalid or expired reset token');
            }

            // Update password
            const { hash, salt } = await this.hashPassword(newPassword);
            credential.password_hash = hash;
            credential.password_salt = salt;
            credential.clearResetToken();

            await this.db.update('person_credentials', credential.id, credential.toJSONWithSecrets());

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

            // Get current credentials
            const credentials = await this.db.findMany('person_credentials', {
                person_id: this.currentUser.id
            });

            if (credentials.length === 0) {
                throw new Error('User credentials not found');
            }

            const credential = PersonCredential.fromJSON(credentials[0]);

            // Verify current password
            const isValidCurrentPassword = await this.verifyPassword(
                currentPassword,
                credential.password_hash,
                credential.password_salt
            );

            if (!isValidCurrentPassword) {
                throw new Error('Current password is incorrect');
            }

            // Update password
            const { hash, salt } = await this.hashPassword(newPassword);
            credential.password_hash = hash;
            credential.password_salt = salt;

            await this.db.update('person_credentials', credential.id, credential.toJSONWithSecrets());

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

    isValidPassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    async hashPassword(password, salt = null) {
        // Generate salt if not provided
        if (!salt) {
            salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hash = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        return { hash, salt };
    }

    async verifyPassword(password, hash, salt) {
        const { hash: computedHash } = await this.hashPassword(password, salt);
        return computedHash === hash;
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

    async createUserOrganization(personId, organizationName) {
        const { default: Organization } = await import('../entities/Organization.js');
        const { default: OrganizationMember } = await import('../entities/OrganizationMember.js');

        // Create organization
        const organization = new Organization({
            name: organizationName,
            created_by: personId
        });

        const orgId = await this.db.createOrganization(organization);

        // Add user as creator/admin
        const member = new OrganizationMember({
            organization_id: orgId,
            person_id: personId,
            roles: [OrganizationMember.ROLES.CREATOR, OrganizationMember.ROLES.ADMIN],
            status: OrganizationMember.STATUS.ACTIVE
        });

        await this.db.createOrganizationMember(member);

        return orgId;
    }
}