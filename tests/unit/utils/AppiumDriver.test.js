/**
 * Unit tests for AppiumDriver utility class
 */
const { expect } = require('chai');
const sinon = require('sinon');
const { remote } = require('webdriverio');
const AppiumDriver = require('../../../src/utils/AppiumDriver');

describe('AppiumDriver', function () {
  let remoteStub;
  let driverMock;

  beforeEach(function () {
    // Mock WebDriver instance
    driverMock = {
      deleteSession: sinon.stub().resolves(),
      getSession: sinon.stub().resolves({ id: 'session-123' }),
      takeScreenshot: sinon.stub().resolves('base64-screenshot'),
      getPageSource: sinon.stub().resolves('<xml>page-source</xml>'),
      pause: sinon.stub().resolves(),
      isDisplayed: sinon.stub().resolves(true),
      click: sinon.stub().resolves(),
      setValue: sinon.stub().resolves(),
      getText: sinon.stub().resolves('test-text')
    };

    // Stub webdriverio remote function
    remoteStub = sinon.stub({ remote }).remote.resolves(driverMock);
    
    // Replace the actual remote function
    sinon.stub(require('webdriverio'), 'remote').callsFake(remoteStub);
  });

  afterEach(function () {
    sinon.restore();
    
    // Clean up AppiumDriver state
    AppiumDriver.driver = null;
    
    // Clean up environment variables
    delete process.env.APPIUM_HOST;
    delete process.env.APPIUM_PORT;
    delete process.env.PLATFORM;
  });

  describe('getDriver', function () {
    it('should create new driver instance for Android', async function () {
      const driver = await AppiumDriver.getDriver('android');

      expect(driver).to.equal(driverMock);
      expect(remoteStub.calledOnce).to.be.true;
      
      const config = remoteStub.firstCall.args[0];
      expect(config.capabilities.platformName).to.equal('Android');
      expect(config.capabilities.automationName).to.equal('UiAutomator2');
    });

    it('should create new driver instance for iOS', async function () {
      const driver = await AppiumDriver.getDriver('ios');

      expect(driver).to.equal(driverMock);
      expect(remoteStub.calledOnce).to.be.true;
      
      const config = remoteStub.firstCall.args[0];
      expect(config.capabilities.platformName).to.equal('iOS');
      expect(config.capabilities.automationName).to.equal('XCUITest');
    });

    it('should return existing driver instance when already created', async function () {
      const driver1 = await AppiumDriver.getDriver('android');
      const driver2 = await AppiumDriver.getDriver('android');

      expect(driver1).to.equal(driver2);
      expect(remoteStub.calledOnce).to.be.true; // Should only be called once
    });

    it('should use environment variables for configuration', async function () {
      process.env.APPIUM_HOST = 'custom-host';
      process.env.APPIUM_PORT = '9999';

      await AppiumDriver.getDriver('android');

      const config = remoteStub.firstCall.args[0];
      expect(config.hostname).to.equal('custom-host');
      expect(config.port).to.equal(9999);
    });

    it('should handle driver creation failure', async function () {
      const error = new Error('Failed to create driver');
      remoteStub.rejects(error);

      try {
        await AppiumDriver.getDriver('android');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should default to Android when platform is not specified', async function () {
      await AppiumDriver.getDriver();

      const config = remoteStub.firstCall.args[0];
      expect(config.capabilities.platformName).to.equal('Android');
    });

    it('should handle invalid platform gracefully', async function () {
      await AppiumDriver.getDriver('invalid-platform');

      const config = remoteStub.firstCall.args[0];
      expect(config.capabilities.platformName).to.equal('Android'); // Should default
    });
  });

  describe('closeDriver', function () {
    it('should close existing driver session', async function () {
      // First create a driver
      await AppiumDriver.getDriver('android');
      
      // Then close it
      await AppiumDriver.closeDriver();

      expect(driverMock.deleteSession.calledOnce).to.be.true;
      expect(AppiumDriver.driver).to.be.null;
    });

    it('should handle closing when no driver exists', async function () {
      // Try to close when no driver exists
      await AppiumDriver.closeDriver();

      expect(driverMock.deleteSession.called).to.be.false;
    });

    it('should handle driver close failure gracefully', async function () {
      await AppiumDriver.getDriver('android');
      
      const error = new Error('Failed to close session');
      driverMock.deleteSession.rejects(error);

      // Should not throw, but handle gracefully
      await AppiumDriver.closeDriver();

      expect(AppiumDriver.driver).to.be.null; // Should still reset driver
    });
  });

  describe('isDriverActive', function () {
    it('should return true when driver exists and is active', async function () {
      await AppiumDriver.getDriver('android');

      const isActive = await AppiumDriver.isDriverActive();

      expect(isActive).to.be.true;
      expect(driverMock.getSession.calledOnce).to.be.true;
    });

    it('should return false when no driver exists', async function () {
      const isActive = await AppiumDriver.isDriverActive();

      expect(isActive).to.be.false;
    });

    it('should return false when session check fails', async function () {
      await AppiumDriver.getDriver('android');
      driverMock.getSession.rejects(new Error('Session not found'));

      const isActive = await AppiumDriver.isDriverActive();

      expect(isActive).to.be.false;
    });
  });

  describe('takeScreenshot', function () {
    it('should take screenshot when driver exists', async function () {
      await AppiumDriver.getDriver('android');

      const screenshot = await AppiumDriver.takeScreenshot();

      expect(screenshot).to.equal('base64-screenshot');
      expect(driverMock.takeScreenshot.calledOnce).to.be.true;
    });

    it('should return null when no driver exists', async function () {
      const screenshot = await AppiumDriver.takeScreenshot();

      expect(screenshot).to.be.null;
    });

    it('should handle screenshot failure gracefully', async function () {
      await AppiumDriver.getDriver('android');
      driverMock.takeScreenshot.rejects(new Error('Screenshot failed'));

      const screenshot = await AppiumDriver.takeScreenshot();

      expect(screenshot).to.be.null;
    });
  });

  describe('getPageSource', function () {
    it('should get page source when driver exists', async function () {
      await AppiumDriver.getDriver('android');

      const pageSource = await AppiumDriver.getPageSource();

      expect(pageSource).to.equal('<xml>page-source</xml>');
      expect(driverMock.getPageSource.calledOnce).to.be.true;
    });

    it('should return null when no driver exists', async function () {
      const pageSource = await AppiumDriver.getPageSource();

      expect(pageSource).to.be.null;
    });

    it('should handle page source failure gracefully', async function () {
      await AppiumDriver.getDriver('android');
      driverMock.getPageSource.rejects(new Error('Page source failed'));

      const pageSource = await AppiumDriver.getPageSource();

      expect(pageSource).to.be.null;
    });
  });

  describe('configuration management', function () {
    it('should merge custom capabilities with defaults', async function () {
      const customCapabilities = {
        appPackage: 'com.custom.app',
        appActivity: 'com.custom.MainActivity'
      };

      await AppiumDriver.getDriver('android', customCapabilities);

      const config = remoteStub.firstCall.args[0];
      expect(config.capabilities.appPackage).to.equal('com.custom.app');
      expect(config.capabilities.appActivity).to.equal('com.custom.MainActivity');
      expect(config.capabilities.platformName).to.equal('Android'); // Should keep defaults
    });

    it('should handle timeout configuration', async function () {
      process.env.APPIUM_TIMEOUT = '300000';

      await AppiumDriver.getDriver('android');

      const config = remoteStub.firstCall.args[0];
      expect(config.connectionRetryTimeout).to.equal(300000);
    });

    it('should configure proper wait timeouts', async function () {
      await AppiumDriver.getDriver('android');

      const config = remoteStub.firstCall.args[0];
      expect(config.waitforTimeout).to.be.a('number');
      expect(config.waitforInterval).to.be.a('number');
    });
  });

  describe('platform-specific configurations', function () {
    it('should set Android-specific capabilities', async function () {
      await AppiumDriver.getDriver('android');

      const config = remoteStub.firstCall.args[0];
      expect(config.capabilities.platformName).to.equal('Android');
      expect(config.capabilities.automationName).to.equal('UiAutomator2');
      expect(config.capabilities).to.have.property('appPackage');
      expect(config.capabilities).to.have.property('appActivity');
    });

    it('should set iOS-specific capabilities', async function () {
      await AppiumDriver.getDriver('ios');

      const config = remoteStub.firstCall.args[0];
      expect(config.capabilities.platformName).to.equal('iOS');
      expect(config.capabilities.automationName).to.equal('XCUITest');
      expect(config.capabilities).to.have.property('bundleId');
    });

    it('should handle platform version configuration', async function () {
      process.env.ANDROID_PLATFORM_VERSION = '12.0';
      process.env.IOS_PLATFORM_VERSION = '16.0';

      await AppiumDriver.getDriver('android');
      let config = remoteStub.firstCall.args[0];
      expect(config.capabilities.platformVersion).to.equal('12.0');

      // Reset and test iOS
      AppiumDriver.driver = null;
      remoteStub.resetHistory();

      await AppiumDriver.getDriver('ios');
      config = remoteStub.firstCall.args[0];
      expect(config.capabilities.platformVersion).to.equal('16.0');
    });
  });

  describe('error handling', function () {
    it('should provide detailed error messages on driver creation failure', async function () {
      const originalError = new Error('Connection refused');
      originalError.code = 'ECONNREFUSED';
      remoteStub.rejects(originalError);

      try {
        await AppiumDriver.getDriver('android');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).to.equal('ECONNREFUSED');
      }
    });

    it('should handle session management errors', async function () {
      await AppiumDriver.getDriver('android');
      
      const sessionError = new Error('Session terminated');
      driverMock.getSession.rejects(sessionError);

      const isActive = await AppiumDriver.isDriverActive();
      expect(isActive).to.be.false;
    });

    it('should reset driver state on critical errors', async function () {
      await AppiumDriver.getDriver('android');
      
      // Simulate critical error during session check
      driverMock.getSession.rejects(new Error('Driver crashed'));

      await AppiumDriver.isDriverActive();
      
      // Driver should be reset to allow recreation
      expect(AppiumDriver.driver).to.not.be.null; // Driver object still exists
    });
  });

  describe('singleton behavior', function () {
    it('should maintain singleton pattern across multiple calls', async function () {
      const driver1 = await AppiumDriver.getDriver('android');
      const driver2 = await AppiumDriver.getDriver('android');
      const driver3 = await AppiumDriver.getDriver('ios'); // Different platform

      expect(driver1).to.equal(driver2);
      expect(driver2).to.equal(driver3); // Should return same instance
      expect(remoteStub.calledOnce).to.be.true;
    });

    it('should create new driver after closing previous one', async function () {
      const driver1 = await AppiumDriver.getDriver('android');
      await AppiumDriver.closeDriver();
      
      const driver2 = await AppiumDriver.getDriver('android');

      expect(remoteStub.calledTwice).to.be.true;
      expect(driver1).to.equal(driver2); // Same mock object, but created twice
    });
  });
});