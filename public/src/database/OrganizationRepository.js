import { getDatabase } from './Database.js';
import Organization from '../entities/Organization.js';

class OrganizationRepository {
    constructor() {
        this.db = getDatabase();
        this.table = 'organizations';
    }

    async create(organizationData) {
        const organization = new Organization(organizationData);
        const dbData = this.serializeOrganization(organization);

        try {
            this.db.insert(this.table, dbData);
            return organization;
        } catch (error) {
            throw error;
        }
    }

    async findById(id) {
        const row = this.db.findOne(this.table, { id });
        return row ? this.deserializeOrganization(row) : null;
    }

    async findByName(name) {
        const row = this.db.findOne(this.table, { name });
        return row ? this.deserializeOrganization(row) : null;
    }

    async update(id, organization) {
        const dbData = this.serializeOrganization(organization);
        dbData.updated_at = new Date().toISOString();

        try {
            const result = this.db.update(this.table, dbData, { id });
            return result.changes > 0;
        } catch (error) {
            throw error;
        }
    }

    async delete(id) {
        const result = this.db.delete(this.table, { id });
        return result.changes > 0;
    }

    async findAll(options = {}) {
        const rows = this.db.findMany(this.table, {}, options);
        return rows.map(row => this.deserializeOrganization(row));
    }

    async findActive(options = {}) {
        const rows = this.db.findMany(this.table, { is_active: 1 }, options);
        return rows.map(row => this.deserializeOrganization(row));
    }

    async count(where = {}) {
        return this.db.count(this.table, where);
    }

    async findByUserId(userId) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.table}
            WHERE user_ids LIKE ?
            OR admin_ids LIKE ?
        `);
        const likePattern = `%"${userId}"%`;
        const rows = stmt.all(likePattern, likePattern);
        return rows.map(row => this.deserializeOrganization(row));
    }

    serializeOrganization(organization) {
        return {
            id: organization.id,
            name: organization.name,
            description: organization.description,
            website: organization.website,
            address: JSON.stringify(organization.address),
            contact_email: organization.contactEmail,
            contact_phone: organization.contactPhone,
            is_active: organization.isActive ? 1 : 0,
            settings: JSON.stringify(organization.settings),
            user_ids: JSON.stringify(organization.userIds),
            admin_ids: JSON.stringify(organization.adminIds),
            invitations: JSON.stringify(organization.invitations || []),
            created_at: organization.createdAt,
            updated_at: organization.updatedAt
        };
    }

    deserializeOrganization(row) {
        return new Organization({
            id: row.id,
            name: row.name,
            description: row.description,
            website: row.website,
            address: row.address ? JSON.parse(row.address) : {},
            contactEmail: row.contact_email,
            contactPhone: row.contact_phone,
            isActive: row.is_active === 1,
            settings: row.settings ? JSON.parse(row.settings) : {},
            userIds: row.user_ids ? JSON.parse(row.user_ids) : [],
            adminIds: row.admin_ids ? JSON.parse(row.admin_ids) : [],
            invitations: row.invitations ? JSON.parse(row.invitations) : [],
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }
}

export default OrganizationRepository;