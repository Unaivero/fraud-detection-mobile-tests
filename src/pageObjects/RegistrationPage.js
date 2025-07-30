/**
 * Registration Page Object for handling the sign-up flow
 */
const BasePage = require('./BasePage');

class RegistrationPage extends BasePage {
  // Selectors for registration elements
  selectors = {
    registerButton: 'id=com.example.bettingapp:id/registerButton',
    firstNameInput: 'id=com.example.bettingapp:id/firstNameInput',
    lastNameInput: 'id=com.example.bettingapp:id/lastNameInput',
    emailInput: 'id=com.example.bettingapp:id/emailInput',
    usernameInput: 'id=com.example.bettingapp:id/usernameInput',
    passwordInput: 'id=com.example.bettingapp:id/passwordInput',
    confirmPasswordInput: 'id=com.example.bettingapp:id/confirmPasswordInput',
    dobInput: 'id=com.example.bettingapp:id/dobInput',
    phoneInput: 'id=com.example.bettingapp:id/phoneInput',
    addressStreetInput: 'id=com.example.bettingapp:id/streetAddressInput',
    addressCityInput: 'id=com.example.bettingapp:id/cityInput',
    addressStateInput: 'id=com.example.bettingapp:id/stateInput',
    addressZipInput: 'id=com.example.bettingapp:id/zipCodeInput',
    addressCountryInput: 'id=com.example.bettingapp:id/countryInput',
    termsCheckbox: 'id=com.example.bettingapp:id/termsCheckbox',
    submitButton: 'id=com.example.bettingapp:id/submitRegistrationButton',
    registrationSuccessMessage: 'id=com.example.bettingapp:id/registrationSuccessMessage',
    registrationErrorMessage: 'id=com.example.bettingapp:id/registrationErrorMessage'
  };

  /**
   * Navigate to the registration page
   */
  async navigateToRegistration() {
    await this.click(this.selectors.registerButton);
  }

  /**
   * Fill the registration form with user data
   * @param {Object} userData - User data from fake data generator
   */
  async fillRegistrationForm(userData) {
    await this.sendKeys(this.selectors.firstNameInput, userData.firstName);
    await this.sendKeys(this.selectors.lastNameInput, userData.lastName);
    await this.sendKeys(this.selectors.emailInput, userData.email);
    await this.sendKeys(this.selectors.usernameInput, userData.username);
    await this.sendKeys(this.selectors.passwordInput, userData.password);
    await this.sendKeys(this.selectors.confirmPasswordInput, userData.password);
    await this.sendKeys(this.selectors.dobInput, userData.dateOfBirth);
    await this.sendKeys(this.selectors.phoneInput, userData.phone);
    
    // Scroll down to see address fields
    const element = await this.driver.$(this.selectors.phoneInput);
    await element.scrollIntoView();
    
    await this.sendKeys(this.selectors.addressStreetInput, userData.address.street);
    await this.sendKeys(this.selectors.addressCityInput, userData.address.city);
    await this.sendKeys(this.selectors.addressStateInput, userData.address.state);
    await this.sendKeys(this.selectors.addressZipInput, userData.address.zipCode);
    await this.sendKeys(this.selectors.addressCountryInput, userData.address.country);
    
    // Accept terms and conditions
    await this.click(this.selectors.termsCheckbox);
  }

  /**
   * Submit the registration form
   */
  async submitRegistration() {
    await this.click(this.selectors.submitButton);
  }

  /**
   * Register a new user with the provided user data
   * @param {Object} userData - User data from fake data generator
   * @returns {boolean} - Whether registration was successful
   */
  async registerNewUser(userData) {
    await this.navigateToRegistration();
    await this.fillRegistrationForm(userData);
    await this.submitRegistration();
    
    // Wait for either success message or error message
    const isSuccess = await Promise.race([
      this.isDisplayed(this.selectors.registrationSuccessMessage, 10000)
        .then(displayed => displayed ? true : false),
      this.isDisplayed(this.selectors.registrationErrorMessage, 10000)
        .then(displayed => displayed ? false : true)
    ]);
    
    if (isSuccess) {
      console.log(`Successfully registered user: ${userData.username}`);
    } else {
      const errorMsg = await this.getText(this.selectors.registrationErrorMessage);
      console.error(`Registration failed: ${errorMsg}`);
    }
    
    return isSuccess;
  }
  
  /**
   * Check if the registration was successful
   */
  async isRegistrationSuccessful() {
    return await this.isDisplayed(this.selectors.registrationSuccessMessage);
  }
}

module.exports = RegistrationPage;
