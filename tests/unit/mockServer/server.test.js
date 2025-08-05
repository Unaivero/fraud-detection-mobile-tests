/**
 * Unit tests for Mock API Server
 */
const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');

describe('Mock API Server', function () {
  let app;
  let server;
  let consoleStub;

  beforeEach(function () {
    // Stub console.log to avoid noise during tests
    consoleStub = sinon.stub(console, 'log');

    // Create a fresh app instance for each test
    // Clear the require cache to get a fresh instance
    delete require.cache[require.resolve('../../../src/mockServer/server.js')];
    app = require('../../../src/mockServer/server.js');
  });

  afterEach(function () {
    sinon.restore();
    if (server) {
      server.close();
    }
  });

  describe('Health Check', function () {
    it('should respond to health check endpoint', async function () {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).to.have.property('status', 'OK');
      expect(response.body).to.have.property('timestamp');
      expect(response.body).to.have.property('uptime');
    });
  });

  describe('User Registration', function () {
    it('should successfully register a new user', async function () {
      const userData = {
        username: 'testuser123',
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).to.have.property('message', 'User registered successfully');
      expect(response.body).to.have.property('token');
      expect(response.body.user).to.have.property('username', userData.username);
      expect(response.body.user).to.have.property('email', userData.email);
      expect(response.body.user).to.have.property('status', 'active');
      expect(response.body.user).to.not.have.property('password'); // Should not expose password
    });

    it('should reject registration with missing required fields', async function () {
      const incompleteData = {
        username: 'testuser123'
        // Missing email and password
      };

      const response = await request(app)
        .post('/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Missing required fields');
    });

    it('should reject registration with duplicate username', async function () {
      const userData = {
        username: 'duplicateuser',
        email: 'first@example.com',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same username
      const duplicateData = {
        username: 'duplicateuser',
        email: 'second@example.com',
        password: 'password456'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body).to.have.property('error', 'Username or email already exists');
    });

    it('should reject registration with duplicate email', async function () {
      const userData = {
        username: 'firstuser',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const duplicateData = {
        username: 'seconduser',
        email: 'duplicate@example.com',
        password: 'password456'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body).to.have.property('error', 'Username or email already exists');
    });
  });

  describe('User Login', function () {
    let registeredUser;

    beforeEach(async function () {
      // Register a user for login tests
      registeredUser = {
        username: 'loginuser',
        email: 'login@example.com',
        password: 'LoginPass123'
      };

      await request(app)
        .post('/auth/register')
        .send(registeredUser);
    });

    it('should successfully login with valid credentials', async function () {
      const loginData = {
        username: registeredUser.username,
        password: registeredUser.password
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).to.have.property('message', 'Login successful');
      expect(response.body).to.have.property('token');
      expect(response.body.user).to.have.property('username', registeredUser.username);
    });

    it('should reject login with invalid credentials', async function () {
      const invalidLogin = {
        username: registeredUser.username,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body).to.have.property('error', 'Invalid credentials');
    });

    it('should reject login for non-existent user', async function () {
      const nonExistentLogin = {
        username: 'nonexistent',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(nonExistentLogin)
        .expect(401);

      expect(response.body).to.have.property('error', 'Invalid credentials');
    });
  });

  describe('Bet Placement', function () {
    let authToken;

    beforeEach(async function () {
      // Register and login a user for bet tests
      const userData = {
        username: 'betuser',
        email: 'bet@example.com',
        password: 'BetPass123'
      };

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData);

      authToken = registerResponse.body.token;
    });

    it('should successfully place a legitimate bet', async function () {
      const betData = {
        matchId: 'match-123',
        amount: 50,
        odds: '2.5',
        selection: 'home',
        betType: 'single'
      };

      const response = await request(app)
        .post('/bets/place')
        .set('Authorization', `Bearer ${authToken}`)
        .send(betData)
        .expect(201);

      expect(response.body).to.have.property('message', 'Bet placed successfully');
      expect(response.body).to.have.property('betId');
      expect(response.body.bet).to.have.property('amount', betData.amount);
      expect(response.body.bet).to.have.property('status', 'pending');
    });

    it('should reject bet without authentication', async function () {
      const betData = {
        matchId: 'match-123',
        amount: 50,
        odds: '2.5',
        selection: 'home'
      };

      const response = await request(app)
        .post('/bets/place')
        .send(betData)
        .expect(401);

      expect(response.body).to.have.property('error', 'Unauthorized: Missing token');
    });

    it('should reject bet with invalid authentication', async function () {
      const betData = {
        matchId: 'match-123',
        amount: 50,
        odds: '2.5',
        selection: 'home'
      };

      const response = await request(app)
        .post('/bets/place')
        .set('Authorization', 'Bearer invalid-token')
        .send(betData)
        .expect(401);

      expect(response.body).to.have.property('error', 'Unauthorized: Invalid token');
    });

    it('should detect and reject fraudulent bet with negative amount', async function () {
      const fraudulentBet = {
        matchId: 'match-123',
        amount: -50, // Negative amount - fraud
        odds: '2.5',
        selection: 'home'
      };

      const response = await request(app)
        .post('/bets/place')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fraudulentBet)
        .expect(400);

      expect(response.body).to.have.property('error', 'Fraud detected: Invalid bet amount');
      expect(response.body).to.have.property('fraudType', 'negative-amount');
    });

    it('should detect and reject fraudulent bet with manipulated odds', async function () {
      const fraudulentBet = {
        matchId: 'match-123',
        amount: 50,
        odds: '100.0', // Unrealistically high odds - fraud
        selection: 'home'
      };

      const response = await request(app)
        .post('/bets/place')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fraudulentBet)
        .expect(400);

      expect(response.body).to.have.property('error', 'Fraud detected: Suspicious odds manipulation');
      expect(response.body).to.have.property('fraudType', 'odds-manipulation');
    });

    it('should detect and reject bet with tampered request fields', async function () {
      const fraudulentBet = {
        matchId: 'match-123',
        amount: 50,
        odds: '2.5',
        selection: 'home',
        serverBypass: true, // Unauthorized field - fraud
        adminApproval: true // Unauthorized field - fraud
      };

      const response = await request(app)
        .post('/bets/place')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fraudulentBet)
        .expect(400);

      expect(response.body).to.have.property('error', 'Fraud detected: Unauthorized request fields');
      expect(response.body).to.have.property('fraudType', 'request-tampering');
    });

    it('should flag user account after multiple fraud attempts', async function () {
      const fraudulentBet = {
        matchId: 'match-123',
        amount: -50,
        odds: '2.5',
        selection: 'home'
      };

      // Make multiple fraudulent attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/bets/place')
          .set('Authorization', `Bearer ${authToken}`)
          .send(fraudulentBet)
          .expect(400);
      }

      // Check account status
      const statusResponse = await request(app)
        .get('/users/account-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.flags).to.include('fraud-attempts');
      expect(statusResponse.body.fraudWarnings).to.be.above(0);
    });
  });

  describe('Bet History', function () {
    let authToken;

    beforeEach(async function () {
      // Register user and place a legitimate bet
      const userData = {
        username: 'historyuser',
        email: 'history@example.com',
        password: 'HistoryPass123'
      };

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData);

      authToken = registerResponse.body.token;

      // Place a legitimate bet
      const betData = {
        matchId: 'match-456',
        amount: 25,
        odds: '1.8',
        selection: 'away'
      };

      await request(app)
        .post('/bets/place')
        .set('Authorization', `Bearer ${authToken}`)
        .send(betData);
    });

    it('should retrieve user bet history', async function () {
      const response = await request(app)
        .get('/bets/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.be.an('array');
      expect(response.body).to.have.lengthOf(1);
      expect(response.body[0]).to.have.property('matchId', 'match-456');
      expect(response.body[0]).to.have.property('amount', 25);
      expect(response.body[0]).to.have.property('status', 'pending');
    });

    it('should return empty history for user with no bets', async function () {
      // Register new user with no bets
      const newUserData = {
        username: 'nobetsuser',
        email: 'nobets@example.com',
        password: 'NoBetsPass123'
      };

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(newUserData);

      const newAuthToken = registerResponse.body.token;

      const response = await request(app)
        .get('/bets/history')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200);

      expect(response.body).to.be.an('array');
      expect(response.body).to.have.lengthOf(0);
    });

    it('should require authentication for bet history', async function () {
      const response = await request(app)
        .get('/bets/history')
        .expect(401);

      expect(response.body).to.have.property('error', 'Unauthorized: Missing token');
    });
  });

  describe('Account Status', function () {
    let authToken;

    beforeEach(async function () {
      const userData = {
        username: 'statususer',
        email: 'status@example.com',
        password: 'StatusPass123'
      };

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData);

      authToken = registerResponse.body.token;
    });

    it('should retrieve account status for clean account', async function () {
      const response = await request(app)
        .get('/users/account-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.have.property('accountId');
      expect(response.body).to.have.property('status', 'active');
      expect(response.body).to.have.property('flags');
      expect(response.body.flags).to.be.an('array').that.is.empty;
      expect(response.body).to.have.property('fraudWarnings', 0);
    });

    it('should require authentication for account status', async function () {
      const response = await request(app)
        .get('/users/account-status')
        .expect(401);

      expect(response.body).to.have.property('error', 'Unauthorized: Missing token');
    });
  });

  describe('Error Handling', function () {
    it('should handle malformed JSON requests', async function () {
      await request(app)
        .post('/auth/register')
        .send('invalid-json')
        .expect(400);

      // Express should handle this automatically
    });

    it('should return 404 for non-existent endpoints', async function () {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);

      expect(response.body).to.have.property('error', 'Endpoint not found');
    });

    it('should handle missing request body', async function () {
      const response = await request(app)
        .post('/auth/register')
        .expect(400);

      expect(response.body).to.have.property('error');

      expect(response.body).to.have.property('error', 'Missing required fields');
    });
  });

  describe('Middleware', function () {
    it('should log all requests', async function () {
      await request(app)
        .get('/health')
        .expect(200);

      expect(consoleStub.called).to.be.true;
      const logCall = consoleStub.getCall(0);
      expect(logCall.args[0]).to.include('GET /health');
    });

    it('should parse JSON request bodies', async function () {
      const userData = {
        username: 'jsontest',
        email: 'json@example.com',
        password: 'JsonPass123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.username).to.equal(userData.username);
    });
  });
});