export default class Project {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.description = data.description || '';
        this.organizationId = data.organizationId || null;
        this.status = data.status || 'planning';
        this.priority = data.priority || 'medium';
        this.startDate = data.startDate || null;
        this.endDate = data.endDate || null;
        this.budget = data.budget || null;
        this.currency = data.currency || 'USD';
        this.team = data.team || [];
        this.processes = data.processes || [];
        this.tags = data.tags || [];
        this.metadata = data.metadata || {};
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.createdBy = data.createdBy || null;
        this.projectManager = data.projectManager || null;
        this.completedAt = data.completedAt || null;
    }

    static fromJSON(json) {
        return new Project(json);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            organizationId: this.organizationId,
            status: this.status,
            priority: this.priority,
            startDate: this.startDate,
            endDate: this.endDate,
            budget: this.budget,
            currency: this.currency,
            team: this.team,
            processes: this.processes,
            tags: this.tags,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy,
            projectManager: this.projectManager,
            completedAt: this.completedAt
        };
    }

    addTeamMember(member) {
        if (!this.team.find(m => m.userId === member.userId)) {
            this.team.push({
                userId: member.userId,
                role: member.role || 'member',
                joinedAt: new Date().toISOString(),
                permissions: member.permissions || []
            });
            this.updatedAt = new Date().toISOString();
        }
    }

    removeTeamMember(userId) {
        this.team = this.team.filter(member => member.userId !== userId);
        this.updatedAt = new Date().toISOString();
    }

    addProcess(processId) {
        if (!this.processes.includes(processId)) {
            this.processes.push(processId);
            this.updatedAt = new Date().toISOString();
        }
    }

    removeProcess(processId) {
        this.processes = this.processes.filter(id => id !== processId);
        this.updatedAt = new Date().toISOString();
    }

    updateStatus(status) {
        this.status = status;
        this.updatedAt = new Date().toISOString();
        if (status === 'completed') {
            this.completedAt = new Date().toISOString();
        }
    }

    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            this.updatedAt = new Date().toISOString();
        }
    }

    removeTag(tag) {
        this.tags = this.tags.filter(t => t !== tag);
        this.updatedAt = new Date().toISOString();
    }

    getProgress() {
        if (this.processes.length === 0) return 0;
        return {
            total: this.processes.length,
            completed: 0,
            percentage: 0
        };
    }

    isOverdue() {
        if (!this.endDate) return false;
        return new Date(this.endDate) < new Date() && this.status !== 'completed';
    }

    getDuration() {
        if (!this.startDate || !this.endDate) return null;
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }

    getBudgetUtilization() {
        return {
            total: this.budget,
            used: 0,
            remaining: this.budget,
            percentage: 0
        };
    }

    hasPermission(userId, permission) {
        const member = this.team.find(m => m.userId === userId);
        if (!member) return false;

        if (member.role === 'admin' || userId === this.projectManager) {
            return true;
        }

        return member.permissions.includes(permission);
    }

    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Project name is required');
        }

        if (!this.organizationId) {
            errors.push('Organization ID is required');
        }

        const validStatuses = ['planning', 'active', 'paused', 'completed', 'cancelled', 'archived'];
        if (!validStatuses.includes(this.status)) {
            errors.push('Invalid project status');
        }

        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(this.priority)) {
            errors.push('Invalid project priority');
        }

        if (this.startDate && this.endDate) {
            if (new Date(this.startDate) >= new Date(this.endDate)) {
                errors.push('End date must be after start date');
            }
        }

        if (this.budget && this.budget < 0) {
            errors.push('Budget must be a positive number');
        }

        return errors;
    }
}