/**
 * Centralized logging utility for the fraud detection tests
 * Provides structured logging with different levels and file output
 */
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logFile = process.env.LOG_FILE || './logs/test-execution.log';
    this.consoleLogging = process.env.CONSOLE_LOGGING !== 'false';
    
    // Create logs directory if it doesn't exist
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Log levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.currentLevel = this.levels[this.logLevel] || this.levels.info;
  }

  /**
   * Format log message with timestamp and metadata
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @returns {string} - Formatted log message
   */
  formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const buildNumber = process.env.BUILD_NUMBER || 'local';
    const environment = process.env.ENVIRONMENT || 'development';
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      environment,
      buildNumber,
      ...metadata
    };
    
    return JSON.stringify(logEntry);
  }

  /**
   * Write log to file
   * @param {string} formattedMessage - Formatted log message
   */
  writeToFile(formattedMessage) {
    try {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Log error messages
   * @param {string} message - Error message
   * @param {Object} metadata - Additional metadata
   */
  error(message, metadata = {}) {
    if (this.currentLevel >= this.levels.error) {
      const formatted = this.formatMessage('error', message, metadata);
      
      if (this.consoleLogging) {
        console.error(`[ERROR] ${message}`, metadata);
      }
      
      this.writeToFile(formatted);
    }
  }

  /**
   * Log warning messages
   * @param {string} message - Warning message
   * @param {Object} metadata - Additional metadata
   */
  warn(message, metadata = {}) {
    if (this.currentLevel >= this.levels.warn) {
      const formatted = this.formatMessage('warn', message, metadata);
      
      if (this.consoleLogging) {
        console.warn(`[WARN] ${message}`, metadata);
      }
      
      this.writeToFile(formatted);
    }
  }

  /**
   * Log info messages
   * @param {string} message - Info message
   * @param {Object} metadata - Additional metadata
   */
  info(message, metadata = {}) {
    if (this.currentLevel >= this.levels.info) {
      const formatted = this.formatMessage('info', message, metadata);
      
      if (this.consoleLogging) {
        console.log(`[INFO] ${message}`, metadata);
      }
      
      this.writeToFile(formatted);
    }
  }

  /**
   * Log debug messages
   * @param {string} message - Debug message
   * @param {Object} metadata - Additional metadata
   */
  debug(message, metadata = {}) {
    if (this.currentLevel >= this.levels.debug) {
      const formatted = this.formatMessage('debug', message, metadata);
      
      if (this.consoleLogging) {
        console.debug(`[DEBUG] ${message}`, metadata);
      }
      
      this.writeToFile(formatted);
    }
  }

  /**
   * Log test step
   * @param {string} step - Test step name
   * @param {string} status - Step status (started, passed, failed)
   * @param {Object} metadata - Additional metadata
   */
  testStep(step, status, metadata = {}) {
    const message = `Test Step: ${step} - ${status.toUpperCase()}`;
    this.info(message, { 
      testStep: step, 
      stepStatus: status, 
      ...metadata 
    });
  }

  /**
   * Log API request/response
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {number} statusCode - Response status code
   * @param {Object} metadata - Additional metadata
   */
  apiCall(method, url, statusCode, metadata = {}) {
    const message = `API Call: ${method.toUpperCase()} ${url} - ${statusCode}`;
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    
    this[level](message, {
      apiMethod: method,
      apiUrl: url,
      apiStatusCode: statusCode,
      ...metadata
    });
  }

  /**
   * Log fraud detection attempt
   * @param {string} fraudType - Type of fraud attempted
   * @param {boolean} detected - Whether fraud was detected
   * @param {Object} metadata - Additional metadata
   */
  fraudDetection(fraudType, detected, metadata = {}) {
    const message = `Fraud Detection: ${fraudType} - ${detected ? 'DETECTED' : 'NOT DETECTED'}`;
    const level = detected ? 'info' : 'warn';
    
    this[level](message, {
      fraudType,
      fraudDetected: detected,
      ...metadata
    });
  }

  /**
   * Take screenshot and log it
   * @param {Object} driver - WebDriver instance
   * @param {string} testName - Name of the test
   * @param {string} reason - Reason for screenshot
   */
  async screenshot(driver, testName, reason = 'test-step') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${testName}-${reason}-${timestamp}.png`;
      const screenshotPath = path.join('./screenshots', filename);
      
      // Create screenshots directory if it doesn't exist
      const screenshotDir = path.dirname(screenshotPath);
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      
      const screenshot = await driver.saveScreenshot(screenshotPath);
      
      this.info(`Screenshot taken: ${filename}`, {
        screenshotPath,
        testName,
        reason
      });
      
      return screenshotPath;
    } catch (error) {
      this.error(`Failed to take screenshot: ${error.message}`, {
        testName,
        reason,
        error: error.stack
      });
      return null;
    }
  }

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  performance(operation, duration, metadata = {}) {
    if (this.currentLevel >= this.levels.info) {
      const message = `${operation} completed in ${duration}ms`;
      
      if (this.consoleLogging) {
        console.info(`[PERFORMANCE] ${message}`);
      }
      
      const formatted = this.formatMessage('info', message, {
        operation,
        duration,
        performanceMetric: true,
        ...metadata
      });
      
      this.writeToFile(formatted);
    }
  }

  /**
   * Log test-specific messages
   * @param {string} message - Test message
   * @param {Object} metadata - Additional metadata
   */
  test(message, metadata = {}) {
    if (this.currentLevel >= this.levels.info) {
      if (this.consoleLogging) {
        console.info(`[TEST] ${message}`);
      }
      
      const formatted = this.formatMessage('info', message, {
        testType: 'assertion',
        ...metadata
      });
      
      this.writeToFile(formatted);
    }
  }
}

// Export singleton instance
module.exports = new Logger();