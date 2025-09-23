export default class ProcedureTemplate {
    constructor({
        id = null,
        organization_id = null,
        name = '',
        description = '',
        version = '1.0.0',
        category = '',
        tags = [],
        is_active = true,
        nodes = [],
        edges = [],
        variables = {},
        settings = {},
        created_by = null,
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id || `PT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.organization_id = organization_id;
        this.name = name;
        this.description = description;
        this.version = version;
        this.category = category;
        this.tags = Array.isArray(tags) ? tags : [];
        this.is_active = is_active;
        this.nodes = Array.isArray(nodes) ? nodes : [];
        this.edges = Array.isArray(edges) ? edges : [];
        this.variables = variables || {};
        this.settings = settings || {};
        this.created_by = created_by;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
    }

    static schema() {
        return {
            table: 'procedure_templates',
            columns: {
                id: 'TEXT PRIMARY KEY',
                organization_id: 'TEXT NOT NULL',
                name: 'TEXT NOT NULL',
                description: 'TEXT',
                version: 'TEXT DEFAULT "1.0.0"',
                category: 'TEXT',
                tags: 'TEXT', // JSON array
                is_active: 'BOOLEAN DEFAULT 1',
                nodes: 'TEXT', // JSON array
                edges: 'TEXT', // JSON array
                variables: 'TEXT', // JSON object
                settings: 'TEXT', // JSON object
                created_by: 'TEXT',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
            },
            indexes: [
                'CREATE INDEX idx_procedure_template_org_id ON procedure_templates(organization_id)',
                'CREATE INDEX idx_procedure_template_name ON procedure_templates(name)',
                'CREATE INDEX idx_procedure_template_category ON procedure_templates(category)',
                'CREATE INDEX idx_procedure_template_active ON procedure_templates(is_active)'
            ],
            foreignKeys: [
                'FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE',
                'FOREIGN KEY (created_by) REFERENCES persons(id) ON DELETE SET NULL'
            ]
        };
    }

    static get NODE_TYPES() {
        return {
            START: 'start',
            END: 'end',
            TASK: 'task',
            DECISION: 'decision',
            PARALLEL: 'parallel',
            MERGE: 'merge',
            DELAY: 'delay',
            NOTIFICATION: 'notification'
        };
    }

    validate() {
        const errors = [];

        if (!this.organization_id?.trim()) {
            errors.push('Organization ID is required');
        }

        if (!this.name?.trim()) {
            errors.push('Procedure name is required');
        }

        if (!this.version?.trim()) {
            errors.push('Version is required');
        }

        // Validate nodes
        if (!Array.isArray(this.nodes) || this.nodes.length === 0) {
            errors.push('At least one node is required');
        } else {
            this.nodes.forEach((node, index) => {
                if (!node.id) {
                    errors.push(`Node ${index} missing ID`);
                }
                if (!node.type || !Object.values(ProcedureTemplate.NODE_TYPES).includes(node.type)) {
                    errors.push(`Node ${index} has invalid type`);
                }
                if (!node.name?.trim()) {
                    errors.push(`Node ${index} missing name`);
                }
            });
        }

        // Validate edges
        if (Array.isArray(this.edges)) {
            this.edges.forEach((edge, index) => {
                if (!edge.from) {
                    errors.push(`Edge ${index} missing 'from' node`);
                }
                if (!edge.to) {
                    errors.push(`Edge ${index} missing 'to' node`);
                }
            });
        }

        // Check for start and end nodes
        const hasStart = this.nodes.some(node => node.type === ProcedureTemplate.NODE_TYPES.START);
        const hasEnd = this.nodes.some(node => node.type === ProcedureTemplate.NODE_TYPES.END);

        if (!hasStart) {
            errors.push('Procedure must have a start node');
        }

        if (!hasEnd) {
            errors.push('Procedure must have an end node');
        }

        return errors;
    }

    getStartNode() {
        return this.nodes.find(node => node.type === ProcedureTemplate.NODE_TYPES.START);
    }

    getEndNodes() {
        return this.nodes.filter(node => node.type === ProcedureTemplate.NODE_TYPES.END);
    }

    getNodeById(nodeId) {
        return this.nodes.find(node => node.id === nodeId);
    }

    getNextNodes(nodeId) {
        return this.edges
            .filter(edge => edge.from === nodeId)
            .map(edge => this.getNodeById(edge.to))
            .filter(Boolean);
    }

    getPreviousNodes(nodeId) {
        return this.edges
            .filter(edge => edge.to === nodeId)
            .map(edge => this.getNodeById(edge.from))
            .filter(Boolean);
    }

    addNode(node) {
        if (!node.id) {
            node.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        this.nodes.push({
            id: node.id,
            type: node.type || ProcedureTemplate.NODE_TYPES.TASK,
            name: node.name || '',
            description: node.description || '',
            role: node.role || '',
            guards: node.guards || [],
            actions: node.actions || [],
            settings: node.settings || {},
            position: node.position || { x: 0, y: 0 }
        });

        this.updated_at = new Date().toISOString();
        return node.id;
    }

    updateNode(nodeId, updates) {
        const nodeIndex = this.nodes.findIndex(node => node.id === nodeId);
        if (nodeIndex !== -1) {
            this.nodes[nodeIndex] = { ...this.nodes[nodeIndex], ...updates };
            this.updated_at = new Date().toISOString();
            return true;
        }
        return false;
    }

    removeNode(nodeId) {
        const nodeIndex = this.nodes.findIndex(node => node.id === nodeId);
        if (nodeIndex !== -1) {
            this.nodes.splice(nodeIndex, 1);
            // Remove edges connected to this node
            this.edges = this.edges.filter(edge =>
                edge.from !== nodeId && edge.to !== nodeId
            );
            this.updated_at = new Date().toISOString();
            return true;
        }
        return false;
    }

    addEdge(from, to, condition = null) {
        const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.edges.push({
            id: edgeId,
            from,
            to,
            condition,
            settings: {}
        });

        this.updated_at = new Date().toISOString();
        return edgeId;
    }

    removeEdge(from, to) {
        const edgeIndex = this.edges.findIndex(edge =>
            edge.from === from && edge.to === to
        );

        if (edgeIndex !== -1) {
            this.edges.splice(edgeIndex, 1);
            this.updated_at = new Date().toISOString();
            return true;
        }
        return false;
    }

    validateFlow() {
        const errors = [];

        // Check if all nodes are reachable from start
        const startNode = this.getStartNode();
        if (!startNode) {
            errors.push('No start node found');
            return errors;
        }

        const visited = new Set();
        const queue = [startNode.id];

        while (queue.length > 0) {
            const nodeId = queue.shift();
            if (visited.has(nodeId)) continue;

            visited.add(nodeId);
            const nextNodes = this.getNextNodes(nodeId);
            nextNodes.forEach(node => {
                if (!visited.has(node.id)) {
                    queue.push(node.id);
                }
            });
        }

        // Check for unreachable nodes
        const unreachableNodes = this.nodes.filter(node =>
            !visited.has(node.id) && node.type !== ProcedureTemplate.NODE_TYPES.START
        );

        if (unreachableNodes.length > 0) {
            errors.push(`Unreachable nodes: ${unreachableNodes.map(n => n.name).join(', ')}`);
        }

        // Check for cycles (basic check)
        if (this.hasCycles()) {
            errors.push('Procedure contains cycles');
        }

        return errors;
    }

    hasCycles() {
        const visited = new Set();
        const recursionStack = new Set();

        const hasCycleDFS = (nodeId) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);

            const nextNodes = this.getNextNodes(nodeId);
            for (const nextNode of nextNodes) {
                if (!visited.has(nextNode.id)) {
                    if (hasCycleDFS(nextNode.id)) {
                        return true;
                    }
                } else if (recursionStack.has(nextNode.id)) {
                    return true;
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        for (const node of this.nodes) {
            if (!visited.has(node.id)) {
                if (hasCycleDFS(node.id)) {
                    return true;
                }
            }
        }

        return false;
    }

    toJSON() {
        return {
            id: this.id,
            organization_id: this.organization_id,
            name: this.name,
            description: this.description,
            version: this.version,
            category: this.category,
            tags: this.tags,
            is_active: this.is_active,
            nodes: this.nodes,
            edges: this.edges,
            variables: this.variables,
            settings: this.settings,
            created_by: this.created_by,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static fromJSON(obj) {
        const template = new ProcedureTemplate(obj);

        // Parse JSON strings if they exist
        ['tags', 'nodes', 'edges'].forEach(field => {
            if (typeof obj[field] === 'string') {
                try {
                    template[field] = JSON.parse(obj[field]);
                } catch (e) {
                    template[field] = [];
                }
            }
        });

        ['variables', 'settings'].forEach(field => {
            if (typeof obj[field] === 'string') {
                try {
                    template[field] = JSON.parse(obj[field]);
                } catch (e) {
                    template[field] = {};
                }
            }
        });

        return template;
    }

    update(data) {
        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'created_at' && this.hasOwnProperty(key)) {
                this[key] = data[key];
            }
        });
        this.updated_at = new Date().toISOString();
        return this;
    }

    clone() {
        const cloned = ProcedureTemplate.fromJSON(this.toJSON());
        cloned.id = `PT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        cloned.created_at = new Date().toISOString();
        cloned.updated_at = new Date().toISOString();
        return cloned;
    }
}