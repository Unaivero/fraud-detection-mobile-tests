/**
 * Account Status Page Object for checking account flags and status
 */
const BasePage = require('./BasePage');

class AccountStatusPage extends BasePage {
  // Selectors for account status elements
  selectors = {
    accountTab: 'id=com.example.bettingapp:id/accountTabButton',
    statusSection: 'id=com.example.bettingapp:id/accountStatusSection',
    accountStatusIndicator: 'id=com.example.bettingapp:id/accountStatusIndicator',
    accountFlags: 'id=com.example.bettingapp:id/accountFlagsSection',
    flagItems: 'id=com.example.bettingapp:id/accountFlagItem',
    verificationStatus: 'id=com.example.bettingapp:id/verificationStatus',
    accountLimits: 'id=com.example.bettingapp:id/accountLimits',
    warningBanner: 'id=com.example.bettingapp:id/accountWarningBanner',
    errorBanner: 'id=com.example.bettingapp:id/accountErrorBanner',
    refreshButton: 'id=com.example.bettingapp:id/refreshStatusButton'
  };

  /**
   * Navigate to the account tab
   */
  async navigateToAccountTab() {
    await this.click(this.selectors.accountTab);
  }

  /**
   * Get current account status
   * @returns {string} - Account status text
   */
  async getAccountStatus() {
    await this.navigateToAccountTab();
    return await this.getText(this.selectors.accountStatusIndicator);
  }

  /**
   * Check if account has any flags
   * @returns {boolean} - Whether account has flags
   */
  async hasFlags() {
    await this.navigateToAccountTab();
    
    // Check if there are any flags
    try {
      const flagSection = await this.driver.$(this.selectors.accountFlags);
      const isDisplayed = await flagSection.isDisplayed();
      
      if (!isDisplayed) {
        return false;
      }
      
      const flagItems = await this.driver.$$(this.selectors.flagItems);
      return flagItems.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all account flags
   * @returns {Array<string>} - List of flag descriptions
   */
  async getFlags() {
    await this.navigateToAccountTab();
    
    const flags = [];
    try {
      const flagItems = await this.driver.$$(this.selectors.flagItems);
      
      for (const item of flagItems) {
        const isDisplayed = await item.isDisplayed();
        if (isDisplayed) {
          const text = await item.getText();
          flags.push(text);
        }
      }
    } catch (error) {
      console.error(`Error getting flags: ${error.message}`);
    }
    
    return flags;
  }

  /**
   * Check if account has fraud-related warnings
   * @returns {boolean} - Whether account has fraud warnings
   */
  async hasFraudWarnings() {
    await this.navigateToAccountTab();
    
    // Check for warning banner
    if (await this.isDisplayed(this.selectors.warningBanner)) {
      const warningText = await this.getText(this.selectors.warningBanner);
      return warningText.toLowerCase().includes('fraud') || 
             warningText.toLowerCase().includes('suspicious') ||
             warningText.toLowerCase().includes('violation') ||
             warningText.toLowerCase().includes('review');
    }
    
    return false;
  }

  /**
   * Check if account is blocked or suspended
   * @returns {boolean} - Whether account is blocked
   */
  async isAccountBlocked() {
    await this.navigateToAccountTab();
    
    // Check for error banner or status
    if (await this.isDisplayed(this.selectors.errorBanner)) {
      return true;
    }
    
    const status = await this.getAccountStatus();
    return status.toLowerCase().includes('blocked') || 
           status.toLowerCase().includes('suspended') ||
           status.toLowerCase().includes('locked') ||
           status.toLowerCase().includes('restricted');
  }

  /**
   * Refresh account status
   */
  async refreshStatus() {
    await this.navigateToAccountTab();
    await this.click(this.selectors.refreshButton);
    // Wait for refresh to complete
    await this.driver.pause(1000);
  }
}

module.exports = AccountStatusPage;
