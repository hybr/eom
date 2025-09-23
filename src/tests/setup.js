// Jest setup file for testing environment

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock WebSocket for testing
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
}));

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
  },
});

// Mock URL for testing
global.URL = jest.fn((url, base) => {
  const parsed = new URL(url, base);
  return {
    ...parsed,
    searchParams: new URLSearchParams(parsed.search),
  };
});

// Suppress console errors in tests unless needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test helpers
global.testHelpers = {
  createMockPerson: (overrides = {}) => ({
    id: 'test-person-id',
    first_name: 'John',
    last_name: 'Doe',
    primary_email_address: 'john@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createMockOrganization: (overrides = {}) => ({
    id: 'test-org-id',
    name: 'Test Organization',
    display_name: 'Test Organization',
    created_by: 'test-person-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createMockMember: (overrides = {}) => ({
    id: 'test-member-id',
    organization_id: 'test-org-id',
    person_id: 'test-person-id',
    roles: ['worker'],
    permissions: [],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};