import { getDatabase } from './Database.js';
import Process from '../entities/Process.js';

class ProcessRepository {
    constructor() {
        this.db = getDatabase();
        this.table = 'processes';
    }

    async create(processData) {
        const process = new Process(processData);
        const dbData = this.serializeProcess(process);

        try {
            this.db.insert(this.table, dbData);
            return process;
        } catch (error) {
            throw error;
        }
    }

    async findById(id) {
        const row = this.db.findOne(this.table, { id });
        return row ? this.deserializeProcess(row) : null;
    }

    async findByName(name, organizationId = null) {
        const where = { name };
        if (organizationId) {
            where.organization_id = organizationId;
        }
        const row = this.db.findOne(this.table, where);
        return row ? this.deserializeProcess(row) : null;
    }

    async update(id, process) {
        const dbData = this.serializeProcess(process);
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

    async findByOrganization(organizationId, options = {}) {
        const rows = this.db.findMany(this.table, { organization_id: organizationId }, options);
        return rows.map(row => this.deserializeProcess(row));
    }

    async findByCreator(createdBy, options = {}) {
        const rows = this.db.findMany(this.table, { created_by: createdBy }, options);
        return rows.map(row => this.deserializeProcess(row));
    }

    async findTemplates(organizationId = null, options = {}) {
        const where = { is_template: 1, is_active: 1 };
        if (organizationId) {
            where.organization_id = organizationId;
        }
        const rows = this.db.findMany(this.table, where, options);
        return rows.map(row => this.deserializeProcess(row));
    }

    async findActive(organizationId = null, options = {}) {
        const where = { is_active: 1 };
        if (organizationId) {
            where.organization_id = organizationId;
        }
        const rows = this.db.findMany(this.table, where, options);
        return rows.map(row => this.deserializeProcess(row));
    }

    async findAll(options = {}) {
        const rows = this.db.findMany(this.table, {}, options);
        return rows.map(row => this.deserializeProcess(row));
    }

    async count(where = {}) {
        return this.db.count(this.table, where);
    }

    async searchByName(searchTerm, organizationId = null, options = {}) {
        let sql = `SELECT * FROM ${this.table} WHERE name LIKE ?`;
        const params = [`%${searchTerm}%`];

        if (organizationId) {
            sql += ' AND organization_id = ?';
            params.push(organizationId);
        }

        if (options.orderBy) {
            sql += ` ORDER BY ${options.orderBy}`;
        }

        if (options.limit) {
            sql += ` LIMIT ${options.limit}`;
        }

        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map(row => this.deserializeProcess(row));
    }

    serializeProcess(process) {
        return {
            id: process.id,
            name: process.name,
            description: process.description,
            version: process.version,
            organization_id: process.organizationId,
            created_by: process.createdBy,
            is_template: process.isTemplate ? 1 : 0,
            is_active: process.isActive ? 1 : 0,
            nodes: JSON.stringify(process.nodes),
            edges: JSON.stringify(process.edges),
            variables: JSON.stringify(process.variables),
            triggers: JSON.stringify(process.triggers),
            settings: JSON.stringify(process.settings),
            created_at: process.createdAt,
            updated_at: process.updatedAt
        };
    }

    deserializeProcess(row) {
        return new Process({
            id: row.id,
            name: row.name,
            description: row.description,
            version: row.version,
            organizationId: row.organization_id,
            createdBy: row.created_by,
            isTemplate: row.is_template === 1,
            isActive: row.is_active === 1,
            nodes: row.nodes ? JSON.parse(row.nodes) : [],
            edges: row.edges ? JSON.parse(row.edges) : [],
            variables: row.variables ? JSON.parse(row.variables) : {},
            triggers: row.triggers ? JSON.parse(row.triggers) : [],
            settings: row.settings ? JSON.parse(row.settings) : {},
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }
}

export default ProcessRepository;