/**
 * API Client for making HTTP requests to betting app backend
 * Used to simulate fraudulent API calls
 */
const axios = require('axios');
const _ = require('lodash');

class ApiClient {
  constructor(baseURL, authToken = null) {
    this.client = axios.create({
      baseURL: baseURL || process.env.API_BASE_URL || 'https://api.bettingapp.example',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` })
      }
    });
    
    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[API] ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        console.error(`[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
        return Promise.reject(error);
      }
    );
  }

  // Set auth token for subsequent requests
  setAuthToken(token) {
    this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  // User registration
  async registerUser(userData) {
    try {
      const response = await this.client.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // User login
  async login(credentials) {
    try {
      const response = await this.client.post('/auth/login', credentials);
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Place a bet - normal flow
  async placeBet(betData) {
    try {
      const response = await this.client.post('/bets/place', betData);
      return response.data;
    } catch (error) {
      console.error('Bet placement failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Place a fraudulent bet - manipulating parameters for testing fraud detection
  async placeFraudulentBet(legitimateBetData, fraudType) {
    let fraudulentBetData = _.cloneDeep(legitimateBetData);
    
    // Apply different fraud techniques based on type
    switch (fraudType) {
      case 'negative-amount':
        fraudulentBetData.amount = -Math.abs(fraudulentBetData.amount);
        break;
      case 'odds-manipulation':
        fraudulentBetData.odds = (parseFloat(fraudulentBetData.odds) * 10).toString();
        break;
      case 'match-alteration':
        fraudulentBetData.matchId = `${fraudulentBetData.matchId}-altered`;
        break;
      case 'timestamp-manipulation':
        fraudulentBetData.timestamp = new Date(Date.now() - 86400000).toISOString(); // Yesterday
        break;
      case 'request-tampering':
        // Add unexpected fields or modify structure
        fraudulentBetData.serverBypass = true;
        fraudulentBetData.adminApproval = true;
        break;
      default:
        // Default fraud - combine multiple techniques
        fraudulentBetData.amount = -Math.abs(fraudulentBetData.amount);
        fraudulentBetData.odds = (parseFloat(fraudulentBetData.odds) * 5).toString();
    }
    
    console.log('Attempting fraudulent bet with data:', JSON.stringify(fraudulentBetData, null, 2));
    
    try {
      const response = await this.client.post('/bets/place', fraudulentBetData);
      console.warn('WARNING: Fraudulent bet was accepted by the system!');
      return {
        success: true,
        data: response.data,
        fraudDetected: false,
      };
    } catch (error) {
      // In this case, an error is actually expected and good!
      console.log('Fraud properly detected by API:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        fraudDetected: true,
        statusCode: error.response?.status
      };
    }
  }

  // Get user bet history
  async getBetHistory() {
    try {
      const response = await this.client.get('/bets/history');
      return response.data;
    } catch (error) {
      console.error('Failed to get bet history:', error.response?.data || error.message);
      throw error;
    }
  }

  // Check account status
  async getAccountStatus() {
    try {
      const response = await this.client.get('/users/account-status');
      return response.data;
    } catch (error) {
      console.error('Failed to get account status:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = ApiClient;
