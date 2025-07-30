/**
 * Centralized error handling utility
 * Provides consistent error handling and recovery mechanisms
 */
const logger = require('./logger');

class ErrorHandler {
  constructor() {
    this.retryCount = parseInt(process.env.MAX_RETRIES) || 3;
    this.screenshotOnFailure = process.env.SCREENSHOT_ON_FAILURE !== 'false';
  }

  /**
   * Handle test errors with automatic retry logic
   * @param {Function} operation - Operation to retry
   * @param {Object} context - Context information
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<any>} - Result of operation
   */
  async withRetry(operation, context = {}, maxRetries = this.retryCount) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        logger.debug(`Attempting operation: ${context.operation || 'unknown'}`, {
          attempt,
          maxRetries: maxRetries + 1,
          ...context
        });
        
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;
        
        logger.performance(context.operation || 'operation', duration, {
          attempt,
          success: true,
          ...context
        });
        
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`, context);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        logger.warn(`Operation failed on attempt ${attempt}`, {
          error: error.message,
          attempt,
          maxRetries: maxRetries + 1,
          ...context
        });
        
        if (attempt <= maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.debug(`Retrying in ${delay}ms...`, { attempt, delay, ...context });
          await this.sleep(delay);
        }
      }
    }
    
    // All attempts failed
    throw this.enhanceError(lastError, context, maxRetries + 1);
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attempt - Current attempt number
   * @returns {number} - Delay in milliseconds
   */
  calculateBackoffDelay(attempt) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhance error with additional context
   * @param {Error} error - Original error
   * @param {Object} context - Additional context
   * @param {number} attempts - Number of attempts made
   * @returns {Error} - Enhanced error
   */
  enhanceError(error, context = {}, attempts = 1) {
    const enhancedError = new Error(`${error.message} (after ${attempts} attempts)`);
    enhancedError.originalError = error;
    enhancedError.context = context;
    enhancedError.attempts = attempts;
    enhancedError.timestamp = new Date().toISOString();
    enhancedError.stack = error.stack;
    
    return enhancedError;
  }

  /**
   * Handle WebDriver errors specifically
   * @param {Error} error - WebDriver error
   * @param {Object} driver - WebDriver instance
   * @param {Object} context - Additional context
   */
  async handleWebDriverError(error, driver, context = {}) {
    logger.error(`WebDriver error: ${error.message}`, {
      errorType: 'webdriver',
      errorName: error.name,
      ...context
    });

    // Take screenshot if enabled and driver is available
    if (this.screenshotOnFailure && driver) {
      try {
        await logger.screenshot(driver, context.testName || 'error', 'error');
      } catch (screenshotError) {
        logger.error(`Failed to take error screenshot: ${screenshotError.message}`);
      }
    }

    // Check for specific WebDriver error types
    if (this.isElementNotFoundError(error)) {
      return this.handleElementNotFoundError(error, context);
    } else if (this.isTimeoutError(error)) {
      return this.handleTimeoutError(error, context);
    } else if (this.isConnectionError(error)) {
      return this.handleConnectionError(error, context);
    }

    // Return enhanced error for unknown WebDriver errors
    throw this.enhanceError(error, { errorType: 'webdriver', ...context });
  }

  /**
   * Check if error is element not found
   * @param {Error} error - Error to check
   * @returns {boolean} - Whether error is element not found
   */
  isElementNotFoundError(error) {
    const message = error.message.toLowerCase();
    return message.includes('element not found') ||
           message.includes('no such element') ||
           message.includes('element is not clickable') ||
           message.includes('element not interactable');
  }

  /**
   * Check if error is timeout
   * @param {Error} error - Error to check
   * @returns {boolean} - Whether error is timeout
   */
  isTimeoutError(error) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') ||
           message.includes('wait timeout') ||
           message.includes('time out');
  }

  /**
   * Check if error is connection related
   * @param {Error} error - Error to check
   * @returns {boolean} - Whether error is connection related
   */
  isConnectionError(error) {
    const message = error.message.toLowerCase();
    return message.includes('connection') ||
           message.includes('econnrefused') ||
           message.includes('network') ||
           message.includes('socket');
  }

  /**
   * Handle element not found errors
   * @param {Error} error - Original error
   * @param {Object} context - Additional context
   */
  handleElementNotFoundError(error, context) {
    logger.warn('Element not found, possible UI change or timing issue', {
      selector: context.selector,
      suggestion: 'Check if element selector is correct or if element needs more time to load',
      ...context
    });
    
    const enhancedError = this.enhanceError(error, {
      errorType: 'element-not-found',
      suggestion: 'Verify element selector and consider adding explicit wait',
      ...context
    });
    
    throw enhancedError;
  }

  /**
   * Handle timeout errors
   * @param {Error} error - Original error
   * @param {Object} context - Additional context
   */
  handleTimeoutError(error, context) {
    logger.warn('Operation timed out, consider increasing timeout or checking performance', {
      timeout: context.timeout,
      suggestion: 'Increase timeout value or check application performance',
      ...context
    });
    
    const enhancedError = this.enhanceError(error, {
      errorType: 'timeout',
      suggestion: 'Consider increasing timeout or improving application performance',
      ...context
    });
    
    throw enhancedError;
  }

  /**
   * Handle connection errors
   * @param {Error} error - Original error
   * @param {Object} context - Additional context
   */
  handleConnectionError(error, context) {
    logger.error('Connection error, check if services are running', {
      suggestion: 'Check if Appium server, API server, or device is running',
      ...context
    });
    
    const enhancedError = this.enhanceError(error, {
      errorType: 'connection',
      suggestion: 'Verify that all required services (Appium, API, device) are running',
      ...context
    });
    
    throw enhancedError;
  }

  /**
   * Handle API errors
   * @param {Error} error - API error
   * @param {Object} context - Additional context
   */
  handleApiError(error, context = {}) {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;
    
    logger.error(`API error: ${error.message}`, {
      errorType: 'api',
      statusCode,
      responseData,
      url: context.url,
      method: context.method,
      ...context
    });

    // Handle specific HTTP status codes
    if (statusCode === 401) {
      throw this.enhanceError(error, {
        errorType: 'authentication',
        suggestion: 'Check authentication credentials or token',
        ...context
      });
    } else if (statusCode === 403) {
      throw this.enhanceError(error, {
        errorType: 'authorization',
        suggestion: 'Check user permissions or account status',
        ...context
      });
    } else if (statusCode === 404) {
      throw this.enhanceError(error, {
        errorType: 'not-found',
        suggestion: 'Check API endpoint URL or resource ID',
        ...context
      });
    } else if (statusCode >= 500) {
      throw this.enhanceError(error, {
        errorType: 'server-error',
        suggestion: 'Server error, check server logs or try again later',
        ...context
      });
    }

    throw this.enhanceError(error, { errorType: 'api', ...context });
  }

  /**
   * Generate error summary for reporting
   * @param {Error} error - Error to summarize
   * @returns {Object} - Error summary
   */
  getErrorSummary(error) {
    return {
      message: error.message,
      type: error.context?.errorType || 'unknown',
      timestamp: error.timestamp || new Date().toISOString(),
      attempts: error.attempts || 1,
      context: error.context || {},
      suggestion: error.context?.suggestion || 'No specific suggestion available'
    };
  }
}

// Export singleton instance
module.exports = new ErrorHandler();