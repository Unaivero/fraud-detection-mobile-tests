# Complete Setup Guide for Fraud Detection Mobile Tests

This guide provides step-by-step instructions to set up and run the fraud detection mobile testing framework.

## Prerequisites

### System Requirements
- **Node.js**: Version 18 or higher
- **Java**: Version 11 or higher (for Android testing)
- **Xcode**: Latest version (for iOS testing on macOS)
- **Android SDK**: Latest version
- **Git**: For version control

### Platform-Specific Requirements

#### For Android Testing
- Android SDK with platform-tools
- Android emulator or physical device
- USB debugging enabled (for physical devices)

#### For iOS Testing (macOS only)
- Xcode with iOS Simulator
- iOS development certificate (for physical devices)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd fraud-detection-mobile-tests

# Install Node.js dependencies
npm install

# Install global dependencies
npm install -g appium@2.0.0
npm install -g allure-commandline
```

### 2. Install Appium Drivers

```bash
# Install required Appium drivers
appium driver install uiautomator2  # For Android
appium driver install xcuitest      # For iOS

# Verify installation
appium driver list --installed
```

### 3. Setup Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env  # or your preferred editor
```

### 4. Configure Mobile App Binaries

Follow the detailed guide in [`app/README.md`](./app/README.md) to:
- Download or build your betting app binaries
- Place them in the `app/` directory
- Validate the app packages

### 5. Setup Android Environment (if testing Android)

```bash
# Set ANDROID_HOME environment variable
export ANDROID_HOME=/path/to/android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools

# Create Android emulator (optional)
avdmanager create avd -n test_emulator -k "system-images;android-30;google_apis;x86_64"

# Start emulator
emulator -avd test_emulator
```

### 6. Setup iOS Environment (if testing iOS on macOS)

```bash
# List available iOS simulators
xcrun simctl list devices

# Boot a simulator (optional)
xcrun simctl boot "iPhone 14"
```

## Running Tests

### Method 1: Quick Start (with Mock Server)

```bash
# Start mock API server
npm run start-server

# In another terminal, start Appium server
appium --address 0.0.0.0 --port 4723

# In a third terminal, run tests
npm test
```

### Method 2: Using Docker (Recommended for CI/CD)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run specific services
docker-compose up mock-api appium-server

# Run tests in Docker
docker-compose run fraud-tests npm test
```

### Method 3: Manual Step-by-Step

1. **Start Appium Server**:
   ```bash
   appium --address 0.0.0.0 --port 4723 --relaxed-security
   ```

2. **Start Mock API Server** (if using mock environment):
   ```bash
   node src/mockServer/server.js
   ```

3. **Start Mobile Device/Emulator**:
   ```bash
   # Android
   emulator -avd test_emulator
   
   # iOS
   xcrun simctl boot "iPhone 14"
   ```

4. **Run Tests**:
   ```bash
   # All tests
   npm test
   
   # Specific platform
   PLATFORM=android npm test
   PLATFORM=ios npm test
   
   # With custom environment
   API_BASE_URL=https://staging.api.example.com npm test
   ```

## Verification Steps

### 1. Verify Appium Installation
```bash
appium doctor
```

### 2. Verify Mobile Device Connection
```bash
# Android
adb devices

# iOS
xcrun simctl list devices
```

### 3. Test Basic Connectivity
```bash
# Test Appium server
curl http://localhost:4723/wd/hub/status

# Test mock API server
curl http://localhost:3000/health
```

### 4. Run Sample Test
```bash
# Run a single test file
npx mocha tests/fraud-detection.test.js --timeout 60000
```

## Configuration Options

### Environment Variables

Key variables to configure in your `.env` file:

```bash
# Platform Selection
PLATFORM=android                    # android, ios, or both

# Appium Configuration
APPIUM_HOST=localhost
APPIUM_PORT=4723

# API Configuration
API_BASE_URL=http://localhost:3000   # Mock server
# API_BASE_URL=https://staging.api.example.com  # Real environment

# Android Settings
APP_PATH=./app/betting-app.apk
APP_PACKAGE=com.example.bettingapp
APP_ACTIVITY=com.example.bettingapp.MainActivity

# iOS Settings
IOS_APP_PATH=./app/betting-app.app
IOS_DEVICE_NAME=iPhone 14
IOS_PLATFORM_VERSION=16.4

# Test Configuration
TEST_TIMEOUT=120000
MAX_RETRIES=3
SCREENSHOT_ON_FAILURE=true
LOG_LEVEL=info
```

### Custom Test Scenarios

You can customize which fraud detection tests to run:

```bash
# Enable specific fraud tests
ENABLED_FRAUD_TESTS=negative-amount,odds-manipulation,timestamp-manipulation

