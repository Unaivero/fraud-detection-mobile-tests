/**
 * Unit tests for Logger utility class
 */
const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const Logger = require('../../../src/utils/logger');

describe('Logger', function () {
  let logger;
  let fsStubs;
  let consoleStubs;

  beforeEach(function () {
    // Clear environment variables
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FILE;
    delete process.env.CONSOLE_LOGGING;
    
    // Stub filesystem operations
    fsStubs = {
      existsSync: sinon.stub(fs, 'existsSync'),
      mkdirSync: sinon.stub(fs, 'mkdirSync'),
      appendFileSync: sinon.stub(fs, 'appendFileSync')
    };

    // Stub console methods
    consoleStubs = {
      error: sinon.stub(console, 'error'),
      warn: sinon.stub(console, 'warn'),
      info: sinon.stub(console, 'info'),
      log: sinon.stub(console, 'log')
    };

    // Mock directory exists
    fsStubs.existsSync.returns(true);

    // Get fresh instance for each test
    delete require.cache[require.resolve('../../../src/utils/logger')];
    logger = require('../../../src/utils/logger');
  });

  afterEach(function () {
    sinon.restore();
    
    // Clean up environment variables
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FILE;
    delete process.env.CONSOLE_LOGGING;
  });

  describe('initialization', function () {
    it('should initialize with default configuration', function () {      
      expect(logger.logLevel).to.equal('info');
      expect(logger.logFile).to.equal('./logs/test-execution.log');
      expect(logger.consoleLogging).to.be.true;
      expect(logger.currentLevel).to.equal(2); // info level
    });

    it('should respect environment configuration', function () {
      process.env.LOG_LEVEL = 'debug';
      process.env.LOG_FILE = './custom/log.log';
      process.env.CONSOLE_LOGGING = 'false';

      delete require.cache[require.resolve('../../../src/utils/logger')];
      const testLogger = require('../../../src/utils/logger');

      expect(testLogger.logLevel).to.equal('debug');
      expect(testLogger.logFile).to.equal('./custom/log.log');
      expect(testLogger.consoleLogging).to.be.false;
      expect(testLogger.currentLevel).to.equal(3); // debug level
    });

    it('should create log directory if it does not exist', function () {
      fsStubs.existsSync.returns(false);
      
      delete require.cache[require.resolve('../../../src/utils/logger')];
      const testLogger = require('../../../src/utils/logger');

      expect(fsStubs.mkdirSync.calledWith(path.dirname('./logs/test-execution.log'), { recursive: true })).to.be.true;
    });

    it('should handle invalid log level gracefully', function () {
      process.env.LOG_LEVEL = 'invalid';
      
      delete require.cache[require.resolve('../../../src/utils/logger')];
      const testLogger = require('../../../src/utils/logger');
      
      expect(testLogger.currentLevel).to.equal(2); // Should default to info
    });
  });

  describe('formatMessage', function () {
    it('should format message with all required fields', function () {
      const message = 'Test message';
      const metadata = { userId: '123', action: 'test' };
      
      const formatted = logger.formatMessage('info', message, metadata);
      const parsed = JSON.parse(formatted);

      expect(parsed).to.have.property('timestamp');
      expect(parsed).to.have.property('level', 'INFO');
      expect(parsed).to.have.property('message', message);
      expect(parsed).to.have.property('environment', 'development');
      expect(parsed).to.have.property('buildNumber', 'local');
      expect(parsed).to.have.property('userId', '123');
      expect(parsed).to.have.property('action', 'test');
    });

    it('should include environment variables when set', function () {
      process.env.BUILD_NUMBER = '456';
      process.env.ENVIRONMENT = 'staging';

      const formatted = logger.formatMessage('error', 'Test error');
      const parsed = JSON.parse(formatted);

      expect(parsed.buildNumber).to.equal('456');
      expect(parsed.environment).to.equal('staging');
    });

    it('should handle empty metadata', function () {
      const formatted = logger.formatMessage('warn', 'Warning message');
      const parsed = JSON.parse(formatted);

      expect(parsed.level).to.equal('WARN');
      expect(parsed.message).to.equal('Warning message');
      expect(parsed).to.have.property('timestamp');
    });

    it('should generate valid ISO timestamp', function () {
      const formatted = logger.formatMessage('info', 'Test');
      const parsed = JSON.parse(formatted);

      const timestamp = new Date(parsed.timestamp);
      expect(timestamp.toISOString()).to.equal(parsed.timestamp);
    });
  });

  describe('writeToFile', function () {
    it('should write formatted message to log file', function () {
      const message = 'Test log entry';
      
      logger.writeToFile(message);

      expect(fsStubs.appendFileSync.calledWith('./logs/test-execution.log', message + '\n')).to.be.true;
    });

    it('should handle file write errors gracefully', function () {
      const error = new Error('File write failed');
      fsStubs.appendFileSync.throws(error);

      logger.writeToFile('Test message');

      expect(consoleStubs.error.calledWith('Failed to write to log file:', error.message)).to.be.true;
    });
  });

  describe('error', function () {
    it('should log error messages when level permits', function () {
      logger.currentLevel = 0; // error level

      logger.error('Error message', { errorCode: 500 });

      expect(consoleStubs.error.calledWith('[ERROR] Error message', { errorCode: 500 })).to.be.true;
      expect(fsStubs.appendFileSync.called).to.be.true;
    });

    it('should not log when level is below error', function () {
      logger.currentLevel = -1; // Below error level

      logger.error('Error message');

      expect(consoleStubs.error.called).to.be.false;
      expect(fsStubs.appendFileSync.called).to.be.false;
    });

    it('should skip console logging when disabled', function () {
      logger.consoleLogging = false;

      logger.error('Error message');

      expect(consoleStubs.error.called).to.be.false;
      expect(fsStubs.appendFileSync.called).to.be.true;
    });
  });

  describe('warn', function () {
    it('should log warning messages when level permits', function () {
      logger.currentLevel = 1; // warn level

      logger.warn('Warning message', { component: 'api' });

      expect(consoleStubs.warn.calledWith('[WARN] Warning message', { component: 'api' })).to.be.true;
      expect(fsStubs.appendFileSync.called).to.be.true;
    });

    it('should not log when level is below warn', function () {
      logger.currentLevel = 0; // error level only

      logger.warn('Warning message');

      expect(consoleStubs.warn.called).to.be.false;
      expect(fsStubs.appendFileSync.called).to.be.false;
    });
  });

  describe('info', function () {
    it('should log info messages when level permits', function () {
      logger.currentLevel = 2; // info level

      logger.info('Info message', { status: 'success' });

      expect(consoleStubs.info.calledWith('[INFO] Info message', { status: 'success' })).to.be.true;
      expect(fsStubs.appendFileSync.called).to.be.true;
    });

    it('should not log when level is below info', function () {
      logger.currentLevel = 1; // warn level only

      logger.info('Info message');

      expect(consoleStubs.info.called).to.be.false;
      expect(fsStubs.appendFileSync.called).to.be.false;
    });
  });

  describe('debug', function () {
    it('should log debug messages when level permits', function () {
      logger.currentLevel = 3; // debug level

      logger.debug('Debug message', { details: 'verbose' });

      expect(consoleStubs.log.calledWith('[DEBUG] Debug message', { details: 'verbose' })).to.be.true;
      expect(fsStubs.appendFileSync.called).to.be.true;
    });

    it('should not log when level is below debug', function () {
      logger.currentLevel = 2; // info level only

      logger.debug('Debug message');

      expect(consoleStubs.log.called).to.be.false;
      expect(fsStubs.appendFileSync.called).to.be.false;
    });
  });

  describe('performance', function () {
    it('should log performance metrics', function () {
      logger.currentLevel = 2; // info level

      logger.performance('API call', 1500, { endpoint: '/api/test' });

      expect(consoleStubs.info.calledWith('[PERFORMANCE] API call completed in 1500ms')).to.be.true;
      expect(fsStubs.appendFileSync.called).to.be.true;
    });

    it('should include performance metadata in log entry', function () {
      const formatStub = sinon.stub(logger, 'formatMessage').returns('{}');

      logger.performance('Test operation', 2000, { userId: '123' });

      expect(formatStub.calledWith('info', 'Test operation completed in 2000ms', sinon.match({
        duration: 2000,
        operation: 'Test operation',
        userId: '123'
      }))).to.be.true;
    });

    it('should not log performance when level is below info', function () {
      logger.currentLevel = 1; // warn level only

      logger.performance('API call', 1000);

      expect(consoleStubs.info.called).to.be.false;
      expect(fsStubs.appendFileSync.called).to.be.false;
    });
  });

  describe('test', function () {
    it('should log test-specific messages', function () {
      logger.currentLevel = 2; // info level

      logger.test('Test step completed', { step: 'login', result: 'pass' });

      expect(consoleStubs.info.calledWith('[TEST] Test step completed')).to.be.true;
      expect(fsStubs.appendFileSync.called).to.be.true;
    });

    it('should include test metadata', function () {
      const formatStub = sinon.stub(logger, 'formatMessage').returns('{}');

      logger.test('Test assertion', { expected: 'value', actual: 'value' });

      expect(formatStub.calledWith('info', 'Test assertion', sinon.match({
        testType: 'assertion',
        expected: 'value',
        actual: 'value'
      }))).to.be.true;
    });
  });

  describe('logLevel configuration', function () {
    it('should handle all valid log levels', function () {
      const levels = ['error', 'warn', 'info', 'debug'];
      
      levels.forEach((level, index) => {
        process.env.LOG_LEVEL = level;
        const testLogger = new Logger();
        expect(testLogger.currentLevel).to.equal(index);
      });
    });

    it('should filter messages based on current level', function () {
      logger.currentLevel = 1; // warn level

      logger.error('Error message');   // Should log
      logger.warn('Warning message');  // Should log
      logger.info('Info message');     // Should not log
      logger.debug('Debug message');   // Should not log

      expect(consoleStubs.error.called).to.be.true;
      expect(consoleStubs.warn.called).to.be.true;
      expect(consoleStubs.info.called).to.be.false;
      expect(consoleStubs.log.called).to.be.false;
    });
  });

  describe('edge cases', function () {
    it('should handle null metadata gracefully', function () {
      expect(() => {
        logger.info('Test message', null);
      }).to.not.throw();
    });

    it('should handle undefined metadata gracefully', function () {
      expect(() => {
        logger.error('Error message', undefined);
      }).to.not.throw();
    });

    it('should handle circular references in metadata', function () {
      const circular = { name: 'test' };
      circular.self = circular;

      expect(() => {
        logger.warn('Warning with circular reference', circular);
      }).to.not.throw();
    });

    it('should handle very long messages', function () {
      const longMessage = 'x'.repeat(10000);

      expect(() => {
        logger.info(longMessage);
      }).to.not.throw();

      expect(fsStubs.appendFileSync.called).to.be.true;
    });

    it('should handle special characters in messages', function () {
      const specialMessage = 'Test with "quotes" and \n newlines and \t tabs';

      logger.info(specialMessage);

      expect(fsStubs.appendFileSync.called).to.be.true;
    });
  });
});