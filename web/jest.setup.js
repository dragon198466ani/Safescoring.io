// Jest setup file
// Add any global test configuration here

// Set test environment variables
process.env.TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Increase timeout for slower tests
jest.setTimeout(10000);

// Global beforeAll/afterAll if needed
beforeAll(() => {
  console.log('Starting test suite...');
});

afterAll(() => {
  console.log('Test suite completed.');
});
