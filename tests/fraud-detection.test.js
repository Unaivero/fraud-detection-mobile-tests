/**
 * Fraud Detection Test Suite
 * 
 * This test suite implements the complete fraud detection testing scenario:
 * 1. Create a fake account via mobile UI
 * 2. Attempt to place a fraudulent bet via direct API call
 * 3. Validate that the bet was rejected and account is flagged
 */
const { expect } = require('chai');
const AppiumDriver = require('../src/utils/AppiumDriver');
const RegistrationPage = require('../src/pageObjects/RegistrationPage');
const LoginPage = require('../src/pageObjects/LoginPage');
const BettingPage = require('../src/pageObjects/BettingPage');
const AccountStatusPage = require('../src/pageObjects/AccountStatusPage');
const ApiClient = require('../src/utils/apiClient');
const FakeDataGenerator = require('../src/utils/fakeDataGenerator');
require('dotenv').config();

describe('Fraud Detection Tests', function () {
  // Test timeouts and vars
  this.timeout(120000); // 2 minutes
  let driver;
  let registrationPage;
  let loginPage;
  let bettingPage;
  let accountStatusPage;
  let apiClient;
  let userData;
  let betData;
  
  before(async function () {
    // Initialize driver
    driver = await AppiumDriver.getDriver(process.env.PLATFORM || 'android');
    
    // Initialize page objects
    registrationPage = new RegistrationPage(driver);
    loginPage = new LoginPage(driver);
    bettingPage = new BettingPage(driver);
    accountStatusPage = new AccountStatusPage(driver);
    
    // Initialize API client
    apiClient = new ApiClient(process.env.API_BASE_URL);
    
    // Generate fake user data
    userData = FakeDataGenerator.generateUserData();
    
    // Generate legitimate bet data to modify later
    betData = FakeDataGenerator.generateBetData();
    
    console.log('Test setup complete');
    console.log(`Using test user: ${userData.username}`);
  });
  
  after(async function () {
    // Close the driver
    await AppiumDriver.closeDriver();
    console.log('Tests completed, driver closed');
  });
  
  it('Step 1: Should successfully register a new fake account via UI', async function () {
    // Register a new user using fake data
    const registrationSuccess = await registrationPage.registerNewUser(userData);
    expect(registrationSuccess).to.be.true;
    
    // Verify registration success via UI
    expect(await registrationPage.isRegistrationSuccessful()).to.be.true;
    
    console.log('Successfully registered fake account');
  });
  
  it('Step 2: Should login with the newly created account', async function () {
    // Create login credentials from user data
    const credentials = FakeDataGenerator.generateLoginCredentials(userData);
    
    // Login with the credentials
    const loginSuccess = await loginPage.login(credentials);
    expect(loginSuccess).to.be.true;
    
    // Verify login success
    expect(await loginPage.isLoggedIn()).to.be.true;
    
    console.log('Successfully logged in with fake account');
  });
  
  it('Step 3: Should be able to place a legitimate bet via UI', async function () {
    // Place a legitimate bet via UI
    const betSuccess = await bettingPage.placeCompleteBet(betData);
    expect(betSuccess).to.be.true;
    
    // Verify bet appears in history
    expect(await bettingPage.isBetInHistory(betData.matchId)).to.be.true;
    
    console.log('Successfully placed legitimate bet via UI');
  });
  
  it('Step 4: Should attempt to place fraudulent bet via API and get rejected', async function () {
    // Login via API to get auth token
    const apiLoginResponse = await apiClient.login({
      username: userData.username,
      password: userData.password
    });
    
    // Verify API login success
    expect(apiLoginResponse).to.have.property('token');
    
    // Attempt different types of fraud
    const fraudTypes = [
      'negative-amount',
      'odds-manipulation',
      'match-alteration',
      'timestamp-manipulation',
      'request-tampering'
    ];
    
    for (const fraudType of fraudTypes) {
      console.log(`Attempting fraud type: ${fraudType}`);
      
      // Attempt fraudulent bet via API
      const fraudResult = await apiClient.placeFraudulentBet(betData, fraudType);
      
      // Verify fraud was detected (API should reject the bet)
      expect(fraudResult.success).to.be.false;
      expect(fraudResult.fraudDetected).to.be.true;
      
      console.log(`Fraud properly detected: ${fraudType}`);
    }
  });
  
  it('Step 5: Should verify that fraudulent bets are not shown in bet history', async function () {
    // Navigate to bet history
    await bettingPage.navigateToBetHistory();
    
    // Get all bets from history
    const bets = await bettingPage.getAllBets();
    
    // We should only see our one legitimate bet
    expect(bets.length).to.equal(1);
    
    // The bet should match our legitimate bet's match ID
    expect(bets[0].matchId).to.include(betData.matchId);
    
    console.log('Verified that fraudulent bets are not in bet history');
  });
  
  it('Step 6: Should verify that account is flagged or restricted after fraud attempts', async function () {
    // Check account status
    await accountStatusPage.refreshStatus();
    
    // Account should have flags or warnings
    const hasFlags = await accountStatusPage.hasFlags();
    const hasFraudWarnings = await accountStatusPage.hasFraudWarnings();
    const isBlocked = await accountStatusPage.isAccountBlocked();
    
    // Should either have flags, warnings, or be completely blocked
    expect(hasFlags || hasFraudWarnings || isBlocked).to.be.true;
    
    if (hasFlags) {
      const flags = await accountStatusPage.getFlags();
      console.log('Account flags:', flags);
    }
    
    if (isBlocked) {
      console.log('Account was blocked due to fraud detection');
    } else if (hasFraudWarnings) {
      console.log('Account has fraud warnings/restrictions');
    }
  });
});