# Set fraud detection sensitivity
FRAUD_DETECTION_LEVEL=high
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Appium Driver Issues
```bash
# Problem: UiAutomator2 driver not found
# Solution: Reinstall driver
appium driver uninstall uiautomator2
appium driver install uiautomator2
```

#### 2. Android Emulator Issues
```bash
# Problem: Emulator won't start
# Solution: Check ANDROID_HOME and restart ADB
export ANDROID_HOME=/path/to/android/sdk
adb kill-server
adb start-server
```

#### 3. iOS Simulator Issues
```bash
# Problem: Simulator won't boot
# Solution: Reset simulator
xcrun simctl erase all
xcrun simctl boot "iPhone 14"
```

#### 4. App Installation Issues
```bash
# Problem: App won't install
# Solution: Check app signature and permissions
# Android
adb install -r app/betting-app.apk

# iOS
xcrun simctl install booted app/betting-app.app
```

#### 5. Network/API Issues
```bash
# Problem: Tests can't connect to API
# Solution: Check API server and network configuration
curl -v http://localhost:3000/health
netstat -an | grep 3000
```

#### 6. Test Timeout Issues
```bash
# Problem: Tests timeout frequently
# Solution: Increase timeout values
export TEST_TIMEOUT=300000  # 5 minutes
export MAX_RETRIES=5
```

### Debug Mode

Run tests in debug mode for detailed logging:

```bash
# Enable debug logging
LOG_LEVEL=debug npm test

# Run with Node.js debugger
node --inspect-brk node_modules/.bin/mocha tests/fraud-detection.test.js

# Run single test with verbose output
npx mocha tests/fraud-detection.test.js --reporter spec --timeout 0
```

### Log Analysis

Check logs for troubleshooting:

```bash
# View test execution logs
tail -f logs/test-execution.log

# View Appium server logs
tail -f appium.log

# View mock server logs
tail -f mock-server.log
```

## Continuous Integration

### GitHub Actions

The project includes GitHub Actions workflow in `.github/workflows/fraud-detection-tests.yml`.

To enable:
1. Push code to GitHub repository
2. Configure repository secrets:
   - `SLACK_WEBHOOK_URL` (optional)
3. Workflow runs automatically on push/PR

### Jenkins

The project includes Jenkinsfile for Jenkins CI/CD.

To enable:
1. Create new Pipeline job in Jenkins
2. Point to repository with Jenkinsfile
3. Configure build parameters
4. Run pipeline

### Local CI Testing

Test CI configuration locally using Docker:

```bash
# Test GitHub Actions locally with act
act -j android-tests

# Test Docker builds
docker-compose -f docker-compose.yml up --build
```

## Reporting

### Generate Test Reports

```bash
# Generate Allure report
npm run report

# View report
allure open allure-report
```

### View Logs and Screenshots

```bash
# View structured logs
cat logs/test-execution.log | jq '.'

# View screenshots
ls -la screenshots/

# View test artifacts
ls -la allure-results/
```

## Advanced Configuration

### Custom Test Data

Modify test data generation in `src/utils/fakeDataGenerator.js`.

### Custom Page Objects

Extend page objects in `src/pageObjects/` for app-specific elements.

### Custom Fraud Scenarios

Add new fraud detection patterns in `src/utils/apiClient.js`.

### Performance Monitoring

Enable performance monitoring:

```bash
# Add performance logging
ENABLE_PERFORMANCE_MONITORING=true npm test
```

## Security Considerations

- Never commit real app binaries to version control
- Use test accounts and test data only
- Regularly update dependencies for security patches
- Use environment variables for sensitive configuration
- Enable audit logging in production environments

## Getting Help

1. **Check logs**: Most issues can be diagnosed from log files
2. **Review documentation**: Check README files in subdirectories
3. **Validate configuration**: Ensure all environment variables are set
4. **Test connectivity**: Verify all services are running and accessible
5. **Check versions**: Ensure all tools are using compatible versions

For additional support, refer to the official documentation:
- [Appium Documentation](https://appium.io/docs/en/about-appium/intro/)
- [WebdriverIO Documentation](https://webdriver.io/)
- [Docker Documentation](https://docs.docker.com/)

## Next Steps

After successful setup:
1. Run the full test suite to establish baseline
2. Integrate with your CI/CD pipeline
3. Customize tests for your specific app requirements
4. Set up monitoring and alerting
5. Train team members on the framework