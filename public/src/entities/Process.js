class Process {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.name = data.name || '';
        this.description = data.description || '';
        this.version = data.version || '1.0.0';
        this.organizationId = data.organizationId || null;
        this.createdBy = data.createdBy || null;
        this.isTemplate = data.isTemplate !== undefined ? data.isTemplate : true;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.nodes = data.nodes || [];
        this.edges = data.edges || [];
        this.variables = data.variables || {};
        this.triggers = data.triggers || [];
        this.settings = data.settings || {};
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    generateId() {
        return 'process_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    addNode(node) {
        const nodeData = {
            id: node.id || this.generateNodeId(),
            type: node.type || 'task',
            name: node.name || '',
            description: node.description || '',
            position: node.position || { x: 0, y: 0 },
            config: node.config || {},
            conditions: node.conditions || [],
            actions: node.actions || [],
            createdAt: new Date().toISOString()
        };

        this.nodes.push(nodeData);
        this.updatedAt = new Date().toISOString();
        return nodeData.id;
    }

    removeNode(nodeId) {
        this.nodes = this.nodes.filter(node => node.id !== nodeId);
        this.edges = this.edges.filter(edge =>
            edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId
        );
        this.updatedAt = new Date().toISOString();
    }

    updateNode(nodeId, updates) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            Object.assign(node, updates);
            node.updatedAt = new Date().toISOString();
            this.updatedAt = new Date().toISOString();
        }
    }

    addEdge(edge) {
        const edgeData = {
            id: edge.id || this.generateEdgeId(),
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            condition: edge.condition || null,
            label: edge.label || '',
            config: edge.config || {},
            createdAt: new Date().toISOString()
        };

        if (this.isValidEdge(edgeData)) {
            this.edges.push(edgeData);
            this.updatedAt = new Date().toISOString();
            return edgeData.id;
        }
        throw new Error('Invalid edge: creates cycle or connects non-existent nodes');
    }

    removeEdge(edgeId) {
        this.edges = this.edges.filter(edge => edge.id !== edgeId);
        this.updatedAt = new Date().toISOString();
    }

    isValidEdge(edge) {
        const sourceExists = this.nodes.some(n => n.id === edge.sourceNodeId);
        const targetExists = this.nodes.some(n => n.id === edge.targetNodeId);

        if (!sourceExists || !targetExists) {
            return false;
        }

        return !this.wouldCreateCycle(edge.sourceNodeId, edge.targetNodeId);
    }

    wouldCreateCycle(sourceId, targetId) {
        const visited = new Set();
        const stack = [targetId];

        while (stack.length > 0) {
            const currentId = stack.pop();
            if (currentId === sourceId) {
                return true;
            }

            if (visited.has(currentId)) {
                continue;
            }

            visited.add(currentId);
            const outgoingEdges = this.edges.filter(e => e.sourceNodeId === currentId);
            outgoingEdges.forEach(edge => stack.push(edge.targetNodeId));
        }

        return false;
    }

    getStartNodes() {
        const nodeIds = this.nodes.map(n => n.id);
        const targetIds = this.edges.map(e => e.targetNodeId);
        return this.nodes.filter(n => !targetIds.includes(n.id));
    }

    getEndNodes() {
        const nodeIds = this.nodes.map(n => n.id);
        const sourceIds = this.edges.map(e => e.sourceNodeId);
        return this.nodes.filter(n => !sourceIds.includes(n.id));
    }

    getNextNodes(nodeId) {
        const outgoingEdges = this.edges.filter(e => e.sourceNodeId === nodeId);
        return outgoingEdges.map(edge => {
            const node = this.nodes.find(n => n.id === edge.targetNodeId);
            return { node, edge };
        });
    }

    getPreviousNodes(nodeId) {
        const incomingEdges = this.edges.filter(e => e.targetNodeId === nodeId);
        return incomingEdges.map(edge => {
            const node = this.nodes.find(n => n.id === edge.sourceNodeId);
            return { node, edge };
        });
    }

    addVariable(name, type, defaultValue = null, description = '') {
        this.variables[name] = {
            type,
            defaultValue,
            description,
            createdAt: new Date().toISOString()
        };
        this.updatedAt = new Date().toISOString();
    }

    removeVariable(name) {
        delete this.variables[name];
        this.updatedAt = new Date().toISOString();
    }

    addTrigger(trigger) {
        const triggerData = {
            id: trigger.id || this.generateTriggerId(),
            type: trigger.type,
            condition: trigger.condition,
            action: trigger.action,
            isActive: trigger.isActive !== undefined ? trigger.isActive : true,
            createdAt: new Date().toISOString()
        };

        this.triggers.push(triggerData);
        this.updatedAt = new Date().toISOString();
        return triggerData.id;
    }

    removeTrigger(triggerId) {
        this.triggers = this.triggers.filter(t => t.id !== triggerId);
        this.updatedAt = new Date().toISOString();
    }

    clone(newName = null) {
        const cloneData = JSON.parse(JSON.stringify(this.toJSON()));
        cloneData.id = this.generateId();
        cloneData.name = newName || `${this.name} (Copy)`;
        cloneData.createdAt = new Date().toISOString();
        cloneData.updatedAt = new Date().toISOString();

        cloneData.nodes = cloneData.nodes.map(node => ({
            ...node,
            id: this.generateNodeId(),
            createdAt: new Date().toISOString()
        }));

        const nodeIdMap = {};
        this.nodes.forEach((originalNode, index) => {
            nodeIdMap[originalNode.id] = cloneData.nodes[index].id;
        });

        cloneData.edges = cloneData.edges.map(edge => ({
            ...edge,
            id: this.generateEdgeId(),
            sourceNodeId: nodeIdMap[edge.sourceNodeId],
            targetNodeId: nodeIdMap[edge.targetNodeId],
            createdAt: new Date().toISOString()
        }));

        return new Process(cloneData);
    }

    generateNodeId() {
        return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateEdgeId() {
        return 'edge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateTriggerId() {
        return 'trigger_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    validate() {
        const errors = [];

        if (!this.name.trim()) {
            errors.push('Process name is required');
        }

        if (this.nodes.length === 0) {
            errors.push('Process must have at least one node');
        }

        const startNodes = this.getStartNodes();
        if (startNodes.length === 0) {
            errors.push('Process must have at least one start node');
        }

        const endNodes = this.getEndNodes();
        if (endNodes.length === 0) {
            errors.push('Process must have at least one end node');
        }

        this.edges.forEach(edge => {
            if (!this.isValidEdge(edge)) {
                errors.push(`Invalid edge: ${edge.id}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            version: this.version,
            organizationId: this.organizationId,
            createdBy: this.createdBy,
            isTemplate: this.isTemplate,
            isActive: this.isActive,
            nodes: JSON.parse(JSON.stringify(this.nodes)),
            edges: JSON.parse(JSON.stringify(this.edges)),
            variables: JSON.parse(JSON.stringify(this.variables)),
            triggers: JSON.parse(JSON.stringify(this.triggers)),
            settings: JSON.parse(JSON.stringify(this.settings)),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromJSON(data) {
        return new Process(data);
    }
}

export default Process;