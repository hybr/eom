export default class Person {
    constructor({
        id = null,
        name_prefix = '',
        first_name = '',
        middle_name = '',
        last_name = '',
        name_suffix = '',
        date_of_birth = null,
        primary_phone_number = '',
        primary_email_address = '',
        avatar_url = '',
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id || `P_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name_prefix = name_prefix;
        this.first_name = first_name;
        this.middle_name = middle_name;
        this.last_name = last_name;
        this.name_suffix = name_suffix;
        this.date_of_birth = date_of_birth;
        this.primary_phone_number = primary_phone_number;
        this.primary_email_address = primary_email_address;
        this.avatar_url = avatar_url;
        this.created_at = created_at || new Date().toISOString();
        this.updated_at = updated_at || new Date().toISOString();
    }

    static schema() {
        return {
            table: 'persons',
            columns: {
                id: 'TEXT PRIMARY KEY',
                name_prefix: 'TEXT',
                first_name: 'TEXT NOT NULL',
                middle_name: 'TEXT',
                last_name: 'TEXT NOT NULL',
                name_suffix: 'TEXT',
                date_of_birth: 'DATE',
                primary_phone_number: 'TEXT',
                primary_email_address: 'TEXT UNIQUE NOT NULL',
                avatar_url: 'TEXT',
                created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
                updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
            },
            indexes: [
                'CREATE INDEX idx_person_email ON persons(primary_email_address)',
                'CREATE INDEX idx_person_name ON persons(last_name, first_name)'
            ]
        };
    }

    validate() {
        const errors = [];

        if (!this.first_name?.trim()) {
            errors.push('First name is required');
        }

        if (!this.last_name?.trim()) {
            errors.push('Last name is required');
        }

        if (!this.primary_email_address?.trim()) {
            errors.push('Email address is required');
        } else if (!this.isValidEmail(this.primary_email_address)) {
            errors.push('Invalid email address format');
        }

        if (this.primary_phone_number && !this.isValidPhone(this.primary_phone_number)) {
            errors.push('Invalid phone number format');
        }

        if (this.date_of_birth && !this.isValidDate(this.date_of_birth)) {
            errors.push('Invalid date of birth');
        }

        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    getFullName() {
        const parts = [
            this.name_prefix,
            this.first_name,
            this.middle_name,
            this.last_name,
            this.name_suffix
        ].filter(part => part?.trim());

        return parts.join(' ');
    }

    getDisplayName() {
        return `${this.first_name} ${this.last_name}`;
    }

    getInitials() {
        const first = this.first_name?.charAt(0) || '';
        const last = this.last_name?.charAt(0) || '';
        return (first + last).toUpperCase();
    }

    getAge() {
        if (!this.date_of_birth) return null;

        const today = new Date();
        const birthDate = new Date(this.date_of_birth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    }

    toJSON() {
        return {
            id: this.id,
            name_prefix: this.name_prefix,
            first_name: this.first_name,
            middle_name: this.middle_name,
            last_name: this.last_name,
            name_suffix: this.name_suffix,
            date_of_birth: this.date_of_birth,
            primary_phone_number: this.primary_phone_number,
            primary_email_address: this.primary_email_address,
            avatar_url: this.avatar_url,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    static fromJSON(obj) {
        return new Person(obj);
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
        return Person.fromJSON(this.toJSON());
    }
}