import { getDatabase } from './Database.js';

class SessionRepository {
    constructor() {
        this.db = getDatabase();
        this.table = 'sessions';
    }

    async create(sessionData) {
        try {
            this.db.insert(this.table, sessionData);
            return sessionData;
        } catch (error) {
            throw error;
        }
    }

    async findById(id) {
        return this.db.findOne(this.table, { id });
    }

    async findByToken(token) {
        return this.db.findOne(this.table, { token });
    }

    async findByUserId(userId, options = {}) {
        return this.db.findMany(this.table, { user_id: userId }, options);
    }

    async update(id, updates) {
        updates.last_activity = new Date().toISOString();
        try {
            const result = this.db.update(this.table, updates, { id });
            return result.changes > 0;
        } catch (error) {
            throw error;
        }
    }

    async delete(id) {
        const result = this.db.delete(this.table, { id });
        return result.changes > 0;
    }

    async deleteByUserId(userId) {
        const result = this.db.delete(this.table, { user_id: userId });
        return result.changes;
    }

    async cleanupExpired() {
        const stmt = this.db.prepare(`
            DELETE FROM ${this.table}
            WHERE expires_at < datetime('now')
        `);
        return stmt.run().changes;
    }

    async count(where = {}) {
        return this.db.count(this.table, where);
    }

    async findActiveSessions() {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.table}
            WHERE expires_at > datetime('now')
            ORDER BY last_activity DESC
        `);
        return stmt.all();
    }

    async extendExpiry(id, expiresAt) {
        return this.update(id, { expires_at: expiresAt });
    }
}

export default SessionRepository;