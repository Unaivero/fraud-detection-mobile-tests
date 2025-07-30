/**
 * Unit tests for ApiClient utility class
 */
const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const ApiClient = require('../../../src/utils/apiClient');

describe('ApiClient', function () {
  let apiClient;
  let axiosStub;

  beforeEach(function () {
    // Create axios stub
    axiosStub = {
      create: sinon.stub().returns({
        post: sinon.stub(),
        get: sinon.stub(),
        defaults: { headers: { common: {} } },
        interceptors: {
          response: {
            use: sinon.stub()
          }
        }
      })
    };

    // Stub axios.create
    sinon.stub(axios, 'create').returns(axiosStub.create());
    
    apiClient = new ApiClient('https://test-api.example.com');
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('constructor', function () {
    it('should initialize with default base URL when none provided', function () {
      const client = new ApiClient();
      expect(client).to.be.instanceOf(ApiClient);
      expect(axios.create.calledOnce).to.be.true;
    });

    it('should initialize with provided base URL', function () {
      const baseURL = 'https://custom-api.example.com';
      const client = new ApiClient(baseURL);
      
      expect(client).to.be.instanceOf(ApiClient);
      expect(axios.create.calledWith(sinon.match({
        baseURL: baseURL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }))).to.be.true;
    });

    it('should include auth token in headers when provided', function () {
      const token = 'test-token-123';
      const client = new ApiClient('https://test.com', token);
      
      expect(client).to.be.instanceOf(ApiClient);
      expect(axios.create.calledWith(sinon.match({
        headers: sinon.match({
          Authorization: `Bearer ${token}`
        })
      }))).to.be.true;
    });
  });

  describe('setAuthToken', function () {
    it('should set authorization header', function () {
      const token = 'new-token-456';
      apiClient.setAuthToken(token);
      
      expect(apiClient.client.defaults.headers.common.Authorization).to.equal(`Bearer ${token}`);
    });
  });

  describe('registerUser', function () {
    it('should successfully register a user', async function () {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const expectedResponse = { success: true, userId: '12345' };
      apiClient.client.post.resolves({ data: expectedResponse });

      const result = await apiClient.registerUser(userData);

      expect(apiClient.client.post.calledWith('/auth/register', userData)).to.be.true;
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should handle registration failure', async function () {
      const userData = { username: 'testuser' };
      const error = new Error('Registration failed');
      error.response = { data: { message: 'User already exists' } };
      
      apiClient.client.post.rejects(error);

      try {
        await apiClient.registerUser(userData);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('login', function () {
    it('should successfully login and set auth token', async function () {
      const credentials = { username: 'testuser', password: 'password123' };
      const expectedResponse = { token: 'auth-token-789', user: { id: '123' } };
      
      apiClient.client.post.resolves({ data: expectedResponse });

      const result = await apiClient.login(credentials);

      expect(apiClient.client.post.calledWith('/auth/login', credentials)).to.be.true;
      expect(result).to.deep.equal(expectedResponse);
      expect(apiClient.client.defaults.headers.common.Authorization).to.equal('Bearer auth-token-789');
    });

    it('should handle login failure', async function () {
      const credentials = { username: 'invalid', password: 'wrong' };
      const error = new Error('Login failed');
      error.response = { data: { message: 'Invalid credentials' } };
      
      apiClient.client.post.rejects(error);

      try {
        await apiClient.login(credentials);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('placeBet', function () {
    it('should successfully place a legitimate bet', async function () {
      const betData = {
        matchId: 'match-123',
        amount: 50,
        odds: '2.5',
        selection: 'home'
      };
      
      const expectedResponse = { success: true, betId: 'bet-456' };
      apiClient.client.post.resolves({ data: expectedResponse });

      const result = await apiClient.placeBet(betData);

      expect(apiClient.client.post.calledWith('/bets/place', betData)).to.be.true;
      expect(result).to.deep.equal(expectedResponse);
    });
  });

  describe('placeFraudulentBet', function () {
    let legitimateBetData;

    beforeEach(function () {
      legitimateBetData = {
        matchId: 'match-123',
        amount: 50,
        odds: '2.5',
        selection: 'home',
        timestamp: new Date().toISOString()
      };
    });

    it('should modify bet data for negative-amount fraud', async function () {
      const error = new Error('Bet rejected');
      error.response = { status: 400, data: { message: 'Invalid amount' } };
      apiClient.client.post.rejects(error);

      const result = await apiClient.placeFraudulentBet(legitimateBetData, 'negative-amount');

      expect(result.success).to.be.false;
      expect(result.fraudDetected).to.be.true;
      expect(result.statusCode).to.equal(400);
      
      // Verify the API was called with negative amount
      const callArgs = apiClient.client.post.getCall(0).args;
      expect(callArgs[1].amount).to.be.below(0);
    });

    it('should modify bet data for odds-manipulation fraud', async function () {
      const error = new Error('Bet rejected');
      error.response = { status: 400, data: { message: 'Invalid odds' } };
      apiClient.client.post.rejects(error);

      const result = await apiClient.placeFraudulentBet(legitimateBetData, 'odds-manipulation');

      expect(result.success).to.be.false;
      expect(result.fraudDetected).to.be.true;
      
      // Verify the API was called with manipulated odds
      const callArgs = apiClient.client.post.getCall(0).args;
      expect(parseFloat(callArgs[1].odds)).to.be.above(parseFloat(legitimateBetData.odds));
    });

    it('should modify bet data for match-alteration fraud', async function () {
      const error = new Error('Bet rejected');
      error.response = { status: 404, data: { message: 'Match not found' } };
      apiClient.client.post.rejects(error);

      const result = await apiClient.placeFraudulentBet(legitimateBetData, 'match-alteration');

      expect(result.success).to.be.false;
      expect(result.fraudDetected).to.be.true;
      
      // Verify the API was called with altered match ID
      const callArgs = apiClient.client.post.getCall(0).args;
      expect(callArgs[1].matchId).to.include('-altered');
    });

    it('should modify bet data for timestamp-manipulation fraud', async function () {
      const error = new Error('Bet rejected');
      error.response = { status: 400, data: { message: 'Invalid timestamp' } };
      apiClient.client.post.rejects(error);

      const result = await apiClient.placeFraudulentBet(legitimateBetData, 'timestamp-manipulation');

      expect(result.success).to.be.false;
      expect(result.fraudDetected).to.be.true;
      
      // Verify the API was called with past timestamp
      const callArgs = apiClient.client.post.getCall(0).args;
      const callTimestamp = new Date(callArgs[1].timestamp);
      const yesterday = new Date(Date.now() - 86400000);
      expect(callTimestamp.getTime()).to.be.closeTo(yesterday.getTime(), 1000);
    });

    it('should add tampering fields for request-tampering fraud', async function () {
      const error = new Error('Bet rejected');
      error.response = { status: 400, data: { message: 'Unauthorized fields' } };
      apiClient.client.post.rejects(error);

      const result = await apiClient.placeFraudulentBet(legitimateBetData, 'request-tampering');

      expect(result.success).to.be.false;
      expect(result.fraudDetected).to.be.true;
      
      // Verify the API was called with tampering fields
      const callArgs = apiClient.client.post.getCall(0).args;
      expect(callArgs[1].serverBypass).to.be.true;
      expect(callArgs[1].adminApproval).to.be.true;
    });

    it('should warn when fraudulent bet is unexpectedly accepted', async function () {
      const consoleWarnStub = sinon.stub(console, 'warn');
      const expectedResponse = { success: true, betId: 'dangerous-bet' };
      apiClient.client.post.resolves({ data: expectedResponse });

      const result = await apiClient.placeFraudulentBet(legitimateBetData, 'negative-amount');

      expect(result.success).to.be.true;
      expect(result.fraudDetected).to.be.false;
      expect(consoleWarnStub.calledWith('WARNING: Fraudulent bet was accepted by the system!')).to.be.true;
      
      consoleWarnStub.restore();
    });

    it('should handle unknown fraud type with default behavior', async function () {
      const error = new Error('Bet rejected');
      error.response = { status: 400, data: { message: 'Invalid data' } };
      apiClient.client.post.rejects(error);

      const result = await apiClient.placeFraudulentBet(legitimateBetData, 'unknown-fraud-type');

      expect(result.success).to.be.false;
      expect(result.fraudDetected).to.be.true;
      
      // Verify default fraud behavior (negative amount + odds manipulation)
      const callArgs = apiClient.client.post.getCall(0).args;
      expect(callArgs[1].amount).to.be.below(0);
      expect(parseFloat(callArgs[1].odds)).to.be.above(parseFloat(legitimateBetData.odds));
    });
  });

  describe('getBetHistory', function () {
    it('should successfully retrieve bet history', async function () {
      const expectedBets = [
        { id: 'bet-1', amount: 25, status: 'won' },
        { id: 'bet-2', amount: 50, status: 'lost' }
      ];
      
      apiClient.client.get.resolves({ data: expectedBets });

      const result = await apiClient.getBetHistory();

      expect(apiClient.client.get.calledWith('/bets/history')).to.be.true;
      expect(result).to.deep.equal(expectedBets);
    });

    it('should handle bet history retrieval failure', async function () {
      const error = new Error('Access denied');
      error.response = { data: { message: 'Unauthorized' } };
      
      apiClient.client.get.rejects(error);

      try {
        await apiClient.getBetHistory();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('getAccountStatus', function () {
    it('should successfully retrieve account status', async function () {
      const expectedStatus = {
        accountId: '123',
        status: 'active',
        flags: [],
        restrictions: []
      };
      
      apiClient.client.get.resolves({ data: expectedStatus });

      const result = await apiClient.getAccountStatus();

      expect(apiClient.client.get.calledWith('/users/account-status')).to.be.true;
      expect(result).to.deep.equal(expectedStatus);
    });

    it('should handle account status retrieval failure', async function () {
      const error = new Error('Service unavailable');
      error.response = { data: { message: 'Server error' } };
      
      apiClient.client.get.rejects(error);

      try {
        await apiClient.getAccountStatus();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });
});