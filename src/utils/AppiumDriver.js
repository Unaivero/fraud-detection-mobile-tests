/**
 * Appium driver utility for managing driver instance
 */
const { remote } = require('webdriverio');
const appiumConfig = require('../../config/appium.config');
const logger = require('./logger');
const errorHandler = require('./errorHandler');

class AppiumDriver {
  constructor() {
    this.driver = null;
  }

  /**
   * Initialize and get the Appium driver instance
   * @param {string} platform - 'android' or 'ios'
   * @returns {Object} - WebdriverIO driver instance
   */
  async getDriver(platform = 'android') {
    if (!this.driver) {
      try {
        logger.info(`Initializing ${platform} driver...`, { platform });
        
        // Get platform-specific configuration
        const config = appiumConfig.getConfig(platform);
        
        // Initialize the driver with retry logic
        this.driver = await errorHandler.withRetry(
          async () => {
            return await remote({
              path: '/wd/hub',
              port: process.env.APPIUM_PORT || 4723,
              hostname: process.env.APPIUM_HOST || 'localhost',
              capabilities: config
            });
          },
          { 
            operation: 'initialize-driver',
            platform,
            config: { ...config, password: '[REDACTED]' } // Don't log sensitive data
          }
        );
        
        logger.info('Driver initialized successfully', { 
          platform,
          sessionId: this.driver.sessionId 
        });
      } catch (error) {
        logger.error('Failed to initialize driver', { 
          platform, 
          error: error.message 
        });
        throw errorHandler.enhanceError(error, { 
          operation: 'initialize-driver',
          platform 
        });
      }
    }
    
    return this.driver;
  }

  /**
   * Get the current driver instance if it exists
   * @returns {Object|null} - Current driver instance or null
   */
  getCurrentDriver() {
    return this.driver;
  }

  /**
   * Close the driver and end the session
   */
  async closeDriver() {
    if (this.driver) {
      try {
        const sessionId = this.driver.sessionId;
        await this.driver.deleteSession();
        logger.info('Driver session closed successfully', { sessionId });
      } catch (error) {
        logger.error('Error closing driver session', { 
          error: error.message,
          sessionId: this.driver?.sessionId 
        });
      } finally {
        this.driver = null;
      }
    }
  }

  /**
   * Check if driver is active and session is valid
   * @returns {boolean} - True if driver is active
   */
  async isDriverActive() {
    if (!this.driver) {
      return false;
    }
    
    try {
      await this.driver.getSession();
      return true;
    } catch (error) {
      logger.debug('Driver session check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Take a screenshot of the current screen
   * @returns {string|null} - Base64 encoded screenshot or null if failed
   */
  async takeScreenshot() {
    if (!this.driver) {
      logger.warn('Cannot take screenshot: no active driver');
      return null;
    }
    
    try {
      const screenshot = await this.driver.takeScreenshot();
      logger.debug('Screenshot taken successfully');
      return screenshot;
    } catch (error) {
      logger.error('Failed to take screenshot', { error: error.message });
      return null;
    }
  }

  /**
   * Get the page source of the current screen
   * @returns {string|null} - Page source XML or null if failed
   */
  async getPageSource() {
    if (!this.driver) {
      logger.warn('Cannot get page source: no active driver');
      return null;
    }
    
    try {
      const pageSource = await this.driver.getPageSource();
      logger.debug('Page source retrieved successfully');
      return pageSource;
    } catch (error) {
      logger.error('Failed to get page source', { error: error.message });
      return null;
    }
  }
}

// Export singleton instance
module.exports = new AppiumDriver();
