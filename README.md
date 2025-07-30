# Fraud Detection Mobile Tests

A hybrid mobile automation project using **JavaScript**, **Appium for UI testing**, and **Axios for API interaction** to test fraud detection mechanisms in a mobile betting app.

## Project Overview

This project demonstrates a complete end-to-end testing approach for fraud detection in a betting app by combining UI automation with direct API calls to simulate and validate security measures.

### Testing Approach

1. **UI Automation**: Uses Appium to create a fake user account through the mobile app UI
2. **API Manipulation**: Makes direct API calls to attempt fraudulent bet placement with manipulated parameters
3. **Validation**: Returns to the UI to verify that fraudulent attempts are properly detected, rejected, and flagged

### Fraud Simulation Techniques

- **Negative Bet Amounts**: Attempts to place bets with negative amounts
- **Odds Manipulation**: Alters odds values to gain unfair advantage
- **Match ID Alteration**: Manipulates match identifiers to place bets on non-existent matches
- **Timestamp Manipulation**: Backdates bet requests to place bets on past events
- **Request Tampering**: Adds unauthorized fields to bypass security checks

## Project Structure

```
fraud-detection-mobile-tests/
├── config/                     # Configuration files
│   └── appium.config.js        # Appium configuration
├── src/
│   ├── mockServer/            # Mock API server for testing
│   │   └── server.js          # Express server implementation
│   ├── pageObjects/           # Page Object Model implementation
│   │   ├── AccountStatusPage.js
│   │   ├── BasePage.js
│   │   ├── BettingPage.js
│   │   ├── LoginPage.js
│   │   └── RegistrationPage.js
│   └── utils/                 # Utility classes
│       ├── apiClient.js       # API client for backend interaction
│       ├── AppiumDriver.js    # Driver initialization and management
│       └── fakeDataGenerator.js # Fake data generation with faker.js
├── tests/                     # Test cases
│   └── fraud-detection.test.js # Main test suite
├── app/                       # Place for mobile app binaries
├── .env.example               # Environment variables template
├── package.json               # Project dependencies
└── README.md                  # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- Appium Server (v2.0+)
- Android SDK (for Android testing)
- Xcode (for iOS testing)
- A mobile emulator or physical device

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the environment file and configure it:
   ```
   cp .env.example .env
   ```
4. Modify the `.env` file with your specific settings

### Running the Tests

#### Start the mock API server (if not using a real backend):
```
node src/mockServer/server.js
```

#### Run all tests:
```
npm run test:all
```

#### Run unit tests only:
```
npm run test:unit
```

#### Run integration tests only:
```
npm run test:integration
```

#### Run tests with coverage report:
```
npm run test:coverage
```

#### Watch unit tests during development:
```
npm run test:watch
```

#### Generate test report:
```
npm run report
```

#### View coverage report:
```
npm run coverage:report
```

## Test Types

### Unit Tests
The project includes comprehensive unit tests for all utility classes:

- **ApiClient**: Tests API interactions, fraud detection scenarios, and error handling
- **FakeDataGenerator**: Tests data generation, validation, and consistency
- **ErrorHandler**: Tests retry logic, exponential backoff, and error enhancement
- **Logger**: Tests logging levels, file operations, and performance tracking
- **AppiumDriver**: Tests driver management, configuration, and singleton behavior
- **MockServer**: Tests API endpoints, authentication, and fraud detection

### Integration Tests
The main fraud detection test suite validates end-to-end scenarios:

1. A fake user account can be successfully created through the UI
2. The user can place legitimate bets through the UI
3. Fraudulent bet attempts via the API are properly rejected
4. The betting app does not register fraudulent bets in the bet history
5. The user account is flagged or blocked after fraudulent activity

## Test Coverage

The project maintains high test coverage standards:
- **Lines**: 80% minimum
- **Functions**: 80% minimum  
- **Branches**: 70% minimum
- **Statements**: 80% minimum

Run `npm run test:coverage` to generate detailed coverage reports.

## Customization

- To test against a real API instead of the mock server, update the `API_BASE_URL` in your `.env` file
- To test on different devices, update the device configurations in your `.env` file
- To add new fraud scenarios, extend the `placeFraudulentBet` method in the ApiClient class

## Tech Stack

- **Appium**: Mobile UI automation
- **WebdriverIO**: Driver interface
- **Axios**: API requests
- **Faker.js**: Synthetic test data generation
- **Mocha/Chai**: Test framework and assertions
- **Express.js**: Mock API server
- **Allure**: Test reporting
