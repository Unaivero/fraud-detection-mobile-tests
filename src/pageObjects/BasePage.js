/**
 * Base Page Object class with common methods for all pages
 */
class BasePage {
  constructor(driver) {
    this.driver = driver;
  }

  /**
   * Wait for an element to be visible
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds (default: 10000ms)
   */
  async waitForElement(selector, timeout = 10000) {
    const element = await this.driver.$(selector);
    await element.waitForDisplayed({ timeout });
    return element;
  }

  /**
   * Click on an element
   * @param {string} selector - Element selector
   */
  async click(selector) {
    const element = await this.waitForElement(selector);
    await element.click();
  }

  /**
   * Type text into an input field
   * @param {string} selector - Element selector
   * @param {string} text - Text to type
   */
  async sendKeys(selector, text) {
    const element = await this.waitForElement(selector);
    await element.setValue(text);
  }

  /**
   * Get text from an element
   * @param {string} selector - Element selector
   * @returns {string} - Element text
   */
  async getText(selector) {
    const element = await this.waitForElement(selector);
    return element.getText();
  }

  /**
   * Check if an element is displayed
   * @param {string} selector - Element selector
   * @returns {boolean} - True if element is displayed, false otherwise
   */
  async isDisplayed(selector, timeout = 5000) {
    try {
      const element = await this.driver.$(selector);
      return await element.waitForDisplayed({ timeout });
    } catch (error) {
      return false;
    }
  }

  /**
   * Swipe on screen (useful for mobile)
   * @param {number} startX - Start X coordinate
   * @param {number} startY - Start Y coordinate
   * @param {number} endX - End X coordinate
   * @param {number} endY - End Y coordinate
   */
  async swipe(startX, startY, endX, endY) {
    await this.driver.touchPerform([
      {
        action: 'press',
        options: { x: startX, y: startY }
      },
      {
        action: 'wait',
        options: { ms: 500 }
      },
      {
        action: 'moveTo',
        options: { x: endX, y: endY }
      },
      {
        action: 'release'
      }
    ]);
  }

  /**
   * Wait for a specific condition (useful for custom waits)
   * @param {Function} condition - Function that returns a promise resolving to boolean
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} errorMessage - Message to show if timeout is reached
   */
  async waitFor(condition, timeout = 10000, errorMessage = 'Condition not met') {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Timeout: ${errorMessage}`);
  }
}

module.exports = BasePage;
