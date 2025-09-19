module.exports = {
    testEnvironment: 'jsdom',
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.config.js',
        '!src/app.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleFileExtensions: ['js', 'json'],
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    testTimeout: 10000,
    verbose: true
};