import { getDatabase } from './Database.js';
import User from '../entities/User.js';

class UserRepository {
    constructor() {
        this.db = getDatabase();
        this.table = 'users';
    }

    async create(user) {
        const dbData = this.serializeUser(user);

        try {
            this.db.insert(this.table, dbData);
            return user;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                if (error.message.includes('username')) {
                    throw new Error('Username already exists');
                }
                if (error.message.includes('email')) {
                    throw new Error('Email already exists');
                }
            }
            throw error;
        }
    }

    async findById(id) {
        const row = this.db.findOne(this.table, { id });
        return row ? this.deserializeUser(row) : null;
    }

    async findByUsername(username) {
        const row = this.db.findOne(this.table, { username });
        return row ? this.deserializeUser(row) : null;
    }

    async findByEmail(email) {
        const row = this.db.findOne(this.table, { email });
        return row ? this.deserializeUser(row) : null;
    }

    async findByUsernameOrEmail(usernameOrEmail) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.table}
            WHERE username = ? OR email = ?
            LIMIT 1
        `);
        const row = stmt.get(usernameOrEmail, usernameOrEmail);
        return row ? this.deserializeUser(row) : null;
    }

    async findByPasswordResetToken(token) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.table}
            WHERE password_reset_token = ?
            AND password_reset_expires > datetime('now')
            LIMIT 1
        `);
        const row = stmt.get(token);
        return row ? this.deserializeUser(row) : null;
    }

    async findByEmailVerificationToken(token) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.table}
            WHERE email_verification_token = ?
            AND email_verification_expires > datetime('now')
            LIMIT 1
        `);
        const row = stmt.get(token);
        return row ? this.deserializeUser(row) : null;
    }

    async update(id, user) {
        const dbData = this.serializeUser(user);
        dbData.updated_at = new Date().toISOString();

        try {
            const result = this.db.update(this.table, dbData, { id });
            return result.changes > 0;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                if (error.message.includes('username')) {
                    throw new Error('Username already exists');
                }
                if (error.message.includes('email')) {
                    throw new Error('Email already exists');
                }
            }
            throw error;
        }
    }

    async delete(id) {
        const result = this.db.delete(this.table, { id });
        return result.changes > 0;
    }

    async findByOrganization(organizationId, options = {}) {
        const rows = this.db.findMany(this.table, { organization_id: organizationId }, options);
        return rows.map(row => this.deserializeUser(row));
    }

    async findAll(options = {}) {
        const rows = this.db.findMany(this.table, {}, options);
        return rows.map(row => this.deserializeUser(row));
    }

    async count(where = {}) {
        return this.db.count(this.table, where);
    }

    async isUsernameExists(username, excludeId = null) {
        let stmt;
        if (excludeId) {
            stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.table} WHERE username = ? AND id != ?`);
            const result = stmt.get(username, excludeId);
            return result.count > 0;
        } else {
            const result = this.db.count(this.table, { username });
            return result > 0;
        }
    }

    async isEmailExists(email, excludeId = null) {
        let stmt;
        if (excludeId) {
            stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.table} WHERE email = ? AND id != ?`);
            const result = stmt.get(email, excludeId);
            return result.count > 0;
        } else {
            const result = this.db.count(this.table, { email });
            return result > 0;
        }
    }

    async cleanupExpiredTokens() {
        const stmt = this.db.prepare(`
            UPDATE ${this.table}
            SET password_reset_token = NULL,
                password_reset_expires = NULL,
                email_verification_token = NULL,
                email_verification_expires = NULL
            WHERE (password_reset_expires IS NOT NULL AND password_reset_expires < datetime('now'))
               OR (email_verification_expires IS NOT NULL AND email_verification_expires < datetime('now'))
        `);
        return stmt.run().changes;
    }

    serializeUser(user) {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role,
            organization_id: user.organizationId,
            is_active: user.isActive ? 1 : 0,
            is_email_verified: user.isEmailVerified ? 1 : 0,
            password_hash: user.passwordHash,
            salt: user.salt,
            password_reset_token: user.passwordResetToken,
            password_reset_expires: user.passwordResetExpires,
            email_verification_token: user.emailVerificationToken,
            email_verification_expires: user.emailVerificationExpires,
            login_attempts: user.loginAttempts,
            account_locked_until: user.accountLockedUntil,
            two_factor_enabled: user.twoFactorEnabled ? 1 : 0,
            two_factor_secret: user.twoFactorSecret,
            permissions: JSON.stringify(user.permissions),
            created_at: user.createdAt,
            updated_at: user.updatedAt,
            last_login_at: user.lastLoginAt
        };
    }

    deserializeUser(row) {
        return new User({
            id: row.id,
            username: row.username,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            role: row.role,
            organizationId: row.organization_id,
            isActive: row.is_active === 1,
            isEmailVerified: row.is_email_verified === 1,
            passwordHash: row.password_hash,
            salt: row.salt,
            passwordResetToken: row.password_reset_token,
            passwordResetExpires: row.password_reset_expires,
            emailVerificationToken: row.email_verification_token,
            emailVerificationExpires: row.email_verification_expires,
            loginAttempts: row.login_attempts,
            accountLockedUntil: row.account_locked_until,
            twoFactorEnabled: row.two_factor_enabled === 1,
            twoFactorSecret: row.two_factor_secret,
            permissions: row.permissions ? JSON.parse(row.permissions) : [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at
        });
    }
}

export default UserRepository;