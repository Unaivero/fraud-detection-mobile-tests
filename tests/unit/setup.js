/**
 * Unit test setup and configuration
 * This file runs before all unit tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests
process.env.CONSOLE_LOGGING = 'false';

// Global test configuration
const chai = require('chai');
const sinon = require('sinon');

// Configure Chai
chai.config.includeStack = true;
chai.config.showDiff = true;

// Global test hooks
beforeEach(function() {
  // Set up common test environment before each test
  this.timeout(5000);
});

afterEach(function() {
  // Clean up after each test
  sinon.restore();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Global error handler for tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});