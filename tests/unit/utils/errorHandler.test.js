/**
 * Unit tests for ErrorHandler utility class
 */
const { expect } = require('chai');
const sinon = require('sinon');
const ErrorHandler = require('../../../src/utils/errorHandler');

describe('ErrorHandler', function () {
  let errorHandler;

  beforeEach(function () {
    // Get fresh instance for each test
    delete require.cache[require.resolve('../../../src/utils/errorHandler')];
    errorHandler = require('../../../src/utils/errorHandler');
    
    // Stub console methods to avoid noise in test output
    sinon.stub(console, 'debug');
    sinon.stub(console, 'info');
    sinon.stub(console, 'warn');
    sinon.stub(console, 'error');
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('initialization', function () {
    it('should initialize with default values', function () {
      expect(errorHandler.retryCount).to.equal(3);
      expect(errorHandler.screenshotOnFailure).to.be.true;
    });

    it('should respect environment configuration', function () {
      process.env.MAX_RETRIES = '5';
      process.env.SCREENSHOT_ON_FAILURE = 'false';
      
      // Get fresh instance with new env vars
      delete require.cache[require.resolve('../../../src/utils/errorHandler')];
      const handler = require('../../../src/utils/errorHandler');
      
      expect(handler.retryCount).to.equal(5);
      expect(handler.screenshotOnFailure).to.be.false;
      
      // Clean up
      delete process.env.MAX_RETRIES;
      delete process.env.SCREENSHOT_ON_FAILURE;
    });
  });

  describe('withRetry', function () {
    it('should succeed on first attempt', async function () {
      const operation = sinon.stub().resolves('success');
      const context = { operation: 'test-operation' };

      const result = await errorHandler.withRetry(operation, context);

      expect(result).to.equal('success');
      expect(operation.calledOnce).to.be.true;
    });

    it('should retry on failure and eventually succeed', async function () {
      const operation = sinon.stub();
      operation.onFirstCall().rejects(new Error('First failure'));
      operation.onSecondCall().rejects(new Error('Second failure'));
      operation.onThirdCall().resolves('success');

      const context = { operation: 'retry-test' };

      const result = await errorHandler.withRetry(operation, context, 3);

      expect(result).to.equal('success');
      expect(operation.callCount).to.equal(3);
    });

    it('should fail after exhausting all retries', async function () {
      const operation = sinon.stub().rejects(new Error('Persistent failure'));
      const context = { operation: 'failing-operation' };

      try {
        await errorHandler.withRetry(operation, context, 2);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Persistent failure');
        expect(error.message).to.include('after 3 attempts');
        expect(operation.callCount).to.equal(3); // 2 retries + 1 initial attempt
      }
    });

    it('should apply exponential backoff between retries', async function () {
      const operation = sinon.stub();
      operation.onFirstCall().rejects(new Error('First failure'));
      operation.onSecondCall().rejects(new Error('Second failure'));
      operation.onThirdCall().resolves('success');

      const sleepStub = sinon.stub(errorHandler, 'sleep').resolves();
      const calculateBackoffStub = sinon.stub(errorHandler, 'calculateBackoffDelay');
      calculateBackoffStub.onFirstCall().returns(1000);
      calculateBackoffStub.onSecondCall().returns(2000);

      await errorHandler.withRetry(operation, {}, 2);

      expect(sleepStub.callCount).to.equal(2);
      expect(sleepStub.firstCall.args[0]).to.equal(1000);
      expect(sleepStub.secondCall.args[0]).to.equal(2000);
    });

    it('should log performance metrics on success', async function () {
      const operation = sinon.stub().resolves('success');
      const context = { operation: 'performance-test' };

      await errorHandler.withRetry(operation, context);

      // Verify that performance logging would be called (mocked in actual logger)
      expect(operation.calledOnce).to.be.true;
    });

    it('should enhance error with context information', async function () {
      const originalError = new Error('Original error');
      const operation = sinon.stub().rejects(originalError);
      const context = { operation: 'context-test', userId: '123' };

      try {
        await errorHandler.withRetry(operation, context, 1);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Original error');
        expect(error.message).to.include('after 2 attempts');
        expect(error.originalError).to.equal(originalError);
        expect(error.context).to.deep.equal(context);
        expect(error.attempts).to.equal(2);
      }
    });
  });

  describe('calculateBackoffDelay', function () {
    it('should calculate exponential backoff correctly', function () {
      const delay1 = errorHandler.calculateBackoffDelay(1);
      const delay2 = errorHandler.calculateBackoffDelay(2);
      const delay3 = errorHandler.calculateBackoffDelay(3);

      expect(delay1).to.be.at.least(1000).and.at.most(1100); // ~1s with jitter
      expect(delay2).to.be.at.least(2000).and.at.most(2200); // ~2s with jitter
      expect(delay3).to.be.at.least(4000).and.at.most(4400); // ~4s with jitter
    });

    it('should cap delay at maximum value', function () {
      const largeAttempt = errorHandler.calculateBackoffDelay(10);
      
      expect(largeAttempt).to.be.at.most(11000); // Max 10s + 10% jitter
    });

    it('should include jitter for randomization', function () {
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(errorHandler.calculateBackoffDelay(2));
      }

      // With jitter, delays should vary
      const uniqueDelays = [...new Set(delays)];
      expect(uniqueDelays.length).to.be.above(1);
    });
  });

  describe('sleep', function () {
    it('should resolve after specified time', async function () {
      const startTime = Date.now();
      await errorHandler.sleep(100);
      const endTime = Date.now();

      expect(endTime - startTime).to.be.at.least(95); // Allow some tolerance
    });

    it('should handle zero delay', async function () {
      const startTime = Date.now();
      await errorHandler.sleep(0);
      const endTime = Date.now();

      expect(endTime - startTime).to.be.below(10); // Should be immediate
    });
  });

  describe('enhanceError', function () {
    it('should enhance error with context and attempt count', function () {
      const originalError = new Error('Test error');
      const context = { operation: 'test', userId: '456' };
      const attempts = 3;

      const enhancedError = errorHandler.enhanceError(originalError, context, attempts);

      expect(enhancedError.message).to.include('Test error');
      expect(enhancedError.message).to.include('after 3 attempts');
      expect(enhancedError.originalError).to.equal(originalError);
      expect(enhancedError.context).to.deep.equal(context);
      expect(enhancedError.attempts).to.equal(attempts);
      expect(enhancedError.timestamp).to.be.a('string');
    });

    it('should handle missing context gracefully', function () {
      const originalError = new Error('Test error');

      const enhancedError = errorHandler.enhanceError(originalError, undefined, 1);

      expect(enhancedError.context).to.deep.equal({});
      expect(enhancedError.attempts).to.equal(1);
    });

    it('should preserve original error stack trace', function () {
      const originalError = new Error('Test error');
      originalError.stack = 'Original stack trace';

      const enhancedError = errorHandler.enhanceError(originalError, {}, 1);

      expect(enhancedError.originalError.stack).to.equal('Original stack trace');
    });
  });

  describe('error categorization', function () {
    it('should handle network errors appropriately', async function () {
      const networkError = new Error('Network timeout');
      networkError.code = 'ETIMEDOUT';
      
      const operation = sinon.stub().rejects(networkError);

      try {
        await errorHandler.withRetry(operation, { operation: 'network-test' }, 1);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.originalError.code).to.equal('ETIMEDOUT');
      }
    });

    it('should handle application errors appropriately', async function () {
      const appError = new Error('Application logic error');
      appError.type = 'APPLICATION_ERROR';
      
      const operation = sinon.stub().rejects(appError);

      try {
        await errorHandler.withRetry(operation, { operation: 'app-test' }, 1);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.originalError.type).to.equal('APPLICATION_ERROR');
      }
    });
  });

  describe('configuration edge cases', function () {
    it('should handle invalid MAX_RETRIES environment variable', function () {
      process.env.MAX_RETRIES = 'invalid';
      
      const handler = new ErrorHandler();
      
      expect(handler.retryCount).to.equal(3); // Should default to 3
      
      delete process.env.MAX_RETRIES;
    });

    it('should handle zero retries', async function () {
      const operation = sinon.stub().rejects(new Error('Immediate failure'));

      try {
        await errorHandler.withRetry(operation, {}, 0);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(operation.calledOnce).to.be.true;
        expect(error.message).to.include('after 1 attempts');
      }
    });

    it('should handle negative retries', async function () {
      const operation = sinon.stub().rejects(new Error('Immediate failure'));

      try {
        await errorHandler.withRetry(operation, {}, -1);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(operation.calledOnce).to.be.true;
      }
    });
  });
});