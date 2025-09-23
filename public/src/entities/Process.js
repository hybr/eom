export default class Process {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.description = data.description || '';
        this.organizationId = data.organizationId || null;
        this.projectId = data.projectId || null;
        this.templateId = data.templateId || null;
        this.status = data.status || 'draft';
        this.priority = data.priority || 'medium';
        this.assignedTo = data.assignedTo || [];
        this.steps = data.steps || [];
        this.metadata = data.metadata || {};
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.createdBy = data.createdBy || null;
        this.dueDate = data.dueDate || null;
        this.completedAt = data.completedAt || null;
    }

    static fromJSON(json) {
        return new Process(json);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            organizationId: this.organizationId,
            projectId: this.projectId,
            templateId: this.templateId,
            status: this.status,
            priority: this.priority,
            assignedTo: this.assignedTo,
            steps: this.steps,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy,
            dueDate: this.dueDate,
            completedAt: this.completedAt
        };
    }

    addStep(step) {
        this.steps.push({
            id: crypto.randomUUID(),
            name: step.name,
            description: step.description || '',
            status: 'pending',
            assignedTo: step.assignedTo || null,
            dueDate: step.dueDate || null,
            completedAt: null,
            order: this.steps.length,
            ...step
        });
        this.updatedAt = new Date().toISOString();
    }

    completeStep(stepId) {
        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            step.status = 'completed';
            step.completedAt = new Date().toISOString();
            this.updatedAt = new Date().toISOString();
        }
    }

    updateStatus(status) {
        this.status = status;
        this.updatedAt = new Date().toISOString();
        if (status === 'completed') {
            this.completedAt = new Date().toISOString();
        }
    }

    getCompletionPercentage() {
        if (this.steps.length === 0) return 0;
        const completedSteps = this.steps.filter(step => step.status === 'completed').length;
        return Math.round((completedSteps / this.steps.length) * 100);
    }

    isOverdue() {
        if (!this.dueDate) return false;
        return new Date(this.dueDate) < new Date() && this.status !== 'completed';
    }

    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Process name is required');
        }

        if (!this.organizationId) {
            errors.push('Organization ID is required');
        }

        const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];
        if (!validStatuses.includes(this.status)) {
            errors.push('Invalid process status');
        }

        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(this.priority)) {
            errors.push('Invalid process priority');
        }

        return errors;
    }
}