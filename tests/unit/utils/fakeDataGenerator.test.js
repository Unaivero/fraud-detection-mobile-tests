/**
 * Unit tests for FakeDataGenerator utility class
 */
const { expect } = require('chai');
const { faker } = require('@faker-js/faker');
const FakeDataGenerator = require('../../../src/utils/fakeDataGenerator');

describe('FakeDataGenerator', function () {
  let originalSeed;

  beforeEach(function () {
    // Store original seed and set a consistent seed for testing
    originalSeed = faker.seed();
    faker.seed(12345);
  });

  afterEach(function () {
    // Restore original seed
    if (originalSeed) {
      faker.seed(originalSeed);
    }
  });

  describe('generateUserData', function () {
    it('should generate valid user data with all required fields', function () {
      const userData = FakeDataGenerator.generateUserData();

      expect(userData).to.have.property('username');
      expect(userData).to.have.property('email');
      expect(userData).to.have.property('password');
      expect(userData).to.have.property('firstName');
      expect(userData).to.have.property('lastName');
      expect(userData).to.have.property('dateOfBirth');
      expect(userData).to.have.property('phoneNumber');
      expect(userData).to.have.property('address');

      // Validate data types and formats
      expect(userData.username).to.be.a('string');
      expect(userData.email).to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(userData.password).to.be.a('string');
      expect(userData.firstName).to.be.a('string');
      expect(userData.lastName).to.be.a('string');
      expect(userData.phoneNumber).to.be.a('string');
      
      // Validate date of birth is in the past and user is adult
      const dob = new Date(userData.dateOfBirth);
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      expect(dob).to.be.below(eighteenYearsAgo);

      // Validate address structure
      expect(userData.address).to.have.property('street');
      expect(userData.address).to.have.property('city');
      expect(userData.address).to.have.property('state');
      expect(userData.address).to.have.property('zipCode');
      expect(userData.address).to.have.property('country');
    });

    it('should generate unique usernames on multiple calls', function () {
      const userData1 = FakeDataGenerator.generateUserData();
      const userData2 = FakeDataGenerator.generateUserData();

      expect(userData1.username).to.not.equal(userData2.username);
      expect(userData1.email).to.not.equal(userData2.email);
    });

    it('should generate passwords with minimum security requirements', function () {
      const userData = FakeDataGenerator.generateUserData();

      expect(userData.password.length).to.be.at.least(8);
      expect(userData.password).to.match(/[A-Z]/); // At least one uppercase
      expect(userData.password).to.match(/[a-z]/); // At least one lowercase
      expect(userData.password).to.match(/[0-9]/); // At least one digit
    });

    it('should respect locale configuration when set', function () {
      process.env.FAKE_DATA_LOCALE = 'es';
      
      const userData = FakeDataGenerator.generateUserData();
      
      expect(userData.firstName).to.be.a('string');
      expect(userData.lastName).to.be.a('string');
      
      // Clean up
      delete process.env.FAKE_DATA_LOCALE;
    });
  });

  describe('generateBetData', function () {
    it('should generate valid bet data with all required fields', function () {
      const betData = FakeDataGenerator.generateBetData();

      expect(betData).to.have.property('matchId');
      expect(betData).to.have.property('amount');
      expect(betData).to.have.property('odds');
      expect(betData).to.have.property('selection');
      expect(betData).to.have.property('betType');
      expect(betData).to.have.property('timestamp');

      // Validate data types and formats
      expect(betData.matchId).to.be.a('string');
      expect(betData.amount).to.be.a('number');
      expect(betData.amount).to.be.above(0);
      expect(betData.odds).to.be.a('string');
      expect(parseFloat(betData.odds)).to.be.above(1.0);
      expect(betData.selection).to.be.oneOf(['home', 'away', 'draw']);
      expect(betData.betType).to.be.oneOf(['single', 'multiple', 'system']);
      
      // Validate timestamp is recent
      const timestamp = new Date(betData.timestamp);
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(timestamp).to.be.above(fiveMinutesAgo);
      expect(timestamp).to.be.below(now);
    });

    it('should generate realistic betting amounts', function () {
      const betData = FakeDataGenerator.generateBetData();

      expect(betData.amount).to.be.at.least(1);
      expect(betData.amount).to.be.at.most(1000);
      expect(betData.amount % 1).to.equal(0); // Should be whole number
    });

    it('should generate realistic odds values', function () {
      const betData = FakeDataGenerator.generateBetData();
      const odds = parseFloat(betData.odds);

      expect(odds).to.be.at.least(1.01);
      expect(odds).to.be.at.most(50.0);
      expect(betData.odds).to.match(/^\d+\.\d{1,2}$/); // Format: X.XX
    });

    it('should generate unique match IDs on multiple calls', function () {
      const betData1 = FakeDataGenerator.generateBetData();
      const betData2 = FakeDataGenerator.generateBetData();

      expect(betData1.matchId).to.not.equal(betData2.matchId);
    });
  });

  describe('generateLoginCredentials', function () {
    it('should extract login credentials from user data', function () {
      const userData = {
        username: 'testuser123',
        password: 'SecurePass123',
        email: 'test@example.com'
      };

      const credentials = FakeDataGenerator.generateLoginCredentials(userData);

      expect(credentials).to.have.property('username', 'testuser123');
      expect(credentials).to.have.property('password', 'SecurePass123');
      expect(credentials).to.not.have.property('email');
    });

    it('should handle missing user data gracefully', function () {
      const credentials = FakeDataGenerator.generateLoginCredentials({});

      expect(credentials).to.have.property('username');
      expect(credentials).to.have.property('password');
      expect(credentials.username).to.be.undefined;
      expect(credentials.password).to.be.undefined;
    });

    it('should only include username and password fields', function () {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890'
      };

      const credentials = FakeDataGenerator.generateLoginCredentials(userData);

      expect(Object.keys(credentials)).to.have.lengthOf(2);
      expect(credentials).to.have.property('username');
      expect(credentials).to.have.property('password');
      expect(credentials).to.not.have.property('email');
      expect(credentials).to.not.have.property('firstName');
    });
  });

  describe('generateRandomString', function () {
    it('should generate string of specified length', function () {
      const length = 10;
      const randomString = FakeDataGenerator.generateRandomString(length);

      expect(randomString).to.be.a('string');
      expect(randomString.length).to.equal(length);
    });

    it('should generate different strings on multiple calls', function () {
      const string1 = FakeDataGenerator.generateRandomString(8);
      const string2 = FakeDataGenerator.generateRandomString(8);

      expect(string1).to.not.equal(string2);
    });

    it('should only contain alphanumeric characters', function () {
      const randomString = FakeDataGenerator.generateRandomString(20);

      expect(randomString).to.match(/^[a-zA-Z0-9]+$/);
    });

    it('should handle edge cases', function () {
      const emptyString = FakeDataGenerator.generateRandomString(0);
      expect(emptyString).to.equal('');

      const singleChar = FakeDataGenerator.generateRandomString(1);
      expect(singleChar.length).to.equal(1);
    });
  });

  describe('seed configuration', function () {
    it('should use environment seed when provided', function () {
      const originalEnvSeed = process.env.FAKE_DATA_SEED;
      process.env.FAKE_DATA_SEED = '99999';

      // Force re-require to pick up new environment variable
      delete require.cache[require.resolve('../../../src/utils/fakeDataGenerator')];
      const FreshFakeDataGenerator = require('../../../src/utils/fakeDataGenerator');

      const userData1 = FreshFakeDataGenerator.generateUserData();
      
      // Reset and generate again with same seed
      process.env.FAKE_DATA_SEED = '99999';
      delete require.cache[require.resolve('../../../src/utils/fakeDataGenerator')];
      const FreshFakeDataGenerator2 = require('../../../src/utils/fakeDataGenerator');
      
      const userData2 = FreshFakeDataGenerator2.generateUserData();

      // With same seed, some data should be predictable
      expect(userData1.firstName).to.equal(userData2.firstName);

      // Restore original environment
      if (originalEnvSeed) {
        process.env.FAKE_DATA_SEED = originalEnvSeed;
      } else {
        delete process.env.FAKE_DATA_SEED;
      }
    });
  });

  describe('data validation', function () {
    it('should generate data that passes basic validation rules', function () {
      const userData = FakeDataGenerator.generateUserData();
      const betData = FakeDataGenerator.generateBetData();

      // User data validation
      expect(userData.username.length).to.be.at.least(3);
      expect(userData.email).to.include('@');
      expect(userData.password.length).to.be.at.least(8);
      expect(userData.phoneNumber).to.match(/[\d\s\-+()]/);

      // Bet data validation
      expect(betData.amount).to.be.a('number');
      expect(betData.amount).to.be.above(0);
      expect(parseFloat(betData.odds)).to.be.above(1);
      expect(['home', 'away', 'draw']).to.include(betData.selection);
    });

    it('should generate consistent data structure across calls', function () {
      const userData1 = FakeDataGenerator.generateUserData();
      const userData2 = FakeDataGenerator.generateUserData();
      const betData1 = FakeDataGenerator.generateBetData();
      const betData2 = FakeDataGenerator.generateBetData();

      // Same structure
      expect(Object.keys(userData1)).to.deep.equal(Object.keys(userData2));
      expect(Object.keys(betData1)).to.deep.equal(Object.keys(betData2));

      // Same data types
      expect(typeof userData1.username).to.equal(typeof userData2.username);
      expect(typeof betData1.amount).to.equal(typeof betData2.amount);
    });
  });
});