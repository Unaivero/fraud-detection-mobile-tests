/**
 * Login Page Object for handling authentication flow
 */
const BasePage = require('./BasePage');

class LoginPage extends BasePage {
  // Selectors for login elements
  selectors = {
    usernameInput: 'id=com.example.bettingapp:id/loginUsernameInput',
    passwordInput: 'id=com.example.bettingapp:id/loginPasswordInput',
    loginButton: 'id=com.example.bettingapp:id/loginButton',
    forgotPasswordLink: 'id=com.example.bettingapp:id/forgotPasswordLink',
    registerLink: 'id=com.example.bettingapp:id/registerLink',
    loginErrorMessage: 'id=com.example.bettingapp:id/loginErrorMessage',
    loginSuccessIndicator: 'id=com.example.bettingapp:id/homeScreenIndicator'
  };

  /**
   * Login with provided credentials
   * @param {Object} credentials - Login credentials with username and password
   * @returns {boolean} - Whether login was successful
   */
  async login(credentials) {
    await this.sendKeys(this.selectors.usernameInput, credentials.username);
    await this.sendKeys(this.selectors.passwordInput, credentials.password);
    await this.click(this.selectors.loginButton);
    
    // Wait for either success indicator or error message
    try {
      await this.waitFor(
        async () => {
          return await this.isDisplayed(this.selectors.loginSuccessIndicator) ||
                 await this.isDisplayed(this.selectors.loginErrorMessage);
        },
        10000,
        'Login result not determined'
      );
      
      const isSuccess = await this.isDisplayed(this.selectors.loginSuccessIndicator);
      
      if (isSuccess) {
        console.log(`Successfully logged in as: ${credentials.username}`);
      } else {
        const errorMsg = await this.getText(this.selectors.loginErrorMessage);
        console.error(`Login failed: ${errorMsg}`);
      }
      
      return isSuccess;
    } catch (error) {
      console.error(`Login timeout: ${error.message}`);
      return false;
    }
  }

  /**
   * Navigate to registration page from login screen
   */
  async navigateToRegistration() {
    await this.click(this.selectors.registerLink);
  }

  /**
   * Check if user is logged in
   * @returns {boolean} - Whether user is logged in
   */
  async isLoggedIn() {
    return await this.isDisplayed(this.selectors.loginSuccessIndicator);
  }

  /**
   * Get login error message if present
   * @returns {string} - Error message or empty string
   */
  async getErrorMessage() {
    if (await this.isDisplayed(this.selectors.loginErrorMessage)) {
      return await this.getText(this.selectors.loginErrorMessage);
    }
    return '';
  }
}

module.exports = LoginPage;
