/**
 * Appium configuration for mobile automation testing
 */
require('dotenv').config();

const baseConfig = {
  platformName: process.env.PLATFORM_NAME || 'Android',
  automationName: process.env.AUTOMATION_NAME || 'UiAutomator2',
  deviceName: process.env.DEVICE_NAME || 'Android Emulator',
  app: process.env.APP_PATH || './app/betting-app.apk',
  newCommandTimeout: 180,
  noReset: false,
  fullReset: true
};

const iosConfig = {
  ...baseConfig,
  platformName: 'iOS',
  automationName: 'XCUITest',
  deviceName: process.env.IOS_DEVICE_NAME || 'iPhone Simulator',
  platformVersion: process.env.IOS_PLATFORM_VERSION || '15.0',
  app: process.env.IOS_APP_PATH || './app/betting-app.app'
};

const androidConfig = {
  ...baseConfig,
  platformName: 'Android',
  automationName: 'UiAutomator2',
  deviceName: process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
  platformVersion: process.env.ANDROID_PLATFORM_VERSION || '11.0',
  appPackage: process.env.APP_PACKAGE || 'com.example.bettingapp',
  appActivity: process.env.APP_ACTIVITY || 'com.example.bettingapp.MainActivity'
};

module.exports = {
  baseConfig,
  iosConfig,
  androidConfig,
  getConfig: (platform) => {
    switch (platform.toLowerCase()) {
      case 'ios':
        return iosConfig;
      case 'android':
      default:
        return androidConfig;
    }
  }
};
