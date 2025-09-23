import Person from '../../entities/Person.js';

describe('Person Entity', () => {
  describe('Constructor', () => {
    test('should create person with default values', () => {
      const person = new Person();

      expect(person.id).toBeDefined();
      expect(person.id).toMatch(/^P_\d+_/);
      expect(person.first_name).toBe('');
      expect(person.last_name).toBe('');
      expect(person.primary_email_address).toBe('');
      expect(person.created_at).toBeDefined();
      expect(person.updated_at).toBeDefined();
    });

    test('should create person with provided values', () => {
      const data = {
        first_name: 'John',
        last_name: 'Doe',
        primary_email_address: 'john@example.com',
        date_of_birth: '1990-01-01'
      };

      const person = new Person(data);

      expect(person.first_name).toBe('John');
      expect(person.last_name).toBe('Doe');
      expect(person.primary_email_address).toBe('john@example.com');
      expect(person.date_of_birth).toBe('1990-01-01');
    });
  });

  describe('Schema', () => {
    test('should return correct schema definition', () => {
      const schema = Person.schema();

      expect(schema.table).toBe('persons');
      expect(schema.columns).toBeDefined();
      expect(schema.columns.id).toBe('TEXT PRIMARY KEY');
      expect(schema.columns.first_name).toBe('TEXT NOT NULL');
      expect(schema.columns.last_name).toBe('TEXT NOT NULL');
      expect(schema.columns.primary_email_address).toBe('TEXT UNIQUE NOT NULL');
      expect(schema.indexes).toBeDefined();
      expect(schema.indexes.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    test('should validate required fields', () => {
      const person = new Person({});
      const errors = person.validate();

      expect(errors).toContain('First name is required');
      expect(errors).toContain('Last name is required');
      expect(errors).toContain('Email address is required');
    });

    test('should validate email format', () => {
      const person = new Person({
        first_name: 'John',
        last_name: 'Doe',
        primary_email_address: 'invalid-email'
      });
      const errors = person.validate();

      expect(errors).toContain('Invalid email address format');
    });

    test('should validate phone number format', () => {
      const person = new Person({
        first_name: 'John',
        last_name: 'Doe',
        primary_email_address: 'john@example.com',
        primary_phone_number: 'invalid-phone'
      });
      const errors = person.validate();

      expect(errors).toContain('Invalid phone number format');
    });

    test('should validate date of birth', () => {
      const person = new Person({
        first_name: 'John',
        last_name: 'Doe',
        primary_email_address: 'john@example.com',
        date_of_birth: 'invalid-date'
      });
      const errors = person.validate();

      expect(errors).toContain('Invalid date of birth');
    });

    test('should pass validation with valid data', () => {
      const person = new Person({
        first_name: 'John',
        last_name: 'Doe',
        primary_email_address: 'john@example.com',
        primary_phone_number: '+1234567890',
        date_of_birth: '1990-01-01'
      });
      const errors = person.validate();

      expect(errors).toHaveLength(0);
    });
  });

  describe('Helper Methods', () => {
    let person;

    beforeEach(() => {
      person = new Person({
        name_prefix: 'Dr.',
        first_name: 'John',
        middle_name: 'William',
        last_name: 'Doe',
        name_suffix: 'Jr.',
        date_of_birth: '1990-01-01'
      });
    });

    test('should return full name', () => {
      expect(person.getFullName()).toBe('Dr. John William Doe Jr.');
    });

    test('should return display name', () => {
      expect(person.getDisplayName()).toBe('John Doe');
    });

    test('should return initials', () => {
      expect(person.getInitials()).toBe('JD');
    });

    test('should calculate age correctly', () => {
      const age = person.getAge();
      const expectedAge = new Date().getFullYear() - 1990;

      expect(age).toBeGreaterThanOrEqual(expectedAge - 1);
      expect(age).toBeLessThanOrEqual(expectedAge);
    });

    test('should return null age for missing birth date', () => {
      person.date_of_birth = null;
      expect(person.getAge()).toBeNull();
    });
  });

  describe('JSON Serialization', () => {
    test('should serialize to JSON', () => {
      const person = new Person({
        first_name: 'John',
        last_name: 'Doe',
        primary_email_address: 'john@example.com'
      });

      const json = person.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('first_name', 'John');
      expect(json).toHaveProperty('last_name', 'Doe');
      expect(json).toHaveProperty('primary_email_address', 'john@example.com');
      expect(json).toHaveProperty('created_at');
      expect(json).toHaveProperty('updated_at');
    });

    test('should deserialize from JSON', () => {
      const data = {
        id: 'test-id',
        first_name: 'John',
        last_name: 'Doe',
        primary_email_address: 'john@example.com',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };

      const person = Person.fromJSON(data);

      expect(person).toBeInstanceOf(Person);
      expect(person.id).toBe('test-id');
      expect(person.first_name).toBe('John');
      expect(person.last_name).toBe('Doe');
      expect(person.primary_email_address).toBe('john@example.com');
    });
  });

  describe('Update Method', () => {
    test('should update properties except id and created_at', () => {
      const person = new Person({
        first_name: 'John',
        last_name: 'Doe'
      });

      const originalId = person.id;
      const originalCreatedAt = person.created_at;

      person.update({
        id: 'new-id', // Should be ignored
        first_name: 'Jane',
        created_at: 'new-date', // Should be ignored
        primary_email_address: 'jane@example.com'
      });

      expect(person.id).toBe(originalId);
      expect(person.created_at).toBe(originalCreatedAt);
      expect(person.first_name).toBe('Jane');
      expect(person.primary_email_address).toBe('jane@example.com');
      expect(person.updated_at).not.toBe(originalCreatedAt);
    });
  });

  describe('Clone Method', () => {
    test('should create a deep copy of the person', () => {
      const original = new Person({
        first_name: 'John',
        last_name: 'Doe',
        primary_email_address: 'john@example.com'
      });

      const clone = original.clone();

      expect(clone).toBeInstanceOf(Person);
      expect(clone).not.toBe(original);
      expect(clone.id).toBe(original.id);
      expect(clone.first_name).toBe(original.first_name);
      expect(clone.last_name).toBe(original.last_name);
      expect(clone.primary_email_address).toBe(original.primary_email_address);

      // Modifying clone should not affect original
      clone.first_name = 'Jane';
      expect(original.first_name).toBe('John');
    });
  });
});