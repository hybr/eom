export default class IndustryName {
    constructor({
        id = null,
        code = '',
        name = '',
        category = '',
        description = '',
        is_active = true,
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id || `IND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.code = code.toUpperCase();
        this.name = name;
        this.category = category;
        this.description = description;
        this.is_active = is_active;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
    }

    static schema() {
        return {
            table: 'industry_name',
            columns: {
                id: 'TEXT PRIMARY KEY',
                code: 'TEXT UNIQUE NOT NULL',
                name: 'TEXT NOT NULL',
                category: 'TEXT',
                description: 'TEXT',
                is_active: 'BOOLEAN DEFAULT 1',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
            },
            indexes: [
                'CREATE INDEX idx_industry_code ON industry_name(code)',
                'CREATE INDEX idx_industry_name ON industry_name(name)',
                'CREATE INDEX idx_industry_category ON industry_name(category)',
                'CREATE INDEX idx_industry_active ON industry_name(is_active)'
            ]
        };
    }

    validate() {
        const errors = [];

        if (!this.code?.trim()) {
            errors.push('Industry code is required');
        } else if (!this.isValidCode(this.code)) {
            errors.push('Code must contain only uppercase letters, numbers, and underscores');
        }

        if (!this.name?.trim()) {
            errors.push('Industry name is required');
        }

        if (this.code && this.code.length > 20) {
            errors.push('Code cannot exceed 20 characters');
        }

        if (this.name && this.name.length > 100) {
            errors.push('Name cannot exceed 100 characters');
        }

        if (this.category && this.category.length > 50) {
            errors.push('Category cannot exceed 50 characters');
        }

        return errors;
    }

    isValidCode(code) {
        const codeRegex = /^[A-Z0-9_]+$/;
        return codeRegex.test(code);
    }

    getDisplayName() {
        if (this.category) {
            return `${this.name} (${this.category})`;
        }
        return this.name;
    }

    static getByCategory(industries, category) {
        return industries.filter(industry =>
            industry.category === category && industry.is_active
        );
    }

    static findByCode(industries, code) {
        const upperCode = code.toUpperCase();
        return industries.find(industry => industry.code === upperCode);
    }

    static searchByName(industries, searchTerm) {
        const term = searchTerm.toLowerCase();
        return industries.filter(industry =>
            industry.name.toLowerCase().includes(term) ||
            industry.code.toLowerCase().includes(term) ||
            (industry.category && industry.category.toLowerCase().includes(term)) ||
            (industry.description && industry.description.toLowerCase().includes(term))
        );
    }

    static getCategories(industries) {
        const categories = new Set();
        industries.forEach(industry => {
            if (industry.category && industry.is_active) {
                categories.add(industry.category);
            }
        });
        return Array.from(categories).sort();
    }

    static groupByCategory(industries) {
        const grouped = {};
        industries.forEach(industry => {
            const category = industry.category || 'Other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(industry);
        });
        return grouped;
    }

    static getCommonIndustries() {
        return [
            'TECHNOLOGY', 'FINANCE', 'HEALTHCARE', 'MANUFACTURING', 'RETAIL',
            'EDUCATION', 'REAL_ESTATE', 'HOSPITALITY', 'CONSTRUCTION', 'AGRICULTURE',
            'ENERGY', 'TRANSPORTATION', 'MEDIA', 'CONSULTING', 'NON_PROFIT'
        ];
    }

    toJSON() {
        return {
            id: this.id,
            code: this.code,
            name: this.name,
            category: this.category,
            description: this.description,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static fromJSON(obj) {
        return new IndustryName(obj);
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
        return IndustryName.fromJSON(this.toJSON());
    }
}