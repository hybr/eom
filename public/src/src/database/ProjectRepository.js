import { getDatabase } from './Database.js';
import Project from '../entities/Project.js';

class ProjectRepository {
    constructor() {
        this.db = getDatabase();
        this.table = 'projects';
    }

    async create(projectData) {
        const project = new Project(projectData);
        const dbData = this.serializeProject(project);

        try {
            this.db.insert(this.table, dbData);
            return project;
        } catch (error) {
            throw error;
        }
    }

    async findById(id) {
        const row = this.db.findOne(this.table, { id });
        return row ? this.deserializeProject(row) : null;
    }

    async findByName(name, organizationId = null) {
        const where = { name };
        if (organizationId) {
            where.organization_id = organizationId;
        }
        const row = this.db.findOne(this.table, where);
        return row ? this.deserializeProject(row) : null;
    }

    async update(id, project) {
        const dbData = this.serializeProject(project);
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
        return rows.map(row => this.deserializeProject(row));
    }

    async findByOwner(ownerId, options = {}) {
        const rows = this.db.findMany(this.table, { owner_id: ownerId }, options);
        return rows.map(row => this.deserializeProject(row));
    }

    async findByProcess(processId, options = {}) {
        const rows = this.db.findMany(this.table, { process_id: processId }, options);
        return rows.map(row => this.deserializeProject(row));
    }

    async findByStatus(status, organizationId = null, options = {}) {
        const where = { status };
        if (organizationId) {
            where.organization_id = organizationId;
        }
        const rows = this.db.findMany(this.table, where, options);
        return rows.map(row => this.deserializeProject(row));
    }

    async findByAssignedUser(userId, options = {}) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.table}
            WHERE assigned_users LIKE ?
            ORDER BY ${options.orderBy || 'updated_at DESC'}
            ${options.limit ? `LIMIT ${options.limit}` : ''}
        `);
        const likePattern = `%"userId":"${userId}"%`;
        const rows = stmt.all(likePattern);
        return rows.map(row => this.deserializeProject(row));
    }

    async findAll(options = {}) {
        const rows = this.db.findMany(this.table, {}, options);
        return rows.map(row => this.deserializeProject(row));
    }

    async count(where = {}) {
        return this.db.count(this.table, where);
    }

    async getStatusStats(organizationId = null) {
        let sql = `
            SELECT status, COUNT(*) as count
            FROM ${this.table}
        `;
        const params = [];

        if (organizationId) {
            sql += ' WHERE organization_id = ?';
            params.push(organizationId);
        }

        sql += ' GROUP BY status';

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    async getPriorityStats(organizationId = null) {
        let sql = `
            SELECT priority, COUNT(*) as count
            FROM ${this.table}
        `;
        const params = [];

        if (organizationId) {
            sql += ' WHERE organization_id = ?';
            params.push(organizationId);
        }

        sql += ' GROUP BY priority';

        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
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
        return rows.map(row => this.deserializeProject(row));
    }

    serializeProject(project) {
        return {
            id: project.id,
            name: project.name,
            description: project.description,
            process_id: project.processId,
            organization_id: project.organizationId,
            owner_id: project.ownerId,
            assigned_users: JSON.stringify(project.assignedUsers),
            status: project.status,
            priority: project.priority,
            variables: JSON.stringify(project.variables),
            current_node_id: project.currentNodeId,
            completed_nodes: JSON.stringify(project.completedNodes),
            tasks: JSON.stringify(project.tasks),
            execution_history: JSON.stringify(project.executionHistory),
            metadata: JSON.stringify(project.metadata),
            started_at: project.startedAt,
            completed_at: project.completedAt,
            created_at: project.createdAt,
            updated_at: project.updatedAt
        };
    }

    deserializeProject(row) {
        return new Project({
            id: row.id,
            name: row.name,
            description: row.description,
            processId: row.process_id,
            organizationId: row.organization_id,
            ownerId: row.owner_id,
            assignedUsers: row.assigned_users ? JSON.parse(row.assigned_users) : [],
            status: row.status,
            priority: row.priority,
            variables: row.variables ? JSON.parse(row.variables) : {},
            currentNodeId: row.current_node_id,
            completedNodes: row.completed_nodes ? JSON.parse(row.completed_nodes) : [],
            tasks: row.tasks ? JSON.parse(row.tasks) : [],
            executionHistory: row.execution_history ? JSON.parse(row.execution_history) : [],
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            startedAt: row.started_at,
            completedAt: row.completed_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }
}

export default ProjectRepository;