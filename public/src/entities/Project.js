class Project {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.name = data.name || '';
        this.description = data.description || '';
        this.processId = data.processId || null;
        this.organizationId = data.organizationId || null;
        this.ownerId = data.ownerId || null;
        this.assignedUsers = data.assignedUsers || [];
        this.status = data.status || 'pending';
        this.priority = data.priority || 'medium';
        this.variables = data.variables || {};
        this.currentNodeId = data.currentNodeId || null;
        this.completedNodes = data.completedNodes || [];
        this.tasks = data.tasks || [];
        this.executionHistory = data.executionHistory || [];
        this.metadata = data.metadata || {};
        this.startedAt = data.startedAt || null;
        this.completedAt = data.completedAt || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    generateId() {
        return 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    start() {
        if (this.status === 'pending') {
            this.status = 'running';
            this.startedAt = new Date().toISOString();
            this.updatedAt = new Date().toISOString();
            this.addExecutionEvent('project_started', { timestamp: this.startedAt });
        }
    }

    pause() {
        if (this.status === 'running') {
            this.status = 'paused';
            this.updatedAt = new Date().toISOString();
            this.addExecutionEvent('project_paused', { timestamp: this.updatedAt });
        }
    }

    resume() {
        if (this.status === 'paused') {
            this.status = 'running';
            this.updatedAt = new Date().toISOString();
            this.addExecutionEvent('project_resumed', { timestamp: this.updatedAt });
        }
    }

    complete() {
        this.status = 'completed';
        this.completedAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        this.addExecutionEvent('project_completed', { timestamp: this.completedAt });
    }

    fail(reason = null) {
        this.status = 'failed';
        this.updatedAt = new Date().toISOString();
        this.addExecutionEvent('project_failed', {
            timestamp: this.updatedAt,
            reason
        });
    }

    setCurrentNode(nodeId) {
        this.currentNodeId = nodeId;
        this.updatedAt = new Date().toISOString();
        this.addExecutionEvent('node_entered', {
            nodeId,
            timestamp: this.updatedAt
        });
    }

    completeNode(nodeId, result = null) {
        if (!this.completedNodes.includes(nodeId)) {
            this.completedNodes.push(nodeId);
        }

        if (this.currentNodeId === nodeId) {
            this.currentNodeId = null;
        }

        this.updatedAt = new Date().toISOString();
        this.addExecutionEvent('node_completed', {
            nodeId,
            result,
            timestamp: this.updatedAt
        });
    }

    addTask(task) {
        const taskData = {
            id: task.id || this.generateTaskId(),
            nodeId: task.nodeId,
            name: task.name || '',
            description: task.description || '',
            assignedTo: task.assignedTo || null,
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            dueDate: task.dueDate || null,
            data: task.data || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.tasks.push(taskData);
        this.updatedAt = new Date().toISOString();
        return taskData.id;
    }

    updateTask(taskId, updates) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            Object.assign(task, updates);
            task.updatedAt = new Date().toISOString();
            this.updatedAt = new Date().toISOString();

            this.addExecutionEvent('task_updated', {
                taskId,
                updates,
                timestamp: task.updatedAt
            });
        }
    }

    completeTask(taskId, result = null) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
            task.updatedAt = task.completedAt;
            if (result) {
                task.result = result;
            }
            this.updatedAt = new Date().toISOString();

            this.addExecutionEvent('task_completed', {
                taskId,
                result,
                timestamp: task.completedAt
            });
        }
    }

    addUser(userId, role = 'member') {
        const existingUser = this.assignedUsers.find(u => u.userId === userId);
        if (!existingUser) {
            this.assignedUsers.push({
                userId,
                role,
                assignedAt: new Date().toISOString()
            });
            this.updatedAt = new Date().toISOString();
        }
    }

    removeUser(userId) {
        this.assignedUsers = this.assignedUsers.filter(u => u.userId !== userId);
        this.updatedAt = new Date().toISOString();
    }

    updateUserRole(userId, role) {
        const user = this.assignedUsers.find(u => u.userId === userId);
        if (user) {
            user.role = role;
            this.updatedAt = new Date().toISOString();
        }
    }

    setVariable(name, value) {
        this.variables[name] = {
            value,
            updatedAt: new Date().toISOString()
        };
        this.updatedAt = new Date().toISOString();
        this.addExecutionEvent('variable_updated', {
            name,
            value,
            timestamp: this.variables[name].updatedAt
        });
    }

    getVariable(name, defaultValue = null) {
        return this.variables[name] ? this.variables[name].value : defaultValue;
    }

    addExecutionEvent(type, data = {}) {
        this.executionHistory.push({
            id: this.generateEventId(),
            type,
            data,
            timestamp: new Date().toISOString()
        });
    }

    getTasksByStatus(status) {
        return this.tasks.filter(task => task.status === status);
    }

    getTasksByNode(nodeId) {
        return this.tasks.filter(task => task.nodeId === nodeId);
    }

    getTasksByUser(userId) {
        return this.tasks.filter(task => task.assignedTo === userId);
    }

    getProgress() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.status === 'completed').length;

        return {
            totalTasks,
            completedTasks,
            percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            completedNodes: this.completedNodes.length,
            currentNode: this.currentNodeId
        };
    }

    getDuration() {
        if (!this.startedAt) return 0;

        const endTime = this.completedAt || new Date().toISOString();
        return new Date(endTime) - new Date(this.startedAt);
    }

    generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateEventId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            processId: this.processId,
            organizationId: this.organizationId,
            ownerId: this.ownerId,
            assignedUsers: JSON.parse(JSON.stringify(this.assignedUsers)),
            status: this.status,
            priority: this.priority,
            variables: JSON.parse(JSON.stringify(this.variables)),
            currentNodeId: this.currentNodeId,
            completedNodes: [...this.completedNodes],
            tasks: JSON.parse(JSON.stringify(this.tasks)),
            executionHistory: JSON.parse(JSON.stringify(this.executionHistory)),
            metadata: JSON.parse(JSON.stringify(this.metadata)),
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromJSON(data) {
        return new Project(data);
    }
}

export default Project;